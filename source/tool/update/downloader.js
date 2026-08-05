import { game } from '../../../../../noname.js';
import { UPDATE_CONFIG as CONFIG } from './config.js';
import { updateUtils as utils } from './utils.js';
import { updateEnvironment as Environment } from './repository.js';
import { md5Hex } from './md5.js';

// ==================== 下载任务实体 ====================
class DownloadTask {
    constructor(info) {
        this.remote = info.remote;
        this.temp = info.temp;
        this.target = info.target;
        this.size = info.size || 0;
        this.type = info.type;
        this.critical = info.critical;
        this.priority = info.priority || 0;
        this.skip = info.skip || false;
        this.md5 = info.md5 || null;           // 清单中的期望 md5（null 表示跳过校验）
        this.kind = info.kind || 'file';       // 'file' 普通文件 | 'zip' 代码包哨兵
        this.urls = Array.isArray(info.urls) && info.urls.length > 0 ? info.urls : null; // 显式下载地址列表
        this.downloadedBytes = 0;
    }
}

// ==================== 智能下载器 ====================
class SmartDownloader {
    constructor(repo, tokenManager) {
        this.repo = repo;
        this.tokens = tokenManager;
        this.env = Environment.getEnvironmentType();
        this.activeRequests = new Set();
        this.isCancelled = false;
    }

    cancelAll() {
        this.isCancelled = true;
        this.activeRequests.clear();
    }

    // 将 AggregateError/cause 中的底层网络错误展开，保留可用于分类和展示的信息
    formatError(error) {
        const seen = new Set();
        const messages = [];
        const visit = (item) => {
            if (!item || seen.has(item)) return;
            if (typeof item === 'object') seen.add(item);

            const code = item?.code ? `[${item.code}] ` : '';
            const message = item?.message || (typeof item === 'string' ? item : '');
            if (code || message) messages.push(`${code}${message}`.trim());
            if (Array.isArray(item?.errors)) item.errors.forEach(visit);
            if (item?.cause) visit(item.cause);
        };
        visit(error);
        return [...new Set(messages)].join('；') || String(error || '未知错误');
    }

    // 统一错误分类
    classifyError(error) {
        const msg = this.formatError(error).toUpperCase();
        if (msg.includes('401') || msg.includes('TOKEN_INVALID')) {
            return { type: 'token', recoverable: true };
        }
        if (msg.includes('403') || msg.includes('CORS')) {
            return { type: 'cors', recoverable: true };
        }
        if (/TIMEOUT|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENETUNREACH|EHOSTUNREACH|EAI_AGAIN|ENOTFOUND|NETWORK|SOCKET HANG UP/.test(msg)) {
            return { type: 'network', recoverable: true };
        }
        if (/ENOSPC|EACCES|EPERM|PERMISSION/.test(msg)) {
            return { type: 'disk', recoverable: false };
        }
        if (msg.includes('NOT_FOUND') || msg.includes('404')) {
            return { type: 'not_found', recoverable: false };
        }
        if (msg.includes('MD5校验失败') || msg.includes('MD5')) {
            return { type: 'md5', recoverable: true };
        }
        if (msg.includes('下载已取消')) {
            return { type: 'cancelled', recoverable: true };
        }
        return { type: 'unknown', recoverable: true };
    }

    async emitProgress(onProgress, received, total) {
        if (!onProgress) return;
        try {
            await onProgress(received, total);
        } catch (error) {
            console.warn('[下载进度] 回调失败:', error);
        }
    }

    async downloadViaNode(url, tempPath, onProgress, redirectsLeft = 5) {
        const require = window.require;
        const fs = require('fs');
        const path = require('path');
        const { URL } = require('url');
        const targetPath = path.resolve(window.__dirname, tempPath);
        await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });

        return await new Promise((resolve, reject) => {
            let request = null;
            let file = null;
            let settled = false;
            let received = 0;

            const cleanupFile = async () => {
                try {
                    await fs.promises.rm(targetPath, { force: true });
                } catch (e) { }
            };
            const fail = (error) => {
                if (settled) return;
                settled = true;
                if (request && !request.destroyed) request.destroy();
                if (file && !file.destroyed) file.destroy();
                cleanupFile().finally(() => reject(error instanceof Error ? error : new Error(String(error))));
            };

            let parsed;
            try {
                parsed = new URL(url);
                const transport = parsed.protocol === 'https:' ? require('https') : require('http');
                request = transport.get(parsed, {
                    headers: { 'User-Agent': 'AppleWebkit' }
                });
            } catch (error) {
                fail(error);
                return;
            }

            request.once('error', fail);
            request.setTimeout(CONFIG.limits.timeout, () => {
                const error = new Error(`下载超时: ${url}`);
                error.code = 'ETIMEDOUT';
                fail(error);
            });

            request.once('response', (response) => {
                const status = response.statusCode || 0;
                const location = response.headers.location;
                if ([301, 302, 303, 307, 308].includes(status) && location) {
                    response.resume();
                    if (redirectsLeft <= 0) {
                        fail(new Error(`重定向次数过多: ${url}`));
                        return;
                    }
                    settled = true;
                    request.destroy();
                    cleanupFile()
                        .then(() => this.downloadViaNode(new URL(location, parsed).href, tempPath, onProgress, redirectsLeft - 1))
                        .then(resolve, reject);
                    return;
                }
                if (status < 200 || status >= 300) {
                    response.resume();
                    const error = new Error(`HTTP ${status}: ${url}`);
                    error.code = `HTTP_${status}`;
                    fail(error);
                    return;
                }

                const total = Number(response.headers['content-length']) || 0;
                try {
                    file = fs.createWriteStream(targetPath);
                } catch (error) {
                    response.destroy();
                    fail(error);
                    return;
                }

                response.once('error', fail);
                file.once('error', fail);
                // 手动写入以支持异步进度回调背压，保证UI事件按字节顺序到达。
                response.on('data', (chunk) => {
                    response.pause();
                    received += chunk.length;
                    const resume = () => {
                        if (!settled) response.resume();
                    };
                    Promise.all([
                        this.emitProgress(onProgress, received, total),
                        new Promise((resolveWrite, rejectWrite) => {
                            file.write(chunk, error => error ? rejectWrite(error) : resolveWrite());
                        })
                    ]).then(resume, fail);
                });
                response.once('end', () => {
                    if (!settled) file.end();
                });
                file.once('finish', () => {
                    if (settled) return;
                    response.destroy();
                    file.close(async (error) => {
                        if (error) {
                            fail(error);
                            return;
                        }
                        try {
                            await this.emitProgress(onProgress, received, total || received);
                            const data = await fs.promises.readFile(targetPath);
                            settled = true;
                            resolve({ data, size: data.byteLength });
                        } catch (readError) {
                            fail(readError);
                        }
                    });
                });
            });
        });
    }

    async downloadViaGame(url, tempPath, onProgress) {
        this.activeRequests.add(tempPath);
        try {
            if (this.env === 'node' || this.env === 'electron-renderer') {
                return await this.downloadViaNode(url, tempPath, onProgress);
            }
            await game.promises.download(url, tempPath, null, (received, total) => {
                void this.emitProgress(onProgress, received, total);
            });
            const content = await game.promises.readFile(tempPath);
            const size = content?.byteLength ?? content?.length ?? 0;
            await this.emitProgress(onProgress, size, size);
            return { data: content, size };
        } finally {
            this.activeRequests.delete(tempPath);
        }
    }

    async removeTempFile(path) {
        try {
            const exists = await game.promises.checkFile(path);
            if (exists === 1) {
                await game.promises.removeFile(path);
            }
        } catch (e) { }
    }

    // 主下载方法
    async download(task, onProgress, stateManager = null) {
        if (this.isCancelled) throw new Error('下载已取消');

        // 显式 URL 列表（代码包哨兵）或默认的 raw + 备用源
        const urls = task.urls && task.urls.length > 0
            ? task.urls.slice()
            : [this.repo.getURL(task.remote), this.repo.getFallbackURL(task.remote)];
        const attempts = [...new Set(urls.filter(Boolean))];

        if (stateManager) {
            await stateManager.updateFile(task.remote, 'downloading', null, null, 0, true);
        }

        let lastError = null;
        for (let index = 0; index < attempts.length; index++) {
            const currentUrl = attempts[index];
            try {
                await this.removeTempFile(task.temp);
                const result = await this.downloadViaGame(currentUrl, task.temp, onProgress);

                // 内容完整性校验：与清单 md5 不一致视为失败（媒体逐文件与代码包共用此钩子）
                if (task.md5) {
                    const actual = md5Hex(result.data);
                    if (actual !== task.md5) {
                        await this.removeTempFile(task.temp);
                        throw new Error(`MD5校验失败: ${task.remote}`);
                    }
                }

                if (stateManager) {
                    await stateManager.updateFile(task.remote, 'success', null, null, result.size, true);
                }

                return {
                    success: true,
                    size: result.size,
                    mode: this.env,
                    source: index === 0 ? 'primary' : 'fallback'
                };
            } catch (error) {
                const detail = this.formatError(error);
                lastError = new Error(detail);
                if (error?.code) lastError.code = error.code;
                const { type, recoverable } = this.classifyError(error);
                const hasMoreAttempts = index < attempts.length - 1;

                if (!recoverable || !hasMoreAttempts) break;
                game.print(index === 0 ? '🔄 主源失败，尝试备用源...' : '🔄 下载失败，重试其他来源...');
                await utils.sleep(CONFIG.limits.retryDelay);
            }
        }

        const { type } = this.classifyError(lastError);
        if (stateManager && String(lastError?.message || lastError) !== '下载已取消') {
            await stateManager.updateFile(task.remote, 'failed', String(lastError?.message || lastError), type, 0, true);
        }

        return {
            success: false,
            error: String(lastError?.message || lastError || '下载失败'),
            errorType: type,
            needToken: false
        };
    }
}

export { DownloadTask, SmartDownloader };

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

    // 统一错误分类
    classifyError(error) {
        const msg = String(error?.message || error || '');
        if (msg.includes('401') || msg.includes('TOKEN_INVALID')) {
            return { type: 'token', recoverable: true };
        }
        if (msg.includes('403') || msg.includes('CORS')) {
            return { type: 'cors', recoverable: true };
        }
        if (msg.includes('timeout') || msg.includes('ETIMEDOUT') || msg.includes('ECONNRESET') || msg.includes('NETWORK')) {
            return { type: 'network', recoverable: true };
        }
        if (msg.includes('ENOSPC') || msg.includes('EACCES') || msg.includes('PERMISSION')) {
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

    async downloadViaGame(url, tempPath, onProgress) {
        this.activeRequests.add(tempPath);
        try {
            await game.promises.download(url, tempPath, null, onProgress);
            const content = await game.promises.readFile(tempPath);
            const size = content?.byteLength ?? content?.length ?? 0;
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
                lastError = error;
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

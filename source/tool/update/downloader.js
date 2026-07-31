import { game } from '../../../../../noname.js';
import { UPDATE_CONFIG as CONFIG } from './config.js';
import { updateUtils as utils } from './utils.js';
import { updateEnvironment as Environment } from './repository.js';

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

        const url = this.repo.getURL(task.remote);
        const fallback = this.repo.getFallbackURL(task.remote);

        if (stateManager) {
            await stateManager.updateFile(task.remote, 'downloading', null, null, 0, true);
        }

        const attempts = [url];
        if (fallback && fallback !== url) attempts.push(fallback);

        let lastError = null;
        for (let index = 0; index < attempts.length; index++) {
            const currentUrl = attempts[index];
            try {
                await this.removeTempFile(task.temp);
                const result = await this.downloadViaGame(currentUrl, task.temp, onProgress);

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

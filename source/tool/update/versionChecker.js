import { game } from '../../../../../noname.js';
import { UPDATE_CONFIG as CONFIG } from './config.js';
import { updateUtils as utils } from './utils.js';
import { extensionPath } from '../utils/paths.js';
import { DownloadTask, SmartDownloader } from './downloader.js';

// ==================== 版本检查器 ====================
class VersionChecker {
    constructor(repo, tokens, env) {
        this.repo = repo;
        this.tokens = tokens;
        this.env = env;
        this.downloader = new SmartDownloader(repo, tokens);
    }

    async check(gameVersion) {
        try {
            const task = new DownloadTask({
                remote: CONFIG.files.version,
                temp: `${extensionPath}/temp_version.json`,
                size: 0,
                type: 'text'
            });

            const result = await this.downloader.download(task);
            if (!result.success) throw new Error(result.error);

            const content = await game.promises.readFileAsText(task.temp);
            await game.promises.removeFile(task.temp);

            const info = JSON.parse(content);

            if (!info.versions || !Array.isArray(info.versions)) {
                return { branch: this.repo.branch, compatible: true };
            }

            const sorted = info.versions
                .filter(v => v.extensionVersion && v.gameVersion)
                .sort((a, b) => utils.compareVersion(b.extensionVersion, a.extensionVersion));

            for (const v of sorted) {
                if (utils.matchVersion(gameVersion, v.gameVersion)) {
                    return {
                        extensionVersion: v.extensionVersion,
                        gameVersion: v.gameVersion,
                        branch: v.branch || info.defaultBranch || this.repo.branch,
                        description: v.description || `兼容游戏版本 ${v.gameVersion}`,
                        compatible: true
                    };
                }
            }

            const latest = sorted[0];
            return {
                extensionVersion: latest?.extensionVersion,
                branch: latest?.branch || info.defaultBranch || this.repo.branch,
                description: '使用最新版本',
                compatible: false
            };
        } catch (e) {
            console.warn('[版本检查] 失败:', e.message);
            return { branch: this.repo.branch, compatible: true };
        }
    }
}

export { VersionChecker };

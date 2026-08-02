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

    // 下载并解析 version.json，返回全部版本（含兼容标记与更新内容）
    async list(gameVersion) {
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

            if (!info.versions || !Array.isArray(info.versions)) return [];

            return info.versions
                .filter(v => v.extensionVersion && v.gameVersion)
                .sort((a, b) => utils.compareVersion(b.extensionVersion, a.extensionVersion))
                .map(v => ({
                    extensionVersion: v.extensionVersion,
                    gameVersion: v.gameVersion,
                    branch: v.branch || info.defaultBranch || this.repo.branch,
                    description: v.description || `兼容游戏版本 ${v.gameVersion}`,
                    highlights: Array.isArray(v.highlights) ? v.highlights : [],
                    compatible: utils.matchVersion(gameVersion, v.gameVersion)
                }));
        } catch (e) {
            console.warn('[版本检查] 失败:', e.message);
            return [];
        }
    }

    // 选择首个兼容当前游戏版本的版本，无兼容时取最新
    async check(gameVersion) {
        const versions = await this.list(gameVersion);
        if (versions.length === 0) {
            return { branch: this.repo.branch, compatible: true };
        }
        const matched = versions.find(v => v.compatible) || versions[0];
        return {
            extensionVersion: matched.extensionVersion,
            gameVersion: matched.gameVersion,
            branch: matched.branch,
            description: matched.description,
            compatible: matched.compatible
        };
    }
}

export { VersionChecker };

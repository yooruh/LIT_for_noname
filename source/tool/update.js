import { lib, game, ui, get, ai, _status } from '../../../../noname.js';
import { Lit_Dialog as DialogManager } from './extraUI.js';

// ==================== 扩展配置 ====================
const LIT_CONFIG = {
    name: '叁岛世界',
    github: 'https://github.com/yooruh/LIT_for_noname',
    gitee: 'https://gitee.com/yooruh/LIT_for_noname',
    structure: {
        files: ['extension.js', 'info.json'],
        dirs: ['style', 'source', 'script', 'audio', 'image']
    }
};

// ==================== Git平台URL解析器 ====================
class GitPlatformURLParser {
    static parse(input, platform = null) {
        input = input.trim().replace(/\/+$/, '');

        if (input.includes('raw.githubusercontent.com')) return `${input}/`;
        if (input.includes('gitee.com') && input.includes('/raw/')) return `${input}/`;

        const detected = platform || this.detectPlatform(input);
        return detected === 'github' ? this.parseGitHub(input) : this.parseGitee(input);
    }

    static detectPlatform(input) {
        if (input.includes('github.com')) return 'github';
        if (input.includes('gitee.com')) return 'gitee';
        return 'github';
    }

    static parseGitHub(input) {
        const match = input.match(/github\.com\/([^/]+\/[^/]+)(?:\/tree\/([^/]+))?/i);
        if (match) {
            const [, repo, branch = 'main'] = match;
            return `https://raw.githubusercontent.com/${repo}/${branch}/`;
        }
        throw new Error(`无法解析GitHub地址: ${input}`);
    }

    static parseGitee(input) {
        const match = input.match(/gitee\.com\/([^/]+\/[^/]+)(?:\/tree\/([^/]+))?/i);
        if (match) {
            const [, repo, branch = 'master'] = match;
            return `https://gitee.com/${repo}/raw/${branch}/`;
        }
        throw new Error(`无法解析Gitee地址: ${input}`);
    }
}

// ==================== 版本兼容性检查 ====================
class VersionCompatibilityChecker {
    constructor() {
        this.cache = new Map();
    }

    parseVersion(version) {
        if (typeof version !== 'string') return [0, 0, 0];
        const clean = version.replace(/[^\d.]/g, '');
        const parts = clean.split('.').map(n => parseInt(n) || 0);
        return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
    }

    compareVersions(v1, v2) {
        const a = this.parseVersion(v1);
        const b = this.parseVersion(v2);

        for (let i = 0; i < 3; i++) {
            if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
        }
        return 0;
    }

    matchVersion(gameVersion, rule) {
        const gv = this.parseVersion(gameVersion);

        // 通配符 "1.10.x"
        if (rule.includes('x')) {
            const base = rule.replace(/\.x.*$/, '');
            const baseVersion = this.parseVersion(base);
            return gv[0] === baseVersion[0] && gv[1] === baseVersion[1];
        }

        // 复合规则 ">=1.8.0 <1.11.0"
        const rules = rule.split(' ').filter(r => r.trim());
        let result = true;

        for (const r of rules) {
            const match = r.match(/([<>=]+)(.+)/);
            if (!match) continue;

            const [, operator, target] = match;
            const compare = this.compareVersions(gameVersion, target);

            switch (operator) {
                case '>=': result = result && compare >= 0; break;
                case '>': result = result && compare > 0; break;
                case '<=': result = result && compare <= 0; break;
                case '<': result = result && compare < 0; break;
                case '=':
                case '==': result = result && compare === 0; break;
            }
        }

        return result && rules.length > 0;
    }

    async getCompatibleVersion(gitURL, gameVersion, downloadFn) {
        const cacheKey = `${gitURL}|${gameVersion}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const versionInfo = await new Promise((resolve, reject) => {
                const url = `${gitURL}version.json`;
                downloadFn(url, null, (data) => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                }, reject);
            });

            if (versionInfo?.versions && Array.isArray(versionInfo.versions)) {
                // 按扩展版本降序排列
                const sortedVersions = versionInfo.versions.sort((a, b) =>
                    this.compareVersions(b.extensionVersion || '0.0.0', a.extensionVersion || '0.0.0')
                );

                // 查找兼容版本
                for (const version of sortedVersions) {
                    if (this.matchVersion(gameVersion, version.gameVersion)) {
                        const config = {
                            extensionVersion: version.extensionVersion || 'unknown',
                            gameVersion: version.gameVersion || '*',
                            branch: version.branch || 'main',
                            description: version.description || '兼容版本'
                        };
                        this.cache.set(cacheKey, config);
                        return config;
                    }
                }
            }
        } catch (e) {
            console.warn(`[版本兼容] 无法获取version.json: ${e.message}`);
        }

        // 回退配置
        const fallback = {
            extensionVersion: 'latest',
            gameVersion: '*',
            branch: 'main',
            description: '默认分支（无版本限制）'
        };
        this.cache.set(cacheKey, fallback);
        return fallback;
    }
}

// ==================== 节点文件系统操作 ====================
class NodeFileSystem {
    constructor() {
        this.fs = lib.node.fs.promises;
        this.path = lib.node.path;
    }

    transFileURL(url) {
        const urlObj = typeof url === 'string' ? new URL(url) : url;
        return decodeURIComponent(urlObj.pathname.substring(1));
    }

    async createDirectory(dirPath) {
        try {
            await this.fs.mkdir(dirPath, { recursive: true });
            return true;
        } catch (err) {
            console.error(`创建目录失败: ${dirPath}`, err);
            return false;
        }
    }
}

// ==================== 扩展更新器 ====================
class ExtensionUpdater {
    constructor() {
        this.name = "叁岛世界",
            this.versionChecker = new VersionCompatibilityChecker();
        this.platform = null;
        this.gitURL = null;
    }

    async detectPlatform() {
        const isGitee = await DialogManager.confirm(
            '选择更新源',
            `请选择从哪个镜像源更新《${this.name}》：\n` +
            'GitHub: 国际源，国内访问可能较慢或失败\n' +
            'Gitee: 国内源，速度更快',
            '使用Gitee',
            '使用GitHub'
        );
        return isGitee ? 'gitee' : 'github';
    }

    async initGitURL() {
        this.platform = await this.detectPlatform();
        const baseURL = this.platform === 'gitee' ? LIT_CONFIG.gitee : LIT_CONFIG.github;
        this.gitURL = GitPlatformURLParser.parse(baseURL, this.platform);
        console.log(`[${this.name}] 使用更新源: ${this.platform.toUpperCase()}`);
        console.log(`[${this.name}] Git URL: ${this.gitURL}`);
    }

    async downloadFile(filePath, baseURL) {
        // 优先使用传入的 baseURL，否则使用 this.gitURL
        const url = `${baseURL || this.gitURL}${filePath}`;
        const target = `extension/${SANDA_WORLD_CONFIG.name}/${filePath}`;

        return new Promise((resolve, reject) => {
            game.download(url, target,
                () => resolve({ success: true, file: filePath }),
                (err) => resolve({ success: false, file: filePath, error: err })
            );
        });
    }

    async createDirectories() {
        if (lib?.node?.fs) {
            const nodeFS = new NodeFileSystem();
            for (const dir of LIT_CONFIG.structure.dirs) {
                const dirPath = nodeFS.transFileURL(location.origin) +
                    `/extension/${LIT_CONFIG.name}/${dir}`;
                await nodeFS.createDirectory(dirPath);
            }
        }
    }

    // 接收并使用已替换分支的 gitURL
    async updateExtension(gitURL, versionInfo) {
        // 创建目录结构
        await this.createDirectories();

        // 构建下载列表
        const downloadTasks = [
            ...SANDA_WORLD_CONFIG.structure.files.map(f => this.downloadFile(f, gitURL)),
            ...SANDA_WORLD_CONFIG.structure.dirs.map(dir =>
                this.downloadFile(`${dir}/.gitkeep`, gitURL)
            )
        ];

        // 批量下载
        const results = await Promise.all(downloadTasks);

        // 处理结果
        const failed = results.filter(r => !r.success);
        const success = results.filter(r => r.success);

        success.forEach(r => game.print(`✓ ${r.file}`));
        failed.forEach(r => game.print(`✗ ${r.file}: ${r.error?.message || '未知错误'}`));

        return { failed, versionInfo };
    }

    async checkExtensionExists() {
        const initWay = localStorage.getItem("noname_inited");
        const extPath = initWay === "nodejs"
            ? `${lib.node.path.dirname(location.pathname)}/extension/${LIT_CONFIG.name}/extension.js`
            : `extension/${LIT_CONFIG.name}/extension.js`;

        return new Promise((resolve) => {
            game.readFile(extPath,
                () => resolve(true),
                () => resolve(false)
            );
        });
    }
}

// ==================== UI交互流程 ====================
const UpdateFlow = (() => {
    const updater = new ExtensionUpdater();

    const _showVersionInfo = async (versionInfo, gameVersion) => {
        const infoText = `游戏版本: ${gameVersion}\n` +
            `扩展版本: ${versionInfo.extensionVersion}\n` +
            `兼容规则: ${versionInfo.gameVersion}\n` +
            `使用分支: ${versionInfo.branch}\n` +
            `描述信息: ${versionInfo.description}`;

        const shouldContinue = await DialogManager.confirm(
            '版本兼容性检查',
            `检测到《叁岛世界》兼容版本信息：\n\n${infoText}\n\n是否继续更新？`,
            '继续更新',
            '取消'
        );

        return shouldContinue;
    };

    const _performUpdate = async () => {
        try {
            // 检查扩展是否存在
            const exists = await updater.checkExtensionExists();
            if (!exists) {
                const shouldInstall = await DialogManager.confirm(
                    '扩展未安装',
                    `未检测到《叁岛世界》扩展，是否全新安装？\n\n` +
                    `安装路径: extension/${LIT_CONFIG.name}/`,
                    '全新安装',
                    '取消'
                );
                if (!shouldInstall) return;
            }

            // 选择平台并初始化
            await updater.initGitURL();

            // 检查版本兼容性
            const gameVersion = lib.version || '1.0.0';
            const versionInfo = await updater.versionChecker.getCompatibleVersion(
                updater.gitURL,
                gameVersion,
                game.download.bind(game)
            );

            // 显示版本信息
            const shouldContinue = await _showVersionInfo(versionInfo, gameVersion);
            if (!shouldContinue) return;

            // 使用兼容的分支
            const gitURL = updater.gitURL.replace(/\/(main|master)\/$/, `/${versionInfo.branch}/`);
            console.log(`[版本兼容] 使用分支: ${versionInfo.branch}`);
            console.log(`[版本兼容] 最终URL: ${gitURL}`);

            // 最终确认
            const confirmText = exists ? '开始更新' : '开始安装';
            const finalConfirm = await DialogManager.confirm(
                exists ? '确认更新' : '确认安装',
                `${exists ? '更新' : '安装'}《叁岛世界》扩展\n\n` +
                `扩展名称: ${LIT_CONFIG.name}\n` +
                `扩展版本: ${versionInfo.extensionVersion}\n` +
                `游戏版本: ${gameVersion}\n` +
                `兼容规则: ${versionInfo.gameVersion}\n` +
                `使用分支: ${versionInfo.branch}\n` +
                `更新源: ${updater.platform.toUpperCase()}\n\n` +
                `文件数量: ${LIT_CONFIG.structure.files.length}个核心文件 + ${LIT_CONFIG.structure.dirs.length}个资源文件夹\n\n` +
                `更新过程可能需要1-3分钟，请保持网络畅通。`,
                confirmText,
                '取消'
            );

            if (!finalConfirm) return;

            // 显示加载界面
            DialogManager.loading(
                exists ? '正在更新' : '正在安装',
                `正在从 ${LIT_CONFIG.name} 仓库下载文件...\n` +
                `分支: ${versionInfo.branch}\n` +
                `扩展版本: ${versionInfo.extensionVersion}\n` +
                `进度信息将在控制台显示（F12打开）`
            );

            // 执行更新，传入正确的 gitURL 和 versionInfo
            const { failed } = await updater.updateExtension(gitURL, versionInfo);

            // 关闭加载界面
            DialogManager.closeAll();

            // 显示结果
            if (failed.length === 0) {
                await DialogManager.alert(
                    exists ? '✅ 更新成功' : '✅ 安装成功',
                    `${LIT_CONFIG.name} (${versionInfo.extensionVersion}) 所有文件已${exists ? '更新' : '下载'}完成！\n\n` +
                    `版本: ${versionInfo.extensionVersion}\n` +
                    `兼容: ${versionInfo.gameVersion}\n` +
                    `分支: ${versionInfo.branch}\n\n` +
                    `建议重启游戏以应用更改。`
                );
            } else {
                const failedList = failed.slice(0, 5).map(f => `• ${f.file}`).join('\n');
                const moreText = failed.length > 5 ? `\n...还有 ${failed.length - 5} 个文件` : '';

                await DialogManager.alert(
                    '⚠️ 部分失败',
                    `${failed.length} 个文件${exists ? '更新' : '下载'}失败：\n\n${failedList}${moreText}\n\n` +
                    `失败原因可能是网络问题，建议:\n` +
                    `1. 检查网络连接\n` +
                    `2. 尝试切换更新源（GitHub/Gitee）\n` +
                    `3. 稍后重试`
                );
            }

        } catch (error) {
            DialogManager.closeAll();
            await DialogManager.alert(
                '❌ 更新失败',
                `错误详情: ${error.message}\n\n` +
                `请检查：\n` +
                `1. 网络连接是否正常\n` +
                `2. 更新源是否可访问\n` +
                `3. 扩展名称是否正确\n` +
                `4. version.json 是否存在且格式正确`
            );
            console.error('[叁岛世界更新失败]', error);
        }
    };

    const _showExtensionInfo = async () => {
        const exists = await updater.checkExtensionExists();
        const status = exists ? '已安装' : '未安装';

        let info = `扩展名称: ${LIT_CONFIG.name}\n`;
        info += `当前状态: ${status}\n`;
        info += `GitHub源: ${LIT_CONFIG.github}\n`;
        info += `Gitee源: ${LIT_CONFIG.gitee}\n`;
        info += `\n目录结构:\n`;
        info += `  核心文件: ${LIT_CONFIG.structure.files.join(', ')}\n`;
        info += `  资源目录: ${LIT_CONFIG.structure.dirs.join(', ')}\n`;

        await DialogManager.alert('扩展信息', info);
    };

    const _showMainMenu = async () => {
        const action = await DialogManager.choice(
            '叁岛世界更新工具',
            '《叁岛世界》扩展更新管理器\n\n' +
            '选择操作：\n' +
            '1. 更新/安装扩展 - 从Git仓库下载最新版本\n' +
            '2. 查看扩展信息 - 显示当前扩展状态和配置\n' +
            '3. 切换更新源 - 在GitHub和Gitee之间切换',
            ['更新/安装', '查看信息', '切换源', '取消']
        );
        return action;
    };

    return {
        async main() {
            try {
                const action = await _showMainMenu();

                switch (action) {
                    case 0: // 更新/安装
                        await _performUpdate();
                        break;
                    case 1: // 查看信息
                        await _showExtensionInfo();
                        break;
                    case 2: { // 切换源
                        const current = await updater.detectPlatform();
                        const newPlatform = current === 'gitee' ? 'github' : 'gitee';
                        const platformName = newPlatform === 'gitee' ? 'Gitee（国内）' : 'GitHub（国际）';

                        await DialogManager.alert(
                            '更新源已切换',
                            `下次更新将使用: ${platformName}`
                        );
                        break;
                    }
                    case 3: // 取消
                    default:
                        return;
                }
            } catch (error) {
                console.error('UI流程错误:', error);
                await DialogManager.alert('❌ 流程错误', error.message);
            }
        }
    };
})();

// ==================== 主API对象 ====================
const Lit_update = {
    // 启动UI界面
    async showUI() {
        await UpdateFlow.main();
    },

    // 快速更新（无UI，使用默认平台）
    async quickUpdate() {
        const updater = new ExtensionUpdater();
        updater.platform = 'gitee'; // 默认使用Gitee
        updater.gitURL = GitPlatformURLParser.parse(LIT_CONFIG.gitee, 'gitee');

        const gameVersion = lib.version || '1.0.0';
        const versionInfo = await updater.versionChecker.getCompatibleVersion(
            updater.gitURL,
            gameVersion,
            game.download.bind(game)
        );

        // 使用兼容的分支
        const gitURL = updater.gitURL.replace(/\/(main|master)\/$/, `/${versionInfo.branch}/`);

        const { failed } = await updater.updateExtension(gitURL, versionInfo);
        return { failed, versionInfo };
    },

    // 扩展配置信息
    get config() {
        return { ...LIT_CONFIG };
    }
};

// 默认导出
export default Lit_update;
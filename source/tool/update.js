import { lib, game, ui, get, ai, _status } from '../../../../noname.js';
import { Lit_Dialog as DialogManager } from './extraUI.js';

// ==================== 配置定义 ====================
const LIT_CONFIG = {
    name: '叁岛世界',
    github: 'https://github.com/yooruh/LIT_for_noname',
    gitee: 'https://gitee.com/yooruh/LIT_for_noname',
    structure: {
        files: ['extension.js', 'info.json'],
        dirs: ['style', 'source', 'script', 'audio', 'image']
    }
};

// ==================== URL解析模块 ====================
class GitURLParser {
    static detectPlatform(url) {
        if (!url || typeof url !== 'string') return null;
        if (url.includes('github.com')) return 'github';
        if (url.includes('gitee.com')) return 'gitee';
        return null;
    }

    static parseRepoInfo(input) {
        if (!input || typeof input !== 'string') {
            throw new Error('URL必须是有效的字符串');
        }
        
        input = input.trim().replace(/\/+$/, '');
        
        // 处理raw URL
        if (input.includes('raw.githubusercontent.com')) {
            const match = input.match(/github\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)/);
            if (match) {
                const [, owner, repo, branch] = match;
                return { owner, repo, branch, platform: 'github' };
            }
        }
        
        if (input.includes('gitee.com') && input.includes('/raw/')) {
            const match = input.match(/gitee\.com\/([^/]+)\/([^/]+)\/raw\/([^/]+)\/(.+)/);
            if (match) {
                const [, owner, repo, branch] = match;
                return { owner, repo, branch, platform: 'gitee' };
            }
        }

        // 处理web URL
        const platform = this.detectPlatform(input);
        if (!platform) throw new Error(`无法识别的Git平台地址: ${input}`);

        if (platform === 'github') {
            const match = input.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/i);
            if (match) {
                const [, owner, repo, branch = 'main'] = match;
                return { owner, repo, branch, platform };
            }
        } else if (platform === 'gitee') {
            const match = input.match(/gitee\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/i);
            if (match) {
                const [, owner, repo, branch = 'master'] = match;
                return { owner, repo, branch, platform };
            }
        }

        throw new Error(`无法解析仓库地址: ${input}`);
    }

    /**
     * 获取Raw文件URL（确保以斜杠结尾）
     * @param {Object} repoInfo - 仓库信息
     * @param {string} filePath - 文件路径
     * @returns {string}
     */
    static getRawURL(repoInfo, filePath = '') {
        const { owner, repo, branch, platform } = repoInfo;
        if (platform === 'github') {
            return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
        } else {
            return `https://gitee.com/${owner}/${repo}/raw/${branch}/${filePath}`;
        }
    }

    static getAPIURL(repoInfo, path = '') {
        const { owner, repo, branch, platform } = repoInfo;
        if (platform === 'github') {
            return `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
        } else {
            return `https://gitee.com/api/v5/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
        }
    }
}

// ==================== 远程文件列表模块 ====================
class RemoteFileLister {
    /**
     * 获取目录内容（修复Gitee 403问题）
     * @param {string} apiURL - API地址
     * @returns {Promise<Array<{name: string, path: string, type: 'file'|'dir', download_url: string}>>}
     */
    static async fetchDirectory(apiURL) {
        return new Promise((resolve) => {
            const oReq = new XMLHttpRequest();
            oReq.open('GET', apiURL);
            
            // 修复Gitee 403：添加User-Agent头
            oReq.setRequestHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            oReq.setRequestHeader('Accept', 'application/vnd.github.v3+json');
            
            oReq.onload = function() {
                if (this.status >= 200 && this.status < 300) {
                    try {
                        const data = JSON.parse(this.responseText);
                        resolve(Array.isArray(data) ? data : []);
                    } catch (e) {
                        console.error('解析目录列表失败:', e);
                        resolve([]);
                    }
                } else {
                    console.error(`获取目录失败: ${this.status}`);
                    resolve([]);
                }
            };
            
            oReq.onerror = function() {
                console.error('网络请求失败');
                resolve([]);
            };
            
            oReq.send();
        });
    }

    /**
     * 递归获取所有文件（实际遍历子目录）
     * @param {Object} repoInfo - 仓库信息
     * @param {string} path - 当前路径
     * @returns {Promise<Array<{remotePath: string, localPath: string, type: string}>>}
     */
    static async getAllFiles(repoInfo, path = '') {
        const apiURL = GitURLParser.getAPIURL(repoInfo, path);
        const items = await this.fetchDirectory(apiURL);
        const files = [];

        for (const item of items) {
            if (item.name === '.gitkeep') continue;
            
            if (item.type === 'file') {
                files.push({
                    remotePath: item.path,
                    localPath: `extension/${LIT_CONFIG.name}/${item.path}`,
                    type: this.getFileType(item.name)
                });
            } else if (item.type === 'dir') {
                // 递归获取子目录的实际文件
                const subFiles = await this.getAllFiles(repoInfo, item.path);
                files.push(...subFiles);
            }
        }

        return files;
    }

    /**
     * 根据目录结构配置获取文件列表（递归获取子目录内容）
     * @param {Object} repoInfo - 仓库信息
     * @returns {Promise<Array<{remotePath: string, localPath: string, type: string}>>}
     */
    static async getExtensionFiles(repoInfo) {
        const allFiles = [];
        
        // 1. 根目录文件
        for (const file of LIT_CONFIG.structure.files) {
            allFiles.push({
                remotePath: file,
                localPath: `extension/${LIT_CONFIG.name}/${file}`,
                type: this.getFileType(file)
            });
        }

        // 2. 递归获取各子目录的实际文件（而不是只获取.gitkeep）
        for (const dir of LIT_CONFIG.structure.dirs) {
            const dirFiles = await this.getAllFiles(repoInfo, dir);
            allFiles.push(...dirFiles);
        }

        return allFiles;
    }

    static getFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        if (['js', 'txt', 'md', 'ts', 'css', 'html'].includes(ext)) return 'text';
        if (['json'].includes(ext)) return 'json';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
        if (['mp3', 'ogg', 'wav'].includes(ext)) return 'audio';
        return 'other';
    }
}

// ==================== 下载验证模块 ====================
class DownloadValidator {
    static ERROR_PATTERNS = [
        'Route error', 'File path or ref empty', '404 Not Found',
        'Repository not found', '404 error', 'session-',
        'Cannot GET', 'ENOENT', '无法找到页面'
    ];

    static isValidContent(content, type) {
        if (!content || content.length === 0) return false;
        const contentStr = typeof content === 'string' ? content : new TextDecoder().decode(content);
        
        for (const pattern of this.ERROR_PATTERNS) {
            if (contentStr.includes(pattern)) {
                console.error(`检测到错误内容: ${pattern}`);
                return false;
            }
        }

        if (type === 'json') {
            try {
                JSON.parse(contentStr);
                return true;
            } catch (e) {
                return false;
            }
        }

        if (type === 'image' && content instanceof ArrayBuffer) {
            const arr = new Uint8Array(content);
            return (arr[0] === 0xFF && arr[1] === 0xD8) ||
                   (arr[0] === 0x89 && arr[1] === 0x50) ||
                   (arr[0] === 0x47 && arr[1] === 0x49);
        }

        return true;
    }
}

// ==================== 版本兼容性检查器 ====================
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
        if (!rule || typeof rule !== 'string') return true;
        
        if (rule.includes('x')) {
            const base = rule.replace(/\.x.*$/, '');
            const baseVersion = this.parseVersion(base);
            const gv = this.parseVersion(gameVersion);
            return gv[0] === baseVersion[0] && gv[1] === baseVersion[1];
        }

        const rules = rule.split(' ').filter(r => r && r.trim());
        if (rules.length === 0) return true;

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
        return result;
    }

    /**
     * 获取兼容版本配置（关键修复：明确提示用户version.json未找到）
     * @param {string} gitURL - Git raw URL（已确保以斜杠结尾）
     * @param {string} gameVersion - 游戏版本
     * @param {Function} downloadFn - 下载函数
     * @returns {Promise<{extensionVersion: string, gameVersion: string, branch: string|null, description: string}>}
     */
    async getCompatibleVersion(gitURL, gameVersion, downloadFn) {
        const cacheKey = `${gitURL}|${gameVersion}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const versionInfo = await new Promise((resolve, reject) => {
                const url = `${gitURL}version.json`;
                console.log('[版本检查] 正在获取:', url);
                downloadFn(url, null, 
                    (data) => {
                        try {
                            const parsed = JSON.parse(data);
                            resolve(parsed);
                        } catch (e) {
                            reject(new Error('JSON解析失败: ' + e.message));
                        }
                    },
                    (err) => {
                        reject(new Error(err || '下载失败'));
                    }
                );
            });

            if (versionInfo?.versions && Array.isArray(versionInfo.versions)) {
                const sortedVersions = versionInfo.versions.sort((a, b) =>
                    this.compareVersions(b.extensionVersion || '0.0.0', a.extensionVersion || '0.0.0')
                );

                for (const version of sortedVersions) {
                    if (this.matchVersion(gameVersion, version.gameVersion)) {
                        const config = {
                            extensionVersion: version.extensionVersion || 'unknown',
                            gameVersion: version.gameVersion || '*',
                            branch: version.branch || null,
                            description: version.description || '兼容版本'
                        };
                        this.cache.set(cacheKey, config);
                        return config;
                    }
                }
                
                throw new Error('未找到兼容的版本规则');
            } else {
                throw new Error('version.json 格式无效（缺少versions数组）');
            }
        } catch (e) {
            console.warn(`[版本兼容] 获取version.json失败: ${e.message}`);
            
            // ===== 关键修复：明确提示用户 =====
            if (e.message.includes('404') || e.message.includes('HTTP 403') || e.message.includes('无法获取')) {
                const shouldContinue = await DialogManager.confirm(
                    '⚠️ 未找到版本信息文件',
                    `远程仓库未找到 version.json 文件或访问被拒绝。\n\n` +
                    `错误详情: ${e.message}\n\n` +
                    `可能原因:\n` +
                    `1. 仓库中没有version.json文件\n` +
                    `2. 仓库访问权限问题\n` +
                    `3. 网络连接不稳定\n\n` +
                    `解决方案:\n` +
                    `• 联系扩展作者添加version.json\n` +
                    `• 检查仓库地址是否正确\n` +
                    `• 尝试切换更新源(GitHub/Gitee)\n\n` +
                    `是否继续使用默认分支(${updater?.repoInfo?.branch || 'master'})更新？`,
                    '继续更新',
                    '取消'
                );
                
                if (!shouldContinue) {
                    throw new Error('用户取消更新');
                }
            } else if (e.message.includes('JSON解析失败')) {
                await DialogManager.alert(
                    '⚠️ version.json格式错误',
                    `version.json 文件格式不正确:\n\n${e.message}\n\n将使用默认配置继续。`
                );
            }

            const fallback = {
                extensionVersion: 'unknown',
                gameVersion: '*',
                branch: null,
                description: '默认分支（无版本限制）'
            };
            this.cache.set(cacheKey, fallback);
            return fallback;
        }
    }
}

// ==================== 扩展更新器 ====================
class ExtensionUpdater {
    constructor() {
        this.gitURL = null;
        this.repoInfo = null;
        this.fileList = [];
        this.stats = { success: 0, failed: 0, skipped: 0 };
    }

    async init(gitURL) {
        if (!gitURL) {
            throw new Error('ExtensionUpdater.init: gitURL不能为空');
        }
        const repoInfo = GitURLParser.parseRepoInfo(gitURL);
        this.repoInfo = repoInfo;
        // 确保 gitURL 以斜杠结尾
        this.gitURL = GitURLParser.getRawURL(repoInfo, '');
        console.log(`[Git信息] 平台: ${repoInfo.platform}, 仓库: ${repoInfo.owner}/${repoInfo.repo}, 分支: ${repoInfo.branch}`);
        console.log(`[Git信息] Raw URL: ${this.gitURL}`);
        return repoInfo;
    }

    async prepareFileList() {
        if (!this.repoInfo) throw new Error('未初始化仓库信息');
        const files = await RemoteFileLister.getExtensionFiles(this.repoInfo);
        this.fileList = files.filter(f => !f.remotePath.includes('.gitkeep'));
        console.log('[文件列表] 准备下载', this.fileList.length, '个文件');
        console.log('[文件列表] 文件详情:', this.fileList.map(f => f.remotePath));
        return this.fileList;
    }

    async downloadFile(fileInfo) {
        const { remotePath, localPath, type } = fileInfo;
        const url = GitURLParser.getRawURL(this.repoInfo, remotePath);

        return new Promise((resolve) => {
            const tempPath = `${localPath}.tmp`;

            const onSuccess = () => {
                game.readFile(tempPath, (content) => {
                    if (DownloadValidator.isValidContent(content, type)) {
                        game.readFile(tempPath, (data) => {
                            game.writeFile(data, lib.path.dirname(localPath), lib.path.basename(localPath), 
                                () => {
                                    game.removeFile(tempPath, () => {}, () => {});
                                    this.stats.success++;
                                    resolve({ success: true, file: remotePath, error: null });
                                },
                                (err) => {
                                    game.removeFile(tempPath, () => {}, () => {});
                                    this.stats.failed++;
                                    resolve({ success: false, file: remotePath, error: '写入失败: ' + err });
                                }
                            );
                        });
                    } else {
                        game.removeFile(tempPath, () => {}, () => {});
                        this.stats.failed++;
                        resolve({ success: false, file: remotePath, error: '内容验证失败（可能是错误页面）' });
                    }
                });
            };

            const onError = (err) => {
                this.stats.failed++;
                resolve({ success: false, file: remotePath, error: err || '下载失败' });
            };

            game.download(url, tempPath, onSuccess, onError);
        });
    }

    async update() {
        this.stats = { success: 0, failed: 0, skipped: 0 };
        await this.prepareFileList();

        if (this.fileList.length === 0) {
            throw new Error('未找到需要更新的文件，请检查远程仓库结构');
        }

        const confirmText = `准备下载 ${this.fileList.length} 个文件\n\n` +
            `${this.fileList.slice(0, 10).map(f => f.remotePath).join('\n')}\n` +
            `${this.fileList.length > 10 ? `\n...还有${this.fileList.length - 10}个文件` : ''}`;

        const shouldContinue = await DialogManager.confirm('确认更新', confirmText, '开始下载', '取消');
        if (!shouldContinue) {
            return { cancelled: true, stats: this.stats };
        }

        const progressDialog = await DialogManager.loading('正在更新', '准备下载...');
        const results = [];

        for (let i = 0; i < this.fileList.length; i++) {
            const file = this.fileList[i];
            progressDialog.updateText(`[${i + 1}/${this.fileList.length}] ${file.remotePath}`);
            
            const result = await this.downloadFile(file);
            results.push(result);
            
            if (result.success) {
                game.print(`✓ ${file.remotePath}`);
            } else {
                game.print(`✗ ${file.remotePath}: ${result.error}`);
            }
        }

        progressDialog.close();

        const failed = results.filter(r => !r.success);
        const allFailed = failed.length === results.length;
        const hasCritical = failed.some(f => ['extension.js', 'info.json'].includes(f.file));

        if (allFailed) {
            throw new Error('所有文件下载失败，请检查网络连接和仓库地址');
        }

        return {
            cancelled: false,
            stats: this.stats,
            failed: failed,
            hasCritical: hasCritical
        };
    }

    async checkInstalled() {
        const extPath = `extension/${LIT_CONFIG.name}/extension.js`;
        return new Promise((resolve) => {
            game.checkFile(extPath, (result) => resolve(result === 1), () => resolve(false));
        });
    }
}

// ==================== 版本检查 ====================
class VersionChecker {
    static async checkVersion(gitURL) {
        try {
            const repoInfo = GitURLParser.parseRepoInfo(gitURL);
            const remoteUrl = GitURLParser.getRawURL(repoInfo, 'info.json');
            const localPath = `extension/${LIT_CONFIG.name}/info.json`;

            const remoteVersion = await new Promise((resolve) => {
                const oReq = new XMLHttpRequest();
                oReq.open('GET', remoteUrl);
                oReq.onload = function() {
                    if (this.status === 200) {
                        try {
                            const data = JSON.parse(this.responseText);
                            resolve(data.version || 'unknown');
                        } catch {
                            resolve('unknown');
                        }
                    } else {
                        resolve('unknown');
                    }
                };
                oReq.onerror = () => resolve('unknown');
                oReq.send();
            });

            const localVersion = await new Promise((resolve) => {
                game.readFileAsText(localPath, (data) => {
                    try {
                        resolve(JSON.parse(data).version || 'unknown');
                    } catch {
                        resolve('not-found');
                    }
                }, () => resolve('not-found'));
            });

            return {
                hasUpdate: remoteVersion !== 'unknown' && remoteVersion !== localVersion,
                remoteVersion,
                localVersion
            };
        } catch (e) {
            console.warn('版本检查失败:', e);
            return { hasUpdate: false, remoteVersion: 'unknown', localVersion: 'unknown' };
        }
    }
}

// ==================== UI交互流程 ====================
const UpdateFlow = (() => {
    const showExtensionInfo = async () => {
        const installed = await new ExtensionUpdater().checkInstalled();
        const localVersion = await new Promise((resolve) => {
            const path = `extension/${LIT_CONFIG.name}/info.json`;
            game.readFileAsText(path, (data) => {
                try { resolve(JSON.parse(data).version || 'unknown'); }
                catch { resolve('unknown'); }
            }, () => resolve('未安装'));
        });

        const info = `扩展名称: ${LIT_CONFIG.name}\n` +
            `安装状态: ${installed ? '已安装' : '未安装'}\n` +
            `本地版本: ${localVersion}\n` +
            `GitHub: ${LIT_CONFIG.github}\n` +
            `Gitee: ${LIT_CONFIG.gitee}\n\n` +
            `更新内容:\n` +
            `  核心文件: ${LIT_CONFIG.structure.files.join(', ')}\n` +
            `  资源目录: ${LIT_CONFIG.structure.dirs.join(', ')}`;

        await DialogManager.alert('扩展信息', info);
    };

    const selectPlatform = async () => {
        return await DialogManager.confirm(
            '选择更新源',
            `请选择《${LIT_CONFIG.name}》的更新源：\n\n` +
            `GitHub: 国际源，适合海外用户\n` +
            `Gitee: 国内源，速度快`,
            '使用 Gitee',
            '使用 GitHub'
        ) ? 'gitee' : 'github';
    };

    const performUpdate = async () => {
        const updater = new ExtensionUpdater();
        const versionChecker = new VersionCompatibilityChecker();

        try {
            // 1. 检查是否已安装
            const installed = await updater.checkInstalled();
            if (!installed) {
                const shouldInstall = await DialogManager.confirm(
                    '扩展未安装',
                    `未检测到《${LIT_CONFIG.name}》扩展，是否全新安装？`,
                    '全新安装',
                    '取消'
                );
                if (!shouldInstall) return;
            }

            // 2. 选择平台并初始化
            const platform = await selectPlatform();
            const baseURL = platform === 'gitee' ? LIT_CONFIG.gitee : LIT_CONFIG.github;
            await updater.init(baseURL);
            console.log(`[更新] 使用 URL: ${updater.gitURL}`);

            // 3. 版本兼容性检查（关键：包含用户提示）
            const versionInfo = await versionChecker.getCompatibleVersion(
                updater.gitURL,
                lib.version || '1.0.0',
                (_url, _folder, onsuccess, onerror) => {
                    const oReq = new XMLHttpRequest();
                    oReq.open('GET', `${updater.gitURL}version.json`);
                    
                    // 修复403：添加User-Agent
                    oReq.setRequestHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
                    
                    oReq.onload = function() {
                        if (this.status === 200) onsuccess(this.responseText);
                        else onerror(new Error(`HTTP ${this.status}`));
                    };
                    oReq.onerror = () => onerror(new Error('网络请求失败'));
                    oReq.send();
                }
            );

            // 4. 使用指定分支
            if (versionInfo.branch) {
                const testRepoInfo = { ...updater.repoInfo, branch: versionInfo.branch };
                const testUrl = GitURLParser.getRawURL(testRepoInfo, 'info.json');
                
                const branchValid = await new Promise(resolve => {
                    const oReq = new XMLHttpRequest();
                    oReq.open('HEAD', testUrl);
                    oReq.setRequestHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
                    oReq.onload = () => resolve(oReq.status === 200);
                    oReq.onerror = () => resolve(false);
                    oReq.send();
                });

                if (branchValid) {
                    updater.repoInfo.branch = versionInfo.branch;
                    updater.gitURL = GitURLParser.getRawURL(updater.repoInfo, '');
                    console.log(`[分支] 使用指定分支: ${versionInfo.branch}`);
                    console.log(`[分支] 新 URL: ${updater.gitURL}`);
                } else {
                    console.warn(`[分支] 指定分支 "${versionInfo.branch}" 无效，回退到主分支`);
                    await DialogManager.alert(
                        '⚠️ 分支不存在',
                        `远程分支 "${versionInfo.branch}" 不存在或无法访问。\n\n将回退到使用平台默认分支。`
                    );
                }
            }

            // 5. 执行更新
            const result = await updater.update();

            // 6. 显示结果
            if (!result.cancelled) {
                if (result.failed.length > 0) {
                    const failedList = result.failed.slice(0, 5).map(f => `${f.file}: ${f.error}`).join('\n');
                    const more = result.failed.length > 5 ? `\n...还有${result.failed.length - 5}个文件` : '';
                    
                    await DialogManager.alert(
                        '更新完成（部分失败）',
                        `成功: ${result.stats.success} 个\n` +
                        `失败: ${result.stats.failed} 个\n` +
                        `失败文件:\n${failedList}${more}\n\n` +
                        `失败文件可能不影响核心功能，请检查网络连接和仓库地址。`
                    );
                } else {
                    await DialogManager.alert(
                        '✅ 更新成功',
                        `所有文件下载完成！\n\n` +
                        `成功: ${result.stats.success} 个文件\n` +
                        `扩展已更新到最新版本。`
                    );
                }

                // 7. 询问是否重启
                const shouldRestart = await DialogManager.confirm(
                    '重启游戏',
                    '扩展更新完成，需要重启游戏才能生效。\n\n是否立即重启？',
                    '立即重启',
                    '稍后手动重启'
                );
                
                if (shouldRestart) {
                    game.reload();
                }
            }
        } catch (error) {
            console.error('更新失败:', error);
            await DialogManager.alert(
                '❌ 更新失败',
                `错误信息: ${error.message}\n\n` +
                `请检查：\n` +
                `1. 网络连接是否正常\n` +
                `2. 更新源是否可访问\n` +
                `3. 仓库地址是否正确\n` +
                `4. 分支名称是否正确\n` +
                `5. 是否有访问权限（Gitee可能需要登录）`
            );
        }
    };

    const showMainMenu = async () => {
        const action = await DialogManager.choice(
            '叁岛世界更新工具',
            `《${LIT_CONFIG.name}》扩展管理器\n\n` +
            `选择操作：\n` +
            `1. 更新/安装扩展 - 下载最新版本\n` +
            `2. 查看扩展信息 - 显示当前状态和配置\n` +
            `3. 强制重新下载 - 清除缓存重新下载`,
            ['更新/安装', '查看信息', '强制更新', '取消']
        );
        return action;
    };

    return {
        async main() {
            try {
                const action = await showMainMenu();
                
                switch (action) {
                    case 0:
                        await performUpdate();
                        break;
                    case 1:
                        await showExtensionInfo();
                        break;
                    case 2: {
                        const confirm = await DialogManager.confirm(
                            '强制更新',
                            '这将重新下载所有文件，可能覆盖本地修改。\n\n是否继续？',
                            '强制更新',
                            '取消'
                        );
                        if (confirm) {
                            await performUpdate();
                        }
                        break;
                    }
                    default:
                        return;
                }
            } catch (error) {
                console.error('UI流程错误:', error);
                await DialogManager.alert('流程错误', error.message);
            }
        }
    };
})();

// ==================== 主API ====================
const Lit_update = {
    async showUI() {
        await UpdateFlow.main();
    },

    async quickUpdate() {
        try {
            console.log('[快速更新] 开始...');
            const updater = new ExtensionUpdater();
            const versionChecker = new VersionCompatibilityChecker();
            
            await updater.init(LIT_CONFIG.gitee);
            console.log(`[快速更新] 使用: ${updater.gitURL}`);
            
            const versionInfo = await versionChecker.getCompatibleVersion(
                updater.gitURL,
                lib.version || '1.0.0',
                (_url, _folder, onsuccess, onerror) => {
                    const oReq = new XMLHttpRequest();
                    oReq.open('GET', `${updater.gitURL}version.json`);
                    oReq.setRequestHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
                    oReq.onload = function() {
                        if (this.status === 200) onsuccess(this.responseText);
                        else onerror(new Error(`HTTP ${this.status}`));
                    };
                    oReq.onerror = () => onerror(new Error('网络请求失败'));
                    oReq.send();
                }
            );
            
            if (versionInfo.branch) {
                const testRepoInfo = { ...updater.repoInfo, branch: versionInfo.branch };
                updater.repoInfo = testRepoInfo;
                updater.gitURL = GitURLParser.getRawURL(testRepoInfo, '');
            }

            const result = await updater.update();
            console.log('[快速更新] 完成:', result);
            return result;
        } catch (error) {
            console.error('[快速更新] 失败:', error);
            throw error;
        }
    },

    get config() {
        return { ...LIT_CONFIG };
    }
};

export default Lit_update;

/**
 * 快速生成 Directory.json 工具函数
 * 用于扫描指定目录并生成符合无名杀扩展更新格式的文件索引
 * 
 * @param {string} dirPath - 要扫描的目录路径（相对或绝对）
 * @param {Object} options - 配置选项
 * @param {string[]} options.excludeDirs - 排除的目录名列表
 * @param {string[]} options.excludeFiles - 排除的文件名列表
 * @param {string[]} options.excludeExts - 排除的文件扩展名列表
 * @param {boolean} options.includeHidden - 是否包含隐藏文件（以.开头）
 * @returns {Promise<Object>} 返回Directory.json对象 { "文件路径": "文件类型" }
 * 
 * @example
 * // Node.js环境下使用
 * const dirJson = await generateDirectoryJson('./extension/叁岛世界');
 * console.log(JSON.stringify(dirJson, null, 4));
 * 
 * // 输出示例:
 * {
 *     "extension.js": "text",
 *     "info.json": "json",
 *     "style/main.css": "text",
 *     "image/hero.webp": "image",
 *     "audio/bgm.mp3": "audio"
 * }
 */
export async function generateDirectoryJson(dirPath, options = {}) {
    // 默认过滤规则（与update.js保持一致）
    const DEFAULT_EXCLUDE_DIRS = ['.git', '.vscode', '__pycache__', 'node_modules'];
    const DEFAULT_EXCLUDE_FILES = ['.gitkeep', '.DS_Store', 'Thumbs.db', 'Directory.json'];
    const DEFAULT_EXCLUDE_EXTS = ['.tmp', '.swp', '.log'];

    const config = {
        excludeDirs: options.excludeDirs || DEFAULT_EXCLUDE_DIRS,
        excludeFiles: options.excludeFiles || DEFAULT_EXCLUDE_FILES,
        excludeExts: options.excludeExts || DEFAULT_EXCLUDE_EXTS,
        includeHidden: options.includeHidden || false
    };

    // 判断运行环境
    const isNodeJs = typeof window !== 'undefined' ? 
        localStorage.getItem("noname_inited") === "nodejs" : 
        true;

    // 文件类型映射
    function getFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        if (['js', 'txt', 'md', 'ts', 'css', 'html'].includes(ext)) return 'text';
        if (['json'].includes(ext)) return 'json';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico'].includes(ext)) return 'image';
        if (['mp3', 'ogg', 'wav', 'm4a'].includes(ext)) return 'audio';
        return 'other';
    }

    // 判断是否应包含该文件
    function shouldInclude(name, isDirectory) {
        // 隐藏文件过滤
        if (!config.includeHidden && name.startsWith('.')) return false;
        
        // 目录过滤
        if (isDirectory && config.excludeDirs.includes(name)) return false;
        
        // 文件过滤
        if (!isDirectory) {
            if (config.excludeFiles.includes(name)) return false;
            if (config.excludeExts.some(ext => name.endsWith(ext))) return false;
        }
        
        return true;
    }

    // ==================== Node.js 实现 ====================
    if (isNodeJs) {
        const fs = require('fs').promises;
        const path = require('path');
        const { access } = require('fs').promises;

        async function scanNodeJsDir(currentPath, basePath) {
            const result = {};
            
            try {
                // 检查目录是否存在
                await access(currentPath);
            } catch {
                throw new Error(`目录不存在: ${currentPath}`);
            }

            const entries = await fs.readdir(currentPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);
                const relativePath = path.relative(basePath, fullPath).replace(/\\/g, '/');

                // 跳过根目录的Directory.json本身
                if (entry.name === 'Directory.json') continue;

                if (entry.isDirectory()) {
                    if (shouldInclude(entry.name, true)) {
                        const subResult = await scanNodeJsDir(fullPath, basePath);
                        Object.assign(result, subResult);
                    }
                } else if (entry.isFile()) {
                    if (shouldInclude(entry.name, false)) {
                        result[relativePath] = getFileType(entry.name);
                    }
                }
            }

            return result;
        }

        // 规范化输入路径
        const normalizedPath = path.resolve(dirPath);
        return await scanNodeJsDir(normalizedPath, normalizedPath);
    }

    // ==================== 浏览器环境实现 ====================
    else {
        // 浏览器环境需要用户选择目录（使用File System Access API）
        console.warn('浏览器环境下需要选择目录');
        
        // 简化实现：接受用户拖放的文件列表或手动构建
        // 这里提供一个基于FileList的辅助函数
        async function scanBrowserFiles(fileList, baseDir = '') {
            const result = {};
            
            for (const file of fileList) {
                const relativePath = baseDir ? `${baseDir}/${file.name}` : file.name;
                
                if (shouldInclude(file.name, false)) {
                    result[relativePath] = getFileType(file.name);
                }
            }
            
            return result;
        }

        // 返回一个辅助对象
        return {
            fromFileList: scanBrowserFiles,
            note: '浏览器环境请使用 fromFileList(fileList) 方法'
        };
    }
}
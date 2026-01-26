import { lib, game, ui, get, ai, _status } from '../../../../noname.js';
import { Lit_Dialog as DialogManager } from './extraUI.js';

// ==================== 配置定义 ====================
const LIT_CONFIG = {
    name: '叁岛世界',
    github: 'https://github.com/yooruh/LIT_for_noname',
    gitee: 'https://gitee.com/yooruh/LIT_for_noname'
};

// ==================== 环境检测与核心常量 ====================
const isNodeJs = localStorage.getItem("noname_inited") === "nodejs";

// 文件过滤规则（严格模式）
const EXCLUDE_DIRS = ['.git', '.vscode', '__pycache__', 'node_modules'];
const EXCLUDE_FILES = ['.gitkeep', '.DS_Store', 'Thumbs.db', '.gitignore'];
const EXCLUDE_EXTS = ['.tmp', '.swp', '.log'];

// ==================== Git URL解析器 ====================
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
            const match = input.match(/gitee.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/i);
            if (match) {
                const [, owner, repo, branch = 'master'] = match;
                return { owner, repo, branch, platform };
            }
        }

        throw new Error(`无法解析仓库地址: ${input}`);
    }

    static getRawURL(repoInfo, filePath = '') {
        const { owner, repo, branch, platform } = repoInfo;
        const path = filePath ? filePath.replace(/\\/g, '/') : '';

        if (platform === 'github') {
            return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
        } else {
            return `https://gitee.com/${owner}/${repo}/raw/${branch}/${path}`;
        }
    }

    // 获取备用URL（当主源失败时切换）
    static getFallbackURL(repoInfo, filePath = '') {
        const { owner, repo, branch } = repoInfo;
        const path = filePath ? filePath.replace(/\\/g, '/') : '';

        // GitHub失败时用jsDelivr CDN，Gitee失败时切换GitHub
        if (repoInfo.platform === 'github') {
            return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${path}`;
        } else {
            return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
        }
    }
}

// ==================== 改进的请求调度器（解决403问题） ====================
class RequestScheduler {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.retryDelay = 1000;
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    }

    schedule(url, fallbackUrl, onsuccess, onerror) {
        const task = {
            url,
            fallbackUrl,
            onsuccess,
            onerror,
            retryCount: 0,
            execute: () => {
                // 改进的下载方法，使用更好的错误处理
                const downloadData = (url, onsuccess, onerror) => {
                    if (isNodeJs) {
                        // Node.js 环境使用原生模块
                        try {
                            const http = require("http");
                            const https = require("https");
                            const urlModule = require("url");

                            const opts = urlModule.parse(encodeURI(url));
                            opts.headers = {
                                "User-Agent": this.userAgent,
                                "Accept": "*/*",
                                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
                            };

                            (url.startsWith("https") ? https : http).get(opts, function (response) {
                                let data = [];
                                response.on('data', chunk => data.push(chunk));
                                response.on('end', () => {
                                    const buffer = Buffer.concat(data);
                                    onsuccess(buffer);
                                });
                                response.on('error', onerror);
                            }).on('error', onerror);
                        } catch (e) {
                            // 如果Node.js模块不可用，回退到浏览器方法
                            this.browserDownload(url, onsuccess, onerror);
                        }
                    } else {
                        // 浏览器环境使用fetch API
                        this.browserDownload(url, onsuccess, onerror);
                    }
                };

                downloadData(task.url,
                    (content) => {
                        try {
                            // 内容初步验证
                            const contentStr = typeof content === 'string' ? content :
                                content instanceof ArrayBuffer ? new TextDecoder().decode(content) :
                                    content instanceof Buffer ? content.toString() : content;

                            if (!this.isValidResponse(contentStr)) {
                                throw new Error('Invalid response content');
                            }
                            task.onsuccess(content);
                        } catch (e) {
                            task.onerror(e.message);
                        }
                    },
                    (err) => {
                        task.retryCount++;
                        console.warn(`[请求] ${task.url} 失败: ${err}, 重试次数: ${task.retryCount}`);

                        // 403错误的根本处理：切换备用源
                        if ((err.message && (err.message.includes('403') || err.message.includes('429'))) && task.fallbackUrl) {
                            console.log(`[请求] 尝试备用源: ${task.fallbackUrl}`);
                            task.url = task.fallbackUrl;
                            task.fallbackUrl = null;
                            task.retryCount = 0;
                        }

                        // 最大重试3次
                        if (task.retryCount <= 3) {
                            const delay = Math.pow(2, task.retryCount - 1) * this.retryDelay;
                            setTimeout(() => task.execute(), delay);
                        } else {
                            task.onerror(err);
                        }
                    }
                );
            }
        };

        this.queue.push(task);
        this.processQueue();
    }

    browserDownload(url, onsuccess, onerror) {
        fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': this.userAgent,
                'Accept': '*/*',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
            },
            mode: 'cors'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.arrayBuffer();
            })
            .then(data => {
                onsuccess(data);
            })
            .catch(error => {
                onerror(error);
            });
    }

    isValidResponse(content) {
        if (!content || content.length === 0) return false;

        const contentStr = typeof content === 'string' ? content :
            content instanceof ArrayBuffer ? new TextDecoder().decode(content) :
                content instanceof Buffer ? content.toString() : '';

        // 检查是否是HTML错误页面
        if (contentStr.includes('404 Not Found') ||
            contentStr.includes('<!DOCTYPE html>') ||
            contentStr.includes('403 Forbidden') ||
            contentStr.includes('Route error') ||
            contentStr.includes('File path or ref empty') ||
            contentStr.includes('Repository not found') ||
            contentStr.includes('Cannot GET')) {
            return false;
        }

        return true;
    }

    processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const runNext = () => {
            if (this.queue.length === 0) {
                this.isProcessing = false;
                return;
            }

            const task = this.queue.shift();
            setTimeout(() => {
                task.execute();
                runNext();
            }, 800); // 控制请求频率，减少429错误
        };

        runNext();
    }
}

// ==================== 内容验证器 ====================
class DownloadValidator {
    static ERROR_PATTERNS = [
        'Route error', 'File path or ref empty', '404 Not Found',
        'Repository not found', '404 error', 'session-',
        'Cannot GET', 'ENOENT', '无法找到页面', '<!DOCTYPE html>',
        'Access Denied', 'Forbidden', 'Error 403', 'Error 429'
    ];

    static isValidContent(content, type) {
        if (!content || content.length === 0) return false;

        const contentStr = typeof content === 'string' ? content :
            content instanceof ArrayBuffer ? new TextDecoder().decode(content) :
                content instanceof Buffer ? content.toString() : '';

        for (const pattern of this.ERROR_PATTERNS) {
            if (contentStr.includes(pattern)) {
                console.error(`[验证] 检测到错误内容: ${pattern}`);
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

        if (type === 'image' && (content instanceof ArrayBuffer || content instanceof Buffer)) {
            const arr = new Uint8Array(content.slice(0, 12));
            return (arr[0] === 0xFF && arr[1] === 0xD8) || // JPEG
                (arr[0] === 0x89 && arr[1] === 0x50) || // PNG
                (arr[0] === 0x47 && arr[1] === 0x49) || // GIF
                (arr[0] === 0x52 && arr[1] === 0x49 && arr[8] === 0x57); // WebP
        }

        if (type === 'audio' && (content instanceof ArrayBuffer || content instanceof Buffer)) {
            const arr = new Uint8Array(content.slice(0, 4));
            return (arr[0] === 0xFF && arr[1] === 0xFB) || // MP3
                (arr[0] === 0x4F && arr[1] === 0x67 && arr[2] === 0x67 && arr[3] === 0x53); // OGG
        }

        return true;
    }
}

// ==================== 版本兼容性检查器 ====================
class VersionCompatibilityChecker {
    constructor() {
        this.cache = new Map();
    }

    async getVersionInfo(gitURL, gameVersion) {
        const cacheKey = `${gitURL}|${gameVersion}`;
        if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

        return new Promise((resolve, reject) => {
            const scheduler = new RequestScheduler();

            scheduler.schedule(
                `${gitURL}version.json`,
                null, // version.json不使用备用源
                (data) => {
                    try {
                        const contentStr = data instanceof ArrayBuffer ? new TextDecoder().decode(data) : data.toString();
                        const versionInfo = JSON.parse(contentStr);
                        if (!versionInfo?.versions || !Array.isArray(versionInfo.versions)) {
                            throw new Error('version.json格式无效');
                        }
                        this.cache.set(cacheKey, versionInfo);
                        resolve(versionInfo);
                    } catch (e) {
                        reject(e);
                    }
                },
                (err) => {
                    // version.json失败不影响继续更新
                    console.warn(`[版本检查] 失败: ${err}`);
                    DialogManager.alert('⚠️ 版本检查失败', '未找到version.json，使用默认分支更新');
                    resolve({ versions: [] });
                }
            );
        });
    }

    async getCompatibleVersion(gitURL, gameVersion) {
        const versionInfo = await this.getVersionInfo(gitURL, gameVersion);

        if (!versionInfo.versions || versionInfo.versions.length === 0) {
            return {
                extensionVersion: 'unknown',
                gameVersion: '*',
                branch: null,
                description: '默认分支'
            };
        }

        const sortedVersions = versionInfo.versions.sort((a, b) =>
            this.compareVersions(b.extensionVersion || '0.0.0', a.extensionVersion || '0.0.0')
        );

        for (const version of sortedVersions) {
            if (this.matchVersion(gameVersion, version.gameVersion)) {
                return {
                    extensionVersion: version.extensionVersion || 'unknown',
                    gameVersion: version.gameVersion || '*',
                    branch: version.branch || null,
                    description: version.description || '兼容版本'
                };
            }
        }

        return {
            extensionVersion: 'unknown',
            gameVersion: '*',
            branch: null,
            description: '默认分支'
        };
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
                case '=': case '==': result = result && compare === 0; break;
            }
        }
        return result;
    }
}

// ==================== 改进的事务性更新器 ====================
class ExtensionUpdater {
    constructor() {
        this.gitURL = null;
        this.repoInfo = null;
        this.branch = null;
        this.tempDir = null;
        this.targetDir = null;
        this.stats = { success: 0, failed: 0, total: 0 };
    }

    async init(gitURL) {
        if (!gitURL) throw new Error('gitURL不能为空');

        this.repoInfo = GitURLParser.parseRepoInfo(gitURL);
        this.gitURL = GitURLParser.getRawURL(this.repoInfo, '');
        this.targetDir = `extension/${LIT_CONFIG.name}`;

        // 改进临时目录路径处理
        this.tempDir = `${this.targetDir}/__temp_${Date.now()}`;

        console.log(`[初始化] 平台: ${this.repoInfo.platform}, 仓库: ${this.repoInfo.owner}/${this.repoInfo.repo}`);
        console.log(`[初始化] 临时目录: ${this.tempDir}`);
        return this.repoInfo;
    }

    async cleanOldTempDirectory() {
        return new Promise((resolve) => {
            game.checkDir(this.tempDir, (exists) => {
                if (exists === 1) {
                    console.log(`[清理] 删除旧临时目录: ${this.tempDir}`);
                    game.removeDir(this.tempDir, () => resolve(), () => resolve());
                } else {
                    resolve();
                }
            }, () => resolve());
        });
    }

    async createTempDirectory() {
        return new Promise((resolve) => {
            game.ensureDirectory(this.tempDir, () => {
                console.log(`[目录] 创建临时目录: ${this.tempDir}`);
                resolve();
            }, true);
        });
    }

    async prepareFileList(branch) {
        if (!this.repoInfo) throw new Error('未初始化仓库信息');

        // 使用指定分支
        const branchRepoInfo = { ...this.repoInfo, branch: branch || this.repoInfo.branch };
        const branchGitURL = GitURLParser.getRawURL(branchRepoInfo, '');
        this.branch = branchRepoInfo.branch;

        console.log(`[文件列表] 使用分支: ${this.branch}`);

        // 获取Directory.json
        const directory = await this.fetchDirectoryJsonWithFallback(branchGitURL);
        if (!directory) {
            throw new Error('无法获取Directory.json，请检查仓库文件');
        }

        // 转换为文件列表
        const files = [];
        for (const [filePath, fileInfo] of Object.entries(directory)) {
            if (this.shouldIncludeFile(filePath)) {
                // 防止空路径
                if (!filePath || filePath.trim() === '') continue;

                files.push({
                    remotePath: filePath,
                    tempPath: `${this.tempDir}/${filePath}`,
                    targetPath: `${this.targetDir}/${filePath}`,
                    type: fileInfo.type || 'text'
                });
            }
        }

        this.fileList = files;
        this.stats.total = files.length;
        console.log(`[文件列表] 共 ${files.length} 个文件`);
        return files;
    }

    shouldIncludeFile(filePath) {
        if (!filePath || filePath.trim() === '') return false;

        const name = filePath.split('/').pop() || '';
        const dirParts = filePath.split('/').slice(0, -1);

        // 排除特定目录
        for (const part of dirParts) {
            if (part && EXCLUDE_DIRS.includes(part)) return false;
        }

        // 排除特定文件
        if (name && (EXCLUDE_FILES.includes(name) || name.startsWith('.'))) return false;

        // 排除特定扩展名
        if (name && EXCLUDE_EXTS.some(ext => name.endsWith(ext))) return false;

        return true;
    }

    // 使用后备源获取Directory.json
    fetchDirectoryJsonWithFallback(gitURL) {
        return new Promise((resolve) => {
            const scheduler = new RequestScheduler();
            const fallbackUrl = GitURLParser.getFallbackURL(this.repoInfo, 'Directory.json');

            scheduler.schedule(
                `${gitURL}Directory.json`,
                fallbackUrl,
                (data) => {
                    try {
                        const contentStr = data instanceof ArrayBuffer ? new TextDecoder().decode(data) : data.toString();

                        // 验证内容是否为有效JSON
                        if (!DownloadValidator.isValidContent(contentStr, 'json')) {
                            console.error('[目录] 获取到无效的JSON内容');
                            resolve(null);
                            return;
                        }

                        const directory = JSON.parse(contentStr);
                        resolve(directory);
                    } catch (e) {
                        console.error(`[目录] JSON解析失败: ${e}`);
                        resolve(null);
                    }
                },
                (err) => {
                    console.error(`[目录] 获取失败: ${err}`);
                    resolve(null);
                }
            );
        });
    }

    async downloadFile(fileInfo) {
        const { remotePath, tempPath, type } = fileInfo;

        // 验证路径
        if (!remotePath || remotePath.trim() === '') {
            return { success: false, file: remotePath, error: '无效的远程路径' };
        }

        const url = GitURLParser.getRawURL(this.repoInfo, remotePath);
        const fallbackUrl = GitURLParser.getFallbackURL(this.repoInfo, remotePath);

        return new Promise((resolve) => {
            const scheduler = new RequestScheduler();

            scheduler.schedule(
                url,
                fallbackUrl,
                (content) => {
                    try {
                        // 验证内容
                        if (!DownloadValidator.isValidContent(content, type)) {
                            console.error(`[下载] 无效内容: ${remotePath}`);
                            this.stats.failed++;
                            resolve({ success: false, file: remotePath, error: '下载内容无效' });
                            return;
                        }

                        // 确保临时目录存在
                        const dirPath = lib.path.dirname(tempPath);
                        if (!dirPath || dirPath === '.') {
                            console.error(`[下载] 无效的路径: ${tempPath}`);
                            this.stats.failed++;
                            resolve({ success: false, file: remotePath, error: '无效的路径' });
                            return;
                        }

                        // 写入临时文件
                        const writeCallback = () => {
                            if (isNodeJs) {
                                const absolutePath = `${__dirname}/${tempPath}`;
                                const buffer = content instanceof ArrayBuffer ?
                                    Buffer.from(new Uint8Array(content)) :
                                    Buffer.from(content);
                                lib.node.fs.writeFileSync(absolutePath, buffer);
                            } else {
                                // 浏览器环境的写入方法
                                const contentStr = content instanceof ArrayBuffer ?
                                    new TextDecoder().decode(content) :
                                    content.toString();
                                game.writeFile(contentStr, lib.path.dirname(tempPath), lib.path.basename(tempPath), () => { }, () => { });
                            }
                            this.stats.success++;
                            resolve({ success: true, file: remotePath, error: null });
                        };

                        if (isNodeJs) {
                            const absoluteDir = `${__dirname}/${dirPath}`;
                            game.ensureDirectory(absoluteDir, writeCallback, true);
                        } else {
                            game.ensureDirectory(dirPath, writeCallback, true);
                        }
                    } catch (e) {
                        console.error(`[下载] 写入失败: ${remotePath}`, e);
                        this.stats.failed++;
                        resolve({ success: false, file: remotePath, error: e.message });
                    }
                },
                (err) => {
                    console.error(`[下载] 失败: ${remotePath}`, err);
                    this.stats.failed++;
                    resolve({ success: false, file: remotePath, error: err.message || err });
                }
            );
        });
    }

    async commitUpdate() {
        // 1. 删除旧扩展目录
        await new Promise((resolve) => {
            game.checkDir(this.targetDir, (exists) => {
                if (exists === 1) {
                    console.log(`[提交] 删除旧目录: ${this.targetDir}`);
                    game.removeDir(this.targetDir, () => resolve(), () => resolve());
                } else {
                    resolve();
                }
            }, () => resolve());
        });

        // 2. 移动临时目录到正式位置
        return new Promise((resolve, reject) => {
            if (isNodeJs) {
                const fs = lib.node.fs;
                const oldPath = `${__dirname}/${this.tempDir}`;
                const newPath = `${__dirname}/${this.targetDir}`;

                fs.rename(oldPath, newPath, (err) => {
                    if (err) {
                        console.error(`[提交] 移动目录失败: ${err}`);
                        reject(err);
                    } else {
                        console.log(`[提交] 更新完成: ${this.targetDir}`);
                        resolve();
                    }
                });
            } else {
                // 浏览器环境
                this.moveDirectoryBrowser(this.tempDir, this.targetDir).then(resolve).catch(reject);
            }
        });
    }

    async moveDirectoryBrowser(src, dest) {
        return new Promise((resolve, reject) => {
            game.getFileList(src, (folders, files) => {
                const createFolders = async () => {
                    for (const folder of folders) {
                        if (folder) { // 验证文件夹名不为空
                            await new Promise((res) => {
                                game.ensureDirectory(dest + '/' + folder, () => res(), true);
                            });
                        }
                    }
                };

                const moveAllFiles = async () => {
                    for (const file of files) {
                        if (file) { // 验证文件名不为空
                            await new Promise((res) => {
                                const srcPath = `${src}/${file}`;
                                const destPath = `${dest}/${file}`;
                                game.readFile(srcPath, (content) => {
                                    game.writeFile(content, lib.path.dirname(destPath), lib.path.basename(destPath),
                                        () => res(), (err) => { console.error(err); res(); });
                                }, (err) => { console.error(err); res(); });
                            });
                        }
                    }
                };

                createFolders()
                    .then(() => moveAllFiles())
                    .then(() => {
                        game.removeDir(src, () => resolve(), () => resolve());
                    })
                    .catch(reject);
            }, reject);
        });
    }

    async checkInstalled() {
        const extPath = `${this.targetDir}/extension.js`;
        return new Promise((resolve) => {
            game.checkFile(extPath, (result) => resolve(result === 1), () => resolve(false));
        });
    }

    async cleanupTemp() {
        return new Promise((resolve) => {
            game.checkDir(this.tempDir, (exists) => {
                if (exists === 1) {
                    game.removeDir(this.tempDir, () => resolve(), () => resolve());
                } else {
                    resolve();
                }
            }, () => resolve());
        });
    }

    async update() {
        this.stats = { success: 0, failed: 0, total: 0 };

        // 1. 清理旧临时目录
        await this.cleanOldTempDirectory();

        // 2. 创建新临时目录
        await this.createTempDirectory();

        // 3. 准备文件列表
        await this.prepareFileList(this.branch);

        // 验证文件列表
        if (!this.fileList || this.fileList.length === 0) {
            throw new Error('文件列表为空，请检查仓库配置');
        }

        // 4. 用户确认
        const confirmText = `版本: ${LIT_CONFIG.name}\n` +
            `分支: ${this.branch}\n` +
            `环境: ${isNodeJs ? 'Node.js' : '浏览器'}\n\n` +
            `准备下载 ${this.fileList.length} 个文件到临时目录\n\n` +
            `${this.fileList.slice(0, 8).map(f => f.remotePath).join('\n')}\n` +
            `${this.fileList.length > 8 ? `\n...还有${this.fileList.length - 8}个文件` : ''}\n\n` +
            `策略: 全部下载成功后自动覆盖旧版本`;

        const shouldContinue = await DialogManager.confirm('确认更新', confirmText, '开始下载', '取消');
        if (!shouldContinue) {
            await this.cleanupTemp();
            return { cancelled: true, stats: this.stats };
        }

        // 5. 下载所有文件
        const progressDialog = await DialogManager.loading('正在更新', '下载中...');
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

        // 6. 检查下载结果
        const failed = results.filter(r => !r.success);
        const allFailed = failed.length === results.length;

        if (allFailed) {
            throw new Error('所有文件下载失败，请检查网络连接和仓库地址');
        }

        if (failed.length > 0) {
            const shouldContinue = await DialogManager.confirm(
                '⚠️ 部分文件下载失败',
                `成功: ${results.filter(r => r.success).length}/${this.fileList.length}\n` +
                `失败: ${failed.length} 个\n\n是否继续更新？`,
                '继续更新', '取消更新'
            );
            if (!shouldContinue) {
                await this.cleanupTemp();
                return { cancelled: true, stats: this.stats };
            }
        }

        // 7. 提交更新
        await DialogManager.loading('正在应用更新', '移动文件到扩展目录...');
        await this.commitUpdate();

        // 8. 清理临时目录
        await this.cleanupTemp();

        return {
            cancelled: false,
            stats: this.stats,
            failed: failed,
            hasCritical: failed.some(f => ['extension.js', 'info.json'].includes(f.file))
        };
    }
}

// ==================== UI交互流程 ====================
const UpdateFlow = (() => {
    const showExtensionInfo = async (updater) => {
        const installed = await updater.checkInstalled();
        const localVersion = await new Promise((resolve) => {
            const path = `${updater.targetDir}/info.json`;
            game.readFileAsText(path, (data) => {
                try { resolve(JSON.parse(data).version || 'unknown'); }
                catch { resolve('unknown'); }
            }, () => resolve('未安装'));
        });

        const info = `扩展名称: ${LIT_CONFIG.name}\n` +
            `安装状态: ${installed ? '已安装' : '未安装'}\n` +
            `本地版本: ${localVersion}\n\n` +
            `运行环境: ${isNodeJs ? 'Node.js' : '浏览器'}\n` +
            `下载策略: 事务性更新（全部成功后才覆盖）`;

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
            // 1. 选择平台
            const platform = await selectPlatform();
            const baseURL = platform === 'gitee' ? LIT_CONFIG.gitee : LIT_CONFIG.github;
            await updater.init(baseURL);

            // 2. 检查安装状态
            const installed = await updater.checkInstalled();
            if (!installed) {
                const shouldInstall = await DialogManager.confirm(
                    '扩展未安装',
                    `未检测到《${LIT_CONFIG.name}》扩展，是否全新安装？`,
                    '全新安装', '取消'
                );
                if (!shouldInstall) return;
            }

            // 3. 获取版本信息
            const versionInfo = await versionChecker.getCompatibleVersion(
                updater.gitURL,
                lib.version || '1.0.0'
            );

            updater.branch = versionInfo.branch || updater.repoInfo.branch;
            console.log(`[更新] 使用分支: ${updater.branch}`);

            // 4. 执行更新
            const result = await updater.update();

            // 5. 显示结果
            if (!result.cancelled) {
                if (result.failed.length > 0) {
                    await DialogManager.alert(
                        '更新完成（部分失败）',
                        `成功: ${result.stats.success}/${result.stats.total}\n` +
                        `失败: ${result.stats.failed} 个文件\n\n扩展已更新到可用版本。`
                    );
                } else {
                    await DialogManager.alert('✅ 更新成功', `所有 ${result.stats.success} 个文件已更新`);
                }

                // 6. 询问重启
                if (await DialogManager.confirm('重启游戏', '扩展更新完成，需要重启游戏才能生效。\n\n是否立即重启？', '立即重启', '稍后')) {
                    game.reload();
                }
            }
        } catch (error) {
            console.error('更新失败:', error);
            await DialogManager.alert(
                '❌ 更新失败',
                `错误: ${error.message}\n\n请检查：\n1. 网络连接\n2. 更新源是否可访问\n3. 仓库是否存在Directory.json`
            );

            await updater.cleanupTemp();
        }
    };

    const showMainMenu = async () => {
        const action = await DialogManager.choice(
            '叁岛世界更新工具',
            `《${LIT_CONFIG.name}》扩展管理器\n\n` +
            `更新策略: 事务性更新（安全）\n` +
            `失败自动切换备用源\n\n` +
            `选择操作：`,
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
                    case 1: {
                        const updater = new ExtensionUpdater();
                        await updater.init(LIT_CONFIG.gitee);
                        await showExtensionInfo(updater);
                        break;
                    }
                    case 2: {
                        if (await DialogManager.confirm('强制更新', '将重新下载所有文件。', '强制更新', '取消')) {
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
    test() {
        // 在扩展的 console 或 update.js 中执行

        // 1. 初始化解析器
        const repoInfo = GitURLParser.parseRepoInfo('https://gitee.com/yooruh/LIT_for_noname');

        // 2. 生成 Directory.json 的 URL
        const directoryUrl = GitURLParser.getRawURL(repoInfo, 'Directory.json');
        console.log('生成的URL:', directoryUrl);
        // 应该输出: https://gitee.com/yooruh/LIT_for_noname/raw/master/Directory.json

        // 3. 直接下载测试
        const scheduler = new RequestScheduler();

        scheduler.schedule(
            directoryUrl,
            null, // 不使用备用源
            (data) => {
                try {
                    const content = data instanceof ArrayBuffer ? new TextDecoder().decode(data) : data.toString();
                    console.log('✅ 下载成功！');
                    console.log('文件大小:', content.length, '字节');
                    console.log('前200个字符:', content.substring(0, 200));

                    // 验证是否为有效JSON
                    const json = JSON.parse(content);
                    console.log('✅ JSON解析成功！');
                    console.log('文件列表数量:', Object.keys(json).length);

                    // 保存到扩展目录
                    const savePath = `extension/${LIT_CONFIG.name}/Test_Directory.json`;
                    game.writeFile(content, lib.path.dirname(savePath), lib.path.basename(savePath),
                        () => console.log('✅ 文件已保存到:', savePath),
                        (err) => console.error('❌ 保存失败:', err)
                    );
                } catch (e) {
                    console.error('❌ 内容验证失败:', e.message);
                }
            },
            (err) => {
                console.error('❌ 下载失败:', err);
            }
        );
    },

    async quickUpdate() {
        try {
            console.log('[快速更新] 开始...');
            const updater = new ExtensionUpdater();
            const versionChecker = new VersionCompatibilityChecker();

            await updater.init(LIT_CONFIG.gitee);

            const versionInfo = await versionChecker.getCompatibleVersion(
                updater.gitURL,
                lib.version || '1.0.0'
            );

            if (versionInfo.branch) {
                updater.branch = versionInfo.branch;
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

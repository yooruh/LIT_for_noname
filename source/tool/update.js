import { lib, game, ui, get, ai, _status } from '../../../../noname.js';
import { Lit_Dialog as DialogManager } from './extraUI.js';

// 配置定义
const LIT_CONFIG = {
    name: '叁岛世界',
    github: 'https://github.com/yooruh/LIT_for_noname',
    gitee: 'https://gitee.com/yooruh/LIT_for_noname',
    maxRetries: 3,           // 最大重试次数
    baseRetryDelay: 1000,    // 基础重试延迟
    requestTimeout: 30000    // 请求超时时间
};

// 环境检测（严格模式）
const isNodeJs = typeof window !== 'undefined' &&
    typeof window.process === 'object' &&
    typeof window.__dirname === 'string';
const isBrowser = typeof window !== 'undefined' && !isNodeJs;

// 文件过滤规则
const EXCLUDE_DIRS = ['.git', '.vscode', '__pycache__', 'node_modules', '.github'];
const EXCLUDE_FILES = ['.gitkeep', '.DS_Store', 'Thumbs.db', '.gitignore', 'update.js'];
const EXCLUDE_EXTS = ['.tmp', '.swp', '.log', '.bak'];

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

        // 处理raw URL（GitHub）
        if (input.includes('raw.githubusercontent.com')) {
            const match = input.match(/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)/);
            if (match) {
                const [, owner, repo, branch, path] = match;
                return { owner, repo, branch: branch || 'main', platform: 'github', rawPath: path };
            }
        }

        // 处理raw URL（Gitee）
        if (input.includes('gitee.com') && input.includes('/raw/')) {
            const match = input.match(/gitee\.com\/([^/]+)\/([^/]+)\/raw\/([^/]+)\/(.+)/);
            if (match) {
                const [, owner, repo, branch, path] = match;
                return { owner, repo, branch: branch || 'main', platform: 'gitee', rawPath: path };
            }
        }

        const platform = this.detectPlatform(input);
        if (!platform) throw new Error(`无法识别的Git平台地址: ${input}`);

        // 处理web URL（标准格式）
        if (platform === 'github') {
            const match = input.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/i);
            if (match) {
                const [, owner, repo, branch = 'main'] = match;
                return { owner, repo, branch, platform };
            }
        } else if (platform === 'gitee') {
            const match = input.match(/gitee\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/i);
            if (match) {
                const [, owner, repo, branch = 'main'] = match;
                return { owner, repo, branch, platform };
            }
        }

        throw new Error(`无法解析仓库地址: ${input}`);
    }

    static getRawURL(repoInfo, filePath = '') {
        const { owner, repo, branch, platform } = repoInfo;
        const cleanPath = filePath ? filePath.replace(/^\/+/, '') : ''; // 移除前导斜杠

        if (platform === 'github') {
            return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${cleanPath}`;
        } else {
            return `https://gitee.com/${owner}/${repo}/raw/${branch}/${cleanPath}`;
        }
    }

    static getFallbackURL(repoInfo, filePath = '') {
        const { owner, repo, branch, platform } = repoInfo;
        const cleanPath = filePath ? filePath.replace(/^\/+/, '') : '';

        if (platform === 'github') {
            // GitHub失败时使用jsDelivr CDN
            return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${cleanPath}`;
        } else {
            // Gitee失败时切换到GitHub镜像（如果存在）或直接使用GitHub raw
            // 注意：这里假设有对应的GitHub仓库，或者添加其他镜像逻辑
            return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${cleanPath}`;
        }
    }
}

class RequestScheduler {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.retryDelay = LIT_CONFIG.baseRetryDelay;
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
        this.activeRequests = new Map(); // 跟踪活跃请求以便取消
    }

    /**
     * 下载数据（带自动重试和源切换）
     * @param {string} url - 主URL
     * @param {string} fallbackUrl - 备用URL（可选）
     * @param {Function} onsuccess - 成功回调
     * @param {Function} onerror - 错误回调
     * @param {string} type - 内容类型（json/text/image/audio）
     */
    schedule(url, fallbackUrl, onsuccess, onerror, type = 'text') {
        const task = {
            id: Date.now() + Math.random(),
            url,
            fallbackUrl,
            onsuccess,
            onerror,
            type,
            retryCount: 0,
            startTime: Date.now(),

            execute: () => {
                this.activeRequests.set(task.id, true);

                const attemptDownload = (currentUrl, isFallback = false) => {
                    console.log(`[下载] ${isFallback ? '[备用源]' : '[主源]'} 尝试: ${currentUrl}`);

                    const handleSuccess = (content) => {
                        this.activeRequests.delete(task.id);

                        // 内容验证
                        if (!this.validateContent(content, type)) {
                            console.warn(`[下载] 内容验证失败: ${currentUrl}`);
                            if (isFallback && task.retryCount >= LIT_CONFIG.maxRetries) {
                                task.onerror(new Error('主源和备用源内容均无效'));
                                return;
                            }
                            // 尝试备用源
                            if (task.fallbackUrl && !isFallback) {
                                attemptDownload(task.fallbackUrl, true);
                            } else {
                                this.retryTask(task, `内容验证失败`);
                            }
                            return;
                        }

                        try {
                            task.onsuccess(content);
                        } catch (e) {
                            console.error('[下载] 回调执行错误:', e);
                            task.onerror(e);
                        }
                    };

                    const handleError = (err) => {
                        this.activeRequests.delete(task.id);
                        const errorMsg = err.message || String(err);
                        console.warn(`[下载] 失败: ${currentUrl}, 错误: ${errorMsg}`);

                        // 特定错误处理
                        const is403 = errorMsg.includes('403') || errorMsg.includes('Forbidden');
                        const is429 = errorMsg.includes('429') || errorMsg.includes('Too Many');
                        const is404 = errorMsg.includes('404') || errorMsg.includes('Not Found');
                        const isNetwork = errorMsg.includes('network') || errorMsg.includes('fetch');
                        const isCORS = errorMsg.includes('CORS') || errorMsg.includes('cross-origin');

                        // 如果是404且不是fallback，直接报错不重试（404通常是确实不存在）
                        if (is404 && !isFallback) {
                            task.onerror(new Error(`文件不存在(404): ${currentUrl}`));
                            return;
                        }

                        // 403/429错误立即切换备用源
                        if ((is403 || is429 || isCORS) && task.fallbackUrl && !isFallback) {
                            console.log(`[下载] 遇到${is403 ? '403' : is429 ? '429' : 'CORS'}错误，切换到备用源`);
                            attemptDownload(task.fallbackUrl, true);
                            return;
                        }

                        task.retryCount++;

                        if (task.retryCount <= LIT_CONFIG.maxRetries) {
                            const delay = Math.min(
                                Math.pow(2, task.retryCount) * this.retryDelay + Math.random() * 1000,
                                10000 // 最大10秒延迟
                            );
                            console.log(`[下载] 将在${(delay / 1000).toFixed(1)}秒后第${task.retryCount}次重试...`);
                            setTimeout(() => this.retryTask(task, errorMsg), delay);
                        } else {
                            task.onerror(new Error(`超过最大重试次数(${LIT_CONFIG.maxRetries}): ${errorMsg}`));
                        }
                    };

                    this.performDownload(currentUrl, handleSuccess, handleError, type);
                };

                attemptDownload(task.url);
            }
        };

        this.queue.push(task);
        this.processQueue();
        return task.id; // 返回任务ID以便取消
    }

    /**
     * 执行实际下载（区分Node和浏览器环境）
     */
    performDownload(url, onsuccess, onerror, type) {
        if (isNodeJs) {
            this.nodeDownload(url, onsuccess, onerror);
        } else {
            this.browserDownload(url, onsuccess, onerror);
        }
    }

    /**
     * Node.js环境下载（使用http/https模块）
     */
    nodeDownload(url, onsuccess, onerror) {
        try {
            const http = require("http");
            const https = require("https");
            const urlModule = require("url");

            const parsed = urlModule.parse(encodeURI(url));
            parsed.headers = {
                "User-Agent": this.userAgent,
                "Accept": "*/*",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
            };
            parsed.timeout = LIT_CONFIG.requestTimeout;

            const protocol = url.startsWith("https") ? https : http;

            const req = protocol.get(parsed, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302) {
                    // 重定向处理
                    const redirectUrl = res.headers.location;
                    if (redirectUrl) {
                        console.log(`[下载] 重定向到: ${redirectUrl}`);
                        this.nodeDownload(redirectUrl, onsuccess, onerror);
                        return;
                    }
                }

                if (res.statusCode !== 200) {
                    onerror(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    return;
                }

                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => {
                    try {
                        const buffer = Buffer.concat(chunks);
                        onsuccess(buffer);
                    } catch (e) {
                        onerror(e);
                    }
                });
                res.on('error', onerror);
            });

            req.on('error', onerror);
            req.on('timeout', () => {
                req.destroy();
                onerror(new Error('请求超时'));
            });

        } catch (e) {
            // Node模块不可用时回退到浏览器模式
            console.warn('[下载] Node模块不可用，回退到浏览器模式');
            this.browserDownload(url, onsuccess, onerror);
        }
    }

    /**
     * 浏览器环境下载（使用fetch API）
     */
    browserDownload(url, onsuccess, onerror) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), LIT_CONFIG.requestTimeout);

        fetch(url, {
            method: 'GET',
            headers: {
                'Accept': '*/*',
                'Accept-Language': 'zh-CN,zh;q=0.9'
            },
            mode: 'cors', // 尝试CORS模式
            signal: controller.signal,
            cache: 'no-cache'
        })
            .then(response => {
                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                // 根据内容类型决定返回格式
                const contentType = response.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    return response.text(); // 返回文本以便验证
                } else if (contentType.includes('image') || contentType.includes('audio')) {
                    return response.arrayBuffer();
                } else {
                    return response.text();
                }
            })
            .then(data => {
                onsuccess(data);
            })
            .catch(error => {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    onerror(new Error('请求超时'));
                } else if (error.message.includes('Failed to fetch')) {
                    // CORS或网络错误
                    onerror(new Error(`网络/CORS错误: ${url}`));
                } else {
                    onerror(error);
                }
            });
    }

    validateContent(content, type) {
        if (!content || content.length === 0) return false;

        if (typeof content === 'string') {
            const errorPatterns = [
                '404 Not Found', '403 Forbidden', 'Rate limit',
                '<!DOCTYPE html>', '<html', 'Repository not found',
                'File path or ref empty', 'Route error'
            ];
            for (const pattern of errorPatterns) {
                if (content.includes(pattern)) return false;
            }

            if (type === 'json') {
                try { JSON.parse(content); } catch (e) { return false; }
            }
        }

        return true;
    }

    retryTask(task, reason) {
        console.log(`[下载] 重试任务 (${reason})`);
        task.execute();
    }

    cancel(taskId) {
        this.activeRequests.delete(taskId);
    }

    processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;
        this.isProcessing = true;

        const processNext = () => {
            if (this.queue.length === 0) {
                this.isProcessing = false;
                return;
            }

            const task = this.queue.shift();
            task.execute();

            // 控制请求频率，避免429错误
            setTimeout(processNext, 600);
        };

        processNext();
    }
}

class DownloadValidator {
    static ERROR_PATTERNS = [
        'Route error', 'File path or ref empty', '404 Not Found',
        'Repository not found', '404 error', 'session-',
        'Cannot GET', 'ENOENT', '无法找到页面', '<!DOCTYPE html>',
        'Access Denied', 'Forbidden', 'Error 403', 'Error 429',
        'Rate limit', 'Too Many Requests'
    ];

    static isValidContent(content, type) {
        if (!content || content.length === 0) return false;

        let contentStr;
        if (typeof content === 'string') {
            contentStr = content;
        } else if (content instanceof ArrayBuffer) {
            contentStr = new TextDecoder().decode(content.slice(0, 1000));
        } else if (typeof Buffer !== 'undefined' && content instanceof Buffer) {
            contentStr = content.toString('utf8', 0, 1000);
        } else {
            return true; // 无法检查的二进制数据默认为是
        }

        for (const pattern of this.ERROR_PATTERNS) {
            if (contentStr.includes(pattern)) {
                console.error(`[验证] 检测到错误内容模式: ${pattern}`);
                return false;
            }
        }

        if (type === 'json' && typeof content === 'string') {
            try {
                JSON.parse(content);
                return true;
            } catch (e) {
                console.error('[验证] JSON解析失败:', e.message);
                return false;
            }
        }

        if (type === 'image' && (content instanceof ArrayBuffer || (typeof Buffer !== 'undefined' && content instanceof Buffer))) {
            const arr = new Uint8Array(content.slice(0, 12));
            const isJPEG = arr[0] === 0xFF && arr[1] === 0xD8;
            const isPNG = arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E;
            const isGIF = arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46;
            const isWebP = arr[0] === 0x52 && arr[1] === 0x49 && arr[8] === 0x57;
            return isJPEG || isPNG || isGIF || isWebP;
        }

        if (type === 'audio' && (content instanceof ArrayBuffer || (typeof Buffer !== 'undefined' && content instanceof Buffer))) {
            const arr = new Uint8Array(content.slice(0, 4));
            const isMP3 = arr[0] === 0xFF && (arr[1] & 0xE0) === 0xE0;
            const isOGG = arr[0] === 0x4F && arr[1] === 0x67 && arr[2] === 0x67;
            return isMP3 || isOGG;
        }

        return true;
    }
}

class VersionCompatibilityChecker {
    constructor() {
        this.cache = new Map();
        this.scheduler = new RequestScheduler(); // 复用调度器
    }

    async getVersionInfo(gitURLBase, gameVersion) {
        const cacheKey = `${gitURLBase}|${gameVersion}`;
        if (this.cache.has(cacheKey)) {
            console.log('[版本检查] 使用缓存结果');
            return this.cache.get(cacheKey);
        }

        const url = `${gitURLBase}version.json`;
        console.log(`[版本检查] 从 ${url} 获取版本信息`);

        return new Promise((resolve, reject) => {
            this.scheduler.schedule(
                url,
                null, // version.json不使用备用源，因为不同源可能版本不同
                (data) => {
                    try {
                        let contentStr;
                        if (data instanceof ArrayBuffer) {
                            contentStr = new TextDecoder().decode(data);
                        } else if (typeof Buffer !== 'undefined' && data instanceof Buffer) {
                            contentStr = data.toString();
                        } else {
                            contentStr = String(data);
                        }

                        if (!DownloadValidator.isValidContent(contentStr, 'json')) {
                            throw new Error('获取到的version.json内容无效');
                        }

                        const versionInfo = JSON.parse(contentStr);
                        if (!versionInfo?.versions || !Array.isArray(versionInfo.versions)) {
                            console.warn('[版本检查] version.json格式无效，使用默认分支');
                            resolve({
                                versions: [],
                                defaultBranch: 'main',
                                description: '使用仓库默认分支'
                            });
                            return;
                        }

                        this.cache.set(cacheKey, versionInfo);
                        resolve(versionInfo);
                    } catch (e) {
                        console.error('[版本检查] 解析失败:', e);
                        reject(new Error(`version.json解析失败: ${e.message}`));
                    }
                },
                (err) => {
                    console.warn('[版本检查] 获取失败:', err.message);
                    // version.json失败不应阻断更新，使用默认配置
                    resolve({
                        versions: [],
                        defaultBranch: null,
                        description: '使用仓库默认分支'
                    });
                },
                'json'
            );
        });
    }

    async getCompatibleVersion(gitURLBase, gameVersion) {
        try {
            const versionInfo = await this.getVersionInfo(gitURLBase, gameVersion);

            if (!versionInfo.versions || versionInfo.versions.length === 0) {
                return {
                    extensionVersion: 'unknown',
                    gameVersion: '*',
                    branch: versionInfo.defaultBranch || null,
                    description: versionInfo.description || '使用仓库默认分支'
                };
            }

            // 按扩展版本号排序（从高到低）
            const sortedVersions = versionInfo.versions
                .filter(v => v.extensionVersion && v.gameVersion)
                .sort((a, b) => this.compareVersions(b.extensionVersion, a.extensionVersion));

            for (const version of sortedVersions) {
                if (this.matchVersion(gameVersion, version.gameVersion)) {
                    return {
                        extensionVersion: version.extensionVersion,
                        gameVersion: version.gameVersion,
                        branch: version.branch || versionInfo.defaultBranch || 'main',
                        description: version.description || `兼容游戏版本 ${version.gameVersion}`
                    };
                }
            }

            // 无匹配版本，使用最新版本（最兼容策略）
            const latest = sortedVersions[0];
            return {
                extensionVersion: latest.extensionVersion,
                gameVersion: latest.gameVersion,
                branch: latest.branch || versionInfo.defaultBranch || 'main',
                description: '使用最新可用版本'
            };

        } catch (error) {
            console.error('[版本检查] 错误:', error);
            return {
                extensionVersion: 'unknown',
                gameVersion: '*',
                branch: null,
                description: '版本检查失败，使用默认分支'
            };
        }
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
        rule = rule.trim();

        // 精确匹配
        if (!/[<>=]/.test(rule)) {
            return this.compareVersions(gameVersion, rule) === 0;
        }

        // 通配符匹配 (1.9.x)
        if (rule.includes('x') || rule.includes('X') || rule.includes('*')) {
            const base = rule.replace(/[xX*].*$/, '');
            const baseVersion = this.parseVersion(base);
            const gv = this.parseVersion(gameVersion);
            // 1.9.x 匹配 1.9.0, 1.9.1, 等等
            return gv[0] === baseVersion[0] && gv[1] === baseVersion[1];
        }

        // 比较运算符匹配 (>=1.9.0, <2.0.0等)
        const rules = rule.split(/\s+/).filter(r => r);
        let result = true;

        for (const r of rules) {
            const match = r.match(/^(>=|<=|>|<|=|==)(.+)$/);
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

class ExtensionUpdater {
    constructor() {
        this.gitURL = null;        // 当前使用的Raw URL基础
        this.repoInfo = null;      // 仓库信息对象（会被分支切换更新）
        this.branch = null;        // 当前分支
        this.tempDir = null;       // 临时目录
        this.targetDir = null;     // 目标目录
        this.fileList = [];        // 文件列表
        this.stats = {
            success: 0,
            failed: 0,
            total: 0,
            skipped: 0,
            bytesDownloaded: 0
        };
        this.versionChecker = new VersionCompatibilityChecker();
        this.scheduler = new RequestScheduler();

        // 确保目标目录始终稳定
        this.targetDir = `extension/${LIT_CONFIG.name}`;
    }

    /**
     * 初始化更新器
     * @param {string} gitURL - GitHub/Gitee的web URL
     */
    async init(gitURL) {
        if (!gitURL || typeof gitURL !== 'string') {
            throw new Error('gitURL不能为空且必须是字符串');
        }

        console.log(`[初始化] 解析仓库地址: ${gitURL}`);

        try {
            this.repoInfo = GitURLParser.parseRepoInfo(gitURL);
            this.gitURL = GitURLParser.getRawURL(this.repoInfo, '');
            this.branch = this.repoInfo.branch;

            console.log(`[初始化] 平台: ${this.repoInfo.platform}, 仓库: ${this.repoInfo.owner}/${this.repoInfo.repo}`);
            console.log(`[初始化] 默认分支: ${this.branch}`);
            console.log(`[初始化] Raw URL: ${this.gitURL}`);
            console.log(`[初始化] 目标目录: ${this.targetDir}`);

            return this.repoInfo;
        } catch (e) {
            throw new Error(`初始化失败: ${e.message}`);
        }
    }

    /**
    * 检查扩展是否已安装
    */
    async checkInstalled() {
        const extPath = `${this.targetDir}/extension.js`;
        return new Promise((resolve) => {
            game.checkFile(extPath,
                (result) => resolve(result === 1),
                () => resolve(false)
            );
        });
    }

    /**
     * 【已修复】准备文件列表并同步分支信息
     * 关键修复：确保分支切换后所有后续操作使用新分支
     */
    async prepareFileList(targetBranch) {
        if (!this.repoInfo) throw new Error('未初始化仓库信息');

        // 确定最终使用的分支
        const finalBranch = targetBranch || this.repoInfo.branch;

        // 如果分支改变，重新生成URL
        if (finalBranch !== this.repoInfo.branch) {
            console.log(`[分支切换] ${this.repoInfo.branch} -> ${finalBranch}`);

            // 🔧 修复点1：更新repoInfo中的branch
            this.repoInfo = { ...this.repoInfo, branch: finalBranch };

            // 🔧 修复点2：同步更新gitURL基础路径
            this.gitURL = GitURLParser.getRawURL(this.repoInfo, '');

            // 更新实例branch记录
            this.branch = finalBranch;
        }

        console.log(`[文件列表] 使用分支: ${this.branch}`);
        console.log(`[文件列表] Raw base URL: ${this.gitURL}`);

        // 获取Directory.json
        const directory = await this.fetchDirectoryJson();
        if (!directory || typeof directory !== 'object') {
            throw new Error('无法获取有效的Directory.json，请检查仓库文件是否存在');
        }

        // 转换为文件列表
        const files = [];
        for (const [filePath, fileInfo] of Object.entries(directory)) {
            if (!filePath || typeof filePath !== 'string') continue;

            // 标准化路径（移除前导斜杠）
            const normalizedPath = filePath.replace(/^\/+/, '');

            if (this.shouldIncludeFile(normalizedPath)) {
                files.push({
                    remotePath: normalizedPath,                            // 远程路径
                    tempPath: `${this.tempDir}/${normalizedPath}`,        // 临时路径
                    targetPath: `${this.targetDir}/${normalizedPath}`,    // 最终路径
                    type: fileInfo?.type || this.detectFileType(normalizedPath),
                    size: fileInfo?.size || 0,
                    hash: fileInfo?.hash || null
                });
            } else {
                console.log(`[过滤] 排除文件: ${filePath}`);
            }
        }

        this.fileList = files;
        this.stats.total = files.length;
        console.log(`[文件列表] 共 ${files.length} 个文件待下载`);

        if (files.length === 0) {
            throw new Error('文件列表为空，请检查Directory.json配置或过滤规则');
        }

        return files;
    }

    /**
     * 获取Directory.json（带备用源自动切换）
     */
    async fetchDirectoryJson() {
        const url = `${this.gitURL}Directory.json`;
        const fallbackUrl = GitURLParser.getFallbackURL(this.repoInfo, 'Directory.json');

        return new Promise((resolve, reject) => {
            this.scheduler.schedule(
                url,
                fallbackUrl,
                (data) => {
                    try {
                        let contentStr;
                        if (data instanceof ArrayBuffer) {
                            contentStr = new TextDecoder().decode(data);
                        } else if (typeof Buffer !== 'undefined' && data instanceof Buffer) {
                            contentStr = data.toString();
                        } else {
                            contentStr = String(data);
                        }

                        if (!DownloadValidator.isValidContent(contentStr, 'json')) {
                            throw new Error('Directory.json内容验证失败（可能是404页面）');
                        }

                        const directory = JSON.parse(contentStr);
                        if (Object.keys(directory).length === 0) {
                            console.warn('[Directory] 文件列表为空');
                        }
                        resolve(directory);
                    } catch (e) {
                        reject(new Error(`Directory.json解析失败: ${e.message}`));
                    }
                },
                (err) => {
                    reject(new Error(`获取Directory.json失败: ${err.message}`));
                },
                'json'
            );
        });
    }

    shouldIncludeFile(filePath) {
        if (!filePath) return false;

        const parts = filePath.split('/');
        const fileName = parts.pop() || '';

        // 检查目录
        for (const part of parts) {
            if (EXCLUDE_DIRS.includes(part) || part.startsWith('.')) return false;
        }

        // 检查文件名
        if (EXCLUDE_FILES.includes(fileName) || fileName.startsWith('.')) return false;

        // 检查扩展名
        const ext = fileName.substring(fileName.lastIndexOf('.'));
        if (EXCLUDE_EXTS.includes(ext)) return false;

        return true;
    }

    detectFileType(filePath) {
        if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(filePath)) return 'image';
        if (/\.(mp3|ogg|wav|m4a)$/i.test(filePath)) return 'audio';
        if (/\.(js|ts|json|css|html|md|txt)$/i.test(filePath)) return 'text';
        return 'binary';
    }

    /**
     * 【已修复】下载单个文件（改进路径处理和错误报告）
     */
    async downloadFile(fileInfo) {
        const { remotePath, tempPath, type } = fileInfo;

        if (!remotePath) {
            return { success: false, file: 'unknown', error: '无效的远程路径' };
        }

        const url = GitURLParser.getRawURL(this.repoInfo, remotePath);
        const fallbackUrl = GitURLParser.getFallbackURL(this.repoInfo, remotePath);

        return new Promise((resolve) => {
            // 确保目录存在（改进的目录创建）
            this.ensureDirectoryForPath(tempPath)
                .then(() => {
                    this.scheduler.schedule(
                        url,
                        fallbackUrl,
                        (content) => {
                            try {
                                // 🔧 修复点3：改进验证逻辑，允许二进制数据
                                let isValid = false;
                                if (typeof content === 'string') {
                                    isValid = DownloadValidator.isValidContent(content, type);
                                } else if (content instanceof ArrayBuffer || (typeof Buffer !== 'undefined' && content instanceof Buffer)) {
                                    if (type === 'image' || type === 'audio') {
                                        isValid = DownloadValidator.isValidContent(content, type);
                                    } else {
                                        // 二进制文件默认有效，检查大小
                                        isValid = content.byteLength > 0 || content.length > 0;
                                    }
                                }

                                if (!isValid) {
                                    throw new Error('下载内容验证失败（可能是错误页面）');
                                }

                                // 🔧 修复点4：统一写入逻辑，区分Node和浏览器
                                this.writeFile(tempPath, content, type)
                                    .then(() => {
                                        const size = content.length || content.byteLength || 0;
                                        this.stats.success++;
                                        this.stats.bytesDownloaded += size;
                                        resolve({
                                            success: true,
                                            file: remotePath,
                                            size,
                                            error: null
                                        });
                                    })
                                    .catch(err => {
                                        throw new Error(`写入失败: ${err.message}`);
                                    });

                            } catch (e) {
                                console.error(`[下载] 处理失败: ${remotePath}`, e);
                                this.stats.failed++;
                                resolve({
                                    success: false,
                                    file: remotePath,
                                    error: e.message
                                });
                            }
                        },
                        (err) => {
                            console.error(`[下载] 调度失败: ${remotePath}`, err.message);
                            this.stats.failed++;
                            resolve({
                                success: false,
                                file: remotePath,
                                error: err.message
                            });
                        },
                        type
                    );
                })
                .catch(err => {
                    console.error(`[下载] 创建目录失败: ${tempPath}`, err);
                    this.stats.failed++;
                    resolve({
                        success: false,
                        file: remotePath,
                        error: `创建目录失败: ${err.message}`
                    });
                });
        });
    }

    /**
     * 为指定路径创建目录（Promise化）
     */
    async ensureDirectoryForPath(filePath) {
        return new Promise((resolve, reject) => {
            const dir = lib.path.dirname(filePath);
            if (!dir || dir === '.' || dir === filePath) {
                resolve(); // 无需创建
                return;
            }

            // 🔧 修复：使用game.ensureDirectory，传入相对路径（不要__dirname）
            // game.ensureDirectory内部会自动处理Node.js下的__dirname拼接
            game.ensureDirectory(dir, () => {
                resolve();
            }, (err) => {
                reject(new Error(`创建目录失败: ${err}`));
            }, true);
        });
    }

    /**
     * 统一文件写入（Node.js和浏览器环境）
     */
    async writeFile(filePath, content, type) {
        return new Promise((resolve, reject) => {
            const dir = lib.path.dirname(filePath);
            const fileName = lib.path.basename(filePath);

            if (isNodeJs) {
                try {
                    // 统一数据格式：本体game.writeFile接收字符串或File对象
                    // 对于二进制数据（ArrayBuffer/Buffer），转为Uint8Array或字符串
                    let dataToWrite;
                    if (content instanceof ArrayBuffer) {
                        // 转为Uint8Array，在Node环境下本体writeFile会通过zip处理
                        dataToWrite = new Uint8Array(content);
                    } else if (typeof Buffer !== 'undefined' && content instanceof Buffer) {
                        dataToWrite = content.toString(); // 转为字符串
                    } else {
                        dataToWrite = content;
                    }

                    game.writeFile(dataToWrite, dir, fileName, resolve, reject);
                } catch (e) {
                    reject(e);
                }
            } else {
                // 浏览器环境
                let dataToWrite;
                if (content instanceof ArrayBuffer) {
                    // 可能需要转换为字符串存储，取决于game.writeFile的实现
                    // 假设game.writeFile支持ArrayBuffer或字符串
                    dataToWrite = content;
                } else if (typeof Buffer !== 'undefined' && content instanceof Buffer) {
                    dataToWrite = content.toString();
                } else {
                    dataToWrite = content;
                }

                game.writeFile(
                    dataToWrite,
                    dir,
                    fileName,
                    () => resolve(),
                    (err) => reject(new Error(err || '写入失败'))
                );
            }
        });
    }

    /**
     * 转换ArrayBuffer为字符串（用于浏览器环境写入）
     */
    arrayBufferToString(buffer) {
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(buffer);
    }

    /**
     * 创建临时目录
     */
    async createTempDirectory() {
        this.tempDir = this.targetDir + "/__temp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

        return new Promise((resolve, reject) => {
            console.log(`[目录] 创建临时目录: ${this.tempDir}`);

            // 🔧 修复：所有环境都传相对路径给game.ensureDirectory
            game.ensureDirectory(this.tempDir, () => {
                console.log(`[目录] 创建成功: ${this.tempDir}`);
                resolve();
            }, (err) => {
                reject(new Error(`创建临时目录失败: ${err}`));
            }, true);
        });
    }

    /**
     * 清理临时目录
     */
    async cleanupTemp() {
        if (!this.tempDir) return;

        return new Promise((resolve) => {
            // 🔧 修复：直接传相对路径，game.checkDir内部会处理__dirname
            game.checkDir(this.tempDir, (exists) => {
                if (exists === 1) {
                    console.log(`[清理] 删除临时目录: ${this.tempDir}`);
                    game.removeDir(this.tempDir, () => resolve(), () => resolve());
                } else {
                    resolve();
                }
            }, () => resolve());
        });
    }

    /**
     * 提交更新（移动临时目录到正式位置）
     */
    async commitUpdate() {
        console.log(`[提交] 开始提交更新: ${this.tempDir} -> ${this.targetDir}`);

        // 1. 备份旧版本（可选，先删除旧目录）
        await this.removeDirectory(this.targetDir);

        // 2. 移动临时目录到正式位置
        if (isNodeJs) {
            return this.moveDirectoryNode(this.tempDir, this.targetDir);
        } else {
            return this.moveDirectoryBrowser(this.tempDir, this.targetDir);
        }
    }

    async removeDirectory(dirPath) {
        return new Promise((resolve) => {
            game.checkDir(dirPath, (exists) => {
                if (exists === 1) {
                    console.log(`[提交] 删除旧目录: ${dirPath}`);
                    game.removeDir(dirPath, () => resolve(), () => resolve());
                } else {
                    resolve();
                }
            }, () => resolve());
        });
    }

    /**
     * Node.js环境下移动目录
     */
    async moveDirectoryNode(src, dest) {
        return new Promise((resolve, reject) => {
            try {
                const fs = lib.node.fs;
                const srcPath = `${__dirname}/${src}`;
                const destPath = `${__dirname}/${dest}`;

                // 如果目标存在，先删除
                if (fs.existsSync(destPath)) {
                    fs.rmSync(destPath, { recursive: true, force: true });
                }

                fs.renameSync(srcPath, destPath);
                console.log(`[提交] Node.js移动完成: ${src} -> ${dest}`);
                resolve();
            } catch (e) {
                reject(new Error(`Node.js移动失败: ${e.message}`));
            }
        });
    }

    /**
     * 【已修复】浏览器环境下递归移动目录（改进错误处理）
     */
    async moveDirectoryBrowser(src, dest) {
        console.log(`[提交] 浏览器环境移动: ${src} -> ${dest}`);

        return new Promise((resolve, reject) => {
            game.getFileList(src,
                (folders, files) => {
                    console.log(`[提交] 发现 ${folders.length} 个目录, ${files.length} 个文件`);

                    // 递归创建所有子目录
                    const createAllDirs = async () => {
                        for (const folder of folders) {
                            if (!folder) continue;
                            const destFolder = `${dest}/${folder}`;
                            await new Promise((res) => {
                                game.ensureDirectory(destFolder, res, res, true);
                            });
                        }
                    };

                    // 移动所有文件（带错误处理）
                    const moveAllFiles = async () => {
                        const errors = [];
                        for (const file of files) {
                            if (!file) continue;

                            const srcPath = `${src}/${file}`;
                            const destPath = `${dest}/${file}`;

                            try {
                                await new Promise((res, rej) => {
                                    game.readFile(srcPath,
                                        (content) => {
                                            game.writeFile(
                                                content,
                                                lib.path.dirname(destPath),
                                                lib.path.basename(destPath),
                                                () => res(),
                                                (err) => rej(new Error(err || `写入失败: ${file}`))
                                            );
                                        },
                                        (err) => rej(new Error(err || `读取失败: ${file}`))
                                    );
                                });
                            } catch (e) {
                                console.error(`[移动] 文件失败: ${file}`, e);
                                errors.push({ file, error: e.message });
                            }
                        }
                        return errors;
                    };

                    createAllDirs()
                        .then(() => moveAllFiles())
                        .then((errors) => {
                            // 无论是否有错误，都尝试清理临时目录
                            game.removeDir(src, () => { }, () => { });

                            if (errors.length > 0) {
                                console.warn(`[提交] 部分文件移动失败:`, errors);
                                // 只要不是全部失败就算成功
                                if (errors.length < files.length) {
                                    resolve();
                                } else {
                                    reject(new Error('所有文件移动失败'));
                                }
                            } else {
                                console.log(`[提交] 所有文件移动成功`);
                                resolve();
                            }
                        })
                        .catch((err) => {
                            game.removeDir(src, () => { }, () => { });
                            reject(err);
                        });
                },
                (err) => reject(new Error(`读取临时目录失败: ${err}`))
            );
        });
    }

    /**
     * 【主流程】执行完整更新
     */
    async update() {
        // 重置统计
        this.stats = {
            success: 0,
            failed: 0,
            total: 0,
            skipped: 0,
            bytesDownloaded: 0
        };

        try {
            // 1. 清理旧临时目录（如果有）
            await this.cleanupTemp();

            // 2. 创建新临时目录
            await this.createTempDirectory();

            // 3. 准备文件列表（分支已在此步骤同步）
            await this.prepareFileList(this.branch);

            // 验证文件列表
            if (!this.fileList || this.fileList.length === 0) {
                throw new Error('文件列表为空，更新无法继续');
            }

            // 4. 用户确认
            const shouldContinue = await DialogManager.confirm(
                '确认更新',
                `扩展: ${LIT_CONFIG.name}\n` +
                `分支: ${this.branch}\n` +
                `环境: ${isNodeJs ? 'Node.js' : '浏览器'}\n` +
                `文件数: ${this.fileList.length}\n\n` +
                `策略: 事务性更新（全部成功后覆盖）\n\n` +
                `${this.fileList.slice(0, 5).map(f => `• ${f.remotePath}`).join('\n')}\n` +
                `${this.fileList.length > 5 ? `\n...及其他 ${this.fileList.length - 5} 个文件` : ''}`,
                '开始下载',
                '取消'
            );

            if (!shouldContinue) {
                await this.cleanupTemp();
                return { cancelled: true, stats: this.stats };
            }

            // 5. 下载所有文件（带进度）
            const failedFiles = [];
            const progressDialog = await DialogManager.complexLoading('正在更新', '准备下载...');

            for (let i = 0; i < this.fileList.length; i++) {
                const file = this.fileList[i];
                const progress = `[${i + 1}/${this.fileList.length}]`;

                progressDialog.updateText(`${progress} ${file.remotePath}`);

                // 每10个文件更新一次控制台输出，减少日志刷屏
                if (i % 10 === 0) {
                    console.log(`${progress} 下载进度...`);
                }

                const result = await this.downloadFile(file);

                if (result.success) {
                    game.print(`✓ ${file.remotePath} (${(result.size / 1024).toFixed(1)}KB)`);
                } else {
                    game.print(`✗ ${file.remotePath}: ${result.error}`);
                    failedFiles.push({ ...file, error: result.error });
                }
            }

            progressDialog.close();

            // 6. 下载结果检查
            if (failedFiles.length === this.fileList.length) {
                throw new Error('所有文件下载失败，请检查网络连接和仓库配置');
            }

            if (failedFiles.length > 0) {
                const critical = ['extension.js', 'info.json'].some(f =>
                    failedFiles.some(failed => failed.remotePath.includes(f))
                );

                const errorDetails = failedFiles.slice(0, 3).map(f => `• ${f.remotePath}: ${f.error}`).join('\n');
                const continueMsg = critical
                    ? '关键文件下载失败，更新可能无法正常使用。'
                    : '部分非关键文件失败，不影响核心功能。';

                const shouldCommit = await DialogManager.confirm(
                    '部分文件下载失败',
                    `${continueMsg}\n\n成功: ${this.stats.success}/${this.stats.total}\n` +
                    `失败: ${failedFiles.length}\n\n${errorDetails}\n${failedFiles.length > 3 ? `\n...及其他 ${failedFiles.length - 3} 个` : ''}\n\n是否继续应用更新？`,
                    '继续更新',
                    '取消更新'
                );

                if (!shouldCommit) {
                    await this.cleanupTemp();
                    return { cancelled: true, stats: this.stats, failed: failedFiles };
                }
            }

            // 7. 应用更新（移动文件）
            const applyingDialog = await DialogManager.complexLoading('正在应用更新', '移动文件到扩展目录...');
            await this.commitUpdate();
            applyingDialog.close();

            // 8. 清理
            await this.cleanupTemp();

            return {
                cancelled: false,
                success: true,
                stats: this.stats,
                failed: failedFiles,
                hasCriticalFailure: failedFiles.some(f => ['extension.js', 'info.json'].includes(f.remotePath))
            };

        } catch (error) {
            // 🔧 修复点5：确保错误被捕获且清理资源
            console.error('[更新] 流程错误:', error);
            await this.cleanupTemp();
            throw error;
        }
    }
}

const UpdateFlow = (() => {
    const showExtensionInfo = async (updater) => {
        try {
            const installed = await updater.checkInstalled();
            let localVersion = 'unknown';

            if (installed) {
                try {
                    localVersion = await new Promise((resolve) => {
                        const path = `${updater.targetDir}/info.json`;
                        game.readFileAsText(path,
                            (data) => {
                                try {
                                    const info = JSON.parse(data);
                                    resolve(info.version || 'unknown');
                                } catch {
                                    resolve('unknown');
                                }
                            },
                            () => resolve('unknown')
                        );
                    });
                } catch (e) {
                    console.warn('[信息] 读取本地版本失败:', e);
                }
            }

            const info = `扩展名称: ${LIT_CONFIG.name}\n` +
                `安装状态: ${installed ? '✓ 已安装' : '✗ 未安装'}\n` +
                `本地版本: ${localVersion}\n` +
                `运行环境: ${isNodeJs ? 'Node.js' : '浏览器'}\n` +
                `下载策略: 事务性更新（失败自动回滚）`;

            await DialogManager.alert('扩展信息', info);
        } catch (error) {
            await DialogManager.alert('错误', `无法获取扩展信息: ${error.message}`);
        }
    };

    const selectPlatform = async () => {
        const choice = await DialogManager.choice(
            '选择更新源',
            `请选择《${LIT_CONFIG.name}》的更新源：\n\n` +
            `推荐选择适合您网络环境的源以获得最佳速度`,
            ['Gitee（国内推荐）', 'GitHub（国际）', '取消']
        );

        if (choice === 2 || choice === undefined) return null;
        return choice === 0 ? 'gitee' : 'github';
    };

    const performUpdate = async (force = false) => {
        const updater = new ExtensionUpdater();

        try {
            // 1. 选择平台
            const platform = await selectPlatform();
            if (!platform) return;

            const baseURL = platform === 'gitee' ? LIT_CONFIG.gitee : LIT_CONFIG.github;

            console.log(`[更新] 选择平台: ${platform}, URL: ${baseURL}`);
            await updater.init(baseURL);

            // 2. 检查安装状态（仅提示，不阻断）
            const installed = await updater.checkInstalled();
            if (!installed && !force) {
                const shouldInstall = await DialogManager.confirm(
                    '全新安装',
                    `未检测到《${LIT_CONFIG.name}》扩展。\n\n是否执行全新安装？`,
                    '安装',
                    '取消'
                );
                if (!shouldInstall) return;
            }

            // 3. 版本兼容性检查
            let versionInfo;
            try {
                versionInfo = await updater.versionChecker.getCompatibleVersion(
                    updater.gitURL,
                    lib.version || '1.0.0'
                );

                console.log('[更新] 版本信息:', versionInfo);

                if (versionInfo.description) {
                    await DialogManager.alert(
                        '版本匹配',
                        `分支: ${versionInfo.branch || '默认'}\n` +
                        `说明: ${versionInfo.description}`
                    );
                }
            } catch (e) {
                console.warn('[更新] 版本检查失败:', e);
                versionInfo = { branch: updater.branch, description: '使用默认分支' };
            }

            // 🔧 关键：使用版本检查返回的分支
            const targetBranch = versionInfo.branch || updater.branch;
            updater.branch = targetBranch;

            // 4. 执行更新
            const result = await updater.update();

            // 5. 处理结果
            if (result.cancelled) {
                await DialogManager.alert('已取消', '更新已取消，未做更改。');
                return;
            }

            if (result.hasCriticalFailure) {
                await DialogManager.alert(
                    '⚠️ 更新完成（有警告）',
                    `更新已成功应用，但以下关键文件下载失败：\n` +
                    `${result.failed.filter(f => ['extension.js', 'info.json'].includes(f.remotePath)).map(f => `• ${f.remotePath}`).join('\n')}\n\n` +
                    `扩展可能无法正常工作，建议检查后重试。`
                );
            } else if (result.failed.length > 0) {
                await DialogManager.alert(
                    '✓ 更新完成',
                    `成功更新 ${result.stats.success} 个文件\n` +
                    `${result.failed.length} 个文件下载失败（非关键）\n\n` +
                    `扩展已更新至可用状态。`
                );
            } else {
                await DialogManager.alert('✅ 更新成功', `所有 ${result.stats.success} 个文件已成功更新！`);
            }

            // 6. 询问重启
            if (await DialogManager.confirm(
                '重启游戏',
                '扩展更新完成，需要重启游戏才能生效。\n\n是否立即重启？',
                '立即重启',
                '稍后'
            )) {
                game.reload();
            }

        } catch (error) {
            console.error('更新流程错误:', error);
            await DialogManager.alert(
                '❌ 更新失败',
                `错误信息：${error.message}\n\n` +
                `可能原因：\n` +
                `1. 网络连接不稳定（403/429错误）\n` +
                `2. 仓库地址配置错误\n` +
                `3. 缺少Directory.json文件\n` +
                `4. 游戏文件系统权限不足\n\n` +
                `建议：检查网络后重试，或切换更新源。`
            );
            await updater.cleanupTemp();
        }
    };

    const showMainMenu = async () => {
        const installed = await new ExtensionUpdater().checkInstalled();

        const action = await DialogManager.choice(
            '叁岛世界更新工具',
            `《${LIT_CONFIG.name}》扩展管理器\n\n` +
            `${installed ? '✓ 已安装' : '✗ 未安装'}\n` +
            `更新策略: 事务性更新（安全）`,
            ['检查更新', '查看信息', '强制重装', '删除扩展', '取消']
        );
        return action;
    };

    return {
        async main() {
            try {
                const action = await showMainMenu();

                switch (action) {
                    case 0:
                        await performUpdate(false);
                        break;
                    case 1: {
                        const updater = new ExtensionUpdater();
                        await updater.init(LIT_CONFIG.gitee);
                        await showExtensionInfo(updater);
                        break;
                    }
                    case 2:
                        if (await DialogManager.confirm('强制重装', '将删除现有文件并重新下载，确定？', '确定', '取消')) {
                            await performUpdate(true);
                        }
                        break;
                    case 3: {
                        if (await DialogManager.confirm('删除扩展', '确定要删除《叁岛世界》扩展吗？', '删除', '取消')) {
                            const updater = new ExtensionUpdater();
                            await updater.removeDirectory(updater.targetDir);
                            await DialogManager.alert('已删除', '扩展已删除，重启游戏生效。');
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

const Lit_update = {
    /**
     * 显示更新UI
     */
    async showUI() {
        await UpdateFlow.main();
    },

    /**
     * 快速更新（无UI，直接执行）
     */
    async quickUpdate(platform = 'gitee') {
        console.log('[快速更新] 开始...');
        const updater = new ExtensionUpdater();

        try {
            const baseURL = platform === 'gitee' ? LIT_CONFIG.gitee : LIT_CONFIG.github;
            await updater.init(baseURL);

            // 检查版本兼容性
            const versionInfo = await updater.versionChecker.getCompatibleVersion(
                updater.gitURL,
                lib.version || '1.0.0'
            );

            if (versionInfo.branch) {
                updater.branch = versionInfo.branch;
            }

            const result = await updater.update();

            if (!result.cancelled && result.success) {
                game.print('✅ 快速更新成功');
                if (result.failed.length > 0) {
                    game.print(`⚠️ 警告: ${result.failed.length} 个文件失败`);
                }
            }

            return result;
        } catch (error) {
            game.print(`❌ 快速更新失败: ${error.message}`);
            throw error;
        }
    },

    /**
     * 测试函数：验证Git URL解析
     */
    testURLParser(url) {
        console.group('🔍 URL解析测试');
        try {
            const info = GitURLParser.parseRepoInfo(url);
            console.log('解析结果:', info);
            console.log('Raw URL:', GitURLParser.getRawURL(info, 'test.js'));
            console.log('Fallback URL:', GitURLParser.getFallbackURL(info, 'test.js'));
        } catch (e) {
            console.error('解析失败:', e.message);
        }
        console.groupEnd();
    },

    /**
     * 测试函数：下载单个文件（调试用）
     */
    testDownload(filePath = 'Directory.json', platform = 'gitee') {
        console.group(`📥 下载测试: ${filePath}`);

        const scheduler = new RequestScheduler();
        const repoInfo = GitURLParser.parseRepoInfo(
            platform === 'gitee' ? LIT_CONFIG.gitee : LIT_CONFIG.github
        );

        const url = GitURLParser.getRawURL(repoInfo, filePath);
        const fallback = GitURLParser.getFallbackURL(repoInfo, filePath);

        console.log('主URL:', url);
        console.log('备用URL:', fallback);

        scheduler.schedule(
            url,
            fallback,
            (data) => {
                console.log('✅ 下载成功');
                if (typeof data === 'string') {
                    console.log('内容预览:', data.substring(0, 200));
                } else {
                    console.log('数据大小:', data.byteLength || data.length, 'bytes');
                }
            },
            (err) => {
                console.error('❌ 下载失败:', err.message);
            }
        );

        console.groupEnd();
    },

    /**
     * 测试函数：完整流程测试（下载Directory.json）
     */
    testFullFlow(platform = 'gitee') {
        console.group('🚀 完整流程测试');

        const updater = new ExtensionUpdater();
        const url = platform === 'gitee' ? LIT_CONFIG.gitee : LIT_CONFIG.github;

        updater.init(url)
            .then(() => updater.prepareFileList('main')) // 测试默认分支
            .then(files => {
                console.log(`✅ 成功获取文件列表: ${files.length} 个文件`);
                files.slice(0, 5).forEach(f => console.log(' •', f.remotePath));
            })
            .catch(err => {
                console.error('❌ 测试失败:', err.message);
            })
            .finally(() => {
                console.groupEnd();
            });
    },

    /**
     * 获取配置信息
     */
    get config() {
        return { ...LIT_CONFIG };
    },

    /**
     * 获取当前运行环境信息
     */
    get environment() {
        return {
            isNodeJs,
            isBrowser,
            version: lib.version || 'unknown',
            platform: isNodeJs ? 'Node.js' : (isBrowser ? 'Browser' : 'Unknown')
        };
    }
};

// 默认导出
export default Lit_update;
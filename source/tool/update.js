import { lib, game, ui, get, ai, _status } from '../../../../noname.js';
import { Lit_Dialog } from './extraUI.js';
import basic from './basic.js';

// ==================== 配置与常量 ====================
const CONFIG = {
    name: '叁岛世界',
    urls: {
        github: 'https://github.com/yooruh/LIT_for_noname',
        gitee: 'https://gitee.com/yooruh/LIT_for_noname'
    },
    files: {
        directory: 'Directory.json',
        version: 'version.json',
        state: '.update_state.json'
    },
    limits: {
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000,
        maxConcurrent: 3,
        backupCount: 5,
        maxTempAge: 7 * 86400000, // 7天
        stateSaveDebounce: 1000   // 状态保存防抖(ms)
    },
    types: {
        critical: ['extension.js', 'info.json', 'content.js'],
        text: ['.js', '.json', '.css', '.html', '.md', '.txt', '.ts', '.xml', '.yml', '.yaml', '.csv'],
        media: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp3', '.ogg', '.wav', '.mp4', '.zip']
    }
};

// ==================== 工具函数 ====================
const utils = {
    parseSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    formatTime(seconds) {
        if (!isFinite(seconds) || seconds < 0) return '计算中...';
        if (seconds < 60) return Math.ceil(seconds) + '秒';
        if (seconds < 3600) return Math.floor(seconds / 60) + '分' + Math.ceil(seconds % 60) + '秒';
        return Math.floor(seconds / 3600) + '时' + Math.floor((seconds % 3600) / 60) + '分';
    },

    compareVersion(v1, v2) {
        const a = String(v1).replace(/^v/, '').split('.').map(Number);
        const b = String(v2).replace(/^v/, '').split('.').map(Number);
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
            const x = a[i] || 0, y = b[i] || 0;
            if (x > y) return 1;
            if (x < y) return -1;
        }
        return 0;
    },

    matchVersion(gameVer, rule) {
        if (!rule || rule === '*') return true;
        gameVer = String(gameVer).replace(/^v/, '');
        if (rule.startsWith('>=')) return utils.compareVersion(gameVer, rule.slice(2)) >= 0;
        if (rule.startsWith('<=')) return utils.compareVersion(gameVer, rule.slice(2)) <= 0;
        if (rule.startsWith('>')) return utils.compareVersion(gameVer, rule.slice(1)) > 0;
        if (rule.startsWith('<')) return utils.compareVersion(gameVer, rule.slice(1)) < 0;
        if (/[\dxX*]/.test(rule)) {
            const base = rule.split(/[xX*]/)[0];
            return gameVer.startsWith(base);
        }
        return utils.compareVersion(gameVer, rule) === 0;
    },

    getFileType(filename) {
        const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
        if (CONFIG.types.text.includes(ext)) return 'text';
        if (CONFIG.types.media.includes(ext)) return 'media';
        return 'binary';
    },

    isCritical(filename) {
        return CONFIG.types.critical.some(c => filename.includes(c));
    },

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    formatDate(timestamp) {
        const date = new Date(timestamp);
        return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    },

    // 并发控制工具（Promise池）
    async asyncPool(poolLimit, array, iteratorFn) {
        const ret = [];
        const executing = new Set();
        for (const item of array) {
            const p = Promise.resolve().then(() => iteratorFn(item));
            ret.push(p);
            executing.add(p);
            const clean = () => executing.delete(p);
            p.then(clean).catch(clean);
            if (executing.size >= poolLimit) {
                await Promise.race(executing);
            }
        }
        return Promise.all(ret);
    }
};

// ==================== 环境检测 ====================
const Environment = {
    isNode() {
        return typeof window !== 'undefined' &&
            typeof window.process === 'object' &&
            typeof window.__dirname === 'string' &&
            typeof window.require === 'function';
    },

    isElectronRenderer() {
        return typeof window !== 'undefined' && 
            window.process && 
            window.process.type === 'renderer';
    },

    getEnvironmentType() {
        if (this.isNode()) return 'node';
        if (this.isElectronRenderer()) return 'electron-renderer';
        return 'browser';
    }
};

// ==================== Token 管理 ====================
class TokenManager {
    constructor() {
        this.cache = new Map();
        this.load();
    }

    load() {
        try {
            if (localStorage.getItem('noname_authorization')) {
                this.cache.set('github', localStorage.getItem('noname_authorization'));
            }
            if (localStorage.getItem('noname_github_token')) {
                this.cache.set('github', localStorage.getItem('noname_github_token'));
            }
            if (localStorage.getItem('noname_gitee_token')) {
                this.cache.set('gitee', localStorage.getItem('noname_gitee_token'));
            }
        } catch (e) {
            console.warn('[Token] 加载失败:', e);
        }
    }

    get(platform) {
        return this.cache.get(platform);
    }

    set(platform, token) {
        this.cache.set(platform, token);
        try {
            if (platform === 'gitee') {
                localStorage.setItem('noname_gitee_token', token);
            } else {
                localStorage.setItem('noname_authorization', token);
                localStorage.setItem('noname_github_token', token);
            }
            return true;
        } catch (e) {
            console.error('[Token] 保存失败:', e);
            return false;
        }
    }

    clear(platform) {
        this.cache.delete(platform);
        if (platform === 'gitee') {
            localStorage.removeItem('noname_gitee_token');
        } else {
            localStorage.removeItem('noname_authorization');
            localStorage.removeItem('noname_github_token');
        }
    }

    has(platform) {
        return !!this.get(platform);
    }
}

// ==================== Git 适配器 ====================
class GitAdapter {
    constructor(url) {
        this.raw = null;
        this.api = null;
        this.fallback = null;
        this.platform = null;
        this.owner = null;
        this.repo = null;
        this.branch = 'main';
        this.parse(url);
    }

    parse(url) {
        if (!url) throw new Error('无效的仓库地址');
        url = url.trim().replace(/\/+$/, '');

        if (url.includes('github.com')) {
            this.platform = 'github';
            const match = url.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/);
            if (!match) throw new Error('无法解析GitHub地址');
            [, this.owner, this.repo, this.branch] = match;
        } else if (url.includes('gitee.com')) {
            this.platform = 'gitee';
            const match = url.match(/gitee\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/);
            if (!match) throw new Error('无法解析Gitee地址');
            [, this.owner, this.repo, this.branch] = match;
        } else {
            throw new Error('不支持的Git平台');
        }

        this.repo = this.repo.replace(/\.git$/, '');
        this.branch = this.branch || 'main';
        this.updateURLs();
    }

    updateURLs() {
        const { platform, owner, repo, branch } = this;
        if (platform === 'github') {
            this.raw = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`;
            this.api = `https://api.github.com/repos/${owner}/${repo}/contents/`;
            this.fallback = `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/`;
        } else {
            this.raw = `https://gitee.com/${owner}/${repo}/raw/${branch}/`;
            this.api = `https://gitee.com/api/v5/repos/${owner}/${repo}/contents/`;
            this.fallback = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`;
        }
    }

    switchBranch(branch) {
        this.branch = branch;
        this.updateURLs();
    }

    getURL(path = '') {
        return this.raw + path.replace(/^\/+/, '');
    }

    getFallbackURL(path = '') {
        return this.fallback + path.replace(/^\/+/, '');
    }
}

// ==================== 状态管理（含防抖） ====================
class StateManager {
    constructor(tempDir) {
        this.path = `${tempDir}/${CONFIG.files.state}`;
        this.data = null;
        this.saveTimer = null;
        this.pendingSave = false;
    }

    async load() {
        try {
            const exists = await game.promises.checkFile(this.path);
            if (!exists) return null;

            const content = await game.promises.readFileAsText(this.path);
            this.data = JSON.parse(content);

            if (Date.now() - (this.data.timestamp || 0) > CONFIG.limits.maxTempAge) {
                await this.clear();
                return null;
            }
            return this.data;
        } catch (e) {
            return null;
        }
    }

    // 防抖保存
    async save(immediate = false) {
        if (!this.data) return;
        
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
        }

        const doSave = async () => {
            try {
                const dir = this.path.substring(0, this.path.lastIndexOf('/'));
                const name = this.path.substring(this.path.lastIndexOf('/') + 1);
                await game.promises.writeFile(
                    JSON.stringify(this.data, null, 2),
                    dir,
                    name
                );
            } catch (e) {
                console.error('[State] 保存失败:', e);
            }
        };

        if (immediate) {
            await doSave();
        } else {
            this.saveTimer = setTimeout(doSave, CONFIG.limits.stateSaveDebounce);
        }
    }

    async init(repo, branch, mode, files) {
        this.data = {
            timestamp: Date.now(),
            repo: { platform: repo.platform, owner: repo.owner, repo: repo.repo, branch },
            mode,
            files: files.map(f => ({
                path: f.remote,
                size: f.size,
                type: f.type,
                critical: f.critical,
                status: 'pending',
                retries: 0,
                error: null,
                errorType: null, // 'cors' | 'token' | 'network' | 'disk'
                downloadedBytes: 0
            })),
            stats: { total: files.length, success: 0, failed: 0, skipped: 0, bytes: 0, totalBytes: files.reduce((s, f) => s + (f.size || 0), 0) },
            completed: false,
            hasFailures: false
        };
        await this.save(true);
    }

    async updateFile(path, status, error = null, errorType = null, bytes = 0) {
        if (!this.data) return;
        const file = this.data.files.find(f => f.path === path);
        if (file) {
            const oldStatus = file.status;
            file.status = status;
            if (error) {
                file.error = error;
                file.errorType = errorType;
            }

            if (oldStatus !== status) {
                if (status === 'success') {
                    this.data.stats.success++;
                    this.data.stats.bytes += bytes;
                } else if (status === 'failed') {
                    file.retries++;
                    this.data.stats.failed++;
                } else if (status === 'skipped') {
                    this.data.stats.skipped++;
                }

                if (status === 'pending' && oldStatus === 'failed') {
                    this.data.stats.failed--;
                }
            }
            await this.save();
        }
    }

    async updateProgress(path, bytes) {
        if (!this.data) return;
        const file = this.data.files.find(f => f.path === path);
        if (file) {
            file.downloadedBytes = bytes;
        }
    }

    getPending() {
        if (!this.data) return [];
        return this.data.files.filter(f => f.status === 'pending');
    }

    getFailed() {
        if (!this.data) return [];
        return this.data.files.filter(f => f.status === 'failed');
    }

    getSkipped() {
        if (!this.data) return [];
        return this.data.files.filter(f => f.status === 'skipped');
    }

    canResume() {
        if (!this.data) return false;
        return this.data.files.some(f => f.status === 'pending' || f.status === 'failed');
    }

    isCompletedWithFailures() {
        return this.data?.completed === true && this.data?.hasFailures === true;
    }

    async resetFailedToPending() {
        if (!this.data) return false;
        let changed = false;
        for (const file of this.data.files) {
            if (file.status === 'failed') {
                file.status = 'pending';
                file.error = null;
                file.errorType = null;
                file.downloadedBytes = 0;
                changed = true;
            }
        }
        if (changed) {
            this.data.completed = false;
            await this.save(true);
        }
        return changed;
    }

    async markAllFailedAsSkipped() {
        if (!this.data) return;
        for (const file of this.data.files) {
            if (file.status === 'failed') {
                file.status = 'skipped';
            }
        }
        await this.save(true);
    }

    async clear() {
        try {
            await game.promises.removeFile(this.path);
        } catch (e) { }
        this.data = null;
    }

    complete(hasFailures = false) {
        if (this.data) {
            this.data.completed = true;
            this.data.endTime = Date.now();
            this.data.hasFailures = hasFailures;
            this.save(true);
        }
    }
}

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

// ==================== 智能下载器（合并优化版） ====================
class SmartDownloader {
    constructor(repo, tokenManager) {
        this.repo = repo;
        this.tokens = tokenManager;
        this.env = Environment.getEnvironmentType();
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
        this.activeControllers = new Map();
        this.isCancelled = false;
        
        // Node 环境预加载模块
        if (this.env === 'node') {
            this.nodeModules = {
                http: window.require('http'),
                https: window.require('https'),
                url: window.require('url'),
                fs: window.require('fs'),
                path: window.require('path')
            };
        }
    }

    cancelAll() {
        this.isCancelled = true;
        for (const controller of this.activeControllers.values()) {
            controller.abort();
        }
        this.activeControllers.clear();
    }

    // 统一错误分类
    classifyError(error, platform) {
        const msg = error.message || '';
        if (msg.includes('401') || msg.includes('TOKEN_INVALID')) {
            return { type: 'token', recoverable: true };
        }
        if (msg.includes('403') || msg.includes('CORS') || msg.includes('ECONNREFUSED')) {
            return { type: 'cors', recoverable: platform === 'gitee' && this.env !== 'node' };
        }
        if (msg.includes('timeout') || msg.includes('ETIMEDOUT') || msg.includes('ECONNRESET')) {
            return { type: 'network', recoverable: true };
        }
        if (msg.includes('ENOSPC') || msg.includes('EACCES') || msg.includes('PERMISSION')) {
            return { type: 'disk', recoverable: false };
        }
        return { type: 'unknown', recoverable: true };
    }

    // Node 环境下载
    async downloadNode(url, onProgress, signal) {
        return new Promise((resolve, reject) => {
            try {
                const { url: urlModule, http, https } = this.nodeModules;
                const parsed = urlModule.parse(encodeURI(url));
                parsed.headers = {
                    'User-Agent': this.userAgent,
                    'Accept': '*/*',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
                };

                const token = this.tokens.get(this.repo.platform);
                if (token) {
                    parsed.headers['Authorization'] = `token ${token}`;
                }

                const protocol = url.startsWith('https') ? https : http;
                const requestId = Date.now() + Math.random();
                
                const req = protocol.get(parsed, (res) => {
                    if (signal?.aborted) return;

                    // 处理重定向
                    if (res.statusCode === 301 || res.statusCode === 302) {
                        const redirectUrl = res.headers.location;
                        if (redirectUrl) {
                            this.downloadNode(redirectUrl, onProgress, signal)
                                .then(resolve)
                                .catch(reject);
                            return;
                        }
                    }

                    if (res.statusCode !== 200) {
                        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                        return;
                    }

                    const chunks = [];
                    let received = 0;
                    const total = parseInt(res.headers['content-length']) || 0;

                    res.on('data', (chunk) => {
                        if (signal?.aborted) return;
                        chunks.push(chunk);
                        received += chunk.length;
                        if (onProgress) onProgress(received, total);
                    });

                    res.on('end', () => {
                        if (signal?.aborted) return;
                        const buffer = Buffer.concat(chunks);
                        resolve({
                            data: buffer,
                            size: buffer.length,
                            headers: res.headers
                        });
                    });

                    res.on('error', reject);
                });

                const controller = {
                    abort: () => {
                        req.destroy();
                        reject(new Error('下载已取消'));
                    }
                };
                this.activeControllers.set(requestId, controller);

                if (signal) {
                    signal.addEventListener('abort', controller.abort);
                }

                req.on('error', (err) => {
                    this.activeControllers.delete(requestId);
                    reject(err);
                });
                req.setTimeout(CONFIG.limits.timeout, () => {
                    req.destroy();
                    reject(new Error('请求超时'));
                });

            } catch (e) {
                reject(new Error(`Node 下载初始化失败: ${e.message}`));
            }
        });
    }

    // Fetch 环境下载（浏览器/Electron）
    async downloadFetch(url, onProgress, signal, token) {
        const headers = {
            'User-Agent': this.userAgent,
            'Accept': '*/*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        };

        if (token) {
            headers['Authorization'] = `token ${token}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers,
            signal,
            mode: 'cors',
            cache: 'no-cache'
        });

        if (!response.ok) {
            if (response.status === 401) throw new Error('TOKEN_INVALID');
            if (response.status === 403) throw new Error('CORS_OR_AUTH');
            throw new Error(`HTTP ${response.status}`);
        }

        // 流式读取以支持进度
        const reader = response.body.getReader();
        const contentLength = +(response.headers.get('Content-Length') || 0);
        const chunks = [];
        let received = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            chunks.push(value);
            received += value.length;
            if (onProgress) onProgress(received, contentLength);
        }

        // 合并 chunks
        const allChunks = new Uint8Array(received);
        let position = 0;
        for (const chunk of chunks) {
            allChunks.set(chunk, position);
            position += chunk.length;
        }

        return {
            data: allChunks.buffer,
            size: received,
            headers: response.headers
        };
    }

    // 主下载方法
    async download(task, onProgress) {
        if (this.isCancelled) throw new Error('下载已取消');

        const url = this.repo.getURL(task.remote);
        const fallback = this.repo.getFallbackURL(task.remote);
        const token = this.tokens.get(this.repo.platform);
        const controller = new AbortController();
        const requestId = Date.now() + Math.random();
        this.activeControllers.set(requestId, controller);

        const cleanup = () => {
            this.activeControllers.delete(requestId);
        };

        try {
            let result;

            // 主源尝试
            try {
                if (this.env === 'node') {
                    result = await this.downloadNode(url, onProgress, controller.signal);
                } else {
                    result = await this.downloadFetch(url, onProgress, controller.signal, token);
                }
            } catch (error) {
                // 特定错误重试或切换备用源
                const { type } = this.classifyError(error, this.repo.platform);
                
                // Token 错误，清除 Token 并重试一次
                if (type === 'token' && token) {
                    this.tokens.clear(this.repo.platform);
                    game.print('🔄 Token 无效，清除后重试...');
                    await utils.sleep(CONFIG.limits.retryDelay);
                    if (this.env !== 'node') {
                        result = await this.downloadFetch(url, onProgress, controller.signal, null);
                    } else {
                        throw error; // Node 环境下 Token 通常不影响，直接抛出
                    }
                } 
                // 网络/CORS 错误，尝试备用源
                else if (fallback && fallback !== url && (type === 'cors' || type === 'network')) {
                    game.print('🔄 主源失败，尝试备用源...');
                    result = await this.downloadFetch(fallback, onProgress, controller.signal, token);
                } else {
                    throw error;
                }
            }

            // 保存文件
            await this.saveFile(task.temp, result.data, task.type);
            cleanup();
            return { success: true, size: result.size, mode: this.env };

        } catch (error) {
            cleanup();
            const { type } = this.classifyError(error, this.repo.platform);
            return { 
                success: false, 
                error: error.message, 
                errorType: type,
                needToken: type === 'cors' && this.repo.platform === 'gitee' && this.env !== 'node'
            };
        }
    }

    async saveFile(path, data, type) {
        const dir = path.substring(0, path.lastIndexOf('/'));
        const name = path.substring(path.lastIndexOf('/') + 1);

        await game.promises.ensureDirectory(dir);

        if (type === 'text') {
            const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
            await game.promises.writeFile(text, dir, name);
        } else {
            // 二进制数据
            let buffer;
            if (data instanceof ArrayBuffer) {
                buffer = new Uint8Array(data);
            } else if (Buffer.isBuffer(data)) {
                buffer = data;
            } else {
                buffer = data;
            }
            await game.promises.writeFile(buffer, dir, name);
        }
    }
}

// ==================== 版本检查器 ====================
class VersionChecker {
    constructor(repo, tokens, env) {
        this.repo = repo;
        this.tokens = tokens;
        this.env = env;
        this.downloader = new SmartDownloader(repo, tokens);
    }

    async check(gameVersion) {
        const url = this.repo.getURL(CONFIG.files.version);
        try {
            const task = new DownloadTask({
                remote: CONFIG.files.version,
                temp: `${basic.path}/temp_version.json`,
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

// ==================== UI 管理器（增强版） ====================
class UIManager {
    constructor() {
        this.dialog = Lit_Dialog;
        this.env = Environment.getEnvironmentType();
    }

    async showMainMenu(resumeInfo, hasToken) {
        const buttons = ['检查更新'];
        if (resumeInfo.canResume) buttons.push('⏸️ 继续上次更新');
        if (resumeInfo.hasFailures) buttons.push('🔄 仅重试失败文件');
        buttons.push('🔑 Token管理', '💾 版本回退', '取消');

        const envText = this.env === 'node' 
            ? '🖥️ 当前环境: Node.js（直连模式，速度最快）\n' 
            : this.env === 'electron-renderer'
            ? '⚠️ 当前环境: Electron（可能受网络限制）\n'
            : '⚠️ 当前环境: 浏览器（建议配置Token）\n';

        const index = await this.dialog.choice(
            `${CONFIG.name} 更新中心`,
            `请选择操作：\n\n` +
            envText +
            `${resumeInfo.canResume ? '⏸️ 发现未完成的下载任务\n' : ''}` +
            `${resumeInfo.hasFailures ? '⚠️ 存在上次下载失败的文件\n' : ''}` +
            `${!hasToken.github && !hasToken.gitee && this.env !== 'node' ? '💡 提示: 建议配置 Token 避免下载失败\n' : ''}`,
            buttons
        );

        const choice = buttons[index];
        if (choice === '取消' || index === -1) return null;
        if (choice.includes('继续上次')) return 'resume';
        if (choice.includes('重试失败')) return 'retry_failed';
        if (choice.includes('Token')) return 'token';
        if (choice.includes('版本回退')) return 'rollback';
        return 'check';
    }

    async showTokenManager(tokens) {
        const githubStatus = tokens.has('github') ? '✅ 已设置' : '❌ 未设置';
        const giteeStatus = tokens.has('gitee') ? '✅ 已设置' : '❌ 未设置';
        const envHint = this.env === 'node' 
            ? 'Node 模式下通常无需 Token，但配置后可提高 API 限额' 
            : '浏览器模式下强烈建议配置 Token，避免 Gitee 403 错误';

        const index = await this.dialog.choice(
            'Token 管理',
            `GitHub Token: ${githubStatus}\n` +
            `Gitee Token: ${giteeStatus}\n\n` +
            `${envHint}\n\n` +
            `GitHub: github.com/settings/tokens (需 repo 权限)\n` +
            `Gitee: gitee.com/profile/personal_access_tokens`,
            ['设置GitHub Token', '设置Gitee Token', '清除GitHub Token', '清除Gitee Token', '返回']
        );

        if (index === 0) return { action: 'set', platform: 'github' };
        if (index === 1) return { action: 'set', platform: 'gitee' };
        if (index === 2) return { action: 'clear', platform: 'github' };
        if (index === 3) return { action: 'clear', platform: 'gitee' };
        return null;
    }

    async inputToken(platform) {
        const name = platform === 'gitee' ? 'Gitee' : 'GitHub';
        const url = platform === 'gitee'
            ? 'https://gitee.com/profile/personal_access_tokens'
            : 'https://github.com/settings/tokens';

        const result = await this.dialog.input(
            `设置 ${name} Token`,
            `请输入私人令牌(Token)\n获取地址：${url}\n\n留空可清除现有 Token`,
            '',
            { placeholder: 'ghp_xxxx 或 gitee_token_xxxx', selectAll: false }
        );

        return result?.trim() || null;
    }

    // 使用 fileManager 替代 choice 管理备份（优化点6）
    async showRollbackManager(backups, currentVersion) {
        if (backups.length === 0) {
            await this.dialog.alert('版本回退', '暂无备份记录');
            return null;
        }

        const items = backups.map((b, i) => ({
            text: `[${i === 0 ? '当前' : `#${i + 1}`}] ${utils.formatDate(b.timestamp)} - ${b.fileCount}个文件`,
            value: b.timestamp.toString(),
            type: i === 0 ? 'current' : 'backup'
        }));

        const result = await this.dialog.fileManager(
            '版本回退管理',
            '选择要恢复的备份（仅可选一个回退，可多选删除）：\n💡 回退会覆盖当前版本，请先确认已备份重要数据',
            items
        );

        if (!result) return null;
        
        if (result.action === 'apply' && result.files.length === 1) {
            const backup = backups.find(b => b.timestamp.toString() === result.files[0]);
            return { action: 'rollback', backup };
        }
        
        if (result.action === 'delete' && result.files.length > 0) {
            const toDelete = result.files.map(ts => backups.find(b => b.timestamp.toString() === ts)).filter(Boolean);
            return { action: 'delete', backups: toDelete };
        }

        return null;
    }

    async confirmRollback(backup) {
        return await this.dialog.confirm(
            '确认回退',
            `确定要回退到以下版本吗？\n\n时间: ${utils.formatDate(backup.timestamp)}\n文件数: ${backup.fileCount}\n\n⚠️ 此操作将覆盖当前所有文件，且无法撤销！`,
            '确认回退',
            '取消'
        );
    }

    async showUpdateConfig(platform, hasResume, hasFailed) {
        const platforms = ['Gitee（国内推荐）', 'GitHub（国际）'];
        const platIndex = await this.dialog.choice('选择更新源', '请选择下载服务器：', platforms);
        if (platIndex === -1) return null;
        const selectedPlatform = platIndex === 0 ? 'gitee' : 'github';

        let modeMessage = '简易模式：仅更新文本文件，保留已有媒体文件（省流量）\n' +
            '全局模式：完整覆盖所有文件（适合首次安装）';
        let modeButtons = ['简易模式', '全局模式'];

        if (hasFailed) {
            modeMessage = '⚠️ 发现上次有失败的下载\n\n仅重试失败：只下载上次失败的文件\n' + modeMessage;
            modeButtons.unshift('仅重试失败文件');
        }

        modeButtons.push('取消');

        const modeIndex = await this.dialog.choice('选择更新模式', modeMessage, modeButtons);
        if (modeIndex === -1 || modeIndex === modeButtons.length - 1) return null;

        let mode = 'simple';
        if (hasFailed && modeIndex === 0) {
            mode = 'retry_failed';
        } else {
            const offset = hasFailed ? 1 : 0;
            mode = modeIndex === offset ? 'simple' : 'full';
        }

        return { platform: selectedPlatform, mode };
    }

    // 字节级进度计算（优化点5）
    async createDownloadProgress(title, totalBytes, totalFiles, mode) {
        const controller = await this.dialog.complexLoading(
            title, 
            mode === 'retry_failed' ? '正在重试失败的文件...' : '准备下载...',
            {
                width: 'min(520px, 92vw)',
                minHeight: '280px',
                indeterminate: false,
                initialStatus: '连接中...',
                initialDetail: `共 ${utils.parseSize(totalBytes)} (${totalFiles} 个文件)`
            }
        );

        let startTime = Date.now();
        let lastUpdate = Date.now();
        let downloadedBytes = 0;

        return {
            setFile: (name, size) => {
                controller.setDetail(`${name} (${utils.parseSize(size)})`);
            },

            // 基于字节的进度更新
            updateProgress: (fileReceived, fileTotal, totalReceived, totalSize, currentFileIndex, totalFiles) => {
                const now = Date.now();
                const elapsed = (now - startTime) / 1000;
                
                // 总进度百分比（基于字节）
                const totalPercent = totalSize > 0 
                    ? Math.min(100, Math.round((totalReceived / totalSize) * 100))
                    : Math.min(100, Math.round((currentFileIndex / totalFiles) * 100));

                // 当前文件进度
                const filePercent = fileTotal > 0 ? Math.round((fileReceived / fileTotal) * 100) : 0;

                // 计算速度
                const deltaTime = (now - lastUpdate) / 1000;
                const deltaBytes = totalReceived - downloadedBytes;
                const speed = deltaTime > 0 ? deltaBytes / deltaTime : 0;
                
                if (deltaTime >= 0.5) { // 每500ms更新一次
                    downloadedBytes = totalReceived;
                    lastUpdate = now;
                }

                const remainingBytes = totalSize - totalReceived;
                const eta = speed > 0 ? remainingBytes / speed : 0;

                const status = speed > 0
                    ? `${utils.parseSize(speed)}/s · 剩余 ${utils.formatTime(eta)} · 文件 ${currentFileIndex}/${totalFiles}`
                    : `文件 ${currentFileIndex}/${totalFiles}`;

                controller.updateProgress({
                    percent: totalPercent,
                    status: status,
                    detail: `${utils.parseSize(totalReceived)}/${utils.parseSize(totalSize)} · 当前文件 ${filePercent}%`
                });
            },

            setError: (msg) => controller.setError(msg),

            complete: (msg, delay) => controller.complete(msg, delay),

            close: () => controller.close(),

            showRetry: (onRetry) => {
                controller.setError('部分文件下载失败', true, onRetry);
            }
        };
    }

    async showCompleteResult(result, failedFiles) {
        const { stats, elapsed, platform, mode } = result;
        const totalSize = utils.parseSize(stats.bytes);
        const isPartialSuccess = stats.failed > 0;

        let title = isPartialSuccess ? '更新完成（部分成功）' : '更新完成';
        
        // 分析失败原因（优化点3细节）
        const corsErrors = failedFiles.filter(f => f.errorType === 'cors');
        const tokenErrors = failedFiles.filter(f => f.errorType === 'token');
        const networkErrors = failedFiles.filter(f => f.errorType === 'network');
        const diskErrors = failedFiles.filter(f => f.errorType === 'disk');

        let message = `⏱️ 耗时: ${elapsed}秒\n` +
            `✅ 成功: ${stats.success} 个文件 (${totalSize})\n`;

        if (stats.skipped > 0) message += `⏭️ 跳过: ${stats.skipped} 个（已存在）\n`;
        if (isPartialSuccess) message += `❌ 失败: ${stats.failed} 个文件\n\n`;

        // 针对性提示
        if (corsErrors.length > 0 && this.env !== 'node') {
            message += `⚠️ ${corsErrors.length} 个文件因网络限制失败\n` +
                `💡 建议：使用 Node.js 客户端，或配置 Gitee Token\n\n`;
        } else if (tokenErrors.length > 0) {
            message += `🔑 ${tokenErrors.length} 个文件因 Token 无效失败\n` +
                `💡 建议：在 Token 管理中重新配置\n\n`;
        } else if (networkErrors.length > 0) {
            message += `🌐 ${networkErrors.length} 个文件因网络超时失败\n` +
                `💡 建议：检查网络连接或稍后重试\n\n`;
        } else if (diskErrors.length > 0) {
            message += `💾 ${diskErrors.length} 个文件因磁盘错误失败（空间不足或无权限）\n\n`;
        }

        if (isPartialSuccess) {
            message += `失败文件示例：\n` +
                failedFiles.slice(0, 3).map(f => `• ${f.path}`).join('\n') +
                (failedFiles.length > 3 ? `\n...等${failedFiles.length}个` : '');

            const choice = await this.dialog.choice(title, message,
                ['🔄 立即重试失败项', '⏭️ 忽略失败并应用', '💾 保存进度稍后处理']
            );
            return ['retry', 'ignore', 'later'][choice] || 'later';
        } else {
            const shouldRestart = await this.dialog.confirm(
                title, 
                message + '\n\n✨ 更新完全成功！建议立即重启以应用更改。',
                '立即重启', 
                '稍后手动重启'
            );
            return shouldRestart ? 'restart' : 'done';
        }
    }

    async confirmStart(info) {
        const { version, branch, platform, mode, fileCount, skipCount, totalSize, envType } = info;

        const modeText = mode === 'simple' ? '简易（仅文本）' : mode === 'retry_failed' ? '失败重试' : '全局（完整覆盖）';
        const platformText = platform === 'gitee' ? 'Gitee（国内）' : 'GitHub（国际）';
        const envText = envType === 'node' ? 'Node.js 直连' : '浏览器 Fetch';

        let message = `📋 更新详情确认\n\n` +
            `版本分支: ${branch}\n` +
            `更新平台: ${platformText}\n` +
            `运行环境: ${envText}\n` +
            `更新模式: ${modeText}\n` +
            `文件总数: ${fileCount}个`;

        if (skipCount > 0) message += `（将跳过${skipCount}个媒体文件）`;
        message += `\n预估大小: ${totalSize || '未知'}\n\n` +
            `💾 自动备份: 更新前将创建完整备份\n` +
            `🔄 断点续传: 支持中断后恢复下载`;

        if (envType !== 'node' && platform === 'gitee') {
            message += `\n\n⚠️ 注意：浏览器环境访问 Gitee 可能受限，如遇 403 请配置 Token`;
        }

        return await this.dialog.confirm('确认开始更新', message, '开始更新', '取消');
    }

    async promptForToken(platform, errorType) {
        const name = platform === 'gitee' ? 'Gitee' : 'GitHub';
        const reason = errorType === 'token' ? 'Token 无效或已过期' : '访问被限制（可能需要 Token）';
        
        const shouldSet = await this.dialog.confirm(
            `${name} 访问受限`,
            `${reason}\n\n是否立即配置 ${name} Token 以提高下载成功率？\n\n` +
            `您可以：\n• 配置 Token 后自动继续下载\n• 取消并尝试备用源（可能失败）`,
            `配置 ${name} Token`,
            '取消并继续'
        );

        if (shouldSet) {
            const token = await this.inputToken(platform);
            if (token) return token;
        }
        return null;
    }

    async alert(title, message) {
        await this.dialog.alert(title, message);
    }

    async confirm(title, message, confirmText = '确定', cancelText = '取消') {
        return await this.dialog.confirm(title, message, confirmText, cancelText);
    }
}

// ==================== 备份管理器 ====================
class BackupManager {
    constructor(targetDir, filesDir) {
        this.targetDir = targetDir;
        this.filesDir = filesDir;
    }

    async listBackups() {
        try {
            const [folders] = await game.promises.getFileList(this.filesDir);
            const backups = [];

            for (const folder of folders) {
                if (folder.startsWith('backup_')) {
                    const timestamp = parseInt(folder.replace('backup_', ''));
                    if (!isNaN(timestamp)) {
                        let fileCount = 0;
                        try {
                            const [, files] = await game.promises.getFileList(`${this.filesDir}/${folder}`);
                            fileCount = files.length;
                        } catch (e) { }

                        backups.push({
                            name: folder,
                            timestamp,
                            fileCount,
                            path: `${this.filesDir}/${folder}`
                        });
                    }
                }
            }

            return backups.sort((a, b) => b.timestamp - a.timestamp);
        } catch (e) {
            return [];
        }
    }

    async createBackup() {
        const backupDir = `${this.filesDir}/backup_${Date.now()}`;
        try {
            const dirExists = await game.promises.checkDir(this.targetDir);
            if (dirExists === 1) {
                game.print(`[备份] 创建备份: ${backupDir}`);
                await this.copyDirectoryRecursive(this.targetDir, backupDir);
                await this.cleanupOldBackups(CONFIG.limits.backupCount);
                return { success: true, path: backupDir };
            }
            return { success: false, error: '目标目录不存在' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async rollbackToBackup(backup) {
        const tempBackup = `${this.filesDir}/rollback_temp_${Date.now()}`;

        try {
            const exists = await game.promises.checkDir(this.targetDir);
            if (exists === 1) {
                await this.copyDirectoryRecursive(this.targetDir, tempBackup);
            }

            await game.promises.removeDir(this.targetDir);
            await this.copyDirectoryRecursive(backup.path, this.targetDir);

            try {
                await game.promises.removeDir(tempBackup);
            } catch (e) { }

            return { success: true };
        } catch (error) {
            // 回滚失败，恢复原状
            try {
                await game.promises.removeDir(this.targetDir);
                await this.copyDirectoryRecursive(tempBackup, this.targetDir);
                await game.promises.removeDir(tempBackup);
            } catch (e) { }

            return { success: false, error: error.message };
        }
    }

    async deleteBackup(backup) {
        try {
            await game.promises.removeDir(backup.path);
            return true;
        } catch (e) {
            return false;
        }
    }

    async cleanupOldBackups(maxCount) {
        const backups = await this.listBackups();
        if (backups.length <= maxCount) return;

        const toDelete = backups.slice(maxCount);
        for (const backup of toDelete) {
            try {
                await game.promises.removeDir(backup.path);
                console.log(`[备份清理] 删除旧备份: ${backup.name}`);
            } catch (e) {
                console.warn(`[备份清理] 删除失败: ${backup.name}`);
            }
        }
    }

    async copyDirectoryRecursive(src, dest) {
        const [folders, files] = await game.promises.getFileList(src);
        await game.promises.createDir(dest);

        for (const file of files) {
            const content = await game.promises.readFile(`${src}/${file}`);
            await game.promises.writeFile(content, dest, file);
        }

        for (const folder of folders) {
            await this.copyDirectoryRecursive(`${src}/${folder}`, `${dest}/${folder}`);
        }
    }

    // 清理过期临时目录（优化点4）
    async cleanupOldTempDirs() {
        try {
            const [folders] = await game.promises.getFileList(this.targetDir);
            const tempDirs = folders.filter(f => f.startsWith('__temp_'));
            const now = Date.now();

            for (const dir of tempDirs) {
                try {
                    const timestamp = parseInt(dir.replace('__temp_', ''));
                    if (!isNaN(timestamp) && (now - timestamp > CONFIG.limits.maxTempAge)) {
                        await game.promises.removeDir(`${this.targetDir}/${dir}`);
                        console.log(`[清理] 删除过期临时目录: ${dir}`);
                    }
                } catch (e) {
                    console.warn(`[清理] 无法删除临时目录 ${dir}:`, e);
                }
            }
        } catch (e) {
            console.warn('[清理] 扫描临时目录失败:', e);
        }
    }
}

// ==================== 主更新器（事件驱动重构版） ====================
class ExtensionUpdater {
    constructor() {
        this.repo = null;
        this.tempDir = null;
        this.targetDir = basic.path;
        this.filesDir = basic.files;
        this.tokens = new TokenManager();
        this.state = null;
        this.ui = new UIManager();
        this.backupManager = new BackupManager(this.targetDir, this.filesDir);
        this.downloader = null;
        this.tasks = []; // DownloadTask 数组
        this.mode = 'simple';
        this.startTime = 0;
        this.shouldCleanup = true;
        this.totalBytes = 0;
        this.envType = Environment.getEnvironmentType();
        this.eventHandlers = {};
    }

    // 事件订阅机制（解耦UI）
    on(event, handler) {
        if (!this.eventHandlers[event]) this.eventHandlers[event] = [];
        this.eventHandlers[event].push(handler);
    }

    emit(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(h => h(data));
        }
    }

    async init(platform, mode = 'simple') {
        const url = CONFIG.urls[platform];
        if (!url) throw new Error('无效的平台');

        this.repo = new GitAdapter(url);
        this.mode = mode;
        this.tempDir = `${this.targetDir}/__temp_${Date.now()}`;
        this.state = new StateManager(this.tempDir);
        this.downloader = new SmartDownloader(this.repo, this.tokens);
        this.shouldCleanup = true;
        this.totalBytes = 0;
        this.tasks = [];

        // 启动时清理旧临时目录
        await this.backupManager.cleanupOldTempDirs();

        console.log(`[更新器] 初始化: 平台=${platform}, 环境=${this.envType}, 模式=${mode}`);
    }

    async resumeFromState(tempDir) {
        this.tempDir = tempDir;
        this.state = new StateManager(this.tempDir);
        const loaded = await this.state.load();

        if (loaded) {
            this.repo = new GitAdapter(CONFIG.urls[loaded.repo.platform]);
            this.repo.switchBranch(loaded.repo.branch);
            this.mode = loaded.mode;
            this.downloader = new SmartDownloader(this.repo, this.tokens);
            
            // 恢复任务列表
            this.tasks = loaded.files.map(f => new DownloadTask({
                remote: f.path,
                temp: `${this.tempDir}/${f.path}`,
                target: `${this.targetDir}/${f.path}`,
                size: f.size,
                type: f.type,
                critical: f.critical,
                priority: f.type === 'text' ? 0 : (f.type === 'media' ? 2 : 1),
                skip: f.status === 'skipped'
            }));

            this.totalBytes = this.tasks.reduce((sum, t) => sum + (t.size || 0), 0);
            return true;
        }
        return false;
    }

    async checkResume() {
        try {
            const [folders] = await game.promises.getFileList(this.targetDir);
            const tempDirs = folders.filter(f => f.startsWith('__temp_'));

            if (tempDirs.length > 0) {
                tempDirs.sort().reverse();
                for (const dir of tempDirs) {
                    if (await this.resumeFromState(`${this.targetDir}/${dir}`)) {
                        return {
                            canResume: this.state.canResume(),
                            hasFailures: this.state.isCompletedWithFailures(),
                            tempDir: this.tempDir
                        };
                    }
                }
            }
        } catch (e) { }
        return { canResume: false, hasFailures: false, tempDir: null };
    }

    async prepareFileList(targetBranch = null) {
        if (targetBranch) this.repo.switchBranch(targetBranch);

        const url = this.repo.getURL(CONFIG.files.directory);
        
        // 下载文件列表
        const listTask = new DownloadTask({
            remote: CONFIG.files.directory,
            temp: `${this.tempDir}/Directory.json`,
            size: 0,
            type: 'json'
        });

        const result = await this.downloader.download(listTask);
        if (!result.success) {
            if (result.needToken) {
                // 动态请求 Token（优化点3）
                const token = await this.ui.promptForToken(this.repo.platform, 'cors');
                if (token) {
                    this.tokens.set(this.repo.platform, token);
                    this.downloader = new SmartDownloader(this.repo, this.tokens);
                    return this.prepareFileList(targetBranch); // 重试
                }
            }
            throw new Error(`获取文件列表失败: ${result.error}`);
        }

        const content = await game.promises.readFileAsText(listTask.temp);
        let directory;
        try {
            directory = JSON.parse(content);
        } catch (e) {
            throw new Error('文件列表格式错误');
        }

        // 解析文件列表（复用原逻辑，改为 Task 对象）
        const excludes = {
            dirs: ['.git', '.vscode', 'node_modules', '__temp__'],
            files: ['.gitignore', '.DS_Store', CONFIG.files.state],
            exts: ['.tmp', '.log', '.bak']
        };

        this.tasks = [];
        this.totalBytes = 0;

        for (const [path, info] of Object.entries(directory)) {
            if (!path) continue;
            const parts = path.split('/').filter(p => p);
            const fileName = parts[parts.length - 1];

            if (parts.some(p => excludes.dirs.includes(p))) continue;
            if (excludes.files.includes(fileName)) continue;
            if (excludes.exts.some(ext => fileName.endsWith(ext))) continue;
            if (fileName.startsWith('.')) continue;

            const cleanPath = parts.join('/');
            const type = utils.getFileType(fileName);
            const size = info?.size || 0;

            const task = new DownloadTask({
                remote: cleanPath,
                temp: `${this.tempDir}/${cleanPath}`,
                target: `${this.targetDir}/${cleanPath}`,
                size,
                type,
                critical: utils.isCritical(fileName),
                priority: type === 'text' ? 0 : (type === 'media' ? 2 : 1)
            });

            // 简易模式：标记已存在的媒体文件为跳过
            if (this.mode === 'simple' && task.priority > 0) {
                try {
                    const exists = await game.promises.checkFile(task.target);
                    if (exists === 1) {
                        task.skip = true;
                    }
                } catch (e) { }
            }

            this.tasks.push(task);
            if (!task.skip) this.totalBytes += size;
        }

        // 按优先级排序（关键文件优先）
        this.tasks.sort((a, b) => {
            if (a.critical !== b.critical) return a.critical ? -1 : 1;
            return a.priority - b.priority;
        });

        const skipCount = this.tasks.filter(t => t.skip).length;
        await this.state.init(this.repo, this.repo.branch, this.mode, this.tasks);
        
        return { 
            fileCount: this.tasks.length, 
            skipCount, 
            totalBytes: this.totalBytes 
        };
    }

    // 核心下载逻辑（真正的并发控制）
    async downloadFiles(onProgress, onFileStart) {
        const pending = this.state.getPending()
            .map(p => this.tasks.find(t => t.remote === p.path))
            .filter(Boolean);

        if (pending.length === 0) return this.state.data.stats;

        let completedCount = this.tasks.length - pending.length;
        let totalDownloadedBytes = this.state.data.stats.bytes;
        
        // 并发下载（使用 asyncPool）
        await utils.asyncPool(CONFIG.limits.maxConcurrent, pending, async (task) => {
            if (task.skip) {
                await this.state.updateFile(task.remote, 'skipped');
                completedCount++;
                return;
            }

            if (onFileStart) onFileStart(task.remote, task.size);

            let lastReportedBytes = 0;
            
            const result = await this.downloader.download(task, (received, total) => {
                // 细粒度进度
                task.downloadedBytes = received;
                const delta = received - lastReportedBytes;
                if (delta > 65536 || received === total) { // 每64KB或完成时更新
                    totalDownloadedBytes += delta;
                    lastReportedBytes = received;
                    this.state.updateProgress(task.remote, received);
                    
                    if (onProgress) {
                        onProgress(received, total, totalDownloadedBytes, this.totalBytes, completedCount, pending.length);
                    }
                }
            });

            if (result.success) {
                completedCount++;
                await this.state.updateFile(task.remote, 'success', null, null, result.size);
            } else {
                await this.state.updateFile(task.remote, 'failed', result.error, result.errorType);
                
                // 动态 Token 提示（优化点3）
                if (result.needToken && !this._tokenPrompted) {
                    this._tokenPrompted = true; // 防止重复提示
                    const token = await this.ui.promptForToken(this.repo.platform, result.errorType);
                    if (token) {
                        this.tokens.set(this.repo.platform, token);
                        this.downloader = new SmartDownloader(this.repo, this.tokens);
                    }
                }
            }
        });

        return this.state.data.stats;
    }

    // 仅重试失败文件（优化点1）
    async retryFailedFiles(onProgress, onFileStart) {
        const failed = this.state.getFailed();
        if (failed.length === 0) return this.state.data.stats;

        // 重置失败状态为 pending
        await this.state.resetFailedToPending();
        
        // 重新计算总字节数（仅失败文件）
        this.totalBytes = failed.reduce((sum, f) => sum + (f.size || 0), 0);
        
        return this.downloadFiles(onProgress, onFileStart);
    }

    async applyUpdate() {
        // 创建备份
        const backupResult = await this.backupManager.createBackup();
        if (!backupResult.success) {
            console.warn('[备份] 创建失败，继续更新:', backupResult.error);
        }

        // 移动文件
        await this.moveDirectory(this.tempDir, this.targetDir);
        
        // 清理
        this.state.complete(false);
        this.shouldCleanup = true;
        await this.cleanup();
    }

    async moveDirectory(src, dest) {
        const [folders, files] = await game.promises.getFileList(src);
        await game.promises.createDir(dest);

        for (const file of files) {
            const content = await game.promises.readFile(`${src}/${file}`);
            await game.promises.writeFile(content, dest, file);
            await game.promises.removeFile(`${src}/${file}`);
        }

        for (const folder of folders) {
            await this.moveDirectory(`${src}/${folder}`, `${dest}/${folder}`);
        }

        try {
            await game.promises.removeDir(src);
        } catch (e) { }
    }

    async cleanup() {
        if (!this.tempDir || !this.shouldCleanup) return;
        try {
            const exists = await game.promises.checkDir(this.tempDir);
            if (exists === 1) {
                await game.promises.removeDir(this.tempDir);
                console.log(`[清理] 已删除临时目录: ${this.tempDir}`);
            }
        } catch (e) {
            console.warn('[清理] 删除临时目录失败:', e);
        }
    }

    // Token 管理
    async manageTokens() {
        while (true) {
            const action = await this.ui.showTokenManager(this.tokens);
            if (!action) break;

            if (action.action === 'set') {
                const token = await this.ui.inputToken(action.platform);
                if (token !== null) {
                    if (token === '') {
                        this.tokens.clear(action.platform);
                        await this.ui.alert('清除成功', `${action.platform} Token 已清除`);
                    } else {
                        this.tokens.set(action.platform, token);
                        await this.ui.alert('设置成功', `${action.platform} Token 已保存`);
                    }
                }
            } else if (action.action === 'clear') {
                this.tokens.clear(action.platform);
                await this.ui.alert('清除成功', `${action.platform} Token 已清除`);
            }
        }
    }

    // 版本回退（使用 fileManager）
    async manageRollback() {
        while (true) {
            const backups = await this.backupManager.listBackups();
            const currentVersion = 'current'; // 可扩展为读取当前版本
            
            const action = await this.ui.showRollbackManager(backups, currentVersion);
            if (!action) break;

            if (action.action === 'rollback') {
                const confirmed = await this.ui.confirmRollback(action.backup);
                if (confirmed) {
                    const result = await this.backupManager.rollbackToBackup(action.backup);
                    if (result.success) {
                        await this.ui.alert('回退成功', '版本已回退，建议立即重启游戏');
                        if (await this.ui.confirm('重启确认', '是否立即重启？', '立即重启', '稍后')) {
                            game.reload();
                        }
                        break;
                    } else {
                        await this.ui.alert('回退失败', result.error);
                    }
                }
            } else if (action.action === 'delete') {
                const confirm = await this.ui.confirm(
                    '删除确认', 
                    `确定删除选中的 ${action.backups.length} 个备份吗？此操作不可恢复。`,
                    '删除', '取消'
                );
                if (confirm) {
                    for (const backup of action.backups) {
                        await this.backupManager.deleteBackup(backup);
                    }
                    await this.ui.alert('删除成功', `已删除 ${action.backups.length} 个备份`);
                }
            }
        }
    }

    // 主更新流程
    async update(force = false, retryMode = false) {
        this.startTime = Date.now();
        let progressUI = null;
        this._tokenPrompted = false;

        try {
            // 恢复模式或重试模式
            if (!force && this.state.data && !retryMode) {
                // 恢复现有任务（断点续传）
            } else if (retryMode) {
                // 重试模式：使用现有状态，不重新初始化
            } else {
                // 全新下载：版本检查与文件列表准备
                const gameVer = lib.version || '1.0.0';
                const verInfo = await new VersionChecker(this.repo, this.tokens, this.envType).check(gameVer);

                if (verInfo.branch !== this.repo.branch) {
                    this.repo.switchBranch(verInfo.branch);
                }

                const { fileCount, skipCount, totalBytes } = await this.prepareFileList();

                const confirmed = await this.ui.confirmStart({
                    version: verInfo.extensionVersion,
                    branch: this.repo.branch,
                    platform: this.repo.platform,
                    mode: this.mode,
                    fileCount,
                    skipCount,
                    totalSize: utils.parseSize(totalBytes),
                    envType: this.envType
                });

                if (!confirmed) {
                    await this.cleanup();
                    return { cancelled: true };
                }
            }

            // 获取待下载文件数（用于UI）
            const pendingCount = retryMode 
                ? this.state.getFailed().length 
                : this.state.getPending().length;
            
            const totalBytes = retryMode 
                ? this.state.getFailed().reduce((s, f) => s + (f.size || 0), 0)
                : this.totalBytes;

            if (pendingCount === 0) {
                return { success: true, stats: this.state.data.stats, message: '所有文件已是最新' };
            }

            progressUI = await this.ui.createDownloadProgress(
                retryMode ? '重试失败文件' : '下载更新',
                totalBytes,
                pendingCount,
                this.mode
            );

            // 绑定取消事件
            const onCancel = () => {
                this.downloader.cancelAll();
                this.shouldCleanup = false;
            };

            let currentFileIndex = 0;
            
            // 执行下载（区分正常下载和重试下载）
            const downloadMethod = retryMode 
                ? () => this.retryFailedFiles(
                    (fileRec, fileTot, totalRec, totalTot, idx, tot) => {
                        progressUI.updateProgress(fileRec, fileTot, totalRec, totalTot, idx, tot);
                    },
                    (name, size) => {
                        currentFileIndex++;
                        progressUI.setFile(name, size);
                    }
                )
                : () => this.downloadFiles(
                    (fileRec, fileTot, totalRec, totalTot, idx, tot) => {
                        progressUI.updateProgress(fileRec, fileTot, totalRec, totalTot, idx, tot);
                    },
                    (name, size) => {
                        currentFileIndex++;
                        progressUI.setFile(name, size);
                    }
                );

            await downloadMethod();
            progressUI.close();

            const failed = this.state.getFailed();
            if (failed.length > 0) {
                this.shouldCleanup = false;
                this.state.complete(true);

                const action = await this.ui.showCompleteResult(
                    {
                        stats: this.state.data.stats,
                        elapsed: ((Date.now() - this.startTime) / 1000).toFixed(1),
                        platform: this.repo.platform,
                        mode: this.mode
                    },
                    failed.map(f => ({
                        path: f.path,
                        error: f.error,
                        errorType: f.errorType
                    }))
                );

                if (action === 'retry') {
                    // 仅重试失败（优化点1）
                    return await this.update(true, true);
                } else if (action === 'ignore') {
                    await this.state.markAllFailedAsSkipped();
                    await this.applyUpdate();
                    return {
                        success: true,
                        partial: true,
                        stats: this.state.data.stats,
                        message: '已跳过失败文件完成更新'
                    };
                } else {
                    return { retryLater: true, failed };
                }
            } else {
                await this.applyUpdate();
                const result = {
                    success: true,
                    partial: false,
                    stats: this.state.data.stats,
                    elapsed: ((Date.now() - this.startTime) / 1000).toFixed(1),
                    platform: this.repo.platform,
                    mode: this.mode
                };

                const action = await this.ui.showCompleteResult(result, []);
                if (action === 'restart') {
                    game.reload();
                }
                return result;
            }

        } catch (error) {
            if (progressUI) progressUI.close();
            
            if (error.message === '下载已取消') {
                this.shouldCleanup = false;
                return { cancelled: true, canResume: true };
            }

            throw error;
        }
    }
}

// ==================== 对外接口 ====================
const Lit_update = {
    async showUI() {
        const updater = new ExtensionUpdater();
        let autoRetryCount = 0;

        try {
            // 启动时自动清理过期临时文件
            await updater.backupManager.cleanupOldTempDirs();

            const resumeInfo = await updater.checkResume();
            const hasToken = {
                github: updater.tokens.has('github'),
                gitee: updater.tokens.has('gitee')
            };

            const choice = await updater.ui.showMainMenu(resumeInfo, hasToken);
            if (!choice) return;

            if (choice === 'token') {
                await updater.manageTokens();
                return;
            }

            if (choice === 'rollback') {
                await updater.manageRollback();
                return;
            }

            let mode = 'simple';
            let isRetryMode = false;

            if (choice === 'resume') {
                // 断点续传：复用现有状态
                await updater.init(updater.repo.platform, updater.mode);
            } else if (choice === 'retry_failed') {
                // 仅重试失败
                await updater.init(updater.repo.platform, updater.mode);
                isRetryMode = true;
            } else {
                // 新任务
                const config = await updater.ui.showUpdateConfig(
                    'github',
                    resumeInfo.canResume,
                    resumeInfo.hasFailures
                );
                if (!config) return;

                // 清理旧临时目录（如果用户选择重新开始）
                if (resumeInfo.tempDir && config.mode !== 'retry_failed') {
                    await updater.backupManager.cleanupOldTempDirs();
                }

                await updater.init(config.platform, config.mode);
            }

            const result = await updater.update(false, isRetryMode);

            if (result.cancelled) {
                game.print('[更新] 已取消，进度已保存');
                return;
            }

            if (result.retryLater) {
                let msg = '已保留下载进度，下次可继续';
                await updater.ui.alert('进度已保存', msg);
                return;
            }

            if (result.success && result.partial) {
                game.print(`[更新] 部分完成: ${result.message}`);
            }

        } catch (error) {
            console.error('[更新失败]', error);
            
            // 细化错误提示
            let errorMsg = error.message;
            if (error.message.includes('CORS') || error.message.includes('403')) {
                errorMsg += '\n\n建议解决方案：\n1. 使用 Node.js 版本客户端\n2. 配置 Gitee Token\n3. 切换为 GitHub 源';
            }
            
            await updater.ui.alert('更新失败', errorMsg);

            if (error.message !== '下载已取消' && updater.tempDir) {
                const canResume = await updater.ui.confirm(
                    '恢复提示',
                    '是否保留当前进度以便稍后重试？',
                    '保留进度',
                    '清空临时文件'
                );
                if (!canResume) {
                    await updater.cleanup();
                }
            }
        }
    },

    // 快速更新（后台模式）
    async quickUpdate(platform = 'gitee', mode = 'simple', force = false) {
        const updater = new ExtensionUpdater();
        try {
            await updater.init(platform, mode);
            
            const resumeInfo = await updater.checkResume();
            if (resumeInfo.canResume && !force) {
                game.print('[更新] 发现未完成任务，继续下载...');
            }

            const result = await updater.update(force);
            
            if (result.retryLater) {
                game.print(`[${CONFIG.name}] 部分文件下载失败，已保存进度`);
                return result;
            }

            if (result.success) {
                const msg = result.partial ?
                    `部分完成: ${result.stats.success}成功, ${result.stats.failed}失败` :
                    `更新完成: ${result.stats.success}个文件`;
                game.print(`[${CONFIG.name}] ${msg}`);
            }
            return result;
        } catch (error) {
            game.print(`[${CONFIG.name}] 更新失败: ${error.message}`);
            throw error;
        }
    },

    // 快速下载指定文件（新增接口）
    async quickDownload(fileList, options = {}) {
        const { platform = 'gitee', onProgress, silent = false } = options;
        const updater = new ExtensionUpdater();
        
        try {
            await updater.init(platform, 'full');
            const tasks = fileList.map((file, index) => {
                if (typeof file === 'string') {
                    return new DownloadTask({
                        remote: file,
                        temp: `${updater.tempDir}/${file}`,
                        target: `${updater.targetDir}/${file}`,
                        size: 0,
                        type: utils.getFileType(file),
                        priority: index
                    });
                } else {
                    return new DownloadTask({
                        remote: file.path || file.remote,
                        temp: `${updater.tempDir}/${file.path || file.remote}`,
                        target: file.target || `${updater.targetDir}/${file.path || file.remote}`,
                        size: file.size || 0,
                        type: file.type || utils.getFileType(file.path || file.remote),
                        priority: file.priority || index
                    });
                }
            });

            updater.tasks = tasks;
            updater.totalBytes = tasks.reduce((s, t) => s + (t.size || 0), 0);
            
            if (!silent) game.print(`[快速下载] 开始下载 ${tasks.length} 个文件...`);

            let progressUI = null;
            if (!silent) {
                progressUI = await updater.ui.createDownloadProgress('快速下载', updater.totalBytes, tasks.length, 'full');
            }

            await utils.asyncPool(CONFIG.limits.maxConcurrent, tasks, async (task) => {
                const result = await updater.downloader.download(task, (rec, tot) => {
                    if (onProgress) onProgress(task.remote, rec, tot);
                    if (progressUI) {
                        progressUI.updateProgress(rec, tot, rec, tot, 0, tasks.length);
                    }
                });

                if (!result.success && !silent) {
                    console.warn(`[快速下载] 失败: ${task.remote} - ${result.error}`);
                }
                return result;
            });

            if (progressUI) progressUI.close();
            
            // 应用下载（直接移动到目标位置，不备份）
            for (const task of tasks) {
                try {
                    const exists = await game.promises.checkFile(task.temp);
                    if (exists) {
                        await game.promises.ensureDirectory(task.target.substring(0, task.target.lastIndexOf('/')));
                        const content = await game.promises.readFile(task.temp);
                        await game.promises.writeFile(content, task.target.substring(0, task.target.lastIndexOf('/') || '.'), task.target.split('/').pop());
                        await game.promises.removeFile(task.temp);
                    }
                } catch (e) {
                    console.warn(`[快速下载] 移动文件失败: ${task.remote}`);
                }
            }

            // 清理临时目录
            await updater.cleanup();

            if (!silent) game.print('[快速下载] 完成');
            return { success: true, tasks };
        } catch (error) {
            console.error('[快速下载] 失败:', error);
            throw error;
        }
    },

    async manageTokens() {
        const updater = new ExtensionUpdater();
        await updater.manageTokens();
    },

    async manageRollback() {
        const updater = new ExtensionUpdater();
        await updater.manageRollback();
    },

    token: {
        set: (platform, token) => new TokenManager().set(platform, token),
        get: (platform) => new TokenManager().get(platform),
        clear: (platform) => new TokenManager().clear(platform),
        has: (platform) => new TokenManager().has(platform)
    },

    getEnvironment() {
        return {
            type: Environment.getEnvironmentType(),
            details: Environment
        };
    }
};

export default Lit_update;
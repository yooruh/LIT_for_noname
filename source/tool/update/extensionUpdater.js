import { lib, game } from '../../../../../noname.js';
import { UPDATE_CONFIG as CONFIG } from './config.js';
import { updateUtils as utils } from './utils.js';
import { extensionFilesPath, extensionPath } from '../utils/paths.js';
import { updateEnvironment as Environment, TokenManager, GitAdapter } from './repository.js';
import { StateManager } from './stateManager.js';
import { DownloadTask, SmartDownloader } from './downloader.js';
import { VersionChecker } from './versionChecker.js';
import { UpdateDialogs as UIManager } from './updateDialogs.js';
import { BackupManager } from './backupManager.js';

// ==================== 主更新器 ====================
class ExtensionUpdater {
    constructor() {
        this.repo = null;
        this.tempDir = null;
        this.targetDir = extensionPath;
        this.filesDir = extensionFilesPath;
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
        this.fixedTempDirName = '_temp_downloading';
    }

    // 事件订阅机制
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
        this.tempDir = `${this.targetDir}/${this.fixedTempDirName}`;
        this.state = new StateManager(this.tempDir);
        this.downloader = new SmartDownloader(this.repo, this.tokens);
        this.shouldCleanup = true;
        this.totalBytes = 0;
        this.tasks = [];

        console.log(`[更新器] 初始化: 平台=${platform}, 环境=${this.envType}, 模式=${mode}`);
    }

    async resumeFromState(tempDir) {
        this.tempDir = tempDir;
        this.state = new StateManager(this.tempDir);
        const loaded = await this.state.load();

        if (loaded) {
            // 验证阶段合法性
            if (loaded.phase && !['downloading', 'moving'].includes(loaded.phase)) {
                console.warn(`[恢复] 上次更新停留在阶段: ${loaded.phase}，可能未完整应用`);
                if (loaded.phase === 'completed') {
                    return false; // 已完成的不恢复
                }
            }

            this.repo = new GitAdapter(CONFIG.urls[loaded.repo.platform]);
            this.repo.switchBranch(loaded.repo.branch);
            this.mode = loaded.mode;
            this.downloader = new SmartDownloader(this.repo, this.tokens);

            // 恢复任务列表，验证临时文件存在性
            this.tasks = [];
            for (const f of loaded.files) {
                const task = new DownloadTask({
                    remote: f.path,
                    temp: `${this.tempDir}/${f.path}`,
                    target: `${this.targetDir}/${f.path}`,
                    size: f.size,
                    type: f.type,
                    critical: f.critical,
                    priority: f.type === 'text' ? 0 : (f.type === 'media' ? 2 : 1),
                    skip: f.status === 'skipped'
                });

                // 验证已下载文件的临时文件是否存在
                if ((f.status === 'success' || f.status === 'applied') && f.tempVerified) {
                    try {
                        const exists = await game.promises.checkFile(task.temp);
                        if (exists !== 1 && f.status !== 'applied') {
                            console.warn(`[恢复] 临时文件丢失，重置为pending: ${f.path}`);
                            f.status = 'pending';
                            f.downloadedBytes = 0;
                            f.tempVerified = false;
                            f.applied = false;
                            task.skip = false;
                        }
                    } catch (e) {
                        if (f.status !== 'applied') {
                            f.status = 'pending';
                            f.tempVerified = false;
                            f.applied = false;
                        }
                    }
                }

                this.tasks.push(task);
            }
            // 修正统计
            this.totalBytes = this.tasks.reduce((sum, t) => sum + (t.skip ? 0 : (t.size || 0)), 0);
            this.recalculateStats();

            // 保存修正后的状态
            await this.state.save(true);
            return true;
        }
        return false;
    }

    async checkResume() {
        try {
            // 检查固定名称的临时目录是否存在
            const tempDir = `${this.targetDir}/${this.fixedTempDirName}`;
            const exists = await game.promises.checkDir(tempDir);

            if (exists === 1) {
                // 尝试从该目录加载状态
                if (await this.resumeFromState(tempDir)) {
                    return {
                        canResume: this.state.canResume(),
                        hasFailures: this.state.isCompletedWithFailures(),
                        hasPendingApply: this.state.hasPendingApply(),
                        tempDir: this.tempDir,
                        phase: this.state.data?.phase || 'downloading'
                    };
                }
            }
        } catch (e) { }
        return { canResume: false, hasFailures: false, tempDir: null };
    }

    recalculateStats() {
        if (!this.state.data) return;

        const stats = {
            total: this.state.data.files.length,
            success: 0,
            failed: 0,
            skipped: 0,
            bytes: 0,
            totalBytes: 0
        };

        for (const f of this.state.data.files) {
            if (f.status === 'success' || f.status === 'applied') {
                stats.success++;
                stats.bytes += f.size || 0;
            } else if (f.status === 'failed') {
                stats.failed++;
            } else if (f.status === 'skipped') {
                stats.skipped++;
            }

            if (f.status !== 'skipped') {
                stats.totalBytes += f.size || 0;
            }
        }

        this.state.data.stats = stats;
    }

    async prepareFileList(targetBranch = null) {
        if (targetBranch) this.repo.switchBranch(targetBranch);
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
                // 动态请求 Token
                const token = await this.ui.promptForToken(this.repo.platform, 'cors');
                if (token) {
                    this.tokens.set(this.repo.platform, token);
                    this.downloader = new SmartDownloader(this.repo, this.tokens);
                    return this.prepareFileList(targetBranch); // 重试
                }
            }
            const error = new Error(`获取文件列表失败: ${result.error}`);
            error.updateStage = 'download';
            error.errorType = result.errorType;
            throw error;
        }

        const content = await game.promises.readFileAsText(listTask.temp);
        let directory;
        try {
            directory = JSON.parse(content);
        } catch (e) {
            throw new Error('Directory.json文件列表格式错误');
        }

        // 解析文件列表
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

    // 核心下载逻辑
    async downloadFiles(onProgress, onFileStart) {
        const pending = this.state.getPending()
            .map(p => this.tasks.find(t => t.remote === p.path))
            .filter(Boolean);

        if (pending.length === 0) return this.state.data.stats;

        let completedCount = this.tasks.length - pending.length;
        let totalDownloadedBytes = this.state.data.stats.bytes;
        let lastForceSaveTime = Date.now();
        const FORCE_SAVE_INTERVAL = 5000; // 每5秒强制保存一次

        // 并发下载
        await utils.asyncPool(CONFIG.limits.maxConcurrent, pending, async (task) => {
            if (task.skip) {
                await this.state.updateFile(task.remote, 'skipped', null, null, 0, true);
                completedCount++;
                return;
            }

            if (onFileStart) onFileStart(task.remote, task.size);

            let lastReportedBytes = 0;
            let lastProgressSave = Date.now();

            const result = await this.downloader.download(task, async (received, total) => {
                // 细粒度进度 - 使用防抖，但定期强制保存
                task.downloadedBytes = received;
                const delta = received - lastReportedBytes;
                const now = Date.now();

                // 每64KB或完成时更新内存进度
                if (delta > 65536 || received === total) {
                    totalDownloadedBytes += delta;
                    lastReportedBytes = received;

                    // 每2秒或完成时强制保存进度
                    if (now - lastProgressSave > 2000 || received === total) {
                        await this.state.updateProgress(task.remote, received, true);
                        lastProgressSave = now;
                    } else {
                        await this.state.updateProgress(task.remote, received, false);
                    }

                    if (onProgress) {
                        onProgress(received, total, totalDownloadedBytes, this.totalBytes, completedCount, pending.length);
                    }
                }

                // 定期强制刷新所有状态
                if (now - lastForceSaveTime > FORCE_SAVE_INTERVAL) {
                    await this.state.flush();
                    lastForceSaveTime = now;
                }
            }, this.state); // 传入 stateManager 以便内部管理状态流转

            if (result.success) {
                completedCount++;
                // 状态已在 download 方法中强制保存，这里更新计数即可
            } else {
                // 失败状态也已在 download 方法中保存
                // 动态 Token 提示
                if (result.needToken && !this._tokenPrompted) {
                    this._tokenPrompted = true;
                    const token = await this.ui.promptForToken(this.repo.platform, result.errorType);
                    if (token) {
                        this.tokens.set(this.repo.platform, token);
                        this.downloader = new SmartDownloader(this.repo, this.tokens);
                    }
                }
            }
        });

        // 最终强制刷新
        await this.state.flush();
        return this.state.data.stats;
    }

    // 仅重试失败文件
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
        const backupResult = await this.backupManager.createBackup();
        if (!backupResult.success) {
            console.warn('[备份] 创建失败，继续更新:', backupResult.error);
        } else {
            await this.state.setPhase('backing_up', true);
        }
        try {
            await this.state.setPhase('moving', true);
            await this.applyDownloadedFiles();
            await this.cleanup();
        } catch (error) {
            console.error('[应用更新] 失败:', error);
            await this.state.setPhase('downloading', true);
            if (!error.updateStage) error.updateStage = 'apply';
            throw error;
        }
    }

    async applyDownloadedFiles() {
        const successFiles = this.state.data.files.filter(f => f.status === 'success' && f.tempVerified && !f.applied);
        for (const fileState of successFiles) {
            const task = this.tasks.find(t => t.remote === fileState.path);
            if (!task) continue;

            try {
                const content = await game.promises.readFile(task.temp);
                const targetDir = task.target.substring(0, task.target.lastIndexOf('/'));
                const targetName = task.target.split('/').pop();
                await game.promises.ensureDirectory(targetDir);
                await game.promises.writeFile(content, targetDir, targetName);
                await this.state.updateFile(fileState.path, 'applied', null, null, fileState.size || 0, true);
                await game.promises.removeFile(task.temp);
            } catch (e) {
                console.error(`[应用文件] 失败: ${fileState.path}`, e);
                const error = new Error(`应用文件失败: ${fileState.path} - ${e.message}`);
                error.updateStage = 'apply';
                error.errorType = 'apply';
                throw error;
            }
        }
    }

    async cleanup() {
        if (!this.tempDir) return;
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

    // 版本回退
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
    async update(force = false, resumeMode = false, retryMode = false) {
        this.startTime = Date.now();
        let progressUI = null;
        this._tokenPrompted = false;

        try {
            // 断点续传模式：保持现有状态继续下载
            if (resumeMode) {
                // 检查是否有可恢复的任务
                if (!this.state || !this.state.data || !this.state.canResume()) {
                    throw new Error('没有可恢复的下载任务');
                }

                if (this.state.hasPendingApply()) {
                    game.print(`[恢复] 继续应用已下载文件: ${this.state.data.stats.success}/${this.state.data.stats.total} 文件已就绪`);
                } else {
                    game.print(`[断点续传] 恢复下载: ${this.state.data.stats.success}/${this.state.data.stats.total} 文件已完成`);
                }
            }
            // 重试模式：只处理失败的文件
            else if (retryMode) {
                // 如果没有失败的文件，直接返回
                if (!this.state || !this.state.data) {
                    throw new Error('没有可重试的失败文件');
                }

                const failedCount = this.state.getFailed().length;
                if (failedCount === 0) {
                    return { success: true, stats: this.state.data.stats, message: '没有失败的文件需要重试' };
                }
            }
            // 正常模式：全新下载或检查版本
            else {
                // 如果有可恢复的状态，询问用户是否继续
                if (this.state.data && this.state.canResume() && !force) {
                    const choice = await this.ui.confirm(
                        '发现未完成任务',
                        '检测到上次未完成的下载任务，是否继续下载？\n\n选择"取消"将开始新的下载任务并删除之前的进度。',
                        '继续下载',
                        '开始新任务'
                    );

                    if (choice) {
                        // 用户选择继续，保持现有状态
                        if (this.state.hasPendingApply()) {
                            game.print(`[恢复] 继续应用已下载文件: ${this.state.data.stats.success}/${this.state.data.stats.total} 文件已就绪`);
                        } else {
                            game.print(`[断点续传] 恢复下载: ${this.state.data.stats.success}/${this.state.data.stats.total} 文件已完成`);
                        }
                    } else {
                        // 用户选择新任务，清理并重新开始
                        await this.cleanup();
                        this.tasks = [];
                        this.totalBytes = 0;

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
            }

            // 获取待下载文件数
            const pendingCount = retryMode
                ? this.state.getFailed().length
                : this.state.getPending().length;

            const totalBytes = retryMode
                ? this.state.getFailed().reduce((s, f) => s + (f.size || 0), 0)
                : this.totalBytes;

            if (pendingCount === 0 && !this.state.hasPendingApply()) {
                return { success: true, stats: this.state.data.stats, message: '所有文件已是最新' };
            }

            if (pendingCount > 0) {
                progressUI = await this.ui.createDownloadProgress(
                    retryMode ? '重试失败文件' : '下载更新',
                    totalBytes,
                    pendingCount,
                    this.mode
                );
            }

            let currentFileIndex = 0;
            if (pendingCount > 0) {
                // 执行下载（区分正常下载、断点续传和重试下载）
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
            }

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
                    // 仅重试失败
                    return await this.update(false, false, true);
                }
                if (action === 'ignore') {
                    await this.state.markAllFailedAsSkipped();
                    await this.applyUpdate(); // 确保执行备份、替换和清理
                    return {
                        success: true,
                        partial: true,
                        stats: this.state.data.stats,
                        message: '已跳过失败文件完成更新'
                    };
                }
                if (action === 'restart') {
                    game.reload();
                    return {
                        success: true,
                        stats: this.state.data.stats,
                        message: '更新已完成'
                    };
                }
                return { retryLater: true, failed };
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
                    return {
                        success: true,
                        stats: this.state.data.stats,
                        message: '更新已完成'
                    };
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

export { ExtensionUpdater };

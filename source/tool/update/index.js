import { game } from '../../../../../noname.js';
import { UPDATE_CONFIG as CONFIG } from './config.js';
import { updateUtils as utils } from './utils.js';
import { TokenManager, Environment } from './repository.js';
import { StateManager } from './stateManager.js';
import { DownloadTask } from './downloader.js';
import { ExtensionUpdater } from './extensionUpdater.js';

// ==================== 对外接口 ====================
export const extensionUpdateManager = {
    async showUI() {
        const updater = new ExtensionUpdater();

        try {
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
            let isResumeMode = false;
            let isRetryMode = false;

            if (choice === 'resume') {
                // 断点续传模式：使用现有状态继续下载
                if (!updater.state || !updater.state.data) {
                    throw new Error('恢复状态失败，请重新开始更新');
                }
                if (resumeInfo.canResume && resumeInfo.tempDir) {
                    updater.tempDir = resumeInfo.tempDir;
                    await updater.resumeFromState(resumeInfo.tempDir);
                }
                isResumeMode = true;
                if (updater.state.hasPendingApply()) {
                    game.print(`[恢复] 继续应用已下载文件: ${updater.state.data.stats.success}/${updater.state.data.stats.total} 文件已就绪`);
                } else {
                    game.print(`[断点续传] 恢复下载: ${updater.state.data.stats.success}/${updater.state.data.stats.total} 文件已完成`);
                }
            } else if (choice === 'retry_failed') {
                // 仅重试失败模式
                if (!updater.state || !updater.state.data) {
                    throw new Error('没有可重试的失败文件');
                }
                if (resumeInfo.canResume && resumeInfo.tempDir) {
                    updater.tempDir = resumeInfo.tempDir;
                    await updater.resumeFromState(resumeInfo.tempDir);
                }
                isRetryMode = true;
            } else {
                // 新任务
                const config = await updater.ui.showUpdateConfig(
                    'github',
                    resumeInfo.canResume,
                    resumeInfo.hasFailures
                );
                if (!config) return;

                // 清理旧临时目录
                if (resumeInfo.tempDir && config.mode !== 'retry_failed') {
                    await updater.cleanup();
                }

                await updater.init(config.platform, config.mode);
            }

            updater.versionSelect = true; // 交互路径允许自选更新版本
            const result = await updater.update(false, isResumeMode, isRetryMode);

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
            const stage = error.updateStage || 'download';
            const isApplyStage = stage === 'apply';
            let errorTitle = isApplyStage ? '应用更新失败' : '下载更新失败';
            let errorMsg = error.message;

            if (error.message.includes('CORS') || error.message.includes('403')) {
                errorMsg += '\n\n建议解决方案：\n1. 使用客户端环境\n2. 切换更新源\n3. 稍后重试';
            }
            if (isApplyStage) {
                errorMsg += '\n\n当前已保留已下载文件，可稍后继续应用，无需重新完整下载。';
            } else {
                errorMsg += '\n\n当前可保留下载进度，稍后继续更新。';
            }

            await updater.ui.alert(errorTitle, errorMsg);

            if (error.message !== '下载已取消' && updater.tempDir) {
                const canResume = await updater.ui.confirm(
                    '恢复提示',
                    isApplyStage ? '是否保留当前进度，以便稍后继续应用已下载文件？' : '是否保留当前进度以便稍后重试？',
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
                game.print(resumeInfo.hasPendingApply ? '[更新] 发现已下载但未应用的文件，继续应用...' : '[更新] 发现未完成任务，继续下载...');
            }

            const result = await updater.update(force, resumeInfo.canResume && !force, mode === 'retry_failed');

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

    // 快速下载指定文件
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
            updater.state = new StateManager(updater.tempDir);
            await updater.state.init(updater.repo, updater.repo.branch, 'full', tasks);

            if (!silent) game.print(`[快速下载] 开始下载 ${tasks.length} 个文件...`);

            let progressUI = null;
            if (!silent) {
                const knownTotalBytes = tasks.every(task => task.size > 0) ? updater.totalBytes : 0;
                progressUI = await updater.ui.createDownloadProgress('快速下载', knownTotalBytes, tasks.length, 'full');
            }

            let completedFileCount = 0;
            let totalDownloadedBytes = 0;
            let roundTotalBytes = updater.totalBytes;
            let unknownSizeCount = tasks.filter(task => !(task.size > 0)).length;
            await utils.asyncPool(CONFIG.limits.maxConcurrent, tasks, async (task) => {
                if (progressUI) progressUI.setFile(task.remote, task.size || 0);
                let accountedBytes = 0;
                let accountedTotal = task.size || 0;
                let result = null;

                const reportProgress = (received, fileTotal, force = false) => {
                    const normalized = Math.max(accountedBytes, Number(received) || 0);
                    const delta = normalized - accountedBytes;
                    if (delta > 0) {
                        totalDownloadedBytes += delta;
                        accountedBytes = normalized;
                    }
                    if (normalized > accountedTotal) {
                        roundTotalBytes += normalized - accountedTotal;
                        accountedTotal = normalized;
                    }
                    totalDownloadedBytes = Math.min(totalDownloadedBytes, roundTotalBytes);

                    if (progressUI && (force || delta > 0)) {
                        progressUI.updateProgress(
                            task.remote,
                            normalized,
                            fileTotal,
                            totalDownloadedBytes,
                            unknownSizeCount > 0 ? 0 : roundTotalBytes,
                            completedFileCount,
                            tasks.length
                        );
                    }
                };

                try {
                    result = await updater.downloader.download(task, (rec, tot) => {
                        if (onProgress) onProgress(task.remote, rec, tot);
                        reportProgress(rec, task.size || tot || 0, true);
                    }, updater.state);

                    if (result.success) {
                        const actualSize = result.size || task.size || accountedBytes;
                        roundTotalBytes = Math.max(0, roundTotalBytes + actualSize - accountedTotal);
                        accountedTotal = actualSize;
                        if (!(task.size > 0)) unknownSizeCount = Math.max(0, unknownSizeCount - 1);
                        completedFileCount++;
                        reportProgress(actualSize, actualSize, true);
                    } else if (!silent) {
                        console.warn(`[快速下载] 失败: ${task.remote} - ${result.error}`);
                    }
                    return result;
                } catch (error) {
                    console.error(`[快速下载] ${task.remote} 异常:`, error);
                    result = { success: false, error: String(error?.message || error), errorType: 'network' };
                    try {
                        await updater.state.updateFile(task.remote, 'failed', result.error, result.errorType, 0, true);
                    } catch (stateError) {
                        console.error(`[快速下载] ${task.remote} 保存失败状态异常:`, stateError);
                    }
                    return result;
                } finally {
                    if (progressUI) {
                        progressUI.finishFile(
                            task.remote,
                            result?.success ? (result.size || task.size || accountedBytes) : (task.size || accountedBytes),
                            !!result?.success
                        );
                    }
                }
            });

            if (progressUI) {
                await progressUI.drain();
                progressUI.close();
            }

            const failedTasks = updater.state.getFailed();
            if (failedTasks.length) {
                const summary = failedTasks.reduce((acc, file) => {
                    const key = file.errorType || 'unknown';
                    acc[key] = (acc[key] || 0) + 1;
                    return acc;
                }, {});
                if (!silent) {
                    const parts = Object.entries(summary).map(([type, count]) => `${type}:${count}`).join('，');
                    game.print(`[快速下载] ${failedTasks.length} 个文件下载失败（${parts}）`);
                }
                return { success: false, tasks, failed: failedTasks, summary };
            }

            await updater.applyDownloadedFiles();
            await updater.cleanup();

            if (!silent) game.print('[快速下载] 完成');
            return { success: true, tasks, stats: updater.state?.data?.stats };
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


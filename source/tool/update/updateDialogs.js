import { dialogManager } from '../ui/dialogManager.js';
import { UPDATE_CONFIG as CONFIG } from './config.js';
import { updateUtils as utils } from './utils.js';
import { updateEnvironment as Environment } from './repository.js';

// 将更新内容中的轻量 HTML 转为对话框可显示的纯文本（对话框使用 textContent，HTML 会被转义）
function plainText(html) {
	return String(html ?? '')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/li>/gi, '\n')
		.replace(/<li[^>]*>/gi, '')
		.replace(/\{\{poptip:([^}]+)\}\}/g, (_, token) => {
			const [arg, label] = token.split('|');
			return label || String(arg).replace(/^[a-z0-9_]+/i, '') || arg;
		})
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/gi, ' ')
		.replace(/&gt;/gi, '>')
		.replace(/&lt;/gi, '<')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/g, "'")
		.replace(/&amp;/gi, '&')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

// ==================== UI 管理器 ====================
class UIManager {
    constructor() {
        this.dialog = dialogManager;
        this.env = Environment.getEnvironmentType();
    }

    async showMainMenu(resumeInfo, hasToken) {
        const buttons = ['检查更新'];
        if (resumeInfo.canResume) buttons.push(resumeInfo.hasPendingApply ? '📦 继续应用已下载文件' : '⏸️ 继续上次更新');
        if (resumeInfo.hasFailures) buttons.push('🔄 仅重试失败文件');
        buttons.push('🔑 Token管理', '💾 版本回退', '取消');

        const envText = this.env === 'node'
            ? '🖥️ 当前环境: Node.js（使用本体下载能力）\n'
            : this.env === 'cordova'
                ? '📱 当前环境: Cordova（使用本体移动端下载能力）\n'
                : this.env === 'electron-renderer'
                    ? '🖥️ 当前环境: Electron（使用本体下载能力）\n'
                    : '⚠️ 当前环境: 浏览器（文件接口受限，请谨慎更新）\n';

        const index = await this.dialog.choice(
            `${CONFIG.name} 更新中心`,
            `请选择操作：\n\n` +
            envText +
            `${resumeInfo.hasPendingApply ? '📦 发现已下载但尚未应用的更新文件\n' : ''}` +
            `${resumeInfo.canResume && !resumeInfo.hasPendingApply ? '⏸️ 发现未完成的下载任务\n' : ''}` +
            `${resumeInfo.hasFailures ? '⚠️ 存在上次下载失败的文件\n' : ''}` +
            `${!hasToken.github && !hasToken.gitee && this.env === 'browser' ? '💡 提示: 浏览器环境可能更容易失败\n' : ''}`,
            buttons
        );

        const choice = buttons[index];
        if (choice === '取消' || !choice) return null;
        if (choice.includes('继续上次') || choice.includes('继续应用已下载文件')) return 'resume';
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

        const result = await this.dialog.filesManager(
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

        let modeMessage =
            '自动选择：代码整包校验后更新；媒体按 MD5 比对，未改动的媒体跳过下载（省流量）\n' +
            '仅代码：只更新代码文件，媒体文件完全不动\n' +
            '完整覆写：代码 + 全部媒体无条件覆盖（适合首次安装/修复损坏）';
        let modeButtons = ['自动选择', '仅代码', '完整覆写'];

        if (hasFailed) {
            modeMessage = '⚠️ 发现上次有失败的下载\n\n仅重试失败：只下载上次失败的文件\n' + modeMessage;
            modeButtons.unshift('仅重试失败文件');
        }

        modeButtons.push('取消');

        const modeIndex = await this.dialog.choice('选择更新模式', modeMessage, modeButtons);
        if (modeIndex === -1) return null;

        let mode = 'auto';
        if (hasFailed && modeIndex === 0) {
            mode = 'retry_failed';
        } else {
            const offset = hasFailed ? 1 : 0;
            mode = modeIndex === offset ? 'auto' : modeIndex === offset + 1 ? 'code' : 'full';
        }

        return { platform: selectedPlatform, mode };
    }

    // 计算下载进度
    async createDownloadProgress(title, totalBytes, totalFiles, mode) {
        const controller = await this.dialog.complexLoading(
            title,
            mode === 'retry_failed' ? '正在重试失败的文件...' : '准备下载...',
            {
                width: 'min(520px, 92vw)',
                minHeight: '280px',
                indeterminate: false,
                initialStatus: '连接中...',
                initialDetail: totalBytes > 0 ? `共 ${utils.parseSize(totalBytes)} (${totalFiles} 个文件)` : `共 ${totalFiles} 个文件`
            }
        );

        let startTime = Date.now();
        let lastUpdate = Date.now();
        let downloadedBytes = 0;
        const useFileCountMode = totalBytes === 0;

        return {
            setFile: (name, size) => {
                controller.setDetail(`${name} (${useFileCountMode ? '计算中...' : utils.parseSize(size)})`);
            },

            // 基于实际下载字节或文件数的进度计算
            updateProgress: (fileReceived, fileTotal, totalReceived, totalSize, currentFileIndex, totalFilesCount) => {
                const now = Date.now();
                const elapsed = (now - startTime) / 1000;

                let totalPercent;
                let status;
                let detail;

                if (useFileCountMode) {
                    // 按文件数量计算进度
                    totalPercent = Math.min(100, Math.round((currentFileIndex / totalFilesCount) * 100));

                    const deltaTime = (now - lastUpdate) / 1000;
                    if (deltaTime >= 0.5) {
                        lastUpdate = now;
                    }

                    const remainingFiles = totalFilesCount - currentFileIndex;
                    const avgTimePerFile = elapsed > 0 && currentFileIndex > 0 ? elapsed / currentFileIndex : 0;
                    const eta = avgTimePerFile > 0 ? remainingFiles * avgTimePerFile : 0;

                    status = `文件 ${currentFileIndex}/${totalFilesCount}` + (eta > 0 ? ` · 剩余 ${utils.formatTime(eta)}` : '');
                    detail = `按文件计数模式 · 当前文件 ${fileTotal > 0 ? Math.round((fileReceived / fileTotal) * 100) : 0}%`;
                } else {
                    // 按字节计算进度
                    totalPercent = totalSize > 0
                        ? Math.min(100, Math.round((totalReceived / totalSize) * 100))
                        : 0;

                    // 当前文件进度
                    const filePercent = fileTotal > 0 ? Math.round((fileReceived / fileTotal) * 100) : 0;

                    // 计算速度
                    const deltaTime = (now - lastUpdate) / 1000;
                    const deltaBytes = totalReceived - downloadedBytes;
                    const speed = deltaTime > 0 ? deltaBytes / deltaTime : 0;

                    if (deltaTime >= 0.5) {
                        downloadedBytes = totalReceived;
                        lastUpdate = now;
                    }

                    const remainingBytes = totalSize - totalReceived;
                    const eta = speed > 0 ? remainingBytes / speed : 0;

                    status = speed > 0
                        ? `${utils.parseSize(speed)}/s · 剩余 ${utils.formatTime(eta)} · 文件 ${currentFileIndex}/${totalFilesCount}`
                        : `文件 ${currentFileIndex}/${totalFilesCount}`;

                    detail = `${utils.parseSize(totalReceived)}/${utils.parseSize(totalSize)} · 当前文件 ${filePercent}%`;
                }

                controller.updateProgress({
                    percent: totalPercent,
                    status: status,
                    detail: detail
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

        // 分析失败原因
        const corsErrors = failedFiles.filter(f => f.errorType === 'cors');
        const tokenErrors = failedFiles.filter(f => f.errorType === 'token');
        const networkErrors = failedFiles.filter(f => f.errorType === 'network');
        const diskErrors = failedFiles.filter(f => f.errorType === 'disk');
        const notFoundErrors = failedFiles.filter(f => f.errorType === 'not_found');

        let message = `⏱️ 耗时: ${elapsed}秒\n` +
            `✅ 成功: ${stats.success} 个文件 (${totalSize})\n`;

        if (stats.skipped > 0) message += `⏭️ 跳过: ${stats.skipped} 个（未改动）\n`;
        if (isPartialSuccess) message += `❌ 失败: ${stats.failed} 个文件\n\n`;

        // 针对性提示
        if (corsErrors.length > 0 && this.env === 'browser') {
            message += `⚠️ ${corsErrors.length} 个文件因浏览器网络限制失败\n` +
                `💡 建议：改用客户端环境继续更新\n\n`;
        } else if (tokenErrors.length > 0) {
            message += `🔑 ${tokenErrors.length} 个文件因 Token 无效失败\n` +
                `💡 建议：在 Token 管理中重新配置\n\n`;
        } else if (networkErrors.length > 0) {
            message += `🌐 ${networkErrors.length} 个文件因网络超时或连接中断失败\n` +
                `💡 建议：检查网络连接后使用“继续更新”或“仅重试失败文件”\n\n`;
        } else if (diskErrors.length > 0) {
            message += `💾 ${diskErrors.length} 个文件因磁盘错误失败（空间不足或无权限）\n` +
                `💡 建议：确认存储空间和写入权限后再继续\n\n`;
        } else if (notFoundErrors.length > 0) {
            message += `🧩 ${notFoundErrors.length} 个文件在更新源中未找到\n` +
                `💡 建议：检查分支/版本配置，或切换更新源后重试\n\n`;
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

    // 自选更新版本：单选列表，返回选中的版本对象或 null
    async showVersionSelect(versions) {
        let selected = 0;

        return await this.dialog.createBaseDialog({
            title: '选择更新版本',
            message: null,
            dialogOptions: {
                width: 'min(560px, 92vw)',
                maxHeight: '85vh'
            },
            buildContent: (dialog) => {
                const msgEl = document.createElement('div');
                msgEl.className = 'lit-ui-content lit-ui-message';
                msgEl.style.marginBottom = '10px';
                msgEl.textContent = versions.some(v => !v.compatible)
                    ? '没有与当前无名杀版本匹配的版本，以下版本可能不兼容：'
                    : '当前无名杀版本可选以下更新版本：';
                dialog.appendChild(msgEl);

                const list = document.createElement('div');
                list.className = 'lit-ui-content lit-ui-scrollable lit-ui-list';
                list.style.maxHeight = '360px';

                const highlight = (el, on) => {
                    el.style.background = on ? '#e8f4ff' : '';
                };

                versions.forEach((v, i) => {
                    const item = document.createElement('div');
                    item.className = 'lit-ui-list-item';
                    item.style.cursor = 'pointer';

                    const text = document.createElement('span');
                    text.className = 'lit-ui-list-text';
                    text.textContent = `${v.extensionVersion}${v.compatible ? '' : '（不兼容）'} — ${v.description || ''}`;
                    text.style.flex = '1';
                    item.appendChild(text);

                    if (i === 0) highlight(item, true);
                    item.addEventListener('click', () => {
                        selected = i;
                        list.querySelectorAll('.lit-ui-list-item').forEach(el => highlight(el, false));
                        highlight(item, true);
                    });
                    list.appendChild(item);
                });

                dialog.appendChild(list);
            },
            defaultResult: null,
            buttons: [
                { text: '取消', result: null },
                {
                    text: '使用此版本更新',
                    isPrimary: true,
                    result: () => versions[selected]
                }
            ]
        });
    }

    async confirmStart(info) {
        const { version, description, highlights, branch, platform, mode, fileCount, skipCount, totalSize, envType } = info;

        const modeText = mode === 'auto' ? '自动选择（代码整包 + 媒体按需）'
            : mode === 'code' ? '仅代码（媒体不动）'
            : mode === 'retry_failed' ? '失败重试'
            : '完整覆写（全部覆盖）';
        const platformText = platform === 'gitee' ? 'Gitee（国内）' : 'GitHub（国际）';
        const envText = envType === 'node'
            ? 'Node.js 本体下载'
            : envType === 'cordova'
                ? 'Cordova 本体下载'
                : envType === 'electron-renderer'
                    ? 'Electron 本体下载'
                    : '浏览器文件接口';

        let message = `📋 更新详情确认\n\n`;
        if (version) message += `目标版本: ${version}\n`;
        message += `版本分支: ${branch}\n` +
            `更新平台: ${platformText}\n` +
            `运行环境: ${envText}\n` +
            `更新模式: ${modeText}\n`;
        if (info.zipSize) message += `代码包: ${utils.parseSize(info.zipSize)}（整包校验后原子更新）\n`;
        message += `文件总数: ${fileCount}个`;

        if (skipCount > 0) message += `（将跳过${skipCount}个未改动的媒体文件）`;
        message += `\n预估大小: ${totalSize || '未知'}\n\n` +
            `💾 自动备份: 更新前将创建完整备份\n` +
            `🔄 断点续传: 支持中断后恢复下载`;

        if (Array.isArray(highlights) && highlights.length > 0) {
            message += `\n\n—— 本次更新内容 ——\n` +
                highlights.map(h => `・ ${plainText(h)}`).join('\n');
        }

        if (envType === 'browser' && platform === 'gitee') {
            message += `\n\n⚠️ 注意：浏览器环境访问 Gitee 可能受限，如遇失败请改用客户端或切换更新源`;
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

export { UIManager as UpdateDialogs };

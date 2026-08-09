import { game } from '../../../../../noname.js';
import { UPDATE_CONFIG as CONFIG } from './config.js';
import { updateLogger } from './logger.js';

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

    async createBackup(onProgress = null) {
        const backupDir = `${this.filesDir}/backup_${Date.now()}`;
        try {
            const dirExists = await game.promises.checkDir(this.targetDir);
            if (dirExists === 1) {
                game.print(`[备份] 创建备份: ${backupDir}`);
                await this.copyDirectoryRecursive(this.targetDir, backupDir, {
                    skipDirs: new Set(['_temp_downloading', CONFIG.files.stagingDir]),
                    skipFiles: new Set([CONFIG.files.state]),
                    onProgress
                });
                await this.cleanupOldBackups(CONFIG.limits.backupCount);
                return { success: true, path: backupDir };
            }
            return { success: false, error: '目标目录不存在' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async rollbackToBackup(backup, onProgress = null) {
        const tempBackup = `${this.filesDir}/rollback_temp_${Date.now()}`;

        try {
            const exists = await game.promises.checkDir(this.targetDir);
            if (exists === 1) {
                if (typeof onProgress === 'function') onProgress('正在备份当前版本，防止回滚失败...');
                await this.copyDirectoryRecursive(this.targetDir, tempBackup, { onProgress });
            }

            if (typeof onProgress === 'function') onProgress('正在移除当前版本...');
            await game.promises.removeDir(this.targetDir);
            if (typeof onProgress === 'function') onProgress('正在恢复备份文件...');
            await this.copyDirectoryRecursive(backup.path, this.targetDir, { onProgress });

            try {
                if (typeof onProgress === 'function') onProgress('正在清理临时文件...');
                await game.promises.removeDir(tempBackup);
            } catch (e) { }

            return { success: true };
        } catch (error) {
            // 回滚失败，恢复原状
            try {
                if (typeof onProgress === 'function') onProgress('回滚失败，正在恢复原状...');
                await game.promises.removeDir(this.targetDir);
                await this.copyDirectoryRecursive(tempBackup, this.targetDir, { onProgress });
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
                updateLogger.info('备份', `删除旧备份: ${backup.name}`);
            } catch (e) {
                updateLogger.warn('备份', `删除旧备份失败: ${backup.name} ${String(e?.message || e)}`);
            }
        }
    }

    async copyDirectoryRecursive(src, dest, options = {}) {
        const { skipDirs = new Set(), skipFiles = new Set(), onProgress = null } = options;
        const [folders, files] = await game.promises.getFileList(src);
        await game.promises.createDir(dest);

        for (const file of files) {
            if (skipFiles.has(file)) continue;
            if (typeof onProgress === 'function') onProgress(`正在复制 ${src}/${file}`);
            const content = await game.promises.readFile(`${src}/${file}`);
            await game.promises.writeFile(content, dest, file);
        }

        for (const folder of folders) {
            if (skipDirs.has(folder)) continue;
            await this.copyDirectoryRecursive(`${src}/${folder}`, `${dest}/${folder}`, options);
        }

        // 兼容旧版本：getFileList 会过滤 `_` 开头文件，备份/回滚会丢旧版的 `_meta.js` 等。
        // 源目录自带的 Directory.json 记录了完整文件清单，据此把 `_` 文件显式复制过去。
        await this.copyLegacyUnderscore(src, dest, onProgress);
    }

    // 兼容旧版本：显式复制源目录清单中 `_` 开头的文件（getFileList 看不到它们）
    async copyLegacyUnderscore(src, dest, onProgress = null) {
        if (await game.promises.checkFile(`${src}/Directory.json`) !== 1) return;
        let fileList;
        try {
            fileList = Object.keys(JSON.parse(await game.promises.readFileAsText(`${src}/Directory.json`)));
        } catch (e) {
            return;
        }
        for (const rel of fileList) {
            const name = rel.split('/').pop();
            if (!name || !name.startsWith('_')) continue;
            if (await game.promises.checkFile(`${src}/${rel}`) !== 1) continue;
            const content = await game.promises.readFile(`${src}/${rel}`);
            const dir = rel.includes('/') ? `${dest}/${rel.slice(0, rel.lastIndexOf('/'))}` : dest;
            await game.promises.ensureDirectory(dir);
            await game.promises.writeFile(content, dir, name);
            if (typeof onProgress === 'function') onProgress(`正在复制 ${rel}`);
            updateLogger.info('备份', `兼容旧版复制 ${rel}`);
        }
    }
}

export { BackupManager };

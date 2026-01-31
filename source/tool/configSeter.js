import { lib, game, ui, get, ai, _status } from '../../../../noname.js';
import { Lit_Dialog } from './extraUI.js';
import basic from './basic.js'

/**
 * 处理配置的加载、备份、恢复等操作
 * 公开接口: getAvailableConfigFiles, decodeBackupToJson, encodeJsonToNewConfig, loadAndApplyConfig, backupCurrentConfig, applyFromBackupFile, applyConfigData
 */
const ConfigService = (() => {
    const _applyToIndexedDB = async (configData) => {
        const { config = {}, data = {} } = configData;
        Object.assign(lib.config, config);

        const promises = [];
        for (const [key, value] of Object.entries(config)) {
            promises.push(_putDBAsync('config', key, value));
        }
        for (const [key, value] of Object.entries(data)) {
            promises.push(_putDBAsync('data', key, value));
        }

        await Promise.all(promises);
    };

    const _applyToLocalStorage = async (configData) => {
        const { config = {} } = configData;
        const vitalKeys = _getVitalKeys();
        const vitalValues = _backupVitalValues(vitalKeys);
        _clearOldConfigs();
        _restoreVitalValues(vitalValues);
        _writeNewConfigs(config);
    };

    const _getVitalKeys = () => {
        const candidates = [
            'noname_inited',
            `${lib.configprefix}key`,
            `${lib.configprefix}version`,
            `${lib.configprefix}mode`,
            `${lib.configprefix}name`,
            `${lib.configprefix}avatar`
        ];
        return candidates.filter(key => localStorage.getItem(key) !== null);
    };

    const _backupVitalValues = (vitalKeys) => {
        const backup = {};
        vitalKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value !== null) backup[key] = value;
        });
        return backup;
    };

    const _clearOldConfigs = () => {
        const prefix = lib.configprefix;
        const toRemove = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                toRemove.push(key);
            }
        }

        toRemove.forEach(key => localStorage.removeItem(key));
    };

    const _restoreVitalValues = (vitalValues) => {
        Object.entries(vitalValues).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                try {
                    localStorage.setItem(key, value);
                } catch (e) {
                    console.warn(`恢复关键配置项 ${key} 失败:`, e);
                }
            }
        });
    };

    const _writeNewConfigs = (config) => {
        Object.entries(config).forEach(([key, value]) => {
            try {
                const prefixedKey = key.startsWith(lib.configprefix)
                    ? key
                    : `${lib.configprefix}${key}`;
                localStorage.setItem(prefixedKey, value);
            } catch (e) {
                console.error(`写入配置 ${key} 失败:`, e);
            }
        });
    };

    const _putDBAsync = async (type, key, value) => {
        return new Promise((resolve, reject) => {
            game.putDB(type, key, value, (success) => {
                if (success) {
                    resolve();
                } else {
                    reject(new Error(`保存 ${type}.${key} 失败`));
                }
            });
        });
    };

    const _getCurrentConfigData = async () => {
        return new Promise((resolve, reject) => {
            try {
                if (!lib.db) {
                    const data = {};
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith(lib.configprefix)) {
                            data[key] = localStorage.getItem(key);
                        }
                    }
                    resolve({ config: data });
                } else {
                    game.getDB("config", null, (configData) => {
                        game.getDB("data", null, (dataData) => {
                            resolve({
                                config: configData || {},
                                data: dataData || {}
                            });
                        });
                    });
                }
            } catch (error) {
                reject(new Error(`获取当前配置失败：${error.message}`));
            }
        });
    };

    return {
        async getAvailableConfigFiles() {
            const backupDir = basic.files;
            let fileList = [];

            try {
                const [folders, files] = await game.promises.getFileList(backupDir);
                fileList = files || [];
            } catch (error) {
                console.warn('读取文件列表失败:', error);
                fileList = [];
            }

            const configFiles = fileList
                .filter(f => f && typeof f === 'string' && (f.endsWith('.nncfg') || f.endsWith('.json')))
                .sort((a, b) => b.localeCompare(a));

            const items = configFiles.map(f => {
                const match = f.match(/^lit_([^_]+)_(.+)\.(nncfg|json)$/);
                let displayName;
                let type = '';

                if (match) {
                    type = match[1];
                    const timestamp = match[2];
                    const formattedTime = timestamp.replace(/_(\d{2})-(\d{2})-(\d{2})$/, ' $1:$2:$3');

                    const typeMap = {
                        backup: '备份于',
                        fixed: '修改于',
                        editing: '编辑中'
                    };
                    displayName = `${typeMap[type] || type + '于'} ${formattedTime}`;
                } else {
                    displayName = f.replace(/\.(nncfg|json)$/, '');
                }

                return {
                    value: f,
                    text: displayName,
                    type: type,
                    fullPath: `${backupDir}/${f}`
                };
            });

            return { files: configFiles, items, backupDir };
        },

        async decodeBackupToJson(backupFilePath) {
            try {
                const encodedData = await game.promises.readFileAsText(backupFilePath);
                if (!encodedData) {
                    throw new Error('备份文件为空');
                }

                const decodedData = lib.init.decode(encodedData);
                if (!decodedData) {
                    throw new Error('备份文件解码失败，可能已损坏');
                }

                const timestamp = new Date().toLocaleString('sv-SE').replace(' ', '_').replace(/:/g, '-');
                const dir = backupFilePath.substring(0, backupFilePath.lastIndexOf('/'));
                const jsonFileName = `lit_editing_${timestamp}.json`;

                await game.promises.writeFile(decodedData, dir, jsonFileName);

                return `${dir}/${jsonFileName}`;
            } catch (error) {
                throw new Error(`解码备份文件失败：${error.message}`);
            }
        },

        async encodeJsonToNewConfig(jsonFilePath) {
            try {
                const jsonContent = await game.promises.readFileAsText(jsonFilePath);
                if (!jsonContent) {
                    throw new Error('JSON文件为空或无法读取');
                }

                try {
                    JSON.parse(jsonContent);
                } catch (jsonError) {
                    throw new Error(`JSON格式错误：${jsonError.message}`);
                }

                const encodedData = lib.init.encode(jsonContent);
                if (!encodedData) {
                    throw new Error('JSON文件编码失败');
                }

                const timestamp = new Date().toLocaleString('sv-SE').replace(' ', '_').replace(/:/g, '-');
                const newFileName = `lit_fixed_${timestamp}.nncfg`;
                const dir = jsonFilePath.substring(0, jsonFilePath.lastIndexOf('/'));

                await game.promises.writeFile(encodedData, dir, newFileName);

                return `${dir}/${newFileName}`;
            } catch (error) {
                throw new Error(`编码JSON文件失败：${error.message}`);
            }
        },

        async loadAndApplyConfig(filename) {
            const filePath = `${basic.path}/style/nncfg/${filename}`;

            try {
                await game.promises.checkFile(filePath);
            } catch (error) {
                throw new Error(`配置文件不存在：${filename}`);
            }

            const encodedData = await game.promises.readFileAsText(filePath);
            if (!encodedData || encodedData.trim() === '') {
                throw new Error('配置文件为空或无法读取');
            }

            const decodedData = lib.init.decode(encodedData);
            if (!decodedData) {
                throw new Error('配置文件解码失败，可能已损坏');
            }

            try {
                let configData = JSON.parse(decodedData);
                if (!configData || typeof configData !== 'object') {
                    throw new Error('配置文件格式错误');
                }
                await this.applyConfigData(configData);
            } catch (parseError) {
                throw new Error(`配置文件解析失败：${parseError.message}`);
            }
        },

        async backupCurrentConfig() {
            const backupDir = basic.files;

            try {
                await game.promises.ensureDirectory([backupDir]);
            } catch (error) {
                throw new Error(`创建备份目录失败：${error.message}`);
            }

            const timestamp = new Date().toLocaleString('sv-SE').replace(' ', '_').replace(/:/g, '-');
            const backupName = `lit_backup_${timestamp}.nncfg`;
            const configData = await _getCurrentConfigData();
            const content = lib.init.encode(JSON.stringify(configData, null, 2));

            try {
                await game.promises.writeFile(content, backupDir, backupName);
                console.log('备份成功:', backupName, '大小:', content.length, '字节');
                return backupName;
            } catch (error) {
                throw new Error(`保存备份文件失败：${error.message}`);
            }
        },

        async applyFromBackupFile(filePath) {
            try {
                const encodedData = await game.promises.readFileAsText(filePath);
                if (!encodedData) {
                    throw new Error('备份文件为空');
                }

                const decodedData = lib.init.decode(encodedData);
                if (!decodedData) {
                    throw new Error('备份文件解码失败，可能已损坏');
                }

                const configData = JSON.parse(decodedData);
                await this.applyConfigData(configData);
            } catch (error) {
                throw new Error(`恢复备份失败：${error.message}`);
            }
        },

        async applyConfigData(configData) {
            console.log('开始应用配置数据:', configData);
            if (lib.db) {
                await _applyToIndexedDB(configData);
            } else {
                await _applyToLocalStorage(configData);
            }
            console.log('配置应用完成');
        }
    };
})();

/**
 * 管理用户交互流程，协调其他模块
 * 公开接口: main
 */
const ConfigFlow = (() => {
    let _reloadTimer = null;
    let _isReloading = false;

    const _applyRecommendation = async (platform) => {
        const isWin = platform === 0;
        const filename = isWin ? 'win11.0.nncfg' : 'android_wide11.0.nncfg';
        const displayName = isWin ? 'Windows端推荐配置' : 'Android端推荐配置';
        const description = isWin
            ? '该配置针对桌面端优化，包含：\n• 角色候选个数调整\n• 修改样式展示细节\n• 开启/关闭部分武将包、卡包和其他扩展'
            : '该配置针对移动端优化，包含：\n• 角色候选个数调整\n• 滑动手势调出菜单\n• 界面布局适配宽屏\n• 保持屏幕常亮\n• 开启/关闭部分武将包、卡包和其他扩展';

        const confirmAction = await Lit_Dialog.choice(
            '确认应用',
            `即将应用【${displayName}】\n\n${description}\n\n是否备份当前配置？`,
            ['备份并应用', '直接应用', '取消']
        );

        if (confirmAction === 2 || confirmAction === undefined) return;

        let backupName = null;
        if (confirmAction === 0) {
            try {
                backupName = await ConfigService.backupCurrentConfig();
                if (backupName) {
                    await Lit_Dialog.alert("✅ 配置已备份！", `备份文件名：${backupName}\n保存位置：资源根目录/files/lit`);
                }
            } catch (backupError) {
                const continueAnyway = await Lit_Dialog.confirm(
                    '备份失败',
                    `备份配置时出错：${backupError.message}\n\n是否继续应用新配置？（建议先手动备份）`,
                    '继续应用',
                    '取消操作'
                );
                if (!continueAnyway) return;
            }
        }

        const finalConfirm = await Lit_Dialog.confirm(
            '最终确认',
            `确定要应用【${displayName}】吗？\n\n应用后游戏将自动重启。`,
            '确定应用',
            '再考虑一下'
        );

        if (!finalConfirm) return;

        try {
            Lit_Dialog.loading('请稍候', '正在应用配置...');
            await ConfigService.loadAndApplyConfig(filename);
            Lit_Dialog.closeAll();
            await _showSuccessAndReload('配置应用成功！', displayName);
        } catch (applyError) {
            Lit_Dialog.closeAll();

            if (backupName) {
                const restore = await Lit_Dialog.confirm(
                    '应用配置失败',
                    `应用配置时出错：${applyError.message}\n\n检测到有备份文件 ${backupName}，是否恢复备份？`,
                    '恢复备份',
                    '忽略'
                );

                if (restore) {
                    try {
                        await ConfigService.applyFromBackupFile(`${basic.files}/${backupName}`);
                        await Lit_Dialog.alert('✅ 成功', '已恢复备份配置！');
                    } catch (restoreError) {
                        await Lit_Dialog.alert('❌ 恢复备份失败', `错误详情：${restoreError.message}`);
                    }
                }
            } else {
                await Lit_Dialog.alert('❌ 应用配置失败', `${applyError.message}\n\n请检查配置文件是否完整。`);
            }
        }
    };

    const _manageFiles = async () => {
        try {
            const { items, backupDir } = await ConfigService.getAvailableConfigFiles();

            if (items.length === 0) {
                await Lit_Dialog.alert('未找到配置文件', '请先创建备份文件。');
                return;
            }

            const result = await Lit_Dialog.fileManager(
                '配置文件管理',
                `找到 ${items.length} 个配置文件：\n\n请选择文件并点击下方按钮执行操作：`,
                items
            );

            if (!result) return;

            const { action, files } = result;
            const fullPaths = files.map(f => `${backupDir}/${f}`);

            switch (action) {
                case 'delete':
                    await _deleteFiles(fullPaths);
                    break;
                case 'edit':
                    const editResult = await _editBackupConfig(fullPaths[0]);
                    if (editResult === false) {
                        await _manageFiles();
                    }
                    break;
                case 'apply':
                    await _applyConfigFile(fullPaths[0]);
                    break;
            }
        } catch (error) {
            Lit_Dialog.closeAll();
            await Lit_Dialog.alert('❌ 操作失败', `错误详情：${error.message}`);
        }
    };

    const _editBackupConfig = async (filePath) => {
        if (!filePath) return;

        let jsonFilePath = null;
        let jsonContent = '';
        let isNewEdit = false;
        let editState = {
            selectionStart: 0,
            selectionEnd: 0,
            scrollTop: 0
        };

        while (true) {
            try {
                if (!jsonFilePath) {
                    Lit_Dialog.loading('请稍候', '正在读取文件内容...');

                    try {
                        if (filePath.endsWith('.json')) {
                            jsonFilePath = filePath;
                            jsonContent = await game.promises.readFileAsText(filePath);
                            isNewEdit = !filePath.includes('lit_editing_');
                        } else {
                            jsonFilePath = await ConfigService.decodeBackupToJson(filePath);
                            jsonContent = await game.promises.readFileAsText(jsonFilePath);
                            isNewEdit = true;
                        }
                    } finally {
                        Lit_Dialog.closeAll();
                    }

                    if (!jsonContent) {
                        await Lit_Dialog.alert('❌ 错误', '文件内容为空或无法读取');
                        if (isNewEdit) {
                            await game.promises.removeFile(jsonFilePath).catch(() => { });
                        }
                        return false;
                    }
                }

                const originalFileName = filePath.split('/').pop();

                const editResult = await Lit_Dialog.textEditor(
                    '配置文件编辑器',
                    `正在编辑：${originalFileName}\n编辑提示：\n• 请勿修改JSON的整体结构\n• 确保键名和格式正确\n• 语法错误将导致编码失败\n• 闪退后可在文件管理器中找到临时文件继续编辑`,
                    jsonContent,
                    {
                        deleteTempFile: true,
                        selectionStart: editState.selectionStart,
                        selectionEnd: editState.selectionEnd,
                        scrollTop: editState.scrollTop
                    }
                );

                if (!editResult) {
                    if (isNewEdit) {
                        await game.promises.removeFile(jsonFilePath).catch(() => { });
                    }
                    return false;
                }

                editState = {
                    selectionStart: editResult.selectionStart,
                    selectionEnd: editResult.selectionEnd,
                    scrollTop: document.querySelector('.lit-ui-textarea')?.scrollTop || 0
                };

                if (editResult.action === 'save') {
                    const dir = jsonFilePath.substring(0, jsonFilePath.lastIndexOf('/'));
                    const filename = jsonFilePath.split('/').pop();
                    await game.promises.writeFile(editResult.content, dir, filename);

                    await Lit_Dialog.alert(
                        '✅ 暂存成功！',
                        `文件已暂存：${filename}\n您可以稍后继续编辑此文件。`
                    );
                    return false;
                }

                try {
                    JSON.parse(editResult.content);
                } catch (jsonError) {
                    await Lit_Dialog.alert(
                        `❌ JSON格式验证失败\n\n错误位置：${jsonError.message}\n\n请修正语法错误后再试。`,
                        '错误提示'
                    );

                    const dir = jsonFilePath.substring(0, jsonFilePath.lastIndexOf('/'));
                    const filename = jsonFilePath.split('/').pop();
                    await game.promises.writeFile(editResult.content, dir, filename);

                    jsonContent = editResult.content;
                    continue;
                }

                const dir = jsonFilePath.substring(0, jsonFilePath.lastIndexOf('/'));
                const filename = jsonFilePath.split('/').pop();
                await game.promises.writeFile(editResult.content, dir, filename);
                jsonContent = editResult.content;

                let newFilePath;
                try {
                    newFilePath = await ConfigService.encodeJsonToNewConfig(jsonFilePath);
                } catch (encodeError) {
                    await Lit_Dialog.alert(
                        '❌ 编码失败', `错误详情：${encodeError.message}\n\n请检查JSON内容格式，修正后重试。`
                    );
                    continue;
                }

                const newFileName = newFilePath.split('/').pop();

                if (editResult.deleteTempFile) {
                    try {
                        await game.promises.removeFile(jsonFilePath).catch(() => { });
                    } catch (cleanupError) {
                        console.warn('清理临时文件失败:', cleanupError);
                    }
                }

                await Lit_Dialog.alert(
                    '✅ 编码完成！',
                    `配置文件已成功处理！\n\n新文件：${newFileName}\n保存位置：${basic.files}\n${editResult.deleteTempFile
                        ? '临时JSON文件已自动删除。'
                        : '临时JSON文件已保留，可手动清理。'
                    }`
                );

                return true;

            } catch (error) {
                Lit_Dialog.closeAll();
                await Lit_Dialog.alert(
                    '❌ 编辑配置失败', `错误详情：${error.message}`
                );
                return false;
            }
        }
    };

    const _applyConfigFile = async (filePath) => {
        try {
            Lit_Dialog.loading('请稍候', '正在应用配置...');

            if (filePath.endsWith('.json')) {
                const jsonContent = await game.promises.readFileAsText(filePath);
                const configData = JSON.parse(jsonContent);
                await ConfigService.applyConfigData(configData);
            } else {
                await ConfigService.applyFromBackupFile(filePath);
            }

            Lit_Dialog.closeAll();
            await _showSuccessAndReload('配置应用成功！');
        } catch (error) {
            Lit_Dialog.closeAll();
            await Lit_Dialog.alert(`❌ 应用配置失败：${error.message}`);
        }
    };

    const _deleteFiles = async (filePaths) => {
        const fileNames = filePaths.map(p => p.split('/').pop()).join('\n• ');

        const confirm = await Lit_Dialog.confirm(
            '确认删除',
            `确定要删除以下 ${filePaths.length} 个文件吗？\n\n• ${fileNames}\n\n删除后无法恢复！`,
            '确定删除',
            '取消'
        );

        if (!confirm) return;

        let successCount = 0;
        for (const filePath of filePaths) {
            try {
                await game.promises.removeFile(filePath);
                successCount++;
            } catch (e) {
                console.error(`删除文件失败: ${filePath}`, e);
            }
        }

        await Lit_Dialog.alert(
            `✅ 删除完成`,
            `成功删除 ${successCount}/${filePaths.length} 个文件。`
        );
    };

    const _showSuccessAndReload = async (message, detail = '') => {
        if (_isReloading) return;
        _isReloading = true;

        let countdown = 3;
        const fullMessage = detail
            ? `${message}\n\n${detail}\n\n游戏将在 ${countdown} 秒后自动重启...`
            : `${message}\n\n游戏将在 ${countdown} 秒后自动重启...`;

        Lit_Dialog.showCountdownDialog('操作成功', fullMessage, {
            onConfirm: _executeReload,
            onCancel: () => {
                _isReloading = false;
            },
            countdownTime: countdown
        });
    };

    const _executeReload = () => {
        if (_reloadTimer) {
            clearTimeout(_reloadTimer);
            _reloadTimer = null;
        }
        game.reload();
    };

    return {
        async main() {
            if (_reloadTimer) {
                clearTimeout(_reloadTimer);
                _reloadTimer = null;
            }
            _isReloading = false;

            const mainAction = await Lit_Dialog.choice(
                '配置方案选择',
                '请选择配置方案：\n\n1. Windows端推荐 - 针对桌面端优化的配置\n2. Android端推荐 - 针对移动端优化的配置\n3. 恢复或编辑配置 - 管理备份文件（删除/编辑/应用）\n\n注：应用新配置后会重启游戏',
                ['Windows端推荐', 'Android端推荐', '恢复或编辑配置', '取消']
            );
            switch (mainAction) {
                case 0: case 1:
                    await _applyRecommendation(mainAction);
                    break;
                case 2:
                    await _manageFiles();
                    break;
                case 3: default: return;
            }
        },
    };
})();

// 主API对象
const Lit_configSeter = {
    async showUI() {
        await ConfigFlow.main();
    }
};

// 导出配置服务
export const Lit_CfgSve = ConfigService;
export default Lit_configSeter;
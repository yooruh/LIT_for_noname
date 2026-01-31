import { lib, game, ui, get, ai, _status } from '../../../../noname.js';
import basic from './basic.js'

/**
 * 提供样式隔离的对话框组件
 * 公开接口: loading, complexLoading, alert, confirm, choice, input, fileManager, showCountdownDialog, showDocModal, textEditor, closeAll
 */
const DialogManager = (() => {
    // 私有变量
    let _zIndex = 50000;
    let _cssLoaded = false;
    let _isClosing = false; // 防止重复关闭的标志

    // 私有方法
    const _injectFallbackStyles = () => {
        if (document.getElementById('lit-ui-fallback-styles')) return true;

        const style = document.createElement('style');
        style.id = 'lit-ui-fallback-styles';
        style.textContent = `
            .lit-ui-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: 50000;}
            .lit-ui-dialog { position: relative; left: auto; top: auto; background: white; border-radius: 15px; padding: 25px; box-sizing: border-box; transition: none; color: black; text-shadow: none; display: flex; flex-direction: column; min-width: 320px; max-width: 90vw; max-height: 85vh;}
            .lit-ui-content { font-size: 16px; line-height: 1.6; color: #444; display: block; position: relative; flex-grow: 1; flex-shrink: 1; overflow-y: auto; margin-bottom: 20px; white-space: pre-wrap; height: auto;}
        `;
        document.head.appendChild(style);
        return true;
    };

    const _initCSS = async () => {
        if (_cssLoaded) return;
        try {
            await new Promise((resolve, reject) => {
                lib.init.css(`${basic.path}/style/css`, 'extraUI', () => {
                    _cssLoaded = true;
                    resolve();
                });

                setTimeout(() => {
                    if (!_cssLoaded) {
                        reject(new Error('CSS加载超时'));
                    }
                }, 2000);
            });
        } catch (error) {
            _cssLoaded = _injectFallbackStyles();
        }
    };

    const _createOverlay = () => {
        const overlay = document.createElement('div');
        overlay.className = 'lit-ui-overlay';
        overlay.style.zIndex = `${_zIndex++}`;

        // 阻止移动端的触摸穿透
        overlay.addEventListener('touchend', (e) => {
            e.preventDefault();
        });

        return overlay;
    };

    const _createDialog = (title, message, options = {}) => {
        const dialog = document.createElement('div');
        dialog.className = 'lit-ui-dialog';

        if (!options.titleSize) options.titleSize = '20px';
        if (options.width) dialog.style.width = `${options.width}`;
        if (options.minHeight) dialog.style.minHeight = `${options.minHeight}`;
        if (options.maxHeight) dialog.style.maxHeight = `${options.maxHeight}`;

        if (title) {
            const titleEl = document.createElement('h3');
            titleEl.className = 'lit-ui-title';

            const size = typeof options.titleSize === 'number'
                ? `${options.titleSize}px`
                : options.titleSize;
            titleEl.style.setProperty('font-size', size, 'important');

            if (options.titleCenter) {
                titleEl.style.setProperty('text-align', 'center', 'important');
            }

            titleEl.textContent = title;
            dialog.appendChild(titleEl);
        }

        if (message) {
            const contentEl = document.createElement('div');
            contentEl.className = 'lit-ui-content lit-ui-scrollable';
            contentEl.textContent = message;
            dialog.appendChild(contentEl);
        }

        return dialog;
    };

    const _createButton = (text, options = {}) => {
        const button = document.createElement('button');
        button.className = `lit-ui-button ${options.isPrimary ? 'primary' : 'secondary'}`;
        button.textContent = text;

        if (options.isCancel) button.dataset.cancel = 'true';
        if (options.minWidth) button.style.minWidth = `${options.minWidth}`;

        let clicked = false;
        button.onclick = (e) => {
            e.stopPropagation();
            if (!clicked) {
                clicked = true;
                if (options.onClick) options.onClick();
                setTimeout(() => { clicked = false; }, 500);
            }
        };

        return button;
    };

    const _createButtonRow = (configs) => {
        const row = document.createElement('div');
        row.className = 'lit-ui-button-row';

        configs.forEach(config => {
            const button = _createButton(config.text, {
                isPrimary: config.isPrimary,
                minWidth: config.minWidth,
                isCancel: config.isCancel || config.text === '取消' || config.text === 'Cancel',
                onClick: config.onClick
            });
            row.appendChild(button);
        });

        return row;
    };

    const _safeRemoveOverlay = (overlay) => {
        if (overlay && overlay.parentNode === document.body) {
            document.body.removeChild(overlay);
        }
    };

    const _addDialogEventHandlers = (overlay, closeCallback, options = {}) => {
        const { enableEsc = true, enableBack = true, enableOverlayClick = true } = options;
        const eventHandlers = [];

        if (enableEsc) {
            const handleEscKey = (e) => {
                if (e.key === 'Escape' && !_isClosing) {
                    e.preventDefault(); // 阻止默认行为（如全屏退出）
                    closeCallback();
                }
            };
            document.addEventListener('keydown', handleEscKey);
            eventHandlers.push(() => {
                document.removeEventListener('keydown', handleEscKey);
            });
        }

        if (enableBack) {
            // 检查是否已存在对话框历史记录，防止重复
            const currentState = window.history.state || {};
            if (!currentState.dialogOpen) {
                window.history.pushState({
                    dialogOpen: true,
                    timestamp: Date.now()
                }, '');
            }

            const handlePopState = (event) => {
                // popstate 无法阻止导航，只能响应
                if (overlay.parentNode === document.body && !_isClosing) {
                    closeCallback();
                }
            };

            window.addEventListener('popstate', handlePopState);
            eventHandlers.push(() => {
                window.removeEventListener('popstate', handlePopState);
                // 清理添加的历史记录
                const state = window.history.state || {};
                if (state.dialogOpen || state.modalOpen) {
                    window.history.back();
                }
            });
        }

        if (enableOverlayClick) {
            const onPointer = (e) => {
                if (e.target === overlay && !_isClosing) {
                    e.stopPropagation();
                    e.preventDefault();
                    closeCallback();
                }
            }
            overlay.addEventListener('pointerdown', onPointer);
            eventHandlers.push(() => {
                overlay.removeEventListener('pointerdown', onPointer);
            });
        }

        return () => {
            eventHandlers.forEach(cleanup => cleanup());
        };
    };

    const _createSafeCallback = (callback) => {
        return (...args) => {
            if (_isClosing) return;
            _isClosing = true;
            try {
                return callback(...args);
            } finally {
                // 确保状态锁释放
                setTimeout(() => { _isClosing = false; }, 350);
            }
        };
    };

    // 公开方法
    return {
        async choice(title, message, buttons) {
            await _initCSS();
            return new Promise((resolve) => {
                const overlay = _createOverlay();
                const dialog = _createDialog(title, message);

                // 统一的关闭函数：移除DOM + 清理事件 + resolve
                const closeDialog = (result) => {
                    _safeRemoveOverlay(overlay);
                    if (overlay._cleanup) overlay._cleanup();
                    resolve(result);
                };
                const safeCloseDialog = _createSafeCallback(closeDialog);

                // 按钮配置：点击后关闭对话框并返回索引
                if (buttons.length) {
                    const btnConfigs = buttons.map((text, index) => ({
                        text,
                        isPrimary: index === buttons.length - 1 && text !== '取消' && text !== 'Cancel',
                        onClick: () => safeCloseDialog(index)
                    }));
                    dialog.appendChild(_createButtonRow(btnConfigs));
                }

                overlay.appendChild(dialog);
                document.body.appendChild(overlay);

                // ESC/返回键/遮罩点击：关闭并返回 -1
                const closeHandler = () => safeCloseDialog(-1);
                if (buttons.length) {
                    overlay._cleanup = _addDialogEventHandlers(overlay, closeHandler);
                } else {
                    overlay._cleanup = _addDialogEventHandlers(overlay, closeHandler, {
                        enableEsc: false,
                        enableBack: false,
                        enableOverlayClickClose: false,
                    });
                }
            });
        },

        async complexLoading(title, message, options = {}) {
            await _initCSS();
            return new Promise((resolve) => {
                const overlay = _createOverlay();

                // 创建 dialog，添加特定类名以便样式定制
                const dialog = _createDialog(title, "", {
                    width: options.width || 'min(480px, 90vw)',
                    minHeight: options.minHeight || 'auto'
                });

                // 主消息文本
                const msgEl = document.createElement('div');
                msgEl.className = 'lit-ui-content lit-ui-message';
                msgEl.textContent = message;
                dialog.appendChild(msgEl);

                // 进度信息行（百分比 + 状态）
                const infoRow = document.createElement('div');
                infoRow.className = 'lit-ui-content lit-complex-loading-info';
                const percentEl = document.createElement('span');
                percentEl.className = 'lit-complex-loading-percent';
                percentEl.textContent = '0%';
                const statusEl = document.createElement('span');
                statusEl.className = 'lit-complex-loading-status';
                statusEl.textContent = options.initialStatus || '准备就绪';

                infoRow.appendChild(statusEl);
                infoRow.appendChild(percentEl);
                dialog.appendChild(infoRow);

                // 进度条容器
                const progressContainer = document.createElement('div');
                progressContainer.className = 'lit-complex-loading-bar-container';

                // 确定性进度填充条
                const progressFill = document.createElement('div');
                progressFill.className = 'lit-complex-loading-bar-fill';
                progressFill.style.width = '0%';

                // 不确定进度动画条（无限循环）
                const indeterminateBar = document.createElement('div');
                indeterminateBar.className = 'lit-complex-loading-indeterminate';
                indeterminateBar.style.display = options.indeterminate ? 'block' : 'none';

                progressContainer.appendChild(progressFill);
                progressContainer.appendChild(indeterminateBar);
                dialog.appendChild(progressContainer);

                // 详细信息/文件名显示区域
                const detailEl = document.createElement('div');
                detailEl.className = 'lit-ui-content';
                detailEl.style.display = options.initialDetail ? 'block' : 'none';
                if (options.initialDetail) detailEl.textContent = options.initialDetail;
                dialog.appendChild(detailEl);

                // 操作按钮区域（可选）
                const actionRow = document.createElement('div');
                actionRow.className = 'lit-complex-loading-actions';
                actionRow.style.display = 'none';
                dialog.appendChild(actionRow);

                overlay.appendChild(dialog);
                document.body.appendChild(overlay);

                // 阻止所有关闭方式
                overlay._cleanup = _addDialogEventHandlers(overlay, () => { }, {
                    enableEsc: false,
                    enableBack: false,
                    enableOverlayClick: false,
                });

                // 内部状态
                let currentProgress = 0;
                let isIndeterminate = options.indeterminate || false;

                // 返回控制器对象
                resolve({
                    // 更新主标题下的描述文本
                    updateText: (text) => {
                        msgEl.textContent = text;
                    },

                    // 核心进度更新方法，支持多种调用方式：
                    // updateProgress(50) - 直接设置 50%
                    // updateProgress(30, 100) - 计算为 30%
                    // updateProgress({percent: 50, status: '下载中...', detail: 'file.zip'})
                    updateProgress: (value, total, opts = {}) => {
                        let percent = 0;

                        if (typeof value === 'object') {
                            // 对象参数模式：{percent, status, detail, state}
                            opts = value;
                            percent = opts.percent !== undefined ? opts.percent : currentProgress;
                        } else if (total !== undefined && total > 0) {
                            // 数值对模式：current/total
                            percent = Math.round((value / total) * 100);
                        } else {
                            // 直接百分比模式：0-100
                            percent = Math.round(value);
                        }

                        // 限制在 0-100 范围内
                        percent = Math.max(0, Math.min(100, percent));
                        currentProgress = percent;

                        // 如果不是不确定模式，更新进度条视觉
                        if (!isIndeterminate) {
                            progressFill.style.width = `${percent}%`;
                            percentEl.textContent = `${percent}%`;
                            percentEl.style.display = 'block';
                        } else {
                            percentEl.style.display = 'none';
                        }

                        // 更新状态文本（如"正在下载..."）
                        if (opts.status) {
                            statusEl.textContent = opts.status;
                        }

                        // 更新详细信息（如文件名、速度等）
                        if (opts.detail !== undefined) {
                            detailEl.textContent = opts.detail;
                            detailEl.style.display = opts.detail ? 'block' : 'none';
                        }

                        // 更新进度条颜色状态：'success', 'error', 'warning', 'info'
                        if (opts.state || opts.type) {
                            const state = opts.state || opts.type;
                            // 清除旧状态
                            progressFill.classList.remove('lit-state-success', 'lit-state-error');
                            percentEl.classList.remove('lit-state-success', 'lit-state-error');
                            if (state) {
                                progressFill.classList.add(`lit-state-${state}`);
                                percentEl.classList.add(`lit-state-${state}`);
                            }
                        }
                    },

                    // 切换不确定进度模式（无限循环动画，用于无法计算进度时）
                    setIndeterminate: (enable = true, statusText) => {
                        isIndeterminate = enable;
                        if (enable) {
                            progressFill.style.display = 'none';
                            indeterminateBar.style.display = 'block';
                            percentEl.style.display = 'none';
                            if (statusText) statusEl.textContent = statusText;
                        } else {
                            progressFill.style.display = 'block';
                            indeterminateBar.style.display = 'none';
                            percentEl.style.display = 'block';
                            progressFill.style.width = `${currentProgress}%`;
                            percentEl.textContent = `${currentProgress}%`;
                        }
                    },

                    // 快速完成状态（100% + 绿色）
                    complete: (message, autoCloseDelay = 0) => {
                        this.setIndeterminate(false);
                        currentProgress = 100;
                        progressFill.style.width = '100%';
                        percentEl.textContent = '100%';
                        progressFill.classList.add('lit-state-success');
                        percentEl.classList.add('lit-state-success');
                        if (message) {
                            msgEl.textContent = message;
                            statusEl.textContent = '完成';
                        }
                        if (autoCloseDelay > 0) {
                            setTimeout(() => {
                                _safeRemoveOverlay(overlay);
                                if (overlay._cleanup) overlay._cleanup();
                            }, autoCloseDelay);
                        }
                    },

                    // 错误状态（红色 + 抖动动画）
                    setError: (message, showRetryButton = false, onRetry) => {
                        isIndeterminate = false;
                        progressFill.style.display = 'block';
                        indeterminateBar.style.display = 'none';
                        percentEl.style.visibility = 'visible';

                        progressFill.classList.add('lit-state-error');
                        percentEl.classList.add('lit-state-error');
                        dialog.classList.add('lit-loading-error');

                        if (message) {
                            msgEl.textContent = message;
                            statusEl.textContent = '失败';
                        }

                        // 可选：显示重试按钮
                        if (showRetryButton && onRetry) {
                            actionRow.style.display = 'flex';
                            actionRow.innerHTML = '';
                            const retryBtn = _createButton('重试', {
                                isPrimary: true,
                                onClick: onRetry
                            });
                            actionRow.appendChild(retryBtn);
                        }
                    },

                    // 更新状态文本的快捷方法
                    setStatus: (text) => {
                        statusEl.textContent = text;
                    },

                    // 更新详细信息的快捷方法
                    setDetail: (text) => {
                        detailEl.textContent = text;
                        detailEl.style.display = text ? 'block' : 'none';
                    },

                    // 获取当前进度值
                    getProgress: () => currentProgress,

                    // 关闭对话框
                    close: () => {
                        _safeRemoveOverlay(overlay);
                        if (overlay._cleanup) overlay._cleanup();
                    }
                });
            });
        },

        loading(title, message) {
            return this.choice(title, message, []);
        },

        alert(title, message) {
            return this.choice(title, message, ['确定']);
        },

        confirm(title, message, confirmText = '确定', cancelText = '取消') {
            return new Promise((resolve) => {
                this.choice(title, message, [cancelText, confirmText]).then(index => {
                    resolve(index === 1); // 1 是确认按钮索引
                });
            });
        },

        async input(title, message, initialValue = '', options = {}) {
            await _initCSS();
            return new Promise((resolve) => {
                const overlay = _createOverlay();
                const dialog = _createDialog(title, null, {
                    width: options.width || 'min(500px, 90vw)',
                    minHeight: options.minHeight || 'auto'
                });

                // 添加消息提示
                if (message) {
                    const msgEl = document.createElement('div');
                    msgEl.className = 'lit-ui-content lit-ui-message';
                    msgEl.style.marginBottom = '15px';
                    msgEl.textContent = message;
                    dialog.appendChild(msgEl);
                }

                // 创建输入容器
                const inputContainer = document.createElement('div');
                inputContainer.className = 'lit-ui-input-container';

                let inputEl;
                const rows = options.rows || (options.password ? 1 : 3);

                // 根据配置创建 input 或 textarea
                if (options.password) {
                    inputEl = document.createElement('input');
                    inputEl.type = 'password';
                    inputEl.className = 'lit-ui-input';
                } else if (rows === 1) {
                    inputEl = document.createElement('input');
                    inputEl.type = 'text';
                    inputEl.className = 'lit-ui-input';
                } else {
                    inputEl = document.createElement('textarea');
                    inputEl.className = 'lit-ui-input lit-ui-input-textarea';
                    inputEl.rows = rows;
                    inputEl.style.resize = 'vertical';
                }

                inputEl.value = initialValue;
                if (options.placeholder) {
                    inputEl.placeholder = options.placeholder;
                }

                inputContainer.appendChild(inputEl);
                dialog.appendChild(inputContainer);

                // 统一的关闭函数
                const closeDialog = (result) => {
                    _safeRemoveOverlay(overlay);
                    if (overlay._cleanup) overlay._cleanup();
                    resolve(result);
                };
                const safeCloseDialog = _createSafeCallback(closeDialog);

                // 按钮配置
                dialog.appendChild(_createButtonRow([
                    {
                        text: options.cancelText || '取消',
                        isPrimary: false,
                        isCancel: true,
                        onClick: () => safeCloseDialog(null)
                    },
                    {
                        text: options.confirmText || '确定',
                        isPrimary: true,
                        onClick: () => safeCloseDialog(inputEl.value)
                    }
                ]));

                overlay.appendChild(dialog);
                document.body.appendChild(overlay);

                // ESC/返回键/遮罩点击：取消并返回 null
                const closeHandler = () => safeCloseDialog(null);
                overlay._cleanup = _addDialogEventHandlers(overlay, closeHandler, {
                    enableEsc: true,
                    enableBack: true,
                    enableOverlayClick: options.closeOnOverlay !== false
                });

                // 自动聚焦并定位光标
                setTimeout(() => {
                    inputEl.focus();
                    if (options.selectAll) {
                        inputEl.select();
                    } else {
                        const len = inputEl.value.length;
                        inputEl.setSelectionRange(len, len);
                    }
                }, 100);

                // 单行输入时支持回车键快捷确认
                if (rows === 1 || options.password) {
                    inputEl.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            safeCloseDialog(inputEl.value);
                        }
                    });
                }
            });
        },

        async fileManager(title, message, items) {
            await _initCSS();
            return new Promise((resolve) => {
                const overlay = _createOverlay();
                const dialog = _createDialog(title, null, {
                    width: 'min(600px, 90vw)',
                    maxHeight: '85vh'
                });

                if (message) {
                    const msgEl = document.createElement('div');
                    msgEl.className = 'lit-ui-content lit-ui-message';
                    msgEl.style.marginBottom = '15px';
                    msgEl.textContent = message;
                    dialog.appendChild(msgEl);
                }

                const listContainer = document.createElement('div');
                listContainer.className = 'lit-ui-content lit-ui-scrollable lit-ui-list';
                listContainer.style.maxHeight = '400px';

                const selectedFiles = new Set();

                items.forEach((item, index) => {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'lit-ui-list-item';
                    itemEl.dataset.value = item.value;
                    if (item.type) itemEl.dataset.type = item.type;

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.style.marginRight = '10px';
                    checkbox.style.pointerEvents = 'none';

                    const number = document.createElement('span');
                    number.className = 'lit-ui-list-number';
                    number.textContent = `${index + 1}.`;

                    const textSpan = document.createElement('span');
                    textSpan.className = 'lit-ui-list-text';
                    textSpan.textContent = item.text;
                    textSpan.style.flex = '1';

                    itemEl.appendChild(checkbox);
                    itemEl.appendChild(number);
                    itemEl.appendChild(textSpan);

                    itemEl.addEventListener('click', () => {
                        const isSelected = selectedFiles.has(item.value);
                        if (isSelected) {
                            selectedFiles.delete(item.value);
                            checkbox.checked = false;
                            itemEl.style.background = '';
                        } else {
                            selectedFiles.add(item.value);
                            checkbox.checked = true;
                            itemEl.style.background = '#e8f4ff';
                        }
                        updateButtonStates();
                    });

                    listContainer.appendChild(itemEl);
                });

                dialog.appendChild(listContainer);

                const buttonRow = document.createElement('div');
                buttonRow.className = 'lit-ui-button-row';
                buttonRow.style.marginTop = 'auto';

                // 统一的关闭函数
                const closeDialog = (result) => {
                    _safeRemoveOverlay(overlay);
                    if (overlay._cleanup) overlay._cleanup();
                    resolve(result);
                };
                const safeCloseDialog = _createSafeCallback(closeDialog);

                const deleteBtn = _createButton('删除', {
                    isPrimary: false,
                    onClick: () => safeCloseDialog({ action: 'delete', files: Array.from(selectedFiles) })
                });

                const editBtn = _createButton('编辑', {
                    isPrimary: false,
                    onClick: () => safeCloseDialog({ action: 'edit', files: Array.from(selectedFiles) })
                });

                const applyBtn = _createButton('应用配置', {
                    isPrimary: true,
                    onClick: () => safeCloseDialog({ action: 'apply', files: Array.from(selectedFiles) })
                });

                const cancelBtn = _createButton('取消', {
                    isPrimary: false,
                    isCancel: true,
                    onClick: () => safeCloseDialog(null)
                });

                buttonRow.appendChild(deleteBtn);
                buttonRow.appendChild(editBtn);
                buttonRow.appendChild(applyBtn);
                buttonRow.appendChild(cancelBtn);

                dialog.appendChild(buttonRow);
                overlay.appendChild(dialog);
                document.body.appendChild(overlay);

                function updateButtonStates() {
                    const count = selectedFiles.size;
                    deleteBtn.disabled = count === 0;
                    editBtn.disabled = count !== 1;
                    applyBtn.disabled = count !== 1;

                    [deleteBtn, editBtn, applyBtn].forEach(btn => {
                        btn.style.opacity = btn.disabled ? '0.5' : '1';
                        btn.style.cursor = btn.disabled ? 'not-allowed' : 'pointer';
                    });
                }

                updateButtonStates();
            });
        },

        async showCountdownDialog(title, message, options = {}) {
            await _initCSS();

            const {
                onConfirm = () => { },
                onCancel = () => { },
                countdownTime = 3
            } = options;

            return new Promise((resolve) => {
                const overlay = _createOverlay();
                const dialog = _createDialog(title, message, {
                    width: 'min(500px, 90vw)',
                    minHeight: '250px'
                });

                const countdownEl = document.createElement('div');
                countdownEl.className = "lit-ui-countdown";
                countdownEl.textContent = `${countdownTime} 秒`;

                // 统一的关闭函数
                const closeDialog = (result) => {
                    _safeRemoveOverlay(overlay);
                    if (overlay._cleanup) overlay._cleanup();
                    resolve(result);
                };
                const safeCloseDialog = _createSafeCallback(closeDialog);

                const btnRow = _createButtonRow([
                    {
                        text: '立即重启',
                        isPrimary: true,
                        onClick: () => {
                            clearTimeout(timerId);
                            onConfirm();
                            safeCloseDialog(true);
                        }
                    },
                    {
                        text: '取消重启',
                        isPrimary: false,
                        isCancel: true,
                        onClick: () => {
                            clearTimeout(timerId);
                            onCancel();
                            safeCloseDialog(false);
                        }
                    }
                ]);

                dialog.appendChild(countdownEl);
                dialog.appendChild(btnRow);
                overlay.appendChild(dialog);
                document.body.appendChild(overlay);

                // ESC/返回键/遮罩点击：取消重启
                const closeHandler = () => {
                    clearTimeout(timerId);
                    onCancel();
                    safeCloseDialog(false);
                };

                overlay._cleanup = _addDialogEventHandlers(overlay, closeHandler);

                let countdown = countdownTime;
                let timerId = null;

                const updateCountdown = () => {
                    countdownEl.textContent = `${countdown} 秒`;

                    if (countdown <= 0) {
                        if (!_isClosing) {
                            _isClosing = true;
                            _safeRemoveOverlay(overlay);
                            if (overlay._cleanup) overlay._cleanup();
                            onConfirm();
                            resolve(true);
                        }
                    } else {
                        countdown--;
                        timerId = setTimeout(updateCountdown, 1000);
                    }
                };

                timerId = setTimeout(updateCountdown, 0);

                resolve({
                    close: () => closeHandler()
                });
            });
        },

        async showDocModal(url, title, dataProcessor = null) {
            await _initCSS();

            return new Promise((resolve) => {
                const overlay = _createOverlay();
                overlay.className = 'lit-ui-overlay';

                const dialog = _createDialog(title, null, {
                    titleSize: 24,
                    titleCenter: true,
                    width: 'min(1200px, 90vw)',
                    maxHeight: '90vh'
                });
                dialog.className = 'lit-ui-dialog lit-doc-modal-dialog';

                const iframeContainer = document.createElement('div');
                iframeContainer.className = 'lit-ui-content lit-doc-modal-content';
                iframeContainer.style.padding = '0';
                iframeContainer.style.margin = '0';

                const iframe = document.createElement('iframe');
                iframe.className = 'lit-doc-modal-iframe';

                iframeContainer.appendChild(iframe);
                dialog.appendChild(iframeContainer);
                overlay.appendChild(dialog);
                document.body.appendChild(overlay);

                // 统一的关闭函数
                const closeDialog = () => {
                    _safeRemoveOverlay(overlay);
                    if (overlay._cleanup) overlay._cleanup();
                    resolve();
                };
                const safeCloseDialog = _createSafeCallback(closeDialog);

                const closeBtn = document.createElement('button');
                closeBtn.className = 'lit-doc-modal-close';
                closeBtn.setAttribute('aria-label', '关闭');
                closeBtn.onclick = safeCloseDialog;
                dialog.appendChild(closeBtn);

                // ESC/返回键/遮罩点击：关闭
                const closeHandler = () => safeCloseDialog();

                overlay._cleanup = _addDialogEventHandlers(overlay, closeHandler);

                const oReq = new XMLHttpRequest();
                oReq.addEventListener('load', function () {
                    let content = this.responseText;
                    if (dataProcessor && typeof dataProcessor === 'function') {
                        content = dataProcessor(content);
                    }

                    iframe.srcdoc = content;
                    iframe.onload = () => {
                        try {
                            const doc = iframe.contentDocument;
                            if (doc && doc.body) {
                                doc.body.style.background = 'none';
                            }
                        } catch (e) { }
                    };
                });

                // 防止重复推送历史记录
                if (!window.history.state || !window.history.state.modalOpen) {
                    history.pushState({ modalOpen: true }, '', '#lit-doc');
                }

                oReq.addEventListener('error', (err) => {
                    console.error(`加载文档失败: ${url}`, err);
                    _safeRemoveOverlay(overlay);
                    if (overlay._cleanup) overlay._cleanup();
                    resolve();
                });
                oReq.open('GET', url);
                oReq.send();
            });
        },

        async textEditor(title, message, initialContent, options = {}) {
            await _initCSS();
            return new Promise((resolve) => {
                const overlay = _createOverlay();
                const dialog = _createDialog(title, null, {
                    width: 'min(900px, 95vw)',
                    maxHeight: '95vh'
                });
                dialog.className += ' lit-text-editor-dialog';

                if (message) {
                    const msgEl = document.createElement('div');
                    msgEl.className = 'lit-ui-content lit-ui-message';
                    msgEl.style.fontSize = '14px';
                    msgEl.style.color = '#666';
                    msgEl.textContent = message;
                    dialog.appendChild(msgEl);
                }

                const editorContainer = document.createElement('div');
                editorContainer.className = 'lit-ui-editor-container';
                editorContainer.style.position = 'relative';

                const textarea = document.createElement('textarea');
                textarea.className = 'lit-ui-textarea lit-ui-scrollable';
                textarea.value = initialContent;
                textarea.spellcheck = false;

                if (options.selectionStart !== undefined) {
                    textarea.selectionStart = options.selectionStart;
                    textarea.selectionEnd = options.selectionEnd || options.selectionStart;
                }

                editorContainer.appendChild(textarea);

                const optionsRow = document.createElement('div');
                optionsRow.className = 'lit-ui-editor-options';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = 'deleteTempFile';
                checkbox.checked = options.deleteTempFile !== false;

                const label = document.createElement('label');
                label.htmlFor = 'deleteTempFile';
                label.textContent = '编码成功后，删除临时json文件';
                label.style.cursor = 'pointer';

                optionsRow.appendChild(checkbox);
                optionsRow.appendChild(label);
                editorContainer.appendChild(optionsRow);

                dialog.appendChild(editorContainer);

                // 统一的关闭函数
                const closeDialog = (result) => {
                    _safeRemoveOverlay(overlay);
                    if (overlay._cleanup) overlay._cleanup();
                    resolve(result);
                };
                const safeCloseDialog = _createSafeCallback(closeDialog);

                dialog.appendChild(_createButtonRow([
                    {
                        text: '取消',
                        isPrimary: false,
                        isCancel: true,
                        onClick: () => safeCloseDialog(null)
                    },
                    {
                        text: '暂存并退出',
                        isPrimary: false,
                        onClick: () => safeCloseDialog({
                            content: textarea.value,
                            action: 'save',
                            selectionStart: textarea.selectionStart,
                            selectionEnd: textarea.selectionEnd
                        })
                    },
                    {
                        text: '保存并编码',
                        isPrimary: true,
                        onClick: () => safeCloseDialog({
                            content: textarea.value,
                            action: 'encode',
                            deleteTempFile: checkbox.checked,
                            selectionStart: textarea.selectionStart,
                            selectionEnd: textarea.selectionEnd
                        })
                    }
                ]));

                overlay.appendChild(dialog);
                document.body.appendChild(overlay);

                // ESC/返回键关闭：编辑器不允许遮罩关闭
                const closeHandler = () => safeCloseDialog(null);

                overlay._cleanup = _addDialogEventHandlers(overlay, closeHandler, {
                    enableEsc: false,
                    enableBack: false,
                    enableOverlayClickClose: false,
                });

                setTimeout(() => {
                    textarea.focus();
                    if (options.selectionStart !== undefined) {
                        textarea.scrollTop = options.scrollTop || 0;
                    } else {
                        textarea.selectionStart = 0;
                        textarea.selectionEnd = 0;
                        textarea.scrollTop = 0;
                    }
                }, 100);
            });
        },

        closeAll() {
            const overlays = document.querySelectorAll('.lit-ui-overlay');
            overlays.forEach(overlay => {
                if (overlay.parentNode === document.body) {
                    document.body.removeChild(overlay);
                }
                if (overlay._cleanup) {
                    overlay._cleanup();
                }
            });
            _isClosing = false; // 重置状态
        },
    };
})();

// 导出UI模块
export const Lit_Dialog = DialogManager;
import { lib, game, ui, get, ai, _status } from '../../../../noname.js';
import basic from './basic.js'

/**
 * 样式隔离的对话框组件 - 重构版
 * 公开接口: loading, complexLoading, alert, confirm, choice, input, fileManager, showCountdownDialog, showDocModal, textEditor, closeAll
 */
const DialogManager = (() => {
    // ========== 私有变量 ==========
    let _zIndex = 50000;
    let _cssLoaded = false;
    let _dialogStack = []; // 对话框堆栈，用于管理多层对话框
    let _isClosing = false;

    // ========== 基础私有方法==========
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

    // ========== 关闭管理方法 ==========
    /**
     * 统一关闭入口 - 所有关闭方式都经过这里
     * @param {HTMLElement} overlay - 遮罩层元素
     * @param {Function} callback - 关闭后的回调
     * @param {string} reason - 关闭原因：'esc' | 'back' | 'overlay' | 'button' | 'programmatic'
     * @param {*} result - 关闭时返回的结果
     */
    const _close = (overlay, callback, reason = 'programmatic', result) => {
        if (_isClosing || !overlay || overlay._isClosed) return Promise.resolve(false);
        _isClosing = true;
        overlay._isClosed = true;

        // 从堆栈中移除
        const stackIndex = _dialogStack.findIndex(d => d.overlay === overlay);
        if (stackIndex > -1) {
            _dialogStack.splice(stackIndex, 1);
        }

        // 执行清理
        const cleanup = overlay._cleanup;
        if (typeof cleanup === 'function') {
            try {
                cleanup(reason);
            } catch (e) {
                console.error('Cleanup error:', e);
            }
        }

        // 移除 DOM
        _safeRemoveOverlay(overlay);

        // 执行回调
        if (typeof callback === 'function') {
            try {
                callback(result);
            } catch (e) {
                console.error('Close callback error:', e);
            }
        }

        // 延迟释放锁，防止连续触发
        // setTimeout(() => {
        //     debugger;
        //     _isClosing = false;
        // }, 50);
        _isClosing = false;
        return Promise.resolve(true);
    };

    /**
     * 设置事件处理器 - 统一绑定所有关闭方式
     */
    const _bindEvents = (overlay, onClose, options = {}) => {
        // 统一关闭配置
        const defaultOptions = {
            enableEsc: true,
            enableBack: true,
            enableOverlayClick: true,
            closeOnConfirm: true,  // 点击确认按钮后是否关闭
            closeOnCancel: true,   // 点击取消按钮后是否关闭
            preventDefault: false  // 是否阻止默认关闭行为（用于自定义处理）
        };
        const opts = { ...defaultOptions, ...options };
        const handlers = [];

        // ESC 键关闭
        if (opts.enableEsc) {
            const handler = (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    _close(overlay, onClose, 'esc');
                }
            };
            document.addEventListener('keydown', handler);
            handlers.push(() => document.removeEventListener('keydown', handler));
        }

        // 返回键/历史记录管理
        if (opts.enableBack) {
            const backHandler = _createBackHandler(overlay, onClose);
            handlers.push(backHandler);
        }

        // 遮罩点击关闭
        if (opts.enableOverlayClick) {
            const handler = (e) => {
                if (e.target === overlay) {
                    e.stopPropagation();
                    _close(overlay, onClose, 'overlay');
                }
            };
            overlay.addEventListener('pointerdown', handler);
            handlers.push(() => overlay.removeEventListener('pointerdown', handler));
        }

        // 返回统一的清理函数
        return (reason) => {
            handlers.forEach(cleanup => {
                try {
                    cleanup(reason);
                } catch (e) {
                    console.error('Handler cleanup error:', e);
                }
            });
        };
    };

    /**
     * 重写返回键处理 - 使用 Hash 方案替代 History API
     * 避免历史记录污染，移动端兼容性更好
     */
    const _createBackHandler = (overlay, onClose) => {
        // 使用 hash 变化来捕获返回键，更可靠
        const hashKey = `dialog-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

        // 如果当前没有 hash，添加一个
        const originalHash = window.location.hash;
        const needPushHash = !originalHash.includes('dialog=');

        if (needPushHash) {
            window.location.hash = `dialog=${hashKey}`;
        }

        const handleHashChange = (e) => {
            // 如果 hash 被移除（用户点击返回），关闭对话框
            if (!window.location.hash.includes(`dialog=${hashKey}`)) {
                // 阻止默认返回行为
                if (e) e.preventDefault();

                _close(overlay, onClose, 'back');

                // 恢复原始 hash（如果需要）
                if (originalHash && window.history.length > 1) {
                    window.history.replaceState(null, '', originalHash);
                }
            }
        };

        // 监听 hash 变化
        window.addEventListener('hashchange', handleHashChange);

        // 同时保留 popstate 作为后备方案
        const handlePopState = (e) => {
            if (overlay._isClosed) return;
            // 如果检测到回退且当前对话框还在，关闭它
            handleHashChange(e);
        };
        window.addEventListener('popstate', handlePopState);

        return (reason) => {
            window.removeEventListener('hashchange', handleHashChange);
            window.removeEventListener('popstate', handlePopState);

            // 清理 hash，但只有在不是被其他对话框使用时
            if (window.location.hash.includes(`dialog=${hashKey}`) && reason !== 'back') {
                // 使用 replaceState 避免产生新的历史记录
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
        };
    };

    // ========== UI窗口方法 ==========
    const _createOverlay = () => {
        const overlay = document.createElement('div');
        overlay.className = 'lit-ui-overlay';
        overlay.style.zIndex = `${_zIndex++}`;

        // 阻止移动端的触摸穿透
        overlay.addEventListener('touchend', (e) => {
            if (e.target === overlay) {
                e.preventDefault();
            }
        }, { passive: false });
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
        if (options.disabled) button.disabled = true;

        let clicked = false;
        button.onclick = (e) => {
            e.stopPropagation();
            if (!clicked && !options.disabled) {
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
                onClick: config.onClick,
                disabled: config.disabled
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

    // ========== 重构后的公开方法 ==========

    return {
        /**
         * 统一创建对话框的基础方法
         * 所有具体对话框类型都基于此方法构建
         */
        async createBaseDialog(config) {
            await _initCSS();

            return new Promise((resolve) => {
                const overlay = _createOverlay();
                const dialog = _createDialog(config.title, config.message, config.dialogOptions || {});

                // 构建自定义内容
                if (config.buildContent) {
                    config.buildContent(dialog, overlay);
                }

                // 统一的关闭处理
                const handleClose = (result) => {
                    if (overlay.exCleanup) overlay.exCleanup();
                    resolve(result);
                }

                // 绑定按钮
                if (config.buttons && config.buttons.length > 0) {
                    const buttonRow = _createButtonRow(
                        config.buttons.map(btn => ({
                            ...btn,
                            onClick: () => {
                                if (btn.closeOnClick !== false) {
                                    _close(overlay, handleClose, 'button',
                                        typeof btn.result === 'function' ? btn.result() : btn.result
                                    );
                                } else if (btn.onClick) {
                                    btn.onClick();
                                }
                            }
                        }))
                    );
                    dialog.appendChild(buttonRow);
                }

                // 设置事件
                const closeOptions = {
                    enableEsc: config.closeOnEsc !== false,
                    enableBack: config.closeOnBack !== false,
                    enableOverlayClick: config.closeOnOverlay !== false
                };

                // 暴露关闭方法供外部调用
                overlay._cleanup = _bindEvents(overlay, handleClose, closeOptions);
                overlay.close = (result) => _close(overlay, handleClose, 'programmatic', result);

                // 添加到堆栈
                _dialogStack.push({ overlay, config });

                overlay.appendChild(dialog);
                document.body.appendChild(overlay);

                if (config.onDialogCreated) {
                    config.onDialogCreated(overlay, dialog);
                }
            });
        },

        // ========== 基于统一基础方法重构具体对话框 ==========

        async choice(title, message, buttons) {
            return await this.createBaseDialog({
                title,
                message,
                buttons: buttons.map((text, index) => ({
                    text,
                    isPrimary: index === buttons.length - 1 && !['取消', 'Cancel'].includes(text),
                    result: index  // 返回按钮索引
                }))
            });
        },

        async loading(title, message) {
            return await this.createBaseDialog({
                title,
                message,
                closeOnEsc: false,
                closeOnBack: false,
                closeOnOverlay: false
            });
        },

        async complexLoading(title, message, options = {}) {
            await _initCSS();
            return new Promise((resolve) => {
                const overlay = _createOverlay();

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

                // 绑定事件（禁用所有关闭方式）
                overlay._cleanup = _bindEvents(overlay, () => { }, {
                    enableEsc: false,
                    enableBack: false,
                    enableOverlayClick: false,
                });

                // 添加到堆栈
                _dialogStack.push({ overlay, config: { type: 'complexLoading' } });

                // 内部状态
                let currentProgress = 0;
                let isIndeterminate = options.indeterminate || false;

                // 返回控制器对象
                resolve({
                    updateText: (text) => {
                        msgEl.textContent = text;
                    },

                    updateProgress: (value, total, opts = {}) => {
                        let percent = 0;

                        if (typeof value === 'object') {
                            opts = value;
                            percent = opts.percent !== undefined ? opts.percent : currentProgress;
                        } else if (total !== undefined && total > 0) {
                            percent = Math.round((value / total) * 100);
                        } else {
                            percent = Math.round(value);
                        }

                        percent = Math.max(0, Math.min(100, percent));
                        currentProgress = percent;

                        if (!isIndeterminate) {
                            progressFill.style.width = `${percent}%`;
                            percentEl.textContent = `${percent}%`;
                            percentEl.style.display = 'block';
                        } else {
                            percentEl.style.display = 'none';
                        }

                        if (opts.status) {
                            statusEl.textContent = opts.status;
                        }

                        if (opts.detail !== undefined) {
                            detailEl.textContent = opts.detail;
                            detailEl.style.display = opts.detail ? 'block' : 'none';
                        }

                        if (opts.state || opts.type) {
                            const state = opts.state || opts.type;
                            progressFill.classList.remove('lit-state-success', 'lit-state-error');
                            percentEl.classList.remove('lit-state-success', 'lit-state-error');
                            if (state) {
                                progressFill.classList.add(`lit-state-${state}`);
                                percentEl.classList.add(`lit-state-${state}`);
                            }
                        }
                    },

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
                                _close(overlay, () => { }, 'programmatic');
                            }, autoCloseDelay);
                        }
                    },

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

                    setStatus: (text) => {
                        statusEl.textContent = text;
                    },

                    setDetail: (text) => {
                        detailEl.textContent = text;
                        detailEl.style.display = text ? 'block' : 'none';
                    },

                    getProgress: () => currentProgress,

                    close: () => {
                        _close(overlay, () => { }, 'programmatic');
                    }
                });
            });
        },

        async alert(title, message) {
            return this.createBaseDialog({
                title,
                message,
                buttons: [{ text: '确定', isPrimary: true, result: true }],
            });
        },

        async confirm(title, message, confirmText = '确定', cancelText = '取消') {
            return await this.createBaseDialog({
                title,
                message,
                buttons: [
                    { text: cancelText, result: false },
                    { text: confirmText, isPrimary: true, result: true }
                ],
            });
        },

        async input(title, message, initialValue = '', options = {}) {
            let inputEl;

            const result = await this.createBaseDialog({
                title,
                message: null,
                dialogOptions: {
                    width: options.width || 'min(500px, 90vw)',
                    minHeight: options.minHeight || 'auto'
                },
                buildContent: (dialog) => {
                    if (message) {
                        const msgEl = document.createElement('div');
                        msgEl.className = 'lit-ui-content lit-ui-message';
                        msgEl.style.marginBottom = '15px';
                        msgEl.textContent = message;
                        dialog.appendChild(msgEl);
                    }

                    const inputContainer = document.createElement('div');
                    inputContainer.className = 'lit-ui-input-container';

                    const rows = options.rows || (options.password ? 1 : 3);

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
                    if (options.placeholder) inputEl.placeholder = options.placeholder;

                    inputContainer.appendChild(inputEl);
                    dialog.appendChild(inputContainer);

                    // 自动聚焦
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
                                // 模拟点击确认按钮
                                const confirmBtn = dialog.querySelector('.lit-ui-button.primary');
                                if (confirmBtn) confirmBtn.click();
                            }
                        });
                    }
                },
                buttons: [
                    {
                        text: options.cancelText || '取消',
                        result: null
                    },
                    {
                        text: options.confirmText || '确定',
                        isPrimary: true,
                        result: () => inputEl.value  // 使用函数延迟获取值
                    }
                ],
                closeOnEsc: true,
                closeOnBack: true,
                closeOnOverlay: options.closeOnOverlay !== false
            });

            // 处理 result 可能是函数的情况（获取最终输入值）
            return typeof result === 'function' ? result() : result;
        },

        async showCountdownDialog(title, message, options = {}) {
            const {
                onConfirm = () => { },
                onCancel = () => { },
                countdownTime = 3
            } = options;

            return await this.createBaseDialog({
                title,
                message,
                dialogOptions: {
                    width: 'min(500px, 90vw)',
                    minHeight: '250px'
                },
                buildContent: (dialog) => {
                    const countdownEl = document.createElement('div');
                    countdownEl.className = "lit-ui-countdown";
                    countdownEl.textContent = `${countdownTime} 秒`;
                    dialog.appendChild(countdownEl);
                    dialog.countdownEl = countdownEl;
                },
                buttons: [
                    {
                        text: '立即重启',
                        isPrimary: true,
                        result: () => {
                            onConfirm();
                            return true;
                        }
                    },
                    {
                        text: '取消重启',
                        isCancel: true,
                        result: () => {
                            onCancel();
                            return false;
                        }
                    }
                ],
                onDialogCreated: (overlay, dialog) => {
                    let countdown = countdownTime;
                    let timerId = null;
                    const countdownEl = dialog.countdownEl;

                    const updateCountdown = () => {
                        countdownEl.textContent = `${countdown} 秒`;

                        if (countdown <= 0) {
                            clearTimeout(timerId);
                            const confirmBtn = dialog.querySelector('.lit-ui-button.primary');
                            if (confirmBtn) confirmBtn.click();
                        } else {
                            countdown--;
                            timerId = setTimeout(updateCountdown, 1000);
                        }
                    };
                    timerId = setTimeout(updateCountdown, 0);
                    overlay.exCleanup = () => {
                        if (timerId) clearTimeout(timerId);
                    }
                },
            });
        },

        async fileManager(title, message, items) {
            return this.createBaseDialog({
                title,
                message: null,
                dialogOptions: {
                    width: 'min(600px, 90vw)',
                    maxHeight: '85vh'
                },
                buildContent: (dialog) => {
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

                            // 更新按钮状态
                            const deleteBtn = dialog.querySelector('.lit-ui-button[data-cancel="false"]:nth-of-type(1)');
                            const editBtn = dialog.querySelector('.lit-ui-button[data-cancel="false"]:nth-of-type(2)');
                            const applyBtn = dialog.querySelector('.lit-ui-button.primary');

                            if (deleteBtn && editBtn && applyBtn) {
                                const count = selectedFiles.size;
                                deleteBtn.disabled = count === 0;
                                editBtn.disabled = count !== 1;
                                applyBtn.disabled = count !== 1;

                                [deleteBtn, editBtn, applyBtn].forEach(btn => {
                                    btn.style.opacity = btn.disabled ? '0.5' : '1';
                                    btn.style.cursor = btn.disabled ? 'not-allowed' : 'pointer';
                                });
                            }
                        });

                        listContainer.appendChild(itemEl);
                    });

                    dialog.appendChild(listContainer);
                },
                buttons: [
                    {
                        text: '删除',
                        result: () => ({
                            action: 'delete',
                            files: Array.from(document.querySelectorAll('.lit-ui-list-item input:checked'))
                                .map(checkbox => checkbox.closest('.lit-ui-list-item').dataset.value)
                        }),
                        disabled: true
                    },
                    {
                        text: '编辑',
                        result: () => ({
                            action: 'edit',
                            files: Array.from(document.querySelectorAll('.lit-ui-list-item input:checked'))
                                .map(checkbox => checkbox.closest('.lit-ui-list-item').dataset.value)
                        }),
                        disabled: true
                    },
                    {
                        text: '应用配置',
                        isPrimary: true,
                        result: () => ({
                            action: 'apply',
                            files: Array.from(document.querySelectorAll('.lit-ui-list-item input:checked'))
                                .map(checkbox => checkbox.closest('.lit-ui-list-item').dataset.value)
                        }),
                        disabled: true
                    },
                    {
                        text: '取消',
                        isCancel: true,
                        result: null
                    }
                ],
            });
        },

        async showDocModal(url, title, dataProcessor = null) {
            await _initCSS();

            return this.createBaseDialog({
                title,
                message: null,
                dialogOptions: {
                    titleSize: 24,
                    titleCenter: true,
                    width: 'min(1200px, 90vw)',
                    maxHeight: '90vh'
                },
                buildContent: (dialog) => {
                    dialog.className = 'lit-ui-dialog lit-doc-modal-dialog';

                    const iframeContainer = document.createElement('div');
                    iframeContainer.className = 'lit-ui-content lit-doc-modal-content';
                    iframeContainer.style.padding = '0';
                    iframeContainer.style.margin = '0';

                    const iframe = document.createElement('iframe');
                    iframe.className = 'lit-doc-modal-iframe';

                    iframeContainer.appendChild(iframe);
                    dialog.appendChild(iframeContainer);

                    const closeBtn = document.createElement('button');
                    closeBtn.className = 'lit-doc-modal-close';
                    closeBtn.setAttribute('aria-label', '关闭');
                    closeBtn.onclick = () => {
                        const overlay = dialog.closest('.lit-ui-overlay');
                        if (overlay && overlay.close) overlay.close();
                    };
                    dialog.appendChild(closeBtn);

                    // 加载文档内容
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

                    oReq.addEventListener('error', (err) => {
                        console.error(`加载文档失败: ${url}`, err);
                        const overlay = dialog.closest('.lit-ui-overlay');
                        if (overlay && overlay.close) overlay.close();
                    });

                    oReq.open('GET', url);
                    oReq.send();
                },
                buttons: [],
            });
        },

        async textEditor(title, message, initialContent, options = {}) {
            let textarea, checkbox;

            return this.createBaseDialog({
                title,
                message: null,
                dialogOptions: {
                    width: 'min(900px, 95vw)',
                    maxHeight: '95vh'
                },
                buildContent: (dialog) => {
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

                    textarea = document.createElement('textarea');
                    textarea.className = 'lit-ui-textarea lit-ui-scrollable';
                    textarea.value = initialContent;
                    textarea.spellcheck = false;

                    editorContainer.appendChild(textarea);

                    const optionsRow = document.createElement('div');
                    optionsRow.className = 'lit-ui-editor-options';

                    checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = 'deleteTempFile';
                    checkbox.checked = options.deleteTempFile !== false;

                    const label = document.createElement('label');
                    label.htmlFor = 'deleteTempFile';
                    label.textContent = '编码成功后，删除临时json文件';

                    optionsRow.appendChild(checkbox);
                    optionsRow.appendChild(label);
                    editorContainer.appendChild(optionsRow);

                    dialog.appendChild(editorContainer);

                    // 焦点管理
                    setTimeout(() => {
                        textarea.focus();
                        if (options.selectionStart !== undefined) {
                            textarea.selectionStart = options.selectionStart;
                            textarea.selectionEnd = options.selectionEnd || options.selectionStart;
                            textarea.scrollTop = options.scrollTop || 0;
                        }
                    }, 100);
                },
                buttons: [
                    { text: '取消', result: null },
                    {
                        text: '暂存并退出',
                        result: () => ({
                            content: textarea.value,
                            action: 'save',
                            selectionStart: textarea.selectionStart,
                            selectionEnd: textarea.selectionEnd
                        })
                    },
                    {
                        text: '保存并编码',
                        isPrimary: true,
                        result: () => ({
                            content: textarea.value,
                            action: 'encode',
                            deleteTempFile: checkbox.checked,
                            selectionStart: textarea.selectionStart,
                            selectionEnd: textarea.selectionEnd
                        })
                    }
                ],
                // 编辑器不允许遮罩/Esc/返回关闭，必须通过按钮
                closeOnEsc: false,
                closeOnBack: false,
                closeOnOverlay: false
            }).then(result => typeof result === 'function' ? result() : result);
        },

        /**
         * 关闭所有对话框
         */
        closeAll() {
            // 从后往前关闭，避免索引问题
            [..._dialogStack].reverse().forEach(({ overlay }) => {
                if (overlay && overlay.close) {
                    overlay.close();
                }
            });
            _dialogStack = [];
            _isClosing = false;
        },

        /**
         * 获取当前打开的对话框数量
         */
        getDialogCount() {
            return _dialogStack.length;
        },
    };
})();

// 导出UI模块
export const Lit_Dialog = DialogManager;
import { lib, game, ui, get, ai, _status } from '../../../../noname.js';
import basic from './basic.js'

/**
 * 提供样式隔离的对话框组件
 * 公开接口: loading, alert, confirm, choice, fileManager, showCountdownDialog, showDocModal, textEditor, closeAll
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
            .lit-ui-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 50000;
            }
            .lit-ui-dialog {
                position: relative;
                left: auto;
                top: auto;
                background: white;
                border-radius: 15px;
                padding: 25px;
                box-sizing: border-box;
                transition: none;
                color: black;
                text-shadow: none;
                display: flex;
                flex-direction: column;
                min-width: 320px;
                max-width: 90vw;
                max-height: 85vh;
            }
            .lit-ui-content {
                font-size: 16px;
                line-height: 1.6;
                color: #444;
                display: block;
                position: relative;
                flex-grow: 1;
                flex-shrink: 1;
                overflow-y: auto;
                margin-bottom: 20px;
                white-space: pre-wrap;
                height: auto;
            }
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

    const _setupClickOutsideToClose = (overlay, closeCallback) => {
        // 使用 pointerdown 替代 click，移动端更可靠
        overlay.addEventListener('pointerdown', (e) => {
            if (e.target === overlay && closeCallback && !_isClosing) {
                e.stopPropagation();
                e.preventDefault();
                closeCallback();
            }
        });
    };

    const _safeRemoveOverlay = (overlay) => {
        if (overlay && overlay.parentNode === document.body) {
            document.body.removeChild(overlay);
        }
    };

    const _addDialogEventHandlers = (overlay, closeCallback, options = {}) => {
        const {
            enableEscClose = true,
            enableBackClose = true,
        } = options;

        const eventHandlers = [];

        if (enableEscClose) {
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

        if (enableBackClose) {
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
                // 清理我们添加的历史记录
                const state = window.history.state || {};
                if (state.dialogOpen || state.modalOpen) {
                    window.history.back();
                }
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
        async choice(title, message, buttons, closable = true) {
            await _initCSS();
            return new Promise((resolve) => {
                const overlay = _createOverlay();
                const dialog = _createDialog(title, message);
                
                if (!closable) {
                    overlay.appendChild(dialog);
                    document.body.appendChild(overlay);
                    // 不可关闭的对话框也需要清理函数
                    overlay._cleanup = _addDialogEventHandlers(overlay, () => {}, {
                        enableEscClose: false,
                        enableBackClose: false,
                    });
                    resolve(-1);
                    return;
                }

                // 统一的关闭函数：移除DOM + 清理事件 + resolve
                const closeDialog = (result) => {
                    _safeRemoveOverlay(overlay);
                    if (overlay._cleanup) overlay._cleanup();
                    resolve(result);
                };

                const safeCloseDialog = _createSafeCallback(closeDialog);

                // 按钮配置：点击后关闭对话框并返回索引
                const btnConfigs = buttons.map((text, index) => ({
                    text,
                    isPrimary: index === buttons.length - 1 && text !== '取消' && text !== 'Cancel',
                    onClick: () => safeCloseDialog(index)
                }));

                dialog.appendChild(_createButtonRow(btnConfigs));
                overlay.appendChild(dialog);
                document.body.appendChild(overlay);

                // ESC/返回键/遮罩点击：关闭并返回 -1
                const closeHandler = () => safeCloseDialog(-1);
                
                overlay._cleanup = _addDialogEventHandlers(overlay, closeHandler, {
                    enableEscClose: true,
                    enableBackClose: true,
                });
                
                // 单独设置遮罩点击关闭
                _setupClickOutsideToClose(overlay, closeHandler);
            });
        },

        loading(title, message) {
            return this.choice(title, message, [], false);
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

        async listChoice(title, message, items) {
            await _initCSS();
            return new Promise((resolve) => {
                const overlay = _createOverlay();
                const dialog = _createDialog(title, null, {
                    width: 'min(550px, 90vw)',
                    maxHeight: '85vh'
                });

                if (message) {
                    const messageEl = document.createElement('div');
                    messageEl.className = 'lit-ui-content lit-ui-message';
                    messageEl.textContent = message;
                    dialog.appendChild(messageEl);
                }

                const listContainer = document.createElement('div');
                listContainer.className = 'lit-ui-content lit-ui-scrollable lit-ui-list';

                if (items.length === 0) {
                    const emptyEl = document.createElement('div');
                    emptyEl.className = 'lit-ui-empty';
                    emptyEl.textContent = '暂无可用选项';
                    listContainer.appendChild(emptyEl);
                } else {
                    items.forEach((item, index) => {
                        const itemEl = document.createElement('div');
                        itemEl.className = 'lit-ui-list-item';
                        if (item.type) itemEl.dataset.type = item.type;
                        
                        const number = document.createElement('span');
                        number.className = 'lit-ui-list-number';
                        number.textContent = `${index + 1}.`;

                        const textSpan = document.createElement('span');
                        textSpan.className = 'lit-ui-list-text';
                        textSpan.textContent = item.text;

                        itemEl.appendChild(number);
                        itemEl.appendChild(textSpan);
                        itemEl.addEventListener('click', _createSafeCallback(() => {
                            _safeRemoveOverlay(overlay);
                            if (overlay._cleanup) overlay._cleanup();
                            resolve(item.value);
                        }));
                        listContainer.appendChild(itemEl);
                    });
                }
                dialog.appendChild(listContainer);

                // 统一的关闭函数
                const closeDialog = () => {
                    _safeRemoveOverlay(overlay);
                    if (overlay._cleanup) overlay._cleanup();
                    resolve(null);
                };
                const safeCloseDialog = _createSafeCallback(closeDialog);

                const cancelBtnConfig = {
                    text: '取消',
                    isPrimary: false,
                    onClick: safeCloseDialog
                };

                dialog.appendChild(_createButtonRow([cancelBtnConfig]));
                overlay.appendChild(dialog);
                document.body.appendChild(overlay);

                // ESC/返回键/遮罩点击：返回 null
                const closeHandler = () => safeCloseDialog();
                
                overlay._cleanup = _addDialogEventHandlers(overlay, closeHandler, {
                    enableEscClose: true,
                    enableBackClose: true,
                });
                
                _setupClickOutsideToClose(overlay, closeHandler);
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
                    const messageEl = document.createElement('div');
                    messageEl.className = 'lit-ui-content lit-ui-message';
                    messageEl.style.marginBottom = '15px';
                    messageEl.textContent = message;
                    dialog.appendChild(messageEl);
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
                
                overlay._cleanup = _addDialogEventHandlers(overlay, closeHandler, {
                    enableEscClose: true,
                    enableBackClose: true,
                });
                
                _setupClickOutsideToClose(overlay, closeHandler);

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
                
                overlay._cleanup = _addDialogEventHandlers(overlay, closeHandler, {
                    enableEscClose: true,
                    enableBackClose: true,
                });
                
                _setupClickOutsideToClose(overlay, closeHandler);

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
                    const messageEl = document.createElement('div');
                    messageEl.className = 'lit-ui-content lit-ui-message';
                    messageEl.style.fontSize = '14px';
                    messageEl.style.color = '#666';
                    messageEl.textContent = message;
                    dialog.appendChild(messageEl);
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
                    enableEscClose: true,
                    enableBackClose: true,
                    enableOverlayClickClose: false
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
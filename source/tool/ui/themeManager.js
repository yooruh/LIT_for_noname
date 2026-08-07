import { game } from '../../../../../noname.js';

const THEME_CONFIG_KEY = 'lit_uiTheme';
const THEME_VALUES = new Set(['system', 'light', 'dark']);

function normalizeTheme(theme) {
    return THEME_VALUES.has(theme) ? theme : 'system';
}

function applyThemeAttribute(target, theme) {
    if (!target) return;
    target.dataset.litTheme = normalizeTheme(theme);
}

const ThemeManager = (() => {
    let currentTheme = 'system';
    const documentFrames = new Set();

    const refreshFrames = () => {
        documentFrames.forEach(iframe => {
            if (!iframe?.isConnected) {
                documentFrames.delete(iframe);
                return;
            }
            applyThemeAttribute(iframe.contentDocument?.documentElement, currentTheme);
        });
    };

    return {
        init() {
            const savedTheme = game.getExtensionConfig('叁岛世界', THEME_CONFIG_KEY);
            this.apply(savedTheme);
        },

        apply(theme) {
            currentTheme = normalizeTheme(theme);
            applyThemeAttribute(document.documentElement, currentTheme);
            refreshFrames();
            return currentTheme;
        },

        save(theme) {
            const normalizedTheme = this.apply(theme);
            game.saveExtensionConfig('叁岛世界', THEME_CONFIG_KEY, normalizedTheme);
            return normalizedTheme;
        },

        getTheme() {
            return currentTheme;
        },

        registerDocumentFrame(iframe) {
            if (!iframe) return;
            documentFrames.add(iframe);
            applyThemeAttribute(iframe.contentDocument?.documentElement, currentTheme);
        },

        unregisterDocumentFrame(iframe) {
            documentFrames.delete(iframe);
        },

        applyThemeToDocument(documentNode) {
            applyThemeAttribute(documentNode?.documentElement, currentTheme);
        },

        injectThemeAttribute(html) {
            const theme = currentTheme;
            if (/<html\b[^>]*\bdata-lit-theme=/i.test(html)) {
                return html.replace(/(<html\b[^>]*\bdata-lit-theme=")[^"]*(")/i, `$1${theme}$2`);
            }
            if (/<html\b/i.test(html)) {
                return html.replace(/<html\b/i, `<html data-lit-theme="${theme}"`);
            }
            return `<html data-lit-theme="${theme}">${html}</html>`;
        },
    };
})();

export const themeManager = ThemeManager;
export { THEME_CONFIG_KEY, normalizeTheme };



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
        stateSaveDebounce: 1000   // 状态保存防抖(ms)
    },
    types: {
        critical: ['extension.js', 'precontent.js', 'content.js'],
        text: ['.js', '.json', '.css', '.html', '.md', '.txt', '.ts', '.xml', '.yml', '.yaml', '.csv'],
        media: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp3', '.ogg', '.wav', '.mp4', '.zip']
    }
};

export { CONFIG as UPDATE_CONFIG };

/**
 * 叁岛世界 (lit) — 共享导入模块
 *
 * 统一导出所有角色文件需要的基础依赖，避免每个角色文件重复 3 行 import。
 *
 * 用法 (在 roles/*.js 中):
 *   import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';
 */

// 游戏引擎核心 API
export { lib, game, ui, get, ai, _status } from '../../../../../noname.js';

// 文本样式工具
export { styleText } from '../../tool/utils/textFormat.js';

// 预计算的样式常量（角色技能描述中广泛使用）
import { styleText } from '../../tool/utils/textFormat.js';
export const X = styleText('b', 'X');   // 靛蓝 X
export const Y = styleText('p', 'Y');   // 粉色 Y
export const Z = styleText('y', 'Z');   // 黄色 Z

// 加粗靛蓝色文字
export function B(text) {
    return styleText('b', text);
}

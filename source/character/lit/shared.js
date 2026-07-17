/**
 * 叁岛世界 (lit) — 共享导入模块
 *
 * 统一导出所有角色文件需要的基础依赖，避免每个角色文件重复 3 行 import。
 *
 * 用法 (在 roles/*.js 中):
 *   import { lib, game, ui, get, ai, _status, X, Y, Z } from '../shared.js';
 */

// 游戏引擎核心 API
export { lib, game, ui, get, ai, _status } from '../../../../../noname.js';

// 文本样式工具
export { Styled } from '../../tool/basic.js';

// 预计算的样式常量（角色技能描述中广泛使用）
import { Styled } from '../../tool/basic.js';
export const X = Styled('b', 'X');   // 粗体 X  (靛蓝)
export const Y = Styled('p', 'Y');   // 粉色 Y  (难)
export const Z = Styled('y', 'Z');   // 黄色 Z  (中)

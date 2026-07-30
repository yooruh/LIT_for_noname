/**
 * 叁岛测试 (test) — 共享导入模块
 *
 * 统一导出所有测试角色文件需要的基础依赖。
 *
 * 用法 (在 test/roles/*.js 中):
 *   import { lib, game, ui, get, ai, _status, B } from '../shared.js';
 */

export { lib, game, ui, get, ai, _status } from '../../../../../noname.js';

// 文本样式工具
export { Styled } from '../../tool/basic.js';
import { Styled } from '../../tool/basic.js';

// 加粗靛蓝色文字
export function B(text) {
    return Styled('b', text);
}

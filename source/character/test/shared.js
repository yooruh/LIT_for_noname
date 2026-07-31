export { lib, game, ui, get, ai, _status } from '../../../../../noname.js';

// 文本样式工具
export { styleText } from '../../tool/utils/textFormat.js';
import { styleText } from '../../tool/utils/textFormat.js';

// 加粗靛蓝色文字
export function B(text) {
    return styleText('b', text);
}

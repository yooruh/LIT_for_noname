import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';
import { card, skill } from './skills.js';
import { translate, dynamicTranslate, pinyins } from './translate.js';

// 卡牌包设置
const PACK_NAME = 'lit_card';
const connectAllowed = true;
export const packMeta = {
    displayName: '叁岛世界',
    defaultEnabled: true,
};

export const info = {
    name: PACK_NAME,
    connect: connectAllowed,
    card,
    skill,
    list: [
        ['spade', 3, 'lit_diaoka'],
        ['heart', 3, 'lit_diaoka'],
        ['club', 3, 'lit_diaoka'],
        ['diamond', 9, 'lit_diaoka'],
        ['diamond', 3, 'lit_qianfanpai'],
    ],
    translate,
    dynamicTranslate,
    pinyins,
};

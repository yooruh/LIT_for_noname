import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';

// ════════════════════════════════════════════════════════════
//  Aggregation — dynamic import from roles/ directory
// ════════════════════════════════════════════════════════════

// Auto-populated by rebuild.mjs — regenerated on every build
const ROLE_FILES = ["9liyang", "9wangcan", "9zhangchi", "9zhangshengjie", "boshu", "chenke", "hujunwei", "hupan", "huxinyu", "jianghaixu", "lanboxun", "linmiao", "liuchenmu", "pangjianlong", "qb", "qianbaocan", "rita", "sunnan", "wangrong", "wuxiaoqi", "yangxiangling", "zengpinjia", "zhangchi", "zhangqinyi", "zhangshengjie", "zhengmohan", "zigao"];

const _modules = await Promise.all(ROLE_FILES.map(name =>
    import(`./roles/${name}.js`)
));

const _roles = {};
ROLE_FILES.forEach((name, i) => { _roles[name] = _modules[i]; });

const _merge = (prop) => {
    const r = {};
    for (const name of ROLE_FILES) if (_roles[name][prop]) Object.assign(r, _roles[name][prop]);
    return r;
};

import { skill as _negClear } from './_negClear.js';
import { skill as _shengji }  from './_shengji.js';

export {
    connectBanned, characterSort, characterTitle,
    characterIntro, characterReplace, characterFilter,
    characterSubstitute, perfectPair
} from './lit_characters.js';

import { fullTranslate as _ft, simpleTranslate as _st,
         dynamicTranslate, pinyins } from './lit_translate.js';
export { dynamicTranslate, pinyins };

export const character       = _merge('character');
export const skill           = { ..._negClear, ..._shengji, ..._merge('skill') };
export const fullTranslate   = { ..._ft, ..._merge('translate') };
export const simpleTranslate = { ..._st, ..._merge('simpleTranslate') };

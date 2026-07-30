import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';

const ROLE_FILES = ["9hupan","9zengpinjia","9zhengmohan","9zhongyutong","pengliying","wangsiyuan"];

const _modules = await Promise.all(ROLE_FILES.map(name =>
    import(`./roles/${name}.js`)
));

const _roles = {};
ROLE_FILES.forEach((name, i) => { _roles[name] = _modules[i]; });

const _merge = (prop) => {
    const result = {};
    for (const name of ROLE_FILES) if (_roles[name][prop]) Object.assign(result, _roles[name][prop]);
    return result;
};

// ── 自动聚合角色元数据 ──

// 角色全名映射：filename → 'lit_xxx'
const _charNames = {};
for (const name of ROLE_FILES) {
    if (_roles[name].character) {
        _charNames[name] = Object.keys(_roles[name].character)[0];
    }
}

// characterSort：按 sort 导出分组，组内按 ROLE_FILES 顺序
const _characterSort = { 'lit_test': {} };
for (const name of ROLE_FILES) {
    const sortGroup = _roles[name].sort;
    const charName = _charNames[name];
    if (sortGroup && charName) {
        const key = `lit_${sortGroup}`;
        if (!_characterSort['lit_test'][key]) _characterSort['lit_test'][key] = [];
        _characterSort['lit_test'][key].push(charName);
    }
}
export const characterSort = _characterSort;

// characterTitle：{ 角色全名 → 标题 }
const _characterTitle = {};
for (const name of ROLE_FILES) {
    if (_roles[name].title && _charNames[name]) {
        _characterTitle[_charNames[name]] = _roles[name].title;
    }
}
export const characterTitle = _characterTitle;

// characterIntro：{ 角色全名 → 攻略 }
const _characterIntro = {};
for (const name of ROLE_FILES) {
    if (_roles[name].intro && _charNames[name]) {
        _characterIntro[_charNames[name]] = _roles[name].intro;
    }
}
export const characterIntro = _characterIntro;

// characterReplace / perfectPair：直接从 role 文件合并
export const characterReplace = _merge('characterReplace');
export const perfectPair = _merge('perfectPair');

// ── 包级别全局配置 ──
export const connectBanned = [];
export const characterFilter = {};
export const characterSubstitute = {};

// ── 角色定义、技能、翻译 ──
import { translate as _metaTranslate, dynamicTranslate as _metaDynamicTranslate, pinyins as _metaPinyins } from './_meta.js';

export const character = _merge('character');
export const skill = _merge('skill');
export const translate = { ..._metaTranslate, ..._merge('translate') };
export const dynamicTranslate = { ..._metaDynamicTranslate, ..._merge('dynamicTranslate') };
export const pinyins = { ..._metaPinyins, ..._merge('pinyins') };

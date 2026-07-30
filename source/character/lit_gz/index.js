import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';

// ════════════════════════════════════════════════════════════
//  Guozhan 角色数据 —— 从 lit 包继承并经 gz_ 前缀转换
// ════════════════════════════════════════════════════════════

import {
    characterSort as litCharacterSort,
    characterTitle as litCharacterTitle,
    characterIntro as litCharacterIntro,
    characterReplace as litCharacterReplace,
    characterFilter as litCharacterFilter,
    characterSubstitute as litCharacterSubstitute,
    perfectPair as litPerfectPair,
    connectBanned as litConnectBanned,
} from '../lit/index.js';

import {
    fullTranslate as litTranslate,
    dynamicTranslate as litDynamicTranslate,
    pinyins as litPinyins,
    character as litCharacter,
} from '../lit/index.js';

const characterIds = Object.keys(litCharacter || {});
const characterIdSet = new Set(characterIds);
const gzId = id => `gz_${id}`;

// ── 转换工具函数 ──

function mapCharacterKeyedObject(source, mapValue) {
    return Object.keys(source || {}).reduce((acc, key) => {
        acc[gzId(key)] = mapValue ? mapValue(source[key], key) : source[key];
        return acc;
    }, {});
}

function mapCharacterListObject(source) {
    return mapCharacterKeyedObject(source, value => value.map(id => gzId(id)));
}

function mapTranslate(source) {
    return Object.keys(source || {}).reduce((acc, key) => {
        if (characterIdSet.has(key)) {
            acc[gzId(key)] = source[key];
            return acc;
        }
        if (key.endsWith('_prefix')) {
            const baseKey = key.slice(0, -7);
            if (characterIdSet.has(baseKey)) {
                acc[`${gzId(baseKey)}_prefix`] = source[key];
                return acc;
            }
        }
        acc[key] = source[key];
        return acc;
    }, {});
}

// ── lit 元数据 → gz 转换导出 ──

export const connectBanned = litConnectBanned || [];

export const characterSort = {
    lit_gz: Object.keys(litCharacterSort?.lit || {}).reduce((acc, key) => {
        acc[key] = litCharacterSort.lit[key].map(id => gzId(id));
        return acc;
    }, {}),
};

export const characterTitle = mapCharacterKeyedObject(litCharacterTitle);
export const characterIntro = mapCharacterKeyedObject(litCharacterIntro);
export const characterReplace = mapCharacterListObject(litCharacterReplace);
export const characterFilter = mapCharacterKeyedObject(litCharacterFilter);
export const characterSubstitute = mapCharacterKeyedObject(litCharacterSubstitute);
export const perfectPair = mapCharacterListObject(litPerfectPair);

// ── lit 翻译 → gz 转换导出 ──

export const translate = mapTranslate(litTranslate);
export const dynamicTranslate = litDynamicTranslate;
export const pinyins = litPinyins;

// ════════════════════════════════════════════════════════════
//  Guozhan 覆盖 —— 需要专属国战版本的角色在此添加
// ════════════════════════════════════════════════════════════

const ROLE_FILES = [
    // 'hujunwei',
];

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

export const overrides = {
    character: _merge('character'),
    skill: _merge('skill'),
    characterTitle: _merge('characterTitle'),
    characterIntro: _merge('characterIntro'),
    characterReplace: _merge('characterReplace'),
    characterFilter: _merge('characterFilter'),
    characterSubstitute: _merge('characterSubstitute'),
    perfectPair: _merge('perfectPair'),
    translate: _merge('translate'),
    dynamicTranslate: _merge('dynamicTranslate'),
    pinyins: _merge('pinyins'),
};

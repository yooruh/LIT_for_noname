import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';
import {
    mapCharacterKeys, mapCharacterLists, mapCharacterSort,
    mapCharacterTranslate, prefixCharacterId,
} from '../../tool/pack/guozhanPack.js';
import { createRolePack } from '../../tool/pack/rolePack.js';
import { info as litInfo, packMeta as litPackMeta } from '../lit/index.js';

// 角色包设置
const PACK_NAME = 'lit_gz';
const connectAllowed = true;

// rebuild.mjs 自动扫描 roles/ 目录并更新此数组；这里只放国战专属差异角色。
const ROLE_FILES = [];
const modules = await Promise.all(ROLE_FILES.map(fileName => import(`./roles/${fileName}.js`)));
const roles = createRolePack(ROLE_FILES, modules, PACK_NAME);

const merge = (base, override) => ({ ...(base || {}), ...(override || {}) });
const guozhanOnly = mode => mode === 'guozhan';

// 国战专属角色模块的同名对象覆盖继承自叁岛角色包的数据。
const overrides = {
    character: roles.merge('character'),
    skill: roles.merge('skill'),
    characterTitle: roles.merge('characterTitle'),
    characterIntro: roles.merge('characterIntro'),
    characterReplace: roles.merge('characterReplace'),
    characterFilter: roles.merge('characterFilter'),
    characterSubstitute: roles.merge('characterSubstitute'),
    perfectPair: roles.merge('perfectPair'),
    translate: roles.merge('translate'),
    dynamicTranslate: roles.merge('dynamicTranslate'),
    pinyins: roles.merge('pinyins'),
};

// 继承叁岛角色包，并为国战角色 ID 添加 gz_ 前缀及专属模式限制。
const characterIds = Object.keys(litInfo.character || {});
const character = mapCharacterKeys(litInfo.character, value => ({
    ...value,
    groupInGuozhan: 'key',
}));
const inheritedFilters = mapCharacterKeys(litInfo.characterFilter, filter => mode => (
    guozhanOnly(mode) && filter(mode)
));
const modeFilters = Object.fromEntries(characterIds.map(id => [prefixCharacterId(id), guozhanOnly]));

const resourceNames = Object.fromEntries(Object.entries(litPackMeta.resourceNames).map(([id, resourceName]) => [
    prefixCharacterId(id),
    resourceName,
]));

// 加载角色包时的设置
export const packMeta = {
    loadConfig: 'lit_guozhanAllowed',
    resourceNames,
    defaultEnabled: true,
    // 模块和资源仍在 precontent 准备；角色包延至国战 content 阶段注册
    registration: 'deferred',
};

export const info = {
    name: PACK_NAME,
    mode: 'guozhan',
    connect: connectAllowed,
    connectBanned: litInfo.connectBanned || [],
    character: merge(character, overrides.character),
    characterSort: mapCharacterSort(litInfo.characterSort),
    characterTitle: merge(mapCharacterKeys(litInfo.characterTitle), overrides.characterTitle),
    characterIntro: merge(mapCharacterKeys(litInfo.characterIntro), overrides.characterIntro),
    characterReplace: merge(mapCharacterLists(litInfo.characterReplace), overrides.characterReplace),
    characterFilter: merge({ ...modeFilters, ...inheritedFilters }, overrides.characterFilter),
    characterSubstitute: merge(mapCharacterKeys(litInfo.characterSubstitute), overrides.characterSubstitute),
    perfectPair: merge(mapCharacterLists(litInfo.perfectPair), overrides.perfectPair),
    skill: merge(litInfo.skill, overrides.skill),
    translate: merge(mapCharacterTranslate(litInfo.translate, characterIds), overrides.translate),
    dynamicTranslate: merge(litInfo.dynamicTranslate, overrides.dynamicTranslate),
    pinyins: merge(litInfo.pinyins, overrides.pinyins),
};

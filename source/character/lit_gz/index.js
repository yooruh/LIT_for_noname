import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';
import {
    mapCharacterKeys, mapCharacterLists, mapCharacterSort,
    mapCharacterTranslate, prefixCharacterId,
} from '../../tool/pack/guozhanPack.js';
import { createRolePack } from '../../tool/pack/rolePack.js';
import { info as litInfo, resourceNames as litResourceNames } from '../lit/index.js';

// rebuild.mjs 自动扫描 roles/ 目录并更新此数组；这里只放国战专属差异角色。
const ROLE_FILES = [];
const modules = await Promise.all(ROLE_FILES.map(fileName => import(`./roles/${fileName}.js`)));
const roles = createRolePack(ROLE_FILES, modules, 'lit_gz');
const merge = (base, override) => ({ ...(base || {}), ...(override || {}) });
const guozhanOnly = mode => mode === 'guozhan';

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

const characterIds = Object.keys(litInfo.character || {});
const character = mapCharacterKeys(litInfo.character, value => ({
    ...value,
    groupInGuozhan: 'key',
}));
const inheritedFilters = mapCharacterKeys(litInfo.characterFilter, filter => mode => (
    guozhanOnly(mode) && filter(mode)
));
const modeFilters = Object.fromEntries(characterIds.map(id => [prefixCharacterId(id), guozhanOnly]));

export const resourceNames = Object.fromEntries(Object.entries(litResourceNames).map(([id, resourceName]) => [
    prefixCharacterId(id),
    resourceName,
]));

export const packConfig = {
    defaultEnabled: true,
    deferred: true,
    extensionConfig: 'lit_guozhanAllowed',
};

export const info = {
    name: 'lit_gz',
    mode: 'guozhan',
    connect: true,
    connectBanned: litInfo.connectBanned || [],
    characterSort: mapCharacterSort(litInfo.characterSort),
    character: merge(character, overrides.character),
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

import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';
import { createRolePack } from '../../tool/pack/rolePack.js';

// rebuild.mjs 自动扫描 roles/ 目录并更新此数组
const ROLE_FILES = ["hupan9","pengliying","wangsiyuan","zengpinjia9","zhengmohan9","zhongyutong9"];
const modules = await Promise.all(ROLE_FILES.map(fileName => import(`./roles/${fileName}.js`)));
const roles = createRolePack(ROLE_FILES, modules, 'lit_test');

// 由每个角色模块的 sort、title、intro 和 perfectPair 声明自动生成
export const characterSort = roles.createCharacterSort();
export const characterTitle = roles.collect('title');
export const characterIntro = roles.collect('intro');
export const perfectPair = roles.collect('perfectPair');
export const resourceNames = roles.createResourceNames();

// 无名杀角色包元数据：加载时分别合并到同名的 lib 字段。
// connectBanned：联机禁用角色；characterFilter：角色可用条件；
// characterSubstitute：角色的替身或特殊形态。空值表示当前未配置，保留为角色模块扩展点。
export const connectBanned = [];
export const characterFilter = roles.merge('characterFilter');
export const characterSubstitute = roles.merge('characterSubstitute');
export const characterReplace = roles.merge('characterReplace');

import { translate as metaTranslate, dynamicTranslate as metaDynamicTranslate, pinyins as metaPinyins } from './_meta.js';

export const character = roles.merge('character');
export const skill = roles.merge('skill');
export const translate = { ...metaTranslate, ...roles.merge('translate') };
export const dynamicTranslate = { ...metaDynamicTranslate, ...roles.merge('dynamicTranslate') };
export const pinyins = { ...metaPinyins, ...roles.merge('pinyins') };

export const packConfig = { defaultEnabled: false };

export const info = {
    name: 'lit_test',
    connect: false,
    connectBanned,
    characterSort,
    character,
    characterTitle,
    characterIntro,
    characterReplace,
    characterFilter,
    characterSubstitute,
    perfectPair,
    skill,
    translate,
    dynamicTranslate,
    pinyins,
};

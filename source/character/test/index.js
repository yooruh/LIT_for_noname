import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';
import { createRolePack } from '../../tool/pack/rolePack.js';

// 角色包设置
const PACK_NAME = 'lit_test';
const connectAllowed = false;
export const connectBanned = []; // 联机模式下禁用的角色

// rebuild.mjs 自动扫描 roles/ 目录并更新此数组
const ROLE_FILES = ["hupan9","pengliying","wangsiyuan","zengpinjia9","zhengmohan9","zhongyutong9"];
const modules = await Promise.all(ROLE_FILES.map(fileName => import(`./roles/${fileName}.js`)));
const roles = createRolePack(ROLE_FILES, modules, PACK_NAME);

// 加载角色包时的设置
export const packMeta = {
    resourceNames: roles.createResourceNames(),
    defaultEnabled: false,
};

// 由每个角色模块的 sort、title、intro 等声明自动生成
export const characterSort = roles.createCharacterSort();
export const characterTitle = roles.collect('title');
export const characterIntro = roles.collect('intro');

// 无名杀角色包元数据：加载时分别合并到同名的 lib 字段
export const character = roles.merge('character');
export const characterReplace = roles.merge('characterReplace');
// 按角色 ID 声明模式过滤函数；函数接收 mode，返回角色是否在该模式启用
export const characterFilter = roles.merge('characterFilter');
// 按角色 ID 声明替代形态，供角色技能在特殊时机切换皮肤或形态
export const characterSubstitute = roles.merge('characterSubstitute');
export const perfectPair = roles.collect('perfectPair');

export const skill = roles.merge('skill');

import { translate as metaTranslate, dynamicTranslate as metaDynamicTranslate, pinyins as metaPinyins } from './meta.js';

export const translate = { ...metaTranslate, ...roles.merge('translate') };
export const dynamicTranslate = { ...metaDynamicTranslate, ...roles.merge('dynamicTranslate') };
export const pinyins = { ...metaPinyins, ...roles.merge('pinyins') };

export const info = {
    name: PACK_NAME,
    connect: connectAllowed,
    connectBanned,
    character,
    characterSort,
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

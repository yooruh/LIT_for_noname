import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';
import { createRolePack } from '../../tool/pack/rolePack.js';

// 角色包设置
const PACK_NAME = 'lit';
const connectAllowed = true;
export const connectBanned = []; // 联机模式下禁用的角色

// rebuild.mjs 自动扫描 roles/ 目录并更新此数组
const ROLE_FILES = ["boshu","chenke","hujunwei","hupan","huxinyu","jianghaixu","lanboxun","linmiao","liuchenmu","liyang9","pangjianlong","qb","qianbaocan","rita","sunnan","wangcan9","wangrong","wuxiaoqi","yangxiangling","yutong","zengpinjia","zhangchi","zhangchi9","zhangqinyi","zhangshengjie","zhangshengjie9","zhengmohan","zhongyutong","zigao"];
const modules = await Promise.all(ROLE_FILES.map(fileName => import(`./roles/${fileName}.js`)));
const roles = createRolePack(ROLE_FILES, modules, PACK_NAME);

// 加载角色包时的设置
export const packMeta = {
    resourceNames: roles.createResourceNames(),
    defaultEnabled: true,
};

// 由每个角色模块的 sort、title、intro 等声明自动生成
export const characterSort = roles.createCharacterSort();
export const characterTitle = roles.collect('title');
export const characterIntro = roles.collect('intro');

// 无名杀角色包元数据：加载时分别合并到同名的 lib 字段。
export const character = roles.merge('character');
export const characterReplace = roles.merge('characterReplace');
// 按角色 ID 声明模式过滤函数；函数接收 mode，返回角色是否在该模式启用。
export const characterFilter = roles.merge('characterFilter');
// 按角色 ID 声明替代形态，供角色技能在特殊时机切换皮肤或形态。
export const characterSubstitute = roles.merge('characterSubstitute');
export const perfectPair = roles.collect('perfectPair');

import { skill as negClear, translate as negClearTranslate } from './_negClear.js';
import { skill as shengji, translate as shengjiTranslate } from './_shengji.js';
import { translate as metaTranslate } from './_meta.js';

export const skill = { ...negClear, ...shengji, ...roles.merge('skill') };
export const fullTranslate = {
    ...metaTranslate,
    ...negClearTranslate,
    ...shengjiTranslate,
    ...roles.merge('translate'),
};
export const simpleTranslate = { ...fullTranslate, ...roles.merge('simpleTranslate') };
export const dynamicTranslate = roles.merge('dynamicTranslate');
export const pinyins = roles.merge('pinyins');

// 没有动态翻译函数的技能使用简化描述，供需要动态翻译的界面统一读取。
for (const [key, infoText] of Object.entries(simpleTranslate)) {
    if (!key.endsWith('_info')) continue;
    dynamicTranslate[key.slice(0, -5)] ??= () => infoText;
}

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
    translate: fullTranslate,
    dynamicTranslate,
    pinyins,
};

import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';
import { createRolePack } from '../../tool/pack/rolePack.js';

// rebuild.mjs 自动扫描 roles/ 目录并更新此数组
const ROLE_FILES = ["boshu","chenke","hujunwei","hupan","huxinyu","jianghaixu","lanboxun","linmiao","liuchenmu","liyang9","pangjianlong","qb","qianbaocan","rita","sunnan","wangcan9","wangrong","wuxiaoqi","yangxiangling","zengpinjia","zhangchi","zhangchi9","zhangqinyi","zhangshengjie","zhangshengjie9","zhengmohan","zigao"];
const modules = await Promise.all(ROLE_FILES.map(fileName => import(`./roles/${fileName}.js`)));
const roles = createRolePack(ROLE_FILES, modules, 'lit');

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

import { skill as negClear, translate as negClearTranslate } from './_negClear.js';
import { skill as shengji, translate as shengjiTranslate } from './_shengji.js';
import { translate as metaTranslate } from './_meta.js';

export const character = roles.merge('character');
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

export const packConfig = { defaultEnabled: true };

export const info = {
    name: 'lit',
    connect: true,
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
    translate: fullTranslate,
    dynamicTranslate,
    pinyins,
};

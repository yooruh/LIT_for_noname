import { lib, game, ui, get, ai, _status } from '../../../../noname.js';
import * as Characters from './lit/lit_characters.js';
import { skill } from './lit/lit_skills.js';
import { fullTranslate, simpleTranslate, dynamicTranslate, pinyins } from './lit/lit_translate.js';

// 将简化后的技能内容插入dynamicTranslate
for (let key in simpleTranslate) {
    if (!key.endsWith('_info')) continue;
    const baseKey = key.slice(0, -5);

    // 仅当 dynamicTranslate 中不存在该函数时才插入
    if (baseKey in dynamicTranslate) continue;
    const infoText = simpleTranslate[key];
    dynamicTranslate[baseKey] = function () {
        return infoText;
    };
}

export let info = {
    name: 'lit',
    connect: true,
    connectBanned: Characters.connectBanned || [],

    characterSort: Characters.characterSort,
    character: Characters.character,
    characterTitle: Characters.characterTitle,
    characterIntro: Characters.characterIntro,
    characterReplace: Characters.characterReplace,
    characterFilter: Characters.characterFilter || {}, // 于precontent集中处理
    characterSubstitute: Characters.characterSubstitute,
    perfectPair: Characters.perfectPair,

    skill: skill,

    translate: fullTranslate,
    dynamicTranslate: dynamicTranslate,
    pinyins: pinyins,
};
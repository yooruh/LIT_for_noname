import { lib, game, ui, get, ai, _status } from '../../../../noname.js';
import { character, characterSort, connectBanned, characterTitle,
         characterIntro, characterReplace, characterFilter,
         characterSubstitute, perfectPair, skill,
         fullTranslate, simpleTranslate, dynamicTranslate, pinyins } from './lit/index.js';

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
    connectBanned: connectBanned || [],

    characterSort: characterSort,
    character: character,
    characterTitle: characterTitle,
    characterIntro: characterIntro,
    characterReplace: characterReplace,
    characterFilter: characterFilter || {},
    characterSubstitute: characterSubstitute,
    perfectPair: perfectPair,

    skill: skill,

    translate: fullTranslate,
    dynamicTranslate: dynamicTranslate,
    pinyins: pinyins,
};
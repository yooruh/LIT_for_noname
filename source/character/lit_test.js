import { lib, game, ui, get, ai, _status } from '../../../../noname.js';
import * as Characters from './test/test_characters.js';
import { skill } from './test/test_skills.js';
import { translate, dynamicTranslate, pinyins } from './test/test_translate.js';

export let info = {
	name:'lit_test',
	connect:false,
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
    
    translate: translate,
    dynamicTranslate: dynamicTranslate,
	pinyins: pinyins,
};
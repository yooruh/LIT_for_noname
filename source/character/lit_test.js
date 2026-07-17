import { lib, game, ui, get, ai, _status } from '../../../../noname.js';
import { character, characterSort, connectBanned, characterTitle,
         characterIntro, characterReplace, characterFilter,
         characterSubstitute, perfectPair, skill,
         translate, dynamicTranslate, pinyins } from './test/index.js';

export let info = {
	name:'lit_test',
	connect:false,
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

    translate: translate,
    dynamicTranslate: dynamicTranslate,
	pinyins: pinyins,
};
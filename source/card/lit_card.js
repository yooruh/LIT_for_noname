import { lib, game, ui, get, ai, _status } from '../../../../noname.js';
import { card, skill } from './lit_cardSkills.js';
import { translate, dynamicTranslate, pinyins } from './lit_cardTranslate.js';

export let info = {
	name: 'lit_card',
	connect: true,
	card: card,
	skill: skill,
	list: [
		['spade', 3, 'lit_diaoka'],
		['heart', 3, 'lit_diaoka'],
		['club', 3, 'lit_diaoka'],
		['diamond', 9, 'lit_diaoka'],
		['diamond', 3, 'lit_qianfanpai'],
	],
	translate: translate,
	dynamicTranslate: dynamicTranslate,
	pinyins: pinyins,
}
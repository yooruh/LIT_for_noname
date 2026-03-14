import { lib, game, ui, get, ai, _status } from '../../../../noname.js'
let basicPath = lib.init.getCurrentFileLocation(import.meta.url);
const basic = {
	path: basicPath.slice(0, basicPath.lastIndexOf('/source/tool/basic.js')),
	files: basicPath.slice(0, basicPath.lastIndexOf('extension')) + 'files/lit',
};
export default basic;

export function Styled(style, text) {
	switch (style) {
		case 'r': style = 'color:#ff4343'; break;	// 极难
		case 'g': style = 'color:#98fb98'; break;	// 易
		case 'b': style = 'color:LightBlue'; break; // 较易
		case 'y': style = 'color:Yellow'; break;	// 中
		case 'o': style = 'color:Orange'; break;	// 较难
		case 'p': style = 'color:Pink'; break;		// 难
		case 'O': style = 'opacity:0.5'; break;
	}
	return `<span style='${style}'>${text}</span>`;
}

export function poptipInit() {
	for (const packName in lib.lit.infopack) {
		if (!lib.lit.infopack) continue;
		const pack = lib.lit.infopack[packName];
		const characterList = Object.keys(pack.character);
		for (const charName of characterList) {
			const shownName = charName.match(/[\u4e00-\u9fa5\d]+|[A-Z][\s\S]*/g)?.join('') || '';
			lib.poptip.add({
				id: charName,
				name: shownName,
				type: "character",
				dialog: "characterDialog",
			});
		}
	}
	// mad，本体poptip又有bug
	// lib.poptip.add({
	// 	id: "lit_zhanshi_sub_tip",
	// 	name: "展示",
	// 	type: "skill",
	// 	info: `<span class='bluetext'>直到下回合结束，使用牌点数为<span style='color:Pink'>Y</span>的：<li>倍数，无次数限制；<li>约数，+1牌<br>（<span style='color:Pink'>Y</span>为使用的上一牌的点数）</span>`,
	// });
	lib.poptip.add({
		id: "lit_sameName",
		name: "同名",
		type: "character",
		info: `所有杀算同一种名字`,
	});
	lib.poptip.add({
		id: "lit_hejCard",
		name: "区域内的牌",
		type: "character",
		info: `指手牌、装备区的牌和判定区的牌`,
	});
	lib.poptip.add({
		id: "lit_damageCard",
		name: "伤害类卡牌",
		type: "character",
		info: `所有带damage标签的牌，一般包括：【杀】【决斗】【火攻】【闪电】【南蛮入侵】【万箭齐发】等`,
	});
	lib.poptip.add({
		id: "lit_basicTrickCard",
		name: "牌",
		type: "character",
		info: `基本牌或普通锦囊牌`,
	});
	lib.poptip.add({
		id: "lit_exDelayEquipCard",
		name: "牌",
		type: "character",
		info: `装备牌和延时锦囊牌除外`,
	});
}
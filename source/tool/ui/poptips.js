import { lib } from '../../../../../noname.js';

export function registerPoptips() {
	for (const packName in lib.lit.infopack) {
		if (!lib.lit.infopack) continue;
		const pack = lib.lit.infopack[packName];
		const characterList = Object.keys(pack.character);
		for (const charName of characterList) {
			const translatedName = pack.translate?.[charName] || lib.translate[charName];
			const prefix = pack.translate?.[`${charName}_prefix`] || lib.translate[`${charName}_prefix`] || '';
			const shownName = translatedName?.startsWith(prefix)
				? translatedName.slice(prefix.length)
				: translatedName || charName;
			lib.poptip.add({
				id: charName,
				name: shownName,
				type: "character",
				dialog: "characterDialog",
			});
		}
	}
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

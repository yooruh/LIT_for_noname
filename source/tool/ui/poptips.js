import { lib } from '../../../../../noname.js';

export function registerPoptips(characterPacks) {
	for (const entry of Object.values(characterPacks || {})) {
		const pack = entry.info;
		const characterList = Object.keys(pack.character);
		for (const charName of characterList) {
			const translatedName = pack.translate?.[charName] || lib.translate[charName];
			const shownName = translatedName || charName;
			lib.poptip.add({
				id: charName,
				name: shownName,
				type: "character",
				dialog: "characterDialog",
			});
		}
	}
	lib.poptip.add({
		id: "lit_sameCardName",
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
	lib.poptip.add({
		id: "lit_realCard",
		name: "实体牌",
		type: "character",
		info: `指真实存在的牌：多张牌当作单张牌来使用时，计算数量按照多张牌计算；无实体牌的虚拟牌，不计入数量`,
	});
	lib.poptip.add({
		id: "lit_sjInstantFull",
		name: "触发式升级",
		type: "character",
		info: `带此标签的升级技能在「开局就满足升级条件时」不会自动升级，而是改为获得“升级·使用”：可在每轮开始，或任意角色阵亡后手动选择是否触发这些升级`,
	});
	lib.poptip.add({
		id: "lit_sjInstantSimple",
		name: "触发",
		type: "character",
		info: `带此标签的升级技能在「开局就满足升级条件时」不会自动升级，而是改为获得“升级·使用”：可在每轮开始，或任意角色阵亡后手动选择是否触发这些升级`,
	});
}

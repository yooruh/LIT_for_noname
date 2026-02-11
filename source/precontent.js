import { lib, game, ui, get, ai, _status } from '../../../noname.js';
import { suiSet } from './tool/suiSet.js';
import basic from './tool/basic.js'

export let charPack = {
	lit: {
		translate: '叁岛世界',
	},
	lit_gz: {
		translate: '叁岛国战',
	},
	lit_test: {
		translate: '叁岛测试',
	},
};
export let cardPack = {
	lit_card: {
		translate: '叁岛世界',
	},
};

export let lib_lit = {
	infopack: {},
	effLock: {},
	// lit_neg为1：不可叠层 lit_neg为2：可叠层 lit_neg为3：可叠层且需要手动触发更新
	negSkills: ['lit_jiqing', 'lit_qianfan', 'lit_shouji', 'lit_mengying', 'lit_dongjie'],
	dkSkills: ['lit_zigaodebeixin', 'lit_zenggedeshouzhou', 'lit_qianlaoshidejialian', 'lit_pandejianpan', 'lit_zhongyutongdebiji', 'lit_liyangdeziyou',
		'lit_zhangxuandemp5', 'lit_yibandelajitong', 'lit_xiaohongtanver', 'lit_qbzhimao', 'lit_jiegededifengfenger', 'lit_caichendekuangre', 'lit_rongshaodejian'],
	dkCheck(skill) {
		let count = game.playerx ? game.playerx() : game.countPlayer();
		switch (skill) {
			case "lit_zigaodebeixin": case "lit_qbzhimao":
				return count > 4;
			case "lit_jiegededifengfenger": case "lit_caichendekuangre":
				return 2 < count && count < 6;
		}
		return lib.lit.dkSkills.includes(skill);
	},
	// 国战Key势力是否开启
	isGuozhanKeyEnabled() {
		return get.mode() === 'guozhan' && _status.forceKey;
	},
	// 势力是否属于广义Key势力
	isBigGroupKey(group) {
		return ['three', 'nine', 'key'].includes(group);
	},
	isSameGroup(player, targetGroup) {
		if (player.group === targetGroup) return true;
		if (!this.isGuozhanKeyEnabled()) return false;
		// 国战Key势力模式下的跨势力判定
		return this.isBigGroupKey(targetGroup) && this.isBigGroupKey(player.group || player.groupInGuozhan);
	},
	shengjiFilter(skill) {
		return skill !== "lit_shengji" && skill.startsWith("lit_shengji") && !skill.startsWith("lit_shengji_");
	},
};

export async function precontent(config, pack) {
	if (!lib.config.suiSetBandList) {
		lib.config.suiSetBandList = {}
	}
	if (!lib.config.mimaList) {
		lib.config.mimaList = []
	}

	// 将公共变量暴露到lib全局
	lib.lit = lib_lit;

	// 加入势力
	lib.init.css(`${basic.path}/style/css`, 'extension');
	game.addGroup('nine', '九', '九班', {});
	game.addGroup('three', '叁', '叁岛', {});
	lib.groupnature.nine = 'nine';
	lib.groupnature.three = 'three';
	// 编写前缀
	lib.namePrefix.set("9", {
		getSpan: () => {
			const span = document.createElement("span"),
				style = span.style;
			style.writingMode = style.webkitWritingMode = "horizontal-tb";
			style.fontFamily = "MotoyaLMaru";
			style.transform = "scaleY(0.85)";
			span.style.color = "#ffff24";
			span.textContent = "9";
			return span.outerHTML;
		},
	});
	for (let packName in charPack) {
		let { info } = await import(`./character/${packName}.js`);
		if (!info) continue;
		if (!game.getExtensionConfig('叁岛世界', 'lit_guozhanAllowed') && packName === 'lit_gz') continue;
		if (info.mode && !Array.isArray(info.mode)) info.mode = [info.mode];
		for (let name in info.character) {
			// 角色配置使用实际ID进行设置
			if (info.mode) {
				lib.characterFilter[name] = mode => info.mode.includes(mode);
			}

			// 角色文件引用使用修正ID
			let char = info.character[name];
			if (name.startsWith('gz_')) name = name.slice(3);
			// 从角色名中移除中文字符和首个大写字母及其之后的字符
			const cleanName = name.replace(/[\u4e00-\u9fa5]/g, '').replace(/[A-Z].*$/, '');
			char.img = `${basic.path}/image/character/${cleanName}.png`;
			char.skinPath = `${basic.path}/image/skin/${cleanName}/`;
			if (!char.dieAudios) char.dieAudios = [];
			char.dieAudios.push(`${basic.path}/audio/die/${cleanName}.mp3`);
		}
		for (let skill in info.skill) {
			let skill_info = info.skill[skill];
			if ('audio' in skill_info && typeof skill_info.audio == 'number') {
				skill_info.audio = `${basic.path}/audio/skill:${skill_info.audio}`;
			}
		}
		// 强度排行
		// lib.arenaReady.push(function () {
		// 	for (let name in lib.characterPack[info.name]) {
		// 		for (let rarity of ['junk', 'common', 'rare', 'epic', 'legend']) {//废物，普通，精品，史诗，传说
		// 			if (lib.characterPack[info.name][name][4].includes(rarity)) {
		// 				lib.rank.rarity[rarity].add(name);
		// 				break;
		// 			}
		// 		}
		// 	}
		// });

		lib.lit.infopack[info.name] = info;
		if (!info.mode) {
			game.import('character', () => info);
			// lib.config.all.characters.push(info.name); // 本体自己都没修好all.characters对武将包的管理，那还说啥了
		}
		if (!game.getExtensionConfig('叁岛世界', `${info.name}_character_pack`)) {
			if (!info.name.endsWith('_test')) {
				lib.config.characters.add(info.name);
				game.saveConfig('characters', lib.config.characters);
				game.saveExtensionConfig('叁岛世界', `${info.name}_character_pack`, true);
			}
		}
		lib.translate[info.name + '_character_config'] = charPack[packName].translate;
	};
	for (let packName in cardPack) {
		let { info } = await import(`./card/${packName}.js`);
		if (!info) continue;
		for (let skill in info.skill) {
			let skill_info = info.skill[skill];
			if ('audio' in skill_info && typeof skill_info.audio == 'number') {
				skill_info.audio = `${basic.path}/audio/skill:${skill_info.audio}`;
			}
		}
		game.import('card', () => info);
		// lib.config.all.cards.push(info.name);
		if (!game.getExtensionConfig('叁岛世界', `${info.name}_card_pack`)) {
			if (!info.name.endsWith('_test')) {
				lib.config.cards.add(info.name);
				game.saveConfig('cards', lib.config.cards);
				game.saveExtensionConfig('叁岛世界', `${info.name}_card_pack`, true);
			}
		}
		lib.translate[info.name + '_card_config'] = cardPack[packName].translate;
	};

	if (!lib.config['extension_叁岛世界_fix_onlineFixCancel']) {
		const useJs = [
			'chooseCharacterOL', 'content', 'function', 'modeset', 'player', 'skillSet', 'video',
		];
		suiSet.addImport(`${basic.path}/script/precontent.js`, () => {
			useJs.forEach(m => suiSet.addImport(`${basic.path}/script/${m}.js`))
			lib.init.css(`${basic.path}/style/css`, 'cards')
		});
		suiSet.config = this.config;
	}
	// game.runAfterExtensionLoaded('叁岛世界', () => {});
}
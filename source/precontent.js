import { lib, game, ui, get, ai, _status } from '../../../noname.js';
import { loaderRuntime, setOnlineFixConfig } from './onlineFix/runtime.js';
import { extensionPath } from './tool/utils/paths.js';
import { loadPackRegistry } from './tool/pack/registry.js';
import { CHARACTER_PACK_FILES, CARD_PACK_FILES } from './tool/pack/manifest.js';

export const charPack = {};
export const cardPack = {};

export const lib_lit = {
	sdhh_connectName: '../extension/叁岛世界/source/mode/sandaohuanhua',
	infopack: {},
	deferredCharacterPacks: {},
	effLock: {},
	// lit_neg为1：不可叠层；2：可叠层；3：可叠层且需要手动触发更新
	negSkills: ['lit_jiqing', 'lit_qianfan', 'lit_shouji', 'lit_mengying', 'lit_dongjie'],
	dkSkills: ['lit_zigaodebeixin', 'lit_zenggedeshouzhou', 'lit_qianlaoshidejialian', 'lit_pandejianpan', 'lit_zhongyutongdebiji', 'lit_liyangdeziyou',
		'lit_zhangxuandemp5', 'lit_yibandelajitong', 'lit_xiaohongtanver', 'lit_qbzhimao', 'lit_jiegededifengfenger', 'lit_caichendekuangre', 'lit_rongshaodejian'],
	dkCheck(skill) {
		const count = this.getPlayers();
		switch (skill) {
			case 'lit_zigaodebeixin':
			case 'lit_qbzhimao':
				return count > 4;
			case 'lit_caichendekuangre':
				return count > 2;
			case 'lit_jiegededifengfenger':
				return 2 < count && count < 6 && !get.mode().includes('sandaohuanhua');
		}
		return this.dkSkills.includes(skill);
	},
	getPlayers() {
		if (game.playerx) return game.playerx().length;
		if (get.playerx) return get.playerx().length;
		return game.countPlayer();
	},
	isShengjiSkill(skill) {
		return skill !== 'lit_shengji' && skill.startsWith('lit_shengji') && !skill.startsWith('lit_shengji_');
	},
	isGuozhanKeyEnabled() {
		return get.mode() === 'guozhan' && _status.forceKey;
	},
	isBigGroupKey(group) {
		return ['three', 'nine', 'key'].includes(group);
	},
	isSameGroup(player, targetGroup) {
		if (player.group === targetGroup) return true;
		if (!this.isGuozhanKeyEnabled()) return false;
		return this.isBigGroupKey(targetGroup) && this.isBigGroupKey(player.group || player.groupInGuozhan);
	},
};

async function registerSandaohuanhua() {
	if (game.getExtensionConfig('叁岛世界', 'lit_sdhhBanned')) return;
	const { default: sandaohuanhuaMode } = await import('./mode/sandaohuanhua.js');
	const modeConfig = sandaohuanhuaMode();
	game.addMode(lib.lit.sdhh_connectName, modeConfig, {
		translate: '叁岛幻化',
		extension: '叁岛世界',
	});
	lib.mode[lib.lit.sdhh_connectName].config = modeConfig.config || {};
	lib.mode[lib.lit.sdhh_connectName].connect = modeConfig.connect || {};
}

function registerGroups() {
	lib.init.css(`${extensionPath}/style/css`, 'extension');
	game.addGroup('nine', '九', '九班', {});
	game.addGroup('three', '叁', '叁岛', {});
	lib.groupnature.nine = 'nine';
	lib.groupnature.three = 'three';
	lib.namePrefix.set('9', {
		getSpan: () => {
			const span = document.createElement('span');
			const style = span.style;
			style.writingMode = style.webkitWritingMode = 'horizontal-tb';
			style.fontFamily = 'MotoyaLMaru';
			style.transform = 'scaleY(0.85)';
			style.color = '#ffff24';
			span.textContent = '9';
			return span.outerHTML;
		},
	});
}

function registerOnlineFix(context) {
	if (lib.config['extension_叁岛世界_fix_onlineFixCancel']) return;
	const modules = ['content', 'function', 'modeset', 'player', 'video'];
	loaderRuntime.addImport(`${extensionPath}/source/onlineFix/precontent.js`, () => {
		modules.forEach(module => loaderRuntime.addImport(`${extensionPath}/source/onlineFix/${module}.js`));
		lib.init.css(`${extensionPath}/style/css`, 'cards');
	});
	setOnlineFixConfig(context.config);
}

export async function precontent(config, pack) {
	lib.config.suiSetBandList ??= {};
	lib.config.mimaList ??= [];
	lib.lit = lib_lit;

	await registerSandaohuanhua();
	registerGroups();

	await loadPackRegistry('character', CHARACTER_PACK_FILES, charPack, lib.lit.deferredCharacterPacks, lib.lit.infopack);
	await loadPackRegistry('card', CARD_PACK_FILES, cardPack, {}, {});

	registerOnlineFix(this);
}

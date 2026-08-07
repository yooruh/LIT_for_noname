import { lib, game, ui, get, ai, _status } from '../../../noname.js';
import { loaderRuntime, setOnlineFixConfig } from './onlineFix/runtime.js';
import { extensionPath } from './tool/utils/paths.js';
import { themeManager } from './tool/ui/themeManager.js';
import { loadPackRegistry } from './tool/pack/registry.js';
import { CHARACTER_PACK_FILES, CARD_PACK_FILES } from './tool/pack/manifest.js';

export const lib_lit = {
	// AI 防重试守卫占位（content 阶段由 tool/ai/aiGuard.js 的真实实现覆盖）
	aiGuard: {
		blocked: () => false,
		record: () => { },
	},
	sdhh_connectName: '../extension/叁岛世界/source/mode/sandaohuanhua',
	// precontent 创建、content 消费并删除的角色包注册表。
	// 同时服务角色提示和需要延后注册的国战角色包，避免维护多个派生索引。
	characterPacks: {},
	effLock: {},
	// lit_neg为1：不可叠层；2：可叠层；3：可叠层且需要手动触发更新
	negSkills: ["lit_diaogui","lit_dongjie","lit_jiqing","lit_langen","lit_mengying","lit_qianfan","lit_shouji"],
	dkSkills: ["lit_zigaodebeixin","lit_zenggedeshouzhou","lit_qianlaoshidejialian","lit_pandejianpan","lit_zhongyutongdebiji","lit_liyangdeziyou","lit_zhangxuandemp5","lit_yibandelajitong","lit_xiaohongtanver","lit_qbzhimao","lit_jiegededifengfenger","lit_caichendekuangre","lit_rongshaodejian"],
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

function registerGroups() {
	lib.init.css(`${extensionPath}/style/css`, 'materialTheme');
	lib.init.css(`${extensionPath}/style/css`, 'extension');
	game.addGroup('nine', '九', '九班', {});
	game.addGroup('three', '叁', '叁岛', {});
	game.addGroup('one', '一', '一班', {});
	lib.groupnature.nine = 'nine';
	lib.groupnature.three = 'three';
	lib.groupnature.one = 'one';
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
	themeManager.init();

	registerGroups();
	await registerSandaohuanhua();

	// 角色包支持延迟注册
	lib.lit.characterPacks = await loadPackRegistry(CHARACTER_PACK_FILES);
	// 卡牌包立即注册
	await loadPackRegistry(CARD_PACK_FILES, 'card');

	registerOnlineFix(this);
}

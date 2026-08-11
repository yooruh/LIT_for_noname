import { lib, game, ui, get, ai, _status } from '../../../noname.js';
import { registerPoptips } from './tool/ui/poptips.js';
import { registerCharacterPack } from './tool/pack/registry.js';
import { aiGuard, aiGuardReset } from './tool/ai/aiGuard.js';

export const updateContent = [
	{ type: "players", data: [
		"lit_yutong雨桐",
		"lit_zhongyutong钟雨桐"
	] },
	{
		type: "text", addText: true, data: `<div style="text-align: left;font-size: 16px;">
① 新增角色 ${get.poptip("lit_yutong雨桐")} 和隐藏角色 ${get.poptip("lit_zhongyutong钟雨桐")}；<br>
② 修改了升级机制，现在主公开局即升级。基于此，${get.poptip("lit_ritaRita")} ${get.poptip("lit_zhangshengjie张盛杰")} ${get.poptip("lit_lanboxun兰柏勋")}的技能发生了调整；<br>
③ 修改了AI的底层工具，集中优化部分角色的结算效果和AI的出牌、选牌与目标判断；<br>
④ 优化“叁岛幻化”模式：新增单机开局选位功能，完善规则说明，同时改善联机状态同步、录像回放体验；<br>
⑤ 优化了内置的UI模块，部分采用了Material Design 3，现在的UI支持浅色和深色主题，且会自动跟随系统主题；<br>
⑥ 优化扩展内置的联机修改功能和在线更新功能，改善起始摸牌、手牌更换等联机流程；适应网络波动，同时让手机端也支持在线更新；<br>
⑦ 重构角色包和卡牌包的加载结构，将角色配置和技能等文件按角色拆分；统一版本、更新日志与在线更新清单的构建流程，便于后续维护与发布。<br>
<hr>
<li>祝假期愉快</li>
<li>可在「选项」-「扩展」-「叁岛世界」中查看帮助文档<span style='opacity: 0.315;color:Red'> =)</span></li>
</div>`
	}
];

export async function content(config, pack) {
	lib.extensionPack['叁岛世界'].author = "一个月惹";
	lib.extensionPack['叁岛世界'].version = game.getExtensionConfig('叁岛世界', 'version');
	game.showExtensionChangeLog(updateContent, '叁岛世界');

	// AI 防重试守卫：阻止 AI 反复发动同一主动技导致死循环。
	// 在 content 阶段挂载（模式已加载后），避免模式覆写 lib.skill.global 把注册冲掉。
	lib.lit.aiGuard = aiGuard;
	lib.skill.lit_aiGuardReset = aiGuardReset;
	if (!lib.skill.global.includes('lit_aiGuardReset')) game.addGlobalSkill('lit_aiGuardReset');

	const characterPacks = lib.lit.characterPacks || {};
	// 注册自定义poptip
	registerPoptips(characterPacks);

	// 将角色加入国战模式
	if (get.mode() === 'guozhan' && game.getExtensionConfig('叁岛世界', 'lit_guozhanAllowed')) {
		const entry = characterPacks.lit_gz;
		const pack = entry.info;
		registerCharacterPack(pack, entry.displayName);
		// 在国战模式中启用
		if (lib.config.characters.includes('lit_gz')) {
			_status.forceKey = true; // 启用键势力
			lib.characterGuozhanFilter.add(pack.name);
		}

		let info = (await import('./card/lit_card/index.js')).info;
		if (lib.cardPack.guozhan && lib.config.cards.includes(info.name)) {
			for (let i in info.card) {
				lib.cardPack.guozhan.add(i);
			}
			lib.guozhanPile.addArray(info.list);
			lib.guozhanPile_yingbian.addArray(info.list);
		}
		// const lit_pack = Object.keys(lib.characterPack.lit).reduce((acc, key) => {
		// 	let char = lib.characterPack.lit[key];
		// 	char[1] = 'three';
		// 	if(lib.translate[`${key}_prefix`])lib.translate[`gz_${key}_prefix`] = lib.translate[`${key}_prefix`];
		// 	switch(key){
		// 		case 0:break;
		// 	}
		// 	acc[`gz_${key}`] = char;
		// 	return acc;
		// }, lib.characterPack.mode_guozhan);
		// lib.characterPack.mode_guozhan = lit_pack;
	}
	// 联机模式
	if (get.mode() === 'connect' && !game.getExtensionConfig('叁岛世界', 'lit_sdhhBanned')) {
		lib.config.all.stockmode.add(lib.lit.sdhh_connectName);
	}
	// 乱斗模式
	if (lib.brawl) {
		let { info } = await import(`./mode/sandaohuanhua_brawl.js`);
		if (info) lib.brawl.sandaohuanhua = info;
	}
	// 角色包完成消费后，删除唯一的跨阶段临时注册表接口
	delete lib.lit.characterPacks;
}
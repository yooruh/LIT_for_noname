import { lib, game, ui, get, ai, _status } from '../../../noname.js';
import { registerPoptips } from './tool/ui/poptips.js';
import { registerCharacterPack } from './tool/pack/registry.js';

// 记得改help.html
export const updateContent = [
	{ type: "players", data: [] },
	{
		type: "text", addText: true, data: `<div style="text-align: left;font-size: 16px;">
① 优化“叁岛幻化”模式：调整任务、灵力获取与击败奖励，优化技能选项刷新，完善死战阶段规则；同时改善联机状态同步、录像恢复及任务框拖动体验；<br>
② 集中优化角色AI的出牌、选牌与目标判断，涉及近乎全体角色，包括“叁岛测试”角色；<br>
③ 优化扩展内置的联机修改功能和在线更新功能，改善起始摸牌、手牌更换等联机流程，同时让手机端也支持在线更新；<br>
④ 重构叁岛、国战及测试角色包的加载结构，将叁岛与测试技能按角色拆分；统一版本、更新日志与在线更新清单的构建流程，便于后续维护与发布。<br>
<hr>
<li>可在「选项」-「扩展」-「叁岛世界」中查看帮助文档<span style='opacity: 0.315;color:Red'> =)</span></li>
</div>`
	}
];

export async function content(config, pack) {
	lib.extensionPack['叁岛世界'].author = "一个月惹";
	lib.extensionPack['叁岛世界'].version = game.getExtensionConfig('叁岛世界', 'version');
	game.showExtensionChangeLog(updateContent, '叁岛世界');

	// 注册自定义poptip
	registerPoptips();

	// 将角色加入国战模式
	if (get.mode() === 'guozhan' && game.getExtensionConfig('叁岛世界', 'lit_guozhanAllowed')) {
		const entry = lib.lit.deferredCharacterPacks.lit_gz;
		if (!entry) throw new Error('叁岛国战角色包未完成预加载');
		const pack = entry.info;
		registerCharacterPack(pack, entry.displayName);
		// 在国战模式中启用
		if (lib.config.characters.includes('lit_gz')) {
			_status.forceKey = true; // 启用键势力
			lib.characterGuozhanFilter.add(pack.name);
		}

		let info = (await import(`./card/lit_card.js`)).info;
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
	// 角色提示与延迟国战包完成消费后，删除仅供加载阶段使用的数据。
	delete lib.lit.infopack;
	delete lib.lit.deferredCharacterPacks;
}
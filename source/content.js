import { lib, game, ui, get, ai, _status } from '../../../noname.js';
import { poptipInit } from './tool/basic.js';

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
	poptipInit();

	// 将角色加入国战模式
	if (get.mode() === 'guozhan' && game.getExtensionConfig('叁岛世界', 'lit_guozhanAllowed')) {
		// 导入菜单栏
		let pack = lib.lit.infopack['lit_gz'];
		for (const name in pack) {
			const content = pack[name];
			switch (name) {
				case "character":
					for (const charname in content) {
						const character = content[charname];
						// 将武将技能加入技能列表
						for (const skill of character.skills) {
							lib.skilllist.add(skill);
						}
						if (lib.character[charname] != null) continue;
						lib.character[charname] = character;
					}
					break;
				case "skill":
					for (const skillname in content) {
						const skill = content[skillname];
						lib.skill[skillname] ??= skill;
					}
					break;
				default:
					if (typeof content !== 'object' || Array.isArray(content)) break;
					for (const key in content) {
						lib[name][key] ??= content[key];
					}
			}
		}
		lib.characterPack[pack.name] = pack.character;
		lib.translate[`${pack.name}_character_config`] = '叁岛国战';
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
	// 无论是否载入，删掉公开接口
	delete lib.lit.infopack;
}
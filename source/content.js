import { lib, game, ui, get, ai, _status } from '../../../noname.js';
import { poptipInit } from './tool/basic.js';

// 记得改help.html
export const updateContent = [
	{ type: "players", data: ['lit_zhangshengjie张盛杰'] },
	{
		type: "text", addText: true, data: `<div style="text-align: left;font-size: 16px;">
① 准备加入角色“羲烨”“雨桐”，敬请期待；<br>
② 修改了${get.poptip("lit_zhangshengjie9张盛杰")} ${get.poptip("lit_zhangqinyi张钦奕")} ${get.poptip("lit_zengpinjia曾品嘉")} ${get.poptip("lit_jianghaixu蒋海旭")}的技能
<li>重做了${get.poptip("lit_zhangshengjie张盛杰")}；</li>
③ 现在，选将结束后的局内技能描述会更简洁，而选将之前的技能描述会更完善，如果产生歧义，请以后者为标准！<br>
④ “叁岛测试”会持续更新“九班杀”“叁岛篇”角色，以实验技能和代码兼容为主，强度和AI暂不过度处理；<br>
⑤ “叁岛幻化”已被单独提取为独立模式，且支持线上联机游玩，位于乱斗模式的“叁岛幻化”将暂停更新；<br>
⑥ 对无名杀1.11.2进行了些许适配，未来将调整额外功能以支持重构后的无名杀（可能因此放弃对1.11.2及之前的版本支持）<br>
<hr>
<li>开学了~</li>
<li>可在「选项」-「扩展」-「叁岛世界」中查看帮助文档<span style='opacity: 0.315;color:Red'> =)</span></li>
</div>`
	}];

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
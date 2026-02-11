import { lib, game, ui, get, ai, _status } from '../../../noname.js';

export async function content(config, pack) {
	lib.extensionPack['叁岛世界'].author = "一个月惹";
	lib.extensionPack['叁岛世界'].version = game.getExtensionConfig('叁岛世界', 'version');
	// 记得改help.js
	let str = [
		{ type: "players", data: ['lit_hupan9胡畔', 'lit_zhengmohan9郑墨翰', 'lit_zengpinjia9曾品嘉', 'lit_wangsiyuan王思媛', 'lit_zhongyutong9钟雨桐', 'lit_pengliying彭丽颖'] },
		{
			type: "text", addText: true, data: `<p style="text-align: left;">
① 加入角色：${get.poptip("lit_wangrong王荣")} 以及吊卡技能：${get.poptip("lit_caichendekuangre")}、${get.poptip("lit_rongshaodejian")}；<br>
② 调整了${get.poptip("lit_yangxiangling杨湘铃")}、${get.poptip("lit_hupan胡畔")}、${get.poptip("lit_zhengmohan郑墨翰")}、${get.poptip("lit_qianbaocan钱保灿")}的强度及部分技能的AI逻辑；<br>
③ 叁岛国战：重构导入逻辑（由于本体国战模式重做，故暂停叁岛国战的更新）；<br>
④ “叁岛测试”角色包上线：其中的6个《九班杀》老角色默认关闭，需手动开启。注意：强度、AI、兼容性均未完成优化，极可能存在Bug；<br>
⑤ 引入了新UI以代替部分老代码，加入“在线更新扩展（测试，暂时仅支持电脑版）”“应用推荐的无名杀全局设置”功能。此外，本体已加入名词解释超链接和复活事件，本扩展不再额外重复；<br>
⑥ 部分角色新增可选皮肤，以前的皮肤用AI塑炼了一下，清晰度↗，占用空间↘<br>
<li style="text-align: left;">寒假！</li>
<li style="text-align: left;">可在「选项」-「扩展」-「叁岛世界」中查看帮助文档<span style='opacity: 0.315;color:Red'> =)</span></li></p>`
		}];
	game.showExtensionChangeLog(str, '叁岛世界');

	// 角色及其他杂项的poptip注册
	for (const packName in lib.lit.infopack) {
		const pack = lib.lit.infopack[packName];
		const characterList = Object.keys(pack.character);
		for (const charName of characterList) {
			const shownName = charName.match(/[\u4e00-\u9fa5\d]+|[A-Z][\s\S]*/g)?.join('') || '';
			get.poptip({
				id: charName,
				name: shownName,
				type: "character",
				dialog: "characterDialog",
			});
		}
	}
	get.poptip({
		id: "lit_zhanshi_sub",
		name: "展示",
		type: "skill",
		info: `<span class='bluetext'>直到下回合结束，使用牌点数为<span style='color:Pink'>Y</span>的：<li>倍数，无次数限制；<li>约数，+1牌<br>（<span style='color:Pink'>Y</span>为使用的上一牌的点数）</span>`,
	})

	// 将角色加入国战模式
	if (get.mode() === 'guozhan' && game.getExtensionConfig('叁岛世界', 'lit_guozhanAllowed')) {
		if (lib.config.characters.includes('lit_gz')) {
			_status.forceKey = true; // 启用键势力
		}
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
		lib.characterGuozhanFilter.add(pack.name);
		lib.translate[`${pack.name}_character_config`] = '叁岛国战';


		let info = (await import(`./card/lit_card.js`)).info;
		if (lib.cardPack.guozhan && lib.config.cards.includes(info.name)) {
			for (let i in info.card) {
				lib.cardPack.guozhan.push(i);
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
	// 乱斗模式
	if (lib.brawl) {
		let { info } = await import(`./mode/sandaohuanhua.js`);
		if (info) lib.brawl.sandaohuanhua = info;
	}
	// 无论是否载入，删掉公开接口
	delete lib.lit.infopack;
}
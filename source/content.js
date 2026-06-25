import { lib, game, ui, get, ai, _status } from '../../../noname.js';
import { poptipInit } from './tool/basic.js';

// 记得改help.html
export const updateContent = [
	{ type: "players", data: ['lit_sunnan孙楠'] },
	{
		type: "text", addText: true, data: `<div style="text-align: left;font-size: 16px;">
① 临时更新，用于测试平衡性与检验新版本适配状况，正式更新约莫会在7月中下旬；<br>
② 加入了新角色 ${get.poptip("lit_sunnan孙楠")}；<br>
③ 调整了：<br>
${get.poptip("lit_zhangshengjie张盛杰")}（优化了心毅因场上缺少判定牌导致后续爆发不足，伤害低的问题）、<br>
${get.poptip("lit_boshu菠树")}（增加过牌量，并且将闺蜜效果调整得更加贴合易碎的需要）、<br>
${get.poptip("lit_ritaRita")}（优化补牌能力）、<br>
${get.poptip("lit_hupan胡畔")}（优化升级后的技能体验，避免两个技能联动过低，设计割裂且缺乏爽感）、<br>
${get.poptip("lit_huxinyu胡馨予")}（技能组变动较大，主要从被动弃牌改为主动攻击，将0手牌的技能效果转为次要位置）、<br>
${get.poptip("lit_hujunwei胡峻玮")}（优化卖血体验，加强其控制地位）、<br>
${get.poptip("lit_qianbaocan钱保灿")}（避免过多判定打断技能体验，优化升级方向，将其定位放得更明确）；<br>
④ 由于更新时间较紧张，故叁岛国战的进一步适配，以及叁岛测试的转正要延后了；<br>
<hr>
<li>总之还是在端午后一周赶出来了~</li>
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
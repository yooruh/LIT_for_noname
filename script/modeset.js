import { lib, game, ui, get, ai, _status } from '../../../noname.js';
import { canIn, getPlayer } from './useFunction.js'
import { suiSet } from "../source/tool/suiSet.js";
lib.config.extensionsCopy = lib.config.extensions.filter(e => {
	return !suiSet.igextension.includes(e) && lib.config[`extension_${e}_enable`]
})

//身份场
suiSet.comboObject(lib.mode.identity.connect, {
	connect_identity_mode: {
		item: {
			kangjin: '<span style="color:red;">抗金</span>',
			Wechat: '<span style="color:red;">自选技能</span>',
			"4v4": '<span style="color:red;">四反三忠一主</span>',
			neimin: '<span style="color:red;">内替换为民（前提是有民）</span>',
			// 'whlw':'<span style="color:red;">文和乱武</span>',
			'clone': '<span style="color:red;">全选一样</span>',
			'skill': '<span style="color:red;">随机技能</span>',
			// 'tafang':'<span style="color:skyblue;">塔防</span>',
		},
		name: '<span style="color:red;">游戏模式</span>',
	},
	// connect_player_number:{
	//	 item:Array.from({length:10},(_, i)=>String(i)),
	// },
	// connect_identity_tip:{
	//	 name: '<span style="color:skyblue;font-weight:700;">右键点击或手机上长按选项可以有提示</span>',
	//	 init: '1',
	//	 frequent: true,
	//	 restart: true,
	//	 item: {
	//		 '1': ' '
	//	 }
	// },
	connect_identity_Selects: {
		name: '<span style="color:red;">玩家选将框</span>',
		frequent: true,
		init: 'no1',
		item: {
			"no1": '正常',
			"10": '十个',
			"20": '二十个',
			"30": '三十个',
			"40": '四十个',
			"50": '五十个',
			"60": '六十个',
			"70": '七十个',
			"80": '八十个',
			"90": '九十个',
			"100": '一百个',
			"11": '<span style="color:red;">自适应</span>',
			'dianjiang': '自由点将'
		},
		restart: true,
		intro: '开局选将的时候每个人多少个选将框？<br>选一个数，武将开的少不建议选太多！！！！<br>正常：就是原版的样子，好像每个人五个吧<br>自适应：比如开了400个武将，有8个人，那每个人就是400/8=50个'
	},
	connect_identity_AplayerLevel: {
		name: '<span style="color:red;">人机额外加上限（点将模式才能用）</span>',
		frequent: true,
		init: 'no',
		item: {
			"no": '正常',
			"1": '1',
			"2": '2',
			"3": '3',
			"4": '4',
			"5": '5',
			"6": '6',
			"7": '7',
			"8": '8',
			"9": '9',
			"10": '10',
		},
		restart: true,
	},
	connect_identity_playsLevel: {
		name: '<span style="color:red;">普通玩家机额外加上限（点将模式才能用）</span>',
		frequent: true,
		init: 'no',
		item: {
			"no": '正常',
			"1": '1',
			"2": '2',
			"3": '3',
			"4": '4',
			"5": '5',
			"6": '6',
			"7": '7',
			"8": '8',
			"9": '9',
			"10": '10',
		},
		restart: true,
	},
	connect_identity_more_time: {
		name: '<span style="color:red;">选将时间</span>',
		frequent: true,
		item: {
			'10': '10秒',
			'15': '15秒',
			'30': '30秒',
			'60': '60秒',
			'90': '90秒',
		},
		init: lib.configOL.choose_timeout || '30'
	},
	connect_identit_toushi: {
		name: '<span style="color:red;">玩家透视（点将模式才能用）</span>',
		intro: '所有玩家获得金睛，人机没有',
		init: false,
		frequent: true,
	},
	connect_identity_neiReplaceZhong: {
		name: '<span style="color:red;">内奸替换为忠臣</span>',
		intro: '大家都是大汉的好子民',
		init: false,
		frequent: true,
	},
	connect_identity_tafangRound: {
		name: '<span style="color:red;">防守轮</span>',
		frequent: true,
		item: {
			'5': '5',
			'10': '10',
			'15': '15',
			'20': '20',
		},
		init: "10"
	}
})

//斗地主
// suiSet.comboObject(lib.mode.doudizhu.connect, {
// 	// connect_doudizhu_mode: {
// 	//	 item: {
// 	//		 double: '<span style="color:red;">双地主农民</span>',
// 	//	 },
// 	//	 name: '<span style="color:red;">游戏模式</span>',
// 	// },
// 	connect_player_number: {
// 		item: {
// 			"6": "6"
// 		},
// 		name: '<span style="color:red;">玩家数</span>',
// 		frequent: true,
// 		init: '6'
// 	},
// 	connect_doudizhu_select: {
// 		name: '<span style="color:red;">玩家选将框</span>',
// 		frequent: true,
// 		init: 'no1',
// 		item: {
// 			"no1": '正常',
// 			"10": '十个',
// 			"20": '二十个',
// 			"30": '三十个',
// 			"40": '四十个',
// 			"50": '五十个',
// 			"60": '六十个',
// 			"70": '七十个',
// 			"80": '八十个',
// 			"90": '九十个',
// 			"100": '一百个',
// 			"11": '<span style="color:red;">自适应</span>',
// 		},
// 		restart: true,
// 		intro: '开局选将的时候每个人多少个选将框？<br>选一个数，武将开的少不建议选太多！！！！<br>正常：就是原版的样子，好像每个人五个吧<br>自适应：比如开了400个武将，有8个人，那每个人就是400/8=50个'
// 	},
// 	// connect_doudizhu_replaceHandCard:{
// 	//	 name: '<span style="color:red;">手气卡次数</span>',
// 	//	 frequent: true,
// 	//	 init: '2',
// 	//	 item:Array.from({length:100},(_, i)=>String(1+(i))),
// 	//	 restart: true,
// 	// },
// 	// connect_doudizhu_mode:{
// 	//	 item:{
// 	//		 // Wechat:'<span style="color:red;">微信</span>',
// 	//		 // Super:'<span style="color:red;">超级</span>',
// 	//	 }
// 	// }
// })

//其他方法
const lmsi = lib.message.server.init
suiSet.comboObject(lib.message.server, {
	initAvatar(id, avatar) {
		game.broadcastAll((player, avatar, nickname) => {
			const character = lib.character[avatar] || ['male', 'qun', 4, [], []]
			const id = nickname + player.playerid
			lib.character[id] = character.slice()
			lib.character[id][2] = 4
			lib.character[id][3] = []
			if (!lib.character[id][4]) {
				lib.character[id][4] = []
			}
			lib.character[id][4].remove('hiddenSkill')
			lib.character[id][4].push(`character:${avatar}`)
			lib.translate[id] = nickname.replace('※', '')
			player.init(id)
			player.update()
		}, lib.playerOL[id], avatar, this.nickname)
	},
	init(version, config, banned_info) {
		if (canIn(config)) {
			this.nickname = config.nickname
			this.gameOptions = {}
			suiSet.executeConnect({ player: this, version, config, banned_info });
			suiSet.modeCharacter({ player: this, version, config, banned_info });
			return lmsi.call(this, version, config, banned_info)
		}
	},
	chat(id, str) {
		const player = getPlayer(id);
		if (player) {
			if (player === game.me && this.mainHost !== 'mainHost') {
				lib.element.player.chat.call(player, str)
			} else {
				player.chat(str)
			}
		} else if (lib.node.observing.includes(this) || suiSet.observingId.includes(this)) {
			const name = this.nickname || arguments[arguments.length - 1]
			if (lib.config['extension_叁岛世界_main_cdown']) {
				const prefix = lib.node.observing.includes(this) ? '<span style="color:blue;">（旁观）</span>' : '<span style="color:red;">（被控制）</span>'
				game.addVideo('danmu', null, { prefix: '<span style="color:blue;">（旁观）</span>', name, str: str.replace(/##assetURL##/g, lib.assetURL) })
				game.broadcastAll((func, prefix, name, str) => {
					str = str.replace(/##assetURL##/g, lib.assetURL);
					func(prefix, name, str)
					const info = [prefix + name, str];
					lib.chatHistory.push(info);
				}, ui.create.danmu, prefix, name, str)
			}
		}
	},
	emotion(id, pack, emotion, name) {
		const player = getPlayer(id);
		if (player) {
			player.emotion(pack, emotion)
		} else if (lib.node.observing.includes(this) || suiSet.observingId.includes(this)) {
			const str = '<img src="##assetURL##image/emotion/' + pack + '/' + emotion + '.gif" width="50" height="50">';
			lib.message.server.chat.call(this, this.id, str, name)
		}
	},
})
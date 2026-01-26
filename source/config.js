import { lib, game, ui, get, ai, _status } from '../../../noname.js';
import { Lit_Dialog } from './tool/extraUI.js'
import Lit_update from './tool/update.js';
import Lit_configSeter from './tool/configSeter.js'
import basic from './tool/basic.js'

export const config = {
	lit_help: {
		name: '<button>帮助文档</button>',
		intro: "查看叁岛世界相关设置的完整帮助页面",
		clear: true,
		async onclick() {
			try {
				await Lit_Dialog.showDocModal(
					`${basic.path}/style/html/help.html`,
					'帮助文档'
				);
			} catch (error) {
				console.error("获取【叁岛世界】帮助文档失败", error);
				alert("获取【叁岛世界】帮助文档失败");
			}
		}
	},
	lit_updateOnline: {
		name: '<button>在线更新扩展</button>',
		intro: "从GitHub/Gitee在线获取扩展并更新",
		clear: true,
		async onclick() {
			Lit_update.test();
			await Lit_update.showUI();
		}
	},
	lit_recommendConfig: {
		name: '<button>应用推荐的无名杀全局设置</button>',
		intro: "载入相对适配《叁岛世界》的“无名杀全局设置”，同时可备份当前配置到files目录",
		clear: true,
		async onclick() {
			await Lit_configSeter.showUI();
		}
	},
	lit_dkwsl: {
		name: "吊卡无势力限制",
		init: false,
		intro: "开启后，允许非“九”“叁”势力角色直接使用吊卡",
		onclick: (item) => {
			game.saveExtensionConfig('叁岛世界', 'lit_dkwsl', item);
		}
	},
	lit_huanhuaLimit: {
		name: "幻化无范围限制",
		init: false,
		intro: "开启后，允许非叁岛世界角色及其技能进入叁岛幻化中",
		onclick: (item) => {
			game.saveExtensionConfig('叁岛世界', 'lit_huanhuaLimit', item);
		}
	},
	lit_guozhanAllowed: {
		name: "叁岛国战（实验）",
		init: false,
		intro: "开启后，将叁岛世界角色改为“键”势力并加入到国战模式中，重启生效",
		onclick: (item) => {
			game.saveExtensionConfig('叁岛世界', 'lit_guozhanAllowed', item);
		}
	},
	fix_onlineFixCancel: {
		name: "关闭联机修改功能",
		init: false,
		intro: "取消导入联机修改基础函数集，重启生效",
		onclick: (item) => {
			game.saveConfig('extension_叁岛世界_fix_onlineFixCancel', item)
			// if (item) {
			// 	Object.keys(map).forEach(s => {
			// 		if(!s.startsWith('lit_') && s != "intro"){
			// 			map[s].hide();
			// 		}
			// 	});
			// } else {
			// 	Object.keys(map).forEach(s => {
			// 		if(!s.startsWith('lit_') && s != "intro"){
			// 			map[s].show();
			// 		}
			// 	});
			// 	if (!config.fun_handCardsFix){
			//		fun_beginDraw.hide();
			// 		map.fun_replaceHandCards.hide();
			// 	}
			// }
		}
	},
	lit_fg0: {
		name: "<font size='4'>&nbsp;-------&nbsp;联机修改&nbsp;-------</font>",
		clear: true,
		nopointer: true,
	},
	main_audio: {
		name: '指令播放角色音频',
		intro: '在聊天框可使用/s /d 播放技能音效或阵亡音效，详见帮助按钮',
		init: true,
	},
	main_cdown: {
		name: '聊天发送弹幕',
		intro: '每个玩家发送消息后，都会变成弹幕',
		init: true,
	},
	edit_emojiAllowed: {
		name: '允许发布表情、颜文字',
		intro: '（限私服）发送内容中的表情、颜文字等不再仅自己可见，若遇Bug请关闭',
		init: false,
	},
	play_observeChat: {
		name: '允许旁观发言',
		intro: '即使是旁观的玩家，也能够正常发言',
		init: true,
	},
	edit_alone: {
		name: '允许单人开房',
		intro: '（限私服）删除至少要有两名玩家才能开始游戏的限制，直接打人机',
		init: false,
	},
	play_mima: {
		name: '进入房间需输入密码',
		intro: '开启后，在下方会出现一个输入密码的按钮，加入你的房间时必须输入此密码才可加入，重启后生效',
		init: false,
		onclick(bool) {
			game.saveConfig('extension_叁岛世界_play_mima', bool)
			// suiSet.setMima()
		}
	},
	get setMima() {
		if (lib.config['extension_叁岛世界_play_mima']) {
			return {
				name: '<button>设置密码</button>',
				intro: "",
				clear: true,
				onclick() {
					game.prompt(`请输入要设置的密码<br>当前密码：${lib.config['叁岛世界mima'] || '无'}`, str => {
						if (str) game.saveConfig('叁岛世界mima', str)
						game.prompt(`给密码输入错误的玩家的提示<br>当前提示：${lib.config['叁岛世界_tip'] || '无'}`, str2 => {
							if (str2) game.saveConfig('叁岛世界_tip', str2)
						})
					})
				}
			}
		}
		return {
			name: '',
			clear: true,
		}
	},
	play_tipPlayerVersion: {
		name: '检查版本与房主一致',
		intro: '无名杀版本与房主不同的玩家进入房间时，会弹窗提醒他',
		init: true,
	},
	play_tipNonamePlayer: {
		name: '提醒无名玩家改名',
		intro: '名称为“无名玩家”的玩家进入房间时，会弹窗提醒他改名',
		init: true,
	},
	play_tipExtension: {
		name: '扩展缺失提醒',
		intro: '缺失可能的必要扩展，或相关扩展未启用的玩家进入房间时，会弹窗提醒他缺失的扩展列表',
		init: false,
	},
	fun_handCardsFix: {
		name: '修改起始发牌和手气卡',
		intro: '开启后，下面两个设置才会生效，重启生效',
		init: false,
	},
	fun_beginDraw: {
		name: '起始发牌',
		frequent: true,
		init: '4',
		item: Array.from({ length: 100 }, (_, i) => String(i)),
	},
	fun_replaceHandCards: {
		name: '手气卡次数',
		frequent: true,
		init: "0",
		item: Array.from({ length: 100 }, (_, i) => String(i)),
	},
	edit_cardsInfo: {
		name: '卡牌上显示出牌信息',
		intro: '在打出的卡牌下方显示一行小字：“xx对xx使用”“xx打出”等',
		init: true,
	},
	edit_errorIgnore: {
		name: '忽略弹窗报错',
		intro: '不建议打开，除非我们不得不这么做',
		init: false,
	},
	intro: {
		name: "作者：一个月惹",
		clear: true,
		nopointer: true,
		onclick: () => {
			let count = game.getExtensionConfig('叁岛世界', 'intro_count') ?? 0;
			game.saveExtensionConfig('叁岛世界', 'intro_count', (++count) % 3);
			if (count == 3) debugger;
		}
	},
}

export const mainConfig = [];
export const playerConfig = [];
export const editConfig = [];
Object.keys(config).forEach(item => {
	if (item.startsWith('play_')) playerConfig.push(item);
	if (item.startsWith('main_')) mainConfig.push(item);
	if (item.startsWith('edit_')) editConfig.push(item);
});
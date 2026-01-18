import { lib, game, ui, get, ai, _status } from '../../../noname.js';
//这个文件是写给主机执行的代码
import {
	updateActive,
	setUpdateActive,
	menux,
	menuxpages,
	createConfig,
	clickMenuItem
} from "../../../noname/ui/create/menu/index.js";
import { config } from '../source/config.js'
import { suiSet } from "../source/tool/suiSet.js";
const functions = {
	audio() {
		const playerAudio = () => {
			lib.element.player.chat = function (str) {
				if (get.is.banWords(str)) return;
				if (str.startsWith('/')) {
					const args = str.slice(1).split(' ');
					const command = args.shift();
					const audioCommand = (type) => {
						if (args.length < 1) return;
						const targetName = args.shift();
						// 台词获取
						const audioData = type === 'skill' ? 
							get.Audio.skill({ skill: targetName }) : 
							get.Audio.die({ player: targetName });

						let fileList = audioData.audioList.filter(item => {
							return type != 'skill' || /[0-9]$/.test(item.name);
						}).map(item => item.name);
						if(fileList.length == 0)return;

						// 索引处理
						let index = 1;
						if (type === 'skill') {
							if(args[0] && args[0] == '0'){
								args.shift();
								index = Math.ceil(Math.random() * fileList.length);
							} else if (args[0] && /^\d+$/.test(args[0])) {
								index = parseInt(args.shift(), 10);
								index = Math.max(1, Math.min(index, fileList.length));
							} else {
								index = Math.ceil(Math.random() * fileList.length);
							}
						}

						// 播放音频
						const directory = type;
						const filename = type === 'skill' ? 
							`${fileList[index-1]}` :
							targetName;
						game.broadcastAll(
							(dir, file) => game.playAudio(dir, file),
							directory,
							filename
						);

						// 生成消息
						if (args.length == 1) {
							str = ['null',''].includes(args[0]) ? null : args.join(' ');
						} else if(args.length > 0){
							str = args.join(' ');
						} else {
							if (!audioData.textList?.length) {
								this.say('<i>未找到相关音频台词（私密）</i>')
								return;
							}
							str = type === 'skill' ? 
								audioData.textList[index - 1] : 
								audioData.textList[0];
						}
						return str !== null;
					};
				
					switch (command.toLowerCase()) {
						case 'skill':
						case 's':
							if (!audioCommand('skill')) return;
							break;
				
						case 'die':
						case 'd':
							if (!audioCommand('die')) return;
							break;
				
						default:
							return;
					}
				}
				str = str.replace(/<(\w+) ([^>]*)>(.*?)(?=<\/\1>|<\1 |$)/g, (match, tag, attrs, content) => {
					const attrToStyle = {
						// === 颜色和背景 ===
						c: 'color',				// 文字颜色
						bg: 'background-color',	// 背景颜色
						op: 'opacity',			// 透明度

						// === 字体和文本 ===
						fs: 'font-size',		// 字号大小
						ff: 'font-family',		// 字体类型
						fw: 'font-weight',		// 字体粗细
						lh: 'line-height',		// 行高
						ls: 'letter-spacing',	// 字符间距
						ta: 'text-align',		// 文本对齐
						td: 'text-decoration',	// 文本装饰
					};
				  
					// 转换属性为样式
					const styleObj = attrs.split(';').map(attr => {
					  const [key, value] = attr.split(':');
					  const cssKey = attrToStyle[key.trim()];
					  return cssKey ? `${cssKey}:${value.trim()}` : null;
					}).filter(Boolean).join(';');
				  
					// 特殊处理 <sp> 标签
					const newTag = tag === 'sp' ? 'span' : tag;
					return `<${newTag} style="${styleObj}">${content}</${newTag}>`;
				});
				this.say(str);
				game.broadcast(
					function (id, str) {
						if (lib.playerOL[id]) {
							lib.playerOL[id].say(str);
						} else if (game.connectPlayers) {
							for (let i = 0; i < game.connectPlayers.length; i++) {
								if (game.connectPlayers[i].playerid == id) {
									game.connectPlayers[i].say(str);
									return;
								}
							}
						}
					},
					this.playerid,
					str
				);
			}
		}
		setTimeout(playerAudio, 1000);
	},
	cdown() {
		const createSay = () => {
			const leps = lib.element.player.say
			lib.element.player.say = function (str) {
				const player = this
				let nickname = (this.tempNickname ? `<span style="color:green;">（${this.tempNickname}控制的${this.nickname}）</span>` : '') || this.nickname, prefix = '';
				if (game.Mainobserve) {
					nickname = lib.config.connect_nickname
					prefix = '<span style="color:blue;">（旁观）</span>'
				}
				game.addVideo('say', player, {
					nickname,
					str
				})
				Promise.resolve().then(() => {
					game.broadcast((danmu, prefix, name, str) => {
						str = str.replace(/##assetURL##/g, lib.assetURL);
						if (!lib.element.player.say.danmu) {
							danmu(prefix, name, str)
						}
					}, ui.create.danmu, prefix, nickname, str)
					str = str.replace(/##assetURL##/g, lib.assetURL);
					ui.create.danmu(prefix, nickname, str)
				})
				return leps.call(this, ...arguments)
			}
			lib.element.player.say.danmu = true
			ui.create.danmu = function (prefix = '', name = lib.config.connect_nickname, str = '') {
				if (!ui.danmuList) ui.danmuList = []
				if (!ui.bulletScreen) {
					ui.bulletScreen = ui.create.div('.bulletScreen', document.body)
					ui.bulletScreen.css({ width: "100%", height: "100%", left: "0", top: "0", pointerEvents: "none", zIndex: "100" })
				}
				let top = document.body.clientHeight / 3
				const danmu = ui.create.div('.danmumode', `${prefix}${name}：${str}`, ui.bulletScreen)
				danmu.css({
					left: '100%',
					transition: 'left 20s cubic-bezier(0.45, 0.44, 0.55, 0.52) 0s',
					fontSize: "18px",
					textShadow: "1px 1px black",
					whiteSpace: "nowrap",
					fontFamily: "宋体",
					zIndex: "1000",
					pointerEvents: "none"
				})
				const { height } = danmu.getBoundingClientRect()
				while (ui.danmuList.includes(top)) {
					if (top === ui.danmuList.lastIndex) {
						ui.danmuList = []
					}
					top += height
					if (top > document.body.clientHeight) {
						top = 149 - height
						ui.danmuList = []
					}
				}
				ui.danmuList.add(top)
				danmu.style.top = top + "px"
				ui.refresh(danmu)
				danmu.style.left = "-10%"
				danmu.topBound = top
				const removeNode = function () {
					this.remove()
					ui.danmuList.remove(this.topBound)
				}
				danmu.addEventListener('transitionend', removeNode)
				danmu.addEventListener('webkittransitionend', removeNode)
			}
		}
		setTimeout(createSay, 1000);
	},
}
const edits = {
	cardsInfo() {
		lib.element.player.$throwordered = function (node) {
			const $throwordered2 = this.$throwordered2.apply(this, arguments);
			const player = this
			const { name, targets, judgestr } = _status.event
			let eventInfo;
			const playername = get.translation(player)
			switch (name) {
				case 'useCard': {
					if (targets.length === 1 && targets[0] === player) {
						eventInfo = playername + '使用'
					}
					else if (targets.length < 3) {
						eventInfo = playername + "对" + get.translation(targets) + "使用"
					} else {
						eventInfo = playername + "使用"
					}
					break;
				}
				case 'disCard': {
					eventInfo = playername + "弃置"
					break
				}
				case 'lose': {
					eventInfo = playername + "弃置"
					break
				}
				case 'useSkill': {
					if (_status.event.skill == '_chongzhu') {
						eventInfo = playername + "重铸"
					} else {
						eventInfo = playername
					}
					break
				}
				case 'respond': {
					eventInfo = playername + "打出"
					break
				}
				case 'die': {
					eventInfo = playername + "弃置"
					break
				}
				case 'judge': {
					eventInfo = playername + judgestr || '' + "判定牌"
					break
				}
				case 'gain': {
					eventInfo = playername + "交给"
					break
				}
				default: {
					eventInfo = playername
				}
			}
			if (node && node.node) {
				const cardInfo = {
					name: get.name(node),
					number: get.number(node),
					suit: get.suit(node)
				}
				game.broadcastAll((node, eventInfo, { name, number, suit }) => {
					if (!node.node) {
						node = [...ui.arena.childNodes].find(c => {
							if (c.classList.contains('thrown') && c.classList.contains('card')) {
								const n = get.number(c)
								const na = get.name(c)
								const s = get.suit(c)
								if (n === number && na === name && s === suit && !c.selectedt) {
									c.selectedt = true
									return true
								}
							}
						})
					}
					if (!node.node) return
					const no = ['image', 'info', 'name', 'name2', 'background', 'intro', 'range', 'gaintag']
					const some = [...node.childNodes].some(n => {
						if (n.innerText && eventInfo.includes && eventInfo.includes(n.innerText) && !no.includes(n.classList[0])) {
							n.innerHTML = eventInfo
							return true
						}
					})
					if (some) return
					if (!node.node.cardsetion) {
						node.node.cardsetion = ui.create.div('.cardsetion', eventInfo, node)
					} else {
						node.node.cardsetion.innerHTML = eventInfo || playername
					}
				}, node, eventInfo, cardInfo)

				const addStyle = () => {
					const style = document.createElement('style')
					style.innerHTML = /*css*/`
					.cardsetion {
						width:100%;
						color: #fff;
						text-shadow: 1px 1px black;
						font-size: 15px;
						bottom: 0;
						text-align: center;
						z-index:100000;
						pointer-events:none;
					}
					.card .tempname.tempimage {
						opacity:1 !important;
					}   
					`
					document.head.appendChild(style)
				}
				if (!game.throwCardStyle) {
					addStyle()
					game.throwCardStyle = true
				}
				if (lib.node && lib.node.clients) {
					lib.node.clients.forEach(c => {
						if (!c.gameOptions) {
							c.gameOptions = {}
						}
						if (!c.gameOptions.Cardstyle) {
							c.send(addStyle)
							c.gameOptions.Cardstyle = true
						}
					})
				}
				game.addVideo('cardInfo', null, {
					eventInfo,
					cardInfo
				})
			}
			return $throwordered2
		}
	},
	alone() {
		ui.create.connectPlayers = function (ip) {
			let special = "fixed";
			ui.updateConnectPlayerPositions();
			game.connectPlayers = [];
			const configOL = lib.configOL;
			const numberOfPlayers =
				parseInt(configOL.player_number) || configOL.number;
			for (let position = 0; position < numberOfPlayers; position++) {
				const player = ui.create.player(ui.window);
				player.dataset.position = position;
				player.classList.add("connect");
				game.connectPlayers.push(player);
			}
	
			let bar = ui.create.div(ui.window);
			bar.style.height = "20px";
			bar.style.width = "80%";
			bar.style.left = "10%";
			bar.style.top = "calc(200% / 7 - 120px + 5px)";
			bar.style.textAlign = "center";
			let ipbar = ui.create.div(".shadowed", ip, bar);
			ipbar.style.padding = "4px";
			ipbar.style.borderRadius = "2px";
			ipbar.style.position = "relative";
	
			let button = ui.create.div(
				".menubutton.large.highlight.connectbutton.connectbutton1.pointerdiv",
				game.online ? "退出联机" : "开始游戏",
				ui.window,
				function () {
					if (button.clicked) return;
					if (game.online) {
						if (game.onlinezhu) {
							game.send("startGame");
						} else {
							game.saveConfig("tmp_owner_roomId");
							game.saveConfig("tmp_user_roomId");
							game.saveConfig("reconnect_info");
							game.reload();
						}
					} else {
						// let num = 0;
						// for (let i of game.connectPlayers) {
						//	 if (
						//		 !i.nickname &&
						//		 !i.classList.contains("unselectable2")
						//	 )
						//		 num++;
						// }
						// if (num >= lib.configOL.number - 1) {
						//	 alert("至少要有两名玩家才能开始游戏！");
						//	 return;
						// }
						game.resume();
					}
					button.delete();
					bar.delete();
					shareButton.delete();
					delete ui.connectStartButton;
					delete ui.connectStartBar;
					delete ui.connectShareButton;
					button.clicked = true;
				}
			);
	
			let shareButton = ui.create.div(
				".menubutton.large.highlight.connectbutton.connectbutton2.pointerdiv",
				"分享房间",
				ui.window,
				function () {
					let text = `无名杀-联机-${lib.translate[get.mode()]}-${game.connectPlayers.filter((p) => p.avatar).length
						}/${game.connectPlayers.filter(
							(p) => !p.classList.contains("unselectable2")
						).length
						}\n${get.connectNickname()}邀请你加入${game.roomId
						}房间\n联机地址:${game.ip
						}\n请先通过游戏内菜单-开始-联机中启用“读取邀请链接”选项`;
					window.focus();
					if (navigator.clipboard && lib.node) {
						navigator.clipboard
							.writeText(text)
							.then(() => {
								game.alert(`分享内容复制成功`);
							})
							.catch((e) => {
								game.alert(`分享内容复制失败${e || ""}`);
							});
					} else {
						let input = ui.create.node("textarea", ui.window, {
							opacity: "0",
						});
						input.value = text;
						input.focus();
						input.select();
						let result = document.execCommand("copy");
						input.blur();
						ui.window.removeChild(input);
						game.alert(`分享内容复制${result ? "成功" : "失败"}`);
					}
				}
			);
	
			ui.connectStartButton = button;
			ui.connectStartBar = bar;
			ui.connectShareButton = shareButton;
		}
	},
	emojiAllowed() {
		get.is.banWords = (str) => window.bannedKeyWords.some(item => str.includes(item));
	},
	errorIgnore() {
		window.onerror = function (msg, src, line, column, err) {};
	},
}
Object.keys(config).forEach(s => {
	if(s.startsWith('main_') || s.startsWith('edit_')){
		const init = config[s].init;
		const name = s.slice(5);
		const item = lib.config['extension_叁岛世界_' + s]??init;
		if (s.startsWith('main_')) {
			if (item) functions[name]();
		}
		if (s.startsWith('edit_')) {
			if (item) edits[name]();
		}
	}
});
for (const s in suiSet.globalSkills) lib.skill[s] = suiSet.globalSkills[s];
import { lib, game, ui, get, ai, _status } from '../../../../noname.js';
import { playerConfig } from '../config.js';

export function createLobbyRuntime(suiSet) {
	return {
	mode: [
		'identity', /* 'doudizhu', */ 'DIYmode', 'tiaozhan', 't_jiuzhou',
	],
	igextension: [
		'全能搜索', '应用配置', '拖拽读取', '在线更新', '一劳永逸', 'SJ Settings', '武将修改', 'AI优化', 'OL设置', 'OLset', '叁岛世界'
	],
	getEnabledExtensionsCopy() {
		return lib.config.extensions.filter(e => {
			return !suiSet.igextension.includes(e) && lib.config[`extension_${e}_enable`]
		})
	},
	canIn(config) {
		if (lib.config['extension_叁岛世界_play_mima']) {
			const { mima, nickname } = config
			const player = lib.config.mimaList.find(c => c.name == config.nickname && c.mima == lib.config['叁岛世界mima'])
			if ((mima != lib.config['叁岛世界mima']) && !player) {
				this.send((mima, tip) => {
					let popupContainer;
					game.prompt('本房设置了入场密码，请输入密码', str => {
						if (str) {
							if (str === mima) game.send('init', lib.versionOL, {
								id: game.onlineID,
								avatar: lib.config.connect_avatar,
								nickname: get.connectNickname(),
								mima: str
							}, lib.config.banned_info)
							else {
								game.prompt('密码错误<br>请点击确定取消重启<br>提示：<br>' + tip, game.reload)
							}
						} else {
							game.reload()
						}
						popupContainer.style.zIndex = ''
					})
					popupContainer = document.querySelector('.popup-container')
					popupContainer.style.zIndex = '99999999'
				}, lib.config['叁岛世界mima'], lib.config['叁岛世界_tip'])
				return false
			} else if (mima == lib.config['叁岛世界mima']) {
				lib.config.mimaList.push({
					id: this.id,
					name: nickname,
					mima,
				})
				game.saveConfig('mimaList', lib.config.mimaList)
			}
		}
		return true
	},
	getPlayer(id) {
		let player;
		if (lib.playerOL[id]) {
			player = lib.playerOL[id];
		}
		else if (game.connectPlayers) {
			player = game.connectPlayers.find(p => p.playerid === id)
		}
		return player
	},
	executeConnect({ player, version, config, banned_info }) {
		const playerFunction = {
			tipExtension(player) {
				player.send(function (ext) {
					if (!ui.extnode) {
						ui.extnode = ui.create.div('.foomext.lit-online-extension-list', '扩展列表').css({
							backgroundColor: 'rgb(224 106 106 / 30%)'
						})
						ui.system2.appendChild(ui.extnode)
					}
					if (!ui.extnode.setPopped) {
						ui.extnode.setPopped = true
						lib.setPopped(ui.extnode, function () {
							var uiintro = ui.create.dialog('hidden');
							let str = '房主的扩展:<br>'
							let caption = uiintro.addText(str);
							caption.style.margin = '0';
							let a = ''
							if (ext.length > 0) {
								ext.forEach(e => {
									a += e + '<br>'
								})
							} else {
								a = '房主未开启其他扩展'
							}
							uiintro._place_text = uiintro.add('<div class="text">' + str + a + '</div>');
							uiintro.add(ui.create.div('.placeholder.slim'));
							return uiintro;
						}, 200)
					}
				}, lib.config.extensionsCopy)
				player.send(function (ext) {
					const extcall = []
					const extclose = []
					ext.forEach(l => {
						if (!lib.config.extensions.includes(l)) { //如果自己的扩展列表里没有这些
							extcall.push(l)
						} else if (lib.config[`extension_${l}_enable`] != undefined && !lib.config[`extension_${l}_enable`]) {
							extclose.push(l)
						}
					})
					if (extcall.length > 0) {
						let str = '提示：当前缺少房主拥有但你未拥有的扩展：'
						extcall.forEach(c => {
							str += c + '、'
						})
						str += '\r\n这可能会导致游戏开始没有选将框，还有自己不能出牌等等问题。\r\n右上角可以查看房主的扩展，手机版需要打开设置'
						alert(str)
					}
					if (extclose.length > 0) {
						let str2 = '提示：有已拥有但是未开启的扩展：'
						extclose.forEach(c => {
							str2 += c + '、'
						})
						str2 += '\r\n请开启这些扩展'
						alert(str2)
					}

				}, lib.config.extensionsCopy)
			},
			tipNonamePlayer(player) {
				player.send(function () {
					if (lib.config.connect_nickname === '无名玩家' || lib.config.connect_nickname === '※无名玩家') {
						alert('提示：请不要使用“无名玩家”做联机名字\r\n可以打开选项，点击联机按钮修改名字')
					}
				})
			},
			tipPlayerVersion(player) {
				player.send(function (version) {
					if (lib.version < version) {
						alert('你的游戏版本是：' + lib.version + '\r\n房主的游戏版本是:' + version + '，\r\n此时房主开局可能会影响你正常游戏！请更新游戏！')
					}
				}, lib.version)
			},
			observeChat(player) {
				if (_status.waitingForPlayer) return
				if (lib.config['extension_叁岛世界_main_cdown']) {
					player.send(ui.create.danmu, '<span style="color:red;">', '提示', '本房允许旁观发言</span>')
				}
				player.send(() => {
					let pro;
					new Promise(resolve => {
						pro = resolve
					}).then(() => {
						game.observe = false
					})
					const players = ui.create.players
					ui.create.players = function (num) {
						const turn = players(num)
						pro.resolve()
						ui.create.players = players
						return turn
					}
					const liaotian = Array.from(ui.system.childNodes[1].childNodes).find(c => c.innerHTML === '聊天')
					if (!liaotian) ui.create.chat()
				})
			},
			morePlayers(player) {
				player.send((num) => {
					lib.configOL.player_number = num
					lib.configOL.number = num
				}, lib.configOL.player_number)
			}
		}
		const exe = playerConfig;
		exe.forEach(e => {
			if (lib.config['extension_叁岛世界_' + e] && typeof playerFunction[e.slice(5)] === 'function') {
				playerFunction[e.slice(5)](player, version, config, banned_info)
			}
		})
	},
	getOnlinePlayer() {
		return game.players.map(p => {
			if (p.ws || p === game.me) {
				let avatar
				let nickname
				if (p === game.me) {
					avatar = lib.config.connect_avatar
					nickname = lib.config.connect_nickname
				} else {
					avatar = p.ws.avatar
					nickname = p.nickname
				}
				game.addVideo('initAvatar', null, { avatar, nickname, playerid: p.playerid })
				return [p.playerid, avatar, nickname, p]
			}
		}).filter(Boolean)
	},
	globalSkills: {},
	modeCharacter({ player, version, config, banned_info }) {
		player.send(skills => {
			for (const s in skills) lib.skill[s] = skills[s]
		}, suiSet.globalSkills)
		if (_status.playerCharactersUse) {
			player.send(_status.playerCharactersUse, _status.playerCharacters, _status.style.innerHTML, suiSet.copyCharacter)
		}
	},
	};
}

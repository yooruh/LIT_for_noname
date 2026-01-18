import { lib, game, ui, get, ai, _status } from '../../../noname.js';
import { suiSet } from '../source/tool/suiSet.js';
export function canIn(config){
	if (lib.config['extension_叁岛世界_play_mima']) {
		const { mima, nickname } = config
		const player = lib.config.mimaList.find(c => c.name == config.nickname && c.mima == lib.config['叁岛世界mima'])
		if ((mima != lib.config['叁岛世界mima']) && !player) {
			this.send((mima, tip) => {
				//你要这样偷看密码吗？
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
			return true
		}
	}
	return true
}
export function getPlayer(id){
	let player;
	if (lib.playerOL[id]) {
		player = lib.playerOL[id];
	}
	else if (game.connectPlayers) {
		player = game.connectPlayers.find(p => p.playerid === id)
	}
	return player
}
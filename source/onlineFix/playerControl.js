import { lib, game, ui, get, ai, _status } from '../../../../noname.js';

export function createPlayerControlRuntime(suiSet) {
	return {
	observingId: [],
	auto(bool) {//这个auto是目标自己一个人应该收到的消息，其他人一概不管
		const fn = bool ? 'add' : 'remove'
		const replacePlayer = function (e) {
			if (!_status.auto || !game.notMe) return;
			game.swapPlayer(this || e.target.parentElement)
		}
		game.players.forEach(p => p[fn + "EventListener"](lib.config.touchscreen ? "touchend" : "click", replacePlayer))
		ui.arena.classList[fn]("observe")
		game.notMe = bool
		_status.auto = bool
		game.observe = bool
	},
	playerToobserve(player, replaceNickname) {
		const auto = suiSet.auto
		//如果只传了一个玩家，那就是要把一个玩家放上旁观
		//但这里还要确认一下这个是不是普通玩家
		//不然传入,一些字符串或者普通对象就不太合适了
		//还有就是这个玩家不能是人机，这里用的是判断ws和主机
		if (player instanceof ClientElement) return '只传一个ws没有用'
		if (player.ws instanceof ClientElement || player === game.me) {
			const id = get.id()
			const ws = player.ws
			suiSet.observingId[ws.id] = ws
			lib.node.observing.push(ws)
			delete player.ws
			//这三步是把玩家的ws干掉
			game.broadcastAll((player, id, replaceNickname) => {
				delete lib.playerOL[player.playerid]
				lib.playerOL[id] = player
				player.playerid = id
				if (replaceNickname) {
					player.nickname = ''
					player.node.nameol.innerHTML = ''
				}
			}, player, id, replaceNickname)
			if (player === game.me) {
				auto(true)
				return '已经将主机换至旁观'
			}

			ws.send(auto, true)
			//删掉了客机的ws就变成人机了

			if (!ui.removeObserve && lib.node.observing.length) {
				ui.removeObserve = ui.create.system(
					"移除旁观",
					function () {
						lib.configOL.observe = false;
						if (game.onlineroom) {
							game.send("server", "config", lib.configOL);
						}
						while (lib.node.observing.length) {
							lib.node.observing.shift().ws.close();
						}
						this.remove();
						delete ui.removeObserve;
					},
					true,
					true
				);
			}

			return '此客机已经变为旁观'
		}
		//否则啥也不干
		return '虽然传入了一个玩家，但这是个没有ws的人机？'
	},
	observeToPlayer(player, player2) {

		const source = player instanceof PlayerElement ? player2 : player //这就是要上位的角色，是一个ws
		const target = player2 instanceof PlayerElement ? player2 : player //这是目标，一个玩家，可能是主机

		const sourceWs = source
		const targetWs = target.ws

		suiSet.swapPlayer(target)

		target.ws = sourceWs;

		game.broadcastAll((target, targetId, sourceId) => {
			delete lib.playerOL[targetId]
			target.playerid = sourceId
			lib.playerOL[sourceId] = target
		}, target, target.playerid, source.id)

		source.send(target => {
			game.swapPlayer(game.me, target)
			game.me.setIdentity(game.me.identity)
		}, target)

		source.send(auto, true)

		if (targetWs) {
			lib.node.observing.push(targetWs)
			lib.node.observe.remove(sourceWs)
		}
	},
	noeSwapPlayer(source, target, replaceNickname) {
		const { ws: sourceWs, playerid: sourceId } = source
		const { ws: targeteWs, playerid: targetId } = target

		if (target.tempWsInfo || source.tempWsInfo) {
			source.viewNow = target.startId

			if (source.isOnline2()) {
				source.send(game.swapPlayer, target, source)
			} else {
				game.swapPlayer(source, target)
			}

			target.ws = target.tempWsInfo.ws
			source.ws = source.tempWsInfo.ws

			game.broadcastAll((source, target, sourceId, targetId) => {
				delete lib.playerOL[source.playerid]
				delete lib.playerOL[target.playerid]

				lib.playerOL[targetId] = target
				lib.playerOL[sourceId] = source

				target.playerid = targetId
				source.playerid = sourceId
			},
				source, target,
				source.tempWsInfo.playerid,
				target.tempWsInfo.playerid)

			delete target.tempWsInfo
			delete source.tempWsInfo
			delete source._controlMe
			delete target._controlNow
			return '单向换位又换回来了'
		}

		const tempId = get.id()

		target.tempWsInfo = { ws: target.ws, playerid: target.playerid }
		source.tempWsInfo = { ws: source.ws, playerid: source.playerid }

		game.broadcastAll((source, target, sourceId, targetId, tempId) => {
			delete lib.playerOL[targetId]
			lib.playerOL[sourceId] = target
			lib.playerOL[tempId] = source
			source.playerid = tempId
			target.playerid = sourceId
		}, source, target, sourceId, targetId, tempId)

		if (source.isOnline2()) {
			source.send(game.swapPlayer, source, target)
			source.isOnline2 = source.isOnline = () => true
		} else {
			game.swapPlayer(source, target)
		}


		target._controlMe = source
		source._controlNow = target

		source.viewNow = target.startId

		target.ws = source.ws


		return '已经单向换位'
	},
	douleSwapPlayer(source, target, replaceNickname) {
		const { ws, playerid: sourceId, nickname: sourceNickname } = source
		const { ws: ws2, playerid: targetId, nickname: targetNickname } = target
		game.broadcastAll((target, source, sourceId, targetId, sourceNickname, targetNickname, replaceNickname) => {
			target.playerid = sourceId
			source.playerid = targetId

			lib.playerOL[sourceId] = target
			lib.playerOL[targetId] = source

			if (replaceNickname) {
				target.nickname = sourceNickname
				source.nickname = targetNickname
				target.setNickname()
				source.setNickname()
			}

		}, target, source, sourceId, targetId, sourceNickname, targetNickname, replaceNickname)


		if (target === game.me || source === game.me) {
			game.swapPlayer(source, target)
		}


		ws && ws.send(game.swapPlayer, source, target)
		ws2 && ws2.send(game.swapPlayer, source, target)

		target.ws = ws
		source.ws = ws2

		return '已经双向换位'
	},
	swapPlayer(playerAndTarget) {//ws就是WebSocket，就是一个存数据的地方
		const { player: source, player2: target, replaceNickname, unidirectional } = playerAndTarget
		const PlayerElement = lib.element.Player, ClientElement = lib.element.Client

		if (source && !source.startId) {
			source.startId = source.playerid + "-" + get.translation(source)
			source.viewNow = source.startId
		}
		if (target && !target.startId) {
			target.startId = target.playerid + "-" + get.translation(target)
			target.viewNow = target.startId
		}

		if (source && !target) return suiSet.playerToobserve(source, target)//玩家变旁观

		if (source instanceof ClientElement && target instanceof ClientElement) return '两个非玩家就不用换了'

		if (source instanceof PlayerElement && target instanceof PlayerElement) {
			if (unidirectional) return suiSet.noeSwapPlayer(source, target, replaceNickname)//单向换位（相当于控制）
			return suiSet.douleSwapPlayer(source, target, replaceNickname)//双向换位，最简单的
		}
		return suiSet.observeToPlayer(source, target)//旁观变玩家
	},
	};
}

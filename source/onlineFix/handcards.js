import { lib, game, ui, get, ai, _status } from '../../../../noname.js';

export function createHandcardRuntime(suiSet) {
	return {
	replaceHandcardsnum: 1,
	replaceHandcardsOver: false,
	replaceHandcards(...args) {
		suiSet.replaceHandcardsnum = 1
		suiSet.replaceHandcardsOver = false
		if (suiSet.replaceHandcardsnum > lib.config['extension_叁岛世界_fun_replaceHandCards']) return;
		const next = game.createEvent('replaceHandcards');
		if (Array.isArray(args[0])) next.players = args[0];
		else next.players = args.filter(a => get.itemtype(a) == 'player')
		next.setContent(_status.connectMode ? 'replaceHandcardsOL' : 'replaceHandcards')
		suiSet.replaceHandcardsOver = true
		return next
	},
	replaceHandcardEvent(event, trigger, player, originalReplaceHandcardsOL) {
		if (!lib.config['extension_叁岛世界_fun_handCardsFix']) {
			return typeof originalReplaceHandcardsOL === 'function'
				? originalReplaceHandcardsOL.call(this, event, trigger, player)
				: undefined
		}
		const replaceLimit = parseInt(lib.config['extension_叁岛世界_fun_replaceHandCards']) || 0
		const allowPartialReplace = false
		if (replaceLimit <= 0) {
			return typeof originalReplaceHandcardsOL === 'function'
				? originalReplaceHandcardsOL.call(this, event, trigger, player)
				: undefined
		}
		'step 0'
		event.players = event.players.filter(p => {
			return p === game.me || (p.ws && p.isOnline2())//人机就不给刷牌了
		})
		event.players.forEach(p => {
			if (!p.replaceHandcardsnum) {
				p.replaceHandcardsnum = 0
				p.send(() => { game.me.replaceHandcardsnum = 0 })
			}
		})
		'step 1'
		const send = (allnum, bool) => {
			const num = allnum - game.me.replaceHandcardsnum
			if (bool) {
				game.me.chooseCard('h', `你可以选择一些手牌置换<br>（还剩${num}次置换的机会）`, false, [1, Infinity])
			} else {
				game.me.chooseBool(`是否置换手牌？（还剩${num}次）`).set('ai', () => false)
			}
			game.resume()
		}

		const sendback = (result, player) => {
			if ((result && result.bool === false && event)) {
				event.players.remove(player)
			}
			if (result && result.bool) {
				player.send(() => { game.me.replaceHandcardsnum++ })
				player.replaceHandcardsnum++
				let hs;
				if (Array.isArray(result.cards) && result.cards.length > 0) {
					hs = result.cards
				} else {
					hs = player.getCards('h')
				}
				game.broadcastAll((player, hs) => {
					game.addVideo('lose', player, [get.cardsInfo(hs), [], [], []]);
					hs.forEach(h => h.discard(false))
				}, player, hs)
				const playerCards = player.getCards('h')
				const cards = get.cards(hs.length)
				player.directgain(cards);
				if (Array.isArray(result.cards) && result.cards.length > 0) {
					player._start_cards = cards.addArray(playerCards)
				} else {
					player._start_cards = cards
				}
			}
		}

		event.players.forEach(async p => {
			if (p.isOnline()) {
				event.withol = true;
				p.send(send, lib.config['extension_叁岛世界_fun_replaceHandCards'], allowPartialReplace);
				p.wait(sendback);
			} else if (p == game.me) {
				event.withme = true;
				const num = lib.config['extension_叁岛世界_fun_replaceHandCards'] - game.me.replaceHandcardsnum
				if (_status.weChat) {
					game.addVideo('replaceHandCards', game.me, {
						bool: allowPartialReplace,
						num
					})
				}
				if (allowPartialReplace) {
					game.me.chooseCard('h', `你可以选择一些手牌置换<br>（还剩${num}次置换的机会）`, false, [1, Infinity])
				} else {
					game.me.chooseBool(`是否置换手牌？（还剩${num}次）`);
				}
				game.me.wait(sendback);
			}
		})
		'step 2'
		if (event.withme) {
			game.me.unwait(result);
		}
		'step 3'
		if (!event.resultOL) {
			game.pause();
		}
		'step 4'
		event.players = event.players.filter(p => p === game.me || (p.ws && p.isOnline2()))
		if (event.players.length > 0 && suiSet.replaceHandcardsnum < lib.config['extension_叁岛世界_fun_replaceHandCards']) {
			event.goto(1)
			suiSet.replaceHandcardsnum++
			delete event.resultOL
			return
		}
		suiSet.replaceHandcardsOver = true
	},
	gameDraw(player = game.me, num = 4, targets = game.players, originalGameDraw) {
		const fnum = lib.config['extension_叁岛世界_fun_beginDraw'] ?? num;
		if (typeof fnum === 'function') {
			num = function (player) {
				return fnum.call(this, player)
			}
		} else {
			num = parseInt(fnum)
		}
		const useCustomDraw = false
		if (!useCustomDraw && typeof originalGameDraw === 'function') {
			return originalGameDraw(player, num, targets)
		}
		const next = game.createEvent('gameDraw');
		next.player = player || game.me;
		next.num = num;
		next.targets = targets || game.players;
		next.setContent(useCustomDraw ? 'gameSelect' : 'gameDraw');
		return next;
	},
	};
}

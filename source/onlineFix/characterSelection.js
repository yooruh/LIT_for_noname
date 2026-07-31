import { lib, game, ui, get, ai, _status } from '../../../../noname.js';

export function createCharacterSelectionRuntime(suiSet) {
	return {
	initunSkillPlayers(skills) {
		const randoms = _status.characterlist.randomGets(game.players.length)
		const initPlayers = game.players.map(p => {
			let avatar
			let nickname
			if (p === game.me) {
				avatar = lib.config.connect_avatar
				nickname = lib.config.connect_nickname
			} else if (p.ws) {
				avatar = p.ws.avatar
				nickname = p.nickname
			} else {
				avatar = randoms.shift()
				nickname = lib.translate[avatar]
			}
			game.addVideo('initAvatar', null, { avatar, nickname, playerid: p.playerid })
			return [p.playerid, avatar, nickname]
		})
		game.broadcastAll((players, skills) => {
			players = players.map(p => [lib.playerOL[p[0]], p[1], p[2]])
			ui.arena.classList.add('choose-character');
			players.forEach(([player, avatar, name]) => {
				name = name.replace('※', '')
				const id = name + player.playerid
				const { 0: sex, 1: group } = lib.character[avatar]
				lib.character[id] = new lib.element.Character([sex, group, 3, skills, [`character:${avatar}`], []])
				lib.translate[id] = name
				player.init(id)
				player.update()
			})
		}, initPlayers, skills)
	},
	connect_players() {
		const players = game.connectPlayers || game.players
		const playertrue = []
		const playersfalse = []
		players.forEach(p => {
			if (p.avatar || p.nickname) playertrue.push(p)
			else playersfalse.push(p)
		})
		return [playertrue, playersfalse]
	},
	getSelecList() {
		const list = []
		const list2 = []
		const list3 = []
		const list4 = []
		const libCharacter = {};
		lib.configOL.characterPack.forEach(p => {
			const pack = lib.characterPack[p]
			for (const j in pack) if (lib.character[j]) libCharacter[j] = pack[j];
		})
		for (const i in lib.characterReplace) {
			const ix = lib.characterReplace[i]
			for (let j = 0; j < ix.length; j++) {
				if (!libCharacter[ix[j]] || lib.filter.characterDisabled(ix[j])) ix.splice(j--, 1);
			}
			if (ix.length) {
				list.push(i)
				list2.push(i)
				list4.addArray(ix)
				let bool = false
				for (const j of ix) {
					if (libCharacter[j][4] && libCharacter[j][4].includes('zhu')) {
						bool = true; break;
					}
				}
				(bool ? list2 : list3).push(i);
			}
		}
		for (const i in libCharacter) {
			if (list4.includes(i)) continue;
			if (lib.filter.characterDisabled(i, libCharacter)) continue;
			list.push(i)
			list2.push(i)
			list4.push(i)
			if (libCharacter[i][4] && libCharacter[i][4].contains('zhu')) list2.push(i)
			else list3.push(i);
		}
		return { list, list2, list3, list4, libCharacter }
	},
	getZhuList(list2) {
		const limit_zhu = lib.configOL.limit_zhu;
		if (!limit_zhu || limit_zhu == 'off') return list2.slice(0).sort(lib.sort.character);
		if (limit_zhu != 'group') {
			const num = (parseInt(limit_zhu) || 6);
			return list2.randomGets(num).sort(lib.sort.character);
		}
		const getGroup = function (name) {
			if (lib.characterReplace[name]) return lib.character[lib.characterReplace[name][0]][1];
			return lib.character[name][1];
		}
		const list2x = list2.slice(0);
		list2x.randomSort();
		for (let i = 0; i < list2x.length; i++) {
			for (let j = i + 1; j < list2x.length; j++) {
				if (getGroup(list2x[i]) == getGroup(list2x[j])) {
					list2x.splice(j--, 1);
				}
			}
		}
		list2x.sort(lib.sort.character);
		return list2x;
	},
	nextSet(key, value) {
		if (key === 'createDialog') {
			const { getZhuList } = suiSet
			const { list, list2 } = _status.event
			const chooseList = (_status.event.list || _status.event.list2 || _status.characterlist || []).slice()
			const num = suiSet.getSelect(chooseList)
			value[1][0] = getZhuList(list2).concat(list.randomRemove(num))
		}
		if (arguments.length == 1 && Array.isArray(arguments[0])) {
			for (let i = 0; i < arguments[0].length; i++) {
				if (Array.isArray(arguments[0][i])) {
					this.set(arguments[0][i][0], arguments[0][i][1]);
				}
			}
		} else {
			if (typeof key != 'string') {
				console.log('warning: using non-string object as event key');
				console.log(key, value);
				console.log(_status.event);
			}
			this[key] = value;
			this._set.push([key, value]);
		}
		return this;
	},
	chooseButton(...args) {
		const next = game.createEvent('chooseButton');
		// let nextcreateDialog = next.next
		// Object.defineProperty(next,'createDialog',{
		//	 get(){return nextcreateDialog},
		//	 set(v){
		//		 const chooseList = (_status.event.list||_status.event.list2||_status.characterlist||[]).slice()
		//		 const {list2} = _status.event
		//		 const num = suiSet.getSelect(chooseList)
		//		 let zhuSelect = []
		//		 if(this.player===game.zhu||next.player===game.zhu) zhuSelect = suiSet.getZhuList(list2)
		//		 v[1][0] = chooseList.randomRemove(num).concat(zhuSelect)
		//		 nextcreateDialog = v
		//	 },
		//	 configurable:true,
		// })
		if (this === game.zhu) {
			next.set = suiSet.nextSet
		}
		const selectType = {
			boolean(item) {
				if (!next.forced) next.forced = item
				else next.complexSelect = item
			},
			dialog(item) {
				next.dialog = item
				next.closeDialog = true
			},
			select(item) {
				next.selectButton = item
			},
			number(item) {
				next.selectButton = [item, item];
			},
			function(item) {
				if (next.ai) next.filterButton = item
				else next.ai = item
			},
			array(item) {
				next.createDialog = item
			},
		}
		args.forEach(a => {
			let type = get.itemtype(a)
			const typeif = typeof a
			if (Array.isArray(a)) type = 'array'
			if (typeif === 'boolean') type = 'boolean'
			typeof selectType[type] === 'function' && selectType[type](a)
		})
		next.player = this;
		if (typeof next.forced != 'boolean') next.forced = false;
		if (next.isMine() == false && next.dialog) next.dialog.style.display = 'none';
		if (next.filterButton == undefined) next.filterButton = lib.filter.filterButton;
		if (next.selectButton == undefined) next.selectButton = [1, 1];
		if (next.ai == undefined) next.ai = function () { return 1; };
		if (next.complexSelect !== false) next.complexSelect = true;
		next.setContent('chooseButton');
		next._args = Array.from(arguments);
		next.forceDie = true;
		return next;
	},
	chooseButtonOL(list, callback, ai) {
		const chooseList = (_status.event.list || _status.event.list2 || _status.characterlist || []).slice()
		const bool = list.every(i => {
			if (typeof i[1] !== 'object') return false
			if (typeof i[1][1] !== 'object') return false
			return Object.prototype.toString.call(i[1][1][0]) === '[object Array]'
		})
		if (chooseList && chooseList.length > 0 && bool) {
			const num = suiSet.getSelect(chooseList)
			list.forEach(i => {
				i[1][1][0] = chooseList.randomRemove(num)
			})
			const next = game.createEvent('chooseButtonOL');
			next.list = list;
			next.setContent('chooseButtonOL');
			next.ai = ai;
			next.callback = callback;
			next._args = Array.from(arguments);
			return next
		}


		const next = game.createEvent('chooseButtonOL');
		next.list = list;
		next.setContent('chooseButtonOL');
		next.ai = ai;
		next.callback = callback;
		next._args = Array.from(arguments);
		return next;
	},
	copyCharacter({ character, hp, skills, name, translate }) {
		const { sex, group, trashBin } = lib.character[character]
		lib.character[name] = new lib.element.Character([sex, group, hp, skills])
		lib.character[name].maxHp = lib.character[name].hp = hp
		if (trashBin.some(t => t.includes("ext:"))) {
			lib.character[name].trashBin = trashBin
		}
		lib.character[name].trashBin.push(`character:${character}`)
		lib.character[name].trashBin.push(`die_audio:${character}`)
		lib.character[name].trashBin.remove('hiddenSkill')
		lib.translate[name] = translate
		return lib.character[name]
	},
	setPlayersSeat(first = game.zhu) {
		let seat = 1
		while (!first.next.seatNum || !first.seatNum) {
			first.seatNum = seat
			seat++
			first = first.next
		}
	},
	getCardPileSkills() {
		if (!lib.configOL) return [];
		if (!lib.configOL.cardPack) return [];
		const cards = []
		lib.configOL.cardPack.forEach(p => {
			if (Array.isArray(lib.cardPack[p])) {
				lib.cardPack[p].forEach(c => {
					if (!lib.configOL.bannedcards.includes(c)) {
						cards.push(c)
					}
				})
			}
		})
		return cards
	},
	vcardx(item, type, position, noclick, node) {
		const card = ui.create.buttonPresets.vcard(item, type, position, noclick, node)
		if (lib.skillReplace[lib.translate[item]].length < 2) return card
		const id = lib.skillReplace[lib.translate[item]].indexOf(item)
		const intro = ui.create.div(".button.replaceButton", `切换-${id + 1}`, card);
		intro.style.zIndex = '100000000'
		intro._node = card
		intro[lib.experimental.symbol.itemType] = "button";
		card.node.replaceButton = intro
		card.refresh = function (node, item) {
			if (!_status.skillMap[item]) {
				if (item.includes("_")) {
					const index = item.indexOf("_")
					item = item.slice(0, index)
				}
				if (!_status.skillMap[item]) return;
			}
			const character = _status.skillMap[item]
			node.setBackground(character, "character");
		}
		intro.addEventListener(lib.config.touchscreen ? "touchend" : "click", function () {
			_status.tempNoButton = true;
			const node = this._node;
			const list = lib.skillReplace[lib.translate[node.name]];
			let link = node.name;
			let index = list.indexOf(link);
			if (index == list.length - 1) index = 0;
			else index++;
			link = list[index];
			node.node.replaceButton.innerHTML = `切换-${index + 1}`
			node.name = link
			node.link = node.link.slice();
			node.link[2] = link
			node.refresh(node, link);
			setTimeout(function () {
				delete _status.tempNoButton;
			}, 200);
		})
		return card
	},
	oldidentityList: get.identityList,
	identityList(numOfPlayers) {
		const identityFunc = suiSet.oldidentityList
		const list = identityFunc(numOfPlayers)
		if (lib.configOL.identity_neiReplaceZhong) {
			list.remove('nei')
			list.push('zhong')
		}
		return list
	},
	getInfo(skill, player) {
		if (!player) player = '目标'
		const translation = get.translation(skill)
		let translate = lib.translate[skill + "_info"]
		if (translate === translation) {
			const info = lib.skill[skill]
			if (!info) return
			const content = info.intro.content
			if (typeof content === 'string') {
				translate = content
			} else {

			}
		}
		return translate
	},
	getSkillMapOfCharacter(characters, func) {
		// const allSkills = Object.keys(lib.skill)
		// const skillList = []
		const skillList2 = []
		const numbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
		characters.forEach(s => {
			const theSkills = lib.character[s][3]
			theSkills.forEach(t => {
				// const moreSkills = allSkills.filter(cs=>cs.includes(t)&&cs!==t)
				const moreSkills = []
				numbers.forEach(n => {
					const skill = t + n
					if (skill in lib.skill) {
						moreSkills.push(t + n)
					}
				})
				const info = lib.skill[t]
				if (!info) return
				if (info.equipSkill) return;
				const derivation = (Array.isArray(info.derivation) ? [...theSkills, ...info.derivation] : [...theSkills, info.derivation]).filter(Boolean).addArray(moreSkills)
				derivation.forEach(is => {
					const groupSkill = lib.skill[is]
					if (!groupSkill || !suiSet.getInfo(is)) return;
					const { subSkill, global, viewAs, chooseButton, mod, charlotte, equipSkill, content, nopop, dutySkill, hiddenSkill, juexingji, zhuSkill } = groupSkill
					if (!skillList2.includes(is) && !charlotte && !equipSkill && (subSkill || global || content || viewAs || chooseButton || mod) && !nopop && !hiddenSkill  /*!dutySkill && !juexingji && !zhuSkill*/) {
						// skillList.push({ skill: is, name: s })
						skillList2.push(is)
						func(is, s)
					}
				})
			})
		})
		// return skillList
	},
	async gameSelect(event) {
		if (_status.brawl && _status.brawl.noGameDraw) {
			event.finish();
			return;
		}
		get.cards(0)//这句话只是创建牌堆而已
		const playerCards = {}
		const sliceNum = Math.floor(ui.cardPile.childNodes.length / game.players.length)
		game.players.forEach(p => {
			playerCards[p.playerid] = get.cards(sliceNum)
		})

		let numx = event.num
		if (lib.node.torespond) {
			const chooseList = game.players.map(player => {
				const cards = playerCards[player.playerid]
				if (typeof numx === 'function') {
					numx = numx(player)
				}
				return [player, [`请选择${numx}张初始手牌`, [cards, 'card']], numx, true]
			})

			// const list = [];
			// for (let i = 0; i < game.players.length; i++) {
			//	 const player = game.players[i]
			//	 const skillList = playerCards[player.playerid]
			//	 if(typeof numx === 'function'){
			//		 numx = numx(player)
			//	 }
			//	 list.push([player, [`请选择${numx}张初始手牌`, [skillList, 'card']], numx, true]);
			// }

			const { result } = await game.me.chooseButtonOL(chooseList)
			for (const r in result) {
				const player = lib.playerOL[r]
				const cards = result[r].links
				const playerCard = playerCards[player.playerid]
				player.directgain(cards)
				playerCard.forEach(card => {
					if (!cards.includes(card)) {
						ui.cardPile.insertBefore(card, ui.cardPile.firstChild);
					}
				})
				player._start_cards = player.getCards("h");
			}
		} else {
			for await (const player of game.players) {
				if (typeof numx === 'function') numx = numx(p)
				const playerCard = playerCards[player.playerid]
				const result = await player.chooseButton([`请选择起始牌${numx}张`, playerCard], numx, true);
				const cards = result.result.links
				player.directgain(cards)
				playerCard.forEach(card => {
					if (!cards.includes(card)) {
						ui.cardPile.insertBefore(card, ui.cardPile.firstChild);
					}
				})
				player._start_cards = player.getCards("h");
			}
			// event.changeCard = get.config("change_card")
			// if(event.changeCard){
			//	 const bool = await game.me.chooseBool().set('prompt','是否置换手牌？<br><del>但是都自选了还置换吗</del>')
			//	 if(bool.result.bool){
			//		 const hs = game.me.getCards("h");
			//		 game.addVideo("lose", game.me, [get.cardsInfo(hs), [], [], []]);
			//		 hs.forEach(h=>h.discard(false))
			//		 game.me.directgain(get.cards(hs.length));
			//	 }
			// }
		}
	},
	};
}

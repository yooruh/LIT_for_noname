import { lib, game, ui, get, ai, _status } from '../../../../noname.js'
import { playerConfig } from '../config.js'
export const suiSet = {
	mode: [
		'identity', /* 'doudizhu', */ 'DIYmode', 'tiaozhan', 't_jiuzhou',
	],
	igextension: [
		'全能搜索', '应用配置', '拖拽读取', '在线更新', '一劳永逸', 'SJ Settings', '武将修改', 'AI优化', 'OL设置', 'OLset', '叁岛世界'
	],
	addImport(url, end = () => { }) {
		const script = document.createElement('script')
		script.type = 'module'
		script.src = lib.assetURL + url
		document.head.appendChild(script)
		script.onload = () => {
			end()
			script.remove()
		}
		return script
	},
	comboObject(reObject, opts) {
		if (typeof opts !== 'object') return;
		const addObjectKey = (retarget, myTarget) => {
			for (const i in myTarget) {
				if (retarget[i] && typeof myTarget[i] === 'object') {
					addObjectKey(retarget[i], myTarget[i])
				} else {
					retarget[i] = myTarget[i]
				}
			}
		}
		addObjectKey(reObject, opts)
	},
	node(tag, selection, parentNode, event, func) {
		const node = document.createElement(tag)
		for (const n in selection) {
			node[n] = selection[n]
		}
		if (parentNode) {
			parentNode.appendChild(node)
		}
		if (event) {
			if (typeof func === 'string') {
				func = suiSet.selectFun[func]
			} else {
				node.addEventListener(event, func)
			}
		}
		return node
	},
	exeCute: {
		forObject(object, func) {
			for (const c in object) {
				func(c, object)
			}
		}
	},
	getSkillByName(names, map) {
		if (names.length === 0) return;
		map.pushList = {}
		const anothSkill = names.map(p => {
			const [, , , skills] = lib.character[p]
			const name = skills.randomGet()
			map.pushList[name] = p
			return name
		});
		return anothSkill
	},
	initList(func = () => { }, unforbidai) {
		let letItBand = c => {
			if (lib.config.forbidai.includes(c)) return true
			if (lib.config.banned.includes(c)) return true
			// if (lib.characterFilter[c] && !lib.characterFilter[c](get.mode())) return true;
			if (lib.configOL.banned.includes(c) || lib.connectBanned.includes(c)) return true;
		}
		if (unforbidai) {
			letItBand = c => {
				if (lib.config.banned.includes(c)) return true
				if (lib.configOL.banned.includes(c) || lib.connectBanned.includes(c)) return true;
			}
		}
		lib.connectBanned.remove('shen_diaochan')
		const libCharacter = {}
		lib.configOL.characterPack.forEach(p => {
			const pack = lib.characterPack[p]
			for (const c in pack) {
				func(c, p)
				if (!lib.configOL.banned.includes(c) && !letItBand(c)) {
					if (lib.character[c]) libCharacter[c] = pack[c];
				}
			}
		})
		return libCharacter
	},
	getSelect(list) {
		if (typeof list !== 'number') {
			list = list.length
		}
		const mode = get.mode()
		let num = lib.configOL[mode + '_select'] || lib.configOL[`${mode}_Selects`]
		num = !parseInt(num) ? '11' : num
		if (num === 'no1') return 5
		if (num === '11') return Math.floor(list / game.players.length)
		return parseInt(num)
	},
	modeConfig: {},
	createFloatBall() {
		const ball = suiSet.node('div', {
			id: 'sstball', className: 'nomal canmove',
			innerHTML:/*html*/`
			<svg  width="16" height="16" fill="currentColor" class="bi bi-tools" viewBox="0 0 16 16">
				<path d=""/>
			</svg>
			`
		}, document.body)
		ball.configs = suiSet.node('div', { id: 'animateConfig', className: 'aniConfig close', innerHTML: '' }, document.body)
		ball.addEventListener(lib.config.touchscreen ? 'touchend' : 'mousedown', suiSet.activeFlatBall)
		new suiSet.MoveModel(ball, node => {
			const fn = node.configs.classList.contains('opening') ? 'remove' : 'add'
			node.configs.classList[fn]('opening')
		})
		ball.style.animation = 'left 1s ease 0.1s forwards'
		suiSet.initFloatBall(ball.configs)
		const tool = "M1 0 0 1l2.2 3.081a1 1 0 0 0 .815.419h.07a1 1 0 0 1 .708.293l2.675 2.675-2.617 2.654A3.003 3.003 0 0 0 0 13a3 3 0 1 0 5.878-.851l2.654-2.617.968.968-.305.914a1 1 0 0 0 .242 1.023l3.27 3.27a.997.997 0 0 0 1.414 0l1.586-1.586a.997.997 0 0 0 0-1.414l-3.27-3.27a1 1 0 0 0-1.023-.242L10.5 9.5l-.96-.96 2.68-2.643A3.005 3.005 0 0 0 16 3c0-.269-.035-.53-.102-.777l-2.14 2.141L12 4l-.364-1.757L13.777.102a3 3 0 0 0-3.675 3.68L7.462 6.46 4.793 3.793a1 1 0 0 1-.293-.707v-.071a1 1 0 0 0-.419-.814L1 0Zm9.646 10.646a.5.5 0 0 1 .708 0l2.914 2.915a.5.5 0 0 1-.707.707l-2.915-2.914a.5.5 0 0 1 0-.708ZM3 11l.471.242.529.026.287.445.445.287.026.529L5 13l-.242.471-.026.529-.445.287-.287.445-.529.026L3 15l-.471-.242L2 14.732l-.287-.445L1.268 14l-.026-.529L1 13l.242-.471.026-.529.445-.287.287-.445.529-.026L3 11Z"
		setTimeout((ball, tool) => {
			const path = ball.firstElementChild.firstElementChild
			path.setAttribute('d', tool)
		}, 0, ball, tool);
		suiSet.floatBall = ball
	},
	initFloatBall(configs) {
		// suiSet.floatBall
	},
	canMove(node, func) {
		node.classList.add('canmove')
		node.moveEndFunc = func
	},
	MoveModel: class {
		constructor(node, click) {
			this.click = click
			if (node) {
				node.classList.add('canmove')
			}
			document.addEventListener(lib.config.touchscreen ? 'touchstart' : 'mousedown', this.moveStart)
			return node
		}
		moveStart = (e) => {
			this.startTime = get.utc()
			const epoiont = e.touches ? e.touches[0] : e
			const DOM = document.elementFromPoint(epoiont.clientX, epoiont.clientY);
			if (DOM.classList.contains('canmove')) {
				DOM.storage = {
					animation: DOM.style.animation,
					transition: DOM.style.transition,
				}
				DOM.style.animation = ''
				DOM.style.transition = 'unset'
				document.addEventListener(lib.config.touchscreen ? 'touchmove' : 'mousemove', this.moveIng)
				document.addEventListener(lib.config.touchscreen ? 'touchend' : 'mouseup', this.moveEnd)
				DOM.classList.replace('canmove', 'moveing')
				suiSet.moveIngDom = DOM;
				if (!DOM.transforms) {
					DOM.transforms = {
						startX: epoiont.pageX,
						startY: epoiont.pageY
					}
					DOM.nowtransforms = {
						x: epoiont.pageX - DOM.transforms.startX,
						y: epoiont.pageY - DOM.transforms.startY
					}
				} else {
					const { x, y } = DOM.nowtransforms
					DOM.transforms = {
						startX: epoiont.pageX - x,
						startY: epoiont.pageY - y
					}
				}
			}
		}
		moveIng = e => {
			if (!suiSet.moveIngDom) return;
			const epoiont = e.touches ? e.touches[0] : e
			const dom = suiSet.moveIngDom
			const x = epoiont.clientX - dom.transforms.startX
			const y = epoiont.clientY - dom.transforms.startY
			dom.nowtransforms = { x, y }
			dom.style.transform = `translate3d(${x}px,${y}px,0px)`
			dom.style['will-change'] = 'transform'
		}
		moveEnd = e => {
			if (!suiSet.moveIngDom) return;
			const now = get.utc();
			if (now - this.startTime < 200 && this.click) {
				this.click(suiSet.moveIngDom)
			} else if (typeof this.moveEndFunc === 'function') {
				this.modeFunction(this, e)
			}
			document.removeEventListener(lib.config.touchscreen ? 'touchmove' : 'mousemove', this.moveIng)
			document.removeEventListener(lib.config.touchscreen ? 'touchend' : 'mouseup', this.moveEnd)
			suiSet.moveIngDom.classList.replace('moveing', 'canmove')
			delete suiSet.moveIngDom
		}
	},
	replaceHandcardsnum: 1,
	replaceHandcards(...args) {
		if (suiSet.replaceHandcardsnum > lib.config['extension_叁岛世界_fun_replaceHandCards']) return;
		const next = game.createEvent('replaceHandcards');
		if (Array.isArray(args[0])) next.players = args[0];
		else next.players = args.filter(a => get.itemtype(a) == 'player')
		next.setContent(_status.connectMode ? 'replaceHandcardsOL' : 'replaceHandcards')
		suiSet.replaceHandcardsOver = true
	},
	replaceHandcardEvent() {
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
				p.send(send, lib.config['extension_叁岛世界_fun_replaceHandCards'], lib.config['extension_叁岛世界_edit_noAllReplace']);
				p.wait(sendback);
			} else if (p == game.me) {
				event.withme = true;
				const num = lib.config['extension_叁岛世界_fun_replaceHandCards'] - game.me.replaceHandcardsnum
				if (_status.weChat) {
					game.addVideo('replaceHandCards', game.me, {
						bool: lib.config['extension_叁岛世界_edit_noAllReplace'],
						num
					})
				}
				if (lib.config['extension_叁岛世界_edit_noAllReplace']) {
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
		}
	},
	executeConnect({ player, version, config, banned_info }) {
		const playerFunction = {
			tipExtension(player) {
				player.send(function (ext) {
					if (!ui.extnode) {
						ui.extnode = ui.create.div('.foomext', '扩展列表').css({
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
	globalSkills: {},
	modeCharacter({ player, version, config, banned_info }) {
		player.send(skills => {
			for (const s in skills) lib.skill[s] = skills[s]
		}, suiSet.globalSkills)
		if (_status.playerCharactersUse) {
			player.send(_status.playerCharactersUse, _status.playerCharacters, _status.style.innerHTML, suiSet.copyCharacter)
		}
	},
	toString() {
		const args = Array.from(arguments);
		if (typeof args[0] == "function") {
			args.unshift("exec");
		}
		for (let i = 1; i < args.length; i++) {
			args[i] = get.stringifiedResult(args[i]);
		}
		return JSON.stringify(args)
	},
	send(name, ...args) {
		if (!suiSet.strings[name]) {
			suiSet.strings[name] = suiSet.toString(...args)
		}
		return this.ws.send(suiSet.strings[name])
	},
	strings: {},
	createElement(element, option, par) {
		const node = document.createElement(element)
		for (const i in option) {
			node[i] = option[i]
		}
		if (par) {
			par.appendChild(node)
		}
		return node
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
	gameDraw(player, num = 4) {
		const fnum = lib.config['extension_叁岛世界_fun_beginDraw']??num;
		if (typeof funm === 'function') {
			const result = num
			num = function (player) {
				const n = result.call(this, player)
				const more = (n - 4);
				return more + resolveDraw
			}
		} else {
			num = parseInt(fnum)
		}
		const next = game.createEvent('gameDraw');
		next.player = player || game.me;
		next.num = num;
		const begeinDraw = lib.config['extension_叁岛世界_edit_selectGameDraw']
		next.setContent(begeinDraw ? 'gameSelect' : 'gameDraw');
		return next;
	},
	createCharacter(name, translate, sex, group, hp, skills, extens) {
		const copy = suiSet.copyCharacter(name)
		const character = new lib.element.Character()
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
	replacePlayer(ws, player) {
		return '这个方法已经废弃了，请使用suiSet.swapPlayer'
		if (ws instanceof lib.element.Player) {
			ws = ws.ws
		}
		//首先先给要上场的角色视角换到要下场的目标去
		ws.send((player, ws, identity) => {
			game.swapPlayer(game.me, player)
			ui.arena.classList.remove("observe")
			delete game.observe
			const chat = [...ui.system2.childNodes].some(c => c.innerHTML === '聊天')
			if (!chat) {
				ui.create.chat()
			}
			game.onlineID = ws.id
			game.me.setIdentity(identity)
		}, player, ws, player.identity)

		//然后再把要上场的角色移除旁观
		if (lib.node.observing.includes(ws)) {
			lib.node.observing.remove(ws)
		}

		const playerws = player.ws
		const playerid = player.playerid
		//保存一下要下场的角色ws和id，待会准备换到旁观去

		if (playerws) {
			lib.node.observing.push(playerws)
			//把下场角色放到旁观去
		}
		player.ws = ws
		// 把下场角色的ws换成要上场角色的ws

		delete lib.playerOL[playerid]
		lib.playerOL[ws.id] = player
		player.nickname = ws.nickname
		player.setNickname(ws.nickname)
		//删掉旧的迎接新的


		if (lib.node.observing.length === 0) {
			if (ui.removeObserve) {
				ui.removeObserve.remove()
			}
		}

		//应该不会那么简单，我去看看源代码
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
	playerToobserve(player) {
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
	getPromise() {
		let promise, resolve, reject, then
		promise = new Promise((a, b) => {
			resolve = a
			reject = b
		})
		then = promise.then
		return { promise, resolve, reject, then }
	}
}
window.suiSet = suiSet
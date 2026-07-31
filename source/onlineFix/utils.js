import { lib, game, ui, get, ai, _status } from '../../../../noname.js';

export function createOnlineUtils(suiSet) {
	return {
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
	getPromise() {
		let promise, resolve, reject, then
		promise = new Promise((a, b) => {
			resolve = a
			reject = b
		})
		then = promise.then
		return { promise, resolve, reject, then }
	}
	};
}

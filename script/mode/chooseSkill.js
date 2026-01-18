import { game, ui, _status, ai, lib, get } from "../../../../noname.js";
import { suiSet } from "../../source/suiSet.js";
export function initBegin() {
	game.broadcast((vcardx) => { ui.create.buttonPresets.vcardx = vcardx }, suiSet.vcardx)
	//这个东西挺重要的，需要它来制作选择的卡牌

	const characterList = Object.keys(suiSet.initList(() => { }));
	//初始化一下武将

	_status.style = {
		innerHTML:/*css*/`
		.player .playerskillList {
			color: orange;
			font-weight: 700;
			text-shadow: 1px 1px black;
			z-index: 90000000;
		}
		.player:not([data-position="0"]) .playerskillList {
			width: 70px;
			height: auto;
			top: 35%;
			border-radius: 5px;
			text-align: center;
			line-height: 2;
			left: 20%;
			padding: 0 10px;
			font-size: 15px;
		}
		.player[data-position="0"] .playerskillList {
			top: -30px;
			left: 15px;
		}
	`
	}
	game.broadcastAll((list, innerHTML) => {
		const style = document.createElement('style')
		style.innerHTML = innerHTML
		document.head.appendChild(style)
		game.players.forEach((p, i) => {
			p.node.rightskillList = ui.create.div('.playerskillList', p)
			if (!p.nickname) {//||(p.ws&&!p.isOnline2())
				lib.character[list[i]][3] = []
				lib.character[list[i]][2] = 4
				p.init(list[i])
			}
		})
		game.me.update()
	}, characterList.randomGets(10), _status.style.innerHTML)
	//发送一个样式，就是技能的显示，这里看一下就好了

	_status.characterlist = characterList.slice()//这样就完成了
}
export function initPlayers() {
	const initPlayers = game.players.map(p => {
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
			return [p.playerid, avatar, nickname]
		}
	}).filter(Boolean)
	//筛选掉人机

	game.broadcastAll((players) => {
		players = players.map(p => [lib.playerOL[p[0]], p[1], p[2]])
		ui.arena.classList.add('choose-character');
		players.forEach(([player, avatar, name]) => {
			name = name.replace('※', '')
			const id = name + player.playerid
			let { 0: sex, 1: group, 2: hp, 3: skills, 4: fromTrash, 5: extraModeData } = lib.character[avatar]
			if (!fromTrash) fromTrash = [`character:${avatar}`]
			else fromTrash.push(`character:${avatar}`)
			lib.character[id] = new lib.element.Character([sex, group, hp, [], fromTrash, extraModeData])
			lib.translate[id] = name
			player.init(id)
			player.update()
		})
	}, initPlayers)
	//然后初始化一下玩家们

	suiSet.setPlayersSeat(game.zhu)
	//设置一下位置
}
function initSkill(num) {
	const skillList = []
	const map = {}
	lib.skillReplace = {}
	_status.skillMap = {}
	_status.zhuSkills = {}

	suiSet.getSkillMapOfCharacter(characterList, (skill, name) => {
		const translate = lib.translate[skill]
		if (!lib.skillReplace[translate]) {
			lib.skillReplace[translate] = []
			skillList.push({ skill, name })
		}
		const group = lib.character[name].group
		const theSkill = lib.skill[skill]
		if (theSkill && theSkill.zhuSkill) {
			if (group in _status.zhuSkills) {
				_status.zhuSkills[group].push(skill)
			} else {
				_status.zhuSkills[group] = []
			}
		}
		if (!theSkill.zhuSkill) {
			lib.skillReplace[translate].add(skill)
		}
		_status.skillMap[skill] = name
	})
	//通过武将获取技能

	game.broadcast((translates) => {
		lib.skillReplace = translates
	}, lib.skillReplace)
	//一些同名的技能应该是支持切换的才对，把它发送给其他玩家

	game.broadcastAll((map) => {
		_status.skillMap = map
		for (const m in map) {
			if (m.includes('_skill')) {
				lib.card[m] = {
					fullimage: true,
					cardimage: m.slice(0, -6)
				}
				lib.translate[m + "_info"] = lib.translate[m.slice(0, -6) + "_info"]
			} else {
				lib.card[m] = {
					fullimage: true,
					image: 'character:' + map[m]
				}
			}
		}
	}, _status.skillMap)
	//这里就是生成技能选择的那种“卡牌”就是武将原画然后旁边写着它的技能

	game.players.forEach(p => {
		if (!lib.playerCharacterOL[p.playerid]) {
			lib.playerCharacterOL[p.playerid] = []
		}
		if (p.identity === 'nei') {
			num += Math.floor(num * 0.3)
		}
		const skills = skillList.randomRemove(num)
		if (!map[p.playerid]) map[p.playerid] = {}
		skills.forEach(({ skill, name }) => {
			map[p.playerid][skill] = name
			if (skill.includes("_skill")) return
			lib.playerCharacterOL[p.playerid].add(name)
		})
	})
	//这边就是给玩家随机分配一些技能供他们选择
	return map
}
export async function chooseSkill() {
	const num = suiSet.getSelect(_status.characterList)//框个数
	const selectNum = 2//选择个数
	const map = initSkill(num)
	const list = [];
	for (let i = 0; i < game.players.length; i++) {
		const player = game.players[i]
		const skillList = Object.keys(map[player.playerid])
		list.push([player, ['选择技能', [skillList, 'vcardx']], selectNum, true]);
	}
	const { result } = await game.me.chooseButtonOL(list);
	for (const r in result) {
		const player = lib.playerOL[r]
		const skills = result[r].links.map(s => s[2])
		game.addVideo('initSkill', player, { skills, me: player === game.me })
		if (player === game.me) {
			game.addVideo('closeDialog')
		}
		game.broadcastAll((player, skills) => {
			if (player === game.me) {
				let str = ''
				skills.forEach(s => str += get.translation(s) + ' ')
				player.node.rightskillList.innerHTML = str
			}
		}, player, skills)
		lib.playerSkillOL[player.playerid] = skills
	}
}
export async function chooseAvatar() {
	//选形象
	const playerAvatarMap = {}
	game.players.forEach(p => playerAvatarMap[p.playerid] = lib.playerCharacterOL[p.playerid])

	const avatarList = [];
	game.players.forEach(player => {
		const list = playerAvatarMap[player.playerid]
		avatarList.push([player, [
			`<span style="color:red;font-weight:700;">你可以选择一个武将作为你本局的形象</span><br>
							<span class="tempName" style="color:orange;font-weight:700;text-align:center;font-size:20px;border-radius: 5px;">还可以在下方输入框写一个名字作为本局形象名字</span><br>
							<input maxlength="8"  style="width:45%;text-align: center;font-size: 20px;font-weight: 700;border-radius: 5px;" value="${player.nickname || get.translation(player.name1)}">`, [list, 'characterx']], 1, false])
	})//
	const { result } = await game.me.chooseButtonOL(avatarList, (player, result) => {
		const input = _status.event.dialog.querySelector('input')
		if (input) {
			result.tempName = input.value
		}
		if (!result.bool) return;
		if (player === game.me) {
			const character = result.links[0]
			player.node.avatar.setBackground(character, 'character')
			// player.sex = lib.character[character][0]
		}
	}).set('switchToAuto', function () {
		_status.event.result = 'ai';
	}).set('processAI', function () {
		return false
	})
	for (const i in result) {
		const bool = result[i]
		if (bool.tempName) {
			game.addVideo('flashName', lib.playerOL[i], {
				avatar: lib.playerOL[i].name,
				tempName: bool.tempName
			})
			game.broadcastAll((player, tempName) => {
				player.tempName = tempName
				player.node.name.innerHTML = tempName
			}, lib.playerOL[i], bool.tempName)
		}
		if (!bool.bool) continue
		game.broadcastAll((player, avatar, skills, tempName) => {
			const nickname = tempName || player.nickname || player.node.name1.innerText
			const id = nickname + player.playerid

			player.node.name.innerHTML = nickname
			player.tempName = tempName

			let { 0: sex, 1: group, 2: hp, 4: fromTrash, 5: extraModeData } = lib.character[avatar]
			if (!fromTrash) fromTrash = [`character:${avatar}`]
			else fromTrash.push(`character:${avatar}`)
			lib.character[id] = new lib.element.Character([sex, group, hp, skills, fromTrash, extraModeData])
			lib.translate[id] = nickname
			player.init(id)
			player.update()
		}, lib.playerOL[i], bool.links[0], lib.playerSkillOL[lib.playerOL[i].playerid], bool.tempName)
		game.addVideo('flashAvatar', lib.playerOL[i], {
			avatar: bool.links[0],
			skills: lib.playerSkillOL[lib.playerOL[i].playerid]
		})
		game.addVideo('flashName', lib.playerOL[i], {
			avatar: bool.links[0],
			tempName: bool.tempName
		})
	}
}
export async function chooseGroup() {
	const select = lib.group.map(g => ['', '', `group_${g}`])
	const groupList = game.players.map(i => {
		return [i, ['你可以选择一个势力', [select, 'vcard']], 1, false]
	})
	const { result } = await game.me.chooseButtonOL(groupList, (player, result) => {
		if (!result.links) return
		if (player === game.me) {
			player.changeGroup(result.links[0][2].slice(6), false, false);
		}
	}).set('processAI', function () {
		return false
	})
	for (const g in result) {
		if (!result[g].bool) continue
		const player = lib.playerOL[g]
		const group = result[g].links[0][2].slice(6)
		game.broadcastAll((player, group) => {
			lib.character[player.name1][1] = group
			player.changeGroup(group)
		}, player, group)
		game.addVideo('flashGroup', player, { group })
	}
}
export function addCharacterUse() {
	game.players.forEach(p => {
		const skills = lib.playerSkillOL[p.playerid]
		lib.character[p.name1].skills = skills
		_status.playerCharacters[p.playerid] = {
			player: p,
			skills: lib.character[p.name1][3],
			name: p.tempName || (p.nickname && p.nickname.replace('※', '')) || '',
			character: p.name1,
			info: lib.character[p.name1],
			group: p.group
		}
		p.addSkill(skills)
		game.broadcastAll((player, skills) => {
			lib.character[player.name1][3] = skills
			let str = ''
			skills.forEach(s => str += get.translation(s) + ' ')
			player.node.rightskillList.innerHTML = str
			if (player.nickname) {
				lib.translate[player.name1] = player.tempName || player.nickname.replace('※', '')
			}
		}, p, skills)
		game.log(`${p.node.name.innerHTML}选择了`, skills)
	})
	_status.playerCharactersUse = (characters, innnerHtml, needFunction) => {
		if (!window.suiSet) {
			window.suiSet = {
				copyCharacter: needFunction
			}
		}
		lib.skill.playerchangeSkill = {
			trigger: { player: 'changeSkillsAfter' },
			forced: true,
			charlotte: true,
			popup: false,
			filter() { return true },
			async content(event, trigger, player) {
				let str = ''
				const skills = player.getSkills(null, false, false).filter(s => get.translation(s) !== s);
				game.addVideo('initSkill', player, { skills })
				skills.forEach(i => {
					if (i === 'playerchangeSkill') return;
					const info = get.info(i);
					if (info && !info.charlotte) {
						str += get.translation(i) + ' '
					}
				});
				if (!player.node.rightskillList) {
					player.node.rightskillList = ui.create.div('.playerskillList', str, player)
				} else {
					player.node.rightskillList.innerHTML = str
				}
			}
		}
		lib.skill.PVPaozhan = {
			trigger: { global: 'dieAfter' },
			filter() { return game.players.length === 2 && !game.PVPaozhan },
			async content(event, trigger, player) {
				let color = get.groupnature(player.group, "raw");
				if (player.isUnseen()) color = "fire";
				player.$fullscreenpop("鏖战模式", color);
				game.broadcastAll(function () {
					_status._aozhan = true;
					ui.aozhan = ui.create.div(".touchinfo.left", ui.window);
					ui.aozhan.innerHTML = "鏖战模式";
					if (ui.time3) ui.time3.style.display = "none";
					ui.aozhanInfo = ui.create.system("鏖战模式", null, true);
					lib.setPopped(
						ui.aozhanInfo,
						function () {
							let uiintro = ui.create.dialog("hidden");
							uiintro.add("鏖战模式");
							let list = [
								"当游戏中仅剩两名玩家",
								"在鏖战模式下，任何角色均不是非转化的【桃】的合法目标。【桃】可以被当做【杀】或【闪】使用或打出。",
								"进入鏖战模式后，即使之后有两名或者更多的角色出现，仍然不会取消鏖战模式。",
							];
							let intro = '<ul style="text-align:left;margin-top:0;width:450px">';
							for (let i = 0; i < list.length; i++) {
								intro += "<li>" + list[i];
							}
							intro += "</ul>";
							uiintro.add('<div class="text center">' + intro + "</div>");
							let ul = uiintro.querySelector("ul");
							if (ul) {
								ul.style.width = "180px";
							}
							uiintro.add(ui.create.div(".placeholder"));
							return uiintro;
						},
						250
					);
					game.playBackgroundMusic();
				});
				game.countPlayer(function (current) {
					current.addSkill("aozhan");
				});
			},
			forced: true,
			charlotte: true,
		}
		const style = document.createElement('style')
		style.innerHTML = innnerHtml
		document.head.appendChild(style)
		for (const s in characters) {
			const { skills, name, character, info, group } = characters[s]
			skills.push('playerchangeSkill')
			lib.character[character] = info
			const thecharacter = lib.character[character]
			if (!thecharacter) continue
			thecharacter.group = group
			thecharacter.trashBin.remove('hiddenSkill')
			thecharacter.skills = skills
			lib.translate[character] = name || get.translation(character)
		}
		const oldme = ui.create.me
		ui.create.me = () => {
			const me = oldme.call(this, ...arguments)
			for (const s in characters) {
				const player = lib.playerOL[s]
				// const {skills,name} = characters[s]
				const { skills } = characters[s]
				let str = ''
				skills.forEach(s => {
					if (s === 'playerchangeSkill') return;
					str += get.translation(s) + ' '
				})
				if (!player.node.rightskillList) player.node.rightskillList = ui.create.div('.playerskillList', player)
				player.node.rightskillList.innerHTML = str
				// if(name) player.node.name.innerHTML = name
				const { x } = player.getBoundingClientRect()
				if (ui.window.clientWidth - x < 200) {
					player.classList.add('rightPlayer')
				} else if (x > 0 && x < 400) {
					player.classList.add('leftPlayer')
				}
			}
			ui.create.me = oldme
			return me
		}
	}
	game.addGlobalSkill('playerchangeSkill')
}
// export const chooseSkills = new Promise(resolve => {
//	 const next = game.createEvent('chooseSkills')
//	 next.setContent(async event => {
//		 initBegin()//先初始化一些必要的东西
//		 initPlayers()//然后把玩家初始化一下
//		 await chooseSkill()//接着选技能
//		 await chooseAvatar()//接着选形象
//		 await chooseGroup()//势力
//		 addCharacterUse()//这个就是给观战的一些资源吧，可以这么说
//	 })
//	 next.then(resolve)
// })


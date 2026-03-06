import { lib, game, ui, get, ai, _status } from '../../../../noname.js';
import { Lit_dialog } from '../tool/extraUI.js';
import basic from '../tool/basic.js'
export const type = "mode";

// ==================== 常量定义区 ====================
const GLOBAL_SKILLS = [
	"_lingli",
	"_lingli_round",
	"_lingli_draw",
	"_lingli_save",
	"_sdhh_qiankunbagua",
	"_lingli_damage",
];
const START_SKILLS = ["xiandeng", "sdhh_shulv", "xisheng"];
const BANNED_SKILLS = new Set([
	"xinfu_guhuo", "reguhuo", "jixi", "duanchang", "huashen", "xinsheng", "rehuashen", "rexinsheng", "jinqu", "nzry_binglve", "nzry_huaiju",
	"nzry_yili", "nzry_zhenglun", "nzry_mingren", "nzry_zhenliang", "drlt_qingce", "new_wuhun", "qixing", "kuangfeng", "dawu", "baonu",
	"wumou", "ol_wuqian", "ol_shenfen", "renjie", "jilue", "nzry_junlve", "nzry_dinghuo", "drlt_duorui", "chuanxin", "cunsi", "jueqing", "huilei",
	"paiyi", "fuhun", "zhuiyi", "olddanshou", "yanzhu", "juexiang", "jiexun", "bizhuan", "tongbo", "xinfu_zhanji", "xinfu_jijun", "xinfu_fangtong",
	"xinfu_qianchong", "pdgyinshi", "shuliang", "zongkui", "guju", "bmcanshi", "dingpan", "xinfu_lingren", "new_luoyan", "junwei", "gxlianhua", "qizhou",
	"fenyue", "dianhu", "linglong", "fenxin", "mouduan", "cuorui", "xinmanjuan", "xinfu_jianjie", "jianjie_faq", "new_meibu", "xinfu_xingzhao", "jici",
	"xianfu", "fenyong", "xuehen", "yingbin", "midao", "yishe", "yinbing", "juedi", "bushi", "xinfu_dianhua", "xinfu_falu", "xinfu_zhenyi", "lskuizhu",
	"pingjian", "xjshijian", "fentian", "zhiri", "xindan", "xinzhengnan", "xinfu_xiaode", "komari_xueshang", "qiaosi_map", "rechanyuan", "chanyuan"
]);
const BANNED_PACKS = ['lit_test'];

/**
 * 获取所有被禁用的技能（包括来自禁用包的技能）
 */
function getAllBannedSkills() {
	const banned = new Set(BANNED_SKILLS);
	for (const packName of BANNED_PACKS) {
		const pack = lib.characterPack[packName];
		if (!pack) continue;
		for (const char in pack) {
			if (pack[char].skills) {
				pack[char].skills.forEach(s => banned.add(s));
			}
		}
	}
	return banned;
}

/**
 * 检查技能名是否有效
 */
function isValidSkillName(skillName) {
	if (skillName.endsWith('_append') || skillName.endsWith("_faq")) return false;
	if (skillName.startsWith('lit_') && (skillName.endsWith('V2') || skillName.endsWith("_limit"))) {
		return false;
	}

	return true;
}

/**
 * 检查技能是否有效（符合幻化模式规则）
 */
function isValidSkill(skillName, bannedSkills) {
	if (!isValidSkillName(skillName)) return false;
	if (bannedSkills.has(skillName)) return false;

	const info = get.info(skillName);
	if (!info) return false;
	const invalidFlags = [
		'zhuSkill', 'juexingji', 'charlotte', 'limited',
		'hiddenSkill', 'dutySkill', 'groupSkill', 'sourceSkill',
		'lit_dk', 'lit_neg'
	];
	if (invalidFlags.some(flag => info[flag])) return false;
	if (info.ai?.combo) return false;

	return true;
}

/**
 * 从角色中提取所有可用技能（包括衍生技）
 */
function extractSkillsFromCharacter(charName, bannedSkills, existingSkills = new Set()) {
	const char = lib.character[charName];
	if (!char || !char.skills) return [];

	const skills = [];
	const toCheck = [...char.skills];

	// 收集衍生技
	for (let i = 0; i < toCheck.length; i++) {
		const skillName = toCheck[i];
		// 过滤无效技能
		if (!isValidSkillName(skillName)) continue;
		const info = get.info(skillName);
		if (!info) continue;

		if (info.derivation) {
			if (typeof info.derivation === "string") {
				toCheck.push(info.derivation);
			} else if (Array.isArray(info.derivation)) {
				toCheck.push(...info.derivation);
			}
		}
	}

	// 过滤非法技能
	for (const skillName of toCheck) {
		if (!existingSkills.has(skillName) && isValidSkill(skillName, bannedSkills)) {
			skills.push(skillName);
		}
	}
	return skills;
}

/**
 * 重置角色为4血白板状态
 */
function resetCharacterToBlank(charName) {
	const char = lib.character[charName];
	if (!char) return;
	char.hp = 4;
	char.maxHp = 4;
	char.hujia = 0;
	char.skills = [];
	char.initFilters = [];
	char.hasHiddenSkill = false;
}

/**
 * 获取可用的角色列表
 */
function getAvailableCharacters(characterLimit) {
	const characters = [];
	const bannedSkills = getAllBannedSkills();
	const findSkills = new Set();

	for (const name in lib.character) {
		if (!lib.character[name]) continue;
		if (lib.filter.characterDisabled(name)) continue;
		if (lib.sandaohuanhua.NPC.includes(name)) continue;

		// 技能限制检查
		if (characterLimit && !name.startsWith("lit_") && !name.startsWith("sdhh_")) {
			continue;
		}
		const charSkills = extractSkillsFromCharacter(name, bannedSkills, findSkills);
		charSkills.forEach(s => findSkills.add(s));

		resetCharacterToBlank(name);
		characters.push(name);
	}

	return { characters, skills: Array.from(findSkills) };
}

export default () => {
	return {
		name: "../extension/叁岛世界/source/mode/sandaohuanhua",
		splash: "ext:叁岛世界/image/splash/sandaohuanhua.png",

		// ==================== 配置区 ====================
		config: {
			player_number: {
				name: '游戏人数',
				intro: '设置游戏人数',
				init: '8',
				item: {
					'4': '四人',
					'5': '五人',
					'6': '六人',
					'7': '七人',
					'8': '八人',
				},
				frequent: true,
				restart: true,
			},
			change_card: {
				name: "开启手气卡",
				init: "disabled",
				item: {
					disabled: "禁用",
					once: "一次",
					twice: "两次",
					unlimited: "无限"
				},
				frequent: true,
			},
			characterSkill_limit: {
				name: '扩展武将技能限制',
				intro: '开启后仅限使用叁岛世界扩展的武将及其技能（lit_前缀）',
				init: true,
				frequent: true,
				restart: true,
			},
			sdhh_help: {
				name: '<button>叁岛幻化完整介绍</button>',
				intro: "点击查看【叁岛幻化】完整介绍及玩法建议",
				clear: true,
				async onclick() {
					try {
						Lit_dialog.showDocModal(
							`${basic.path}/style/html/sandaohuanhua.html`,
							'叁岛幻化完整介绍'
						);
					} catch (error) {
						console.error("获取【叁岛幻化】完整介绍失败", error);
						alert("获取【叁岛幻化】完整介绍失败");
					}
				},
			},
			sdhh_missionReset: {
				name: '<button>重置任务框的位置</button>',
				intro: "点击重置任务框的显示位置",
				clear: true,
				onclick() {
					// 强制清理 document 级别事件监听
					if (ui.sandaohuanhua?._docHandlers) {
						const handlers = ui.sandaohuanhua._docHandlers;
						document.removeEventListener("mouseup", handlers.mouseUp);
						document.removeEventListener("mousemove", handlers.mouseMove);
						document.removeEventListener("touchend", handlers.touchEnd);
						document.removeEventListener("touchmove", handlers.touchMove);
					}

					// 清除存储的位置和固定状态
					game.saveExtensionConfig('sandaohuanhua', 'uiPos', null);
					game.saveExtensionConfig('sandaohuanhua', 'uiFixed', false);

					// 重置 DOM 和交互状态
					if (ui.sandaohuanhua) {
						ui.sandaohuanhua.setFixed(false);

						// 重置样式
						ui.sandaohuanhua.style.setProperty('--sdhh-x', '0px');
						ui.sandaohuanhua.style.setProperty('--sdhh-y', '0px');
						ui.sandaohuanhua.classList.remove('fixed');
						ui.sandaohuanhua.style.pointerEvents = '';

						// 视觉反馈动画
						ui.sandaohuanhua.style.transition = 'transform 0.3s ease, opacity 0.2s';
						ui.sandaohuanhua.style.opacity = '0.5';
						ui.sandaohuanhua.style.transform = 'translateX(-50%) scale(0.95)';
						setTimeout(() => {
							if (ui.sandaohuanhua) {
								ui.sandaohuanhua.style.opacity = '';
								ui.sandaohuanhua.style.transform = '';
								setTimeout(() => {
									ui.sandaohuanhua.style.transition = '';
								}, 300);
							}
						}, 200);
					}
				},
			},
		},
		connect: {
			connect_player_number: {
				name: '游戏人数',
				intro: '设置游戏人数',
				init: '8',
				item: {
					'4': '四人',
					'5': '五人',
					'6': '六人',
					'7': '七人',
					'8': '八人',
				},
				frequent: true,
			},
			connect_change_card: {
				name: "开启手气卡",
				init: "disabled",
				item: {
					disabled: "禁用",
					once: "一次",
					twice: "两次",
					unlimited: "无限"
				},
				frequent: true,
			},
			connect_characterSkill_limit: {
				name: '扩展武将技能限制',
				intro: '开启后仅限使用叁岛世界扩展的武将及其技能（lit_前缀）',
				init: true,
				frequent: true,
				restart: true,
			}
		},

		// ==================== 初始化 ====================
		startBefore() {
			// lib初始化
			get.sdhhInit();

			// 录像初始化支持
			if (!game.videoContent._sandaohuanhua_patched) {
				game.videoContent._sandaohuanhua_patched = true;

				// 保存原方法
				const originalAddSkill = lib.element.player.addSkill;
				const originalRemoveSkill = lib.element.player.removeSkill;
				const originalInit = game.videoContent.init;
				const originalArrangeLib = game.videoContent.arrangeLib;

				game.videoContent.init = function (players) {
					if (lib.config.mode !== '../extension/叁岛世界/source/mode/sandaohuanhua') {
						if (originalInit) return originalInit.apply(this, arguments);
						return;
					}

					if (!players || !players.length) {
						console.error('叁岛幻化录像初始化失败：玩家数据为空');
						return;
					}

					ui.arena.setNumber(players.length);
					ui.arena.classList.add("video");
					game.players.length = 0;
					game.dead.length = 0;

					ui.create.players(players.length);
					game.me = game.players[0];

					if (game.me) {
						ui.handcards1 = game.me.node.handcards1;
						ui.handcards2 = game.me.node.handcards2;
						ui.handcards1Container.appendChild(ui.handcards1);
						ui.handcards2Container.appendChild(ui.handcards2);
					}

					players.forEach((info, index) => {
						const player = game.players[index];
						if (!player) return;

						const position = info.position !== undefined ? info.position : index;
						player.dataset.position = position;

						if (info.nickname) {
							player.nickname = info.nickname;
							player.setNickname();
						}

						if (info.name1 && info.name2) {
							player.init(info.name1, info.name2);
						} else if (info.name1) {
							player.init(info.name1);
						} else if (info.name) {
							player.init(info.name);
						}

						if (info.identity) {
							player.identity = info.identity;
							player.setIdentity(info.identity, player.group);
						}

						if (info.lingli !== undefined) {
							player.storage._lingli = info.lingli;
							player.markSkill("_lingli");
						}

						if (info.lingliSkill && info.lingliSkill.length) {
							player.lingliSkill = info.lingliSkill.slice(0);
							info.lingliSkill.forEach(skill => {
								if (!player.hasSkill(skill)) player.addSkill(skill);
							});
						}

						game.playerMap[position] = player;
					});

					ui.updatehl();
					// 建立 playerMap 方便引用恢复
					game.playerMap = {};
					game.players.forEach(p => {
						game.playerMap[parseInt(p.dataset.position)] = p;
					});

					// 从录像数据恢复每个玩家的任务目标
					players.forEach((info, index) => {
						const player = game.players[index];
						if (player && info.toKillPos !== undefined && info.toSavePos !== undefined) {
							player._toKill = game.playerMap[info.toKillPos];
							player._toSave = game.playerMap[info.toSavePos];
						}
					});
					get.initMissionUI();
					game.randomMission();
				};
				game.videoContent.sdhh_mission = function (data) {
					if (!game.playerMap) return;

					if (data.isAozhan) {
						_status._aozhan = true;
						if (ui.sandaohuanhua) ui.sandaohuanhua._textSpan.innerHTML = "死战模式";
					} else if (data.toKillPos !== undefined && game.me) {
						// 更新当前玩家的任务目标
						game.me._toKill = game.playerMap[data.toKillPos];
						game.me._toSave = game.playerMap[data.toSavePos];
						const me = game.me;
						if (ui.sandaohuanhua) {
							ui.sandaohuanhua._textSpan.innerHTML =
								`杀伤<span style='color:#ff5f56'>${get.translation(me._toKill)}(${me._toKill.identity})</span>，` +
								`保护<span style='color:#98fb98'>${get.translation(me._toSave)}(${me._toSave.identity})</span>`;
						}
					}
				};
				game.videoContent.arrangeLib = function (content) {
					if (lib.config.mode === '../extension/叁岛世界/source/mode/sandaohuanhua') {
						if (content && content.skill) {
							Object.assign(lib.skill, content.skill);
						}
						if (content && content.character) {
							Object.assign(lib.character, content.character);
						}
					}
					if (originalArrangeLib) {
						return originalArrangeLib.apply(this, arguments);
					}
				};
				// skill录像处理
				game.videoContent.sdhh_addSkill = function (player, skill) {
					if (!player.hasSkill(skill)) {
						player.addSkill(skill);
					}
				};
				game.videoContent.sdhh_removeSkill = function (player, skill) {
					if (player.hasSkill(skill)) {
						player.removeSkill(skill);
					}
				};

				// 重写 addSkill
				lib.element.player.addSkill = function (skill) {
					const result = originalAddSkill.apply(this, arguments);
					if (this.hasSkill(skill)) {
						game.addVideo('sdhh_addSkill', this, skill);
					}
					return result;
				};
				// 重写 removeSkill
				lib.element.player.removeSkill = function (skill) {
					game.addVideo('sdhh_removeSkill', this, skill);
					return originalRemoveSkill.apply(this, arguments);
				};
			}
		},
		// 联机重进
		onreinit() {
			get.sdhhInit();
			get.initMissionUI();

			let elapsed = 0;
			const timer = setInterval(() => {
				elapsed += 100;

				// 10秒超时退出
				if (elapsed >= 10000) {
					clearInterval(timer);
					return;
				}
				if (get.playerx().length <= 0) return;

				// 检测到玩家存在后执行
				clearInterval(timer);
				const me = game.me;
				if (get.playerx().length <= 4 && !_status._aozhan) {
					_status._aozhan = true;
					if (ui.sandaohuanhua?._textSpan) {
						ui.sandaohuanhua._textSpan.innerHTML = "死战模式";
					}
				} else if (me?._toKill && me?._toSave && ui.sandaohuanhua?._textSpan) {
					ui.sandaohuanhua._textSpan.innerHTML =
						`杀伤<span style='color:#ff5f56'>${get.translation(me._toKill)}(${me._toKill.identity})</span>，` +
						`保护<span style='color:#98fb98'>${get.translation(me._toSave)}(${me._toSave.identity})</span>`;
				}
			}, 100);
		},

		// ==================== 游戏流程 ====================
		async start(event) {
			const playback = localStorage.getItem(lib.configprefix + "playback");
			if (playback) {
				ui.create.me();
				ui.arena.style.display = "none";
				ui.system.style.display = "none";
				_status.playback = playback;
				localStorage.removeItem(lib.configprefix + "playback");

				const store = lib.db.transaction(["video"], "readwrite").objectStore("video");
				store.get(parseInt(playback)).onsuccess = function (e) {
					if (e.target.result) {
						game.playVideoContent(e.target.result.video);
					} else {
						alert("播放失败：找不到录像");
						game.reload();
					}
				};
				return;
			}

			if (!_status.connectMode) {
				const playerNumber = get.config("player_number") || 8;
				game.prepareArena(parseInt(playerNumber));
				game.players.forEach(p => p.getId());

				get.initMissionUI();
				await game.chooseCharacter();
			} else {
				// 房间等待区
				const playerNumber = lib.configOL.player_number || 8;
				await game.waitForPlayer(() => {
					lib.configOL.number = parseInt(playerNumber);
				});
				if (lib.configOL.number < 2) lib.configOL.number = 8;

				game.randomMapOL();
				if (!lib.playerOL || Object.keys(lib.playerOL).length === 0) {
					await new Promise(resolve => {
						const check = setInterval(() => {
							if (lib.playerOL && Object.keys(lib.playerOL).length > 0) {
								clearInterval(check);
								resolve();
							}
						}, 50);
						setTimeout(() => {
							clearInterval(check);
							resolve();
						}, 3000);
					});
				}

				if (!game.players || game.players.length === 0) {
					if (lib.playerOL && Object.keys(lib.playerOL).length > 0) {
						const players = Object.values(lib.playerOL);
						players.sort((a, b) => (a.seatNum || 0) - (b.seatNum || 0));
						game.players = players;
						game.playerMap = {};

						players.forEach((p, i) => {
							if (!p.dataset) p.dataset = {};
							p.dataset.position = i;
							game.playerMap[i] = p;
						});

						if (!game.me || !players.includes(game.me)) {
							const myPlayerId = game.onlineID || (window.lib && lib.config && lib.config.id);
							if (myPlayerId && lib.playerOL[myPlayerId]) {
								game.me = lib.playerOL[myPlayerId];
							} else {
								game.me = players.find(p => p.isMe) || players[0];
							}
						}
					} else {
						console.error("联机模式：lib.playerOL 为空，无法初始化");
						return;
					}
				}

				// 接onreinit()
				game.broadcast(() => {
					get.sdhhInit();
					get.initMissionUI();
				});
				get.initMissionUI();
			}

			GLOBAL_SKILLS.forEach(skill => game.addGlobalSkill(skill));
			game.syncState();
			await event.trigger("gameStart");

			const specialCards = [
				await game.createCard("sdhh_fudichouxin", "spade", 13),
				await game.createCard("sdhh_toulianghuanzhu", "heart", 9),
				await game.createCard("sdhh_toulianghuanzhu", "club", 5),
				await game.createCard("sdhh_toulianghuanzhu", "diamond", 1),
			];

			specialCards.forEach(card => {
				ui.cardPile.insertBefore(card, ui.cardPile.childNodes[get.rand(ui.cardPile.childElementCount)]);
			});
			game.updateRoundNumber();

			if (game.players && game.players.length > 0) {
				const players = get.players(lib.sort.position);
				const info = players.map(p => ({
					name: p.name1,
					name2: p.name2,
					identity: p.identity,
					nickname: p.nickname || (p.node && p.node.nameol ? p.node.nameol.innerHTML : ''),
					position: parseInt(p.dataset.position),
					_hSeat: p._hSeat,
					lingli: p.storage ? (p.storage._lingli || 0) : 0,
					lingliSkill: p.lingliSkill ? p.lingliSkill.slice(0) : [],
					toKillPos: p._toKill ? parseInt(p._toKill.dataset.position) : undefined,
					toSavePos: p._toSave ? parseInt(p._toSave.dataset.position) : undefined,
				}));

				_status.videoInited = true;
				game.addVideo("init", null, info);

				const characterData = {};
				lib.sandaohuanhua.NPC.forEach(name => {
					if (lib.character[name]) characterData[name] = lib.character[name];
				});

				game.addVideo("arrangeLib", null, {
					skill: {
						_lingli: {
							mark: true,
							marktext: "灵",
							popup: "聚灵",
							intro: {
								name: "灵力",
								content: "当前灵力点数：# / 5",
							},
						},
						sdhh_huilei: { skillAnimation: true },
						sdhh_youlian: { skillAnimation: true },
					},
					character: characterData,
				});
			}

			let startPlayer = game.zhu || _status.firstAct || game.me;

			if (!startPlayer && game.players && game.players.length > 0) {
				startPlayer = game.players[0];
				_status.firstAct = startPlayer;
			}

			const next = game.gameDraw(startPlayer);
			next.num = (player) => {
				if (!player || player._hSeat === undefined) return 4;
				return player._hSeat > 5 ? 5 : 4;
			};
			await game.phaseLoop(startPlayer);
		},

		game: {
			getState() {
				const state = {};
				for (const i in lib.playerOL) {
					const player = lib.playerOL[i];
					state[i] = {
						_toKill: { ...player._toKill },
						_toSave: { ...player._toSave },
						identity: player.identity,
						lingli: player.storage._lingli || 0,
						lingliSkill: player.lingliSkill || [],
					};
				}
				return state;
			},

			updateState(state) {
				for (const i in state) {
					const player = lib.playerOL[i];
					if (player) {
						player._toKill = state[i]._toKill;
						player._toSave = state[i]._toSave;
						player.identity = state[i].identity;
						player.storage._lingli = state[i].lingli;
						player.lingliSkill = state[i].lingliSkill || [];
					}
				}
			},

			getRoomInfo(uiintro) {
				uiintro.add('<div class="text chat">玩家数：' + (lib.configOL.player_number || 8));
				if (lib.configOL.banned?.length) {
					uiintro.add('<div class="text chat">禁用武将：' + get.translation(lib.configOL.banned));
				}
				if (lib.configOL.bannedcards?.length) {
					uiintro.add('<div class="text chat">禁用卡牌：' + get.translation(lib.configOL.bannedcards));
				}
				uiintro.style.paddingBottom = "8px";
			},

			getVideoName() {
				let str = get.translation(game.me.name);
				if (game.me.name2) str += "/" + get.translation(game.me.name2);
				return [str, "叁岛幻化"];
			},

			showIdentity() {
				game.players.forEach(p => {
					p.node.identity.classList.remove("guessing");
					p.identityShown = true;
					p.ai.shown = 1;
					p.setIdentity(p.identity, p.group);
				});

				if (_status.clickingidentity) {
					_status.clickingidentity[1].forEach(btn => {
						btn.delete();
						btn.style.transform = "";
					});
					delete _status.clickingidentity;
				}
			},

			checkResult() {
				const me = game.me._trueMe || game.me;
				if (get.playerx().length === 1) {
					game.over(me.isAlive());
				}
			},

			checkOnlineResult(player) {
				return player.isAlive();
			},

			_initSeats() {
				if (!game.zhu || !game.players.includes(game.zhu)) {
					game.zhu = game.players.randomGet();
				}

				let i = 1;
				let current = game.zhu;
				const maxPlayers = game.players.length;

				do {
					if (!current) break;
					if (!current.lingliSkill) current.lingliSkill = [];
					current._hSeat = i;
					current.identity = i;
					current.setIdentity();
					current = current.next;
					i++;

					if (i > maxPlayers || current === game.zhu) break;
				} while (current && current !== game.zhu);
			},

			chooseCharacter() {
				const next = game.createEvent("chooseCharacter");
				next.showConfig = true;
				next.setContent(async function (event) {
					ui.arena.classList.add("choose-character");
					game._initSeats();
					const characterlist = lib.sandaohuanhua.characterlist;

					// ==================== 选择角色 ====================
					const chooseNum = Math.min(8, (characterlist.length - game.countPlayer() + 1));
					const chooseList = characterlist.randomRemove(chooseNum);
					const result = await game.me.chooseButton(
						["请选择角色形象", [chooseList, "character"]],
						true
					).set("onfree", true).forResult();
					characterlist.addArray(chooseList.filter(e => e != result.links[0]));

					game.me.init(result.links[0]);
					game.countPlayer(current => {
						if (!current) return;
						if (!current.name && current != game.me) {
							current.init(characterlist.randomRemove(1)[0]);
						}
						if (!current.storage) current.storage = {};
						current.storage._lingli = 0;
						current.markSkill("_lingli");
					});
					game.showIdentity();
					game.randomMission();

					// ==================== 选择初始技能 ====================
					const dialog = get.skillDialog(START_SKILLS, "选择要获得的初始技能");
					const result2 = await game.me.chooseControl(START_SKILLS)
						.set("ai", () => START_SKILLS.randomGet())
						.set("dialog", dialog)
						.forResult();

					game.me.addLingliSkill(result2.control);
					game.countPlayer(current => {
						if (!current) return;
						if (current === game.me) return;
						current.addLingliSkill(START_SKILLS.randomGet());
					});

					setTimeout(() => ui.arena.classList.remove("choose-character"), 500);
				});
				return next;
			},

			chooseCharacterOL() {
				const next = game.createEvent("chooseCharacter");
				next.setContent(async function (event) {
					ui.arena.classList.add("choose-character");
					game._initSeats();
					let map = {};
					for (let i in lib.playerOL) {
						map[i] = lib.playerOL[i].identity;
					}
					game.broadcast((map) => {
						for (let i in map) {
							lib.playerOL[i].identity = map[i];
							lib.playerOL[i].setIdentity();
							lib.playerOL[i].ai.shown = 1;
						}
					}, map);
					const characterlist = lib.sandaohuanhua.characterlist;

					// ==================== 选择角色 ====================
					const playerCharChoices = {};
					const chooseNum = Math.max(1, Math.floor(characterlist.length / game.countPlayer()));
					const list = game.players.map(player => {
						const choices = characterlist.randomRemove(chooseNum);
						playerCharChoices[player.playerid] = choices;
						return [player, ['选择角色形象', [choices, 'character']], 1, true];
					});

					const charResult = await game.me.chooseButtonOL(list).forResult();

					// 处理角色结果
					const charMap = {};
					for (const player of game.players) {
						const id = player.playerid;
						if (charResult[id] === 'ai' || !charResult[id]?.links) {
							charMap[id] = playerCharChoices[id].randomGet();
						} else {
							charMap[id] = charResult[id].links[0];
						}
					}

					// 广播角色初始化
					game.broadcastAll((charMap) => {
						for (const id in charMap) {
							const p = lib.playerOL[id];
							if (p && !p.name) p.init(charMap[id]);
						}
					}, charMap);
					game.broadcastAll(game.showIdentity);
					game.randomMission();

					await new Promise(resolve => setTimeout(resolve, 300));

					// ==================== 选择初始技能 ====================
					event.skillMap = {};

					// 定义技能选择函数
					const chooseStartSkill = function (player, skills, eventId) {
						const next = player.chooseControl(skills);
						next.set("ai", () => skills.randomGet());
						next.set("dialog", get.skillDialog(skills, "选择要获得的初始技能"));
						next.set("eventId", eventId);
						return next;
					};

					const chooseResult = await game.chooseAnyOL(
						game.players,
						chooseStartSkill,
						[START_SKILLS]
					).forResult();

					// 转换 Map 结果为 skillMap 格式
					for (const [player, result] of chooseResult) {
						event.skillMap[player.playerid] = (result && result.control)
							? result.control
							: START_SKILLS.randomGet();
					}

					game.countPlayer(current => {
						if (!current) return;
						const skill = event.skillMap[current.playerid];
						if (!current.lingliSkill) current.lingliSkill = [];
						if (skill && !current.lingliSkill.includes(skill)) {
							current.addLingliSkill(skill);
						}
						if (!current.storage) current.storage = {};
						current.storage._lingli = 0;
						current.markSkill("_lingli");
					});

					setTimeout(() => ui.arena.classList.remove("choose-character"), 500);
				});
				return next;
			},

			// 更新元素内容
			randomMission() {
				if (_status._aozhan) return;
				if (get.playerx().length <= 4) {
					game.enterAozhanMode();
					return;
				}

				// 初始化玩家任务目标
				if (!_status.playback) {
					const players = game.filterPlayer2();
					const targets = get.playerx();
					players.forEach(player => {
						const others = targets.filter(p => p !== player).randomSort();
						[player._toKill, player._toSave] = [others[0], others[1]];
					});
					let map = {};
					for (let i in lib.playerOL) {
						map[i] = [lib.playerOL[i]._toKill, lib.playerOL[i]._toSave];
					}
					game.broadcast((map) => {
						for (let i in map) {
							lib.playerOL[i]._toKill = map[i][0];
							lib.playerOL[i]._toSave = map[i][1];
						}
					}, map);

					game.addVideo('sdhh_mission', null, {
						toKillPos: parseInt(game.me._toKill.dataset.position),
						toSavePos: parseInt(game.me._toSave.dataset.position)
					});
				}

				// 更新任务目标
				game.broadcastAll(() => {
					const me = game.me;
					if (me?._toKill && me?._toSave && ui.sandaohuanhua?._textSpan) {
						ui.sandaohuanhua._textSpan.innerHTML =
							`杀伤<span style='color:#ff5f56'>${get.translation(me._toKill)}(${me._toKill.identity})</span>，` +
							`保护<span style='color:#98fb98'>${get.translation(me._toSave)}(${me._toSave.identity})</span>`;
					}
				});
			},

			// 进入死战模式
			enterAozhanMode() {
				game.countPlayer2(current => {
					delete current._toKill;
					delete current._toSave;
				});
				game.broadcastAll(() => {
					_status._aozhan = true;
					if (ui.sandaohuanhua?._textSpan) {
						ui.sandaohuanhua._textSpan.innerHTML = "死战模式";
					}
					game.playBackgroundMusic();
				});

				if (!_status.playback) {
					game.addVideo('sdhh_mission', null, { isAozhan: true });
				}
				game.me?.$fullscreenpop('<span style="display:inline-block;transform:translateY(-100%);vertical-align:bottom">死战模式</span>', "fire");
			},

			async executeQiankunBagua(deadPlayer) {
				const type = get.rand(1, 8);
				deadPlayer.playerfocus(1200);

				const baguaNames = ["离", "坎", "乾", "震", "兑", "艮", "巽", "坤"];
				const logArg = ["#g乾坤八卦·" + baguaNames[type - 1], "：<br>"];
				game.me.$fullscreenpop(logArg[0].slice(2), get.groupnature(deadPlayer.group, "raw"));
				game.delay(1.5);

				const effects = {
					1: async () => {
						logArg.push("#r每人失去1点体力");
						game.log.apply(this, logArg);
						game.countPlayer(async p => await p.loseHp());

					},
					2: async () => {
						logArg.push("#y每人摸2张牌");
						game.log.apply(this, logArg);
						game.countPlayer(async p => await p.draw(2, "nodelay"));
					},
					3: async () => {
						logArg.addArray([`上一位阵亡玩家（`, `#b${get.translation(deadPlayer)}`, `）3血复活，摸3牌`]);
						game.log.apply(this, logArg);
						await deadPlayer.reviveEvent(3);
						await deadPlayer.draw(3);
					},
					4: async () => {
						logArg.push("#r每人随机失去1张牌");
						game.log.apply(this, logArg);
						let lose_list = [];
						game.countPlayer(async p => {
							const he = p.getCards("he");
							if (he.length) lose_list.push([p, [he.randomGet()]]);
						});
						await game.loseAsync({ lose_list: lose_list }).setContent("discardMultiple");
					},
					5: async () => {
						logArg.push("#y每人+1灵力");
						game.log.apply(this, logArg);
						game.countPlayer(p => p.changeLingli(1));
					},
					6: async () => {
						logArg.push("#y每人获得1张装备牌");
						game.log.apply(this, logArg);
						const cards = [];
						game.countPlayer(async p => {
							const card = get.cardPile(c => !cards.includes(c) && get.type(c) === "equip");
							if (card) {
								cards.push(card);
								await p.gain(card);
							}
						});
					},
					7: async () => {
						logArg.push("#y每人获得1个技能");
						game.log.apply(this, logArg);
						game.countPlayer(p => {
							p.fixLingliSkill();
							if (p.lingliSkill?.length < 3) {
								const skills = lib.sandaohuanhua.skills.randomSort();
								for (const skill of skills) {
									if (p.lingliSkill.includes(skill)) continue;
									p.addLingliSkill(skill);
									break;
								}
							}
						});
					},
					8: async () => {
						const initTarget = lib.sandaohuanhua.NPC.randomGet();
						logArg.addArray([`上一位阵亡玩家（`, `#b${get.translation(deadPlayer)}`, `）`]);
						logArg.addArray([`变为`, `#b${get.translation(initTarget)}`, `复活`]);
						game.log.apply(this, logArg);

						await deadPlayer.clearSkills(true);
						await deadPlayer.reinit(deadPlayer.name, initTarget, [lib.character[initTarget].hp, lib.character[initTarget].maxHp]);
						await deadPlayer.reviveEvent(deadPlayer.maxHp, false);
						deadPlayer.addSkill("sdhh_noCard");
					}
				};
				await effects[type]();
			},
		},
		get: {
			// 全局初始化
			sdhhInit() {
				lib.inpile.addArray(["sdhh_fudichouxin", "sdhh_toulianghuanzhu"]);
				if (!lib.sandaohuanhua) lib.sandaohuanhua = {};

				if (_status.connectMode) {
					lib.character = {};
					for (let packName of lib.configOL.characterPack) {
						let pack = lib.characterPack[packName];
						for (let char in pack) {
							lib.character[char] = pack[char];
						}
					}
				}
				lib.sandaohuanhua.NPC = [];
				lib.config.characters.add("sdhh_NPC");
				const pack = lib.characterPack['sdhh_NPC'];
				for (let name in pack) {
					lib.character[name] = pack[name];
					lib.sandaohuanhua.NPC.push(name);
				}

				const characterLimit = _status.connectMode ? lib.configOL.characterSkill_limit : get.config("characterSkill_limit");
				const { characters, skills } = getAvailableCharacters(characterLimit);
				lib.sandaohuanhua.characterlist = characters;
				lib.sandaohuanhua.skills = skills;
			},

			// 获取场上非NPC玩家数量
			playerx() {
				return game.filterPlayer(current => typeof current.name === "string" && !current.name?.startsWith("sdhh_"));
			},

			// 获取技能列表对话框
			skillDialog(skills, prompt) {
				const dialog = ui.create.dialog("hidden", "forcebutton");

				const clickItem = function () {
					const parent = this.parentNode;
					let infoDiv = parent.querySelector(".info");
					if (infoDiv) {
						infoDiv.remove();
						return;
					}

					const info = get.info(this.link);
					if (!info?.derivation) return;

					const derivationList = Array.isArray(info.derivation) ? info.derivation : [info.derivation];
					let newContent = derivationList.map(key => {
						const content = get.translation(key + "_info");
						if (!content) return '';
						return `<div><div class="skill"><span style="font-family:yuanli">${get.translation(key)}:</span></div>` +
							`<div><span style="font-family:yuanli">${content}</span></div></div>`;
					}).filter(Boolean).join('<br>');

					if (newContent) {
						infoDiv = dialog.add(newContent);
						infoDiv.classList.add("info");
						parent.insertBefore(infoDiv, this.nextSibling);
					}
				};

				if (prompt) dialog.addText(prompt);

				skills.forEach(skill => {
					const html =
						`<div class="popup pointerdiv" style="width:100%;display:inline-block">` +
						`<div class="skill" style="width:auto!important;">【${get.translation(skill)}】</div><br>` +
						`<div>${lib.translate[skill + "_info"] || ''}</div>` +
						`</div>`;
					const item = dialog.add(html);
					const trigger = item.firstChild;
					trigger.addEventListener("click", clickItem);
					trigger.link = skill;
				});

				dialog.add(ui.create.div(".placeholder"));
				return dialog;
			},

			// 任务信息UI初始化
			initMissionUI() {
				if (_status._aozhan || ui.sandaohuanhua) return;

				// 加载配置
				if (!lib.sandaohuanhua.missionUI) lib.sandaohuanhua.missionUI = {};
				const config = lib.sandaohuanhua.missionUI;
				if (!config._configLoaded) {
					const savedPos = game.getExtensionConfig('sandaohuanhua', 'uiPos');
					config.uiPos = { x: savedPos?.x || 0, y: savedPos?.y || 0 };
					config.isFixed = game.getExtensionConfig('sandaohuanhua', 'uiFixed') || false;
					config._configLoaded = true;
				}

				if (ui.time3) ui.time3.style.display = "none";

				// 创建主容器
				const container = ui.create.div(".touchinfo#sdhh-mission-ui", ui.window);
				ui.sandaohuanhua = container;

				// 应用初始位置
				const pos = config.uiPos;
				container.style.left = get.is.phoneLayout() ? "15%" : "33%";
				container.style.setProperty('--sdhh-x', `${pos.x}px`);
				container.style.setProperty('--sdhh-y', `${pos.y}px`);
				if (config.isFixed) container.classList.add('fixed');

				// 拖拽状态管理
				const dragState = {
					isDragging: false,
					isFixed: config.isFixed,
					x: pos.x,
					y: pos.y,
					startX: 0,
					startY: 0,
					active: false
				};

				// 工具函数：获取坐标
				const getCoord = (e) => {
					const isTouch = e.type?.includes('touch');
					const source = isTouch ? (e.touches?.[0] || e.changedTouches?.[0]) : e;
					return { x: source.clientX, y: source.clientY };
				};

				// 工具函数：保存位置
				const savePosition = () => {
					config.uiPos.x = dragState.x;
					config.uiPos.y = dragState.y;
					game.saveExtensionConfig('sandaohuanhua', 'uiPos', { ...config.uiPos });
				};

				// DOM结构创建
				const textSpan = document.createElement('span');
				textSpan.className = 'sdhh-mission-text';
				textSpan.innerHTML = '等待任务分配...';

				const lockIcon = document.createElement('span');
				lockIcon.className = 'lock-icon';
				lockIcon.textContent = dragState.isFixed ? '🔒' : '🔓';

				container.append(textSpan, lockIcon);
				container._textSpan = textSpan;
				container._lockIcon = lockIcon;

				// 点击穿透功能
				const triggerClickThrough = (e) => {
					if (e.target.closest('.lock-icon')) return;

					const { x, y } = getCoord(e);
					container.style.pointerEvents = 'none';
					const target = document.elementFromPoint(x, y);
					container.style.pointerEvents = '';

					if (target && !container.contains(target)) {
						target.dispatchEvent(new MouseEvent('click', {
							bubbles: true,
							cancelable: true,
							view: window,
							clientX: x,
							clientY: y
						}));
					}
				};

				// 拖拽逻辑
				const DragHandler = {
					start(e) {
						if (e.target.closest('.lock-icon')) return;

						e.stopPropagation();
						e.preventDefault();

						const { x, y } = getCoord(e);
						dragState.active = true;
						dragState.startX = x - dragState.x;
						dragState.startY = y - dragState.y;
						dragState.dragStartX = x;
						dragState.dragStartY = y;

						container.style.transition = 'none';

						// 绑定全局事件
						document.addEventListener('mouseup', this.end);
						document.addEventListener('mousemove', this.move);
						document.addEventListener('touchend', this.end);
						document.addEventListener('touchmove', this.move);
					},

					move(e) {
						if (!dragState.active) return;
						e.preventDefault();

						const { x, y } = getCoord(e);

						// 固定模式下检测滑动距离触发拖拽标志
						if (dragState.isFixed) {
							const dist = Math.abs(x - dragState.dragStartX) + Math.abs(y - dragState.dragStartY);
							dragState.isDragging = dist > 5;
							return;
						}

						// 计算新位置
						let newX = x - dragState.startX;
						let newY = y - dragState.startY;

						// 边界限制（相对于当前偏移量）
						const rect = container.getBoundingClientRect();
						const X_MARGIN = 120, Y_MARGIN = 25;
						const maxX = window.innerWidth - X_MARGIN - rect.left;
						const minX = -(rect.width - X_MARGIN) - rect.left;
						const maxY = window.innerHeight - Y_MARGIN - rect.top;
						const minY = -(rect.height - Y_MARGIN) - rect.top;

						// 应用限制并更新
						dragState.x += Math.max(minX, Math.min(maxX, newX - dragState.x));
						dragState.y += Math.max(minY, Math.min(maxY, newY - dragState.y));

						container.style.setProperty('--sdhh-x', `${dragState.x}px`);
						container.style.setProperty('--sdhh-y', `${dragState.y}px`);
						dragState.isDragging = true;
					},

					end(e) {
						if (!dragState.active) return;
						dragState.active = false;

						// 清理全局事件
						document.removeEventListener('mouseup', this.end);
						document.removeEventListener('mousemove', this.move);
						document.removeEventListener('touchend', this.end);
						document.removeEventListener('touchmove', this.move);

						container.style.transition = '';

						if (dragState.isFixed) {
							// 固定模式下点击穿透（未拖拽时）
							if (!dragState.isDragging) {
								const rect = container.getBoundingClientRect();
								const { x, y } = getCoord(e);
								if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
									triggerClickThrough(e);
								}
							}
						} else if (dragState.isDragging) {
							savePosition();
						}

						dragState.isDragging = false;
					}
				};

				// 绑定事件
				const events = [
					['touchstart', (e) => DragHandler.start(e), { passive: false }],
					['touchend', (e) => DragHandler.end(e), { passive: false }],
					['touchmove', (e) => DragHandler.move(e), { passive: false }],
					['mousedown', (e) => DragHandler.start(e)]
				];
				events.forEach(([type, handler, opts]) =>
					container.addEventListener(type, handler, opts)
				);

				// 锁图标事件
				lockIcon.addEventListener('click', (e) => {
					e.stopPropagation();
					container.toggleFixed();
				});
				lockIcon.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });

				// 公共API
				container.setFixed = (fixed) => {
					dragState.isFixed = fixed;
					container.classList.toggle('fixed', fixed);
					lockIcon.textContent = fixed ? '🔒' : '🔓';
					game.saveExtensionConfig('sandaohuanhua', 'uiFixed', fixed);
					config.isFixed = fixed;
				};
				container.toggleFixed = () => {
					container.setFixed(!dragState.isFixed);
					return dragState.isFixed;
				};
				container.isFixed = () => dragState.isFixed;

				return container;
			},
		},
		element: {
			content: {
				async gameDraw(event) {
					if (_status.brawl?.noGameDraw) return;

					let player = event.player;
					const end = player;

					do {
						let numx = typeof event.num === "function" ? event.num(player) : 4;
						if (player._hSeat > 6) player.changeLingli(1);

						const cards = [];
						const otherGetCards = event.otherPile?.[player.playerid]?.getCards;

						if (otherGetCards) {
							cards.addArray(otherGetCards(numx));
						} else if (player.getTopCards) {
							cards.addArray(player.getTopCards(numx));
						} else {
							cards.addArray(get.cards(numx));
						}

						if (event.gaintag?.[player.playerid]) {
							const gaintag = event.gaintag[player.playerid];
							const list = typeof gaintag == "function" ? gaintag(numx, cards) : [[cards, gaintag]];
							game.broadcastAll((player, list) => {
								list.slice().reverse().forEach(item => player.directgain(item[0], null, item[1]));
							}, player, list);
						} else {
							player.directgain(cards);
						}

						if (player.singleHp === true && get.mode() != "guozhan" &&
							(lib.config.mode != "doudizhu" || _status.mode != "online")) {
							player.doubleDraw();
						}
						player._start_cards = player.getCards("h");
						player = player.next;
					} while (player != end);

					event.changeCard = _status.connectMode ? lib.configOL.change_card : get.config("change_card");
					if (event.changeCard == "disabled" || _status.auto || !game.me.countCards("h")) return;

					while (true) {
						if (event.changeCard == "once") {
							event.changeCard = "disabled";
						} else if (event.changeCard == "twice") {
							event.changeCard = "once";
						} else if (event.changeCard == "disabled") {
							return;
						}

						const { bool } = await game.me.chooseBool("是否使用手气卡？").forResult();
						if (!bool) {
							game.me._start_cards = game.me.getCards("h");
							break;
						}

						if (game.changeCoin) game.changeCoin(-3);

						const hs = game.me.getCards("h");
						const otherDiscacrd = event.otherPile?.[game.me.playerid]?.discard;

						game.addVideo("lose", game.me, [get.cardsInfo(hs), [], [], []]);
						hs.forEach(card => {
							card.removeGaintag(true);
							if (otherDiscacrd) otherDiscacrd(card);
							else card.discard(false);
						});

						const newCards = event.otherPile?.[game.me.playerid]?.getCards
							? event.otherPile[game.me.playerid].getCards(hs.length)
							: get.cards(hs.length);

						if (event.gaintag?.[game.me.playerid]) {
							const gaintag = event.gaintag[game.me.playerid];
							const list = typeof gaintag == "function" ? gaintag(hs.length, newCards) : [[newCards, gaintag]];
							list.slice().reverse().forEach(item => game.me.directgain(item[0], null, item[1]));
						} else {
							game.me.directgain(newCards);
						}
						game.me._start_cards = game.me.getCards("h");
					}
				},
			},

			player: {
				addLingliSkill(skill) {
					this.lingliSkill.add(skill);
					this.addSkills.apply(this, arguments);
				},
				removeLingliSkill(skill) {
					this.lingliSkill.remove(skill);
					this.removeSkills.apply(this, arguments);
				},
				fixLingliSkill() {
					this.lingliSkill = this.lingliSkill.filter(skill => this.hasSkill(skill));
				},
				dieAfter() {
					const evt = _status.event.getParent("phase");
					if (evt) evt._lastDead = this;
					if (get.playerx().length === 1) game.over(game.me.isAlive());
				},
				$dieAfter() { },
				hasUnknown() { return false; },
				isUnknown() { return false; },
				getEnemies() {
					return get.playerx().filter(p => p !== this);
				},
				dieAfter2(source) {
					if (!source || this.name?.startsWith("sdhh_")) return;

					const isKillTarget = source._toKill === this;
					game.log(source, isKillTarget ? "击杀目标成功" : "完成补刀");
					source.popup(isKillTarget ? "击杀成功" : "补刀成功");
					source.draw(isKillTarget ? 2 : 1);
					source.changeLingli(isKillTarget ? 3 : 2);

					if (!_status._aozhan) {
						game.countPlayer(current => {
							if (current._toSave === this) {
								game.log(current, "保护目标失败");
								current.popup("保护失败");
								const cards = current.getCards("he");
								if (cards.length) current.discard(cards.randomGets(4));
							}
						});
					}
				},
				logAi() { },
				changeLingli(num = 1) {
					if (typeof this.storage._lingli !== "number") this.storage._lingli = 0;

					if (num > 0) {
						num = Math.min(num, 5 - this.storage._lingli);
						if (num < 1) return;
						game.log(this, "获得", "#y" + get.cnNumber(num) + "点", "灵力");
					} else {
						if (-num > this.storage._lingli) num = -this.storage._lingli;
						if (num === 0) return;
						game.log(this, "失去", "#y" + get.cnNumber(-num) + "点", "灵力");
					}
					this.storage._lingli += num;
					this.markSkill("_lingli");
				},
			},
		},

		ai: {
			get: {
				rawAttitude(from, to) {
					if (from === to) return 10;
					if (from.hasSkill("sdhh_noCard") || to.hasSkill("sdhh_noCard")) return 0;
					if (to === from._toSave) return 3;
					if (to === from._toKill) return -10;
					return -6;
				},
			},
		},

		card: {
			sdhh_toulianghuanzhu: {
				enable: true,
				fullskin: true,
				image: "image/card/hhzz_toulianghuanzhu.png",
				recastable: true,
				type: "trick",
				filterTarget(card, player, target) {
					target.fixLingliSkill();
					return target.lingliSkill.length > 0;
				},
				content() {
					target.fixLingliSkill();
					target.removeLingliSkill(target.lingliSkill.randomGet());
					const skills = lib.sandaohuanhua.skills.randomSort();
					for (const skill of skills) {
						if (!target.lingliSkill.includes(skill)) {
							target.addLingliSkill(skill);
							break;
						}
					}
				},
				ai: {
					order: 10,
					result: { target: () => 0.5 - Math.random() },
				},
			},
			sdhh_fudichouxin: {
				enable: true,
				fullskin: true,
				image: "image/card/hhzz_fudichouxin.png",
				type: "trick",
				filterTarget(card, player, target) {
					target.fixLingliSkill();
					return target.lingliSkill.length > 0;
				},
				content() {
					target.fixLingliSkill();
					target.removeLingliSkill(target.lingliSkill.randomGet());
				},
				ai: {
					order: 10,
					result: { target: -1 },
				},
			},
		},

		characterPack: {
			sdhh_NPC: {
				sdhh_shiona: {
					sex: "female",
					group: "key",
					hp: 1,
					skills: ["sdhh_huilei"],
					img: "image/character/hhzz_shiona.jpg",
				},
				sdhh_kanade: {
					sex: "female",
					group: "key",
					hp: 2,
					skills: ["sdhh_youlian"],
					img: "image/character/hhzz_kanade.jpg",
				},
				sdhh_takaramono1: {
					sex: "none",
					group: "nine",
					hp: 5,
					skills: ["sdhh_jubao", "sdhh_huizhen"],
					img: "image/character/hhzz_takaramono1.jpg",
				},
				sdhh_takaramono2: {
					sex: "none",
					group: "three",
					hp: 3,
					skills: ["sdhh_jubao", "sdhh_zhencang"],
					img: "image/character/hhzz_takaramono2.jpg",
				},
			}
		},

		skill: {
			_lingli_damage: {
				trigger: { source: "damage" },
				forced: true,
				popup: false,
				filter(event, player) {
					return event.player == player._toKill;
				},
				content() {
					game.log(player, "对杀伤目标造成了伤害");
					player.changeLingli(trigger.num);
				},
			},

			_lingli: {
				mark: true,
				marktext: "灵",
				popup: "聚灵",
				intro: {
					name: "灵力",
					content(storage, player) {
						player.fixLingliSkill();
						const skillList = player.lingliSkill?.length
							? `<li>已拥有技能：${player.lingliSkill.map(get.poptip).join(" ")}`
							: '';
						return `当前灵力点数：${storage} / 5${skillList}`;
					},
				},
				trigger: { player: "phaseBeginStart" },
				filter(event, player) {
					return player.storage._lingli > 1;
				},
				check(event, player) {
					player.fixLingliSkill();
					return player.lingliSkill.length < 3;
				},

				async cost(event, trigger, player) {
					player.fixLingliSkill();

					const allSkills = lib.sandaohuanhua.skills.randomSort();
					const availableSkills = allSkills.filter(s => !player.lingliSkill.includes(s));
					const skillNames = player.lingliSkill.map(get.poptip).join(" ");
					const basePrompt = `当前已拥有技能：${skillNames}`;

					let baseMode;

					if (player.storage._lingli === 2 || (availableSkills.length >= 3 && availableSkills.length < 6)) {
						const { control } = await player.chooseControl(['确定', 'cancel2'])
							.set("prompt", `${basePrompt}，是否消耗2点灵力从三个技能中选择其中一个${player.lingliSkill.length === 3 ? '替换' : '获得'}？`)
							.set("ai", () => player.lingliSkill.length == 3 ? 'cancel2' : '确定')
							.forResult();
						if (control === 'cancel2') return;
						baseMode = 1;
					} else if (availableSkills.length >= 6) {
						const { control } = await player.chooseControl(['三选一', '六选一', 'cancel2'])
							.set("prompt", `###${basePrompt}，是否消耗2点灵力从三个技能中${player.lingliSkill.length === 3 ? '替换' : '获得'}其一？###<li>或多消耗1点灵力从六个技能中选择`)
							.set("ai", () => player.lingliSkill.length === 3 ? 'cancel2' : '三选一')
							.forResult();
						if (control === 'cancel2') return;
						baseMode = control === '三选一' ? 1 : 2;
					} else {
						player.popup("技能耗尽");
						return;
					}

					const numCandidates = baseMode === 1 ? 3 : 6;
					const baseCost = baseMode === 1 ? 2 : 3;
					let candidateOffset = 0;
					let selectedSkill = null;

					while (true) {
						let candidates = availableSkills.slice(candidateOffset, candidateOffset + numCandidates);

						if (candidates.length < numCandidates) {
							const refreshed = lib.sandaohuanhua.skills.randomSort();
							const newAvailable = refreshed.filter(s => !player.lingliSkill.includes(s));
							candidates = newAvailable.slice(0, numCandidates);
						}

						if (candidates.length === 0) {
							player.popup("技能耗尽");
							return;
						}

						const canRefresh = player.storage._lingli >= baseCost + 1;
						const choices = canRefresh ? [...candidates, "刷新"] : candidates;

						const dialog = get.skillDialog(choices, "选择获得一个技能");
						const { control } = await player.chooseControl(choices.concat('cancel2'))
							.set("ai", () => get.max(candidates, get.skillRank, "item"))
							.set("dialog", dialog)
							.forResult();

						if (control === "刷新") {
							player.changeLingli(-1);
							candidateOffset += numCandidates;
							continue;
						} else if (control === "cancel2") {
							return;
						} else if (candidates.includes(control)) {
							selectedSkill = control;
							break;
						}
						return;
					}

					event.result = {
						bool: true,
						cost_data: [baseMode, selectedSkill]
					};
				},

				async content(event, trigger, player) {
					const mode = event.cost_data[0];
					const selectedSkill = event.cost_data[1];
					const costLingli = mode === 1 ? 2 : 3;

					player.changeLingli(-costLingli);

					if (player.lingliSkill.length === 3) {
						const { control } = await player.chooseControl(player.lingliSkill)
							.set("prompt", "选择失去1个已有技能")
							.forResult();
						player.removeLingliSkill(control);
					}
					player.addLingliSkill(selectedSkill);
				},
			},

			_lingli_round: {
				trigger: { global: "roundStart" },
				forced: true,
				popup: false,
				filter: (event, player) => !_status._aozhan && game.roundNumber > 1,
				content() {
					player.changeLingli(1);
				},
			},

			_lingli_draw: {
				enable: "phaseUse",
				filter: (event, player) => player.storage._lingli > 0,
				content() {
					player.changeLingli(-1);
					player.draw();
				},
				delay: 0,
				ai: {
					order: 10,
					result: {
						player(player) {
							player.fixLingliSkill();
							return player.storage._lingli - 2 * (3 - player.lingliSkill.length) > 0 ? 1 : 0;
						},
					},
				},
			},

			_lingli_save: {
				trigger: { target: "useCardToTargeted" },
				forced: true,
				popup: false,
				filter: (event, player) => event.card.name === "tao" && player == event.player._toSave,
				content() {
					game.log(trigger.player, "帮助了保护目标");
					trigger.player.changeLingli(1);
				},
			},

			_sdhh_qiankunbagua: {
				trigger: { player: "phaseAfter" },
				forced: true,
				forceDie: true,
				popup: false,
				filter(event, player) {
					return (_status._aozhan && !player.getStat("damage") && player.isAlive()) || event._lastDead != undefined;
				},

				async content(event, trigger, player) {
					if (_status._aozhan && !player.getStat("damage") && !player.name?.startsWith("sdhh_")) {
						player.loseHp();
						player.changeLingli(1);
						game.log(player, "本回合内未造成伤害，触发死战扣血");
					}

					if (trigger._lastDead) {
						await game.executeQiankunBagua(trigger._lastDead, trigger);
					}
					if (_status._aozhan) return;
					game.randomMission();
				},
			},

			sdhh_noCard: {
				mod: {
					cardEnabled: () => false,
					cardSavable: () => false,
					cardUsabled: () => false,
					cardRespondable: () => false,
				},
			},

			sdhh_huilei: {
				trigger: { player: "die" },
				forced: true,
				forceDie: true,
				skillAnimation: true,
				logTarget: "source",
				filter: (event, player) => !!event.source,
				content() {
					const source = trigger.source;
					const cards = source.getCards("he");
					if (cards.length) source.discard(cards);
				},
				ai: {
					threaten: 0.1,
					effect: {
						target(card, player, target) {
							if (get.tag(card, "damage")) return [1, -5];
						},
					},
				},
			},

			sdhh_youlian: {
				trigger: { player: "die" },
				forced: true,
				forceDie: true,
				skillAnimation: true,
				logTarget: "source",
				filter: (event, player) => !!event.source,
				content() {
					const source = trigger.source;
					source.discard(source.getCards("he"));
					source.fixLingliSkill();
					if (source.lingliSkill?.length) source.removeLingliSkill(source.lingliSkill.randomGet());
				},
				ai: {
					effect: {
						target(card, player, target) {
							if (get.tag(card, "damage")) return [-5, 0];
						},
					},
				},
			},

			sdhh_zhencang: {
				trigger: { player: "die" },
				forced: true,
				filter: (event, player) => {
					return event.source != undefined;
				},
				forceDie: true,
				logTarget: "source",
				content() {
					let source = trigger.source;
					source.draw();
					source.fixLingliSkill();
					if (source.lingliSkill.length === 3) {
						source.removeLingliSkill(source.lingliSkill.randomGet());
					}
					let skills = lib.sandaohuanhua.skills;
					skills.randomSort();
					for (let i = 0; i < skills.length; i++) {
						if (!source.lingliSkill.includes(skills[i])) {
							source.addLingliSkill(skills[i]);
							break;
						}
					}
				},
			},
			sdhh_huizhen: {
				trigger: { player: "die" },
				forced: true,
				forceDie: true,
				logTarget: "source",
				filter: (event, player) => {
					return event.source != undefined;
				},
				content() {
					let source = trigger.source;
					source.draw(3);
					source.fixLingliSkill();
					if (source.lingliSkill.length === 3) {
						source.removeLingliSkill(source.lingliSkill.randomGet());
					}
					let skills = lib.sandaohuanhua.skills;
					skills.randomSort();
					for (let i = 0; i < skills.length; i++) {
						if (!source.lingliSkill.includes(skills[i])) {
							source.addLingliSkill(skills[i]);
							break;
						}
					}
				},
			},

			sdhh_jubao: {
				trigger: { player: "damage" },
				forced: true,
				logTarget: "source",
				filter: (event, player) => !!event.source && player.countCards("he") > 0,
				content() {
					const source = trigger.source;
					const cards = player.getCards("he").randomSort().slice(0, trigger.num);
					source.gain("give", cards, player);
				},
				ai: {
					effect: {
						target(card, player, target) {
							if (get.tag(card, "damage")) return [15, 0];
						},
					},
				},
			},

			sdhh_shulv: {
				mod: {
					aiOrder(player, card, num) {
						if (num <= 0 || get.itemtype(card) !== "card" || get.type(card) !== "equip") return num;
						const eq = player.getEquip(get.subtype(card));
						if (eq && get.equipValue(card) - get.equipValue(eq) < Math.max(1.2, 6 - player.hp)) {
							return 0;
						}
					},
				},
				locked: false,
				enable: "phaseUse",
				usable: 1,
				position: "hes",
				filterCard: true,
				selectCard: [1, 2],
				allowChooseAll: true,
				prompt: "弃置1/2张牌并摸2/3张牌",
				check(card) {
					const player = _status.event.player;
					if (get.position(card) == "e") {
						const subs = get.subtypes(card);
						if (subs.includes("equip2") || subs.includes("equip3")) {
							return player.getHp() - get.value(card);
						}
					}
					return 6 - get.value(card);
				},
				async content(event, trigger, player) {
					player.draw(event.cards.length + 1);
				},
				ai: {
					order: 1,
					result: { player: 1 },
					threaten: 1.1,
				},
			},
		},

		translate: {
			sandaohuanhua: "叁岛幻化",
			sdhh_NPC_character_config: "幻化NPC",
			_lingli: "聚灵",
			_lingli_bg: "灵",
			_lingli_draw: "聚灵",
			sdhh_huilei: "挥泪",
			sdhh_youlian: "犹怜",
			sdhh_zhencang: "珍藏",
			sdhh_huizhen: "汇珍",
			sdhh_jubao: "聚宝",
			sdhh_huilei_info: "锁定技，杀死你的角色弃置所有的牌。",
			sdhh_youlian_info: "锁定技，杀死你的角色弃置所有的牌并随机失去一个技能。",
			sdhh_zhencang_info: "锁定技，杀死你的角色摸一张牌并随机获得一个技能(已满则先随机移除一个)。",
			sdhh_huizhen_info: "锁定技，杀死你的角色摸三张牌并随机获得一个技能(已满则先随机移除一个)。",
			sdhh_jubao_info: "锁定技，当你受到伤害的点数确定时，伤害来源随机获得你区域内的X张牌（X为伤害点数）。",
			sdhh_shulv: "熟虑",
			sdhh_shulv_info: "出牌阶段限一次，你可以弃置1/2张牌并摸2/3张牌。",
			sdhh_shiona: "汐奈",
			sdhh_kanade: "立华奏",
			sdhh_takaramono1: "坚实宝箱",
			sdhh_takaramono2: "普通宝箱",
			sdhh_toulianghuanzhu: "偷梁换柱",
			sdhh_fudichouxin: "釜底抽薪",
			sdhh_toulianghuanzhu_info: "出牌阶段，对一名角色使用，随机更换其一个技能。可重铸。",
			sdhh_fudichouxin_info: "出牌阶段，对一名角色使用，随机弃置其一个技能。",
			nei: " ",
			nei2: " ",
			刷新_info: "消耗1点灵力值，刷新上述技能。",
		},
	};
};
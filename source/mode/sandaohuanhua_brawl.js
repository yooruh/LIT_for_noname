import { lib, game, ui, get, ai, _status } from '../../../../noname.js';
import { Lit_dialog } from '../tool/extraUI.js';
import basic from '../tool/basic.js';

function sdhhResetMissionUI() {
    if (!ui.sandaohuanhua) return;
    if (ui.sandaohuanhua?._docHandlers) {
        ui.sandaohuanhua.clearDocumentHandlers?.();
    }
    game.saveExtensionConfig('sandaohuanhua', 'uiPos', null);
    game.saveExtensionConfig('sandaohuanhua', 'uiFixed', false);

    ui.sandaohuanhua.setFixed(false);
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
if (!window.lit) window.lit = {};
window.lit.sdhhResetMissionUI = sdhhResetMissionUI;

export let info = {
    name: "叁岛幻化",
    mode: "identity",
    intro: `<button ` +
        `onclick="window.lit.sdhhResetMissionUI()" ` +
        `style="cursor:pointer">重置任务框位置</button><br>` +
        `完成任务收灵力，灵力加持得技能，参悟卦象衡步履，起死回生逆乾坤！`,

    // 常量定义
    CONSTANTS: {
        GLOBAL_SKILLS: [
            "_lingli",
            "_lingli_round",
            "_lingli_draw",
            "_lingli_save",
            "_sdhh_qiankunbagua",
            "_lingli_damage",
        ],
        START_SKILLS: ["xiandeng", "sdhh_shulv", "xisheng"],
        BANNED_SKILLS: new Set([
            "xinfu_guhuo", "reguhuo", "jixi", "duanchang", "huashen", "xinsheng", "rehuashen", "rexinsheng", "jinqu", "nzry_binglve", "nzry_huaiju",
            "nzry_yili", "nzry_zhenglun", "nzry_mingren", "nzry_zhenliang", "drlt_qingce", "new_wuhun", "qixing", "kuangfeng", "dawu", "baonu",
            "wumou", "ol_wuqian", "ol_shenfen", "renjie", "jilue", "nzry_junlve", "nzry_dinghuo", "drlt_duorui", "chuanxin", "cunsi", "jueqing", "huilei",
            "paiyi", "fuhun", "zhuiyi", "olddanshou", "yanzhu", "juexiang", "jiexun", "bizhuan", "tongbo", "xinfu_zhanji", "xinfu_jijun", "xinfu_fangtong",
            "xinfu_qianchong", "pdgyinshi", "shuliang", "zongkui", "guju", "bmcanshi", "dingpan", "xinfu_lingren", "new_luoyan", "junwei", "gxlianhua", "qizhou",
            "fenyue", "dianhu", "linglong", "fenxin", "mouduan", "cuorui", "xinmanjuan", "xinfu_jianjie", "jianjie_faq", "new_meibu", "xinfu_xingzhao", "jici",
            "xianfu", "fenyong", "xuehen", "yingbin", "midao", "yishe", "yinbing", "juedi", "bushi", "xinfu_dianhua", "xinfu_falu", "xinfu_zhenyi", "lskuizhu",
            "pingjian", "xjshijian", "fentian", "zhiri", "xindan", "xinzhengnan", "xinfu_xiaode", "komari_xueshang", "qiaosi_map", "rechanyuan", "chanyuan"
        ]),
        BANNED_PACKS: ['lit_test']
    },

    // 辅助函数
    helpers: {
        getAllBannedSkills() {
            const banned = new Set(info.CONSTANTS.BANNED_SKILLS);
            for (const packName of info.CONSTANTS.BANNED_PACKS) {
                const pack = lib.characterPack[packName];
                if (!pack) continue;
                for (const char in pack) {
                    if (pack[char].skills) {
                        pack[char].skills.forEach(s => banned.add(s));
                    }
                }
            }
            return banned;
        },

        isValidSkillName(skillName) {
            if (skillName.endsWith('_append') || skillName.endsWith("_faq")) return false;
            if (skillName.startsWith('lit_') && (skillName.endsWith('V2') || skillName.endsWith("_limit"))) {
                return false;
            }
            return true;
        },

        isValidSkill(skillName, bannedSkills) {
            if (!info.helpers.isValidSkillName(skillName)) return false;
            if (bannedSkills.has(skillName)) return false;

            const skillInfo = get.info(skillName);
            if (!skillInfo) return false;
            const invalidFlags = [
                'zhuSkill', 'juexingji', 'charlotte', 'limited',
                'hiddenSkill', 'dutySkill', 'groupSkill', 'sourceSkill',
                'lit_dk', 'lit_neg'
            ];
            if (invalidFlags.some(flag => skillInfo[flag])) return false;
            if (skillInfo.ai?.combo) return false;

            return true;
        },

        extractSkillsFromCharacter(charName, bannedSkills, existingSkills = new Set()) {
            const char = lib.character[charName];
            if (!char || !char.skills) return [];

            const skills = [];
            const toCheck = [...char.skills];

            for (let i = 0; i < toCheck.length; i++) {
                const skillName = toCheck[i];
                if (!info.helpers.isValidSkillName(skillName)) continue;
                const skillInfo = get.info(skillName);
                if (!skillInfo) continue;

                if (skillInfo.derivation) {
                    if (typeof skillInfo.derivation === "string") {
                        toCheck.push(skillInfo.derivation);
                    } else if (Array.isArray(skillInfo.derivation)) {
                        toCheck.push(...skillInfo.derivation);
                    }
                }
            }

            for (const skillName of toCheck) {
                if (!existingSkills.has(skillName) && info.helpers.isValidSkill(skillName, bannedSkills)) {
                    skills.push(skillName);
                }
            }
            return skills;
        },

        resetCharacterToBlank(charName) {
            const char = lib.character[charName];
            if (!char) return;
            char.hp = 4;
            char.maxHp = 4;
            char.hujia = 0;
            char.skills = [];
            if (char.initFilters) char.initFilters = [];
            char.hasHiddenSkill = false;
        },

        getAvailableCharacters(characterLimit) {
            const characters = [];
            const bannedSkills = info.helpers.getAllBannedSkills();
            const findSkills = new Set();

            for (const name in lib.character) {
                if (!lib.character[name]) continue;
                if (lib.filter.characterDisabled(name)) continue;

                if (characterLimit && !name.startsWith("lit_") && !name.startsWith("sdhh_")) {
                    continue;
                }

                const charSkills = info.helpers.extractSkillsFromCharacter(name, bannedSkills, findSkills);
                charSkills.forEach(s => findSkills.add(s));

                info.helpers.resetCharacterToBlank(name);
                characters.push(name);
            }

            return { characters, skills: Array.from(findSkills) };
        }
    },

    init: () => {
        if (lib.config.mode_config.identity["player_number"] == undefined) {
            game.saveConfig("player_number", "8", "identity");
        }
    },

    showcase: function (init) {
        if (init) {
            this.nodes = [];
        } else {
            while (this.nodes.length) {
                this.nodes.shift().remove();
            }
        }

        const introLink = document.createElement("a");
        introLink.className = "lit-link";
        introLink.innerText = "点击查看【叁岛幻化】完整介绍及玩法建议";
        introLink.onclick = () => {
            try {
                Lit_dialog.showDocModal(
                    `${basic.path}/style/html/sandaohuanhua.html`,
                    '叁岛幻化完整介绍'
                );
            } catch (error) {
                console.error("获取【叁岛幻化】完整介绍失败", error);
                alert("获取【叁岛幻化】完整介绍失败");
            }
        };
        this.appendChild(introLink);
        this.nodes.push(introLink);

        let lx = this.offsetWidth - 30;
        let ly = Math.min(lx, this.offsetHeight - 30);
        let textContent =
            '注：乱斗模式的“叁岛幻化”已停止更新，建议游玩独立的“叁岛幻化”模式，可在叁岛世界扩展设置处启用<br>' +
            '简略介绍<br>' +
            '一、选将、灵力与技能<br>' +
            '选将：均为4血白板<br>' +
            '<br>' +
            '主要目标：活到最后一个便可获胜<br>' +
            '次要目标：随机分配，于正上方显示（杀伤xx，保护xx），判乾坤八卦后重置；保护目标死亡时，随机失去4张牌<br>' +
            '<br>' +
            '灵力值（上限5点）：<br>' +
            '(1)七、八号位起始+1；死战前每轮+1<br>' +
            '(2)对杀伤目标每造成1点伤害+1；击败非NPC时，非杀伤/杀伤目标另+2/+3，并摸1/2张牌<br>' +
            '(3)对保护目标使用【桃】+1；兑卦令全场+1<br>' +
            '使用：回合开始时消耗2/3点进行三/六选一，选择时可额外消耗1点刷新；出牌阶段每1点灵力可换1张牌<br><br>' +
            '三个起始技能任选一个：<br>' +
            '牺牲：每名其他角色的回合限一次，可将两张牌当做【桃】使用<br>' +
            '熟虑：出牌阶段限一次，可以弃置1/2张牌并摸等量张牌<br>' +
            '先登：锁定技；出牌阶段，使用的首张杀不计次数且无距离限制<br>' +
            '<li>场上存活人数（不计宝箱和女子）≤4人时，进入死战：取消任务且不再每轮获得灵力；击败非NPC仍+2，回合内未造成伤害则失去1点体力并+1，兑卦仍生效<br><br>' +
            '二、乾坤八卦<br>' +
            '有玩家阵亡的回合结束后，判一次乾坤八卦，不同卦象效果不同<br>' +
            '离：全场-1体力<br>' +
            '坎：全场+2牌<br>' +
            '乾：最后一名阵亡玩家3血3牌复活<br>' +
            '震：全场随机-1牌<br>' +
            '兑：全场+1灵力值<br>' +
            '艮：每个人获得牌堆里的一张装备(若牌堆里没有则不获得)<br>' +
            '巽：每个人获得一个技能(已有三个的不获得)<br>' +
            '坤：变珍藏宝箱，普通宝箱或神秘女子(成为旁观者)<br>' +
            '<li>杀宝箱随机获得一个技能，超过3个则需替换，击杀女子后弃置所有牌并失去一个技能，女子和宝箱均不会响应打出牌，也不受死战模式掉体力影响<br><br>' +
            '三、额外卡牌与技能<br>' +
            '偷梁换柱：可重铸；出牌阶段，对一名角色使用，随机更换其一个技能。<br>' +
            '釜底抽薪：出牌阶段，对一名角色使用，随机弃置其一个技能。<br>' +
            '挥泪：锁定技，杀死你的角色弃置其所有牌。';

        let textNode = document.createElement("div");
        textNode.style.position = "absolute";
        textNode.style.left = "10px";
        textNode.style.width = lx + "px";
        textNode.style.height = ly + "px";
        textNode.style.overflow = 'auto';
        textNode.style.textAlign = "left";
        textNode.innerHTML = textContent;
        this.appendChild(textNode);
        this.nodes.push(textNode);
    },

    content: {
        submode: "normal",
        chooseCharacterBefore: function () {
            game.identityVideoName = "叁岛幻化";

            const characterLimit = !game.getExtensionConfig('叁岛世界', 'lit_huanhuaUnlimited');
            const { characters, skills } = info.helpers.getAvailableCharacters(characterLimit);

            _status.characterlist = characters;

            let pack = {
                skills: skills,
                pack: {
                    card: {
                        sdhh_toulianghuanzhu: {
                            enable: true,
                            fullskin: true,
                            image: "image/card/hhzz_toulianghuanzhu.png",
                            recastable: true,
                            type: "trick",
                            filterTarget: function (card, player, target) {
                                target.fixSkillH();
                                return target.skillH.length > 0;
                            },
                            async content(event, trigger, player) {
                                const target = event.target;
                                target.fixSkillH();
                                target.removeSkillH(target.skillH.randomGet());
                                const skills = lib.sandaohuanhua.skills.slice().randomSort();
                                for (const skill of skills) {
                                    if (!target.skillH.includes(skill)) {
                                        target.addSkillH(skill);
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
                            filterTarget: function (card, player, target) {
                                target.fixSkillH();
                                return target.skillH.length > 0;
                            },
                            async content(event, trigger, player) {
                                const target = event.target;
                                target.fixSkillH();
                                target.removeSkillH(target.skillH.randomGet());
                            },
                            ai: {
                                order: 10,
                                result: { target: -1 },
                            },
                        },
                    },
                    character: {
                        sdhh_shiona: ["female", "key", 1, ["sdhh_huilei"], ["img:image/character/hhzz_shiona.jpg"]],
                        sdhh_kanade: ["female", "key", 2, ["sdhh_youlian"], ["img:image/character/hhzz_kanade.jpg"]],
                        sdhh_takaramono1: ["none", "nine", 5, ["sdhh_jubao", "sdhh_huizhen"], ["img:image/character/hhzz_takaramono1.jpg"]],
                        sdhh_takaramono2: ["none", "three", 3, ["sdhh_jubao", "sdhh_zhencang"], ["img:image/character/hhzz_takaramono2.jpg"]],
                    },
                    skill: {
                        _lingli: {
                            mark: true,
                            marktext: "灵",
                            popup: "聚灵",
                            intro: {
                                name: "灵力",
                                content: function (storage, player) {
                                    player.fixSkillH();
                                    const skillList = player.skillH?.length
                                        ? `<li>已拥有技能：${player.skillH.map(get.poptip).join(" ")}`
                                        : '';
                                    return `当前灵力点数：${storage} / 5${skillList}`;
                                },
                            },
                            trigger: { player: "phaseBeginStart" },
                            filter: function (event, player) {
                                return player.storage._lingli > 1;
                            },
                            check: function (event, player) {
                                player.fixSkillH();
                                return player.skillH.length < 3;
                            },
                            async cost(event, trigger, player) {
                                player.fixSkillH();
                                const availableSkills = lib.sandaohuanhua.skills.slice().randomSort()
                                    .filter(skill => !player.skillH.includes(skill));
                                const skillNames = player.skillH.map(get.poptip).join(" ");
                                const basePrompt = `当前已拥有技能：${skillNames}`;

                                let baseMode;

                                if (player.storage._lingli === 2 || (availableSkills.length >= 3 && availableSkills.length < 6)) {
                                    const { control } = await player.chooseControl(['确定', 'cancel2'])
                                        .set("prompt", `${basePrompt}，是否消耗2点灵力从三个技能中选择其中一个${player.skillH.length === 3 ? '替换' : '获得'}？`)
                                        .set("ai", () => player.skillH.length == 3 ? 'cancel2' : '确定')
                                        .forResult();
                                    if (control === 'cancel2') return;
                                    baseMode = 1;
                                } else if (availableSkills.length >= 6) {
                                    const { control } = await player.chooseControl(['三选一', '六选一', 'cancel2'])
                                        .set("prompt", `###${basePrompt}，是否消耗2点灵力从三个技能中${player.skillH.length === 3 ? '替换' : '获得'}其一？###<li>或多消耗1点灵力从六个技能中选择`)
                                        .set("ai", () => player.skillH.length === 3 ? 'cancel2' : '三选一')
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
                                    const candidates = availableSkills.slice(candidateOffset, candidateOffset + numCandidates);
                                    if (candidates.length === 0) {
                                        player.popup("技能耗尽");
                                        return;
                                    }

                                    const canRefresh = player.storage._lingli >= baseCost + 1 && candidateOffset + candidates.length < availableSkills.length;
                                    const choices = canRefresh ? [...candidates, "刷新"] : candidates;

                                    const chooseSkill = function (player, choicesList, skillsList) {
                                        const next = player.chooseControl(choicesList, 'cancel2');
                                        next.set("ai", () => get.max(skillsList.filter(e => e != "刷新"), get.skillRank, "item"));
                                        next.set("dialog", game.getSkillDialog(choicesList, "选择获得一个技能"));
                                        return next;
                                    };

                                    let result;
                                    if (_status.connectMode && game.chooseAnyOL) {
                                        const chooseResult = await game.chooseAnyOL([player], chooseSkill, [choices, candidates]).forResult();
                                        result = chooseResult.get(player);
                                    } else {
                                        result = await chooseSkill(player, choices, candidates).forResult();
                                    }
                                    const control = result ? result.control : "cancel2";

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

                                if (player.skillH.length === 3) {
                                    const { control } = await player.chooseControl(player.skillH)
                                        .set("prompt", "选择失去1个已有技能")
                                        .forResult();
                                    player.removeSkillH(control);
                                }
                                player.addSkillH(selectedSkill);
                            },
                        },
                        _lingli_round: {
                            trigger: { global: "roundStart" },
                            forced: true,
                            popup: false,
                            filter: function (event, player) {
                                return _status._aozhan != true && game.roundNumber > 1;
                            },
                            async content(event, trigger, player) {
                                player.changeLingli(1);
                            },
                        },
                        _lingli_draw: {
                            enable: "phaseUse",
                            filter: function (event, player) {
                                return player.storage._lingli > 0;
                            },
                            async content(event, trigger, player) {
                                player.changeLingli(-1);
                                player.draw();
                            },
                            delay: 0,
                            ai: {
                                order: 10,
                                result: {
                                    player: function (player) {
                                        player.fixSkillH();
                                        return player.storage._lingli - 2 * (3 - player.skillH.length) > 0 ? 1 : 0;
                                    },
                                },
                            },
                        },
                        _lingli_save: {
                            trigger: { target: "useCardToTargeted" },
                            forced: true,
                            popup: false,
                            filter: function (event, player) {
                                return event.card.name === "tao" && player == event.player._toSave;
                            },
                            async content(event, trigger, player) {
                                game.log(trigger.player, "帮助了保护目标");
                                trigger.player.changeLingli(1);
                            },
                        },
                        _lingli_damage: {
                            trigger: { source: "damage" },
                            forced: true,
                            popup: false,
                            filter: function (event, player) {
                                return event.player == player._toKill;
                            },
                            async content(event, trigger, player) {
                                game.log(player, "对杀伤目标造成了伤害");
                                player.changeLingli(trigger.num);
                            },
                        },
                        _sdhh_qiankunbagua: {
                            trigger: { player: "phaseAfter" },
                            forced: true,
                            forceDie: true,
                            popup: false,
                            filter: function (event, player) {
                                return (_status._aozhan && !player.getStat("damage") && player.isAlive()) || event._lastDead != undefined;
                            },
                            async content(event, trigger, player) {
                                if (_status._aozhan && !player.getStat("damage") && !player.name.startsWith("sdhh_")) {
                                    await player.loseHp();
                                    player.changeLingli(1);
                                    game.log(player, "本回合内未造成伤害，失去1点体力并获得1点灵力");
                                }

                                if (trigger._lastDead) {
                                    await game.executeQiankunBagua(trigger._lastDead);
                                }
                                if (_status._aozhan) return;
                                game.randomMission();
                            },
                        },
                        sdhh_noCard: {
                            mod: {
                                cardEnabled: () => false,
                                cardSavable: () => false,
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
                            async content(event, trigger, player) {
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
                            async content(event, trigger, player) {
                                const source = trigger.source;
                                source.discard(source.getCards("he"));
                                source.fixSkillH();
                                if (source.skillH?.length) source.removeSkillH(source.skillH.randomGet());
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
                            filter: (event, player) => !!event.source,
                            forceDie: true,
                            logTarget: "source",
                            async content(event, trigger, player) {
                                const source = trigger.source;
                                source.draw();
                                source.fixSkillH();
                                if (source.skillH.length === 3) {
                                    source.removeSkillH(source.skillH.randomGet());
                                }
                                const skills = lib.sandaohuanhua.skills.slice().randomSort();
                                for (const skill of skills) {
                                    if (!source.skillH.includes(skill)) {
                                        source.addSkillH(skill);
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
                            filter: (event, player) => !!event.source,
                            async content(event, trigger, player) {
                                const source = trigger.source;
                                source.draw(3);
                                source.fixSkillH();
                                if (source.skillH.length === 3) {
                                    source.removeSkillH(source.skillH.randomGet());
                                }
                                const skills = lib.sandaohuanhua.skills.slice().randomSort();
                                for (const skill of skills) {
                                    if (!source.skillH.includes(skill)) {
                                        source.addSkillH(skill);
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
                            async content(event, trigger, player) {
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
                            prompt: "弃置1/2张牌并摸等量张牌",
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
                                player.draw(event.cards.length);
                            },
                            ai: {
                                order: 1,
                                result: { player: 1 },
                            },
                        },
                    },
                    translate: {
                        _lingli: "聚灵",
                        _lingli_bg: "灵",
                        _lingli_draw: "聚灵",
                        sdhh_huilei: "挥泪",
                        sdhh_youlian: "犹怜",
                        sdhh_zhencang: "珍藏",
                        sdhh_huizhen: "汇珍",
                        sdhh_jubao: "聚宝",
                        sdhh_shulv: "熟虑",
                        sdhh_huilei_info: "锁定技，杀死你的角色弃置所有的牌。",
                        sdhh_youlian_info: "锁定技，杀死你的角色弃置所有牌并随机失去一个技能。",
                        sdhh_zhencang_info: "锁定技，杀死你的角色摸一张牌并随机获得一个技能(已满则先随机移除一个)。",
                        sdhh_huizhen_info: "锁定技，杀死你的角色摸三张牌并随机获得一个技能(已满则先随机移除一个)。",
                        sdhh_jubao_info: "锁定技，当你受到伤害的点数确定时，伤害来源随机获得你区域内的X张牌（X为伤害点数）。",
                        sdhh_shulv_info: "出牌阶段限一次，你可以弃置1/2张牌并摸等量张牌。",
                        sdhh_shiona: "汐奈",
                        sdhh_kanade: "立华奏",
                        sdhh_takaramono1: "坚实宝箱",
                        sdhh_takaramono2: "普通宝箱",
                        sdhh_toulianghuanzhu: "偷梁换柱",
                        sdhh_fudichouxin: "釜底抽薪",
                        sdhh_toulianghuanzhu_info: "出牌阶段，对一名角色使用，随机更换其一个技能。可重铸。",
                        sdhh_fudichouxin_info: "出牌阶段，对一名角色使用，随机弃置其一个技能。",
                        刷新_info: "消耗1点灵力值，刷新上述技能。",
                    },
                },
                get: {
                    rawAttitude(from, to) {
                        if (from === to) return 10;
                        if (from.hasSkill("sdhh_noCard") || to.hasSkill("sdhh_noCard")) return 0;
                        if (to === from._toSave) return 3;
                        if (to === from._toKill) return -10;
                        return -6;
                    },
                },
                eltc: {
                    async gameDraw(event, trigger, player) {
                        let end = player;
                        let num = function (player) {
                            return player._hSeat > 5 ? 5 : 4;
                        };
                        do {
                            let numx = typeof num === "function" ? num(player) : 4;
                            if (player._hSeat > 6) player.changeLingli(1);

                            const cards = get.cards(numx);
                            player.directgain(cards);
                            player._start_cards = cards;
                            player = player.next;
                        } while (player != end);
                    },
                },
                eltp: {
                    addSkillH(skill) {
                        this.skillH ??= [];
                        if (!skill || this.skillH.includes(skill)) return;
                        this.skillH.add(skill);
                        this.addSkillLog(skill);
                    },
                    removeSkillH(skill) {
                        this.skillH ??= [];
                        if (!skill || !this.skillH.includes(skill)) return;
                        this.skillH.remove(skill);
                        game.log(this, "失去了技能", "#g【" + get.translation(skill) + "】");
                        this.removeSkill(skill);
                    },
                    fixSkillH() {
                        if (!this.skillH) this.skillH = [];
                        for (let skill of this.skillH.slice()) {
                            if (!this.hasSkill(skill)) this.skillH.remove(skill);
                        }
                    },
                    dieAfter() {
                        let evt = _status.event.getParent("phase");
                        if (evt) evt._lastDead = this;
                        if (game.playerx().length === 1) game.over(game.me.isAlive());
                    },
                    $dieAfter() { },
                    hasUnknown() {
                        return false;
                    },
                    isUnknown() {
                        return false;
                    },
                    getEnemies() {
                        var list = game.playerx();
                        list.remove(this);
                        return list;
                    },
                    dieAfter2(source) {
                        if (this.name.indexOf("sdhh_") === 0) return;
                        if (source) {
                            const isKillTarget = source._toKill === this;
                            game.log(source, isKillTarget ? "击杀目标成功" : "完成补刀");
                            source.popup(isKillTarget ? "击杀成功" : "补刀成功");
                            source.draw(isKillTarget ? 2 : 1);
                            source.changeLingli(isKillTarget ? 3 : 2);
                        }
                        if (!_status._aozhan) {
                            let that = this;
                            game.countPlayer(function (current) {
                                if (current._toSave === that) {
                                    game.log(current, "保护目标失败");
                                    current.popup("保护失败");
                                    let cards = current.getCards("he");
                                    if (cards.length) current.discard(cards.randomGets(4));
                                }
                            });
                        }
                    },
                    logAi() { },
                    changeLingli(num) {
                        if (typeof num != "number") num = 1;
                        this.storage ??= {};
                        if (typeof this.storage._lingli != "number") this.storage._lingli = 0;

                        if (num > 0) {
                            num = Math.min(num, 5 - this.storage._lingli);
                            if (num < 1) return;
                            game.log(this, "获得了", "#y" + get.cnNumber(num) + "点", "灵力");
                        } else {
                            if (-num > this.storage._lingli) num = -this.storage._lingli;
                            if (num === 0) return;
                            game.log(this, "失去了", "#y" + get.cnNumber(-num) + "点", "灵力");
                        }
                        this.storage._lingli += num;
                        this.markSkill("_lingli");
                    },
                },
                game: {
                    playerx: function () {
                        return game.filterPlayer(function (current) {
                            if (current.name.indexOf("sdhh_") === 0) return;
                            return true;
                        });
                    },

                    async executeQiankunBagua(deadPlayer) {
                        const type = get.rand(1, 8);
                        deadPlayer.playerfocus(1200);

                        const baguaNames = ["离", "坎", "乾", "震", "兑", "艮", "巽", "坤"];
                        const logArg = ["#g乾坤八卦·" + baguaNames[type - 1], "：<br>"];
                        game.broadcastAll((text, nature) => game.me?.$fullscreenpop(text, nature), logArg[0].slice(2), get.groupnature(deadPlayer.group, "raw"));
                        await game.delay(1.5);

                        const effects = {
                            1: async () => {
                                logArg.push("#r每人失去1点体力");
                                game.log.apply(this, logArg);
                                for (const p of game.filterPlayer()) await p.loseHp();
                            },
                            2: async () => {
                                logArg.push("#y每人摸2张牌");
                                game.log.apply(this, logArg);
                                for (const p of game.filterPlayer()) await p.draw(2, "nodelay");
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
                                game.countPlayer(p => {
                                    const he = p.getCards("he");
                                    if (he.length) lose_list.push([p, [he.randomGet()]]);
                                });
                                await game.loseAsync({ lose_list: lose_list }).setContent("discardMultiple");
                            },
                            5: async () => {
                                logArg.push("#y每人+1灵力");
                                game.log.apply(this, logArg);
                                for (const p of game.filterPlayer()) p.changeLingli(1);
                            },
                            6: async () => {
                                logArg.push("#y每人获得1张装备牌");
                                game.log.apply(this, logArg);
                                const cards = [];
                                for (const p of game.filterPlayer()) {
                                    const card = get.cardPile(c => !cards.includes(c) && get.type(c) === "equip");
                                    if (!card) continue;
                                    cards.push(card);
                                    await p.gain(card);
                                }
                            },
                            7: async () => {
                                logArg.push("#y每人获得1个技能");
                                game.log.apply(this, logArg);
                                game.countPlayer(p => {
                                    p.fixSkillH();
                                    if (p.skillH?.length < 3) {
                                        const skills = lib.sandaohuanhua.skills.slice().randomSort();
                                        for (const skill of skills) {
                                            if (!p.skillH.includes(skill)) {
                                                p.addSkillH(skill);
                                                break;
                                            }
                                        }
                                    }
                                });
                            },
                            8: async () => {
                                const initTarget = lib.sandaohuanhua.NPC.randomGet();
                                logArg.addArray([`上一位阵亡玩家（`, `#b${get.translation(deadPlayer)}`, `）`]);
                                logArg.addArray([`变为`, `#b${get.translation(initTarget)}`, `复活`]);
                                game.log.apply(this, logArg);

                                deadPlayer.clearSkills(true);
                                deadPlayer.skillH = [];
                                deadPlayer.reinit(deadPlayer.name, initTarget, [lib.character[initTarget].hp, lib.character[initTarget].maxHp]);
                                await deadPlayer.reviveEvent(deadPlayer.maxHp, false);
                                deadPlayer.addSkill("sdhh_noCard");
                            }
                        };
                        await effects[type]();
                    },

                    // 初始化任务UI
                    initMissionUI: function () {
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

                        // 点击穿透功能（锁定时点击UI后方元素）
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

                                container.clearDocumentHandlers();
                                document.addEventListener('mouseup', container._docHandlers.mouseUp);
                                document.addEventListener('mousemove', container._docHandlers.mouseMove);
                                document.addEventListener('touchend', container._docHandlers.touchEnd);
                                document.addEventListener('touchmove', container._docHandlers.touchMove, { passive: false });
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

                                // 计算新位置（考虑边界限制）
                                let newX = x - dragState.startX;
                                let newY = y - dragState.startY;
                                const rect = container.getBoundingClientRect();
                                const X_MARGIN = 120, Y_MARGIN = 25;
                                const maxX = window.innerWidth - X_MARGIN - rect.left;
                                const minX = -(rect.width - X_MARGIN) - rect.left;
                                const maxY = window.innerHeight - Y_MARGIN - rect.top;
                                const minY = -(rect.height - Y_MARGIN) - rect.top;

                                dragState.x += Math.max(minX, Math.min(maxX, newX - dragState.x));
                                dragState.y += Math.max(minY, Math.min(maxY, newY - dragState.y));

                                container.style.setProperty('--sdhh-x', `${dragState.x}px`);
                                container.style.setProperty('--sdhh-y', `${dragState.y}px`);
                                dragState.isDragging = true;
                            },

                            end(e) {
                                if (!dragState.active) return;
                                dragState.active = false;
                                container.clearDocumentHandlers();
                                container.style.transition = '';

                                if (dragState.isFixed) {
                                    // 固定模式下未拖拽时触发点击穿透
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

                        container._docHandlers = {
                            mouseUp: e => DragHandler.end(e),
                            mouseMove: e => DragHandler.move(e),
                            touchEnd: e => DragHandler.end(e),
                            touchMove: e => DragHandler.move(e),
                        };
                        container.clearDocumentHandlers = () => {
                            const handlers = container._docHandlers;
                            document.removeEventListener('mouseup', handlers.mouseUp);
                            document.removeEventListener('mousemove', handlers.mouseMove);
                            document.removeEventListener('touchend', handlers.touchEnd);
                            document.removeEventListener('touchmove', handlers.touchMove);
                        };

                        const events = [
                            ['touchstart', e => DragHandler.start(e), { passive: false }],
                            ['mousedown', e => DragHandler.start(e)]
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

                    // 替换原有的randomMission
                    randomMission: function () {
                        if (_status._aozhan) return;

                        const players = game.playerx();
                        if (players.length <= 4) {
                            game.enterAozhanMode();
                            return;
                        }

                        // 初始化UI（如果不存在）
                        if (!ui.sandaohuanhua) {
                            game.initMissionUI();
                        }

                        // 分配任务目标
                        players.forEach(player => {
                            const others = players.filter(p => p !== player).randomSort();
                            [player._toKill, player._toSave] = [others[0], others[1]];
                        });

                        // 更新UI显示（使用独立模式的HTML样式）
                        const me = game.me;
                        if (me?._toKill && me?._toSave && ui.sandaohuanhua?._textSpan) {
                            ui.sandaohuanhua._textSpan.innerHTML =
                                `杀伤<span style='color:#ff5f56'>${get.translation(me._toKill)}(${me._toKill.identity})</span>，` +
                                `保护<span style='color:#98fb98'>${get.translation(me._toSave)}(${me._toSave.identity})</span>`;
                        }
                    },

                    // 进入死战模式
                    enterAozhanMode: function () {
                        game.countPlayer2(current => {
                            delete current._toKill;
                            delete current._toSave;
                        });

                        _status._aozhan = true;
                        if (ui.sandaohuanhua?._textSpan) {
                            ui.sandaohuanhua._textSpan.innerHTML = "死战模式";
                        }
                        game.playBackgroundMusic();
                        game.me?.$fullscreenpop('<span style="display:inline-block;transform:translateY(-100%);vertical-align:bottom">死战模式</span>', "fire");
                    },

                    getSkillDialog: function (skills, prompt) {
                        const dialog = ui.create.dialog("hidden", "forcebutton");

                        const clickItem = function () {
                            const parent = this.parentNode;
                            let infoDiv = parent.querySelector(".info");
                            if (infoDiv) {
                                infoDiv.remove();
                                return;
                            }

                            const skillInfo = get.info(this.link);
                            if (!skillInfo?.derivation) return;

                            const derivationList = Array.isArray(skillInfo.derivation) ? skillInfo.derivation : [skillInfo.derivation];
                            let newContent = derivationList.map(key => {
                                const content = get.translation(key + "_info");
                                if (!content) return '';
                                return `<div><div style="width:100%;">` +
                                    `<span style="font-family:yuanli; line-height:1.6; display:inline-block;">${get.translation(key)}:</span>` +
                                    `<ul style="display:table-cell; list-style:none;"><span style="font-family:yuanli">${content}</span></div></ul>` +
                                    `</div>`;
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
                                `<div style="width:100%;">${lib.translate[skill + "_info"] || ''}</div>` +
                                `</div>`;
                            const item = dialog.add(html);
                            const trigger = item.firstChild;
                            trigger.addEventListener("click", clickItem);
                            trigger.link = skill;
                        });

                        dialog.add(ui.create.div(".placeholder"));
                        return dialog;
                    },
                    showIdentity: function () {
                        game.players.forEach(function (p) {
                            p.node.identity.classList.remove("guessing");
                            p.identityShown = true;
                            p.ai.shown = 1;
                            p.setIdentity(p.identity, p.group);
                        });
                        // 清除身份猜测UI
                        if (_status.clickingidentity) {
                            _status.clickingidentity[1].forEach(function (btn) {
                                btn.delete();
                                btn.style.transform = "";
                            });
                            delete _status.clickingidentity;
                        }
                    },
                    chooseCharacter: function () {
                        game.initMissionUI();
                        let next = game.createEvent("chooseCharacter");
                        next.showConfig = true;
                        next.setContent(async function () {
                            game.zhu = game.players.randomGet();
                            let i = 1;
                            let current = game.zhu;
                            while (true) {
                                current.skillH = [];
                                current._hSeat = i;
                                current.identity = i;
                                current.setIdentity();
                                current.setNickname(get.cnNumber(i, true) + "号位");
                                for (var ii in lib.sandaohuanhua.eltp)
                                    current[ii] = lib.sandaohuanhua.eltp[ii];
                                current = current.next;
                                i++;
                                if (current == game.zhu) break;
                            }
                            ui.arena.classList.add("choose-character");

                            const result = await game.me.chooseButton(
                                ["请选择角色形象", [_status.characterlist.randomRemove(5), "character"]],
                                true
                            ).set("onfree", true).forResult();

                            game.me.init(result.links[0]);
                            game.countPlayer(function (current) {
                                if (current != game.me) {
                                    current.init(_status.characterlist.randomRemove(1)[0]);
                                }
                            });
                            game.showIdentity(true);
                            game.randomMission();

                            const list = info.CONSTANTS.START_SKILLS;
                            const skillResult = await game.me.chooseControl(list)
                                .set("ai", () => list.randomGet())
                                .set("dialog", game.getSkillDialog(list, "选择要获得的初始技能"))
                                .forResult();

                            const globalSkills = info.CONSTANTS.GLOBAL_SKILLS;
                            globalSkills.forEach(skill => game.addGlobalSkill(skill));

                            game.me.addSkillH(skillResult.control);
                            game.countPlayer(function (current) {
                                if (current != game.me) {
                                    current.addSkillH(info.CONSTANTS.START_SKILLS.randomGet());
                                }
                                current.storage._lingli = 0;
                                current.markSkill("_lingli");
                            });

                            const specialCards = [
                                game.createCard("sdhh_fudichouxin", "spade", 13),
                                game.createCard("sdhh_toulianghuanzhu", "heart", 9),
                                game.createCard("sdhh_toulianghuanzhu", "club", 5),
                                game.createCard("sdhh_toulianghuanzhu", "diamond", 1),
                            ];
                            for (let card of specialCards) {
                                ui.cardPile.insertBefore(
                                    card,
                                    ui.cardPile.childNodes[get.rand(ui.cardPile.childElementCount)]
                                );
                            }
                            game.updateRoundNumber();

                            setTimeout(function () {
                                ui.arena.classList.remove("choose-character");
                            }, 500);
                            _status.videoInited = true;

                            game.addVideo("arrangeLib", null, {
                                skill: {
                                    _lingli_damage: {},
                                    _lingli: {
                                        mark: true,
                                        marktext: "灵",
                                        popup: "聚灵",
                                        intro: {
                                            name: "灵力",
                                            content: "当前灵力点数：# / 5",
                                        },
                                    },
                                    _lingli_round: {},
                                    _lingli_draw: {},
                                    _lingli_save: {},
                                    sdhh_noCard: {},
                                    sdhh_huilei: { skillAnimation: true },
                                    sdhh_youlian: { skillAnimation: true },
                                    sdhh_zhencang: {},
                                    sdhh_huizhen: {},
                                    sdhh_jubao: {},
                                    sdhh_shulv: {},
                                },
                                card: {
                                    sdhh_toulianghuanzhu: {
                                        image: "image/card/hhzz_toulianghuanzhu.png",
                                        fullskin: true,
                                    },
                                    sdhh_fudichouxin: {
                                        image: "image/card/hhzz_fudichouxin.png",
                                        fullskin: true,
                                    },
                                },
                                character: {
                                    sdhh_shiona: ["female", "key", 1, ["sdhh_huilei"], ["img:image/character/hhzz_shiona.jpg"]],
                                    sdhh_kanade: ["female", "key", 2, ["sdhh_youlian"], ["img:image/character/hhzz_kanade.jpg"]],
                                    sdhh_takaramono1: ["none", "nine", 5, ["sdhh_jubao", "sdhh_huizhen"], ["img:image/character/hhzz_takaramono1.jpg"]],
                                    sdhh_takaramono2: ["none", "three", 3, ["sdhh_jubao", "sdhh_zhencang"], ["img:image/character/hhzz_takaramono2.jpg"]],
                                },
                                translate: {
                                    _lingli: "聚灵",
                                    _lingli_bg: "灵",
                                    _lingli_draw: "聚灵",
                                    sdhh_huilei: "挥泪",
                                    sdhh_youlian: "犹怜",
                                    sdhh_zhencang: "珍藏",
                                    sdhh_huizhen: "汇珍",
                                    sdhh_jubao: "聚宝",
                                    sdhh_shulv: "熟虑",
                                    sdhh_huilei_info: "锁定技，杀死你的角色弃置所有的牌。",
                                    sdhh_youlian_info: "锁定技，杀死你的角色弃置所有牌并随机失去一个技能。",
                                    sdhh_zhencang_info: "锁定技，杀死你的角色摸一张牌并随机获得一个技能(已满则先随机移除一个)。",
                                    sdhh_huizhen_info: "锁定技，杀死你的角色摸三张牌并随机获得一个技能(已满则先随机移除一个)。",
                                    sdhh_jubao_info: "锁定技，当你受到伤害的点数确定时，伤害来源随机获得你区域内的X张牌（X为伤害点数）。",
                                    sdhh_shulv_info: "出牌阶段限一次，你可以弃置1/2张牌并摸等量张牌。",
                                    nei: " ",
                                    nei2: " ",
                                    sdhh_shiona: "汐奈",
                                    sdhh_kanade: "立华奏",
                                    sdhh_takaramono1: "坚实宝箱",
                                    sdhh_takaramono2: "普通宝箱",
                                    sdhh_toulianghuanzhu: "偷梁换柱",
                                    sdhh_fudichouxin: "釜底抽薪",
                                    sdhh_toulianghuanzhu_info: "出牌阶段，对一名角色使用，随机更换其一个技能。可重铸。",
                                    sdhh_fudichouxin_info: "出牌阶段，对一名角色使用，随机弃置其一个技能。",
                                    刷新_info: "消耗1点灵力值，刷新上述技能。",
                                },
                            });
                        });
                        return next;
                    },
                },
            };

            let func = function (pack) {
                for (let i in pack.pack) {
                    for (let j in pack.pack[i]) lib[i][j] = pack.pack[i][j];
                }
                for (let i in pack.eltc) lib.element.content[i] = pack.eltc[i];
                for (let i in pack.eltp) lib.element.player[i] = pack.eltp[i];
                for (let i in pack.game) game[i] = pack.game[i];
                for (let i in pack.get) get[i] = pack.get[i];
                lib.sandaohuanhua = pack;
                lib.sandaohuanhua.NPC = ["sdhh_shiona", "sdhh_kanade", "sdhh_takaramono1", "sdhh_takaramono2"];
            };
            func(pack);
        },
    },
};
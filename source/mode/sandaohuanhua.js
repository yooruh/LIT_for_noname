import { lib, game, ui, get, ai, _status } from '../../../../noname.js';
import { Lit_Dialog } from '../tool/extraUI.js';
import basic from '../tool/basic.js';

export let info = {
    name: "叁岛幻化",
    mode: "identity",
    intro: `完成任务收灵力，灵力加持得技能，参悟卦象衡步履，起死回生逆乾坤！`,
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
                Lit_Dialog.showDocModal(
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
        let textContent = '简略介绍<br>' +
            '一、选将、灵力与技能<br>' +
            '选将：均为4血白板<br>' +
            '<br>' +
            '主要目标：活到最后一个便可获胜<br>' +
            '次要目标：随机分配，于正上方显示（杀伤xx，保护xx），判乾坤八卦后重置；保护目标死亡时，随机失去4张牌<br>' +
            '<br>' +
            '获得灵力值：<br>' +
            '(1)七号位和八号位起始1点，六七八号位多一牌<br>' +
            '(2)每轮+1点灵力值<br>' +
            '(3)击败1人+1点灵力值+1牌，为杀伤目标，则+3点灵力值，对保护目标用桃，+1点灵力值<br>' +
            '使用灵力值：<br>' +
            '(1)回合开始时可-2~3点灵力值获得新技能(3选1或6选1，超过3个需弃一个)<br>' +
            '(2)选择新技能时可消耗一点灵力值刷新技能选项<br>' +
            '(3)出牌阶段限一次，可将任意数量的灵力值转等数量的牌<br><br>' +
            '三个起始技能任选一个：<br>' +
            '牺牲：每名其他角色的回合限一次，可将两张牌当做【桃】使用<br>' +
            '熟虑：出牌阶段限一次，可以弃置1/2张牌并摸等量+1张牌<br>' +
            '先登：锁定技；出牌阶段，使用的首张杀不计次数且无距离限制<br>' +
            '<li>场上存活人数（不计宝箱和女子）≤4人时，进入死战：不再获得灵力值，次要目标消失，若角色在自己的回合内没有造成伤害，则-1体力<br><br>' +
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
            let skills = [];
            let banned = ["xinfu_guhuo", "reguhuo", "jixi", "duanchang", "huashen", "xinsheng", "rehuashen", "rexinsheng", "jinqu", "nzry_binglve", "nzry_huaiju", "nzry_yili", "nzry_zhenglun", "nzry_mingren", "nzry_zhenliang", "drlt_qingce", "new_wuhun", "qixing", "kuangfeng", "dawu", "baonu", "wumou", "ol_wuqian", "ol_shenfen", "renjie", "jilue", "nzry_junlve", "nzry_dinghuo", "drlt_duorui", "chuanxin", "cunsi", "jueqing", "huilei", "paiyi", "fuhun", "zhuiyi", "olddanshou", "yanzhu", "juexiang", "jiexun", "bizhuan", "tongbo", "xinfu_zhanji", "xinfu_jijun", "xinfu_fangtong", "xinfu_qianchong", "pdgyinshi", "shuliang", "zongkui", "guju", "bmcanshi", "dingpan", "xinfu_lingren", "new_luoyan", "junwei", "gxlianhua", "qizhou", "fenyue", "dianhu", "linglong", "fenxin", "mouduan", "cuorui", "xinmanjuan", "xinfu_jianjie", "jianjie_faq", "new_meibu", "xinfu_xingzhao", "jici", "xianfu", "fenyong", "xuehen", "yingbin", "midao", "yishe", "yinbing", "juedi", "bushi", "xinfu_dianhua", "xinfu_falu", "xinfu_zhenyi", "lskuizhu", "pingjian", "xjshijian", "fentian", "zhiri", "xindan", "xinzhengnan", "xinfu_xiaode", "komari_xueshang", "qiaosi_map",
                "rechanyuan", "chanyuan"];
            let bannedPacks = ['lit_test'];
            for (let packName of bannedPacks) {
                let bannedPack = lib.characterPack[packName];
                if (!bannedPack) continue;
                for (let char in bannedPack) {
                    banned.addArray(bannedPack[char].skills);
                }
            }
            let characters = [];
            for (let name in lib.character) {
                if (!lib.character[name]) continue;
                if (lib.filter.characterDisabled(name)) continue;
                if (!game.getExtensionConfig('叁岛世界', 'lit_huanhuaLimit')) {
                    if (!name.startsWith("lit_") && !name.startsWith("sdhh_")) continue;
                }
                let skillsx = lib.character[name][3].slice(0);
                lib.character[name].hp = 4;
                lib.character[name].maxHp = 4;
                lib.character[name].hujia = 0;
                lib.character[name].skills = [];
                lib.character[name].hasHiddenSkill = false;
                characters.push(name);
                var list = skillsx.slice(0);
                for (let j = 0; j < skillsx.length; j++) {
                    let info = get.info(skillsx[j]);
                    if (!info) {
                        skillsx.splice(j, 1);
                        list.splice(j--, 1);
                        continue;
                    }
                    if (typeof info.derivation === "string") list.push(info.derivation);
                    else if (Array.isArray(info.derivation)) list.addArray(info.derivation);
                }
                for (let j = 0; j < list.length; j++) {
                    if (skills.includes(list[j]) || list[j].endsWith('_append') || list[j].endsWith("_faq") || banned.includes(list[j])) continue;
                    if (list[j].startsWith('lit_')) {
                        if (list[j].endsWith('V2') || list[j].endsWith("_limit")) continue;
                    }
                    let info = get.info(list[j]);
                    if (
                        !info ||
                        info.zhuSkill ||
                        info.juexingji ||
                        info.charlotte ||
                        info.limited ||
                        info.hiddenSkill ||
                        info.dutySkill ||
                        info.groupSkill ||
                        info.lit_dk ||
                        info.lit_neg ||
                        info.sourceSkill ||
                        (info.ai && info.ai.combo)
                    ) continue;
                    skills.push(list[j]);
                }
            }
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
                            content: function () {
                                target.fixSkillH();
                                target.removeSkillH(target.skillH.randomGet());
                                let skills = lib.sandaohuanhua.skills;
                                skills.randomSort();
                                for (let i = 0; i < skills.length; i++) {
                                    if (!target.skillH.includes(skills[i])) {
                                        target.addSkillH(skills[i]);
                                        break;
                                    }
                                }
                            },
                            ai: {
                                order: 10,
                                result: {
                                    target: function () {
                                        return 0.5 - Math.random();
                                    },
                                },
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
                            content: function () {
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
                        sdhh_takaramono1: ["none", "three", 5, ["sdhh_jubao", "sdhh_huizhen"], ["img:image/character/hhzz_takaramono1.jpg"]],
                        sdhh_takaramono2: ["none", "nine", 3, ["sdhh_jubao", "sdhh_zhencang"], ["img:image/character/hhzz_takaramono2.jpg"]],
                    },
                    skill: {
                        _lingli_damage: {
                            trigger: { source: "damage" },
                            forced: true,
                            popup: false,
                            filter: function (event, player) {
                                return event.player == player._toKill;
                            },
                            content: function () {
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
                                content: function (storage, player, skill) {
                                    player.fixSkillH();
                                    if (player.skillH.length === 0) return `当前灵力点数：${storage} / 5`;
                                    let str = `当前灵力点数：${storage} / 5<li>已拥有技能:`;
                                    for (let skill of player.skillH) {
                                        str += " " + get.translation(skill);
                                    }
                                    return str;
                                },
                            },
                            trigger: {
                                player: "phaseBeginStart",
                            },
                            filter: function (event, player) {
                                return player.storage._lingli > 1;
                            },
                            check: function (event, player) {
                                player.fixSkillH();
                                return player.skillH.length < 3;
                            },
                            async cost(event, trigger, player) {
                                player.fixSkillH();
                                event.skills = lib.sandaohuanhua.skills;
                                let skills = event.skills;
                                skills.randomSort();
                                let skillList = [];
                                for (let i = 0; i < skills[i].length; i++) {
                                    if (!player.skillH.includes(skills[i])) skillList.push(skills[i]);
                                    if (skillList.length === 6) break;
                                }
                                let promptStr = `当前已拥有技能:`;
                                for (let skill of player.skillH) {
                                    promptStr += " " + get.translation(skill);
                                }
                                if (player.storage._lingli === 2 || (3 <= skillList.length && skillList.length < 6)) {
                                    const { control } = await player.chooseControl(['确定', 'cancel2'])
                                        .set("prompt", `${promptStr}，是否消耗2点灵力从三个技能中选择其中一个${player.skillH.length === 3 ? '替换' : '获得'}？`)
                                        .set("ai", (event, player) => {
                                            if (player.skillH.length == 3) return 'cancel2';
                                            return '确定';
                                        }).forResult();
                                    if (control != 'cancel2') event.result = {
                                        bool: true,
                                        cost_data: [1, skillList.slice(3)],
                                    };
                                } else if (skillList.length === 6) {
                                    const list = ['三选其一', '六选其一', 'cancel2'];
                                    const { control } = await player.chooseControl(list)
                                        .set("prompt", `###${promptStr}，是否消耗2点灵力从三个技能中${player.skillH.length === 3 ? '替换' : '获得'}其一？###<li>或多消耗1点灵力从六个技能中选择`)
                                        .set("ai", (event, player) => {
                                            if (player.skillH.length === 3) return 'cancel2';
                                            return '三选其一';
                                        }).forResult();
                                    let index = list.indexOf(control) + 1;
                                    event.result = {
                                        bool: control != 'cancel2',
                                        cost_data: [index, skillList.slice(index * 3)],
                                    };
                                }
                            },
                            content: function () {
                                "step 0";
                                player.changeLingli(-event.cost_data[0] - 1);
                                "step 1";
                                event.skills = lib.sandaohuanhua.skills;
                                let skills = event.skills;
                                skills.randomSort();
                                var list = event.cost_data[1];
                                for (let i = 0; i < skills[i].length && list.length < 3 * event.cost_data[0]; i++) {
                                    if (!player.skillH.includes(skills[i])) list.push(skills[i]);
                                }
                                if (!list.length) {
                                    player.popup("技能耗尽");
                                    player.changeLingli(event.cost_data[0] + 1);
                                    event.finish();
                                    return;
                                }
                                if (player.storage._lingli > 0) list.push("刷新");
                                event.list = list;
                                let dialog = game.getSkillDialog(event.list, "选择获得一个技能");
                                player.chooseControl(event.list).set("ai", function () {
                                    return get.max(list.filter(e => e != "刷新"), get.skillRank, "item");
                                }).dialog = dialog;
                                "step 2";
                                if (result.control === "刷新") {
                                    event.cost_data[1] = [];
                                    player.changeLingli(-1);
                                    event.goto(1);
                                    return;
                                }
                                event.skill = result.control;
                                if (player.skillH.length === 3) {
                                    event.lose = true;
                                    player.chooseControl(player.skillH).prompt = "选择失去1个已有技能";
                                }
                                "step 3";
                                if (event.lose) player.removeSkillH(result.control);
                                player.addSkillH(event.skill);
                            },
                        },
                        _lingli_round: {
                            trigger: { global: "roundStart" },
                            forced: true,
                            popup: false,
                            filter: function (event, player) {
                                return _status._aozhan != true && game.roundNumber > 1;
                            },
                            content: function () {
                                player.changeLingli(1);
                            },
                        },
                        _lingli_draw: {
                            enable: "phaseUse",
                            filter: function (event, player) {
                                return player.storage._lingli > 0;
                            },
                            content: function () {
                                player.changeLingli(-1);
                                player.draw();
                            },
                            delay: 0,
                            ai: {
                                order: 10,
                                result: {
                                    player: function (player) {
                                        player.fixSkillH();
                                        return player.storage._lingli -
                                            2 * (3 - player.skillH.length) >
                                            0
                                            ? 1
                                            : 0;
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
                            content: function () {
                                game.log(trigger.player, "帮助了保护目标");
                                trigger.player.changeLingli(1);
                            },
                        },
                        _sdhh_qiankunbagua: {
                            trigger: { player: "phaseAfter" },
                            forced: true,
                            forceDie: true,
                            popup: false,
                            filter: function (event, player) {
                                return (
                                    (_status._aozhan &&
                                        !player.getStat("damage") &&
                                        player.isAlive()) ||
                                    event._lastDead != undefined
                                );
                            },
                            content: function () {
                                "step 0";
                                if (_status._aozhan && !player.getStat("damage") && !player.name.startsWith("sdhh_")) {
                                    player.loseHp();
                                    player.changeLingli(1);
                                    game.log(player, "本回合内未造成伤害，触发死战模式惩罚");
                                }
                                if (trigger._lastDead == undefined) event.goto(2);
                                "step 1";
                                let type = get.rand(1, 8);
                                event.type = type;
                                trigger._lastDead.playerfocus(1200);
                                player.$fullscreenpop(
                                    "乾坤八卦·" +
                                    ["离", "坎", "乾", "震", "兑", "艮", "巽", "坤"][
                                    type - 1
                                    ],
                                    get.groupnature(trigger._lastDead.group, "raw")
                                );
                                game.delay(1.5);
                                "step 2";
                                switch (event.type) {
                                    case 1: {
                                        game.countPlayer(function (current) {
                                            current.loseHp();
                                        });
                                        break;
                                    }
                                    case 2: {
                                        game.countPlayer(function (current) {
                                            current.draw(2, "nodelay");
                                        });
                                        break;
                                    }
                                    case 3: {
                                        trigger._lastDead.reviveEvent(3);
                                        trigger._lastDead.draw(3);
                                        break;
                                    }
                                    case 4: {
                                        game.countPlayer(function (current) {
                                            let he = current.getCards("he");
                                            if (he.length)
                                                current.discard(he.randomGet()).delay = false;
                                        });
                                        break;
                                    }
                                    case 5: {
                                        game.countPlayer(function (current) {
                                            current.changeLingli(1);
                                        });
                                        break;
                                    }
                                    case 6: {
                                        let cards = [];
                                        game.countPlayer(function (current) {
                                            let card = get.cardPile(function (card) {
                                                return (
                                                    !cards.includes(card) &&
                                                    get.type(card) === "equip"
                                                );
                                            });
                                            if (card) {
                                                cards.push(card);
                                                current.$gain(card, "gain2");
                                                current.gain(card);
                                            }
                                        });
                                        break;
                                    }
                                    case 7: {
                                        game.countPlayer(function (current) {
                                            current.fixSkillH();
                                            if (current.skillH.length < 3) {
                                                let skills = lib.sandaohuanhua.skills;
                                                skills.randomSort();
                                                for (let i = 0; i < skills.length; i++) {
                                                    if (!current.skillH.includes(skills[i])) {
                                                        current.addSkillH(skills[i]);
                                                        break;
                                                    }
                                                }
                                            }
                                        });
                                        break;
                                    }
                                    case 8: {
                                        trigger._lastDead.reviveEvent(null, false);
                                        trigger._lastDead.uninit();
                                        trigger._lastDead.init(
                                            [
                                                "sdhh_shiona",
                                                "sdhh_kanade",
                                                "sdhh_takaramono1",
                                                "sdhh_takaramono2",
                                            ].randomGet()
                                        );
                                        trigger._lastDead.fixSkillH();
                                        trigger._lastDead.skillH =
                                            lib.character[trigger._lastDead.name][3].slice(0);
                                        trigger._lastDead.addSkill("sdhh_noCard");
                                        break;
                                    }
                                }
                                "step 3";
                                if (game.playerx().length <= 4 && !_status._aozhan) {
                                    game.countPlayer2(function (current) {
                                        delete current._toKill;
                                        delete current._toSave;
                                    });
                                    ui.sandaohuanhua.innerHTML = "死战模式";
                                    _status._aozhan = true;
                                    game.playBackgroundMusic();
                                    trigger._lastDead.$fullscreenpop(
                                        "死战模式",
                                        get.groupnature(trigger._lastDead.group, "raw") || "fire"
                                    );
                                } else game.randomMission();
                            },
                        },
                        sdhh_noCard: {
                            mod: {
                                cardEnabled: function () {
                                    return false;
                                },
                                cardSavable: function () {
                                    return false;
                                },
                                cardRespondable: function () {
                                    return false;
                                },
                            },
                        },
                        sdhh_huilei: {
                            trigger: { player: "die" },
                            forced: true,
                            forceDie: true,
                            skillAnimation: true,
                            logTarget: "source",
                            filter: function (event, player) {
                                return event.source != undefined;
                            },
                            content: function () {
                                let source = trigger.source;
                                let cards = source.getCards("he");
                                if (cards.length) source.discard(cards);
                            },
                            ai: {
                                threaten: 0.1,
                                effect: {
                                    target: function (card, player, target) {
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
                            filter: function (event, player) {
                                return event.source != undefined;
                            },
                            content: function () {
                                let source = trigger.source;
                                let cards = source.getCards("he");
                                if (cards.length) source.discard(cards);
                                source.fixSkillH();
                                let skills = source.skillH;
                                if (skills.length) source.removeSkillH(skills.randomGet());
                            },
                            ai: {
                                effect: {
                                    target: function (card, player, target) {
                                        if (get.tag(card, "damage")) return [-5, 0];
                                    },
                                },
                            },
                        },
                        sdhh_zhencang: {
                            trigger: { player: "die" },
                            forced: true,
                            filter: function (event, player) {
                                return event.source != undefined;
                            },
                            forceDie: true,
                            logTarget: "source",
                            content: function () {
                                let source = trigger.source;
                                source.draw();
                                source.fixSkillH();
                                if (source.skillH.length === 3) {
                                    source.removeSkillH(source.skillH.randomGet());
                                }
                                let skills = lib.sandaohuanhua.skills;
                                skills.randomSort();
                                for (let i = 0; i < skills.length; i++) {
                                    if (!source.skillH.includes(skills[i])) {
                                        source.addSkillH(skills[i]);
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
                            filter: function (event, player) {
                                return event.source != undefined;
                            },
                            content: function () {
                                let source = trigger.source;
                                source.draw(3);
                                source.fixSkillH();
                                if (source.skillH.length === 3) {
                                    source.removeSkillH(source.skillH.randomGet());
                                }
                                let skills = lib.sandaohuanhua.skills;
                                skills.randomSort();
                                for (let i = 0; i < skills.length; i++) {
                                    if (!source.skillH.includes(skills[i])) {
                                        source.addSkillH(skills[i]);
                                        break;
                                    }
                                }
                            },
                        },
                        sdhh_jubao: {
                            trigger: { player: "damage" },
                            forced: true,
                            logTarget: "source",
                            filter: function (event, player) {
                                return event.source != undefined && player.countCards("he") > 0;
                            },
                            content: function () {
                                let cards = player.getCards("he");
                                cards.randomSort();
                                cards = cards.slice(0, trigger.num);
                                trigger.source.gain("give", cards, player);
                            },
                            ai: {
                                effect: {
                                    target: function (card, player, target) {
                                        if (get.tag(card, "damage")) return [15, 0];
                                    },
                                },
                            },
                        },
                        sdhh_shulv: {
                            mod: {
                                aiOrder(player, card, num) {
                                    if (num <= 0 || get.itemtype(card) !== "card" || get.type(card) !== "equip") {
                                        return num;
                                    }
                                    let eq = player.getEquip(get.subtype(card));
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
                                let player = _status.event.player;
                                if (get.position(card) == "e") {
                                    let subs = get.subtypes(card);
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
                                result: {
                                    player: 1,
                                },
                                threaten: 1.1,
                            },
                        }
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
                        sdhh_huilei_info: "锁定技，杀死你的角色弃置所有的牌。",
                        sdhh_youlian_info: "锁定技，杀死你的角色弃置所有牌并随机失去一个技能。",
                        sdhh_zhencang_info:
                            "锁定技，杀死你的角色摸一张牌并随机获得一个技能(已满则先随机移除一个)。",
                        sdhh_huizhen_info:
                            "锁定技，杀死你的角色摸三张牌并随机获得一个技能(已满则先随机移除一个)。",
                        sdhh_jubao_info:
                            "锁定技，当你受到伤害的点数确定时，伤害来源随机获得你区域内的X张牌（X为伤害点数）。",
                        sdhh_shulv: "熟虑",
                        sdhh_shulv_info:
                            "出牌阶段限一次，你可以弃置1/2张牌并摸2/3张牌。",
                        sdhh_shiona: "汐奈",
                        sdhh_kanade: "立华奏",
                        sdhh_takaramono1: "坚实宝箱",
                        sdhh_takaramono2: "普通宝箱",
                        sdhh_toulianghuanzhu: "偷梁换柱",
                        sdhh_fudichouxin: "釜底抽薪",
                        sdhh_toulianghuanzhu_info:
                            "出牌阶段，对一名角色使用，随机更换其一个技能。可重铸。",
                        sdhh_fudichouxin_info: "出牌阶段，对一名角色使用，随机弃置其一个技能。",
                        nei: " ",
                        nei2: " ",
                        刷新_info: "消耗1点灵力值，刷新上述技能。",
                    },
                },
                get: {
                    rawAttitude: function (from, to) {
                        if (from === to) return 10;
                        if (to === from._toSave) return 3;
                        if (to === from._toKill) return -10;
                        if (to.hasSkill("sdhh_noCard")) return -3;
                        return -6;
                    },
                },
                eltc: {
                    gameDraw: function () {
                        let end = player;
                        let numx;
                        let num = function (player) {
                            return player._hSeat > 5 ? 5 : 4;
                        };
                        do {
                            if (typeof num === "function") {
                                numx = num(player);
                            }
                            if (player._hSeat > 6) player.changeLingli(1);
                            player.directgain(get.cards(numx));
                            player = player.next;
                        } while (player != end);
                    },
                },
                eltp: {
                    addSkillH: function (skill) {
                        this.skillH.add(skill);
                        this.addSkillLog.apply(this, arguments);
                    },
                    removeSkillH: function (skill) {
                        this.skillH.remove(skill);
                        game.log(this, "失去了技能", "#g【" + get.translation(skill) + "】");
                        this.removeSkill(skill);
                    },
                    fixSkillH: function () {
                        for (let skill of this.skillH) {
                            if (!this.hasSkill(skill)) this.skillH.remove(skill);
                        }
                    },
                    dieAfter: function () {
                        let evt = _status.event.getParent("phase");
                        if (evt) evt._lastDead = this;
                        if (game.playerx().length === 1) game.over(game.me.isAlive());
                    },
                    $dieAfter: function () { },
                    hasUnknown: function () {
                        return false;
                    },
                    isUnknown: function () {
                        return false;
                    },
                    getEnemies: function () {
                        var list = game.playerx();
                        list.remove(this);
                        return list;
                    },
                    dieAfter2: function (source) {
                        if (source && this.name.indexOf("sdhh_") != 0) {
                            if (source._toKill === this) {
                                game.log(source, "击杀目标成功");
                                source.popup("击杀成功")
                            }
                            source.draw(this === source._toKill ? 2 : 1);
                            source.changeLingli(this === source._toKill ? 3 : 2);
                        }
                        if (!_status._aozhan) {
                            let that = this;
                            game.countPlayer(function (current) {
                                if (current._toSave === that) {
                                    game.log(current, "保护目标失败");
                                    current.popup("保护失败")
                                    let cards = current.getCards("he");
                                    if (cards.length) current.discard(cards.randomGets(4));
                                }
                            });
                        }
                    },
                    logAi: function () { },
                    changeLingli: function (num) {
                        if (typeof num != "number") num = 1;
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
                    randomMission: function () {
                        if (_status._aozhan) return;
                        if (!ui.sandaohuanhua) {
                            ui.sandaohuanhua = ui.create.div(".touchinfo", ui.window);
                            if (ui.time3) ui.time3.style.display = "none";
                        }
                        let players = game.playerx();
                        for (let i = 0; i < players.length; i++) {
                            let player = players[i];
                            var list = players.slice(0).randomSort();
                            list.remove(player);
                            player._toKill = list[0];
                            player._toSave = list[1];
                        }
                        ui.sandaohuanhua.innerHTML =
                            "杀伤<span style='color:#ff69b4'>" +
                            get.translation(game.me._toKill) +
                            "</span>，保护<span style='color:#54c071'>" +
                            get.translation(game.me._toSave) +
                            "</span>";
                        ui.sandaohuanhua.style.cssText = `
								text-align: center;
								position: fixed;
								top: 0;
								left: ${get.is.phoneLayout() ? "50%" : "33%"};
								z-index: 1000;
								white-space: nowrap;
								backdrop-filter: blur(0.5px);
								font-size: clamp(12px, 4vw, 24px);
								transform: translateX(-50%)translateY(-8%);
								pointer-events: none;
							`;
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
                            const info = get.info(this.link);
                            if (!info || !info.derivation) return;
                            const derivationList = [].concat(info.derivation);

                            let newContent = '';
                            for (const key of derivationList) {
                                const content = get.translation(key + "_info");
                                if (!content) continue;
                                newContent += '<div><div class="skill"><span style="font-family:yuanli">' +
                                    get.translation(key) + ':</span></div><div><span style="font-family:yuanli">' +
                                    content + '</span></div></div><br>';
                            }
                            if (newContent) {
                                // 去除末尾的 <br>
                                newContent = newContent.slice(0, -4);
                                infoDiv = dialog.add(newContent);
                                infoDiv.classList.add("info");
                                parent.insertBefore(infoDiv, this.nextSibling);
                            }
                        };

                        if (prompt) dialog.addText(prompt);
                        for (const skill of skills) {
                            const html = `<div class="popup pointerdiv" style="width:100%;display:inline-block">
                                <div class="skill" style="width:auto!important;">【${get.translation(skill)}】</div>
                                <div>${lib.translate[skill + "_info"] || ''}</div>
                            </div>`;
                            const item = dialog.add(html);
                            const trigger = item.firstChild; // 获取 .skill 元素
                            trigger.addEventListener("click", clickItem);
                            trigger.link = skill;
                        }

                        dialog.add(ui.create.div(".placeholder"));
                        return dialog;
                    },
                    chooseCharacter: function () {
                        let next = game.createEvent("chooseCharacter");
                        next.showConfig = true;
                        next.setContent(function () {
                            "step 0";
                            game.zhu = game.players.randomGet();
                            let i = 1;
                            let current = game.zhu;
                            while (true) {
                                current.skillH = [];
                                current._hSeat = i;
                                current.identity = "nei";
                                current.setNickname(get.cnNumber(i, true) + "号位");
                                for (let ii in lib.sandaohuanhua.eltp)
                                    current[ii] = lib.sandaohuanhua.eltp[ii];
                                current = current.next;
                                i++;
                                if (current === game.zhu) break;
                            }
                            ui.arena.classList.add("choose-character");
                            game.me.chooseButton(
                                [
                                    "请选择角色形象",
                                    [_status.characterlist.randomRemove(5), "character"],
                                ],
                                true
                            ).onfree = true;
                            "step 1";
                            game.me.init(result.links[0]);
                            var list = ["xiandeng", "sdhh_shulv", "xisheng"];
                            game.me.chooseControl(list).dialog = game.getSkillDialog(
                                list,
                                "选择要获得的初始技能"
                            );
                            "step 2";
                            var list = [
                                "_lingli",
                                "_lingli_round",
                                "_lingli_draw",
                                "_lingli_save",
                                "_sdhh_qiankunbagua",
                                "_lingli_damage",
                            ];
                            for (let i = 0; i < list.length; i++) {
                                game.addGlobalSkill(list[i]);
                            }
                            game.me.addSkillH(result.control);
                            game.countPlayer(function (current) {
                                if (!current.name) {
                                    current.init(_status.characterlist.randomRemove(1)[0]);
                                    current.addSkillH(
                                        ["xiandeng", "sdhh_shulv", "xisheng"].randomGet()
                                    );
                                }
                                current.storage._lingli = 0;
                                current.markSkill("_lingli");
                            });
                            game.showIdentity(true);
                            "step 3";
                            game.randomMission();
                            var list = [
                                game.createCard("sdhh_fudichouxin", "spade", 13),
                                game.createCard("sdhh_toulianghuanzhu", "heart", 9),
                                game.createCard("sdhh_toulianghuanzhu", "club", 5),
                                game.createCard("sdhh_toulianghuanzhu", "diamond", 1),
                            ];
                            for (let i = 0; i < list.length; i++) {
                                ui.cardPile.insertBefore(
                                    list[i],
                                    ui.cardPile.childNodes[
                                    get.rand(ui.cardPile.childElementCount)
                                    ]
                                );
                            }
                            game.updateRoundNumber();
                            "step 4";
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
                                    sdhh_huilei: {
                                        skillAnimation: true,
                                    },
                                    sdhh_youlian: {
                                        skillAnimation: true,
                                    },
                                    sdhh_zhencang: {},
                                    sdhh_huizhen: {},
                                    sdhh_jubao: {},
                                    sdhh_shulv: {},
                                },
                                card: {
                                    sdhh_toulianghuanzhu: {
                                        image: "image/card/fudichouxin.png",
                                    },
                                    sdhh_fudichouxin: {
                                        image: "image/card/fudichouxin.png",
                                    },
                                },
                                character: {
                                    sdhh_shiona: ["female", "key", 1, ["sdhh_huilei"], ["img:image/character/hhzz_shiona.jpg"]],
                                    sdhh_kanade: ["female", "key", 2, ["sdhh_youlian"], ["img:image/character/hhzz_kanade.jpg"]],
                                    sdhh_takaramono1: ["none", "three", 5, ["sdhh_jubao", "sdhh_huizhen"], ["img:image/character/hhzz_takaramono1.jpg"]],
                                    sdhh_takaramono2: ["none", "nine", 3, ["sdhh_jubao", "sdhh_zhencang"], ["img:image/character/hhzz_takaramono2.jpg"]],
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
                                    sdhh_huilei_info: "锁定技，杀死你的角色弃置所有牌。",
                                    sdhh_youlian_info:
                                        "锁定技，杀死你的角色弃置所有牌并随机失去一个技能。",
                                    sdhh_zhencang_info:
                                        "锁定技，杀死你的角色摸一张牌并随机获得一个技能(已满则先随机移除一个)。",
                                    sdhh_huizhen_info:
                                        "锁定技，杀死你的角色摸三张牌并随机获得一个技能(已满则先随机移除一个)。",
                                    sdhh_jubao_info:
                                        "锁定技，当你受到伤害的点数确定时，伤害来源随机获得你区域内的X张牌（X为伤害点数）。",
                                    sdhh_shulv: "熟虑",
                                    sdhh_shulv_info:
                                        "出牌阶段限一次，你可以弃置1/2张牌并摸2/3张牌。",
                                    nei: " ",
                                    nei2: " ",
                                    sdhh_shiona: "汐奈",
                                    sdhh_kanade: "立华奏",
                                    sdhh_takaramono1: "坚实宝箱",
                                    sdhh_takaramono2: "普通宝箱",
                                    sdhh_toulianghuanzhu: "偷梁换柱",
                                    sdhh_fudichouxin: "釜底抽薪",
                                    sdhh_toulianghuanzhu_info:
                                        "可重铸；出牌阶段，对一名角色使用，随机更换其一个技能。",
                                    sdhh_fudichouxin_info:
                                        "出牌阶段，对一名角色使用，随机弃置其一个技能。",
                                },
                            });
                        });
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
            };
            func(pack);
        },
    },
};
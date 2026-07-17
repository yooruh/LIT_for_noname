import { lib, game, ui, get, ai, _status } from '../../../../../../noname.js';
import { Styled } from '../../../tool/basic.js';
const X = Styled('b', 'X'), Y = Styled('p', 'Y'), Z = Styled('y', 'Z');

export const character = {
    'lit_wangrong王荣': {
        sex: "male",
        group: "three",
        hp: 4,
        skills: ["lit_shengjirs", "lit_manmanlai", "lit_diaogui", "lit_kushi", "lit_qixu"],
        isZhugong: true,
    },
};

export const skill = {
    // 王荣
    lit_manmanlai: {
        unique: true,
        zhuSkill: true,
        nobracket: true,
        global: "lit_manmanlai_use",
        subSkill: {
            use: {
                trigger: { player: "phaseZhunbei" },
                popup: false,
                filter(event, player) {
                    if (!lib.lit.isSameGroup(player, 'three')) return false;
                    if (player.hasSkill('lit_diaogui')) return false;
                    if (!player.hasCard(card => {
                        return lib.filter.canBeDiscarded(card, player, player);
                    }, 'j')) return false;
                    return game.hasPlayer((target) => {
                        return target.hasZhuSkill("lit_manmanlai", player) && !target.hasSkill("lit_manmanlai_used");
                    });
                },
                async cost(event, trigger, player) {
                    let list = game.filterPlayer((target) => {
                        return target.hasZhuSkill("lit_manmanlai", player) && !target.hasSkill("lit_manmanlai_used");
                    });
                    const { targets } = await player.chooseTarget(`可选择${get.translation(list)}${list.length > 1 ? "中的一人" : ""}，并弃置判定区的1张牌，此后其恢复1点体力`, (card, player, target) => {
                        return target.hasZhuSkill("lit_manmanlai", player) && !target.hasSkill("lit_manmanlai_used");
                    }).set("ai", target => {
                        return 0.1 + get.recoverEffect(target, player, player);
                    }).forResult();
                    if (!targets) return;

                    const { links } = await player.choosePlayerCard("j", "弃置自己判定区的1张牌",
                        (button) => {
                            return 0.1 - get.effect(player, button.link, player, player);
                        }, player
                    ).set("filterButton", (button) => {
                        let player = get.event().player;
                        return lib.filter.canBeDiscarded(button.link, player, player);
                    }).forResult();
                    event.result = {
                        bool: links?.length,
                        targets: targets,
                        cost_data: links,
                    }
                },
                async content(event, trigger, player) {
                    let target = event.targets[0],
                        cards = event.cost_data;
                    await target.logSkill("lit_manmanlai");
                    await player.discard(cards);
                    await target.recover(player);
                    target.addTempSkill("lit_manmanlai_used", "phaseZhunbeiEnd");
                },
                ai: {
                    result: {
                        player: 1,
                    },
                    effect: {
                        target(card, player, target) {
                            if (get.type(card) != "delay") return;
                            if (!lib.lit.isSameGroup(target, 'three')) return;
                            if (target.hasSkill('lit_diaogui')) return;
                            if (target.hasCard(card => {
                                return lib.filter.canBeDiscarded(card, target, target);
                            }, 'j')) return;

                            // 获取目标最可能选择回血的对象
                            const list = game.filterPlayer(current => {
                                return current.hasZhuSkill("lit_manmanlai", player) && !current.hasSkill("lit_manmanlai_used");
                            });
                            list.sort((a, b) => {
                                return get.recoverEffect(b, target, target) - get.recoverEffect(a, target, target);
                            });
                            const skiller = list[0];
                            if (!skiller || get.recoverEffect(skiller, target, target) + 0.1 <= 0) return;

                            // 获取如果发生回血的收益
                            let divAtt = Math.abs(get.attitude(player, skiller)) ?? 5;
                            let eff = get.recoverEffect(skiller, target, player) / divAtt;
                            return [1, 0, 1, eff];
                        },
                    },
                },
                sub: true,
                sourceSkill: "lit_manmanlai",
            },
            used: {
                charlotte: true,
                sub: true,
                sourceSkill: "lit_manmanlai",
            },
        },
    },
    lit_diaogui: {
        lit_neg: 1,
        derivation: "lit_negClear_faq",
        mark: true,
        marktext: "诡",
        intro: {
            name: "吊诡",
            content: "人生如逆旅，我亦是行人",
        },
        trigger: {
            player: "judge",
        },
        forced: true,
        filter: (event, player) => {
            return ['lebu', 'bingliang'].includes(event.cardname);
        },
        async content(event, trigger, player) {
            game.log(player, "被吊诡的命运所弄，此", `#y${trigger.cardname}`, "必定生效");
            trigger.judge = () => -1;
        },
        ai: {
            neg: true,
            effect: {
                target(card, player, target) {
                    if (['lebu', 'bingliang'].includes(get.name(card, player))) return 1.33;
                },
            },
        },
        group: ["lit_diaogui_move", "lit_negClear"],
        subSkill: {
            move: {
                trigger: { global: "roundStart" },
                filter: (event, player) => {
                    return !player.hasSkill("lit_diaogui_done");
                },
                async cost(event, trigger, player) {
                    event.result = await player.chooseTarget("「吊诡」<br>你可以失去1点体力，然后选择一人，向其转移你“吊诡”的命运", (card, player, target) => {
                        return !target.hasSkill("lit_diaogui");
                    }).set("ai", target => {
                        let num = (() => {
                            if (get.effect(player, { name: "losehp" }, player, player) > 0) return 1;
                            if (player.maxHp < 3 && player.hp === 1 && player.canSave(player)) return 1;
                            return player.hp - 2.5;
                        })();
                        if (num > 0) return 0.1 - get.attitude(player, target);
                        return false;
                    }).forResult();
                },
                async content(event, trigger, player) {
                    const target = event.targets[0];
                    player.addExpose(0.1);
                    await player.loseHp();
                    await player.removeSkills("lit_diaogui");
                    await target.addSkills("lit_diaogui");
                    target.addTempSkill("lit_diaogui_done");
                },
                sub: true,
                sourceSkill: "lit_diaogui",
            },
            done: {
                character: true,
                sub: true,
                sourceSkill: "lit_diaogui",
            }
        },
    },
    lit_kushi: {
        forced: true,
        trigger: {
            global: "judgeAfter",
        },
        filter: (event, player) => {
            return player === event.player || player.inRange(event.player);
        },
        async content(event, trigger, player) {
            await player.draw();
        },
        mod: {
            aiValue(player, card, num) {
                if (card.name === "bagua") return num * 1.25;
            },
        },
    },
    lit_qixu: {
        log: false,
        usable: 1,
        enable: "phaseUse",
        filterTarget(card, player, target) {
            return true;
        },
        async content(event, trigger, player) {
            const target = event.target;
            if (player.hasSkill("lit_qixuV2")) {
                await player.logSkill("lit_qixuV2", target);
            } else {
                await player.logSkill("lit_qixu", target);
            }
            const { control } = await target
                .chooseControl("heart", "diamond", "club", "spade")
                .set("prompt", `请选择${get.translation(player)}「期许」的花色`)
                .set("prompt2", "他正目不转睛地注视你，现在就看你的了")
                .set("ai", event => {
                    let effects = ["shandian", "lebu", "bingliang", "lit_qianfanpai"];
                    let min = 0, minJudge = "";
                    for (let judgeName of effects) {
                        let eff = Math.min(get.effect(target, { name: judgeName }, player, target), -1);
                        if (eff > min) continue;
                        min = eff;
                        minJudge = judgeName;
                    }
                    switch (minJudge) {
                        case "shandian": return "spade";
                        case "lebu": return "heart";
                        case "bingliang": return "club";
                        case "lit_qianfanpai": default:
                            return "diamond";
                    }
                }).forResult();
            let controlTanslation = get.translation(control + "2") + get.translation(control);
            game.log(target, "选择了", `#y${controlTanslation}`);
            target.chat("我选" + controlTanslation);

            const { suit } = await target.judge(card => {
                if (get.suit(card) === control) return 1;
                let judgeName = "";
                switch (get.suit(card)) {
                    case "spade": judgeName = "shandian"; break;
                    case "heart": judgeName = "lebu"; break;
                    case "club": judgeName = "bingliang"; break;
                    case "diamond": judgeName = "lit_qianfanpai"; break;
                    default: return 0;
                }
                return Math.min(get.effect(target, { name: judgeName }, player, target), 0);
            }).set("judge2", result => result.bool).forResult();
            game.delay(2);

            if (!suit) return;
            if (suit === control) {
                if (!player.hasSkill("lit_qixuV2")) await player.removeSkills("lit_qixu");
                if (!player.hasSkill("lit_zhijian")) await player.addSkills("lit_zhijian");
                return;
            }
            let judgeName = "";
            switch (suit) {
                case "spade": judgeName = "shandian"; break;
                case "heart": judgeName = "lebu"; break;
                case "club": judgeName = "bingliang"; break;
                case "diamond": judgeName = "lit_qianfanpai"; break;
                default: return;
            }

            const next = target.executeDelayCardEffect(judgeName);
            await next;

            const { result } = next.childEvents.find(event => event.name === "judge");
            if (result && result.bool === false && ["lebu", "bingliang", "lit_qianfanpai"].includes(judgeName)) {
                target.addSkill("lit_qixu_mark");
                let delayEffects = target.getStorage("lit_qixu_mark", []);
                delayEffects.add(judgeName);
                target.setStorage("lit_qixu_mark", delayEffects, true);
            }
        },
        ai: {
            order: 8,
            result: {
                player: (player, target) => {
                    if (player.hasSkill("lit_kushi") && (target === player || target.inRangeOf(player))) return 1.5;
                    return 0;
                },
                target: (player, target) => {
                    let effects = ["shandian", "lebu", "bingliang", "lit_qianfanpai"];
                    let res = 0;
                    for (let judgeName of effects) {
                        let divAtt = Math.abs(get.attitude(target, target)) ?? 5;
                        let eff = get.effect(target, { name: judgeName }, player, target) / divAtt;
                        res += Math.min(eff, -1);
                    }
                    return 3 / 16 * res;
                },
            },
        },
        subSkill: {
            mark: {
                direct: true,
                mark: true,
                intro: {
                    name: "期许",
                    content: (storage, player) => {
                        let delayEffects = player.getStorage("lit_qixu_mark");
                        if (delayEffects && delayEffects.length) {
                            return `辜负了他人的期许，将执行${get.translation(delayEffects)}的效果`;
                        }
                        return "我的孩子们真的都知道";
                    },
                },
                trigger: {
                    player: ["phaseDrawSkipped", "phaseUseSkipped"],
                },
                filter: (event, player) => {
                    let delayEffects = player.getStorage("lit_qixu_mark");
                    if (!delayEffects || !delayEffects.length) return false;
                    switch (event.name) {
                        case "phaseDraw": return delayEffects.includes("bingliang");
                        case "phaseUse": return delayEffects.includes("lebu");
                    }
                    return false;
                },
                async content(event, trigger, player) {
                    // cancelled事件容易找不到reason，故遣返牌的处理被移至了lit_qianfanpai_skill
                    let delayEffects = player.getStorage("lit_qixu_mark", []);
                    switch (trigger.name) {
                        case "phaseDraw":
                            player.popup("（期许）<br>跳过摸牌");
                            delayEffects = delayEffects.filter(e => e != "bingliang");
                            break;
                        case "phaseUse":
                            player.popup("（期许）<br>跳过出牌");
                            delayEffects = delayEffects.filter(e => e != "lebu");
                            break;
                    }
                    player.setStorage("lit_qixu_mark", delayEffects, true);
                    if (delayEffects.length === 0) player.removeSkill("lit_qixu_mark");
                },
                sub: true,
                sourceSkill: "lit_qixu",
            },
        },
    },
    lit_qixuV2: {
        group: "lit_qixu",
        init: (player) => {
            if (player.hasSkill('lit_qixu')) player.removeSkill('lit_qixu');
        },
    },
    lit_zhijian: {
        preHidden: true,
        init: (player) => {
            // 用于directHit_ai的额外参数
            player.setStorage("lit_zhijian", null);
        },
        logTarget: "target",
        trigger: { player: "useCardToPlayered" },
        filter(event, player) {
            return event.card.name == "sha";
        },
        check(event, player) {
            return get.attitude(player, event.target) <= 0 || event.target.mayHaveShan(player, "use");
        },
        async content(event, trigger, player) {
            const judgeEvent = player.judge(card => {
                player.setStorage("lit_zhijian", { color: null });
                let directHitTag = player.hasSkillTag("directHit_ai", null, {
                    source: player,
                    target: trigger.player,
                    card: trigger.card,
                });
                player.setStorage("lit_zhijian", null);
                let es = trigger.player.getEquips(2).length + trigger.player.getEquips(5).length;
                if (trigger.player.getEquips(5) === "muniu" && trigger.player.countCards('s') === 0) es -= 1;
                let directHit = directHitTag || !trigger.player.mayHaveShan(get.event().player, "use") && !es;

                if (get.color(card) === "red") {
                    if (directHit) return 1;
                    if (trigger.player.hp >= (trigger.player.mayHaveShan(get.event().player, "use", null, "count") + es)) return 2.5;
                    return 1.5;
                }
                if (directHit) return 2;
                return 0.5;
            });
            judgeEvent.set("judge2", result => result.color === "red");
            const { color } = await judgeEvent.forResult();

            if (color === "red") {
                if (trigger.target.hp <= 0 || trigger.target.countCards("he") <= 0) return;
                let max = Math.min(trigger.target.hp, trigger.target.countCards("he"));
                const result = await player.choosePlayerCard(trigger.target, "he", [1, max], `【执剑】选择扣置${get.translation(trigger.target)}最多${max}张牌`)
                    .set("ai", (button) => {
                        if (!get.event().goon) return 0;
                        let val = get.value(button.link);
                        if (button.link === get.event().target.getEquip(2) || button.link === get.event().target.getEquip(5)) {
                            return 2 * (val + 3);
                        }
                        return val;
                    }).set("goon", get.attitude(player, trigger.target) <= 0)
                    .set("forceAuto", true).forResult();
                if (result.bool) {
                    let target = trigger.target;
                    target.addSkill("lit_zhijian_card");
                    await target.addToExpansion("giveAuto", result.cards, target).gaintag.add("lit_zhijian_card");
                }
            } else {
                let id = trigger.target.playerid;
                let map = trigger.getParent().customArgs;
                if (!map[id]) map[id] = {};
                if (typeof map[id].extraDamage != 'number') {
                    map[id].extraDamage = 0;
                }
                map[id].extraDamage++;
            }
        },
        ai: {
            unequip_ai: true,
            directHit_ai: true,
            skillTagFilter(player, tag, arg) {
                if (!arg || arg.name != "sha") return false;
                if (get.attitude(player, arg.target) > 0) return false;
                let card = player.getStorage("lit_zhijian", null) ?? ui.cardPile.firstChild;
                if (!card || get.color(card, player) != "red") return false;
                let es = arg.target.getEquips(2).length + arg.target.getEquips(5).length;
                if (arg.target.getEquips(5) === "muniu" && arg.target.countCards('s') === 0) es -= 1;
                if (tag === "directHit_ai") {
                    return arg.target.hp >= (arg.target.countCards("h") + es);
                }
                return es;
            },
        },
        subSkill: {
            card: {
                popup: false,
                forced: true,
                charlotte: true,
                trigger: { target: "shaAfter" },
                filter(event, player) {
                    return player.getExpansions("lit_zhijian_card").length > 0;
                },
                async content(event, trigger, player) {
                    let cards = player.getExpansions("lit_zhijian_card");
                    await player.gain(cards, "draw");
                    game.log(player, "收回了", cards.length, "张“执剑”牌");
                    player.removeSkill("lit_zhijian_card");
                },
                intro: {
                    name: "剑抵咽喉",
                    markcount: "expansion",
                    mark(dialog, storage, player) {
                        let cards = player.getExpansions("lit_zhijian_card");
                        if (player.isUnderControl(true)) {
                            dialog.addAuto(cards);
                        } else {
                            return `共有${cards.length}张牌`;
                        }
                    },
                },
                sub: true,
                sourceSkill: "lit_zhijian",
            },
        },
    },
};

export const translate = {
'lit_wangrong王荣': "王荣",
    'lit_wangrong_pale': "青衣",
    'lit_manmanlai': "慢慢来",
    'lit_manmanlai_info': "主公技，未持有〖吊诡〗的“叁”势力角色，可于准备阶段弃置判定区的一张牌，然后你恢复1点体力",
    /*负面效果*/'lit_diaogui': "吊诡",
    'lit_diaogui_info': "负面效果，【兵粮寸断】和【乐不思蜀】对你必定生效；一轮开始时（含游戏开始时），你可以失去1点体力，将此标记转移给一名其他角色",
    'lit_kushi': "苦诗",
    'lit_kushi_info': "锁定技，你或你攻击范围内的角色每进行一次判定，你摸一张牌",
    'lit_qixu': "期许",
    'lit_qixu_info': `出牌阶段，你可以令一名角色判定，让其猜测判定的花色：若猜错，你按实际花色，令其进行♠️️【闪电】、♥️️【乐不思蜀】、♣️️【兵粮寸断】、♦️【遣返牌】的判定；若猜中，你失去此技能并获得${get.poptip('lit_zhijian')}`,
    'lit_zhijian': "执剑",
    'lit_zhijian_info': `当你使用【杀】指定目标后，你可以判定：若为♥️♦️，你可以扣置目标角色至多${X}张牌于其武将牌上，其于此【杀】结算后获得之；若为♠️♣️，此【杀】对该目标角色造成的伤害+1（${X}为其体力值）`,
    'lit_manmanlai_info': `主；未持有${get.poptip('lit_diaogui')}的“叁”势力角色可于准备阶段弃置判定区1张牌，然后你+1血`,
    'lit_diaogui_info': "负面；兵乐必中，一轮开始时（含游戏开始时）可-1血转移给其他人",
    'lit_kushi_info': "锁；你或攻击范围内的角色每进行一次判定你摸1张牌",
    'lit_qixu_info': `出牌阶段可令1人判定让其猜测花色：猜错则按实际花色令其进行♠️闪电、♥️乐、♣️兵、♦️遣返牌的判定；猜中则你失去此技能并获得${get.poptip('lit_zhijian')}`,
    'lit_zhijian_info': `使用杀指定目标后可判定：♥️♦️可扣置目标至多${X}张牌于武将牌上，其于杀结算后获得之；♠️♣️对此目标的此杀伤害+1（${X}为其体力值）`,
};

export const simpleTranslate = {
    'lit_manmanlai_info': `主；未持有${get.poptip('lit_diaogui')}的“叁”势力角色可于准备阶段弃置判定区1张牌，然后你+1血`,
    'lit_diaogui_info': "负面；兵乐必中，一轮开始时（含游戏开始时）可-1血转移给其他人",
    'lit_kushi_info': "锁；你或攻击范围内的角色每进行一次判定你摸1张牌",
    'lit_qixu_info': `出牌阶段可令1人判定让其猜测花色：猜错则按实际花色令其进行♠️闪电、♥️乐、♣️兵、♦️遣返牌的判定；猜中则你失去此技能并获得${get.poptip('lit_zhijian')}`,
    'lit_zhijian_info': `使用杀指定目标后可判定：♥️♦️可扣置目标至多${X}张牌于武将牌上，其于杀结算后获得之；♠️♣️对此目标的此杀伤害+1（${X}为其体力值）`,
};

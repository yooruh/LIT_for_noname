import { lib, game, ui, get, ai, _status, X, Y, Z } from '../shared.js';

export const character = {
    'lit_huxinyu胡馨予': {
        sex: "female",
        group: "three",
        hp: 3,
        skills: ["lit_shengjihxy", "lit_mimang", "lit_xukong", "lit_shihuai"],
    },
};

export const skill = {
    // 胡馨予
    lit_mimang: {
        mod: {
            cardname(card, player) {
                const name = card.name;
                if (name === "shan" || lib.card[name]?.type === "equip") {
                    const evt = get.event();
                    if (evt?.name === "chooseToRespond" && evt?.getParent()?.name === "juedou") {
                        return "sha";
                    }
                }
            },
        },
    },
    lit_mimangV2: {
        init(player) {
            if (player.hasSkill("lit_mimang")) player.removeSkill("lit_mimang");
        },
        mod: {
            cardname(card, player) {
                const name = card.name;
                if (name === "shan" || lib.card[name]?.type === "equip") {
                    const evt = get.event();
                    if (evt?.name === "chooseToRespond" && evt?.getParent()?.name === "juedou") {
                        return "sha";
                    }
                }
            },
            cardnumber(card) {
                const name = card.name;
                if (name === "shan" || lib.card[name]?.type === "equip") {
                    return 13;
                }
            },
        },
    },
    lit_xukong: {
        usable: 1,
        enable: "phaseUse",
        filter(event, player) {
            return player.countCards("h") > 0;
        },
        filterTarget(card, player, target) {
            let doneTargets = player.getStorage("lit_xukong_mark", [])
            return target !== player && !doneTargets.includes(target) && player.canCompare(target);
        },
        prompt: "索敌一人，与其拼点：若你赢，视为你对其使用了【决斗】，否则，视为其对你使用了【决斗】",
        async content(event, trigger, player) {
            let target = event.targets[0];
            let result = await player.chooseToCompare(target).forResult();
            if (!player.hasSkill("lit_xukong_mark")) {
                player.addTempSkill("lit_xukong_mark");
            }
            let doneTargets = player.getStorage("lit_xukong_mark", []);
            player.setStorage("lit_xukong_mark", doneTargets.concat(target), true);
            if (result.bool) {
                // 你赢，视为对其使用决斗
                if (player.canUse({ name: "juedou" }, target, false)) {
                    await player.useCard({ name: "juedou", isCard: true }, target, false);
                }
            } else {
                // 没赢，视为其对你使用决斗
                if (target.canUse({ name: "juedou" }, player, false)) {
                    await target.useCard({ name: "juedou", isCard: true }, player, false);
                }
            }
        },
        ai: {
            order: 7,
            result: {
                target: -2,
            },
        },
        group: "lit_xukong_reset",
        subSkill: {
            mark: {
                charlotte: true,
                mark: true,
                marktext: "虚",
                intro: {
                    name: "虚空",
                    content: (storage, player) => {
                        return `本回合已对以下角色进行过了索敌：<br>${get.translation(storage)}`;
                    },
                },
                onremove: (player) => {
                    player.setStorage("lit_xukong_mark", [], true);
                },
                sub: true,
                sourceSkill: "lit_xukong",
            },
            reset: {
                direct: true,
                trigger: { source: "damageBegin1" },
                filter(event, player) {
                    let evt = event.getParent("useCard");
                    return evt && evt.card && evt.card.name === "juedou";
                },
                async content(event, trigger, player) {
                    player.getStat("skill").lit_xukong = 0;
                },
                sub: true,
                sourceSkill: "lit_xukong",
            },
            equipK: {
                trigger: { player: "compare", target: "compare" },
                filter(event, player) {
                    if (event.player == player) {
                        return get.type(event.card1) === "equip";
                    } else {
                        return get.type(event.card2) === "equip";
                    }
                },
                forced: true,
                popup: false,
                async content(event, trigger, player) {
                    game.log(player, "拼点牌点数视为", "#yK");
                    if (player == trigger.player) {
                        trigger.num1 = 13;
                    } else {
                        trigger.num2 = 13;
                    }
                },
            },
        },
    },
    lit_shihuai: {
        line: "black",
        trigger: {
            player: "loseAfter",
            global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
        },
        filter: (event, player) => {
            if (player.countCards("h")) return false;
            const evt = event.getl(player);
            return evt && evt.player === player && evt.hs && evt.hs.length > 0;
        },
        async cost(event, trigger, player) {
            const { bool, targets } = await player.chooseTarget('【释怀】索要他人的1牌', "如果其拒绝给牌，其失去1点体力，然后本回合此技能失效", (card, player, target) => {
                return target.countGainableCards(player, "he") > 0;
            }).set("ai", target => {
                if (target.hasSkill('lit_shihuai', null, false, true)) return 0;
                let att = get.attitude(player, target);
                if (target.hasSkillTag('reverseEquip')) return att;
                let es = target.getCards("e").sort(function (a, b) {
                    return get.value(b, target) - get.value(a, target);
                });
                if (es.length) return -Math.min(2, get.value(es[0])) * att;
                return -att;
            }).forResult();

            if (!bool) return;
            event.result = {
                bool: true,
                targets: targets,
            };
        },
        async content(event, trigger, player) {
            const target = event.targets[0];

            const { cards } = await target.chooseCard('hes', `成为了${get.translation(player)}的【释怀】对象`, `给予${get.translation(player)}1张牌，或选择取消：其摸2张牌，然后本回合无法再度【释怀】`)
                .set("ai", card => {
                    if (get.damageEffect(target, player, target) > 0) return -1;
                    if (!player.hasUseTarget(card)) return 10 - get.value(card);
                    if (!player.isPhaseUsing()) return 7 - get.value(card);
                    return -1;
                }).forResult();
            if (cards) {
                await target.give(cards, player, true);
            } else {
                await player.draw(2);
                await player.tempBanSkill("lit_shihuai");
            }
        },
        ai: {
            noh: true,
            noautowuxie: true,
        },
    },
};

export const translate = {
    'lit_huxinyu胡馨予': "胡馨予",
    'lit_huxinyu_thenis': "无定",
    'lit_mimang': "迷茫",
    'lit_mimang_info': "锁定技，你的【闪】和装备牌在【决斗】中视为【杀】",
    'lit_mimangV2': "迷茫V2",
    'lit_mimangV2_info': "锁定技，你的【闪】和装备牌点数视为K，在【决斗】中视为点数为K的【杀】",
    'lit_xukong': "虚空",
    'lit_xukong_info': `①出牌阶段限1次，与1人拼点：赢→视为对其使用【决斗】；没赢→视为其对你使用【决斗】。<br>②你的任意决斗造成伤害后，重置技能①次数，但拼点目标不能为本回合的同一人`,
    'lit_shihuai': "释怀",
    'lit_shihuai_info': "当你没有手牌时，你可令有牌的1人给你1张牌，若其拒绝，你摸2张牌，本回合此技能失效",
    'lit_shengjihxy': "升级·胡馨予",
    'lit_shengjihxy_info': `${get.poptip('lit_mimangV2')} 获得并于〖迷茫〗前增加：【闪】和装备牌点数视为K`,
};

export const simpleTranslate = {
    'lit_mimang_info': "锁；闪和装备牌在决斗中视为杀",
    'lit_mimangV2_info': "锁；闪和装备牌点数视为K，在决斗中视为K杀",
    'lit_xukong_info': `①出牌限1次，与1人拼点：赢/没赢→视为{你对其}/{其对你}决斗。<br>②你的任意决斗造成伤害后，重置技能①次数，但拼点目标不能为本回合的同一人`,
    'lit_shihuai_info': "当你没有手牌时，你可令有牌的1人给你1张牌，若其拒绝，你摸2张牌，本回合此技能失效",
    'lit_shengjihxy_info': `${get.poptip('lit_mimangV2')} 获得并于“迷茫”前增加：闪和装备牌点数视为K`,
};

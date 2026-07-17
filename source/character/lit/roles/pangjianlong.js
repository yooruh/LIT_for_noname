import { lib, game, ui, get, ai, _status } from '../../../../../../noname.js';
import { Styled } from '../../../tool/basic.js';
const X = Styled('b', 'X'), Y = Styled('p', 'Y'), Z = Styled('y', 'Z');

export const character = {
    'lit_pangjianlong庞建龙': {
        sex: "male",
        group: "three",
        hp: 4,
        skills: ["lit_shengjipjl", "lit_qiangjian", "lit_duilian"],
    },
};

export const skill = {
    // 庞建龙
    lit_qiangjian: {
        group: ['lit_qiangjian_juedou', 'lit_qiangjian_use'],
        trigger: {
            player: "useCardToPlayered",
        },
        direct: true,
        filter: (event, player) => {
            return ["sha", "nanman", "wanjian"].includes(event.card.name) && !event.getParent().directHit.includes(event.target);
        },
        logTarget: "target",
        async content(event, trigger, player) {
            const id = trigger.target.playerid;
            const map = trigger.getParent().customArgs;
            if (!map[id]) map[id] = {};
            if (trigger.card.name !== "nanman") {
                if (typeof map[id].shanRequired === "number") {
                    map[id].shanRequired++;
                } else {
                    map[id].shanRequired = 2;
                }
            } else {
                if (typeof map[id].shaRequired === "number") {
                    map[id].shaRequired++;
                } else {
                    map[id].shaRequired = 2;
                }
            }
        },
        ai: {
            shaRelated: true,
            threaten: 1.5,
            "directHit_ai": true,
            skillTagFilter(player, tag, arg) {
                if (!arg) return false;
                if (arg.card.name === "sha" || arg.card.name === "wanjian") {
                    if (arg.target.countCards("h", "shan") > 1) return false;
                } else if (arg.card.name === "nanman") return !arg.target.countCards("h", "sha") > 1;
                return false;
            },
        },
        subSkill: {
            juedou: {
                trigger: {
                    player: "useCardToPlayered",
                    target: "useCardToTargeted",
                },
                forced: true,
                logTarget(trigger, player) {
                    return player === trigger.player ? trigger.target : trigger.player;
                },
                filter: (event, player) => {
                    return event.card.name === "juedou";
                },
                async content(event, trigger, player) {
                    const id = (player === trigger.player ? trigger.target : trigger.player)["playerid"];
                    const idt = trigger.target.playerid;
                    const map = trigger.getParent().customArgs;
                    if (!map[idt]) map[idt] = {};
                    if (!map[idt].shaReq) map[idt].shaReq = {};
                    if (!map[idt].shaReq[id]) map[idt].shaReq[id] = 1;
                    map[idt].shaReq[id]++;
                },
                ai: {
                    "directHit_ai": true,
                    skillTagFilter(player, tag, arg) {
                        if (!arg) return false;
                        if (arg.card.name !== "juedou" || Math.floor(arg.target.countCards("h", "sha") / 2) > player.countCards("h", "sha")) return false;
                    },
                },
                sub: true,
                sourceSkill: "lit_qiangjian",
            },
            use: {
                forced: true,
                trigger: {
                    player: "useCardBegin",
                },
                filter: (event, player) => {
                    return ["sha", "nanman", "wanjian"].includes(event.card.name);
                },
                content() { },
                logTarget: "target",
                sub: true,
                sourceSkill: "lit_qiangjian",
            },
        },
    },
    lit_duilian: {
        enable: "phaseUse",
        usable: 1,
        filter: (event, player) => {
            return player.countCards('hes') > 0;
        },
        check(card) {
            return 10 - get.value(card);
        },
        filterCard(card, player, event) {
            return lib.filter.canBeDiscarded(card, player, player);
        },
        position: "he",
        complexSelect: true,
        complexTarget: true,
        multitarget: true,
        multiline: true,
        selectTarget: [2, Infinity],
        filterTarget(card, player, target) {
            let i = ui.selected.targets.length;
            if (i % 2 === 1) {
                return target.canUse({ name: "juedou", isCard: true }, ui.selected.targets[i - 1]);
            }
            return game.hasPlayer(current => {
                return !ui.selected.targets.includes(current) && current.canUse({ name: "juedou", isCard: true }, target);
            }, false);
        },
        targetprompt: () => {
            if (ui.selected.targets.length % 2) return `(${Math.floor((ui.selected.targets.length + 1) / 2)})先出杀`;
            return `(${Math.floor((ui.selected.targets.length + 1) / 2)})后出杀`;
        },
        async content(event, trigger, player) {
            if (event.targets.length % 2 === 1) event.targets.pop();
            for (let i = 0; i < event.targets.length / 2; i++) {
                event.targets[2 * i + 1].line(event.targets[2 * i], "fire");
                game.delay(0.5);
                await event.targets[2 * i + 1].useCard({ name: "juedou", isCard: true }, "nowuxie", event.targets[2 * i], "noai").set("animate", false);
            }
        },
        ai: {
            order: 8,
            result: {
                target: (player, target) => {
                    let i = ui.selected.targets.length;
                    if (i % 2 === 0) {
                        return -3;
                    } else {
                        return get.effect(ui.selected.targets[i - 1], { name: "juedou" }, target, target);
                    }
                },
                player: -1,
            },
            expose: 0.4,
            threaten: 3,
        },
    },
    lit_duilianV2: {
        init: (player) => {
            if (player.hasSkill('lit_duilian')) player.removeSkill('lit_duilian');
        },
        inherit: "lit_duilian",
        filterCard: false,
        position: undefined,
        ai: {
            order: 8,
            result: {
                target: (player, target) => {
                    let i = ui.selected.targets.length;
                    if (i % 2 === 0) {
                        return -3;
                    } else {
                        return get.effect(ui.selected.targets[i - 1], { name: "juedou" }, target, target);
                    }
                },
            },
            expose: 0.4,
            threaten: 3.2,
        },
    },
};

export const translate = {
'lit_pangjianlong庞建龙': "庞建龙",
    'lit_qiangjian': "强健",
    'lit_qiangjian_info': "锁定技，当其他角色使用【杀】、【决斗】、【万箭齐发】或【南蛮入侵】时，其需要额外打出一张【杀】或【闪】来响应",
    'lit_duilian': "对练",
    'lit_duilian_info': "出牌阶段限一次，你可以弃置一张牌，选择任意名角色，令这些角色依次选择是否对你选择的另一名角色使用【决斗】，此【决斗】不可被【无懈可击】响应",
    'lit_qiangjian_info': "锁；杀、决斗、万箭、南蛮，他人响应需杀/闪+1",
    'lit_duilian_info': "出牌限1次，弃1牌选择任意对人使其相互决斗，不可无懈",
};

export const simpleTranslate = {
    'lit_qiangjian_info': "锁；杀、决斗、万箭、南蛮，他人响应需杀/闪+1",
    'lit_duilian_info': "出牌限1次，弃1牌选择任意对人使其相互决斗，不可无懈",
};

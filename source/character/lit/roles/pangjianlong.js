import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';

export const sort = 'ybs';
export const title = `控场·强杀·${styleText('g', "易")}`;
export const intro = `什么超级吕布，摸牌白罢了。不过${B("庞建龙")}比较适合新手，乱打也容易出伤害，尤其针对不清楚技能出两张牌机制的人`
    + "<li>主公、内奸：适当决斗控场，对有杀但是杀不多的人，记得让自己来决斗"
    + "<li>忠臣：放AOE前先看看主公状态，可千万不能坑主公"
    + "<li>反贼：负责捣乱就好了";

export const character = {
    'lit_pangjianlong庞建龙': {
        sex: "male",
        group: "three",
        hp: 4,
        skills: ["lit_shengjipjl", "lit_qiangjian", "lit_duilian"],
    },
};

export const skill = {
    lit_qiangjian: {
        direct: true,
        preHidden: true,
        trigger: {
            player: "useCardToPlayered",
        },
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
        group: ['lit_qiangjian_juedou', 'lit_qiangjian_use'],
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
        utils: {
            pairScore(first, second) {
                if (!first || !second || !second.canUse({ name: "juedou", isCard: true }, first)) return -Infinity;
                return get.effect(first, { name: "juedou", isCard: true }, second, second);
            },
            futurePressure(first, second) {
                const direct = lib.skill.lit_duilian.utils.pairScore(first, second);
                if (!Number.isFinite(direct)) return -Infinity;
                let hostileRipple = 0;
                game.countPlayer(current => {
                    if (current !== first && current !== second && get.attitude(current, first) < 0) hostileRipple += 0.05;
                    if (current !== first && current !== second && get.attitude(current, second) > 0) hostileRipple -= 0.03;
                });
                return direct + hostileRipple;
            },
        },
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
                        const candidates = game.filterPlayer(current => {
                            return current !== target && !ui.selected.targets.includes(current) && current.canUse({ name: "juedou", isCard: true }, target);
                        }, false);
                        if (!candidates.length) return -3;
                        return Math.max(...candidates.map(current => lib.skill.lit_duilian.utils.futurePressure(target, current)));
                    } else {
                        return lib.skill.lit_duilian.utils.futurePressure(ui.selected.targets[i - 1], target);
                    }
                },
                player: (player) => {
                    return player.countCards('hes') > 2 ? -0.5 : -1;
                },
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
                        const candidates = game.filterPlayer(current => {
                            return current !== target && !ui.selected.targets.includes(current) && current.canUse({ name: "juedou", isCard: true }, target);
                        }, false);
                        if (!candidates.length) return -3;
                        return Math.max(...candidates.map(current => lib.skill.lit_duilian.utils.futurePressure(target, current)));
                    } else {
                        return lib.skill.lit_duilian.utils.futurePressure(ui.selected.targets[i - 1], target);
                    }
                },
                player: 0,
            },
            expose: 0.4,
            threaten: 3.2,
        },
    },
};

export const translate = {
    'lit_pangjianlong庞建龙': "庞建龙",
    'lit_qiangjian': "强健",
    'lit_qiangjian_info': "锁定技，对其他角色使用【杀】、【决斗】、【万箭齐发】或【南蛮入侵】时，其需要额外打出一张【杀】或【闪】来响应",
    'lit_duilian': "对练",
    'lit_duilian_info': "出牌阶段限一次，你可以弃置一张牌，选择任意对角色，令每对中的第二位角色对你选择的另一名角色使用【决斗】，此【决斗】不可被【无懈可击】响应",
    'lit_duilianV2': "对练V2",
    'lit_duilianV2_info': "出牌阶段限一次，你可以选择任意对角色，令每对中的第二位角色对你选择的另一名角色使用【决斗】，此【决斗】不可被【无懈可击】响应",
    'lit_shengjipjl': "升级·庞建龙",
    'lit_shengjipjl_info': `${get.poptip('lit_duilianV2')} 获得并修改〖对练〗：出牌阶段限一次，你可以选择任意对角色，令每对中的第二位角色对你选择的另一名角色使用【决斗】，此【决斗】不可被【无懈可击】响应`,
};

export const simpleTranslate = {
    'lit_qiangjian_info': "锁；杀、决斗、万箭、南蛮，他人响应需杀/闪+1",
    'lit_duilian_info': "出牌限1次，弃1牌选择任意对人使其相互决斗，不可无懈",
    'lit_duilianV2_info': "V2 出牌限1次，选择任意对人使其相互决斗，不可无懈",
    'lit_shengjipjl_info': `${get.poptip('lit_duilianV2')} 获得并修改“对练”：不需要弃牌了`,
};

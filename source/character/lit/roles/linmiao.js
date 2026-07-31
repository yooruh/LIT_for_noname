import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';

export const sort = 'jbs';

export const character = {
    'lit_linmiao林淼': {
        sex: "female",
        group: "nine",
        hp: 3,
        skills: ["lit_shenge", "lit_gugu"],
        groupInGuozhan: "three",
    },
};

export const skill = {
        lit_shenge: {
        derivation: "lit_shenge_faq",
        locked: false,
        trigger: {
            player: "useCardToTargeted",
        },
        mod: {
            targetInRange: (card, player, target) => {
                if (card.name === 'sha' && typeof get.number(card) === 'number') {
                    if (get.distance(player, target) <= get.number(card)) return true;
                }
            },
        },
        logTarget: "target",
        check(event, player) {
            return get.attitude(player, event.target) <= 0;
        },
        filter: (event, player) => {
            if (event.card.name != 'sha') return false;
            if (event.target.countCards('hej') >= player.countCards('h')) return true;
            return event.target.hp >= player.hp;

        },
        async content(event, trigger, player) {
            if (trigger.target.countCards('hej') >= player.countCards('h')) {
                player.addTempSkill('unequip', { player: 'useCardAfter' });
                trigger.getParent().directHit.push(trigger.target);
            }
            if (trigger.target.hp >= player.hp) {
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
            threaten: 0.5,
            shaRelated: true,
            unequip_ai: true,
            directHit_ai: true,
            damageBonus: true,
            skillTagFilter: (player, tag, arg) => {
                if (tag === "directHit_ai" || tag === "unequip_ai") {
                    if (!arg || !arg.target || !arg.card) return false;
                    return get.attitude(player, arg.target) <= 0 && arg.card.name === 'sha' && player.countCards('h', card => {
                        return card != arg.card && (!arg.card.cards || !arg.card.cards.includes(card));
                    }) <= arg.target.countCards('hej');

                }
                if (tag === "damageBonus") {
                    if (!arg || !arg.target || !arg.card) return false;
                    return get.attitude(player, arg.target) <= 0 && arg.card.name === 'sha' && player.hp <= arg.target.hp;
                }
            },
        },
    },
    lit_gugu: {
        frequent: true,
        marktext: "咕",
        intro: {
            name: "咕咕",
            content: "已经咕了#次",
        },
        trigger: {
            player: "dyingBefore",
        },
        filter: (event, player) => {
            return event.reason?.name === "damage";
        },
        async content(event, trigger, player) {
            let num = 1 - player.hp;
            await player.recover(num);
            player.addMark('lit_gugu', num);
            for (let i = 0; i < num; i++) {
                let card = get.cards()[0];
                if (player.hasUseTarget(card)) {
                    const { bool } = await player.chooseUseTarget(card, get.prompt("lit_gugu"), `可使用一张 ${get.translation(card)}`, false).forResult();
                    if (!bool) await game.cardsDiscard(card);
                } else await game.cardsDiscard(card);
            }
        },
        ai: {
            threaten: (player, target) => {
                let gugu = target.countMark('lit_gugu');
                if (gugu === 0) {
                    if (target.hp === 1) return 1.5;
                    return 0.8;
                }
                if (gugu === 1) return 2.2;
                if (gugu === 2) return 1.0;
                if (gugu === 3) return 0.4;
                return Math.pow(0.25, gugu - 2);
            },
            effect: {
                target: (card, player, target) => {
                    if (!get.tag(card, 'damage')) return;
                    if (target.hp > 1) return;
                    let gugu = target.countMark('lit_gugu');

                    if (gugu === 0) return [1, 2];
                    if (gugu === 1) return [1, -2];
                    return [1, Math.max(0, gugu*0.1)];
                }
            }
        },
        group: "lit_gugu_loseHp",
        subSkill: {
            loseHp: {
                direct: true,
                locked: true,
                trigger: {
                    global: "phaseJieshuBegin",
                },
                filter: (event, player) => {
                    return player.hasMark('lit_gugu');
                },
                async content(event, trigger, player) {
                    let num = player.countMark('lit_gugu');
                    if (num <= 0) return;
                    player.clearMark('lit_gugu');
                    await player.recover();
                    await player.loseHp(num);
                },
                sub: true,
                sourceSkill: "lit_gugu",
            },
        },
    },
};

export const translate = {
    'lit_linmiao林淼': "林淼",
    'lit_shenge': "神鸽",
    'lit_shenge_info': `你使用【杀】可以选择你距离${styleText('g', '≤')}此【杀】点数的角色为目标；当【杀】指定目标后，你可以根据下列条件执行效果：<br>` +
        `①若你体力值${styleText('g', '≤')}目标的体力值，此【杀】对该目标造成的${styleText('r', '伤害+1')}；<br>` +
        `②若你手牌数${styleText('g', '≤')}目标${get.poptip("lit_hejCard")}数，此【杀】${styleText('r', '不可被响应且无视防具')}`,
    'lit_shenge_faq': "关于神鸽的两种效果",
    'lit_shenge_faq_info': "选择发动神鸽后，只要满足条件，就会执行对应效果。因此同时满足①②时，不能只选择发动其中的一项",
    'lit_gugu': "咕咕",
    'lit_gugu_info': `当你${styleText('r', '因受到伤害')}进入濒死状态时，你可以将体力值恢复至1点，获得${X}枚"咕"，然后依次使用牌堆顶的${X}张牌（${X}为你以此法恢复的体力值）。<li>锁定技，每人的回合结束时，若你有“咕”，移去所有"咕"，恢复1点体力，然后失去等量体力。</li>`,// 一班杀与叁岛篇部分
};

export const simpleTranslate = {
    'lit_shenge_info': `用杀可选距离${styleText('g', '≤')}点数者为目标。杀指定目标后可发动：` +
        `<br>①血${styleText('g', '≤')}目标，对此目标${styleText('r', '伤害+1')}；` +
        `<br>②手牌数${styleText('g', '≤')}目标${get.poptip("lit_hejCard")}数，${styleText('r', '不可被响应且无视防具')}`,
    'lit_gugu_info': `${styleText('r', '受伤')}濒死前可回至1血并获${X}"咕"，依次用牌堆顶前${X}张牌（${X}为恢复的血量）<li>锁；每人回合结束时，若有咕，移去所有咕，+1血，并失去等量体力</li>`,
};

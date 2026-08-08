import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';

export const sort = 'jbs';

export const character = {
    'lit_liyang9李洋': {
        sex: "male",
        group: "nine",
        hp: 4,
        skills: ["lit_xiuer", "lit_huangse"],
        groupInGuozhan: "three",
    },
};

export const skill = {
    lit_xiuer: {
        derivation: 'lit_xiuer_faq',
        trigger: {
            player: ["useCard", "respond"],
        },
        frequent: true,
        filter: (event) => {
            if (get.type(event.card) === 'trick' || get.type(event.card) === 'delay') {
                return event.card.isCard;
            }
        },
        async content(event, trigger, player) {
            await player.draw(player.hp === 1 ? 2 : 1);
        },
        mod: {
            targetInRange: (card, player, target, now) => {
                let type = get.type(card);
                if (type === 'trick' || type === 'delay') return true;
            },
        },
        ai: {
            threaten: 1.6,
            noautowuxie: true,
            effect: {
                player: (card, player) => {
                    if (get.type(card) === 'trick' || get.type(card) === 'delay') return [1, 1];
                },
            },
        },
    },
    lit_huangse: {
        forced: true,
        group: ["lit_huangse_damage", "lit_huangse_draw"],
        subSkill: {
            damage: {
                trigger: {
                    source: "damageBegin1",
                },
                filter: (event, player) => {
                    if (!player.differentSexFrom(event.player)) return false;
                    if (event.notLink()) return true;
                    // 只有传导源未触发此技能时，才对满足条件的横置角色触发
                    const damageTrigger = event.getParent(4);
                    const histories = player.getHistory('useSkill', e => e.skill === 'lit_huangse_damage');
                    return !histories.find(history => history.event.getParent(2) === damageTrigger);
                },
                forced: true,
                async content(event, trigger, player) {
                    trigger.num++;
                },
                ai: {
                    threaten: 1.5,
                    damageBonus: true,
                    skillTagFilter: (player, tag, arg) => {
                        if (tag === "damageBonus") {
                            return !!(arg && arg.target && player.differentSexFrom(arg.target));

                        }
                    },
                    result: {
                        target: (player, target) => {
                            if (player.differentSexFrom(target)) return -2;
                        },
                    },
                },
                sub: true,
            },
            draw: {
                trigger: {
                    source: "damageEnd",
                },
                filter: (event, player) => {
                    return player.sameSexAs(event.player);
                },
                forced: true,
                async content(event, trigger, player) {
                    await player.draw();
                },
                ai: {
                    threaten: 1.1,
                    result: {
                        player: 1,
                    },
                },
                sub: true,
            },
        },
    },
};

export const translate = {
    'lit_liyang9李洋': "9李洋",
    'lit_liyang9李洋_prefix': "9",
    'lit_xiuer': "秀儿",
    'lit_xiuer_info': `你每使用一张非转化的普通锦囊牌，可以摸一张牌，若你体力值为1，则摸牌数+1；锁定技，${styleText('g', '你使用锦囊牌无距离限制')}`,
    'lit_xiuer_faq': "关于非转化",
    'lit_xiuer_faq_info': "一般来说，只有通过转换技能来使用的牌才是转化牌，如：把A当做B使用。通过其他方法使用的牌，如：通过弃置、扣血、判定等条件来视为使用，或直接视为使用（如你的A视为B）等，即使是虚拟的，无实体的牌，也不视为转化牌。但是本扩展之外的不敢保证",
    'lit_huangse': "黄色",
    'lit_huangse_info': `锁定技，你对异性角色造成的伤害+1；当你对同性角色造成伤害后，你摸一张牌`,
};

export const simpleTranslate = {
    'lit_xiuer_info': `每用1非转锦囊可摸1牌，体为1则+1；锁；${styleText('g', '使用锦囊无距离限制')}`,
    'lit_huangse_info': `锁；对${styleText('r', '异性')}伤害+1，伤害${styleText('g', '同性')}后摸1牌`,
};

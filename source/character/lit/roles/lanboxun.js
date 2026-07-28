import { lib, game, ui, get, ai, _status, X, Y, Z } from '../shared.js';

export const character = {
    'lit_lanboxun兰柏勋': {
        sex: "male",
        group: "three",
        hp: 4,
        skills: ["lit_shengjilbx", "lit_yuqiu", "lit_shouwang"],
    },
};

export const skill = {
    // 兰柏勋
    lit_yuqiu: {
        frequent: true,
        popup: false,
        trigger: {
            player: 'useCardAfter',
        },
        filter: (event, player) => {
            if (!get.tag(event.card, "damage") || !event.targets) return false;
            for (let i in event.targets) {
                if (!event.targets[i].hasHistory("damage", evt => evt.cards && evt.cards === event.cards)
                    && event.targets[i].isAlive()) return true;
            }
        },
        async content(event, trigger, player) {
            const targets = trigger.targets.filter(target =>
                !target.hasHistory("damage", evt => evt.cards === trigger.cards) &&
                target.isAlive());
            event.count = targets.length;
            for (const target of targets) {
                const cardNumber = get.number(trigger.card);
                const isPrimeCard = Number.isInteger(cardNumber) && [2, 3, 5, 7, 11, 13].includes(cardNumber);
                player.line(target);
                if (isPrimeCard) {
                    if (!target.countGainableCards(player, "hej")) return;
                    await player.gainPlayerCard(`${get.prompt('lit_yuqiu', target)}（获得其1张牌）`, target, get.buttonValue, 'hej')
                        .set("logSkill", ['lit_yuqiu', target]);
                } else {
                    if (!target.countDiscardableCards(player, "hej")) return;
                    await player.discardPlayerCard(`${get.prompt('lit_yuqiu', target)}（弃置其至多2张牌）`, target, 'hej', [1, 2])
                        .set("logSkill", ['lit_yuqiu', target]);
                }
            }
        },
        ai: {
            expose: 0.1,
            threaten: 1.8,
            effect: {
                player(card, player, target) {
                    if (get.tag(card, "damage") && get.attitude(player, target) < 0 && target.countCards('he') > 0) return [1, -1.5];
                },
            },
        }
    },
    lit_shouwang: {
        trigger: {
            source: "damageBegin1",
        },
        forced: true,
        filter: (event, player) => {
            if (!player.isMaxHandcard() && !player.isMaxHp()) return false;
            if (event.notLink()) return true;
            // 只有传导源未触发此技能时，才对满足条件的横置角色触发
            const damageTrigger = event.getParent(4);
            const histories = player.getHistory('useSkill', e => e.skill === 'lit_shouwang');
            return !histories.find(history => history.event.getParent(2) === damageTrigger);
        },
        async content(event, trigger, player) {
            trigger.num++;
        },
        mod: {
            aiOrder(player, card, num) {
                if (get.name(card, player) === 'sha') return num + 3;
                if (["nanman", "wanjian"].includes(get.name(card, player))) {
                    return 10;
                }
            },
        },
        ai: {
            threaten: (player, target) => {
                if (target.isMaxHandcard() || target.isMaxHp()) return 2.3;
                return 1.3;
            },
            damageBonus: true,
            unequip_ai: true,
            skillTagFilter(player, tag, arg) {
                if (tag === "unequip_ai") {
                    if (!arg || !arg.target) return false;
                    let es = arg.target.getEquips(1);
                    for (let i of es) {
                        switch (i) {
                            case "bagua":
                                return ["sha", "wanjian"].includes(arg.card.name);
                            case "renwang":
                                return arg.card.name === "sha" && get.color(arg.card) === "black";
                            case "tengjia":
                                return ["nanman", "wanjian"].includes(arg.card.name) || arg.card.name === "sha" && !game.hasNature(arg.card);
                        }
                    }
                }
                return true;
            },
        },
    },
};

export const translate = {
    'lit_lanboxun兰柏勋': "兰柏勋",
    'lit_yuqiu': "欲求",
    'lit_yuqiu_info': `当${get.poptip("lit_damageCard")}对目标未造成伤害时：若此牌点数为质数，可以拿目标一张牌；若不为质数，可以弃置目标至多两张牌`,
    'lit_shouwang': "守望",
    'lit_shouwang_info': "锁定技，当你的手牌数或体力值为全场最多（之一）时，造成的伤害+1",
    'lit_shengjilbx': "升级·兰柏勋",
    'lit_shengjilbx_info': "增加1点体力上限，恢复体力至上限",
};

export const simpleTranslate = {
    'lit_yuqiu_info': `${get.poptip("lit_damageCard")}对目标未造成伤害：<li>质数牌可拿目标1牌</li><li>非质数牌可弃目标至多2牌</li>`,
    'lit_shouwang_info': "锁；手牌数/体力为全场最多（之一）时伤害+1",
    'lit_shengjilbx_info': "+1体力上限，回满血",
};

export const pinyins = {
    '兰柏勋': ['lán', 'bó', 'xūn'],
    '升级·兰柏勋': ['shēng', 'jí', '·', 'lán', 'bó', 'xūn'],
};

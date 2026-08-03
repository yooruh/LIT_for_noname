import { lib, game, ui, get, ai, _status } from '../shared.js';

export const sort = 'jbs';
export const character = {
    'lit_zengpinjia9曾品嘉': {
        sex: "male",
        group: "nine",
        hp: 3,
        skills: ["lit_yingjun", "lit_kuizeng", "lit_chuangshi"],
        groupInGuozhan: "nine",
    },
};

export const characterReplace = { 'lit_zengpinjia': ['lit_zengpinjia曾品嘉', 'lit_zengpinjia9曾品嘉'] };

export const skill = {
    lit_yingjun: {
        trigger: {
            player: ["phaseJieshuBegin", "phaseZhunbeiBegin"],
        },
        frequent: true,
        async content(event, trigger, player) {
            await player.draw();
        },
        ai: {
            threaten: 1.2,
            result: {
                player: 1,
            },
            effect: {
                player: (card, player) => {
                    if (get.tag(card, "skip") === "phaseUse") {
                        return [1, -0.5];
                    }
                },
            },
        },
    },
    lit_kuizeng: {
        enable: "phaseUse",
        filter: (event, player) => {
            return player.countCards('he') > 0;
        },
        filterCard: true,
        selectCard: [1, Infinity],
        position: 'he',
        allowChooseAll: true,
        discard: false,
        lose: false,
        delay: 0,
        filterTarget: (card, player, target) => {
            return player !== target;
        },
        check: (card) => {
            const player = get.owner(card);
            const selectedCards = ui.selected.cards;

            // 防止选择过多牌
            if (selectedCards.length > 3) return 0;

            // 防止选择毒
            if (selectedCards.length && selectedCards[0].name === 'du') return 0;
            if (!selectedCards.length && card.name === 'du') return 30;

            // 计算历史赠送次数
            let num = 0;
            const evt2 = _status.event.getParent();
            const history = player.getAllHistory('lose');
            for (const evt of history) {
                if (evt.getParent()?.skill === 'lit_kuizeng' && evt.getParent(3) === evt2) {
                    num += evt.cards?.length || 0;
                }
            }

            // 手牌判断逻辑
            if (player.countCards('he') <= 2) {
                if (selectedCards.length) return 1;

                // 联动好施
                const players = game.filterPlayer();
                for (const target of players) {
                    if (target.hasSkill('haoshi') &&
                        !target.isTurnedOver() &&
                        !target.hasJudge('lebu') &&
                        get.attitude(player, target) >= 3 &&
                        get.attitude(target, player) >= 3) {
                        return 11 - get.value(card, player);
                    }
                }

                // 手牌与体力比较
                if (player.countCards('h') > player.hp) return 10 - get.value(card, player);
                if (player.countCards('h') >= num % 3) return 6 - get.value(card, player);
                return -1;
            }

            return 10 - get.value(card, player);
        },
        async content(event, trigger, player) {
            lib.lit.aiGuard.record(player, 'lit_kuizeng');
            const cards = event.cards;
            const target = event.targets[0];

            // 赠送牌
            await target.gain(cards, player, 'giveAuto');

            // 计算历史赠送次数
            const evt2 = event.getParent(3);
            let num = 0;
            const history = player.getAllHistory('lose');
            for (const evt of history) {
                const parent = evt.getParent(2);
                if (parent?.name === 'lit_kuizeng' && evt.getParent(5) === evt2) {
                    num += evt.cards?.length || 0;
                }
            }

            const times = (num % 3) + cards.length;

            // 如果次数大于2，可以选择造成伤害或恢复体力
            if (times > 2) {
                const result = await player.chooseTarget(
                    `选择1人对其造成${Math.floor(times / 3)}点伤害，或不选择，恢复${Math.floor(times / 3)}点体力`,
                    [0, 1],
                    true,
                    lib.filter.notMe
                ).set("ai", (target) => {
                    const damageValue = get.damageEffect(target, player, player);
                    if (player.hp > 2 && player.hp + Math.floor(times / 3) > player.maxHp) {
                        return Math.max(0, damageValue);
                    }
                    return Math.max(0, damageValue - get.recoverEffect(player, player, player));
                }).forResult();

                if (result.targets && result.targets[0]) {
                    await result.targets[0].damage(Math.floor(times / 3));
                } else {
                    await player.recover(Math.floor(times / 3));
                }
            }
        },
        init: (player) => {
            player.storage.lit_kuizeng = 0;
        },
        ai: {
            order: (skill, player) => {
                if (lib.lit.aiGuard.blocked(player, 'lit_kuizeng')) return -1;
                if (player.hp < player.maxHp && player.countCards('he') > 2) {
                    return 10;
                }
                if (game.hasPlayer(target => get.attitude(player, target) <= 0 && !target.hasSkillTag('nogain'))) {
                    return 3;
                }
                return 1;
            },
            result: {
                target: (player, target) => {
                    if (target.hasSkillTag('nogain')) return 0;

                    const selectedCards = ui.selected.cards;
                    if (selectedCards.length && selectedCards[0].name === 'du') {
                        if (target.hasSkillTag('nodu')) return 0;
                        return -10;
                    }

                    if (target.hasJudge('lebu')) return 0;

                    const targetHand = target.countCards('h');
                    const playerHand = player.countCards('h');

                    if (player.storage.lit_kuizeng < 0 || player.countCards('h') <= 1) {
                        if (targetHand >= playerHand - 1 && playerHand <= player.hp && !target.hasSkill('haoshi')) {
                            return 0;
                        }
                    }

                    return Math.max(1, 5 - targetHand);
                },
                player: (player) => {
                    return player.countCards('h') <= 3 ? 1 : -0.5;
                },
            },
            effect: {
                target: (card, player, target) => {
                    if (player === target && get.type(card) === 'equip') {
                        const subtype = get.subtype(card);
                        if (player.countCards('e', { subtype }) > 0) {
                            const players = game.filterPlayer();
                            for (const other of players) {
                                if (other !== player && get.attitude(player, other) > 0) {
                                    return 0;
                                }
                            }
                        }
                    }
                },
            },
            threaten: 1.1,
            expose: 0.2,
        },
    },
    lit_chuangshi: {
        trigger: {
            player: "damageEnd",
        },
        direct: true,
        async content(event, trigger, player) {
            await player.draw();

            const result = await player.chooseTarget(get.prompt2('lit_chuangshi'))
                .set("ai", (target) => {
                    if (get.attitude(player, target) > 0) {
                        return get.recoverEffect(target, player, player) + 1;
                    }
                    return 0;
                }).forResult();
            if (!result.bool) return;

            const target = result.targets[0];
            await player.logSkill('lit_chuangshi', target);

            const judgeResult = await target.judge((card) => {
                const suit = get.suit(card);
                const number = get.number(card);

                if (target.hp === target.maxHp) {
                    if (suit === 'heart') return -1;
                    return 1;
                }

                if (number !== 9 || target.hp + 1 === target.maxHp) {
                    if (suit === 'heart') return 2;
                    if (suit === 'diamond') return 3;
                    return 1;
                }

                if (suit === 'club') return -1;
                if (suit === 'heart') return 4;
                if (suit === 'diamond') return 5;
                return 3;
            }).forResult();

            if (judgeResult.card) {
                const suit = get.suit(judgeResult.card);
                const number = get.number(judgeResult.card);

                // 点数9的特殊效果
                if (number === 9 && target.hp < target.maxHp) {
                    await target.recover();
                }
                // 红桃或方片恢复体力
                if ((suit === 'heart' || suit === 'diamond') && target.hp < target.maxHp) {
                    await target.recover();
                }

                // 黑桃或方片摸牌
                if (suit === 'spade' || suit === 'diamond') {
                    await target.draw(trigger.num);
                }
            }
        },
        ai: {
            maixie: true,
            maixie_hp: true,
            threaten: 1.3,
            effect: {
                player: (card, player) => {
                    if (get.tag(card, "damage")) {
                        return [1, 0.5];
                    }
                },
            },
            result: {
                player: 1,
            },
        },
    },
};

export const translate = {
    'lit_zengpinjia9曾品嘉': "9曾品嘉",
    'lit_zengpinjia9曾品嘉_prefix': "9",
    "lit_yingjun": "英俊",
    "lit_yingjun_info": "你准备/结束阶段开始时可以摸1张牌。",
    "lit_kuizeng": "馈赠",
    "lit_kuizeng_info": "出牌阶段，你可以把你区域内任意的牌给予其他人；本回合给予牌的总数量<span class='redtext' style='color:Red'>每</span>达到3的倍数时，你选择+1体力或对人造成1点伤害。",
    "lit_chuangshi": "创世",
    "lit_chuangshi_info": "受到伤害时可摸1张牌并令1人判定：为♥️♦️则+1点体力；为♠️♦️♣️则摸x张牌；为9额外+1点体力。（x为受到的伤害）",
};

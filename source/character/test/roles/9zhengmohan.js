import { lib, game, ui, get, ai, _status } from '../shared.js';

export const character = {
    'lit_zhengmohan9郑墨翰': {
        sex: "male",
        group: "nine",
        hp: 3,
        maxHp: 5,
        skills: ["lit_maitou", "lit_yiyu", "lit_moshou"],
        groupInGuozhan: "nine",
    },
};

export const skill = {
    lit_maitou: {
        trigger: {
            player: ["changeHp"],
        },
        direct: true,
        filter: (event, player) => {
            return get.sgn(player.hp - 3.5) !== get.sgn(player.hp - 3.5 - event.num);
        },
        async content(event, trigger, player) {
            if (player.hp > 3 && player.name1 === "郑墨翰") {
                await player.logSkill('lit_maitou', '站起来了');
                game.log("<span class='yellowtext' style='color:Yellow'>颟翰站起来了！！！</span>");
            } else if (player.hp > 3) {
                await player.logSkill('lit_maitou', '站起来了');
                game.log(get.translation(player) + "站起来了！！！");
            } else {
                await player.logSkill('lit_maitou');
            }
        },
        mod: {
            globalFrom: (from, to, current) => {
                return current - 1;
            },
            globalTo: (from, to, current) => {
                if (to.hp <= 3) return current + 1;
            },
        },
        ai: {
            threaten: 0.8,
            effect: {
                target: (card, player, target) => {
                    if (get.tag(card, 'damage') && target.hp <= 3) {
                        return [1, 0.3];
                    }
                },
            },
        },
    },
    lit_yiyu: {
        usable: 2,
        enable: "phaseUse",
        filter: (event, player) => {
            return player.countCards('h', card => get.name(card, player) === 'sha') > 0;
        },
        filterTarget: (card, player, target) => {
            return player.inRangeOf(target);
        },
        check: (event, player) => {
            const shaCount = player.countCards('h', card => get.name(card, player) === 'sha');
            if (shaCount === 0) return false;

            const targets = game.filterPlayer(target =>
                player.inRangeOf(target) && target !== player
            );

            if (targets.length === 0) return false;

            let maxEff = 0;
            for (const target of targets) {
                const shaEffect = get.effect(target, { name: 'sha' }, player, player);
                const usefulCards = player.getCards('h', card => get.name(card, player) !== 'sha')
                    .reduce((sum, card) => sum + get.useful(card, player), 0);

                if ((usefulCards < 2.8 * shaCount * shaEffect) ||
                    (shaEffect >= (0.6 * target.countCards('h') + target.hp) && shaEffect > 0)) {
                    return true;
                }
                maxEff = Math.max(maxEff, shaEffect);
            }
            return false;
        },
        async content(event, trigger, player) {
            const target = event.targets[0];

            // 步骤0: 弃置目标区域牌
            if (target.countDiscardableCards(player, 'hej')) {
                await player.discardPlayerCard('【呓语】弃置其区域牌', target, 'hej')
                    .set("ai", card => {
                        if (get.attitude(player, target) > 0) {
                            return 10 - get.value(card, target);
                        } else {
                            return 10 - get.value(card, target);
                        }
                    });
            }

            // 步骤1-3: 连续出杀直到没有杀或目标死亡
            while (player.isAlive() && target.isAlive()) {
                const shaCards = player.getCards('h', card => get.name(card, player) === 'sha');
                if (shaCards.length === 0) break;

                const result = await player.chooseCard(`【呓语】选择一张杀对${get.translation(target)}使用`, 'h', 1, true,
                    card => get.name(card, player) === 'sha'
                ).forResult();

                if (!result.bool) break;

                await player.useCard(result.cards[0], target);
            }

            // 步骤4: 弃置所有手牌
            if (player.countCards('h') > 0) {
                await player.discard(player.getCards('h'), true);
            }
        },
        ai: {
            order: 1,
            expose: 0.8,
            threaten: 1.4,
            result: {
                player: (player, target) => {
                    const shaCount = player.countCards('h', card => get.name(card, player) === 'sha');
                    return shaCount - player.countCards('h');
                },
                target: (player, target) => {
                    if (!player.hasSha()) {
                        if (target.countCards('hej')) return -1;
                        return 0;
                    }
                    if (get.mode() === 'versus') return -1;
                    if (player.hasUnknown()) return 0;
                    return get.effect(target, { name: 'sha' }, player, target);
                },
            },
            effect: {
                target: (card, player, target) => {
                    if (player.hasSha() && get.attitude(player, target) < 0) {
                        return [1, 0.5];
                    }
                },
            },
        },
    },
    lit_moshou: {
        trigger: {
            global: "dieAfter",
            player: "phaseUseBegin",
        },
        forced: true,
        filter: (event, player, name) => {
            player.storage.lit_moshou = name;
            return true;
        },
        async content(event, trigger, player) {
            if (player.storage.lit_moshou === "dieAfter") {
                if (_status.currentPhase === player) {
                    await player.draw(player.maxHp);
                } else {
                    await player.draw(2);
                }
            } else {
                player.addTempSkill('lit_moshou_sha', 'phaseUseAfter');
            }
        },
        ai: {
            threaten: 1.5,
            effect: {
                player: (card, player) => {
                    if (get.tag(card, 'damage') && player.storage.lit_moshou === "dieAfter") {
                        return [1, 0.3];
                    }
                },
            },
        },
        subSkill: {
            sha: {
                mod: {
                    cardname: (card, player) => {
                        if (card.name === 'shan' && get.suit(card) !== 'heart') {
                            return 'sha';
                        }
                    },
                },
                ai: {
                    respondSha: true,
                    effect: {
                        target: (card, player, target, current) => {
                            if (get.tag(card, 'respondSha') && current < 0) {
                                return 0.6;
                            }
                        },
                    },
                },
                sub: true,
                sourceSkill: "lit_moshou",
            },
        },
    },

    // 9曾品嘉
};

export const translate = {
'lit_zhengmohan9郑墨翰': "9郑墨翰",
    'lit_zhengmohan9郑墨翰_prefix': "9",
    "lit_maitou": "埋头",
    "lit_maitou_info": "锁定技；你计算与别人的距离-1；你的体力小于等于3时，别人计算与你的距离+1。",
    "lit_yiyu": "呓语",
    "lit_yiyu_info": "出牌阶段限2次，你选择攻击范围内的1人，可弃其区域内的1张牌，然后强制使用手牌中所有的“杀”，除非其死亡，否则你弃置其他手牌。",
    "lit_moshou": "墨守",
    "lit_moshou_info": "锁定技；出牌阶段，你的非♥️“闪”视为“杀”；每有1人死亡：<br><li>①在你的回合外，你摸2张牌；<br><li>②在你的回合内，你摸x张牌。（x为你的体力上限）",
};

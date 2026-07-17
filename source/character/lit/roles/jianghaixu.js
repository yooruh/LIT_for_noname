import { lib, game, ui, get, ai, _status } from '../../../../../../noname.js';
import { Styled } from '../../../tool/basic.js';
const X = Styled('b', 'X'), Y = Styled('p', 'Y'), Z = Styled('y', 'Z');

export const character = {
    'lit_jianghaixu蒋海旭': {
        sex: "male",
        group: "three",
        hp: 3,
        skills: ["lit_shengjijhx", "lit_yuanzhu", "lit_chenshui", "lit_shanliang"],
    },
};

export const skill = {
    // 蒋海旭
    lit_yuanzhu: {
        marktext: "援",
        intro: {
            content: "放心，有旭旭哥哥的💞",
        },
        trigger: {
            global: "phaseBeforeStart",
        },
        onremove: (player) => {
            if (!game.hasPlayer(current => current !== player && current.hasSkill("lit_yuanzhu"))) game.countPlayer(current => {
                if (current.hasMark("lit_yuanzhu")) current.clearMark("lit_yuanzhu", false);
            });
        },
        filter: (event, player) => {
            if (event.player === player || event.player.hasMark("lit_yuanzhu")) return false;
            return player.countCards('hes') !== 0;

        },
        async cost(event, trigger, player) {
            const target = trigger.player;
            const result = await player
                .chooseCard("hes", [1, 2], get.prompt("lit_yuanzhu", target),
                    `弃置1~2张牌，令${get.translation(target)}获得等量“援”<li>锁定技；有“援”者即将弃牌时，取消此次弃牌并移除1层“援”</li>`, lib.filter.cardDiscardable)
                .set("ai", card => {
                    if (!get.event().check) return -1;
                    if (ui.selected.cards.length === 0 && (target.hasJudge('lebu') || target.skipList.includes('phaseUse'))) {
                        return 1;
                    } else if (player.needsToDiscard() - ui.selected.cards.length > 0) {
                        return get.unuseful2(card) - 3;
                    }
                    return get.unuseful2(card) - 6;
                    // let count = ui.selected.cards.length + target.countMark("lit_yuanzhu");
                    // let max = get.attitude(player, target) / 3;
                    // if (count === 0 && (target.hasJudge('lebu') || target.skipList.includes('phaseUse'))) {
                    //     return 1;
                    // } else if (player.needsToDiscard() - ui.selected.cards.length > 0) {
                    //     return get.unuseful2(card) - 3;
                    // } else if (max - count > 0) {
                    //     return get.unuseful2(card) - 5 - count;
                    // }
                }).set("check", (() => {
                    if (target.hasSkillTag('noh')) return false;
                    return get.attitude(player, target) > 0;
                })()).forResult();
            event.result = {
                bool: result.bool,
                cost_data: {
                    cards: result.cards,
                },
            };
        },
        async content(event, trigger, player) {
            const target = trigger.player;
            await player.discard(event.cost_data.cards);
            await target.addMark("lit_yuanzhu", event.cost_data.cards.length);
        },
        ai: {
            expose: 0.2,
        },
        global: "lit_yuanzhu_yuan",
        group: "lit_yuanzhu_die",
        subSkill: {
            yuan: {
                forced: true,
                trigger: {
                    player: ["loseBefore", "loseAsyncBefore"],
                },
                filter: (event, player) => {
                    if (!player.hasMark("lit_yuanzhu")) return false;
                    if (event.type != "discard") return false;
                    let cards = player.getCards('hes');
                    return event.cards.some(card => cards.includes(card));
                },
                async content(event, trigger, player) {
                    player.removeMark("lit_yuanzhu", 1);
                    trigger.cards.removeArray(player.getCards('hes'));
                },
                sub: true,
                sourceSkill: "lit_yuanzhu",
            },
            die: {
                direct: true,
                forceDie: true,
                trigger: {
                    player: 'dieAfter',
                },
                filter: () => true,
                async content(event, trigger, player) {
                    if (!game.hasPlayer(current => current !== player && current.hasSkill('lit_yuanzhu'))) game.countPlayer(current => {
                        if (current.hasMark('lit_yuanzhu')) current.clearMark('lit_yuanzhu', false);
                    })
                },
                sub: true,
                sourceSkill: 'lit_yuanzhu',
            },
        },
    },
    lit_chenshui: {
        derivation: "lit_chenshui_faq",
        frequent: (event, player) => {
            return player.isTurnedOver() && get.attitude(player, event.player) > 0;
        },
        trigger: {
            global: ['changeHp', 'loseMaxHpAfter'],
        },
        getIndex(event, player) {
            return [event.player];
        },
        filter: (event, player) => {
            if (player.hasSkill('lit_chenshui_used')) return false;
            let num = event.name === 'changeHp' ? event.num : -event.loseHp;
            return num < 0;
        },
        logTarget(event, player, triggername, target) {
            return target;
        },
        check(event, player, triggername, target) {
            return get.attitude(player, target) > 0;
        },
        async content(event, trigger, player) {
            if (!player.hasSkill('lit_chenshui_used')) player.addTempSkill("lit_chenshui_used");
            await player.turnOver();
            await trigger.player.draw(2);
        },
        global: "shenshui_ai",
        ai: {
            maixie: true,
            "maixie_hp": true,
            expose: 0.1,
            result: {
                player: (player, target) => {
                    return player.isTurnedOver() ? 1 : -1;
                },
                target: 2,
            },
            effect: {
                target(card, player, target) {
                    if (get.tag(card, "damage")) {
                        if (target.hasSkill('lit_chenshui_used') || !target.hasFriend()) return;
                        let num = 1;
                        if (get.attitude(player, target) > 0) {
                            if (player.needsToDiscard()) {
                                num = 0.7;
                            } else {
                                num = 0.5;
                            }
                        }
                        let eff = 0;
                        if (target.hasMark("lit_dongjie")) {
                            if (!lib.lit.effLock['lit_chenshui']) {
                                lib.lit.effLock['lit_chenshui'] = true;
                                let divAtt = Math.abs(get.attitude(target, target)) ?? 5;
                                eff = Math.min(get.effect(target, { name: "losehp" }, target, target) / divAtt, 0);
                                delete lib.lit.effLock['lit_chenshui'];
                            }
                        }
                        num += target.isTurnedOver() ? 0.33 : -0.2;
                        if (target.hp >= 4) return [1, Math.max(num * 2 - eff, 0)];
                        if (target.hp === 3) return [1, Math.max(num * 1.5 - eff, 0)];
                        if (target.hp === 2) return [1, Math.max(num * 0.5 - eff, 0)];
                    }
                },
            },
        },
        subSkill: {
            used: {
                charlotte: true,
                sub: true,
                sourceSkill: "lit_chenshui",
            },
            ai: {
                charlotte: true,
                ai: {
                    effect: {
                        target(card, player, target) {
                            if (!target.hasFriend()) return;
                            if (!get.tag(card, "damage")) return;
                            let skillers = game.filterPlayer(current => {
                                return current.hasSkill("lit_chenshui", null, false, true) && !current.hasSkill('lit_chenshui_used') && current != target;
                            })
                            if (skillers.length > 0) {
                                for (let i of skillers) {
                                    if (get.attitude(i, target) > 0) {
                                        let num = 1;
                                        if (get.attitude(player, target) > 0) {
                                            if (player.needsToDiscard()) {
                                                num = 0.7;
                                            } else {
                                                num = 0.5;
                                            }
                                        }
                                        if (target.hp >= 4) return [1, num * 2];
                                        if (target.hp === 3) return [1, num * 1.5];
                                        if (target.hp === 2) return [1, num * 0.5];
                                    }
                                }
                            }
                        },
                    },
                },
            },
        },
    },
    lit_shanliang: {
        forced: true,
        popup: false,
        trigger: {
            player: "dying",
        },
        filter: (event, player) => {
            return game.hasPlayer(current => current.countCards('hs') > 0);
        },
        async content(event, trigger, player) {
            if (player.hasSkill("lit_shanliangV2")) {
                await player.logSkill("lit_shanliangV2");
            } else {
                await player.logSkill("lit_shanliang");
            }
            const emoji1 = ["🙏", "😇", "🤗", "💯", "🥳"], emoji2 = ["😭", "😫", "😖", "😣", "😢"];
            const currented = [];
            const lose_list = [], cards = [];
            let current = player;

            do {
                currented.push(current);
                let taoCards = current.getCards("hs", card => get.name(card, current) === 'tao' || card.name === 'tao');
                let str = taoCards.length ?
                    `${get.translation(current)} 拥有${taoCards.length}张“桃” ${emoji1.randomGets(1)}` :
                    `${get.translation(current)} 没“桃” ${emoji2.randomGets(1)}`;
                await current.showCards(current.getCards("hs"), str);

                if (taoCards.length > 0) {
                    cards.addArray(taoCards);
                    lose_list.push([current, taoCards]);
                }
                current = current.next;
            } while (!currented.includes(current));
            event.cards = cards;
            game.delay(0.5);

            if (cards.length > 0) {
                await game.loseAsync({ lose_list: lose_list }).setContent("discardMultiple");
                if (player.hasSkill("lit_shanliangV2")) {
                    let del = cards.length - player.maxHp + player.hp;
                    if (del > 0) await player.gainMaxHp(del);
                }
                await player.recover(cards.length);
            }
        },
        ai: {
            effect: {
                target(card, player, target) {
                    if (get.tag(card, "damage")) {
                        if (target.hp > 1) return;
                        if (player.hasCard(card => get.name(card, player) === 'tao' || card.name === 'tao', "hs")) {
                            return 0;
                        }
                    }
                },
            },
        },
    },
    lit_shanliangV2: {
        group: 'lit_shanliang',
        init: (player) => {
            if (player.hasSkill('lit_shanliang')) player.removeSkill('lit_shanliang');
        },
    },
};

export const translate = {
'lit_jianghaixu蒋海旭': "蒋海旭",
    'lit_jianghaixu_azure': "蔚蓝色",
    'lit_yuanzhu': "援助",
    'lit_yuanzhu_info': "其他角色回合开始前，若其没有“援”，你可以弃置1~2张牌，令其获得等量枚“援”；锁定技，有“援”的角色弃牌时，取消弃牌并移去1枚“援”（仅限手牌和装备区的弃牌）",
    'lit_chenshui': "沉睡",
    'lit_chenshui_info': "每回合限一次，当其他角色扣血瞬间，你可以翻面并令其摸两张牌",
    'lit_chenshui_faq': "关于扣血瞬间的具体时机",
    'lit_shanliang': "善良",
    'lit_shanliang_info': "锁定技，当你进入濒死状态时，全场角色展示手牌并弃置其中的【桃】和字面意义上的桃，你恢复等量的体力",
    /*负面效果*/'lit_dongjie': "冻结",
    'lit_dongjie_info': "负面效果，翻面后失去所有“冻结”和等量体力",
    'lit_yuanzhu_info': "他人回合开始前，若其没有“援”，你可弃置1~2牌，其+等量“援”。锁；有“援”者弃牌时取消弃牌并-1“援”（仅限手牌和装备区的弃牌）",
    'lit_chenshui_info': "每回合限1次，有人扣血瞬间你可翻面并令其+2牌",
    'lit_shanliang_info': "锁；濒死时全场展示手牌并弃置其中的桃和字面意义上的桃，你+等弃置量的血",
    'lit_dongjie_info': "负面；翻面后失去所有“冻结”和等量体力",
};

export const simpleTranslate = {
    'lit_yuanzhu_info': "他人回合开始前，若其没有“援”，你可弃置1~2牌，其+等量“援”。锁；有“援”者弃牌时取消弃牌并-1“援”（仅限手牌和装备区的弃牌）",
    'lit_chenshui_info': "每回合限1次，有人扣血瞬间你可翻面并令其+2牌",
    'lit_shanliang_info': "锁；濒死时全场展示手牌并弃置其中的桃和字面意义上的桃，你+等弃置量的血",
    'lit_dongjie_info': "负面；翻面后失去所有“冻结”和等量体力",
};

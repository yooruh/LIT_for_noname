import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';

export const sort = 'jbs';

export const character = {
    'lit_chenke陈可': {
        sex: "male",
        group: "nine",
        hp: 3,
        skills: ["lit_nitian", "lit_yizhu"],
        groupInGuozhan: "three",
    },
};

export const skill = {
    // 陈可
    lit_nitian: {
        mod: {
            aiOrder(player, card, num) {
                if (num > 0 && get.itemtype(card) === "card" && ["spade", "heart"].includes(get.suit(card)) && get.type(card) === "equip") return num * 1.35;
            },
            aiValue(player, card, num) {
                if (num > 0 && get.itemtype(card) === "card" && ["spade", "heart"].includes(get.suit(card))) return num * 1.15;
            },
            aiUseful(player, card, num) {
                if (num > 0 && get.itemtype(card) === "card" && ["spade", "heart"].includes(get.suit(card))) return num * 1.35;
            },
        },
        locked: false,
        popup: false,
        preHidden: true,
        trigger: {
            global: "judge",
        },
        filter(event, player) {
            return player.countCards("hes") > 0;
        },
        async cost(event, trigger, player) {
            const { bool, cards } = await player
                .chooseCard(`${get.translation(trigger.player)} 的 ${trigger.judgestr || ""} 判定为 ${get.translation(trigger.player.judging[0])}，${get.prompt("lit_nitian")}`, "hes", card => {
                    const player = get.event().player;
                    const mod2 = game.checkMod(card, player, "unchanged", "cardEnabled2", player);
                    if (mod2 != "unchanged") return mod2;
                    const mod = game.checkMod(card, player, "unchanged", "cardRespondable", player);
                    if (mod != "unchanged") return mod;
                    return true;
                }).set("ai", card => {
                    const trigger = get.event().getTrigger();
                    const player = get.event().player;
                    const judging = get.event().judging;
                    const result = trigger.judge(card) - trigger.judge(judging);
                    const attitude = get.attitude(player, trigger.player);
                    const ex = ['heart', 'spade'].includes(get.suit(card)) ? 0.2 : 0;
                    let val = get.value(card);
                    if (get.subtype(card) === "equip2") val /= 2;
                    else val /= 4;
                    if (attitude === 0 || result === 0) return ex;
                    if (attitude > 0) {
                        return result - val + ex;
                    }
                    return -result - val + ex;
                }).set("judging", trigger.player.judging[0])
                .setHiddenSkill("lit_nitian")
                .forResult();
            if (bool) event.result = { bool, cost_data: { cards } };
        },
        async content(event, trigger, player) {
            const chooseCardResultCards = event.cost_data.cards;
            await player.respond(chooseCardResultCards, "lit_nitian", "highlight", "noOrdering");
            if (trigger.player.judging[0].clone) {
                trigger.player.judging[0].clone.classList.remove("thrownhighlight");
                game.broadcast(function (card) {
                    if (card.clone) {
                        card.clone.classList.remove("thrownhighlight");
                    }
                }, trigger.player.judging[0]);
                game.addVideo("deletenode", player, get.cardsInfo([trigger.player.judging[0].clone]));
            }
            await player.gain(trigger.player.judging[0], "gain2");
            let card = chooseCardResultCards[0];
            if (['heart', 'spade'].includes(get.suit(card))) await player.draw("nodelay");
            trigger.player.judging[0] = card;
            trigger.orderingCards.addArray(chooseCardResultCards);
            game.log(trigger.player, "的判定牌改为", card);
            await game.delay();
        },
        ai: {
            rejudge: true,
            tag: {
                rejudge: 1,
            },
        },
    },
    lit_yizhu: {
        trigger: {
            player: ["damageEnd", "loseHpEnd"],
        },
        group: "lit_yizhu_die",
        direct: true,
        filter: (event, player) => {
            return event.num > 0;
        },
        content() {
            "step 0"
            event.count = trigger.num;
            "step 1"
            event.count--;
            "step 2"
            player.chooseTarget(get.prompt('lit_yizhu'), '获得1人区域内的1张牌', (card, player, target) => {
                return target.countCards('hej') > 0;
            }).set("ai", target => {
                var player = get.event().player;
                if (get.attitude(player, target) > 0) {
                    return target.countCards('j');
                } else {
                    return target.countCards('he');
                }
            });
            "step 3"
            if (result.bool) {
                player.gainPlayerCard(true, get.prompt('lit_yizhu', result.targets), result.targets[0], get.buttonValue, 'hej').set("logSkill", ['lit_yizhu', result.targets[0]]);
            }
            "step 4"
            if (event.count > 0) {
                event.goto(1);
            }
        },
        ai: {
            "maixie_defend": true,
            effect: {
                target(card, player, target) {
                    if (!target.hasFriend()) return;
                    if (player.countCards('he') > 1 && get.tag(card, 'damage')) {
                        if (get.attitude(target, player) < 0) return [1, 1, 0, -1];
                    }
                },
            },
        },
        subSkill: {
            die: {
                forced: true,
                forceDie: true,
                trigger: {
                    player: "dieBefore",
                },
                filter: (event, player) => {
                    return player.countCards('hej') > 0;
                },
                filterCard: true,
                selectCard: -1,
                content() {
                    "step 0"
                    player.chooseTarget(get.prompt('lit_yizhu'), '选择1人给其你区域内所有的牌，或不选择，将区域内所有的牌放至牌堆顶', (card, player, target) => {
                        return player != target;
                    }).set("ai", target => {
                        return get.attitude(player, target) > 0;
                    });
                    "step 1"
                    if (result.bool) {
                        player.give(player.getCards('hej'), result.targets[0], 'giveAuto');
                    } else {
                        player.lose(player.getCards('hej'), ui.cardPile, 'insert', 'visible');
                    }
                },
                sub: true,
                sourceSkill: "lit_yizhu",
            },
        },
    },
};

export const translate = {
    'lit_chenke陈可': "陈可",
    'lit_nitian': "逆天",
    'lit_nitian_info': `当判定牌生效前，你可以打出一张牌代替之，并${styleText('g', '获得原判定牌')}，若你以此法打出的牌为♥️/♠️，你摸一张牌`,
    'lit_yizhu': "遗嘱",
    'lit_yizhu_info': "你每失去1点体力或受到1点伤害后，可以获得一名其他角色一张牌；当你死亡时，你可以将所有牌置于牌堆顶或交给一名其他角色",
};

export const simpleTranslate = {
    'lit_nitian_info': `场上判定时，可打1牌代替判定牌并${styleText('g', '拿走原判定牌')}，用♥️♠️改判则摸1牌`,
    'lit_yizhu_info': "每-1血或受1伤，可拿1人1牌；死时可将所有牌放牌堆顶或给他人",
};

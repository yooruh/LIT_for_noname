import { lib, game, ui, get, ai, _status, X, Y, Z } from '../shared.js';

export const character = {
    'lit_zigao自高': {
        sex: "male",
        group: "three",
        hp: 4,
        skills: ["lit_shengjizg", "lit_xinren", "lit_chantaer", "lit_zhanshi"],
        isZhugong: true,
    },
};

export const skill = {
    // 自高
    lit_xinren: {
        usable: 1,
        enable: 'phaseUse',
        zhuSkill: true,
        locked: false,
        filter: (event, player) => {
            if (player.countCards('hes') === 0) return false;
            return game.hasPlayer(current => current !== player && (lib.lit.isSameGroup(current, 'three')) && current.isIn());
        },
        filterCard: true,
        position: 'hes',
        discard: false,
        lose: false,
        delay: 0,
        check(card) {
            const player = get.owner(card);
            if (get.tag(card, "damage")) return get.value(card);
            if (player.needsToDiscard()) return 11 - get.useful(card);
            return false;
        },
        filterTarget: (card, player, target) => {
            return player !== target && (lib.lit.isSameGroup(target, 'three'));
        },
        async content(event, trigger, player) {
            let cardToUse = event.cards[0],
                user = event.target;
            await player.give(cardToUse, user);
            if (user.hasUseTarget(cardToUse)) {
                user.addTempSkill('lit_xinren_count');
                user.setStorage("lit_xinren_count", [cardToUse, player, 0]);
                await user.chooseToUse(card => card === cardToUse, "【信任】", `是否使用 ${get.translation(cardToUse)}？<li>此牌每造成1点伤害，都会使 ${get.translation(player)} 摸1张牌`)
                    .set("complexSelect", true)
                    .set("filterTarget", function (card, player, target) {
                        return user.canUse(cardToUse, target, true, true);
                    }).set("ai", function (target) {
                        if (!get.tag(cardToUse, "damage")) return get.effect_use(target, cardToUse, player);
                        let att = get.attitude(user, player);
                        return get.effect_use(target, cardToUse, user) + get.sgn(att) * 2;
                    });
            }
        },
        mod: {
            aiValue(player, card, num) {
                if (get.tag(card, "multitarget") && get.tag(card, "damage")) return num + game.players.length;
            },
        },
        ai: {
            order: () => {
                return get.order({ name: "nanman" }) + 0.03;
            },
            expose: 0.1,
            threaten: 1.1,
            result: {
                player: (player, target, card) => {
                    if (get.tag(card, "damage")) {
                        let res = 0;
                        if (target.hasSkillTag("directHit_ai", true, { card: card }, true)) res += 2;
                        if (target.hasSkillTag("damageBonus", true, { card: card }, true)) res += 1;
                        return get.threaten(target) / 2 + res;
                    }
                    return -0.5;
                },
                target: 1.2,
            },
        },
        subSkill: {
            count: {
                direct: true,
                init(player) {
                    player.setStorage("lit_xinren_count", [null, null, 0]);
                },
                trigger: {
                    source: 'damageEnd',
                    player: 'useCardAfter',
                },
                filter: (event, player) => {
                    if (!event.cards[0]) return false;
                    return get.itemtype(event.cards[0]) === "card" && event.cards[0] === player.getStorage("lit_xinren_count", [null, null, 0])[0];
                },
                async content(event, trigger, player) {
                    let state = player.getStorage("lit_xinren_count", [null, null, 0]);
                    if (trigger.name === "damage") {
                        state[2] += trigger.num;
                        player.setStorage("lit_xinren_count", state, true)
                    } else if (player.hasSkill('lit_xinren_count')) {
                        const target = state[1], num = state[2];
                        if (num > 0 && target.isAlive()) {
                            player.line(target, { color: [83, 137, 161] });
                            await target.logSkill('lit_xinren');
                            await target.draw(num).set('source', player);
                        }
                        player.removeSkill('lit_xinren_count');
                    }
                },
                ai: {
                    effect: {
                        player(card, player) {
                            let state = player.getStorage("lit_xinren_count", [null, null, 0]);
                            let cardToUse = state[0],
                                skiller = state[1];
                            let att = get.attitude(player, skiller);
                            if (card === cardToUse && get.tag(cardToUse, "damage")) {
                                return [1, att / 10];
                            }
                        },
                    },
                },
                sub: true,
                sourceSkill: 'lit_xinren',
            },
        },
    },
    lit_zhanshi: {
        usable: 1,
        enable: 'phaseUse',
        locked: false,
        filter: (event, player) => {
            return game.hasPlayer(function (current) {
                return lib.skill.lit_zhanshi.filterTarget(null, player, current);
            });
        },
        filterTarget: (card, player, target) => {
            return player !== target;
        },
        async content(event, trigger, player) {
            let target = event.target;
            if (target.countCards('h') > 0) {
                await target.showCards(target.getCards('h'), `${get.translation(target)} 被 ${get.translation(player)} 点名要求展示`);
                await target.give(target.getCards('h'), player, true);
            }
            let num = player.needsToDiscard();
            if (num) {
                await player.chooseToGive('【展示】', `还给${get.translation(target)} ${num}张牌`, target, num, true)
                    .set("ai", (card, player, target) => {
                        let att = get.attitude(player, target);
                        //if(get.tag(card, "multitarget")&&get.tag(card, "damage"))return -1;
                        return (8 - get.value(card)) * 0.5 + (get.value(card, target) - 6) * get.sgn(att - 0.001);
                    });
                await target.draw(Math.min(num, 3)).set("source", player);
            }
            target.addSkill('lit_zhanshi_sub');
        },
        mod: {
            aiOrder(player, card, num) {
                if (player.needsToDiscard(0, null, true) > 0 && get.name(card, player) === "huogong") {
                    return get.order({ name: "wuzhong" }) - 0.1;
                }
            },
        },
        ai: {// todo：适配枝疏
            threaten: 1.1,
            order: (item, player) => {
                if (!player) player = get.player();
                if (player.needsToDiscard(0, null, true) > 0) return get.order({ name: "wuzhong" }) - 0.05;
                return get.order({ name: "tiesuo" }) - 0.03;
            },
            result: {
                player: (player, target) => {
                    return Math.min(-player.needsToDiscard(0, null, true), target.countCards('h'));
                },
                target: (player, target) => {
                    if (target.hasSkillTag('noh')) return 1;
                    let th = target.countCards('h');
                    let q = player.needsToDiscard(th, null, true);
                    let num = q > 0 ? -th + q + Math.min(3, q) : -th;
                    return num + get.threaten(target);
                },
            },
        },
        subSkill: {
            sub: {
                unique: true,
                direct: true,
                charlotte: true,
                nobracket: true,
                init: (player) => {
                    player.addSkill("lit_zhanshi_math");
                    player.addSkill("lit_zhanshi_mark");
                    let history = player.getAllHistory("useCard");
                    if (history.length) {
                        let trigger = history[history.length - 1],
                            num = get.number(trigger.card);
                        player.setStorage("lit_zhanshi_mark", num);
                        player.markSkill("lit_zhanshi_mark");
                    }
                },
                onremove: (player) => {
                    player.removeSkill("lit_zhanshi_math");
                    player.unmarkSkill("lit_zhanshi_mark");
                    player.removeSkill("lit_zhanshi_mark");
                    player.removeGaintag("lit_zhanshi_math1");
                    player.removeGaintag("lit_zhanshi_math2");
                    delete player.storage.lit_zhanshi_mark;
                },
                trigger: {
                    player: 'phaseAfter',
                },
                async content(event, trigger, player) {
                    player.removeSkill('lit_zhanshi_sub');
                },
                sub: true,
                sourceSkill: 'lit_zhanshi',
            },
            math: {
                getLastUsed: (player, event) => {
                    let history = player.getAllHistory("useCard");
                    let index;
                    if (event) index = history.indexOf(event) - 1;
                    else index = history.length - 1;
                    if (index >= 0) return history[index];
                    return false;
                },
                mod: {
                    cardUsable: function (card, player) {
                        if (typeof card === "object") {
                            let evt = lib.skill.lit_zhanshi_math.getLastUsed(player);
                            if (!evt || !evt.card) return;
                            let num1 = get.number(card),
                                num2 = get.number(evt.card);
                            if (num1 === "unsure" || (typeof num1 === "number" && typeof num2 === "number" && num1 % num2 === 0)) return Infinity;
                        }
                    },
                    aiOrder: function (player, card, num) {
                        if (typeof card === "object") {
                            let evt = lib.skill.lit_zhanshi_math.getLastUsed(player);
                            if (!evt || !evt.card) return;
                            let num1 = get.number(card),
                                num2 = get.number(evt.card);
                            if (num1 === "unsure" || (typeof num1 === "number" && typeof num2 === "number" && num2 % num1 === 0)) return num + 5;
                        }
                    },
                },

                forced: true,
                trigger: { player: "useCard" },
                filter: (event, player) => {
                    let evt = lib.skill.lit_zhanshi_math.getLastUsed(player, event);
                    if (!evt || !evt.card) return false;
                    let num1 = get.number(event.card),
                        num2 = get.number(evt.card);
                    return typeof num1 === "number" && typeof num2 === "number" && num2 % num1 === 0;
                },
                async content(event, trigger, player) {
                    await player.draw();
                },
            },
            mark: {
                mark: true,
                charlotte: true,
                intro: {
                    name: "展示",
                    content: (storage, player) => {
                        return `☝️🤓来欣赏一下数学家！<li>上一张牌的点数：${typeof storage === "number" ? storage : "暂无"}</li>`;
                    },
                    markcount: (storage, player) => {
                        return storage ?? 0;
                    },
                },

                direct: true,
                firstDo: true,
                trigger: {
                    player: ["useCard1", "gainAfter"],
                    global: "loseAsyncAfter",
                },
                filter: function (event, player, name) {
                    return name === "useCard1" || (event.getg(player).length && player.countCards("h"));
                },

                async content(event, trigger, player) {
                    player.removeGaintag("lit_zhanshi_math1");
                    player.removeGaintag("lit_zhanshi_math2");
                    if (event.triggername === "useCard1") {
                        let num = get.number(trigger.card, player);
                        player.setStorage("lit_zhanshi_mark", num);
                        player.markSkill("lit_zhanshi_mark");
                        if (typeof num != "number") return;
                    }
                    let cards1 = [],
                        cards2 = [],
                        num = player.getStorage("lit_zhanshi_mark", undefined);
                    player.getCards("h").forEach(card => {
                        let numx = get.number(card, player);
                        if (typeof numx === "number") {
                            if (numx % num === 0) cards1.push(card);
                            if (num % numx === 0) cards2.push(card);
                        }
                    });
                    player.addGaintag(cards1, "lit_zhanshi_math1");
                    player.addGaintag(cards2, "lit_zhanshi_math2");
                },
            },
        },
    },
    lit_zhanshiV2: {
        inherit: 'lit_zhanshi',
        init: (player) => {
            if (player.hasSkill('lit_zhanshi')) player.removeSkill('lit_zhanshi');
        },
        async content(event, trigger, player) {
            let target = event.target;
            if (target.countCards('h') > 0) {
                await target.showCards(target.getCards('h'), `${get.translation(target)} 被 ${get.translation(player)} 点名要求展示`);
                await target.give(target.getCards('h'), player, true);
            }
            let num = player.needsToDiscard();
            if (num) {
                await player.chooseToGive('【展示】', `还给${get.translation(target)} ${num}张牌`, target, num, true)
                    .set("ai", (card, player, target) => {
                        let att = get.attitude(player, target);
                        //if(get.tag(card, "multitarget")&&get.tag(card, "damage"))return -1;
                        return (8 - get.value(card)) * 0.5 + (get.value(card, target) - 6) * get.sgn(att - 0.001);
                    });
                await target.draw(Math.min(num, 3)).set("source", player);
            }
            player.addSkill('lit_zhanshi_sub');
            target.addSkill('lit_zhanshi_sub');
        },
    },
    lit_chantaer: {
        nobracket: true,
        forced: true,
        trigger: {
            player: ['phaseZhunbei', 'phaseJieshu'],
        },
        filter: (event, player, name) => {
            if (name === 'phaseZhunbei') return player.getDamagedHp() > 0 && player.countCards('h') <= player.getHandcardLimit();
            return !game.hasPlayer2(current => {
                return current.getHistory("damage").length > 0;
            }, true);
        },
        async content(event, trigger, player) {
            if (event.triggername === 'phaseZhunbei') await player.recover();
            else {
                await player.draw(2);
                await player.loseHp();
            }
        },
        mod: {
            maxHandcardBase: (player, num) => {
                return player.maxHp;
            },
            aiUseful(player, card, num) {
                if (['sha', 'shan', 'wuxie', 'tao'].includes(get.name(card, player))) {
                    return Math.min(num * 1.2, 10);
                }
            },
        },
        ai: {
            order: 6.4,
            threaten: 0.7,
            effect: {
                target(card, player, target) {
                    if (get.tag(card, "skip") === "phaseUse") return [1, -1];
                },
                player_use(card, player, target) {
                    if (get.tag(card, "damage")) {
                        if (player.hp === 1 && !player.canSave(player)) return [1, 3];
                        if (player.hp < 3) return [1, 1];
                    }
                },
            },
        },
    },
};

export const translate = {
'lit_zigao自高': "自高",
    'lit_xinren': "信任",
    'lit_xinren_info': "主公技，出牌阶段限一次，你可以交给一名“叁”势力角色一张牌，其可立即使用之，然后你摸X张牌（X为此牌造成的伤害值）",
    'lit_zhanshi': "展示",
    'lit_zhanshi_info': `出牌阶段限一次，你可以令一名其他角色展示所有手牌并交给你，然后你交给其${X}张牌，其摸${X}张牌，直到其回合结束，其使用点数为${Y}的牌：<li>倍数，无次数限制；</li><li>约数，其摸一张牌</li>（${X}为其手牌溢出量且摸牌数至多为3，${Y}为其使用的上一张牌的点数）`,
    'lit_zhanshi_sub': `<span class='bluetext'>【展示】</span>`,
    'lit_chantaer': "铲踏儿",
    'lit_chantaer_info': "锁定技，你的手牌上限基数为你的体力上限；准备阶段，若你的手牌数不大于手牌上限，你恢复1点体力；结束阶段，若本回合没有角色受到过伤害，你摸两张牌并失去1点体力",
    'lit_xinren_info': "主；出牌限1次，交给某“叁”势力角色1牌，其可立即使用，你摸与该牌造成的总伤害相等的牌",
    'lit_zhanshi_info': `出牌限1次，令他人展示所有手牌并给你，你给其${X}牌其摸${X}牌，直到其回合结束，其使用牌点数为${Y}的：<li>倍数，无次数限制；</li><li>约数，+1牌</li>（${X}为手牌溢出量且摸牌数至多为3，${Y}为其使用的上一牌的点数）`,
    'lit_chantaer_info': "锁；手牌上限基准为体力上限<li>准备阶段手牌数≤上限+1血</li><li>结束阶段本回合无人受过伤摸2牌并-1血</li>",
};

export const simpleTranslate = {
    'lit_xinren_info': "主；出牌限1次，交给某“叁”势力角色1牌，其可立即使用，你摸与该牌造成的总伤害相等的牌",
    'lit_zhanshi_info': `出牌限1次，令他人展示所有手牌并给你，你给其${X}牌其摸${X}牌，直到其回合结束，其使用牌点数为${Y}的：<li>倍数，无次数限制；</li><li>约数，+1牌</li>（${X}为手牌溢出量且摸牌数至多为3，${Y}为其使用的上一牌的点数）`,
    'lit_chantaer_info': "锁；手牌上限基准为体力上限<li>准备阶段手牌数≤上限+1血</li><li>结束阶段本回合无人受过伤摸2牌并-1血</li>",
};

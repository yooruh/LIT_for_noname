import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';

export const sort = 'ybs';
export const title = `控人·斩杀·连破·${styleText('o', "较难")}`;
export const intro = `前期约等于没有技能，想杀${B("杨湘铃")}要趁早，就算是队友也可能被AOE误伤。一旦${B("杨湘铃")}到了后期，可以显著提高敌方的斩杀线，对手的血量变化完全可能为5→4→3→2→-2→-3→-4……非常适合打消耗战`
    + `<li>主公：前期只考虑活下来，及时翻面高嘲讽敌方。后期可以亲自下场，利用${get.poptip("lit_dongjie")}掉血效果杀到忠臣也不怕`
    + "<li>忠臣、反贼：及时补刀残血，可以造成双倍伤害，不过很多时候人头不会是你的，人头算的是「使其从正常状态进入濒死状态并在最终死亡」的伤害源"
    + "<li>内奸：比较容易发死人财，找准机会连破定胜";
export const character = {
    'lit_yangxiangling杨湘铃': {
        sex: "female",
        group: "three",
        hp: 4,
        skills: ["lit_shengjiyxl", "lit_lenmo", "lit_xiaosa"],
    },
};

export const perfectPair = ['lit_linmiao林淼'];

export const skill = {
    lit_lenmo: {
        derivation: "lit_dongjie",
        forced: true,
        trigger: {
            source: "damageBefore",
        },
        filter: (event, player) => {
            if (!event.player || event.num <= 0) return false;
            if (player === event.player) return false;
            return !player.inRangeOf(event.player);
        },
        async content(event, trigger, player) {
            if (!trigger.player.hasSkill("lit_dongjie")) await trigger.player.addSkills("lit_dongjie");
            trigger.player.addMark("lit_dongjie", 1);
            if (trigger.player.countMark("lit_dongjie") > trigger.player.hp) await trigger.player.turnOver();
        },
        ai: {
            effect: {
                player(card, player, target) {
                    if (get.tag(card, 'damage')) {
                        return [1, -2];
                    }
                },
            },
            // jueqing: true,
            // skillTagFilter(player, tag, arg) {
            //	if(!arg) return false;
            // 	return get.distance(arg.target, player, "attack") > 1;
            // },
        },
    },
    lit_dongjie: {
        lit_neg: 2,
        derivation: "lit_negClear_faq",
        forced: true,
        mark: true,
        marktext: "冻",
        intro: {
            content: '雪が消していた頃、再会を許されるでしょうか？',
        },
        trigger: {
            player: "turnOverEnd",
        },
        async content(event, trigger, player) {
            let num = player.countMark("lit_dongjie");
            player.clearMark("lit_dongjie");
            await player.loseHp(num);
            player.removeSkill("lit_dongjie");
        },
        ai: {
            neg: true,
        },
        group: 'lit_negClear',
    },
    lit_xiaosa: {
        direct: true,
        locked: false,
        firstDo: true,
        init: (player) => {
            // 0: 是否触发过受伤濒死效果；1: 是否触发过掉血濒死效果
            player.setStorage("lit_xiaosa", [false, false]);
        },
        trigger: {
            global: "phaseBefore",
        },
        async content(event, trigger, player) {
            player.setStorage("lit_xiaosa", [0, 0]);
        },
        mod: {
            aiValue(player, card, num) {
                if (get.type(card) === "equip") return num * 1.2;
            },
        },
        global: "lit_xiaosa_ai",
        group: ["lit_xiaosa_damage", "lit_xiaosa_losehp"],
        subSkill: {
            damage: {
                trigger: {
                    global: "dying",
                },
                filter: (event, player) => {
                    if (player.getStorage("lit_xiaosa")[0]) return false;
                    return event.reason.name === "damage";
                },
                async cost(event, trigger, player) {
                    event.result = await player.chooseTarget(get.prompt("lit_xiaosa"), "每回合限一次，场上有人受伤濒死时，可令1人翻面并获得其装备区的牌", (card, player, target) => {
                        return target.isIn();
                    }).set("ai", target => {
                        const player = get.event().player;
                        const att = get.attitude(player, target);
                        const equips = target.getEquips();
                        let score = 0; // 基础收益 = 翻面收益 + 装备收益
                        // 敌方逻辑
                        if (att < 0) {
                            // 抢装备收益
                            score += equips.length * 1.5;
                            if (target.hasSkillTag('noe')) score -= 2;
                            // 翻面收益
                            score += target.isTurnedOver() ? -3 : 5; // 翻面敌人
                            if (target.hasMark("lit_dongjie") && target.hp > 0) {
                                let dmg = target.countMark("lit_dongjie");
                                // 如果翻面能致死，提高优先级
                                score += dmg >= target.hp ? 20 : dmg * 2;
                                // 已翻面，但冻结层数高，值得翻回来
                                if (target.isTurnedOver() && dmg > 2) score += dmg / 2;
                            }
                            // 如果目标就是那个濒死的人，抢走装备防止他回血后有防御，或者直接翻面控死
                            if (target.hp <= 0 && (equips.length || target.hasMark("lit_dongjie"))) {
                                score += 3;
                            }
                            return score;
                        }
                        // 友方逻辑
                        if (att > 0) {
                            if (!target.isTurnedOver() || target.countMark("lit_dongjie") > 1) return -3;
                            if (target.hasMark("lit_dongjie") && !player.canSave(target)) return -1;
                            if (target.getEquips().length < 2 || target.hasSkillTag("noe")) return 3;
                        }
                        return equips.length * 1.5;
                    }).forResult();
                },
                async content(event, trigger, player) {
                    let state = player.getStorage("lit_xiaosa");
                    state[0] = true;
                    player.setStorage("lit_xiaosa", state);
                    const target = event.targets[0];
                    const es = target.getCards('e').filter(e => {
                        return get.position(e) === 'd' || get.position(e) === 'e' && get.owner(e) === target
                            && lib.filter.canBeGained(e, player, target);
                    });
                    await target.turnOver();
                    if (es.length) await player.gain(es, target, "gain2");
                },
                sub: true,
                sourceSkill: "lit_xiaosa",
            },
            losehp: {
                locked: false,
                direct: true,
                trigger: {
                    global: "dying",
                },
                filter: (event, player) => {
                    if (player.getStorage("lit_xiaosa")[1]) return false;
                    return event.reason.name === "loseHp" &&
                        player.countCards("hes", card => get.type(card) === "equip") &&
                        game.hasPlayer(current => player.canUse({ name: "sha", isCard: true }, current, false));
                },
                async content(event, trigger, player) {
                    const next = player.chooseToUse();
                    next.set("openskilldialog", `###${get.prompt("lit_xiaosa")}###每回合限一次，场上有人失去体力濒死时，可将1张装备牌作不计入次数的杀使用，不可被响应`);
                    next.set("filterTarget", (card, player, target) => {
                        return player.canUse(card, target, false);
                    });
                    next.set("oncard", () => get.event().directHit.addArray(game.players));
                    next.set("_backupevent", "lit_xiaosa_backup");
                    next.set("norestore", true);
                    next.set("addCount", false);
                    next.set("logSkill", "lit_xiaosa");
                    next.set("custom", {
                        add: {},
                        replace: { window() { } },
                    });
                    await next.backup("lit_xiaosa_backup");
                },
                sub: true,
                sourceSkill: "lit_xiaosa",
            },
            backup: {
                filterCard(card) {
                    return get.type(card) === "equip";
                },
                viewAs: { name: "sha" },
                selectCard: 1,
                position: "hes",
                ai1(card) {
                    return 10 - get.value(card);
                },
                ai2(target) {
                    const player = get.event().player;
                    let eff = get.effect(target, { name: "sha" }, player, player);
                    if (eff <= 0) return 0;
                    // 如果目标有闪、有防具，强命的价值大幅提升
                    if (target.mayHaveShan(player) || !target.hasEmptySlot(2)) {
                        eff *= 1.5;
                    }
                    // 濒死目标的评分修正
                    if (target.hp <= 0) {
                        // 判断场上是否有其他更值得杀的敌人
                        const hasOtherEnemy = game.hasPlayer(current => {
                            return current !== target &&
                                get.attitude(player, current) < 0 &&
                                current.hp > 0 &&
                                player.canUse('sha', current);
                        });
                        if (hasOtherEnemy) {
                            // 如果有其他活着的敌人，只有在“实在没得选”且“一定要发动”时才补刀
                            return 0.01;
                        }
                        return eff * 0.5;
                    }
                    return eff;
                },
                async precontent(event, trigger, player) {
                    let state = player.getStorage("lit_xiaosa");
                    state[1] = true;
                    player.setStorage("lit_xiaosa", state);
                    delete event.result.skill;
                },
                sub: true,
                sourceSkill: "lit_xiaosa",
            },
            ai: {
                charlotte: true,
                ai: {
                    effect: {
                        player(card, player, target) {
                            if (!get.tag(card, "damage") && !get.tag(card, "loseHp")) return;
                            if (target.hp > 1) return;

                            let bias = 0;
                            game.filterPlayer(current => {
                                if (!current.hasSkill("lit_xiaosa")) return false;
                                return get.tag(card, "damage") ?
                                    current.getStorage("lit_xiaosa")[0] === false :
                                    current.getStorage("lit_xiaosa")[1] === false
                            }).forEach(skiller => {
                                if (skiller === target && !skiller.hasFriend()) return;
                                const sgnAtt = get.sgnAttitude(player, skiller);
                                if (!sgnAtt) return;

                                if (get.tag(card, "damage")) {
                                    // 伤害濒死：场上最优翻面目标价值
                                    bias += sgnAtt * game.players.reduce((max, cur) => {
                                        if (cur === skiller || get.attitude(skiller, cur) > 0) return max;
                                        if (get.attitude(skiller, cur) === 0) return cur.countCards('e') * 1.5;
                                        return Math.max(max, cur.countCards('e') * 1.5 +
                                            (cur.isTurnedOver() ? -3 : 5) +
                                            (cur.countMark("lit_dongjie") >= cur.hp && cur.hp > 0 ? 8 : 0));
                                    }, 0);
                                } else {
                                    // 失去体力濒死：装备转强命杀的价值
                                    if (skiller.hasCard(card => get.type(card) === "equip", "e")) {
                                        bias += 2 * sgnAtt;
                                    }
                                    else if (skiller.hasCard(card => get.type(card) === "equip", "hs")) {
                                        bias += sgnAtt;
                                    }
                                }
                            });
                            if (bias) return [1, bias];
                        },
                    },
                },
                sub: true,
                sourceSkill: "lit_xiaosa",
            },
        },
    },
    lit_juji: {
        mod: {
            globalFrom(from, to) {
                if (from === _status.currentPhase) return -Infinity;
            },
            globalTo(from, to, distance) {
                if (to === _status.currentPhase) return Infinity;
            },
        },
    },
};

export const translate = {
    'lit_yangxiangling杨湘铃': "杨湘铃",
    'lit_lenmo': "冷漠",
    'lit_lenmo_info': `锁定技，当你造成伤害前，若受伤角色不为你且其攻击范围内不包括你，则你令其获得1层${get.poptip('lit_dongjie')}，若此时其“冻结”层数大于其体力值，其翻面`,
    /*负面效果*/'lit_dongjie': "冻结",
    'lit_dongjie_info': "负面效果，翻面后失去所有“冻结”和等量体力",
    'lit_xiaosa': "潇洒",
    'lit_xiaosa_info': "每回合每种情况限一次：<li>场上有人因受到伤害而进入濒死状态时，你可以令一名角色翻面，然后你获得其装备区的牌；</li><li>场上有人因失去体力而进入濒死状态时，你可以将一张装备牌当无次数限制的【杀】使用，此【杀】不可被响应</li>",
    'lit_juji': "狙击",
    'lit_juji_info': "锁定技，你的回合内，其他角色与你的距离视为无限，你与其他角色的距离视为1",
    'lit_shengjiyxl': "升级·杨湘铃",
    'lit_shengjiyxl_info': `获得：${get.poptip('lit_juji')}`,
};

export const simpleTranslate = {
    'lit_lenmo_info': `锁；造成伤害前若其不为你且攻击范围内不包括你，则令其获得一层${get.poptip('lit_dongjie')}，若此时冻结层数大于其体力值，其翻面`,
    'lit_dongjie_info': "负面；翻面后失去所有“冻结”和等量体力",
    'lit_xiaosa_info': "每回合每种情况限1次<li>场上有人受伤濒死时，可令1人翻面并获得其装备区的牌</li><li>场上有人失去体力濒死时，可将1张装备牌作无次数限制的杀使用，不可被响应</li>",
    'lit_juji_info': "锁；回合内，他人与你的距离视作无限，你与他人的距离视作1",
    'lit_shengjiyxl_info': `获得：${get.poptip('lit_juji')}`,
};

export const dynamicTranslate = {
    lit_xiaosa(player) {
        let str1 = "<li>场上有人受伤濒死时，可令1人翻面并获得其装备区的牌</li>",
            str2 = "<li>场上有人失去体力濒死时，可将1张装备牌作无次数限制的杀使用，不可被响应</li>";
        if (player.storage.lit_xiaosa[0]) str1 = styleText('O', str1);
        if (player.storage.lit_xiaosa[1]) str2 = styleText('O', str2);
        return "每回合每种情况限1次" + str1 + str2;
    },
};

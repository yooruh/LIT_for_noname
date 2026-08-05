import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';

export const sort = 'ybs';
export const title = `反击·续航·${styleText('o', "较难")}`;
export const intro = `低血线但不吃桃的负嘲讽型狂战士，但被光着脚的1血角色，爆发和卖血类克制。${get.poptip("lit_cuiruo")}的${B("胡畔")}在回合内看似1血，实则差1血满血，`
    + `能配合${get.poptip("lit_shichou")}加强负嘲讽效果。升级后，降防御来换取${get.poptip("lit_yigou")}体系，能给吃上限的队友极大加成，自身也会演变为彻底的卖血杀杀杀角色。`
    + "<li>主公：负责活着，等到升级后再乱爆发。忠臣记得留桃，只要能活到下个回合，状态一下子就回来了"
    + "<li>忠臣：适当故意不闪承受伤害，但注意防御主公AOE，尤其是某个不可言说的主公，当他的忠臣比内奸还反贼"
    + "<li>反贼：碰瓷主公，升级后利用异构体系可以终结残血"
    + "<li>内奸：利用负嘲讽囤牌成为不动白，最后再爆发";
export const character = {
    'lit_hupan胡畔': {
        sex: "male",
        group: "three",
        hp: 4,
        skills: ["lit_shengjihp", "lit_cuiruo", "lit_shichou"],
    },
};

export const perfectPair = ['lit_zhengmohan郑墨翰'];

export const skill = {
    lit_cuiruo: {
        frequent: (trigger, player) => {
            return player.hp <= player.getDamagedHp();
        },
        trigger: {
            player: 'phaseAfter',
        },
        filter: (event, player) => {
            return player.getDamagedHp() > 0;
        },
        check(event, player) {
            let damaged = player.getDamagedHp();
            let delta = player.hp - damaged;
            if (delta <= 0) return true;
            if (damaged / 2 > delta) return true;
            if (damaged === 1) {
                let enemy = game.countPlayer(current => {
                    return current.hasMark('lit_shichou') && current.hp > 1 && get.attitude(player, current) <= 0;
                }) - game.countPlayer(current => {
                    return current.hasMark('lit_shichou') && current.hp > 1 && get.attitude(player, current) > 0;
                })
                return enemy >= delta;
            }
        },
        async content(event, trigger, player) {
            let damaged = player.getDamagedHp();
            let delta = player.hp - damaged;
            await player.draw(damaged);
            if (delta > 0) await player.loseHp(delta);
            else if (delta < 0) await player.recover(-delta);
        },
        ai: {
            threaten: (player, target) => {
                if (target.hp > 2) return (1.0 / player.hp) + 0.3;
                return 1.5;
            },
            result: {
                player: (player) => {
                    let delta = player.hp - player.getDamagedHp();
                    if (delta > 0) {
                        if (game.hasPlayer(current => current.hasMark('lit_shichou'))) return (1.5 - delta) * 2;
                        return (0.5 - delta) * 2;
                    } return player.getDamagedHp() + delta * 2;
                },
            },
            effect: {
                target(card, player, target) {
                    if (get.tag(card, "recover")) {
                        if (player != target) return;
                        if (!target.isPhaseUsing() || target.isDying()) return;
                        if (target.hp <= target.getDamagedHp()) return -3;
                    }
                },
            },
        },
    },
    lit_shichou: {
        direct: true,
        marktext: "誓",
        intro: {
            name: "誓仇",
            content: "帝弓仅以光矢宣其纶音<li>你被游走在巡猎命途上的行者盯上了",
        },
        onremove: (player) => {
            if (!game.hasPlayer(current => current !== player && current.hasSkill('lit_shichou'))) game.countPlayer(current => {
                if (current.hasMark('lit_shichou')) current.clearMark('lit_shichou', false);
            });
        },
        trigger: {
            player: 'damageBegin4',
        },
        filter: (trigger) => {
            return trigger.source?.isIn();
        },
        async content(event, trigger, player) {
            trigger.source.addMark('lit_shichou');
        },
        ai: {
            threaten: 0.6,
            "maixie_hp": true,
            "maixie_defend": true,
            skillTagFilter: (player, tag, arg) => {
                if (tag === "maixie_hp") {
                    return arg?.player === player && player.hp === 2;
                }
                if (tag === "maixie_defend") {
                    return arg?.player?.hp > 1 && player.hp > 1;
                }
            },
            effect: {
                target(card, player, target) {
                    if (!target.hasFriend()) return;
                    if (get.tag(card, "damage")) {
                        if (player.hp <= 1) return;
                        if (player.hasSkillTag("jueqing", false, target) && !player.hasMark('lit_shichou')) return 3;
                        if (target.hp === 2) {
                            if (get.tag(card, "damageBonus")) return 2;
                            return [1, 0, 0, -2 * (player.hp - 1)];
                        }
                        if (target.hp > 2) {
                            return [1, 0, 1, -1];
                        }
                    }
                },
            },
        },
        group: ['lit_shichou_change', 'lit_shichou_die'],
        subSkill: {
            change: {
                forced: true,
                trigger: {
                    player: ['changeHp', 'loseMaxHpAfter'],
                },
                filter: (event, player, name) => {
                    let num = event.name === 'changeHp' ? event.num : -event.loseHp;
                    if (num === 0) return false;
                    if (!game.hasPlayer(current => current.hasMark('lit_shichou'))) return false;
                    return player.hp === 1;
                },
                async content(event, trigger, player) {
                    game.countPlayer(async current => {
                        if (current.hasMark('lit_shichou')) {
                            current.clearMark('lit_shichou');
                            player.line(current, { color: [115, 155, 70] });
                            if (current.hp === Infinity) {
                                current.hp = Math.pow(2, 31) - 1;
                                current.update();
                            }
                            let num = current.hujia + current.hp - 1;
                            if (num > 0) await current.damage(num);
                        }
                    });
                },
                sub: true,
                sourceSkill: 'lit_shichou',
            },
            die: {
                direct: true,
                forceDie: true,
                trigger: {
                    player: 'dieAfter',
                },
                async content(event, trigger, player) {
                    if (!game.hasPlayer(current => current !== player && current.hasSkill('lit_shichou'))) game.countPlayer(current => {
                        if (current.hasMark('lit_shichou')) current.clearMark('lit_shichou', false);
                    });
                },
                sub: true,
                sourceSkill: 'lit_shichou',
            },
        },
    },
    lit_yigou: {
        limited: true,
        skillAnimation: true,
        animationColor: "fire",
        enable: "phaseUse",
        filter(event, player) {
            return !player.storage.lit_yigou;
        },
        filterTarget(card, player, target) {
            return target.isIn() && target !== player;
        },
        prompt: "令场上的1名其他角色增加1点体力上限，然后你获得【分化】",
        contentBefore(event, trigger, player) {
            player.awakenSkill("lit_yigou");
        },
        async content(event, trigger, player) {
            const target = event.targets[0];
            await target.gainMaxHp();
            await player.addSkills("lit_fenhua");
        },
        ai: {
            order: 7,
            result: {
                target(player, target) {
                    return get.attitude(player, target) > 0 ? 3 : -1;
                },
                player: 2,
            },
        },
    },
    lit_fenhua: {
        zhuanhuanji: true,
        locked: false,
        mark: true,
        marktext: "☯",
        intro: {
            content(storage) {
                if (!storage) {
                    return "失去1点体力，然后视为使用或打出一张无距离和次数限制的【杀】，若此杀造成伤害，你恢复1点体力";
                }
                return `失去1点体力，然后选择一名体力上限大于1的角色，令其${get.poptip("lit_mengying")}层数+Z（Z为其已损失的体力值且至少为1）`;
            },
        },
        enable: ["chooseToUse", "chooseToRespond"],
        mod: {
            cardUsable(card, player, num) {
                const isYang = !player.storage.lit_fenhua;
                if (isYang && card.name === "sha" && card.storage.lit_fenhua) {
                    return true;
                }
            },
        },
        hiddenCard(player, name) {
            const isYang = !player.storage.lit_fenhua;
            return isYang && name === "sha";
        },

        filter(event, player) {
            const isYang = !player.storage.lit_fenhua;
            if (isYang) {
                // 阳：允许 chooseToUse / chooseToRespond，使用殷刃判定条件
                let filterCard = event.filterCard ?? (() => true);
                return filterCard(get.autoViewAs({ name: "sha", isCard: true, storage: { lit_fenhua: true } }), player, event);
            } else {
                // 阴：只允许 phaseUse，使用浮梦判定条件
                if (event.getParent().name !== "phaseUse") return false;
                return game.hasPlayer(t => t.maxHp > 1);
            }
        },
        prompt: (links, player) => {
            const isYang = !player.storage.lit_fenhua;
            if (isYang) {
                return "失去1点体力，然后视为使用或打出一张无距离和次数限制的【杀】，若此杀造成伤害，你恢复1点体力";
            }
            return `失去1点体力，然后选择一名体力上限大于1的角色，令其${get.poptip("lit_mengying")}层数+Z（Z为其已损失的体力值且至少为1）`;
        },
        filterTarget(card, player, target) {
            const isYang = !player.storage.lit_fenhua;
            if (get.event().name === "chooseToRespond") return false;
            if (!isYang) return target.maxHp > 1;
            return player.canUse({ name: "sha", isCard: true, storage: { lit_fenhua: true } }, target, false);
        },
        selectTarget(card, player, target) {
            if (get.event().name === "chooseToRespond") return -1;
            return 1;
        },
        async content(event, trigger, player) {
            const isYang = !player.storage.lit_fenhua;
            player.changeZhuanhuanji("lit_fenhua");
            await player.loseHp();
            if (isYang) {
                // 阳：殷刃效果（视为使用或打出杀）
                if (event.name === "chooseToRespond" || event.getParent(2)?.name === "chooseToRespond") {
                    event.untrigger();
                    event.set("responded", true);
                    event.result = { bool: true, card: { name: "sha", isCard: true, storage: { lit_fenhua: true } } };
                    return;
                }
                const target = event.target;
                await player.useCard({ name: "sha", isCard: true, storage: { lit_fenhua: true } }, target, false)
                    .set("forceDie", true)
                    .set("skill", "lit_fenhua");
                if (player.hasHistory("sourceDamage", (evt) => {
                    let card = evt.card;
                    if (!card || card.name != "sha") return false;
                    let evtx = evt.getParent("useCard");
                    return evtx.card === card && evtx.getParent() === event;
                })) await player.recover();
            } else {
                // 阴：浮梦效果（令梦萦层数+Z）
                const target = event.target;
                let loseNum = Math.max(target.maxHp - target.hp, 1);
                if (!target.hasSkill("lit_mengying")) await target.addSkills("lit_mengying");
                let last = target.getStorage("lit_mengying", 0);
                target.setStorage("lit_mengying", last + loseNum, true);
                await target.useSkill("lit_mengying_neg");
            }
        },
        ai: {
            order(item, player) {
                if (!player.storage.lit_fenhua) {
                    return get.order({ name: "sha" }) - 0.3;
                }
                return 4;
            },
            respondSha: true,
            skillTagFilter(player, tag, arg) {
                if (tag === "respondSha") return !player.storage.lit_fenhua && player.hp > 1;
            },
            result: {
                player(player, target) {
                    if (!player.storage.lit_fenhua) {
                        let divAtt = Math.abs(get.attitude(player, player)) ?? 5;
                        let res = get.effect(player, { name: "losehp", isCard: true }, player, player) / divAtt;
                        if (!target || get.event().name === "chooseToRespond") return res;
                        if (!target.mayHaveShan() || player.hasSkillTag("directHit_ai")) {
                            if (player.hp > 1 || player.canSave(player)) return 0;
                            return res / 2;
                        }
                        return res;
                    } else {
                        if (game.hasPlayer(t => get.attitude(player, t) < 0 && t.maxHp > 1)) return 1;
                        return 0;
                    }
                },
                target(player, target) {
                    if (!player.storage.lit_fenhua) {
                        if (player.hp <= 1 && !player.canSave(player)) return 0;
                        if (!target || get.event().name === "chooseToRespond") return 0;
                        let divAtt = Math.abs(get.attitude(target, target)) ?? 5;
                        return get.effect(target, {
                            name: "sha",
                            isCard: true,
                            storage: { lit_fenhua: true }
                        }, player, target) / divAtt;
                    }
                    if (target.maxHp <= 1) return;
                    let loseNum = Math.max(target.maxHp - target.hp, 1);
                    let divAtt = Math.abs(get.attitude(target, target)) ?? 5;
                    let loseHpEffect = (target.maxHp > 1 && target.maxHp === target.hp) ?
                        (get.effect(target, { name: "losehp" }, player, target) / divAtt) : 0;
                    let result = get.sgn(loseHpEffect) * Math.sqrt(Math.abs(loseHpEffect));
                    return -loseNum + result;
                },
            },
        },
    },
    lit_mengying: {
        direct: true,
        lit_neg: 3, // 其他技能变动梦萦层数时需调用neg技能
        derivation: "lit_negClear_faq",
        mark: true,
        marktext: "萦",
        intro: {
            name: "梦萦",
            content: function (storage, player, skill) {
                switch (player.getStorage("lit_mengying_neg")) {
                    case 0: return "为什么会这样呢？";
                    case 1: return "这被子也就这样了";
                    case 2: return "诸行了无生趣";
                    case 3: return "火堆外的夜";
                    case 4: return "可恶，然而";
                    case 5: return "无所谓";
                    case 6: return "算了";
                    default: return "…";
                }
            },
        },
        trigger: { player: 'recoverEnd' },
        init: (player) => {
            player.setStorage("lit_mengying", 0);     // 欲达到层数
            player.setStorage("lit_mengying_neg", 0); // 当前层数
        },
        onremove: (player) => {
            let neg = player.getStorage("lit_mengying_neg");
            if (neg > 0) player.gainMaxHp(neg).forceDie = true;
        },
        async content(event, trigger, player) {
            if (player.getStorage("lit_mengying_neg") <= trigger.num) {
                await player.removeSkills('lit_mengying');
                return;
            }
            let num = player.getStorage("lit_mengying_neg") - trigger.num;
            player.setStorage("lit_mengying", num, true);
            player.setStorage("lit_mengying_neg", num);
            await player.gainMaxHp(trigger.num);
        },
        ai: {
            neg: true,
        },
        group: ['lit_mengying_neg', 'lit_negClear'],
        subSkill: {
            neg: {
                charlotte: true,
                async content(event, trigger, player) {
                    let del = player.getStorage("lit_mengying") - player.getStorage("lit_mengying_neg");
                    if (del === 0) return;
                    if (del === Infinity) {
                        player.maxHp = player.hp;
                        player.update();
                    } else if (del > 0) {
                        await player.loseMaxHp(del);
                    } else {
                        if (player.getStorage("lit_mengying") <= 0) {
                            await player.removeSkills('lit_mengying');
                            return;
                        }
                        await player.gainMaxHp(-del);
                    }
                    player.setStorage("lit_mengying_neg", player.getStorage("lit_mengying"));
                },
                sub: true,
                sourceSkill: 'lit_mengying',
            }
        },
    },
    lit_yinren: {
        usable: 1,
        forceDie: true,
        locked: false,
        mod: {
            cardUsable(card, player, num) {
                if (card.name === "sha" && card.storage.lit_yinren) {
                    return true;
                }
            },
        },
        hiddenCard(player, name) {
            if (name === "sha") return true;
        },

        enable: ["chooseToUse", "chooseToRespond"],
        filter: (event, player) => {
            let filter = event.filterCard ?? (() => true);
            if (filter(get.autoViewAs({ name: "sha", isCard: true, storage: { lit_yinren: true } }), player, event)) {
                return true;
            }
        },
        filterTarget(card, player, target) {
            if (get.event().name === "chooseToRespond") return false;
            return player.canUse({ name: "sha", isCard: true, storage: { lit_yinren: true } }, target, false);
        },
        selectTarget(card, player, target) {
            if (get.event().name === "chooseToRespond") return -1;
            return 1;
        },
        async content(event, noTrigger, player) {
            const target = event.target;
            await player.loseHp();
            if (event.getParent(2).name === "chooseToRespond") {
                event.untrigger();
                event.set("responded", true);
                event.result = { bool: true, card: { name: "sha", isCard: true, storage: { lit_yinren: true } } };
                return;
            }
            await player.useCard({ name: "sha", isCard: true, storage: { lit_yinren: true } }, target, false).set("forceDie", true);
            if (player.hasHistory("sourceDamage", (evt) => {
                let card = evt.card;
                if (!card || card.name != "sha") return false;
                let evtx = evt.getParent("useCard");
                return evtx.card === card && evtx.getParent() === event;
            })) await player.recover();
        },
        ai: {
            order() {
                return get.order({ name: "sha" }) - 0.3;
            },
            respondSha: true,
            skillTagFilter(player, tag, arg) {
                if (tag === "respondSha") return player.hp > 1;
            },
            result: {// 已知chooseToRespond的时候AI不会使用result来计算，以后再改吧
                player: (player, target) => {
                    let divAtt = Math.abs(get.attitude(player, player)) ?? 5;
                    let res = get.effect(player, { name: "losehp", isCard: true }, player, player) / divAtt;
                    if (!target || get.event().name === "chooseToRespond") return res;
                    if (!target.mayHaveShan() || player.hasSkillTag("directHit_ai")) {
                        if (player.hp > 1 || player.canSave(player)) return 0;
                        return res / 2;
                    }
                    return res;
                },
                target: (player, target) => {
                    if (player.hp <= 1 && !player.canSave(player)) return 0;
                    if (!target || get.event().name === "chooseToRespond") return 0;
                    let divAtt = Math.abs(get.attitude(target, target)) ?? 5;
                    return get.effect(target, {
                        name: "sha",
                        isCard: true,
                        storage: { lit_yinren: true }
                    }, player, target) / divAtt;
                },
            },
        },
    },
    lit_fumeng: {
        utils: {
            shouldUse(player) {
                return game.hasPlayer(current => current.maxHp > 1
                    && get.attitude(player, current) < 0
                    && lib.skill.lit_fumeng.utils.targetScore(player, current) > 0);
            },
            targetScore(player, target) {
                if (!target || target.maxHp <= 1) return 0;
                let loseNum = Math.max(target.maxHp - target.hp, 1);
                let divAtt = Math.abs(get.attitude(target, target)) || 5;
                let loseHpEffect = (target.maxHp > 1 && target.maxHp === target.hp)
                    ? (get.effect(target, { name: "losehp" }, player, target) / divAtt)
                    : 0;
                let result = get.sgn(loseHpEffect) * Math.sqrt(Math.abs(loseHpEffect));
                if (target.hasSkill('lit_mianju') || target.hasSkill('lit_mianjuV2')) {
                    let count = target.countMark('lit_mianju') + target.countMark('lit_mianjuV2');
                    if (count <= target.maxHp && count > target.maxHp - loseNum) {
                        return (target.maxHp - loseNum) * 2 + result;
                    }
                }
                return -loseNum + result;
            },
        },
        usable: 1,
        enable: "phaseUse",
        derivation: "lit_mengying",
        filter: () => {
            return game.hasPlayer(function (current) {
                return current.maxHp > 1;
            });
        },
        filterTarget: (card, player, target) => {
            return target.maxHp > 1;
        },
        async content(event, trigger, player) {
            let target = event.target;
            if (!target.hasSkill('lit_mengying')) await target.addSkills('lit_mengying');

            let last = target.getStorage("lit_mengying", 0);
            let loseNum = Math.max(target.maxHp - target.hp, 1);
            target.setStorage("lit_mengying", last + loseNum, true);
            await target.useSkill('lit_mengying_neg');
        },
        ai: {
            order: (item, player) => {
                if (!lib.skill.lit_fumeng.utils.shouldUse(player)) return -1;
                if (game.hasPlayer(current => get.attitude(player, current) < 0 && current.hp === current.maxHp && current.maxHp > 1)) return 10;
                return 1;
            },
            expose: 0.3,
            result: {
                target: (player, target) => {
                    return lib.skill.lit_fumeng.utils.targetScore(player, target);
                },
            },
        },
    },
};

export const translate = {
    'lit_hupan胡畔': "胡畔",
    'lit_hupan_chara': "决心", 'lit_cuiruo': "脆弱",
    'lit_cuiruo_info': `回合结束阶段，若你不为满体力，你可以摸${X}张牌，然后将体力值调整至${X}（${X}为你已损失的体力值）`,
    'lit_shichou': "誓仇",
    'lit_shichou_info': `锁定技，当你受到伤害后，伤害来源获得“誓”标记；当你体力值为1时，你对所有带“誓”标记的角色造成${Y}点伤害，然后移除所有“誓”标记（${Y}为其体力值与护甲值之和-1）`,
    'lit_yigou': "异构",
    'lit_yigou_info': `限定技，令他人获得1点体力上限，你获得${get.poptip("lit_fenhua")}`,
    'lit_fenhua': "分化",
    'lit_fenhua_info': `转换技，失去1点体力，<li>阳：视为使用或打出一张无距离和次数限制的【杀】，若此杀造成伤害，你恢复1点体力；</li><li>阴：令体力上限>1的1人${get.poptip("lit_mengying")}层数+Z（Z为其已损失体力且至少为1）</li>`,
    /*负面效果*/'lit_mengying': "梦萦",
    'lit_mengying_info': "负面效果，每层临时减少1点体力上限，每恢复1点体力减少1层",
    'lit_yinren_info': "每回合限1次，需使用或打出杀时可-1血视为使用无距离和次数限制的杀，若造成伤害+1血",
    'lit_fumeng_info': `出牌限1次，选择体力上限>1的1人令其${get.poptip('lit_mengying')}层数+${Z}（${Z}为其已损失的血量且至少为1）`,
    'lit_shengjihp': "升级·胡畔",
    'lit_shengjihp_info': `失去1点体力上限，获得：${get.poptip('lit_yigou')}`,
};

export const simpleTranslate = {
    'lit_cuiruo_info': `回合结束若不为满血可+${X}牌并将体力调至${X}（${X}为已失去的体力）`,
    'lit_shichou_info': `锁；受伤后伤害源获得“誓”，血=1时对所有带“誓”者造成${Y}点伤害，并移除所有“誓”（${Y}为其血+护甲-1）`,
    'lit_yigou_info': `限；令他人+1体力上限，你获得${get.poptip("lit_fenhua")}`,
    'lit_fenhua_info': `转；-1血，<li>阳：视为使用或打出无距离和次数限制的杀，若造成伤害则+1血；</li><li>阴：令体力上限>1的1人${get.poptip("lit_mengying")}层数+Z（Z为其已损失体力且至少为1）</li>`,
    'lit_mengying_info': "负面；每层临时-1体力上限，每+1血-1层",
    'lit_yinren_info': "每回合限1次，需使用或打出杀时可-1血视为使用无距离和次数限制的杀，若造成伤害+1血",
    'lit_fumeng_info': `出牌限1次，选择体力上限>1的1人令其${get.poptip('lit_mengying')}层数+${Z}（${Z}为其已损失的血量且至少为1）`,
    'lit_shengjihp_info': `-1体力上限，获得：${get.poptip('lit_yigou')}`,
};

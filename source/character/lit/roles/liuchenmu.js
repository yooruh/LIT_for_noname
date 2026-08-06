import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';

export const sort = 'ybs';
export const title = `辅助·干扰·${styleText('y', "中")}`;
export const intro = `干扰对手，辅助队友造成伤害或者为其提供补益（如杀、桃、无中生有等），对付${B("刘晨沐")}时需注意好牌后出`
    + `<li>主公：在${get.poptip("lit_jijin")}的加持下开局可以盲杀，如果能造成伤害，下一张杀就没法杀你；如果血量比较低，回合外可以先不用技能，在别人吃桃或无中生有时再用`
    + "<li>忠臣、反贼：看队友的主要输出牌是什么，例如靠【杀】打伤害的，就可以帮他加【杀】的目标，从而最大化收益。借敌人的输出灭残血、让敌方互拆、偷桃、吊卡、无中生有等都是常规操作。此外，可以参考主公的玩法，杀对面来换取己方关键队友的防御"
    + `<li>内奸：前期嫖别人的补益牌来发育，到主内单挑的时候，"贯石斧"会是你的好朋友，主公一旦${get.poptip("lit_shouji")}，就很难再杀到你了`;

export const character = {
    'lit_liuchenmu刘晨沐': {
        sex: "male",
        group: "three",
        hp: 3,
        skills: ["lit_shengjilcm", "lit_gufeng", "lit_jijin"],
    },
};

export const skill = {
    lit_gufeng: {
        derivation: 'lit_gufeng_append',
        trigger: {
            global: "useCardToTarget",
        },
        filter: (event, player) => {
            if (player.hasSkill('lit_gufeng_done')) return false;
            if (["equip", "delay"].includes(get.type(event.card))) return false;
            return game.hasPlayer(function (current) {
                return !event.targets.includes(current) && lib.filter.targetEnabled2(event.card, event.player, current);
            });
        },
        silent: true,
        locked: false,
        async content(event, trigger, player) {
            const result = await player.chooseTarget(get.prompt("lit_gufeng"), `为 ${get.translation(trigger.card)} 增加1个目标`, (card, player, target) => {
                let trigger = get.event().getTrigger();
                return !trigger.targets.includes(target) && lib.filter.targetEnabled2(trigger.card, trigger.player, target);
            }).set("ai", target => {
                let trigger = get.event().getTrigger();
                return get.effect(target, trigger.card, trigger.player, get.event().player);
            }).forResult();
            if (result.bool) {
                if (!event.isMine() && !event.isOnline()) game.delayx();
                event.target = result.targets[0];
                if (!player.hasSkill('lit_gufeng_done')) player.addTempSkill("lit_gufeng_done", { global: "phaseAfter" });
                await player.logSkill("lit_gufeng", event.target, "fire");
                trigger.player.line(event.target);
                trigger.targets.add(event.target);
            }
        },
        ai: {
            threaten: 1.2,
            expose: 0.2,
        },
        subSkill: {
            done: {
                charlotte: true,
                sub: true,
                sourceSkill: "lit_gufeng",
            },
        },
    },
    lit_jijin: {
        derivation: 'lit_shouji',
        forced: true,
        trigger: {
            global: "damageEnd",
        },
        filter: (event, player) => {
            if (event.source !== player) return false;
            if (!event.player.isAlive()) return false;
            return event.card && get.name(event.card) === "sha";
        },
        async content(event, trigger, player) {
            await trigger.player.addSkills('lit_shouji');
            trigger.player.setStorage("lit_shouji", 1, true);
        },
        ai: {
            threaten: 1.5,
        },
    },
    lit_jijinV2: {
        inherit: 'lit_jijin',
        init: (player) => {
            if (player.hasSkill('lit_jijin')) player.removeSkill('lit_jijin');
        },
        async content(event, trigger, player) {
            await trigger.player.addSkills('lit_shouji');
            let count = trigger.player.getStorage("lit_shouji", 0);
            trigger.player.setStorage("lit_shouji", count + trigger.num, true);
        },
        group: "lit_jijinV2_extra",
        subSkill: {
            extra: {
                trigger: { player: "useCard1" },
                filter(event, player) {
                    return event.card.name === "sha" && event.targets && event.targets.some(t => t.hasSkill("lit_shouji", null, false, true));
                },
                forced: true,
                charlotte: true,
                popup: false,
                firstDo: true,
                content() {
                    if (trigger.addCount !== false) {
                        trigger.addCount = false;
                        const stat = player.getStat().card;
                        if (typeof stat[trigger.card.name] === "number") {
                            stat[trigger.card.name]--;
                        }
                    }
                },
                sub: true,
                sourceSkill: "lit_jijinV2",
            },
        },
    },
    lit_shouji: {
        lit_neg: 2,
        derivation: "lit_negClear_faq",
        mark: true,
        marktext: "激",
        intro: {
            name: "受激",
            content: "下张杀的目标必定含你（还要再激#下）",
        },
        init: function (player) {
            player.setStorage("lit_shouji", 0);
        },
        ai: {
            neg: true,
        },
        global: 'lit_shouji_global',
        group: 'lit_negClear',
        subSkill: {
            global: {
                charlotte: true,
                mod: {
                    targetEnabled: (card, player, target) => {
                        if (get.name(card) === 'sha' && game.hasPlayer(current => {
                            return current.hasSkill('lit_shouji', null, false, true);
                        })) {
                            return target.hasSkill('lit_shouji', null, false, true);
                        }
                    },
                    targetInRange: (card, player, target) => {
                        if (get.name(card) === 'sha' && game.hasPlayer(current => {
                            return current.hasSkill('lit_shouji', null, false, true);
                        })) {
                            return target.hasSkill('lit_shouji', null, false, true);
                        }
                    },
                },
                trigger: {
                    player: 'useCardToTarget',
                },
                firstDo: true,
                silent: true,
                forceDie: true,
                filter: (event) => {
                    return event.card.name === 'sha' && game.hasPlayer(current => {
                        return current.hasSkill('lit_shouji', null, false, true);
                    });
                },
                async content(event, trigger, player) {
                    // 当心引用陷阱，这里需要对trigger.targets原地修改
                    trigger.targets.length = 0;
                    game.countPlayer(async current => {
                        if (current.hasSkill('lit_shouji', null, false, true)) {
                            trigger.targets.add(current);
                            let count = current.getStorage("lit_shouji", 0);
                            current.setStorage("lit_shouji", count - 1);
                            if (count - 1 <= 0) current.removeSkill('lit_shouji');
                            await current.logSkill('lit_shouji', null, false, true);
                        }
                    });
                    player.line(trigger.targets);
                },
                ai: {
                    shaRelated: true,
                    effect: {
                        player(card, player, target) {
                            if (card.name === 'sha' && !lib.lit.effLock['lit_shouji']) {// 累了，以后有机会再来处理AI死循环吧
                                let eff = [1, 0, 0, 0], targets = [];
                                game.countPlayer(current => {
                                    if (current.hasSkill('lit_shouji', null, false, true)) targets.push(current);
                                });
                                if (targets.length === 0) return;
                                if (!targets.includes(target)) return "zeroplayertarget";

                                lib.lit.effLock['lit_shouji'] = true;
                                targets.forEach((target) => {
                                    let divAtt = Math.abs(get.attitude(player, target)) ?? 5;
                                    eff[1] += get.effect(target, { name: "sha" }, player, player) / divAtt;
                                })
                                delete lib.lit.effLock['lit_shouji'];

                                return eff;
                            }
                        },
                    },
                },
                sub: true,
                sourceSkill: 'lit_jijin',
            },
        },
    },
};

export const translate = {
    'lit_liuchenmu刘晨沐': "刘晨沐",
    'lit_gufeng': "古风",
    'lit_gufeng_info': `每回合限一次，当其他角色使用${get.poptip("lit_exDelayEquipCard")}指定目标后，你可以为此牌增加一个目标`,
    'lit_jijin': "激进",
    'lit_jijin_info': `锁定技，当你使用【杀】造成伤害后，你令受伤者获得${get.poptip('lit_shouji')}`,
    'lit_jijinV2': "激进V2",
    'lit_jijinV2_info': `锁定技，当你使用【杀】造成伤害后，你令受伤者获得${get.poptip('lit_shouji')}，造成的伤害越高，受激叠层越多，你对受激者使用的杀不计入出杀次数`,
	/*负面效果*/'lit_shouji': "受激",
    'lit_shouji_info': "负面效果，下一名使用【杀】的角色强制选择你为目标（无视距离）",
    'lit_shengjilcm': "升级·刘晨沐",
    'lit_shengjilcm_info': `${get.poptip('lit_jijinV2')} 获得并修改〖激进〗：你造成的伤害越高，受激叠层越多，你对受激者使用的杀不计入出杀次数。`,
};

export const simpleTranslate = {
    'lit_gufeng_info': "每回合限1次，有人用牌指定目标后可添加1个目标",
    'lit_jijin_info': `锁；杀造成伤害后令受伤者获得${get.poptip('lit_shouji')}`,
    'lit_jijinV2_info': `V2 锁；杀造成伤害后令受伤者获得${get.poptip('lit_shouji')}，伤害越高叠层越多，对受激者的杀不计入次数`,
    'lit_shouji_info': "负面；下个用杀者强制选择你为目标（无视距离）",
    'lit_shengjilcm_info': `${get.poptip('lit_jijinV2')} 获得并修改"受激"：伤害越高，受激叠层越多，对受激者的杀不计入次数`,
};

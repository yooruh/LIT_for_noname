import { lib, game, ui, get, ai, _status } from '../../../../../../noname.js';
import { Styled } from '../../../tool/basic.js';
const X = Styled('b', 'X'), Y = Styled('p', 'Y'), Z = Styled('y', 'Z');

export const character = {
    'lit_wuxiaoqi伍小戚': {
        sex: "male",
        group: "three",
        hp: 4,
        skills: ["lit_shengjiwxq", "lit_shencaocao", "lit_jiwa", "lit_mianju"],
    },
};

export const skill = {
    // 伍小戚
    lit_shencaocao: {
        nobracket: true,
        enable: "phaseUse",
        usable: 1,
        async content(event, trigger, player) {
            event.targets = game.filterPlayer(current => {
                return current !== player;
            }).sortBySeat();
            await game.asyncDraw(event.targets);
            await player.turnOver();

            if (player.hasMark("lit_mianjuV2")) {
                player.removeMark("lit_mianjuV2", 1);
                if (!player.hasMark('lit_mianjuV2') && player.hasSkill("lit_mianjuV2")) {
                    await player.logSkill("lit_mianjuV2");
                    await player.useSkill("lit_mianjuV2_remove");
                }
                await player.recover();
            } else if (player.hasMark("lit_mianju")) {
                player.removeMark("lit_mianju", 1);
                if (!player.hasMark("lit_mianju") && player.hasSkill("lit_mianju")) {
                    await player.logSkill("lit_mianju");
                    await player.useSkill("lit_mianju_remove");
                }
                await player.recover();
            }
        },
        ai: {
            order: 1,
            threaten: 0.8,
            result: {
                player: (player) => {
                    if (player.countMark("lit_mianju") === 1 || player.countMark("lit_mianjuV2") === 1) return 0;
                    if (player.isMinCard()) return 1;
                    if (!player.hasMark("lit_mianju") && !player.hasMark("lit_mianjuV2")) return 3 - player.countCards('h');
                    return get.recoverEffect(player, player, player) + (player.isTurnedOver() ? 2 : -1) + (player.hasMark("dongjie") && !player.isTurnedOver() ? get.effect(player, { name: "losehp" }) : 0);
                },
                target: 1,
            },
        },
    },
    lit_jiwa: {
        direct: true,
        locked: false,
        trigger: {
            player: "turnOverEnd",
        },
        async content(event, trigger, player) {
            const result = await player.chooseTarget(2, get.prompt('lit_jiwa'), '交换2人手牌').set("ai", target => {
                var player = get.event().player;
                const list = [];
                const players = game.filterPlayer();
                if (ui.selected.targets.length === 0) {
                    if (player.countCards('hs') === 0) return target === player;
                    for (let i = 0; i < players.length; i++) {
                        if (get.attitude(player, players[i]) > 0 && !players[i].hasSkillTag('nogain') && !list.includes(players[i].countCards("h"))) {
                            list.push(players[i].countCards("h"));
                        }
                    }
                    list.sort((a, b) => a - b);
                    return get.attitude(player, target) > 0 && target.countCards("h") === list[0];
                } else {
                    const from = ui.selected.targets[0];
                    for (let i = 0; i < players.length; i++) {
                        if (get.attitude(player, players[i]) < 1 && !players[i].hasSkillTag('noh') && !list.includes(players[i].countCards("h"))) {
                            list.push(players[i].countCards("h"));
                        }
                    }
                    list.sort((a, b) => b - a);
                    return from.countCards("h") <= list[0] && get.attitude(player, target) < 1 && target.countCards("h") === list[0];
                }
            }).set("complexTarget", true).forResult();
            if (result.bool) {
                event.forceDie = true;
                await player.logSkill('lit_jiwa');
                await result.targets[0].swapHandcards(result.targets[1]).set("forceDie", true);
            }
        },
        ai: {
            pretao: true,
            nokeep: true,
            order: 1,
            expose: 0.2,
            threaten: 2.5,
            skillTagFilter(player, tag, arg) {
                if (tag === "pretao" || tag === "nokeep") return !player.isMaxHandcard();
            },
            result: {
                player: 1,
            },
            combo: "lit_shencaocao",
        },
    },
    lit_mianju: {
        derivation: ['lit_xiaochou', 'lit_mianju_faq'],
        locked: true,
        mark: true,
        marktext: "面",
        intro: {
            name: "面具",
            content: (storage, player) => {
                return `距离伍还差${storage + 1}层面具`;
            },
        },
        init: (player) => {
            // 游戏开始后获得技能时
            if (game.roundNumber === 0) return;
            if (player.countMark('lit_mianju') < 4) player.addMark('lit_mianju', 4);
            player.markSkill('lit_mianju');
        },
        ai: {
            save: true,
            threaten: 0.6,
            skillTagFilter(player, tag, arg) {
                if (tag === "save") return arg && arg.player === player;
            },
        },
        group: ['lit_mianju_start', 'lit_mianju_dying'],
        subSkill: {
            start: {
                forced: true,
                popup: false,
                trigger: {
                    global: "gameStart",
                    player: ["revive", "showCharacterAfter"],
                },
                filter: (event, player) => {
                    return event.name !== "showCharacter" || !player.getStorage("lit_mianju_start", false);
                },
                async content(event, trigger, player) {
                    if (!player.hasSkill('lit_mianju')) return;
                    player.setStorage("lit_mianju_start", true);
                    if (player.countMark('lit_mianju') < 4) player.addMark('lit_mianju', 4 - player.countMark('lit_mianju'));
                    player.markSkill('lit_mianju');
                },
                sub: true,
                sourceSkill: "lit_mianju",
            },
            dying: {
                trigger: {
                    player: "dying",
                },
                forced: true,
                async content(event, trigger, player) {
                    let i = player.maxHp - player.hp;
                    let j = player.countMark('lit_mianju');
                    if (i > 0) await player.recover(i);
                    if (Math.min(i, j) > 0) player.removeMark('lit_mianju', Math.min(i, j));
                    if (!player.hasMark('lit_mianju')) await player.useSkill("lit_mianju_remove");
                },
                sub: true,
                sourceSkill: "lit_mianju",
            },
            remove: {
                direct: true,
                async content(event, trigger, player) {
                    await player.removeSkills('lit_mianju');
                    await player.addSkills('lit_xiaochou');
                },
                sub: true,
                sourceSkill: "lit_mianju",
            },
        },
    },
    lit_mianjuV2: {
        inherit: 'lit_mianju',
        derivation: ['lit_xiaochouV2', 'lit_mianju_faq'],
        init: (player) => {
            if (player.hasSkill('lit_mianju')) {
                player.clearMark('lit_mianjuV2');
                if (player.hasMark('lit_mianju')) player.addMark('lit_mianjuV2', player.countMark('lit_mianju'), false);
                player.clearMark('lit_mianju');
                player.removeSkill('lit_mianju');
            } else {
                if (player.countMark('lit_mianjuV2') < 4) player.addMark('lit_mianjuV2', 4);
                player.markSkill('lit_mianjuV2');
            }
        },
        locked: true,
        marktext: "面",
        intro: {
            name: "面具",
            content: (storage, player) => {
                return `距离伍还差${storage + 1}层面具`;
            },
        },
        ai: {
            save: true,
            threaten: 0.6,
            skillTagFilter(player, tag, arg) {
                if (tag === "save") return arg && arg.player === player;
            },
        },
        group: ['lit_mianjuV2_start', 'lit_mianjuV2_dying'],
        subSkill: {
            start: {
                forced: true,
                popup: false,
                trigger: {
                    global: "gameStart",
                    player: ["revive", "showCharacterAfter"],
                },
                filter: (event, player) => {
                    return event.name !== "showCharacter" || !player.getStorage("lit_mianjuV2_start", false);
                },
                async content(event, trigger, player) {
                    if (!player.hasSkill('lit_mianjuV2')) return;
                    player.setStorage("lit_mianjuV2_start", true);
                    if (player.countMark('lit_mianjuV2') < 4) player.addMark('lit_mianjuV2', 4);
                    player.markSkill('lit_mianjuV2');
                },
                sub: true,
                sourceSkill: "lit_mianjuV2",
            },
            dying: {
                trigger: {
                    player: "dying",
                },
                forced: true,
                async content(event, trigger, player) {
                    let i = player.maxHp - player.hp;
                    let j = player.countMark('lit_mianjuV2');
                    if (i > 0) await player.recover(i);
                    if (Math.min(i, j) > 0) player.removeMark('lit_mianjuV2', Math.min(i, j));
                    if (!player.hasMark('lit_mianjuV2')) await player.useSkill("lit_mianjuV2_remove");
                },
                sub: true,
                sourceSkill: "lit_mianjuV2",
            },
            remove: {
                direct: true,
                async content(event, trigger, player) {
                    await player.removeSkills('lit_mianjuV2');
                    await player.addSkills('lit_xiaochouV2');
                },
                sub: true,
                sourceSkill: "lit_mianjuV2",
            },
        },
    },
    lit_xiaochou: {
        mark: true,
        marktext: "丑",
        intro: {
            name: "小丑",
            content: "距离伍永远差1层面具",
        },
        trigger: {
            player: "die",
        },
        forced: true,
        forceDie: true,
        filter: (event) => {
            return event.source?.isAlive();
        },
        logTarget: "source",
        skillAnimation: true,
        animationColor: "thunder",
        async content(event, trigger, player) {
            await trigger.source.discard(trigger.source.getCards("h"));
        },
        ai: {
            threaten: 0.7,
        },
    },
    lit_xiaochouV2: {
        inherit: 'lit_xiaochou',
        init: (player) => {
            if (player.hasSkill('lit_xiaochou')) player.removeSkill('lit_xiaochou');
        },
        async content(event, trigger, player) {
            await trigger.source.discard(trigger.source.getCards("he"));
        },
    },
};

export const translate = {
'lit_wuxiaoqi伍小戚': "伍小戚",
    'lit_shencaocao': "神曹操",
    'lit_shencaocao_info': "出牌阶段限一次，令其他角色各摸一张牌，然后你翻面并移去1枚“面”，若成功移去1枚“面”，你恢复1点体力",
    'lit_jiwa': "鸡娃",
    'lit_jiwa_info': "当你翻面后，你可以交换两名角色的手牌",
    'lit_mianju': "面具",
    'lit_mianju_info': `锁定技，游戏开始或复活时，你获得4枚“面”；你每次濒死后，恢复体力至上限并移除等量的“面”；“面”耗尽时，你失去此技能并获得${get.poptip('lit_xiaochou')}`,
    'lit_mianju_faq': '关于“面具”数量：',
    'lit_xiaochou': "小丑",
    'lit_xiaochou_info': "锁定技，当你死亡后，伤害来源弃置所有手牌",
    'lit_shencaocao_info': "出牌限1次，其他人各摸1牌，你翻面并-1“面”，若成功-1“面”则+1血，",
    'lit_jiwa_info': "翻面后可交换2人手牌",
    'lit_mianju_info': `锁；起始获4“面”，每次濒死后回满血并移除等量“面”，“面”耗尽时失去此技能并获得${get.poptip('lit_xiaochou')}`,
    'lit_xiaochou_info': "锁；死后令伤害来源失去所有手牌",
};

export const simpleTranslate = {
    'lit_shencaocao_info': "出牌限1次，其他人各摸1牌，你翻面并-1“面”，若成功-1“面”则+1血，",
    'lit_jiwa_info': "翻面后可交换2人手牌",
    'lit_mianju_info': `锁；起始获4“面”，每次濒死后回满血并移除等量“面”，“面”耗尽时失去此技能并获得${get.poptip('lit_xiaochou')}`,
    'lit_xiaochou_info': "锁；死后令伤害来源失去所有手牌",
};

import { lib, game, ui, get, ai, _status } from '../../../../../../noname.js';
import { Styled } from '../../../tool/basic.js';
const X = Styled('b', 'X'), Y = Styled('p', 'Y'), Z = Styled('y', 'Z');

export const character = {
    'lit_qbQb': {
        sex: "male",
        group: "three",
        hp: 4,
        skills: ["lit_shengjiqb", "lit_33", "lit_qiantui", "lit_tianna"],
        isZhugong: true,
    },
};

export const skill = {
    lit_33: {
        derivation: ['lit_qianfan', 'lit_kuanshu'],
        // audio: "lit_33_use",
        // audioname: ["lit_Qb"],
        unique: true,
        zhuSkill: true,
        ai: {
            combo: "lit_qiantui",
        },
        global: "lit_33_use",
        subSkill: {
            use: {
                enable: "phaseUse",
                delay: false,
                line: true,
                log: false,
                prepare(cards, player, targets) {
                    targets[0].logSkill("lit_33");
                },
                prompt() {
                    let player = get.event().player;
                    let list = game.filterPlayer((target) => {
                        return target !== player && target.hasZhuSkill("lit_33", player) && !target.hasSkill("lit_33_used");
                    });
                    let str1 = list.length > 1 ? "中的一人" : "";
                    let str2 = list.length > 1 ? "根据体力值是否大于3，失去/恢复1点体力" : (list[0].hp > 3 ? "失去1点体力" : "恢复1点体力");
                    return `可选择${get.translation(list)}${str1}，受到来自其的1点伤害，然后其${str2}`;
                },
                filter(event, player) {
                    if (!lib.lit.isSameGroup(player, 'three')) return false;
                    return game.hasPlayer((target) => {
                        return target !== player && target.hasZhuSkill("lit_33", player) && !target.hasSkill("lit_33_used");
                    });
                },
                filterTarget(card, player, target) {
                    return target !== player && target.hasZhuSkill("lit_33", player) && !target.hasSkill("lit_33_used");
                },
                async content(event, trigger, player) {
                    let target = event.target;
                    await player.damage().set('source', target);
                    if (target.hp > 3) await target.loseHp();
                    else await target.recover(player);
                    target.addTempSkill("lit_33_used", "phaseUseEnd");
                },
                ai: {
                    order: 10,
                    result: {
                        target: (player, target) => {// 专门为胡畔写一笔
                            if (get.attitude(player, target) > 0) {
                                if (player.hasSkill('lit_shichou')) return -4;
                                if (player.hp === 1 && !player.canSave(player)) return -3;
                            }
                            let divAtt = Math.abs(get.attitude(target, target)) ?? 5;
                            if (target.hp > 3) return get.effect(target, { name: "losehp" }, target, target) / divAtt;
                            return 1;
                        },
                        player: (player, target) => {
                            let divAtt = Math.abs(get.attitude(player, player)) ?? 5;
                            return get.damageEffect(player, target, player) / divAtt;
                        },
                    },
                },
                sub: true,
                sourceSkill: "lit_33",
            },
            used: {
                charlotte: true,
                sub: true,
                sourceSkill: "lit_33",
            },
        },
    },
    lit_tianna: {
        forced: true,
        trigger: { source: 'damageAfter' },
        filter: (event, player) => {
            return _status.currentPhase !== player || player.countCards('hs');
        },
        async content(event, trigger, player) {
            if (_status.currentPhase !== player) await player.draw();
            else {
                await player.recover();
                if (player.countCards('h') <= 0) return;

                // 显示“确定”，避免误触
                await player.chooseToDiscard("【天呐】", 'h', '回合内造成伤害后，恢复1点体力并弃置1张手牌', true, card => {
                    return ui.selected.cards.length < 1;
                }).set("selectCard", () => {
                    if (ui.selected.cards.length < 1) return [1, 1];
                    return [1, Infinity];
                }).set("complexCard", true);
            }
        },
        ai: {
            threaten: 1.3,
            effect: {
                player(card, player, target) {
                    if (get.tag(card, "damage")) {
                        let using = player.isPhaseUsing();
                        if (!using) return [1, 2];
                        if (!player.countDiscardableCards('h')) return;
                        if (target === player) {
                            if (player.hasSkill("lit_qiantui") && player.hp === 4) return 1;
                            return [1, -1];
                        }
                        if (player.hp < player.maxHp) return [1, 1];
                    }
                },
            },
        },
    },
    lit_tiannaV2: {
        priority: -333,
        group: 'lit_tianna',
        forced: true,
        init: (player) => {
            if (player.hasSkill('lit_tianna')) player.removeSkill('lit_tianna');
        },
        trigger: { player: 'damageBegin4' },
        filter: (event, player) => {
            return player.hp > 1 && event.num >= player.hp;
        },
        async content(event, trigger, player) {
            trigger.cancel();
            await player.loseHp(player.hp - 1);
        },
    },
    lit_qiantui: {
        derivation: ['lit_qianfan', 'lit_kuanshu'],
        trigger: {
            player: ['changeHp', 'loseMaxHpAfter'],
        },
        line: "red",
        filter: (event, player) => {
            let num = event.name === 'changeHp' ? event.num : -event.loseHp;
            if (num === 0) return false;
            return get.sgn(player.hp - 3.5) < 0 && get.sgn(player.hp - 3.5 - num) > 0 && game.hasPlayer(target => {
                return !target.hasSkill("lit_kuanshu", null, false, true) && !target.hasSkill("lit_qianfan");
            });
        },
        async cost(event, trigger, player) {
            event.result = await player.chooseTarget(get.prompt('lit_qiantui'), '遣返1人，其跳过下一回合', (card, player, target) => {
                return !target.hasSkill("lit_kuanshu", null, false, true) && !target.hasSkill("lit_qianfan");
            }).set("ai", (target) => {
                let att = get.attitude(get.event().player, target);
                if (att) return att < 0;
            }).forResult();
        },
        async content(event, trigger, player) {
            let target = event.targets[0];
            target.addSkillLog('lit_qianfan');
        },
        ai: {
            maihp: true,
            maixie: true,
            maixie_hp: true,
            threaten: (player, target) => {
                if (target.hp > 4) return 0.9;
                if (target.hp === 4) return 0.6;
                return 1.2;
            },
            result: {
                target: (player, target) => {
                    return get.result({ name: 'lit_qianfanpai' }).target(player, target);
                },
            },
            effect: {
                target(card, player, target) {
                    if (get.tag(card, "loseHp") || get.tag(card, "damage")) {
                        if (target.hp <= 3) return;
                        let enemy = game.countPlayer(current => get.attitude(target, current) < 0 && !current.hasSkill('lit_qianfan') && !current.hasSkill('lit_kuanshu', null, false, true));
                        if (enemy === 0) return;
                        if (!target.hasFriend() && player !== target) return;
                        if (get.attitude(target, player) > 0) {
                            if (target.hp === 4) return [1, 2.5];
                            if (target !== player || !target.hasSkill("lit_tianna") || _status.currentPhase !== target) return [1, 0.5];
                            return [1, -0.5];
                        }
                        let res = player.hasSkill('lit_qianfan') || player.hasSkill('lit_kuanshu', null, false, true) || enemy === 0 ? 0 : get.result({ name: 'lit_qianfanpai' }).target(target, player) / enemy;
                        if (target.hp === 4) return [1, 0, 0, res];
                    }
                },
            },
            skillTagFilter(player, tag, arg) {
                if (player.hp <= 3) {
                    if (["maihp", "maixie", "maixie_hp"].includes(tag)) return false;
                }
            },
        },
    },
    lit_qianfan: {
        derivation: ['lit_kuanshu', 'lit_negClear_faq'],
        lit_neg: 1,
        forced: true,
        firstDo: true,
        mark: true,
        marktext: "遣",
        intro: {
            name: "被遣返",
            content: '正在收拾东西，马上回家',
        },
        trigger: { player: "phaseBefore" },
        filter: (event, player) => {
            return event.player.hasSkill('lit_qianfan', null, false, true);
        },
        onremove: (player) => {
            player.addSkill('lit_kuanshu');
        },
        async content(event, trigger, player) {
            trigger.cancel();
            game.log(player, "被遣返离校，跳过了本回合");
            player.removeSkill("lit_qianfan");
        },
        ai: {
            neg: true,
        },
        group: 'lit_negClear',
    },
    lit_kuanshu: {
        mark: true,
        marktext: "恕",
        intro: {
            content: '祂这次会原谅你',
        },
        forced: true,
        trigger: { player: "phaseBeforeStart" },
        async content(event, trigger, player) {
            player.removeSkill("lit_kuanshu");
        },
    },
};

export const translate = {
'lit_qbQb': "Qb",
    'lit_tianna': "天呐",
    'lit_tianna_info': "锁定技，当你造成伤害后，若于回合外，你摸一张牌；若于回合内，你恢复1点体力，然后弃置一张手牌",
    'lit_qiantui': "遣退",
    'lit_qiantui_info': `当你的体力值由3以上减至3或以下时，你可以令一名不带有${get.poptip('lit_kuanshu')}的角色获得${get.poptip('lit_qianfan')}`,
	/*负面效果*/'lit_qianfan': "遣返",
    'lit_qianfan_info': `负面效果，你跳过下回合，并获得${get.poptip('lit_kuanshu')}，〖宽恕〗在下回合开始前失效`,
    'lit_kuanshu': "宽恕",
    'lit_kuanshu_info': "锁定技，你不会被遣返",
    'lit_shichou': "誓仇",
    'lit_shichou_info': `锁定技，当你受到伤害后，伤害来源获得“誓”标记；当你体力值为1时，你对所有带“誓”标记的角色造成${Y}点伤害，然后移除所有“誓”标记（${Y}为其体力值与护甲值之和-1）`,
    'lit_tianna_info': "锁；造伤后，回合外+1牌，回合内+1血-1手牌",
    'lit_qiantui_info': `血由3以上掉到3及以下时，可令不带有${get.poptip('lit_kuanshu')}的1人获得${get.poptip('lit_qianfan')}`,
    'lit_qianfan_info': `负面；跳过下回合并获得${get.poptip('lit_kuanshu')}，宽恕在下回合开始前失效`,
    'lit_kuanshu_info': "锁；本次不会被遣返",
    'lit_shichou_info': `锁；受伤后伤害源获得“誓”，血=1时对所有带“誓”者造成${Y}点伤害，并移除所有“誓”（${Y}为其血+护甲-1）`,
};

export const simpleTranslate = {
    'lit_tianna_info': "锁；造伤后，回合外+1牌，回合内+1血-1手牌",
    'lit_qiantui_info': `血由3以上掉到3及以下时，可令不带有${get.poptip('lit_kuanshu')}的1人获得${get.poptip('lit_qianfan')}`,
    'lit_qianfan_info': `负面；跳过下回合并获得${get.poptip('lit_kuanshu')}，宽恕在下回合开始前失效`,
    'lit_kuanshu_info': "锁；本次不会被遣返",
    'lit_shichou_info': `锁；受伤后伤害源获得“誓”，血=1时对所有带“誓”者造成${Y}点伤害，并移除所有“誓”（${Y}为其血+护甲-1）`,
};

import { lib, game, ui, get, ai, _status, X, Y, Z, Styled, B } from '../shared.js';

export const sort = 'ybs';
export const title = `卖血·控人·${Styled('y', "中")}`;
export const intro = `前期被防御类和爆发类克制，防御类让${B("Qb")}不容易发动${get.poptip("lit_tianna")}回血，爆发类容易让${B("Qb")}血量回不上来。后期升级后有名刀，而且有机会收残血，只要${B("Qb")}有伤害牌，回血难度会降一些。`
    + "<li>主公：建议适当屯牌，不一定回满血，只要保证不会被一套带走，就可以留牌用于在回合内造成伤害。毕竟你还可以让你的“忠臣”们自愿给你献血，前期没那么容易死的"
    + "<li>反贼：血量上限更低，回合外要尽可能保证满血。多与队友配合，最好间隔一轮卖血控不同的人，压制对面的配合"
    + "<li>忠臣、内奸：跟主公和反贼差不多，不过要优先针对威胁最大的敌方，保证主公生存要紧";
export const perfectPair = ['lit_zigao自高', 'lit_hujunwei胡峻玮'];

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
        utils: {
            targetValue(player, target) {
                if (!player || !target) return 0;
                if (get.attitude(player, target) > 0) { // 专门为胡畔的「誓仇」写一笔
                    if (player.hasSkill('lit_shichou')) return -4;
                    if (player.hp === 1 && !player.canSave(player)) return -3;
                }
                let divAtt = Math.abs(get.attitude(target, target)) ?? 5;
                let selfLoss = get.damageEffect(player, target, player) / (Math.abs(get.attitude(player, player)) ?? 5);
                let targetChange = target.hp > 3 ? get.effect(target, { name: "losehp" }, target, target) / divAtt : 1;
                let qiantuiFollow = 0;
                if (target.hasSkill('lit_qiantui') || target.hasSkill('lit_tianna')) qiantuiFollow += 0.5;
                return targetChange - selfLoss + qiantuiFollow;
            },
        },
        derivation: ['lit_qianfan', 'lit_kuanshu'],
        // audio: "lit_33_use",
        // audioname: ["lit_Qb"],
        unique: true,
        zhuSkill: true,
        preHidden: true,
        ai: {
            combo: "lit_qiantui",
            effect: {
                target(card, player, target) {
                    if (!target.hasZhuSkill || !target.hasZhuSkill("lit_33", player)) return;
                    if (!get.tag(card, "damage") && !get.tag(card, "loseHp")) return;
                    if (target.hasSkill('lit_qiantui') && target.hp > 3) return [1, 0.8];
                },
            },
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
                        target: (player, target) => {
                            return lib.skill.lit_33.utils.targetValue(player, target);
                        },
                        player: (player, target) => {
                            let divAtt = Math.abs(get.attitude(player, player)) ?? 5;
                            return get.damageEffect(player, target, player) / divAtt;
                        },
                    },
                    effect: {
                        target(card, player, target) {
                            if (!get.tag(card, "damage") && !get.tag(card, "loseHp")) return;
                            if (target.hp > 3 && target.hasSkill('lit_qiantui')) return [1, 0.8];
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
                if (att >= 0) return 0;
                let base = get.result({ name: 'lit_qianfanpai' }).target(get.event().player, target);
                if (target.hasSkill('lit_kuanshu', null, false, true) || target.hasSkill('lit_qianfan')) return 0;
                return Math.max(0, -att + base);
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
    'lit_33': "33",
    'lit_33_info': "主公技，其他“叁”势力角色可在出牌阶段发动一次，其受到来自你的1点伤害，然后若你：<li>体力值>3，失去1点体力；</li><li>体力值≤3，恢复1点体力</li>",
    'lit_33_2': "33",
    'lit_33_3': "33",
    'lit_tianna': "天呐",
    'lit_tianna_info': "锁定技，当你造成伤害后，若于回合外，你摸一张牌；若于回合内，你恢复1点体力，然后弃置一张手牌",
    'lit_tiannaV2': "天呐V2",
    'lit_tiannaV2_info': "锁定技，当你造成伤害后，若于回合外，你摸一张牌；若于回合内，你恢复1点体力，然后弃置一张手牌；当你体力值大于1点且受到伤害时，若此伤害会使你体力值小于1，则防止此伤害并将体力值减至1",
    'lit_qiantui': "遣退",
    'lit_qiantui_info': `当你的体力值由3以上减至3或以下时，你可以令一名不带有${get.poptip('lit_kuanshu')}的角色获得${get.poptip('lit_qianfan')}`,
	/*负面效果*/'lit_qianfan': "遣返",
    'lit_qianfan_info': `负面效果，你跳过下回合，并获得${get.poptip('lit_kuanshu')}，〖宽恕〗在下回合开始前失效`,
    'lit_kuanshu': "宽恕",
    'lit_kuanshu_info': "锁定技，你不会被遣返",

    'lit_shengjiqb': "升级·Qb",
    'lit_shengjiqb_info': `${get.poptip('lit_tiannaV2')} 获得〖天呐〗并于末尾增加：当你体力值大于1且受到伤害时，若此伤害会使你体力值小于1，则防止此伤害并将体力值减至1`,
};

export const simpleTranslate = {
    'lit_33_info': "主；其余“叁”势力每回合可发动1次，其受来自你的1伤，然后你：<li>血>3时-1血</li><li>血<=3时+1血</li>",
    'lit_tianna_info': "锁；造伤后，回合外+1牌，回合内+1血-1手牌",
    'lit_tiannaV2_info': "V2 锁；造伤后，回合外+1牌，回合内+1血-1手牌；>1血时，受伤若会使血<1则免伤且血掉至1",
    'lit_qiantui_info': `血由3以上掉到3及以下时，可令不带有${get.poptip('lit_kuanshu')}的1人获得${get.poptip('lit_qianfan')}`,
    'lit_qianfan_info': `负面；跳过下回合并获得${get.poptip('lit_kuanshu')}，宽恕在下回合开始前失效`,
    'lit_kuanshu_info': "锁；本次不会被遣返",
    'lit_shengjiqb_info': `${get.poptip('lit_tiannaV2')} 获得“天呐”并于末尾增加：>1血受伤时若此伤害会使血<1，免伤且血掉至1`,
};

export const dynamicTranslate = {
    lit_tiannaV2(player) {
        return `锁；造伤后，回合外+1牌，回合内+1血-1手牌`;
    },
    lit_33(player) {
        let group = lib.lit.isGuozhanKeyEnabled() ? '叁/键' : '叁';
        return `主；其余“${group}”势力每回合可发动1次，其受来自你的1伤，然后你：<li>血>3时-1血</li><li>血<=3时+1血</li>`;
    },
};

export const pinyins = {
'Qb': ['3', '3'],
    '升级·Qb': ['shēng', 'jí', '·', '3', '3'],
};

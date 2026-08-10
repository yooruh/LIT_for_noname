import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';

export const sort = 'ybs';
export const title = `过牌·回血·爆发·${styleText('b', "较易")}`;
export const intro = `每回合群体回血+制衡的收益很恐怖，因此跟${B("郑墨翰")}打消耗战很不现实，留点属性牌利用铁索打暴击通常比较好。对${B("郑墨翰")}自己而言，`
    + `专门控状态打爆发收益不一定高，${get.poptip("lit_jianren")}更多是个保下限的技能`
    + "<li>主公：利用加血活命，即便拖到主内对决都不慌，只要对面不是强命斩杀将，单挑问题不大"
    + "<li>忠臣、反贼：横置控场，血低时择机打爆发。如果确信伤害能中，即便是给对面先回1点血都不一定亏"
    + "<li>内奸：利用制衡屯牌，不要轻易掉血，后期就是主公打法";

export const character = {
    'lit_zhengmohan郑墨翰': {
        sex: "male",
        group: "three",
        hp: 4,
        skills: ["lit_shengjizmh", "lit_mensao", "lit_jianren"],
    },
};

export const skill = {
    lit_mensao: {
        utils: {
            evaluate(player) {
                let linkedRecover = 0, linkedBad = 0, linkedGood = 0;
                game.countPlayer(current => {
                    if (!current.isLinked()) return;
                    const eff = get.recoverEffect(current, player, player);
                    linkedRecover += eff;
                    if (eff < 0) linkedBad++;
                    else if (eff > 0) linkedGood++;
                });
                return { linkedRecover, linkedBad, linkedGood };
            },
            shouldUse(player) {
                const { linkedRecover, linkedBad, linkedGood } = lib.skill.lit_mensao.utils.evaluate(player);
                if (linkedBad > 0 && linkedGood === 0) return false;
                return linkedRecover >= 0 || linkedGood > 0 || player.countCards('h') > player.hp;
            },
        },
        usable: 1,
        hiddenCard(player, name) {
            return name === "tiesuo" && player.countCards("hes") > 0;
        },
        enable: "chooseToUse",
        check(card) {
            let player = get.event().player, targets = [];
            let use = (() => {
                game.countPlayer(current => {
                    if (current.isLinked()) targets.push(current);
                });
                if (targets.length === 0) return 1;
                let res = [0, 0, 0];// [总收益, 负收益数, 正收益数]
                for (let i in targets) {
                    let eff = get.recoverEffect(targets[i], player, player);
                    if (eff < 0) res[1] += 1;
                    else if (eff > 0) res[2] += 1;
                    res[0] += eff;
                }
                if (res[1] > 0 && res[2] === 0) return 0;
                return res[1] > 2 ? res[0] : 1;
            })();
            if (use < 0) return;
            if (get.position(card) == "e") {
                let subs = get.subtypes(card);
                if (subs.includes("equip2") || subs.includes("equip3")) {
                    return player.getHp() - get.value(card);
                }
            }
            return 6 - get.value(card);
        },
        filter: (event, player) => {
            if (player.countCards("hes") === 0) return false;
            return event.type === "phase" || event.filterCard(get.autoViewAs({ name: "tiesuo" }, "unsure"), player, event);
        },
        position: "hes",
        selectCard: [1, Infinity],
        filterCard(card, player, event) {
            if (!event) event = _status.event;
            if (event.type === "phase" && get.position(card) != "s" && lib.filter.canBeDiscarded(card, player, player)) {
                return true;
            } else {
                if (game.checkMod(card, player, "unchanged", "cardEnabled2", player) === false) return false;
                const cardx = get.autoViewAs({ name: "tiesuo" }, [card]);
                return event._backup.filterCard(cardx, player, event);
            }
        },
        filterTarget(fuck, player, target) {
            const card = ui.selected.cards[0],
                event = _status.event,
                backup = event._backup;
            if (!card || game.checkMod(card, player, "unchanged", "cardEnabled2", player) === false) return false;
            const cardx = get.autoViewAs({ name: "tiesuo" }, [card]);
            return backup.filterCard(cardx, player, event) && backup.filterTarget(cardx, player, target);
        },
        selectTarget() {
            const card = ui.selected.cards[0],
                event = _status.event,
                player = event.player,
                backup = event._backup;
            let recast = false,
                use = false;
            const cardx = get.autoViewAs({ name: "tiesuo" }, [card]);
            if (event.type === "phase" && player.canRecast(card)) recast = true;
            if (game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false) {
                if (backup.filterCard(cardx, player, event)) use = true;
            }
            if (!use) return [0, 0];
            else {
                const select = backup.selectTarget(cardx, player);
                if (recast && select[0] > 0) select[0] = 0;
                return select;
            }
        },
        filterOk() {
            const card = ui.selected.cards[0],
                event = _status.event,
                player = event.player,
                backup = event._backup;
            const selected = ui.selected.targets.length;
            let use = false;
            const cardx = get.autoViewAs({ name: "tiesuo" }, [card]);
            if (game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false) {
                if (backup.filterCard(cardx, player, event)) use = true;
            }
            if (event.type === "phase" && selected === 0) return true;
            if (use) {
                const select = backup.selectTarget(cardx, player);
                if (select[0] <= -1) return true;
                return selected >= select[0] && selected <= select[1];
            }
        },
        discard: false,
        lose: false,
        delay: false,
        async precontent(event, trigger, player) {
            const result = event.result;
            if (result.targets.length > 0) { // 修改result的card，走card分支避免发动skill的“重铸”效果
                result.card = get.autoViewAs({ name: "tiesuo" }, result.cards);
            }
        },
        async content(event, trigger, player) {
            await player.discard(event.cards);
            await player.draw(event.cards.length);
        },
        group: 'lit_mensao_after',
        ai: {
            order: (item, player) => {
                if (!lib.skill.lit_mensao.utils.shouldUse(player)) return -1;
                return 7.5;
            },
            expose: 0.3,
            threaten: 0.8,
            result: {
                player: (player) => {
                    const { linkedRecover, linkedBad, linkedGood } = lib.skill.lit_mensao.utils.evaluate(player);
                    if (linkedBad > 0 && linkedGood === 0) return -1;
                    return linkedRecover + (player.countCards('h') > player.hp ? 0.8 : 0);
                },
                target: (player, target) => {
                    if (!target) return;
                    let res = get.recoverEffect(target, player, target);
                    return target.isLinked() ? -res : res + get.effect(target, { name: 'tiesuo' }, player, target);
                },
            },
        },
        subSkill: {
            after: {
                silent: true,
                trigger: { player: ["useSkillAfter", "useCardAfter"] },
                filter: (event, player) => {
                    return event.skill === "lit_mensao";
                },
                async content(event, trigger, player) {
                    if (trigger.name === "useCard" && trigger.cards?.length) await player.draw(trigger.cards.length);
                    game.countPlayer(async current => {
                        if (current.isLinked()) await current.recover();
                    });
                },
                sub: true,
                sourceSkill: "lit_mensao",
            },
        },
    },
    lit_jianren: {
        forced: true,
        trigger: {
            source: 'damageBegin1',
        },
        filter: (event, player) => {
            if (player.hp >= event.player.hp) return false;
            if (event.notLink()) return true;
            // 只有传导源未触发此技能时，才对满足条件的横置角色触发
            const damageTrigger = event.getParent(4);
            const histories = player.getHistory('useSkill', e => e.skill === 'lit_jianren');
            return !histories.find(history => history.event.getParent(2) === damageTrigger);
        },
        async content(event, trigger, player) {
            trigger.num++;
        },
        ai: {
            threaten: (player, target) => {
                if (player.hp > target.hp) return 1.5;
                return 0.7;
            },
            damageBonus: true,
            skillTagFilter: (player, tag, arg) => {
                if (tag === "damageBonus") {
                    return player.hp < arg?.target?.hp;
                }
            },
        },
        group: 'lit_jianren_draw',
        subSkill: {
            draw: {
                forced: true,
                trigger: {
                    source: 'damageAfter',
                },
                filter: (event, player) => {
                    return player.countCards('h') < event.player.countCards('h');
                },
                async content(event, trigger, player) {
                    await player.draw();
                },
                sub: true,
                sourceSkill: "lit_jianren",
            },
        },
    },
    lit_jianrenV2: {
        inherit: 'lit_jianren',
        init: (player) => {
            if (player.hasSkill('lit_jianren')) player.removeSkill('lit_jianren');
        },
        filter: (event, player) => {
            if (player.hp >= event.player.hp) return false;
            if (event.notLink()) return true;
            // 只有传导源未触发此技能时，才对满足条件的横置角色触发
            const damageTrigger = event.getParent(4);
            const histories = player.getHistory('useSkill', e => e.skill === 'lit_jianrenV2');
            return !histories.find(history => history.event.getParent(2) === damageTrigger);
        },
        ai: {
            threaten: (player, target) => {
                if (player.hp > target.hp) return 1.5;
                return 0.7;
            },
            damageBonus: true,
            skillTagFilter: (player, tag, arg) => {
                if (tag === "damageBonus") {
                    return player.hp < arg?.target?.hp || player.isLinked() && game.hasNature(arg?.card);
                }
            },
        },
        group: ['lit_jianrenV2_linked', 'lit_jianrenV2_draw'],
        subSkill: {
            linked: {
                forced: true,
                trigger: {
                    source: 'damageBegin1',
                },
                filter: (event, player) => {
                    if (!player.isLinked()) return false;
                    if (!event.hasNature("linked")) return false;
                    if (event.notLink()) return true;
                    // 只有传导源未触发此技能时，才对满足条件的横置角色触发
                    const damageTrigger = event.getParent(4);
                    const histories = player.getHistory('useSkill', e => e.skill === 'lit_jianrenV2_linked');
                    return !histories.find(history => history.event.getParent(2) === damageTrigger);
                },
                async content(event, trigger, player) {
                    trigger.num++;
                },
                sub: true,
                sourceSkill: "lit_jianrenV2",
            },
            draw: {
                inherit: 'lit_jianren_draw',
                sourceSkill: "lit_jianrenV2",
            },
        },
    },
    lit_rennai: {
        // todo 先看看平衡性再说
    },
};

export const translate = {
    'lit_zhengmohan郑墨翰': "郑墨翰",
    'lit_mensao': "闷骚",
    'lit_mensao_info': "出牌阶段限一次，你可以将任意张牌当【铁索连环】使用或弃置之，然后摸等量的牌并令所有横置的角色恢复1点体力",
    'lit_jianren': "坚韧",
    'lit_jianren_info': "锁定技，当你对体力值大于你的角色造成伤害时，此伤害+1；当你对手牌数大于你的角色造成伤害后，你摸一张牌",
    'lit_jianrenV2': "坚韧V2",
    'lit_jianrenV2_info': "锁定技，当你对体力值大于你的角色造成伤害时，此伤害+1；当你对手牌数大于你的角色造成伤害后，你摸一张牌；当你横置时，属性伤害+1",
    'lit_rennai': "忍耐",
    'lit_rennai_info': "当你受到横置传导的伤害后，你可以横置任意名角色",
    'lit_shengjizmh': "升级·郑墨翰",
    'lit_shengjizmh_info': `${get.poptip('lit_jianrenV2')} 获得〖坚韧〗并于末尾增加：当你横置时，属性伤害+1`,
};

export const simpleTranslate = {
    'lit_mensao_info': "出牌限1次，将任意张牌作铁索连环使用或弃置，然后摸等量牌并令场上横置者+1血",
    'lit_jianren_info': "锁；对血更多者伤害+1，伤害手牌更多者后摸1牌",
    'lit_jianrenV2_info': "V2 锁；对血更多者伤害+1，伤害手牌更多者后摸1牌，横置时属性伤+1",
    'lit_rennai_info': "受横置传导伤害后可横置任意数量角色",
    'lit_shengjizmh_info': `${get.poptip('lit_jianrenV2')} 获得“坚韧”并于末尾增加：横置时属性伤+1`,
};

import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';

export const sort = 'sdp';
export const title = `双形态·${styleText('o', "破而后立")}`;
export const intro = `${B("雨桐")}通过${get.poptip("lit_qiwei")}互换体力、以${get.poptip("lit_qiongyin")}换取体力上限与手牌，死亡时由${get.poptip("lit_pobi")}破壁化身为隐藏形态「${get.poptip("lit_zhongyutong钟雨桐")}」。`
    + "<li>主公：优先用跫音喂大上限、赤心保持全场最高，濒死破壁后转为隐藏形态提供全场上限收益"
    + "<li>忠臣、反贼：歧威可替濒死队友承伤，破壁作为保命底牌，注意保留到关键时刻"
    + "<li>内奸：破壁的变身与耀变核弹是后期单挑的翻盘资本";

export const character = {
    'lit_yutong雨桐': {
        sex: "female",
        group: "three",
        hp: 4,
        skills: ["lit_shengjiyt", "lit_qiwei", "lit_qiongyin", "lit_pobi"],
    },
};

export const skill = {
    lit_qiwei: {
        trigger: {
            global: ['loseHpAfter', 'dying'],
        },
        filter(event, player) {
            const target = event.player;
            if (target === player || !target.isIn()) return false;
            if (player.hp === target.hp) return false;
            if (event.name === 'dying') return !target.hasSkill('lit_qiwei_used');
            return target.hp > 0;
        },
        async cost(event, trigger, player) {
            const target = trigger.player;
            const dying = trigger.name === 'dying';
            const result = await player.chooseBool(
                `歧威：${get.translation(target)}${dying ? '正在濒死' : '失去体力后'}，是否将体力值（${player.hp}↔${target.hp}）与其互换？${dying ? '' : '（若你因此回血将失去1点体力上限）'}`
            ).set('ai', () => {
                if (dying) return get.attitude(player, target) > 0;
                if (get.attitude(player, target) < 0) return target.hp > player.hp;
                return get.attitude(player, target) > 0 && target.hp < player.hp;
            }).forResult();
            event.result = { bool: result.bool };
        },
        async content(event, trigger, player) {
            const target = trigger.player;
            if (!target.isIn()) return;
            const delta = target.hp - player.hp;
            await target.changeHp(-delta);
            await player.changeHp(delta);
            if (trigger.name === 'dying') target.addTempSkill('lit_qiwei_used', 'roundStart');
            if (delta > 0) await player.loseMaxHp();
        },
    },
    lit_qiongyin: {
        trigger: {
            global: 'phaseEnd',
        },
        filter(event, player) {
            return event.player !== player && event.player.isIn() && event.player.hp > 1;
        },
        async cost(event, trigger, player) {
            const target = trigger.player;
            const x = target.hp - 1;
            const result = await target.chooseBool(
                `跫音：是否失去${x}点体力至1点，令${get.translation(player)}判定？（红：其+${x}点体力上限并摸${x}张牌；黑：其恢复${x}点体力）`
            ).set('ai', () => {
                return get.attitude(target, player) > 0;
            }).forResult();
            event.result = { bool: result.bool, cost_data: { target, x } };
        },
        async content(event, trigger, player) {
            const { target, x } = event.cost_data;
            if (!target || !target.isIn() || x <= 0) return;
            await target.loseHp(x);
            const result = await player.judge();
            const suit = result.card ? get.suit(result.card) : '';
            if (suit === 'heart' || suit === 'diamond') {
                await player.gainMaxHp(x);
                await player.draw(x);
            } else {
                await player.changeHp(x);
            }
        },
    },
    lit_pobi: {
        forced: true,
        juexingji: true,
        skillAnimation: true,
        animationColor: "water",
        mark: true,
        marktext: "壁",
        intro: {
            name: "破壁",
            content: "死亡前：给其他所有人的判定区置入一张虚拟遣返牌，取消此次死亡，更换角色牌为“钟雨桐”，体力重置为新角色牌值，体力上限保留",
        },
        trigger: { player: 'dieBefore' },
        async content(event, trigger, player) {
            for (const other of game.filterPlayer(p => p !== player)) {
                if (!other.hasJudge('lit_qianfanpai')) {
                    await other.addJudge({ name: 'lit_qianfanpai' });
                }
            }
            player.awakenSkill('lit_pobi');
            trigger.cancel();
            const targetName = (get.mode() === 'guozhan' && lib.character['gz_lit_zhongyutong钟雨桐'])
                ? 'gz_lit_zhongyutong钟雨桐' : 'lit_zhongyutong钟雨桐';
            await player.reinit(player.name, targetName, [Math.min(3, player.maxHp), player.maxHp]);
            if (player.hasSkill('lit_chixin')) player.addSkill('lit_chixin');
            if (!player.hasSkill('lit_chixin') && player.skills.some(e => lib.lit.isShengjiSkill(e)) && !player.hasSkill('lit_shengji')) {
                player.addSkill('lit_shengji');
            }
        },
    },
};

export const translate = {
    'lit_yutong雨桐': "雨桐",
    'lit_qiwei': "歧威",
    'lit_qiwei_info': "他人失去体力后，或其每回合第一次进入濒死状态时，若你的体力值与其不同，你可以将体力值与其互换。若你因此回血，你失去一点体力上限",
    'lit_qiongyin': "跫音",
    'lit_qiongyin_info': "他人的结束阶段，其可失去体力至一点，然后令你判定：①为红，你+x点体力上限并摸x张牌；②为黑，你+x点体力（x为其因此失去的体力）",
    'lit_pobi': "破壁",
    'lit_pobi_info': "觉醒技，你死亡前，给其他所有人的判定区置入一张虚拟的遣返牌，然后你取消此次死亡，并更换角色牌为“钟雨桐”，同时重置你的体力为新角色牌的值，但不重置体力上限",
};

export const simpleTranslate = {
    'lit_qiwei_info': "他人失去体力后/每回合首次濒死时，可互换体力；你回血则-1上限",
    'lit_qiongyin_info': "他人结束阶段可-体力至1，令你判定：红+上限+摸牌；黑回血",
    'lit_pobi_info': "觉醒；死亡前全员判定区置遣返，取消死亡，换牌为“钟雨桐”，保留上限",
};

import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';

export const sort = 'sdp';
export const title = `复活·双形态·${styleText('o', "较难")}`;
export const intro = `${B("雨桐")}通过${get.poptip("lit_qiqi")}互换体力保队友，再利用队友通过${get.poptip("lit_qiongyin")}换取体力上限，死亡时由${get.poptip("lit_pobi")}化身为隐藏形态「${get.poptip("lit_zhongyutong钟雨桐")}」。`
    + "<li>主公：优先用跫音喂大上限，维持高血量状态，破壁不期望打核爆，主要用于复活甲"
    + "<li>忠臣：歧戚可替濒死队友承伤，触发破壁后影响力减半，但能辅助队友的护甲"
    + "<li>反贼：自身嘲讽视情况而定，如果条件允许，可以和队友配合打破壁核爆"
    + `<li>内奸：破壁的变身能帮助你活到后期，耀变核弹能收割残血，最后利用${get.poptip("lit_chuanshuoV2")}的多回合进行单挑`;

export const character = {
    'lit_yutong雨桐': {
        sex: "female",
        group: "three",
        hp: 4,
        skills: ["lit_shengjiyt", "lit_qiqi", "lit_qiongyin", "lit_pobi"],
    },
};

export const skill = {
    lit_qiqi: {
        trigger: {
            global: ['loseHpAfter', 'dying'],
        },
        filter(event, player) {
            const target = event.player;
            if (target === player || !target.isIn()) return false;
            if (player.hp === target.hp) return false;
            if (event.name === 'dying') return !target.hasSkill('lit_qiqi_used');
            return target.hp > 0;
        },
        async cost(event, trigger, player) {
            const target = trigger.player;
            const dying = trigger.name === 'dying';
            const result = await player.chooseBool(
                `歧戚：${get.translation(target)}${dying ? '正在濒死' : '失去体力'}，是否将体力值与其互换？${player.hp > target.hp ? '' : '（你将失去1点体力上限）'}`
                + `<li>你的体力值（${player.hp}↔${target.hp}）</li><li>${get.translation(target)}的体力值（${target.hp}↔${player.hp}）</li>`
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
            if (delta > 0) {
                await target.loseHp(delta);
                await player.recover(delta);
                await player.loseMaxHp();
            } else if (delta < 0) {
                await target.recover(-delta);
                await player.loseHp(-delta);
            }
            if (trigger.name === 'dying') target.addTempSkill('lit_qiqi_used', 'roundStart');
        },
        subSkill: {
            used: {
                charlotte: true,
                sub: true,
                sourceSkill: 'lit_qiqi',
            },
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
            if (player.hasSkill('lit_chixin')) {
                player.addSkill('lit_chixin');
                player.removeSkill('lit_shengjizyt');
            } else if (player.skills.some(e => lib.lit.isShengjiSkill(e)) && !player.hasSkill('lit_shengji')) {
                player.addSkill('lit_shengji');
            }
        },
    },
};

export const translate = {
    'lit_yutong雨桐': "雨桐",
    'lit_shengjiyt': "升级·雨桐",
    'lit_shengjiyt_info': "击杀时全场获得1经验，击杀者额外获得1经验；经验达3或全场不足5人时升级，主公开局即升级；升级获得【赤心】",
    'lit_qiqi': "歧戚",
    'lit_qiqi_info': "他人失去体力后，或其每回合第一次进入濒死状态时，若你的体力值与其不同，你可以将体力值与其互换。若你因此回血，你失去一点体力上限",
    'lit_qiongyin': "跫音",
    'lit_qiongyin_info': "他人的结束阶段，其可失去体力至一点，然后令你判定：①为红，你+x点体力上限并摸x张牌；②为黑，你+x点体力（x为其因此失去的体力）",
    'lit_pobi': "破壁",
    'lit_pobi_info': "觉醒技，你死亡前，给其他所有人的判定区置入一张虚拟的遣返牌，然后你取消此次死亡，并更换角色牌为“钟雨桐”，同时重置你的体力为新角色牌的值，但不重置体力上限",
};

export const simpleTranslate = {
    'lit_qiqi_info': "他人失去体力后/每回合首次濒死时，可互换体力；你回血则-1上限",
    'lit_qiongyin_info': "他人结束阶段可-体力至1，令你判定：红+上限+摸牌；黑回血",
    'lit_pobi_info': "觉醒；死亡前全员判定区置遣返，取消死亡，换牌为“钟雨桐”，保留上限",
};

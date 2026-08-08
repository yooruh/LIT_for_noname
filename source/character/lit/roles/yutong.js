import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';
import { extensionPath } from '../../../tool/utils/paths.js';

export const sort = 'sdp';
export const title = `变身复活·补血·${styleText('o', "较难")}`;
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

export const characterSubstitute = {
    'lit_yutong雨桐': [
        ['lit_yutong_zhong', [`img:${extensionPath}/image/character/lit_zhongyutong.png`]],
    ],
};

export const skill = {
    lit_qiqi: {
        trigger: {
            global: ['loseHpAfter', 'dying'],
        },
        filter(event, player) {
            const target = event.player;
            if (!player.isIn() || !target.isIn()) return false;
            if (player.hp === target.hp) return false;
            return !target.hasSkill('lit_qiqi_used');
        },
        async cost(event, trigger, player) {
            const target = trigger.player;
            const dying = trigger.name === 'dying';
            const result = await player.chooseBool(
                `歧戚：${get.translation(target)}${dying ? '处于濒死状态' : '失去了体力'}，是否将体力值与其互换？${player.hp > target.hp ? '' : '（你将失去1点体力上限）'}`
                + `<li>你的体力值（${player.hp}→${Math.min(target.hp, player.maxHp)}）</li><li>TA的体力值（${target.hp}→${Math.min(player.hp, target.maxHp)}）</li>`
            ).set('ai', () => {
                const att = get.attitude(player, target);
                if (dying || target.hp < player.hp) return att > 0;
                const gainByExchange = 0
                    + get.effect(target, { name: "losehp" }, player, player)
                    + get.effect(player, { name: "recover" }, player, player) / 3.3;
                return gainByExchange;
            }).forResult();
            event.result = { bool: result.bool };
        },
        async content(event, trigger, player) {
            const target = trigger.player;
            const delta = target.hp - player.hp;
            if (delta > 0) {
                await target.loseHp(delta);
                await player.recover(delta);
                await player.loseMaxHp();
            } else if (delta < 0) {
                await target.recover(-delta);
                await player.loseHp(-delta);
            }
            target.addTempSkill('lit_qiqi_used');
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
                `跫音：是否失去${x}点体力至1点，令${get.translation(player)}判定？<li>红：其+${x}点体力上限并摸${x}张牌</li><li>黑：其恢复${x}点体力</li>`
            ).set('ai', () => {
                return get.attitude(target, player) > 0;
            }).forResult();
            event.result = { bool: result.bool, cost_data: { x } };
        },
        async content(event, trigger, player) {
            const { x } = event.cost_data;
            await trigger.player.loseHp(x);
            const result = await player.judge(card => {
                if (get.color(card) === "red") return 3;
                return 3.5 - player.hp + Math.min(x, player.maxHp - player.hp);
            }).forResult();

            const { color } = result;
            if (color === 'red') {
                await player.gainMaxHp(x);
                await player.draw(x);
            } else {
                await player.changeHp(x);
            }
        },
    },
    lit_pobi: {
        silent: true,
        juexingji: true,
        mark: true,
        marktext: "壁",
        intro: {
            name: "破壁",
            content: `死亡前：取消此次死亡，给其他所有人的判定区置入一张虚拟${get.poptip("lit_qianfanpai")}，更换角色牌为“钟雨桐”，体力重置为新角色牌值，体力上限保留`,
        },
        trigger: { player: 'dieBefore' },
        async content(event, trigger, player) {
            player.changeSkin(event.name, "lit_yutong_zhong");
            trigger.cancel();
            await event.trigger("lit_trigger_pobi_use");
        },
        group: "lit_pobi_main",
        subSkill: {
            main: {
                forced: true,
                juexingji: true,
                skillAnimation: true,
                animationStr: "破壁",
                animationColor: "water",
                trigger: { player: 'lit_trigger_pobi_use' },
                async content(event, trigger, player) {
                    player.awakenSkill('lit_pobi');
                    // 加遣返牌
                    for (const other of game.filterPlayer(p => p !== player)) {
                        if (!other.hasJudge('lit_qianfanpai')) {
                            await other.addJudge({ name: 'lit_qianfanpai' });
                        }
                    }
                    // 保留前角色的数据
                    const shengji = {
                        done: player.hasSkill("lit_chixin"),
                        count: player.countMark('lit_shengji') ?? 0,
                    };
                    const targetName = (get.mode() === 'guozhan' && lib.character['gz_lit_zhongyutong钟雨桐'])
                        ? 'gz_lit_zhongyutong钟雨桐' : 'lit_zhongyutong钟雨桐';
                    game.log(player, "将自己的角色牌变更为了", targetName);
                    await player.reinit(player.name, targetName, [Math.min(lib.character[targetName].hp, player.maxHp), player.maxHp]);
                    await player.changeGroup('one', false);
                    if (shengji.done) {
                        player.addSkill('lit_chixin');
                        player.removeSkill('lit_shengjizyt');
                    }
                    if (player.hasSkill("lit_shengji")) player.setMark('lit_shengji', shengji.count);

                    // 手动触发 enterGame，让传说等入场技生效
                    await game.triggerEnter(player);
                },
                sub: true,
                sourceSkill: "lit_pobi",
            },
        },
    },
};

export const translate = {
    'lit_yutong雨桐': "雨桐",
    'lit_qiqi': "歧戚",
    'lit_qiqi_info': "每回合每人限1次，他人失去体力后，或其濒死时，若你的体力值与其不同，你可以将体力值与其互换。若你因此回血，你失去1点体力上限",
    'lit_qiongyin': "跫音",
    'lit_qiongyin_info': "他人的结束阶段，其可失去体力至1点，令你判定：<br>①为红，你+x点体力上限并摸x张牌；<br>②为黑，你+x点体力（x为其因此失去的体力）",
    'lit_pobi': "破壁",
    'lit_pobi_info': `觉醒技，你死亡前，取消此次死亡，给其他所有人的判定区置入一张虚拟的遣返牌。你更换角色牌为${get.poptip("lit_zhongyutong钟雨桐")}，重置体力为新角色牌的值，但不重置体力上限`,
    'lit_shengjiyt': "升级·雨桐",
    'lit_shengjiyt_info': `获得：${get.poptip('lit_chixin')}`,
};

export const simpleTranslate = {
    'lit_qiqi_info': "每回合每人限1次，他人失去体力后/濒死时，可与其互换体力；若你回血则-1上限",
    'lit_qiongyin_info': "他人结束阶段可-x体力至1，令你判定：红，+x上限+x牌；黑，+x血",
    'lit_pobi_info': `觉；死亡前取消死亡，全员判定区置遣返，你变为${get.poptip("lit_zhongyutong钟雨桐")}，重置血量，保留上限`,
    'lit_shengjiyt_info': `获得：${get.poptip('lit_chixin')}`,
};

export const dynamicTranslate = {
    lit_pobi() {
        if (get.mode() === 'guozhan') return `觉；死亡前取消死亡，全员判定区置遣返，你变为${get.poptip("gz_lit_zhongyutong钟雨桐")}，保留上限`;
        return `觉；死亡前取消死亡，全员判定区置遣返，你变为${get.poptip("lit_zhongyutong钟雨桐")}，重置血量，保留上限`;
    }
};
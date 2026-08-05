import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';

export const sort = 'jbs';

export const character = {
    'lit_wangcan9王灿': {
        sex: "male",
        group: "nine",
        hp: 3,
        maxHp: 4,
        skills: ["lit_huoshan", "lit_renxiao", "lit_xiaoqiao"],
        groupInGuozhan: "three",
    },
};

export const skill = {
    lit_xiaoqiao: {
        mod: {
            suit: function (card, suit) {
                if (suit === 'spade') return 'heart';
            },
        },
    },
    lit_huoshan: {
        marktext: "爆",
        intro: {
            name: "火山爆发",
            content: "已准备了#重爆发",
        },
        trigger: {
            player: "phaseZhunbeiBegin",
        },
        filter: (event, player) => {
            return player.hasMark('lit_huoshan');
        },
        check(event, player) {
            return !player.hasJudge('lebu') && !player.hasJudge('lit_qianfanpai') && player.countMark('lit_huoshan') > 0;
        },
        async cost(event, trigger, player) {
            let num = player.countMark('lit_huoshan');
            const { control } = await player.chooseControl(`本回合增加${num}点伤害`, `恢复${num}点体力`)
                .set('prompt', `火山：可移去所有的“爆”，然后选择一项`)
                .set('ai', () => {
                    const player = get.event().player;
                    const num = get.event().num;
                    if (player.hp <= 1) return '恢复体力';
                    if (player.isDamaged() && !player.hasCard(card => get.tag(card, 'damage'), 'h') && player.hp + num <= player.maxHp + 1) return '恢复体力';
                    return '增加伤害';
                })
                .set('num', num)
                .forResult();
            event.result = {
                bool: true,
                cost_data: { control: control, num: num },
            };
        },
        async content(event, trigger, player) {
            const control = event.cost_data.control;
            let num = event.cost_data.num;
            player.clearMark('lit_huoshan');
            await player.draw(num);
            if (control === '增加伤害') {
                player.addTempSkill('lit_huoshan_damage', 'phaseJieshuBegin');
                player.setStorage('lit_huoshan_damage', num);
            } else if (control === '恢复体力') {
                await player.recover(num);
            }
        },
        group: "lit_huoshan_judge",
        subSkill: {
            judge: {
                locked: true,
                trigger: {
                    player: "phaseJieshuBegin",
                },
                forced: true,
                async content(event, trigger, player) {
                    const result = await player.judge((card) => {
                        if (get.suit(card) === 'heart') return 1;
                        return -0.5;
                    }).forResult();
                    if (result.judge > 0) {
                        player.addMark('lit_huoshan', 1);
                    }
                },
                sub: true,
                sourceSkill: "lit_huoshan",
            },
            damage: {
                forced: true,
                trigger: {
                    source: "damageBegin1",
                },
                filter: (event, player) => {
                    if (!player.getStorage("lit_huoshan_damage", 0)) return false;
                    if (event.notLink()) return true;
                    // 只有传导源未触发此技能时，才对满足条件的横置角色触发
                    const damageTrigger = event.getParent(4);
                    const histories = player.getHistory('useSkill', e => e.skill === 'lit_huoshan_damage');
                    return !histories.find(history => history.event.getParent(2) === damageTrigger);
                },
                async content(event, trigger, player) {
                    trigger.num += player.getStorage("lit_huoshan_damage", 0);
                },
                ai: {
                    damageBonus: true,
                    skillTagFilter: () => true,
                },
                sub: true,
                sourceSkill: "lit_huoshan",
            },
        }
    },
    lit_renxiao: {
        trigger: {
            player: ["useCardEnd", "respondEnd"],
        },
        frequent: true,
        filter: (event, player) => {
            return event.cards.filterInD().length > 0 && !player.hasSkill('lit_renxiao_finish');
        },
        async content(event, trigger, player) {
            const result = await player.judge(card => {
                if (get.suit(card) === 'heart') return 1;
                return -0.5;
            }).set("judge2", result => result.bool).forResult();
            if (result.bool) {
                await player.gain(trigger.cards.filterInD(), 'gain2');
                player.addTempSkill('lit_renxiao_finish');
            }
        },
        subSkill: {
            finish: {
                charlotte: true,
                sub: true,
                sourceSkill: "lit_renxiao",
            },
        },
    },
};

export const translate = {
    'lit_wangcan9王灿': "9王灿",
    'lit_wangcan9王灿_prefix': "9",
    'lit_xiaoqiao': "小巧",
    'lit_xiaoqiao_info': "锁定技，你的♠️牌均视为♥️牌",
    'lit_huoshan': "火山",
    'lit_huoshan_info': `锁定技，结束阶段，你进行判定，若结果为♥️，你获得1枚"爆"。准备阶段，你可以移去所有"爆"，摸${X}张牌，然后你选择一项：<br>（1）本回合造成的伤害+${X}；<br>（2）恢复${X}点体力（${X}为你移去的"爆"数）`,
    'lit_renxiao': "人小",
    'lit_renxiao_info': `当你使用或打出牌后，你可判定，若结果为♥️，你从弃牌堆中获得此牌；${styleText('r', '以此法获得牌后，本回合不能再发动此技能')}`,
};

export const simpleTranslate = {
    'lit_xiaoqiao_info': "锁；♠️牌视作♥️牌",
    'lit_huoshan_info': `锁；结束判定为♥️获1"爆"。准备可移去所有"爆"，+${X}牌并选一项：（1）本回合伤害+${X}；（2）恢复${X}血（${X}为移去"爆"数）`,
    'lit_renxiao_info': `用牌后可判定，为♥️从弃牌堆获之；${styleText('r', '以此法获得牌后，本回合不能再发动此技能')}`,
};

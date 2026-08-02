import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';

export const sort = 'xgm';
export const title = `隐藏形态·${styleText('o', "虚构幻梦")}`;
export const intro = `${B("钟雨桐")}仅能由${get.poptip("lit_pobi")}化身登场：v1阶段全程处于背面、以${get.poptip("lit_chuanshuo")}的护甲经济反哺全场，上限足够高后由${get.poptip("lit_yaobian")}核爆并转入${get.poptip("lit_chuanshuoV2")}获得额外回合。`;

export const character = {
    'lit_zhongyutong钟雨桐': {
        sex: "female",
        group: "one",
        hp: 3,
        unseen: true,
        skills: ["lit_shengjizyt", "lit_chuanshuo", "lit_yaobian"],
    },
};

export const characterFilter = {
    'lit_zhongyutong钟雨桐': mode => mode !== 'guozhan',
};

export const skill = {
    lit_chixin: {
        forced: true,
        mark: true,
        marktext: "心",
        intro: {
            name: "赤心",
            content: "你的体力上限始终为全场最多；你的体力上限低于此值时，增加到此值",
        },
        init(player) {
            const m = Math.max(...game.players.filter(p => p.isIn()).map(p => p.maxHp));
            if (player.maxHp < m) {
                player.maxHp = m;
                player.update();
            }
        },
        trigger: {
            global: ['gainMaxHpAfter', 'loseMaxHpAfter', 'phaseAfter'],
        },
        async content(event, trigger, player) {
            const m = Math.max(...game.players.filter(p => p.isIn()).map(p => p.maxHp));
            if (player.maxHp < m) {
                player.maxHp = m;
                player.update();
            }
        },
    },
    lit_chuanshuo: {
        unique: true,
        forced: true,
        mark: true,
        marktext: "传",
        intro: {
            name: "传说",
            content: "你始终处于背面：①进入游戏时（含因更换角色牌进入游戏时）翻至背面；②你体力值每减少1点（被护盾抵消时，如果体力值不变，不触发）进行一次翻面；③你翻至正面时立刻翻至背面；④你每翻面一次后，可令1人获得2点护盾；⑤全局技：全场护盾量≥3的角色连续失去3点护盾（至护盾量小于3），每因此失去3点护盾其+1点体力上限",
        },
        init(player) {
            player.turnOver(true);
        },
        group: ['lit_chuanshuo_hp', 'lit_chuanshuo_up', 'lit_chuanshuo_shield', 'lit_chuanshuo_drain'],
        subSkill: {
            hp: {
                sub: true,
                sourceSkill: 'lit_chuanshuo',
                trigger: { player: 'changeHpAfter' },
                filter(event, player) {
                    return event.num < 0;
                },
                async content(event, trigger, player) {
                    for (let i = 0; i < Math.abs(event.num); i++) {
                        await player.turnOver();
                    }
                },
            },
            up: {
                sub: true,
                sourceSkill: 'lit_chuanshuo',
                trigger: { player: 'turnOverAfter' },
                filter(event, player) {
                    return !player.isTurnedOver();
                },
                async content(event, trigger, player) {
                    await player.turnOver(true);
                },
            },
            shield: {
                sub: true,
                sourceSkill: 'lit_chuanshuo',
                trigger: { player: 'turnOverAfter' },
                async content(event, trigger, player) {
                    if (!player.isIn()) return;
                    const result = await player.chooseTarget('传说：令1人获得2点护盾', (card, p, target) => true).set('ai', target => {
                        if (target.hujia >= 3) return 0;
                        if (target.hasSkill('lit_chixin')) return 2;
                        return get.attitude(player, target) > 0 ? 1 : -0.5;
                    }).forResult();
                    if (result.bool && result.targets[0]) {
                        await result.targets[0].changeHujia(2);
                    }
                },
            },
            drain: {
                sub: true,
                sourceSkill: 'lit_chuanshuo',
                trigger: { global: 'changeHujiaAfter' },
                filter(event, player) {
                    return event.player.hujia >= 3;
                },
                async content(event, trigger, player) {
                    const target = trigger.player;
                    await target.changeHujia(-3);
                    await target.gainMaxHp(1);
                },
            },
        },
    },
    lit_yaobian: {
        limited: true,
        unique: true,
        mark: true,
        marktext: "耀",
        intro: {
            name: "耀变",
            content: "limited",
        },
        trigger: {
            global: ['gainMaxHpAfter', 'loseMaxHpAfter'],
        },
        filter(event, player) {
            return player.maxHp > game.countPlayer();
        },
        async cost(event, trigger, player) {
            event.result = await player.chooseTarget('耀变：指定1名角色A，其他角色依次对其造成x点伤害（x为其与A体力上限差值的绝对值），随后传说改为传说v2', (card, p, target) => true).set('ai', target => {
                let total = 0;
                game.countPlayer(p => {
                    if (p !== target) total += Math.abs(p.maxHp - target.maxHp);
                });
                return total;
            }).forResult();
        },
        async content(event, trigger, player) {
            const target = event.targets[0];
            if (!target || !target.isIn()) return;
            for (const other of game.filterPlayer(p => p !== target)) {
                const dmg = Math.abs(other.maxHp - target.maxHp);
                if (dmg > 0) await target.damage(dmg, other);
            }
            await player.removeSkill('lit_chuanshuo');
            await player.addSkill('lit_chuanshuoV2');
            player.awakenSkill('lit_yaobian');
        },
    },
    lit_chuanshuoV2: {
        unique: true,
        forced: true,
        mark: true,
        marktext: "传",
        intro: {
            name: "传说V2",
            content: "①进入游戏时（含因更换角色牌进入游戏时）翻至背面；②你受到伤害后，若处于正面，翻至背面；③每轮限1次，你翻至正面时，于此回合之后获得3个额外回合",
        },
        init(player) {
            player.turnOver(true);
        },
        group: ['lit_chuanshuoV2_hp', 'lit_chuanshuoV2_turn'],
        subSkill: {
            hp: {
                sub: true,
                sourceSkill: 'lit_chuanshuoV2',
                trigger: { player: 'changeHpAfter' },
                filter(event, player) {
                    return event.num < 0 && !player.isTurnedOver();
                },
                async content(event, trigger, player) {
                    await player.turnOver(true);
                },
            },
            turn: {
                sub: true,
                sourceSkill: 'lit_chuanshuoV2',
                trigger: { player: 'turnOverAfter' },
                filter(event, player) {
                    return !player.isTurnedOver() && !player.hasSkill('lit_chuanshuoV2_used');
                },
                async content(event, trigger, player) {
                    player.addTempSkill('lit_chuanshuoV2_used', 'roundStart');
                    player.insertPhase('lit_chuanshuoV2');
                    player.insertPhase('lit_chuanshuoV2');
                    player.insertPhase('lit_chuanshuoV2');
                },
            },
        },
    },
};

export const translate = {
    'lit_zhongyutong钟雨桐': "钟雨桐",
    'lit_chixin': "赤心",
    'lit_chixin_info': "你的体力上限始终为全场最多，你的体力上限低于此值时，增加到此值",
    'lit_chuanshuo': "传说",
    'lit_chuanshuo_info': "①你进入游戏时（含因更换角色牌进入游戏时）翻至背面。②你体力值每减少1点（被护盾抵消时，如果体力值不变，不触发），进行一次翻面。③你翻至正面时，立刻翻至背面。④你每翻面一次后，可令1人获得2点护盾。⑤全局技，全场有人护盾量≥3时，其连续失去3点护盾，直至其护盾量小于3。其每因此失去了3点护盾，其+1点体力上限",
    'lit_chuanshuoV2': "传说V2",
    'lit_chuanshuoV2_info': "①你进入游戏时（含因更换角色牌进入游戏时）翻至背面。②你受到伤害后，若处于正面，翻至背面。③每轮限1次，你翻至正面时，于此回合之后获得3个额外回合",
    'lit_yaobian': "耀变",
    'lit_yaobian_info': "限定技，你增加体力上限后，若你的体力上限超过全场人数，你可指定1人A。其他角色依次对A造成x点伤害（x为其与A体力上限差值的绝对值）。然后你将“传说”改为“传说v2”",
};

export const simpleTranslate = {
    'lit_chixin_info': "锁；上限始终为全场最多，低于时增至该值",
    'lit_chuanshuo_info': "锁；始终背面：扣血翻面、翻正即翻背、每次翻面令1人+2护甲；全局：护甲≥3者-3护甲至<3，每-3其+1上限",
    'lit_chuanshuoV2_info': "锁；进局翻背；受伤且正面则翻背；每轮限1次翻至正面后获得3个额外回合",
    'lit_yaobian_info': "限；上限>人数时可指定A，其他角色依次对其造成|上限差|伤害，随后传说改v2",
};

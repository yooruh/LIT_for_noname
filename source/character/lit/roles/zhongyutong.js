import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';

export const sort = 'xghm';
export const title = `隐藏形态·护甲·核爆·${styleText('o', "较难")}`;
export const intro = `${B("钟雨桐")}仅能由${get.poptip("lit_pobi")}化身登场：v1阶段全程处于背面，以${get.poptip("lit_chuanshuo")}的护甲经济反哺全场。上限足够高后由${get.poptip("lit_yaobian")}核爆并转入${get.poptip("lit_chuanshuoV2")}获得额外回合。`;

export const character = {
    'lit_zhongyutong钟雨桐': {
        sex: "female",
        group: "one",
        hp: 3,
        isUnseen: true,
        skills: ["lit_shengjizyt", "lit_chuanshuo", "lit_yaobian"],
    },
};

export const characterFilter = {
    'lit_zhongyutong钟雨桐': mode => mode !== 'guozhan',
};

export const skill = {
    lit_chixin: {
        forced: true,
        init(player) {
            const m = Math.max(...game.players.filter(p => p.isAlive()).map(p => p.maxHp));
            if (player.maxHp < m) {
                player.gainMaxHp(m - player.maxHp);
                // 防获得上限时触发其他技能导致上限失效
                if (player.maxHp < m) {
                    player.maxHp = m;
                    player.update();
                }
            }
        },
        trigger: {
            global: ['gainMaxHpAfter', 'loseMaxHpAfter'],
        },
        filter: (event, player) => {
            const m = Math.max(...game.players.filter(p => p.isIn()).map(p => p.maxHp));
            return player.maxHp < m;
        },
        async content(event, trigger, player) {
            const m = Math.max(...game.players.filter(p => p.isIn()).map(p => p.maxHp));
            await player.gainMaxHp(m - player.maxHp);
            // 防获得上限时触发其他技能导致上限失效
            if (player.maxHp < m) {
                player.maxHp = m;
                player.update();
            }
        },
    },
    lit_chuanshuo: {
        unique: true,
        forced: true,
        trigger: {
            global: ["gameDrawBefore"],
            player: ["enterGame", "showCharacterAfter"],
        },
        filter: (event, player) => {
            return !player.isTurnedOver();
        },
        async content(event, trigger, player) {
            await player.turnOver(true);
        },
        global: 'lit_chuanshuo_drain',
        group: ['lit_chuanshuo_hp', 'lit_chuanshuo_up', 'lit_chuanshuo_shield'],
        subSkill: {
            hp: {
                forced: true,
                silent: true,
                trigger: { player: 'changeHpAfter' },
                filter(event, player) {
                    return event.num < 0;
                },
                async content(event, trigger, player) {
                    for (let i = 0; i < Math.abs(event.num); i++) {
                        await player.turnOver();
                    }
                },
                sub: true,
                sourceSkill: 'lit_chuanshuo',
            },
            up: {
                forced: true,
                trigger: { player: 'turnOverAfter' },
                filter(event, player) {
                    return !player.isTurnedOver();
                },
                async content(event, trigger, player) {
                    await game.delayx(1);
                    await player.turnOver(true);
                },
                sub: true,
                sourceSkill: 'lit_chuanshuo',
            },
            shield: {
                trigger: { player: 'changeHpAfter' },
                filter(event, player) {
                    return event.num < 0 && player.isIn();
                },
                async cost(event, trigger, player) {
                    event.result = await player.chooseTarget('传说：你翻面后，可令1人获得2点护甲', (card, p, target) => true).set('ai', target => {
                        if (get.attitude(player, target) <= 0) return -1;
                        let eff = get.attitude(player, target) / 10; // 根据亲近态度加权
                        if (player === target) eff += 1; // 对自己加权
                        if (target.hujia === 0) eff += 3; // 保护无甲友方
                        if (target.hujia > 0) {
                            eff -= 3 - target.hujia; // 护甲溢出降权
                            if (player.hasSkill('lit_chixin') && player !== target) {
                                let max = 0;
                                for (p of game.filterPlayer()) {
                                    if (max < p.maxHp) max = p.maxHp;
                                }
                                if (target.maxHp - 1 >= max) { // 联动赤心，高上限加权
                                    eff += 4 + target.maxHp - max;
                                }
                            }
                        }
                        return eff;
                    }).forResult();
                },
                async content(event, trigger, player) {
                    const target = event.targets[0];
                    await target.changeHujia(2);
                },
                sub: true,
                sourceSkill: 'lit_chuanshuo',
            },
            drain: {
                forced: true,
                init() {
                    const count = Math.floor(player.hujia / 3);
                    if (count > 0) {
                        player.changeHujia(-3 * count);
                        player.gainMaxHp(count);
                    }
                },
                trigger: { player: 'changeHujiaAfter' },
                filter(event, player) {
                    return player.hujia >= 3;
                },
                async content(event, trigger, player) {
                    const count = Math.floor(player.hujia / 3);
                    if (count > 0) {
                        await player.changeHujia(-3 * count);
                        await player.gainMaxHp(count);
                    }
                },
                sub: true,
                sourceSkill: 'lit_chuanshuo',
            },
        },
    },
    lit_chuanshuoV2: {
        inherit: "lit_chuanshuo",
        init(player) {
            if (player.hasSkill('lit_chuanshuo')) {
                player.removeSkill('lit_chuanshuo');
                return;
            }
        },
        global: undefined,
        group: ['lit_chuanshuoV2_hp', 'lit_chuanshuoV2_turn'],
        subSkill: {
            hp: {
                forced: true,
                trigger: { player: 'changeHpAfter' },
                filter(event, player) {
                    return event.num < 0 && !player.isTurnedOver();
                },
                async content(event, trigger, player) {
                    await player.turnOver(true);
                },
                sub: true,
                sourceSkill: 'lit_chuanshuoV2',
            },
            turn: {
                forced: true,
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
                sub: true,
                sourceSkill: 'lit_chuanshuoV2',
            },
            used: {
                charlotte: true,
                sub: true,
                sourceSkill: 'lit_chuanshuoV2',
            },
        },
    },
    lit_yaobian: {
        limited: true,
        animationColor: "one",
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
                let total_eff = 0;
                game.countPlayer(p => {
                    if (p !== target && p.maxHp - target.maxHp != 0) {
                        total_eff += get.effect(target, { name: "damage" }, p, player);
                    }
                });
                return total_eff > 6;
            }).forResult();
        },
        async content(event, trigger, player) {
            player.awakenSkill('lit_yaobian');
            const target = event.targets[0];
            if (!target || !target.isIn()) return;
            for (const other of game.filterPlayer(p => p !== target)) {
                const dmg = Math.abs(other.maxHp - target.maxHp);
                if (dmg > 0) await target.damage(dmg, other);
            }
            await player.addSkill('lit_chuanshuoV2');
        },
    },
};

export const translate = {
    'lit_zhongyutong钟雨桐': "钟雨桐",
    'lit_chixin': "赤心",
    'lit_chixin_info': "你的体力上限始终为全场最多，你的体力上限低于此值时，增加到此值",
    'lit_chuanshuo': "传说",
    'lit_chuanshuo_info': "①进入游戏时（含因更换角色牌进入游戏时）翻至背面。②体力值每减少1点，进行一次翻面。③翻至正面时，立刻翻至背面。④每次翻面后，可令1人获得2点护甲。⑤全局技，全场有人护甲量≥3时，其失去3的倍数点护甲，直至护甲量小于3。每因此失去了3点护甲，其+1点体力上限",
    'lit_chuanshuoV2': "传说V2",
    'lit_chuanshuoV2_info': "①进入游戏时（含因更换角色牌进入游戏时）翻至背面。②受到伤害后，若处于正面，翻至背面。③每轮限1次，你翻至正面时，于此回合之后获得3个额外回合",
    'lit_yaobian': "耀变",
    'lit_yaobian_info': `限定技，你增加体力上限后，若你的体力上限超过全场人数，你可指定1人A。全场角色依次对A造成x点伤害（x为其与A体力上限差值的绝对值），随后获得${get.poptip("lit_chuanshuoV2")}`,
    'lit_shengjizyt': "升级·钟雨桐",
    'lit_shengjizyt_info': `获得：${get.poptip('lit_chixin')}`,
};

export const simpleTranslate = {
    'lit_chixin_info': "锁；上限始终为全场最多，低于时增至该值",
    'lit_chuanshuo_info': "锁；进场翻背面，翻至正面立即翻至背面；扣血翻面；每次翻面令1人+2护甲；全局：护甲≥3者-3护甲至<3，每-3其+1上限",
    'lit_chuanshuoV2_info': "锁；进场翻背面；在正面受伤则翻至背面；每轮限1次，翻至正面后获得3个额外回合",
    'lit_yaobian_info': `限；增加体力上限后，若上限>人数，可指定1人A，全场角色依次对A造成 |上限差| 的伤害，随后获得${get.poptip("lit_chuanshuoV2")}`,
    'lit_shengjizyt_info': `获得：${get.poptip('lit_chixin')}`,
};

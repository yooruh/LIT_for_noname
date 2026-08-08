import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';

export const sort = 'xghm';
export const title = `隐藏形态·护甲·核爆·${styleText('o', "较难")}`;
export const intro = `${B("钟雨桐")}仅能由${get.poptip("lit_pobi")}变身登场：v1阶段全程处于背面，以${get.poptip("lit_chuanshuo")}的护甲经济反哺全场。上限足够高后由${get.poptip("lit_yaobian")}核爆并转入${get.poptip("lit_chuanshuoV2")}获得额外回合。`;

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
    // // ── 临时调试技能：记录每次 turnOver 事件的触发来源
    // lit_debug_turn: {
    //     forced: true,
    //     silent: true,
    //     trigger: { player: 'turnOverAfter' },
    //     async content(event, trigger, player) {
    //         player.storage.lit_debug_turn_seq = (player.storage.lit_debug_turn_seq || 0) + 1;
    //         if (!player.storage.lit_debug_turn) player.storage.lit_debug_turn = [];
    //         // 向上回溯父事件链，找出是谁发起了这次翻面
    //         const parents = [];
    //         let e = trigger;
    //         for (let i = 0; i < 6 && e; i++) {
    //             e = e.getParent();
    //             if (!e) break;
    //             parents.push(e.name);
    //         }
    //         const rec = {
    //             seq: player.storage.lit_debug_turn_seq,
    //             event: trigger.name,
    //             on: trigger.player ? trigger.player.name : null,
    //             turnedOver: player.isTurnedOver(),
    //             parents,
    //         };
    //         player.storage.lit_debug_turn.push(rec);
    //         if (player.storage.lit_debug_turn.length > 80) player.storage.lit_debug_turn.shift();
    //         game.log(`${player.name}【调试】翻面#${rec.seq} 当前${rec.turnedOver ? '背面' : '正面'} 来源[${parents.join('>')}]`);
    //         console.log('[调试·翻面]', JSON.stringify(rec));
    //     },
    // },
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
                popup: false,
                trigger: {
                    player: ['changeHpAfter', 'loseMaxHpAfter'],
                },
                filter(event, player) {
                    const num = event.name === 'changeHp' ? event.num : -event.loseHp;
                    return num < 0;
                },
                async content(event, trigger, player) {
                    const num = trigger.name === 'changeHp' ? trigger.num : -trigger.loseHp;
                    for (let i = 0; i < Math.abs(num); i++) {
                        player.popup("传说<br>掉血翻面");
                        await game.delay(2);
                        await player.turnOver();
                    }
                },
                sub: true,
                sourceSkill: 'lit_chuanshuo',
            },
            up: {
                forced: true,
                priority: -999,
                popup: "传说<br>翻回背面",
                trigger: { player: 'turnOverAfter' },
                filter(event, player) {
                    return !player.isTurnedOver();
                },
                async content(event, trigger, player) {
                    await player.turnOver(true);
                    await game.delay(2);
                },
                sub: true,
                sourceSkill: 'lit_chuanshuo',
            },
            shield: {
                popup: "传说<br>加护甲",
                trigger: { player: 'turnOverAfter' },
                filter(event, player) {
                    return player.isIn() && player.isTurnedOver();
                },
                async cost(event, trigger, player) {
                    event.result = await player.chooseTarget('传说：你从正面翻至背面后，可令至多2人分别获得2点护甲', [1, 2], (card, p, target) => true).set('ai', target => {
                        if (get.attitude(player, target) <= 0) return -1;
                        let eff = get.attitude(player, target) / 10; // 根据亲近态度加权
                        if (player === target) eff += 1; // 对自己加权
                        if (target.hujia === 0) eff += 3; // 保护无甲友方
                        if (target.hujia > 0) {
                            eff -= 3 - target.hujia; // 护甲溢出降权
                            if (player.hasSkill('lit_chixin') && player !== target) {
                                let max = 0;
                                for (const p of game.filterPlayer()) {
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
                    event.targets.sortBySeat(_status.currentPhase);
                    for (const target of event.targets) {
                        await target.changeHujia(2);
                    }
                },
                sub: true,
                sourceSkill: 'lit_chuanshuo',
            },
            drain: {
                forced: true,
                popup: "传说<br>护盾转上限",
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
                popup: "传说<br>受伤翻面",
                trigger: { player: 'damageAfter' },
                filter(event, player) {
                    return !player.isTurnedOver();
                },
                async content(event, trigger, player) {
                    await player.turnOver(true);
                },
                sub: true,
                sourceSkill: 'lit_chuanshuoV2',
            },
            turn: {
                forced: true,
                popup: "传说<br>额外回合",
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
                silent: true,
                firstDo: true,
                charlotte: true,
                mark: true,
                marktext: "额",
                intro: {
                    name: "传说·额外回合",
                    content: (storage, player) => {
                        if (storage > 0) return `还需进行${storage}个额外回合`;
                        return `本轮额外回合已执行结束`;
                    },
                },
                init(player) {
                    player.setStorage("lit_chuanshuoV2_used", 3);
                },
                trigger: { player: "phaseBefore" },
                async content(event, trigger, player) {
                    let count = player.getStorage("lit_chuanshuoV2_used", 0);
                    player.setStorage("lit_chuanshuoV2_used", --count);
                },
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
            player: 'gainMaxHpAfter',
        },
        filter(event, player) {
            return player.maxHp > game.countPlayer();
        },
        async cost(event, trigger, player) {
            event.result = await player.chooseTarget(`耀变：指定1名角色A，全场角色依次对A造成x点伤害（x为其与A体力上限差值的绝对值），随后获得${get.poptip("lit_chuanshuoV2")}`, (card, p, target) => true)
                .set("targetprompt2", [target => {
                    const hints = [];
                    let total = 0;
                    game.filterPlayer(p => {
                        if (p !== target) {
                            const dmg = Math.abs(p.maxHp - target.maxHp);
                            if (dmg > 0) total += dmg;
                        }
                    });
                    hints.push(`预计${total}伤`);
                    if (target.hasSkill("lit_yisui", null, false, true)) {
                        const hasGuimi = game.hasPlayer(p => p.hasMark('lit_guimi') && p.getStorage("lit_guimi_total") === target && p.hp === p.maxHp);
                        // if (hasGuimi) hints.push("反弹伤害");
                        hints.push("可能免伤");
                    }
                    else if (target.hasSkillTag('nodamage')) hints.push("可能免伤");
                    else if (target.hasSkillTag('filterDamage')) hints.push("可能减免");
                    return hints.join('<br>') || undefined;
                }])
                .set('ai', target => {
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
    'lit_chuanshuo_info': "①进入游戏时（含因更换角色牌进入游戏时）翻至背面。<br>②体力值每减少1点，进行一次翻面。<br>③翻至正面时，立刻翻至背面。<br>④每次从正面翻至背面后，可令至多2人各获得2点护甲。<br>⑤全局技，全场有人护甲量≥3时，其失去3的倍数点护甲，直至护甲量小于3。每因此失去了3点护甲，其+1点体力上限",
    'lit_chuanshuoV2': "传说V2",
    'lit_chuanshuoV2_info': "①进入游戏时（含因更换角色牌进入游戏时）翻至背面。<br>②受到伤害后，若处于正面，翻至背面。<br>③每轮限1次，你翻至正面时，于此回合之后获得3个额外回合",
    'lit_yaobian': "耀变",
    'lit_yaobian_info': `限定技，你增加体力上限后，若你的体力上限超过全场人数，你可指定1人A。全场角色依次对A造成x点伤害（x为其与A体力上限差值的绝对值），随后获得${get.poptip("lit_chuanshuoV2")}`,
    'lit_shengjizyt': "升级·钟雨桐",
    'lit_shengjizyt_info': `获得：${get.poptip('lit_chixin')}`,
};

export const simpleTranslate = {
    'lit_chixin_info': "锁；上限始终为全场最多，低于时增至该值",
    'lit_chuanshuo_info': "锁；进场翻背面，扣血翻面；翻至正面立即翻至背面；每次从正面翻至背面令至多2人各+2护甲；全局：护甲≥3者-3护甲至<3，每-3其+1上限",
    'lit_chuanshuoV2_info': "锁；进场翻背面；在正面受伤则翻至背面；每轮限1次，翻至正面后获得3个额外回合",
    'lit_yaobian_info': `限；增加体力上限后，若上限>人数，可指定1人A，全场角色依次对A造成 |上限差| 的伤害，随后获得${get.poptip("lit_chuanshuoV2")}`,
    'lit_shengjizyt_info': `获得：${get.poptip('lit_chixin')}`,
};

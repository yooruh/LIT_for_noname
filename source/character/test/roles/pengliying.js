import { lib, game, ui, get, ai, _status } from '../shared.js';

export const sort = 'jbs';
export const title = "时过境迁，藻已物是人非";

export const character = {
    'lit_pengliying彭丽颖': {
        sex: "female",
        group: "key",
        hp: 3,
        skills: ["lit_wuma", "lit_qingxiu", "lit_teshe"],
        groupInGuozhan: "key",
    },
};

export const skill = {
    lit_wuma: {
        enable: "phaseUse",
        filter: (event, player) => {
            return player.countCards('he', { subtype: 'equip3' }) > 0 ||
                player.countCards('he', { subtype: 'equip4' }) > 0;
        },
        filterCard: (card, player) => {
            const subtype = get.subtype(card);
            return subtype === 'equip3' || subtype === 'equip4';
        },
        position: "he",
        check: (card) => {
            const player = _status.currentPhase;
            const subtype = get.subtype(card);
            if (player.countCards('he', { subtype }) > 1) {
                return 11 - get.equipValue(card, player);
            }
            return 6 - get.value(card, player);
        },
        filterTarget: (card, player, target) => {
            if (target.isMin()) return false;
            const type = get.subtype(card);
            return player !== target && !target.isDisabled(type);
        },
        selectTarget: 1,
        async content(event, trigger, player) {
            lib.lit.aiGuard.record(player, 'lit_wuma');
            const card = event.cards[0];
            const target = event.targets[0];
            await player.$give(card, target, false);
            await target.equip(card);
            await player.recover();
            await player.draw();
        },
        discard: false,
        ai: {
            order: (item, player) => lib.lit.aiGuard.blocked(player, 'lit_wuma') ? -1 : 10,
            result: {
                target: (player, target) => {
                    const card = ui.selected.cards[0];
                    if (card) return get.effect(target, card, target, target);
                    return 0;
                },
                player: 2,
            },
            threaten: 1.3,
            effect: {
                player: (card, player) => {
                    if (get.subtype(card) === 'equip3' || get.subtype(card) === 'equip4') {
                        return [1, 0.5];
                    }
                },
            },
        },
    },
    lit_qingxiu: {
        trigger: {
            player: "judgeEnd",
        },
        frequent: (event) => {
            return event.result.card.name !== 'du';
        },
        check: (event) => {
            return event.result.card.name !== 'du';
        },
        filter: (event, player) => {
            return get.position(event.result.card, true) === 'o';
        },
        async content(event, trigger, player) {
            await player.gain(trigger.result.card, 'gain2');
        },
        ai: {
            threaten: 0.5,
            result: {
                player: 1,
            },
        },
    },
    lit_teshe: {
        group: ["lit_teshe_muhun"],
        derivation: "lit_muhun",
        trigger: {
            player: "damageBegin2",
        },
        check: (event, player) => {
            return true;
        },
        init: (player) => {
            player.storage.lit_teshe_muhun = false;
        },
        async content(event, trigger, player) {
            const judge1 = await player.judge((card) => {
                player.storage.lit_teshe = card;
                if (card !== undefined) return 0;
                return -1;
            });

            const judge2 = await player.judge((card) => {
                const card_old = player.storage.lit_teshe;
                if (get.suit(card) === get.suit(card_old) || get.number(card) === get.number(card_old)) {
                    return 2;
                }
                return 0;
            });

            if (judge2.result.judge > 0) {
                trigger.cancel();
            }
        },
        ai: {
            maixie_defend: true,
            result: {
                player: 1,
            },
            effect: {
                target: (card, player, target) => {
                    if (player.hasSkillTag('jueqing', false, target)) return [1, -2];
                    if (target.hp > 1) return 1.5;
                    if (target.hp <= 1 && !target.storage.lit_teshe_muhun) return [1, 0.8];
                },
            },
            threaten: 1.2,
        },
        subSkill: {
            muhun: {
                trigger: {
                    player: "dying",
                },
                filter: (event, player) => {
                    return !player.storage.lit_teshe_muhun;
                },
                forced: true,
                async content(event, trigger, player) {
                    player.storage.lit_teshe_muhun = true;
                    player.addSkillLog('lit_muhun');
                },
                sub: true,
                sourceSkill: "lit_teshe",
            },
        },
    },
    lit_muhun: {
        unique: true,
        limited: true,
        mark: true,
        marktext: "母",
        intro: {
            name: "母魂",
            content: "limited",
        },
        forceDie: true,
        enable: "phaseUse",
        filter: (event, player) => {
            return !player.storage.lit_muhun && player.hp <= 2;
        },
        filterTarget: (card, player, target) => {
            return player !== target;
        },
        skillAnimation: true,
        animationColor: "orange",
        selectTarget: -1,
        multitarget: true,
        multiline: true,
        line: "fire",
        init: (player) => {
            player.storage.lit_muhun = false;
        },
        async content(event, trigger, player) {
            player.awakenSkill(event.name);
            player.storage.lit_muhun = true;

            const targets = event.targets.slice().sort(lib.sort.seat);
            let currentDamage = 2;

            for (const target of targets) {
                const res = get.damageEffect(target, player, target, 'fire');
                const result = await target.chooseToDiscard('he',
                    `弃置至少${currentDamage}张牌或受到${currentDamage}点火焰伤害`,
                    [currentDamage, Infinity])
                    .set('ai', (card) => {
                        if (ui.selected.cards.length >= currentDamage) return -1;
                        if (target.hasSkillTag('nofire')) return -1;
                        if (res >= 0) return 6 - get.value(card, target);
                        if (get.type(card) !== 'basic') {
                            return 10 - get.value(card, target);
                        }
                        return 8 - get.value(card, target);
                    })
                    .set('res', res)
                    .forResult();

                if (!result.bool) {
                    await target.damage(currentDamage, 'fire');
                    currentDamage = 2;
                } else {
                    currentDamage = result.cards.length * 2 - 1;
                }
            }
        },
        ai: {
            order: 1,
            result: {
                player: (player) => {
                    let num = 0, eff = 0;
                    const players = game.filterPlayer((current) => {
                        return current !== player;
                    }).sortBySeat(player);

                    for (const target of players) {
                        if (get.damageEffect(target, player, target, 'fire') >= 0) {
                            num = 0;
                            continue;
                        }

                        const shao = target.countCards('he', (card) => {
                            if (get.type(card) !== 'basic') {
                                return get.value(card, target) < 10;
                            }
                            return get.value(card, target) < 8;
                        }) < num + 1;

                        num++;
                        if (shao) {
                            eff -= 4 * (get.realAttitude || get.attitude)(player, target);
                            num = 0;
                        } else {
                            eff -= num * (get.realAttitude || get.attitude)(player, target) / 4;
                        }
                    }

                    if (eff < 4) return 0;
                    return eff;
                },
                target: (player, target) => {
                    const att = (get.realAttitude || get.attitude)(player, target);
                    if (att < 0) return -att * 3;
                    return -att * 0.5;
                },
            },
            threaten: 2.5,
            effect: {
                target: (card, player, target) => {
                    if (get.tag(card, 'damage') && player.hp <= 2) {
                        return [1, -0.5];
                    }
                },
            },
        },
    },
};

export const translate = {
    'lit_pengliying彭丽颖': "彭丽颖",
    "lit_wuma": "无马",
    "lit_wuma_info": "你可以选择你的1张坐骑牌并指定1人，视为其使用了这张坐骑牌，然后你+1点体力并摸1张牌。",
    "lit_qingxiu": "清秀",
    "lit_qingxiu_info": "当你的判定结束后，你可以获得你的判定牌。",
    "lit_teshe": "特赦",
    "lit_teshe_info": "你即将受到伤害时，可以进行2次判定：<span class='redtext' style='color:Green'>花色或数字</span>相同，则免伤；锁定技；你首次濒死时获得“母魂”。",
    "lit_muhun": "母魂",
    "lit_muhun_info": "限定技；若你<span class='redtext' style='color:Red'>体力<3</span>，你可令其他人依次弃x张牌，否则受到x点火焰伤害。（x至少为其上家的弃牌数*2-1且至少为2）",
};

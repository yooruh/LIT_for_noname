import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';

export const sort = 'ybs';
export const title = `跳判定·发育流·${styleText('o', "较难")}`;
export const intro = `以延时锦囊为核心构筑的爆发型角色。${B("张盛杰")}通过${get.poptip("lit_wutou")}跳过判定阶段，能在判定区积累延时锦囊置，配合`
    + `${get.poptip("lit_youxia")}主动移牌补充判定区资源，快速积累${get.poptip("lit_xinyi")}觉醒。觉醒后是极具毁灭性的多刀控场输出。`
    + "<li>主公：发育相对较快，觉醒后可以不着急输出，凑多一点延时锦囊牌输出便指数上升。前后期都亟需保护，建议优先拿装备牌发育再觉醒"
    + "<li>忠臣、反贼：可以捡队友判定区的垃圾来发育，觉醒后一波心痕爆发可以收割残血或压制核心敌方"
    + "<li>内奸：前期低调积累延时锦囊，觉醒后利用高爆发清理战场，注意保留关键延时锦囊以备最终决战";
export const character = {
    'lit_zhangshengjie张盛杰': {
        sex: "male",
        group: "three",
        hp: 4,
        skills: ["lit_shengjizsj", "lit_wutou", "lit_youxia", "lit_xinyi"],
    },
};

export const characterReplace = { 'lit_zhangshengjie': ['lit_zhangshengjie张盛杰', 'lit_zhangshengjie9张盛杰'] };

export const skill = {
    // 张盛杰
    lit_wutou: {
        forced: true,
        preHidden: true,
        trigger: { player: "phaseBeforeStart" },
        async content(event, trigger, player) {
            player.skip('phaseZhunbei');
            player.skip('phaseJudge');
        },
        mod: {
            targetEnabled: (card, player, target) => {
                if (get.type(card) === 'delay' && player === target) {
                    return !player.hasJudge(card);
                }
            },
        },
        ai: {
            effect: {
                target(card, player, target) {
                    if (get.type(card) === "delay" && (target.hasSkill("lit_xinyi") || target.hasSkill("lit_xinhen"))) {
                        return [0, 2];
                    }
                },
            },
        },
    },
    lit_youxia: {
        utils: {
            // 计算移动单张牌的综合收益
            calcMoveValue(player, from, to, card) {
                const pos = get.position(card);
                const attFrom = get.attitude(player, from);
                const attTo = get.attitude(player, to);
                const cardValue = get.value(card, from);
                let value = 0;
                const baseEffect = get.effect(from, card, player, player); // 对来源使用这张牌的收益
                let targetEffect = 0;

                if (pos === 'j') {
                    // 延时锦囊牌的复杂计算
                    targetEffect = get.effect(to, card, player, player);
                    value -= baseEffect;    // 减去来源的效果（因为来源失去了这张牌）
                    value += targetEffect;

                    // 特殊技能收益加成
                    let specialBonus = 0;
                    if (from.hasSkill('lit_youxia') || to.hasSkill('lit_youxia') && to.hasJudge(get.name(card))) {
                        specialBonus += 1; // 目标有 lit_youxia 获得 +1
                    }
                    if (to.hasSkill('lit_xinyi') || to.hasSkill('lit_xinhen')) {
                        specialBonus += 2; // 目标有 lit_xinyi 或 lit_xinhen 获得 +2
                    }

                    // 根据态度调整特殊收益的方向
                    if (attTo > 0) {
                        value += specialBonus * 2; // 队友获得特殊技能收益，价值翻倍
                    } else if (attTo < 0) {
                        value -= specialBonus * 3; // 敌人获得特殊技能收益，惩罚加重（系数3比2大，优先避免资敌）
                    }
                } else if (pos === 'e') {
                    // 装备牌的复杂计算，融合 noe 特殊处理
                    const oldEquip = to.getEquip(get.subtype(card));// 获取原位置装备

                    if (attFrom > 0) {
                        // 来源是队友的情况

                        // 处理 noe 标签（来源不想装备牌）
                        if (from.hasSkillTag('noe')) {
                            // 有 noe 标签的角色，其装备价值被贬低，移走是赚的
                            const noeValue = (8 - get.equipValue(card, from)) * attFrom / 5;
                            value += Math.max(0, noeValue);
                        } else {
                            // 普通队友，优先移走负面装备
                            if (cardValue < 0) {
                                value -= cardValue * 2; // 移走负面装备是正收益
                            } else if (cardValue > 0) {
                                value -= cardValue;     // 移走好装备是负收益
                            }
                        }

                        // 目标接收装备的价值（如果目标是敌人，给负面装备或顶掉好装备）
                        if (attTo < 0) {
                            if (cardValue < 0) {
                                // 给敌人负面装备
                                value += get.effect(to, card, player, player) * 1.5;
                            }
                            // 顶装备收益
                            if (oldEquip && get.value(oldEquip, to) > 0) {
                                value += get.value(oldEquip, to) * 0.8;
                            }
                        } else if (attTo > 0) {
                            // 给队友装备
                            value += get.effect(to, card, player, player);
                            if (oldEquip && get.value(oldEquip, player) > 0) {
                                value += get.value(oldEquip, player) * 0.5; // 获得旧装备的收益
                            }
                        }
                    } else if (attFrom < 0) {
                        // 来源是敌人的情况：优先移走好装备
                        if (cardValue > 0) {
                            value += cardValue * 2; // 移走敌人好装备是大收益

                            // 如果移给队友，额外收益
                            if (attTo > 0) {
                                value += get.effect(to, card, player, player) * 1.5;
                                // 顶装备逻辑：如果敌人有好装备，顶掉也是赚的
                                if (oldEquip && get.value(oldEquip, to) > 0) {
                                    value += get.value(oldEquip, to) * 0.5;
                                }
                            }
                        }
                    }
                }

                // 自己能获得原位置的牌，增加价值
                if (pos === 'e') {
                    const oldEquip = to.getEquip(get.subtype(card));
                    if (oldEquip && lib.filter.canBeGained(oldEquip, player, to)) {
                        value += get.value(oldEquip, player) * 1.2;
                    }
                } else if (pos === 'j') {
                    const oldJudge = to.getJudge(card.viewAs || card.name);
                    if (oldJudge && lib.filter.canBeGained(oldJudge, player, to)) {
                        value += get.value(oldJudge, player) * 1.2;
                    }
                }

                return value;
            },
            // 能否在无视判定区已有牌的情况下加入牌
            blankCanAddJudge(player, card) {
                if (!player || !card) return false;
                if (player.isDisabledJudge()) return false;
                if (player.isOut()) return false;

                let cardName;
                if (typeof card == "string") {
                    cardName = card;
                } else {
                    cardName = card.viewAs || card.name;
                }
                if (!cardName) return false;

                const cardInfo = lib.card[cardName];
                return cardInfo;

            },
        },
        derivation: "lit_youxia_faq",
        group: ["lit_youxia_move", "lit_youxia_draw"],
        subSkill: {
            move: {
                trigger: { player: 'phaseUseBefore' },
                filter(event, player) {
                    return player.canMoveCard(null, false, 'canReplace');
                },
                async cost(event, trigger, player) {
                    const blankCanAddJudge = lib.skill.lit_youxia.utils.blankCanAddJudge;
                    const next = player.chooseTarget(2, (card, player, target) => {
                        if (ui.selected.targets.length) {
                            let from = ui.selected.targets[0];
                            // 使用 canMoveCard 的检查逻辑
                            let es = from.getCards('e');
                            let js = from.getCards('j');
                            for (let e of es) if (target.canEquip(e, true)) return true;
                            for (let j of js) if (blankCanAddJudge(target, j)) return true;
                            return false;
                        } else {
                            return target.countCards('ej') > 0;
                        }
                    });

                    // AI 逻辑：融合 noe 处理、特殊技能收益和 get.effect 综合计算
                    const calcMoveValue = lib.skill.lit_youxia.utils.calcMoveValue;
                    next.set('ai', (target) => {
                        const player = get.event().player;
                        const selectedTargets = ui.selected.targets;
                        const isSelectingSource = selectedTargets.length === 0;

                        // 阶段 A：选择来源（from）
                        if (isSelectingSource) {
                            let maxValue = 0;
                            const from = target;

                            // 遍历该角色所有可移动的牌，寻找最佳移动方案
                            const cards = from.getCards('ej');
                            for (const card of cards) {
                                const pos = get.position(card);

                                // 寻找最佳目标
                                for (const to of game.filterPlayer()) {
                                    if (to === from) continue;
                                    if (pos === 'e' && !to.canEquip(card, true)) continue;
                                    if (pos === 'j' && !blankCanAddJudge(to, card)) continue;

                                    const value = calcMoveValue(player, from, to, card);
                                    if (value > maxValue) maxValue = value;
                                }
                            }

                            return maxValue;
                        }

                        // 阶段 B：选择目标位置（to）
                        const from = selectedTargets[0];
                        let bestValue = 0;

                        const to = target;
                        const movableCards = from.getCards('ej').filter(c => {
                            const pos = get.position(c);
                            if (pos === 'e') return to.canEquip(c, true);
                            if (pos === 'j') return blankCanAddJudge(to, c);
                            return false;
                        });

                        for (const card of movableCards) {
                            const value = calcMoveValue(player, from, to, card);
                            bestValue = Math.max(bestValue, value);
                        }

                        return bestValue;
                    });

                    next.set('multitarget', true);
                    next.set('targetprompt', ["被移走", "移动目标"]);
                    next.set('prompt', get.prompt('lit_youxia'));
                    next.set('prompt2', "出牌阶段前，可移动场上1牌，移动前获得目的地原来的牌");
                    const result = await next.forResult();
                    if (!result.bool) return;

                    const targets = result.targets;
                    const from = targets[0];

                    // 选择具体移动的牌
                    const { links } = await player.choosePlayerCard('ej', from)
                        .set('filterButton', (button) => {
                            const target = get.event().targets[1];
                            const link = button.link;
                            if (get.position(link) === 'j') {
                                return blankCanAddJudge(target, link);
                            } else {
                                return target.canEquip(link, true);
                            }
                        }).set('ai', (button) => {
                            const link = button.link;
                            const targets = get.event().targets;
                            const from = targets[0];
                            const to = targets[1];

                            return calcMoveValue(player, from, to, link);
                        }).set('targets', targets).forResult();

                    event.result = {
                        bool: links && links.length,
                        targets: targets,
                        cost_data: links,
                    };
                },
                async content(event, trigger, player) {
                    const targets = event.targets;
                    const from = targets[0];
                    const to = targets[1];
                    const link = event.cost_data[0];
                    const position = get.position(link);
                    let originalCard = null;

                    // 获得原来的牌
                    if (position === 'e') {
                        originalCard = to.getEquip(get.subtype(link));
                    } else if (position === 'j') {
                        const judge = to.getJudge(link.viewAs || link.name);
                        if (judge) originalCard = judge;
                    }
                    if (originalCard && lib.filter.canBeGained(originalCard, player, to)) {
                        await player.gain(originalCard, 'gain2');
                    }

                    // 执行移动
                    player.line2(targets, 'green');
                    let waiting;
                    const isVirtual = !link.cards?.length;
                    const realCards = link?.cards || [];
                    if (position === 'e') {
                        waiting = to.equip(link);
                        if (isVirtual) from.removeVirtualEquip(link);
                    } else {
                        if (link.isViewAsCard) {
                            await from.lose(link, ui.special);
                            waiting = to.addJudge(link.viewAs || link.name, realCards);
                        } else {
                            waiting = to.addJudge(link, realCards);
                        }
                        if (isVirtual) from.removeVirtualJudge(link);
                    }
                    if (isVirtual) from.$give(link.cards, to, false);
                    game.log(from, "的", link, "被移动给了", to);
                    await waiting;
                    await game.delay();
                },
                sub: true,
                sourceSkill: 'lit_youxia',
            },
            draw: {
                forced: true,
                locked: true,
                trigger: {
                    player: "loseAfter",
                    global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
                },
                filter: (event, player) => {
                    if (!player.isIn()) return false;
                    const evt = event.getl(player);
                    return evt && evt.player === player && evt.js && evt.js.length > 0;
                },
                getIndex(event, player) {
                    const evt = event.getl(player);
                    if (evt && evt.player === player && evt.js) return evt.js.length;
                    return false;
                },
                async content(event, trigger, player) {
                    const card = get.cards()[0];
                    if (!card) return;
                    await player.showCards(card, get.translation('lit_youxia') + '判定');
                    const suit = get.suit(card);
                    const delayMap = {
                        spade: 'shandian',
                        heart: 'lebu',
                        club: 'bingliang',
                        diamond: 'lit_qianfanpai',
                    };
                    const delayName = delayMap[suit];
                    if (delayName && !player.hasJudge(delayName)) {
                        await player.addJudge({ name: delayName }, [card]);
                        game.log(player, '将', card, '视为', get.translation(delayName), '置入判定区');
                    } else {
                        await game.cardsDiscard(card);
                        game.log(player, '弃置了', card);
                    }
                },
                sub: true,
                sourceSkill: 'lit_youxia',
            },
        },
    },
    lit_xinyi: {
        derivation: ["lit_xinhen", 'lit_xinyi_faq'],
        forced: true,
        juexingji: true,
        skillAnimation: true,
        animationColor: "wood",
        mark: true,
        marktext: "毅",
        intro: {
            content: (storage, player) => {
                if (!storage || storage.length === 0) return `暂未拥有过任何延时锦囊牌`;
                let displayStrArr = storage.map(name => get.translation(name));
                return `已记录${storage.length}张延时锦囊牌：<li>${displayStrArr.join('</li><li>')}</li>`;
            },
        },
        init: (player) => {
            const delayCardNames = [...new Set(player.getCards('j').map(card => get.name(card)))];
            player.setStorage("lit_xinyi", delayCardNames, true);
        },
        trigger: { player: 'phaseUseBegin' },
        filter: (event, player) => {
            return player.getStorage("lit_xinyi").length >= 3;
        },
        async content(event, trigger, player) {
            player.awakenSkill(event.name);
            await player.loseMaxHp();
            await player.addSkill('lit_xinhen');
        },
        mod: {
            aiValue(player, card, num) {
                if (player.awakenedSkills.includes("lit_xinyi")) return;
                if (get.type(card) === "delay" && !player.getStorage("lit_xinyi").includes(get.name(card, player))) {
                    return num * 2;
                }
            },
        },
        group: "lit_xinyi_mark",
        subSkill: {
            mark: {
                charlotte: true,
                direct: true,
                trigger: { player: "addJudgeAfter" },
                filter: (event, player) => {
                    return !player.awakenedSkills.includes("lit_xinyi");
                },
                async content(event, trigger, player) {
                    const markedCardNames = player.getStorage("lit_xinyi");
                    const delayCardNames = [...new Set(
                        markedCardNames.addArray(player.getCards('j').map(card => get.name(card)))
                    )];
                    player.setStorage("lit_xinyi", delayCardNames, true);
                    if (player.getStorage("lit_xinyi").length >= 2 && player.isPhaseUsing()) {
                        await player.useSkill("lit_xinyi");
                    }
                },
                sub: true,
                sourceSkill: "lit_xinyi",
            },
        },
    },
    lit_xinhen: {
        derivation: "lit_xinhen_faq",
        locked: false,
        enable: 'phaseUse',
        usable: 1,
        filter(event, player) {
            const delayCards = player.getCards('j');
            const hasShandian = delayCards.some(card => get.name(card) === 'shandian' || card.viewAs === 'shandian');
            return player.countCards('j') > 0 && game.hasPlayer(target => {
                return target.inRangeOf(player) && player.canUse({ name: 'sha', nature: hasShandian ? 'thunder' : undefined, isCard: true }, target);
            });
        },
        filterTarget(card, player, target) {
            return target.inRangeOf(player) && player.canUse({ name: 'sha', isCard: true }, target);
        },
        async content(event, trigger, player) {
            const target = event.targets[0];
            const delayCards = player.getCards('j');
            const hasShandian = delayCards.some(card => get.name(card) === 'shandian' || card.viewAs === 'shandian');
            const hasLebu = delayCards.some(card => get.name(card) === 'lebu' || card.viewAs === 'lebu');
            const hasBingliang = delayCards.some(card => get.name(card) === 'bingliang' || card.viewAs === 'bingliang');
            const hasQianfan = delayCards.some(card => get.name(card) === 'lit_qianfanpai' || card.viewAs === 'lit_qianfanpai');

            // 乐不思蜀效果：目标弃置等于判定区数量的牌
            if (hasLebu) {
                const discardNum = delayCards.length;
                await target.chooseToDiscard(`心痕：弃置${discardNum}张牌`, 'he', discardNum, true).set('ai', card => {
                    const needToRespond = hasBingliang ? delayCards.length * 2 : delayCards.length;
                    if (target.countCards('hs', card => {
                        return get.name(card, target) === "shan";
                    }) > needToRespond) {
                        if (get.name(card, target) === "shan") return 0;
                    }
                    return 11 - get.value(card);
                });
            }

            // 逐张使用杀
            for (const card of delayCards) {
                if (!target.isIn()) return;
                const shaCard = { name: 'sha', isCard: true, };
                if (hasShandian) shaCard.nature = 'thunder';

                const next = player.useCard(shaCard, target, [card]);
                next.set("oncard", card => {
                    const evt = get.event();
                    if (hasBingliang) {
                        for (const target of game.filterPlayer(null, null, true)) {
                            let id = target.playerid;
                            let map = evt.customArgs;
                            if (!map[id]) map[id] = {};
                            if (map[id].shanRequired === "number") {
                                map[id].shanRequired++;
                            } else {
                                map[id].shanRequired = 2;
                            }
                        }
                    }
                    if (hasQianfan) {
                        if (typeof evt.baseDamage === "number") {
                            evt.baseDamage++;
                        } else {
                            evt.baseDamage = 2;
                        }
                    }
                });
                await next;
            }
        },
        mod: {
            aiValue(player, card, num) {
                if (["shandian", "lebu", "bingliang", "lit_qianfanpai"].includes(get.name(card, player))
                    && !player.getCards('j').includes(get.name(card, player))) {
                    return num * (1.2 + player.getCards('j').length / 10);
                }
            },
        },
        ai: {
            order: (item, player) => {
                const delayCards = player.getCards('j');
                const hasLebu = delayCards.some(card => get.name(card) === 'lebu' || card.viewAs === 'lebu');
                if (hasLebu) return get.order({ name: "sha" }) + 0.03;
                return get.order({ name: "sha" }) - 0.03;
            },
            result: {
                target: (player, target) => {
                    const delayCards = player.getCards('j');
                    const hasShandian = delayCards.some(card => get.name(card) === 'shandian' || card.viewAs === 'shandian');
                    let divAtt = Math.abs(get.attitude(target, target)) ?? 5;
                    return get.effect(target, { name: 'sha', nature: hasShandian ? 'thunder' : undefined, isCard: true }, player, target) / divAtt;
                },
            },
        },
    },
};

export const translate = {
    'lit_zhangshengjie张盛杰': "张盛杰",
    'lit_zhangshengjie_origin': "旧",
    'lit_wutou': "无头",
    'lit_wutou_info': "锁定技，回合开始前，你跳过准备阶段和判定阶段；你的延时锦囊牌可以指定自己为目标",
    'lit_youxia': "游侠",
    'lit_youxia_info': "①出牌阶段前，你可以移动场上的一张牌，并在移动前获得移动目标位置原来的牌<br>②锁定技，你的判定区每失去1张实体牌，你判定：若判定牌的花色对应的延时锦囊牌不存在于你的判定区中，则你将此判定牌视为此延时锦囊牌并置入判定区中。对应方式：♠️闪电、♥️乐不思蜀、♣️兵粮寸断、♦️遣返牌",
    'lit_youxia_faq': "关于获得原来的牌",
    'lit_youxia_faq_info': "如果将要移动到的位置存在多张牌（是分离的，不相关的多张牌，如两张【闪电】。而不是将多张牌当作一张牌使用的那种情况），则获得后进入此位置的那张牌",
    'lit_xinyi': "心毅",
    'lit_xinyi_info': `觉醒技，出牌阶段，若你的判定区内存在或存在过≥3种延时锦囊牌，则你失去1点体力上限，然后获得${get.poptip('lit_xinhen')}`,
    'lit_xinyi_faq': "关于存在或存在过",
    'lit_xinyi_faq_info': "此项记录从获得技能时开始，如果中途失去，则需重新记录",
    'lit_xinhen': "心痕",
    'lit_xinhen_info': "出牌阶段限一次，你可以将你判定区中的所有牌当作【杀】，依次对攻击范围内的1人使用。如果这些牌中有牌在判定区中视为：" +
        "<li>【闪电】，这些【杀】视为雷【杀】</li><li>【乐不思蜀】，目标被指定为技能目标后，须选择弃置与你的判定区等数量的牌；</li><li>【兵粮寸断】，响应每张【杀】所需的【闪】的数量+1；</li><li>【遣返牌】，每张【杀】基础伤害+1</li>",
    'lit_xinhen_faq': "关于判定区内牌数量的计算",
    'lit_xinhen_faq_info': `由于存在将多张牌当作1张牌使用的情况（如${get.poptip('lit_saohua')}①），故在此明确：对于此类视为牌，即便其对应的实体牌数量大于单张牌，在计算数量时也只算作1张牌。拆和顺等也都将这些牌作为一个集合来看成是1张牌，除非明确说明是按照“实体牌数量”来计算的`,
    'lit_shengjizsj': "升级·张盛杰",
    'lit_shengjizsj_info': `获得场上所有人判定区和手牌中的延时锦囊牌`,
};

export const simpleTranslate = {
    'lit_wutou_info': "锁；回合开始前，你跳过准备阶段和判定阶段；你的延时锦囊牌可以指定自己为目标",
    'lit_youxia_info': "①出牌阶段前，可移动场上1牌，移动前获得目的地原来的牌<br>②锁；判定区每失去1张实体牌，判定：按花色置入对应延时锦囊（♠️闪电♥️乐♣️兵粮♦️遣返），若已有则弃置",
    'lit_xinyi_info': `觉；出牌阶段，若判定区内有或有过≥3种延时锦囊牌，则-1上限，获得${get.poptip('lit_xinhen')}`,
    'lit_xinhen_info': "出牌阶段限1次，可将判定区中所有牌当杀，依次对攻击范围内的1人使用。若这些牌中有牌在判定区中视为：" +
        "<li>【闪电】，这些杀视为雷杀</li><li>【乐不思蜀】，技能目标被指定后，弃置“与你判定区等量”的牌；</li><li>【兵粮寸断】，每张杀所需的闪+1；</li><li>【遣返牌】，杀基础伤害+1</li>",
        'lit_shengjizsj_info': `获得场上所有人判定区和手牌中的延时锦囊牌`,
};

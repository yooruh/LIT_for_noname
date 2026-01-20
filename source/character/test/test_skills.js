import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';

export const skill = {
    // 9胡畔
    lit_beiai: {
        forced: true,
        group: ["lit_beiai_end", "lit_beiai_bazhen"],
        subSkill: {
            end: {
                trigger: {
                    player: "phaseJieshuEnd",
                },
                forced: true,
                async content(event, trigger, player) {
                    const j = Math.floor(player.maxHp / (game.countPlayer() + 1));
                    const options = ['+1上限 -1体力', j > 0 ? `+1体力 -${j}上限` : '+1体力'];

                    const { control } = await player.chooseControl(options)
                        .set("prompt", "【悲哀】")
                        .set("prompt2", "选择发动技能的内容")
                        .set("ai", () => {
                            if (j <= 0) return 1;
                            if (player.hp >= 3) {
                                if (player.maxHp > player.hp + j) return 1;
                                return 0;
                            }
                            if (player.canSave(player) || player.hp > 1) {
                                if (player.maxHp === player.hp) return 0;
                                return 1;
                            }
                            return 1;
                        }).forResult();

                    if (control === '+1上限 -1体力') {
                        await player.gainMaxHp();
                        await player.loseHp();
                    } else {
                        await player.recover();
                        if (j > 0) await player.loseMaxHp(j);
                    }
                },
                ai: {
                    order: 5,
                    result: {
                        player: (player) => {
                            if (player.hp === player.maxHp) return 2;
                            if (player.hp > 3) return -1;
                            return 1;
                        },
                    },
                    threaten: 0.8,
                },
                sub: true,
                sourceSkill: "lit_beiai",
            },
            bazhen: {
                locked: true,
                equipSkill: true,
                noHidden: true,
                inherit: "bagua_skill",
                filter: (event, player) => {
                    if (!lib.skill.rw_bagua_skill.filter(event, player)) return false;
                    return player.isEmpty(2);
                },
                async content(event, trigger, player) {
                    const judgeResult = await player.judge('rewrite_bagua', (card) => {
                        return get.suit(card) !== 'spade' ? 1.5 : -0.5;
                    });
                    judgeResult.judge2 = (result) => result.bool;

                    if (judgeResult.result.judge > 0) {
                        trigger.untrigger();
                        trigger.set('responded', true);
                        trigger.result = { bool: true, card: { name: 'shan' } };
                    }
                },
                ai: {
                    respondShan: true,
                    effect: {
                        target(card, player, target) {
                            if (player === target && get.subtype(card) === 'equip2') {
                                if (get.equipValue(card, player) <= 7.5) return 0;
                            }
                            if (!target.isEmpty(2)) return;
                            return lib.skill.rw_bagua_skill.ai.effect.target.apply(this, arguments);
                        },
                    },
                },
                sub: true,
                sourceSkill: "lit_beiai",
            },
        },
    },
    lit_baoshi: {
        forced: true,
        group: ["lit_baoshi_gain", "lit_baoshi_lose"],
        subSkill: {
            gain: {
                trigger: {
                    player: "recoverEnd",
                },
                forced: true,
                async content(event, trigger, player) {
                    await player.gainMaxHp(trigger.num);
                },
                ai: {
                    result: {
                        player: 2,
                    },
                },
                sub: true,
                sourceSkill: "lit_baoshi",
            },
            lose: {
                trigger: {
                    player: "loseMaxHpBefore",
                },
                forced: true,
                async content(event, trigger, player) {
                    const drawAmount = player.maxHp - player.hp;
                    if (drawAmount > 0) {
                        await player.draw(Math.min(drawAmount, 3));
                    }
                },
                ai: {
                    threaten: 0.9,
                    result: {
                        player: (player) => {
                            return player.maxHp - player.hp;
                        },
                    },
                },
                sub: true,
                sourceSkill: "lit_baoshi",
            },
        },
        ai: {
            threaten: 1.1,
            effect: {
                player: (card, player) => {
                    if (get.tag(card, "recover")) {
                        return [1, 0.5];
                    }
                },
            },
        },
    },
    lit_yuyan: {
        frequent: true,
        trigger: {
            player: ["phaseZhunbeiBegin", "phaseJieshuBegin"],
        },
        async content(event, trigger, player) {
            let guanxingAmount = 3;

            if (player.hp > 3) {
                const pileCount = ui.cardPile.childElementCount;
                guanxingAmount = Math.min(player.hp, pileCount);
            }

            if (guanxingAmount > 0) {
                await player.chooseToGuanxing(guanxingAmount);
            }
        },
        ai: {
            threaten: 1.2,
            result: {
                player: (player) => {
                    let amount = 3;
                    if (player.hp > 3) {
                        const pileCount = ui.cardPile.childElementCount;
                        amount = Math.min(player.hp, pileCount);
                    }
                    return amount * 0.5;
                },
            },
            effect: {
                player: (card, player) => {
                    if (get.tag(card, "loseHp") && player.hp > 3) {
                        return [1, -0.3];
                    }
                },
            },
        },
    },

    // 9郑墨翰
    lit_maitou: {
        trigger: {
            player: ["changeHp"],
        },
        direct: true,
        filter: (event, player) => {
            return get.sgn(player.hp - 3.5) !== get.sgn(player.hp - 3.5 - event.num);
        },
        async content(event, trigger, player) {
            if (player.hp > 3 && player.name1 === "郑墨翰") {
                await player.logSkill('lit_maitou', '站起来了');
                game.log("<span class='yellowtext' style='color:Yellow'>颟翰站起来了！！！</span>");
            } else if (player.hp > 3) {
                await player.logSkill('lit_maitou', '站起来了');
                game.log(get.translation(player) + "站起来了！！！");
            } else {
                await player.logSkill('lit_maitou');
            }
        },
        mod: {
            globalFrom: (from, to, current) => {
                return current - 1;
            },
            globalTo: (from, to, current) => {
                if (to.hp <= 3) return current + 1;
            },
        },
        ai: {
            threaten: 0.8,
            effect: {
                target: (card, player, target) => {
                    if (get.tag(card, 'damage') && target.hp <= 3) {
                        return [1, 0.3];
                    }
                },
            },
        },
    },
    lit_yiyu: {
        usable: 2,
        enable: "phaseUse",
        filter: (event, player) => {
            return player.countCards('h', card => get.name(card, player) === 'sha') > 0;
        },
        filterTarget: (card, player, target) => {
            return player.inRangeOf(target);
        },
        check: (event, player) => {
            const shaCount = player.countCards('h', card => get.name(card, player) === 'sha');
            if (shaCount === 0) return false;

            const targets = game.filterPlayer(target =>
                player.inRangeOf(target) && target !== player
            );

            if (targets.length === 0) return false;

            let maxEff = 0;
            for (const target of targets) {
                const shaEffect = get.effect(target, { name: 'sha' }, player, player);
                const usefulCards = player.getCards('h', card => get.name(card, player) !== 'sha')
                    .reduce((sum, card) => sum + get.useful(card, player), 0);

                if ((usefulCards < 2.8 * shaCount * shaEffect) ||
                    (shaEffect >= (0.6 * target.countCards('h') + target.hp) && shaEffect > 0)) {
                    return true;
                }
                maxEff = Math.max(maxEff, shaEffect);
            }
            return false;
        },
        async content(event, trigger, player) {
            const target = event.targets[0];

            // 步骤0: 弃置目标区域牌
            if (target.countDiscardableCards(player, 'hej')) {
                await player.discardPlayerCard('【呓语】弃置其区域牌', target, 'hej')
                    .set("ai", card => {
                        if (get.attitude(player, target) > 0) {
                            return 10 - get.value(card, target);
                        } else {
                            return 10 - get.value(card, target);
                        }
                    });
            }

            // 步骤1-3: 连续出杀直到没有杀或目标死亡
            while (player.isAlive() && target.isAlive()) {
                const shaCards = player.getCards('h', card => get.name(card, player) === 'sha');
                if (shaCards.length === 0) break;

                const result = await player.chooseCard(`【呓语】选择一张杀对${get.translation(target)}使用`, 'h', 1, true,
                    card => get.name(card, player) === 'sha'
                ).forResult();

                if (!result.bool) break;

                await player.useCard(result.cards[0], target);
            }

            // 步骤4: 弃置所有手牌
            if (player.countCards('h') > 0) {
                await player.discard(player.getCards('h'), true);
            }
        },
        ai: {
            order: 1,
            expose: 0.8,
            threaten: 1.4,
            result: {
                player: (player, target) => {
                    const shaCount = player.countCards('h', card => get.name(card, player) === 'sha');
                    return shaCount - player.countCards('h');
                },
                target: (player, target) => {
                    if (!player.hasSha()) {
                        if (target.countCards('hej')) return -1;
                        return 0;
                    }
                    if (get.mode() === 'versus') return -1;
                    if (player.hasUnknown()) return 0;
                    return get.effect(target, { name: 'sha' }, player, target);
                },
            },
            effect: {
                target: (card, player, target) => {
                    if (player.hasSha() && get.attitude(player, target) < 0) {
                        return [1, 0.5];
                    }
                },
            },
        },
    },
    lit_moshou: {
        trigger: {
            global: "dieAfter",
            player: "phaseUseBegin",
        },
        forced: true,
        filter: (event, player, name) => {
            player.storage.lit_moshou = name;
            return true;
        },
        async content(event, trigger, player) {
            if (player.storage.lit_moshou === "dieAfter") {
                if (_status.currentPhase === player) {
                    await player.draw(player.maxHp);
                } else {
                    await player.draw(2);
                }
            } else {
                player.addTempSkill('lit_moshou_sha', 'phaseUseAfter');
            }
        },
        ai: {
            threaten: 1.5,
            effect: {
                player: (card, player) => {
                    if (get.tag(card, 'damage') && player.storage.lit_moshou === "dieAfter") {
                        return [1, 0.3];
                    }
                },
            },
        },
        subSkill: {
            sha: {
                mod: {
                    cardname: (card, player) => {
                        if (card.name === 'shan' && get.suit(card) !== 'heart') {
                            return 'sha';
                        }
                    },
                },
                ai: {
                    respondSha: true,
                    effect: {
                        target: (card, player, target, current) => {
                            if (get.tag(card, 'respondSha') && current < 0) {
                                return 0.6;
                            }
                        },
                    },
                },
                sub: true,
                sourceSkill: "lit_moshou",
            },
        },
    },

    // 9曾品嘉
    lit_yingjun: {
        trigger: {
            player: ["phaseJieshuBegin", "phaseZhunbeiBegin"],
        },
        frequent: true,
        async content(event, trigger, player) {
            await player.draw();
        },
        ai: {
            threaten: 1.2,
            result: {
                player: 1,
            },
            effect: {
                player: (card, player) => {
                    if (get.tag(card, "skip") === "phaseUse") {
                        return [1, -0.5];
                    }
                },
            },
        },
    },
    lit_kuizeng: {
        enable: "phaseUse",
        filter: (event, player) => {
            return player.countCards('he') > 0;
        },
        filterCard: true,
        selectCard: [1, Infinity],
        position: 'he',
        allowChooseAll: true,
        discard: false,
        lose: false,
        delay: 0,
        filterTarget: (card, player, target) => {
            return player !== target;
        },
        check: (card) => {
            const player = get.owner(card);
            const selectedCards = ui.selected.cards;

            // 防止选择过多牌
            if (selectedCards.length > 3) return 0;

            // 防止选择毒
            if (selectedCards.length && selectedCards[0].name === 'du') return 0;
            if (!selectedCards.length && card.name === 'du') return 30;

            // 计算历史赠送次数
            let num = 0;
            const evt2 = _status.event.getParent();
            const history = player.getAllHistory('lose');
            for (const evt of history) {
                if (evt.getParent()?.skill === 'lit_kuizeng' && evt.getParent(3) === evt2) {
                    num += evt.cards?.length || 0;
                }
            }

            // 手牌判断逻辑
            if (player.countCards('he') <= 2) {
                if (selectedCards.length) return 1;

                // 联动好施
                const players = game.filterPlayer();
                for (const target of players) {
                    if (target.hasSkill('haoshi') &&
                        !target.isTurnedOver() &&
                        !target.hasJudge('lebu') &&
                        get.attitude(player, target) >= 3 &&
                        get.attitude(target, player) >= 3) {
                        return 11 - get.value(card, player);
                    }
                }

                // 手牌与体力比较
                if (player.countCards('h') > player.hp) return 10 - get.value(card, player);
                if (player.countCards('h') >= num % 3) return 6 - get.value(card, player);
                return -1;
            }

            return 10 - get.value(card, player);
        },
        async content(event, trigger, player) {
            const cards = event.cards;
            const target = event.targets[0];

            // 赠送牌
            await target.gain(cards, player, 'giveAuto');

            // 计算历史赠送次数
            const evt2 = event.getParent(3);
            let num = 0;
            const history = player.getAllHistory('lose');
            for (const evt of history) {
                const parent = evt.getParent(2);
                if (parent?.name === 'lit_kuizeng' && evt.getParent(5) === evt2) {
                    num += evt.cards?.length || 0;
                }
            }

            const times = (num % 3) + cards.length;

            // 如果次数大于2，可以选择造成伤害或恢复体力
            if (times > 2) {
                const result = await player.chooseTarget(
                    `选择1人对其造成${Math.floor(times / 3)}点伤害，或不选择，恢复${Math.floor(times / 3)}点体力`,
                    [0, 1],
                    true,
                    lib.filter.notMe
                ).set("ai", (target) => {
                    if (player.hp > 2 && player.hp + Math.floor(times / 3) > player.maxHp) {
                        return get.attitude(player, target) <= 0;
                    }
                    return 0;
                }).forResult();

                if (result.targets && result.targets[0]) {
                    await result.targets[0].damage(Math.floor(times / 3));
                } else {
                    await player.recover(Math.floor(times / 3));
                }
            }
        },
        init: (player) => {
            player.storage.lit_kuizeng = 0;
        },
        ai: {
            order: (skill, player) => {
                if (player.hp < player.maxHp && player.countCards('he') > 2) {
                    return 10;
                }
                return 1;
            },
            result: {
                target: (player, target) => {
                    if (target.hasSkillTag('nogain')) return 0;

                    const selectedCards = ui.selected.cards;
                    if (selectedCards.length && selectedCards[0].name === 'du') {
                        if (target.hasSkillTag('nodu')) return 0;
                        return -10;
                    }

                    if (target.hasJudge('lebu')) return 0;

                    const targetHand = target.countCards('h');
                    const playerHand = player.countCards('h');

                    if (player.storage.lit_kuizeng < 0 || player.countCards('h') <= 1) {
                        if (targetHand >= playerHand - 1 && playerHand <= player.hp && !target.hasSkill('haoshi')) {
                            return 0;
                        }
                    }

                    return Math.max(1, 5 - targetHand);
                },
                player: (player) => {
                    return player.countCards('h') <= 3 ? 1 : -0.5;
                },
            },
            effect: {
                target: (card, player, target) => {
                    if (player === target && get.type(card) === 'equip') {
                        const subtype = get.subtype(card);
                        if (player.countCards('e', { subtype }) > 0) {
                            const players = game.filterPlayer();
                            for (const other of players) {
                                if (other !== player && get.attitude(player, other) > 0) {
                                    return 0;
                                }
                            }
                        }
                    }
                },
            },
            threaten: 1.1,
            expose: 0.2,
        },
    },
    lit_chuangshi: {
        trigger: {
            player: "damageEnd",
        },
        direct: true,
        async content(event, trigger, player) {
            await player.draw();

            const result = await player.chooseTarget(get.prompt2('lit_chuangshi'))
                .set("ai", (target) => {
                    if (get.attitude(player, target) > 0) {
                        return get.recoverEffect(target, player, player) + 1;
                    }
                    return 0;
                }).forResult();
            if (!result.bool) return;

            const target = result.targets[0];
            await player.logSkill('lit_chuangshi', target);

            const judgeResult = await target.judge((card) => {
                const suit = get.suit(card);
                const number = get.number(card);

                if (target.hp === target.maxHp) {
                    if (suit === 'heart') return -1;
                    return 1;
                }

                if (number !== 9 || target.hp + 1 === target.maxHp) {
                    if (suit === 'heart') return 2;
                    if (suit === 'diamond') return 3;
                    return 1;
                }

                if (suit === 'club') return -1;
                if (suit === 'heart') return 4;
                if (suit === 'diamond') return 5;
                return 3;
            }).forResult();

            if (judgeResult.card) {
                const suit = get.suit(judgeResult.card);
                const number = get.number(judgeResult.card);

                // 点数9的特殊效果
                if (number === 9 && target.hp < target.maxHp) {
                    await target.recover();
                }
                // 红桃或方片恢复体力
                if ((suit === 'heart' || suit === 'diamond') && target.hp < target.maxHp) {
                    await target.recover();
                }

                // 黑桃或方片摸牌
                if (suit === 'spade' || suit === 'diamond') {
                    await target.draw(trigger.num);
                }
            }
        },
        ai: {
            maixie: true,
            maixie_hp: true,
            threaten: 1.3,
            effect: {
                player: (card, player) => {
                    if (get.tag(card, "damage")) {
                        return [1, 0.5];
                    }
                },
            },
            result: {
                player: (player) => {
                    return player.hasFriend() ? 1 : -1;
                },
            },
        },
    },

    // 王思媛
    lit_daha: {
        trigger: {
            source: "damageBefore",
        },
        forced: true,
        filter: (event, player) => {
            return event.notLink();
        },
        async content(event, trigger, player) {
            // 判断目标是否有卖血技能
            const hasMaixie = trigger.player.hasSkillTag('maixie') ||
                trigger.player.hasSkillTag('maixie_defend') ||
                trigger.player.hasSkillTag('maixie_hp');

            const { control } = await player.chooseControl(['确定', '取消'])
                .set("prompt", "【大哈】")
                .set("prompt2", "弃置所有手牌，否则此伤害视为失去体力")
                .set("ai", () => {
                    // 如果对方有卖血技能，选择弃牌
                    if (hasMaixie) return 1;
                    // 如果自己手牌很少或很烂，选择弃牌
                    if (player.countCards('h') === 0) return 0;
                    if (player.countCards('h') <= 2) {
                        const cards = player.getCards('h');
                        let totalValue = 0;
                        for (const card of cards) {
                            totalValue += get.value(card, player);
                        }
                        if (totalValue < 10) return 1;
                    }
                    // 默认选择取消，让伤害变为失去体力
                    return 0;
                }).forResult();

            if (control === '确定') {
                await player.discard(player.getCards('h'), true);
            } else {
                trigger.cancel();
                await trigger.player.loseHp(trigger.num);
            }
        },
        ai: {
            jueqing: true,
            threaten: 1.2,
            effect: {
                target: (card, player, target) => {
                    if (get.tag(card, "damage")) {
                        // 如果目标有卖血技能，大哈更有价值
                        if (target.hasSkillTag('maixie') ||
                            target.hasSkillTag('maixie_defend') ||
                            target.hasSkillTag('maixie_hp')) {
                            return [1, 0.5];
                        }
                        // 如果目标手牌多，大哈更有价值
                        if (target.countCards('h') > 3) {
                            return [1, 0.3];
                        }
                    }
                },
                player: (card, player) => {
                    if (get.tag(card, "damage")) {
                        // 如果自己手牌少，大哈的代价小
                        if (player.countCards('h') <= 2) {
                            return [1, -0.2];
                        }
                        // 如果自己手牌多，大哈的代价大
                        if (player.countCards('h') > 4) {
                            return [1, -0.5];
                        }
                    }
                },
            },
        },
    },
    lit_fushu: {
        trigger: {
            player: ["loseAfter", "changeHp"],
        },
        forced: true,
        filter: (event, player) => {
            const required = Math.max(1, player.getDamagedHp());
            return player.countCards('h') < required;
        },
        async content(event, trigger, player) {
            const required = Math.max(player.getDamagedHp(), 1);
            await player.drawTo(required);
        },
        ai: {
            noh: true,
            skillTagFilter: (player, tag) => {
                if (tag === 'noh') {
                    const required = Math.max(1, player.getDamagedHp());
                    return player.countCards('h') < required;
                }
                return false;
            },
            effect: {
                player: (card, player) => {
                    if (get.tag(card, "damage") || get.tag(card, "loseCard")) {
                        const required = Math.max(1, player.getDamagedHp());
                        if (player.countCards('h') < required) {
                            return [1, 0.5];
                        }
                    }
                    if (get.tag(card, "recover")) {
                        const required = Math.max(1, player.getDamagedHp());
                        if (player.countCards('h') < required) {
                            return [1, -0.5];
                        }
                    }
                },
            },
            threaten: 0.8,
            result: {
                player: (player) => {
                    const required = Math.max(1, player.getDamagedHp());
                    const deficit = required - player.countCards('h');
                    return Math.max(0, deficit * 0.5);
                },
            },
        },
    },

    // 9钟雨桐
    lit_gaoshang: {
        group: ["lit_gaoshang_die"],
        trigger: {
            player: "phaseDiscardBefore",
        },
        frequent: (event, player) => {
            return player.needsToDiscard();
        },
        filter: (event, player) => {
            // 如果跳过出牌阶段，可以发动
            if (player.getHistory('skipped').includes('phaseUse')) return true;

            // 检查本回合是否使用过杀
            const history = player.getAllHistory('useCard');
            for (const evt of history) {
                if (evt.card.name === 'sha' && evt.isPhaseUsing()) {
                    return false;
                }
            }
            return true;
        },
        async content(event, trigger, player) {
            trigger.cancel();
        },
        ai: {
            nodiscard: true,
            threaten: 0.7,
            effect: {
                player: (card, player) => {
                    if (get.tag(card, "skip") === "phaseUse") {
                        return [1, 1];
                    }
                },
            },
        },
        subSkill: {
            die: {
                trigger: {
                    player: "die",
                },
                forced: true,
                forceDie: true,
                logTarget: "source",
                skillAnimation: true,
                animationColor: "wood",
                async content(event, trigger, player) {
                    game.countPlayer(async (current) => {
                        if (current !== player && current.isAlive()) {
                            await current.loseHp();
                        }
                    });
                },
                ai: {
                    threaten: 0.9,
                },
                sub: true,
                sourceSkill: "lit_gaoshang",
            },
        },
    },
    lit_danchun: {
        enable: "phaseUse",
        usable: 1,
        filter: (event, player) => {
            return game.hasPlayer(target =>
                target !== player && target.countCards('h') > 0
            );
        },
        filterTarget: (card, player, target) => {
            return target !== player && target.countCards('h') > 0;
        },
        async content(event, trigger, player) {
            const target = event.targets[0];
            const handCards = target.getCards('h');

            // 显示目标手牌
            const dialog = ui.create.dialog(get.prompt2('lit_danchun'), handCards, 'hidden');

            // 选择红桃牌
            const result = await player.chooseButton(dialog,
                (button) => get.value(button.link),
                (button) => get.suit(button.link) === 'heart'
            ).forResult();

            if (!result.bool) {
                dialog.close();
                return;
            }
            const selectedCard = result.links[0];

            // 选择操作
            const { control } = await player.chooseControl(['拿走', '置于牌堆顶', '取消', '返回'])
                .set("prompt", "【单纯】")
                .set("prompt2", `选择对${get.translation(selectedCard)}的操作`)
                .set("ai", () => {
                    if (get.attitude(player, target) < 0) {
                        let nextPlayer = player.nextSeat;
                        if (get.attitude(player, nextPlayer) > 0 && nextPlayer.hasJudge('lebu')) return '置于牌堆顶';
                        return '拿走';
                    }
                    return '取消';
                }).forResult();

            dialog.close();
            if (control === '置于牌堆顶') {
                await player.showCards(selectedCard, '置于牌堆顶');
                await target.lose(selectedCard, ui.cardPile, 'insert', 'visible');
                game.log(player, '将', selectedCard, '置于牌堆顶');
            } else if (control === '拿走') {
                await player.showCards(selectedCard, get.translation(player) + '拿走');
                await player.gain(selectedCard);
                game.log(player, '获得了', selectedCard);
            } else if (control === '返回') {
                // 返回，重新开始
                event.goto(0);
            }
        },
        ai: {
            threaten: 1.5,
            result: {
                target: (player, target) => {
                    return -target.countCards('h');
                },
                player: (player) => {
                    return player.countCards('h') < 3 ? 1 : 0.5;
                },
            },
            order: 10,
            expose: 0.4,
            effect: {
                target: (card, player, target) => {
                    if (target.countCards('h', card => get.suit(card) === 'heart') > 0) {
                        return [1, -0.3];
                    }
                },
            },
        },
    },
    lit_cidi: {
        trigger: {
            player: "loseAfter",
            global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
        },
        frequent: true,
        preHidden: true,
        filter: (event, player) => {
            if (player === _status.currentPhase) return false;
            if (event.name === "gain" && event.player === player) return false;
            const evt = event.getl(player);
            return evt && evt.cards2 && evt.cards2.length > 0;
        },
        async content(event, trigger, player) {
            const judge = player.judge((card) => {
                // 点数不为1则通过，可以存储
                if (get.number(card) !== 1) return 2;
                return -1;
            });
            judge.judge2 = (result) => result.bool;

            if (get.mode() !== "guozhan") {
                judge.callback = lib.skill.lit_cidi.callback;
                return void (await judge);
            }

            const { result } = await judge;
            if (!result.bool || get.position(result.card) !== "d") {
                return;
            }

            const card = result.card;
            const { bool } = await player.chooseBool(
                `是否将${get.translation(card)}作为"第"置于武将牌上？`
            ).set("ai", () => true).forResult();
            if (!bool) return;

            const addToExpansion = player.addToExpansion(card, "gain2");
            addToExpansion.gaintag.add("lit_cidi");
            await addToExpansion;
        },
        async callback(event, trigger, player) {
            if (!event.judgeResult.bool) {
                return;
            }
            const next = player.addToExpansion(event.judgeResult.card, "gain2");
            next.gaintag.add("lit_cidi");
            await next;
        },
        marktext: "第",
        intro: {
            content: "expansion",
            markcount: "expansion",
            mark: (dialog, content, player) => {
                const cards = player.getExpansions("lit_cidi");
                if (cards.length) {
                    dialog.addAuto(cards);
                }
            },
        },
        onremove: (player, skill) => {
            const cards = player.getExpansions(skill);
            if (cards.length) {
                player.loseToDiscardpile(cards);
            }
        },
        group: ["lit_cidi_shun", "lit_cidi_dist"],
        locked: false,
        subSkill: {
            dist: {
                locked: false,
                mod: {
                    globalFrom: (from, to, distance) => {
                        const expansions = from.getExpansions("lit_cidi");
                        let num = distance - expansions.length;
                        if (_status.event.skill === "lit_cidi_one_backup" ||
                            _status.event.skill === "gz_lit_cidi_one_backup") {
                            num++;
                        }
                        return num;
                    },
                },
                sub: true,
                sourceSkill: "lit_cidi",
            },
            shun: {
                enable: "phaseUse",
                filter: (event, player) => {
                    return player.getExpansions("lit_cidi").length > 0 &&
                        event.filterCard({ name: "shunshou" }, player, event);
                },
                chooseButton: {
                    dialog: (event, player) => {
                        const cards = player.getExpansions("lit_cidi");
                        return ui.create.dialog("次第：位次随着这些牌的消耗而上升", cards, "hidden");
                    },
                    filter(button, player) {
                        const card = button.link;
                        if (!game.checkMod(card, player, "unchanged", "cardEnabled2", player)) {
                            return false;
                        }
                        const evt = _status.event.getParent();
                        return evt.filterCard(get.autoViewAs({ name: "shunshou" }, [card]), player, evt);
                    },
                    backup: (links, player) => {
                        return {
                            selectCard: -1,
                            position: "x",
                            filterCard: card => links && card == links[0],
                            viewAs: { name: "shunshou" },
                            card: links[0],
                        };
                    },
                    prompt: (links, player) => {
                        return `请选择 顺手牵羊（${get.translation(links[0])}）的目标`;
                    },
                },
                ai: {
                    order: 10,
                    result: {
                        player: (player) => {
                            return player.getExpansions("lit_cidi").length - 1;
                        },
                    },
                },
                sub: true,
                sourceSkill: "lit_cidi",
            },
        },
        ai: {
            nodiscard: true,
            nolose: true,
            effect: {
                target: (card, player, target, current) => {
                    if (!target.hasFriend() && !player.hasUnknown()) return;
                    if (_status.currentPhase === target) return;

                    if (card.name !== "shuiyanqijunx" && get.tag(card, "loseCard") && target.countCards("he")) {
                        if (target.hasSkill("ziliang")) return 0.6;
                        return [0.4, Math.max(2, target.countCards("h") * 0.6)];
                    }

                    if (target.isUnderControl(true, player)) {
                        if ((get.tag(card, "respondSha") && target.countCards("h", "sha")) ||
                            (get.tag(card, "respondShan") && target.countCards("h", "shan"))) {
                            if (target.hasSkill("ziliang")) return 0.6;
                            return [0.4, 0.8];
                        }
                    } else if (get.tag(card, "respondSha") || get.tag(card, "respondShan")) {
                        if (get.attitude(player, target) > 0 && card.name === "juedou") return;
                        if (get.tag(card, "damage") && target.hasSkillTag("maixie")) return;
                        if (target.countCards("h") === 0) return 2;
                        if (target.hasSkill("ziliang")) return 0.6;
                        if (get.mode() === "guozhan") return 0.4;
                        return [0.4, Math.max(
                            target.countCards("h") / 4,
                            target.countCards("h", "sha") + target.countCards("h", "shan")
                        )];
                    }
                },
            },
            threaten: (player, target) => {
                if (target.countCards("h") === 0) return 2;
                return 0.6;
            },
        },
    },

    // 彭丽颖
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
            const card = event.cards[0];
            const target = event.targets[0];
            await player.$give(card, target, false);
            await target.equip(card);
            await player.recover();
            await player.draw();
        },
        discard: false,
        ai: {
            order: 10,
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
import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';

export const sort = 'ybs';
export const title = `追击·连杀·${styleText('o', "较难")}`;
export const intro = `${B("孙楠")}通过${get.poptip("lit_jiaoshui")}从他人处获取资源，配合${get.poptip("lit_zhishu")}将回合外获得的牌转化为"枝"牌进行输出。${get.poptip("lit_gonghuo")}能为敌人施加负面标记，在合适的时机造成额外伤害。`
    + "<li>主公：利用浇水收集资源，枝疏提供持续输出，注意保持攻击范围以触发枝疏的配合效果"
    + "<li>忠臣、反贼：通过拱火为关键敌人施加烂根标记，配合队友的出杀打爆发伤害，自己可利用枝疏②在回合外连续出杀"
    + "<li>内奸：枝疏提供的额外牌资源有助于后期单挑，注意控制“枝”牌数量";

export const character = {
    'lit_sunnan孙楠': {
        sex: "male",
        group: "three",
        hp: 4,
        skills: ["lit_shengjisn", "lit_jiaoshui", "lit_gonghuo", "lit_zhishu"],
    },
};

export const skill = {
    lit_jiaoshui: {
        trigger: {
            global: ["phaseDiscardBegin", "useCardAfter"],
        },
        filter(event, player) {
            if (!player.inRange(event.player)) return false;
            if (event.name === "phaseDiscard") return event.player !== player;
            if (event.name === "useCardAfter") return event.player !== player && event.card && event.card.name === "jiu";
            return false;
        },
        async cost(event, trigger, player) {
            const target = trigger.player;
            const result = await target.chooseBool(`浇水：是否令${get.translation(player)}摸一张牌？`)
                .set("ai", () => {
                    if (get.attitude(target, player) > 0) return true;
                    return target.countCards("h");
                }).forResult();
            event.result = {
                bool: true,
                cost_data: result,
            };
        },
        async content(event, trigger, player) {
            const target = trigger.player;
            const result = event.cost_data;
            if (result.bool) {
                await player.draw();
            } else if (target.countCards("h") > 0) {
                await player.gainPlayerCard(target, "h", "visible");
            }
        },
    },
    lit_jiaoshuiV2: {
        inherit: 'lit_jiaoshui',
        init: (player) => {
            if (player.hasSkill('lit_jiaoshui')) player.removeSkill('lit_jiaoshui');
        },
        filter(event, player) {
            if (event.name === "phaseDiscard") return event.player !== player;
            if (event.name === "useCardAfter") return event.player !== player && event.card && event.card.name === "jiu";
            return false;
        },
    },
    lit_gonghuo: {
        trigger: {
            global: "damageEnd",
        },
        filter(event, player) {
            return _status.currentPhase === player && event.source !== player && event.player && event.player.isIn();
        },
        async cost(event, trigger, player) {
            event.result = await player.chooseBool(`是否令${get.translation(trigger.player)}获得1层${get.poptip("lit_langen")}？`,
                `〖烂根〗：受到大于1的伤害时，伤害+1，生效后掉1层`).set("ai", () => {
                    return get.attitude(get.event().player, get.event().getTrigger().player) < 0;
                }).forResult();
        },
        async content(event, trigger, player) {
            if (!trigger.player.hasSkill("lit_langen")) trigger.player.addSkill("lit_langen");
            trigger.player.addMark("lit_langen", 1, false);
            game.log(trigger.player, "获得了1层", 'lit_langen');
        },
        ai: {
            expose: 0.1,
        },
    },
    lit_langen: {
        lit_neg: 2,
        derivation: "lit_negClear_faq",
        mark: true,
        marktext: "烂",
        intro: {
            name: "烂根",
            content: "预计还将烂掉#盆，你肯定是没浇水！<li>骗你的，浇水烂得更快</li>",
        },
        trigger: {
            player: "damageBegin3",
        },
        forced: true,
        filter(event, player) {
            return event.num > 1 && player.hasMark("lit_langen");
        },
        async content(event, trigger, player) {
            trigger.num++;
            player.removeMark("lit_langen", 1, false);
            game.log(player, "的", "lit_langen", "生效，伤害+1");
            if (player.countMark("lit_langen") <= 0) player.removeSkill("lit_langen");
        },
        group: "lit_negClear",
        ai: {
            threaten: 1.5,
            effect: {
                target(card, player, target) {
                    if (get.tag(card, "damage") && target.hasMark("lit_langen")) return 1.5;
                },
            },
        },
    },
    lit_zhishu: {
        forced: true,
        mark: true,
        marktext: "枝",
        intro: {
            content: "expansion",
            markcount: "expansion",
        },
        onremove(player, skill) {
            const cards = player.getExpansions(skill);
            if (cards.length) player.loseToDiscardpile(cards);
        },

        trigger: {
            player: "gainEnd",
        },
        filter(event, player) {
            if (_status.currentPhase === player || !event.cards) return false;
            let evt = event.getl(player);
            const cards = event.cards.filter(card => !evt.cards.includes(card));
            return cards.length > 0;
        },
        async content(event, trigger, player) {
            let evt = trigger.getl(player);
            const cards = trigger.cards.filter(card => !evt.cards.includes(card));
            if (cards.length > 0) {
                const next = player.addToExpansion(cards, player, "giveAuto");
                next.gaintag.add("lit_zhishu");
                await next;
            }
        },
        group: ["lit_zhishu_use", "lit_zhishu_sha"],
        subSkill: {
            used: {
                charlotte: true,
                sub: true,
                sourceSkill: "lit_zhishu",
            },
            use: {
                enable: "phaseUse",
                filter(event, player) {
                    return !player.hasSkill("lit_zhishu_used") && player.getExpansions("lit_zhishu").length >= 3;
                },
                async content(event, trigger, player) {
                    lib.lit.aiGuard.record(player, 'lit_zhishu_use');
                    const assessment = lib.skill.lit_zhishu.subSkill.use.evaluate(player);
                    if (!assessment.shouldUse) return;
                    const huos = player.getExpansions("lit_zhishu");
                    const jiuResult = await player.chooseCardButton(1, huos, "枝疏：选择1张“枝”作为【酒】").set("ai", card => {
                        if (get.name(card, player) === "sha") return -1;
                        return get.unuseful(card);
                    }).forResult();
                    if (!jiuResult.bool) return;

                    const shaResult = await player.chooseCardButton(2, huos.filter(card => !jiuResult.links.includes(card)), "枝疏：选择2张“枝”作为【杀】").set("ai", card => {
                        if (get.name(card, player) === "sha") return -1;
                        return get.unuseful(card);
                    }).forResult();
                    if (!shaResult.bool) return;

                    const cards = [...jiuResult.links, ...shaResult.links];
                    const jiuCard = get.autoViewAs({ name: "jiu", isCard: true }, [cards[0]]);
                    const shaCard = get.autoViewAs({ name: "sha", isCard: true }, [cards[1], cards[2]]);
                    const targetResult = await player.chooseTarget(`选择一名角色，询问其是否对其攻击范围内的1人使用酒【杀】，若其拒绝，你获得${get.translation(cards)}`, (card, player, target) => {
                        return ui.selected.targets.length < 1;
                    }).set("ai", target => {
                        const canUseJiu = target.canUse(jiuCard, target, true, false);
                        const canUseSha = target.hasUseTarget(shaCard, true, false);
                        let attackScore = -Infinity;
                        if (canUseSha) {
                            game.countPlayer(current => {
                                if (target.canUse(shaCard, current, true, false)) {
                                    attackScore = Math.max(attackScore, get.effect(current, shaCard, target, target));
                                }
                            });
                        }
                        const gainBack = get.attitude(player, target) > 0 ? 0.6 : 1.2;
                        return Math.max(canUseSha ? attackScore + (canUseJiu ? 0.4 : 0) : -Infinity, gainBack);
                    }).set("selectTarget", () => {
                        if (ui.selected.targets.length < 1) return [1, 1];
                        return [1, Infinity];
                    }).set("targetprompt2", [target => {
                        const hints = [];

                        // 判断谁能喝酒，范围内能杀到人
                        if (ui.selected.targets.length < 1) {
                            if (target.canUse(jiuCard, target, true, false)) {
                                hints.push("可喝酒");
                            } else {
                                hints.push("不可喝酒");
                            }
                            if (target.hasUseTarget(shaCard, true, false)) {
                                hints.push("可用杀");
                            } else {
                                hints.push("不可用杀");
                            }
                        }
                        // 判断能杀到哪些
                        else {
                            const user = ui.selected.targets[0];
                            const shaTargets = game.filterPlayer2(current => {
                                return user.canUse(shaCard, current, true, false);
                            }, true);

                            if (target === user) {
                                if (shaTargets.length === 0) {
                                    hints.push("(._.`)");
                                    hints.push("没法用杀");
                                } else if (user.canUse(jiuCard, user, true, false)) {
                                    hints.push("（＃｀皿´）");
                                    hints.push("准备酒杀");
                                } else {
                                    hints.push("（｀ー´）");
                                    hints.push("普通杀也行");
                                }
                            } else {
                                if (shaTargets.includes(target)) {
                                    hints.push("能被杀到");
                                } else {
                                    hints.push("没法被杀到");
                                }
                            }
                        }

                        return hints.join('<br>') || undefined;
                    }]).set("complexTarget", true).forResult();
                    if (!targetResult.bool) return;

                    player.addTempSkill("lit_zhishu_used", { player: "phaseUseAfter" });
                    const user = targetResult.targets[0];
                    const canUseJiu = user.canUse(jiuCard, user, true, false);
                    const shaTargets = game.filterPlayer2(current => {
                        return user.canUse(shaCard, current, true, false);
                    }, true);

                    if (shaTargets.length > 0) {
                        let prompt = "枝疏：是否";
                        if (canUseJiu) prompt += `使用酒（${get.translation(cards[0])}）后，`;
                        prompt += `对你攻击范围内的1人使用杀（${get.translation([cards[1], cards[2]])}）？`;

                        // 林淼怎么办？也许需要改
                        const useResult = await user.chooseTarget(prompt, (card, player, target) => {
                            return shaTargets.includes(target);
                        }).set("ai", target => {
                            return get.effect(target, shaCard, user, user);
                        }).forResult();

                        if (useResult.bool) {
                            if (canUseJiu) await user.useCard(jiuCard, user, [cards[0]]);
                            else player.loseToDiscardpile(cards[0]);
                            await user.useCard(shaCard, useResult.targets, [cards[1], cards[2]], false);
                            return;
                        }
                    }

                    await player.gain(cards, player, "gain2");
                },
                ai: {
                    order: (item, player) => {
                        if (lib.lit.aiGuard.blocked(player, 'lit_zhishu_use')) return -1;
                        const assessment = lib.skill.lit_zhishu.subSkill.use.evaluate(player);
                        if (!assessment.shouldUse) return -1;
                        return 7 + Math.min(assessment.score, 2);
                    },
                    result: {
                        player(player) {
                            return lib.skill.lit_zhishu.subSkill.use.evaluate(player).score;
                        },
                    },
                },
                evaluate(player) {
                    const huos = player.getExpansions("lit_zhishu");
                    // 成本校验：酒/杀两个内层选牌 AI 都拒绝“杀”名枝，故需至少 3 张非“杀”枝，AI 才可能选完
                    if (huos.length < 3 || player.hasSkill("lit_zhishu_used") ||
                        huos.filter(c => get.name(c, player) !== "sha").length < 3) {
                        return { shouldUse: false, score: -1 };
                    }
                    let best = -Infinity;
                    game.countPlayer(user => {
                        const canUseJiu = user.canUse({ name: "jiu", isCard: true }, user, true, false);
                        const canUseSha = user.hasUseTarget({ name: "sha", isCard: true }, true, false);
                        let attackScore = -Infinity;
                        if (canUseSha) {
                            game.countPlayer(target => {
                                if (user.canUse({ name: "sha", isCard: true }, target, true, false)) {
                                    attackScore = Math.max(attackScore, get.effect(target, { name: "sha", isCard: true }, user, user));
                                }
                            });
                        }
                        const gainBack = get.attitude(player, user) > 0 ? 0.6 : 1.2;
                        const score = Math.max(canUseSha ? attackScore + (canUseJiu ? 0.4 : 0) : -Infinity, gainBack);
                        best = Math.max(best, score);
                    });
                    if (!Number.isFinite(best)) best = -1;
                    return {
                        shouldUse: best > 0,
                        score: best > 0 ? best : -1,
                    };
                },
                sub: true,
                sourceSkill: "lit_zhishu",
            },
            sha: {
                trigger: {
                    global: "useCardAfter",
                },
                filter(event, player) {
                    if (event.card.name !== "sha") return false;
                    const huos = player.getExpansions("lit_zhishu");
                    if (huos.length === 0) return false;

                    return event.player === player || player.inRange(event.player);
                },
                async cost(event, trigger, player) {
                    const huos = player.getExpansions("lit_zhishu");
                    const result = await player.chooseCardButton(huos, "枝疏：选择1张“枝”使用或置入手牌区").set("ai", card => {
                        if (player.hasUseTarget(card)) return get.value(card);
                        return 5 - get.value(card);
                    }).forResult();

                    event.result = {
                        bool: result.bool,
                        cost_data: result.links,
                    };
                },
                async content(event, trigger, player) {
                    const card = event.cost_data[0];
                    if (player.hasUseTarget(card)) {
                        const result = await player.chooseUseTarget(card).set("prompt2", `或选择取消，将${get.translation(card)}置入手牌区`).forResult();
                        if (result.bool) return;
                    }

                    await player.gain(card, player, "gain2");
                },
                sub: true,
                sourceSkill: "lit_zhishu",
            },
        },
        ai: {
            threaten: 1.2,
            effect: {
                target(card, player, target) {
                    if (get.tag(card, "gainCard")) return [1, 0.5];
                },
            },
        },
    },
};

export const translate = {
    'lit_sunnan孙楠': "孙楠",
    'lit_sunnan_dark': "暗面",
    'lit_jiaoshui': "浇水",
    'lit_jiaoshui_info': "在你攻击范围内，他人使用【酒】后，或其弃牌阶段开始时，其可令你摸1张牌，若其不选择或忘记了选择，你可观看并获得其1张牌",
    'lit_jiaoshuiV2': "浇水V2",
    'lit_jiaoshuiV2_info': "他人使用【酒】后，或其弃牌阶段开始时，其可令你摸1张牌，若其不选择或忘记了选择，你可观看并获得其1张牌",
    'lit_gonghuo': "拱火",
    'lit_gonghuo_info': `你的回合内有人受伤后，若伤害源不为你，则你可令其获得1层${get.poptip('lit_langen')}`,
    'lit_langen': "烂根",
    'lit_langen_info': "负面效果，生效后失去1层。当你受到大于1的伤害时，令此伤害+1",
    'lit_zhishu': "枝疏",
    'lit_zhishu_info': "锁定技，你于回合外获得的「不来自你区域内的牌」不进入你的手牌区，而是放置在你的角色牌上称为“枝”<br>①出牌阶段限一次，你可选择3张“枝”，将其中第一张视为【酒】，后两张视为【杀】，询问1人是否喝酒后对其攻击范围内的1人使用杀；若其不使用，你获得这些牌<br>②你或你攻击范围内的角色使用【杀】后，你可使用1张“枝”，或将其置入手牌区",
    'lit_shengjisn': "升级·孙楠",
    'lit_shengjisn_info': "获得并修改〖浇水〗：去掉开头的「在你攻击范围内」限制",
};

export const simpleTranslate = {
    'lit_jiaoshui_info': "你攻击范围内的他人弃牌阶段或使用酒后，其可令你+1牌；否则你观看并获得其1张牌",
    'lit_jiaoshuiV2_info': "他人弃牌阶段或使用酒后，其可令你+1牌；否则你观看并获得其1张牌",
    'lit_gonghuo_info': `回合内有人受伤后，若伤害源不为你，则可令其获得1层${get.poptip('lit_langen')}`,
    'lit_langen_info': "负面；生效后失去1层。受到大于1的伤害时，令此伤害+1",
    'lit_zhishu_info': "锁；回合外获得非你的区域内的牌置为“枝”<br>①出牌限1次，选3张“枝”：第1张作酒，后2张作杀，令1人选择是否酒杀攻击范围内的1人；不杀，你获得这些牌<br>②你或攻击范围内的人使用杀后，你可使用1张“枝”或将其置入手牌区",
    'lit_shengjisn_info': "获得并修改“浇水”：不受攻击范围限制",
};

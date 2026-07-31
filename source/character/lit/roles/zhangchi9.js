import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';

export const sort = 'jbs';
export const perfectPair = ['lit_zhangchi张驰', 'lit_liyang9李洋'];

export const character = {
    'lit_zhangchi9张驰': {
        sex: "male",
        group: "nine",
        hp: 4,
        maxHp: 5,
        skills: ["lit_bolun", "lit_jiqingsishe"],
        groupInGuozhan: "three",
    },
};

export const skill = {
    // 9张驰
    lit_bolun: {
        init: (player, skill) => {
            player.storage.lit_bolun = [[], []];
        },
        derivation: "lit_jiqing",
        enable: ["chooseToUse", "chooseToRespond"],
        hiddenCard: (player, name) => {
            return lib.inpile.includes(name) && player.countCards("hs") > 0;
        },
        filter: (event, player) => {
            if (!player.countCards("hs")) return false;
            const pile = lib.inpile.filter(e => !player.storage.lit_bolun[0].includes(e)),
                pile_nature = lib.inpile_nature.concat(undefined).filter(e => !player.storage.lit_bolun[1].includes(e));
            for (let i of pile) {
                const type = get.type(i);
                if (i === "sha") {
                    for (let j of pile_nature) {
                        if (event.filterCard(get.autoViewAs({ name: i, nature: j }, "unsure"), player, event)) return true;
                    }
                } else if (type === "basic" || type === "trick") {
                    if (event.filterCard(get.autoViewAs({ name: i }, "unsure"), player, event)) return true;
                }
            }
            return false;
        },
        chooseButton: {
            dialog: (event, player) => {
                const list = [];
                for (const i of lib.inpile) {
                    if (event.type != "phase") if (!event.filterCard(get.autoViewAs({ name: i }, "unsure"), player, event)) continue;
                    const type = get.type(i);
                    if (type === "basic" || type === "trick") list.push([type, "", i]);
                    if (i === "sha") {
                        for (const j of lib.inpile_nature) {
                            if (event.type != "phase") if (!event.filterCard(get.autoViewAs({ name: i, nature: j }, "unsure"), player, event)) continue;
                            list.push(["基本", "", "sha", j]);
                        }
                    }
                }
                return ui.create.dialog("悖论", [list, "vcard"]);
            },
            filter: (button, player) => {
                const evt = get.event().getParent();
                if (!evt.filterCard(get.autoViewAs({ name: button.link[2], nature: button.link[3] }, "unsure"), player, evt)) return false;
                if (button.link[2] === 'sha') return !player.storage.lit_bolun[1].includes(button.link[3]);
                return !player.storage.lit_bolun[0].includes(button.link[2]);
            },
            check(button) {
                const player = get.event().player;
                const parent = get.event().getParent();
                const card = { name: button.link[2], nature: button.link[3] };
                const val = parent.type === "phase" ? player.getUseValue(card) : 1;
                if (val <= 0) return 0;

                const roundCount = player.storage.lit_bolun_round || 0;

                // 防刷牌：使用次数过多时大幅降低牌型价值
                if (roundCount >= 5) return val * 0.05;
                if (roundCount >= 4) return val * 0.15;
                if (roundCount >= 3) return val * 0.35;
                if (roundCount >= 2) {
                    // 已刷过牌，优先伤害牌而非刷牌牌型
                    const drawCards = ["wuzhong", "shunshou", "wugu", "taoyuan"];
                    if (drawCards.includes(card.name)) return val * 0.4;
                }

                // 判断手牌中是否有真牌（排除装备/延时锦囊）
                const hasReal = player.countCards("h", function (cardx) {
                    const type = get.type(cardx);
                    if (type === "equip" || get.subtype(cardx) === "delay") return false;
                    if (card.name === cardx.name) {
                        if (card.name != "sha") return true;
                        return get.is.sameNature(card, cardx);
                    }
                    return false;
                });

                // 场景化：检查是否有"必质疑"角色
                const isLast = game.countPlayer(function (current) {
                    return current !== player && get.attitude(player, current) > 0;
                }) === 0;

                if (!isLast) {
                    const mustBetray = game.hasPlayer(function (current) {
                        if (current === player || current.hasSkill("lit_jiqing", null, false, true)) return false;
                        const attitude = get.attitude(current, player);
                        // 敌人1血且在攻击范围内 + 声明杀 → 必质疑（横竖都是死）
                        if (attitude < 0 && card.name === "sha" && current.hp === 1 && player.inRange(current)) return true;
                        // 队友濒死 + 声明桃 → 必质疑（不质疑就死）
                        if (attitude > 0 && card.name === "tao" && current.hp <= 0) return true;
                        return false;
                    });
                    // 有必质疑者且无真牌 → 不能声明此牌型
                    if (mustBetray && !hasReal) return 0;
                }

                // 假牌概率：基础5%，每连续成功+3%，上限25%
                // 最后一人时放宽到基础15%
                const successCount = player.storage.lit_bolun_success || 0;
                let fakeProb = isLast ? 0.15 : 0.05;
                fakeProb += successCount * 0.03;
                if (fakeProb > 0.25) fakeProb = 0.25;

                if (!hasReal) {
                    // 无真牌：按假牌概率决定是否选此牌型
                    // 价值打折，概率越高折扣越小
                    return val * fakeProb * 1.5;
                }

                // 有真牌：正常评估
                return val;
            },
            backup: (links, player) => {
                return {
                    filterCard(card, player, target) {
                        let result = true;
                        const suit = card.suit,
                            number = card.number;
                        card.suit = "none";
                        card.number = null;
                        const mod = game.checkMod(card, player, "unchanged", "cardEnabled2", player);
                        if (mod != "unchanged") result = mod;
                        card.suit = suit;
                        card.number = number;
                        return result;
                    },
                    selectCard: 1,
                    position: "hs",
                    ignoreMod: true,
                    viewAs: {
                        name: links[0][2],
                        nature: links[0][3],
                        suit: "none",
                        number: null,
                    },
                    ai1(card) {
                        const player = get.event().player;
                        const cardx = lib.skill.lit_bolun_backup.viewAs;
                        const cardValue = get.value(card);
                        const isReal = (card.name === cardx.name && (card.name != "sha" || get.is.sameNature(card, cardx)));

                        // 场景化检查
                        const isLast = game.countPlayer(function (current) {
                            return current !== player && get.attitude(player, current) > 0;
                        }) === 0;

                        if (!isLast) {
                            const mustBetray = game.hasPlayer(function (current) {
                                if (current === player || current.hasSkill("lit_jiqing", null, false, true)) return false;
                                const attitude = get.attitude(current, player);
                                if (attitude < 0 && cardx.name === "sha" && current.hp === 1 && player.inRange(current)) return true;
                                if (attitude > 0 && cardx.name === "tao" && current.hp <= 0) return true;
                                return false;
                            });
                            // 有必质疑者 → 必须用真牌
                            if (mustBetray) {
                                if (isReal) return 14 - cardValue;
                                return 0;
                            }
                        }

                        // 真牌：优先用低价值的（保留高价值真牌）
                        if (isReal) {
                            return 14 - cardValue;
                        }

                        // 假牌：价值极低时才考虑
                        // 装备和延时锦囊本身有价值，不要当废牌
                        const type = get.type(card);
                        if (type === "equip" || get.subtype(card) === "delay") {
                            // 装备/延时锦囊不能匹配任何声明牌型，只能当假牌
                            // 但本身有价值，所以只在价值<4时才扣置
                            if (cardValue < 4) return 2 - cardValue * 0.3;
                            return 0;
                        }

                        // 普通假牌
                        if (cardValue < 2) return 1.5 - cardValue;
                        return 0;
                    },
                    async precontent(event, trigger, player) {
                        await player.logSkill("lit_bolun");
                        player.addTempSkill("lit_bolun_guess");
                        // 增加本回合使用计数
                        player.storage.lit_bolun_round = (player.storage.lit_bolun_round || 0) + 1;
                        const [card] = event.result.cards;
                        event.result.card.suit = get.suit(card);
                        event.result.card.number = get.number(card);
                    },
                };
            },
            prompt: (links, player) => {
                return `将一张手牌当作 ${get.translation({ name: links[0][2], nature: links[0][3] })} ${get.event().name === "chooseToRespond" ? "打出" : "使用"}`;
            },
        },
        ai: {
            save: true,
            respondSha: true,
            respondShan: true,
            fireAttack: true,
            skillTagFilter: (player) => {
                if (!player.countCards("hs")) return false;
            },
            threaten: 1.4,
            order: 7,
            result: {
                player(player) {
                    const roundCount = player.storage.lit_bolun_round || 0;

                    // 防刷牌硬底线
                    if (roundCount >= 6) return 0;
                    if (roundCount >= 5) return 0.05;
                    if (roundCount >= 4) return 0.15;

                    const hasEnemy = game.hasPlayer(function (current) {
                        return current != player && !current.hasSkill("lit_jiqing", null, false, true) && (get.realAttitude || get.attitude)(current, player) < 0;
                    });

                    // 有敌人时：手牌多可以发动，但要收敛
                    if (hasEnemy) {
                        if (roundCount >= 3) return 0.3;
                        if (roundCount >= 2) return 0.5;
                        if (player.countCards("h") >= 5) return 0.8;
                        if (player.countCards("h") >= 3) return 0.6;
                        return 0.3;
                    }

                    // 无敌人时：可以刷牌，但也不能无限刷
                    if (roundCount >= 3) return 0.4;
                    if (roundCount >= 2) return 0.7;
                    return 1.0;
                },
            },
        },
        group: ["lit_bolun_count"],
        subSkill: {
            count: {
                charlotte: true,
                trigger: { player: "phaseBegin" },
                silent: true,
                firstDo: true,
                content() {
                    player.storage.lit_bolun_round = 0;
                    player.storage.lit_bolun_success = 0;
                }
            }
        }
    },
    lit_bolun_guess: {
        onremove: (player, skill) => {
            player.storage.lit_bolun = [[], []];
        },
        trigger: {
            player: ["useCardBefore", "respondBefore"],
        },
        forced: true,
        silent: true,
        popup: false,
        charlotte: true,
        firstDo: true,
        filter: (event, player) => {
            return event.skill && event.skill.indexOf("lit_bolun_") === 0;
        },
        async content(event, trigger, player) {
            event.fake = false;
            const card = trigger.cards[0];
            if (card.name != trigger.card.name || (card.name === "sha" && !get.is.sameNature(trigger.card, card))) {
                event.fake = true;
            }
            player.line(trigger.targets, get.nature(trigger.card));
            let cardTranslate = get.translation(trigger.card.name);
            trigger.card.number = get.number(card);
            trigger.card.suit = get.suit(card);
            trigger.skill = "lit_bolun_backup";
            if (trigger.card.name === "sha" && get.natureList(trigger.card).length) {
                cardTranslate = get.translation(trigger.card.nature) + cardTranslate;
            }
            player.popup(cardTranslate, trigger.name === "useCard" ? "metal" : "wood");
            const prompt = `是否质疑 ${get.translation(player)} 声明的 ${cardTranslate}？`;
            game.log(player, "声明了", `#y${cardTranslate}`);
            const targets = game.filterPlayer(function (current) {
                return current != player && !current.hasSkill("lit_jiqing", null, false, true);
            }).sortBySeat();
            const targets2 = targets.slice(0);
            player.lose(card, ui.ordering).relatedEvent = trigger;

            const betrays = [];

            if (targets.length) {
                if (_status.connectMode) {
                    const list = targets.map(function (target) {
                        return [target, [prompt, [["lit_bolun_ally", "lit_bolun_betray"], "vcard"]], true];
                    });
                    const result = await player.chooseButtonOL(list)
                        .set("switchToAuto", function () {
                            _status.event.result = "ai";
                        })
                        .set("processAI", function () {
                            let player = _status.event.player;
                            let evt = _status.event.getParent("lit_bolun_guess");
                            if (!evt) {
                                return {
                                    bool: true,
                                    links: [["", "", "lit_bolun_ally"]],
                                };
                            }
                            let source = evt.player;
                            let attitude = (get.realAttitude || get.attitude)(player, source);
                            let evtx = evt.getTrigger();
                            let declaredCard = evtx ? evtx.card : null;

                            if (player.hp <= 1 || attitude >= 3) {
                                return {
                                    bool: true,
                                    links: [["", "", "lit_bolun_ally"]],
                                };
                            }

                            let betrayProb = attitude < 0 ? 0.6 : 0.3;

                            let highValueCards = ["tao", "jiu", "wuzhong", "shunshou", "guohe"];
                            if (declaredCard && highValueCards.includes(declaredCard.name)) {
                                betrayProb += 0.25;
                            }

                            if (source.countCards("h") <= 2) {
                                betrayProb += 0.2;
                            }

                            if (declaredCard && source.storage.lit_bolun && source.storage.lit_bolun[0]) {
                                let used = source.storage.lit_bolun[0].includes(declaredCard.name);
                                if (used) betrayProb -= 0.15;
                            }

                            if (player.countCards("h", ["tao", "jiu"]) > 0) {
                                betrayProb += 0.1;
                            }

                            betrayProb = Math.min(0.9, Math.max(0.05, betrayProb));
                            let choice = Math.random() < betrayProb ? "lit_bolun_betray" : "lit_bolun_ally";
                            return {
                                bool: true,
                                links: [["", "", choice]],
                            };
                        }).forResult();
                    for (let i in result) {
                        if (result[i].links[0][2] === "lit_bolun_betray") {
                            betrays.push(lib.playerOL[i]);
                            lib.playerOL[i].addExpose(0.2);
                        }
                    }
                } else {
                    for (const target of targets) {
                        const result = await target.chooseButton([prompt, [["lit_bolun_ally", "lit_bolun_betray"], "vcard"]], true)
                            .set("ai", function (button) {
                                let player = _status.event.player;
                                let evt = _status.event.getParent("lit_bolun_guess");
                                if (!evt) return 0;
                                let source = evt.player;
                                let ally = button.link[2] === "lit_bolun_ally";
                                let attitude = get.attitude(player, source);
                                let evtx = evt.getTrigger();
                                let declaredCard = evtx ? evtx.card : null;

                                if (player.hp <= 1 || attitude >= 3) {
                                    return ally ? 10 : 0;
                                }

                                let betrayBase = attitude < 0 ? 0.6 : 0.3;

                                let highValueCards = ["tao", "jiu", "wuzhong", "shunshou", "guohe"];
                                if (declaredCard && highValueCards.includes(declaredCard.name)) {
                                    betrayBase += 0.25;
                                }

                                if (source.countCards("h") <= 2) {
                                    betrayBase += 0.2;
                                }

                                if (declaredCard && source.storage.lit_bolun && source.storage.lit_bolun[0]) {
                                    let used = source.storage.lit_bolun[0].includes(declaredCard.name);
                                    if (used) betrayBase -= 0.15;
                                }

                                if (player.countCards("h", ["tao", "jiu"]) > 0) {
                                    betrayBase += 0.1;
                                }

                                let rand = Math.random();
                                let shouldBetray = rand < Math.min(0.9, Math.max(0.05, betrayBase));
                                return ally ? (shouldBetray ? 0 : 10) : (shouldBetray ? 10 : 0);
                            }).forResult();
                        if (result.links[0][2] === "lit_bolun_betray") {
                            betrays.push(target);
                            target.addExpose(0.2);
                        }
                    }
                }
            }

            for (const i of targets2) {
                const b = betrays.includes(i);
                i.popup(b ? "质疑！" : "不质疑", b ? "fire" : "wood");
                game.log(i, b ? "#y质疑！" : "#g不质疑");
            }
            await game.delay();

            player.showCards(trigger.cards);
            if (betrays.length) {
                betrays.sortBySeat();
                if (event.fake) {
                    game.asyncDraw(betrays);
                    trigger.cancel();
                    trigger.getParent().goto(0);
                    game.log(player, "声明的", `#y${cardTranslate}`, "作废了");
                    if (trigger.card.name != 'sha') {
                        player.storage.lit_bolun[0].push(trigger.card.name);
                    } else {
                        player.storage.lit_bolun[1].push(trigger.card.nature);
                    }
                    player.storage.lit_bolun_success = 0;
                } else {
                    const next = game.createEvent("lit_bolun_final", false);
                    event.next.remove(next);
                    trigger.after.push(next);
                    next.targets = betrays;
                    next.setContent(lib.skill.lit_bolun_guess.contentx);
                    player.storage.lit_bolun_success = (player.storage.lit_bolun_success || 0) + 1;
                    return;
                }
            } else {
                player.storage.lit_bolun_success = (player.storage.lit_bolun_success || 0) + 1;
                return;
            }

            await game.delayx();
        },
        async contentx(event, trigger, player) {
            const targets = event.targets;
            while (targets.length) {
                const target = targets.shift();
                const result = await target.chooseControl('失去体力', '获得基情')
                    .set('prompt', '【质疑】失败')
                    .set('prompt2', "随机失去1~2点体力或获得「基情」")
                    .set("ai", function () {
                        let player = _status.event.player;
                        if (player.hp > 2 && player.countCards("h", ["tao", "jiu"]) > 0) return '失去体力';
                        if (player.hp <= 1) return '获得基情';
                        if (player.hp === 2) {
                            if (player.countCards("h", "tao") > 0) return '失去体力';
                            return '获得基情';
                        }
                        if (player.hp > 2) {
                            if (player.isZhu || game.countPlayer(function (current) {
                                return current !== player && get.attitude(current, player) > 0;
                            }) >= 2) {
                                return '失去体力';
                            }
                            return '失去体力';
                        }
                        return '获得基情';
                    }).forResult();

                if (result.control === '失去体力') {
                    target.loseHp(Math.floor((Math.random() * 2) + 1));
                } else {
                    target.addSkills('lit_jiqing');
                }
            }
        },
    },
    lit_jiqing: {
        lit_neg: 1,
        derivation: "lit_negClear_faq",
        direct: true,
        init: function (player, skill) {
            if (player.hp <= 1) {
                player.logSkill(skill);
                player.addSkill("lit_jiqing_log");
            }
            player.addSkillBlocker(skill);
        },
        onremove: function (player, skill) {
            player.removeSkill("lit_jiqing_log");
            player.removeSkillBlocker(skill);
        },
        skillBlocker: function (skill, player) {
            if (player.hp === 1) return skill != "lit_jiqing" && !lib.skill[skill].charlotte;
            return skill != "lit_jiqing" && !lib.skill[skill].charlotte && !get.is.locked(skill, player) && player.hp < 1;
        },
        mark: true,
        intro: {
            name: "陷入基情",
            content: function (storage, player, skill) {
                let str = "<li>锁定技，你不能质疑氹，你体力为1时，其他技能无效；体力<1时，主动技能无效";
                let list = player.getSkills(null, false, false).filter(function (i) {
                    return lib.skill.lit_jiqing.skillBlocker(i, player);
                });
                if (list.length) str += `<li>失效技能：${get.translation(list)}`;
                return str;
            },
        },
        trigger: {
            player: ['changeHp', 'loseMaxHpAfter'],
        },
        filter: (event, player) => {
            let num = event.name === 'changeHp' ? event.num : -event.loseHp;
            if (num === 0) return false;
            let ori_hp = get.sgn(player.hp - num - 1),
                hp = get.sgn(player.hp - 1);
            return ori_hp * hp <= 0;
        },
        async content(event, trigger, player) {
            await player.logSkill(event.skill);
        },
        ai: {
            neg: true,
        },
    },
    lit_jiqingsishe: {
        derivation: "lit_jiqing",
        trigger: {
            player: "dieBefore",
        },
        priority: 99,
        firstDo: true,
        forced: true,
        nobracket: true,
        skillAnimation: true,
        animationColor: "soil",
        forceDie: true,
        filter: () => {
            return game.hasPlayer((current) => {
                return current.hasSkill('lit_jiqing');
            });
        },
        content() {
            'step 0'
            player.chooseTarget("【激情四射】", "选择1人带走", (card, player, target) => {
                return target.hasSkill('lit_jiqing');
            }).set("ai", (target) => {
                let att = get.attitude(get.event().player, target);
                if (att) return att <= 0;
            }).set('forceDie', true).set('num', 1);
            "step 1"
            if (result.bool && result.targets && result.targets.length) {
                var target = result.targets[0];
                event.target = target;
                player.line(target, { color: [255, 255, 0] });
                game.delay(2);
            }
            "step 2"
            target.judge("【激情四射】", (card) => {
                if (['tao', 'taoyuan'].includes(card.name)) return 10;
                return -10;
            }).judge2 = (result) => {
                return result.bool === false ? true : false;
            };
            "step 3"
            if (result.judge < 0) {
                lib.element.player.die.apply(target, []).source = player;
            }
        },
        ai: {
            threaten: 0.1,
            notemp: true,
        },
    },
};

export const translate = {
    'lit_zhangchi9张驰': "9张驰",
    'lit_zhangchi9张驰_prefix': "9",
    'lit_bolun': "悖论",
    'lit_bolun_info': `你可以扣置一张手牌并声明一种${get.poptip("lit_basicTrickCard")}，视为你使用或打出之，其他角色可同时质疑：<li>若有人质疑且声明的牌与扣置之牌不相符，` +
        `则此牌无效且本回合内无法再次被声明，质疑者各摸一张牌；</li><li>否则此牌生效，质疑者选择一项：1.随机失去1~2点体力；2.获得${get.poptip('lit_jiqing')}</li>`,
    'lit_bolun_ally': "信任",
    'lit_bolun_betray': "质疑",
    'lit_bolun_ally_bg': "真",
    'lit_bolun_betray_bg': "假",
    'lit_jiqing': "基情",
    'lit_jiqing_info': `锁定技，你不能质疑${get.poptip('lit_bolun')}；当你体力值为1时，${styleText('r', '你的其他技能无效')}；当你体力值小于1时，${styleText('r', '你的非锁定技无效')}`,
    'lit_jiqingsishe': "激情四射",
    'lit_jiqingsishe_info': `锁定技，当你死亡前，你选择一名拥有${get.poptip('lit_jiqing')}的角色，令其判定，若结果不为【桃】或【桃园结义】，则其死亡`,
};

export const simpleTranslate = {
    'lit_bolun_info': `扣1手牌视为用出任意${get.poptip("lit_basicTrickCard")}，可被质疑：<br>①成功：此牌无效且本回合不可再声明它，质疑者+1牌<br>②失败：此牌生效，质疑者选择随机失1~2血或获得${get.poptip('lit_jiqing')}`,
    'lit_jiqing_info': `锁；无法质疑${get.poptip("lit_bolun")}。体为1时${styleText('r', '其他技能失效')}，<1时${styleText('r', '主动技能失效')}`,
    'lit_jiqingsishe_info': `锁；死前选拥有${get.poptip('lit_jiqing')}的1人令其判定：${styleText('r', '不为桃或桃园结义则其死亡')}`,
};

export const pinyins = {
    '悖论': ['bó', 'lùn'],
};

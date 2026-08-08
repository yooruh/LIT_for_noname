import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';

export const sort = 'sdp';
export const title = `辅助·反伤·过牌·${styleText('o', "较难")}`;
export const intro = `依赖${get.poptip("lit_guimi")}联动的爆发型角色。闺蜜在场时${B("菠树")}${get.poptip("lit_yisui")}锁定手牌数为3，且闺蜜满血时免疫伤害，防御和攻击能力没有看起来的那么不堪。通过合理选择闺蜜并控制手牌状态，菠树能通过连续摸牌来达到爆发的效果。升级后闺蜜死亡不再导致体力流失，能些微提高容错率。`
    + "<li>主公：完全不推荐，闺蜜给到反贼就废了一半。唯一能想到的打法是利用闺蜜+易碎摸7张初始牌的性质，用手气卡刷出AK突突全场"
    + "<li>忠臣：建议选主公为闺蜜，第一轮有闺蜜回血，主公牌满血相对容易。前期不用留太多防御牌，但后期要打输出必须先发育好装备"
    + "<li>反贼、内奸：开局不给主公闺蜜就跳了一半身份，建议选容易满血的角色为闺蜜。适应前置位，离主公近一点也没事，反正主公也不敢轻易动你";

export const character = {
    'lit_boshu菠树': {
        sex: "female",
        group: "three",
        hp: 1,
        skills: ["lit_shengjibs", "lit_guimi", "lit_yisui"],
    },
};

export const skill = {
    lit_guimi: {
        forced: true,
        marktext: "闺",
        intro: {
            content: (storage, player) => {
                return "已与" + get.translation(player.getStorage("lit_guimi_total"))
                    + "成为闺蜜<li>手牌上限+2<li>每间隔1轮的轮次中每回合首次受伤后+1血<li>♥️♦️牌可救" + get.translation(player.getStorage("lit_guimi_total"))
                    + "<br>（恢复效果" + (player.isTempBanned("lit_guimi_recover") ? "已失效）" : "生效中）");
            },
        },
        init: (player) => {
            if (game.roundNumber !== 0) {
                player.useSkill('lit_guimi_tie');
            }
        },
        onremove: (player) => {
            game.countPlayer(current => {
                if (current.hasMark('lit_guimi') && current.getStorage("lit_guimi_total") === player) {
                    delete current.storage.lit_guimi_total;
                    current.removeMark('lit_guimi');
                }
            });
        },
        group: ["lit_guimi_die", "lit_guimi_tie"],
        subSkill: {
            die: {
                charlotte: true,
                trigger: {
                    player: 'die',
                },
                unique: true,
                silent: true,
                forceDie: true,
                filter: (trigger) => {
                    return game.hasPlayer(current => {
                        return current.hasMark('lit_guimi') && current.getStorage("lit_guimi_total") === trigger.player;
                    });
                },
                async content(event, trigger, player) {
                    game.countPlayer(current => {
                        if (current.hasMark('lit_guimi') && current.getStorage("lit_guimi_total") === trigger.player) {
                            delete current.storage.lit_guimi_total;
                            current.removeMark('lit_guimi');
                        }
                    });
                },
                sub: true,
                sourceSkill: "lit_guimi",
            },
            // 结交"闺蜜"
            tie: {
                unique: true,
                forced: true,
                popup: "闺蜜·结交",
                trigger: {
                    global: ["dieAfter", "gameDrawBefore"],
                    player: ["revive", "enterGame", "showCharacterAfter"],
                },
                filter: (event, player) => {
                    if (event.name === "showCharacter") return !player.getStorage("lit_guimi_tie");
                    if (game.hasPlayer(current => {
                        return current.hasMark('lit_guimi') && current.getStorage("lit_guimi_total") === player;
                    })) return false;
                    return game.hasPlayer(current => {
                        return current != player && !current.hasMark('lit_guimi');
                    });
                },
                async content(event, trigger, player) {
                    player.setStorage("lit_guimi_tie", true);
                    if (game.hasPlayer(current => {
                        return current.hasMark('lit_guimi') && current.getStorage("lit_guimi_total") === player;
                    })) return;
                    const result = await player.chooseTarget('请选择与谁结为【闺蜜】', '其手牌上限+2，每间隔1轮的轮次中每回合首次受伤后+1血；你濒死时，闺蜜可用♥️♦️救你', true, (card, player, target) => {
                        return target != player && !target.hasMark('lit_guimi');
                    }).set("ai", target => {
                        return get.attitude(player, target);
                    }).set("animate", false).forResult();
                    if (result.bool) {
                        var target = result.targets[0];
                        target.addMark('lit_guimi');
                        target.addSkill('lit_guimi_total');
                        target.setStorage("lit_guimi_total", player);
                        player.setStorage("lit_guimi", target);
                        await event.trigger("lit_trigger_guimi_set");
                    }
                },
                ai: {
                    result: {
                        target: (target) => {
                            return 2;
                        },
                    },
                },
                sub: true,
                sourceSkill: "lit_guimi",
            },
            // "闺蜜"方获得的效果
            total: {
                group: ['lit_guimi_maxHand', 'lit_guimi_recover', 'lit_guimi_reset', 'lit_guimi_save'],
                ai: {
                    recover: true,
                    save: true,
                    skillTagFilter(player, tag, arg) {
                        if (!player.hasMark('lit_guimi')) return false;
                        let guimi = player.getStorage("lit_guimi_total");
                        if (tag === "save") return arg && arg.player === guimi;
                    },
                    effect: {
                        player(card, player, target) {
                            if (!player.hasMark('lit_guimi')) return;
                            if (get.tag(card, "recover")) {
                                if (player != target) return;
                                if (player.hp != player.maxHp - 1) return;
                                if (player.isDying()) return;
                                let guimi = player.getStorage("lit_guimi_total");
                                if (!guimi.hasSkill('lit_yisui', null, false, true)) return;
                                return 2 * get.sgnAttitude(player, guimi);
                            }
                            if (get.tag(card, "damage")) {
                                if (player.hp != player.maxHp) return;
                                let guimi = player.getStorage("lit_guimi_total");
                                if (guimi != target) return;
                                if (!guimi.hasSkill('lit_yisui', null, false, true)) return;
                                return [1, -0.3, 1, -0.3];
                            }
                        },
                    },
                },
                sub: true,
                sourceSkill: "lit_guimi",
            },
            // 闺蜜手牌上限+2
            maxHand: {
                mod: {
                    maxHandcard: (player, num) => num + 2,
                },
                charlotte: true,
                sub: true,
                sourceSkill: "lit_guimi",
            },
            // "闺蜜"受伤回血
            recover: {
                silent: true,
                trigger: {
                    player: "damageEnd",
                },
                filter: (event, player) => {
                    return player.hasMark('lit_guimi') && player.getHistory("damage").indexOf(event) === 0;
                },
                async content(event, trigger, player) {
                    player.popup("闺蜜·回血");
                    await player.getStorage("lit_guimi_total")?.logSkill("lit_guimi");
                    await player.recover();
                },
                ai: {
                    "maixie_defend": true,
                    threaten: 0.9,
                    effect: {
                        target: function (card, player, target) {
                            if (player.hasSkillTag("jueqing", false, target)) return;
                            if (target.hujia) return;
                            if (player._lit_guimi_tmp) return;
                            if (get.event().getParent("useCard", true) || get.event().getParent("_wuxie", true)) return;
                            if (get.tag(card, "damage")) {
                                if (target.getHistory("damage").length > 0) {
                                    return [1, 0];
                                } else {
                                    if (get.attitude(player, target) > 0 && target.hp > 1) {
                                        return 0;
                                    }
                                    if (get.attitude(player, target) < 0 && !player.hasSkillTag("damageBonus")) {
                                        if (card.name === "sha") return;
                                        let sha = false;
                                        player._lit_guimi_tmp = true;
                                        let num = player.countCards("h", function (card) {
                                            if (card.name === "sha") {
                                                if (sha) {
                                                    return false;
                                                } else {
                                                    sha = true;
                                                }
                                            }
                                            return get.tag(card, "damage") && player.canUse(card, target) && get.effect(target, card, player, player) > 0;
                                        });
                                        delete player._lit_guimi_tmp;
                                        if (player.hasSkillTag("damage")) {
                                            num++;
                                        }
                                        if (num < 2) {
                                            let enemies = player.getEnemies();
                                            if (enemies.length === 1 && enemies[0] === target && player.needsToDiscard()) {
                                                return;
                                            }
                                            return 0;
                                        }
                                    }
                                }
                            }
                        },
                    },
                },
                sub: true,
                sourceSkill: "lit_guimi",
            },
            // "闺蜜"轮换加血效果
            reset: {
                charlotte: true,
                silent: true,
                firstDo: true,
                trigger: { global: "roundStart" },
                filter: (event, player) => {
                    return game.roundNumber !== 1;
                },
                async content(event, trigger, player) {
                    if (!player.isTempBanned("lit_guimi_recover")) player.tempBanSkill("lit_guimi_recover", "forever", false);
                    else delete player.storage[`temp_ban_lit_guimi_recover`];
                },
                sub: true,
                sourceSkill: "lit_guimi",
            },
            // "闺蜜"救"闺蜜"来源
            save: {
                log: false,
                enable: "chooseToUse",
                precontent(cards, player, targets) {
                    player.popup("闺蜜·救援");
                    player.getStorage("lit_guimi_total")?.logSkill("lit_guimi");
                },
                viewAsFilter(player) {
                    var target = undefined;
                    if (player.hasMark('lit_guimi')) target = player.getStorage("lit_guimi_total");
                    return target !== undefined && target.isDying() && player.countCards("hes", { color: "red" }) > 0;
                },
                filterCard(card) {
                    return get.color(card) === "red";
                },
                position: "hes",
                viewAs: { name: "tao" },
                prompt: "将1张♥️♦️牌当桃使用",
                check(card) {
                    return 15 - get.value(card);
                },
                sub: true,
                sourceSkill: "lit_guimi",
            },
        },
    },
    lit_yisui: {
        utils: {
            yisuiHandcardsNum: 3,
        },
        group: ["lit_yisui_damage", "lit_yisui_die"],
        trigger: {
            player: ["loseAfter", "lit_trigger_guimi_set"],
            global: ["gameDrawAfter", "equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
        },
        forced: true,
        init: (player) => {
            if (game.roundNumber !== 0) player.useSkill('lit_yisui');
        },
        filter: (event, player, name) => {
            const handcardsMax = lib.skill.lit_yisui.utils.yisuiHandcardsNum;
            if (!game.hasPlayer(current => {
                return current.hasMark('lit_guimi');
            })) return false;
            if (player.countCards("h") === handcardsMax) return false;
            if (name === "lit_trigger_guimi_set") return true;
            if (event.name === "gameDraw" || event.name === "gain" && event.player === player) return player.countCards("h") > handcardsMax;
            let evt = event.getl(player);
            if (!evt || !evt.hs || evt.hs.length === 0 || player.countCards("h") >= handcardsMax) return false;
            evt = event;
            for (let i = 0; i < 2; i++) {
                evt = evt.getParent("lit_yisui");
                if (evt.name != "lit_yisui") return true;
            }
            return false;
        },
        async content(event, trigger, player) {
            const handcardsMax = lib.skill.lit_yisui.utils.yisuiHandcardsNum;
            let num = handcardsMax - player.countCards("h");
            if (num > 0) await player.draw(num);
            else await player.chooseToDiscard(`易碎：请弃置${-num}张牌`, "h", true, -num).set("ai", card => {
                var player = get.owner(card);
                if (game.roundNumber === 0 && player.seatNum === 1
                    || _status.currentPhase === player && !["phaseDiscard", "phaseJieshu"].includes(get.event().name)
                    && get.event().getParent("phaseDiscard").name != "phaseDiscard"
                    && get.event().getParent("phaseJieshu").name != "phaseJieshu") {
                    let can = -1;
                    if (player.hasUseTarget(card)) {
                        can = 1;
                        if (card.name === 'zhuge') can = 2;
                        if (['sha', 'jiu'].includes(card.name)) can = 0.2;
                    }
                    return -5 * can + 5 - get.value(card);
                }
                return 9 - get.useful(card);
            });
        },
        ai: {
            noh: true,
            nogain: true,
            threaten: 0.8,
            skillTagFilter: () => {
                return game.hasPlayer(current => {
                    return current.hasMark('lit_guimi');
                });
            },
            combo: 'lit_guimi',
        },
        subSkill: {
            damage: {
                forced: true,
                popup: "易碎·免伤",
                trigger: {
                    player: "damageBegin4",
                },
                filter: (event, player) => {
                    if (event.num <= 0) return false;
                    return game.hasPlayer(current => {
                        return current.hasMark('lit_guimi') && current.getStorage("lit_guimi_total") === player && current.hp === current.maxHp;
                    });
                },
                logTarget: "source",
                async content(event, trigger, player) {
                    trigger.cancel();
                },
                ai: {
                    effect: {
                        target: (card, player, target) => {
                            if (get.tag(card, 'damage')) {
                                if (!game.hasPlayer(current => {
                                    return current.hasMark('lit_guimi') && current.getStorage("lit_guimi_total") === target && current.hp === current.maxHp;
                                })) return;
                                if (player.hasSkillTag('jueqing', false, target)) return [1, -2];
                                if (player === target) return "zeroplayertarget";
                                return [0, 0, 1, 0];
                            }
                        },
                    },
                },
                sub: true,
                sourceSkill: "lit_yisui",
            },
            die: {
                forced: true,
                popup: "易碎·共死",
                trigger: {
                    global: "die",
                },
                filter: (event, player) => {
                    var target = event.player;
                    if (!target.hasMark('lit_guimi') || target.hasMark('lit_guimi') && target.getStorage("lit_guimi_total") !== player) return false;
                    return game.hasPlayer(current => {
                        return current != player && !current.hasMark('lit_guimi');
                    });
                },
                async content(event, trigger, player) {
                    await player.loseHp(player.hp);
                },
                sub: true,
                sourceSkill: "lit_yisui",
            },
        },
    },
    lit_yisuiV2: {
        inherit: 'lit_yisui',
        group: "lit_yisuiV2_damage",
        init: (player) => {
            if (player.hasSkill('lit_yisui')) player.removeSkill('lit_yisui');
        },
        subSkill: {
            damage: {
                inherit: "lit_yisui_damage",
                sub: true,
                sourceSkill: "lit_yisuiV2",
            },
        },
    },
};

export const translate = {
    'lit_boshu菠树': "菠树",
    'lit_guimi': "闺蜜",
    'lit_guimi_info': "锁定技，摸初始牌前，你选择一名“闺蜜”，其手牌上限+2，且每间隔1轮的轮次中每回合首次受到伤害后恢复1点体力；你进入濒死状态时，闺蜜可以将一张♥️♦️牌当【桃】使用（场上无你的闺蜜时重选）",
    'lit_yisui': "易碎",
    'lit_yisui_info': "锁定技，闺蜜在场时，你的手牌数恒为3；闺蜜满血时，你免疫伤害；闺蜜死亡时，你失去所有体力",
    'lit_yisuiV2': "易碎V2",
    'lit_yisuiV2_info': "锁定技，闺蜜在场时，你的手牌数恒为3；闺蜜满血时，你免疫伤害，若此伤害源不为你，则其失去等伤害量体力",
    'lit_shengjibs': "升级·菠树",
    'lit_shengjibs_info': `${get.poptip('lit_yisuiV2')} 获得并修改〖易碎〗：闺蜜死亡时，你不再失去体力`,
};

export const simpleTranslate = {
    'lit_guimi_info': "锁；摸初始牌前选一“闺蜜”，其手牌上限+2，每间隔1轮的轮次中每回合首次受伤后+1血；<br>濒死时闺蜜可用♥️♦️牌当桃救你（场上无闺蜜时重选）",
    'lit_yisui_info': "锁；闺蜜在时手牌数恒为3；<br>闺蜜满血时你免疫伤害；<br>闺蜜死，你失去所有体力",
    'lit_yisuiV2_info': "V2 锁；闺蜜在时手牌数恒为3；<br>闺蜜满血时你免伤，并令不为你的伤害源失去等量体力",
    'lit_shengjibs_info': `${get.poptip('lit_yisuiV2')} 获得并修改“易碎”：闺蜜死亡时，你不再失去体力`,
};

export const dynamicTranslate = {
    lit_guimi(player) {
        if (get.mode() === 'guozhan') return "锁；明置此技能后，若你无“闺蜜”，选一“闺蜜”，其手牌上限+2，每间隔1轮的轮次中每回合首次受伤后+1血；<br>濒死时闺蜜可用♥️♦️牌当桃救你（场上无闺蜜时重选）";
        return "锁；摸初始牌前选一“闺蜜”，其手牌上限+2，每间隔1轮的轮次中每回合首次受伤后+1血；<br>濒死时闺蜜可用♥️♦️牌当桃救你（场上无闺蜜时重选）";
    },
};

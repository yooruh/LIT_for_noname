import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';

export const skill = {
    lit_negClear: {
        nopop: true,
        charlotte: true,
        direct: true,
        priority: -999,
        forceDie: true,
        trigger: {
            player: "dieAfter",
        },
        async content(event, trigger, player) {
            await player.removeSkills(lib.lit.negSkills);
        },
    },
    lit_shengji: {
        nopop: true,
        charlotte: true,
        unique: true,
        direct: true,
        firstDo: true,
        mark: true,
        marktext: "级",
        intro: {
            name: "升级",
            content: (storage, player) => `距离升级还差${3 - player.countMark('lit_shengji')}点经验`,
        },

        onremove(player) {
            player.removeSkill("lit_shengji_markAfterShow");
            player.unmarkSkill("lit_shengji");
        },
        init(player) {
            if (player.skills.some(e => lib.lit.isShengjiSkill(e))) {
                player.markSkill('lit_shengji');
            } else {
                player.addSkill("lit_shengji_markAfterShow");
            }
            player.setStorage("lit_shengji", 0);
            if (lib.lit.getPlayers() < 5) {
                player.useSkill('lit_shengji');
                return;
            }
        },

        trigger: { global: 'dieAfter' },
        async content(event, trigger, player) {
            // 增加升级标记
            if (trigger?.name === 'die') {
                const expGain = (trigger.source === player && trigger.source.isAlive() ? 1 : 0) + 1;
                if (player.skills.some(e => lib.lit.isShengjiSkill(e))) {
                    player.addMark('lit_shengji', expGain);
                } else {
                    let exp = player.getStorage("lit_shengji", 0);
                    player.setStorage("lit_shengji", exp + expGain);
                }
            }
            // filter
            if (player.countMark('lit_shengji') < 3 && lib.lit.getPlayers() >= 5) return;

            player.clearMark('lit_shengji', false);
            await player.logSkill('lit_shengji');
            player.removeSkill('lit_shengji');

            // 升级效果
            const actions = {
                'qb': 'lit_tiannaV2',       //获得“天呐”并于末尾增加：>1血受伤时若此伤害会使血<1，免伤且血掉至1
                'zsj': async () => {        //获得场上所有人判定区和手牌中的延时锦囊牌
                    const cards = [];
                    game.countPlayer(current => {
                        cards.addArray(current.getCards('hj', card => {
                            return get.type(card) === "delay" && lib.filter.canBeGained(card, player, current);
                        }));
                    });
                    await player.gain(cards, 'gain2');
                },
                'zqy': 'lit_zishaV2',       //获得“紫砂”并于开头增加：准备阶段可-Y血+2Y牌（Y不超过体力值）
                'pjl': 'lit_duilianV2',     //获得并修改“对练”：不需要弃牌了
                'wxq': () => {              //获得“面具”/“小丑”，并修改其中的“小丑”：使其弃全部牌
                    const newSkill = player.hasSkill('lit_xiaochou') ? 'lit_xiaochouV2' : 'lit_mianjuV2';
                    player.addSkill(newSkill);
                    player.popup(newSkill);
                },

                'zg': 'lit_zhanshiV2',      //获得并修改“展示”：你也拥有后半段技能
                'zpj': {                    //+1体力上限，+3护甲，获得并修改“骚话”：此技能中，点数<7的牌计算时的点数+7
                    skills: 'lit_saohuaV2',
                    beforeAdd: async () => {
                        await player.gainMaxHp();
                        await player.changeHujia(3);
                    }
                },
                'bs': 'lit_yisuiV2',        //获得并修改“易碎”：闺蜜死亡时，你不再失去体力
                'lcm': 'lit_jijinV2',       //获得并修改“受激”：伤害越高，受激叠层越多
                'zmh': 'lit_jianrenV2',     //获得“坚韧”并于末尾增加：横置时属性伤+1

                'rita': () => {             //若已拥有“大方”，则获得“衡水体”并于其中增加：+1血；否则，获得“大方”
                    const newSkill = player.hasSkill('lit_dafang') ? 'lit_hengshuitiV2' : 'lit_dafang';
                    player.addSkill(newSkill);
                    player.popup(newSkill);
                },
                'hp': {                     //-1体力上限，获得：“殷刃”“浮梦”
                    skills: ['lit_yinren', 'lit_fumeng'],
                    beforeAdd: async () => await player.loseMaxHp(),
                },
                'lbx': async () => {        //+1体力上限，回满血
                    await player.gainMaxHp();
                    await player.recover(player.maxHp - player.hp);
                },
                'hxy': 'lit_shihuaiV2',     //获得并修改“释怀”选项②：交给你1张装备牌
                'hjw': 'lit_wutongV2',      //获得并修改“梧桐”条件：还可弃置全部手牌触发

                'rs': 'lit_qixuV2',         //获得并修改“期许”：猜中时不再失去此技能
                'jhx': 'lit_shanliangV2',   //获得“善良”并于末尾增加：若恢复量溢出，增加等溢出量的上限后回满血
                'qbc': 'lit_chushouV2',     //获得并修改“出手”：不再跳过摸牌阶段
                'zc': 'lit_shuxinV2',       //获得并修改“竖心”：不再为锁定技
                'yxl': 'lit_juji'           //获得：“狙击”
            };

            const mainAllSkills = lib.character[player.name1]?.skills || [];
            const viceAllSkills = lib.character[player.name2]?.skills || [];
            const eventSkills = player.skills.filter(s => lib.lit.isShengjiSkill(s));

            for (const skill of eventSkills) {
                const skillKey = skill.slice(11);
                const action = actions[skillKey];
                if (!action) continue;

                if (mainAllSkills.includes(skill)) await player.showCharacter(0, true);
                if (viceAllSkills.includes(skill)) await player.showCharacter(1, true);
                player.removeSkill(skill);

                if (typeof action === 'function') {
                    await action(event, trigger, player);
                } else {
                    let skills = [];
                    if (typeof action === 'string') {
                        skills = [action];
                    } else if (Array.isArray(action)) {
                        skills = action;
                    } else if (typeof action === 'object') {
                        if (action.beforeAdd) await action.beforeAdd(event, trigger, player);
                        if (typeof action.skills === 'string') {
                            skills = [action.skills];
                        } else {
                            skills = action.skills || [];
                        }
                    }
                    let strArray = [];
                    skills.forEach(s => {
                        player.addSkill(s)
                        strArray.push(get.translation(s));
                    });
                    if (strArray.length > 0) player.popup(strArray.join('<br>'));
                }

            }

            // 将V2技能排序到正确位置
            const indexMap = new Map();
            [...mainAllSkills, ...viceAllSkills].forEach((skill, idx) => {
                if (get.info(skill)) indexMap.set(skill, idx);
            });
            player.skills.sort((a, b) => {
                const baseName = s => s.endsWith('V2') ? s.slice(0, -2) : s;
                return (indexMap.get(baseName(a)) ?? Infinity) - (indexMap.get(baseName(b)) ?? Infinity);
            });
            player.update();
        },
        subSkill: {
            markAfterShow: {
                charlotte: true,
                firstDo: true,
                direct: true,
                trigger: { player: "showCharacterAfter" },
                filter(event, player) {
                    return player.skills.some(e => lib.lit.isShengjiSkill(e));
                },
                async content(event, trigger, player) {
                    player.markSkill('lit_shengji');
                    player.removeSkill('lit_shengji_markAfterShow');
                },
                sub: true,
                sourceSkill: "lit_shengji",
            },
        },
    },
    lit_sj: {
        unique: true,
        group: 'lit_shengji',
        onremove: (player) => {
            if (player.getSkills().filter(e => lib.lit.isShengjiSkill(e)).length) return;
            let hidden = player.getSkills(true).filter(e => lib.lit.isShengjiSkill(e)).length;
            if (hidden) {
                player.unmarkSkill('lit_shengji');
                player.markSkill("lit_shengji", null, null, true);
            } else {
                player.removeSkill('lit_shengji');
            }
        },
    },
    lit_shengjiqb: {
        inherit: 'lit_sj',
        derivation: 'lit_tiannaV2',
    },
    lit_shengjizsj: {
        inherit: 'lit_sj',
    },
    lit_shengjizqy: {
        inherit: 'lit_sj',
        derivation: 'lit_zishaV2',
    },
    lit_shengjipjl: {
        inherit: 'lit_sj',
        derivation: 'lit_duilianV2',
    },
    lit_shengjiwxq: {
        inherit: 'lit_sj',
        derivation: ['lit_mianjuV2', 'lit_xiaochouV2'],
    },
    lit_shengjizg: {
        inherit: 'lit_sj',
        derivation: 'lit_zhanshiV2',
    },
    lit_shengjizpj: {
        inherit: 'lit_sj',
        derivation: 'lit_saohuaV2',
    },
    lit_shengjibs: {
        inherit: 'lit_sj',
        derivation: 'lit_yisuiV2',
    },
    lit_shengjilcm: {
        inherit: 'lit_sj',
        derivation: 'lit_jijinV2',
    },
    lit_shengjizmh: {
        inherit: 'lit_sj',
        derivation: 'lit_jianrenV2',
    },
    lit_shengjirita: {
        inherit: 'lit_sj',
        derivation: ['lit_dafang', 'lit_hengshuitiV2'],
    },
    lit_shengjihp: {
        inherit: 'lit_sj',
        derivation: ['lit_yinren', 'lit_fumeng', 'lit_mengying'],
    },
    lit_shengjilbx: {
        inherit: 'lit_sj',
    },
    lit_shengjihxy: {
        inherit: 'lit_sj',
        derivation: 'lit_shihuaiV2',
    },
    lit_shengjihjw: {
        inherit: 'lit_sj',
        derivation: 'lit_wutongV2',
    },
    lit_shengjirs: {
        inherit: 'lit_sj',
        derivation: 'lit_qixuV2',
    },
    lit_shengjijhx: {
        inherit: 'lit_sj',
        derivation: 'lit_shanliangV2',
    },
    lit_shengjiqbc: {
        inherit: 'lit_sj',
        derivation: 'lit_chushouV2',
    },
    lit_shengjizc: {
        inherit: 'lit_sj',
        derivation: 'lit_shuxinV2',
    },
    lit_shengjiyxl: {
        inherit: 'lit_sj',
        derivation: 'lit_juji',
    },

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
                const enemyNum = game.countPlayer(function (current) {
                    return current != player && !current.hasSkill("lit_jiqing", null, false, true) && (get.realAttitude || get.attitude)(current, player) < 0;
                });
                const card = { name: button.link[2], nature: button.link[3] };
                const val = get.event().getParent().type === "phase" ? player.getUseValue(card) : 1;
                if (player.countCards('h') > 33) return 0;
                if (val <= 0) return 0;
                if (enemyNum) {
                    if (
                        !player.hasCard(function (cardx) {
                            if (card.name === cardx.name) {
                                if (card.name != "sha") return true;
                                return get.is.sameNature(card, cardx);
                            }
                            return false;
                        }, "hs")
                    ) {
                        if (get.value(card, player, "raw") < 6) return Math.sqrt(val) * (0.25 + Math.random() / 1.5);
                        if (enemyNum <= 2) return Math.sqrt(val) / 1.5;
                        return 0;
                    }
                    return 3 * val;
                }
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
                    aiUse: Math.random(),
                    viewAs: {
                        name: links[0][2],
                        nature: links[0][3],
                        suit: "none",
                        number: null,
                    },
                    ai1(card) {
                        const player = get.event().player;
                        const enemyNum = game.countPlayer(function (current) {
                            return current != player && !current.hasSkill("lit_jiqing", null, false, true) && (get.realAttitude || get.attitude)(current, player) < 0;
                        });
                        const cardx = lib.skill.lit_bolun_backup.viewAs;
                        if (enemyNum) {
                            if (card.name === cardx.name && (card.name != "sha" || get.is.sameNature(card, cardx))) return 6 + Math.random() * 3;
                            else if (lib.skill.lit_bolun_backup.aiUse < 0.7 && !player.isDying()) return 0;
                        }
                        return 6 - get.value(card);
                    },
                    async precontent(event, trigger, player) {
                        await player.logSkill("lit_bolun");
                        player.addTempSkill("lit_bolun_guess");
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
            threaten: 1.2,
            order: 8.1,
            result: {
                player: 1,
            },
        },
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
        content() {
            "step 0";
            event.fake = false;
            var card = trigger.cards[0];
            if (card.name != trigger.card.name || (card.name === "sha" && !get.is.sameNature(trigger.card, card))) event.fake = true;
            player.line(trigger.targets, get.nature(trigger.card));
            event.cardTranslate = get.translation(trigger.card.name);
            trigger.card.number = get.number(card);
            trigger.card.suit = get.suit(card);
            trigger.skill = "lit_bolun_backup";
            if (trigger.card.name === "sha" && get.natureList(trigger.card).length) event.cardTranslate = get.translation(trigger.card.nature) + event.cardTranslate;
            player.popup(event.cardTranslate, trigger.name === "useCard" ? "metal" : "wood");
            event.prompt = `是否质疑 ${get.translation(player)} 声明的 ${event.cardTranslate}？`;
            game.log(player, "声明了", `#y${event.cardTranslate}`);
            event.targets = game
                .filterPlayer(function (current) {
                    return current != player && !current.hasSkill("lit_jiqing", null, false, true);
                }).sortBySeat();
            event.targets2 = event.targets.slice(0);
            player.lose(card, ui.ordering).relatedEvent = trigger;
            if (!event.targets.length) event.goto(5);
            else if (_status.connectMode) event.goto(3);
            event.betrays = [];
            "step 1";
            event.target = targets.shift();
            event.target.chooseButton([event.prompt, [["lit_bolun_ally", "lit_bolun_betray"], "vcard"]], true, function (button) {
                var player = get.event().player;
                var evt = get.event().getParent("lit_bolun_guess");
                if (!evt) return Math.random();
                var ally = button.link[2] === "lit_bolun_ally";
                if (ally && (player.hp <= 1 || get.attitude(player, evt.player) >= 0)) return 1.1;
                return Math.random();
            });
            "step 2";
            if (result.links[0][2] === "lit_bolun_betray") {
                event.betrays.push(target);
                target.addExpose(0.2);
            }
            event.goto(targets.length ? 1 : 5);
            "step 3";
            var list = event.targets.map(function (target) {
                return [target, [event.prompt, [["lit_bolun_ally", "lit_bolun_betray"], "vcard"]], true];
            });
            player
                .chooseButtonOL(list)
                .set("switchToAuto", function () {
                    get.event().result = "ai";
                })
                .set("processAI", function () {
                    var choice = Math.random() > 0.5 ? "lit_bolun_ally" : "lit_bolun_betray";
                    var player = get.event().player;
                    var evt = get.event().getParent("lit_bolun_guess");
                    if (player.hp <= 1 || (evt && (get.realAttitude || get.attitude)(player, evt.player) >= 0)) choice = "lit_bolun_ally";
                    return {
                        bool: true,
                        links: [["", "", choice]],
                    };
                });
            "step 4";
            for (var i in result) {
                if (result[i].links[0][2] === "lit_bolun_betray") {
                    event.betrays.push(lib.playerOL[i]);
                    lib.playerOL[i].addExpose(0.2);
                }
            }
            "step 5";
            for (var i of event.targets2) {
                var b = event.betrays.includes(i);
                i.popup(b ? "质疑" : "不质疑", b ? "fire" : "wood");
                game.log(i, b ? "#y质疑" : "#g不质疑");
            }
            game.delay();
            "step 6";
            player.showCards(trigger.cards);
            if (event.betrays.length) {
                event.betrays.sortBySeat();
                if (event.fake) {
                    game.asyncDraw(event.betrays);
                    trigger.cancel();
                    trigger.getParent().goto(0);
                    game.log(player, "声明的", `#y${event.cardTranslate}`, "作废了");
                    if (trigger.card.name != 'sha') player.storage.lit_bolun[0].push(trigger.card.name);
                    else player.storage.lit_bolun[1].push(trigger.card.nature);
                } else {
                    var next = game.createEvent("lit_bolun_final", false);
                    event.next.remove(next);
                    trigger.after.push(next);
                    next.targets = event.betrays;
                    next.setContent(lib.skill.lit_bolun_guess.contentx);
                    event.finish();
                }
            } else {
                event.finish();
            }
            "step 7";
            game.delayx();
        },
        contentx() {
            "step 0";
            event.target = targets.shift();
            event.target.chooseControl('失去体力', '获得基情').set('prompt', '【质疑】失败').set('prompt2', "随机失去1~2点体力或获得“基情”").set("ai", function (target) {
                if (event.target.hp > 2 || event.target.canSave(event.target) || event.target.isZhu) return 0;
                return 1;
            });
            "step 1";
            if (result.control === '失去体力') {
                target.loseHp(Math.floor((Math.random() * 2) + 1));
            } else {
                target.addSkills('lit_jiqing');
            }
            "step 2";
            if (targets.length) event.goto(0);
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
    // 9王灿
    lit_xiaoqiao: {
        mod: {
            suit: function (card, suit) {
                if (suit === 'spade') return 'heart';
            },
        },
    },
    lit_huoshan: {
        locked: true,
        marktext: "爆",
        intro: {
            name: "火山爆发",
            content: "已准备了#重爆发",
        },
        trigger: {
            player: "phaseBegin",
        },
        filter: (event, player) => {
            return player.hasMark('lit_huoshan');
        },
        check(event, player) {
            return !player.hasJudge('lebu') && !player.hasJudge('lit_qianfanpai') && player.countMark('lit_huoshan') > 1;
        },
        async content(event, trigger, player) {
            player.addTempSkill('lit_huoshan_damage', 'phaseJieshuBegin');
            player.setStorage('lit_huoshan_damage', player.countMark('lit_huoshan'));
            await player.draw(player.countMark('lit_huoshan'));
            player.clearMark('lit_huoshan');
        },
        group: "lit_huoshan_judge",
        subSkill: {
            judge: {
                trigger: {
                    player: "phaseEnd",
                },
                forced: true,
                async content(event, trigger, player) {
                    let result = await player.judge((card) => {
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
                trigger: {
                    source: "damageBegin1",
                },
                filter: (event, player) => {
                    return event.notLink() && player.getStorage("lit_huoshan_damage", 0);
                },
                forced: true,
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
            const { bool } = await player.judge(card => {
                if (get.suit(card) === 'heart') return 1;
                return -0.5;
            }).set("judge2", result => result.bool).forResult();
            if (bool) {
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
    // 9李洋
    lit_xiuer: {
        derivation: 'lit_xiuer_faq',
        trigger: {
            player: ["useCard", "respond"],
        },
        frequent: true,
        filter: (event) => {
            if (get.type(event.card) === 'trick' || get.type(event.card) === 'delay') {
                return event.card.isCard;
            }
        },
        async content(event, trigger, player) {
            await player.draw(player.hp === 1 ? 2 : 1);
        },
        mod: {
            targetInRange: (card, player, target, now) => {
                let type = get.type(card);
                if (type === 'trick' || type === 'delay') return true;
            },
        },
        ai: {
            threaten: 1.6,
            noautowuxie: true,
            effect: {
                player: (card, player) => {
                    if (get.type(card) === 'trick' || get.type(card) === 'delay') return [1, 1];
                },
            },
        },
    },
    lit_huangse: {
        forced: true,
        group: ["lit_huangse_damage", "lit_huangse_draw"],
        subSkill: {
            damage: {
                trigger: {
                    source: "damageBegin1",
                },
                filter: (event, player) => {
                    if (!player.differentSexFrom(event.player)) return false;
                    if (event.notLink()) return true;
                    // 只有传导源未触发此技能时，才对满足条件的横置角色触发
                    const damageTrigger = event.getParent(4);
                    const histories = player.getHistory('useSkill', e => e.skill === 'lit_huangse_damage');
                    return !histories.find(history => history.event.getParent(2) === damageTrigger);
                },
                forced: true,
                async content(event, trigger, player) {
                    trigger.num++;
                },
                ai: {
                    threaten: 1.5,
                    damageBonus: true,
                    skillTagFilter: (player, tag, arg) => {
                        if (tag === "damageBonus") {
                            if (!player) debugger;
                            if (arg && player?.differentSexFrom(arg.target)) return true;
                            return false;
                        }
                    },
                    result: {
                        target: (player, target) => {
                            if (player.differentSexFrom(target)) return -2;
                        },
                    },
                },
                sub: true,
            },
            draw: {
                trigger: {
                    source: "damageEnd",
                },
                filter: (event, player) => {
                    return player.sameSexAs(event.player);
                },
                forced: true,
                async content(event, trigger, player) {
                    await player.draw();
                },
                ai: {
                    threaten: 1.1,
                    result: {
                        player: 1,
                    },
                },
                sub: true,
            },
        },
    },
    // 9张盛杰
    lit_lizhi: {
        forced: true,
        trigger: {
            player: "phaseDrawBegin2",
        },
        filter: (event, player) => {
            return !event.numFixed && (player.maxHp - player.hp) > 0;
        },
        async content(event, trigger, player) {
            trigger.num += player.maxHp - player.hp;
        },
        ai: {
            threaten: 0.8,
        },
    },
    lit_shenjie: {
        mod: {
            maxHandcardBase: (player, num) => {
                return player.maxHp + 2;
            },
        },
        forced: true,
        trigger: {
            player: ["dying", "dyingAfter"],
        },
        filter: (event, player, name) => {
            return true;
        },
        async content(event, trigger, player) {
            await player.draw(event.triggername === "dying" ? 2 : 1);
        },
        ai: {
            maixie: true,
            threaten: (player, target) => {
                if (target.hp === 1) return 0.5;
                if (target.hp === 2) return 0.8;
                return 0.9;
            },
            effect: {
                target: (card, player, target) => {
                    let i = get.tag(card, 'damage') ? 1 : 0;
                    if (i) {
                        if (target.hp === i && target.canSave(target)) return [1, 2.5];
                        if (target.hp > i) return [1, 0.1];
                    }
                    if (get.tag(card, 'recover')) {
                        if (target.hp > 0 && !target.needsToDiscard()) return 0;
                    }
                },
            },
        },
    },
    lit_zhewan: {
        mod: {
            aiOrder(player, card, num) {
                if (num <= 0 || !player.isPhaseUsing() || player.needsToDiscard() < 2) return num;
                let suit = get.suit(card, player);
                if (suit === "heart") return num - 3.6;
            },
            aiValue(player, card, num) {
                if (num <= 0) return num;
                let suit = get.suit(card, player);
                if (suit === "heart") return num + 3.6;
                if (suit === "club") return num + 1;
                if (suit === "spade") return num + 1.8;
            },
            aiUseful(player, card, num) {
                if (num <= 0) return num;
                let suit = get.suit(card, player);
                if (suit === "heart") return num + 3;
                if (suit === "club") return num + 1;
                if (suit === "spade") return num + 1;
            },
        },
        locked: false,
        enable: ["chooseToUse", "chooseToRespond"],
        prompt: "将♦️牌当作杀，♥️牌当作桃，♣️牌当作闪，♠️牌当作无懈可击使用或打出",
        //动态的viewAs
        viewAs(cards, player) {
            if (cards.length) {
                let name = false,
                    nature = null;
                //根据选择的卡牌的花色 判断要转化出的卡牌是闪还是火杀还是无懈还是桃
                switch (get.suit(cards[0], player)) {
                    case "club":
                        name = "shan";
                        break;
                    case "diamond":
                        name = "sha";
                        nature = "fire";
                        break;
                    case "spade":
                        name = "wuxie";
                        break;
                    case "heart":
                        name = "tao";
                        break;
                }
                //返回判断结果
                if (name) return { name: name, nature: nature };
            }
            return null;
        },
        //AI选牌思路
        check(card) {
            if (ui.selected.cards.length) return 0;
            let player = get.event().player;
            if (get.event().type === "phase") {
                let max = 0;
                let name2;
                let list = ["sha", "tao"];
                let map = { sha: "diamond", tao: "heart" };
                for (let i = 0; i < list.length; i++) {
                    let name = list[i];
                    if (
                        player.countCards("hes", function (card) {
                            return (name != "sha" || get.value(card) < 5) && get.suit(card, player) === map[name];
                        }) > 0 &&
                        player.getUseValue({ name: name, nature: name === "sha" ? "fire" : null }) > 0
                    ) {
                        let temp = get.order({ name: name, nature: name === "sha" ? "fire" : null });
                        if (temp > max) {
                            max = temp;
                            name2 = map[name];
                        }
                    }
                }
                if (name2 === get.suit(card, player)) return name2 === "diamond" ? 5 - get.value(card) : 20 - get.value(card);
                return 0;
            }
            return 1;
        },
        //选牌数量
        selectCard: [1, 2],
        //确保选择第一张牌后 重新检测第二张牌的合法性 避免选择两张花色不同的牌
        complexCard: true,
        position: "hes",
        //选牌合法性判断
        filterCard(card, player, event) {
            //如果已经选了一张牌 那么第二张牌和第一张花色相同即可
            if (ui.selected.cards.length) return get.suit(card, player) === get.suit(ui.selected.cards[0], player);
            event = event || _status.event;
            //获取当前时机的卡牌选择限制
            let filter = event._backup.filterCard;
            let name = get.suit(card, player);
            if (name === "club" && filter(get.autoViewAs({ name: "shan" }, "unsure"), player, event)) return true;
            if (name === "diamond" && filter(get.autoViewAs({ name: "sha", nature: "fire" }, "unsure"), player, event)) return true;
            if (name === "spade" && filter(get.autoViewAs({ name: "wuxie" }, "unsure"), player, event)) return true;
            if (name === "heart" && filter(get.autoViewAs({ name: "tao" }, "unsure"), player, event)) return true;
            return false;
        },
        //判断当前时机能否发动技能
        filter(event, player) {
            //获取当前时机的卡牌选择限制
            let filter = event.filterCard ?? (() => true);
            if (filter(get.autoViewAs({ name: "sha", nature: "fire" }, "unsure"), player, event) && player.countCards("hes", { suit: "diamond" })) return true;
            if (filter(get.autoViewAs({ name: "shan" }, "unsure"), player, event) && player.countCards("hes", { suit: "club" })) return true;
            if (filter(get.autoViewAs({ name: "tao" }, "unsure"), player, event) && player.countCards("hes", { suit: "heart" })) return true;
            if (filter(get.autoViewAs({ name: "wuxie" }, "unsure"), player, event) && player.countCards("hes", { suit: "spade" })) return true;
            return false;
        },
        ai: {
            respondSha: true,
            respondShan: true,
            //让系统知道角色“有杀”“有闪”
            skillTagFilter(player, tag) {
                let name = '';
                switch (tag) {
                    case "respondSha":
                        name = "diamond";
                        break;
                    case "respondShan":
                        name = "club";
                        break;
                    case "save":
                        name = "heart";
                        break;
                }
                if (!player.countCards("hes", { suit: name })) return false;
            },
            //AI牌序
            order(item, player) {
                if (player && get.event().type === "phase") {
                    let max = 0;
                    let list = ["sha", "tao"];
                    let map = { sha: "diamond", tao: "heart" };
                    for (let i = 0; i < list.length; i++) {
                        let name = list[i];
                        if (
                            player.countCards("hes", (card) => {
                                return (name != "sha" || get.value(card) < 5) && get.suit(card, player) === map[name];
                            }) > 0 &&
                            player.getUseValue({
                                name: name,
                                nature: name === "sha" ? "fire" : null,
                            }) > 0
                        ) {
                            let temp = get.order({
                                name: name,
                                nature: name === "sha" ? "fire" : null,
                            });
                            if (temp > max) max = temp;
                        }
                    }
                    max /= 1.1;
                    return max;
                }
                return 2;
            },
        },
        //让系统知道玩家“有无懈”“有桃”
        hiddenCard(player, name) {
            if (name === "wuxie" && _status.connectMode && player.countCards("hs") > 0) return true;
            if (name === "wuxie") return player.countCards("hes", { suit: "spade" }) > 0;
            if (name === "tao") return player.countCards("hes", { suit: "heart" }) > 0;
        },
        group: ["lit_zhewan_num", "lit_zhewan_discard"],
        subSkill: {
            num: {
                trigger: { player: "useCard" },
                forced: true,
                popup: false,
                filter(event) {
                    let evt = event;
                    return ["sha", "tao"].includes(evt.card.name) && evt.skill === "lit_zhewan" && evt.cards && evt.cards.length === 2;
                },
                content() {
                    trigger.baseDamage++;
                },
            },
            discard: {
                trigger: { player: ["useCardAfter", "respondAfter"] },
                forced: true,
                popup: false,
                logTarget() {
                    return _status.currentPhase;
                },
                autodelay(event) {
                    return event.name === "respond" ? 0.5 : false;
                },
                filter(evt, player) {
                    return ["shan", "wuxie"].includes(evt.card.name) && evt.skill === "lit_zhewan" && evt.cards && evt.cards.length === 2 && _status.currentPhase && _status.currentPhase != player && _status.currentPhase.countDiscardableCards(player, "he");
                },
                content() {
                    player.line(_status.currentPhase, "green");
                    player.discardPlayerCard(_status.currentPhase, "he", true);
                },
            },
        },
    },
    // 陈可
    lit_nitian: {
        mod: {
            aiOrder(player, card, num) {
                if (num > 0 && get.itemtype(card) === "card" && ["spade", "heart"].includes(get.suit(card)) && get.type(card) === "equip") return num * 1.35;
            },
            aiValue(player, card, num) {
                if (num > 0 && get.itemtype(card) === "card" && ["spade", "heart"].includes(get.suit(card))) return num * 1.15;
            },
            aiUseful(player, card, num) {
                if (num > 0 && get.itemtype(card) === "card" && ["spade", "heart"].includes(get.suit(card))) return num * 1.35;
            },
        },
        locked: false,
        popup: false,
        preHidden: true,
        trigger: {
            global: "judge",
        },
        filter(event, player) {
            return player.countCards("hes") > 0;
        },
        async cost(event, trigger, player) {
            const { bool, cards } = await player
                .chooseCard(`${get.translation(trigger.player)} 的 ${trigger.judgestr || ""} 判定为 ${get.translation(trigger.player.judging[0])}，${get.prompt("lit_nitian")}`, "hes", card => {
                    const player = get.event().player;
                    const mod2 = game.checkMod(card, player, "unchanged", "cardEnabled2", player);
                    if (mod2 != "unchanged") return mod2;
                    const mod = game.checkMod(card, player, "unchanged", "cardRespondable", player);
                    if (mod != "unchanged") return mod;
                    return true;
                }).set("ai", card => {
                    const trigger = get.event().getTrigger();
                    const player = get.event().player;
                    const judging = get.event().judging;
                    const result = trigger.judge(card) - trigger.judge(judging);
                    const attitude = get.attitude(player, trigger.player);
                    const ex = ['heart', 'spade'].includes(get.suit(card)) ? 0.2 : 0;
                    let val = get.value(card);
                    if (get.subtype(card) === "equip2") val /= 2;
                    else val /= 4;
                    if (attitude === 0 || result === 0) return ex;
                    if (attitude > 0) {
                        return result - val + ex;
                    }
                    return -result - val + ex;
                }).set("judging", trigger.player.judging[0])
                .setHiddenSkill("lit_nitian")
                .forResult();
            if (bool) event.result = { bool, cost_data: { cards } };
        },
        async content(event, trigger, player) {
            const chooseCardResultCards = event.cost_data.cards;
            await player.respond(chooseCardResultCards, "lit_nitian", "highlight", "noOrdering");
            if (trigger.player.judging[0].clone) {
                trigger.player.judging[0].clone.classList.remove("thrownhighlight");
                game.broadcast(function (card) {
                    if (card.clone) {
                        card.clone.classList.remove("thrownhighlight");
                    }
                }, trigger.player.judging[0]);
                game.addVideo("deletenode", player, get.cardsInfo([trigger.player.judging[0].clone]));
            }
            await player.gain(trigger.player.judging[0], "gain2");
            let card = chooseCardResultCards[0];
            if (['heart', 'spade'].includes(get.suit(card))) await player.draw("nodelay");
            trigger.player.judging[0] = card;
            trigger.orderingCards.addArray(chooseCardResultCards);
            game.log(trigger.player, "的判定牌改为", card);
            await game.delay();
        },
        ai: {
            rejudge: true,
            tag: {
                rejudge: 1,
            },
        },
    },
    lit_yizhu: {
        trigger: {
            player: ["damageEnd", "loseHpEnd"],
        },
        group: "lit_yizhu_die",
        direct: true,
        filter: (event, player) => {
            return event.num > 0;
        },
        content() {
            "step 0"
            event.count = trigger.num;
            "step 1"
            event.count--;
            "step 2"
            player.chooseTarget(get.prompt('lit_yizhu'), '获得1人区域内的1张牌', (card, player, target) => {
                return target.countCards('hej') > 0;
            }).set("ai", target => {
                var player = get.event().player;
                if (get.attitude(player, target) > 0) {
                    return target.countCards('j');
                } else {
                    return target.countCards('he');
                }
            });
            "step 3"
            if (result.bool) {
                player.gainPlayerCard(true, get.prompt('lit_yizhu', result.targets), result.targets[0], get.buttonValue, 'hej').set("logSkill", ['lit_yizhu', result.targets[0]]);
            }
            "step 4"
            if (event.count > 0) {
                event.goto(1);
            }
        },
        ai: {
            "maixie_defend": true,
            effect: {
                target(card, player, target) {
                    if (!target.hasFriend()) return;
                    if (player.countCards('he') > 1 && get.tag(card, 'damage')) {
                        if (get.attitude(target, player) < 0) return [1, 1, 0, -1];
                    }
                },
            },
        },
        subSkill: {
            die: {
                forced: true,
                forceDie: true,
                trigger: {
                    player: "dieBefore",
                },
                filter: function (event, player) {
                    return player.countCards('hej') > 0;
                },
                filterCard: true,
                selectCard: -1,
                content: function () {
                    "step 0"
                    player.chooseTarget(get.prompt('lit_yizhu'), '选择1人给其你区域内所有的牌，或不选择，将区域内所有的牌放至牌堆顶', (card, player, target) => {
                        return player != target;
                    }).set("ai", target => {
                        return get.attitude(player, target) > 0;
                    });
                    "step 1"
                    if (result.bool) {
                        player.give(player.getCards('hej'), result.targets[0], 'giveAuto');
                    } else {
                        player.lose(player.getCards('hej'), ui.cardPile, 'insert', 'visible');
                    }
                },
                sub: true,
                sourceSkill: "lit_yizhu",
            },
        },
    },
    // 林淼
    lit_shenge: {
        derivation: "lit_shenge_faq",
        locked: false,
        trigger: {
            player: "useCardToTargeted",
        },
        mod: {
            targetInRange: (card, player, target) => {
                if (card.name === 'sha' && typeof get.number(card) === 'number') {
                    if (get.distance(player, target) <= get.number(card)) return true;
                }
            },
        },
        logTarget: "target",
        check(event, player) {
            return get.attitude(player, event.target) <= 0;
        },
        filter: (event, player) => {
            if (event.card.name != 'sha') return false;
            if (event.target.countCards('hej') >= player.countCards('h')) return true;
            if (event.target.hp >= player.hp) return true;
            return false;
        },
        async content(event, trigger, player) {
            if (trigger.target.countCards('hej') >= player.countCards('h')) {
                player.addTempSkill('unequip', { player: 'useCardAfter' });
                trigger.getParent().directHit.push(trigger.target);
            }
            if (trigger.target.hp >= player.hp) {
                let id = trigger.target.playerid;
                let map = trigger.getParent().customArgs;
                if (!map[id]) map[id] = {};
                if (typeof map[id].extraDamage != 'number') {
                    map[id].extraDamage = 0;
                }
                map[id].extraDamage++;
            }
        },
        ai: {
            threaten: 0.5,
            shaRelated: true,
            directHit_ai: true,
            skillTagFilter: (player, tag, arg) => {
                if (tag === "directHit_ai") {
                    if (arg && get.attitude(player, arg.target) <= 0 && arg.card.name === 'sha' && player.countCards('h', card => {
                        return card != arg.card && (!arg.card.cards || !arg.card.cards.includes(card));
                    }) <= arg.target.countCards('hej')) return true;
                    return false;
                }
            },
        },
    },
    lit_gugu: {
        frequent: true,
        marktext: "咕",
        intro: {
            name: "咕咕",
            content: "已经咕了#次",
        },
        trigger: {
            player: "dyingBefore",
        },
        filter: (event, player) => {
            return event.reason?.name === "damage";
        },
        async content(event, trigger, player) {
            let num = 1 - player.hp;
            await player.recover(num);
            player.addMark('lit_gugu', num);
            for (let i = 0; i < num; i++) {
                let card = get.cards()[0];
                if (player.hasUseTarget(card)) {
                    const { bool } = await player.chooseUseTarget(card, get.prompt("lit_gugu"), `可使用一张 ${get.translation(card)}`, false).forResult();
                    if (!bool) await game.cardsDiscard(card);
                } else await game.cardsDiscard(card);
            }
        },
        ai: {
            threaten: (player, target) => {
                if (target.hasMark('lit_gugu')) {
                    let i = target.countMark('lit_gugu');
                    if (i === 1) return 2.4;
                    if (i === 2) return 1.2;
                    if (i === 3) return 0.5;
                    if (i > 3) return Math.pow(0.6, i);
                }
                if (target.hp === 1) return 0.99;
                return 0.6;
            },
        },
        group: "lit_gugu_loseHp",
        subSkill: {
            loseHp: {
                direct: true,
                trigger: {
                    player: "phaseAfter",
                },
                filter: (event, player) => {
                    return player.hasMark('lit_gugu');
                },
                async content(event, trigger, player) {
                    let num = player.countMark('lit_gugu') - 1;
                    player.clearMark('lit_gugu');
                    if (num > 0) await player.loseHp(num);
                },
                sub: true,
                sourceSkill: "lit_gugu",
            },
        },
    },

    // Qb
    lit_33: {
        derivation: ['lit_qianfan', 'lit_kuanshu'],
        // audio: "lit_33_use",
        // audioname: ["lit_Qb"],
        unique: true,
        zhuSkill: true,
        ai: {
            combo: "lit_qiantui",
        },
        global: "lit_33_use",
        subSkill: {
            use: {
                enable: "phaseUse",
                delay: false,
                line: true,
                log: false,
                prepare(cards, player, targets) {
                    targets[0].logSkill("lit_33");
                },
                prompt() {
                    let player = get.event().player;
                    let list = game.filterPlayer((target) => {
                        return target !== player && target.hasZhuSkill("lit_33", player) && !target.hasSkill("lit_33_used");
                    });
                    let str1 = list.length > 1 ? "中的一人" : "";
                    let str2 = list.length > 1 ? "根据体力值是否大于3，失去/恢复1点体力" : (list[0].hp > 3 ? "失去1点体力" : "恢复1点体力");
                    let str = `可选择${get.translation(list)}${str1}，受到来自其的1点伤害，然后其${str2}`;
                    return str;
                },
                filter(event, player) {
                    if (!lib.lit.isSameGroup(player, 'three')) return false;
                    return game.hasPlayer((target) => {
                        return target !== player && target.hasZhuSkill("lit_33", player) && !target.hasSkill("lit_33_used");
                    });
                },
                filterTarget(card, player, target) {
                    return target !== player && target.hasZhuSkill("lit_33", player) && !target.hasSkill("lit_33_used");
                },
                async content(event, trigger, player) {
                    let target = event.target;
                    await player.damage().set('source', target);
                    if (target.hp > 3) await target.loseHp();
                    else await target.recover(player);
                    target.addTempSkill("lit_33_used", "phaseUseEnd");
                },
                ai: {
                    order: 10,
                    result: {
                        target: (player, target) => {// 专门为胡畔写一笔
                            if (get.attitude(player, target) > 0) {
                                if (player.hasSkill('lit_shichou')) return -4;
                                if (player.hp === 1 && !player.canSave(player)) return -3;
                            }
                            let divAtt = Math.abs(get.attitude(target, target)) ?? 5;
                            if (target.hp > 3) return get.effect(target, { name: "losehp" }, target, target) / divAtt;
                            return 1;
                        },
                        player: (player, target) => {
                            let divAtt = Math.abs(get.attitude(player, player)) ?? 5;
                            return get.damageEffect(player, target, player) / divAtt;
                        },
                    },
                },
                sub: true,
                sourceSkill: "lit_33",
            },
            used: {
                charlotte: true,
                sub: true,
                sourceSkill: "lit_33",
            },
        },
    },
    lit_tianna: {
        forced: true,
        trigger: { source: 'damageAfter' },
        filter: (event, player) => {
            return _status.currentPhase !== player || player.countCards('hs');
        },
        async content(event, trigger, player) {
            if (_status.currentPhase !== player) await player.draw(2);
            else {
                if (player.countCards('h')) {
                    // 显示“确定”，避免误触
                    await player.chooseToDiscard("【天呐】", 'h', '回合内造成伤害后，弃置1张手牌并恢复1点体力', true, card => {
                        return ui.selected.cards < 1;
                    }).set("selectCard", () => {
                        if (ui.selected.cards < 1) return [1, 1];
                        return [1, Infinity];
                    }).set("complexCard", true);
                }
                await player.recover();
            }
        },
        ai: {
            threaten: 1.3,
            effect: {
                player(card, player, target) {
                    if (get.tag(card, "damage")) {
                        let using = player.isPhaseUsing();
                        if (!using) return [1, 2];
                        if (!player.countDiscardableCards('h')) return;
                        if (target === player) {
                            if (player.hasSkill("lit_qiantui") && player.hp === 4) return 1;
                            return [1, -1];
                        }
                        if (player.hp < player.maxHp) return [1, 1];
                    }
                },
            },
        },
    },
    lit_tiannaV2: {
        priority: -333,
        group: 'lit_tianna',
        forced: true,
        init: (player) => {
            if (player.hasSkill('lit_tianna')) player.removeSkill('lit_tianna');
        },
        trigger: { player: 'damageBegin4' },
        filter: (event, player) => {
            return player.hp > 1 && event.num >= player.hp;
        },
        async content(event, trigger, player) {
            trigger.cancel();
            await player.loseHp(player.hp - 1);
        },
    },
    lit_qiantui: {
        derivation: ['lit_qianfan', 'lit_kuanshu'],
        trigger: {
            player: ['changeHp', 'loseMaxHpAfter'],
        },
        popup: false,
        frequent: true,
        filter: (event, player) => {
            let num = event.name === 'changeHp' ? event.num : -event.loseHp;
            if (num === 0) return false;
            return get.sgn(player.hp - 3.5) < 0 && get.sgn(player.hp - 3.5 - num) > 0 && game.hasPlayer(target => {
                return !target.hasSkill("lit_kuanshu", null, false, true) && !target.hasSkill("lit_qianfan");
            });
        },
        async content(event, trigger, player) {
            const result = await player.chooseTarget(get.prompt('lit_qiantui'), '遣返1人', (card, player, target) => {
                return !target.hasSkill("lit_kuanshu", null, false, true) && !target.hasSkill("lit_qianfan");
            }).set("ai", (target) => {
                let att = get.attitude(get.event().player, target);
                if (att) return att < 0;
            }).forResult();
            if (result.bool) {
                let target = result.targets[0];
                await player.logSkill('lit_qiantui', target);
                player.line(target, 'red');
                target.addSkillLog('lit_qianfan');
            }
        },
        ai: {
            maihp: true,
            maixie: true,
            maixie_hp: true,
            threaten: (player, target) => {
                if (target.hp > 4) return 0.9;
                if (target.hp === 4) return 0.6;
                return 1.2;
            },
            result: {
                target: (player, target) => {
                    return get.result({ name: 'lit_qianfanpai' }).target(player, target);
                },
            },
            effect: {
                target(card, player, target) {
                    if (get.tag(card, "loseHp") || get.tag(card, "damage")) {
                        if (target.hp <= 3) return;
                        let enemy = game.countPlayer(current => get.attitude(target, current) < 0 && !current.hasSkill('lit_qianfan') && !current.hasSkill('lit_kuanshu', null, false, true));
                        if (enemy === 0) return;
                        if (!target.hasFriend() && player !== target) return;
                        if (get.attitude(target, player) > 0) {
                            if (target.hp === 4) return [1, 2.5];
                            if (target !== player || !target.hasSkill("lit_tianna") || _status.currentPhase !== target) return [1, 0.5];
                            return [1, -0.5];
                        }
                        let res = player.hasSkill('lit_qianfan') || player.hasSkill('lit_kuanshu', null, false, true) || enemy === 0 ? 0 : get.result({ name: 'lit_qianfanpai' }).target(target, player) / enemy;
                        if (target.hp === 4) return [1, 0, 0, res];
                    }
                },
            },
            skillTagFilter(player, tag, arg) {
                if (player.hp <= 3) {
                    if (["maihp", "maixie", "maixie_hp"].includes(tag)) return false;
                }
            },
        },
    },
    lit_qianfan: {
        derivation: ['lit_kuanshu', 'lit_negClear_faq'],
        lit_neg: 1,
        forced: true,
        firstDo: true,
        mark: true,
        marktext: "遣",
        intro: {
            name: "被遣返",
            content: '正在收拾东西，马上回家',
        },
        trigger: { player: "phaseBefore" },
        filter: (event, player) => {
            return event.player.hasSkill('lit_qianfan', null, false, true);
        },
        onremove: (player) => {
            player.addSkill('lit_kuanshu');
        },
        async content(event, trigger, player) {
            trigger.cancel();
            game.log(player, "被遣返离校，跳过了本回合");
            player.removeSkill("lit_qianfan");
        },
        ai: {
            neg: true,
        },
        group: 'lit_negClear',
    },
    lit_kuanshu: {
        mark: true,
        marktext: "恕",
        intro: {
            content: '祂这次会原谅你',
        },
        forced: true,
        trigger: { player: "phaseBeforeStart" },
        async content(event, trigger, player) {
            player.removeSkill("lit_kuanshu");
        },
    },
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
                if (!cardInfo) return false;
                return true;
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
                trigger: {
                    player: "loseAfter",
                    global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
                },
                filter: (event, player) => {
                    return player.isIn();
                },
                getIndex(event, player) {
                    const evt = event.getl(player);
                    if (evt && evt.player === player && evt.js) return evt.js.length;
                    return false;
                },
                async content(event, trigger, player) {
                    await player.draw();
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
            return player.getStorage("lit_xinyi").length >= 2;
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
                if (!target.isAlive()) return;
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
    // 张钦奕
    lit_danke: {
        forced: true,
        popup: false,
        trigger: { player: "phaseZhunbeiBegin" },
        multitarget: true,
        multiline: true,
        async content(event, trigger, player) {
            event.targets = game.filterPlayer((current) => {
                return current !== player;
            }).sortBySeat();
            await player.logSkill('lit_danke', event.targets, 'yellow');
            for (let current of event.targets) {
                current.addTempSkill("lit_danke_loseHp");
                let state = current.getStorage("lit_danke_loseHp", [0, null]);
                if (current.hp === Infinity) {
                    state[0] = Infinity;
                    current.hp = Math.pow(2, 31) - 1;
                    current.update();
                }
                state[1] = player;
                current.setStorage("lit_danke_loseHp", state);
                if (current.hp <= 1) continue;
                let num = current.hp - 1;
                if (num > 0) await current.loseHp(num);
            }
        },
        ai: {
            threaten: 2.5,
        },
        subSkill: {
            loseHp: {
                firstDo: true,
                direct: true,
                charlotte: true,
                mark: true,
                marktext: "蛋",
                intro: {
                    content: (storage, player, skill) => {
                        if (!storage) storage = [0, null];
                        const num = storage[0] === Infinity ? '∞' : storage[0];
                        const source = storage[1];
                        return `被${get.translation(source)}的“蛋壳”溅射到了${num}下<li>回合结束时恢复等量的体力，溢出值转为护甲</li>`;
                    },
                    markcount: (storage, player) => {
                        if (!storage) storage = [0, null];
                        return storage[0] ?? 0;
                    },
                },
                trigger: { player: 'loseHpAfter' },
                init(player) {
                    player.setStorage("lit_danke_loseHp", [0, null]);
                },
                async onremove(player) {
                    let num = player.getStorage("lit_danke_loseHp")[0],
                        skiller = player.getStorage("lit_danke_loseHp")[1];
                    if (num > 0) {
                        let recoverNum = player.maxHp - player.hp;
                        let hujiaNum = num - recoverNum;
                        if (recoverNum > 0) await player.recover(recoverNum).set("source", skiller);
                        if (hujiaNum > 0) await player.changeHujia(hujiaNum).set("source", skiller);
                    }
                },
                filter: (event, player) => {
                    return event.getParent().name === "lit_danke";
                },
                async content(event, trigger, player) {
                    let state = player.getStorage("lit_danke_loseHp", [0, null]);
                    state[0] = trigger.num;
                    player.setStorage("lit_danke_loseHp", state, true);
                },
                sub: true,
                sourceSkill: "lit_danke",
            },
        },
    },
    lit_zisha: {
        trigger: {
            player: "useCard",
        },
        forced: true,
        filter: (event, player) => {
            return player.hp === 2;
        },
        async content(event, trigger, player) {
            trigger.directHit.addArray(game.players);
        },
        ai: {
            threaten: (player, target) => {
                if (target.hp === 3) return 0.8;
                if (target.hp === 2) return 2;
                return 1;
            },
            directHit_ai: true,
            skillTagFilter: (player, tag, arg) => {
                if (player.hp === 2) return true;
            },
        },
    },
    lit_zishaV2: {
        group: 'lit_zisha',
        trigger: {
            player: "phaseZhunbei",
        },
        locked: true,
        init: (player) => {
            if (player.hasSkill('lit_zisha')) player.removeSkill('lit_zisha');
        },
        filter: (event, player) => {
            return player.hp > 0;
        },
        check(event, player) {
            if (player.hp === 1) return player.hasSkill("lit_lantong") && player.hasUsableCard("tao");
            return player.hp > 2;
        },
        async cost(event, trigger, player) {
            const result = await player
                .chooseNumbers(get.prompt2("lit_zishaV2"), [{ prompt: "请选择你要失去的体力值", min: 1, max: player.getHp() }])
                .set("processAI", () => {
                    if (player.hp === 2) return false;
                    if (player.hp === 1 && player.hasSkill("lit_lantong") && player.hasUsableCard("tao")) return [1];
                    return [player.hp - 2];
                }).forResult();
            event.result = {
                bool: result.bool,
                cost_data: result.bool ? result.numbers[0] : 0,
            };
        },
        async content(event, trigger, player) {
            await player.loseHp(parseInt(event.cost_data));
            await player.draw(2 * parseInt(event.cost_data));
        },
        ai: {
            result: {
                player: (player) => {
                    if (player.hp === 1 && player.canSave(player)) return 2;
                    return player.hp - 2.5;
                },
            },
        },
    },
    lit_lantong: {
        trigger: {
            target: "taoBegin",
        },
        forced: true,
        filter: (event, player) => {
            return player.sameSexAs(event.player);
        },
        async content(event, trigger, player) {
            trigger.baseDamage++;
        },
    },
    // 庞建龙
    lit_qiangjian: {
        group: ['lit_qiangjian_juedou', 'lit_qiangjian_use'],
        trigger: {
            player: "useCardToPlayered",
        },
        direct: true,
        filter: (event, player) => {
            return ["sha", "nanman", "wanjian"].includes(event.card.name) && !event.getParent().directHit.includes(event.target);
        },
        logTarget: "target",
        async content(event, trigger, player) {
            const id = trigger.target.playerid;
            const map = trigger.getParent().customArgs;
            if (!map[id]) map[id] = {};
            if (trigger.card.name !== "nanman") {
                if (typeof map[id].shanRequired === "number") {
                    map[id].shanRequired++;
                } else {
                    map[id].shanRequired = 2;
                }
            } else {
                if (typeof map[id].shaRequired === "number") {
                    map[id].shaRequired++;
                } else {
                    map[id].shaRequired = 2;
                }
            }
        },
        ai: {
            shaRelated: true,
            threaten: 1.5,
            "directHit_ai": true,
            skillTagFilter(player, tag, arg) {
                if (!arg) return false;
                if (arg.card.name === "sha" || arg.card.name === "wanjian") {
                    if (arg.target.countCards("h", "shan") > 1) return false;
                } else if (arg.card.name === "nanman") return !arg.target.countCards("h", "sha") > 1;
                return false;
            },
        },
        subSkill: {
            juedou: {
                trigger: {
                    player: "useCardToPlayered",
                    target: "useCardToTargeted",
                },
                forced: true,
                logTarget(trigger, player) {
                    return player === trigger.player ? trigger.target : trigger.player;
                },
                filter: (event, player) => {
                    return event.card.name === "juedou";
                },
                async content(event, trigger, player) {
                    const id = (player === trigger.player ? trigger.target : trigger.player)["playerid"];
                    const idt = trigger.target.playerid;
                    const map = trigger.getParent().customArgs;
                    if (!map[idt]) map[idt] = {};
                    if (!map[idt].shaReq) map[idt].shaReq = {};
                    if (!map[idt].shaReq[id]) map[idt].shaReq[id] = 1;
                    map[idt].shaReq[id]++;
                },
                ai: {
                    "directHit_ai": true,
                    skillTagFilter(player, tag, arg) {
                        if (!arg) return false;
                        if (arg.card.name !== "juedou" || Math.floor(arg.target.countCards("h", "sha") / 2) > player.countCards("h", "sha")) return false;
                    },
                },
                sub: true,
                sourceSkill: "lit_qiangjian",
            },
            use: {
                forced: true,
                trigger: {
                    player: "useCardBegin",
                },
                filter: (event, player) => {
                    return ["sha", "nanman", "wanjian"].includes(event.card.name);
                },
                content() { },
                logTarget: "target",
                sub: true,
                sourceSkill: "lit_qiangjian",
            },
        },
    },
    lit_duilian: {
        enable: "phaseUse",
        usable: 1,
        filter: (event, player) => {
            return player.countCards('hes') > 0;
        },
        check(card) {
            return 10 - get.value(card);
        },
        filterCard(card, player, event) {
            return lib.filter.canBeDiscarded(card, player, player);
        },
        position: "he",
        complexSelect: true,
        complexTarget: true,
        multitarget: true,
        multiline: true,
        selectTarget: [2, Infinity],
        filterTarget(card, player, target) {
            let i = ui.selected.targets.length;
            if (i % 2 === 1) {
                return target.canUse({ name: "juedou", isCard: true }, ui.selected.targets[i - 1]);
            }
            return game.hasPlayer(current => {
                return !ui.selected.targets.includes(current) && current.canUse({ name: "juedou", isCard: true }, target);
            }, false);
        },
        targetprompt: () => {
            if (ui.selected.targets.length % 2) return `(${Math.floor((ui.selected.targets.length + 1) / 2)})先出杀`;
            return `(${Math.floor((ui.selected.targets.length + 1) / 2)})后出杀`;
        },
        async content(event, trigger, player) {
            if (event.targets.length % 2 === 1) event.targets.pop();
            for (let i = 0; i < event.targets.length / 2; i++) {
                event.targets[2 * i + 1].line(event.targets[2 * i], "fire");
                game.delay(0.5);
                await event.targets[2 * i + 1].useCard({ name: "juedou", isCard: true }, "nowuxie", event.targets[2 * i], "noai").set("animate", false);
            }
        },
        ai: {
            order: 8,
            result: {
                target: (player, target) => {
                    let i = ui.selected.targets.length;
                    if (i % 2 === 0) {
                        return -3;
                    } else {
                        return get.effect(ui.selected.targets[i - 1], { name: "juedou" }, target, target);
                    }
                },
                player: -1,
            },
            expose: 0.4,
            threaten: 3,
        },
    },
    lit_duilianV2: {
        init: (player) => {
            if (player.hasSkill('lit_duilian')) player.removeSkill('lit_duilian');
        },
        inherit: "lit_duilian",
        filterCard: false,
        position: undefined,
        ai: {
            order: 8,
            result: {
                target: (player, target) => {
                    let i = ui.selected.targets.length;
                    if (i % 2 === 0) {
                        return -3;
                    } else {
                        return get.effect(ui.selected.targets[i - 1], { name: "juedou" }, target, target);
                    }
                },
            },
            expose: 0.4,
            threaten: 3.2,
        },
    },
    // 伍小戚
    lit_shencaocao: {
        nobracket: true,
        enable: "phaseUse",
        usable: 1,
        async content(event, trigger, player) {
            event.targets = game.filterPlayer(current => {
                return current !== player;
            }).sortBySeat();
            await game.asyncDraw(event.targets);
            await player.turnOver();

            if (player.hasMark("lit_mianjuV2")) {
                player.removeMark("lit_mianjuV2", 1);
                if (!player.hasMark('lit_mianjuV2') && player.hasSkill("lit_mianjuV2")) {
                    await player.logSkill("lit_mianjuV2");
                    await player.useSkill("lit_mianjuV2_remove");
                }
                await player.recover();
            } else if (player.hasMark("lit_mianju")) {
                player.removeMark("lit_mianju", 1);
                if (!player.hasMark("lit_mianju") && player.hasSkill("lit_mianju")) {
                    await player.logSkill("lit_mianju");
                    await player.useSkill("lit_mianju_remove");
                }
                await player.recover();
            }
        },
        ai: {
            order: 1,
            threaten: 0.8,
            result: {
                player: (player) => {
                    if (player.countMark("lit_mianju") === 1 || player.countMark("lit_mianjuV2") === 1) return 0;
                    if (player.isMinCard()) return 1;
                    if (!player.hasMark("lit_mianju") && !player.hasMark("lit_mianjuV2")) return 3 - player.countCards('h');
                    return get.recoverEffect(player, player, player) + (player.isTurnedOver() ? 2 : -1) + (player.hasMark("dongjie") && !player.isTurnedOver() ? get.effect(player, { name: "losehp" }) : 0);
                },
                target: 1,
            },
        },
    },
    lit_jiwa: {
        direct: true,
        locked: false,
        trigger: {
            player: "turnOverEnd",
        },
        async content(event, trigger, player) {
            const result = await player.chooseTarget(2, get.prompt('lit_jiwa'), '交换2人手牌').set("ai", target => {
                var player = get.event().player;
                const list = [];
                const players = game.filterPlayer();
                if (ui.selected.targets.length === 0) {
                    if (player.countCards('hs') === 0) return target === player;
                    for (let i = 0; i < players.length; i++) {
                        if (get.attitude(player, players[i]) > 0 && !players[i].hasSkillTag('nogain') && !list.includes(players[i].countCards("h"))) {
                            list.push(players[i].countCards("h"));
                        }
                    }
                    list.sort((a, b) => a - b);
                    return get.attitude(player, target) > 0 && target.countCards("h") === list[0];
                } else {
                    const from = ui.selected.targets[0];
                    for (let i = 0; i < players.length; i++) {
                        if (get.attitude(player, players[i]) < 1 && !players[i].hasSkillTag('noh') && !list.includes(players[i].countCards("h"))) {
                            list.push(players[i].countCards("h"));
                        }
                    }
                    list.sort((a, b) => b - a);
                    return from.countCards("h") <= list[0] && get.attitude(player, target) < 1 && target.countCards("h") === list[0];
                }
            }).set("complexTarget", true).forResult();
            if (result.bool) {
                event.forceDie = true;
                await player.logSkill('lit_jiwa');
                await result.targets[0].swapHandcards(result.targets[1]).set("forceDie", true);
            }
        },
        ai: {
            pretao: true,
            nokeep: true,
            order: 1,
            expose: 0.2,
            threaten: 2.5,
            skillTagFilter(player, tag, arg) {
                if (tag === "pretao" || tag === "nokeep") return !player.isMaxHandcard();
            },
            result: {
                player: 1,
            },
            combo: "lit_shencaocao",
        },
    },
    lit_mianju: {
        derivation: ['lit_xiaochou', 'lit_mianju_faq'],
        locked: true,
        mark: true,
        marktext: "面",
        intro: {
            name: "面具",
            content: (storage, player) => {
                return `距离伍还差${storage + 1}层面具`;
            },
        },
        init: (player) => {
            // 游戏开始后获得技能时
            if (game.roundNumber === 0) return;
            if (player.countMark('lit_mianju') < 4) player.addMark('lit_mianju', 4);
            player.markSkill('lit_mianju');
        },
        ai: {
            save: true,
            threaten: 0.6,
            skillTagFilter(player, tag, arg) {
                if (tag === "save") return arg && arg.player === player;
            },
        },
        group: ['lit_mianju_start', 'lit_mianju_dying'],
        subSkill: {
            start: {
                forced: true,
                popup: false,
                trigger: {
                    global: "gameStart",
                    player: ["revive", "showCharacterAfter"],
                },
                filter: (event, player) => {
                    return event.name !== "showCharacter" || !player.getStorage("lit_mianju_start", false);
                },
                async content(event, trigger, player) {
                    if (!player.hasSkill('lit_mianju')) return;
                    player.setStorage("lit_mianju_start", true);
                    if (player.countMark('lit_mianju') < 4) player.addMark('lit_mianju', 4 - player.countMark('lit_mianju'));
                    player.markSkill('lit_mianju');
                },
                sub: true,
                sourceSkill: "lit_mianju",
            },
            dying: {
                trigger: {
                    player: "dying",
                },
                forced: true,
                async content(event, trigger, player) {
                    let i = player.maxHp - player.hp;
                    let j = player.countMark('lit_mianju');
                    if (i > 0) await player.recover(i);
                    if (Math.min(i, j) > 0) player.removeMark('lit_mianju', Math.min(i, j));
                    if (!player.hasMark('lit_mianju')) await player.useSkill("lit_mianju_remove");
                },
                sub: true,
                sourceSkill: "lit_mianju",
            },
            remove: {
                direct: true,
                async content(event, trigger, player) {
                    await player.removeSkills('lit_mianju');
                    await player.addSkills('lit_xiaochou');
                },
                sub: true,
                sourceSkill: "lit_mianju",
            },
        },
    },
    lit_mianjuV2: {
        inherit: 'lit_mianju',
        derivation: ['lit_xiaochouV2', 'lit_mianju_faq'],
        init: (player) => {
            if (player.hasSkill('lit_mianju')) {
                player.clearMark('lit_mianjuV2');
                if (player.hasMark('lit_mianju')) player.addMark('lit_mianjuV2', player.countMark('lit_mianju'), false);
                player.clearMark('lit_mianju');
                player.removeSkill('lit_mianju');
            } else {
                if (player.countMark('lit_mianjuV2') < 4) player.addMark('lit_mianjuV2', 4);
                player.markSkill('lit_mianjuV2');
            }
        },
        locked: true,
        marktext: "面",
        intro: {
            name: "面具",
            content: (storage, player) => {
                return `距离伍还差${storage + 1}层面具`;
            },
        },
        ai: {
            save: true,
            threaten: 0.6,
            skillTagFilter(player, tag, arg) {
                if (tag === "save") return arg && arg.player === player;
            },
        },
        group: ['lit_mianjuV2_start', 'lit_mianjuV2_dying'],
        subSkill: {
            start: {
                forced: true,
                popup: false,
                trigger: {
                    global: "gameStart",
                    player: ["revive", "showCharacterAfter"],
                },
                filter: (event, player) => {
                    return event.name !== "showCharacter" || !player.getStorage("lit_mianjuV2_start", false);
                },
                async content(event, trigger, player) {
                    if (!player.hasSkill('lit_mianjuV2')) return;
                    player.setStorage("lit_mianjuV2_start", true);
                    if (player.countMark('lit_mianjuV2') < 4) player.addMark('lit_mianjuV2', 4);
                    player.markSkill('lit_mianjuV2');
                },
                sub: true,
                sourceSkill: "lit_mianjuV2",
            },
            dying: {
                trigger: {
                    player: "dying",
                },
                forced: true,
                async content(event, trigger, player) {
                    let i = player.maxHp - player.hp;
                    let j = player.countMark('lit_mianjuV2');
                    if (i > 0) await player.recover(i);
                    if (Math.min(i, j) > 0) player.removeMark('lit_mianjuV2', Math.min(i, j));
                    if (!player.hasMark('lit_mianjuV2')) await player.useSkill("lit_mianjuV2_remove");
                },
                sub: true,
                sourceSkill: "lit_mianjuV2",
            },
            remove: {
                direct: true,
                async content(event, trigger, player) {
                    await player.removeSkills('lit_mianjuV2');
                    await player.addSkills('lit_xiaochouV2');
                },
                sub: true,
                sourceSkill: "lit_mianjuV2",
            },
        },
    },
    lit_xiaochou: {
        mark: true,
        marktext: "丑",
        intro: {
            name: "小丑",
            content: "距离伍永远差1层面具",
        },
        trigger: {
            player: "die",
        },
        forced: true,
        forceDie: true,
        filter: (event) => {
            return event.source?.isAlive();
        },
        logTarget: "source",
        skillAnimation: true,
        animationColor: "thunder",
        async content(event, trigger, player) {
            await trigger.source.discard(trigger.source.getCards("h"));
        },
        ai: {
            threaten: 0.7,
        },
    },
    lit_xiaochouV2: {
        inherit: 'lit_xiaochou',
        init: (player) => {
            if (player.hasSkill('lit_xiaochou')) player.removeSkill('lit_xiaochou');
        },
        async content(event, trigger, player) {
            await trigger.source.discard(trigger.source.getCards("he"));
        },
    },
    // 自高
    lit_xinren: {
        usable: 1,
        enable: 'phaseUse',
        zhuSkill: true,
        locked: false,
        filter: (event, player) => {
            if (player.countCards('hes') === 0) return false;
            return game.hasPlayer(current => current !== player && (lib.lit.isSameGroup(current, 'three')) && current.isIn());
        },
        filterCard: true,
        position: 'hes',
        discard: false,
        lose: false,
        delay: 0,
        check(card) {
            const player = get.owner(card);
            if (get.tag(card, "damage")) return get.value(card);
            if (player.needsToDiscard()) return 11 - get.useful(card);
            return false;
        },
        filterTarget: (card, player, target) => {
            return player !== target && (lib.lit.isSameGroup(target, 'three'));
        },
        async content(event, trigger, player) {
            let cardToUse = event.cards[0],
                user = event.target;
            await player.give(cardToUse, user);
            if (user.hasUseTarget(cardToUse)) {
                user.addTempSkill('lit_xinren_count');
                user.setStorage("lit_xinren_count", [cardToUse, player, 0]);
                await user.chooseToUse(card => card === cardToUse, "【信任】", `是否使用 ${get.translation(cardToUse)}？<li>此牌每造成1点伤害，都会使 ${get.translation(player)} 摸1张牌`)
                    .set("complexSelect", true)
                    .set("filterTarget", function (card, player, target) {
                        return user.canUse(cardToUse, target, true, true);
                    }).set("ai", function (target) {
                        if (!get.tag(cardToUse, "damage")) return get.effect_use(target, cardToUse, player);
                        let att = get.attitude(user, player);
                        return get.effect_use(target, cardToUse, user) + get.sgn(att) * 2;
                    });
            }
        },
        mod: {
            aiValue(player, card, num) {
                if (get.tag(card, "multitarget") && get.tag(card, "damage")) return num + game.players.length;
            },
        },
        ai: {
            order: () => {
                return get.order({ name: "nanman" }) + 0.03;
            },
            expose: 0.1,
            threaten: 1.1,
            result: {
                player: (player, target, card) => {
                    if (get.tag(card, "damage")) {
                        let res = 0;
                        if (target.hasSkillTag("directHit_ai", true, { card: card }, true)) res += 2;
                        if (target.hasSkillTag("damageBonus", true, { card: card }, true)) res += 1;
                        return get.threaten(target) / 2 + res;
                    }
                    return -0.5;
                },
                target: 1.2,
            },
        },
        subSkill: {
            count: {
                direct: true,
                init(player) {
                    player.setStorage("lit_xinren_count", [null, null, 0]);
                },
                trigger: {
                    source: 'damageEnd',
                    player: 'useCardAfter',
                },
                filter: (event, player) => {
                    if (!event.cards[0]) return false;
                    return get.itemtype(event.cards[0]) === "card" && event.cards[0] === player.getStorage("lit_xinren_count", [null, null, 0])[0];
                },
                async content(event, trigger, player) {
                    let state = player.getStorage("lit_xinren_count", [null, null, 0]);
                    if (trigger.name === "damage") {
                        state[2] += trigger.num;
                        player.setStorage("lit_xinren_count", state, true)
                    } else if (player.hasSkill('lit_xinren_count')) {
                        const target = state[1], num = state[2];
                        if (num > 0 && target.isAlive()) {
                            player.line(target, { color: [83, 137, 161] });
                            await target.logSkill('lit_xinren');
                            await target.draw(num).set('source', player);
                        }
                        player.removeSkill('lit_xinren_count');
                    }
                },
                ai: {
                    effect: {
                        player(card, player) {
                            let state = player.getStorage("lit_xinren_count", [null, null, 0]);
                            let cardToUse = state[0],
                                skiller = state[1];
                            let att = get.attitude(player, skiller);
                            if (card.cards[0] === cardToUse && get.tag(cardToUse, "damage")) {
                                return [1, att / 10];
                            }
                        },
                    },
                },
                sub: true,
                sourceSkill: 'lit_xinren',
            },
        },
    },
    lit_zhanshi: {
        usable: 1,
        enable: 'phaseUse',
        locked: false,
        filter: (event, player) => {
            return game.hasPlayer(function (current) {
                return lib.skill.lit_zhanshi.filterTarget(null, player, current);
            });
        },
        filterTarget: (card, player, target) => {
            return player !== target;
        },
        async content(event, trigger, player) {
            let target = event.target;
            if (target.countCards('h') > 0) {
                await target.showCards(target.getCards('h'), `${get.translation(target)} 被 ${get.translation(player)} 点名要求展示`);
                await target.give(target.getCards('h'), player, true);
            }
            let num = player.needsToDiscard();
            if (num) {
                await player.chooseToGive('【展示】', `还给${get.translation(target)} ${num}张牌`, target, num, true)
                    .set("ai", (card, player, target) => {
                        let att = get.attitude(player, target);
                        //if(get.tag(card, "multitarget")&&get.tag(card, "damage"))return -1;
                        return (8 - get.value(card)) * 0.5 + (get.value(card, target) - 6) * get.sgn(att - 0.001);
                    });
                await target.draw(Math.min(num, 3)).set("source", player);
            }
            target.addSkill('lit_zhanshi_sub');
        },
        mod: {
            aiOrder(player, card, num) {
                if (player.needsToDiscard(0, null, true) > 0 && get.name(card, player) === "huogong") {
                    return get.order({ name: "wuzhong" }) - 0.1;
                }
            },
        },
        ai: {
            threaten: 1.1,
            order: (item, player) => {
                if (!player) player = get.player();
                if (player.needsToDiscard(0, null, true) > 0) return get.order({ name: "wuzhong" }) - 0.05;
                return get.order({ name: "tiesuo" }) - 0.03;
            },
            result: {
                player: (player, target) => {
                    return Math.min(-player.needsToDiscard(0, null, true), target.countCards('h'));
                },
                target: (player, target) => {
                    if (target.hasSkillTag('noh')) return 1;
                    let th = target.countCards('h');
                    let q = player.needsToDiscard(th, null, true);
                    let num = q > 0 ? -th + q + Math.min(3, q) : -th;
                    return num + get.threaten(target);
                },
            },
        },
        subSkill: {
            sub: {
                unique: true,
                direct: true,
                charlotte: true,
                nobracket: true,
                trigger: {
                    player: 'phaseAfter',
                },
                async content(event, trigger, player) {
                    player.removeSkill('lit_zhanshi_math');
                    player.removeSkill('lit_zhanshi_sub');
                },
                group: 'lit_zhanshi_math',
                sub: true,
                sourceSkill: 'lit_zhanshi',
            },
            math: {
                getLastUsed: function (player, event) {
                    let history = player.getAllHistory("useCard");
                    let index;
                    if (event) index = history.indexOf(event) - 1;
                    else index = history.length - 1;
                    if (index >= 0) return history[index];
                    return false;
                },
                trigger: { player: "useCard" },
                filter: (event, player) => {
                    let evt = lib.skill.lit_zhanshi_math.getLastUsed(player, event);
                    if (!evt || !evt.card) return false;
                    let num1 = get.number(event.card),
                        num2 = get.number(evt.card);
                    return typeof num1 === "number" && typeof num2 === "number" && num2 % num1 === 0;
                },
                forced: true,
                async content(event, trigger, player) {
                    await player.draw();
                },
                mod: {
                    cardUsable: function (card, player) {
                        if (typeof card === "object") {
                            let evt = lib.skill.lit_zhanshi_math.getLastUsed(player);
                            if (!evt || !evt.card) return;
                            let num1 = get.number(card),
                                num2 = get.number(evt.card);
                            if (num1 === "unsure" || (typeof num1 === "number" && typeof num2 === "number" && num1 % num2 === 0)) return Infinity;
                        }
                    },
                    aiOrder: function (player, card, num) {
                        if (typeof card === "object") {
                            let evt = lib.skill.lit_zhanshi_math.getLastUsed(player);
                            if (!evt || !evt.card) return;
                            let num1 = get.number(card),
                                num2 = get.number(evt.card);
                            if (num1 === "unsure" || (typeof num1 === "number" && typeof num2 === "number" && num2 % num1 === 0)) return num + 5;
                        }
                    },
                },
                init: function (player) {
                    player.addSkill("lit_zhanshi_mark");
                    let history = player.getAllHistory("useCard");
                    if (history.length) {
                        let trigger = history[history.length - 1],
                            num = get.number(trigger.card);
                        player.setStorage("lit_zhanshi_mark", num, true);
                    }
                },
                onremove: function (player) {
                    player.unmarkSkill("lit_zhanshi_mark");
                    player.removeSkill("lit_zhanshi_mark");
                    player.removeGaintag("lit_zhanshi_math1");
                    player.removeGaintag("lit_zhanshi_math2");
                    delete player.storage.lit_zhanshi_mark;
                },
            },
            mark: {
                mark: true,
                intro: {
                    name: "展示",
                    content: (storage, player) => {
                        return `☝️🤓来欣赏一下数学家！<li>上一张牌的点数：${typeof storage === "number" ? storage : "暂无"}</li>`;
                    },
                    markcount: (storage, player) => {
                        return storage ?? 0;
                    },
                },
                charlotte: true,
                trigger: {
                    player: ["useCard1", "gainAfter"],
                    global: "loseAsyncAfter",
                },
                filter: function (event, player, name) {
                    return name === "useCard1" || (event.getg(player).length && player.countCards("h"));
                },
                direct: true,
                firstDo: true,
                async content(event, trigger, player) {
                    player.removeGaintag("lit_zhanshi_math1");
                    player.removeGaintag("lit_zhanshi_math2");
                    if (event.triggername === "useCard1") {
                        let num = get.number(trigger.card, player);
                        player.setStorage("lit_zhanshi_mark", num, true);
                        if (typeof num != "number") return;
                    }
                    let cards1 = [],
                        cards2 = [],
                        num = player.getStorage("lit_zhanshi_mark", undefined);
                    player.getCards("h").forEach(card => {
                        let numx = get.number(card, player);
                        if (typeof numx === "number") {
                            if (numx % num === 0) cards1.push(card);
                            if (num % numx === 0) cards2.push(card);
                        }
                    });
                    player.addGaintag(cards1, "lit_zhanshi_math1");
                    player.addGaintag(cards2, "lit_zhanshi_math2");
                },
            },
        },
    },
    lit_zhanshiV2: {
        inherit: 'lit_zhanshi',
        init: (player) => {
            if (player.hasSkill('lit_zhanshi')) player.removeSkill('lit_zhanshi');
        },
        async content(event, trigger, player) {
            let target = event.target;
            if (target.countCards('h') > 0) {
                await target.showCards(target.getCards('h'), `${get.translation(target)} 被 ${get.translation(player)} 点名要求展示`);
                await target.give(target.getCards('h'), player, true);
            }
            let num = player.needsToDiscard();
            if (num) {
                await player.chooseToGive('【展示】', `还给${get.translation(target)} ${num}张牌`, target, num, true)
                    .set("ai", (card, player, target) => {
                        let att = get.attitude(player, target);
                        //if(get.tag(card, "multitarget")&&get.tag(card, "damage"))return -1;
                        return (8 - get.value(card)) * 0.5 + (get.value(card, target) - 6) * get.sgn(att - 0.001);
                    });
                await target.draw(Math.min(num, 3)).set("source", player);
            }
            player.addSkill('lit_zhanshi_sub');
            target.addSkill('lit_zhanshi_sub');
        },
    },
    lit_chantaer: {
        nobracket: true,
        forced: true,
        trigger: {
            player: ['phaseZhunbei', 'phaseJieshu'],
        },
        filter: (event, player, name) => {
            if (name === 'phaseZhunbei') return player.getDamagedHp() > 0 && player.countCards('h') <= player.getHandcardLimit();
            return !game.hasPlayer2(current => {
                return current.getHistory("damage").length > 0;
            }, true);
        },
        async content(event, trigger, player) {
            if (event.triggername === 'phaseZhunbei') await player.recover();
            else {
                await player.draw(2);
                await player.loseHp();
            }
        },
        mod: {
            maxHandcardBase: (player, num) => {
                return player.maxHp;
            },
            aiUseful(player, card, num) {
                if (['sha', 'shan', 'wuxie', 'tao'].includes(get.name(card, player))) {
                    return Math.min(num * 1.2, 10);
                }
            },
        },
        ai: {
            order: 6.4,
            threaten: 0.7,
            effect: {
                target(card, player, target) {
                    if (get.tag(card, "skip") === "phaseUse") return [1, -1];
                },
                player_use(card, player, target) {
                    if (get.tag(card, "damage")) {
                        if (player.hp === 1 && !player.canSave(player)) return [1, 3];
                        if (player.hp < 3) return [1, 1];
                    }
                },
            },
        },
    },
    // 曾品嘉
    lit_kuaihuo: {
        trigger: {
            player: "useCardAfter",
        },
        forced: true,
        popup: false,
        locked: false,
        filter: (event, player) => {
            if (event.targets.every(e => !e.isIn())) return false; ``
            return get.name(event.card) === "sha" && player.countCards('hes') && !player.hasSkill("lit_kuaihuo_count");
        },
        async content(event, trigger, player) {
            const targets = trigger.targets;
            const result = await player.chooseCardTarget({
                position: 'hes',
                prompt: get.prompt("lit_kuaihuo"),
                prompt2: `选择1张牌同牌堆顶置换，并指定1人对杀的目标（${get.translation(targets)}）再使用1张无实体的杀`,
                filterTarget: lib.filter.notMe,
                filterCard: (card) => {
                    return true;
                },
                ai2: (target) => {
                    let eff = 0, i = 0;
                    for (i in targets) {
                        if (get.effect(targets[i], { name: 'sha' }, target, target) <= 0) return 0;
                        eff += get.effect(targets[i], { name: 'sha' }, target, player);
                    }
                    return eff / (i + 1);
                },
            }).forResult();
            if (!result.bool) {
                event.finish();
                return;
            }
            player.addTempSkill("lit_kuaihuo_count");

            const card = result.cards[0];
            await player.gain(get.cards()[0], "draw");
            await player.lose(card, ui.special);
            await game.cardsGotoPile(card, "insert");
            game.log(player, "将", card, "置于了牌堆顶");

            const target = result.targets[0];
            event.targets = [target].addArray(trigger.targets);
            await player.logSkill('lit_kuaihuo', target, { color: [255, 192, 203] });
            game.log(target, "被询问是否对", targets, "使用一张无实体牌的【杀】");
            target.line(targets, { color: [255, 192, 203] });

            const { control } = await target.chooseControl('使用杀', '不使用', true)
                .set('prompt', `【快活】是否对 ${get.translation(targets)} 使用1张无实体牌的“杀”？`)
                .set("ai", (event) => {
                    for (let i of targets) {
                        if (get.effect(i, { name: 'sha' }, target, target) <= 0) return '不使用';
                    }
                    return '使用杀';
                }).forResult();
            game.log(target, '选择', `#y${control}`);
            target.popup(control);
            if (control === '使用杀') {
                target.line(targets);
                await target.useCard({ name: 'sha', isCard: true }, targets, false);
            }
        },
        ai: {
            expose: 0.1,
            threaten: 1.2,
        },
        subSkill: {
            count: {
                charlotte: true,
                sub: true,
                sourceSkill: "lit_kuaihuo",
            },
        },
    },
    lit_saohua: {
        enable: 'phaseUse',
        log: false,
        locked: false,
        mark: true,
        marktext: "话",
        intro: {
            name: (storage, player) => player.hasSkill('lit_saohua_pi') ? "骚话（已劈）" : "骚话",
            content: "expansion",
            markcount: "expansion",
            mark: (dialog, content, player) => {
                const cards = player.getExpansions("lit_saohua");
                if (!cards?.length) return;
                dialog.addAuto(cards);

                if (player.isUnderControl(true)) {
                    const list = lib.skill.lit_saohua_sub.getAuto(player);
                    const text = [
                        list[0].length ? `<li>推荐13方案：${list[0][0].join(' ')}</li>` : '',
                        list[1].length ? `<li>推荐33方案：${list[1][0].join(' ')}</li>` : ''
                    ].filter(Boolean).join('');
                    if (text) dialog.addText(text);
                }
            }
        },
        onremove: (player, skill) => {
            const cards = player.getExpansions(skill);
            if (cards.length) player.loseToDiscardpile(cards);
        },
        filter: (event, player) => {
            const list = lib.skill.lit_saohua_sub.getAuto(player);
            return player.hasSkill('lit_saohua_pi') ? list[0].length > 0 : (list[0].length > 0 || list[1].length > 0);
        },
        check: (event, player) => {
            // 优先使用33方案，其次13方案，有标记时只能选13
            const list = lib.skill.lit_saohua_sub.getAuto(player);
            if (list[1].length && !player.hasSkill('lit_saohua_pi')) return 6;
            if (list[0].length && game.hasPlayer(current => {
                return get.effect(current, { name: "shandian" }, player, player) > 0;
            })) return 3;
            return 0;
        },
        async content(event, trigger, player) {
            const skillName = player.hasSkill("lit_saohuaV2") ? "lit_saohuaV2" : "lit_saohua";
            const isPi = player.hasSkill('lit_saohua_pi');
            const { isSubset, generateCombos, getNum } = lib.skill.lit_saohua_sub.utils;

            // 技能效果映射表
            const actions = {
                2: async (links) => { // 闪电
                    const result = await player.chooseTarget(
                        '请选择1名角色',
                        `将【闪电】（${get.translation(links)}）置于其判定区`,
                        (card, player, target) => target.canAddJudge('shandian')
                    ).set("ai", target => get.effect(target, { name: "shandian" }, player, player)).forResult();

                    if (result.bool) {
                        await player.logSkill(skillName, result.targets[0]);
                        await player.useCard({ name: 'shandian' }, result.targets[0], links);
                        return true;
                    }
                    return false;
                },
                3: async (links) => { // 伤害
                    const next = player.chooseTarget("请选择1名角色", "对其造成3点雷属性伤害")
                        .set("ai", target => get.damageEffect(target, player, player, "thunder"));

                    next.set("targetprompt2", [target => {
                        const hints = [];
                        if (target.hasSkill("lit_yisui", null, false, true)) {
                            const hasGuimi = game.hasPlayer(p => p.hasMark('lit_guimi') && p.getStorage("lit_guimi_total") === target && p.hp === p.maxHp);
                            if (hasGuimi) hints.push("反弹伤害");
                        }
                        if (target.hasSkillTag('nothunder') || target.hasSkillTag('nodamage')) hints.push("可能免伤");
                        else {
                            if (target.hasSkillTag('filterDamage')) hints.push("可能减免");
                            if (target.isLinked()) hints.push("可传导");
                        }
                        return hints.join('<br>') || undefined;
                    }]);

                    const result = await next.forResult();
                    if (result.bool) {
                        await player.logSkill(skillName, result.targets[0], "thunder");
                        await player.loseToDiscardpile(links);
                        await result.targets[0].damage(3, "thunder");
                        player.addTempSkill("lit_saohua_pi");
                        return true;
                    }
                    return false;
                }
            };

            // 生成推荐方案
            const cards = player.getExpansions("lit_saohua");
            const list = generateCombos(player, cards, isPi);

            // 构建提示文本
            const hints = [isPi ? "###置于1人的判定区###" : "###或弃3张点数和=33造成3点雷伤###"];
            if (player.hasSkill('lit_saohuaV2')) hints.push("<li>点数<7的牌计算时+7");
            hints.push(`<br>推荐13方案：${list[0][0]?.join(' ') || '暂无'}`);
            if (!isPi) hints.push(`<br>推荐33方案：${list[1][0]?.join(' ') || '暂无'}`);

            // 选择界面
            const result = await player.chooseButton(
                isPi ? 2 : [2, 3],
                ['骚话：将2张点数和≥13的牌当作【闪电】', hints.join(''), cards]
            ).set("filterButton", button => {
                const nums = [...ui.selected.buttons.map(b => get.number(b)), get.number(button.link)];
                const len = nums.length;
                const has13 = list[0].some(c => isSubset(nums, c));

                if (isPi) return len <= 2 && has13;
                if (len === 3) return list[1].some(c => isSubset(nums, c));
                if (len === 2) return has13;
                return has13 || list[1].some(c => isSubset([nums[0]], c));
            }).set("ai", button => {
                const nums = [...ui.selected.buttons.map(b => get.number(b)), get.number(button.link)];
                const target = (!isPi && list[1].length) ? list[1][0] : list[0][0];
                return isSubset(nums, target) ? 10 : 0;
            }).forResult();

            if (!result.bool) return;

            // 执行对应动作
            await actions[result.links.length](result.links);
        },

        mod: {
            aiValue(player, card, num) {
                if (player.hasSkill('lit_saohuaV2')) return;
                const n = get.number(card);
                if (n > 6 && !["equip", "delay"].includes(get.type(card))) {
                    return num + n / 10;
                }
            }
        },
        ai: {
            order: 1,
            expose: 0.3,
            threaten: 1.9,
            thunderAttack: true,
            result: {
                player: player => {
                    const list = lib.skill.lit_saohua_sub.getAuto(player);
                    if (list[1].length && game.hasPlayer(t => get.damageEffect(t, player, player, "thunder") > 0)) return 6;
                    if (list[0].length && player.getExpansions("lit_saohua").length > 4 &&
                        game.hasPlayer(t => t.canAddJudge('shandian') && get.effect(t, { name: "shandian" }, player, player) > 1)) return 2;
                    return -1;
                }
            },
            effect: {
                player_use: (card, player) => {
                    if (!player.hasSkill('lit_saohuaV2') && !["equip", "delay"].includes(get.type(card))) {
                        return [1, get.number(card) > 6 ? get.number(card) / 20 : 0];
                    }
                }
            }
        },

        group: ['lit_saohua_sub', 'lit_saohua_mark'],
        subSkill: {
            sub: {
                charlotte: true,
                utils: {
                    // 检查selected数组是否是combo数组的子集
                    isSubset(selected, combo) {
                        const counts = {};
                        for (const num of combo) counts[num] = (counts[num] || 0) + 1;
                        for (const num of selected) {
                            if (!counts[num] || --counts[num] < 0) return false;
                        }
                        return true;
                    },
                    // 获取有效点数
                    getNum(player, card) {
                        const n = get.number(card);
                        return (player.hasSkill('lit_saohuaV2') && n < 7) ? n + 7 : n;
                    },
                    // 生成组合
                    generateCombos(player, cards, isPi) {
                        const list13 = [], list33 = [];
                        const seen13 = new Set(), seen33 = new Set();
                        const getKey = arr => arr.slice().sort((a, b) => a - b).join(',');
                        const getNum = lib.skill.lit_saohua_sub.utils.getNum;
                        const n = cards.length;

                        // 两牌组合（13+）
                        for (let i = 0; i < n; i++) {
                            for (let j = i + 1; j < n; j++) {
                                if (getNum(player, cards[i]) + getNum(player, cards[j]) >= 13) {
                                    const combo = [get.number(cards[i]), get.number(cards[j])];
                                    const key = getKey(combo);
                                    if (!seen13.has(key)) {
                                        list13.push(combo);
                                        seen13.add(key);
                                    }
                                }
                            }
                        }

                        // 三牌组合（33）
                        if (!isPi) {
                            for (let i = 0; i < n; i++) {
                                for (let j = i + 1; j < n; j++) {
                                    const sum2 = getNum(player, cards[i]) + getNum(player, cards[j]);
                                    if (sum2 > 33) continue;
                                    for (let k = j + 1; k < n; k++) {
                                        if (sum2 + getNum(player, cards[k]) === 33) {
                                            const combo = [get.number(cards[i]), get.number(cards[j]), get.number(cards[k])];
                                            const key = getKey(combo);
                                            if (!seen33.has(key)) {
                                                list33.push(combo);
                                                seen33.add(key);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        return [list13, list33];
                    }
                },
                getAuto(player) {
                    return lib.skill.lit_saohua_sub.utils.generateCombos(
                        player,
                        player.getExpansions("lit_saohua"),
                        player.hasSkill('lit_saohua_pi')
                    )
                },
                sub: true,
                sourceSkill: "lit_saohua"
            },
            mark: {
                trigger: { player: ["useCardEnd", "respondEnd"] },
                frequent: true,
                popup: false,
                filter: (event) => !["equip", "delay"].includes(get.type(event.card)),
                async content(event, trigger, player) {
                    if (get.itemtype(trigger.cards) === "cards") {
                        for (const card of trigger.cards) {
                            if (get.position(card, true) === "o") {
                                player.addToExpansion(card, "gain2").gaintag.add("lit_saohua");
                            }
                        }
                    }
                },
                sub: true,
                sourceSkill: "lit_saohua"
            },
            pi: {
                charlotte: true,
                sub: true,
                sourceSkill: "lit_saohua"
            }
        }
    },
    lit_saohuaV2: {
        nopop: true,
        charlotte: true,
        init: (player) => {
            if (!player.hasSkill('lit_saohua')) player.addSkill('lit_saohua');
            player.removeSkill('lit_saohua_pi');
        },
    },
    // 菠树
    lit_guimi: {
        forced: true,
        marktext: "闺",
        intro: {
            content: (storage, player) => {
                return "已与" + get.translation(player.getStorage("lit_guimi_total"))
                    + "成为闺蜜<li>造成的雷伤+1<li>每间隔1轮的轮次中每回合首次受伤后+1血<li>♥️♦️牌可救" + get.translation(player.getStorage("lit_guimi_total"))
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
                direct: true,
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
            // 结交“闺蜜”
            tie: {
                trigger: {
                    global: ["dieAfter", "gameDrawBefore"],
                    player: ["revive", "enterGame", "showCharacterAfter"],
                },
                unique: true,
                forced: true,
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
                    const result = await player.chooseTarget('请选择与谁结为【闺蜜】', '造成的雷伤+1，每间隔1轮的轮次中每回合首次受伤后+1血；你濒死时，闺蜜可用♥️♦️救你', true, (card, player, target) => {
                        return target != player && !target.hasMark('lit_guimi');
                    }).set("ai", target => {
                        let att = get.attitude(player, target);
                        return att;
                    }).set("animate", false).forResult();
                    if (result.bool) {
                        var target = result.targets[0];
                        target.addMark('lit_guimi');
                        target.addSkill('lit_guimi_total');
                        target.setStorage("lit_guimi_total", player);
                        player.setStorage("lit_guimi", target);
                        await event.trigger("lit_guimi_set");
                    }
                },
                ai: {
                    result: {
                        target: (target) => {
                            if (target.hasSkillTag('thunderAttack')) return 4;
                            return 2;
                        },
                    },
                },
                sub: true,
                sourceSkill: "lit_guimi",
            },
            // “闺蜜”方获得的效果
            total: {
                group: ['lit_guimi_damage', 'lit_guimi_recover', 'lit_guimi_reset', 'lit_guimi_save'],
                ai: {
                    recover: true,
                    save: true,
                    damageBonus: true,
                    maixie: true,
                    skillTagFilter(player, tag, arg) {
                        if (!player.hasMark('lit_guimi')) return false;
                        let guimi = player.getStorage("lit_guimi_total");
                        if (tag === "damageBonus") return arg && get.tag(arg.card, "thunderDamage");
                        if (tag === "save") return arg && arg.player === guimi;
                        if (tag === "maixie") return player.hp === player.maxHp && get.attitude(player, guimi) < 0;
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
                                return [1, -2, 1, -2];
                            }
                        },
                        target(card, player, target) {
                            if (!target.hasMark('lit_guimi')) return;
                            // 需要杀“闺蜜”来源时，让“闺蜜”不再满血
                            if (get.tag(card, "damage")) {
                                let guimi = target.getStorage("lit_guimi_total");
                                if (!guimi.hasSkill('lit_yisui', null, false, true)) return;
                                let att = get.attitude(target, guimi);
                                if (target.hp === target.maxHp && att < 0) {
                                    if (target.isTempBanned("lit_guimi_recover") || target.getHistory("damage").length > 0) return [1, Math.sqrt(-att)];
                                    return [1, 0.3];
                                }
                            }
                        },
                    },
                },
                sub: true,
                sourceSkill: "lit_guimi",
            },
            // “闺蜜”加雷伤
            damage: {
                trigger: {
                    source: "damageBegin1",
                },
                filter: (event, player) => {
                    if (!player.hasMark('lit_guimi') || !event.hasNature("thunder")) return false;
                    if (event.notLink()) return true;
                    // 只有传导源未触发此技能时，才对满足条件的横置角色触发
                    const damageTrigger = event.getParent(4);
                    const histories = player.getHistory('useSkill', e => e.skill === 'lit_guimi_damage');
                    return !histories.find(history => history.event.getParent(2) === damageTrigger);
                },
                direct: true,
                forceDie: true,
                async content(event, trigger, player) {
                    player.popup("lit_guimi");
                    await player.getStorage("lit_guimi_total")?.logSkill("lit_guimi");
                    if (trigger.source === player && trigger.notLink()) trigger.num++;
                },
                sub: true,
                sourceSkill: "lit_guimi",
            },
            // “闺蜜”受伤回血
            recover: {
                trigger: {
                    player: "damageEnd",
                },
                direct: true,
                filter: (event, player) => {
                    return player.hasMark('lit_guimi') && player.getHistory("damage").indexOf(event) === 0;
                },
                async content(event, trigger, player) {
                    player.popup("lit_guimi");
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
            // “闺蜜”轮换加血效果
            reset: {
                charlotte: true,
                direct: true,
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
            // “闺蜜”救“闺蜜”来源
            save: {
                log: false,
                prepare(cards, player, targets) {
                    player.getStorage("lit_guimi_total")?.logSkill("lit_guimi");
                },
                enable: "chooseToUse",
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
        group: ["lit_yisui_damage", "lit_yisui_die"],
        trigger: {
            player: ["loseAfter", "lit_guimi_set"],
            global: ["gameDrawAfter", "equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
        },
        forced: true,
        init: (player) => { //这下懂游戏怎么开始的了
            if (game.roundNumber !== 0) player.useSkill('lit_yisui');
        },
        filter: (event, player, name) => {
            if (!game.hasPlayer(current => {
                return current.hasMark('lit_guimi');
            })) return false;
            if (player.countCards("h") === 2) return false;
            if (name === "lit_guimi_set") return true;
            if (event.name === "gameDraw" || event.name === "gain" && event.player === player) return player.countCards("h") > 2;
            let evt = event.getl(player);
            if (!evt || !evt.hs || evt.hs.length === 0 || player.countCards("h") >= 2) return false;
            evt = event;
            for (let i = 0; i < 2; i++) {
                evt = evt.getParent("lit_yisui");
                if (evt.name != "lit_yisui") return true;
            }
            return false;
        },
        async content(event, trigger, player) {
            let num = 2 - player.countCards("h");
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
                };
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
                trigger: {
                    player: "damageBegin4",
                },
                forced: true,
                filter: (event, player) => {
                    if (event.num <= 0) return false;
                    return game.hasPlayer(current => {
                        return current.hasMark('lit_guimi') && current.getStorage("lit_guimi_total") === player && current.hp === current.maxHp;
                    });
                },
                logTarget: "source",
                async content(event, trigger, player) {
                    trigger.cancel();
                    if (trigger.source && trigger.source != player) {
                        await trigger.source.loseHp(trigger.num);
                    }
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
                                if (player.hasSkillTag('maihp')) return [0, 0, 0, 1];
                                if (player.hasMark('lit_guimi') && player.getStorage("lit_guimi_total") === target) return [0, -2, 0, -0.5];
                                return [0, 0, 0, -2];
                            }
                        },
                    },
                },
                sub: true,
                sourceSkill: "lit_yisui",
            },
            die: {
                trigger: {
                    global: "die",
                },
                forced: true,
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
        group: "lit_yisui_damage",
        init: (player) => {
            if (player.hasSkill('lit_yisui')) player.removeSkill('lit_yisui');
        },
    },
    // 刘晨沐
    lit_gufeng: {
        derivation: 'lit_gufeng_append',
        trigger: {
            global: "useCardToTarget",
        },
        filter: (event, player) => {
            if (player.hasSkill('lit_gufeng_1')) return false;
            if (["equip", "delay"].includes(get.type(event.card))) return false;
            return game.hasPlayer(function (current) {
                return !event.targets.includes(current) && lib.filter.targetEnabled2(event.card, event.player, current);
            });
        },
        direct: true,
        locked: false,
        async content(event, trigger, player) {
            const result = await player.chooseTarget(get.prompt("lit_gufeng"), `为 ${get.translation(trigger.card)} 增加1个目标`, (card, player, target) => {
                var trigger = get.event().getTrigger();
                return !trigger.targets.includes(target) && lib.filter.targetEnabled2(trigger.card, trigger.player, target);
            }).set("ai", target => {
                var trigger = get.event().getTrigger();
                return get.effect(target, trigger.card, trigger.player, get.event().player);
            }).forResult();
            if (result.bool) {
                if (!event.isMine() && !event.isOnline()) game.delayx();
                event.target = result.targets[0];
                if (!player.hasSkill('lit_gufeng_1')) player.addTempSkill("lit_gufeng_1", { global: "phaseAfter" });
                await player.logSkill("lit_gufeng", event.target, "fire");
                trigger.player.line(event.target);
                trigger.targets.push(event.target);
            }
        },
        ai: {
            threaten: 1.2,
            expose: 0.2,
        },
        subSkill: {
            1: {
                charlotte: true,
                sub: true,
                sourceSkill: "lit_gufeng",
            },
            2: {
                charlotte: true,
                sub: true,
                sourceSkill: "lit_gufeng",
            },
        },
    },
    lit_jijin: {
        derivation: 'lit_shouji',
        forced: true,
        trigger: {
            global: "damageEnd",
        },
        filter: (event, player) => {
            if (event.source !== player) return false;
            if (!event.player.isAlive()) return false;
            return event.card && get.name(event.card) === "sha";
        },
        async content(event, trigger, player) {
            await trigger.player.addSkills('lit_shouji');
            trigger.player.setStorage("lit_shouji", 1, true);
        },
        ai: {
            threaten: 1.5,
        },
    },
    lit_jijinV2: {
        inherit: 'lit_jijin',
        init: (player) => {
            if (player.hasSkill('lit_jijin')) player.removeSkill('lit_jijin');
        },
        async content(event, trigger, player) {
            await trigger.player.addSkills('lit_shouji');
            let count = trigger.player.getStorage("lit_shouji", 0);
            trigger.player.setStorage("lit_shouji", count + trigger.num, true);
        },
    },
    lit_shouji: {
        lit_neg: 2,
        derivation: "lit_negClear_faq",
        mark: true,
        marktext: "激",
        intro: {
            name: "受激",
            content: "下张杀的目标必定含你（还要再激#下）",
        },
        init: function (player) {
            player.setStorage("lit_shouji", 0);
        },
        ai: {
            neg: true,
        },
        global: 'lit_shouji_global',
        group: 'lit_negClear',
        subSkill: {
            global: {
                charlotte: true,
                mod: {
                    targetEnabled: (card, player, target) => {
                        if (get.name(card) === 'sha' && game.hasPlayer(current => {
                            return current.hasSkill('lit_shouji', null, false, true);
                        })) {
                            return target.hasSkill('lit_shouji', null, false, true);
                        }
                    },
                    targetInRange: (card, player, target) => {
                        if (get.name(card) === 'sha' && game.hasPlayer(current => {
                            return current.hasSkill('lit_shouji', null, false, true);
                        })) {
                            return target.hasSkill('lit_shouji', null, false, true);
                        }
                    },
                },
                trigger: {
                    player: 'useCardToTarget',
                },
                firstDo: true,
                direct: true,
                forceDie: true,
                filter: (event) => {
                    return get.name(event.card) === 'sha' && game.hasPlayer(current => {
                        return current.hasSkill('lit_shouji', null, false, true);
                    });
                },
                async content(event, trigger, player) {
                    trigger.targets = [];
                    game.countPlayer(async current => {
                        if (current.hasSkill('lit_shouji', null, false, true)) {
                            trigger.targets.push(current);
                            let count = current.getStorage("lit_shouji", 0);
                            current.setStorage("lit_shouji", count - 1);
                            if (count - 1 <= 0) current.removeSkill('lit_shouji');
                            await current.logSkill('lit_shouji', null, false, true);
                        }
                        player.line(trigger.targets);
                    });
                },
                ai: {
                    shaRelated: true,
                    effect: {
                        player(card, player, target) {
                            if (card.name === 'sha' && !lib.lit.effLock['lit_shouji']) {// 累了，以后有机会再来处理AI死循环吧
                                let eff = [1, 0, 0, 0], targets = [];
                                game.countPlayer(current => {
                                    if (current.hasSkill('lit_shouji', null, false, true)) targets.push(current);
                                });
                                if (targets.length === 0) return;
                                if (!targets.includes(target)) return "zeroplayertarget";

                                lib.lit.effLock['lit_shouji'] = true;
                                targets.forEach((target) => {
                                    let divAtt = Math.abs(get.attitude(player, target)) ?? 5;
                                    eff[1] += get.effect(target, { name: "sha" }, player, player) / divAtt;
                                })
                                delete lib.lit.effLock['lit_shouji'];

                                return eff;
                            }
                        },
                    },
                },
                sub: true,
                sourceSkill: 'lit_jijin',
            },
        },
    },
    // 郑墨翰
    lit_mensao: {
        usable: 1,
        hiddenCard(player, name) {
            return name === "tiesuo" && player.countCards("hes") > 0;
        },
        enable: "chooseToUse",
        check(card) {
            let player = get.event().player, targets = [];
            let use = (() => {
                game.countPlayer(current => {
                    if (current.isLinked()) targets.push(current);
                });
                if (targets.length === 0) return 1;
                let res = [0, 0, 0];// [总收益, 负收益数, 正收益数]
                for (let i in targets) {
                    let eff = get.recoverEffect(targets[i], player, player);
                    if (eff < 0) res[1] += 1;
                    else if (eff > 0) res[2] += 1;
                    res[0] += eff;
                }
                if (res[1] > 0 && res[2] === 0) return 0;
                return res[1] > 2 ? res[0] : 1;
            })();
            if (use < 0) return;
            if (get.position(card) == "e") {
                let subs = get.subtypes(card);
                if (subs.includes("equip2") || subs.includes("equip3")) {
                    return player.getHp() - get.value(card);
                }
            }
            return 6 - get.value(card);
        },
        filter: (event, player) => {
            if (player.countCards("hes") === 0) return false;
            return event.type === "phase" || event.filterCard(get.autoViewAs({ name: "tiesuo" }, "unsure"), player, event);
        },
        position: "hes",
        selectCard: [1, Infinity],
        filterCard(card, player, event) {
            if (!event) event = _status.event;
            if (event.type === "phase" && get.position(card) != "s" && lib.filter.canBeDiscarded(card, player, player)) {
                return true;
            } else {
                if (game.checkMod(card, player, "unchanged", "cardEnabled2", player) === false) return false;
                const cardx = get.autoViewAs({ name: "tiesuo" }, [card]);
                return event._backup.filterCard(cardx, player, event);
            }
        },
        filterTarget(fuck, player, target) {
            const card = ui.selected.cards[0],
                event = _status.event,
                backup = event._backup;
            if (!card || game.checkMod(card, player, "unchanged", "cardEnabled2", player) === false) return false;
            const cardx = get.autoViewAs({ name: "tiesuo" }, [card]);
            return backup.filterCard(cardx, player, event) && backup.filterTarget(cardx, player, target);
        },
        selectTarget() {
            const card = ui.selected.cards[0],
                event = _status.event,
                player = event.player,
                backup = event._backup;
            let recast = false,
                use = false;
            const cardx = get.autoViewAs({ name: "tiesuo" }, [card]);
            if (event.type === "phase" && player.canRecast(card)) recast = true;
            if (game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false) {
                if (backup.filterCard(cardx, player, event)) use = true;
            }
            if (!use) return [0, 0];
            else {
                const select = backup.selectTarget(cardx, player);
                if (recast && select[0] > 0) select[0] = 0;
                return select;
            }
        },
        filterOk() {
            const card = ui.selected.cards[0],
                event = _status.event,
                player = event.player,
                backup = event._backup;
            const selected = ui.selected.targets.length;
            let use = false;
            const cardx = get.autoViewAs({ name: "tiesuo" }, [card]);
            if (game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false) {
                if (backup.filterCard(cardx, player, event)) use = true;
            }
            if (event.type === "phase" && selected === 0) return true;
            if (use) {
                const select = backup.selectTarget(cardx, player);
                if (select[0] <= -1) return true;
                return selected >= select[0] && selected <= select[1];
            }
        },
        discard: false,
        lose: false,
        delay: false,
        async precontent(event, trigger, player) {
            const result = event.result;
            if (result.targets.length > 0) result.card = get.autoViewAs({ name: "tiesuo" }, result.cards);
        },
        async content(event, trigger, player) {
            await player.discard(event.cards);
            await player.draw(event.cards.length);
        },
        group: 'lit_mensao_after',
        ai: {
            order: 7.5,
            expose: 0.3,
            threaten: 0.8,
            result: {
                target: (player, target) => {
                    if (!target) return;
                    let res = get.recoverEffect(target, player, target);
                    return target.isLinked() ? -res : res + get.effect(target, { name: 'tiesuo' }, player, target);
                },
            },
        },
        subSkill: {
            after: {
                direct: true,
                trigger: { player: ["useSkillAfter", "useCardAfter"] },
                filter: (event, player) => {
                    return event.skill === "lit_mensao";
                },
                async content(event, trigger, player) {
                    if (trigger.name === "useCard" && trigger.cards?.length) await player.draw(trigger.cards.length);
                    game.countPlayer(async current => {
                        if (current.isLinked()) await current.recover();
                    });
                },
                sub: true,
                sourceSkill: "lit_mensao",
            },
        },
    },
    lit_jianren: {
        forced: true,
        trigger: {
            source: 'damageBegin1',
        },
        filter: (event, player) => {
            if (player.hp >= event.player.hp) return false;
            if (event.notLink()) return true;
            // 只有传导源未触发此技能时，才对满足条件的横置角色触发
            const damageTrigger = event.getParent(4);
            const histories = player.getHistory('useSkill', e => e.skill === 'lit_jianren');
            return !histories.find(history => history.event.getParent(2) === damageTrigger);
        },
        async content(event, trigger, player) {
            trigger.num++;
        },
        ai: {
            threaten: (player, target) => {
                if (player.hp > target.hp) return 1.5;
                return 0.7;
            },
            damageBonus: true,
            skillTagFilter: (player, tag, arg) => {
                if (tag === "damageBonus") {
                    return player.hp < arg?.target?.hp;
                }
            },
        },
        group: 'lit_jianren_draw',
        subSkill: {
            draw: {
                forced: true,
                trigger: {
                    source: 'damageAfter',
                },
                filter: (event, player) => {
                    return player.countCards('h') < event.player.countCards('h');
                },
                async content(event, trigger, player) {
                    await player.draw();
                },
                sub: true,
                sourceSkill: "lit_jianren",
            },
        },
    },
    lit_jianrenV2: {
        inherit: 'lit_jianren',
        init: (player) => {
            if (player.hasSkill('lit_jianren')) player.removeSkill('lit_jianren');
        },
        filter: (event, player) => {
            if (player.hp >= event.player.hp) return false;
            if (event.notLink()) return true;
            // 只有传导源未触发此技能时，才对满足条件的横置角色触发
            const damageTrigger = event.getParent(4);
            const histories = player.getHistory('useSkill', e => e.skill === 'lit_jianrenV2');
            return !histories.find(history => history.event.getParent(2) === damageTrigger);
        },
        ai: {
            threaten: (player, target) => {
                if (player.hp > target.hp) return 1.5;
                return 0.7;
            },
            damageBonus: true,
            skillTagFilter: (player, tag, arg) => {
                if (tag === "damageBonus") {
                    return player.hp < arg?.target?.hp || player.isLinked() && game.hasNature(arg?.card);
                }
            },
        },
        group: ['lit_jianrenV2_linked', 'lit_jianrenV2_draw'],
        subSkill: {
            linked: {
                forced: true,
                trigger: {
                    source: 'damageBegin1',
                },
                filter: (event, player) => {
                    if (!event.hasNature("linked")) return false;
                    if (event.notLink()) return true;
                    // 只有传导源未触发此技能时，才对满足条件的横置角色触发
                    const damageTrigger = event.getParent(4);
                    const histories = player.getHistory('useSkill', e => e.skill === 'lit_jianrenV2_linked');
                    return !histories.find(history => history.event.getParent(2) === damageTrigger);
                },
                async content(event, trigger, player) {
                    trigger.num++;
                },
                sub: true,
                sourceSkill: "lit_jianrenV2",
            },
            draw: {
                inherit: 'lit_jianren_draw',
                sourceSkill: "lit_jianrenV2",
            },
        },
    },
    lit_rennai: {
        // todo 先看看平衡性再说
    },
    // Rita
    lit_dafang: {
        zhuSkill: true,
        trigger: {
            player: "loseAfter",
            global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
        },
        filter: (event, player) => {
            let max = game.findPlayer(current => current.isMaxHandcard()).countCards("h");
            return game.hasPlayer(current => {
                return lib.lit.isSameGroup(current, 'three') && current.countCards('h') < Math.min(current.maxHp, max);
            })
        },
        getIndex(event, player) {
            const evt = event.getl(player);
            if (evt && evt.player === player && evt.es) return evt.es.length;
            return false;
        },
        async cost(event, trigger, player) {
            let max = game.findPlayer(current => current.isMaxHandcard()).countCards("h");
            let group = lib.lit.isGuozhanKeyEnabled() ? "叁/键" : "叁";
            const next = player
                .chooseTarget(`大方：选择1名“${group}”势力角色，令其手牌补至全场最多（至多至其体力上限）`, "未选择目标直接点确定视为取消发动", [0, 1], true, (card, player, target) => {
                    return lib.lit.isSameGroup(target, 'three');
                }).set("ai", target => {
                    let num = Math.min(target.maxHp, max) - target.countCards("h");
                    let att = get.attitude(player, target);
                    if (att > 0 && num > 0) return num + att / 10;
                    return -1;
                });
            next.set("targetprompt2",
                next.targetprompt2.concat([
                    target => {
                        if (lib.lit.isSameGroup(target, 'three')) {
                            let del = Math.min(target.maxHp, max) - target.countCards("h");
                            if (del > 0) return `摸${del}张牌`;
                            return "无法补牌";
                        }
                    },
                ]));
            const result = await next.forResult();
            event.result = {
                bool: result.targets?.length > 0,
                targets: result.targets,
                cost_data: max,
            };
        },
        async content(event, trigger, player) {
            const target = event.targets[0];
            let num = Math.min(target.maxHp, event.cost_data) - target.countCards("h");
            if (num > 0) {
                await player.logSkill("lit_dafang", target, "ice");
                await target.draw(num);
            }
        },
        ai: {
            noe: true,
            reverseEquip: true,
            effect: {
                target(card, player, target, current) {
                    if (get.type(card) === "equip" && !get.cardtag(card, "gifts")) return [1, 3];
                },
            },
        },
    },
    lit_nuoruo: {
        frequent: true,
        trigger: { global: "loseEnd" },
        filter: (event, player) => {
            let evt = event.getParent(), evt2 = evt.getParent();
            if (
                event.player === player ||
                event.player != _status.currentPhase ||
                !event.player.isPhaseUsing() ||
                evt.name === "useCard" && get.type(evt.card) === "equip" ||
                evt2.name === "swapHandcards"
            )
                return false;
            for (let i = 0; i < event.cards.length; i++) {
                if (get.type(event.cards[i]) === "equip" && get.position(event.cards[i]) === "d") {
                    return true;
                }
            }
            return false;
        },
        async content(event, trigger, player) {
            let list = [];
            for (let i = 0; i < trigger.cards.length; i++) {
                if (get.type(trigger.cards[i]) === "equip" && get.position(trigger.cards[i]) === "d") {
                    list.push(trigger.cards[i]);
                }
            }
            if (list.length) await player.gain(list, "gain2");
        },
    },
    lit_hengshuiti: {
        nobracket: true,
        direct: true,
        trigger: {
            player: "useCardEnd",
        },
        filter: function (event, player) {
            return get.type(event.card) === "equip";
        },
        async content(event, trigger, player) {
            event.forceDie = true;
            await player.chooseUseTarget({ name: "sha", nature: "ice", isCard: true }, get.prompt("lit_hengshuiti"), "视为使用一张冰杀", false)
                .set("logSkill", "lit_hengshuiti")
                .set("forceDie", true);
        },
    },
    lit_hengshuitiV2: {
        inherit: 'lit_hengshuiti',
        init: (player) => {
            if (player.hasSkill('lit_hengshuiti')) player.removeSkill('lit_hengshuiti');
        },
        async content(event, trigger, player) {
            event.forceDie = true;
            await player.recover();
            let result = await player.chooseUseTarget({ name: "sha", nature: "ice", isCard: true }, get.prompt("lit_hengshuiti"), "视为使用一张冰杀", false)
                .set("logSkill", "lit_hengshuitiV2")
                .set("forceDie", true)
                .forResult();
            // if(!result.bool || !await player.hasHistory("sourceDamage",(evt) => {
            // 	let card = evt.card;
            // 	if (!card || card.name != "sha" || card.nature != "ice") return false;
            // 	let evtx = evt.getParent("useCard");
            // 	return evtx.card === card && evtx.getParent(2) === event;
            // }))await player.draw();
        },
    },
    // 胡畔
    lit_cuiruo: {
        frequent: (trigger, player) => {
            return player.hp <= player.getDamagedHp();
        },
        trigger: {
            player: 'phaseAfter',
        },
        filter: (event, player) => {
            return player.getDamagedHp() > 0;
        },
        check(event, player) {
            let damaged = player.getDamagedHp();
            let delta = player.hp - damaged;
            if (delta <= 0) return true;
            if (damaged / 2 > delta) return true;
            if (damaged === 1) {
                let enemy = game.countPlayer(current => {
                    return current.hasMark('lit_shichou') && current.hp > 1 && get.attitude(player, current) <= 0;
                }) - game.countPlayer(current => {
                    return current.hasMark('lit_shichou') && current.hp > 1 && get.attitude(player, current) > 0;
                })
                return enemy >= delta;
            }
        },
        async content(event, trigger, player) {
            let damaged = player.getDamagedHp();
            let delta = player.hp - damaged;
            await player.draw(damaged);
            if (delta > 0) await player.loseHp(delta);
            else if (delta < 0) await player.recover(-delta);
        },
        ai: {
            threaten: (player, target) => {
                if (target.hp > 2) return (1.0 / player.hp) + 0.3;
                return 1.5;
            },
            result: {
                player: (player) => {
                    let delta = player.hp - player.getDamagedHp();
                    if (delta > 0) {
                        if (game.hasPlayer(current => current.hasMark('lit_shichou'))) return (1.5 - delta) * 2;
                        return (0.5 - delta) * 2;
                    } return player.getDamagedHp() + delta * 2;
                },
            },
            effect: {
                target(card, player, target) {
                    if (get.tag(card, "recover")) {
                        if (player != target) return;
                        if (!target.isPhaseUsing() || target.isDying()) return;
                        if (target.hp <= target.getDamagedHp()) return -3;
                    }
                },
            },
        },
    },
    lit_shichou: {
        direct: true,
        marktext: "誓",
        intro: {
            name: "誓仇",
            content: "帝弓仅以光矢宣其纶音<li>你被游走在巡猎命途上的行者盯上了",
        },
        onremove: (player) => {
            if (!game.hasPlayer(current => current !== player && current.hasSkill('lit_shichou'))) game.countPlayer(current => {
                if (current.hasMark('lit_shichou')) current.clearMark('lit_shichou', false);
            });
        },
        trigger: {
            player: 'damageBegin4',
        },
        filter: (trigger) => {
            return trigger.source?.isIn();
        },
        async content(event, trigger, player) {
            trigger.source.addMark('lit_shichou');
        },
        ai: {
            threaten: 0.6,
            "maixie_defend": true,
            effect: {
                target(card, player, target) {
                    if (!target.hasFriend()) return;
                    if (target.hp === 2 && get.tag(card, "damage")) {
                        if (get.tag(card, "damageBonus")) return 2;
                        if (player.hasSkillTag("jueqing", false, target) && !player.hasMark('lit_shichou')) return 3;
                        return [1, 0, 0, -2 * (player.hp - 1)];
                    }
                },
            },
        },
        group: ['lit_shichou_change', 'lit_shichou_die'],
        subSkill: {
            change: {
                forced: true,
                trigger: {
                    player: ['changeHp', 'loseMaxHpAfter'],
                },
                filter: (event, player, name) => {
                    let num = event.name === 'changeHp' ? event.num : -event.loseHp;
                    if (num === 0) return false;
                    if (!game.hasPlayer(current => current.hasMark('lit_shichou'))) return false;
                    return player.hp === 1;
                },
                async content(event, trigger, player) {
                    game.countPlayer(async current => {
                        if (current.hasMark('lit_shichou')) {
                            current.clearMark('lit_shichou');
                            player.line(current, { color: [115, 155, 70] });
                            if (current.hp === Infinity) {
                                current.hp = Math.pow(2, 31) - 1;
                                current.update();
                            }
                            let num = current.hujia + current.hp - 1;
                            if (num > 0) await current.damage(num);
                        }
                    });
                },
                sub: true,
                sourceSkill: 'lit_shichou',
            },
            die: {
                direct: true,
                forceDie: true,
                trigger: {
                    player: 'dieAfter',
                },
                async content(event, trigger, player) {
                    if (!game.hasPlayer(current => current !== player && current.hasSkill('lit_shichou'))) game.countPlayer(current => {
                        if (current.hasMark('lit_shichou')) current.clearMark('lit_shichou', false);
                    });
                },
                sub: true,
                sourceSkill: 'lit_shichou',
            },
        },
    },
    lit_yinren: {
        usable: 1,
        forceDie: true,
        locked: false,
        mod: {
            cardUsable(card, player, num) {
                if (card.name === "sha" && card.storage.lit_yinren) {
                    return true;
                }
            },
        },
        hiddenCard(player, name) {
            if (name === "sha") return true;
        },

        enable: ["chooseToUse", "chooseToRespond"],
        filter: (event, player) => {
            let filter = event.filterCard ?? (() => true);
            if (filter(get.autoViewAs({ name: "sha", isCard: true, storage: { lit_yinren: true } }), player, event)) {
                return true;
            }
        },
        filterTarget(card, player, target) {
            if (get.event().name === "chooseToRespond") return false;
            return player.canUse({ name: "sha", isCard: true, storage: { lit_yinren: true } }, target, false);
        },
        selectTarget(card, player, target) {
            if (get.event().name === "chooseToRespond") return -1;
            return 1;
        },
        async content(event, noTrigger, player) {
            const target = event.target;
            await player.loseHp();
            if (event.getParent(2).name === "chooseToRespond") {
                event.untrigger();
                event.set("responded", true);
                event.result = { bool: true, card: { name: "sha", isCard: true, storage: { lit_yinren: true } } };
                return;
            }
            await player.useCard({ name: "sha", isCard: true, storage: { lit_yinren: true } }, target, false).set("forceDie", true);
            if (player.hasHistory("sourceDamage", (evt) => {
                let card = evt.card;
                if (!card || card.name != "sha") return false;
                let evtx = evt.getParent("useCard");
                return evtx.card === card && evtx.getParent() === event;
            })) await player.recover();
        },
        ai: {
            order() {
                return get.order({ name: "sha" }) - 0.3;
            },
            respondSha: true,
            skillTagFilter(player, tag, arg) {
                if (tag === "respondSha") return player.hp > 1;
            },
            result: {// 已知chooseToRespond的时候AI不会使用result来计算，以后再改吧
                player: (player, target) => {
                    let divAtt = Math.abs(get.attitude(player, player)) ?? 5;
                    let res = get.effect(player, { name: "losehp", isCard: true }, player, player) / divAtt;
                    if (!target || get.event().name === "chooseToRespond") return res;
                    if (!target.mayHaveShan() || player.hasSkillTag("directHit_ai")) {
                        if (player.hp > 1 || player.canSave(player)) return 0;
                        return res / 2;
                    }
                    return res;
                },
                target: (player, target) => {
                    if (player.hp <= 1 && !player.canSave(player)) return 0;
                    if (!target || get.event().name === "chooseToRespond") return 0;
                    let divAtt = Math.abs(get.attitude(target, target)) ?? 5;
                    let res = get.effect(target, { name: "sha", isCard: true, storage: { lit_yinren: true } }, player, target) / divAtt;
                    return res;
                },
            },
        },
    },
    lit_fumeng: {
        usable: 1,
        enable: "phaseUse",
        derivation: "lit_mengying",
        filter: () => {
            return game.hasPlayer(function (current) {
                return current.maxHp > 1;
            });
        },
        filterTarget: (card, player, target) => {
            return target.maxHp > 1;
        },
        async content(event, trigger, player) {
            let target = event.target;
            if (!target.hasSkill('lit_mengying')) await target.addSkills('lit_mengying');

            let last = target.getStorage("lit_mengying", 0);
            let loseNum = Math.max(target.maxHp - target.hp, 1);
            target.setStorage("lit_mengying", last + loseNum, true);
            await target.useSkill('lit_mengying_neg');
        },
        ai: {
            order: (item, player) => {
                if (game.hasPlayer(current => get.attitude(player, current) < 0 && current.hp === current.maxHp && current.maxHp > 1)) return 10;
                return 1;
            },
            expose: 0.3,
            result: {
                target: (player, target) => {
                    if (target.maxHp <= 1) return;
                    let loseNum = Math.max(target.maxHp - target.hp, 1);
                    let divAtt = Math.abs(get.attitude(target, target)) ?? 5;
                    let loseHpEffect = (target.maxHp > 1 && target.maxHp === target.hp) ?
                        (get.effect(target, { name: "losehp" }, player, target) / divAtt)
                        : 0;

                    let result = get.sgn(loseHpEffect) * Math.sqrt(Math.abs(loseHpEffect));
                    if (target.hasSkill('lit_mianju') || target.hasSkill('lit_mianjuV2')) {
                        let count = target.countMark('lit_mianju') + target.countMark('lit_mianjuV2');
                        if (count <= target.maxHp && count > target.maxHp - loseNum) {
                            return (target.maxHp - loseNum) * 2 + result;
                        }
                    }
                    return -loseNum + result;
                },
            },
        },
    },
    lit_mengying: {
        direct: true,
        lit_neg: 3, // 其他技能变动梦萦层数时需调用neg技能
        derivation: "lit_negClear_faq",
        mark: true,
        marktext: "萦",
        intro: {
            name: "梦萦",
            content: function (storage, player, skill) {
                switch (player.getStorage("lit_mengying_neg")) {
                    case 0: return "为什么会这样呢？";
                    case 1: return "这被子也就这样了";
                    case 2: return "诸行了无生趣";
                    case 3: return "火堆外的夜";
                    case 4: return "可恶，然而";
                    case 5: return "无所谓";
                    case 6: return "算了";
                    default: return "…";
                }
            },
        },
        trigger: { player: 'recoverEnd' },
        init: (player) => {
            player.setStorage("lit_mengying", 0);     // 欲达到层数
            player.setStorage("lit_mengying_neg", 0); // 当前层数
        },
        onremove: (player) => {
            let neg = player.getStorage("lit_mengying_neg");
            if (neg > 0) player.gainMaxHp(neg).forceDie = true;
        },
        async content(event, trigger, player) {
            if (player.getStorage("lit_mengying_neg") <= trigger.num) {
                await player.removeSkills('lit_mengying');
                return;
            }
            let num = player.getStorage("lit_mengying_neg") - trigger.num;
            player.setStorage("lit_mengying", num, true);
            player.setStorage("lit_mengying_neg", num);
            await player.gainMaxHp(trigger.num);
        },
        ai: {
            neg: true,
        },
        group: ['lit_mengying_neg', 'lit_negClear'],
        subSkill: {
            neg: {
                charlotte: true,
                async content(event, trigger, player) {
                    let del = player.getStorage("lit_mengying") - player.getStorage("lit_mengying_neg");
                    if (del === 0) return;
                    if (del > 0) {
                        await player.loseMaxHp(del);
                    } else {
                        if (player.getStorage("lit_mengying") <= 0) {
                            await player.removeSkills('lit_mengying');
                            return;
                        }
                        await player.gainMaxHp(-del);
                    }
                    player.setStorage("lit_mengying_neg", player.getStorage("lit_mengying"));
                },
                sub: true,
                sourceSkill: 'lit_mengying',
            }
        },
    },
    // 兰柏勋
    lit_yuqiu: {
        frequent: true,
        popup: false,
        trigger: {
            player: 'useCardAfter',
        },
        filter: (event, player) => {
            if (!get.tag(event.card, "damage") || !event.targets) return false;
            for (let i in event.targets) {
                if (!event.targets[i].hasHistory("damage", evt => evt.cards && evt.cards === event.cards)
                    && event.targets[i].isAlive()) return true;
            }
        },
        async content(event, trigger, player) {
            const targets = trigger.targets.filter(target =>
                !target.hasHistory("damage", evt => evt.cards === trigger.cards) &&
                target.isAlive());
            event.count = targets.length;
            for (const target of targets) {
                const cardNumber = get.number(trigger.card);
                const isPrimeCard = Number.isInteger(cardNumber) && [2, 3, 5, 7, 11, 13].includes(cardNumber);
                player.line(target);
                if (isPrimeCard) {
                    if (!target.countGainableCards(player, "hej")) return;
                    await player.gainPlayerCard(`${get.prompt('lit_yuqiu', target)}（获得其1张牌）`, target, get.buttonValue, 'hej')
                        .set("logSkill", ['lit_yuqiu', target]);
                } else {
                    if (!target.countDiscardableCards(player, "hej")) return;
                    await player.discardPlayerCard(`${get.prompt('lit_yuqiu', target)}（弃置其至多2张牌）`, target, 'hej', [1, 2])
                        .set("logSkill", ['lit_yuqiu', target]);
                }
            }
        },
        ai: {
            expose: 0.1,
            threaten: 1.8,
            effect: {
                player(card, player, target) {
                    if (get.tag(card, "damage") && get.attitude(player, target) < 0 && target.countCards('he') > 0) return [1, -1.5];
                },
            },
        }
    },
    lit_shouwang: {
        trigger: {
            source: "damageBegin1",
        },
        forced: true,
        filter: (event, player) => {
            if (!player.isMaxHandcard() && !player.isMaxHp()) return false;
            if (event.notLink()) return true;
            // 只有传导源未触发此技能时，才对满足条件的横置角色触发
            const damageTrigger = event.getParent(4);
            const histories = player.getHistory('useSkill', e => e.skill === 'lit_shouwang');
            return !histories.find(history => history.event.getParent(2) === damageTrigger);
        },
        async content(event, trigger, player) {
            trigger.num++;
        },
        mod: {
            aiOrder(player, card, num) {
                if (get.name(card, player) === 'sha') return num + 3;
                if (["nanman", "wanjian"].includes(get.name(card, player))) {
                    return 10;
                }
            },
        },
        ai: {
            threaten: (player, target) => {
                if (target.isMaxHandcard() || target.isMaxHp()) return 2.3;
                return 1.3;
            },
            damageBonus: true,
            unequip_ai: true,
            skillTagFilter(player, tag, arg) {
                if (tag === "unequip_ai") {
                    if (!arg || !arg.target) return false;
                    let es = arg.target.getEquips(1);
                    for (let i of es) {
                        switch (i) {
                            case "bagua":
                                return ["sha", "wanjian"].includes(arg.card.name);
                            case "renwang":
                                return arg.card.name === "sha" && get.color(arg.card) === "black";
                            case "tengjia":
                                return ["nanman", "wanjian"].includes(arg.card.name) || arg.card.name === "sha" && !game.hasNature(arg.card);
                        }
                    }
                }
                return true;
            },
        },
    },
    // 胡馨予
    lit_mimang: {
        forced: true,
        popup: false,
        locked: false,
        marktext: "茫",
        intro: {
            name: "迷茫",
            content: "已经历#次迷茫",
        },
        trigger: {
            player: "phaseJieshu",
        },
        filter: (event, player) => {
            return player.hasMark('lit_mimang') && player.countCards('hes') > 0;
        },
        async content(event, trigger, player) {
            let eff, best_target, best_eff = undefined;
            const players = game.filterPlayer();
            for (let i = 0; i < players.length; i++) {
                if (players[i] === player) continue;
                eff = get.effect(players[i], { name: 'guohe_copy' }, player, player);
                if (best_eff === undefined || eff > best_eff) {
                    best_eff = eff;
                    best_target = players[i];
                }
            }
            const result = await player.chooseCardTarget({
                prompt: '迷茫',
                prompt2: '重铸至多' + player.countMark('lit_mimang') + '张牌，然后选择1人弃置等量牌',
                filterTarget: (card, player, target) => {
                    return target != player && target.countCards('hej') > 0;
                },
                position: 'hes',
                selectCard: [1, player.countMark('lit_mimang')],
                filterCard: true,
                ai1: (card) => {
                    let m = player.countMark('lit_mimang');
                    let h = player.countCards('h');
                    let he = player.countCards('he');
                    let sc = ui.selected.cards.length;
                    if (m > 2 * he) return get.position(card) === 'h' || 9 - get.value(card);
                    if (h < 5 && m >= h) {
                        return sc < h && get.position(card) === 'h';
                    }
                    if (m < 2) return 0;
                    let att = get.attitude(player, best_target);
                    if (sc < (att > 0 ? best_target.countCards(best_target.hasSkillTag('reverseEquip') ? 'ej' : 'j') : best_target.countCards('he'))) {
                        return 9 - get.value(card);
                    }
                    return 0;
                },
                ai2: (target, trigger, player) => {
                    return target === best_target;
                },
            }).forResult();
            if (result.bool) {
                player.removeMark('lit_mimang', result.cards.length)
                await player.recast(result.cards)
                await player.discardPlayerCard(result.targets[0], result.cards.length, true, "hej");
            }
        },
        group: 'lit_mimang_mark',
        subSkill: {
            mark: {
                forced: true,
                popup: false,
                trigger: {
                    player: "damageAfter",
                    source: "damageAfter",
                },
                async content(event, trigger, player) {
                    await player.popup('lit_mimang');
                    await player.addMark('lit_mimang', trigger.num);
                },
                ai: {
                    threaten: 1.2,
                },
                sub: true,
                sourceSkill: "lit_mimang",
            },
        },

    },
    lit_shihuai: {
        forced: true,
        popup: false,
        locked: false,
        trigger: {
            player: "loseAfter",
            global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
        },
        filter: (event, player) => {
            if (player.countCards("h")) return false;
            const evt = event.getl(player);
            return evt && evt.player === player && evt.hs && evt.hs.length > 0;
        },
        async content(event, trigger, player) {
            const result = await player.chooseTarget('【释怀】索敌', "令1人选择：①受到1点伤害，②交给你1张牌", lib.filter.notMe).set("ai", target => {
                if (target.hasSkill('lit_shihuai', null, false, true)) return 0;
                let att = get.attitude(player, target);
                if (target.hasSkillTag('reverseEquip')) return att;
                let es = target.getCards("e").sort(function (a, b) {
                    return get.value(b, target) - get.value(a, target);
                });
                if (es.length) return -Math.min(2, get.value(es[0])) * att;
                return -att;
            }).forResult();
            if (!result.bool) {
                event.finish();
                return;
            }
            var target = result.targets[0];
            event.target = target;
            await player.logSkill('lit_shihuai', target, 'black');
            const { cards } = await target.chooseCard('hes', '被【释怀】索敌', '给予' + get.translation(player) + "1张牌，或取消并受到其1点伤害",)
                .set("ai", card => {
                    if (get.damageEffect(target, player, target) > 0) return -1;
                    if (!player.hasUseTarget(card)) return 10 - get.value(card);
                    if (!player.isPhaseUsing()) return 7 - get.value(card);
                    return -1;
                }).forResult();
            if (cards) {
                await event.target.give(cards, player, true);
            } else {
                await event.target.damage();
            }
        },
        ai: {
            noh: true,
            noautowuxie: true,
        },
        group: 'lit_shihuai_juedou',
        subSkill: {
            juedou: {
                usable: 1,
                enable: "chooseToUse",
                viewAs: {
                    name: "juedou",
                },
                position: "hes",
                viewAsFilter(player) {
                    return player.hasCard(card => get.type(card, null, player) === 'equip', "hes");
                },
                filterCard(card, player) {
                    return get.type(card, null, player) === 'equip';
                },
                prompt: '将1张装备牌作「决斗」使用',
                check(card) {
                    const player = get.event().player;
                    const raw = player.getUseValue(card, null, true);
                    const eff = player.getUseValue(get.autoViewAs({ name: "juedou" }, [card]));
                    return eff - raw;
                },
                sub: true,
                sourceSkill: "lit_shihuai",
            },
        },
    },
    lit_shihuaiV2: {
        inherit: 'lit_shihuai',
        init: (player) => {
            if (player.hasSkill('lit_shihuai')) player.removeSkill('lit_shihuai');
        },
        async content(event, trigger, player) {
            const result = await player.chooseTarget('【释怀】索敌', "令1人选择：①受到1点伤害，②交给你1张装备牌", lib.filter.notMe).set("ai", target => {
                if (target.hasSkill('lit_shihuai', null, false, true)) return 0;
                let att = get.attitude(player, target);
                if (target.hasSkillTag('reverseEquip')) return att;
                let es = target.getCards("e").sort(function (a, b) {
                    return get.value(b, target) - get.value(a, target);
                });
                if (es.length) return -Math.min(2, get.value(es[0])) * att;
                return -att;
            }).forResult();
            if (!result.bool) {
                event.finish();
                return;
            }
            var target = result.targets[0];
            event.target = target;
            await player.logSkill('lit_shihuaiV2', target, 'black');
            const { cards } = await target.chooseCard('hes', '被【释怀】索敌', '给予' + get.translation(player) + "1张装备牌，或取消并受到其1点伤害", (card, target) => get.type(card, null, target) === 'equip')
                .set("ai", card => {
                    if (get.damageEffect(target, player, target) > 0) return -1;
                    if (player.isPhaseUsing()) return -1;

                    if (target.hasSkillTag('reverseEquip')) {
                        let es = target.getCards("e").sort(function (a, b) {
                            return get.value(a, target) - get.value(b, target);
                        });
                        if (es.length) return card === es[0];
                    }

                    let hes = target.getCards("hes").sort(function (a, b) {
                        return get.value(a, target) - get.value(b, target);
                    });
                    if (hes.length) {
                        if (target.hp === 1 && !target.canSave(target)) return card === hes[0];
                        if (get.damageEffect(target, player, target) > -get.value(hes[0])) return -1;
                        return card === hes[0];
                    }
                    return -1;
                }).forResult();
            if (cards) {
                await event.target.give(cards, player, true);
            } else {
                await event.target.damage();
            }
        },
        group: 'lit_shihuaiV2_juedou',
        subSkill: {
            juedou: {
                inherit: "lit_shihuai_juedou",
                sourceSkill: "lit_shihuaiV2",
            },
        },
    },
    // 胡峻玮
    lit_biaoxian: {
        trigger: {
            player: "useCardToPlayered",
        },
        check(event, player) {
            if (get.effect(event.target, event.card, player, player) < 0) return false;
            return !event.target.hasSkill("lit_qbzhimao");
        },
        filter: (event, player) => {
            return event.card.name === "sha";
        },
        forceDie: true,
        logTarget: "target",
        preHidden: true,
        async content(event, trigger, player) {
            const { bool } = await player.judge(card => {
                if (get.suit(card) === "diamond") return 3;
                return -0.5;
            }).set("judge2", result => result.bool)
                .set("forceDie", true).forResult();
            if (bool) {
                trigger.getParent().baseDamage++;
                trigger.getParent().directHit.add(trigger.target);
            }
        },
        ai: {
            threaten: 1.8,
            "directHit_ai": true,
            skillTagFilter(player, tag, arg) {
                if (!arg) return false;
                if (get.attitude(player, arg.target) > 0 || arg.card.name != "sha" || !ui.cardPile.firstChild || get.suit(ui.cardPile.firstChild, player) != "diamond") return false;
            },
            result: {
                player: (player, target) => {
                    if (get.attitude(player, target) < 0) {
                        if (target.hasSkillTag("filterDamage")) return -0.5;
                    }
                },
            },
        },
    },
    lit_wutong: {
        derivation: "lit_wutong_faq",
        trigger: {
            global: "judge",
        },
        async cost(event, trigger, player) {
            const list = lib.suit.slice(0);
            const str = `${get.translation(trigger.player)} 的 ${trigger.judgestr || ""} 判定为 ${get.translation(trigger.player.judging[0])} <li>是否失去1点体力并固定其花色？`;
            const { control } = await player
                .chooseControl(list.concat(['cancel2']))
                .set("prompt", "「梧桐」")
                .set("prompt2", str)
                .set("ai", () => {
                    const judging = get.event().judging;
                    const trigger = get.event().getTrigger();
                    const list = lib.suit.filter(item => item !== get.suit(judging));
                    const att = get.attitude(player, trigger.player);
                    if (att === 0) return 'cancel2';

                    const juding_copy = {
                        name: get.name(judging),
                        nature: get.nature(judging),
                        suit: null,
                        number: get.number(judging),
                    };
                    const getj = (suit) => {
                        juding_copy.suit = suit;
                        return trigger.judge(juding_copy);
                    };
                    list.sort((a, b) => {
                        return (getj(b) - getj(a)) * get.sgn(att);
                    });
                    let delval = (getj(list[0]) - getj(get.suit(judging))) * get.sgn(att);
                    if (delval <= 0) return 'cancel2';
                    if (player.isPhaseUsing() && player.canSave(player)) return list[0];
                    if (delval / 2 <= 4 - player.hp) return 'cancel2';
                    return list[0];
                })
                .set("judging", trigger.player.judging[0])
                .forResult();
            event.result = {
                bool: control != "cancel2",
                cost_data: control,
            };
        },
        async content(event, trigger, player) {
            event.forceDie = true;
            trigger.forceDie = true;
            const control = event.cost_data;
            await player.loseHp();
            player.addExpose(0.25);
            player.popup(get.translation(control + '2') + get.translation(control));
            game.log(player, "将判定结果强制改为了「", `#y${get.translation(control + '2')}`, "」，难以撼动");
            if (!trigger.fixedResult) trigger.fixedResult = {};
            trigger.fixedResult.suit = control;
            trigger.fixedResult.color = get.color({ suit: control });
        },
        ai: {
            rejudge: true,
            tag: {
                rejudge: 1,
            },
            threaten: 1.5,
        },
    },
    lit_wutongV2: {
        inherit: 'lit_wutong',
        derivation: "lit_wutong_faq",
        init: (player) => {
            if (player.hasSkill('lit_wutong')) player.removeSkill('lit_wutong');
        },
        async cost(event, trigger, player) {
            const str = `${get.translation(trigger.player)} 的 ${trigger.judgestr || ""} 判定为 ${get.translation(trigger.player.judging[0])}`;
            const { control } = await player.chooseControl(["失去体力", "弃置手牌", 'cancel2'].filter(e => player.countCards('h') > 0 ? 1 : e != "弃置手牌"))
                .set("prompt", "「梧桐」")
                .set("prompt2", str + `<li>是否失去1点体力 ${player.countCards('h') > 0 ? "或弃置全部手牌" : ""} 从而固定其花色？`)
                .set("ai", () => {
                    // if(game.hasPlayer(current => {
                    // 	if(current.hasSkillTag('rejudge') && get.attitude(player,current) <= 0){
                    // 		let a = _status.currentPhase.getSeatNum();
                    // 		let b = player.getSeatNum();
                    // 		let c = current.getSeatNum();
                    // 		a = a > b? a - game.countPlayer2():a;
                    // 		c = c > b? c - game.countPlayer2():c;
                    // 		return c-a;
                    // 	}
                    // }))return 'cancel2';

                    const judging = get.event().judging;
                    const trigger = get.event().getTrigger();
                    const list = lib.suit.filter(item => item !== get.suit(judging));
                    const att = get.attitude(player, trigger.player);
                    if (att === 0) return 'cancel2';

                    // 计算改变花色后的判定收益
                    const juding_copy = {
                        name: get.name(judging),
                        nature: get.nature(judging),
                        suit: null,
                        number: get.number(judging),
                    };
                    const getj = (suit) => {
                        juding_copy.suit = suit;
                        return trigger.judge(juding_copy);
                    };
                    list.sort((a, b) => {
                        return (getj(b) - getj(a)) * get.sgn(att);
                    });

                    const delval = (getj(list[0]) - getj(get.suit(judging))) * get.sgn(att);
                    if (delval <= 0) return 'cancel2';

                    // 预计算状态
                    const isPhaseUsing = player.isPhaseUsing();
                    const currentHp = player.hp;
                    const canSave = player.canSave(player);
                    const cards = player.getCards("h");
                    const getCardValue = isPhaseUsing ? get.value : get.useful;

                    // 计算手牌总价值
                    let handValue = 0;
                    for (const card of cards) {
                        handValue += Math.max(0, getCardValue(card, player, "raw"));
                    }

                    // 评估各选项的可行性
                    // 弃牌：有手牌且总价值小于3倍收益差
                    const canDiscard = cards.length > 0 && handValue < 3 * delval;
                    // 失去体力：回合内改判1血也能掉
                    const canLoseHp = delval > (4 - currentHp) && (currentHp > 1 || isPhaseUsing && canSave);

                    // 统一决策逻辑
                    if (canDiscard && canLoseHp) {
                        // 失去体力成本：约等于(6-hp)*2
                        // 弃牌成本：约等于手牌价值的一半
                        const loseHpCost = (6 - currentHp) * 2;
                        const discardCost = handValue / 2;
                        return discardCost > loseHpCost ? "弃置手牌" : "失去体力";
                    } else if (canDiscard) {
                        return "弃置手牌";
                    } else if (canLoseHp) {
                        return "失去体力";
                    }

                    return 'cancel2';
                }).set("judging", trigger.player.judging[0]).forResult();
            event.result = {
                bool: control != "cancel2",
                cost_data: control,
            };
        },
        async content(event, trigger, player) {
            const str = `${get.translation(trigger.player)} 的 ${trigger.judgestr || ""} 判定为 ${get.translation(trigger.player.judging[0])}`;
            const list = lib.suit.slice(0);
            const { control } = await player
                .chooseControl(list.concat(['cancel2']))
                .set("prompt", "「梧桐」")
                .set("prompt2", str + "<li>请选择要固定的花色")
                .set("ai", () => {
                    const judging = get.event().judging;
                    const trigger = get.event().getTrigger();
                    const list = lib.suit.filter(item => item !== get.suit(judging));
                    const att = get.attitude(player, trigger.player);

                    const juding_copy = {
                        name: get.name(judging),
                        nature: get.nature(judging),
                        suit: null,
                        number: get.number(judging),
                    };
                    const getj = (suit) => {
                        juding_copy.suit = suit;
                        return trigger.judge(juding_copy);
                    };
                    list.sort((a, b) => {
                        return (getj(b) - getj(a)) * get.sgn(att);
                    });
                    return list[0];
                })
                .set("judging", trigger.player.judging[0])
                .forResult();

            if (control === 'cancel2') return;
            event.forceDie = true;
            trigger.forceDie = true;
            if (event.cost_data === '失去体力') await player.loseHp();
            else if (event.cost_data === '弃置手牌') await player.discard(player.getCards('h'));
            player.addExpose(0.25);
            player.popup(get.translation(control + '2') + get.translation(control));
            game.log(player, "将判定结果强制改为了「", `#y${get.translation(control + '2')}`, "」，难以撼动");
            if (!trigger.fixedResult) trigger.fixedResult = {};
            trigger.fixedResult.suit = control;
            trigger.fixedResult.color = get.color({ suit: control });
        },
    },
    // 王荣
    lit_manmanlai: {
        unique: true,
        zhuSkill: true,
        nobracket: true,
        global: "lit_manmanlai_use",
        subSkill: {
            use: {
                trigger: { player: "phaseZhunbei" },
                popup: false,
                filter(event, player) {
                    if (!lib.lit.isSameGroup(player, 'three')) return false;
                    if (player.hasSkill('lit_diaogui')) return false;
                    if (!player.hasCard(card => {
                        return lib.filter.canBeDiscarded(card, player, player);
                    }, 'j')) return false;
                    return game.hasPlayer((target) => {
                        return target.hasZhuSkill("lit_manmanlai", player) && !target.hasSkill("lit_manmanlai_used");
                    });
                },
                async cost(event, trigger, player) {
                    let list = game.filterPlayer((target) => {
                        return target.hasZhuSkill("lit_manmanlai", player) && !target.hasSkill("lit_manmanlai_used");
                    });
                    const { targets } = await player.chooseTarget(`可选择${get.translation(list)}${list.length > 1 ? "中的一人" : ""}，并弃置判定区的1张牌，此后其恢复1点体力`, (card, player, target) => {
                        return target.hasZhuSkill("lit_manmanlai", player) && !target.hasSkill("lit_manmanlai_used");
                    }).set("ai", target => {
                        return 0.1 + get.recoverEffect(target, player, player);
                    }).forResult();
                    if (!targets) return;

                    const { links } = await player.choosePlayerCard("j", "弃置自己判定区的1张牌",
                        (button) => {
                            return 0.1 - get.effect(player, button.link, player, player);
                        }, player
                    ).set("filterButton", (button) => {
                        let player = get.event().player;
                        return lib.filter.canBeDiscarded(button.link, player, player);
                    }).forResult();
                    event.result = {
                        bool: links?.length,
                        targets: targets,
                        cost_data: links,
                    }
                },
                async content(event, trigger, player) {
                    let target = event.targets[0],
                        cards = event.cost_data;
                    await target.logSkill("lit_manmanlai");
                    await player.discard(cards);
                    await target.recover(player);
                    target.addTempSkill("lit_manmanlai_used", "phaseZhunbeiEnd");
                },
                ai: {
                    result: {
                        player: 1,
                    },
                    effect: {
                        target(card, player, target) {
                            if (get.type(card) != "delay") return;
                            if (!lib.lit.isSameGroup(target, 'three')) return;
                            if (target.hasSkill('lit_diaogui')) return;
                            if (target.hasCard(card => {
                                return lib.filter.canBeDiscarded(card, target, target);
                            }, 'j')) return;

                            // 获取目标最可能选择回血的对象
                            const list = game.filterPlayer(current => {
                                return current.hasZhuSkill("lit_manmanlai", player) && !current.hasSkill("lit_manmanlai_used");
                            });
                            list.sort((a, b) => {
                                return get.recoverEffect(b, target, target) - get.recoverEffect(a, target, target);
                            });
                            const skiller = list[0];
                            if (!skiller || get.recoverEffect(skiller, target, target) + 0.1 <= 0) return;

                            // 获取如果发生回血的收益
                            let divAtt = Math.abs(get.attitude(player, skiller)) ?? 5;
                            let eff = get.recoverEffect(skiller, target, player) / divAtt;
                            return [1, 0, 1, eff];
                        },
                    },
                },
                sub: true,
                sourceSkill: "lit_manmanlai",
            },
            used: {
                charlotte: true,
                sub: true,
                sourceSkill: "lit_manmanlai",
            },
        },
    },
    lit_diaogui: {
        lit_neg: 1,
        derivation: "lit_negClear_faq",
        mark: true,
        marktext: "诡",
        intro: {
            name: "吊诡",
            content: "人生如逆旅，我亦是行人",
        },
        trigger: {
            player: "judge",
        },
        forced: true,
        filter: (event, player) => {
            return ['lebu', 'bingliang'].includes(event.cardname);
        },
        async content(event, trigger, player) {
            game.log(player, "被吊诡的命运所弄，此", `#y${trigger.cardname}`, "必定生效");
            trigger.judge = () => -1;
        },
        ai: {
            neg: true,
            effect: {
                target(card, player, target) {
                    if (['lebu', 'bingliang'].includes(get.name(card, player))) return 1.33;
                },
            },
        },
        group: ["lit_diaogui_move", "lit_negClear"],
        subSkill: {
            move: {
                trigger: { global: "roundStart" },
                filter: (event, player) => {
                    return !player.hasSkill("lit_diaogui_done");
                },
                async cost(event, trigger, player) {
                    event.result = await player.chooseTarget("「吊诡」<br>你可以失去1点体力，然后选择一人，向其转移你“吊诡”的命运", (card, player, target) => {
                        return !target.hasSkill("lit_diaogui");
                    }).set("ai", target => {
                        let num = (() => {
                            if (get.effect(player, { name: "losehp" }, player, player) > 0) return 1;
                            if (player.maxHp < 3 && player.hp === 1 && player.canSave(player)) return 1;
                            return player.hp - 2.5;
                        })();
                        if (num > 0) return 0.1 - get.attitude(player, target);
                        return false;
                    }).forResult();
                },
                async content(event, trigger, player) {
                    const target = event.targets[0];
                    player.addExpose(0.1);
                    await player.loseHp();
                    await player.removeSkills("lit_diaogui");
                    await target.addSkills("lit_diaogui");
                    target.addTempSkill("lit_diaogui_done");
                },
                sub: true,
                sourceSkill: "lit_diaogui",
            },
            done: {
                character: true,
                sub: true,
                sourceSkill: "lit_diaogui",
            }
        },
    },
    lit_kushi: {
        forced: true,
        trigger: {
            global: "judgeAfter",
        },
        filter: (event, player) => {
            return player === event.player || player.inRange(event.player);
        },
        async content(event, trigger, player) {
            await player.draw();
        },
        mod: {
            aiValue(player, card, num) {
                if (card.name === "bagua") return num * 1.25;
            },
        },
    },
    lit_qixu: {
        log: false,
        usable: 1,
        enable: "phaseUse",
        filterTarget(card, player, target) {
            return true;
        },
        async content(event, trigger, player) {
            const target = event.target;
            if (player.hasSkill("lit_qixuV2")) {
                await player.logSkill("lit_qixuV2", target);
            } else {
                await player.logSkill("lit_qixu", target);
            }
            const { control } = await target
                .chooseControl("heart", "diamond", "club", "spade")
                .set("prompt", `请选择${get.translation(player)}「期许」的花色`)
                .set("prompt2", "他正目不转睛地注视你，现在就看你的了")
                .set("ai", event => {
                    let effects = ["shandian", "lebu", "bingliang", "lit_qianfanpai"];
                    let min = 0, minJudge = "";
                    for (let judgeName of effects) {
                        let eff = Math.min(get.effect(target, { name: judgeName }, player, target), -1);
                        if (eff > min) continue;
                        min = eff;
                        minJudge = judgeName;
                    }
                    switch (minJudge) {
                        case "shandian": return "spade";
                        case "lebu": return "heart";
                        case "bingliang": return "club";
                        case "lit_qianfanpai": default:
                            return "diamond";
                    }
                }).forResult();
            let controlTanslation = get.translation(control + "2") + get.translation(control);
            game.log(target, "选择了", `#y${controlTanslation}`);
            target.chat("我选" + controlTanslation);

            const { suit } = await target.judge(card => {
                if (get.suit(card) === control) return 1;
                let judgeName = "";
                switch (get.suit(card)) {
                    case "spade": judgeName = "shandian"; break;
                    case "heart": judgeName = "lebu"; break;
                    case "club": judgeName = "bingliang"; break;
                    case "diamond": judgeName = "lit_qianfanpai"; break;
                    default: return 0;
                }
                return Math.min(get.effect(target, { name: judgeName }, player, target), 0);
            }).set("judge2", result => result.bool).forResult();
            game.delay(2);

            if (!suit) return;
            if (suit === control) {
                if (!player.hasSkill("lit_qixuV2")) await player.removeSkills("lit_qixu");
                if (!player.hasSkill("lit_zhijian")) await player.addSkills("lit_zhijian");
                return;
            }
            let judgeName = "";
            switch (suit) {
                case "spade": judgeName = "shandian"; break;
                case "heart": judgeName = "lebu"; break;
                case "club": judgeName = "bingliang"; break;
                case "diamond": judgeName = "lit_qianfanpai"; break;
                default: return;
            }
            const next = await target.executeDelayCardEffect(judgeName);
            const { result } = next.childEvents.find(event => event.name === "judge");
            if (result && result.bool === false && ["lebu", "bingliang", "lit_qianfanpai"].includes(judgeName)) {
                target.addSkill("lit_qixu_mark");
                let delayEffects = target.getStorage("lit_qixu_mark", []);
                delayEffects.add(judgeName);
                target.setStorage("lit_qixu_mark", delayEffects, true);
            }
        },
        ai: {
            order: 8,
            result: {
                player: (player, target) => {
                    if (player.hasSkill("lit_kushi") && (target === player || target.inRangeOf(player))) return 1.5;
                    return 0;
                },
                target: (player, target) => {
                    let effects = ["shandian", "lebu", "bingliang", "lit_qianfanpai"];
                    let res = 0;
                    for (let judgeName of effects) {
                        let divAtt = Math.abs(get.attitude(target, target)) ?? 5;
                        let eff = get.effect(target, { name: judgeName }, player, target) / divAtt;
                        res += Math.min(eff, -1);
                    }
                    return 3 / 16 * res;
                },
            },
        },
        subSkill: {
            mark: {
                direct: true,
                mark: true,
                intro: {
                    name: "期许",
                    content: (storage, player) => {
                        let delayEffects = player.getStorage("lit_qixu_mark");
                        if (delayEffects && delayEffects.length) {
                            return `辜负了他人的期许，将执行${get.translation(delayEffects)}的效果`;
                        }
                        return "我的孩子们真的都知道";
                    },
                },
                trigger: {
                    player: ["phaseDrawSkipped", "phaseUseSkipped"],
                },
                filter: (event, player) => {
                    let delayEffects = player.getStorage("lit_qixu_mark");
                    if (!delayEffects || !delayEffects.length) return false;
                    switch (event.name) {
                        case "phaseDraw": return delayEffects.includes("bingliang");
                        case "phaseUse": return delayEffects.includes("lebu");
                    }
                    return false;
                },
                async content(event, trigger, player) {
                    // cancelled事件容易找不到reason，故遣返牌的处理被移至了lit_qianfanpai_skill
                    let delayEffects = player.getStorage("lit_qixu_mark", []);
                    switch (trigger.name) {
                        case "phaseDraw":
                            player.popup("（期许）<br>跳过摸牌");
                            delayEffects = delayEffects.filter(e => e != "bingliang");
                            break;
                        case "phaseUse":
                            player.popup("（期许）<br>跳过出牌");
                            delayEffects = delayEffects.filter(e => e != "lebu");
                            break;
                    }
                    player.setStorage("lit_qixu_mark", delayEffects, true);
                    if (delayEffects.length === 0) player.removeSkill("lit_qixu_mark");
                },
                sub: true,
                sourceSkill: "lit_qixu",
            },
        },
    },
    lit_qixuV2: {
        group: "lit_qixu",
        init: (player) => {
            if (player.hasSkill('lit_qixu')) player.removeSkill('lit_qixu');
        },
    },
    lit_zhijian: {
        preHidden: true,
        init: (player) => {
            // 用于directHit_ai的额外参数
            player.setStorage("lit_zhijian", null);
        },
        logTarget: "target",
        trigger: { player: "useCardToPlayered" },
        filter(event, player) {
            return event.card.name == "sha";
        },
        check(event, player) {
            return get.attitude(player, event.target) <= 0 || event.target.mayHaveShan(player, "use");
        },
        async content(event, trigger, player) {
            const judgeEvent = player.judge(card => {
                player.setStorage("lit_zhijian", { color: null });
                let directHitTag = player.hasSkillTag("directHit_ai", null, {
                    source: player,
                    target: trigger.player,
                    card: trigger.card,
                });
                player.setStorage("lit_zhijian", null);
                let es = trigger.player.getEquips(2).length + trigger.player.getEquips(5).length;
                if (trigger.player.getEquips(5) === "muniu" && trigger.player.countCards('s') === 0) es -= 1;
                let directHit = directHitTag || !trigger.player.mayHaveShan(get.event().player, "use") && !es;

                if (get.color(card) === "red") {
                    if (directHit) return 1;
                    if (trigger.player.hp >= (trigger.player.mayHaveShan(get.event().player, "use", null, "count") + es)) return 2.5;
                    return 1.5;
                }
                if (directHit) return 2;
                return 0.5;
            });
            judgeEvent.set("judge2", result => result.color === "red");
            const { color } = await judgeEvent.forResult();

            if (color === "red") {
                if (trigger.target.hp <= 0 || trigger.target.countCards("he") <= 0) return;
                let max = Math.min(trigger.target.hp, trigger.target.countCards("he"));
                const result = await player.choosePlayerCard(trigger.target, "he", [1, max], `【执剑】选择扣置${get.translation(trigger.target)}最多${max}张牌`)
                    .set("ai", (button) => {
                        if (!get.event().goon) return 0;
                        let val = get.value(button.link);
                        if (button.link === get.event().target.getEquip(2) || button.link === get.event().target.getEquip(5)) {
                            return 2 * (val + 3);
                        }
                        return val;
                    }).set("goon", get.attitude(player, trigger.target) <= 0)
                    .set("forceAuto", true).forResult();
                if (result.bool) {
                    let target = trigger.target;
                    target.addSkill("lit_zhijian_card");
                    await target.addToExpansion("giveAuto", result.cards, target).gaintag.add("lit_zhijian_card");
                }
            } else {
                let id = trigger.target.playerid;
                let map = trigger.getParent().customArgs;
                if (!map[id]) map[id] = {};
                if (typeof map[id].extraDamage != 'number') {
                    map[id].extraDamage = 0;
                }
                map[id].extraDamage++;
            }
        },
        ai: {
            unequip_ai: true,
            directHit_ai: true,
            skillTagFilter(player, tag, arg) {
                if (!arg || arg.name != "sha") return false;
                if (get.attitude(player, arg.target) > 0) return false;
                let card = player.getStorage("lit_zhijian", null) ?? ui.cardPile.firstChild;
                if (!card || get.color(card, player) != "red") return false;
                let es = arg.target.getEquips(2).length + arg.target.getEquips(5).length;
                if (arg.target.getEquips(5) === "muniu" && arg.target.countCards('s') === 0) es -= 1;
                if (tag === "directHit_ai") {
                    return arg.target.hp >= (arg.target.countCards("h") + es);
                }
                return es;
            },
        },
        subSkill: {
            card: {
                popup: false,
                forced: true,
                charlotte: true,
                trigger: { target: "shaAfter" },
                filter(event, player) {
                    return player.getExpansions("lit_zhijian_card").length > 0;
                },
                async content(event, trigger, player) {
                    let cards = player.getExpansions("lit_zhijian_card");
                    await player.gain(cards, "draw");
                    game.log(player, "收回了", cards.length, "张“执剑”牌");
                    player.removeSkill("lit_zhijian_card");
                },
                intro: {
                    name: "剑抵咽喉",
                    markcount: "expansion",
                    mark(dialog, storage, player) {
                        let cards = player.getExpansions("lit_zhijian_card");
                        if (player.isUnderControl(true)) {
                            dialog.addAuto(cards);
                        } else {
                            return `共有${cards.length}张牌`;
                        }
                    },
                },
                sub: true,
                sourceSkill: "lit_zhijian",
            },
        },
    },
    // 蒋海旭
    lit_yuanzhu: {
        marktext: "援",
        intro: {
            content: "放心，有旭旭哥哥的💞",
        },
        trigger: {
            global: "phaseBeforeStart",
        },
        onremove: (player) => {
            if (!game.hasPlayer(current => current !== player && current.hasSkill("lit_yuanzhu"))) game.countPlayer(current => {
                if (current.hasMark("lit_yuanzhu")) current.clearMark("lit_yuanzhu", false);
            });
        },
        filter: (event, player) => {
            if (event.player === player || event.player.hasMark("lit_yuanzhu")) return false;
            if (player.countCards('hes') === 0) return false;
            return true;
        },
        async cost(event, trigger, player) {
            const target = trigger.player;
            const result = await player
                .chooseCard("hes", [1, 2], get.prompt("lit_yuanzhu", target),
                    `弃置1~2张牌，令${get.translation(target)}获得等量“援”<li>锁定技；有“援”者即将弃牌时，取消此次弃牌并移除1层“援”</li>`, lib.filter.cardDiscardable)
                .set("ai", card => {
                    if (!get.event().check) return -1;
                    if (ui.selected.cards.length === 0 && (target.hasJudge('lebu') || target.skipList.includes('phaseUse'))) {
                        return 1;
                    } else if (player.needsToDiscard() - ui.selected.cards.length > 0) {
                        return get.unuseful2(card) - 3;
                    }
                    return get.unuseful2(card) - 6;
                    // let count = ui.selected.cards.length + target.countMark("lit_yuanzhu");
                    // let max = get.attitude(player, target) / 3;
                    // if (count === 0 && (target.hasJudge('lebu') || target.skipList.includes('phaseUse'))) {
                    //     return 1;
                    // } else if (player.needsToDiscard() - ui.selected.cards.length > 0) {
                    //     return get.unuseful2(card) - 3;
                    // } else if (max - count > 0) {
                    //     return get.unuseful2(card) - 5 - count;
                    // }
                }).set("check", (() => {
                    if (target.hasSkillTag('noh')) return false;
                    return get.attitude(player, target) > 0;
                })()).forResult();
            event.result = {
                bool: result.bool,
                cost_data: {
                    cards: result.cards,
                },
            };
        },
        async content(event, trigger, player) {
            const target = trigger.player;
            await player.discard(event.cost_data.cards);
            await target.addMark("lit_yuanzhu", event.cost_data.cards.length);
        },
        ai: {
            expose: 0.2,
        },
        global: "lit_yuanzhu_yuan",
        group: "lit_yuanzhu_die",
        subSkill: {
            yuan: {
                forced: true,
                trigger: {
                    player: ["loseBefore", "loseAsyncBefore"],
                },
                filter: (event, player) => {
                    if (!player.hasMark("lit_yuanzhu")) return false;
                    if (event.type != "discard") return false;
                    let cards = player.getCards('hes');
                    return event.cards.some(card => cards.includes(card));
                },
                async content(event, trigger, player) {
                    player.removeMark("lit_yuanzhu", 1);
                    trigger.cards.removeArray(player.getCards('hes'));
                },
                sub: true,
                sourceSkill: "lit_yuanzhu",
            },
            die: {
                direct: true,
                forceDie: true,
                trigger: {
                    player: 'dieAfter',
                },
                filter: () => true,
                async content(event, trigger, player) {
                    if (!game.hasPlayer(current => current !== player && current.hasSkill('lit_yuanzhu'))) game.countPlayer(current => {
                        if (current.hasMark('lit_yuanzhu')) current.clearMark('lit_yuanzhu', false);
                    })
                },
                sub: true,
                sourceSkill: 'lit_yuanzhu',
            },
        },
    },
    lit_chenshui: {
        derivation: "lit_chenshui_faq",
        frequent: (event, player) => {
            return player.isTurnedOver() && get.attitude(player, event.player) > 0;
        },
        trigger: {
            global: ['changeHp', 'loseMaxHpAfter'],
        },
        getIndex(event, player) {
            return [event.player];
        },
        filter: (event, player) => {
            if (player.hasSkill('lit_chenshui_used')) return false;
            let num = event.name === 'changeHp' ? event.num : -event.loseHp;
            return num < 0;
        },
        logTarget(event, player, triggername, target) {
            return target;
        },
        check(event, player, triggername, target) {
            return get.attitude(player, target) > 0;
        },
        async content(event, trigger, player) {
            if (!player.hasSkill('lit_chenshui_used')) player.addTempSkill("lit_chenshui_used");
            await player.turnOver();
            await trigger.player.draw(2);
        },
        global: "shenshui_ai",
        ai: {
            maixie: true,
            "maixie_hp": true,
            expose: 0.1,
            result: {
                player: (player, target) => {
                    return player.isTurnedOver() ? 1 : -1;
                },
                target: 2,
            },
            effect: {
                target(card, player, target) {
                    if (get.tag(card, "damage")) {
                        if (target.hasSkill('lit_chenshui_used') || !target.hasFriend()) return;
                        let num = 1;
                        if (get.attitude(player, target) > 0) {
                            if (player.needsToDiscard()) {
                                num = 0.7;
                            } else {
                                num = 0.5;
                            }
                        }
                        let eff = 0;
                        if (target.hasMark("lit_dongjie")) {
                            if (!lib.lit.effLock['lit_chenshui']) {
                                lib.lit.effLock['lit_chenshui'] = true;
                                let divAtt = Math.abs(get.attitude(target, target)) ?? 5;
                                eff = Math.min(get.effect(target, { name: "losehp" }, target, target) / divAtt, 0);
                                delete lib.lit.effLock['lit_chenshui'];
                            }
                        }
                        num += target.isTurnedOver() ? 0.33 : -0.2;
                        if (target.hp >= 4) return [1, Math.max(num * 2 - eff, 0)];
                        if (target.hp === 3) return [1, Math.max(num * 1.5 - eff, 0)];
                        if (target.hp === 2) return [1, Math.max(num * 0.5 - eff, 0)];
                    }
                },
            },
        },
        subSkill: {
            used: {
                charlotte: true,
                sub: true,
                sourceSkill: "lit_chenshui",
            },
            ai: {
                charlotte: true,
                ai: {
                    effect: {
                        target(card, player, target) {
                            if (!target.hasFriend()) return;
                            if (!get.tag(card, "damage")) return;
                            skillers = game.filterPlayer(current => {
                                return current.hasSkill("lit_chenshui", null, false, true) && !current.hasSkill('lit_chenshui_used') && current != target;
                            })
                            if (skillers.length > 0) {
                                for (let i of skillers) {
                                    if (get.attitude(i, target) > 0) {
                                        let num = 1;
                                        if (get.attitude(player, target) > 0) {
                                            if (player.needsToDiscard()) {
                                                num = 0.7;
                                            } else {
                                                num = 0.5;
                                            }
                                        }
                                        if (target.hp >= 4) return [1, num * 2];
                                        if (target.hp === 3) return [1, num * 1.5];
                                        if (target.hp === 2) return [1, num * 0.5];
                                    }
                                }
                            }
                        },
                    },
                },
            },
        },
    },
    lit_shanliang: {
        forced: true,
        popup: false,
        trigger: {
            player: "dying",
        },
        filter: (event, player) => {
            return game.hasPlayer(current => current.countCards('hs') > 0);
        },
        async content(event, trigger, player) {
            if (player.hasSkill("lit_shanliangV2")) {
                await player.logSkill("lit_shanliangV2");
            } else {
                await player.logSkill("lit_shanliang");
            }
            const emoji1 = ["🙏", "😇", "🤗", "💯", "🥳"], emoji2 = ["😭", "😫", "😖", "😣", "😢"];
            const currented = [];
            const lose_list = [], cards = [];
            let current = player;

            do {
                currented.push(current);
                let taoCards = current.getCards("hs", card => get.name(card, current) === 'tao' || card.name === 'tao');
                let str = taoCards.length ?
                    `${get.translation(current)} 拥有${taoCards.length}张“桃” ${emoji1.randomGets(1)}` :
                    `${get.translation(current)} 没“桃” ${emoji2.randomGets(1)}`;
                await current.showCards(current.getCards("hs"), str);

                if (taoCards.length > 0) {
                    cards.addArray(taoCards);
                    lose_list.push([current, taoCards]);
                }
                current = current.next;
            } while (!currented.includes(current));
            event.cards = cards;
            game.delay(0.5);

            if (cards.length > 0) {
                await game.loseAsync({ lose_list: lose_list }).setContent("discardMultiple");
                if (player.hasSkill("lit_shanliangV2")) {
                    let del = cards.length - player.maxHp + player.hp;
                    if (del > 0) await player.gainMaxHp(del);
                }
                await player.recover(cards.length);
            }
        },
        ai: {
            effect: {
                target(card, player, target) {
                    if (get.tag(card, "damage")) {
                        if (target.hp > 1) return;
                        if (player.hasCard(card => get.name(card, player) === 'tao' || card.name === 'tao', "hs")) {
                            return 0;
                        }
                    }
                },
            },
        },
    },
    lit_shanliangV2: {
        group: 'lit_shanliang',
        init: (player) => {
            if (player.hasSkill('lit_shanliang')) player.removeSkill('lit_shanliang');
        },
    },
    // 钱保灿
    lit_chushou: {
        trigger: {
            player: "phaseBeforeStart",
        },
        direct: true,
        preHidden: true,
        async content(event, trigger, player) {
            await player.skip('phaseDraw');
            let list = lib.inpile.filter(name => {
                return get.type(name) === "trick" && player.hasUseTarget({ name: name, isCard: true });
            });
            if (list.length) {
                const { bool, links } = await player.chooseButton([get.translation(player) + '出手了！将锦囊牌一把抓住，顷刻炼化！', '只显示可使用的锦囊牌，不可被无懈', [list, "vcard"]], true)
                    .set("ai", button => {
                        return get.event().player.getUseValue({ name: button.link[2], isCard: true });
                    }).forResult();
                if (bool) {
                    const name = links[0][2];
                    await player.logSkill("lit_chushou");
                    await player.chooseUseTarget({ name: name, isCard: true, storage: { lit_chushou: true } }, true);
                }
            }
        },
        group: 'lit_chushou_wuxie',
        ai: {
            threaten: 1.1,
            effect: {
                target(card, player, target) {
                    if (card.name === "bingliang") return 0;
                },
            },
        },
        subSkill: {
            wuxie: {
                firstDo: true,
                direct: true,
                trigger: {
                    player: "useCard",
                },
                filter: (event, player) => {
                    return event.card?.storage?.lit_chushou;
                },
                async content(event, trigger, player) {
                    trigger.nowuxie = true;
                },
                sub: true,
                sourceSkill: "lit_chushou",
            },
        },
    },
    lit_chushouV2: {
        inherit: 'lit_chushou',
        init: (player) => {
            if (player.hasSkill('lit_chushou')) player.removeSkill('lit_chushou');
        },
        async content(event, trigger, player) {
            let list = lib.inpile.filter(name => {
                return get.type(name) === "trick" && player.hasUseTarget({ name: name, isCard: true });
            });
            if (list.length) {
                const { bool, links } = await player.chooseButton([get.translation(player) + '出手了！将锦囊牌一把抓住，顷刻炼化！', '只显示可使用的锦囊牌，不可被无懈', [list, "vcard"]], true)
                    .set("ai", button => {
                        return get.event().player.getUseValue({ name: button.link[2], isCard: true });
                    }).forResult();
                if (bool) {
                    const name = links[0][2];
                    await player.logSkill("lit_chushouV2");
                    await player.chooseUseTarget({ name: name, isCard: true, storage: { lit_chushou: true } }, true);
                }
            }
        },
        ai: {
            threaten: 1.1,
        },
        group: 'lit_chushou_wuxie',
    },
    lit_zhixun: {
        trigger: {
            player: "useCard2",
        },
        filter: (event, player) => {
            if (!event.targets) return false;
            let info = get.info(event.card);
            if (info.multitarget) return false;
            return event.targets.length > 1;
        },
        async cost(event, trigger, player) {
            event.result = await player.chooseTarget(get.prompt("lit_zhixun"), `为 ${get.translation(trigger.card)} 减少一个目标，此后需选择一人再次使用此牌`, (card, player, target) => {
                return get.event().targets.includes(target);
            }).set("ai", target => {
                let trigger = get.event().getTrigger();
                return -get.effect(target, trigger.card, trigger.player, player);
            }).set("targets", trigger.targets).forResult();
        },
        async content(event, trigger, player) {
            trigger.targets.remove(event.targets[0]);
            const { targets } = await player.chooseTarget(`对1人使用 ${get.translation(trigger.card)}`, true, (card, player, target) => {
                let trigger = get.event().getTrigger();
                return player.canUse(trigger.card, target, false) || player === target;
            }).set("ai", target => {
                let trigger = get.event().getTrigger();
                return get.effect(target, trigger.card, trigger.player, player);
            }).forResult();
            await player.useCard(trigger.card, targets, false);
        },
    },
    lit_male: {
        frequent: "check",
        locked: false,
        mark: true,
        intro: {
            name: "麻了",
            content: (storage, player) => {
                let damagedCardName = player.getStorage("lit_male");
                let exTargetsNum = player.getStorage("lit_male_phase", 0);
                let str = damagedCardName ? `上次考的：${get.translation(damagedCardName)}` : "还没考呢";
                str += player.isTempBanned("lit_male_judge") ? "，麻了" : "，不麻";
                if (str === "还没考呢，麻了") str += "<li>不对！还没考怎么麻？！";
                str += exTargetsNum > 0 ? `<li>杀、决斗目标数+${exTargetsNum}` : "";
                // let use = player.getCardUsable("sha") === Infinity ? '∞' : player.getCardUsable("sha") < 0 ? 0 : player.getCardUsable("sha");
                // str += `<li>杀还可使用${use}次`;
                return str;
            },
            markcount: (storage, player) => {
                let exTargetsNum = player.getStorage("lit_male_phase", 0);
                return exTargetsNum;
            },
        },
        getLastDamagedName(player) {
            let history = player.getAllHistory("sourceDamage", evt => evt.card);
            if (!history || !history.length) return;
            let card = history[history.length - 1].card;
            return card?.name;
        },
        init: (player) => {
            player.setStorage("lit_male_phase", 0);
            let name = lib.skill.lit_male.getLastDamagedName(player);
            if (name) player.setStorage("lit_male", name, true);
        },
        onremove: (player) => {
            delete player.storage.lit_male_phase;
            player.unmarkSkill("lit_male_mark");
            player.removeGaintag("lit_male_tag");
        },
        trigger: { source: "damageBefore" },
        check(event, player) {
            if (get.effect(event.player, { name: 'damage' }, player, player) > 10) return false;
            return game.countPlayer() > 2;
        },
        filter: (event, player) => {
            if (player.isTempBanned("lit_male_judge")) return false;
            let name1 = event.card.name,
                name2 = lib.skill.lit_male.getLastDamagedName(player);
            return name1 === name2;
        },
        async content(event, trigger, player) {
            let exTargetsNum = player.getStorage("lit_male_phase", 0);
            let targetsInRange = game.filterPlayer(current => {
                return player.canUse({ name: 'sha', isCard: true }, current);
            });
            // judge中的AI
            let ops = 0, neg = 0, others = 0, allops = game.countPlayer(current => {
                if (!player.canUse({ name: 'sha', isCard: true }, current)) return false;
                return get.effect(current, { name: 'sha', isCard: true }, player, player) > 0;
            });
            for (let current of targetsInRange) {
                let eff = get.effect(current, { name: 'sha', isCard: true }, player, player);
                if (eff > 0) ops += 1;
                else if (eff < 0) neg += 1;
                else others += 1;
            }
            let valuableTargetsNum = ops;
            if (!allops) {
                valuableTargetsNum = 0;
            } else if (!ops) {
                if (others && (neg + others) > 1) valuableTargetsNum = 2;
            } else if (valuableTargetsNum) {
                if (others || neg) valuableTargetsNum += 1;
            }

            const { color } = await player.judge(card => {
                let eff = get.effect(trigger.player, { name: 'damage' }, player, player);
                let sgnEff = 1.5 * get.sgn(eff);
                if (get.color(card) === "red") {
                    // todo: 使用mayHaveCard()完善
                    if (exTargetsNum >= valuableTargetsNum - 1) return sgnEff;
                    if (!player.mayHaveSha(get.event().player, "use") && !player.hasCard('juedou', 'hs')) return 0.1 + sgnEff;
                    return 1 + sgnEff;
                }
                if (exTargetsNum < valuableTargetsNum - 1 && exTargetsNum === 0) return -1;
                if (exTargetsNum >= valuableTargetsNum - 1) return 1 + sgnEff;
                return -0.3;
            }).set("judge2", result => result.color === "red")
                .forResult();
            if (color === "red") {
                exTargetsNum += 1;
                player.setStorage("lit_male_phase", exTargetsNum);
            } else {
                player.tempBanSkill("lit_male_judge");
                player.removeGaintag("lit_male_tag");
                trigger.cancel();
                await player.draw();
            }
        },
        ai: {
            effect: {
                player(card, player, target) {
                    if (player.isTempBanned("lit_male_judge")) return;
                    let counts = game.countPlayer();
                    if (get.tag(card, "damage") && get.tag(card, "multitarget")) {
                        if (counts > 2) return [1, 1];
                        return;
                    }
                    let damagedCardName = player.getStorage("lit_male");
                    if (damagedCardName && damagedCardName === card.name) {
                        return [1, 0.5];
                    }
                },
            },
        },
        group: ["lit_male_judge", "lit_male_mark", "lit_male_phase"],
        subSkill: {
            judge: {
                sub: true,
                sourceSkill: "lit_male",
            },
            mark: {
                charlotte: true,
                firstDo: true,
                direct: true,
                trigger: {
                    source: "damageAfter",
                    player: "gainAfter",
                    global: "loseAsyncAfter",
                },
                filter: (event, player, name) => {
                    if (player.isTempBanned("lit_male_judge")) return false;
                    if (name === "damageAfter") return event.card;
                    return event.getg(player).length && player.countCards("hs");
                },
                async content(event, trigger, player) {
                    player.removeGaintag("lit_male_tag");
                    if (event.triggername === "damageAfter") {
                        let name = get.name(trigger.card, player);
                        player.setStorage("lit_male", name, true);
                        if (!name) return;
                    }
                    let cards = [],
                        damagedCardName = player.getStorage("lit_male");
                    player.getCards("hs").forEach(card => {
                        let name = get.name(card, player);
                        if (name && name === damagedCardName) cards.push(card);
                    });
                    player.addGaintag(cards, "lit_male_tag");
                },
                sub: true,
                sourceSkill: "lit_male",
            },
            phase: {
                charlotte: true,
                firstDo: true,
                direct: true,
                trigger: {
                    player: "phaseBefore",
                },
                async content(event, trigger, player) {
                    player.addTempSkill("lit_male_temp", "phaseAfter");
                },
                sub: true,
                sourceSkill: "lit_male",
            },
            temp: {
                onremove: (player) => {
                    player.setStorage("lit_male_phase", 0);
                },
                mod: {
                    selectTarget(card, player, range) {
                        let exTargetsNum = player.getStorage("lit_male_phase");
                        if (range[1] === -1 || !['sha', 'juedou'].includes(card.name)) return;
                        if (exTargetsNum > 0) range[1] += exTargetsNum;
                    },
                },
                sub: true,
                sourceSkill: "lit_male",
            }
        }
    },
    // 张驰
    lit_guibian: {
        enable: "phaseUse",
        usable: 1,
        filter: (event, player) => {
            return game.hasPlayer(target => target != player && target.countCards("h"));
        },
        filterTarget: (card, player, target) => {
            return target != player && target.countCards("h");
        },
        async content(event, trigger, player) {
            const target = event.targets[0];
            const cards = target.getCards("h");
            if (cards.length === 0) return;
            const choosableCards = cards.filter(card => true);

            for (let card of cards) {
                if (card.name !== get.name(card, target) || card.nature !== get.nature(card, target)) {
                    ui.create.cardTempName({ name: get.name(card, target), nature: get.nature(card, target) }, card);
                }
            }
            var dialog = ui.create.dialog("诡辩", cards, true);
            _status.dieClose.push(dialog);
            dialog.videoId = lib.status.videoId++;
            event.dialogID = dialog.videoId;
            game.addVideo("cardDialog", null, [`${get.translation(target)}即将陷入与${get.translation(player)}的诡辩！`, get.cardsInfo(cards), dialog.videoId]);
            game.broadcast(
                function (cards, id) {
                    var dialog = ui.create.dialog("诡辩", cards, true);
                    _status.dieClose.push(dialog);
                    dialog.videoId = id;
                },
                cards,
                dialog.videoId
            );
            game.addCardKnower(cards, "everyone");
            await game.delay();

            const { bool, links } = await player.chooseButton(false, (button) => {
                let player = get.player();
                const gains = choosableCards.filter(card => get.name(card, target) === get.name(button.link, target));
                if (target.canUse(button.link, player, true, true)) return get.effect(player, button.link, target);
                return get.value(gains, player, "raw");
            }).set("dialog", event.dialogID)
                .set("choosableCards", choosableCards)
                .set("closeDialog", false)
                .set("dialogdisplay", true)
                .set("cardFilter", cards.slice(0))
                .set("filterButton", function (button) {
                    return get.event().cardFilter.includes(button.link);
                }).set("filterButton", button => get.event().choosableCards.includes(button.link))
                .forResult();

            const link = links ? links[0] : undefined;
            if (bool) {
                let capt = `${get.translation(player)} 选择的「诡辩」牌为 ${get.translation(link)}`;
                game.log(player, "选择的", "#g「诡辩」", "牌为", link);
                game.broadcastAll((card, id, name, capt) => {
                    var dialog = get.idDialog(id);
                    if (dialog) {
                        dialog.content.firstChild.innerHTML = capt;
                        for (var i = 0; i < dialog.buttons.length; i++) {
                            if (dialog.buttons[i].link === card) {
                                dialog.buttons[i].querySelector(".info").innerHTML = name;
                                break;
                            }
                        }
                        game.addVideo("dialogCapt", null, [dialog.videoId, dialog.content.firstChild.innerHTML]);
                    }
                },
                    link,
                    event.dialogID,
                    (function (player) {
                        if (player._tempTranslate) return player._tempTranslate;
                        let name = player.name;
                        if (lib.translate[name + "_ab"]) return lib.translate[name + "_ab"];
                        return get.translation(name);
                    })(player),
                    capt
                );
                await game.delay();
            }

            for (var i = 0; i < ui.dialogs.length; i++) {
                if (ui.dialogs[i].videoId === event.dialogID) {
                    var dialog = ui.dialogs[i];
                    dialog.close();
                    _status.dieClose.remove(dialog);
                    break;
                }
            }
            game.broadcast(function (id) {
                var dialog = get.idDialog(id);
                if (dialog) {
                    dialog.close();
                    _status.dieClose.remove(dialog);
                }
            }, event.dialogID);
            game.addVideo("cardDialog", null, event.dialogID);
            if (!bool) return;

            const gains = choosableCards.filter(card => {
                return get.name(card, target) === get.name(link, target) && lib.filter.canBeGained(card, player, target);
            });
            const aiBool = (() => {
                let att = get.attitude(target, player),
                    eff1 = get.effect(player, link, target, target),
                    eff2 = get.effect(player, link, target, player);
                if (eff1 > 0) return true;
                if (att < 0) {
                    if (eff1 > eff2) return true;
                    let eff3 = get.value(gains, player) * gains.length;
                    return eff1 + eff3;
                }
                return false;
            })();
            let useResult = { bool: false };
            if (lib.filter.targetEnabled2(link, target, player)) {
                const playerTrans = get.translation(player),
                    linkTrans = get.translation(link),
                    cardTrans = get.translation({ name: get.name(link, target), nature: get.nature(link, target) });
                if (link.name != get.name(link, target) || link.nature != get.nature(link, target)) linkTrans += `（视为${cardTrans}）`;
                useResult = await target.chooseToUse(`###你已陷入与${playerTrans}的诡辩！<br>是否对${playerTrans}使用${linkTrans}？###若不使用，其获得所有${cardTrans}`, link, player)
                    .set("ai2", card => aiBool).forResult();
            }
            if (!useResult.bool) {
                await player.gain(gains, target, "gain2");
            }
        },
        ai: {
            order: 8,
            threaten: 1.3,
            result: {
                player: (player, target) => {
                    if (get.attitude(player, target) > 0) {
                        if (target.hasCard("tao") && player.hp < player.maxHp) return 2;
                    }
                    if (player.countCards("h", "shan") === 0) return 0.5;
                    return 1;
                },
                target: (player, target) => {
                    if (get.attitude(player, target) > 0) {
                        if (player.hasSkill("lit_shuxin", null, false, true)
                            && target.hasCard("tao") && target.hp < target.maxHp) return 2;
                        return;
                    }
                    return -target.countCards("h");
                },
            },
        },
    },
    lit_shuxin: {
        forced: true,
        trigger: {
            target: "useCardToTargeted",
        },
        filter: (event, player) => {
            try {
                if (!lib.filter.targetEnabled3(event.card, null, event.player)) return false;
            } catch { }
            if (event.card.storage?.lit_shuxin) return false;
            return event.player != event.target && ["basic", "trick"].includes(get.type(event.card));
        },
        prompt2: (event, player) => `令 ${get.translation(event.player)} 对他自己使用此 ${get.translation(event.card)}`,
        check(event, player) {
            return get.effect(event.player, event.card, event.player, player) > 0;
        },
        async content(event, trigger, player) {
            if (!trigger.card.storage) trigger.card.storage = {};
            trigger.card.storage.lit_shuxin = true;
            await trigger.player.useCard(trigger.card, trigger.player, false);
        },
        ai: {
            effect: {
                target(card, player, target) {
                    if (player === target || !get.itemtype(card) === "card") return;
                    if (!["basic", "trick"].includes(get.type(card))) return;
                    if (!lib.lit.effLock['lit_shuxin']) {// May Infinity AI Loop
                        lib.lit.effLock['lit_shuxin'] = true;
                        let divAtt = Math.abs(get.attitude(player, player)) ?? 5;
                        let eff = get.effect(player, card, player, player) / divAtt;
                        delete lib.lit.effLock['lit_shuxin'];
                        return [1, 0, 1, eff];
                    }
                },
            },
        },
    },
    lit_shuxinV2: {
        inherit: 'lit_shuxin',
        init: (player) => {
            if (player.hasSkill('lit_shuxin')) player.removeSkill('lit_shuxin');
        },
        forced: false,
        ai: {
            effect: {
                target(card, player, target) {
                    if (player === target || !get.itemtype(card) === "card") return;
                    if (!["basic", "trick"].includes(get.type(card))) return;
                    if (!lib.lit.effLock['lit_shuxin']) {// May Infinity AI Loop
                        lib.lit.effLock['lit_shuxin'] = true;
                        let divAtt = Math.abs(get.attitude(player, player)) ?? 5;
                        let eff1 = get.effect(player, card, player, player) / divAtt,
                            eff2 = get.effect(player, card, player, target);
                        delete lib.lit.effLock['lit_shuxin'];
                        if (eff2 > 0) return [1, 0, 1, eff1];
                    }
                },
            },
        },
    },
    lit_lenmo: {
        derivation: "lit_dongjie",
        forced: true,
        trigger: {
            source: "damageBefore",
        },
        filter: (event, player) => {
            if (!event.player || event.num <= 0) return false;
            if (player === event.player) return false;
            return !player.inRangeOf(event.player);
        },
        async content(event, trigger, player) {
            if (!trigger.player.hasSkill("lit_dongjie")) await trigger.player.addSkills("lit_dongjie");
            trigger.player.addMark("lit_dongjie", 1);
            if (trigger.player.countMark("lit_dongjie") > trigger.player.hp) await trigger.player.turnOver();
        },
        ai: {
            effect: {
                player(card, player, target) {
                    if (get.tag(card, 'damage')) {
                        return [1, -2];
                    }
                },
            },
            // jueqing: true,
            // skillTagFilter(player, tag, arg) {
            //	if(!arg) return false;
            // 	return get.distance(arg.target, player, "attack") > 1;
            // },
        },
    },
    lit_dongjie: {
        lit_neg: 2,
        derivation: "lit_negClear_faq",
        forced: true,
        mark: true,
        marktext: "冻",
        intro: {
            content: '雪が消していた頃、再会を許されるでしょうか？',
        },
        trigger: {
            player: "turnOverEnd",
        },
        async content(event, trigger, player) {
            let num = player.countMark("lit_dongjie");
            player.clearMark("lit_dongjie");
            await player.loseHp(num);
            player.removeSkill("lit_dongjie");
        },
        ai: {
            neg: true,
        },
        group: 'lit_negClear',
    },
    lit_xiaosa: {
        direct: true,
        locked: false,
        firstDo: true,
        init: (player) => {
            // 0: 是否触发过受伤濒死效果；1: 是否触发过掉血濒死效果
            player.setStorage("lit_xiaosa", [false, false]);
        },
        trigger: {
            global: "phaseBefore",
        },
        async content(event, trigger, player) {
            player.setStorage("lit_xiaosa", [0, 0]);
        },
        mod: {
            aiValue(player, card, num) {
                if (get.type(card) === "equip") return num * 1.2;
            },
        },
        global: "lit_xiaosa_ai",
        group: ["lit_xiaosa_damage", "lit_xiaosa_losehp"],
        subSkill: {
            damage: {
                trigger: {
                    global: "dying",
                },
                filter: (event, player) => {
                    if (player.getStorage("lit_xiaosa")[0]) return false;
                    return event.reason.name === "damage";
                },
                async cost(event, trigger, player) {
                    event.result = await player.chooseTarget(get.prompt("lit_xiaosa"), "每回合限一次，场上有人受伤濒死时，可令1人翻面并获得其装备区的牌", (card, player, target) => {
                        return target.isIn();
                    }).set("ai", target => {
                        const player = get.event().player;
                        const att = get.attitude(player, target);
                        const equips = target.getEquips();
                        let score = 0; // 基础收益 = 翻面收益 + 装备收益
                        // 敌方逻辑
                        if (att < 0) {
                            // 抢装备收益
                            score += equips.length * 1.5;
                            if (target.hasSkillTag('noe')) score -= 2;
                            // 翻面收益
                            score += target.isTurnedOver() ? -3 : 5; // 翻面敌人
                            if (target.hasMark("lit_dongjie") && target.hp > 0) {
                                let dmg = target.countMark("lit_dongjie");
                                // 如果翻面能致死，提高优先级
                                score += dmg >= target.hp ? 20 : dmg * 2;;
                                // 已翻面，但冻结层数高，值得翻回来
                                if (target.isTurnedOver() && dmg > 2) score += dmg / 2;
                            }
                            // 如果目标就是那个濒死的人，抢走装备防止他回血后有防御，或者直接翻面控死
                            if (target.hp <= 0 && (equips.length || target.hasMark("lit_dongjie"))) {
                                score += 3;
                            }
                            return score;
                        }
                        // 友方逻辑
                        if (att > 0) {
                            if (!target.isTurnedOver() || target.countMark("lit_dongjie") > 1) return -3;
                            if (target.hasMark("lit_dongjie") && !player.canSave(target)) return -1;
                            if (target.getEquips().length < 2 || target.hasSkillTag("noe")) return 3;
                        }
                        return equips.length * 1.5;
                    }).forResult();
                },
                async content(event, trigger, player) {
                    let state = player.getStorage("lit_xiaosa");
                    state[0] = true;
                    player.setStorage("lit_xiaosa", state);
                    const target = event.targets[0];
                    const es = target.getCards('e').filter(e => {
                        return get.position(e) === 'd' || get.position(e) === 'e' && get.owner(e) === target
                            && lib.filter.canBeGained(e, player, target);
                    });
                    await target.turnOver();
                    if (es.length) await player.gain(es, target, "gain2");
                },
                sub: true,
                sourceSkill: "lit_xiaosa",
            },
            losehp: {
                locked: false,
                direct: true,
                trigger: {
                    global: "dying",
                },
                filter: (event, player) => {
                    if (player.getStorage("lit_xiaosa")[1]) return false;
                    return event.reason.name === "loseHp" &&
                        player.countCards("hes", card => get.type(card) === "equip") &&
                        game.hasPlayer(current => player.canUse({ name: "sha", isCard: true }, current, false));
                },
                async content(event, trigger, player) {
                    const next = player.chooseToUse();
                    next.set("openskilldialog", `###${get.prompt("lit_xiaosa")}###每回合限一次，场上有人失去体力濒死时，可将1张装备牌作不计入次数的杀使用，不可被响应`);
                    next.set("filterTarget", (card, player, target) => {
                        return player.canUse(card, target, false);
                    });
                    next.set("oncard", () => get.event().directHit.addArray(game.players));
                    next.set("_backupevent", "lit_xiaosa_backup");
                    next.set("norestore", true);
                    next.set("addCount", false);
                    next.set("logSkill", "lit_xiaosa");
                    next.set("custom", {
                        add: {},
                        replace: { window() { } },
                    });
                    await next.backup("lit_xiaosa_backup");
                },
                sub: true,
                sourceSkill: "lit_xiaosa",
            },
            backup: {
                filterCard(card) {
                    return get.type(card) === "equip";
                },
                viewAs: { name: "sha" },
                selectCard: 1,
                position: "hes",
                ai1(card) {
                    return 10 - get.value(card);
                },
                ai2(target) {
                    const player = get.event().player;
                    let eff = get.effect(target, { name: "sha" }, player, player);
                    if (eff <= 0) return 0;
                    // 如果目标有闪、有防具，强命的价值大幅提升
                    if (target.mayHaveShan(player) || !target.hasEmptySlot(2)) {
                        eff *= 1.5;
                    }
                    // 濒死目标的评分修正
                    if (target.hp <= 0) {
                        // 判断场上是否有其他更值得杀的敌人
                        const hasOtherEnemy = game.hasPlayer(current => {
                            return current !== target &&
                                get.attitude(player, current) < 0 &&
                                current.hp > 0 &&
                                player.canUse('sha', current);
                        });
                        if (hasOtherEnemy) {
                            // 如果有其他活着的敌人，只有在“实在没得选”且“一定要发动”时才补刀
                            return 0.01;
                        }
                        return eff * 0.5;
                    }
                    return eff;
                },
                async precontent(event, trigger, player) {
                    let state = player.getStorage("lit_xiaosa");
                    state[1] = true;
                    player.setStorage("lit_xiaosa", state);
                    delete event.result.skill;
                },
                sub: true,
                sourceSkill: "lit_xiaosa",
            },
            ai: {
                charlotte: true,
                ai: {
                    effect: {
                        player(card, player, target) {
                            if (!get.tag(card, "damage") && !get.tag(card, "loseHp")) return;
                            if (target.hp > 1) return;

                            let bias = 0;
                            game.filterPlayer(current => {
                                if (!current.hasSkill("lit_xiaosa")) return false;
                                return get.tag(card, "damage") ?
                                    current.getStorage("lit_xiaosa")[0] === false :
                                    current.getStorage("lit_xiaosa")[1] === false
                            }).forEach(skiller => {
                                if (skiller === target && !skiller.hasFriend()) return;
                                const sgnAtt = get.sgnAttitude(player, skiller);
                                if (!sgnAtt) return;

                                if (get.tag(card, "damage")) {
                                    // 伤害濒死：场上最优翻面目标价值
                                    bias += sgnAtt * game.players.reduce((max, cur) => {
                                        if (cur === skiller || get.attitude(skiller, cur) > 0) return max;
                                        if (get.attitude(skiller, cur) === 0) return cur.countCards('e') * 1.5;
                                        return Math.max(max, cur.countCards('e') * 1.5 +
                                            (cur.isTurnedOver() ? -3 : 5) +
                                            (cur.countMark("lit_dongjie") >= cur.hp && cur.hp > 0 ? 8 : 0));
                                    }, 0);
                                } else {
                                    // 失去体力濒死：装备转强命杀的价值
                                    if (skiller.hasCard(card => get.type(card) === "equip", "e")) {
                                        bias += 2 * sgnAtt;
                                    }
                                    else if (skiller.hasCard(card => get.type(card) === "equip", "hs")) {
                                        bias += sgnAtt;
                                    }
                                }
                            });
                            if (bias) return [1, bias];
                        },
                    },
                },
                sub: true,
                sourceSkill: "lit_xiaosa",
            },
        },
    },
    lit_juji: {
        mod: {
            globalFrom(from, to) {
                if (from === _status.currentPhase) return -Infinity;
            },
            globalTo(from, to, distance) {
                if (to === _status.currentPhase) return Infinity;
            },
        },
    },
    // lit_test: {
    //     trigger: { player: 'phaseUseBefore' },
    //     log: false,
    //     filter: (event, player) => {
    //         return true
    //         if (_status.auto) {
    //             console.log()
    //             return;
    //         }
    //     },
    //     async content(event, trigger, player) {
    //         debugger;
    //     },
    //     mod: {
    //         cardEnabled(card, player) {
    //             return card.name != 'tiesuo';
    //         },
    //     },
    //     ai: {
    //         order: 10,
    //         // expose:0.6,
    //         // threaten:1.5,
    //         result: { player: 1 },
    //     },
    // },
    // lit_show: {
    //     forced: true,
    //     trigger: {
    //         player: ["showCharacterAfter"],
    //     },
    //     filter: (event, player) => {
    //         event;
    //         debugger;
    //         return false;
    //     },
    //     async content(event, trigger, player) {

    //     },
    // },
};
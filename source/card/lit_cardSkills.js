import { lib, game, ui, get, ai, _status } from '../../../../noname.js';

export const card = {
    lit_diaoka: {
        fullskin: true,
        image: 'ext:叁岛世界/image/card/lit_diaoka.png',
        type: "basic",
        toself: true,
        vanish: true,
        recastable: true,
        charlotte: true,
        enable: true,
        complexTarget: true,
        selectTarget: -1,
        filterTarget: (card, player, target) => {
            let group = ['nine', 'three'];
            if (_status.forceKey) group.push('key');
            return target === player && (group.includes(target.group) || game.getExtensionConfig('叁岛世界', 'lit_dkwsl'));
        },
        modTarget: function (card, player, target) {
            let group = ['nine', 'three'];
            if (_status.forceKey) group.push('key');
            return group.includes(target.group) || game.getExtensionConfig('叁岛世界', 'lit_dkwsl');
        },
        async content(event, trigger, player) {
            let target = event.target;
            let dkh = [], dkd = [], dky = [], dk = lib.lit.dkSkills.concat('lit_xiaohongtanver');
            for (let i of dk) {
                if (!lib.lit.dkCheck(i)) dky.push(i);
                if (game.hasPlayer2(current => { return current.awakenedSkills.includes(i) })) dky.push(i);
            }
            for (let i of dk) {//dkh：玩家已有的吊卡 dkd：未分配的吊卡 dky：被移除的吊卡 dk：所有的吊卡
                if (!game.hasPlayer(current => { return current.hasSkill(i) }) &&
                    !dky.includes(i)) dkd.push(i);
                if (target.hasSkill(i)) dkh.push(i);
            }
            if (dkd.length < 1) {
                await target.popup('吊卡没了');
                await target.draw();
            } else {
                if (dkh.length > 0) await target.removeSkills(dkh);
                let new_skills = dkd.randomGets(1);
                await target.addSkill('lit_diaokajineng');
                await target.changeSkills(new_skills, [], false);
                let special_pop = get.translation(new_skills[0]);
                if (special_pop.length < 7) await target.popup(new_skills[0]);
                else await target.popup(special_pop.slice(0, 3) + "<br>" + special_pop.slice(3));
            }
        },
        ai: {
            basic: {
                value(card, player) {
                    let group = ['nine', 'three'];
                    if (_status.forceKey) group.push('key');
                    if (!player.hasSkill('lit_diaokajineng') && (group.includes(player.group) || game.getExtensionConfig('叁岛世界', 'lit_dkwsl'))) return 10;
                    return 0.1;
                },
                useful: 1,
                order: 10,
            },
            result: {
                target(player, target) {
                    let group = ['nine', 'three'];
                    if (_status.forceKey) group.push('key');
                    if (!player.hasSkill('lit_diaokajineng') && (group.includes(player.group) || game.getExtensionConfig('叁岛世界', 'lit_dkwsl'))) return 1;
                    return 0;
                }
            },
        },
    },
    lit_qianfanpai: {
        fullskin: true,
        image: 'ext:叁岛世界/image/card/lit_qianfanpai.png',
        type: "delay",
        range: { global: 1 },
        filterTarget: (card, player, target) => {
            return lib.filter.judge(card, player, target) && player != target;
        },
        judge: (card) => {
            if (get.suit(card) === "diamond") return 1;
            return -2;
        },
        judge2: (result) => {
            if (result.bool === false) return true;
            return false;
        },
        async effect(event, trigger, player, result) {
            if (result.bool != false) return;
            if (_status.currentPhase === player) {
                const evt = event.getParent("phase", true);
                if (evt && evt.player == player) {
                    game.log(player, "被遣返离校，本回合直接结束");
                    evt.num = evt.phaseList.length;
                    evt.goto(11);
                }
                const evtx = event.getParent("phaseJudge", true);
                if (evtx) {
                    evtx.skipped = true;
                }
            } else {
                player.addSkill("lit_qianfanpai_skill");
            }
        },
        ai: {
            basic: {
                order: 1,
                useful: 1,
                value: 9,
            },
            result: {
                ignoreStatus: true,
                target(player, target) {
                    let bingliangres = -2.7 / Math.sqrt(target.countCards("h") + 1),
                        discardres = target.needsToDiscard();
                    let res = bingliangres + discardres;
                    if (target === _status.currentPhase && target.skipList.includes("phaseUse")) {
                        let evt = _status.event.getParent("phase");
                        if (evt && evt.phaseList.indexOf("phaseJudge") <= evt.num) return res;
                    }
                    let num = target.needsToDiscard(3),
                        cf = Math.pow(get.threaten(target, player), 2);
                    if (!num) return -0.01 * cf + res;
                    if (target.hp > 2) num--;
                    let dist = Math.sqrt(1 + get.distance(player, target, "absolute"));
                    if (dist < 1) dist = 1;
                    if (target.isTurnedOver()) dist++;
                    return (Math.min(-0.1, -num) * cf) / dist + res;
                },
            },
            tag: {
                skip: "phaseJudge",
                skip: "phaseDraw",
                skip: "phaseUse",
                skip: "phaseDiscard",
                skip: "phaseJieshu",
            },
        },
    },
};

export const skill = {
    lit_qianfanpai_skill: {
        nopop: true,
        direct: true,
        firstDo: true,
        charlotte: true,
        trigger: { player: "phaseBefore" },
        async content(event, trigger, player) {
            // cancelled事件容易找不到reason，故lit_qixu_mark关于遣返牌的处理被移至了此处
            let delayEffects = player.storage.lit_qixu_mark;
            if (delayEffects && delayEffects.includes("lit_qianfanpai")) {
                delayEffects = delayEffects.filter(value => value != "lit_qianfanpai");
                player.popup("（期许）<br>跳过回合");
                player.setStorage("lit_qixu_mark", delayEffects, true);
                if (delayEffects.length === 0) player.removeSkill("lit_qixu_mark");
            }
            trigger.cancel();
            game.log(player, "被遣返离校，本回合直接结束");
            player.removeSkill("lit_qianfanpai_skill");
        },
    },
    lit_diaokajineng: {
        nopop: true,
        unique: true,
        charlotte: true,
        direct: true,
        forceDie: true,
        firstDo: true,
        mark: true,
        marktext: "吊",
        intro: {
            name: "吊卡技能",
            content(storage, player) {
                let str = "已获得：";
                for (let i in storage) {
                    str += '<li>' + get.translation(storage[i]);
                }
                return str;
            },
        },
        trigger: {
            player: ["changeSkillsAfter", "dieAfter"],
        },
        filter: (event) => {
            if (event.name === 'die' || event.addSkill && event.addSkill.length) return true;
            var player = event.player;
            let list = player.storage.lit_diaokajineng;
            return !list.some(e => player.hasSkill(e));
        },
        async content(event, trigger, player) {
            var player = trigger.player;
            let list = player.storage.lit_diaokajineng;
            if (trigger.name != 'die' && trigger.addSkill.length) {
                for (let i in trigger.addSkill) {
                    try { var dk = get.info(trigger.addSkill[i]).lit_dk } catch { var dk = false }
                    if (dk && !list.includes(trigger.addSkill[i])) {
                        player.storage.lit_diaokajineng.push(trigger.addSkill[i]);
                    }
                }
                player.markSkill("lit_diaokajineng");
            }
            else player.removeSkill('lit_diaokajineng');
        },
        init: (player) => {
            player.setStorage("lit_diaokajineng", []);
        },
        onremove: (player) => {
            let list = player.storage.lit_diaokajineng;
            if (list.some(e => player.hasSkill(e))) player.removeSkills(list);
        },
    },
    lit_zigaodebeixin: {
        forced: true,
        unique: true,
        lit_dk: true,
        charlotte: true,
        nobracket: true,
        trigger: {
            player: "useCard",
        },
        filter: (event) => {
            return get.type(event.card) === "trick";
        },
        async content(event, trigger, player) {
            trigger.nowuxie = true;
        },
        ai: {
            threaten: 1.1,
        },
        group: 'lit_zigaodebeixin_invalid',
        subSkill: {
            invalid: {
                forced: true,
                trigger: {
                    player: 'damageBegin3',
                },
                filter: (event) => {
                    return event.hasNature("linked");
                },
                async content(event, trigger, player) {
                    trigger.cancel();
                },
                ai: {
                    nofire: true,
                    nothunder: true,
                    effect: {
                        target(card) {
                            if (get.tag(card, "natureDamage")) return "zerotarget";
                        },
                    },
                },
                sub: true,
                sourceSkill: 'lit_zigaodebeixin',
            },
        },
    },
    lit_zenggedeshouzhou: {
        forced: true,
        firstDo: true,
        unique: true,
        lit_dk: true,
        charlotte: true,
        nobracket: true,
        trigger: {
            source: 'damageBegin1',
        },
        filter: (event) => {
            return event.hasNature("linked");
        },
        async content(event, trigger, player) {
            trigger.num++;
        },
        ai: {
            threaten: 1.5,
            damageBonus: true,
            skillTagFilter: (player, tag, arg) => {
                if (tag === "damageBonus") {
                    return arg && arg.card && get.tag(arg.card, "natureDamage");
                }
            },
        },
    },
    lit_qianlaoshidejialian: {
        unique: true,
        lit_dk: true,
        charlotte: true,
        nobracket: true,
        mod: {
            cardUsable: (card, player, num) => {
                return Infinity;
            },
        },
        ai: {
            threaten: 1.1,
        },
    },
    lit_pandejianpan: {
        unique: true,
        lit_dk: true,
        charlotte: true,
        nobracket: true,
        enable: "phaseUse",
        usable: 1,
        filter: (event, player) => {
            return game.hasPlayer(current => current.countCards('h'));
        },
        selectTarget: 2,
        complexTarget: true,
        filterTarget: true,
        multitarget: true,
        multiline: true,
        async content(event, trigger, player) {
            player.addTempSkill("lit_pandejianpan_used");
            event.forceDie = true;
            await event.targets[0].swapHandcards(event.targets[1]).set("forceDie", true);
        },
        ai: {
            threaten: 3.5,
            pretao: true,
            nokeep: true,
            order: 1,
            expose: 0.3,
            skillTagFilter: (player, tag, arg) => {
                if (["pretao", "nokeep"].includes(tag)) {
                    if (!player.hasSkill("lit_pandejianpan_used")) return true;
                }
            },
            result: {
                target: (player, target) => {
                    if (target.hasSkillTag('noh')) return 1;
                    if (!ui.selected.targets.length) return -Math.sqrt(target.countCards("h"));
                    let h1 = ui.selected.targets[0].getCards("h"),
                        h2 = target.getCards("h");
                    if (h2.length > h1.length) return 0;
                    let delval = get.value(h2, target) - get.value(h1, ui.selected.targets[0]);
                    if (delval >= 0) return 0;
                    return -delval * (h1.length - h2.length);
                },
            },
        },
        subSkill: {
            used: {
                charlotte: true,
                sub: true,
                sourceSkill: "pandejianpan",
            },
        },
    },
    lit_zhongyutongdebiji: {
        direct: true,
        locked: false,
        unique: true,
        lit_dk: true,
        charlotte: true,
        nobracket: true,
        trigger: {
            player: "discardAfter",
        },
        filter: (event, player) => {
            return game.hasPlayer(current => current !== player && current.countCards('hej') > 0);
        },
        async content(event, trigger, player) {
            const { result } = await player.chooseTarget(get.prompt('lit_zhongyutongdebiji'), '选择1人观看并弃置其区域内的1张牌', (event, player, target) => {
                return target !== player && target.countCards('hej') > 0;
            }).set("ai", target => {
                return get.effect(target, { name: 'guohe' }, player, player);
            });
            if (result.bool) {
                let target = result.targets[0];
                await player.logSkill('lit_zhongyutongdebiji', target);
                player.line(target, 'red');
                await player.discardPlayerCard(target, 'hej', "visible");
            }
        },
        ai: {
            threaten(target) {
                if (target.countCards("he") === 0) return 1.5;
                return 1;
            },
            nodiscard: true,
            nolose: true,
        },
    },
    lit_liyangdeziyou: {
        unique: true,
        lit_dk: true,
        charlotte: true,
        nobracket: true,
        mod: {
            maxHandcard: (player, num) => {
                return Infinity;
            },
        },
    },
    lit_zhangxuandemp5: {
        unique: true,
        lit_dk: true,
        charlotte: true,
        nobracket: true,
        frequent: (trigger, player) => {
            return !trigger.target.isFriendOf(player);
        },
        trigger: {
            player: "shaBefore",
        },
        filter: (event, player) => {
            return player.hasCard('sha', 'hs');
        },
        async content(event, trigger, player) {
            await player.showCards(player.getCards('hs', card => get.name(card) === 'sha'), get.translation(player) + "扣下了张轩MP5的扳机");
            trigger.directHit = true;
        },
        ai: {
            shaRelated: true,
            threaten: 1.8,
        },
    },
    lit_yibandelajitong: {
        unique: true,
        lit_dk: true,
        charlotte: true,
        nobracket: true,
        frequent: true,
        mark: true,
        marktext: "桶",
        intro: {
            name: "垃圾桶",
            content: "还能装#次垃圾",
        },
        init: function (player) {
            player.setStorage("lit_yibandelajitong", 6, true);
        },
        trigger: {
            global: ["loseAfter", "addJudgeAfter", "loseAsyncAfter"],
        },
        filter: (event, player) => {
            if (!event.player) return false;
            let evt = event.getl(event.player);
            if (evt && evt.js) {
                return evt.js.length;
            }
        },
        async content(event, trigger, player) {
            await player.gain(trigger.getl(trigger.player).js, "gain2");
            let now = player.storage.lit_yibandelajitong - 1;
            if (now <= 0) {
                await player.removeSkills('lit_yibandelajitong');
            } else player.setStorage("lit_yibandelajitong", now, true);
        },
        ai: {
            threaten: 3,
        },
        global: "lit_yibandelajitong_ai",
        subSkill: {
            ai: {
                charlotte: true,
                ai: {
                    effect: {
                        player(card, player, target) {
                            if (card.name === "shandian") {
                                if (!lib.lit.effLock['lit_yibandelajitong_ai']) {
                                    lib.lit.effLock['lit_yibandelajitong_ai'] = true;
                                    let eff = get.damageEffect(player, player, player, "thunder");
                                    delete lib.lit.effLock['lit_yibandelajitong_ai'];
                                    return [0, eff];
                                }
                            }
                        },
                    },
                },
                sub: true,
                sourceSkill: 'lit_yibandelajitong',
            },
        },
    },
    lit_xiaohongtanver: {
        unique: true,
        lit_dk: true,
        charlotte: true,
        nobracket: true,
        enable: 'phaseUse',
        filter: (event, player) => {
            return game.hasPlayer(current => lib.skill.lit_xiaohongtanver.filterTarget(null, player, current));
        },
        filterTarget: (card, player, target) => {
            return target.hasSkill('lit_diaokajineng');
        },
        async content(event, trigger, player) {
            // 记录target当前拥有的吊卡技能
            const target = event.target;
            const targetSkills = target.storage.lit_diaokajineng || [];

            // 移除吊卡技能
            if (targetSkills.length) await target.removeSkills(targetSkills);
            await player.removeSkills('lit_xiaohongtanver');

            const removedSkills = [];   // 不可用的吊卡技能
            const availableSkills = []; // 可用的吊卡技能
            // 收集不可用技能removedSkills
            for (const skill of lib.lit.dkSkills) {
                const isSystemRemoved = !lib.lit.dkCheck(skill);
                const isAwakened = game.hasPlayer2(current => current.awakenedSkills.includes(skill));
                if (isSystemRemoved || isAwakened) {
                    removedSkills.push(skill);
                }
            }
            // 收集可用技能availableSkills
            for (const skill of lib.lit.dkSkills) {
                // 检查技能是否空闲可用
                const isOccupied = game.hasPlayer(current => current.hasSkill(skill));
                const isRemoved = removedSkills.includes(skill);
                if (!isOccupied && !isRemoved) {
                    availableSkills.push(skill);
                }
            }

            const isSamePlayer = player === target;
            const validTargetSkills = targetSkills.filter(skill => !removedSkills.includes(skill));
            let selectedSkill = null;

            if (!isSamePlayer && validTargetSkills.length > 0) {
                // 获取target的吊卡技能
                selectedSkill = validTargetSkills.randomGet();
            } else {
                // 从公共池选择，排除 lit_xiaohongtanver
                const validSkills = availableSkills.filter(s => s !== 'lit_xiaohongtanver');
                if (validSkills.length > 0) {
                    selectedSkill = validSkills.randomGet();
                }
            }

            // 应用选择结果
            if (selectedSkill) {
                // 添加标记和新技能
                await player.addSkill('lit_diaokajineng');
                await player.changeSkills([selectedSkill], [], false);

                // 显示技能名称
                const skillName = get.translation(selectedSkill);
                const popupText = skillName.length < 7
                    ? selectedSkill
                    : `${skillName.slice(0, 3)}<br>${skillName.slice(3)}`;
                await player.popup(popupText);
            } else {
                // 无可用技能，给予摸牌补偿
                await player.popup('吊卡没了');
                await player.draw();
            }
        },
        ai: {
            order: 10,
            result: {
                player: 10,
                target: (player, target) => {
                    if (target !== player) return -10;
                    return 0;
                },
            },
        },
    },
    lit_qbzhimao: {
        unique: true,
        lit_dk: true,
        charlotte: true,
        nobracket: true,
        forced: true,
        priority: 33,
        trigger: {
            player: "damageBegin4",
        },
        filter: (event, player) => {
            return event.num > 1;
        },
        async content(event, trigger, player) {
            await player.draw(trigger.num - 1);
            trigger.num = 1;
        },
        ai: {
            filterDamage: true,
            skillTagFilter: (player, tag, arg) => {
                if (arg && arg.player) {
                    if (arg.player.hasSkillTag("jueqing", false, player)) return false;
                }
            },
        },
    },
    lit_jiegededifengfenger: {
        unique: true,
        lit_dk: true,
        charlotte: true,
        nobracket: true,
        direct: true,
        trigger: {
            global: "dieAfter",
        },
        filter: (event, player) => {
            let list = [],
                target = event.player;
            if (lib.character[target.name]) list.addArray(lib.character[target.name][3]);
            if (lib.character[target.name1]) list.addArray(lib.character[target.name1][3]);
            if (lib.character[target.name2]) list.addArray(lib.character[target.name2][3]);
            list = list.filter(i => !player.hasSkill(i));
            return list.length > 0;
        },
        async content(event, trigger, player) {
            let list = [];
            let listm = [];
            let listv = [];
            if (trigger.player.name1 != undefined) listm = lib.character[trigger.player.name1][3];
            else listm = lib.character[trigger.player.name][3];
            if (trigger.player.name2 != undefined) listv = lib.character[trigger.player.name2][3];
            listm = listm.concat(listv);
            for (let i = 0; i < listm.length; i++) {
                if (get.info(listm[i])) list.add(listm[i]);
            }
            event.skills = list;
            let str = '';
            for (let i of list) {
                str += lib.translate[i] + "：<ul>";
                str += lib.translate[i + "_info"] + "</ul>"
            }
            const { control } = await player.chooseControl(list/* .concat("cancel2"),true */)
                .set("prompt", "获得" + get.translation(trigger.player) + "角色牌上的一个初始技能")
                .set("prompt2", str)
                .set("ai", (event, player) => {
                    let ai_list = list.filter(e => {
                        const info = get.info(e);
                        if (info && info.ai) {
                            if (info.ai.combo) return player.hasSkill(info.ai.combo) || player.hasSkill(info.ai.combo + "V2");
                            return !info.ai.neg && !info.ai.halfneg;
                        } return true;
                    });
                    if (game.countPlayer() < 5 && ai_list.some(e => e.startsWith("lit_shengji"))) {
                        ai_list = ai_list.filter(e => e.startsWith("lit_shengji"));
                    }
                    return ai_list.randomGets(1)[0];
                }).forResult();
            game.log(player, "选择了", trigger.player, "的技能", "#g【" + get.translation(control) + "】");
            await player.popup("地缝：<br>" + get.translation(control));
            player.addSkill(control);
            game.broadcastAll((player, control) => {
                lib.character[player.name][3].addArray([control]);
                game.expandSkills([control]);
                // let info = lib.skill[control];
                // if (info){
                // 	if (!info.audioname2) info.audioname2 = {};
                // 	info.audioname2[player.name] = "shiki_omusubi";
                // }
            }, player, control);
        },
    },
    lit_caichendekuangre: {
        unique: true,
        lit_dk: true,
        charlotte: true,
        nobracket: true,
        forced: true,
        trigger: {
            global: 'dieAfter',
        },
        filter: (event, player) => {
            return player !== event.player;
        },
        async content(event, trigger, player) {
            if (!player.hasSkill("lit_caichendekuangre_mark")) {
                player.addSkill("lit_caichendekuangre_mark");
            }
            let count = player.storage.lit_caichendekuangre_mark;
            player.setStorage("lit_caichendekuangre_mark", ++count, true);
            player.insertPhase(event.skill);
        },
        subSkill: {
            mark: {
                direct: true,
                firstDo: true,
                mark: true,
                marktext: "热",
                intro: {
                    name: "好热好热！",
                    content: "将狂热地进行#次额外回合",
                },
                init: (player) => {
                    player.setStorage("lit_caichendekuangre_mark", 0);
                },
                trigger: { player: "phaseBefore" },
                async content(event, trigger, player) {
                    let count = player.storage.lit_caichendekuangre_mark;
                    player.setStorage("lit_caichendekuangre_mark", --count, true);
                    if (count <= 0) player.removeSkill("lit_caichendekuangre_mark");
                },
                sub: true,
                sourceSkill: "lit_caichendekuangre",
            },
        },
    },
    lit_rongshaodejian: {
        unique: true,
        lit_dk: true,
        charlotte: true,
        nobracket: true,
        mod: {
            attackRange(player, num) {
                return Infinity;
            },
        },
        trigger: {
            global: 'phaseJieshu',
        },
        filter: (event, player) => {
            return player.canUse({ name: "sha", isCard: true }, event.player, false);
        },
        check(event, player) {
            return get.effect(event.player, { name: "sha", isCard: true }, player, player) > 0;
        },
        prompt(event, player) {
            return `是否对 ${get.translation(event.player)} 发动「荣少的剑」？`;
        },
        logTarget(trigger, player) {
            return trigger.player;
        },
        async content(event, trigger, player) {
            await player.useCard({ name: "sha", isCard: true }, trigger.player);
        },
    },
};
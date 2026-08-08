import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';

export const sort = 'ybs';
export const title = `拆牌·反伤·${styleText('o', "较难")}`;
export const intro = `与${B("氹")}诡辩之时，你会怀念仁王盾和藤甲的。什么？你卖血啊~那没事了，${B("氹")}最怕的就是不怕自己会反伤自己的人`
    + `<li>主公：留防御牌方便${get.poptip("lit_guibian")}。${get.poptip("lit_shuxin")}改为主动技后，要小心发动技能对使用者的真实收益`
    + "<li>忠臣：诡辩反贼的伤害牌，吸引火力以便进行消耗战"
    + "<li>反贼：诡辩酒、闪、无懈可击，或满血诡辩桃100%成功。可以显著干扰对面关键人物的牌型"
    + "<li>内奸：有竖心在很容易苟到最后，苟吧";
export const character = {
    'lit_zhangchi张驰': {
        sex: "male",
        group: "three",
        hp: 3,
        skills: ["lit_shengjizc", "lit_guibian", "lit_shuxin"],
    },
};

export const characterReplace = { 'lit_zhangchi': ['lit_zhangchi张驰', 'lit_zhangchi9张驰'] };

export const skill = {
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
            lib.lit.aiGuard.record(player, 'lit_guibian');
            const target = event.targets[0];
            const cards = target.getCards("h");
            if (cards.length === 0) return;
            const choosableCards = cards.filter(card => true);

            for (let card of cards) {
                if (card.name !== get.name(card, target) || card.nature !== get.nature(card, target)) {
                    ui.create.cardTempName({ name: get.name(card, target), nature: get.nature(card, target) }, card);
                }
            }
            let dialog = ui.create.dialog("诡辩", cards, true);
            _status.dieClose.push(dialog);
            dialog.videoId = lib.status.videoId++;
            event.dialogID = dialog.videoId;
            game.addVideo("cardDialog", null, [`${get.translation(target)}即将陷入与${get.translation(player)}的诡辩！`, get.cardsInfo(cards), dialog.videoId]);
            game.broadcast(
                function (cards, id) {
                    let dialog = ui.create.dialog("诡辩", cards, true);
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
                    dialog = ui.dialogs[i];
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
                let playerTrans = get.translation(player),
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
            order: (item, player) => lib.lit.aiGuard.blocked(player, 'lit_guibian') ? -1 : 8,
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
};

export const translate = {
    'lit_zhangchi张驰': "张驰",
    'lit_guibian': "诡辩",
    'lit_guibian_info': `出牌阶段限一次，你可以令一名其他角色展示所有手牌，你选择其中一张令其对你使用（无视距离），若其不使用或无法使用，则其交给你所有与之${get.poptip("lit_sameCardName")}的牌`,
    'lit_shuxin': "竖心",
    'lit_shuxin_info': `锁定技，当你成为其他角色使用的${get.poptip("lit_basicTrickCard")}的目标后，你令使用者对其自己使用此牌`,
    'lit_shuxinV2': "竖心V2",
    'lit_shuxinV2_info': `当你成为其他角色使用的${get.poptip("lit_basicTrickCard")}目标后，你可以令使用者对其自己使用此牌`,
    'lit_shengjizc': "升级·张驰",
    'lit_shengjizc_info': `${get.poptip('lit_shuxinV2')} 获得并修改〖竖心〗：不再为锁定技`,
};

export const simpleTranslate = {
    'lit_guibian_info': `出牌限1次，令1人展示所有牌你选择其中1张令其对你使用（无视距离），若其不使用或无法使用则交付所有${get.poptip("lit_sameCardName")}牌`,
    'lit_shuxin_info': `锁；成为他人${get.poptip("lit_basicTrickCard")}的目标后令使用者对他自己使用此牌`,
    'lit_shuxinV2_info': `V2 成为他人${get.poptip("lit_basicTrickCard")}的目标后可令使用者对他自己使用此牌`,
    'lit_shengjizc_info': `${get.poptip('lit_shuxinV2')} 获得并修改“竖心”：不再为锁定技`,
};

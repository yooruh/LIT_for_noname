import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';

export const sort = 'jbs';

export const character = {
    'lit_zhangshengjie9张盛杰': {
        sex: "male",
        group: "nine",
        hp: 1,
        maxHp: 2,
        skills: ["lit_lizhi", "lit_shenjie", "lit_zhewan"],
        groupInGuozhan: "three",
    },
};

export const skill = {
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
};

export const translate = {
    'lit_zhangshengjie9张盛杰': "9张盛杰",
    'lit_zhangshengjie9张盛杰_prefix': "9",
    'lit_lizhi': "励志",
    'lit_lizhi_info': `锁定技，摸牌阶段，你多摸${X}张牌（${X}为你已失去的体力值）`,
    'lit_shenjie': "肾竭",
    'lit_shenjie_info': `锁定技，当你${styleText('g', '进入/脱离')}濒死状态时，你${styleText('g', '摸2/1')}张牌；你的手牌上限基数为你的体力上限+2`,
    'lit_zhewan': "折腕",
    'lit_zhewan_info': `你可以将${styleText('g', '至多两张同花色')}的牌按以下规则使用或打出：♠️️【无懈可击】，♥️️【桃】，♣️️【闪】，♦️️火【杀】；<br>` +
        `若你以此法使用了两张♥️♦️️牌，则此牌恢复的体力值或造成的伤害值+1；若你以此法使用了两张♠️♣️牌，则你弃置当前回合角色一张牌`,
};

export const simpleTranslate = {
    'lit_lizhi_info': `锁；摸牌阶段摸牌数+${X}（${X}为已失去的体力）`,
    'lit_shenjie_info': `锁；${styleText('g', '进入/脱离')}濒死后${styleText('g', '摸2/1')}牌；手牌上限为(体力上限+2)`,
    'lit_zhewan_info': `可将${styleText('g', '同花色1~2张')}：♠️当无懈，♥️当桃，♣️当闪，♦️当火杀使用或打出；用2张♥️/♦️则恢复/伤害值+1，用2张♠️/♣️则弃置当前回合角色1牌`,
};

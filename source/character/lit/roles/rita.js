import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';

export const sort = 'ybs';
export const title = `装备·补牌·爆发·${styleText('g', "易")}`;
export const intro = `${B("Rita")}是装备驱动的辅助型主公。${get.poptip("lit_nuoruo")}在中期能依靠其他角色顶装备来获取较多装备牌，供给${get.poptip("lit_hengshuiti")}`
    + `连续冰杀输出。作为主公技或升级技的${get.poptip("lit_dafang")}则是能给高输出队友补牌，或是以多手牌队友为跳板给自己回血，兼具团队续航与个人能力。`
    + "<li>主公：必要时让忠臣拆装备配合补牌，后期自身装备≈1张杀+半个桃，不急着拿人头可以不着急装备"
    + "<li>忠臣、反贼：前期爆发能力较弱，可以老实当一个控场角色，中后期再收人头并辅助队友补牌"
    + "<li>内奸：前期控场，在最后单挑时的「懦弱」能恶心主公的装备体系，控制得当可以达成爆发+摸牌循环的效果";
export const character = {
    'lit_ritaRita': {
        sex: "female",
        group: "three",
        hp: 3,
        skills: ["lit_shengjirita", "lit_dafang", "lit_nuoruo", "lit_hengshuiti"],
        isZhugong: true,
    },
};

export const perfectPair = ['lit_huxinyu胡馨予', 'lit_yangxiangling杨湘铃'];

export const skill = {
    lit_dafang: {
        zhuSkill: true,
        preHidden: true,
        trigger: {
            player: "loseAfter",
            global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
        },
        filter: (event, player) => {
            return game.hasPlayer(current => {
                return lib.lit.isSameGroup(current, 'three');
            })
        },
        getIndex(event, player) {
            const evt = event.getl(player);
            if (evt && evt.player === player && evt.es) return evt.es.length;
            return false;
        },
        async cost(event, trigger, player) {
            let group = lib.lit.isGuozhanKeyEnabled() ? "叁/键" : "叁";
            const next = player
                .chooseTarget(`大方：选择1名"${group}"势力角色，令其将手牌补至其体力上限（至多补至9），若其手牌数已达体力上限，你恢复1点体力`, "未选择目标直接点确定视为取消发动", [0, 1], true, (card, player, target) => {
                    return lib.lit.isSameGroup(target, 'three');
                }).set("ai", target => {
                    let maxDraw = Math.min(target.maxHp, 9) - target.countCards("h");
                    let att = get.attitude(player, target);
                    if (maxDraw > 0) {
                        return maxDraw * att / 5 + (player.hp < player.maxHp ? 1 : 0);
                    } else if (maxDraw <= 0) {
                        if (player.hp < player.maxHp && att > 0) return 3 + att / 10;
                        return att / 10;
                    }
                    return -1;
                });
            next.set("targetprompt2",
                next.targetprompt2.concat([
                    target => {
                        if (lib.lit.isSameGroup(target, 'three')) {
                            let del = Math.min(target.maxHp, 9) - target.countCards("h");
                            if (del > 0) return `摸${del}张牌`;
                            return "恢复1点体力";
                        }
                    },
                ]));
            const result = await next.forResult();
            event.result = {
                bool: result.targets?.length > 0,
                targets: result.targets,
            };
        },
        async content(event, trigger, player) {
            const target = event.targets[0];
            if (!target) return;
            let maxDraw = Math.min(target.maxHp, 9) - target.countCards("h");
            if (maxDraw > 0) {
                await player.logSkill("lit_dafang", target);
                await target.draw(maxDraw);
            } else {
                await player.logSkill("lit_dafang", target);
                await player.recover();
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
    lit_nuoruoV2: {
        inherit: "lit_nuoruo",
        init: (player) => {
            if (player.hasSkill('lit_nuoruo')) player.removeSkill('lit_nuoruo');
        },
        filter: (event, player) => {
            let evt = event.getParent(), evt2 = evt.getParent();
            if (
                event.player === player ||
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
    },
    lit_hengshuiti: {
        nobracket: true,
        silent: true,
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
};

export const translate = {
    'lit_ritaRita': "Rita",
    'lit_dafang': "大方",
    'lit_dafang_info': "主公技，你装备区每失去1张牌后，你可以令一名“叁”势力角色将手牌补至其体力上限（至多补至9），如果其手牌数已经达到体力上限，你恢复1点体力。",
    'lit_nuoruo': "懦弱",
    'lit_nuoruo_info': "其他角色的出牌阶段，当装备牌置入弃牌堆时，你可以获得之",
    'lit_nuoruoV2': "懦弱V2",
    'lit_nuoruoV2_info': "其他角色的装备牌置入弃牌堆时，你可以获得之",
    'lit_hengshuiti': "衡水体",
    'lit_hengshuiti_info': "锁定技，当你使用装备牌后，你可以视为对一名角色使用冰【杀】",
    'lit_hengshuitiV2': "衡水体V2",
    'lit_hengshuitiV2_info': "锁定技，当你使用装备牌后，恢复1点体力，然后你可以视为对一名角色使用冰【杀】",
    'lit_shengjirita': "升级·Rita",
    'lit_shengjirita_info': `${get.poptip('lit_nuoruoV2')} 获得并修改〖懦弱〗：去掉出牌阶段条件`,
};

export const simpleTranslate = {
    'lit_dafang_info': "主；装备区每失去1张牌后，可令一“叁”势力角色将手牌补至其体力上限（至多补至9），若其手牌数已达上限，你+1血",
    'lit_nuoruo_info': "他人出牌阶段，你可获得其置入弃牌堆的装备牌",
    'lit_nuoruoV2_info': "你可获得他人置入弃牌堆的装备牌",
    'lit_hengshuiti_info': "锁；使用装备牌后可视为对1人使用冰杀",
    'lit_hengshuitiV2_info': "锁；使用装备牌后+1血，可视为对1人使用冰杀",
    'lit_shengjirita_info': `${get.poptip('lit_nuoruoV2')} 获得并修改“懦弱”：去掉出牌阶段条件`,
};

export const dynamicTranslate = {
    // lit_shengjirita(player) {
    //     let group = lib.lit.isGuozhanKeyEnabled() ? '叁/键' : '叁';
    //     if (player.hasSkill('lit_dafang')) return `获得${get.poptip('lit_hengshuiti')}：锁；使用装备牌后可视为对1人使用冰杀`;
    //     return `获得${get.poptip('lit_dafang')}：主；装备区失去牌后，可令1“${group}”势力角色将手牌补至其体力上限（至多补至9）`;
    // },
    lit_dafang(player) {
        let group = lib.lit.isGuozhanKeyEnabled() ? '叁/键' : '叁';
        return `主；装备区每失去1张牌后，可令一“${group}”势力角色将手牌补至其体力上限（至多补至9）`;
    },
};

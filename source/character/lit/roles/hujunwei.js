import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';

export const sort = 'ybs';
export const title = `改判·爆发·强杀·${styleText('b', "较易")}`;
export const intro = `判定控制与卖血结合的强命高伤害角色。${B("胡峻玮")}的${get.poptip("lit_wutong")}可拿体力或手牌换护甲来强制修改场上判定结果，配合${get.poptip("lit_biaoxian")}；`
    + `能做到刀刀暴击命中。此外的改判还能为团队解除延时锦囊威胁或强化自身输出，是兼具辅助与爆发的核心角色。`
    + "<li>主公：要留点血来作为手牌上限，不是收人头的时候不用那么激进地进攻，可惜回血和过牌不够，比较吃忠臣选将"
    + "<li>忠臣、反贼：只要自己不是1血就能打爆发，刀刀2伤害不知道有多恐怖"
    + "<li>内奸：前期可以玩成辅助，到必要的时候改判控场，血留到主内单挑的时候用";

export const character = {
    'lit_hujunwei胡峻玮': {
        sex: "male",
        group: "three",
        hp: 3,
        skills: ["lit_shengjihjw", "lit_biaoxian", "lit_wutong"],
    },
};

export const skill = {
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
            const result = await player.judge(card => {
                if (get.suit(card) === "diamond") return 3;
                return -0.5;
            }).set("judge2", result => result.bool)
                .set("forceDie", true).forResult();
            if (result.bool) {
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
        preHidden: true,
        trigger: {
            global: "judge",
        },
        async cost(event, trigger, player) {
            const list = lib.suit.slice(0);
            const str = `${get.translation(trigger.player)} 的 ${trigger.judgestr || ""} 判定为 ${get.translation(trigger.player.judging[0])} <li>是否失去1点体力并获得1点护甲，修改其花色？`;
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
                    if (delval / 2 <= 3 - player.hp) return 'cancel2';
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
            await player.changeHujia(1);
            player.addExpose(0.25);
            player.popup(get.translation(control + '2') + get.translation(control));
            game.log(player, "将判定结果强制改为了「", `#y${get.translation(control + '2')}`, "」");
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
                .set("prompt2", str + `<li>是否失去1点体力 ${player.countCards('h') > 0 ? "或弃置全部手牌" : ""} 从而获得1点护甲并修改其花色？`)
                .set("ai", () => {
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
                    const hujia = player.hujia || 0;
                    const canSave = player.canSave(player);
                    const cards = player.getCards("h");

                    // 护甲收益：无护甲时价值约2.5分，有护甲时递减
                    const hujiaValue = Math.max(1.5, 2.5 - hujia * 0.6);

                    // 计算手牌总价值
                    let handValue = 0;
                    for (const card of cards) {
                        handValue += Math.max(0, get.value(card, player, "raw"));
                    }

                    // 失去体力的净成本（扣除护甲收益）
                    // 回合内成本较低，回合外成本较高
                    const loseHpRawCost = isPhaseUsing ? Math.max(0, 4 - currentHp) * 1.5 : Math.max(0, 5 - currentHp) * 2;
                    const loseHpNetCost = Math.max(0, loseHpRawCost - hujiaValue);

                    // 弃牌的净成本（弃全部手牌，获得护甲部分补偿）
                    const discardNetCost = Math.max(0, handValue * 0.5 - hujiaValue * 0.3);

                    // 可行性：改判收益 > 净成本
                    const canLoseHp = delval > loseHpNetCost && (currentHp > 1 || isPhaseUsing && canSave);
                    const canDiscard = cards.length > 0 && delval > discardNetCost;

                    // 统一决策
                    if (canDiscard && canLoseHp) {
                        return discardNetCost > loseHpNetCost ? "弃置手牌" : "失去体力";
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
                .set("prompt2", str + "<li>请选择要修改的花色")
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
            await player.changeHujia(1);
            player.addExpose(0.25);
            player.popup(get.translation(control + '2') + get.translation(control));
            game.log(player, "将判定结果强制改为了「", `#y${get.translation(control + '2')}`, "」");
            if (!trigger.fixedResult) trigger.fixedResult = {};
            trigger.fixedResult.suit = control;
            trigger.fixedResult.color = get.color({ suit: control });
        },
    },
};

export const translate = {
    'lit_hujunwei胡峻玮': "胡峻玮",
    'lit_biaoxian': "表现",
    'lit_biaoxian_info': "当你使用【杀】指定目标后，你可以判定，若结果为♦️，则此【杀】基础伤害+1且不能被此目标响应",
    'lit_wutong': "梧桐",
    'lit_wutong_info': "场上判定生效前，你可以失去1点体力，获得1点护甲，并将此判定结果修改为任意花色（直接修改结果）",
    'lit_wutong_faq': "关于修改判定结果",
    'lit_wutong_faq_info': "直接修改结果，覆盖了判定牌的名字、花色、数字等属性，导致相关结果与判定牌上原有的数据无关。因此「针对判定牌」的修改来间接影响判定结果的技能无法改变判定结果，除非还有其他技能也对「判定结果」进行了直接修改<br>" +
        "如【鬼才】和【鬼道】都不能影响本技能发动后的判定结果，而【天妒】和【反馈】则不受影响",
    'lit_wutongV2': "梧桐V2",
    'lit_wutongV2_info': "场上判定生效前，你可以失去1点体力或弃置全部手牌，获得1点护甲，并将此判定结果固定为任意花色（与判定牌无关）",
    'lit_shengjihjw': "升级·胡峻玮",
    'lit_shengjihjw_info': `${get.poptip('lit_wutongV2')} 获得并修改〖梧桐〗条件：你有手牌时，还可以弃置全部手牌发动`,
};

export const simpleTranslate = {
    'lit_biaoxian_info': "用杀指定目标后可判定，为♦️则基础伤害+1且不可被其响应",
    'lit_wutong_info': "场上判定生效前可-1体力+1护甲，将判定结果修改为任意花色",
    'lit_wutongV2_info': "V2 场上判定生效前可-1体力或弃全部手牌，+1护甲并将判定结果修改为任意花色",
    'lit_shengjihjw_info': `${get.poptip('lit_wutongV2')} 获得并修改“梧桐”条件：还可弃置全部手牌触发`,
};

import { lib, game, ui, get, ai, _status, X, Y, Z, styleText, B } from '../shared.js';

export const sort = 'ybs';
export const title = `群伤·爆发·${styleText('b', "较易")}`;
export const intro = `锦囊特化的多目标多刀输出角色。${B("钱保灿")}一旦${get.poptip("lit_chushou")}就能跳过摸牌阶段直接声明使用普通锦囊，不可被无懈；再通过${get.poptip("lit_zhixun")}来控场或是追刀，升级后还能增加杀的目标数，配合${get.poptip("lit_male")}能做到跳过摸牌阶段，但比其他人的摸牌阶段能摸更多牌。`
    + "<li>主公、忠臣：第一回合建议留牌，看清身份后到次轮再爆发。队友如果能为牌多添目标，那爆发力度会几何倍数增长"
    + "<li>反贼：南蛮+万箭后可乱杀主公，一轮残是常有的事，主公的一轮生存率就是这么被拉低的"
    + "<li>内奸：留牌，进可南蛮万箭，退可五谷桃园，AOE在关键时候都可以用来控场";

export const character = {
    'lit_qianbaocan钱保灿': {
        sex: "male",
        group: "three",
        hp: 4,
        skills: ["lit_shengjiqbc", "lit_chushou", "lit_zhixun", "lit_male"],
    },
};

export const skill = {
    lit_chushou: {
        trigger: {
            player: "phaseBeforeStart",
        },
        locked: true,
        preHidden: true,
        async cost(event, trigger, player) {
            await player.skip('phaseDraw');
            let list = lib.inpile.filter(name => {
                return get.type(name) === "trick" && player.hasUseTarget({ name: name, isCard: true });
            });
            if (!list.length) {
                event.result = { bool: false };
                return;
            }
            const { bool, links } = await player.chooseButton(
                [get.translation(player) + '出手了！将锦囊牌一把抓住，顷刻炼化！', '只显示可使用的锦囊牌，不可被无懈', [list, "vcard"]],
                true
            ).set("ai", button => {
                return get.event().player.getUseValue({ name: button.link[2], isCard: true });
            }).forResult();

            if (!bool) return;
            event.result = {
                bool: true,
                cost_data: { name: links[0][2] },
            };
        },
        async content(event, trigger, player) {
            const name = event.cost_data.name;
            await player.chooseUseTarget({ name: name, isCard: true, storage: { lit_chushou: true } }, true);
        },
        ai: {
            threaten: 1.1,
            effect: {
                target(card, player, target) {
                    if (card.name === "bingliang") return 0;
                },
            },
        },
        group: 'lit_chushou_wuxie',
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
        mod: {
            selectTarget(card, player, range) {
                if (card.name === 'sha' && range[1] !== -1) range[1] += 1;
            },
        },
        group: 'lit_chushouV2_wuxie',
        subSkill: {
            wuxie: {
                inherit: "lit_chushou_wuxie",
                sourceSkill: "lit_chushouV2",
            },
        },
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
        forced: true,
        mark: true,
        intro: {
            name: "麻了",
            content: (storage, player) => {
                let damagedCard = player.getStorage("lit_male");
                let str = damagedCard ? `上次造成伤害的牌：${get.translation(damagedCard)}` : "尚未造成伤害";
                return str;
            },
        },
        getLastDamageCard(player) {
            let history = player.getAllHistory("sourceDamage", evt => evt.card);
            if (!history || !history.length) return null;
            return history[history.length - 1].card;
        },
        init: (player) => {
            let card = lib.skill.lit_male.getLastDamageCard(player);
            if (card) player.setStorage("lit_male", card, true);
        },
        onremove: (player) => {
            delete player.storage.lit_male;
            player.unmarkSkill("lit_male");
        },
        trigger: { source: "damageAfter" },
        filter: (event, player) => {
            let lastCard = lib.skill.lit_male.getLastDamageCard(player);
            return lastCard && event.card && lastCard === event.card;
        },
        async content(event, trigger, player) {
            await player.draw();
        },
        ai: {
            effect: {
                player(card, player, target) {
                    if (get.tag(card, "damage")) return [1, 0.3];
                },
            },
        },
        group: ["lit_male_mark"],
        subSkill: {
            mark: {
                charlotte: true,
                firstDo: true,
                direct: true,
                trigger: { source: "damageAfter" },
                filter: (event, player) => event.card,
                async content(event, trigger, player) {
                    player.setStorage("lit_male", trigger.card, true);
                    player.markSkill("lit_male");
                },
                sub: true,
                sourceSkill: "lit_male",
            },
        },
    },
};

export const translate = {
    'lit_qianbaocan钱保灿': "钱保灿",
    'lit_chushou': "出手",
    'lit_chushou_info': "锁定技，回合开始前，你跳过摸牌阶段，视为使用一张你声明的普通锦囊牌，此牌不可被【无懈可击】响应",
    'lit_chushouV2': "出手V2",
    'lit_chushouV2_info': "锁定技，你的【杀】目标数+1。回合开始前，你跳过摸牌阶段，你视为使用一张你声明的普通锦囊牌，此牌不可被【无懈可击】响应",
    'lit_zhixun': "质询",
    'lit_zhixun_info': "当牌的目标数大于1时，你可以取消其中一个目标，视为对一名角色再次使用此牌",
    'lit_male': "麻了",
    'lit_male_info': "锁定技，当你造成伤害后，若伤害牌与你上次造成伤害的牌为同一张牌，你摸一张牌。",
    'lit_male_tag': "同名",
    'lit_shengjiqbc': "升级·钱保灿",
    'lit_shengjiqbc_info': `${get.poptip('lit_chushouV2')} 获得并在〖出手〗中增加：你的【杀】目标数+1`,
};

export const simpleTranslate = {
    'lit_chushou_info': "锁；回合开始前跳过摸牌阶段，视为使用1张你声明的锦囊牌，不可无懈",
    'lit_chushouV2_info': "V2 锁；杀的目标数+1。回合开始前跳过摸牌阶段，视为使用1张你声明的锦囊牌，不可无懈",
    'lit_zhixun_info': "牌的目标不为1时可取消其中1个目标，视为对1人再次使用此牌",
    'lit_male_info': `造成伤害后，若伤害牌与上次造成伤害的牌为同一张，+1牌`,
    'lit_shengjiqbc_info': `${get.poptip('lit_chushouV2')} 获得并在“出手”中增加：杀的目标数+1`,
};

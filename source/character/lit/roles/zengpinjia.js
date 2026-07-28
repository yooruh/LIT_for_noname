import { lib, game, ui, get, ai, _status, X, Y, Z } from '../shared.js';

export const character = {
    'lit_zengpinjia曾品嘉': {
        sex: "male",
        group: "three",
        hp: 3,
        skills: ["lit_shengjizpj", "lit_kuaihuo", "lit_saohua"],
    },
};

export const skill = {
    // 曾品嘉
    lit_kuaihuo: {
        popup: false,
        trigger: {
            player: "useCardAfter",
        },
        filter: (event, player) => {
            if (event.targets.every(e => !e.isIn())) return false;
            return get.name(event.card) === "sha" && player.countCards('hes') && !player.hasSkill("lit_kuaihuo_count");
        },
        async cost(event, trigger, player) {
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

            const { bool, cards: [card], targets: [target] } = result;
            if (!bool) return;
            event.result = {
                bool: true,
                cost_data: {
                    card: card,
                    target: target,
                },
            };
        },
        async content(event, trigger, player) {
            const targets = trigger.targets;
            player.addTempSkill("lit_kuaihuo_count");

            const card = event.cost_data.card;
            await player.gain(get.cards()[0], "draw");
            await player.lose(card, ui.special);
            await game.cardsGotoPile(card, "insert");

            const target = event.cost_data.target;
            event.targets = [target].addArray(trigger.targets);

            await player.logSkill('lit_kuaihuo', target, { color: [255, 192, 203] });
            game.log(player, "将", card, "置于了牌堆顶");
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
            const hints = [];
            hints.push(isPi ? "###置于1人的判定区###" : "###或弃3张点数和=33造成3点雷伤###");
            if (player.hasSkill('lit_saohuaV2')) hints.push("<li>点数<7的牌计算时+7</li>");

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
};

export const translate = {
'lit_zengpinjia曾品嘉': "曾品嘉",
    'lit_kuaihuo': "快活",
    'lit_kuaihuo_info': "每回合限一次，当你使用【杀】后，你可以将一张牌与牌堆顶的牌置换，然后询问其他角色是否对该目标使用一张无实体牌的【杀】",
    'lit_saohua': "骚话",
    'lit_saohua_info': `你使用或打出的${get.poptip("lit_exDelayEquipCard")}可置于角色上；出牌阶段，你可以：<li>将两张点数和大于等于13的牌当【闪电】使用；</li><li>弃置三张点数和为33的牌，对一名角色造成3点雷属性伤害（此项每回合限一次）</li>`,
    'lit_guimi': "闺蜜",
    'lit_guimi_info': "锁定技，摸初始牌前，你选择一名“闺蜜”，其手牌上限+2，且每间隔1轮的轮次中每回合首次受到伤害后恢复1点体力；你进入濒死状态时，闺蜜可以将一张♥️♦️牌当【桃】使用（场上无你的闺蜜时重选）",
    'lit_yisui': "易碎",
    'lit_yisui_info': "锁定技，闺蜜在场时，你的手牌数恒为3；闺蜜满血时，你免疫伤害；闺蜜死亡时，你失去所有体力",
};

export const simpleTranslate = {
    'lit_kuaihuo_info': "每回合限1次，使用杀后可于牌堆顶置换1牌并询问他人是否也对其使用杀",
    'lit_saohua_info': `已用和打出${get.poptip("lit_exDelayEquipCard")}可置于角色上。出牌可：<li>将2张点数和≥13的牌当闪电</li><li>弃3张点数和=33的牌造成3点雷伤（此项每回合限1次）</li>`,
    'lit_guimi_info': "锁；摸初始牌前选一“闺蜜”，其手牌上限+2，每间隔1轮的轮次中每回合首次受伤后+1血；<br>濒死时闺蜜可用♥️♦️牌当桃救你（场上无闺蜜时重选）",
    'lit_yisui_info': "锁；闺蜜在时手牌数恒为3；<br>闺蜜满血时你免疫伤害；<br>闺蜜死，你失去所有体力",
};

// 拆分后补回的旧集中数据
Object.assign(translate, {
    'lit_shengjizpj': "升级·曾品嘉",
    'lit_shengjizpj_info': `${get.poptip('lit_saohuaV2')} 增加1点体力上限，获得并修改〖骚话〗：此技能中，点数小于7的牌计算时的点数+7`,
});

Object.assign(simpleTranslate, {
    'lit_shengjizpj_info': `${get.poptip('lit_saohuaV2')} +1体力上限，获得并修改“骚话”：此技能中，点数<7的牌计算时的点数+7`,

});

export const dynamicTranslate = {
    lit_saohua(player) {
        let str = `已用和打出${get.poptip("lit_exDelayEquipCard")}可置于角色上。出牌阶段可：<li>将2张点数和≥13的牌当闪电</li>`;
        if (player.hasSkill('lit_saohuaV2')) str = `V2 已用和打出${get.poptip("lit_exDelayEquipCard")}可置于角色上，技能期间点数<7的牌点数+7。出牌阶段可：<li>将2张点数和≥13的牌当闪电</li>`;

        if (player.hasSkill('lit_saohua_pi')) str += Styled('O', "<li>弃3张点数和=33的牌造成3点雷伤（此项每回合限1次）</li>");
        else str += "<li>弃3张点数和=33的牌造成3点雷伤（此项每回合限1次）</li>";
        return str;
    },
};

export const pinyins = {
    '曾品嘉': ['zēng', 'pǐn', 'jiā'],
    '升级·曾品嘉': ['shēng', 'jí', '·', 'zēng', 'pǐn', 'jiā'],
};

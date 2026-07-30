import { lib, game, ui, get, ai, _status } from '../shared.js';

export const sort = 'jbs';
export const characterReplace = { 'lit_hupan': ['lit_hupan胡畔', 'lit_hupan9胡畔'] };

export const character = {
    'lit_hupan9胡畔': {
        sex: "male",
        group: "nine",
        hp: 2,
        maxHp: 3,
        skills: ["lit_beiai", "lit_baoshi", "lit_yuyan"],
        groupInGuozhan: "nine",
    },
};

export const skill = {
    lit_beiai: {
        forced: true,
        group: ["lit_beiai_end", "lit_beiai_bazhen"],
        subSkill: {
            end: {
                trigger: {
                    player: "phaseJieshuEnd",
                },
                forced: true,
                async content(event, trigger, player) {
                    const j = Math.floor(player.maxHp / (game.countPlayer() + 1));
                    const options = ['+1上限 -1体力', j > 0 ? `+1体力 -${j}上限` : '+1体力'];

                    const { control } = await player.chooseControl(options)
                        .set("prompt", "【悲哀】")
                        .set("prompt2", "选择发动技能的内容")
                        .set("ai", () => {
                            if (j <= 0) return 1;
                            if (player.hp >= 3) {
                                if (player.maxHp > player.hp + j) return 1;
                                return 0;
                            }
                            if (player.canSave(player) || player.hp > 1) {
                                if (player.maxHp === player.hp) return 0;
                                return 1;
                            }
                            return 1;
                        }).forResult();

                    if (control === '+1上限 -1体力') {
                        await player.gainMaxHp();
                        await player.loseHp();
                    } else {
                        await player.recover();
                        if (j > 0) await player.loseMaxHp(j);
                    }
                },
                ai: {
                    order: 5,
                    result: {
                        player: (player) => {
                            if (player.hp === player.maxHp) return 2;
                            if (player.hp > 3) return -1;
                            const teamScale = game.countPlayer(current => get.attitude(player, current) > 0) * 0.1;
                            return 1 + teamScale;
                        },
                    },
                    threaten: 0.8,
                },
                sub: true,
                sourceSkill: "lit_beiai",
            },
            bazhen: {
                locked: true,
                equipSkill: true,
                noHidden: true,
                inherit: "bagua_skill",
                filter: (event, player) => {
                    if (!lib.skill.rw_bagua_skill.filter(event, player)) return false;
                    return player.isEmpty(2);
                },
                async content(event, trigger, player) {
                    const judgeResult = await player.judge('rewrite_bagua', (card) => {
                        return get.suit(card) !== 'spade' ? 1.5 : -0.5;
                    });
                    judgeResult.judge2 = (result) => result.bool;

                    if (judgeResult.result.judge > 0) {
                        trigger.untrigger();
                        trigger.set('responded', true);
                        trigger.result = { bool: true, card: { name: 'shan' } };
                    }
                },
                ai: {
                    respondShan: true,
                    effect: {
                        target(card, player, target) {
                            if (player === target && get.subtype(card) === 'equip2') {
                                if (get.equipValue(card, player) <= 7.5) return 0;
                            }
                            if (!target.isEmpty(2)) return;
                            return lib.skill.rw_bagua_skill.ai.effect.target.apply(this, arguments);
                        },
                    },
                },
                sub: true,
                sourceSkill: "lit_beiai",
            },
        },
    },
    lit_baoshi: {
        forced: true,
        group: ["lit_baoshi_gain", "lit_baoshi_lose"],
        subSkill: {
            gain: {
                trigger: {
                    player: "recoverEnd",
                },
                forced: true,
                async content(event, trigger, player) {
                    await player.gainMaxHp(trigger.num);
                },
                ai: {
                    result: {
                        player: 2,
                    },
                },
                sub: true,
                sourceSkill: "lit_baoshi",
            },
            lose: {
                trigger: {
                    player: "loseMaxHpBefore",
                },
                forced: true,
                async content(event, trigger, player) {
                    const drawAmount = player.maxHp - player.hp;
                    if (drawAmount > 0) {
                        await player.draw(Math.min(drawAmount, 3));
                    }
                },
                ai: {
                    threaten: 0.9,
                    result: {
                        player: (player) => {
                            return player.maxHp - player.hp;
                        },
                    },
                },
                sub: true,
                sourceSkill: "lit_baoshi",
            },
        },
        ai: {
            threaten: 1.1,
            effect: {
                player: (card, player) => {
                    if (get.tag(card, "recover")) {
                        return [1, 0.5];
                    }
                },
            },
        },
    },
    lit_yuyan: {
        frequent: true,
        trigger: {
            player: ["phaseZhunbeiBegin", "phaseJieshuBegin"],
        },
        async content(event, trigger, player) {
            let guanxingAmount = 3;

            if (player.hp > 3) {
                const pileCount = ui.cardPile.childElementCount;
                guanxingAmount = Math.min(player.hp, pileCount);
            }

            if (guanxingAmount > 0) {
                await player.chooseToGuanxing(guanxingAmount);
            }
        },
        ai: {
            threaten: 1.2,
            result: {
                player: (player) => {
                    let amount = 3;
                    if (player.hp > 3) {
                        const pileCount = ui.cardPile.childElementCount;
                        amount = Math.min(player.hp, pileCount);
                    }
                    return amount * 0.5;
                },
            },
            effect: {
                player: (card, player) => {
                    if (get.tag(card, "loseHp") && player.hp > 3) {
                        return [1, -0.3];
                    }
                },
            },
        },
    },
};

export const translate = {
    'lit_hupan9胡畔': "9胡畔",
    'lit_hupan9胡畔_prefix': "9",
    "lit_beiai": "悲哀",
    "lit_beiai_info": "锁定技；防具区没牌时视作装备<span class='redtext' style='color:Green'>“先天八卦阵”</span>；回合结束时，你选择：<br><li>①增加1点体力上限并失去1点体力;<br><li>②恢复1点体力并失去x点体力上限，<span class='redtext' style='color:Red'>x=上限/（存活人数+1）</span>",
    "lit_baoshi": "暴食",
    "lit_baoshi_info": "锁定技；你的体力值每增加1点，体力上限+1；你的体力上限减少前，你摸y张牌。（y为你已失去的体力）",
    "lit_yuyan": "预言",
    "lit_yuyan_info": "准备阶段或结束阶段开始时；你可以观看牌堆顶z张牌，同时可以调整牌的顺序并将其中任意张牌移至牌堆底。（z为你的体力值且至少为3）",
};

import { lib, game, ui, get, ai, _status } from '../shared.js';

export const sort = 'jbs';

export const character = {
    'lit_wangsiyuan王思媛': {
        sex: "female",
        group: "nine",
        hp: 4,
        skills: ["lit_daha", "lit_fushu"],
        groupInGuozhan: "nine",
    },
};

export const skill = {
    lit_daha: {
        trigger: {
            source: "damageBefore",
        },
        forced: true,
        filter: (event, player) => {
            return event.notLink();
        },
        async content(event, trigger, player) {
            // 判断目标是否有卖血技能
            const hasMaixie = trigger.player.hasSkillTag('maixie') ||
                trigger.player.hasSkillTag('maixie_defend') ||
                trigger.player.hasSkillTag('maixie_hp');

            const { control } = await player.chooseControl(['确定', '取消'])
                .set("prompt", "【大哈】")
                .set("prompt2", "弃置所有手牌，否则此伤害视为失去体力")
                .set("ai", () => {
                    // 如果对方有卖血技能，取消弃牌
                    if (hasMaixie) return 1;
                    // 如果自己手牌很少或很烂，选择弃牌
                    if (player.countCards('h') === 0) return 0;
                    if (player.countCards('h') <= 2) {
                        const cards = player.getCards('h');
                        let totalValue = 0;
                        for (const card of cards) {
                            totalValue += get.value(card, player);
                        }
                        if (totalValue < 10) return 1;
                    }
                    return 0;
                }).forResult();

            if (control === '确定') {
                await player.discard(player.getCards('h'), true);
            } else {
                trigger.cancel();
                await trigger.player.loseHp(trigger.num);
            }
        },
        ai: {
            jueqing: true,
            threaten: 1.2,
        },
    },
    lit_fushu: {
        trigger: {
            player: ["loseAfter", "changeHp"],
        },
        forced: true,
        filter: (event, player) => {
            const required = Math.max(1, player.getDamagedHp());
            return player.countCards('h') < required;
        },
        async content(event, trigger, player) {
            const required = Math.max(player.getDamagedHp(), 1);
            await player.drawTo(required);
        },
        ai: {
            noh: true,
            freeSha: true,
			freeShan: true,
            skillTagFilter: (player, tag) => {
                if (tag === 'noh') {
                    const required = Math.max(1, player.getDamagedHp());
                    return player.countCards('h') < required;
                }
                return false;
            },
            effect: {
                player: (card, player) => {
                    if (get.tag(card, "damage") || get.tag(card, "loseCard")) {
                        const required = Math.max(1, player.getDamagedHp());
                        if (player.countCards('h') < required) {
                            return [1, 0.5];
                        }
                    }
                    if (get.tag(card, "recover")) {
                        const required = Math.max(1, player.getDamagedHp());
                        if (player.countCards('h') < required) {
                            return [1, -0.5];
                        }
                    }
                },
            },
            result: {
                player: (player) => {
                    const required = Math.max(1, player.getDamagedHp());
                    const deficit = required - player.countCards('h');
                    return Math.max(0, deficit * 0.5);
                },
            },
        },
    },
};

export const translate = {
    'lit_wangsiyuan王思媛': "王思媛",
    "lit_daha": "大哈",
    "lit_daha_info": "锁定技；你即将造成的伤害视作失去体力，<span class='redtext' style='color:Red'>除非</span>你弃置所有手牌。",
    "lit_fushu": "腹书",
    "lit_fushu_info": "锁定技；你的手牌数小于x时，你将手牌补至x张。（x为你已失去的体力且至少为1）",
};

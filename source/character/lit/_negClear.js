import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';

export const skill = {
    lit_negClear: {
        nopop: true,
        charlotte: true,
        silent: true,
        priority: -999,
        forceDie: true,
        trigger: {
            player: "dieAfter",
        },
        async content(event, trigger, player) {
            await player.removeSkills(lib.lit.negSkills);
            for (let i of lib.lit.negSkills) {
                if (player.getStorage(i, 0) != 0) player.setStorage(i, 0);
            }
        },
    },
};

export const translate = {
    'lit_negClear_faq': "负面效果",
    'lit_negClear_faq_info': "视为锁定技，满足条件或执行完成后清除，也会在死亡后清除。在清除后会恢复因负面效果而临时造成的影响",
};

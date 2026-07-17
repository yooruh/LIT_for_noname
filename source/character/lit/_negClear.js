import { lib, game, ui, get, ai, _status } from '../../../../../../noname.js';

export const skill = {
    lit_negClear: {
        nopop: true,
        charlotte: true,
        direct: true,
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
};

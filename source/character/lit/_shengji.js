import { lib, game, ui, get, ai, _status } from '../../../../../../noname.js';

export const skill = {
    lit_shengji: {
        nopop: true,
        charlotte: true,
        unique: true,
        direct: true,
        firstDo: true,
        mark: true,
        marktext: "级",
        intro: {
            name: "升级",
            content: (storage, player) => `距离升级还差${3 - player.countMark('lit_shengji')}点经验`,
        },

        onremove(player) {
            player.removeSkill("lit_shengji_markAfterShow");
            player.unmarkSkill("lit_shengji");
        },
        init(player) {
            if (player.skills.some(e => lib.lit.isShengjiSkill(e))) {
                player.markSkill('lit_shengji');
            } else {
                player.addSkill("lit_shengji_markAfterShow");
            }
            player.setStorage("lit_shengji", 0);
            if (lib.lit.getPlayers() < 5) {
                player.useSkill('lit_shengji');
            }
        },

        trigger: { global: 'dieAfter' },
        async content(event, trigger, player) {
            if (trigger?.name === 'die') {
                const expGain = (trigger.source === player && trigger.source.isAlive() ? 1 : 0) + 1;
                if (player.skills.some(e => lib.lit.isShengjiSkill(e))) {
                    player.addMark('lit_shengji', expGain);
                } else {
                    let exp = player.getStorage("lit_shengji", 0);
                    player.setStorage("lit_shengji", exp + expGain);
                }
            }
            if (player.countMark('lit_shengji') < 3 && lib.lit.getPlayers() >= 5) return;

            player.clearMark('lit_shengji', false);
            await player.logSkill('lit_shengji');
            player.removeSkill('lit_shengji');

            const actions = {
                'qb': 'lit_tiannaV2',
                'zsj': async () => {
                    const cards = [];
                    game.countPlayer(current => {
                        cards.addArray(current.getCards('hj', card => {
                            return get.type(card) === "delay" && lib.filter.canBeGained(card, player, current);
                        }));
                    });
                    await player.gain(cards, 'gain2');
                },
                'zqy': 'lit_zishaV2',
                'pjl': 'lit_duilianV2',
                'wxq': () => {
                    const newSkill = player.hasSkill('lit_xiaochou') ? 'lit_xiaochouV2' : 'lit_mianjuV2';
                    player.addSkill(newSkill);
                    player.popup(newSkill);
                },
                'zg': 'lit_zhanshiV2',
                'zpj': {
                    skills: 'lit_saohuaV2',
                    beforeAdd: async () => {
                        await player.gainMaxHp();
                    }
                },
                'bs': 'lit_yisuiV2',
                'lcm': 'lit_jijinV2',
                'zmh': 'lit_jianrenV2',
                'rita': () => {
                    if (player.hasSkill('lit_dafang')) {
                        player.addSkill('lit_hengshuitiV2');
                        player.popup('lit_hengshuitiV2');
                    } else {
                        player.addSkill('lit_dafang');
                        player.popup('lit_dafang');
                    }
                },
                'hp': {
                    skills: 'lit_yigou',
                    beforeAdd: async () => await player.loseMaxHp(),
                },
                'lbx': async () => {
                    await player.gainMaxHp();
                    await player.recover(player.maxHp - player.hp);
                },
                'hxy': 'lit_mimangV2',
                'hjw': 'lit_wutongV2',
                'rs': 'lit_qixuV2',
                'jhx': 'lit_shanliangV2',
                'qbc': 'lit_chushouV2',
                'zc': 'lit_shuxinV2',
                'yxl': 'lit_juji'
            };

            const mainAllSkills = lib.character[player.name1]?.skills || [];
            const viceAllSkills = lib.character[player.name2]?.skills || [];
            const eventSkills = player.skills.filter(s => lib.lit.isShengjiSkill(s));

            for (const skill of eventSkills) {
                const skillKey = skill.slice(11);
                const action = actions[skillKey];
                if (!action) continue;

                if (mainAllSkills.includes(skill)) await player.showCharacter(0, true);
                if (viceAllSkills.includes(skill)) await player.showCharacter(1, true);
                player.removeSkill(skill);

                if (typeof action === 'function') {
                    await action(event, trigger, player);
                } else {
                    let skills = [];
                    if (typeof action === 'string') {
                        skills = [action];
                    } else if (Array.isArray(action)) {
                        skills = action;
                    } else if (typeof action === 'object') {
                        if (action.beforeAdd) await action.beforeAdd(event, trigger, player);
                        if (typeof action.skills === 'string') {
                            skills = [action.skills];
                        } else {
                            skills = action.skills || [];
                        }
                    }
                    let strArray = [];
                    skills.forEach(s => {
                        player.addSkill(s);
                        strArray.push(get.translation(s));
                    });
                    if (strArray.length > 0) player.popup(strArray.join('<br>'));
                }
            }

            const indexMap = new Map();
            [...mainAllSkills, ...viceAllSkills].forEach((skill, idx) => {
                if (get.info(skill)) indexMap.set(skill, idx);
            });
            player.skills.sort((a, b) => {
                const baseName = s => s.endsWith('V2') ? s.slice(0, -2) : s;
                return (indexMap.get(baseName(a)) ?? Infinity) - (indexMap.get(baseName(b)) ?? Infinity);
            });
            player.update();
        },
        subSkill: {
            markAfterShow: {
                charlotte: true,
                firstDo: true,
                direct: true,
                trigger: { player: "showCharacterAfter" },
                filter(event, player) {
                    return player.skills.some(e => lib.lit.isShengjiSkill(e));
                },
                async content(event, trigger, player) {
                    player.markSkill('lit_shengji');
                    player.removeSkill('lit_shengji_markAfterShow');
                },
                sub: true,
                sourceSkill: "lit_shengji",
            },
        },
    },
    lit_sj: {
        unique: true,
        group: 'lit_shengji',
        onremove: (player) => {
            if (player.getSkills().filter(e => lib.lit.isShengjiSkill(e)).length) return;
            let hidden = player.getSkills(true).filter(e => lib.lit.isShengjiSkill(e)).length;
            if (hidden) {
                player.unmarkSkill('lit_shengji');
                player.markSkill("lit_shengji", null, null, true);
            } else {
                player.removeSkill('lit_shengji');
            }
        },
    },
};

export const translate = {
    'lit_shengji': "升级",
    'lit_shengji_info': "场上每有一名角色死亡，所有角色获得1点经验，击杀者额外获得1点经验，当经验值达到3或全场角色数小于5时升级",
};

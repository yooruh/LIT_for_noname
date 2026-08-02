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
            content: () => "击杀1名角色后升级",
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
            if (lib.lit.getPlayers() < 5) {
                player.useSkill('lit_shengji');
            }
        },

        trigger: { global: 'dieAfter' },
        async content(event, trigger, player) {
            // 击杀1名角色后升级；开局人数不足5时由 init 强制触发（trigger 非 die 事件）
            if (trigger?.name === 'die') {
                if (trigger.source !== player || !trigger.source.isAlive()) return;
                if (!player.skills.some(e => lib.lit.isShengjiSkill(e))) return;
            }

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
                'yxl': 'lit_juji',
                'sn': 'lit_jiaoshuiV2',
                'yt': 'lit_chixin',
                'zyt': 'lit_chixin'
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
    lit_shengjiqb: {
        inherit: 'lit_sj',
        derivation: 'lit_tiannaV2',
    },
    lit_shengjizsj: {
        inherit: 'lit_sj',
    },
    lit_shengjizqy: {
        inherit: 'lit_sj',
        derivation: 'lit_zishaV2',
    },
    lit_shengjipjl: {
        inherit: 'lit_sj',
        derivation: 'lit_duilianV2',
    },
    lit_shengjiwxq: {
        inherit: 'lit_sj',
        derivation: ['lit_mianjuV2', 'lit_xiaochouV2'],
    },
    lit_shengjizg: {
        inherit: 'lit_sj',
        derivation: 'lit_zhanshiV2',
    },
    lit_shengjizpj: {
        inherit: 'lit_sj',
        derivation: 'lit_saohuaV2',
    },
    lit_shengjibs: {
        inherit: 'lit_sj',
        derivation: 'lit_yisuiV2',
    },
    lit_shengjilcm: {
        inherit: 'lit_sj',
        derivation: 'lit_jijinV2',
    },
    lit_shengjizmh: {
        inherit: 'lit_sj',
        derivation: 'lit_jianrenV2',
    },
    lit_shengjirita: {
        inherit: 'lit_sj',
        derivation: ['lit_dafang', 'lit_hengshuiti'],
    },
    lit_shengjihp: {
        inherit: 'lit_sj',
        derivation: 'lit_yigou',
    },
    lit_shengjilbx: {
        inherit: 'lit_sj',
    },
    lit_shengjihxy: {
        inherit: 'lit_sj',
        derivation: 'lit_mimangV2',
    },
    lit_shengjihjw: {
        inherit: 'lit_sj',
        derivation: 'lit_wutongV2',
    },
    lit_shengjirs: {
        inherit: 'lit_sj',
        derivation: 'lit_qixuV2',
    },
    lit_shengjijhx: {
        inherit: 'lit_sj',
        derivation: 'lit_shanliangV2',
    },
    lit_shengjiqbc: {
        inherit: 'lit_sj',
        derivation: 'lit_chushouV2',
    },
    lit_shengjizc: {
        inherit: 'lit_sj',
        derivation: 'lit_shuxinV2',
    },
    lit_shengjiyxl: {
        inherit: 'lit_sj',
        derivation: 'lit_juji',
    },
    lit_shengjisn: {
        inherit: 'lit_sj',
        derivation: 'lit_jiaoshuiV2',
    },
    lit_shengjiyt: {
        inherit: 'lit_sj',
        derivation: 'lit_chixin',
    },
    lit_shengjizyt: {
        inherit: 'lit_sj',
        derivation: 'lit_chixin',
    },
};

export const translate = {
    'lit_shengji': "升级",
    'lit_shengji_info': "当你击杀1名角色后升级；全场角色数小于5时，开局立即升级",
};

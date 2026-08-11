import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';

export const skill = {
    lit_shengji: {
        nopop: true,
        charlotte: true,
        unique: true,
        silent: true,
        log: false,
        firstDo: true,
        mark: true,
        marktext: "级",
        intro: {
            name: "升级",
            content: (storage, player) => `当前经验：${player.countMark('lit_shengji')}/3<li>击杀时全场获得1经验，击杀者额外获得1经验；经验达3，或全场不足5人时升级</li>`,
        },
        utils: {
            // 升级动作表：按升级技能名映射到升级后的技能或动作
            // 动作函数签名：(event, trigger, player)
            actions: {
                'qb': 'lit_tiannaV2',
                'zsj': async (event, trigger, player) => {
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
                'wxq': (event, trigger, player) => {
                    const newSkill = player.hasSkill('lit_xiaochou') ? 'lit_xiaochouV2' : 'lit_mianjuV2';
                    player.addSkill(newSkill);
                    player.popup(newSkill);
                },
                'zg': 'lit_zhanshiV2',
                'zpj': {
                    skills: 'lit_saohuaV2',
                    beforeAdd: async (event, trigger, player) => {
                        await player.gainMaxHp();
                    }
                },
                'bs': 'lit_yisuiV2',
                'lcm': 'lit_jijinV2',
                'zmh': 'lit_jianrenV2',
                'rita': 'lit_nuoruoV2',
                'hp': {
                    skills: 'lit_yigou',
                    beforeAdd: async (event, trigger, player) => await player.loseMaxHp(),
                },
                'lbx': async (event, trigger, player) => {
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
            },
            // 角色当前拥有且带 lit_sjEff: "instant" 标签的升级技能
            getInstantSkills(player) {
                return player.skills.filter(s => lib.lit.isShengjiSkill(s) && get.info(s).lit_sjEff === "instant");
            },
            // 将带 instant 标签的升级技能注册进 lit_shengji_use，供手动触发
            registerInstantUse(player) {
                const instantSkills = this.getInstantSkills(player);
                if (!instantSkills.length) return;
                if (!player.hasSkill('lit_shengji_use')) player.addSkill('lit_shengji_use');
                player.setStorage('lit_shengji_use', instantSkills);
            },
            // 对指定升级技能逐一执行升级动作，并整理技能排序
            async shengjiUpgrade(player, skills) {
                // 归一化动作：函数直接执行，其余统一为 { skills, beforeAdd } 描述对象
                const normalizeAction = action => {
                    if (typeof action === 'function') return { run: action };
                    if (typeof action === 'string') return { skills: [action] };
                    return { beforeAdd: action.beforeAdd, skills: [].concat(action.skills || []) };
                };

                const mainAllSkills = lib.character[player.name1]?.skills || [];
                const viceAllSkills = lib.character[player.name2]?.skills || [];

                for (const skill of skills) {
                    const rawAction = this.actions[skill.slice(11)];
                    if (!rawAction) continue;
                    const action = normalizeAction(rawAction);

                    if (mainAllSkills.includes(skill)) await player.showCharacter(0, true);
                    if (viceAllSkills.includes(skill)) await player.showCharacter(1, true);
                    player.removeSkill(skill);

                    if (action.beforeAdd) await action.beforeAdd(undefined, undefined, player);
                    if (action.run) {
                        await action.run(undefined, undefined, player);
                    } else {
                        // 添加升级后的技能并弹窗提示
                        const added = [];
                        for (const s of action.skills) {
                            if (!player.hasSkill(s)) {
                                player.addSkill(s);
                                added.push(get.translation(s));
                            }
                        }
                        if (added.length) player.popup(added.join('<br>'));
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

            // 开局即时升级：全场不足5人时，非开局时触发
            if (lib.lit.getPlayers() < 5 && game.roundNumber !== 0) {
                player.useSkill('lit_shengji');
            }
        },

        trigger: { global: ['gameDrawBefore', 'dieAfter'] },
        async content(event, trigger, player) {
            // 击杀结算：全场 +1 经验，击杀者额外 +1；经验达 3 或全场不足 5 人时升级
            if (trigger?.name === 'gameDraw') {
                if (game.roundNumber !== 0) return;
                if (lib.lit.getPlayers() >= 5 && !player.isZhu) return;
            } else if (trigger?.name === 'die') {
                if (!player.isAlive()) return;
                const expGain = (trigger.source === player && trigger.source.isAlive() ? 1 : 0) + 1;
                if (player.skills.some(e => lib.lit.isShengjiSkill(e))) {
                    player.addMark('lit_shengji', expGain);
                } else {
                    player.setStorage("lit_shengji", player.getStorage("lit_shengji", 0) + expGain);
                }
                if (player.countMark('lit_shengji') < 3 && lib.lit.getPlayers() >= 5) return;
            }

            // 开局即时升级时，instant 标签技能转由 lit_shengji_use 手动触发，其余照常自动升级
            const utils = lib.skill.lit_shengji.utils;
            if (game.roundNumber === 0) {
                utils.registerInstantUse(player);
            } else if (player.hasSkill('lit_shengji_use')) {
                player.setStorage('lit_shengji_use', []);
                player.removeSkill("lit_shengji_use");
            }
            const eventSkills = player.skills.filter(s => lib.lit.isShengjiSkill(s)
                && !(game.roundNumber === 0 && get.info(s).lit_sjEff === "instant"));
            if (eventSkills.length === 0) return;

            await player.logSkill('lit_shengji');
            // 仍有手动待触发的升级时保留技能，否则移除，避免后续升级无法自动触发
            if (player.getStorage('lit_shengji_use', []).length === 0) {
                player.clearMark('lit_shengji', false);
                player.removeSkill('lit_shengji');
            }

            await utils.shengjiUpgrade(player, eventSkills);
        },
        subSkill: {
            markAfterShow: {
                charlotte: true,
                firstDo: true,
                silent: true,
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
            // 手动触发式升级：带 instant 标签的升级技能在开局即时升级时不自动触发，收进 storage；
            // 玩家可在每轮开始或任意角色阵亡后手动多选触发，触发后移除对应记录，清空后移除本技能
            use: {
                charlotte: true,
                log: false,
                priority: -999,
                trigger: { global: ["roundStart", "dieAfter"] },
                filter(event, player) {
                    if (!player.isAlive()) return false;
                    const list = player.getStorage("lit_shengji_use");
                    return Array.isArray(list) && list.length > 0;
                },
                async cost(event, trigger, player) {
                    const list = player.getStorage("lit_shengji_use", []).filter(s => player.hasSkill(s));
                    if (!list.length) {
                        event.result = { bool: false };
                        return;
                    }
                    // 参照无名杀本体：dialog.add([技能数组, "skill"]) 走 buttonPresets.skill 构建标准技能按钮
                    const dialog = ui.create.dialog("触发式升级", "hidden");
                    dialog.add([list, "skill"]);
                    const result = await player.chooseButton(dialog, [1, list.length])
                        .set("ai", () => 1)
                        .forResult();
                    if (!result.bool || !result.links || !result.links.length) {
                        event.result = { bool: false };
                        return;
                    }
                    if (result.links.length === 0) return;
                    event.result = { bool: true, cost_data: result.links.slice() };
                },
                async content(event, trigger, player) {
                    const skills = event.cost_data || [];
                    await lib.skill.lit_shengji.utils.shengjiUpgrade(player, skills);
                    const remaining = player.getStorage("lit_shengji_use", []).filter(s => !skills.includes(s));
                    player.setStorage("lit_shengji_use", remaining);
                    if (!remaining.length) player.removeSkill("lit_shengji_use");
                    // 无待触发升级且无剩余升级技能时，结束整个升级机制
                    if (!remaining.length && !player.skills.some(s => lib.lit.isShengjiSkill(s))) {
                        player.clearMark('lit_shengji', false);
                        player.removeSkill('lit_shengji');
                    }
                },
                sub: true,
                sourceSkill: "lit_shengji",
            },
        },
    },
    lit_sj: {
        unique: true,
        // 不依赖 group，避免移除任一升级技能时引擎 expandSkills 连带删除其全局触发器
        init(player) {
            if (!player.hasSkill('lit_shengji')) player.addSkill('lit_shengji');
        },
        onremove: (player) => {
            if (player.getSkills().filter(e => lib.lit.isShengjiSkill(e)).length) return;
            let hidden = player.getSkills(true).filter(e => lib.lit.isShengjiSkill(e)).length;
            if (player.getStorage('lit_shengji_use', []).length) {
                // 仍有待手动触发的升级，保留升级机制，避免中途被移除
                return;
            } else if (hidden) {
                // 仍有隐藏的升级技，仅移除公开的标记
                player.unmarkSkill('lit_shengji');
                player.markSkill("lit_shengji", null, null, true);
                return;
            }
            player.removeSkill('lit_shengji');
        },
    },
    lit_shengjiqb: {
        inherit: 'lit_sj',
        derivation: 'lit_tiannaV2',
    },
    lit_shengjizsj: {
        inherit: 'lit_sj',
        lit_sjEff: "instant",
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
        derivation: 'lit_nuoruoV2',
    },
    lit_shengjihp: {
        inherit: 'lit_sj',
        derivation: 'lit_yigou',
    },
    lit_shengjilbx: {
        inherit: 'lit_sj',
        lit_sjEff: "instant",
    },
    lit_shengjihxy: {
        inherit: 'lit_sj',
        derivation: 'lit_mimangV2',
    },
    lit_shengjihjw: {
        inherit: 'lit_sj',
        derivation: 'lit_wutongV2',
    },
    lit_shengjiwr: {
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
    'lit_shengji_info': `击杀时全场获得1经验，击杀者额外获得1经验；经验达到3或全场角色数不足5时升级，玩家为主公时开局立即升级；${get.poptip("lit_sjInstantFull")}技能不在开局自动升级，可于每轮开始或任意角色阵亡时手动触发`,
};

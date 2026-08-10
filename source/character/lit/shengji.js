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
            // 升级动作表：按升级技能名（lit_shengji 去掉前缀）映射到升级后的技能或动作
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
                const mainAllSkills = lib.character[player.name1]?.skills || [];
                const viceAllSkills = lib.character[player.name2]?.skills || [];

                for (const skill of skills) {
                    const skillKey = skill.slice(11);
                    const action = this.actions[skillKey];
                    if (!action) continue;

                    if (mainAllSkills.includes(skill)) await player.showCharacter(0, true);
                    if (viceAllSkills.includes(skill)) await player.showCharacter(1, true);
                    player.removeSkill(skill);

                    if (typeof action === 'function') {
                        await action(undefined, undefined, player);
                    } else {
                        let skillsToAdd = [];
                        if (typeof action === 'string') {
                            skillsToAdd = [action];
                        } else if (Array.isArray(action)) {
                            skillsToAdd = action;
                        } else if (typeof action === 'object') {
                            if (action.beforeAdd) await action.beforeAdd(undefined, undefined, player);
                            if (typeof action.skills === 'string') {
                                skillsToAdd = [action.skills];
                            } else {
                                skillsToAdd = action.skills || [];
                            }
                        }
                        let strArray = [];
                        skillsToAdd.forEach(s => {
                            if (!player.hasSkill(s)) {
                                player.addSkill(s);
                                strArray.push(get.translation(s));
                            }
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

            /** TODO: 若升级技能有标签lit_sjEff: "instant"，且当前的game.roundNumber === 0，则此升级技能不通过useSkill('lit_shengji')来进行升级
             *  需要注意：
             *  （1）多个升级技能，一个有lit_sjEff: "instant"，另一个没有。没有此标签的仍走旧升级路线，有此标签的不这么走
             *  （2）仅仅game.roundNumber === 0时不走，game.roundNumber === 0 不满足时仍然走老路线
             *  （3）不走useSkill('lit_shengji')的升级，改为获得lit_shengji的子技能lit_shengji_use，并将角色当前有标签lit_sjEff: "instant"的技能名列表写进lit_shengji_use的storage中
             *  （4）lit_shengji_use被触发时，能用于手动触发升级技能，其可以选择的升级技能来自lit_shengji_use的storage
             *  （5）lit_shengji_use可在global: ['roundStart', 'dieAfter']触发，触发时，角色可以选择使用，也可以选择不使用。
             *  （6）使用cost来细节地选择要触发哪些升级技能，升级技能的选项要包含技能的完整版描述，可多选（使用无名杀本体的多选框）
             *  （7）使用lit_shengji_use触发升级后，会移除storage中的对应记录，如果storage触发完了，则移除lit_shengji_use
             *  （8）lit_shengji_use没有技能描述，使用slient来避免显式出现在角色技能中
             *  （9）修改升级条件的描述，同时修改有标签lit_sjEff: "instant"的升级技能描述。有标签lit_sjEff: "instant"时，升级技能的完整描述前加“触发式升级，”，简略描述前加“触发，”
             *  （10）注册“触发式升级”和“触发”的poptip，替换技能描述中的对应文本为${get.poptip("xxx")}，说明此类特殊升级在开局触发升级时的效果，以及后续应该如何使用
             */
            // 人数不足5时，直接升级
            if (lib.lit.getPlayers() < 5) {
                player.useSkill('lit_shengji');
            }
            // 主公开局直接升级
            else if (player.isZhu && game.roundNumber === 0) {
                player.useSkill('lit_shengji');
            }
        },

        trigger: { global: ['dieAfter'] },
        async content(event, trigger, player) {
            // 开场升级条件由 init 强制触发
            // 击杀：全场+1经验，击杀者额外+1；经验≥3 或 全场不足5人 → 升级
            if (trigger?.name === 'die') {
                if (!player.isAlive()) return;
                const expGain = (trigger.source === player && trigger.source.isAlive() ? 1 : 0) + 1;
                if (player.skills.some(e => lib.lit.isShengjiSkill(e))) {
                    player.addMark('lit_shengji', expGain);
                } else {
                    player.setStorage("lit_shengji", player.getStorage("lit_shengji", 0) + expGain);
                }
                if (player.countMark('lit_shengji') < 3 && lib.lit.getPlayers() >= 5) return;
            }

            // 开局升级：带 lit_sjEff: "instant" 标签的升级技能不自动升级，
            // 改由 lit_shengji_use 手动触发（roundStart / dieAfter）
            if (game.roundNumber === 0) lib.skill.lit_shengji.utils.registerInstantUse(player);

            player.clearMark('lit_shengji', false);
            await player.logSkill('lit_shengji');
            player.removeSkill('lit_shengji');

            // round-0 升级时跳过 instant 技能，其余仍走旧升级路线
            const eventSkills = player.skills.filter(s => lib.lit.isShengjiSkill(s)
                && !(game.roundNumber === 0 && get.info(s).lit_sjEff === "instant"));

            await lib.skill.lit_shengji.utils.shengjiUpgrade(player, eventSkills);
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
            // 手动触发式升级：开局不自动升级的 instant 升级技能收进 storage，由玩家手动触发
            use: {
                charlotte: true,
                sub: true,
                sourceSkill: "lit_shengji",
                silent: true,
                trigger: { global: ["roundStart", "dieAfter"] },
                filter(event, player) {
                    if (!player.isAlive()) return false;
                    const list = player.getStorage("lit_shengji_use");
                    return Array.isArray(list) && list.length > 0;
                },
                async cost(event, trigger, player) {
                    const list = (player.getStorage("lit_shengji_use") || []).filter(s => player.hasSkill(s));
                    if (!list.length) {
                        event.result = { bool: false };
                        return;
                    }
                    const dialog = ui.create.dialog("触发式升级", "hidden");
                    const buttons = ui.create.div(".buttons", dialog.content);
                    for (const skill of list) {
                        const button = ui.create.div(".button.selectable.pointerdiv", buttons);
                        button.link = skill;
                        button.innerHTML = `<div class="name">${get.translation(skill)}</div>` +
                            `<div class="info">${lib.translate[skill + '_info'] || ''}</div>`;
                        button.listen(ui.click.button);
                        dialog.buttons.push(button);
                    }
                    dialog.open();
                    const result = await player.chooseButton(dialog, [1, list.length])
                        .set("ai", () => 1)
                        .forResult();
                    if (!result.bool || !result.links || !result.links.length) {
                        event.result = { bool: false };
                        return;
                    }
                    event.result = { bool: true, cost_data: result.links.slice() };
                },
                async content(event, trigger, player) {
                    const skills = event.cost_data || [];
                    if (!skills.length) return;
                    await lib.skill.lit_shengji.utils.shengjiUpgrade(player, skills);
                    const remaining = (player.getStorage("lit_shengji_use") || []).filter(s => !skills.includes(s));
                    player.setStorage("lit_shengji_use", remaining);
                    if (!remaining.length) player.removeSkill("lit_shengji_use");
                },
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
    'lit_shengji_info': `击杀时全场获得1经验，击杀者额外获得1经验；经验达到3或全场角色数不足5时升级，玩家为主公时开局立即升级；${get.poptip("lit_sjInstantFull")}技能不自动升级，可于每轮开始或任意角色阵亡时手动触发`,
};

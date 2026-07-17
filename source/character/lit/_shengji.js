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
            // 增加升级标记
            if (trigger?.name === 'die') {
                const expGain = (trigger.source === player && trigger.source.isAlive() ? 1 : 0) + 1;
                if (player.skills.some(e => lib.lit.isShengjiSkill(e))) {
                    player.addMark('lit_shengji', expGain);
                } else {
                    let exp = player.getStorage("lit_shengji", 0);
                    player.setStorage("lit_shengji", exp + expGain);
                }
            }
            // filter
            if (player.countMark('lit_shengji') < 3 && lib.lit.getPlayers() >= 5) return;

            player.clearMark('lit_shengji', false);
            await player.logSkill('lit_shengji');
            player.removeSkill('lit_shengji');

            // 升级效果
            const actions = {
                'qb': 'lit_tiannaV2',       //获得“天呐”并于末尾增加：>1血受伤时若此伤害会使血<1，免伤且血掉至1
                'zsj': async () => {        //获得场上所有人判定区和手牌中的延时锦囊牌
                    const cards = [];
                    game.countPlayer(current => {
                        cards.addArray(current.getCards('hj', card => {
                            return get.type(card) === "delay" && lib.filter.canBeGained(card, player, current);
                        }));
                    });
                    await player.gain(cards, 'gain2');
                },
                'zqy': 'lit_zishaV2',       //获得“紫砂”并于开头增加：准备阶段可-Y血+2Y牌（Y不超过体力值）
                'pjl': 'lit_duilianV2',     //获得并修改“对练”：不需要弃牌了
                'wxq': () => {              //获得“面具”/“小丑”，并修改其中的“小丑”：使其弃全部牌
                    const newSkill = player.hasSkill('lit_xiaochou') ? 'lit_xiaochouV2' : 'lit_mianjuV2';
                    player.addSkill(newSkill);
                    player.popup(newSkill);
                },

                'zg': 'lit_zhanshiV2',      //获得并修改“展示”：你也拥有后半段技能
                'zpj': {                    //+1体力上限，获得并修改“骚话”：此技能中，点数<7的牌计算时的点数+7
                    skills: 'lit_saohuaV2',
                    beforeAdd: async () => {
                        await player.gainMaxHp();
                    }
                },
                'bs': 'lit_yisuiV2',        //获得并修改“易碎”：闺蜜死亡时，你不再失去体力
                'lcm': 'lit_jijinV2',       //获得并修改“受激”：伤害越高，受激叠层越多
                'zmh': 'lit_jianrenV2',     //获得“坚韧”并于末尾增加：横置时属性伤+1

                'rita': () => {             //若已拥有〖大方〗，则获得〖衡水体V2〗；否则，获得〖大方〗
                    if (player.hasSkill('lit_dafang')) {
                        player.addSkill('lit_hengshuitiV2');
                        player.popup('lit_hengshuitiV2');
                    } else {
                        player.addSkill('lit_dafang');
                        player.popup('lit_dafang');
                    }
                },
                'hp': {                     //-1体力上限，获得："异构"
                    skills: 'lit_yigou',
                    beforeAdd: async () => await player.loseMaxHp(),
                },
                'lbx': async () => {        //+1体力上限，回满血
                    await player.gainMaxHp();
                    await player.recover(player.maxHp - player.hp);
                },
                'hxy': 'lit_mimangV2',      //获得并于“迷茫”前增加：【闪】和装备牌点数视为K
                'hjw': 'lit_wutongV2',      //获得并修改“梧桐”条件：还可弃置全部手牌触发

                'rs': 'lit_qixuV2',         //获得并修改“期许”：猜中时不再失去此技能
                'jhx': 'lit_shanliangV2',   //获得“善良”并于末尾增加：若恢复量溢出，增加等溢出量的上限后回满血
                'qbc': 'lit_chushouV2',     //获得并修改“出手”：不再跳过摸牌阶段
                'zc': 'lit_shuxinV2',       //获得并修改“竖心”：不再为锁定技
                'yxl': 'lit_juji'           //获得：“狙击”
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
                        player.addSkill(s)
                        strArray.push(get.translation(s));
                    });
                    if (strArray.length > 0) player.popup(strArray.join('<br>'));
                }

            }

            // 将V2技能排序到正确位置
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

// ════════════════════════════════════════════════════════════
//  数据驱动：升级技能映射表
//  key = 角色缩写, value = derivation 技能（string | string[] | null）
// ════════════════════════════════════════════════════════════
const SHENGJI_MAP = {
    qb:  'lit_tiannaV2',
    zsj: null,
    zqy: 'lit_zishaV2',
    pjl: 'lit_duilianV2',
    wxq: ['lit_mianjuV2', 'lit_xiaochouV2'],
    zg:  'lit_zhanshiV2',
    zpj: 'lit_saohuaV2',
    bs:  'lit_yisuiV2',
    lcm: 'lit_jijinV2',
    zmh: 'lit_jianrenV2',
    rita:['lit_dafang', 'lit_hengshuiti'],
    hp:  ['lit_yinren', 'lit_fumeng', 'lit_mengying'],
    lbx: null,
    hxy: 'lit_shihuaiV2',
    hjw: 'lit_wutongV2',
    rs:  'lit_qixuV2',
    jhx: 'lit_shanliangV2',
    qbc: 'lit_chushouV2',
    zc:  'lit_shuxinV2',
    yxl: 'lit_juji',
};

// 由映射表自动生成 { lit_shengjiX: { inherit, derivation } } 技能定义
const shengjiSkills = {};
for (const [key, derivation] of Object.entries(SHENGJI_MAP)) {
    const def = { inherit: 'lit_sj' };
    if (derivation) def.derivation = derivation;
    shengjiSkills[`lit_shengji${key}`] = def;
}
Object.assign(skill, shengjiSkills);

export { shengjiSkills };

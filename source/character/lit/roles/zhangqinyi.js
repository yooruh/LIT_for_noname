import { lib, game, ui, get, ai, _status, X, Y, Z } from '../shared.js';

export const character = {
    'lit_zhangqinyi张钦奕': {
        sex: "male",
        group: "three",
        hp: 3,
        skills: ["lit_shengjizqy", "lit_danke", "lit_lantong", "lit_zisha"],
    },
};

export const skill = {
    // 张钦奕
    lit_danke: {
        forced: true,
        popup: false,
        trigger: { player: "phaseZhunbeiBegin" },
        multitarget: true,
        multiline: true,
        async content(event, trigger, player) {
            event.targets = game.filterPlayer((current) => {
                return current !== player;
            }).sortBySeat();
            await player.logSkill('lit_danke', event.targets, 'yellow');
            for (let current of event.targets) {
                current.addTempSkill("lit_danke_loseHp");
                let state = current.getStorage("lit_danke_loseHp", [0, null]);
                if (current.hp === Infinity) {
                    state[0] = Infinity;
                    current.hp = Math.pow(2, 31) - 1;
                    current.update();
                }
                state[1] = player;
                current.setStorage("lit_danke_loseHp", state);
                if (current.hp <= 1) continue;
                let num = current.hp - 1;
                if (num > 0) await current.loseHp(num);
            }
        },
        ai: {
            threaten: 2.5,
        },
        subSkill: {
            loseHp: {
                firstDo: true,
                direct: true,
                charlotte: true,
                mark: true,
                marktext: "蛋",
                intro: {
                    content: (storage, player, skill) => {
                        if (!storage) storage = [0, null];
                        const num = storage[0] === Infinity ? '∞' : storage[0];
                        const source = storage[1];
                        return `被${get.translation(source)}的“蛋壳”溅射到了${num}下<li>回合结束时恢复等量的体力，溢出值转为护甲</li>`;
                    },
                    markcount: (storage, player) => {
                        if (!storage) storage = [0, null];
                        return storage[0] ?? 0;
                    },
                },
                trigger: { player: 'loseHpAfter' },
                init(player) {
                    player.setStorage("lit_danke_loseHp", [0, null]);
                },
                async onremove(player) {
                    let num = player.getStorage("lit_danke_loseHp")[0],
                        skiller = player.getStorage("lit_danke_loseHp")[1];
                    if (num > 0) {
                        let recoverNum = Math.min(num, (player.maxHp - player.hp));
                        let hujiaNum = num - recoverNum;
                        if (recoverNum > 0) await player.recover(recoverNum).set("source", skiller);
                        if (hujiaNum > 0) await player.changeHujia(hujiaNum).set("source", skiller);
                    }
                },
                filter: (event, player) => {
                    return event.getParent().name === "lit_danke";
                },
                async content(event, trigger, player) {
                    let state = player.getStorage("lit_danke_loseHp", [0, null]);
                    if (state[0] != Infinity) state[0] = trigger.num;
                    player.setStorage("lit_danke_loseHp", state, true);
                },
                sub: true,
                sourceSkill: "lit_danke",
            },
        },
    },
    lit_zisha: {
        trigger: {
            player: "useCard",
        },
        forced: true,
        filter: (event, player) => {
            return player.hp === 2;
        },
        async content(event, trigger, player) {
            trigger.directHit.addArray(game.players);
        },
        ai: {
            threaten: (player, target) => {
                if (target.hp === 3) return 0.8;
                if (target.hp === 2) return 2;
                return 1;
            },
            directHit_ai: true,
            skillTagFilter: (player, tag, arg) => {
                if (player.hp === 2) return true;
            },
        },
    },
    lit_zishaV2: {
        group: 'lit_zisha',
        trigger: {
            player: "phaseZhunbei",
        },
        locked: true,
        init: (player) => {
            if (player.hasSkill('lit_zisha')) player.removeSkill('lit_zisha');
        },
        filter: (event, player) => {
            return player.hp > 0;
        },
        check(event, player) {
            if (player.hp === 1) return player.hasSkill("lit_lantong") && player.hasUsableCard("tao");
            return player.hp > 2;
        },
        async cost(event, trigger, player) {
            const result = await player
                .chooseNumbers(get.prompt2("lit_zishaV2"), [{ prompt: "请选择你要失去的体力值", min: 1, max: player.getHp() }])
                .set("processAI", () => {
                    if (player.hp === 2) return false;
                    if (player.hp === 1 && player.hasSkill("lit_lantong") && player.hasUsableCard("tao")) return [1];
                    return [player.hp - 2];
                }).forResult();
            event.result = {
                bool: result.bool,
                cost_data: result.bool ? result.numbers[0] : 0,
            };
        },
        async content(event, trigger, player) {
            await player.loseHp(parseInt(event.cost_data));
            await player.draw(2 * parseInt(event.cost_data));
        },
        ai: {
            result: {
                player: (player) => {
                    if (player.hp === 1 && player.canSave(player)) return 2;
                    return player.hp - 2.5;
                },
            },
        },
    },
    lit_lantong: {
        trigger: {
            target: "taoBegin",
        },
        forced: true,
        filter: (event, player) => {
            return player.sameSexAs(event.player);
        },
        async content(event, trigger, player) {
            trigger.baseDamage++;
        },
    },
};

export const translate = {
'lit_zhangqinyi张钦奕': "张钦奕",
    'lit_danke': "蛋壳",
    'lit_danke_info': `锁定技，准备阶段，你令其他角色失去${X}点体力，回合结束后，其恢复${X}点体力，溢出的恢复量转为护甲（${X}为其体力值减1）`,
    'lit_zisha': "紫砂",
    'lit_zisha_info': "锁定技，当你体力值为2时，你使用的牌不能被响应",
    'lit_lantong': "蓝酮",
    'lit_lantong_info': "锁定技，当同性角色对你使用【桃】时，你恢复的体力值+1",
};

export const simpleTranslate = {
    'lit_danke_info': `锁；准备阶段令他人-${X}血，回合结束后其+${X}血，溢出量转为护甲（${X}为其血量-1）`,
    'lit_zisha_info': "锁；血=2时，所有牌不能被响应",
    'lit_lantong_info': "锁；同性对你的桃治疗量+1",
};

// 拆分后补回的旧集中数据
Object.assign(translate, {
    'lit_shengjizqy': "升级·张钦奕",
    'lit_shengjizqy_info': `${get.poptip('lit_zishaV2')} 获得〖紫砂〗并于开头增加：准备阶段，你可以失去${Y}点体力，然后摸2${Y}张牌（${Y}不超过体力值）`,
});

Object.assign(simpleTranslate, {
    'lit_shengjizqy_info': `${get.poptip('lit_zishaV2')} 获得“紫砂”并于开头增加：准备阶段可-${Y}血+2${Y}牌（${Y}不超过体力值`,

});

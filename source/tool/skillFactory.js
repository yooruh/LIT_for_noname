/**
 * 叁岛世界 — 技能工厂函数
 *
 * 提供常用技能子模式的创建函数，消除重复的样板代码。
 * 所有函数返回完整的技能定义对象的一部分（子技能定义）。
 */

import { lib, game, ui, get, ai, _status } from '../../../../noname.js';

// ════════════════════════════════════════════════════════════
//  通用工具
// ════════════════════════════════════════════════════════════

/**
 * 获取当前游戏中的叁岛势力列表（考虑国战键势力）
 * @returns {string[]}
 */
export function getLitGroups() {
    const groups = ['nine', 'three'];
    if (lib.lit?.isGuozhanKeyEnabled?.()) groups.push('key');
    return groups;
}

/**
 * 创建"一次性使用"标记子技能 (charlotte 模式)
 * 用于限制技能每回合/每阶段只能使用一次
 *
 * @param {string} sourceSkill 父技能名
 * @param {string} [suffix='used'] 子技能后缀
 * @param {string} [expire='phaseUseEnd'] 过期时机
 * @returns {object} 子技能定义对象
 */
export function usedSubSkill(sourceSkill, suffix = 'used', expire = 'phaseUseEnd') {
    const name = sourceSkill;
    const subName = suffix;
    return {
        [subName]: {
            charlotte: true,
            sub: true,
            sourceSkill: name,
        },
    };
}

/**
 * 创建标准负面效果技能骨架
 * 内置 lit_negClear 联动（优先级 -999，移除时自动清除标记）
 *
 * @param {string} name 技能名 (如 'lit_qianfan')
 * @param {object} overrides 覆盖/额外的技能属性
 * @returns {object} 完整技能定义
 */
export function negSkill(name, overrides = {}) {
    return {
        [name]: {
            derivation: ['lit_negClear_faq'],
            lit_neg: 1,
            forced: true,
            firstDo: true,
            mark: true,
            group: 'lit_negClear',
            trigger: { player: 'phaseBefore' },
            filter(event, player) {
                return event.player.hasSkill(name, null, false, true);
            },
            async content(event, trigger, player) {
                trigger.cancel();
            },
            ai: { neg: true },
            ...overrides,
        },
    };
}

/**
 * 创建标准"标记+说明"显示配置
 *
 * @param {string} marktext 标记文本 (1-2个汉字)
 * @param {string|object} intro 说明内容（字符串或 {name, content} 对象）
 * @param {object} [overrides] 覆盖属性
 * @returns {object} { mark, marktext, intro, ... }
 */
export function markInfo(marktext, intro, overrides = {}) {
    const introObj = typeof intro === 'string'
        ? { content: intro }
        : intro;
    return {
        mark: true,
        marktext,
        intro: introObj,
        ...overrides,
    };
}

/**
 * 生成标准子技能对应的一次性使用标记 (不同于 charlotte，基于子技能名)
 *
 * @param {string} parentSkillName 父技能名
 * @returns {{ charlotte: true, sub: true, sourceSkill: string }}
 */
export function markSubSkill(parentSkillName) {
    return {
        charlotte: true,
        sub: true,
        sourceSkill: parentSkillName,
    };
}

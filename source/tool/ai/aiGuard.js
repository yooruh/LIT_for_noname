import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';

/**
 * AI 防重试守卫：阻止 AI 在同一出牌阶段内、两次判断之间没有任何操作时，反复发动同一主动技
 * （这是"骚话/枝疏等技能让游戏卡死"的根源）。
 *
 * ── 使用方式（对每个 enable:'phaseUse' 且有 ai.order 的主动技接线）──
 *   ① ai.order 首行：
 *        if (lib.lit.aiGuard.blocked(player, '<技能扩展名>')) return -1;
 *      若原 ai.order 是数字常量（如 order:7），改写为：
 *        (item, player) => lib.lit.aiGuard.blocked(player, '<技能扩展名>') ? -1 : 7;
 *   ② content 首行：
 *        lib.lit.aiGuard.record(player, '<技能扩展名>');
 *      （<技能扩展名> 必须与 ai.order 收到的 item 一致：主技能如 lit_saohua，
 *        子技能/组技能如 lit_zhishu_use。）
 *   ③ 守卫表会在每个玩家的 phaseUseStart 由全局技能 lit_aiGuardReset 自动清空，无需手动处理。
 *   ⚠ 只影响 AI（只在 ai.order 中被读取）；人类玩家走 UI 选择，不受守卫约束。
 *
 * ── 原理 ──
 *   sum() = 本阶段 stat.card + stat.skill + stat.triggerSkill 的累计值（随出牌/发动技能单调递增）。
 *   record() 在 content 首行执行时，useSkill 的 step0 已使 stat.skill 加 1，
 *             记录的是"本次尝试刚发生"后的计数。
 *   blocked() 比较 record 与当前计数：若 content 空转，重评估时计数未变 → 命中 → ai.order 返回 -1；
 *             若 content 期间消耗了牌/发动了其他技能，计数 +1 → 守卫解除，可再次尝试。
 *   跨阶段碰撞由 phaseUseStart 清表消除（stat 各阶段重置，同名计数可能重复）。
 */
export const aiGuard = {
	// 本阶段内单调递增的"动作计数"：出牌 + 发动技能(含触发技)总数
	sum(player) {
		const s = player.getStat?.() || {};
		let n = 0;
		for (const k in s.card || {}) n += s.card[k] || 0;
		for (const k in s.skill || {}) n += s.skill[k] || 0;
		for (const k in s.triggerSkill || {}) n += s.triggerSkill[k] || 0;
		return n;
	},
	record(player, skill) {
		player.storage.lit_aiGuard ??= {};
		player.storage.lit_aiGuard[skill] = this.sum(player);
	},
	blocked(player, skill) {
		return player.storage.lit_aiGuard?.[skill] === this.sum(player);
	},
};

export const aiGuardReset = {
	trigger: { player: "phaseUseStart" },
	direct: true,
	charlotte: true,
	nopop: true,
	popup: false,
	silent: true,
	content() {
		player.storage.lit_aiGuard = {};
	},
};

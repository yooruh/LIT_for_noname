import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';

/**
 * AI 防重试守卫：阻止 AI 在同一出牌阶段内、两次判断之间没有任何操作时，反复发动同一主动技
 * （这是"骚话/枝疏等技能让游戏卡死"的根源）。
 *
 * ── 使用方式（对每个"content 内层选择可能失败而空转"的主动技接线）──
 *   ① ai.order 首行：
 *        if (lib.lit.aiGuard.blocked(player, '<技能扩展名>')) return -1;
 *      若原 ai.order 是数字常量（如 order:7），改写为：
 *        (item, player) => lib.lit.aiGuard.blocked(player, '<技能扩展名>') ? -1 : 7;
 *   ② content 首行：
 *        lib.lit.aiGuard.record(player, '<技能扩展名>');
 *      （<技能扩展名> 必须与 ai.order 收到的 item 一致：主技能如 lit_saohua，
 *        子技能/组技能如 lit_zhishu_use。）
 *   ③ 守卫表会在每个玩家的 phaseUseBegin 由全局技能 lit_aiGuardReset 自动清空，无需手动处理。
 *   ⚠ 只影响 AI（只在 ai.order 中被读取）；人类玩家走 UI 选择，不受守卫约束。
 *
 * ── 原理 ──
 *   sum() 配合 player.getAllHistory 与 game.getAllGlobalHistory 一起使用，
 *          把"玩家历史 + 全局历史"各事件数量全部累加，作为全局"操作"计数：
 *          玩家历史（逐玩家）：useSkill / useCard / respond / lose / gain / sourceDamage / damage / skipped
 *          全局历史（全体共有）：useCard / cardMove / changeHp
 *          → 值只增不减、天然单调，且与 player.getStat() 完全解耦，不受 addCount:false
 *            （不计入次数）、stat.skill=0（huxinyu 索敌）、stat.card--（liuchenmu 退款）、
 *            counttrigger-- 等一切 stat 干扰。
 *   （useSkill 不在全局历史里，故"发动技能"必须逐玩家用 player.getAllHistory("useSkill")。）
 *   record() 在 content 首行执行时，useSkill 的 history 入列（content.js step1）
 *             已在 info.content 之前完成 → 记录的是"本次尝试刚发生"后的累计值。
 *   blocked() 比较 record 与当前 sum：若尝试后无任何操作（出牌/发动技能/伤害/移牌/回血等），
 *             重评估时 sum 未变 → 命中 → ai.order 返回 -1；若期间任何玩家发生了上述任一事件，
 *             sum +1 → 守卫解除，可再试。成功的技能效果（骚话33造成伤害、枝疏拿回牌、
 *             期许判定移牌等）都会计入 → 减少对合法多段使用的误伤。
 *   跨阶段由 phaseUseBegin 清表消除（避免上一回合记录残留导致下回合开局误拦截）。
 */
export const aiGuard = {
	// 全局"操作"累计次数：玩家历史 + 全局历史 合并累加（只增不减）
	sum(player) {
		let n = 0;
		const all = (game.players || []).concat(game.dead || []);
		for (const p of all) {
			n += p.getAllHistory("useSkill").length
				+ p.getAllHistory("useCard").length
				+ p.getAllHistory("respond").length
				+ p.getAllHistory("lose").length
				+ p.getAllHistory("gain").length
				+ p.getAllHistory("sourceDamage").length
				+ p.getAllHistory("damage").length
				+ p.getAllHistory("skipped").length;
		}
		if (game.getAllGlobalHistory) {
			n += game.getAllGlobalHistory("useCard").length
				+ game.getAllGlobalHistory("cardMove").length
				+ game.getAllGlobalHistory("changeHp").length;
		}
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
	trigger: { player: "phaseUseBegin" },
	direct: true,
	charlotte: true,
	nopop: true,
	popup: false,
	silent: true,
	content() {
		player.storage.lit_aiGuard = {};
	},
};

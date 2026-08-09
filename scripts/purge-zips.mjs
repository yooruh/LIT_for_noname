#!/usr/bin/env node

/**
 * 叁岛世界 zips 分支清理脚本 —— 支持整体清除，或删除单个 zip 版本及其 Release
 *
 * 背景:
 *   发布脚本（publish.mjs）会把「发布 v{版本} 代码包」提交推送到 zips 分支，
 *   并为版本打 v{版本}-code-zip 标签（指向 zips 提交）。这些提交/标签不挂在 main 上，
 *   因此「清空 zips」需要连同标签与提交一起删除，而不只是删分支指针：
 *     1. 先删远端标签（否则一次 fetch 会把标签自动同步回本地，实测踩过的坑）
 *     2. 再删本地分支、标签、远端跟踪引用
 *     3. 过期 reflog 并强制 GC，物理抹掉不可达对象
 *
 * 运行时会先询问清理方式：
 *   1) 删除整个 zips 分支（本地 + GitHub/Gitee 远端，物理清除）
 *   2) 删除某个 zip 版本：移除 zips 分支上该版本的代码包文件 + 删除其 GitHub Release 与标签
 *
 * 用法:
 *   node scripts/purge-zips.mjs              交互询问清理方式
 *   node scripts/purge-zips.mjs --all        直接整体清除（跳过询问）
 *   node scripts/purge-zips.mjs --version <版本号>  直接删除指定 zip 版本及其 Release（跳过询问）
 *   通用选项:
 *     --dry-run / -d  仅预览将执行的操作，不写入
 *     --local         仅清除本地（不推送远端删除、不删除远端 Release）
 *     --yes           跳过不可逆确认（供脚本/CI 调用）
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log, stripV, withV, isValidVersion, releaseTag } from './lib/shared.mjs';
import { run, git, currentBranch, ask, confirm, closePrompts, cleanupWorktree, getRepoSlug } from './lib/git-cli.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SELF_PATH = fileURLToPath(import.meta.url);

const ZIP_BRANCH = 'zips';
const MAIN_BRANCH = 'main';
// 按版本删除时使用的临时工作树（整体清除直接删引用，用不到）
const VERSION_WORKTREE = resolve(ROOT, '..', '.zips-purge-worktree');

/** 本地 zips 分支是否存在 */
function hasZipsBranch() {
  return git(['rev-parse', '--verify', '-q', `refs/heads/${ZIP_BRANCH}`], { allowFail: true }).status === 0;
}

/** 远端跟踪引用 origin/zips 是否存在 */
function hasOriginZips() {
  return git(['rev-parse', '--verify', '-q', `refs/remotes/origin/${ZIP_BRANCH}`], { allowFail: true }).status === 0;
}

/**
 * 远端 zips 分支是否真实存在（ls-remote 直查，不依赖可能过期的跟踪引用）。
 * @returns {boolean|null} true=存在 / false=确认不存在 / null=查询失败（网络波动，无法确认）
 */
function remoteZipsExistsLive() {
  const res = run('git', ['ls-remote', '--heads', 'origin', `refs/heads/${ZIP_BRANCH}`], { allowFail: true });
  if (res.status !== 0) return null;
  return res.stdout.trim().length > 0;
}

/**
 * 收集「仅挂在 zips 上」的标签：可从 zips 到达、但不可从 main 到达。
 * 发布标签指向 zips 的「发布 v{版本} 代码包」提交，通常满足此条件。
 * @param {string} [ref] 计算合并标签所用的 zips 引用；默认本地分支，本地缺失时传 origin/zips
 * @returns {string[]}
 */
function zipsOnlyTags(ref = ZIP_BRANCH) {
  const fromZips = git(['tag', '--merged', ref], { allowFail: true }).stdout.split('\n').filter(Boolean);
  const fromMain = new Set(
    git(['tag', '--merged', MAIN_BRANCH]).stdout.split('\n').filter(Boolean)
  );
  return fromZips.filter((t) => !fromMain.has(t));
}

/**
 * 打印并执行一条 git 操作。execute=false 时仅预览不执行。
 * allowFail 时失败会以 WARN 提示并继续。
 */
function act(label, cmdArgs, { execute = true, allowFail = false } = {}) {
  const shown = `$ git ${cmdArgs.join(' ')}`;
  log.info(execute ? `${label}: ${shown}` : `[DRY-RUN] ${label}: ${shown}`);
  if (!execute) return null;
  const result = git(cmdArgs, { allowFail });
  if (allowFail && result.status !== 0) {
    log.warn(`  跳过（${result.stderr || result.stdout || '失败'}）`);
    return null;
  }
  return result;
}

/** 列出 zips 分支 release/code/ 下的代码包文件名（优先远端，其次本地） */
function listZipFilenames() {
  // 尽量用远端最新引用（断网时忽略，回退本地）
  run('git', ['fetch', 'origin', ZIP_BRANCH], { allowFail: true });
  let ref = null;
  if (hasOriginZips()) ref = `origin/${ZIP_BRANCH}`;
  else if (hasZipsBranch()) ref = ZIP_BRANCH;
  if (!ref) return [];
  const out = git(['ls-tree', '-r', '--name-only', ref, '--', 'release/code'], { allowFail: true });
  if (out.status !== 0) return [];
  return out.stdout
    .split('\n')
    .filter(Boolean)
    .map((p) => p.replace(/^release\/code\//, ''))
    .filter((name) => name.length > 0);
}

/** 从代码包文件名解析版本号（如 26.8.7.0-code.zip → 26.8.7.0） */
function versionFromFilename(name) {
  const m = String(name).match(/^(\d+\.\d+\.\d+(?:\.\d+)?)/);
  return m ? m[1] : null;
}

/** 收集 zips 分支上 版本号 → [文件名] 的映射 */
function collectZipVersions() {
  const map = new Map();
  for (const name of listZipFilenames()) {
    const v = versionFromFilename(name);
    if (!v) continue;
    if (!map.has(v)) map.set(v, []);
    map.get(v).push(name);
  }
  return map;
}

/** 取指定版本在 zips 分支上的全部文件（兼容 CJK 与 ASCII 两种命名） */
function resolveVersionFiles(version) {
  const v = stripV(version);
  return listZipFilenames().filter((name) => versionFromFilename(name) === v);
}

/** 版本号是否为当前发布版本（release/releases.json 最新） */
function isCurrentReleaseVersion(version) {
  try {
    const manifest = JSON.parse(readFileSync(resolve(ROOT, 'release', 'releases.json'), 'utf-8'));
    const latest = manifest?.releases?.[0];
    return !!latest && stripV(latest.version) === stripV(version);
  } catch {
    return false;
  }
}

/** 数值分段比较版本号（ascending） */
function compareVersion(a, b) {
  const pa = stripV(a).split('.').map(Number);
  const pb = stripV(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

/** 交互询问清理方式：'all' | 'version' | null(取消) */
async function chooseMode() {
  console.log('');
  console.log('请选择清理方式:');
  console.log('  1) 删除整个 zips 分支（连同发布标签与提交，物理清除）');
  console.log('  2) 删除某个 zip 版本（移除代码包 + 删除其 GitHub Release 与标签）');
  console.log('  3) 取消');
  const answer = await ask('请输入序号（1/2/3，回车默认 1）: ');
  if (answer === '2') return 'version';
  if (answer === '3' || /^q|quit|cancel$/i.test(answer)) return null;
  return 'all';
}

/** 交互选择要删除的版本；支持输入序号或版本号，留空/无效返回 null */
async function chooseVersion(versions) {
  const list = [...versions.keys()].sort(compareVersion).reverse(); // 新版本在前
  console.log('');
  console.log(`zips 分支上现有代码包版本（共 ${list.length} 个）:`);
  list.forEach((v, i) => console.log(`  ${i + 1}) ${v}`));
  const answer = await ask('\n请输入要删除的版本号或序号（留空取消）: ');
  if (!answer) return null;
  const idx = Number(answer);
  if (Number.isInteger(idx) && idx >= 1 && idx <= list.length) return list[idx - 1];
  const exact = list.find((v) => v === stripV(answer));
  if (exact) return exact;
  log.warn(`未找到版本 ${answer}`);
  return null;
}

/** 整体清除 zips 分支（本地 + GitHub/Gitee 远端，物理抹除） */
async function purgeAll({ dryRun, localOnly, skipConfirm }) {
  const hasLocal = hasZipsBranch();
  // 远端存在性：ls-remote 直查为权威；查询失败（网络波动）返回 null，视为“可能存在”，宁可多试一次删除
  const remoteLive = remoteZipsExistsLive();
  const remoteConfirmedAbsent = remoteLive === false && !hasOriginZips();

  // 即使本地分支不存在，只要远端还存在（或查询失败无法确认）就继续，避免“本地删了但远端没删掉”
  if (!hasLocal && remoteConfirmedAbsent) {
    log.warn(`${ZIP_BRANCH} 分支不存在（本地与远端均无），无需清除`);
    return;
  }
  if (!hasLocal) {
    log.info(`${ZIP_BRANCH} 本地分支不存在，将清理远端残留（GitHub + Gitee）`);
  }

  // 标签计算基准：优先本地分支，其次远端跟踪引用（本地缺失时仍可枚举）
  const tagRef = hasLocal ? ZIP_BRANCH : (hasOriginZips() ? `origin/${ZIP_BRANCH}` : null);

  // ① 若当前在 zips 上，先切到 main（git 不允许删除当前分支；本地不存在时不可能在其上）
  if (hasLocal && currentBranch() === ZIP_BRANCH) {
    log.info(`当前在 ${ZIP_BRANCH} 上，先切换到 ${MAIN_BRANCH}（若失败请先处理工作区改动）`);
    act('切换到 main', ['switch', MAIN_BRANCH], { execute: !dryRun });
  }

  // ② 收集仅挂在 zips 上的发布标签
  const tags = tagRef ? zipsOnlyTags(tagRef) : [];
  if (tags.length > 0) {
    log.info(`发现 ${tags.length} 个仅挂在 ${ZIP_BRANCH} 上的标签: ${tags.join(', ')}`);
  } else {
    log.info(`未发现仅挂在 ${ZIP_BRANCH} 上的标签`);
  }

  // 不可逆确认（在任何删除动作之前；dry-run 不确认）
  const scope = localOnly ? '本地' : (hasLocal ? '本地 + GitHub/Gitee 远端' : 'GitHub/Gitee 远端（本地分支已不存在）');
  if (!dryRun && !skipConfirm) {
    const ok = await confirm(
      `确认彻底清除 ${ZIP_BRANCH} 及其提交（${scope}）？此操作不可逆`
    );
    if (!ok) {
      log.warn('已取消，未执行任何删除');
      return;
    }
  }

  // ③ 先删远端标签/分支（防止 fetch 自动同步回本地），再删本地
  if (!localOnly && (remoteLive === true || remoteLive === null)) {
    for (const t of tags) {
      act(`删除远端标签 ${t}（GitHub + Gitee）`, ['push', 'origin', '--delete', `refs/tags/${t}`], {
        execute: !dryRun,
        allowFail: true,
      });
    }
    act(`删除远端分支 ${ZIP_BRANCH}`, ['push', 'origin', '--delete', `refs/heads/${ZIP_BRANCH}`], {
      execute: !dryRun,
      allowFail: true,
    });
  } else if (!localOnly && remoteLive === false && hasOriginZips()) {
    log.info(`远端已无 ${ZIP_BRANCH} 分支，仅清理本地残留跟踪引用`);
  }

  // ④ 删除本地标签、分支与远端跟踪引用（本地缺失时只清理跟踪引用）
  if (tags.length > 0) {
    act('删除本地标签', ['tag', '-d', ...tags], { execute: !dryRun });
  }
  if (hasLocal) {
    act(`删除本地分支 ${ZIP_BRANCH}`, ['branch', '-D', ZIP_BRANCH], { execute: !dryRun });
  }
  if (hasOriginZips()) {
    act(`删除远端跟踪引用 origin/${ZIP_BRANCH}`, ['branch', '-rd', `origin/${ZIP_BRANCH}`], {
      execute: !dryRun,
      allowFail: true,
    });
  }

  // ⑤ 过期全部 reflog + 强制 GC，物理抹掉不可达对象（不可逆）
  act('过期全部 reflog', ['reflog', 'expire', '--expire=now', '--all'], { execute: !dryRun });
  act('强制 GC 清理不可达对象', ['gc', '--prune=now'], { execute: !dryRun });

  if (dryRun) {
    console.log('\n\x1b[33m（预览模式，未写入任何文件）\x1b[0m');
    return;
  }

  log.ok(`${ZIP_BRANCH} 已彻底清除（${scope}），不可达提交已物理抹除`);
}

/** 从 zips 分支移除指定版本的代码包文件（工作树 rm + commit + push） */
function removeVersionFiles(version, filenames, { dryRun, localOnly }) {
  const files = filenames.map((f) => `release/code/${f}`);
  log.info('将移除 zips 分支文件:');
  files.forEach((f) => log.info(`  ${f}`));

  if (dryRun) {
    const startPoint = hasOriginZips() ? `origin/${ZIP_BRANCH}` : ZIP_BRANCH;
    log.info(`[DRY-RUN] git worktree add -B ${ZIP_BRANCH} <worktree> ${startPoint}`);
    log.info(`[DRY-RUN] git rm ${files.join(' ')}`);
    log.info(`[DRY-RUN] git commit -m "移除 v${version} 代码包"`);
    if (!localOnly) log.info(`[DRY-RUN] git push origin ${ZIP_BRANCH}（GitHub + Gitee）`);
    return;
  }

  try {
    const startPoint = hasOriginZips() ? `origin/${ZIP_BRANCH}` : ZIP_BRANCH;
    run('git', ['worktree', 'add', '-B', ZIP_BRANCH, VERSION_WORKTREE, startPoint]);

    run('git', ['rm', '-q', ...files], { cwd: VERSION_WORKTREE });
    run('git', ['commit', '-m', `移除 v${version} 代码包`], { cwd: VERSION_WORKTREE });
    log.ok(`已从本地 zips 分支移除 v${version} 代码包`);

    if (!localOnly) {
      const res = run('git', ['push', 'origin', ZIP_BRANCH], { allowFail: true });
      if (res.status === 0) log.ok(`已推送 zips 分支（GitHub + Gitee）`);
      else log.warn(`推送 zips 分支失败: ${res.stderr || res.stdout || '未知原因'}`);
    }
  } finally {
    cleanupWorktree(VERSION_WORKTREE);
  }
}

/** 删除指定版本的 GitHub Release（先探存在，兼容旧式 v{版本} 标签） */
function deleteGitHubRelease(version) {
  const repo = getRepoSlug();
  if (!repo) {
    log.warn('无法从 origin 解析 owner/repo，跳过 GitHub Release 删除');
    return;
  }
  // 依次探测：现行 v{版本}-code-zip，以及旧式 v{版本}（历史 Release 的标签命名）
  const candidates = [releaseTag(version), withV(version)];
  for (const tag of candidates) {
    const view = run('gh', ['release', 'view', tag, '--repo', repo], { allowFail: true });
    if (view.status !== 0) continue; // 无该 Release
    const res = run('gh', ['release', 'delete', tag, '--repo', repo, '--yes'], { allowFail: true });
    if (res.status === 0) log.ok(`已删除 GitHub Release ${tag}`);
    else log.warn(`GitHub Release ${tag} 删除失败: ${res.stderr || res.stdout || '未知原因'}`);
  }
}

/** 删除指定版本的发布标签（本地 + 远端 origin，覆盖 GitHub/Gitee） */
function deleteReleaseTag(version, { dryRun, localOnly }) {
  const tags = [releaseTag(version)];
  // 旧式 v{版本} 标签存在时一并删除（v{版本} 同时可能是分支，只删 refs/tags/ 不影响分支）
  if (git(['rev-parse', '--verify', '-q', `refs/tags/${withV(version)}`], { allowFail: true }).status === 0) {
    tags.push(withV(version));
  }

  for (const t of tags) {
    if (dryRun) {
      log.info(`[DRY-RUN] 删除标签 ${t}（本地${localOnly ? '' : ' + GitHub/Gitee 远端'}）`);
      continue;
    }
    run('git', ['tag', '-d', t], { allowFail: true });
    if (!localOnly) {
      const res = run('git', ['push', 'origin', '--delete', `refs/tags/${t}`], { allowFail: true });
      if (res.status === 0) log.ok(`已删除远端标签 ${t}`);
      else log.warn(`远端标签 ${t} 删除失败（可能不存在）: ${res.stderr || res.stdout || ''}`);
    }
  }
}

/** 删除某个 zip 版本：移除代码包文件 + 删除其 GitHub Release 与标签 */
async function purgeVersion(version, { dryRun, localOnly, skipConfirm }) {
  const filenames = resolveVersionFiles(version);
  if (filenames.length === 0) {
    log.warn(`zips 分支上未找到版本 ${version} 的代码包（可能已被清理或从未发布）`);
  }

  if (isCurrentReleaseVersion(version)) {
    log.warn(`⚠️ ${version} 是当前发布版本（release/releases.json），删除后在线更新将不可用，请谨慎！`);
  }

  log.info(`目标版本: ${version}`);
  if (filenames.length > 0) {
    log.info('zips 分支代码包文件:');
    filenames.forEach((f) => log.info(`  release/code/${f}`));
  }
  log.info(`Release 与标签: ${releaseTag(version)}${localOnly ? '（仅本地）' : '（含远端）'}`);

  if (dryRun) {
    if (filenames.length > 0) removeVersionFiles(version, filenames, { dryRun: true, localOnly });
    if (!localOnly) {
      const repo = getRepoSlug() || 'owner/repo';
      log.info(`[DRY-RUN] gh release delete ${releaseTag(version)} --repo ${repo} --yes`);
    }
    deleteReleaseTag(version, { dryRun: true, localOnly });
    console.log('\n\x1b[33m（预览模式，未执行任何写操作）\x1b[0m');
    return;
  }

  // 不可逆确认
  if (!skipConfirm) {
    const ok = await confirm(
      `确认删除版本 ${version} 的代码包${localOnly ? '（仅本地）' : '及 GitHub Release（本地 + 远端）'}？此操作不可逆`
    );
    if (!ok) {
      log.warn('已取消，未执行任何删除');
      return;
    }
  }

  if (filenames.length > 0) {
    removeVersionFiles(version, filenames, { dryRun, localOnly });
  }

  if (!localOnly) {
    deleteGitHubRelease(version);
  }

  deleteReleaseTag(version, { dryRun, localOnly });

  log.ok(`版本 ${version} 清理完成`);
}

function printUsage() {
  console.log(`用法:
  node scripts/purge-zips.mjs              交互询问清理方式（整体清除 / 按版本删除）
  node scripts/purge-zips.mjs --all        直接整体清除（跳过询问）
  node scripts/purge-zips.mjs --version <版本号>  直接删除指定 zip 版本及其 Release（跳过询问）
  node scripts/purge-zips.mjs --dry-run    仅预览将执行的操作，不写入
  node scripts/purge-zips.mjs --local      仅清除本地（不推送远端删除）
  node scripts/purge-zips.mjs --yes        跳过不可逆确认（供脚本/CI 调用）`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const localOnly = args.includes('--local');
  const skipConfirm = args.includes('--yes');
  const allMode = args.includes('--all');
  const versionIndex = args.indexOf('--version');
  const hasVersionFlag = versionIndex >= 0;
  const versionArg = hasVersionFlag ? args[versionIndex + 1] : null;

  if (git(['rev-parse', '--is-inside-work-tree'], { allowFail: true }).status !== 0) {
    log.error('必须在 git 仓库内运行本脚本');
    process.exit(1);
  }

  const hasLocal = hasZipsBranch();
  const hasTracking = hasOriginZips();
  const remoteLive = remoteZipsExistsLive();
  if (!hasLocal && !hasTracking && remoteLive !== true) {
    log.warn('zips 分支不存在（本地与远端均无，或远端查询失败），无需清理');
    return;
  }

  try {
    // 确定清理方式
    let mode = null;
    let version = null;
    if (allMode) {
      mode = 'all';
    } else if (hasVersionFlag) {
      if (!versionArg || !isValidVersion(versionArg)) {
        log.error(`无效的版本号: ${versionArg}，正确格式如 26.3.15.3`);
        printUsage();
        process.exit(1);
      }
      mode = 'version';
      version = stripV(versionArg);
    } else if (skipConfirm) {
      // CI 场景：未指定方式时沿用原行为（整体清除），不阻塞交互
      mode = 'all';
    } else {
      mode = await chooseMode();
      if (!mode) {
        log.warn('已取消');
        return;
      }
      if (mode === 'version') {
        const versions = collectZipVersions();
        if (versions.size === 0) {
          log.warn('zips 分支上没有可枚举的代码包版本，请改用 --all 或指定 --version');
          return;
        }
        version = await chooseVersion(versions);
        if (!version) {
          log.warn('已取消');
          return;
        }
      }
    }

    if (mode === 'all') {
      await purgeAll({ dryRun, localOnly, skipConfirm });
    } else {
      await purgeVersion(version, { dryRun, localOnly, skipConfirm });
    }
  } finally {
    closePrompts();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === SELF_PATH) {
  main().catch((error) => {
    log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

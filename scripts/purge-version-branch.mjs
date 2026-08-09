#!/usr/bin/env node

/**
 * 叁岛世界 版本分支清理脚本 —— 删除某个 v{版本} 分支（本地 + GitHub/Gitee 远端），
 * 分支受保护/只读时提示，删除后清理无引用的 git 提交。
 *
 * 背景:
 *   发布脚本（publish.mjs）每次发布都会推送一个 v{版本} 分支（基于 main，仅移除 version.json）。
 *   这些分支长期积累会占用远端分支列表。删除时需同时清理本地、远端(GitHub+Gitee)
 *   与远端跟踪引用；GitHub 分支保护会使远端删除被拒，脚本会先探测并提示。
 *   删除版本分支时，会顺带复用 purge-zips.mjs 的按版本删除逻辑，清理该版本在 zips 分支上的
 *   代码包及其 GitHub Release/标签（如有），避免留下孤儿发布产物。
 *
 * 用法:
 *   node scripts/purge-version-branch.mjs                 交互选择要删除的版本分支
 *   node scripts/purge-version-branch.mjs <版本号>         直接删除指定版本分支
 *   node scripts/purge-version-branch.mjs --version <版本号>  同上（显式写法）
 *   node scripts/purge-version-branch.mjs --list          仅列出可用的版本分支，不删除
 *   通用选项:
 *     --dry-run / -d  仅预览将执行的操作，不写入
 *     --local         仅删除本地（不推送远端删除）
 *     --yes           跳过不可逆确认（供脚本/CI 调用，必须显式指定版本）
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log, stripV, withV, isValidVersion } from './lib/shared.mjs';
import { run, git, currentBranch, ask, confirm, closePrompts, getRepoSlug, remoteBranchExists } from './lib/git-cli.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SELF_PATH = fileURLToPath(import.meta.url);

const MAIN_BRANCH = 'main';
// v{版本} 分支名（如 v26.8.7.0）
const BRANCH_RE = /^v\d+\.\d+\.\d+(?:\.\d+)?$/;

/** 数值分段比较版本号（ascending），用于把版本分支按新旧排序 */
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

/** 版本号是否为当前发布版本（release/releases.json 最新）；删除其代码包/Release 会使在线更新不可用 */
function isCurrentReleaseVersion(version) {
  try {
    const manifest = JSON.parse(readFileSync(resolve(ROOT, 'release', 'releases.json'), 'utf-8'));
    const latest = manifest?.releases?.[0];
    return !!latest && stripV(latest.version) === stripV(version);
  } catch {
    return false;
  }
}

/** 收集本地 + 远端(origin) 的 v{版本} 分支名（新版本在前） */
function listVersionBranches() {
  const set = new Set();
  const collect = (refPrefix, stripOrigin) => {
    const out = run('git', ['for-each-ref', '--format=%(refname:short)', refPrefix], { allowFail: true });
    if (out.status !== 0) return;
    for (const name of out.stdout.split('\n').filter(Boolean)) {
      const short = stripOrigin ? name.replace(/^origin\//, '') : name;
      if (BRANCH_RE.test(short)) set.add(short);
    }
  };
  collect('refs/heads/', false);
  collect('refs/remotes/origin/', true);
  return [...set].sort(compareVersion).reverse();
}

/** 分支的本地/远端存在情况描述 */
function describeBranch(branch) {
  const local = git(['rev-parse', '--verify', '-q', `refs/heads/${branch}`], { allowFail: true }).status === 0;
  const remote = git(['rev-parse', '--verify', '-q', `refs/remotes/origin/${branch}`], { allowFail: true }).status === 0;
  if (local && remote) return `${branch}（本地 + 远端）`;
  if (local) return `${branch}（仅本地）`;
  return `${branch}（仅远端）`;
}

/** 检查 GitHub 分支保护；返回 { protected, checkable, allowDeletions } */
function branchProtection(branch) {
  const repo = getRepoSlug();
  if (!repo) return { protected: false, checkable: false };
  // gh 不可用时无法检查
  if (run('gh', ['--version'], { allowFail: true }).status !== 0) return { protected: false, checkable: false };
  const res = run('gh', ['api', `repos/${repo}/branches/${encodeURIComponent(branch)}/protection`], { allowFail: true });
  if (res.status !== 0) return { protected: false, checkable: true }; // 404 = 无保护
  let data = null;
  try { data = JSON.parse(res.stdout); } catch { /* 解析失败按受保护处理 */ }
  return { protected: true, checkable: true, allowDeletions: !!data?.allow_deletions?.enabled, data };
}

/** 删除版本分支（本地 + 远端 + 远端跟踪引用）；返回是否实际删除了某个引用 */
function deleteVersionBranch(branch, { dryRun, localOnly }) {
  const hasLocal = git(['rev-parse', '--verify', '-q', `refs/heads/${branch}`], { allowFail: true }).status === 0;
  const hasRemoteTrack = git(['rev-parse', '--verify', '-q', `refs/remotes/origin/${branch}`], { allowFail: true }).status === 0;
  // 远端存在性：ls-remote 直查为权威；查询失败（网络波动）返回 null，视为“可能存在”，宁可多试一次 push
  const remoteLive = remoteBranchExists(branch);
  const remoteExists = remoteLive === true;
  const remoteNeedsDelete = !localOnly && (remoteLive === true || remoteLive === null);

  if (dryRun) {
    if (hasLocal) log.info(`[DRY-RUN] git branch -D ${branch}`);
    if (hasRemoteTrack) log.info(`[DRY-RUN] git branch -rd origin/${branch}`);
    if (remoteNeedsDelete) {
      log.info(`[DRY-RUN] git push origin --delete refs/heads/${branch}（GitHub + Gitee）${remoteLive === null ? '；远端存在性未知，将尝试删除' : ''}`);
    }
    return hasLocal || remoteExists;
  }

  let removedAny = false;

  if (hasLocal) {
    if (currentBranch() === branch) {
      log.warn(`当前就在 ${branch} 上，先切换到 ${MAIN_BRANCH}`);
      run('git', ['switch', MAIN_BRANCH]);
    }
    const res = run('git', ['branch', '-D', branch], { allowFail: true });
    if (res.status === 0) {
      log.ok(`已删除本地分支 ${branch}`);
      removedAny = true;
    } else {
      log.warn(`本地分支删除失败: ${res.stderr || res.stdout || ''}`);
    }
  } else {
    log.info(`本地无分支 ${branch}`);
  }

  if (!localOnly) {
    if (remoteNeedsDelete) {
      const res = run('git', ['push', 'origin', '--delete', `refs/heads/${branch}`], { allowFail: true });
      if (res.status === 0) {
        log.ok(`已删除远端分支 ${branch}（GitHub + Gitee）`);
        removedAny = true;
      } else {
        log.warn(`远端分支删除失败（可能受保护/只读、远端已不存在，或网络异常）: ${res.stderr || res.stdout || ''}`);
        const repo = getRepoSlug();
        if (repo && /protected|rejected|non-fast-forward|deny|permission/i.test(res.stderr + res.stdout)) {
          log.warn(`提示: gh api repos/${repo}/branches/${branch}/protection 可查看保护规则`);
        }
      }
    } else {
      log.info(`远端无分支 ${branch}`);
    }
  }

  if (hasRemoteTrack) {
    run('git', ['branch', '-rd', `origin/${branch}`], { allowFail: true });
  }

  return removedAny;
}

/** 删除后清理无引用的 git 提交（reflog expire + 强制 GC） */
function gcUnreferenced({ dryRun }) {
  if (dryRun) {
    log.info('[DRY-RUN] git reflog expire --expire=now --all');
    log.info('[DRY-RUN] git gc --prune=now');
    return;
  }
  log.info('清理无引用的 git 提交...');
  run('git', ['reflog', 'expire', '--expire=now', '--all'], { allowFail: true });
  run('git', ['gc', '--prune=now'], { allowFail: true });
  log.ok('无引用 git 提交已清理');
}

/**
 * 复用 purge-zips.mjs 的“按版本删除”逻辑，清理该版本的代码包 + GitHub Release + 标签。
 * 父脚本已向用户确认，故以 --yes 调用子脚本跳过其自身确认，并转发子脚本输出。
 */
function cleanupZipVersionViaSubprocess(version, { dryRun, localOnly }) {
  const script = resolve(ROOT, 'scripts', 'purge-zips.mjs');
  const args = [script, '--version', version];
  if (dryRun) args.push('--dry-run');
  if (localOnly) args.push('--local');
  args.push('--yes');
  log.info(`调用: node ${args.join(' ')}`);
  const res = run('node', args, { allowFail: true, cwd: ROOT });
  if (res.stdout) process.stdout.write((res.stdout.endsWith('\n') ? res.stdout : res.stdout + '\n'));
  if (res.stderr) process.stderr.write(res.stderr + '\n');
  if (res.status !== 0) {
    log.warn(`代码包/Release 清理未完全成功（退出码 ${res.status}）`);
  }
}

/** 交互选择要删除的版本分支；支持序号或版本号，留空/无效返回 null */
async function chooseVersionBranch(list) {
  console.log('');
  console.log(`现有版本分支（共 ${list.length} 个）:`);
  list.forEach((b, i) => console.log(`  ${i + 1}) ${describeBranch(b)}`));
  const answer = await ask('\n请输入要删除的版本分支号或版本号（留空取消）: ');
  if (!answer) return null;
  const idx = Number(answer);
  if (Number.isInteger(idx) && idx >= 1 && idx <= list.length) return list[idx - 1];
  const v = stripV(answer);
  const exact = list.find((b) => stripV(b) === v);
  if (exact) return exact;
  log.warn(`未找到版本分支 ${answer}`);
  return null;
}

/** 删除单个版本分支主流程 */
async function purgeOne(version, { dryRun, localOnly, skipConfirm }) {
  const branch = withV(version);
  const hasLocal = git(['rev-parse', '--verify', '-q', `refs/heads/${branch}`], { allowFail: true }).status === 0;
  // 远端存在性：ls-remote 直查；查询失败（网络波动）返回 null，视为可能存在并继续尝试删除
  const remoteLive = remoteBranchExists(branch);

  // 仅当“本地无 且 确认远端无”才跳过；查询失败时仍继续，避免网络波动导致远端残留
  if (!hasLocal && remoteLive === false) {
    log.warn(`未找到版本分支 ${branch}（本地与远端均无）`);
    return;
  }

  log.info(`目标版本分支: ${branch}`);

  // 分支保护 / 只读检查（仅远端删除有意义）
  if (!localOnly) {
    const prot = branchProtection(branch);
    if (prot.protected) {
      if (prot.allowDeletions) {
        log.warn(`⚠️ ${branch} 受 GitHub 分支保护，但已启用 allow_deletions，删除可能被允许`);
      } else {
        log.warn(`⚠️ ${branch} 受 GitHub 分支保护（只读），远端删除大概率会被拒绝；本地删除不受影响`);
      }
    } else if (prot.checkable) {
      log.info(`✓ ${branch} 未受 GitHub 分支保护`);
    }
  }

  // 删除分支会顺带清理该版本的代码包/Release，若为当前发布版本需提前警告
  if (isCurrentReleaseVersion(version)) {
    log.warn(`⚠️ ${version} 是当前发布版本（release/releases.json），删除其代码包/Release 后在线更新将不可用，请谨慎！`);
  }

  if (dryRun) {
    log.info('将删除:');
    if (hasLocal) log.info('  本地分支');
    if ((remoteLive === true || remoteLive === null) && !localOnly) log.info('  远端分支（GitHub + Gitee）');
    log.info('并顺带清理该版本的代码包与 GitHub Release/标签（如有）');
    log.info('删除后将清理无引用的 git 提交（reflog expire + gc --prune=now）');
    cleanupZipVersionViaSubprocess(version, { dryRun: true, localOnly }); // 转发子脚本 dry-run 计划
    console.log('\n\x1b[33m（预览模式，未执行任何写操作）\x1b[0m');
    return;
  }

  // 不可逆确认
  if (!skipConfirm) {
    const ok = await confirm(
      `确认删除版本分支 ${branch} 及其代码包/Release${localOnly ? '（仅本地）' : '（本地 + GitHub/Gitee 远端）'}？此操作不可逆`
    );
    if (!ok) {
      log.warn('已取消');
      return;
    }
  }

  const removedAny = deleteVersionBranch(branch, { dryRun, localOnly });
  cleanupZipVersionViaSubprocess(version, { dryRun, localOnly });
  if (removedAny) {
    gcUnreferenced({ dryRun });
  }
  log.ok(`版本分支 ${branch} 清理完成`);
}

function printUsage() {
  console.log(`用法:
  node scripts/purge-version-branch.mjs                 交互选择要删除的版本分支
  node scripts/purge-version-branch.mjs <版本号>         直接删除指定版本分支
  node scripts/purge-version-branch.mjs --version <版本号>  同上（显式写法）
  node scripts/purge-version-branch.mjs --list          仅列出可用的版本分支，不删除
  node scripts/purge-version-branch.mjs --dry-run       仅预览将执行的操作，不写入
  node scripts/purge-version-branch.mjs --local         仅删除本地（不推送远端删除）
  node scripts/purge-version-branch.mjs --yes           跳过不可逆确认（CI，必须显式指定版本）`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const localOnly = args.includes('--local');
  const skipConfirm = args.includes('--yes');
  const listOnly = args.includes('--list');
  const versionIndex = args.indexOf('--version');
  const versionArg = versionIndex >= 0 ? args[versionIndex + 1] : null;
  const positional = args.find((a) => a && !a.startsWith('-'));
  const requested = versionArg || positional;

  if (git(['rev-parse', '--is-inside-work-tree'], { allowFail: true }).status !== 0) {
    log.error('必须在 git 仓库内运行本脚本');
    process.exit(1);
  }

  // 尽量刷新远端引用，保证列出的版本分支最新（断网时忽略）
  run('git', ['fetch', 'origin', '--prune'], { allowFail: true });

  const versions = listVersionBranches();

  if (listOnly) {
    if (versions.length === 0) {
      log.warn('未发现版本分支');
    } else {
      versions.forEach((b) => console.log(`  ${describeBranch(b)}`));
    }
    return;
  }

  try {
    let target = null;
    if (requested) {
      if (!isValidVersion(requested)) {
        log.error(`无效的版本号: ${requested}，正确格式如 26.8.7.0`);
        printUsage();
        process.exit(1);
      }
      target = stripV(requested);
    } else if (skipConfirm) {
      log.error('CI 场景必须显式指定版本（--version <版本号>），避免误删');
      printUsage();
      process.exit(1);
    } else {
      if (versions.length === 0) {
        log.warn('未发现可删除的版本分支');
        return;
      }
      const picked = await chooseVersionBranch(versions);
      if (!picked) {
        log.warn('已取消');
        return;
      }
      target = stripV(picked);
    }

    await purgeOne(target, { dryRun, localOnly, skipConfirm });
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

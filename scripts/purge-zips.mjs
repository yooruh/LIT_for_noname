#!/usr/bin/env node

/**
 * 叁岛世界 zips 分支清理脚本 —— 连同提交一起彻底删除 zips 分支
 *
 * 背景:
 *   发布脚本（publish.mjs）会把「发布 v{版本} 代码包」提交推送到 zips 分支，
 *   并为版本打 v{版本} 标签（指向 zips 提交）。这些提交/标签不挂在 main 上，
 *   因此「清空 zips」需要连同标签与提交一起删除，而不只是删分支指针：
 *     1. 先删远端标签（否则一次 fetch 会把标签自动同步回本地，实测踩过的坑）
 *     2. 再删本地分支、标签、远端跟踪引用
 *     3. 过期 reflog 并强制 GC，物理抹掉不可达对象
 *
 * 用法:
 *   node scripts/purge-zips.mjs              彻底清除（本地 + GitHub/Gitee 远端）
 *   node scripts/purge-zips.mjs --dry-run    仅预览将执行的操作，不写入
 *   node scripts/purge-zips.mjs --local      仅清除本地（不推送远端删除）
 *   node scripts/purge-zips.mjs --yes        跳过不可逆确认（供脚本/CI 调用）
 */

import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from './lib/shared.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SELF_PATH = fileURLToPath(import.meta.url);

const ZIP_BRANCH = 'zips';
const MAIN_BRANCH = 'main';

/** 执行命令并返回 {status, stdout, stderr}；allowFail 时不因失败抛错 */
function run(cmd, args, { allowFail = false } = {}) {
  const result = spawnSync(cmd, args, {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const output = {
    status: result.status,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
  };
  if (!allowFail && result.status !== 0) {
    throw new Error(
      `命令执行失败: ${cmd} ${args.join(' ')}\n` +
      (output.stderr || output.stdout || '（无输出）')
    );
  }
  return output;
}

/** 执行一条 git 命令（失败抛错，或返回 allowFail 结果） */
function git(args, opts) {
  return run('git', args, opts);
}

/** 当前分支名 */
function currentBranch() {
  return git(['rev-parse', '--abbrev-ref', 'HEAD']).stdout;
}

/** zips 分支是否存在 */
function hasZipsBranch() {
  return git(['rev-parse', '--verify', `refs/heads/${ZIP_BRANCH}`], { allowFail: true }).status === 0;
}

/**
 * 收集「仅挂在 zips 上」的标签：可从 zips 到达、但不可从 main 到达。
 * 发布标签指向 zips 的「发布 v{版本} 代码包」提交，通常满足此条件。
 * @returns {string[]}
 */
function zipsOnlyTags() {
  const fromZips = git(['tag', '--merged', ZIP_BRANCH]).stdout.split('\n').filter(Boolean);
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

/** 不可逆确认；非 TTY 且未传 --yes 时按拒绝处理 */
function confirm(promptText) {
  return new Promise((done) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`\x1b[31m${promptText}\x1b[0m (y/N) `, (answer) => {
      rl.close();
      done(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

function printUsage() {
  console.log(`用法:
  node scripts/purge-zips.mjs              彻底清除（本地 + GitHub/Gitee 远端）
  node scripts/purge-zips.mjs --dry-run    仅预览将执行的操作，不写入
  node scripts/purge-zips.mjs --local      仅清除本地（不推送远端删除）
  node scripts/purge-zips.mjs --yes        跳过不可逆确认（供脚本/CI 调用）`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const localOnly = args.includes('--local');
  const skipConfirm = args.includes('--yes');

  if (git(['rev-parse', '--is-inside-work-tree'], { allowFail: true }).status !== 0) {
    log.error('必须在 git 仓库内运行本脚本');
    process.exit(1);
  }

  if (!hasZipsBranch()) {
    log.warn(`${ZIP_BRANCH} 分支不存在，无需清理`);
    return;
  }

  // ① 若当前在 zips 上，先切到 main（git 不允许删除当前分支）
  if (currentBranch() === ZIP_BRANCH) {
    log.info(`当前在 ${ZIP_BRANCH} 上，先切换到 ${MAIN_BRANCH}（若失败请先处理工作区改动）`);
    act('切换到 main', ['switch', MAIN_BRANCH], { execute: !dryRun });
  }

  // ② 收集仅挂在 zips 上的发布标签
  const tags = zipsOnlyTags();
  if (tags.length > 0) {
    log.info(`发现 ${tags.length} 个仅挂在 ${ZIP_BRANCH} 上的标签: ${tags.join(', ')}`);
  } else {
    log.info(`未发现仅挂在 ${ZIP_BRANCH} 上的标签`);
  }

  // ③ 先删远端标签/分支（防止 fetch 自动同步回本地），再删本地
  if (!localOnly) {
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
  }

  // ④ 删除本地标签、分支与远端跟踪引用
  if (tags.length > 0) {
    act('删除本地标签', ['tag', '-d', ...tags], { execute: !dryRun });
  }
  act(`删除本地分支 ${ZIP_BRANCH}`, ['branch', '-D', ZIP_BRANCH], { execute: !dryRun });
  act(`删除远端跟踪引用 origin/${ZIP_BRANCH}`, ['branch', '-rd', `origin/${ZIP_BRANCH}`], {
    execute: !dryRun,
    allowFail: true,
  });

  // ⑤ 过期全部 reflog + 强制 GC，物理抹掉不可达对象（不可逆）
  act('过期全部 reflog', ['reflog', 'expire', '--expire=now', '--all'], { execute: !dryRun });
  act('强制 GC 清理不可达对象', ['gc', '--prune=now'], { execute: !dryRun });

  if (dryRun) {
    console.log('\n\x1b[33m（预览模式，未写入任何文件）\x1b[0m');
    return;
  }

  // 不可逆确认
  if (!skipConfirm) {
    const ok = await confirm(
      `确认彻底清除 ${ZIP_BRANCH} 及其提交${localOnly ? '（本地）' : '（本地 + GitHub/Gitee 远端）'}？此操作不可逆`
    );
    if (!ok) {
      log.warn('已取消，未执行任何删除');
      return;
    }
  }

  const scope = localOnly ? '本地' : '本地 + GitHub/Gitee 远端';
  log.ok(`${ZIP_BRANCH} 已彻底清除（${scope}），不可达提交已物理抹除`);
}

if (process.argv[1] && resolve(process.argv[1]) === SELF_PATH) {
  main().catch((error) => {
    log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

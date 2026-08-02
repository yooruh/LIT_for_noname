#!/usr/bin/env node

/**
 * 叁岛世界 开发↔安装目录同步脚本
 *
 * 移植自 _others/microtools/pyc/导入.py（install）与 导出.py（export）。
 * 逐文件内容比对（Buffer.equals）决定是否复制，保留真实差异报告；
 * 目录以 mkdirSync 递归合并，空目录（如 audio/die）也会被创建。
 *
 * 用法:
 *   node scripts/sync.mjs install         dev → 两个已安装目录
 *   node scripts/sync.mjs export          已安装[0] → dev + 已安装[1]
 *   node scripts/sync.mjs <cmd> --dry-run 仅预览将更新的文件
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from './lib/shared.mjs';
import { devRoot, installed, SYNC_ENTRIES } from './lib/dev-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SELF_PATH = fileURLToPath(import.meta.url);

/** 递归复制目录树：逐文件内容比对，仅复制有差异的文件；空目录保留 */
function syncTree(srcDir, destDir, dryRun) {
  let copied = 0;
  let unchanged = 0;
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const src = join(srcDir, entry.name);
    const dest = join(destDir, entry.name);
    if (entry.isDirectory()) {
      if (!dryRun) mkdirSync(dest, { recursive: true });
      const sub = syncTree(src, dest, dryRun);
      copied += sub.copied;
      unchanged += sub.unchanged;
    } else if (entry.isFile()) {
      const srcBuf = readFileSync(src);
      const same = existsSync(dest) && readFileSync(dest).equals(srcBuf);
      if (same) {
        unchanged++;
      } else {
        if (!dryRun) writeFileSync(dest, srcBuf);
        copied++;
      }
    }
  }
  return { copied, unchanged };
}

/** 同步单个顶层条目（文件或目录） */
function syncEntry(srcPath, destPath, dryRun) {
  if (!existsSync(srcPath)) return { copied: 0, unchanged: 0, missing: true };
  const st = statSync(srcPath);
  if (st.isDirectory()) {
    if (!dryRun) mkdirSync(destPath, { recursive: true });
    return syncTree(srcPath, destPath, dryRun);
  }
  const srcBuf = readFileSync(srcPath);
  const same = existsSync(destPath) && readFileSync(destPath).equals(srcBuf);
  if (same) return { copied: 0, unchanged: 1 };
  if (!dryRun) {
    mkdirSync(dirname(destPath), { recursive: true });
    writeFileSync(destPath, srcBuf);
  }
  return { copied: 1, unchanged: 0 };
}

/** 同步一组 SYNC_ENTRIES */
function syncEntries(srcRoot, destRoot, dryRun) {
  const results = [];
  for (const entry of SYNC_ENTRIES) {
    const srcPath = join(srcRoot, entry);
    if (!existsSync(srcPath)) {
      results.push({ file: entry, changed: false, skipped: true });
      continue;
    }
    const { copied, unchanged } = syncEntry(srcPath, join(destRoot, entry), dryRun);
    results.push({ file: entry, changed: copied > 0, fileCount: copied + unchanged });
  }
  return results;
}

/** 打印单个目标的同步结果 */
function reportResults(dest, results, dryRun) {
  for (const r of results) {
    if (r.skipped) {
      log.warn(`  ${r.file} — 源不存在，跳过`);
      continue;
    }
    const verb = dryRun ? '将更新' : '已更新';
    if (r.changed) log.ok(`  ${r.file} — ${verb} ${r.fileCount} 个文件`);
    else log.info(`  ${r.file} — 已同步（${r.fileCount} 个文件未变化）`);
  }
}

/**
 * install：dev → 两个已安装目录
 * @returns {Array<{dest:string, results:object[]}>}
 */
export function syncInstall({ dryRun = false } = {}) {
  const all = [];
  if (installed.length === 0) {
    log.warn('未配置本机安装路径：请创建 scripts/lib/dev-config.local.json（参照 dev-config.local.example.json）');
    return all;
  }
  for (const dest of installed) {
    if (!existsSync(dest)) {
      log.warn(`目标目录不存在，跳过: ${dest}`);
      continue;
    }
    log.info(`同步到: ${dest}`);
    const results = syncEntries(devRoot, dest, dryRun);
    reportResults(dest, results, dryRun);
    all.push({ dest, results });
  }
  return all;
}

/**
 * export：已安装[0] → dev + 已安装[1]
 * @returns {Array<{dest:string, results:object[]}>}
 */
export function syncExport({ dryRun = false } = {}) {
  if (installed.length === 0) {
    log.warn('未配置本机安装路径：请创建 scripts/lib/dev-config.local.json（参照 dev-config.local.example.json）');
    return [];
  }
  const source = installed[0];
  if (!existsSync(source)) {
    throw new Error(`未找到导出源: ${source}`);
  }
  const all = [];
  const dests = [devRoot, installed[1]];
  for (const dest of dests) {
    if (!existsSync(dest)) {
      log.warn(`目标目录不存在，跳过: ${dest}`);
      continue;
    }
    log.info(`导出到: ${dest}`);
    const results = syncEntries(source, dest, dryRun);
    reportResults(dest, results, dryRun);
    all.push({ dest, results });
  }
  return all;
}

function printUsage() {
  console.log(`用法:
  node scripts/sync.mjs install         dev → 两个已安装目录
  node scripts/sync.mjs export          已安装[0] → dev + 已安装[1]
  node scripts/sync.mjs <cmd> --dry-run 仅预览将更新的文件`);
}

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  try {
    if (cmd === 'install') {
      syncInstall({ dryRun });
    } else if (cmd === 'export') {
      syncExport({ dryRun });
    } else {
      printUsage();
      process.exit(1);
    }
    if (dryRun) console.log('\n\x1b[33m（预览模式，未写入任何文件）\x1b[0m');
  } catch (error) {
    log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === SELF_PATH) {
  main();
}

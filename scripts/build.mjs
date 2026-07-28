#!/usr/bin/env node

/**
 * 叁岛世界 统一分发版本脚本
 *
 * 以 release/releases.json 为唯一发布源，统一生成：
 *   1. package.json       — 项目版本号
 *   2. extension.js       — const litVersion = "..."
 *   3. info.json          — intro 字段中的 版本：...
 *   4. version.json       — 在线更新兼容版本列表
 *   5. style/html/update.html — 完整历史更新日志
 *   6. source/content.js  — 升级弹窗 / 帮助摘要
 *   7. Directory.json     — 在线更新文件清单（通过 rebuild 流程生成）
 *
 * 用法:
 *   node scripts/build.mjs              按发布清单生成所有产物
 *   node scripts/build.mjs --dry-run    仅预览将要改动的文件
 *   node scripts/build.mjs --current    显示发布清单中的当前版本
 */

import {
  log,
  stripV,
} from './lib/shared.mjs';
import {
  getCurrentReleaseVersion,
  getReleaseManifestPath,
  readReleaseManifest,
  syncVersionFiles,
  writeVersionJson,
  writeUpdateHtml,
  writeContentJs,
} from './lib/release.mjs';
import { rebuildProject } from './rebuild.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-d');
const showCurrentOnly = args.includes('--current') || args.includes('-c');
const positionalArgs = args.filter(arg => !arg.startsWith('-'));

function printBanner() {
  console.log(`
\x1b[35m╔══════════════════════════════════╗
║   叁岛世界 统一分发版本脚本 v2.0   ║
╚══════════════════════════════════╝\x1b[0m
`);
}

function printUsage() {
  console.log(`用法:
  node scripts/build.mjs              根据 release/releases.json 生成所有发布产物
  node scripts/build.mjs --dry-run    预览模式（不写入文件）
  node scripts/build.mjs --current    显示当前发布版本

说明:
  现在不再从命令行接收版本号。
  请直接编辑 release/releases.json 中的最新 release。`);
}

function showCurrent() {
  const manifest = readReleaseManifest();
  const version = getCurrentReleaseVersion(manifest);
  log.info(`当前版本: \x1b[1;33m${version}\x1b[0m`);
  log.info(`发布源:   \x1b[90m${getReleaseManifestPath()}\x1b[0m`);
}

function collectResults(manifest, previewOnly) {
  const latestVersion = getCurrentReleaseVersion(manifest);
  const results = [
    ...syncVersionFiles(latestVersion, previewOnly),
    writeVersionJson(manifest, previewOnly),
    writeUpdateHtml(manifest, previewOnly),
    writeContentJs(manifest, previewOnly),
    ...rebuildProject({ checkOnly: previewOnly, silent: true }),
  ];
  return { latestVersion, results };
}

function printSummary(results, previewOnly) {
  const changed = results.filter(item => item.changed);
  const unchanged = results.filter(item => !item.changed);

  console.log('');
  if (changed.length > 0) {
    log.info(`${previewOnly ? '将更新' : '已更新'}以下文件:`);
    changed.forEach(item => console.log(`  \x1b[32m•\x1b[0m ${item.file}`));
  } else {
    log.warn(previewOnly ? '没有检测到需要更新的文件' : '没有文件被修改，当前产物已与发布清单一致');
  }

  if (unchanged.length > 0) {
    console.log('');
    log.info('已保持同步的文件:');
    unchanged.forEach(item => console.log(`  \x1b[90m• ${item.file}\x1b[0m`));
  }
}

if (positionalArgs.length > 0) {
  printBanner();
  log.error(`检测到已废弃的版本号参数: ${positionalArgs.join(', ')}`);
  log.info('请改为直接编辑 release/releases.json 中的最新 release，再重新执行构建。');
  process.exit(1);
}

if (showCurrentOnly) {
  showCurrent();
  process.exit(0);
}

try {
  printBanner();
  const manifest = readReleaseManifest();
  const { latestVersion, results } = collectResults(manifest, dryRun);

  log.info(`当前发布版本: \x1b[33m${stripV(latestVersion)}\x1b[0m`);
  log.info(`发布源文件:   \x1b[90m${getReleaseManifestPath()}\x1b[0m`);
  log.info(`模式:         ${dryRun ? '\x1b[33m预览模式（不写入文件）\x1b[0m' : '\x1b[32m写入模式\x1b[0m'}`);

  printSummary(results, dryRun);

  if (dryRun) {
    console.log('');
    console.log('\x1b[90m提示: 去掉 --dry-run 参数以实际生成发布产物\x1b[0m');
  } else {
    console.log('');
    log.ok('分发版本产物已全部同步完成。');
    console.log('\x1b[90m提示: 可继续使用 git diff 检查更改\x1b[0m');
  }
} catch (error) {
  printBanner();
  log.error(error instanceof Error ? error.message : String(error));
  console.log('');
  printUsage();
  process.exit(1);
}

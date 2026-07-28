#!/usr/bin/env node

/**
 * 叁岛世界 发布清单辅助脚本
 *
 * 说明:
 *   更新日志与升级弹窗现统一由 release/releases.json 驱动。
 *   本脚本提供查看与新增版本脚手架能力。
 *
 * 用法:
 *   node scripts/changelog.mjs show                  显示当前版本的更新条目
 *   node scripts/changelog.mjs path                  显示发布清单路径
 *   node scripts/changelog.mjs scaffold <版本号>     在顶部插入新版本模板
 *   node scripts/changelog.mjs scaffold --dry-run <版本号> 预览新版本模板
 */

import { log, stripV } from './lib/shared.mjs';
import {
  getLatestRelease,
  getReleaseManifestPath,
  readReleaseManifest,
  scaffoldRelease,
} from './lib/release.mjs';

const args = process.argv.slice(2);
const command = args[0] || 'show';
const dryRun = args.includes('--dry-run') || args.includes('-d');
const positionalArgs = args.filter(arg => !arg.startsWith('-'));

function printUsage() {
  console.log(`叁岛世界 发布清单辅助脚本

用法:
  node scripts/changelog.mjs show                      显示当前版本的更新条目
  node scripts/changelog.mjs path                      显示 release/releases.json 路径
  node scripts/changelog.mjs scaffold <版本号>         在顶部插入新版本模板
  node scripts/changelog.mjs scaffold --dry-run <版本号> 预览新版本模板

说明:
  如需修改版本号、更新日志、升级弹窗内容，请编辑 release/releases.json。`);
}

function showCurrent() {
  const manifest = readReleaseManifest();
  const latest = getLatestRelease(manifest);
  console.log(`\n\x1b[1m当前版本 ${latest.version} 的发布条目:\x1b[0m\n`);
  latest.highlights.forEach((item, index) => {
    console.log(`  \x1b[36m${index + 1}.\x1b[0m ${item}`);
  });
  if (latest.footerNotes?.length) {
    console.log('\n  \x1b[90m附加说明:\x1b[0m');
    latest.footerNotes.forEach((item, index) => {
      console.log(`  \x1b[90m${index + 1}. ${item}\x1b[0m`);
    });
  }
  console.log('');
}

function scaffold() {
  const version = positionalArgs[1];
  if (!version) {
    log.error('请提供新版本号');
    printUsage();
    process.exit(1);
  }

  const result = scaffoldRelease(version, { dryRun });
  const release = result.release;

  log.info(`${dryRun ? '预览创建' : '已创建'}版本模板: \x1b[33m${stripV(release.version)}\x1b[0m`);
  log.info(`发布源文件: \x1b[90m${getReleaseManifestPath()}\x1b[0m`);
  console.log('');
  console.log(JSON.stringify(release, null, 2));
  console.log('');
  if (dryRun) {
    console.log('\x1b[90m提示: 去掉 --dry-run 参数以写入 release/releases.json\x1b[0m');
  } else {
    console.log('\x1b[90m提示: 补全 highlights / players / footerNotes 后执行 npm run release\x1b[0m');
  }
}

switch (command) {
  case 'show':
    showCurrent();
    break;
  case 'path':
    log.info(getReleaseManifestPath());
    break;
  case 'scaffold':
    scaffold();
    break;
  case 'help':
  case '--help':
  case '-h':
    printUsage();
    break;
  default:
    log.error(`未知命令: ${command}`);
    printUsage();
    process.exit(1);
}

#!/usr/bin/env node

/**
 * 叁岛世界 构建脚本 — 版本号同步
 *
 * 将版本号同步到所有需要手动更新的位置：
 *   1. extension.js       — const litVersion = "..."
 *   2. version.json        — versions[].extensionVersion
 *   3. info.json           — intro 字段中的 版本：...
 *   4. style/html/update.html — {{version}} 占位符
 *
 * 用法:
 *   node scripts/build.mjs <新版本号>            同步所有文件
 *   node scripts/build.mjs --dry-run <新版本号>  仅预览差异，不写入
 *   node scripts/build.mjs --current             显示当前版本号
 */

import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PATHS,
  readFile,
  writeFile,
  replaceInFile,
  getCurrentVersion,
  log,
  isValidVersion,
  stripV,
  withV,
} from './lib/shared.mjs';
import { readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ==================== 命令行参数解析 ====================

const args = process.argv.slice(2);

/** @type {'sync'|'dry-run'|'current'} */
let mode = 'sync';
let newVersion = null;

if (args.includes('--current') || args.includes('-c')) {
  mode = 'current';
} else if (args.includes('--dry-run') || args.includes('-d')) {
  mode = 'dry-run';
  const dryIdx = Math.max(args.indexOf('--dry-run'), args.indexOf('-d'));
  newVersion = args.filter((_, i) => i !== dryIdx).find(a => !a.startsWith('-'));
} else {
  newVersion = args.find(a => !a.startsWith('-'));
}

// ==================== 核心逻辑 ====================

/** 显示当前版本 */
function showCurrent() {
  const ver = getCurrentVersion();
  log.info(`当前版本: \x1b[1;33m${ver}\x1b[0m`);
  return ver;
}

/**
 * 更新 extension.js 中的 litVersion
 * @returns {{ oldVersion: string, replaced: boolean }}
 */
function updateExtensionJs(version, dryRun) {
  const oldContent = readFile(PATHS.extensionJs);
  const oldVersion = getCurrentVersion();

  const pattern = /(const litVersion\s*=\s*)".*?"/;
  const replacement = `$1"${stripV(version)}"`;
  const newContent = oldContent.replace(pattern, replacement);

  if (dryRun) {
    const match = oldContent.match(pattern);
    if (match) {
      log.diff(
        `extension.js  (${relative(ROOT, PATHS.extensionJs)})`,
        match[0],
        match[0].replace(/".*?"/, `"${stripV(version)}"`)
      );
    }
    return { oldVersion, replaced: newContent !== oldContent };
  }

  const { replaced } = replaceInFile(PATHS.extensionJs, pattern, replacement);
  return { oldVersion, replaced };
}

/**
 * 更新 version.json 中的版本列表
 * - 在 versions 数组头部插入新版本条目
 * - 将旧的最新条目（原头部）的 branch 更新为对应的 tag 名
 */
function updateVersionJson(version, dryRun) {
  const oldContent = readFile(PATHS.versionJson);
  const data = JSON.parse(oldContent);
  const oldLatest = data.versions[0]?.extensionVersion || '(无)';

  // 制作一份深拷贝用于 dry-run 对比
  const newData = JSON.parse(JSON.stringify(data));

  // 如果旧版本与新版本相同，将旧头部条目的 branch 改为 tag
  const versions = newData.versions;
  if (versions.length > 0) {
    const top = versions[0];
    // 只有当 branch 不是以 v 开头的 tag 格式时才改
    if (!top.branch.startsWith('v') && top.branch !== 'main') {
      // branch 已经是自定义名，保持不变
    } else if (top.branch === 'main' && top.extensionVersion !== version) {
      // 将旧的 main 分支版本转为 tag
      top.branch = withV(top.extensionVersion);
    }
  }

  // 在头部插入新版本
  versions.unshift({
    extensionVersion: stripV(version),
    gameVersion: '>=1.11.2',
    branch: 'main',
    description: `支持无名杀1.11.2以上的版本`,
  });

  const newContent = JSON.stringify(newData, null, 2) + '\n';

  if (dryRun) {
    log.diff(
      `version.json  (${relative(ROOT, PATHS.versionJson)})`,
      `latest: ${oldLatest}`,
      `latest: ${stripV(version)}`
    );
    return { oldLatest, replaced: true };
  }

  writeFile(PATHS.versionJson, newContent);
  return { oldLatest, replaced: true };
}

/**
 * 更新 info.json 中 intro 字段的版本号
 */
function updateInfoJson(version, dryRun) {
  const oldContent = readFile(PATHS.infoJson);
  const oldMatch = oldContent.match(/版本：([^"]+)/);
  const oldVersion = oldMatch ? oldMatch[1] : '(未找到)';

  // 匹配 intro 字段中 "版本：xxx" 的部分
  // info.json 的 intro 是一个字符串值，在 JSON 中表示为 "版本：26.6.25.3"
  const pattern = /(版本：)[^"<\\]+/;
  const replacement = `$1${stripV(version)}`;

  if (dryRun) {
    if (oldMatch) {
      log.diff(
        `info.json     (${relative(ROOT, PATHS.infoJson)})`,
        `版本：${oldVersion}`,
        `版本：${stripV(version)}`
      );
    }
    return { oldVersion, replaced: !!oldMatch && oldVersion !== stripV(version) };
  }

  const { replaced } = replaceInFile(PATHS.infoJson, pattern, replacement);
  return { oldVersion, replaced };
}

/**
 * 替换 update.html 中的 {{version}} 占位符
 */
function updateHtmlTemplate(version, dryRun) {
  const oldContent = readFile(PATHS.updateHtml);

  // 检查是否有 {{version}} 占位符
  const hasPlaceholder = /\{\{version\}\}/.test(oldContent);

  if (dryRun) {
    if (hasPlaceholder) {
      log.diff(
        `update.html   (${relative(ROOT, PATHS.updateHtml)})`,
        '{{version}}',
        stripV(version)
      );
    } else {
      // 检查当前 h3 中的版本号
      const h3Match = oldContent.match(/<h3>(.+?)更新（当前版本）<\/h3>/);
      if (h3Match) {
        log.diff(
          `update.html   (${relative(ROOT, PATHS.updateHtml)})`,
          h3Match[1],
          stripV(version)
        );
      }
    }
    return { replaced: hasPlaceholder };
  }

  if (hasPlaceholder) {
    replaceInFile(PATHS.updateHtml, /\{\{version\}\}/g, stripV(version));
    return { replaced: true };
  }

  // 如果没有占位符，尝试匹配现有的版本号模式并替换
  const h3Pattern = /(<h3>).+?(更新（当前版本）<\/h3>)/;
  const { replaced } = replaceInFile(
    PATHS.updateHtml,
    h3Pattern,
    `$1${stripV(version)}$2`
  );
  return { replaced };
}

// ==================== 主流程 ====================

function printBanner() {
  console.log(`
\x1b[35m╔══════════════════════════════════╗
║   叁岛世界 构建脚本 v1.0.0     ║
╚══════════════════════════════════╝\x1b[0m
`);
}

function printUsage() {
  console.log(`用法:
  node scripts/build.mjs <新版本号>            同步版本号到所有文件
  node scripts/build.mjs --dry-run <新版本号>  预览模式（不实际修改）
  node scripts/build.mjs --current             显示当前版本号

示例:
  node scripts/build.mjs 26.7.17.0
  node scripts/build.mjs --dry-run v26.7.17.0
`);
}

if (mode === 'current') {
  showCurrent();
  process.exit(0);
}

if (!newVersion) {
  printBanner();
  showCurrent();
  console.log('');
  printUsage();
  process.exit(0);
}

if (!isValidVersion(newVersion)) {
  log.error(`无效的版本号格式: "${newVersion}"`);
  log.info('支持的格式: 26.6.25.3 或 v26.6.25.3');
  process.exit(1);
}

const dryRun = mode === 'dry-run';

printBanner();

const oldVer = getCurrentVersion();
log.info(`当前版本: \x1b[33m${oldVer}\x1b[0m`);
log.info(`新版本:   \x1b[32m${stripV(newVersion)}\x1b[0m`);
log.info(`模式:     ${dryRun ? '\x1b[33m预览模式（不写入文件）\x1b[0m' : '\x1b[32m写入模式\x1b[0m'}`);

console.log('');

// 执行各项更新
const results = {
  extensionJs: updateExtensionJs(newVersion, dryRun),
  versionJson: updateVersionJson(newVersion, dryRun),
  infoJson: updateInfoJson(newVersion, dryRun),
  updateHtml: updateHtmlTemplate(newVersion, dryRun),
};

console.log('');

// 汇总
const changed = Object.values(results).filter(r => r.replaced).length;
const total = Object.keys(results).length;

if (dryRun) {
  log.info(`预览完成 — ${changed}/${total} 个文件将被修改`);
  console.log('');
  console.log('\x1b[90m提示: 去掉 --dry-run 参数以实际应用更改\x1b[0m');
} else {
  if (changed > 0) {
    log.ok(`构建完成! 已同步版本号到 ${changed} 个文件。`);
    console.log(`\n\x1b[90m提示: 可使用 git diff 检查更改，然后执行:\x1b[0m`);
    console.log(`\x1b[90m  git add -A && git commit -m "release: ${withV(newVersion)}"\x1b[0m`);
    console.log(`\x1b[90m  git tag ${withV(newVersion)}\x1b[0m`);
  } else {
    log.warn('没有文件被修改（版本号可能已是最新）');
  }
}

#!/usr/bin/env node

/**
 * 叁岛世界 更新日志管理脚本
 *
 * 管理 style/html/update.html 中的更新日志条目，以及 source/content.js 中的发布说明。
 *
 * 用法:
 *   node scripts/changelog.mjs add "更新内容..."           添加一条日志到 HTML
 *   node scripts/changelog.mjs add --json '[...]'          批量添加（JSON数组）
 *   node scripts/changelog.mjs from-md <md文件>            从 Markdown 导入
 *   node scripts/changelog.mjs set-content "发布说明..."    设置 content.js 中的版本发布说明
 *   node scripts/changelog.mjs show                        显示当前版本的更新日志
 *   node scripts/changelog.mjs replace-vars                仅替换 {{version}} 等模板变量
 *
 * update.html 模板占位符:
 *   {{version}}  → 替换为 extension.js 中的当前版本号
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import {
  PATHS,
  readFile,
  writeFile,
  getCurrentVersion,
  stripV,
  log,
} from './lib/shared.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const CONTENT_JS = resolve(ROOT, 'source', 'content.js');

// ==================== 命令行参数解析 ====================

const args = process.argv.slice(2);
const command = args[0];

function getArgAfter(flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : null;
}

// ==================== HTML 更新日志操作 ====================

/**
 * 在 update.html 的当前版本块中添加一条日志条目
 * @param {string} entryText 日志内容
 * @param {boolean} dryRun
 */
function addHTMLEntry(entryText, dryRun = false) {
  const content = readFile(PATHS.updateHtml);
  const version = getCurrentVersion();

  // 查找当前版本的 <ul> 块
  // 匹配模式: <h3>{{version}}更新... 或 <h3>26.x.x更新...
  const h3Pattern = new RegExp(
    `(<h3>)(?:\\{\\{version\\}\\}|${version.replace(/\./g, '\\.')})更新（当前版本）<\\/h3>`,
    'i'
  );
  const h3Match = content.match(h3Pattern);

  if (!h3Match) {
    log.error('无法在 update.html 中找到当前版本的 <h3> 块');
    log.info('请确保当前版本块使用 {{version}} 占位符或实际版本号作为标题');
    return false;
  }

  // 找到 h3 之后的 <ul class="update-list">...</ul>
  const afterH3 = content.slice(h3Match.index + h3Match[0].length);
  const ulMatch = afterH3.match(/<ul class="update-list">\s*([\s\S]*?)<\/ul>/);

  if (!ulMatch) {
    log.error('无法找到当前版本的 <ul> 列表');
    return false;
  }

  const ulStartInAfter = ulMatch.index;
  const ulContent = ulMatch[1];
  const ulEndInAfter = ulMatch.index + ulMatch[0].length;

  // 计算插入位置（在 </ul> 之前）
  const ulClosePos = h3Match.index + h3Match[0].length + ulMatch.index + ulMatch[0].length - '</ul>'.length;

  // 统计已有条目数量来确定编号
  const existingItems = (ulContent.match(/<li>/g) || []).length;
  const newItemNumber = existingItems + 1;

  // 根据编号样式生成条目：① ② ③ ... ①⑩ ⑪ ...
  const circledNumbers = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
  const prefix = newItemNumber <= circledNumbers.length
    ? circledNumbers[newItemNumber - 1]
    : `${newItemNumber}`;

  const newEntry = `\t\t\t\t\t<li>${prefix} ${entryText}</li>\n`;

  const newContent =
    content.slice(0, ulClosePos) +
    newEntry +
    content.slice(ulClosePos);

  if (dryRun) {
    log.info(`[预览] 将添加条目: ${entryText}`);
    return true;
  }

  writeFile(PATHS.updateHtml, newContent);
  log.ok(`已添加更新日志条目 #${newItemNumber}: ${entryText}`);
  return true;
}

/**
 * 批量添加 HTML 日志条目
 */
function addHTMLEntries(entries, dryRun = false) {
  if (!Array.isArray(entries) || entries.length === 0) {
    log.error('条目列表为空');
    return false;
  }

  let allOk = true;
  // 倒序添加以保持顺序（因为每次在前面插入）
  // 实际上我们是在 </ul> 前追加，所以正序即可
  for (const entry of entries) {
    if (!addHTMLEntry(entry, dryRun)) {
      allOk = false;
    }
  }
  return allOk;
}

// ==================== content.js 操作 ====================

/**
 * 设置 source/content.js 中 updateContent 的内容
 * content.js 中类似:
 *   const updateContent = ['行1', '行2', ...];
 */
function setContentUpdateContent(lines, dryRun = false) {
  let content = readFile(CONTENT_JS);

  // 查找 updateContent 数组
  const arrayMatch = content.match(
    /(const updateContent\s*=\s*\[)([\s\S]*?)(\];)/
  );

  if (!arrayMatch) {
    log.error('无法在 content.js 中找到 updateContent 数组');
    return false;
  }

  const formattedLines = lines
    .map((l, i) => `\t'${l.replace(/'/g, "\\'")}'${i < lines.length - 1 ? ',' : ''}`)
    .join('\n');

  const newArrayContent = `\n${formattedLines}\n`;

  if (dryRun) {
    log.info('[预览] content.js 新 updateContent:');
    lines.forEach((l, i) => console.log(`  ${i + 1}. ${l}`));
    return true;
  }

  const newContent =
    content.slice(0, arrayMatch.index + arrayMatch[1].length) +
    newArrayContent +
    content.slice(arrayMatch.index + arrayMatch[1].length + arrayMatch[2].length);

  writeFile(CONTENT_JS, newContent);
  log.ok(`已更新 content.js 中的 updateContent (${lines.length} 行)`);
  return true;
}

// ==================== from-md 导入 ====================

/**
 * 从 Markdown 文件读取更新日志条目
 * 支持格式:
 *   - 条目内容
 *   1. 条目内容
 *   * 条目内容
 */
function parseMarkdownChangelog(mdPath) {
  try {
    const mdContent = readFileSync(mdPath, 'utf-8');
    const entries = [];

    const lines = mdContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      // 匹配 "- xxx" / "1. xxx" / "* xxx"
      const match = trimmed.match(/^(?:[-*]|\d+\.)\s+(.+)/);
      if (match) {
        entries.push(match[1]);
      }
    }

    return entries;
  } catch (err) {
    log.error(`读取 Markdown 文件失败: ${err.message}`);
    return null;
  }
}

// ==================== 模板变量替换 ====================

/**
 * 替换 update.html 中的所有模板变量
 */
function replaceTemplateVars(dryRun = false) {
  const version = getCurrentVersion();
  const content = readFile(PATHS.updateHtml);

  const replacements = {
    '{{version}}': stripV(version),
    '{{date}}': new Date().toISOString().slice(0, 10),
  };

  let newContent = content;
  let replacedCount = 0;

  for (const [pattern, value] of Object.entries(replacements)) {
    if (newContent.includes(pattern)) {
      newContent = newContent.replaceAll(pattern, value);
      replacedCount++;
      log.info(`${dryRun ? '[预览] ' : ''}替换 ${pattern} → ${value}`);
    }
  }

  if (replacedCount === 0) {
    log.info('没有需要替换的模板变量');
    return true;
  }

  if (dryRun) return true;

  writeFile(PATHS.updateHtml, newContent);
  log.ok(`已替换 ${replacedCount} 个模板变量`);
  return true;
}

// ==================== 显示当前日志 ====================

function showCurrentChangelog() {
  const content = readFile(PATHS.updateHtml);
  const version = getCurrentVersion();

  // 查找当前版本的 h3 和 ul
  const h3Pattern = new RegExp(
    `<h3>(?:\\{\\{version\\}\\}|${version.replace(/\./g, '\\.')})更新（当前版本）<\\/h3>`,
    'i'
  );
  const h3Match = content.match(h3Pattern);

  if (!h3Match) {
    log.warn('未找到当前版本块');
    return;
  }

  const afterH3 = content.slice(h3Match.index + h3Match[0].length);
  const ulMatch = afterH3.match(/<ul class="update-list">\s*([\s\S]*?)<\/ul>/);

  if (!ulMatch) {
    log.warn('未找到更新列表');
    return;
  }

  const items = ulMatch[1]
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('<li>'))
    .map(l => l.replace(/<\/?li>/g, '').trim());

  console.log(`\n\x1b[1m当前版本 ${version} 的更新日志:\x1b[0m\n`);
  if (items.length === 0) {
    console.log('  (无条目)');
  } else {
    items.forEach((item, i) => console.log(`  \x1b[36m${i + 1}.\x1b[0m ${item}`));
  }
  console.log('');
}

// ==================== 主流程 ====================

function printUsage() {
  console.log(`叁岛世界 更新日志管理

用法:
  node scripts/changelog.mjs add "更新内容"             添加一条日志
  node scripts/changelog.mjs add --json '["a","b"]'     批量添加
  node scripts/changelog.mjs add --dry-run "内容"       预览（不写入）
  node scripts/changelog.mjs from-md <md文件>            从 Markdown 导入
  node scripts/changelog.mjs set-content "行1" "行2"...  设置 content.js 发布说明
  node scripts/changelog.mjs show                       显示当前日志
  node scripts/changelog.mjs replace-vars               仅替换模板变量

示例:
  node scripts/changelog.mjs add "修复了xxx的Bug"
  node scripts/changelog.mjs add --json '["新增角色xxx","优化了yyy"]'
  node scripts/changelog.mjs from-md CHANGELOG.md
  node scripts/changelog.mjs set-content "③岛世界v26.7.17更新" "新增xxx" "修复yyy"
`);
}

if (!command || command === 'help' || command === '--help' || command === '-h') {
  printUsage();
  process.exit(0);
}

const dryRun = args.includes('--dry-run') || args.includes('-d');

switch (command) {
  case 'add': {
    const jsonFlag = args.includes('--json');
    if (jsonFlag) {
      const jsonStr = getArgAfter('--json') || args[args.length - 1];
      try {
        const entries = JSON.parse(jsonStr);
        addHTMLEntries(entries, dryRun);
      } catch (e) {
        log.error(`JSON 解析失败: ${e.message}`);
        process.exit(1);
      }
    } else {
      // 收集所有非 flag 的参数作为日志内容
      const entryParts = args.slice(1).filter(a => !a.startsWith('-'));
      if (entryParts.length === 0) {
        log.error('请提供更新日志内容');
        process.exit(1);
      }
      const entryText = entryParts.join(' ');
      addHTMLEntry(entryText, dryRun);
    }
    break;
  }

  case 'from-md': {
    const mdPath = args[1];
    if (!mdPath) {
      log.error('请指定 Markdown 文件路径');
      process.exit(1);
    }
    const entries = parseMarkdownChangelog(mdPath);
    if (entries && entries.length > 0) {
      log.info(`从 ${mdPath} 解析到 ${entries.length} 条记录`);
      addHTMLEntries(entries, dryRun);
    } else {
      log.warn('未解析到任何条目');
    }
    break;
  }

  case 'set-content': {
    const lines = args.slice(1).filter(a => !a.startsWith('-'));
    if (lines.length === 0) {
      log.error('请提供发布说明内容');
      process.exit(1);
    }
    setContentUpdateContent(lines, dryRun);
    break;
  }

  case 'show': {
    showCurrentChangelog();
    break;
  }

  case 'replace-vars': {
    replaceTemplateVars(dryRun);
    break;
  }

  default:
    log.error(`未知命令: ${command}`);
    printUsage();
    process.exit(1);
}

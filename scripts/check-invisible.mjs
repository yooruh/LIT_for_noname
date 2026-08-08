#!/usr/bin/env node

/**
 * 叁岛世界 不可见字符检测 + BOM 清理脚本
 *
 * 扫描项目文本文件中的「不可见符号」（零宽/格式/控制字符，如 U+200C 零宽不连字符、
 * U+200B 零宽空格、U+FEFF BOM、双向控制符等）。这类字符肉眼不可见，却会静默破坏
 * 标识符、字符串或 UI 文案（例如技能名混入 U+200C 导致匹配失败），是隐蔽的 bug 来源。
 *
 * 检测规则:
 *   - \p{Cf} 格式字符      —— 零宽系列、软连字符、双向控制符等
 *   - \p{Cc} 控制字符      —— 排除 \t \n \r 后的其余控制符（NUL、退格等）
 *   - U+FEFF 仅在文件开头视为 BOM：默认模式【清除】（重写文件去掉 BOM）；
 *     --check 模式视为未通过项。出现在文件其它位置的 U+FEFF 视为问题。
 *
 * 默认模式会直接写回文件（完整清理）：
 *   - 清除文件头 UTF-8 BOM
 *   - 移除内容层的不可见字符（U+200C 等，直接删除该字符）
 * --check 模式只读，不修改任何文件，存在不可见字符或 BOM 即退出码 1。
 *
 * 用法:
 *   node scripts/check-invisible.mjs            扫描并清除 BOM + 移除不可见字符（写回文件）
 *   node scripts/check-invisible.mjs --check    只读检查：存在不可见字符或 BOM 则退出码 1（用于 CI/钩子）
 *   node scripts/check-invisible.mjs --dir <目录>  仅扫描指定目录
 *   node scripts/check-invisible.mjs --help     打印用法
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from './lib/shared.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SELF_PATH = fileURLToPath(import.meta.url);

/** 默认扫描的根目录（相对项目根） */
const DEFAULT_DIRS = ['source', 'scripts', 'style'];

/** 默认扫描的根目录散落文本文件（相对项目根） */
const DEFAULT_FILES = [
  'extension.js', 'info.json', 'package.json', 'version.json',
  'Directory.json', 'jsconfig.json', '.gitignore',
];

/** 递归时跳过的目录 */
const SKIP_DIRS = new Set([
  '.git', '.claude', '.vscode', 'node_modules',
  'image', 'audio', 'release', '_others',
]);

/** 只扫描这些扩展名的文本文件（规避二进制误报） */
const TEXT_EXT = new Set(['.js', '.mjs', '.json', '.css', '.html', '.md', '.svg', '.txt']);

/**
 * 不可见字符信息表：码点 → { name: Unicode 全名, short: 预览用短标签 }
 * 未收录的码点回退显示 U+XXXX。
 */
const CHAR_INFO = {
  0x00: { name: 'NULL', short: 'NUL' },
  0x01: { name: 'START OF HEADING', short: 'SOH' },
  0x02: { name: 'START OF TEXT', short: 'STX' },
  0x03: { name: 'END OF TEXT', short: 'ETX' },
  0x04: { name: 'END OF TRANSMISSION', short: 'EOT' },
  0x05: { name: 'ENQUIRY', short: 'ENQ' },
  0x06: { name: 'ACKNOWLEDGE', short: 'ACK' },
  0x07: { name: 'BELL', short: 'BEL' },
  0x08: { name: 'BACKSPACE', short: 'BS' },
  0x0b: { name: 'VERTICAL TABULATION', short: 'VT' },
  0x0c: { name: 'FORM FEED', short: 'FF' },
  0x0e: { name: 'SHIFT OUT', short: 'SO' },
  0x0f: { name: 'SHIFT IN', short: 'SI' },
  0x10: { name: 'DATA LINK ESCAPE', short: 'DLE' },
  0x11: { name: 'DEVICE CONTROL ONE', short: 'DC1' },
  0x12: { name: 'DEVICE CONTROL TWO', short: 'DC2' },
  0x13: { name: 'DEVICE CONTROL THREE', short: 'DC3' },
  0x14: { name: 'DEVICE CONTROL FOUR', short: 'DC4' },
  0x15: { name: 'NEGATIVE ACKNOWLEDGE', short: 'NAK' },
  0x16: { name: 'SYNCHRONOUS IDLE', short: 'SYN' },
  0x17: { name: 'END OF TRANSMISSION BLOCK', short: 'ETB' },
  0x18: { name: 'CANCEL', short: 'CAN' },
  0x19: { name: 'END OF MEDIUM', short: 'EM' },
  0x1a: { name: 'SUBSTITUTE', short: 'SUB' },
  0x1b: { name: 'ESCAPE', short: 'ESC' },
  0x1c: { name: 'INFORMATION SEPARATOR FOUR', short: 'IS4' },
  0x1d: { name: 'INFORMATION SEPARATOR THREE', short: 'IS3' },
  0x1e: { name: 'INFORMATION SEPARATOR TWO', short: 'IS2' },
  0x1f: { name: 'INFORMATION SEPARATOR ONE', short: 'IS1' },
  0x7f: { name: 'DELETE', short: 'DEL' },
  0x85: { name: 'NEXT LINE', short: 'NEL' },
  0xad: { name: 'SOFT HYPHEN', short: 'SHY' },
  0x61c: { name: 'ARABIC LETTER MARK', short: 'ALM' },
  0x180e: { name: 'MONGOLIAN VOWEL SEPARATOR', short: 'MVS' },
  0x200b: { name: 'ZERO WIDTH SPACE', short: 'ZWSP' },
  0x200c: { name: 'ZERO WIDTH NON-JOINER', short: 'ZWNJ' },
  0x200d: { name: 'ZERO WIDTH JOINER', short: 'ZWJ' },
  0x200e: { name: 'LEFT-TO-RIGHT MARK', short: 'LRM' },
  0x200f: { name: 'RIGHT-TO-LEFT MARK', short: 'RLM' },
  0x202a: { name: 'LEFT-TO-RIGHT EMBEDDING', short: 'LRE' },
  0x202b: { name: 'RIGHT-TO-LEFT EMBEDDING', short: 'RLE' },
  0x202c: { name: 'POP DIRECTIONAL FORMATTING', short: 'PDF' },
  0x202d: { name: 'LEFT-TO-RIGHT OVERRIDE', short: 'LRO' },
  0x202e: { name: 'RIGHT-TO-LEFT OVERRIDE', short: 'RLO' },
  0x2060: { name: 'WORD JOINER', short: 'WJ' },
  0x2061: { name: 'FUNCTION APPLICATION', short: 'AF' },
  0x2062: { name: 'INVISIBLE TIMES', short: 'IT' },
  0x2063: { name: 'INVISIBLE SEPARATOR', short: 'IS' },
  0x2064: { name: 'INVISIBLE PLUS', short: 'IP' },
  0x2066: { name: 'LEFT-TO-RIGHT ISOLATE', short: 'LRI' },
  0x2067: { name: 'RIGHT-TO-LEFT ISOLATE', short: 'RLI' },
  0x2068: { name: 'FIRST STRONG ISOLATE', short: 'FSI' },
  0x2069: { name: 'POP DIRECTIONAL ISOLATE', short: 'PDI' },
  0xfeff: { name: 'ZERO WIDTH NO-BREAK SPACE', short: 'BOM' },
  0xfff9: { name: 'INTERLINEAR ANNOTATION ANCHOR', short: 'IAA' },
  0xfffa: { name: 'INTERLINEAR ANNOTATION SEPARATOR', short: 'IAS' },
  0xfffb: { name: 'INTERLINEAR ANNOTATION TERMINATOR', short: 'IAT' },
};

/** 码点 → U+XXXX 十六进制表示 */
function codePointLabel(cp) {
  return `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
}

function charInfo(cp) {
  return CHAR_INFO[cp] || { name: codePointLabel(cp), short: codePointLabel(cp) };
}

/**
 * 是否为不可见字符：\p{Cf} 格式字符，或 \p{Cc} 控制字符（排除 \t \n \r）
 * @param {number} cp 码点
 */
function isInvisible(cp) {
  if (cp === 0x09 || cp === 0x0a || cp === 0x0d) return false;
  return /\p{Cf}|\p{Cc}/u.test(String.fromCodePoint(cp));
}

/**
 * 全局匹配所有不可见字符（内容层删除用）：
 * \p{Cf} + \p{Cc} 除 \t(09) \n(0A) \r(0D) 外 —— 与 isInvisible 同集合。
 * JS 正则不支持集合差集，故 Cc 部分显式列出除 09/0A/0D 的区间。
 */
const INVISIBLE_GLOBAL = /[\p{Cf}\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/gu;

/** 收集行内所有不可见字符，返回 [{ cp, col }]，col 为 1 起始的码点列号 */
function findInLine(line) {
  const found = [];
  let col = 0;
  for (const ch of line) {
    col += 1;
    const cp = ch.codePointAt(0);
    if (isInvisible(cp)) found.push({ cp, col });
  }
  return found;
}

/** 行预览：把不可见字符替换为 <短标签>，超长截断 */
function renderPreview(line) {
  const MAX = 100;
  let text = line.replace(/[\p{Cf}\p{Cc}]/gu, m => `<${charInfo(m.codePointAt(0)).short}>`);
  if (text.length > MAX) text = `${text.slice(0, MAX)}…`;
  return text;
}

/** 递归收集目录下的文本文件 */
function walkTextFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walkTextFiles(p, out);
    } else if (entry.isFile() && TEXT_EXT.has(extname(entry.name).toLowerCase())) {
      out.push(p);
    }
  }
  return out;
}

/**
 * 扫描不可见字符 + 处理文件头 BOM 主流程
 * @param {{ dir?: string, silent?: boolean, write?: boolean }} options
 *   write=true   默认模式：写回文件 —— 清除文件头 BOM + 移除内容层不可见字符
 *   write=false  --check 模式：只读，不修改任何文件；BOM 与不可见字符均计入失败项
 * @returns {{ fileCount: number, issues: Array, boms: string[], stripped: string[], byCp: object, removedCount: number }}
 *   issues:      [{ file, line, col, cp, name, preview }] —— 检测到的不可见字符（不含文件头 BOM）
 *   boms:        [file] —— 文件头含 UTF-8 BOM（仅只读模式非空）
 *   stripped:    [file] —— 已清除文件头 BOM（仅写回模式非空）
 *   removedCount: 写回模式下实际移除的不可见字符数
 */
export function scanInvisible(options = {}) {
  const { dir = null, silent = false, write = false } = options;

  const files = [];
  if (dir) {
    // --dir：仅扫描指定目录
    if (statSync(dir).isDirectory()) walkTextFiles(dir, files);
  } else {
    for (const d of DEFAULT_DIRS) {
      const abs = resolve(ROOT, d);
      if (existsSync(abs) && statSync(abs).isDirectory()) walkTextFiles(abs, files);
    }
    for (const f of DEFAULT_FILES) {
      const abs = resolve(ROOT, f);
      if (existsSync(abs) && statSync(abs).isFile()) files.push(abs);
    }
  }
  files.sort();

  const issues = [];
  const boms = [];
  const stripped = [];
  const byCp = new Map(); // cp → 次数
  let removedCount = 0;

  for (const abs of files) {
    const rel = relative(ROOT, abs);
    let content;
    try {
      content = readFileSync(abs, 'utf-8');
    } catch {
      continue; // 读取失败（如编码问题）跳过
    }

    // 文件头 BOM：write 模式写回清除；只读模式登记为失败项
    let bomStripped = false;
    if (content.charCodeAt(0) === 0xfeff) {
      content = content.slice(1);
      if (write) bomStripped = true;
      else boms.push(rel);
    }

    // 检测行内不可见字符（内容层）
    const fileIssues = [];
    content.split(/\r?\n/).forEach((line, idx) => {
      const found = findInLine(line);
      if (!found.length) return;
      const preview = renderPreview(line);
      for (const { cp, col } of found) {
        fileIssues.push({ file: rel, line: idx + 1, col, cp, name: charInfo(cp).name, preview });
      }
    });
    if (fileIssues.length) {
      issues.push(...fileIssues);
      for (const it of fileIssues) byCp.set(it.cp, (byCp.get(it.cp) || 0) + 1);
    }

    // write 模式：清除 BOM + 移除不可见字符后一次写回
    if (write && (bomStripped || fileIssues.length)) {
      if (fileIssues.length) content = content.replace(INVISIBLE_GLOBAL, '');
      try {
        writeFileSync(abs, content, 'utf-8');
        if (bomStripped) stripped.push(rel);
        removedCount += fileIssues.length;
      } catch {
        log.error(`✗ ${rel} 写回失败`);
      }
    }
  }

  if (!silent) {
    log.info(`扫描: ${files.length} 个文本文件`);
    for (const f of stripped) log.ok(`▸ ${f} — 已清除文件头 UTF-8 BOM`);
    if (stripped.length) log.ok(`已清除 ${stripped.length} 个 BOM`);
    for (const f of boms) log.error(`✗ ${f} 开头含 UTF-8 BOM（--check 视为未通过）`);
    if (issues.length) {
      for (const it of issues) {
        const msg = `${it.file}:${it.line}:${it.col} — ${codePointLabel(it.cp)} ${it.name}`;
        if (write) log.ok(`✂ ${msg}（已移除）`);
        else log.error(msg);
        console.log(`          │ ${it.preview}`);
      }
      if (write) {
        log.ok(`已移除 ${removedCount} 处不可见字符（${byCp.size} 种）：`);
        for (const [cp, n] of [...byCp.entries()].sort((a, b) => b[1] - a[1])) {
          log.ok(`  ${n}× ${codePointLabel(cp)} ${charInfo(cp).name}`);
        }
      } else {
        log.error(`发现 ${issues.length} 处不可见字符（${byCp.size} 种）：`);
        for (const [cp, n] of [...byCp.entries()].sort((a, b) => b[1] - a[1])) {
          log.error(`  ${n}× ${codePointLabel(cp)} ${charInfo(cp).name}`);
        }
      }
    } else if (!boms.length) {
      log.ok('未发现不可见字符');
    }
  }

  return { fileCount: files.length, issues, boms, stripped, byCp, removedCount };
}

function printUsage() {
  console.log(`用法:
  node scripts/check-invisible.mjs                扫描并清除 BOM + 移除不可见字符（写回文件）
  node scripts/check-invisible.mjs --check        只读检查：存在不可见字符或 BOM 则退出码 1
  node scripts/check-invisible.mjs --dir <目录>   仅扫描指定目录
  node scripts/check-invisible.mjs --help         打印用法`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    return;
  }
  const checkOnly = args.includes('--check');
  const dirIndex = args.indexOf('--dir');
  const dir = dirIndex >= 0 && args[dirIndex + 1]
    ? resolve(process.cwd(), args[dirIndex + 1])
    : null;

  try {
    const result = scanInvisible({ dir, silent: false, write: !checkOnly });
    if (checkOnly && (result.issues.length > 0 || result.boms.length > 0)) process.exit(1);
  } catch (error) {
    log.error(error instanceof Error ? error.message : String(error));
    printUsage();
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === SELF_PATH) {
  main();
}

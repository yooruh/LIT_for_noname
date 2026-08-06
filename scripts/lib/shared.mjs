/**
 * 叁岛世界 构建脚本 — 共享工具函数
 * 纯 Node.js 内置模块，零外部依赖
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

/** 项目根目录下的关键文件路径 */
export const PATHS = {
  root: ROOT,
  packageJson: resolve(ROOT, 'package.json'),
  extensionJs: resolve(ROOT, 'extension.js'),
  versionJson: resolve(ROOT, 'version.json'),
  infoJson: resolve(ROOT, 'info.json'),
  updateHtml: resolve(ROOT, 'style', 'html', 'update.html'),
};

/**
 * 读取 UTF-8 文本文件
 * @param {string} filePath 绝对路径
 * @returns {string}
 */
export function readFile(filePath) {
  return readFileSync(filePath, 'utf-8');
}

/**
 * 写入 UTF-8 文本文件
 * @param {string} filePath 绝对路径
 * @param {string} data
 */
export function writeFile(filePath, data) {
  writeFileSync(filePath, data, 'utf-8');
}

/**
 * 对文件内容执行正则替换并保存
 * @param {string} filePath 绝对路径
 * @param {RegExp|string} pattern
 * @param {string} replacement
 * @returns {{ oldContent: string, newContent: string, replaced: boolean }}
 */
export function replaceInFile(filePath, pattern, replacement) {
  const oldContent = readFile(filePath);
  const newContent = oldContent.replace(pattern, replacement);
  if (newContent !== oldContent) {
    writeFile(filePath, newContent);
  }
  return { oldContent, newContent, replaced: newContent !== oldContent };
}

/**
 * 从 extension.js 中读取当前版本号
 * @returns {string}
 */
export function getCurrentVersion() {
  const content = readFile(PATHS.extensionJs);
  const match = content.match(/const litVersion\s*=\s*"([^"]+)"/);
  if (!match) {
    throw new Error('无法从 extension.js 中解析出 litVersion');
  }
  return match[1];
}

/**
 * HTML 转义
 * @param {string} value
 * @returns {string}
 */
export function htmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 彩色日志输出
 */
export const log = {
  info(msg) {
    console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`);
  },
  ok(msg) {
    console.log(`\x1b[32m[OK]\x1b[0m ${msg}`);
  },
  warn(msg) {
    console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`);
  },
  error(msg) {
    console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`);
  },
  diff(label, oldVal, newVal, showContent = false) {
    console.log(`\n\x1b[1m--- ${label} ---\x1b[0m`);
    if (showContent) {
      console.log(`\x1b[31m- ${oldVal}\x1b[0m`);
      console.log(`\x1b[32m+ ${newVal}\x1b[0m`);
    } else {
      console.log(`  \x1b[31m${oldVal}\x1b[0m → \x1b[32m${newVal}\x1b[0m`);
    }
  },
};

/**
 * 版本号格式校验
 * 支持格式: 26.6.25.3 或 v26.6.25.3
 * @param {string} version
 * @returns {boolean}
 */
export function isValidVersion(version) {
  return /^v?\d+\.\d+\.\d+(?:\.\d+)?$/.test(version);
}

/**
 * 去掉版本号前面的 v 前缀
 * @param {string} version
 * @returns {string}
 */
export function stripV(version) {
  return String(version).replace(/^v/, '');
}

/**
 * 确保版本号带有 v 前缀 (用于 git tag)
 * @param {string} version
 * @returns {string}
 */
export function withV(version) {
  const v = stripV(version);
  return `v${v}`;
}

/**
 * 生成发布标签名（带 code-zip 后缀）。
 * 项目用 v{版本} 同时作为分支名，为避免「分支/标签同名」导致 git push 歧义，
 * 代码包标签统一为 v{版本}-code-zip。version.json 的 zip.tag 与发布脚本
 * 必须都用本函数生成，保证客户端按 tag 下载时与 Release 一致。
 * @param {string} version 不带 v 前缀的版本号，如 26.8.6.4
 * @returns {string}
 */
export function releaseTag(version) {
  return `${withV(version)}-code-zip`;
}

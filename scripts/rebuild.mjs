#!/usr/bin/env node

/**
 * 叁岛世界 重建脚本
 *
 * 自动扫描 roles/ 目录，生成 index.js 中的 ROLE_FILES 数组，
 * 以及更新 Directory.json 文件清单（供在线更新系统使用）。
 *
 * 用法:
 *   node scripts/rebuild.mjs           扫描并更新所有
 *   node scripts/rebuild.mjs --check   仅检查，不写入（CI 模式）
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname, relative, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile, readFile } from './lib/shared.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SELF_PATH = fileURLToPath(import.meta.url);

export const log = {
  info(msg) { console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`); },
  ok(msg) { console.log(`\x1b[32m[OK]\x1b[0m ${msg}`); },
  warn(msg) { console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`); },
  error(msg) { console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`); },
};

const EXCLUDES = [
  '.git',
  'node_modules',
  '.gitignore',
  '.vscode',
  'Directory.json',
  'version.json',
  'package.json',
  'package-lock.json',
  '.update_state.json',
  'scripts',
];

export function scanRoles(dirPath) {
  try {
    return readdirSync(dirPath)
      .filter(file => file.endsWith('.js'))
      .map(file => basename(file, '.js'))
      .sort();
  } catch {
    return [];
  }
}

export function updateIndexFile(indexPath, roleNames, checkOnly = false) {
  const oldContent = readFileSync(indexPath, 'utf-8');
  const arrayStr = JSON.stringify(roleNames);
  const pattern = /(const ROLE_FILES\s*=\s*)\[[^\]]*\]/;
  const replacement = `$1${arrayStr}`;
  const newContent = pattern.test(oldContent)
    ? oldContent.replace(pattern, replacement)
    : oldContent;

  if (!pattern.test(oldContent)) {
    log.warn(`${relative(ROOT, indexPath)} 中未找到 ROLE_FILES 数组，跳过`);
    return { file: relative(ROOT, indexPath), changed: false, skipped: true };
  }

  const changed = newContent !== oldContent;
  if (!checkOnly && changed) {
    writeFile(indexPath, newContent);
  }
  return { file: relative(ROOT, indexPath), changed, count: roleNames.length };
}

export function walkDir(dir, baseDir) {
  const result = {};
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.gitignore') continue;
      if (EXCLUDES.includes(entry.name)) continue;

      const fullPath = join(dir, entry.name);
      const relPath = relative(baseDir, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        Object.assign(result, walkDir(fullPath, baseDir));
      } else if (entry.isFile()) {
        try {
          const stat = statSync(fullPath);
          result[relPath] = { size: stat.size };
        } catch {
          result[relPath] = { size: 0 };
        }
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }
  return result;
}

export function updateDirectoryJson(checkOnly = false) {
  const manifest = walkDir(ROOT, ROOT);
  const newContent = JSON.stringify(manifest, null, 2) + '\n';
  const filePath = resolve(ROOT, 'Directory.json');
  const oldContent = readFile(filePath);
  const changed = oldContent !== newContent;

  if (!checkOnly && changed) {
    writeFile(filePath, newContent);
  }

  const fileCount = Object.keys(manifest).length;
  const totalSize = Object.values(manifest).reduce((sum, file) => sum + (file.size || 0), 0);
  return { file: 'Directory.json', changed, fileCount, totalSize };
}

export function rebuildProject(options = {}) {
  const { checkOnly = false, silent = false } = options;

  if (!silent) {
    console.log(`\n\x1b[35m叁岛世界 重建脚本\x1b[0m`);
    if (checkOnly) console.log('  (仅检查模式)\n');
  }

  const results = [];

  const litRolesDir = resolve(ROOT, 'source', 'character', 'lit', 'roles');
  const litIndexPath = resolve(ROOT, 'source', 'character', 'lit', 'index.js');
  const litRoles = scanRoles(litRolesDir);
  if (litRoles.length > 0) {
    const result = updateIndexFile(litIndexPath, litRoles, checkOnly);
    results.push(result);
    if (!silent) {
      log.ok(`lit/index.js — ${litRoles.length} 个角色${result.changed ? '（需同步）' : ''}`);
    }
  } else if (!silent) {
    log.warn('未找到 lit 角色文件');
  }

  const testRolesDir = resolve(ROOT, 'source', 'character', 'test', 'roles');
  const testIndexPath = resolve(ROOT, 'source', 'character', 'test', 'index.js');
  const testRoles = scanRoles(testRolesDir);
  if (testRoles.length > 0) {
    const result = updateIndexFile(testIndexPath, testRoles, checkOnly);
    results.push(result);
    if (!silent) {
      log.ok(`test/index.js — ${testRoles.length} 个角色${result.changed ? '（需同步）' : ''}`);
    }
  } else if (!silent) {
    log.warn('未找到 test 角色文件');
  }

  const directoryResult = updateDirectoryJson(checkOnly);
  results.push(directoryResult);
  if (!silent) {
    const sizeMB = (directoryResult.totalSize / (1024 * 1024)).toFixed(2);
    log.ok(`Directory.json — ${directoryResult.fileCount} 个文件, ${sizeMB} MB${directoryResult.changed ? '（需同步）' : ''}`);
    console.log(checkOnly
      ? '\n\x1b[33m检查模式：未写入任何文件。去掉 --check 以应用更改。\x1b[0m\n'
      : '\n\x1b[32m重建完成！\x1b[0m\n');
  }

  return results;
}

function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  rebuildProject({ checkOnly, silent: false });
}

if (process.argv[1] && resolve(process.argv[1]) === SELF_PATH) {
  main();
}

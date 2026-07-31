#!/usr/bin/env node

/**
 * 叁岛世界 重建脚本
 *
 * 自动扫描 roles/ 目录和角色/卡牌包入口，生成 ROLE_FILES 与包注册清单，
 * 校验角色文件命名，并更新 Directory.json（供在线更新系统使用）。
 *
 * 用法:
 *   node scripts/rebuild.mjs           扫描并更新所有
 *   node scripts/rebuild.mjs --check   仅检查，不写入（CI 模式）
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
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
  '.gitignore',
  '.vscode',
  'node_modules',
  'scripts',
  'release',
  'package.json',
  'package-lock.json',
  '.update_state.json',
  'Directory.json',
  'version.json',
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

const readObjectKeys = (source, exportName) => {
  const declaration = new RegExp(`export\\s+const\\s+${exportName}\\s*=`, 'g').exec(source);
  if (!declaration) return [];
  const start = declaration.index;
  const open = source.indexOf('{', start + declaration[0].length);
  if (open < 0) return [];

  const keys = [];
  let depth = 1;
  let quote = '';
  let escaped = false;
  for (let index = open + 1; index < source.length && depth > 0; index++) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '`') {
      quote = char;
      continue;
    }
    if (depth === 1 && (char === '"' || char === "'")) {
      const keyStart = index + 1;
      quote = char;
      escaped = false;
      while (++index < source.length) {
        const keyChar = source[index];
        if (escaped) escaped = false;
        else if (keyChar === '\\') escaped = true;
        else if (keyChar === quote) break;
      }
      quote = '';
      let colon = index + 1;
      while (/\s/.test(source[colon])) colon++;
      if (source[colon] === ':') keys.push(source.slice(keyStart, index));
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '{') depth++;
    else if (char === '}') depth--;
  }
  return keys;
};

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function validateRoleNames(rolesDir, roleNames) {
  const errors = [];
  for (const fileName of roleNames) {
    const filePath = resolve(rolesDir, `${fileName}.js`);
    const source = readFileSync(filePath, 'utf-8');
    const characterIds = readObjectKeys(source, 'character');
    if (characterIds.length !== 1) {
      errors.push(`${relative(ROOT, filePath)} 必须且只能导出一个 character`);
      continue;
    }

    const characterId = characterIds[0];
    const translateKeys = readObjectKeys(source, 'translate');
    if (!translateKeys.includes(characterId)) {
      errors.push(`${relative(ROOT, filePath)} 缺少角色翻译 ${characterId}`);
      continue;
    }

    const namespaceEnd = characterId.indexOf('_') + 1;
    const namespace = characterId.slice(0, namespaceEnd);
    const idWithoutNamespace = characterId.slice(namespaceEnd);
    if (!idWithoutNamespace.startsWith(fileName)) {
      errors.push(`${relative(ROOT, filePath)} 文件名应为角色 ID 的资源主名：期望 ${idWithoutNamespace} 以 ${fileName} 开头`);
      continue;
    }

    const escapedId = escapeRegExp(characterId);
    const translatedName = source.match(new RegExp(`["']${escapedId}["']\\s*:\\s*["']([^"']*)["']`))?.[1];
    const prefix = source.match(new RegExp(`["']${escapedId}_prefix["']\\s*:\\s*["']([^"']*)["']`))?.[1] || '';
    const roleName = translatedName?.startsWith(prefix) ? translatedName.slice(prefix.length) : translatedName;
    const expectedId = `${namespace}${fileName}${roleName || ''}`;
    if (characterId !== expectedId) {
      errors.push(`${relative(ROOT, filePath)} 角色 ID 不符合命名规则：期望 ${expectedId}，实际 ${characterId}`);
    }

    const imagePath = resolve(ROOT, 'image', 'character', `${namespace}${fileName}.png`);
    if (!existsSync(imagePath)) {
      errors.push(`${relative(ROOT, filePath)} 缺少对应角色图片 ${relative(ROOT, imagePath)}`);
    }
  }
  return errors;
}

export function scanPackEntries(dirPath, nestedIndexes = false) {
  if (!nestedIndexes) {
    return readdirSync(dirPath)
      .filter(file => file.endsWith('.js'))
      .filter(file => /export\s+(?:const|let)\s+info\s*=/.test(readFileSync(resolve(dirPath, file), 'utf-8')))
      .map(file => basename(file, '.js'))
      .sort();
  }

  return readdirSync(dirPath, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => `${entry.name}/index`)
    .filter(modulePath => {
      const filePath = resolve(dirPath, `${modulePath}.js`);
      return existsSync(filePath)
        && /export\s+(?:const|let)\s+info\s*=/.test(readFileSync(filePath, 'utf-8'));
    })
    .sort();
}

export function updatePackManifest(characterPacks, cardPacks, checkOnly = false) {
  const filePath = resolve(ROOT, 'source', 'tool', 'pack', 'manifest.js');
  const oldContent = readFileSync(filePath, 'utf-8');
  const newContent = oldContent
    .replace(/(CHARACTER_PACK_FILES\s*=\s*)\[[^\]]*\]/, `$1${JSON.stringify(characterPacks)}`)
    .replace(/(CARD_PACK_FILES\s*=\s*)\[[^\]]*\]/, `$1${JSON.stringify(cardPacks)}`);
  const changed = newContent !== oldContent;
  if (!checkOnly && changed) writeFile(filePath, newContent);
  return { file: relative(ROOT, filePath), changed, characterCount: characterPacks.length, cardCount: cardPacks.length };
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
  const rolePacks = [
    { name: 'lit', validate: true },
    { name: 'test', validate: true },
    { name: 'lit_gz', validate: false },
  ];
  const roleErrors = [];

  for (const pack of rolePacks) {
    const rolesDir = resolve(ROOT, 'source', 'character', pack.name, 'roles');
    const indexPath = resolve(ROOT, 'source', 'character', pack.name, 'index.js');
    const roles = scanRoles(rolesDir);
    if (pack.validate) roleErrors.push(...validateRoleNames(rolesDir, roles));
    if (!existsSync(indexPath)) continue;

    const result = updateIndexFile(indexPath, roles, checkOnly);
    results.push(result);
    if (!silent) {
      log.ok(`${pack.name}/index.js — ${roles.length} 个角色${result.changed ? '（需同步）' : ''}`);
    }
  }

  if (roleErrors.length > 0) {
    throw new Error(`角色文件命名校验失败：\n- ${roleErrors.join('\n- ')}`);
  }

  const characterPacks = scanPackEntries(resolve(ROOT, 'source', 'character'), true);
  const cardPacks = scanPackEntries(resolve(ROOT, 'source', 'card'));
  const manifestResult = updatePackManifest(characterPacks, cardPacks, checkOnly);
  results.push(manifestResult);
  if (!silent) {
    log.ok(`tool/pack/manifest.js — ${characterPacks.length} 个角色包，${cardPacks.length} 个卡牌包${manifestResult.changed ? '（需同步）' : ''}`);
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

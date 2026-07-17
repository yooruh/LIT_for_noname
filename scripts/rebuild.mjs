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

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, dirname, relative, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const log = {
    info(msg) { console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`); },
    ok(msg) { console.log(`\x1b[32m[OK]\x1b[0m ${msg}`); },
    warn(msg) { console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`); },
    error(msg) { console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`); },
};

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');

// ════════════════════════════════════════════════════════════
//  1. 扫描角色文件并更新 index.js
// ════════════════════════════════════════════════════════════

function scanRoles(dirPath) {
    try {
        return readdirSync(dirPath)
            .filter(f => f.endsWith('.js'))
            .map(f => basename(f, '.js'))
            .sort();
    } catch (e) {
        return [];
    }
}

function updateIndexFile(indexPath, roleNames) {
    let content = readFileSync(indexPath, 'utf-8');

    const arrayStr = JSON.stringify(roleNames);
    const pattern = /(const ROLE_FILES\s*=\s*)\[[^\]]*\]/;
    const replacement = `$1${arrayStr}`;

    if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
    } else {
        log.warn(`${relative(ROOT, indexPath)} 中未找到 ROLE_FILES 数组，跳过`);
        return false;
    }

    if (!checkOnly) {
        writeFileSync(indexPath, content, 'utf-8');
    }
    return true;
}

// ════════════════════════════════════════════════════════════
//  2. 生成 Directory.json 文件清单
// ════════════════════════════════════════════════════════════

const EXCLUDES = ['.git', 'node_modules', '.gitignore', '.vscode',
    'Directory.json', 'version.json', 'package.json', 'package-lock.json',
    '.update_state.json', 'scripts'];

function walkDir(dir, baseDir) {
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
                } catch (e) {
                    result[relPath] = { size: 0 };
                }
            }
        }
    } catch (e) {
        // Directory doesn't exist or can't be read
    }
    return result;
}

function updateDirectoryJson() {
    const manifest = walkDir(ROOT, ROOT);
    const fileCount = Object.keys(manifest).length;
    const totalSize = Object.values(manifest).reduce((s, f) => s + (f.size || 0), 0);

    if (!checkOnly) {
        writeFileSync(
            resolve(ROOT, 'Directory.json'),
            JSON.stringify(manifest, null, 2),
            'utf-8'
        );
    }
    return { fileCount, totalSize };
}

// ════════════════════════════════════════════════════════════
//  主流程
// ════════════════════════════════════════════════════════════

console.log(`\n\x1b[35m叁岛世界 重建脚本\x1b[0m`);
if (checkOnly) console.log('  (仅检查模式)\n');

// Lit pack
const litRolesDir = resolve(ROOT, 'source', 'character', 'lit', 'roles');
const litIndexPath = resolve(ROOT, 'source', 'character', 'lit', 'index.js');
const litRoles = scanRoles(litRolesDir);

if (litRoles.length > 0) {
    if (updateIndexFile(litIndexPath, litRoles)) {
        log.ok(`lit/index.js — ${litRoles.length} 个角色: ${litRoles.join(', ')}`);
    }
} else {
    log.warn('未找到 lit 角色文件');
}

// Test pack
const testRolesDir = resolve(ROOT, 'source', 'character', 'test', 'roles');
const testIndexPath = resolve(ROOT, 'source', 'character', 'test', 'index.js');
const testRoles = scanRoles(testRolesDir);

if (testRoles.length > 0) {
    if (updateIndexFile(testIndexPath, testRoles)) {
        log.ok(`test/index.js — ${testRoles.length} 个角色: ${testRoles.join(', ')}`);
    }
} else {
    log.warn('未找到 test 角色文件');
}

// Directory.json
const { fileCount, totalSize } = updateDirectoryJson();
const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
log.ok(`Directory.json — ${fileCount} 个文件, ${sizeMB} MB`);

console.log(checkOnly
    ? '\n\x1b[33m检查模式：未写入任何文件。去掉 --check 以应用更改。\x1b[0m\n'
    : '\n\x1b[32m重建完成！\x1b[0m\n');

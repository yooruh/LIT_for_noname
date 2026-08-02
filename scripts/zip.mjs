#!/usr/bin/env node

/**
 * 叁岛世界 发布包打包脚本
 *
 * 将项目根目录（与在线更新系统分发的文件集一致）打包为
 * `{版本}叁岛世界(一班杀).zip`，输出到仓库外的 `_others` 目录。
 * 版本号取自 release/releases.json 最新 release，文件名确定性可复现。
 *
 * Node 无内置 zip，此处用 node:zlib(deflateRawSync) 手写 ZIP 容器：
 * local header(0x04034b50) + 中央目录(0x02014b50) + EOCD(0x06054b50)，
 * 压缩级别 6 对齐 Python zipfile.ZIP_DEFLATED 默认值。
 *
 * 用法:
 *   node scripts/zip.mjs              按发布清单生成发布包
 *   node scripts/zip.mjs --dry-run    仅预览（不压缩、不写盘）
 *   node scripts/zip.mjs --check      校验现有发布包与预期文件集是否一致
 *   node scripts/zip.mjs -o <目录>    输出到指定目录（默认 ../_others）
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import { log } from './lib/shared.mjs';
import { crc32 } from './lib/crc32.mjs';
import { getCurrentReleaseVersion, readReleaseManifest } from './lib/release.mjs';
import { walkDir } from './rebuild.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SELF_PATH = fileURLToPath(import.meta.url);
const OUT_DIR = resolve(ROOT, '..', '_others');
const PACK_SUFFIX = '叁岛世界(一班杀).zip';

/** ZIP 条目 DOS 日期/时间 */
function dosDateTime(date) {
  return {
    dosDate: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    dosTime: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  };
}

/** local file header（30 字节定长前缀 + 文件名） */
function localHeader(name, entry) {
  const nameBuf = Buffer.from(name, 'utf8');
  const h = Buffer.alloc(30);
  h.writeUInt32LE(0x04034b50, 0);
  h.writeUInt16LE(20, 4);       // version needed
  h.writeUInt16LE(0, 6);        // flag
  h.writeUInt16LE(8, 8);        // method: deflate
  h.writeUInt16LE(entry.dosTime, 10);
  h.writeUInt16LE(entry.dosDate, 12);
  h.writeUInt32LE(entry.crc, 14);
  h.writeUInt32LE(entry.compressedSize, 18);
  h.writeUInt32LE(entry.size, 22);
  h.writeUInt16LE(nameBuf.length, 26);
  h.writeUInt16LE(0, 28);       // extra length
  return Buffer.concat([h, nameBuf]);
}

/** central directory entry（46 字节定长前缀 + 文件名） */
function centralEntry(name, entry, offset) {
  const nameBuf = Buffer.from(name, 'utf8');
  const h = Buffer.alloc(46);
  h.writeUInt32LE(0x02014b50, 0);
  h.writeUInt16LE(20, 4);       // version made by
  h.writeUInt16LE(20, 6);       // version needed
  h.writeUInt16LE(0, 8);        // flag
  h.writeUInt16LE(8, 10);       // method: deflate
  h.writeUInt16LE(entry.dosTime, 12);
  h.writeUInt16LE(entry.dosDate, 14);
  h.writeUInt32LE(entry.crc, 16);
  h.writeUInt32LE(entry.compressedSize, 20);
  h.writeUInt32LE(entry.size, 24);
  h.writeUInt16LE(nameBuf.length, 28);
  h.writeUInt16LE(0, 30);       // extra length
  h.writeUInt16LE(0, 32);       // comment length
  h.writeUInt16LE(0, 34);       // disk number start
  h.writeUInt16LE(0, 36);       // internal attrs
  h.writeUInt32LE(0, 38);       // external attrs
  h.writeUInt32LE(offset, 42);  // offset of local header
  return Buffer.concat([h, nameBuf]);
}

/** EOCD 记录（22 字节） */
function eocd(count, centralSize, centralOffset) {
  const h = Buffer.alloc(22);
  h.writeUInt32LE(0x06054b50, 0);
  h.writeUInt16LE(0, 4);
  h.writeUInt16LE(0, 6);
  h.writeUInt16LE(count, 8);
  h.writeUInt16LE(count, 10);
  h.writeUInt32LE(centralSize, 12);
  h.writeUInt32LE(centralOffset, 16);
  h.writeUInt16LE(0, 20);       // comment length
  return h;
}

/**
 * 内存中组装 zip 字节
 * @param {Array<{name:string, absPath:string, mtime:Date}>} files
 * @returns {Buffer}
 */
function buildZip(files) {
  const parts = [];
  const centrals = [];
  let offset = 0;
  for (const f of files) {
    const data = readFileSync(f.absPath);
    const compressed = deflateRawSync(data, { level: 6 });
    const entry = {
      crc: crc32(data),
      compressedSize: compressed.length,
      size: data.length,
      ...dosDateTime(f.mtime),
    };
    const lh = localHeader(f.name, entry);
    parts.push(lh, compressed);
    centrals.push(centralEntry(f.name, entry, offset));
    offset += lh.length + compressed.length;
  }
  const cd = Buffer.concat(centrals);
  parts.push(cd, eocd(files.length, cd.length, offset));
  return Buffer.concat(parts);
}

/**
 * 读取 zip 中央目录，返回条目 {name, size} 列表
 * @param {Buffer} zipBuf
 * @returns {Array<{name:string, size:number}>}
 */
function readCentralDirectory(zipBuf) {
  let eocdIndex = -1;
  const start = Math.max(zipBuf.length - 22 - 65535, 0);
  for (let i = zipBuf.length - 22; i >= start; i--) {
    if (zipBuf.readUInt32LE(i) === 0x06054b50) {
      eocdIndex = i;
      break;
    }
  }
  if (eocdIndex < 0) throw new Error('未找到 EOCD 记录');
  const count = zipBuf.readUInt16LE(eocdIndex + 10);
  const centralOffset = zipBuf.readUInt32LE(eocdIndex + 16);
  const entries = [];
  let p = centralOffset;
  for (let n = 0; n < count; n++) {
    if (zipBuf.readUInt32LE(p) !== 0x02014b50) throw new Error('中央目录签名不匹配');
    const nameLen = zipBuf.readUInt16LE(p + 28);
    const extraLen = zipBuf.readUInt16LE(p + 30);
    const commentLen = zipBuf.readUInt16LE(p + 32);
    entries.push({
      name: zipBuf.subarray(p + 46, p + 46 + nameLen).toString('utf8'),
      size: zipBuf.readUInt32LE(p + 24),
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/**
 * 计算待打包文件集：与 rebuild.walkDir 的排除规则一致，
 * 含 Directory.json（在线更新清单，本地副本供更新时精确清理失效文件）。
 * @returns {{ files: Array<{name:string, absPath:string, mtime:Date, size:number}>, fileCount:number, totalSize:number }}
 */
function buildManifest() {
  const manifest = walkDir(ROOT, ROOT);
  const files = Object.keys(manifest)
    .sort()
    .map(name => {
      const absPath = resolve(ROOT, name);
      const stat = statSync(absPath);
      return { name, absPath, mtime: stat.mtime, size: stat.size };
    });
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  return { files, fileCount: files.length, totalSize };
}

/**
 * 打包主流程
 * @param {{checkOnly?:boolean, outDir?:string, silent?:boolean}} options
 * @returns {{file:string, changed:boolean, fileCount:number, totalSize:number, zipSize?:number, version:string}}
 */
export function zipProject(options = {}) {
  const { checkOnly = false, outDir = OUT_DIR, silent = false } = options;
  const version = getCurrentReleaseVersion(readReleaseManifest());
  const filename = `${version}${PACK_SUFFIX}`;
  const outPath = resolve(outDir, filename);
  const { files, fileCount, totalSize } = buildManifest();

  if (checkOnly) {
    if (!existsSync(outPath)) {
      if (!silent) log.warn(`未找到 ${filename}，跳过校验`);
      return { file: filename, changed: false, fileCount, totalSize, version };
    }
    const expected = new Map(files.map(f => [f.name, f.size]));
    const actual = readCentralDirectory(readFileSync(outPath));
    const missing = [];
    const extra = [];
    const mismatch = [];
    for (const [name, size] of expected) {
      const hit = actual.find(e => e.name === name);
      if (!hit) missing.push(name);
      else if (hit.size !== size) mismatch.push(`${name} (期望 ${size}，实际 ${hit.size})`);
    }
    for (const e of actual) {
      if (!expected.has(e.name)) extra.push(e.name);
    }
    const changed = missing.length > 0 || extra.length > 0 || mismatch.length > 0;
    if (!silent) {
      if (changed) {
        log.error(`校验失败：缺失 ${missing.length}、多余 ${extra.length}、尺寸不符 ${mismatch.length}`);
        missing.forEach(n => log.error(`  缺失: ${n}`));
        extra.forEach(n => log.error(`  多余: ${n}`));
        mismatch.forEach(n => log.error(`  尺寸不符: ${n}`));
      } else {
        log.ok(`校验通过，${actual.length} 个文件与预期一致`);
      }
    }
    return { file: filename, changed, fileCount, totalSize, version };
  }

  // 真实写入：内存组装后与既有文件比对，内容一致则不重写
  const zipBuf = buildZip(files);
  const changed = !existsSync(outPath) || !readFileSync(outPath).equals(zipBuf);
  if (changed) {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(outPath, zipBuf);
  }
  if (!silent) {
    const mb = totalSize / (1024 * 1024);
    if (changed) {
      log.ok(`${filename} — ${fileCount} 个文件，${mb.toFixed(2)} MB，压缩后 ${(zipBuf.length / (1024 * 1024)).toFixed(2)} MB`);
    } else {
      log.warn('内容一致，未重新写入');
    }
  }
  return { file: filename, changed, fileCount, totalSize, zipSize: zipBuf.length, version };
}

function printUsage() {
  console.log(`用法:
  node scripts/zip.mjs              生成发布包（默认输出到 ../_others）
  node scripts/zip.mjs --dry-run    预览模式（不压缩、不写盘）
  node scripts/zip.mjs --check      校验现有发布包与预期文件集是否一致
  node scripts/zip.mjs -o <目录>    输出到指定目录`);
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const checkOnly = args.includes('--check');
  const outIndex = args.indexOf('-o') >= 0 ? args.indexOf('-o') : args.indexOf('--out');
  const outDir = outIndex >= 0 && args[outIndex + 1] ? resolve(process.cwd(), args[outIndex + 1]) : OUT_DIR;

  try {
    if (dryRun) {
      const version = getCurrentReleaseVersion(readReleaseManifest());
      const filename = `${version}${PACK_SUFFIX}`;
      const { files, fileCount, totalSize } = buildManifest();
      const mb = totalSize / (1024 * 1024);
      log.info(`当前发布版本: ${version}`);
      log.info(`文件名:       ${filename}`);
      log.info(`输出目录:     ${outDir}`);
      log.info(`文件数:       ${fileCount}`);
      log.info(`总大小:       ${mb.toFixed(2)} MB`);
      console.log('');
      console.log('\x1b[33m（预览模式，未写入任何文件）\x1b[0m');
      process.exit(0);
    }

    const result = zipProject({ checkOnly, outDir, silent: false });
    if (checkOnly && result.changed) {
      process.exit(1);
    }
  } catch (error) {
    log.error(error instanceof Error ? error.message : String(error));
    printUsage();
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === SELF_PATH) {
  main();
}

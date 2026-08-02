/**
 * 叁岛世界 开发同步 — 路径配置
 *
 * 将「项目固有配置」与「本机专属路径」分离：
 * - 本文件（随仓库提交）：devRoot、SYNC_ENTRIES 是项目固有内容。
 * - scripts/lib/dev-config.local.json（已加入 .gitignore，不随仓库上传）：
 *   存放本机安装目录 installed。该文件缺失时 installed 为空数组，
 *   同步工具会提示按 scripts/lib/dev-config.local.example.json 创建。
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PATHS } from './shared.mjs';

const LOCAL_FILE = fileURLToPath(new URL('./dev-config.local.json', import.meta.url));

/** 读取本机配置（不存在或解析失败时回退为空对象） */
function readLocal() {
  if (!existsSync(LOCAL_FILE)) return {};
  try {
    return JSON.parse(readFileSync(LOCAL_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

const local = readLocal();

/** 开发工作区根目录 = zip/ 项目根 */
export const devRoot = PATHS.root;

/** 两个已安装的游戏扩展目录（离线版 + 联机版）——来自本机配置，勿提交 */
export const installed = Array.isArray(local.installed) ? local.installed : [];

/**
 * 需要同步的顶层条目（相对 devRoot 与已安装目录）。
 * 当前布局无 script/（已并入 source/），补上 image/ 与 audio/，
 * 与已安装目录中的实际内容保持一致。
 */
export const SYNC_ENTRIES = ['extension.js', 'info.json', 'style', 'source', 'image', 'audio'];

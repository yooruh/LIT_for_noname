import { basename, resolve } from 'node:path';
import {
  PATHS,
  readFile,
  writeFile,
  replaceInFile,
  stripV,
  isValidVersion,
  htmlEscape,
} from './shared.mjs';

const RELEASES_PATH = resolve(PATHS.root, 'release', 'releases.json');
const CONTENT_JS_PATH = resolve(PATHS.root, 'source', 'content.js');
const CIRCLED_NUMBERS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';

export function getReleaseManifestPath() {
  return RELEASES_PATH;
}

export function readReleaseManifest() {
  const manifest = JSON.parse(readFile(RELEASES_PATH));
  validateManifest(manifest);
  return manifest;
}

export function writeReleaseManifest(manifest) {
  validateManifest(manifest);
  writeFile(RELEASES_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}

export function getLatestRelease(manifest = readReleaseManifest()) {
  return manifest.releases[0];
}

export function getCurrentReleaseVersion(manifest = readReleaseManifest()) {
  return stripV(getLatestRelease(manifest).version);
}

export function createReleaseSkeleton(version, manifest = readReleaseManifest()) {
  const normalizedVersion = stripV(version);
  if (!isValidVersion(normalizedVersion)) {
    throw new Error(`无效的版本号格式: "${version}"`);
  }

  const latest = getLatestRelease(manifest);
  const currentVersion = stripV(latest.version);
  if (manifest.releases.some(release => stripV(release.version) === normalizedVersion)) {
    throw new Error(`版本 ${normalizedVersion} 已存在于 release/releases.json 中`);
  }
  if (compareVersion(normalizedVersion, currentVersion) <= 0) {
    throw new Error(`新版本 ${normalizedVersion} 必须大于当前版本 ${currentVersion}`);
  }

  return {
    version: normalizedVersion,
    gameVersion: latest.gameVersion || '>=1.11.2',
    branch: manifest.defaultBranch || 'main',
    description: latest.description || '支持无名杀1.11.2以上的版本',
    players: [],
    highlights: [
      '待补充更新内容',
    ],
    footerNotes: [],
  };
}

export function scaffoldRelease(version, options = {}) {
  const { dryRun = false } = options;
  const manifest = readReleaseManifest();
  const newRelease = createReleaseSkeleton(version, manifest);
  const nextManifest = {
    ...manifest,
    releases: [newRelease, ...manifest.releases],
  };

  if (!dryRun) {
    writeReleaseManifest(nextManifest);
  }

  return {
    file: 'release/releases.json',
    changed: true,
    release: newRelease,
    manifest: nextManifest,
  };
}

export function validateManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('release/releases.json 必须是对象');
  }
  if (!Array.isArray(manifest.releases) || manifest.releases.length === 0) {
    throw new Error('release/releases.json 中的 releases 不能为空');
  }

  const seen = new Set();
  manifest.releases.forEach((release, index) => {
    const label = `releases[${index}]`;
    if (!release || typeof release !== 'object') {
      throw new Error(`${label} 必须是对象`);
    }
    if (!release.version || !isValidVersion(release.version)) {
      throw new Error(`${label}.version 不是合法版本号`);
    }

    const version = stripV(release.version);
    if (seen.has(version)) {
      throw new Error(`版本号重复: ${version}`);
    }
    seen.add(version);

    if (release.displayVersion && !isValidVersion(release.displayVersion)) {
      throw new Error(`${label}.displayVersion 不是合法版本号`);
    }
    if (!Array.isArray(release.highlights) || release.highlights.length === 0) {
      throw new Error(`${label}.highlights 不能为空数组`);
    }
    if (release.players && !Array.isArray(release.players)) {
      throw new Error(`${label}.players 必须是数组`);
    }
    if (release.footerNotes && !Array.isArray(release.footerNotes)) {
      throw new Error(`${label}.footerNotes 必须是数组`);
    }
  });
}

export function manifestToVersionJson(manifest) {
  return {
    defaultBranch: manifest.defaultBranch || 'main',
    // 只保留当前版本（releases[0]，与 getLatestRelease 约定一致）：
    // 新版更新器只支持带代码包 zip 的目标，旧版本不再在 version.json 中宣告；
    // 旧版本更新器从 main 读到此单条目仍可逐文件升到新版。releases.json 保留完整历史。
    versions: manifest.releases
      .filter((release, index) => index === 0 && release.gameVersion)
      .map(release => ({
        extensionVersion: stripV(release.version),
        gameVersion: release.gameVersion,
        branch: release.branch || (stripV(release.version) === getCurrentReleaseVersion(manifest) ? (manifest.defaultBranch || 'main') : `v${stripV(release.version)}`),
        description: release.description || `支持无名杀${release.gameVersion}版本`,
        highlights: Array.isArray(release.highlights) ? release.highlights : [],
      })),
  };
}

export function renderUpdateHtml(manifest) {
  const blocks = manifest.releases.map((release, index) => renderUpdateBlock(release, index)).join('\n\n');
  return `<!DOCTYPE html>
<html lang="zh-CN">

<head>
	<meta charset="UTF-8">
	<title>叁岛世界更新日志</title>
	<style>
		.update-log {
			font-family: "Microsoft YaHei", Arial, sans-serif;
			width: 90%;
			max-width: 1200px;
			margin: 20px auto;
			padding: 30px 40px;
			background: #fff;
			border-radius: 12px;
			box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
		}

		body {
			margin: 0;
			padding: 20px;
			min-width: 320px;
			background: #f5f7f9;
		}

		.update-block {
			margin-bottom: 35px;
			border-left: 3px solid #3498db;
			padding-left: 20px;
		}

		h1 {
			color: #2c3e50;
			text-align: center;
			margin-bottom: 40px;
			font-size: 28px;
		}

		h3 {
			color: #3498db;
			margin: 25px 0 15px;
			font-size: 19px;
		}

		.update-list {
			list-style: none;
			padding-left: 0;
		}

		.update-list li {
			margin-bottom: 12px;
			line-height: 1.8;
			padding-left: 2em;
			text-indent: -2em;
			color: #555;
		}

		.update-list li::before {
			content: "・";
			color: #3498db;
			margin-right: 8px;
		}

		.notice-text p {
			color: #888;
			font-size: 14px;
			text-align: center;
			margin: -20px 0 30px;
			line-height: 1.4;
		}

		.dash-line {
			color: #ddd;
			text-align: center;
			letter-spacing: 3px;
			margin: 15px 0 25px;
			font-family: monospace;
		}
	</style>
</head>

<body>
	<div class="update-log">
		<h1>叁岛世界更新日志</h1>
		<div class="notice-text">
			<p>如果游玩过程中有任何Bug，还请见谅并及时反馈……？</p>
		</div>

${blocks}
	</div>
</body>

</html>
`;
}

export function renderContentJs(manifest) {
  const latest = getLatestRelease(manifest);
  const players = latest.players || [];
  const footerNotes = latest.footerNotes || [];
  const bodyLines = latest.highlights.map((item, index) => `${formatOrder(index + 1)} ${renderRuntimeMarkup(item)}<br>`);
  const footerLines = footerNotes.map(item => `<li>${renderRuntimeMarkup(item)}</li>`);
  const htmlParts = [
    '<div style="text-align: left;font-size: 16px;">',
    ...bodyLines,
  ];
  if (footerLines.length > 0) {
    htmlParts.push('<hr>', ...footerLines);
  }
  htmlParts.push('</div>');

  const updateContentBlock = `export const updateContent = [
\t{ type: "players", data: ${renderPlayersArray(players)} },
\t{
\t\ttype: "text", addText: true, data: \`${jsTemplateEscape(htmlParts.join('\n'))}\`
\t}
];`;

  const content = readFile(CONTENT_JS_PATH);
  return content.replace(
    /export const updateContent = \[[\s\S]*?\];/,
    updateContentBlock
  );
}

export function syncVersionFiles(version, dryRun = false) {
  return [
    syncPackageJson(version, dryRun),
    syncExtensionJs(version, dryRun),
    syncInfoJson(version, dryRun),
  ];
}

export function writeVersionJson(manifest, dryRun = false) {
  // 回填旧 version.json 中各版本的 zip 元数据，避免 build.mjs 重建时把 zip 信息冲掉
  const zipByVersion = readZipMetaMap();
  const versionJson = manifestToVersionJson(manifest);
  for (const entry of versionJson.versions) {
    if (zipByVersion.has(entry.extensionVersion)) {
      entry.zip = zipByVersion.get(entry.extensionVersion);
    }
  }
  const newContent = JSON.stringify(versionJson, null, 2) + '\n';
  return writeWholeFile(PATHS.versionJson, newContent, dryRun);
}

/** 读取磁盘上旧 version.json 的 extensionVersion → zip 映射；缺失/解析失败返回空 Map */
function readZipMetaMap() {
  try {
    const current = JSON.parse(readFile(PATHS.versionJson));
    const map = new Map();
    for (const entry of current.versions || []) {
      if (entry.zip && entry.zip.filename) map.set(stripV(entry.extensionVersion), entry.zip);
    }
    return map;
  } catch {
    return new Map();
  }
}

/**
 * 把某个版本的代码包元数据写入 version.json 的 zip 字段（客户端据此构造下载地址）。
 * @param {string} version 版本号（可带 v 前缀）
 * @param {{filename:string, size:number, md5:string, branch:string, tag:string}} zipInfo
 * @returns {object} 写入的 zip 元数据
 */
export function patchVersionJsonZip(version, zipInfo) {
  const current = JSON.parse(readFile(PATHS.versionJson));
  const entry = current.versions.find(v => stripV(v.extensionVersion) === stripV(version));
  if (!entry) throw new Error(`version.json 中未找到版本 ${version}，无法写入 zip 元数据`);
  entry.zip = {
    filename: zipInfo.filename,
    size: zipInfo.size,
    md5: zipInfo.md5,
    branch: zipInfo.branch,
    tag: zipInfo.tag,
  };
  writeFile(PATHS.versionJson, `${JSON.stringify(current, null, 2)}\n`);
  return entry.zip;
}

export function writeUpdateHtml(manifest, dryRun = false) {
  return writeWholeFile(PATHS.updateHtml, renderUpdateHtml(manifest), dryRun);
}

export function writeContentJs(manifest, dryRun = false) {
  return writeWholeFile(CONTENT_JS_PATH, renderContentJs(manifest), dryRun);
}

function syncPackageJson(version, dryRun) {
  const oldContent = readFile(PATHS.packageJson);
  const pattern = /("version"\s*:\s*")([^"]+)(")/;
  const replacement = `$1${stripV(version)}$3`;
  const newContent = oldContent.replace(pattern, replacement);
  if (!dryRun && newContent !== oldContent) {
    replaceInFile(PATHS.packageJson, pattern, replacement);
  }
  return { file: 'package.json', changed: newContent !== oldContent };
}

function syncExtensionJs(version, dryRun) {
  const oldContent = readFile(PATHS.extensionJs);
  const pattern = /(const litVersion\s*=\s*)".*?"/;
  const replacement = `$1"${stripV(version)}"`;
  const newContent = oldContent.replace(pattern, replacement);
  if (!dryRun && newContent !== oldContent) {
    replaceInFile(PATHS.extensionJs, pattern, replacement);
  }
  return { file: 'extension.js', changed: newContent !== oldContent };
}

function syncInfoJson(version, dryRun) {
  const oldContent = readFile(PATHS.infoJson);
  const pattern = /(版本：)[^"<\\]+/;
  const replacement = `$1${stripV(version)}`;
  const newContent = oldContent.replace(pattern, replacement);
  if (!dryRun && newContent !== oldContent) {
    replaceInFile(PATHS.infoJson, pattern, replacement);
  }
  return { file: 'info.json', changed: newContent !== oldContent };
}

function writeWholeFile(filePath, newContent, dryRun) {
  const oldContent = readFile(filePath);
  const changed = oldContent !== newContent;
  if (!dryRun && changed) {
    writeFile(filePath, newContent);
  }
  return { file: basename(filePath), changed };
}

function renderUpdateBlock(release, index) {
  const title = index === 0
    ? '{{version}}更新（当前版本）'
    : `${stripV(release.displayVersion || release.version)}更新`;
  const items = release.highlights
    .map((item, itemIndex) => `\t\t\t\t<li>${formatOrder(itemIndex + 1)} ${renderStaticMarkup(item)}</li>`)
    .join('\n');

  return `\t\t<div class="update-block">
\t\t\t<h3>${title}</h3>
\t\t\t<ul class="update-list">
${items}
\t\t\t</ul>
\t\t</div>`;
}

function renderStaticMarkup(text) {
  return htmlEscape(text)
    .replace(/&lt;br&gt;/g, '<br>')
    .replace(/&amp;(lt|gt|quot|#39);/g, '&$1;')
    .replace(/\{\{poptip:([^}]+)\}\}/g, (_, token) => htmlEscape(extractPoptipLabel(token)));
}

function renderRuntimeMarkup(text) {
  return text.replace(/\{\{poptip:([^}]+)\}\}/g, (_, token) => {
    const { arg } = parsePoptipToken(token);
    return '${get.poptip(' + JSON.stringify(arg) + ')}';
  });
}

function renderPlayersArray(players) {
  if (players.length === 0) {
    return '[]';
  }
  return `[
${players.map(player => `\t\t${JSON.stringify(player)}`).join(',\n')}
\t]`;
}

function extractPoptipLabel(token) {
  return parsePoptipToken(token).label;
}

function parsePoptipToken(token) {
  const [arg, label] = token.split('|');
  return {
    arg,
    label: label || arg.replace(/^[a-z0-9_]+/i, '') || arg,
  };
}

function formatOrder(index) {
  return CIRCLED_NUMBERS[index - 1] || `${index}.`;
}

function jsTemplateEscape(value) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`');
}

function compareVersion(a, b) {
  const left = String(a).replace(/^v/, '').split('.').map(Number);
  const right = String(b).replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const x = left[i] || 0;
    const y = right[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

import { lib, game, ui, get, ai, _status } from '../../noname.js'
import basic from './source/tool/basic.js'
import help from './source/help.js'
import { config } from './source/config.js'
import { precontent } from './source/precontent.js'
import { content } from './source/content.js'
export let type = 'extension';

export default async function () {
	// 特别提醒+最低版本限制
	let litVersion = "26.1.14", minGameVersion = "1.11.0".split('.').slice(), gameVersion = lib.version.split('.').slice();
	const alertsConfig = [
		{
			id: 'onlineFix',
			shouldAlert: () => lib.config.extensions.includes('联机修改') && lib.config['extension_联机修改_enable'],
			message: '扩展内整合了《联机修改》相关代码，为防止冲突，请勿同时开启类似功能',
			action: () => lib.config['extension_叁岛世界_fix_onlineFixCancel'] = true,
		},
		{
			id: 'jbs',
			shouldAlert: () => lib.config.extensions.includes('九班杀') && lib.config['extension_九班杀_enable'],
			message: '该扩展内含“吊卡”，最好不要与已开启“吊卡”的九班杀扩展共存！'
		},
		{
			id: 'gameVersion',
			shouldAlert: () => {
				for (let i in minGameVersion) {
					let ver = Number(gameVersion[i] ?? 0);
					if (ver < minGameVersion[i]) return true;
					if (ver > minGameVersion[i]) return false;
				}
				return false;
			},
			shouldReload: true,
			message: `※ 检测到当前无名杀版本（v${lib.version}）低于测试过的最低版本(v${minGameVersion.join(".")})，已自动关闭本扩展，此后可自行开启`,
			action: () => {
				game.saveExtensionConfig('叁岛世界', 'enable', false);
			},
		},
	];
	const alertDone = game.getExtensionConfig('叁岛世界', 'firstTime') ?? [];
	const triggeredAlerts = [], alertMessages = [], pendingActions = [];
	for (const { id, shouldAlert, shouldReload, message, action } of alertsConfig) {
		if (!alertDone.includes(id) && shouldAlert()) {
			triggeredAlerts.push(id);
			alertMessages.push(message);
			if (action) pendingActions.push(action);
			if (shouldReload) pendingActions.push("reload");
		}
	}
	if (triggeredAlerts.length) {
		alert(`《叁岛世界》扩展提示您：\n${alertMessages.join('\n')}`);
		pendingActions.forEach(action => typeof action === 'function' ? action() : null);
		alertDone.push(...triggeredAlerts);
		game.saveExtensionConfig('叁岛世界', 'firstTime', alertDone);
		if (pendingActions.includes("reload")) game.reload();
	}

	// 于info.json配置中获取当前版本信息并记录于配置内
	let extensionInfo;
	try {
		extensionInfo = await lib.init.promises.json(`${basic.path}/info.json`);
		// info版本和代码版本不一致时使用代码版本
		let versionIndex = extensionInfo.intro.lastIndexOf('版本：') + 3;
		if (versionIndex > 3) {
			let infoVersion = extensionInfo.intro.slice(versionIndex);
			if (litVersion != infoVersion) {
				extensionInfo.intro = extensionInfo.intro.replace(infoVersion, litVersion);
				const jsonStr = JSON.stringify(extensionInfo, null, 2);
				game.writeFile(jsonStr, basic.path, 'info.json', (writeError) => {
					if (writeError) console.error(`创建info.json时发生错误:`, writeError);
				});
			}
		} else {
			extensionInfo.intro += `<li>版本：${litVersion}`;
		}
	} catch (e) {
		// 使用默认info
		extensionInfo = { name: "叁岛世界", author: "一个月惹", intro: `<li>版本：${litVersion}` };
		if (e && e.message?.includes("Not Found")) {
			const jsonStr = JSON.stringify(extensionInfo, null, 2);
			game.writeFile(jsonStr, basic.path, 'info.json', (writeError) => {
				if (writeError) console.error(`创建info.json时发生错误:`, writeError);
			});
		}
	}
	if (game.getExtensionConfig('叁岛世界', 'version') != litVersion) {
		game.saveExtensionConfig('叁岛世界', 'version', litVersion);
		// 附加功能判断时间早于init应用，首次启动时对应配置为空，故手动应用默认配置并重载游戏，确保扩展首次启动的默认配置正确
		Object.keys(config).forEach(s => {
			if (s.startsWith('lit_') || s === "intro") return;
			lib.config['extension_叁岛世界_' + s] = lib.config['extension_叁岛世界_' + s] ?? config[s].init;
		});
		// 禁用技能组合
		let customforbidArray = [
			// ["lit_renxiao", "lit_nitian"],
		];
		customforbidArray.forEach(newArray => {
			// 检查是否已存在相同技能组合数组
			const exists = lib.config.customforbid.some(existArray => {
				return existArray.length === newArray.length &&
					existArray.every((item, index) => item === newArray[index]);
			});
			if (!exists) lib.config.customforbid.push(newArray);
		});
		game.saveConfig("customforbid", lib.config.customforbid);
		game.reload();
	}
	let extension = {
		name: extensionInfo.name, editable: true,
		content, precontent, config, help,
		package: {/*intro:+"<img style=width:238px src=" + lib.assetURL + "></img>" ,插入图片*/ },
	};
	extension.config.intro.name += extensionInfo.intro;
	return extension;
}
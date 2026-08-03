import { lib, game, ui, get, ai, _status } from '../../../noname.js'
import { lib_lit } from './precontent.js';
import { updateContent } from './content.js';
import { translate as dkTranslate } from './card/lit_card/translate.js';
import { dialogManager } from './tool/ui/dialogManager.js'
import { extensionPath } from './tool/utils/paths.js'

// 事件处理函数
const changelogOnclick = () => {
	const updateURL = `${extensionPath}/style/html/update.html`.replace(/'/g, "\\'");
	const version = game.getExtensionConfig('叁岛世界', 'version') || '未知版本';
	const dataProcessor = (content) => content.replace("{{version}}", version);

	dialogManager.closeAll();
	dialogManager.showDocModal(updateURL, '更新日志', dataProcessor);
};

if (!window.lit) window.lit = {};
window.lit.changelogOnclick = changelogOnclick;

// 帮助文本模块
const helpSections = {
	// 语音指令部分
	get voice() {
		return `技能语音<br>
<ul>/skill（或/s）<br>+技能代码 +任意文本（默认为台词）<br>
例：/s jiwu 2 今天，就让你们感受一下真正的绝望！</ul>
阵亡语音<br>
<ul>/die（或/d）<br>+武将内部名 +任意文本（默认为台词）<br>
例：/d caocao 大爷胃疼！胃疼啊！！</ul>`
	},

	// 升级系统部分
	get upgrade() {
		return `升级（仅"叁"势力拥有）<br>
<li>升级条件：
<ul>击杀1名角色时，全场获得1点经验，击杀者额外获得1点经验；经验达到3点即可升级</ul>
<ul>全场人数不足5人时（含开局、含对局中），全体升级；玩家为主公时，开局立即升级</ul>
<li>升级效果：
<ul>升级将会明置对应角色，同时获得强力增益，重置相关技能次数，若未拥有升级前的技能，则会获得升级后的技能</ul>`;
	},

	// 吊卡技能部分
	get dkSkills() {
		let skillTranslate = '';
		for (const skill of lib_lit.dkSkills) {
			skillTranslate += `<ul><li>${dkTranslate[skill]}${dkTranslate[skill + '_limit'] ?? ''}</li>`
			skillTranslate += `${dkTranslate[skill + '_info']}</ul>`
		}
		return `吊卡技能（括号内为获取条件）<br>` +
			`<li>角色阵亡后失去吊卡技能</li>` +
			skillTranslate;
	},

	// 韵母表部分
	get rhymeTable() {
		return `韵脚表<br>
<table border="1">
	<tr><td>一麻</td><td>a, ia, ua</td></tr>
	<tr><td>二波</td><td>o, e, uo</td></tr>
	<tr><td>三皆</td><td>ie, üe</td></tr>
	<tr><td>四开</td><td>ai, uai</td></tr>
	<tr><td>五微</td><td>ei, ui</td></tr>
	<tr><td>六豪</td><td>ao, iao</td></tr>
	<tr><td>七尤</td><td>ou, iu</td></tr>
	<tr><td>八寒</td><td>an, ian, uan, üan</td></tr>
	<tr><td>九文</td><td>en, in, un, ün</td></tr>
	<tr><td>十唐</td><td>ang, iang, uang</td></tr>
	<tr><td>十一庚</td><td>eng, ing, ong, ung</td></tr>
	<tr><td>十二齐</td><td>i, er, ü</td></tr>
	<tr><td>十三支</td><td>-i</td></tr>
	<tr><td>十四姑</td><td>u</td></tr>
</table>`;
	},

	// 更新内容部分
	get updateInfo() {
		let str = updateContent[1].data;
		str = str.slice(0, str.lastIndexOf('<hr>'));
		str = str.slice(0, str.lastIndexOf('<br>'));
		str += '</div>';
		return `叁岛世界（${game.getExtensionConfig('叁岛世界', 'version')}更新）<br>${str}`;
	},

	// 更新日志链接
	get changelogLink() {
		return `<hr>
<a onclick="window.lit.changelogOnclick()" style="cursor:pointer;text-decoration:underline">
	查看完整历史更新日志
</a><br>`;
	}
};

export default {
	get "叁岛世界"() {
		return [
			helpSections.voice,
			helpSections.upgrade,
			helpSections.dkSkills,
			helpSections.rhymeTable,
			helpSections.updateInfo,
			helpSections.changelogLink
		].join('<br>');
	},
}
import { lib, game, ui, get, ai, _status } from '../../../noname.js'
import { lib_lit } from './precontent.js';
import { translate } from './card/lit_cardTranslate.js';
import { Lit_Dialog } from './tool/extraUI.js'
import basic from './tool/basic.js'

function getDKskillsHelp() {
	let str = '';
	for(let skill of lib_lit.dkSkills){
		str += `<ul><li>${translate[skill]}${translate[skill+'_limit']??''}<br>`
		str += `${translate[skill+'_info']}</ul>\n`
	}
	return str;
}

const lit_changelogOnclick = () => {
	const updateURL = `${basic.path}/style/html/update.html`.replace(/'/g, "\\'");
	const version = game.getExtensionConfig('叁岛世界', 'version') || '未知版本';
	const dataProcessor = (content) => content.replace("{{version}}", version);

	// 调用模块
	Lit_Dialog.showDocModal(updateURL, '更新日志', dataProcessor);
};
window.lit_changelogOnclick = lit_changelogOnclick;

export default {
	"叁岛世界": `
技能语音<br>
<ul>/skill（或/s）<br>+技能代码 +任意文本（默认为台词）<br>
例：/s jiwu 2 今天，就让你们感受一下真正的绝望！</ul>
阵亡语音<br>
<ul>/die（或/d）<br>+武将内部名 +任意文本（默认为台词）<br>
例：/d caocao 大爷胃疼！胃疼啊！！</ul>

升级（仅"叁"势力拥有）<br>
<li>升级条件：
<ul>场上每有1名角色死亡全体获得1点经验，击杀者额外获得1点经验，经验达到3或全场人数不足5时升级</ul>\
<li>升级效果：
<ul>升级将会明置对应角色，同时获得强力增益，重置相关技能次数，若未拥有升级前的技能，则会获得升级后的技能</ul>

吊卡技能（括号内为获取条件）<br>
<li>角色阵亡后失去吊卡技能</li>
${getDKskillsHelp()}

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
</table>
<br>当前版本（${game.getExtensionConfig('叁岛世界', 'version')}）：<br>
① 加入全新角色：张驰、杨湘铃；<br>
② 平衡林淼、菠树角色强度，减少设计撞车；<br>
③ 开启叁岛国战的实验性测试，已知大量Bug，先平衡强度，以后会修；<br>
④ 一并为更新日志和帮助文档添加HTML介绍，分别可在旧帮助界面和叁岛世界设置中找到；<br>
⑤ 取消原append形式的技能补充介绍，转而使用右键小窗口（或长按屏幕）；<br>
⑥ 修复Bug，调整V2技能描述，重命名角色ID。<br>
<hr>
<a  onclick="window.lit_changelogOnclick()" 
	style="cursor:pointer;text-decoration:underline">
	查看完整历史更新日志
</a><br>`
}
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
	Lit_Dialog.closeAll();
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
① 加入角色：${get.poptip("lit_wangrong王荣")} 以及吊卡技能：${get.poptip("lit_caichendekuangre")}、${get.poptip("lit_rongshaodejian")}；<br>
② 调整了${get.poptip("lit_yangxiangling杨湘铃")}、${get.poptip("lit_hupan胡畔")}、${get.poptip("lit_zhengmohan郑墨翰")}、${get.poptip("lit_qianbaocan钱保灿")}的强度及部分技能的AI逻辑；<br>
③ 叁岛国战：重构导入逻辑（由于本体国战模式重做，故暂停叁岛国战的更新）；<br>
④ “叁岛测试”角色包上线：其中的6个《九班杀》老角色默认关闭，需手动开启。注意：强度、AI、兼容性均未完成优化，极可能存在Bug；<br>
⑤ 引入了新UI以代替部分老代码，加入“在线更新扩展（测试，暂时仅支持电脑版）”“应用推荐的无名杀全局设置”功能。此外，本体已加入名词解释超链接和复活事件，本扩展不再额外重复；<br>
⑥ 部分角色新增可选皮肤，以前的皮肤用AI塑炼了一下，清晰度↗，占用空间↘<br>
<hr>
<a  onclick="window.lit_changelogOnclick()" 
	style="cursor:pointer;text-decoration:underline">
	查看完整历史更新日志
</a><br>`
}
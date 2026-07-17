import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';
import { Styled } from '../../tool/basic.js';

const X = Styled('b', 'X'), Y = Styled('p', 'Y'), Z = Styled('y', 'Z');

export const fullTranslate = {
    'lit': "叁岛世界",
    'lit_gz': "叁岛国战",
    'lit_test': "叁岛测试",
    'lit_ybs': "一班杀",
    'lit_sdp': "叁岛篇",
    'lit_jbs': "九班杀",

    'lit_negClear_faq': "负面效果",
    'lit_negClear_faq_info': "视为锁定技，满足条件或执行完成后清除，也会在死亡后清除。在清除后会恢复因负面效果而临时造成的影响",

    'lit_shengji': "升级",
    'lit_shengji_info': "场上每有一名角色死亡，所有角色获得1点经验，击杀者额外获得1点经验，当经验值达到3或全场角色数小于5时升级",
    'lit_shengjiqb': "升级·Qb",
    'lit_shengjiqb_info': `${get.poptip('lit_tiannaV2')} 获得〖天呐〗并于末尾增加：当你体力值大于1且受到伤害时，若此伤害会使你体力值小于1，则防止此伤害并将体力值减至1`,
    'lit_shengjizsj': "升级·张盛杰",
    'lit_shengjizsj_info': `获得场上所有人判定区和手牌中的延时锦囊牌`,
    'lit_shengjizqy': "升级·张钦奕",
    'lit_shengjizqy_info': `${get.poptip('lit_zishaV2')} 获得〖紫砂〗并于开头增加：准备阶段，你可以失去${Y}点体力，然后摸2${Y}张牌（${Y}不超过体力值）`,
    'lit_shengjipjl': "升级·庞建龙",
    'lit_shengjipjl_info': `${get.poptip('lit_duilianV2')} 获得并修改〖对练〗：出牌阶段限一次，你可以选择任意名角色，令这些角色依次选择是否对你选择的另一名角色使用【决斗】，此【决斗】不可被【无懈可击】响应`,
    'lit_shengjiwxq': "升级·伍小戚",
    'lit_shengjiwxq_info': `${get.poptip('lit_mianjuV2')}${get.poptip('lit_xiaochouV2')} 获得〖面具〗和〖小丑〗，并修改其中的〖小丑〗：锁定技，当你死亡后，伤害来源弃置所有牌`,
    'lit_shengjizg': "升级·自高",
    'lit_shengjizg_info': `${get.poptip('lit_zhanshiV2')} 获得并修改〖展示〗：你也拥有后半段技能效果`,
    'lit_shengjizpj': "升级·曾品嘉",
    'lit_shengjizpj_info': `${get.poptip('lit_saohuaV2')} 增加1点体力上限，获得并修改〖骚话〗：此技能中，点数小于7的牌计算时的点数+7`,
    'lit_shengjibs': "升级·菠树",
    'lit_shengjibs_info': `${get.poptip('lit_yisuiV2')} 获得并修改〖易碎〗：闺蜜死亡时，你不再失去体力`,
    'lit_shengjilcm': "升级·刘晨沐",
    'lit_shengjilcm_info': `${get.poptip('lit_jijinV2')} 获得并修改〖激进〗：你造成的伤害越高，受激叠层越多，你对受激者使用的杀不计入出杀次数。`,
    'lit_shengjizmh': "升级·郑墨翰",
    'lit_shengjizmh_info': `${get.poptip('lit_jianrenV2')} 获得〖坚韧〗并于末尾增加：当你横置时，属性伤害+1`,
    'lit_shengjirita': "升级·Rita",
    'lit_shengjirita_info': `${get.poptip('lit_dafang')}${get.poptip('lit_hengshuiti')}若你已拥有〖大方〗，则获得〖衡水体〗；否则，获得〖大方〗`,
    'lit_shengjihp': "升级·胡畔",
    'lit_shengjihp_info': `失去1点体力上限，获得：${get.poptip('lit_yigou')}`,
    'lit_shengjilbx': "升级·兰柏勋",
    'lit_shengjilbx_info': "增加1点体力上限，恢复体力至上限",
    'lit_shengjihxy': "升级·胡馨予",
    'lit_shengjihxy_info': `${get.poptip('lit_mimangV2')} 获得并于〖迷茫〗前增加：【闪】和装备牌点数视为K`,
    'lit_shengjihjw': "升级·胡峻玮",
    'lit_shengjihjw_info': `${get.poptip('lit_wutongV2')} 获得并修改〖梧桐〗条件：你有手牌时，还可以弃置全部手牌发动`,
    'lit_shengjirs': "升级·王荣",
    'lit_shengjirs_info': `${get.poptip('lit_qixuV2')} 获得并修改〖期许〗：猜中时不再失去此技能`,
    'lit_shengjijhx': "升级·蒋海旭",
    'lit_shengjijhx_info': `${get.poptip('lit_shanliangV2')} 获得并于〖善良〗末尾增加：若恢复的体力值溢出，则增加等溢出量的体力上限后恢复体力至上限`,
    'lit_shengjiqbc': "升级·钱保灿",
    'lit_shengjiqbc_info': `${get.poptip('lit_chushouV2')} 获得并在〖出手〗中增加：你的【杀】目标数+1`,
    'lit_shengjizc': "升级·张驰",
    'lit_shengjizc_info': `${get.poptip('lit_shuxinV2')} 获得并修改〖竖心〗：不再为锁定技`,
    'lit_shengjiyxl': "升级·杨湘铃",
    'lit_shengjiyxl_info': `获得：${get.poptip('lit_juji')}`,
};

export const simpleTranslate = {
        `<br>①血${Styled('g', '≤')}目标，对此目标${Styled('r', '伤害+1')}；` +
        `<br>②手牌数${Styled('g', '≤')}目标${get.poptip("lit_hejCard")}数，${Styled('r', '不可被响应且无视防具')}`,
    /*咕咕*/
    'lit_gugu_info': `${Styled('r', '受伤')}濒死前可回至1血并获${X}"咕"，依次用牌堆顶前${X}张牌（${X}为恢复的血量）<li>锁；每人回合结束时，若有咕，移去所有咕，+1血，并失去等量体力</li>`,

    /*升级·Qb*/
    'lit_shengjiqb_info': `${get.poptip('lit_tiannaV2')} 获得“天呐”并于末尾增加：>1血受伤时若此伤害会使血<1，免伤且血掉至1`,
    /*升级·张盛杰*/
    'lit_shengjizsj_info': `获得场上所有人判定区和手牌中的延时锦囊牌`,
    /*升级·张钦奕*/
    'lit_shengjizqy_info': `${get.poptip('lit_zishaV2')} 获得“紫砂”并于开头增加：准备阶段可-${Y}血+2${Y}牌（${Y}不超过体力值`,
    /*升级·庞建龙*/
    'lit_shengjipjl_info': `${get.poptip('lit_duilianV2')} 获得并修改“对练”：不需要弃牌了`,
    /*升级·伍小戚*/
    'lit_shengjiwxq_info': `${get.poptip('lit_mianjuV2')}${get.poptip('lit_xiaochouV2')} 获得“面具”/“小丑”，并修改其中的“小丑”：使其弃全部牌`,
    /*升级·自高*/
    'lit_shengjizg_info': `${get.poptip('lit_zhanshiV2')} 获得并修改“展示”：你也拥有后半段技能`,
    /*升级·曾品嘉*/
    'lit_shengjizpj_info': `${get.poptip('lit_saohuaV2')} +1体力上限，获得并修改“骚话”：此技能中，点数<7的牌计算时的点数+7`,
    /*升级·菠树*/
    'lit_shengjibs_info': `${get.poptip('lit_yisuiV2')} 获得并修改“易碎”：闺蜜死亡时，你不再失去体力`,
    /*升级·刘晨沐*/
    'lit_shengjilcm_info': `${get.poptip('lit_jijinV2')} 获得并修改"受激"：伤害越高，受激叠层越多，对受激者的杀不计入次数`,
    /*升级·郑墨翰*/
    'lit_shengjizmh_info': `${get.poptip('lit_jianrenV2')} 获得“坚韧”并于末尾增加：横置时属性伤+1`,
    /*升级·Rita*/
    'lit_shengjirita_info': `${get.poptip('lit_dafang')}${get.poptip('lit_hengshuiti')}若已拥有"大方"，则获得"衡水体V2"并于其中增加：恢复1点体力；否则，获得"大方"`,
    /*升级·胡畔*/
    'lit_shengjihp_info': `-1体力上限，获得：${get.poptip('lit_yigou')}`,
    /*升级·兰柏勋*/
    'lit_shengjilbx_info': "+1体力上限，回满血",
    /*升级·胡馨予*/
    'lit_shengjihxy_info': `${get.poptip('lit_mimangV2')} 获得并于“迷茫”前增加：闪和装备牌点数视为K`,
    /*升级·胡峻玮*/
    'lit_shengjihjw_info': `${get.poptip('lit_wutongV2')} 获得并修改“梧桐”条件：还可弃置全部手牌触发`,
    /*升级·王荣*/
    'lit_shengjirs_info': `${get.poptip('lit_qixuV2')} 获得并修改“期许”：猜中时不再失去此技能`,
    /*升级·蒋海旭*/
    'lit_shengjijhx_info': `${get.poptip('lit_shanliangV2')} 获得并于“善良”末尾增加：若恢复量溢出，增加等溢出量的上限后回满血`,
    /*升级·钱保灿*/
    'lit_shengjiqbc_info': `${get.poptip('lit_chushouV2')} 获得并在“出手”中增加：杀的目标数+1`,
    /*升级·张驰*/
    'lit_shengjizc_info': `${get.poptip('lit_shuxinV2')} 获得并修改“竖心”：不再为锁定技`,
    /*升级·杨湘铃*/
    'lit_shengjiyxl_info': `获得：${get.poptip('lit_juji')}`,
};

export const dynamicTranslate = {
    // 国战势力与机制改动
    lit_shengjirita(player) {
        let group = lib.lit.isGuozhanKeyEnabled() ? '叁/键' : '叁';
        if (player.hasSkill('lit_dafang')) return `获得${get.poptip('lit_hengshuiti')}：锁；使用装备牌后可视为对1人使用冰杀`;
        return `获得${get.poptip('lit_dafang')}：主；装备区失去牌后，可令1“${group}”势力角色将手牌补至其体力上限（至多补至9）`;
    },
    lit_33(player) {
        let group = lib.lit.isGuozhanKeyEnabled() ? '叁/键' : '叁';
        return `主；其余“${group}”势力每回合可发动1次，其受来自你的1伤，然后你：<li>血>3时-1血</li><li>血<=3时+1血</li>`;
    },
    lit_xinren(player) {
        let group = lib.lit.isGuozhanKeyEnabled() ? '叁/键' : '叁';
        return `主；出牌限1次，交给某“${group}”势力角色1牌，其可立即使用，你摸与该牌造成的总伤害相等的牌"`;
    },
    lit_dafang(player) {
        let group = lib.lit.isGuozhanKeyEnabled() ? '叁/键' : '叁';
        return `主；装备区每失去1张牌后，可令一“${group}”势力角色将手牌补至其体力上限（至多补至9）`;
    },
    lit_guimi(player) {
        if (get.mode() === 'guozhan') return "锁；明置此技能后，若你无“闺蜜”，选一“闺蜜”，其手牌上限+2，每间隔1轮的轮次中每回合首次受伤后+1血；<br>濒死时闺蜜可用♥️♦️牌当桃救你（场上无闺蜜时重选）";
        return "锁；摸初始牌前选一“闺蜜”，其手牌上限+2，每间隔1轮的轮次中每回合首次受伤后+1血；<br>濒死时闺蜜可用♥️♦️牌当桃救你（场上无闺蜜时重选）";
    },
    lit_mianju(player) {
        if (get.mode() === 'guozhan') return `锁；明置此技能后，获得4“面”，每次濒死后回满血并移除等量“面”，“面”耗尽时失去此技能并获得${get.poptip('lit_xiaochou')}`;
        return `锁；起始获4“面”，每次濒死后回满血并移除等量“面”，“面”耗尽时失去此技能并获得${get.poptip('lit_xiaochou')}`;
    },
    lit_mianjuV2(player) {
        if (get.mode() === 'guozhan') return `V2 锁；明置此技能后，获得4“面”，每次濒死后回满血并移除等量“面”，“面”耗尽时失去此技能并获得${get.poptip('lit_xiaochouV2')}`;
        return `V2 锁；起始获4“面”，每次濒死后回满血并移除等量“面”，“面”耗尽时失去此技能并获得${get.poptip('lit_xiaochouV2')}`;
    },
    // 状态改动
    lit_hengshuitiV2(player) {
        return "锁；使用装备牌后+1血，可视为对1人使用冰杀";
    },
    lit_saohua(player) {
        let str = `已用和打出${get.poptip("lit_exDelayEquipCard")}可置于角色上。出牌阶段可：<li>将2张点数和≥13的牌当闪电</li>`;
        if (player.hasSkill('lit_saohuaV2')) str = `V2 已用和打出${get.poptip("lit_exDelayEquipCard")}可置于角色上，技能期间点数<7的牌点数+7。出牌阶段可：<li>将2张点数和≥13的牌当闪电</li>`;

        if (player.hasSkill('lit_saohua_pi')) str += Styled('O', "<li>弃3张点数和=33的牌造成3点雷伤（此项每回合限1次）</li>");
        else str += "<li>弃3张点数和=33的牌造成3点雷伤（此项每回合限1次）</li>";
        return str;
    },
    lit_qixu(player) {
        if (player.hasSkill('lit_qixuV2')) return `V2 出牌阶段可令1人判定让其猜测花色：猜错则按实际花色令其进行♠️闪电、♥️乐、♣️兵、♦️遣返牌的判定；猜中则你获得${get.poptip('lit_zhijian')}`;
        return `出牌阶段可令1人判定让其猜测花色：猜错则按实际花色令其进行♠️闪电、♥️乐、♣️兵、♦️遣返牌的判定；猜中则你失去此技能并获得${get.poptip('lit_zhijian')}`;
    },
    lit_xiaosa(player) {
        let str1 = "<li>场上有人受伤濒死时，可令1人翻面并获得其装备区的牌</li>",
            str2 = "<li>场上有人失去体力濒死时，可将1张装备牌作无次数限制的杀使用，不可被响应</li>";
        if (player.storage.lit_xiaosa[0]) str1 = Styled('O', str1);
        if (player.storage.lit_xiaosa[1]) str2 = Styled('O', str2);
        return "每回合每种情况限1次" + str1 + str2;
    },
};

export const pinyins = {
    'Qb': ['3', '3'],
    '升级·Qb': ['shēng', 'jí', '·', '3', '3'],
    '曾品嘉': ['zēng', 'pǐn', 'jiā'],
    '升级·曾品嘉': ['shēng', 'jí', '·', 'zēng', 'pǐn', 'jiā'],
    '兰柏勋': ['lán', 'bó', 'xūn'],
    '升级·兰柏勋': ['shēng', 'jí', '·', 'lán', 'bó', 'xūn'],
    '悖论': ['bó', 'lùn'],
};
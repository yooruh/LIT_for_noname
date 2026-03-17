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

    // 皮肤
    'lit_hupan_chara': "决心",
    'lit_jianghaixu_azure': "蔚蓝色",
    'lit_wangrong_pale': "青衣",
    'lit_zhangshengjie_origin': "原画",

    // 特殊机制
    'lit_negClear_faq': "负面效果",
    'lit_negClear_faq_info': "均视为锁定技，在死亡后清除",

    // 九班杀部分
    'lit_zhangchi9张驰': "9张驰",
    'lit_zhangchi9张驰_prefix': "9",
    'lit_wangcan9王灿': "9王灿",
    'lit_wangcan9王灿_prefix': "9",
    'lit_liyang9李洋': "9李洋",
    'lit_liyang9李洋_prefix': "9",
    'lit_zhangshengjie9张盛杰': "9张盛杰",
    'lit_zhangshengjie9张盛杰_prefix': "9",
    'lit_chenke陈可': "陈可",
    'lit_linmiao林淼': "林淼",

    // 9张驰
    'lit_bolun': "悖论",
    'lit_bolun_info': `你可以扣置一张手牌并声明一种${get.poptip("lit_basicTrickCard")}，视为你使用或打出之，其他角色可同时质疑：<li>若有人质疑且声明的牌与扣置之牌不相符，` +
        `则此牌无效且本回合内无法再次被声明，质疑者各摸一张牌；</li><li>否则此牌生效，质疑者选择一项：1.随机失去1~2点体力；2.获得${get.poptip('lit_jiqing')}</li>`,
    'lit_bolun_ally': "信任",
    'lit_bolun_betray': "质疑",
    'lit_bolun_ally_bg': "真",
    'lit_bolun_betray_bg': "假",
    'lit_jiqing': "基情",
    'lit_jiqing_info': `锁定技，你不能质疑${get.poptip('lit_bolun')}；当你体力值为1时，${Styled('r', '你的其他技能无效')}；当你体力值小于1时，${Styled('r', '你的非锁定技无效')}`,
    'lit_jiqingsishe': "激情四射",
    'lit_jiqingsishe_info': `锁定技，当你死亡前，你选择一名拥有${get.poptip('lit_jiqing')}的角色，令其判定，若结果不为【桃】或【桃园结义】，则其死亡`,
    // 9王灿
    'lit_xiaoqiao': "小巧",
    'lit_xiaoqiao_info': "锁定技，你的♠️牌均视为♥️牌",
    'lit_huoshan': "火山",
    'lit_huoshan_info': `锁定技，结束阶段，你进行判定，若结果为♥️，你获得1枚“爆”；准备阶段，你可以移去所有“爆”，摸${X}张牌，然后本回合你造成的伤害+${X}（${X}为你移去的“爆”数）`,
    'lit_renxiao': "人小",
    'lit_renxiao_info': `当你使用或打出牌后，你可判定，若结果为♥️，你从弃牌堆中获得此牌；${Styled('r', '以此法获得牌后，本回合不能再发动此技能')}`,
    // 9李洋
    'lit_xiuer': "秀儿",
    'lit_xiuer_info': `你每使用一张非转化的普通锦囊牌，可以摸一张牌，若你体力值为1，则摸牌数+1；锁定技，${Styled('g', '你使用锦囊牌无距离限制')}`,
    'lit_xiuer_faq': "关于非转化",
    'lit_xiuer_faq_info': "一般来说，只有通过转换技能来使用的牌才是转化牌，如：把A当做B使用。通过其他方法使用的牌，如：通过弃置、扣血、判定等条件来视为使用，或直接视为使用（如你的A视为B）等，即使是虚拟的，无实体的牌，也不视为转化牌。但是本扩展之外的不敢保证",
    'lit_huangse': "黄色",
    'lit_huangse_info': `锁定技，你对异性角色造成的伤害+1；当你对同性角色造成伤害后，你摸一张牌`,
    // 9张盛杰
    'lit_lizhi': "励志",
    'lit_lizhi_info': `锁定技，摸牌阶段，你多摸${X}张牌（${X}为你已失去的体力值）`,
    'lit_shenjie': "肾竭",
    'lit_shenjie_info': `锁定技，当你${Styled('g', '进入/脱离')}濒死状态时，你${Styled('g', '摸2/1')}张牌；你的手牌上限基数为你的体力上限+2`,
    'lit_zhewan': "折腕",
    'lit_zhewan_info': `你可以将${Styled('g', '至多两张同花色')}的牌按以下规则使用或打出：♠️️【无懈可击】，♥️️【桃】，♣️️【闪】，♦️️火【杀】；<br>` +
        `若你以此法使用了两张♥️♦️️牌，则此牌恢复的体力值或造成的伤害值+1；若你以此法使用了两张♠️♣️牌，则你弃置当前回合角色一张牌`,
    // 陈可
    'lit_nitian': "逆天",
    'lit_nitian_info': `当判定牌生效前，你可以打出一张牌代替之，并${Styled('g', '获得原判定牌')}，若你以此法打出的牌为♥️/♠️，你摸一张牌`,
    'lit_yizhu': "遗嘱",
    'lit_yizhu_info': "你每失去1点体力或受到1点伤害后，可以获得一名其他角色一张牌；当你死亡时，你可以将所有牌置于牌堆顶或交给一名其他角色",
    // 林淼
    'lit_shenge': "神鸽",
    'lit_shenge_info': `你使用【杀】可以选择你距离${Styled('g', '≤')}此【杀】点数的角色为目标；当【杀】指定目标后，你可以根据下列条件执行效果：<br>` +
        `①若你体力值${Styled('g', '≤')}目标的体力值，此【杀】对该目标造成的${Styled('r', '伤害+1')}；<br>` +
        `②若你手牌数${Styled('g', '≤')}目标${get.poptip("lit_hejCard")}数，此【杀】${Styled('r', '不可被响应且无视防具')}`,
    'lit_shenge_faq': "关于神鸽的两种效果",
    'lit_shenge_faq_info': "选择发动神鸽后，只要满足条件，就会执行对应效果。因此同时满足①②时，不能只选择发动其中的一项",
    'lit_gugu': "咕咕",
    'lit_gugu_info': `当你${Styled('r', '因受到伤害')}进入濒死状态时，你可以将体力值恢复至1点，获得${X}枚“咕”，然后依次使用牌堆顶的${X}张牌；（${X}为你以此法恢复的体力值）<li>锁定技，回合结束时，你移去所有“咕”，然后失去${Y}点体力（${Y}为你移去的“咕”数-1）</li>`,

    // 一班杀与叁岛篇部分
    'lit_qbQb': "Qb",
    'lit_zhangshengjie张盛杰': "张盛杰",
    'lit_zhangqinyi张钦奕': "张钦奕",
    'lit_pangjianlong庞建龙': "庞建龙",
    'lit_wuxiaoqi伍小戚': "伍小戚",
    'lit_zigao自高': "自高",
    'lit_zengpinjia曾品嘉': "曾品嘉",
    'lit_boshu菠树': "菠树",
    'lit_liuchenmu刘晨沐': "刘晨沐",
    'lit_zhengmohan郑墨翰': "郑墨翰",
    'lit_ritaRita': "Rita",
    'lit_hupan胡畔': "胡畔",
    'lit_lanboxun兰柏勋': "兰柏勋",
    'lit_huxinyu胡馨予': "胡馨予",
    'lit_hujunwei胡峻玮': "胡峻玮",
    'lit_wangrong王荣': "王荣",
    'lit_jianghaixu蒋海旭': "蒋海旭",
    'lit_qianbaocan钱保灿': "钱保灿",
    'lit_zhangchi张驰': "张驰",
    'lit_yangxiangling杨湘铃': "杨湘铃",

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
    'lit_shengjizpj_info': `${get.poptip('lit_saohuaV2')} 增加1点体力上限，恢复3点护甲，获得并修改〖骚话〗：此技能中，点数小于7的牌计算时的点数+7`,
    'lit_shengjibs': "升级·菠树",
    'lit_shengjibs_info': `${get.poptip('lit_yisuiV2')} 获得并修改〖易碎〗：闺蜜死亡时，你不再失去体力`,
    'lit_shengjilcm': "升级·刘晨沐",
    'lit_shengjilcm_info': `${get.poptip('lit_jijinV2')} 获得并修改〖激进〗：你造成的伤害越高，受激叠层越多`,
    'lit_shengjizmh': "升级·郑墨翰",
    'lit_shengjizmh_info': `${get.poptip('lit_jianrenV2')} 获得〖坚韧〗并于末尾增加：当你横置时，属性伤害+1`,
    'lit_shengjirita': "升级·Rita",
    'lit_shengjirita_info': `${get.poptip('lit_dafang')}${get.poptip('lit_hengshuitiV2')}若你已拥有〖大方〗，则获得〖衡水体〗并于其中增加：恢复1点体力；否则，获得〖大方〗`,
    'lit_shengjihp': "升级·胡畔",
    'lit_shengjihp_info': `失去1点体力上限，获得：${get.poptip('lit_yinren')}${get.poptip('lit_fumeng')}`,
    'lit_shengjigy_info': "获得〖誓仇〗和〖消散〗",
    'lit_shengjip_info': "将角色改为“月惹”",
    'lit_shengjilbx': "升级·兰柏勋",
    'lit_shengjilbx_info': "增加1点体力上限，恢复体力至上限",
    'lit_shengjihxy': "升级·胡馨予",
    'lit_shengjihxy_info': `${get.poptip('lit_shihuaiV2')} 获得并修改〖释怀〗选项②：交给你一张装备牌`,
    'lit_shengjihjw': "升级·胡峻玮",
    'lit_shengjihjw_info': `${get.poptip('lit_wutongV2')} 获得并修改〖梧桐〗条件：你有手牌时，还可以弃置全部手牌发动`,
    'lit_shengjirs': "升级·王荣",
    'lit_shengjirs_info': `${get.poptip('lit_qixuV2')} 获得并修改〖期许〗：猜中时不再失去此技能`,
    'lit_shengjijhx': "升级·蒋海旭",
    'lit_shengjijhx_info': `${get.poptip('lit_shanliangV2')} 获得并于〖善良〗末尾增加：若恢复的体力值溢出，则增加等溢出量的体力上限后恢复体力至上限`,
    'lit_shengjiqbc': "升级·钱保灿",
    'lit_shengjiqbc_info': `${get.poptip('lit_chushouV2')} 获得并修改〖出手〗：不再跳过摸牌阶段`,
    'lit_shengjizc': "升级·张驰",
    'lit_shengjizc_info': `${get.poptip('lit_shuxinV2')} 获得并修改〖竖心〗：不再为锁定技`,
    'lit_shengjiyxl': "升级·杨湘铃",
    'lit_shengjiyxl_info': `获得：${get.poptip('lit_juji')}`,

    // Qb
    'lit_33': "33",
    'lit_33_info': "主公技，其他“叁”势力角色可在出牌阶段发动一次，其受到来自你的1点伤害，然后若你：<li>体力值>3，失去1点体力；</li><li>体力值≤3，恢复1点体力</li>",
    'lit_33_2': "33",
    'lit_33_3': "33",
    'lit_tianna': "天呐",
    'lit_tianna_info': "锁定技，当你造成伤害后，若于回合外，你摸两张牌；若于回合内，你弃置一张手牌，然后恢复1点体力",
    'lit_tiannaV2': "天呐V2",
    'lit_tiannaV2_info': "锁定技，当你造成伤害后，若于回合外，你摸两张牌；若于回合内，你弃置一张手牌，然后恢复1点体力；当你体力值大于1点且受到伤害时，若此伤害会使你体力值小于1，则防止此伤害并将体力值减至1",
    'lit_qiantui': "遣退",
    'lit_qiantui_info': `当你的体力值由3以上减至3或以下时，你可以令一名不带有${get.poptip('lit_kuanshu')}的角色获得${get.poptip('lit_qianfan')}`,
	/*负面效果*/'lit_qianfan': "遣返",
    'lit_qianfan_info': `负面效果，你跳过下回合，并获得${get.poptip('lit_kuanshu')}，〖宽恕〗在下回合开始前失效`,
    'lit_kuanshu': "宽恕",
    'lit_kuanshu_info': "锁定技，你不会被遣返",
    // 张盛杰
    'lit_wutou': "无头",
    'lit_wutou_info': "锁定技，回合开始前，你跳过准备阶段和判定阶段；你的延时锦囊牌可以指定自己为目标",
    'lit_youxia': "游侠",
    'lit_youxia_info': "①出牌阶段前，你可以移动场上的一张牌，并在此前获得移动目标位置原来的牌<br>②锁定技，你的判定区每失去1张实体牌，你摸一张牌",
    'lit_youxia_faq': "关于获得原来的牌",
    'lit_youxia_faq_info': "如果将要移动到的位置存在多张牌（是分离的，不相关的多张牌，如两张【闪电】。而不是将多张牌当作一张牌使用的那种情况），则获得后进入此位置的那张牌",
    'lit_xinyi': "心毅",
    'lit_xinyi_info': `觉醒技，出牌阶段，若你的判定区内存在或存在过≥2种延时锦囊牌，则你失去1点体力上限，然后获得${get.poptip('lit_xinhen')}`,
    'lit_xinyi_faq': "关于存在或存在过",
    'lit_xinyi_faq_info': "此项记录从获得技能时开始，如果中途失去，则需重新记录",
    'lit_xinhen': "心痕",
    'lit_xinhen_info': "出牌阶段限一次，你可以将你判定区中的所有牌当作【杀】，依次对攻击范围内的1人使用。如果这些牌中有牌在判定区中视为：" +
        "<li>【闪电】，这些【杀】视为雷【杀】</li><li>【乐不思蜀】，目标被指定为技能目标后，须选择弃置与你的判定区等数量的牌；</li><li>【兵粮寸断】，响应每张【杀】所需的【闪】的数量+1；</li><li>【遣返牌】，每张【杀】基础伤害+1</li>",
    'lit_xinhen_faq': "关于判定区内牌数量的计算",
    'lit_xinhen_faq_info': `由于存在将多张牌当作1张牌使用的情况（如${get.poptip('lit_saohua')}①），故在此明确：对于此类视为牌，即便其对应的实体牌数量大于单张牌，在计算数量时也只算作1张牌。拆和顺等也都将这些牌作为一个集合来看成是1张牌，除非明确说明是按照“实体牌数量”来计算的`,

    // 张钦奕
    'lit_danke': "蛋壳",
    'lit_danke_info': `锁定技，准备阶段，你令其他角色失去${X}点体力，回合结束后，其恢复${X}点体力，溢出的恢复量转为护甲（${X}为其体力值减1）`,
    'lit_zisha': "紫砂",
    'lit_zisha_info': "锁定技，当你体力值为2时，你使用的牌不能被响应",
    'lit_zishaV2': "紫砂V2",
    'lit_zishaV2_info': `锁定技，准备阶段，你可以失去${Y}点体力，然后摸2${Y}张牌（${Y}不超过体力值）；当你体力值为2时，你使用的牌不能被响应`,
    'lit_lantong': "蓝酮",
    'lit_lantong_info': "锁定技，当同性角色对你使用【桃】时，你恢复的体力值+1",
    // 庞建龙
    'lit_qiangjian': "强健",
    'lit_qiangjian_info': "锁定技，当其他角色使用【杀】、【决斗】、【万箭齐发】或【南蛮入侵】时，其需要额外打出一张【杀】或【闪】来响应",
    'lit_duilian': "对练",
    'lit_duilian_info': "出牌阶段限一次，你可以弃置一张牌，选择任意名角色，令这些角色依次选择是否对你选择的另一名角色使用【决斗】，此【决斗】不可被【无懈可击】响应",
    'lit_duilianV2': "对练V2",
    'lit_duilianV2_info': "出牌阶段限一次，你可以选择任意名角色，令这些角色依次选择是否对你选择的另一名角色使用【决斗】，此【决斗】不可被【无懈可击】响应",
    // 伍小戚
    'lit_shencaocao': "神曹操",
    'lit_shencaocao_info': "出牌阶段限一次，令其他角色各摸一张牌，然后你翻面并移去1枚“面”，若成功移去1枚“面”，你恢复1点体力",
    'lit_jiwa': "鸡娃",
    'lit_jiwa_info': "当你翻面后，你可以交换两名角色的手牌",
    'lit_mianju': "面具",
    'lit_mianju_info': `锁定技，游戏开始或复活时，你获得4枚“面”；你每次濒死后，恢复体力至上限并移除等量的“面”；“面”耗尽时，你失去此技能并获得${get.poptip('lit_xiaochou')}`,
    'lit_mianju_faq': '关于“面具”数量：',
    'lit_mianju_faq_info': '“面”上限一般为4，通过本技能获得的“面”，不会使其数量超过4',
    'lit_mianjuV2': "面具V2",
    'lit_mianjuV2_info': `锁定技，游戏开始或复活时，你获得4枚“面”；你每次濒死后，恢复体力至上限并移除等量的“面”；“面”耗尽时，你失去此技能并获得${get.poptip('lit_xiaochouV2')}`,
    'lit_xiaochou': "小丑",
    'lit_xiaochou_info': "锁定技，当你死亡后，伤害来源弃置所有手牌",
    'lit_xiaochouV2': "小丑V2",
    'lit_xiaochouV2_info': "锁定技，当你死亡后，伤害来源弃置所有牌",

    // 自高
    'lit_xinren': "信任",
    'lit_xinren_info': "主公技，出牌阶段限一次，你可以交给一名“叁”势力角色一张牌，其可立即使用之，然后你摸X张牌（X为此牌造成的伤害值）",
    'lit_zhanshi': "展示",
    'lit_zhanshi_info': `出牌阶段限一次，你可以令一名其他角色展示所有手牌并交给你，然后你交给其${X}张牌，其摸${X}张牌，直到其回合结束，其使用点数为${Y}的牌：<li>倍数，无次数限制；</li><li>约数，其摸一张牌</li>（${X}为其手牌溢出量且摸牌数至多为3，${Y}为其使用的上一张牌的点数）`,
    'lit_zhanshiV2': "展示",
    'lit_zhanshiV2_info': `出牌阶段限一次，你可以令一名其他角色展示所有手牌并交给你，然后你交给其${X}张牌，其摸${X}张牌，直到你或其回合结束，你或其使用点数为${Y}的牌：<li>倍数，无次数限制；</li><li>约数，摸一张牌</li>（${X}为其手牌溢出量且摸牌数至多为3，${Y}为其使用的上一张牌的点数）`,
    'lit_zhanshi_sub': `<span class='bluetext'>【展示】</span>`,
    'lit_zhanshi_sub_info': `<span class='bluetext'>直到下回合结束，使用点数为${Y}的牌：<li>倍数，无次数限制；</li><li>约数，摸一张牌</li>（${Y}为使用的上一张牌的点数）</span>`,
    'lit_zhanshi_math1': "倍数",
    'lit_zhanshi_math2': "约数",
    'lit_chantaer': "铲踏儿",
    'lit_chantaer_info': "锁定技，你的手牌上限基数为你的体力上限；准备阶段，若你的手牌数不大于手牌上限，你恢复1点体力；结束阶段，若本回合没有角色受到过伤害，你摸两张牌并失去1点体力",
    // 曾品嘉
    'lit_kuaihuo': "快活",
    'lit_kuaihuo_info': "每回合限一次，当你使用【杀】后，你可以将一张牌与牌堆顶的牌置换，然后询问其他角色是否对该目标使用一张无实体牌的【杀】",
    'lit_saohua': "骚话",
    'lit_saohua_info': `你使用或打出的${get.poptip("lit_exDelayEquipCard")}可置于角色上；出牌阶段，你可以：<li>将两张点数和大于等于13的牌当【闪电】使用；</li><li>弃置三张点数和为33的牌，对一名角色造成3点雷属性伤害（此项每回合限一次）</li>`,
    'lit_saohuaV2': "骚话V2",
    'lit_saohuaV2_info': `你使用或打出的${get.poptip("lit_exDelayEquipCard")}可置于角色上，技能期间，点数小于7的牌点数+7；出牌阶段，你可以：<li>将两张点数和大于等于13的牌当【闪电】使用；</li><li>弃置三张点数和为33的牌，对一名角色造成3点雷属性伤害（此项每回合限一次）</li>`,
    // 'lit_saohua_append': "<span style='font-family:yuanli'>使用中断的牌、装备牌和延时锦囊牌除外</span>",
    // 菠树
    'lit_guimi': "闺蜜",
    'lit_guimi_info': "锁定技，摸初始牌前，你选择一名“闺蜜”，其造成的雷属性伤害+1，且每间隔1轮的轮次中每回合首次受到伤害后恢复1点体力；你进入濒死状态时，闺蜜可以将一张♥️♦️牌当【桃】使用（场上无你的闺蜜时重选）",
    'lit_yisui': "易碎",
    'lit_yisui_info': "锁定技，闺蜜在场时，你的手牌数恒为2；闺蜜满血时，你免疫伤害，若此伤害源不为你，则其失去等伤害量体力；闺蜜死亡时，你失去所有体力",
    'lit_yisuiV2': "易碎V2",
    'lit_yisuiV2_info': "锁定技，闺蜜在场时，你的手牌数恒为2；闺蜜满血时，你免疫伤害，若此伤害源不为你，则其失去等伤害量体力",
    // 刘晨沐
    'lit_gufeng': "古风",
    'lit_gufeng_info': `每回合限一次，当其他角色使用${get.poptip("lit_exDelayEquipCard")}指定目标后，你可以为此牌增加一个目标`,
    'lit_jijin': "激进",
    'lit_jijin_info': `锁定技，当你使用【杀】造成伤害后，你令受伤者获得${get.poptip('lit_shouji')}`,
    'lit_jijinV2': "激进V2",
    'lit_jijinV2_info': `锁定技，当你使用【杀】造成伤害后，你令受伤者获得${get.poptip('lit_shouji')}，造成的伤害越高，受激叠层越多`,
	/*负面效果*/'lit_shouji': "受激",
    'lit_shouji_info': "负面效果，下一名使用【杀】的角色强制选择你为目标（无视距离）",
    // 郑墨翰
    'lit_mensao': "闷骚",
    'lit_mensao_info': "出牌阶段限一次，你可以将任意张牌当【铁索连环】使用或弃置之，然后摸等量的牌并令所有横置的角色恢复1点体力",
    'lit_jianren': "坚韧",
    'lit_jianren_info': "锁定技，当你对体力值大于你的角色造成伤害时，此伤害+1；当你对手牌数大于你的角色造成伤害后，你摸一张牌",
    'lit_jianrenV2': "坚韧V2",
    'lit_jianrenV2_info': "锁定技，当你对体力值大于你的角色造成伤害时，此伤害+1；当你对手牌数大于你的角色造成伤害后，你摸一张牌；当你横置时，属性伤害+1",
    'lit_rennai': "忍耐",
    'lit_rennai_info': "当你受到横置传导的伤害后，你可以横置任意名角色",

    // Rita
    'lit_dafang': "大方",
    'lit_dafang_info': "主公技，你装备区每失去1张牌后，你可以令一名“叁”势力角色将手牌补至全场最多（至多补至其体力上限）",
    'lit_nuoruo': "懦弱",
    'lit_nuoruo_info': "其他角色的出牌阶段，当装备牌置入弃牌堆时，你可以获得之",
    'lit_hengshuiti': "衡水体",
    'lit_hengshuiti_info': "锁定技，当你使用装备牌后，你可以视为对一名角色使用冰【杀】",
    'lit_hengshuitiV2': "衡水体V2",
    'lit_hengshuitiV2_info': "锁定技，当你使用装备牌后，你恢复1点体力，然后可以视为对一名角色使用冰【杀】",
    // 胡畔
    'lit_cuiruo': "脆弱",
    'lit_cuiruo_info': `回合结束阶段，若你不为满体力，你可以摸${X}张牌，然后将体力值调整至${X}（${X}为你已损失的体力值）`,
    'lit_shichou': "誓仇",
    'lit_shichou_info': `锁定技，当你受到伤害后，伤害来源获得“誓”标记；当你体力值为1时，你对所有带“誓”标记的角色造成${Y}点伤害，然后移除所有“誓”标记（${Y}为其体力值与护甲值之和-1）`,
    'lit_yinren': "殷刃",
    'lit_yinren_info': "每回合限一次，当你需要使用或打出【杀】时，你可以失去1点体力，视为使用一张无距离和次数限制的【杀】，若此【杀】造成伤害，你恢复1点体力",
    'lit_fumeng': "浮梦",
    'lit_fumeng_info': `出牌阶段限一次，你可以选择一名体力上限大于1的角色，令其${get.poptip('lit_mengying')}层数+${Z}（${Z}为其已损失的体力值且至少为1）`,
	/*负面效果*/'lit_mengying': "梦萦",
    'lit_mengying_info': "负面效果，每层减少1点体力上限，每恢复1点体力减少1层",
    // 兰柏勋
    'lit_yuqiu': "欲求",
    'lit_yuqiu_info': `当${get.poptip("lit_damageCard")}对目标未造成伤害时：若此牌点数为质数，可以拿目标一张牌；若不为质数，可以弃置目标至多两张牌`,
    'lit_shouwang': "守望",
    'lit_shouwang_info': "锁定技，当你的手牌数或体力值为全场最多（之一）时，造成的伤害+1",
    // 胡馨予
    'lit_mimang': "迷茫",
    'lit_mimang_info': "你每造成或受到1点伤害，获得1枚“茫”，结束阶段，你可以移去任意枚“茫”，重铸等量张牌，并弃置其他角色等量张牌",
    'lit_shihuai': "释怀",
    'lit_shihuai_info': "出牌阶段限一次，你可以将一张装备牌当【决斗】使用；当你没有手牌时，你可以令一名其他角色选择一项：<li>受到1点伤害；</li><li>交给你一张牌</li>",
    'lit_shihuaiV2': "释怀V2",
    'lit_shihuaiV2_info': "V2 出牌阶段限一次，你可以将一张装备牌当【决斗】使用；当你没有手牌时，你可以令一名其他角色选择一项：<li>受到1点伤害；</li><li>交给你一张装备牌</li>",
    // 胡峻玮
    'lit_biaoxian': "表现",
    'lit_biaoxian_info': "当你使用【杀】指定目标后，你可以判定，若结果为♦️，则此【杀】基础伤害+1且不能被此目标响应",
    'lit_wutong': "梧桐",
    'lit_wutong_info': "场上判定生效前，你可以失去1点体力，将此判定结果固定为任意花色（与判定牌无关）",
    'lit_wutong_faq': "关于固定「判定结果」",
    'lit_wutong_faq_info': "固定下来的结果，为技能直接修改过后的判定结果。此结果与判定牌上原有的数据无关。因此其他对判定牌的修改、视为或更换等行为都无法影响判定结果，除非还有其他技能也对「判定结果」进行了直接修改<br>" +
        "<li>如：9王灿的“小巧”，即便将♠️判定牌视为♥️，如果判定结果被固定为了♠️，那还是可能被“闪电”判定命中</li>",
    'lit_wutongV2': "梧桐V2",
    'lit_wutongV2_info': "场上判定生效前，你可以失去1点体力或弃置全部手牌，将此判定结果固定为任意花色（与判定牌无关）",

    // 王荣
    'lit_manmanlai': "慢慢来",
    'lit_manmanlai_info': "主公技，未持有〖吊诡〗的“叁”势力角色，可于准备阶段弃置判定区的一张牌，然后你恢复1点体力",
    /*负面效果*/'lit_diaogui': "吊诡",
    'lit_diaogui_info': "负面效果，【兵粮寸断】和【乐不思蜀】对你必定生效；一轮开始时（含游戏开始时），你可以失去1点体力，将此标记转移给一名其他角色",
    'lit_kushi': "苦诗",
    'lit_kushi_info': "锁定技，你或你攻击范围内的角色每进行一次判定，你摸一张牌",
    'lit_qixu': "期许",
    'lit_qixu_info': `出牌阶段，你可以令一名角色判定，让其猜测判定的花色：若猜错，你按实际花色，令其进行♠️️【闪电】、♥️️【乐不思蜀】、♣️️【兵粮寸断】、♦️【遣返牌】的判定；若猜中，你失去此技能并获得${get.poptip('lit_zhijian')}`,
    'lit_qixuV2': "期许V2",
    'lit_qixuV2_info': `V2 出牌阶段，你可以令一名角色判定，让其猜测判定的花色：若猜错，你按实际花色，令其进行♠️️【闪电】、♥️️【乐不思蜀】、♣️️【兵粮寸断】、♦️️【遣返牌】的判定；若猜中，你获得${get.poptip('lit_zhijian')}`,
    'lit_zhijian': "执剑",
    'lit_zhijian_info': `当你使用【杀】指定目标后，你可以判定：若为♥️♦️，你可以扣置目标角色至多${X}张牌于其武将牌上，其于此【杀】结算后获得之；若为♠️♣️，此【杀】对该目标角色造成的伤害+1（${X}为其体力值）`,
    // 蒋海旭
    'lit_yuanzhu': "援助",
    'lit_yuanzhu_info': "其他角色回合开始前，若其没有“援”，你可以弃置1~2张牌，令其获得等量枚“援”；锁定技，有“援”的角色弃牌时，取消弃牌并移去1枚“援”（仅限手牌和装备区的弃牌）",
    'lit_chenshui': "沉睡",
    'lit_chenshui_info': "每回合限一次，当其他角色扣血瞬间，你可以翻面并令其摸两张牌",
    'lit_chenshui_faq': "关于扣血瞬间的具体时机",
    'lit_chenshui_faq_info': "此时机在伤害结算/失去体力结算中或满血失去体力上限后，在进入濒死时机之前",
    'lit_shanliang': "善良",
    'lit_shanliang_info': "锁定技，当你进入濒死状态时，全场角色展示手牌并弃置其中的【桃】和字面意义上的桃，你恢复等量的体力",
    'lit_shanliangV2': "善良V2",
    'lit_shanliangV2_info': "锁定技，当你进入濒死状态时，全场角色展示手牌并弃置其中的【桃】和字面意义上的桃，你恢复等量的体力；若恢复的体力值溢出，则增加等溢出量的体力上限后恢复体力至上限",
    // 钱保灿
    'lit_chushou': "出手",
    'lit_chushou_info': "锁定技，回合开始前，你跳过摸牌阶段，视为使用一张你声明的普通锦囊牌，此牌不可被【无懈可击】响应",
    'lit_chushouV2': "出手V2",
    'lit_chushouV2_info': "锁定技，回合开始前，你视为使用一张你声明的普通锦囊牌，此牌不可被【无懈可击】响应",
    'lit_zhixun': "质询",
    'lit_zhixun_info': "当牌的目标数大于1时，你可以取消其中一个目标，视为对一名角色再次使用此牌",
    'lit_male': "麻了",
    'lit_male_info': `当你造成伤害前，若此牌与上次造成伤害的牌${get.poptip("lit_sameName")}，你可以判定，若为：<li>♥️♦️，${Styled('r', '本回合你使用【杀】或【决斗】的目标数+1')}；</li><li>♠️♣️，本回合此技能中非红色部分失效，取消本次伤害，然后你摸一张牌</li>`,
    'lit_male_tag': "同名",
    // 张驰
    'lit_guibian': "诡辩",
    'lit_guibian_info': `出牌阶段限一次，你可以令一名其他角色展示所有手牌，你选择其中一张令其对你使用（无视距离），若其不使用或无法使用，则其交给你所有与之${get.poptip("lit_sameName")}的牌`,
    'lit_shuxin': "竖心",
    'lit_shuxin_info': "锁定技，当你成为其他角色使用的基本牌或普通锦囊牌的目标后，你令使用者对其自己使用此牌",
    'lit_shuxinV2': "竖心V2",
    'lit_shuxinV2_info': "当你成为其他角色使用的基本牌或普通锦囊牌的目标后，你可以令使用者对其自己使用此牌",
    // 杨湘铃
    'lit_lenmo': "冷漠",
    'lit_lenmo_info': `锁定技，当你造成伤害前，若受伤角色不为你且其攻击范围内不包括你，则你令其获得1层${get.poptip('lit_dongjie')}，若此时其“冻结”层数大于其体力值，其翻面`,
    /*负面效果*/'lit_dongjie': "冻结",
    'lit_dongjie_info': "负面效果，翻面后失去所有“冻结”和等量体力",
    'lit_xiaosa': "潇洒",
    'lit_xiaosa_info': "每回合每种情况限一次：<li>场上有人因受到伤害而进入濒死状态时，你可以令一名角色翻面，然后你获得其装备区的牌；</li><li>场上有人因失去体力而进入濒死状态时，你可以将一张装备牌当无次数限制的【杀】使用，此【杀】不可被响应</li>",
    'lit_juji': "狙击",
    'lit_juji_info': "锁定技，你的回合内，其他角色与你的距离视为无限，你与其他角色的距离视为1",

};
export const simpleTranslate = {
    // 9张驰
    /*悖论*/
    'lit_bolun_info': `扣1手牌视为用出任意${get.poptip("lit_basicTrickCard")}，可被质疑：<br>①成功：此牌无效且本回合不可再声明它，质疑者+1牌<br>②失败：此牌生效，质疑者选择随机失1~2血或获得${get.poptip('lit_jiqing')}`,
    /*基情*/
    'lit_jiqing_info': `锁；无法质疑${get.poptip("lit_bolun")}。体为1时${Styled('r', '其他技能失效')}，<1时${Styled('r', '主动技能失效')}`,
    /*激情四射*/
    'lit_jiqingsishe_info': `锁；死前选拥有${get.poptip('lit_jiqing')}的1人令其判定：${Styled('r', '不为桃或桃园结义则其死亡')}`,

    // 9王灿
    /*小巧*/
    'lit_xiaoqiao_info': "锁；♠️牌视作♥️牌。",
    /*火山*/
    'lit_huoshan_info': `锁；结束可判定，为♥️获1“爆”。准备可移去所有“爆”，+${X}牌且本回合伤害+${X}（${X}为移去“爆”数）`,
    /*人小*/
    'lit_renxiao_info': `${Styled('r', '成功后本回合不可再用')}；用牌后可判定，为♥️从弃牌堆获之`,

    // 9李洋
    /*秀儿*/
    'lit_xiuer_info': `每用1非转锦囊可摸1牌，体为1则+1；锁；${Styled('g', '使用锦囊无距离限制')}`,
    /*黄色*/
    'lit_huangse_info': `锁；对${Styled('r', '异性')}伤害+1，伤害${Styled('g', '同性')}后摸1牌`,

    // 9张盛杰
    /*励志*/
    'lit_lizhi_info': `锁；摸牌阶段摸牌数+${X}（${X}为已失去的体力）`,
    /*肾竭*/
    'lit_shenjie_info': `锁；${Styled('g', '进入/脱离')}濒死后${Styled('g', '摸2/1')}牌；手牌上限为(体力上限+2)`,
    /*折腕*/
    'lit_zhewan_info': `可将${Styled('g', '同花色1~2张')}：♠️当无懈，♥️当桃，♣️当闪，♦️当火杀使用或打出；用2张♥️/♦️则恢复/伤害值+1，用2张♠️/♣️则弃置当前回合角色1牌`,

    // 陈可
    /*逆天*/
    'lit_nitian_info': `场上判定时，可打1牌代替判定牌并${Styled('g', '拿走原判定牌')}，用♥️♠️改判则摸1牌`,
    /*遗嘱*/
    'lit_yizhu_info': "每-1血或受1伤，可拿1人1牌；死时可将所有牌放牌堆顶或给他人",

    // 林淼
    /*神鸽*/
    'lit_shenge_info': `用杀可选距离${Styled('g', '≤')}点数者为目标。杀指定目标后可发动：` +
        `<br>①血${Styled('g', '≤')}目标，对此目标${Styled('r', '伤害+1')}；` +
        `<br>②手牌数${Styled('g', '≤')}目标${get.poptip("lit_hejCard")}数，${Styled('r', '不可被响应且无视防具')}`,
    /*咕咕*/
    'lit_gugu_info': `${Styled('r', '受伤')}濒死前可回至1血并获${X}“咕”，依次用牌堆顶前${X}张牌（${X}为恢复的血量）<li>锁；回合结束移去所有咕，-(咕数-1)点血</li>`,

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
    'lit_shengjizpj_info': `${get.poptip('lit_saohuaV2')} +1体力上限，+3护甲，获得并修改“骚话”：此技能中，点数<7的牌计算时的点数+7`,
    /*升级·菠树*/
    'lit_shengjibs_info': `${get.poptip('lit_yisuiV2')} 获得并修改“易碎”：闺蜜死亡时，你不再失去体力`,
    /*升级·刘晨沐*/
    'lit_shengjilcm_info': `${get.poptip('lit_jijinV2')} 获得并修改“受激”：伤害越高，受激叠层越多`,
    /*升级·郑墨翰*/
    'lit_shengjizmh_info': `${get.poptip('lit_jianrenV2')} 获得“坚韧”并于末尾增加：横置时属性伤+1`,
    /*升级·Rita*/
    'lit_shengjirita_info': `${get.poptip('lit_dafang')}${get.poptip('lit_hengshuitiV2')}若已拥有“大方”，则获得“衡水体”并于其中增加：+1血；否则，获得“大方”`,
    /*升级·胡畔*/
    'lit_shengjihp_info': `-1体力上限，获得：${get.poptip('lit_yinren')}${get.poptip('lit_fumeng')}`,
    /*升级·兰柏勋*/
    'lit_shengjilbx_info': "+1体力上限，回满血",
    /*升级·胡馨予*/
    'lit_shengjihxy_info': `${get.poptip('lit_shihuaiV2')} 获得并修改“释怀”选项②：交给你1张装备牌`,
    /*升级·胡峻玮*/
    'lit_shengjihjw_info': `${get.poptip('lit_wutongV2')} 获得并修改“梧桐”条件：还可弃置全部手牌触发`,
    /*升级·王荣*/
    'lit_shengjirs_info': `${get.poptip('lit_qixuV2')} 获得并修改“期许”：猜中时不再失去此技能`,
    /*升级·蒋海旭*/
    'lit_shengjijhx_info': `${get.poptip('lit_shanliangV2')} 获得并于“善良”末尾增加：若恢复量溢出，增加等溢出量的上限后回满血`,
    /*升级·钱保灿*/
    'lit_shengjiqbc_info': `${get.poptip('lit_chushouV2')} 获得并修改“出手”：不再跳过摸牌阶段`,
    /*升级·张驰*/
    'lit_shengjizc_info': `${get.poptip('lit_shuxinV2')} 获得并修改“竖心”：不再为锁定技`,
    /*升级·杨湘铃*/
    'lit_shengjiyxl_info': `获得：${get.poptip('lit_juji')}`,

    // Qb
    /*33*/
    'lit_33_info': "主；其余“叁”势力每回合可发动1次，其受来自你的1伤，然后你：<li>血>3时-1血</li><li>血<=3时+1血</li>",
    /*天呐*/
    'lit_tianna_info': "锁；造伤后，回合外+2牌，回合内-1手牌+1血",
    /*天呐V2*/
    'lit_tiannaV2_info': "V2 锁；造伤后，回合外+2牌，回合内-1手牌+1血；>1血时，受伤若会使血<1则免伤且血掉至1",
    /*遣退*/
    'lit_qiantui_info': `血由3以上掉到3及以下时，可令不带有${get.poptip('lit_kuanshu')}的1人获得${get.poptip('lit_qianfan')}`,
    /*负面效果*/ /*遣返*/
    'lit_qianfan_info': `负面；跳过下回合并获得${get.poptip('lit_kuanshu')}，宽恕在下回合开始前失效`,
    /*宽恕*/
    'lit_kuanshu_info': "锁；本次不会被遣返",

    // 张盛杰
    /*无头*/
    'lit_wutou_info': "锁；回合开始前，你跳过准备阶段和判定阶段；你的延时锦囊牌可以指定自己为目标",
    /*游侠*/
    'lit_youxia_info': "①出牌阶段前，可移动场上1牌，移动前获得目的地原来的牌<br>②锁；判定区每失去1张牌，+1牌",
    /*心毅*/
    'lit_xinyi_info': `觉；出牌阶段，若判定区内有或有过≥2种延时锦囊牌，则-1上限，获得${get.poptip('lit_xinhen')}`,
    /*心痕*/
    'lit_xinhen_info': "出牌阶段限1次，可将判定区中所有牌当杀，依次对攻击范围内的1人使用。若这些牌中有牌在判定区中视为：" +
        "<li>【闪电】，这些杀视为雷杀</li><li>【乐不思蜀】，技能目标被指定后，弃置“与你判定区等量”的牌；</li><li>【兵粮寸断】，每张杀所需的闪+1；</li><li>【遣返牌】，杀基础伤害+1</li>",

    // 张钦奕
    /*蛋壳*/
    'lit_danke_info': `锁；准备阶段令他人-${X}血，回合结束后其+${X}血，溢出量转为护甲（${X}为其血量-1）`,
    /*紫砂*/
    'lit_zisha_info': "锁；血=2时，所有牌不能被响应",
    /*紫砂V2*/
    'lit_zishaV2_info': `V2 准备阶段可-${Y}血+2${Y}牌（${Y}不超过体力值）；锁；血=2时所有牌不能被响应`,
    /*蓝酮*/
    'lit_lantong_info': "锁；同性对你的桃治疗量+1",

    // 庞建龙
    /*强健*/
    'lit_qiangjian_info': "锁；杀、决斗、万箭、南蛮，他人响应需杀/闪+1",
    /*对练*/
    'lit_duilian_info': "出牌限1次，弃1牌选择任意对人使其相互决斗，不可无懈",
    /*对练V2*/
    'lit_duilianV2_info': "V2 出牌限1次，选择任意对人使其相互决斗，不可无懈",

    // 伍小戚
    /*神曹操*/
    'lit_shencaocao_info': "出牌限1次，其他人各摸1牌，你翻面并-1“面”，若成功-1“面”则+1血，",
    /*鸡娃*/
    'lit_jiwa_info': "翻面后可交换2人手牌",
    /*面具*/
    'lit_mianju_info': `锁；起始获4“面”，每次濒死后回满血并移除等量“面”，“面”耗尽时失去此技能并获得${get.poptip('lit_xiaochou')}`,
    /*面具V2*/
    'lit_mianjuV2_info': `V2 锁；起始获4“面”，每次濒死后回满血并移除等量“面”，“面”耗尽时失去此技能并获得${get.poptip('lit_xiaochouV2')}`,
    /*小丑*/
    'lit_xiaochou_info': "锁；死后令伤害来源失去所有手牌",
    /*小丑V2*/
    'lit_xiaochouV2_info': "V2 锁；死后令伤害来源失去所有牌",

    // 自高
    /*信任*/
    'lit_xinren_info': "主；出牌限1次，交给某“叁”势力角色1牌，其可立即使用，你摸与该牌造成的总伤害相等的牌",
    /*展示*/
    'lit_zhanshi_info': `出牌限1次，令他人展示所有手牌并给你，你给其${X}牌其摸${X}牌，直到其回合结束，其使用牌点数为${Y}的：<li>倍数，无次数限制；</li><li>约数，+1牌</li><br>（${X}为手牌溢出量且摸牌数至多为3，${Y}为其使用的上一牌的点数）`,
    /*展示*/
    'lit_zhanshiV2_info': `V2 出牌限1次，令他人展示所有手牌并给你，你给其${X}牌其摸${X}牌，直到你/其回合结束，你/其使用牌点数为${Y}的：<li>倍数，无次数限制；</li><li>约数，+1牌</li><br>（${X}为手牌溢出量且摸牌数至多为3，${Y}为使用的上一牌的点数）`,
    /*铲踏儿*/
    'lit_chantaer_info': "锁；手牌上限基准为体力上限<li>准备阶段手牌数≤上限+1血</li><li>结束阶段本回合无人受过伤摸2牌并-1血</li>",

    // 曾品嘉
    /*快活*/
    'lit_kuaihuo_info': "每回合限1次，使用杀后可于牌堆顶置换1牌并询问他人是否也对其使用杀",
    /*骚话*/
    'lit_saohua_info': `已用和打出${get.poptip("lit_exDelayEquipCard")}可置于角色上。出牌可：<li>将2张点数和≥13的牌当闪电</li><li>弃3张点数和=33的牌造成3点雷伤（此项每回合限1次）</li>`,
    /*骚话V2*/
    'lit_saohuaV2_info': `V2 已用和打出${get.poptip("lit_exDelayEquipCard")}可置于角色上，技能期间点数<7的牌点数+7。出牌阶段可：<li>将2张点数和≥13的牌当闪电</li><li>弃3张点数和=33的牌造成3点雷伤（此项每回合限1次）</li>`,

    // 菠树
    /*闺蜜*/
    'lit_guimi_info': "锁；摸初始牌前选一“闺蜜”，其雷伤+1，每间隔1轮的轮次中每回合首次受伤后+1血；<br>濒死时闺蜜可用♥️♦️牌当桃救你（场上无闺蜜时重选）",
    /*易碎*/
    'lit_yisui_info': "锁；闺蜜在时手牌数恒为2；<br>闺蜜满血时你免伤，并令不为你的伤害源失去等量体力；<br>闺蜜死，你失去所有体力",
    /*易碎V2*/
    'lit_yisuiV2_info': "V2 锁；闺蜜在时手牌数恒为2；<br>闺蜜满血时你免伤，并令不为你的伤害源失去等量体力",

    // 刘晨沐
    /*古风*/
    'lit_gufeng_info': "每回合限1次，有人用牌指定目标后可添加1个目标",
    /*激进*/
    'lit_jijin_info': `锁；杀造成伤害后令受伤者获得${get.poptip('lit_shouji')}`,
    /*激进V2*/
    'lit_jijinV2_info': `V2 锁；杀造成伤害后令受伤者获得${get.poptip('lit_shouji')}，伤害越高叠层越多`,
    /*负面效果*/ /*受激*/
    'lit_shouji_info': "负面；下个用杀者强制选择你为目标（无视距离）",

    // 郑墨翰
    /*闷骚*/
    'lit_mensao_info': "出牌限1次，将任意张牌作铁索连环使用或弃置，然后摸等量牌并令场上横置者+1血",
    /*坚韧*/
    'lit_jianren_info': "锁；对血更多者伤害+1，伤害手牌更多者后摸1牌",
    /*坚韧V2*/
    'lit_jianrenV2_info': "V2 锁；对血更多者伤害+1，伤害手牌更多者后摸1牌，横置时属性伤+1",
    /*忍耐*/
    'lit_rennai_info': "受横置传导伤害后可横置任意数量角色",

    // Rita
    /*大方*/
    'lit_dafang_info': "主；装备区每失去1张牌后，可令一“叁”势力角色将手牌补至全场最多（至多至其体力上限）",
    /*懦弱*/
    'lit_nuoruo_info': "他人出牌阶段其置入弃牌堆的装备牌你可获得之",
    /*衡水体*/
    'lit_hengshuiti_info': "锁；使用装备牌后可视为对1人使用冰杀",
    /*衡水体V2*/
    'lit_hengshuitiV2_info': "V2 锁；使用装备牌后+1血，可视为对1人使用冰杀",

    // 胡畔
    /*脆弱*/
    'lit_cuiruo_info': `回合结束若不为满血可+${X}牌并将体力调至${X}（${X}为已失去的体力）`,
    /*誓仇*/
    'lit_shichou_info': `锁；受伤后伤害源获得“誓”，血=1时对所有带“誓”者造成${Y}点伤害，并移除所有“誓”（${Y}为其血+护甲-1）`,
    /*殷刃*/
    'lit_yinren_info': "每回合限1次，需使用或打出杀时可-1血视为使用无距离和次数限制的杀，若造成伤害+1血",
    /*浮梦*/
    'lit_fumeng_info': `出牌限1次，选择体力上限>1的1人令其${get.poptip('lit_mengying')}层数+${Z}（${Z}为其已损失的血量且至少为1）`,
    /*负面效果*/ /*梦萦*/
    'lit_mengying_info': "负面；每层-1体力上限，每+1血-1层",

    // 兰柏勋
    /*欲求*/
    'lit_yuqiu_info': `${get.poptip("lit_damageCard")}对目标未造成伤害：<li>质数牌可拿目标1牌</li><li>非质数牌可弃目标至多2牌</li>`,
    /*守望*/
    'lit_shouwang_info': "锁；手牌数/体力为全场最多（之一）时伤害+1",

    // 胡馨予
    /*迷茫*/
    'lit_mimang_info': "每造成或受1伤获得1“茫”，结束阶段可移去若干“茫”重铸等量牌弃置他人等量牌",
    /*释怀*/
    'lit_shihuai_info': "出牌限1次，装备牌可作决斗使用；<br>无手牌时可令他人选择：<br>①受到1点伤害；<br>②交给你1张牌",
    /*释怀V2*/
    'lit_shihuaiV2_info': "V2 出牌限1次，装备牌可作决斗使用；<br>无手牌时可令他人选择：<br>①受到1点伤害；<br>②交给你1张装备牌",

    // 胡峻玮
    /*表现*/
    'lit_biaoxian_info': "用杀指定目标后可判定，为♦️则基础伤害+1且不可被其响应",
    /*梧桐*/
    'lit_wutong_info': "场上判定生效前可-1体力将判定结果固定为任意花色",
    /*梧桐V2*/
    'lit_wutongV2_info': "V2 场上判定生效前可-1体力或弃全部手牌判定结果固定为任意花色",

    // 王荣
    /*慢慢来*/
    'lit_manmanlai_info': `主；未持有${get.poptip('lit_diaogui')}的“叁”势力角色可于准备阶段弃置判定区1张牌，然后你+1血`,
    /*负面效果*/ /*吊诡*/
    'lit_diaogui_info': "负面；兵乐必中，一轮开始时（含游戏开始时）可-1血转移给其他人",
    /*苦诗*/
    'lit_kushi_info': "锁；你或攻击范围内的角色每进行一次判定你摸1张牌",
    /*期许*/
    'lit_qixu_info': `出牌阶段可令1人判定让其猜测花色：猜错则按实际花色令其进行♠️闪电、♥️乐、♣️兵、♦️遣返牌的判定；猜中则你失去此技能并获得${get.poptip('lit_zhijian')}`,
    /*期许V2*/
    'lit_qixuV2_info': `V2 出牌阶段可令1人判定让其猜测花色：猜错则按实际花色令其进行♠️闪电、♥️乐、♣️兵、♦️遣返牌的判定；猜中则你获得${get.poptip('lit_zhijian')}`,
    /*执剑*/
    'lit_zhijian_info': `使用杀指定目标后可判定：♥️♦️可扣置目标至多${X}张牌于武将牌上，其于杀结算后获得之；♠️♣️对此目标的此杀伤害+1（${X}为其体力值）`,

    // 蒋海旭
    /*援助*/
    'lit_yuanzhu_info': "他人回合开始前，若其没有“援”，你可弃置1~2牌，其+等量“援”。锁；有“援”者弃牌时取消弃牌并-1“援”（仅限手牌和装备区的弃牌）",
    /*沉睡*/
    'lit_chenshui_info': "每回合限1次，有人扣血瞬间你可翻面并令其+2牌",
    /*善良*/
    'lit_shanliang_info': "锁；濒死时全场展示手牌并弃置其中的桃和字面意义上的桃，你+等弃置量的血",
    /*善良V2*/
    'lit_shanliangV2_info': "V2 锁；濒死时全场展示手牌并弃置其中的桃和字面意义上的桃，你+等弃置量的血；若恢复量溢出则加等溢出量上限后回满血",

    // 钱保灿
    /*出手*/
    'lit_chushou_info': "锁；回合开始前跳过摸牌阶段视为使用1张你声明的锦囊牌，不可无懈",
    /*出手V2*/
    'lit_chushouV2_info': "V2 锁；回合开始前视为使用1张你声明的锦囊牌，不可无懈",
    /*质询*/
    'lit_zhixun_info': "牌的目标不为1时可取消其中1个目标，视为对1人再次使用此牌",
    /*麻了*/
    'lit_male_info': `造成伤害前若此牌与上次${get.poptip("lit_sameName")}可判定，若为：<br>①♥️♦️${Styled('r', '本回合杀、决斗目标数+1')}；<br>②♠️♣️本回合非红色️部分失效，取消本次伤害，+1牌`,

    // 张驰
    /*诡辩*/
    'lit_guibian_info': `出牌限1次，令1人展示所有牌你选择其中1张令其对你使用（无视距离），若其不使用或无法使用则交付所有${get.poptip("lit_sameName")}牌`,
    /*竖心*/
    'lit_shuxin_info': "锁；成为他人基本牌或普通锦囊牌的目标后令使用者对他自己使用此牌",
    /*竖心V2*/
    'lit_shuxinV2_info': "V2 成为他人基本牌或普通锦囊牌的目标后可令使用者对他自己使用此牌",

    // 杨湘铃
    /*冷漠*/
    'lit_lenmo_info': `锁；造成伤害前若其不为你且攻击范围内不包括你，则令其获得一层${get.poptip('lit_dongjie')}，若此时冻结层数大于其体力值，其翻面`,
    /*负面效果*/ /*冻结*/
    'lit_dongjie_info': "负面；翻面后失去所有“冻结”和等量体力",
    /*潇洒*/
    'lit_xiaosa_info': "每回合每种情况限1次<li>场上有人受伤濒死时，可令1人翻面并获得其装备区的牌</li><li>场上有人失去体力濒死时，可将1张装备牌作无次数限制的杀使用，不可被响应</li>",
    /*狙击*/
    'lit_juji_info': "锁；回合内，他人与你的距离视作无限，你与他人的距离视作1",
};

export const dynamicTranslate = {
    // 国战势力与机制改动
    lit_shengjirita(player) {
        let group = lib.lit.isGuozhanKeyEnabled() ? '叁/键' : '叁';
        if (player.hasSkill('lit_dafang')) return `${get.poptip('lit_hengshuitiV2')} 于“衡水体”中增加：+1血`;
        return `获得${get.poptip('lit_dafang')}：主；装备区失去牌后，可令1“${group}”势力角色将手牌补至全场最多（至多至其体力上限）`;
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
        return `主；装备区每失去1张牌后，可令一“${group}”势力角色将手牌补至全场最多（至多至其体力上限）`;
    },
    lit_guimi(player) {
        if (get.mode() === 'guozhan') return "锁；明置此技能后，若你无“闺蜜”，选一“闺蜜”，其雷伤+1，每间隔1轮的轮次中每回合首次受伤后+1血；<br>濒死时闺蜜可用♥️♦️牌当桃救你（场上无闺蜜时重选）";
        return "锁；摸初始牌前选一“闺蜜”，其雷伤+1，每间隔1轮的轮次中每回合首次受伤后+1血；<br>濒死时闺蜜可用♥️♦️牌当桃救你（场上无闺蜜时重选）";
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
    lit_male(player) {
        if (player.isTempBanned('lit_male_judge')) return `${Styled('O', '造成伤害前若此牌与上次${get.poptip("lit_sameName")}可判定，若为：')}<br>`
            + `①♥️♦️${Styled('r', '本回合杀、决斗目标数+1')}；<br>`
            + `${Styled('O', '②♠️♣️本回合非红色部分失效，取消本次伤害，+1牌')}`;
        return `造成伤害前若此牌与上次${get.poptip("lit_sameName")}可判定，若为：<br>①♥️♦️${Styled('r', '本回合杀、决斗目标数+1')}；<br>②♠️♣️本回合非红色️部分失效，取消本次伤害，+1牌`;
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

// (() => {
//     const pack = lib.characterPack['lit'];
//     let str = "";
//     for (let char in pack) {
//         const character = pack[char];
//         str += get.translation(char) + ` hp = ${(character.maxHp && character.maxHp != character.hp) ? `${character.hp}/${character.maxHp}` : character.hp}：\n`;
//         const derivations = [];
//         for (const skillName of character.skills) {
//             str += `${get.translation(skillName)}：${get.translation(`${skillName}_info`)}\n`;
//             if (lib.skill[skillName]?.derivation) {
//                 const skill = lib.skill[skillName];
//                 if (typeof skill.derivation === "string" && lib.skill[skill.derivation]) {
//                     derivations.add(skill.derivation);
//                 } else if (Array.isArray(skill.derivation)) {
//                     derivations.addArray(skill.derivation.filter(e => lib.skill[e]));
//                 }
//             }
//         }
//         for (const skillName of derivations) {
//             if (get.translation(`${skillName}_info`) === `${skillName}_info`) continue;
//             str += `（${get.translation(skillName)}：${get.translation(`${skillName}_info`)}）\n`;
//         }
//         str += '\n';
//     }
//     console.log(get.plainText(str))
// })()
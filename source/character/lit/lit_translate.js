import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';

// 改不了，还是去提issue吧
// function lit_tip(id, name, type) {
//     let tipName = name ?? (`※${get.translation(id)}`);
//     let obj = {
//         id: id,
//         name: tipName,
//     };
//     if (type) obj.type = type;
//     switch (type) {
//         case "card": obj.dialog = "cardDialog"; break;
//         case "character": obj.dialog = "characterDialog"; break;
//         default: {
//             obj.info = get.translation(id + "_info");
//             break;
//         }
//     }
//     return get.poptip(obj);
// }

function Styled(style, text) {
    switch (style) {
        case 'r': style = 'color:Red'; break;
        case 'g': style = 'color:PaleGreen'; break;
        case 'b': style = 'color:LightBlue'; break;
        case 'p': style = 'color:Pink'; break;
        case 'y': style = 'color:Orange'; break;
        case 'o': style = 'opacity:0.5'; break;
    }
    return `<span style='${style}'>${text}</span>`;
}
let X = Styled('b', 'X'), Y = Styled('p', 'Y'), Z = Styled('y', 'Z');

export const translate = {
    'lit': '叁岛世界',
    'lit_gz': '叁岛国战',
    'lit_test': '叁岛测试',
    'lit_ybs': '一班杀',
    'lit_sdp': '叁岛篇',
    'lit_jbs': '九班杀',

    'lit_negClear_faq': '负面效果',
    'lit_negClear_faq_info': '均视为锁定技，在死亡后清除',

    'lit_zhangchi9张驰': '9张驰',
    'lit_zhangchi9张驰_prefix': '9',
    'lit_wangcan9王灿': '9王灿',
    'lit_wangcan9王灿_prefix': '9',
    'lit_liyang9李洋': '9李洋',
    'lit_liyang9李洋_prefix': '9',
    'lit_zhangshengjie9张盛杰': '9张盛杰',
    'lit_zhangshengjie9张盛杰_prefix': '9',
    'lit_chenke陈可': '陈可',
    'lit_linmiao林淼': '林淼',

    // 9张驰
    'lit_bolun': '悖论',
    'lit_bolun_info': `你可以扣置1张手牌并声明1种普通锦囊牌或基本牌的牌名，视为你使用或打出你声明的牌，其余多人可同时质疑：<li>①为真（声明的牌与扣置的牌不相符）：此牌无效，质疑者摸1张牌。<li>②反之：此牌依然生效，质疑者选择1项：①随机失去1~2点体力；②获得${get.poptip('lit_jiqing')}<br>（被质疑成功后不可再悖论此牌）`,
    'lit_bolun_ally': '信任',
    'lit_bolun_betray': '质疑',
    'lit_bolun_ally_bg': '真',
    'lit_bolun_betray_bg': '假',
    'lit_jiqing': '基情',
    'lit_jiqing_info': `锁定技；你不能质疑“悖论”，你体力为1时，${Styled('r', '其他技能无效')}；体力<1时，${Styled('r', '主动技能无效')}`,
    'lit_jiqingsishe': '激情四射',
    'lit_jiqingsishe_info': `锁定技；你死亡前，你选择拥有“基情”的1人令其判定：${Styled('r', '不为“桃”或“桃园结义”则其死亡')}`,
    // 9王灿
    'lit_xiaoqiao': '小巧',
    'lit_xiaoqiao_info': '锁定技；你的♠牌视作♥牌。',
    'lit_huoshan': '火山',
    'lit_huoshan_info': `锁定技；结束阶段，你进行判定：为♥则你获得1个“爆”；准备阶段，你可以移去所有的“爆”，摸${X}张牌，然后本回合你造成的伤害+${X}。（${X}为移去的“爆”数）`,
    'lit_renxiao': '人小',
    'lit_renxiao_info': `${Styled('r', '成功后不可于此回合再次使用')}；你使用或打出牌后，可判定：若为♥，你从弃牌堆中获得之。`,
    // 9李洋
    'lit_xiuer': '秀儿',
    'lit_xiuer_info': `你每使用1张非转化锦囊牌就可以摸1张牌，若体力为1则+1张；锁定技；你${Styled('r', '使用锦囊牌无距离限制')}`,
    'lit_huangse': '黄色',
    'lit_huangse_info': `锁定技；你对${Styled('r', '异性')}伤害+1；伤害${Styled('g', '同性')}后摸1张牌`,
    // 9张盛杰
    'lit_lizhi': '励志',
    'lit_lizhi_info': `锁定技；摸牌阶段，你的摸牌数+${X}（${X}为你已失去的体力）`,
    'lit_shenjie': '肾竭',
    'lit_shenjie_info': '锁定技；你进入/脱离濒死状态后摸2/1张牌；你的手牌上限为(你的体力上限+2)',
    'lit_zhewan': '折腕',
    'lit_zhewan_info': `你可以将${Styled('g', '同花色的1~2张')}：♠牌当“无懈可击”，♥牌当“桃”，♣牌当“闪”，♦牌当“火杀”使用或打出；若以此法使用了2张♥♦牌，则此牌恢复值或伤害值+1；以此法使用了2张♠♣牌，则你弃置当前回合角色1张牌`,
    // 陈可
    'lit_nitian': '逆天',
    'lit_nitian_info': `每当有判定时，你可以打出1张牌代替判定牌，并${Styled('g', '拿走原本的判定牌')}，若使用♥♠改判则摸1张牌`,
    'lit_yizhu': '遗嘱',
    'lit_yizhu_info': '每失去1血或受到1伤，可拿1人的1牌；死亡时，可将所有牌放至牌堆顶或交给他人',
    // 林淼
    'lit_shenge': '神鸽',
    'lit_shenge_info': '用杀时可选距离≤此牌点数者为目标。杀指定目标后，可触发以下效果：<br>①体力≤目标体力时，此杀伤害+1；<br>②手牌数≤目标区域牌时，杀无视防具且不可被响应。',
    'lit_gugu': '咕咕',
    'lit_gugu_info': `${Styled('r', '受伤')}濒死前，可恢复体力至1并获${X}个“咕”，依次使用牌堆顶前${X}张牌<li>锁定技；回合结束时移去所有咕并失去(咕数-1)点体力（${X}为回复的体力）`,

    'lit_qbQb': 'Qb',
    'lit_zhangshengjie张盛杰': '张盛杰',
    'lit_zhangqinyi张钦奕': '张钦奕',
    'lit_pangjianlong庞建龙': '庞建龙',
    'lit_wuxiaoqi伍小戚': '伍小戚',
    'lit_zigao自高': '自高',
    'lit_zengpinjia曾品嘉': '曾品嘉',
    'lit_boshu菠树': '菠树',
    'lit_liuchenmu刘晨沐': '刘晨沐',
    'lit_zhengmohan郑墨翰': '郑墨翰',
    'lit_ritaRita': 'Rita',
    'lit_hupan胡畔': '胡畔',
    'lit_lanboxun兰柏勋': '兰柏勋',
    'lit_huxinyu胡馨予': '胡馨予',
    'lit_hujunwei胡峻玮': '胡峻玮',
    'lit_jianghaixu蒋海旭': '蒋海旭',
    'lit_qianbaocan钱保灿': '钱保灿',
    'lit_zhangchi张驰': '张驰',
    'lit_yangxiangling杨湘铃': '杨湘铃',

    'lit_shengji': '升级',
    'lit_shengji_info': '场上每有1名角色死亡全体获得1点经验，击杀者额外获得1点经验，经验达到3或全场人数不足5时升级',
    'lit_shengjiqb': '升级·Qb',
    'lit_shengjiqb_info': `${get.poptip('lit_tiannaV2')} 获得“天呐”并于末尾增加：>1血受伤时若此伤害会使血<1，免伤且血掉至1`,
    'lit_shengjizsj': '升级·张盛杰',
    'lit_shengjizsj_info': `${get.poptip('lit_wutouV2')} 获得“无头”并于中增加：结束阶段，可强制移动场上的1牌`,
    'lit_shengjizqy': '升级·张钦奕',
    'lit_shengjizqy_info': `${get.poptip('lit_zishaV2')} 获得“紫砂”并于开头增加：准备阶段，可失去1点体力，+2牌`,
    'lit_shengjipjl': '升级·庞建龙',
    'lit_shengjipjl_info': `${get.poptip('lit_duilianV2')} 获得并修改“对练”：不需要弃牌了`,
    'lit_shengjiwxq': '升级·伍小戚',
    'lit_shengjiwxq_info': `${get.poptip('lit_mianjuV2')} 获得“面具”/“小丑”，并修改其中的“小丑”：使其弃全部牌`,
    'lit_shengjizg': '升级·自高',
    'lit_shengjizg_info': `${get.poptip('lit_zhanshiV2')} 获得并修改“展示”：你也拥有后半段技能`,
    'lit_shengjizpj': '升级·曾品嘉',
    'lit_shengjizpj_info': `${get.poptip('lit_saohuaV2')} 获得并修改“骚话”：此技能中，点数<7的牌计算时的点数+7`,
    'lit_shengjibs': '升级·菠树',
    'lit_shengjibs_info': `${get.poptip('lit_yisuiV2')} 获得并修改“易碎”：闺蜜死亡时，你不再失去体力`,
    'lit_shengjilcm': '升级·刘晨沐',
    'lit_shengjilcm_info': `${get.poptip('lit_jijinV2')} 获得并修改“受激”：伤害越高，受激叠层越多`,
    'lit_shengjizmh': '升级·郑墨翰',
    'lit_shengjizmh_info': `${get.poptip('lit_jianrenV2')} 获得“坚韧”并于末尾增加：横置时属性伤+1`,
    'lit_shengjirita': '升级·Rita',
    'lit_shengjirita_info': `${get.poptip('lit_dafang')}${get.poptip('lit_hengshuitiV2')}若已拥有“大方”，则获得“衡水体”并于中增加：+1血；否则，获得“大方”`,
    'lit_shengjihp': '升级·胡畔',
    'lit_shengjihp_info': `失去1点体力上限，获得：${get.poptip('lit_yinren')}${get.poptip('lit_fumeng')}`,
    'lit_shengjigy_info': '获得：“誓仇”“消散”',
    'lit_shengjip_info': '将角色改为“月惹”',
    'lit_shengjilbx': '升级·兰柏勋',
    'lit_shengjilbx_info': '+1体力上限，回满血',
    'lit_shengjihxy': '升级·胡馨予',
    'lit_shengjihxy_info': `${get.poptip('lit_shihuaiV2')} 获得并修改“释怀”选项②：交给你1张装备牌`,
    'lit_shengjihjw': '升级·胡峻玮',
    'lit_shengjihjw_info': `${get.poptip('lit_wutongV2')} 获得并修改“梧桐”条件：还可弃置全部手牌触发`,
    'lit_shengjirs': '升级·荣少',
    'lit_shengjirs_info': `${get.poptip('lit_qixuV2')} 获得并修改“期许”：猜中时不再失去此技能`,
    'lit_shengjijhx': '升级·蒋海旭',
    'lit_shengjijhx_info': `${get.poptip('lit_shanliangV2')} 获得并于“善良”末尾增加：若恢复量溢出，增加等溢出量的上限后回满血`,
    'lit_shengjiqbc': '升级·钱保灿',
    'lit_shengjiqbc_info': `${get.poptip('lit_chushouV2')} 获得并修改“出手”：不再跳过摸牌阶段`,
    'lit_shengjizc': '升级·张驰',
    'lit_shengjizc_info': `${get.poptip('lit_shuxinV2')} 获得并修改“竖心”：不再为锁定技`,
    'lit_shengjiyxl': '升级·杨湘铃',
    'lit_shengjiyxl_info': `获得：${get.poptip('lit_juji')}`,

    // Qb
    'lit_33': '33',
    'lit_33_info': '主；其余“叁”势力可在出牌阶段发动一次，其受到来自你的1伤，然后：<li>你血>3时，-1血<li>血<=3时，+1血',
    'lit_33_2': '33',
    'lit_33_3': '33',
    'lit_tianna': '天呐',
    'lit_tianna_info': '锁；造伤后，回合外摸2牌，回合内-1手牌，+1血',
    'lit_tiannaV2': '天呐V2',
    'lit_tiannaV2_info': 'V2 锁；造伤后，回合外摸2牌，回合内-1手牌，+1血；>1血受伤时若此伤害会使血<1，免伤且血掉至1',
    'lit_qiantui': '遣退',
    'lit_qiantui_info': `血由3以上掉到3及以下时，可令不带有${get.poptip('lit_kuanshu')}的1人获得${get.poptip('lit_qianfan')}`,
	/*负面效果*/'lit_qianfan': '遣返',
    'lit_qianfan_info': `负面；下回合开始前，跳回合，获得${get.poptip('lit_kuanshu')}，“宽恕”在下回合开始时失效`,
    'lit_kuanshu': '宽恕',
    'lit_kuanshu_info': '锁；本次不会被遣返',
    // 张盛杰
    'lit_wutou': '无头',
    'lit_wutou_info': '锁；回合开始前跳开始和判定，此后可强制移动场上1牌；延时锦囊牌可对自己使用',
    'lit_wutouV2': '无头V2',
    'lit_wutouV2_info': 'V2 锁；回合开始前跳开始和判定，此后或结束阶段，可强制移动场上1牌；延时锦囊牌可对自己使用',
    'lit_youxia': '游侠',
    'lit_youxia_info': '锁；判定区内存在或存在过：<br>①闪电，普通杀视为雷杀<br>②乐，被指定为“杀”的目标后，其须弃1张基本牌，否则此杀对你无效<br>③兵，造成伤害后，可获得目标1张牌<br>④遣返，响应你的杀须多出1张闪',
    // 张钦奕
    'lit_danke': '蛋壳',
    'lit_danke_info': '锁；准备阶段，伤害他人至1血，回合结束后其恢复等伤害量的血',
    'lit_zisha': '紫砂',
    'lit_zisha_info': '锁；血=2时，所有牌不能被响应',
    'lit_zishaV2': '紫砂V2',
    'lit_zishaV2_info': 'V2 准备阶段，可失去1点体力，+2牌；锁；血=2时，所有牌不能被响应',
    'lit_lantong': '蓝酮',
    'lit_lantong_info': '锁；同性对你的桃，治疗量+1',
    // 庞建龙
    'lit_qiangjian': '强健',
    'lit_qiangjian_info': '锁；杀、决斗、万箭齐发、南蛮入侵，他人响应需 杀/闪 +1',
    'lit_duilian': '对练',
    'lit_duilian_info': '出牌阶段限1次，弃1张牌，选择任意对人使其相互决斗',
    'lit_duilianV2': '对练V2',
    'lit_duilianV2_info': 'V2 出牌阶段限1次，选择任意对人使其相互决斗',
    // 伍小戚
    'lit_shencaocao': '神曹操',
    'lit_shencaocao_info': '出牌阶段限1次，-1“面”从而+1血，其他人各摸1牌，你翻面',
    'lit_jiwa': '鸡娃',
    'lit_jiwa_info': '翻面后可交换2人手牌',
    'lit_mianju': '面具',
    'lit_mianju_info': `锁；开始获得4“面”，每次濒死后回满血并移除等量“面”，“面”耗尽时失去此技能并获得${get.poptip('lit_xiaochou')}`,
    'lit_mianjuV2': '面具V2',
    'lit_mianjuV2_info': `V2 锁；开始获得4“面”，每次濒死后回满血并移除等量“面”，“面”耗尽时失去此技能并获得${get.poptip('lit_xiaochouV2')}`,
    'lit_xiaochou': '小丑',
    'lit_xiaochou_info': '锁；死亡后令伤害来源失去所有手牌',
    'lit_xiaochouV2': '小丑V2',
    'lit_xiaochouV2_info': 'V2 锁；死亡后令伤害来源失去所有牌',
    // 自高
    'lit_xinren': '信任',
    'lit_xinren_info': '主；出牌阶段限1次，交给某“叁”势力角色1牌，其可立即使用，你摸与该牌造成的总伤害相等的牌',
    'lit_zhanshi': '展示',
    'lit_zhanshi_info': `出牌阶段限1次，令他人展示所有手牌并给你，你给其${X}牌，其摸${X}牌，直到其回合结束，其使用牌点数为${Y}的：<li>倍数，无次数限制；<li>约数，+1牌<br>（${X}为手牌溢出量且摸牌数至多为3，${Y}为其使用的上一牌的点数）`,
    'lit_zhanshiV2': '展示',
    'lit_zhanshiV2_info': `V2 出牌阶段限1次，令他人展示所有手牌并给你，你给其${X}牌，其摸${X}牌，直到你/其回合结束，你/其使用牌点数为${Y}的：<li>倍数，无次数限制；<li>约数，+1牌<br>（${X}为手牌溢出量且摸牌数至多为3，${Y}为其使用的上一牌的点数）`,
    'lit_zhanshi_sub': `<span class='bluetext'>【展示】</span>`,
    'lit_zhanshi_sub_info': `<span class='bluetext'>直到下回合结束，使用牌点数为${Y}的：<li>倍数，无次数限制；<li>约数，+1牌<br>（${Y}为使用的上一牌的点数）</span>`,
    'lit_zhanshi_math1': '倍数',
    'lit_zhanshi_math2': '约数',
    'lit_chantaer': '铲踏儿',
    'lit_chantaer_info': '锁；手牌上限基准为体力上限<li>准备阶段，手牌数≤上限，+1血<li>结束阶段，本回合无人受过伤，摸2牌并-1血',
    // 曾品嘉
    'lit_kuaihuo': '快活',
    'lit_kuaihuo_info': '每回合限1次，使用杀后，可于牌堆顶置换1牌，并询问他人是否也对其使用杀',
    'lit_saohua': '骚话',
    'lit_saohua_info': '已用和打出牌可置于角色上。出牌阶段可：<li>将2张点数和≥13的牌当“闪电”<li>弃3张点数和=33的牌，造成3点雷伤（本项每回合限1次）',
    'lit_saohuaV2': '骚话V2',
    'lit_saohuaV2_info': 'V2 已用和打出牌可置于角色上，技能期间，点数<7的牌点数+7。出牌阶段可：<li>将2张点数和≥13的牌当“闪电”<li>弃3张点数和=33的牌，造成3点雷伤（本项每回合限1次）',
    'lit_saohuaV2_info_alter': '已用和打出牌可置于角色上，使用技能期间，点数<7的牌点数+7。出牌阶段可：<li>将2张点数和≥13的牌当“闪电”<li>弃3张点数和=33的牌，造成3点雷伤（本项每回合限1次）',
    'lit_saohua_append': '<span style="font-family:yuanli">使用中断的牌、装备牌和延时锦囊牌除外</span>',
    // 菠树
    'lit_guimi': '闺蜜',
    'lit_guimi_info': '锁；摸初始牌前，选一“闺蜜”，其造成的雷伤+1，每间隔1轮的轮次中每回合首次受伤后+1血；<br>你濒死，闺蜜可用♥♦牌当桃用（场上无闺蜜时重选）',
    'lit_yisui': '易碎',
    'lit_yisui_info': '锁；闺蜜在时，你手牌数恒为2；<br>闺蜜满血，你免伤，不为你的伤害源失去等量体力；<br>闺蜜死，你失去所有体力',
    'lit_yisuiV2': '易碎V2',
    'lit_yisuiV2_info': 'V2 锁；闺蜜在时，你手牌数恒为2；<br>闺蜜满血，你免伤，不为你的伤害源失去等量体力；',
    // 刘晨沐
    'lit_gufeng': '古风',
    'lit_gufeng_info': '每回合限1次，有人用牌指定目标后，你可添加1个目标',
    'lit_gufeng_append': '<span style="font-family:yuanli">装备牌、延时锦囊牌除外</span>',
    'lit_jijin': '激进',
    'lit_jijin_info': `锁；你的杀造成伤害后，令受伤者获得${get.poptip('lit_shouji')}`,
    'lit_jijinV2': '激进V2',
    'lit_jijinV2_info': `V2 锁；你的杀造成伤害后，令受伤者获得${get.poptip('lit_shouji')}，伤害越高，受激叠层越多`,
	/*负面效果*/'lit_shouji': '受激',
    'lit_shouji_info': '负面；下个用杀者强制选择你为目标（无视距离）',
    // 郑墨翰
    'lit_mensao': '闷骚',
    'lit_mensao_info': '出牌阶段限1次，将任意张牌作“铁索连环”使用或弃置，然后摸等量牌并令场上横置者+1血',
    'lit_jianren': '坚韧',
    'lit_jianren_info': '锁；对血更多者伤害+1，伤害手牌更多者后摸1牌',
    'lit_jianrenV2': '坚韧V2',
    'lit_jianrenV2_info': 'V2 锁；对血更多者伤害+1，伤害手牌更多者后摸1牌，横置时属性伤+1',
    'lit_rennai': '忍耐',
    'lit_rennai_info': '受到横置传导伤害后，可横置任意数量角色',
    // Rita
    'lit_dafang': '大方',
    'lit_dafang_info': '主；装备区失去牌后，可令一“叁”势力角色将手牌补至全场最多（至多至其体力上限）',
    'lit_nuoruo': '懦弱',
    'lit_nuoruo_info': '他人出牌阶段，其置入弃牌堆的装备牌，你可获得之',
    'lit_hengshuiti': '衡水体',
    'lit_hengshuiti_info': '锁；使用装备牌后，可视为对1人使用冰杀',
    'lit_hengshuitiV2': '衡水体V2',
    'lit_hengshuitiV2_info': 'V2 锁；使用装备牌后，+1血，可视为对1人使用冰杀',
    // 胡畔
    'lit_cuiruo': '脆弱',
    'lit_cuiruo_info': `回合结束，若不为满血，可+${X}牌，并将体力调至${X}（${X}为已失去的体力）`,
    'lit_shichou': '誓仇',
    'lit_shichou_info': '锁；受伤后，伤害源获得“誓”，你体力为1时对所有带“誓”者造成伤害使其体力降为1，并移除所有“誓”',
    'lit_yinren': '殷刃',
    'lit_yinren_info': '出牌阶段限1次，-1血，视为使用无距离次数限制的杀，若造成伤害，+1血',
    'lit_fumeng': '浮梦',
    'lit_fumeng_info': `出牌阶段限1次，选择体力上限>1的1人，令其${get.poptip('lit_mengying')}层数+${X}（${X}为其已损失的血量且至少为1）`,
	/*负面效果*/'lit_mengying': '梦萦',
    'lit_mengying_info': '负面；每层-1体力上限，每+1血-1层',
    // 兰柏勋
    'lit_yuqiu': '欲求',
    'lit_yuqiu_info': '伤害牌对目标未造成伤害：<li>质数牌可摸目标1牌<li>非质数牌至多可弃目标2牌',
    'lit_shouwang': '守望',
    'lit_shouwang_info': '锁；手牌数/体力为全场最多之一时，伤害+1',
    // 胡馨予
    'lit_mimang': '迷茫',
    'lit_mimang_info': '每造成或受到1伤，获得1“茫”，结束阶段可移去若干“茫”，重铸等量牌，弃置他人等量牌',
    'lit_shihuai': '释怀',
    'lit_shihuai_info': '出牌阶段限1次，装备牌可作决斗使用；<br>无手牌时，可令他人选择：<br>①受到1点伤害；<br>②交给你1张牌',
    'lit_shihuaiV2': '释怀',
    'lit_shihuaiV2_info': 'V2 出牌阶段限1次，装备牌可作决斗使用；<br>无手牌时，可令他人选择：<br>①受到1点伤害；<br>②交给你1张装备牌',
    // 胡峻玮
    'lit_biaoxian': '表现',
    'lit_biaoxian_info': '用杀后可判定：为♦则伤害+1且不可被响应',
    'lit_wutong': '梧桐',
    'lit_wutong_info': '场上判定生效前，可-1体力将此「判定结果」固定为任意花色（无关判定牌）',
    'lit_wutong_faq': '关于固定「判定结果」',
    'lit_wutong_faq_info': '技能直接修改的判定结果，与判定牌无关，因此其他对判定牌的修改、视为或更换等行为都无法影响判定结果，除非还有其他技能也对「判定结果」进行了直接修改<br>' +
        '<li>如：9王灿的“小巧”，即便将黑桃♠判定牌视为红桃♥，如果判定结果被固定为了黑桃♠，那还是可能被“闪电”判定命中</li>',
    'lit_wutongV2': '梧桐V2',
    'lit_wutongV2_info': 'V2 场上判定生效前，可-1体力或弃置全部手牌将此「判定结果」固定为任意花色（无关判定牌）',
    'lit_wutongV2_faq': '关于固定「判定结果」',
    'lit_wutongV2_faq_info': '技能直接修改的判定结果，与判定牌无关，因此其他对判定牌的修改、视为或更换等行为都无法影响判定结果，除非还有其他技能也对「判定结果」进行了直接修改<br>' +
        '<li>如：9王灿的“小巧”，即便将黑桃♠判定牌视为红桃♥，如果判定结果被固定为了黑桃♠，那还是可能被“闪电”判定命中</li>',
    // 荣少
    'lit_manmanlai': '慢慢来',
    'lit_manmanlai_info': '主；未持有“吊诡”的“叁”势力角色，可于开始阶段弃置判定区的1张牌，令你+1血',
    /*负面效果*/'lit_diaogui': '吊诡',
    'lit_diaogui_info': '负面；兵乐必中，在一轮开始时（含游戏开始时），可-1血转移给其他人',
    'lit_kushi': '苦诗',
    'lit_kushi_info': '锁；攻击范围内的角色每进行一次判定，你摸1张牌',
    'lit_qixu': '期许',
    'lit_qixu_info': '出牌阶段，可令1人判定，让其猜测判定的花色：若猜错，你按实际花色，令其进行♠闪电、♥乐、♣兵、♦遣返牌的判定；若猜中，你失去此技能并获得“执剑”',
    'lit_qixuV2': '期许V2',
    'lit_qixuV2_info': 'V2 出牌阶段，可令1人判定，让其猜测判定的花色：若猜错，你按实际花色，令其进行♠闪电、♥乐、♣兵、♦遣返牌的判定；若猜中，你获得“执剑”',
    'lit_zhijian': '执剑',
    'lit_zhijian_info': `使用杀指定目标后可判定：♥♦可扣置目标至多${X}张牌于武将牌上，其于杀结算后获得之；♠♣视为你使用了酒（${X}为其体力值）`,
    // 蒋海旭
    'lit_yuanzhu': '援助',
    'lit_yuanzhu_info': '他人弃牌后，可-1牌令其+1“援”。锁；有“援”者弃牌时，取消弃牌，-1“援”（不计判定区）',
    'lit_chenshui': '沉睡',
    'lit_chenshui_info': '每回合限1次，有人扣血的瞬间，你可翻面并令其+2牌',
    'lit_shanliang': '善良',
    'lit_shanliang_info': '锁；濒死时，全场展示手牌并弃置其中的桃，你+等弃置量的血',
    'lit_shanliangV2': '善良V2',
    'lit_shanliangV2_info': 'V2 锁；濒死时，全场展示手牌并弃置其中的桃，你+等弃置量的血；若恢复量溢出，增加等溢出量的上限后回满血',
    // 钱保灿
    'lit_chushou': '出手',
    'lit_chushou_info': '锁；回合开始前，跳过摸牌阶段，视为使用1张无实体锦囊牌，不可无懈',
    'lit_chushouV2': '出手V2',
    'lit_chushouV2_info': 'V2 锁；回合开始前，视为使用1张无实体锦囊牌，不可无懈',
    'lit_zhixun': '质询',
    'lit_zhixun_info': '牌的目标不为1时，可取消其中1个目标，视为对1人再次使用此牌',
    'lit_male': '麻了',
    'lit_male_info': `${Styled('r', '杀可使用次数+1')}；造成伤害前，若此牌与上次同名，可判定，若为：<br>①♥♦ ${Styled('r', '本回合杀、决斗目标数+1')}；<br>②♠♣ 本回合非红色部分失效，取消本次伤害，+1牌`,
    'lit_male_tag': '同名',
    'lit_male_faq': '“杀”的同名：',
    'lit_male_faq_info': '所有杀算同一种名字',
    // 张驰
    'lit_guibian': '诡辩',
    'lit_guibian_info': '出牌阶段限1次，令1人展示所有牌，你选择其中1张令其对你使用（无视距离），若其不使用或无法使用，则交付所有同名牌',
    'lit_guibian_faq': '“杀”的同名：',
    'lit_guibian_faq_info': '所有杀算同一种名字',
    'lit_shuxin': '竖心',
    'lit_shuxin_info': '锁；成为他人基本牌或普通锦囊牌的目标后，令使用者对他自己使用此牌',
    'lit_shuxinV2': '竖心V2',
    'lit_shuxinV2_info': 'V2 成为他人基本牌或普通锦囊牌的目标后，可令使用者对他自己使用此牌',
    // 杨湘铃
    'lit_lenmo': '冷漠',
    'lit_lenmo_info': `锁；造成伤害前，若其攻击范围内不包括你，则令其获得一层${get.poptip('lit_dongjie')}，若其冻结层数大于其体力值，其翻面`,
    /*负面效果*/'lit_dongjie': '冻结',
    'lit_dongjie_info': '负面；翻面后失去所有“冻结”和等量体力',
    'lit_xiaosa': '潇洒',
    'lit_xiaosa_info': '每回合每种情况限一次，<li>场上有人受伤濒死时，可令1人翻面并获得其装备区的牌<li>场上有人失去体力濒死时，可将1张装备牌作无次数限制的杀使用，不可被响应',
    'lit_juji': '狙击',
    'lit_juji_info': '锁；你的回合，其他人与你的距离视作无限，你与其他人的距离视作1',
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
        return `主；其余“${group}”势力可在出牌阶段发动一次，其受到来自你的1伤，然后：<li>你血>3时，-1血<li>血<=3时，+1血`;
    },
    lit_xinren(player) {
        let group = lib.lit.isGuozhanKeyEnabled() ? '叁/键' : '叁';
        return `主；出牌阶段限1次，交给某“${group}”势力角色1牌，其可立即使用，你摸与该牌造成的总伤害相等的牌`;
    },
    lit_dafang(player) {
        let group = lib.lit.isGuozhanKeyEnabled() ? '叁/键' : '叁';
        return `主；装备区失去牌后，可令一“${group}”势力角色将手牌补至全场最多（至多至其体力上限）`;
    },
    lit_guimi(player) {
        if (get.mode() === 'guozhan') return '锁；摸初始牌前或明置角色后，若无“闺蜜”，选一“闺蜜”，其造成的雷伤+1，每间隔1轮的轮次中每回合首次受伤后+1血；<br>你濒死，闺蜜可用♥♦牌当桃用（场上无闺蜜时重选）';
        return '锁；摸初始牌前，选一“闺蜜”，其造成的雷伤+1，每间隔1轮的轮次中每回合首次受伤后+1血；<br>你濒死，闺蜜可用♥♦牌当桃用（场上无闺蜜时重选）';
    },
    lit_mianju(player) {
        if (get.mode() === 'guozhan') return `锁；开始或明置角色后，若无“面”，获得4“面”，每次濒死后回满血并移除等量“面”，“面”耗尽时失去此技能并获得${get.poptip('lit_xiaochou')}`;
        return `锁；开始获得4“面”，每次濒死后回满血并移除等量“面”，“面”耗尽时失去此技能并获得${get.poptip('lit_xiaochou')}`;
    },
    // 状态改动
    lit_hengshuitiV2(player) {
        return '锁；使用装备牌后，+1血，可视为对1人使用冰杀';
    },
    lit_saohua(player) {
        if (player.hasSkill('lit_saohuaV2')) return '已用和打出牌可置于角色上，点数<7的牌在此技能中点数+7。出牌阶段可：<li>将2张点数和≥13的牌当“闪电”<li>弃3张点数和=33的牌，造成3点雷伤（本项每回合限1次）';
        return '已用和打出牌可置于角色上。出牌阶段可：<li>将2张点数和≥13的牌当“闪电”<li>弃3张点数和=33的牌，造成3点雷伤（本项每回合限1次）';
    },
    lit_male(player) {
        if (player.isTempBanned('lit_male')) return `${Styled('r', '杀可使用次数+1')}；`
            + `${Styled('o', '造成伤害前，若此牌与上次同名（所有杀算1种），可判定，若为：')}<br>`
            + `①♥♦ ${Styled('r', '本回合杀、决斗目标数+1')}；<br>`
            + `${Styled('o', '②♠♣ 本回合非红色部分失效，取消本次伤害，+1牌')}`;
        return `${Styled('r', '杀可使用次数+1')}；造成伤害前，若此牌与上次同名（所有杀算1种），可判定，若为：<br>①♥♦ ${Styled('r', '本回合杀、决斗目标数+1')}；<br>②♠♣ 本回合非红色部分失效，取消本次伤害，+1牌`;
    },
    lit_xiaosa(player) {
        let str1 = '<li>场上有人受伤濒死时，可令1人翻面并获得其装备区的牌</li>',
            str2 = '<li>场上有人失去体力濒死时，可将1张装备牌作杀使用，不可被响应</li>';
        if (player.storage.lit_xiaosa[0]) str1 = Styled('o', str1);
        if (player.storage.lit_xiaosa[1]) str2 = Styled('o', str2);
        return '每回合每种情况限一次：' + str1 + str2;
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

// let pack = lib.characterPack['lit'];
// let str = '';
// for(let char in pack){
//     let character = pack[char];
//     str += get.translation(char)+` hp = ${(character.maxHp && character.maxHp != character.hp) ? `${character.hp}/${character.maxHp}` : character.hp}：\n`;
//     for(let skill of character.skills){
//         str += `${get.translation(skill)}：${get.translation(`${skill}_info`)}\n`;
//     }
//     str += '\n';
// }
// console.log(str)
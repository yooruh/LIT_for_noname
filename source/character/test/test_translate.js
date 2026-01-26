import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';

export const translate = {
    'lit_hupan9胡畔':'9胡畔',
    'lit_hupan9胡畔_prefix': "9",
    'lit_zhengmohan9郑墨翰':'9郑墨翰',
    'lit_zhengmohan9郑墨翰_prefix': "9",
    'lit_zengpinjia9曾品嘉':'9曾品嘉',
    'lit_zengpinjia9曾品嘉_prefix': "9",
    'lit_wangsiyuan王思媛':'王思媛',
    'lit_zhongyutong9钟雨桐':'9钟雨桐',
    'lit_zhongyutong9钟雨桐_prefix': "9",
    'lit_pengliying彭丽颖':'彭丽颖',

    // 9胡畔
    "lit_beiai": "悲哀",
    "lit_beiai_info": "锁定技；防具区没牌时视作装备<span class='redtext' style='color:Green'>“先天八卦阵”</span>；回合结束时，你选择：<br><li>①增加1点体力上限并失去1点体力;<br><li>②恢复1点体力并失去x点体力上限，<span class='redtext' style='color:Red'>x=上限/（存活人数+1）</span>",
    "lit_baoshi": "暴食",
    "lit_baoshi_info": "锁定技；你的体力值每增加1点，体力上限+1；你的体力上限减少前，你摸y张牌。（y为你已失去的体力）",
    "lit_yuyan": "预言",
    "lit_yuyan_info": "准备阶段或结束阶段开始时；你可以观看牌堆顶z张牌，同时可以调整牌的顺序并将其中任意张牌移至牌堆底。（z为你的体力值且至少为3）",
    // 9郑墨翰
    "lit_maitou": "埋头",
    "lit_maitou_info": "锁定技；你计算与别人的距离-1；你的体力小于等于3时，别人计算与你的距离+1。",
    "lit_yiyu": "呓语",
    "lit_yiyu_info": "出牌阶段限2次，你选择攻击范围内的1人，可弃其区域内的1张牌，然后强制使用手牌中所有的“杀”，除非其死亡，否则你弃置其他手牌。",
    "lit_moshou": "墨守",
    "lit_moshou_info": "锁定技；出牌阶段，你的非♥“闪”视为“杀”；每有1人死亡：<br><li>①在你的回合外，你摸2张牌；<br><li>②在你的回合内，你摸x张牌。（x为你的体力上限）",
    // 9曾品嘉
    "lit_yingjun": "英俊",
    "lit_yingjun_info": "你准备/结束阶段开始时可以摸1张牌。",
    "lit_kuizeng": "馈赠",
    "lit_kuizeng_info": "出牌阶段，你可以把你区域内任意的牌给予其他人；本回合给予牌的总数量<span class='redtext' style='color:Red'>每</span>达到3的倍数时，你选择+1体力或对人造成1点伤害。",
    "lit_chuangshi": "创世",
    "lit_chuangshi_info": "受到伤害时可摸1张牌并令1人判定：为♥♦则+1点体力；为♠♦♣则摸x张牌；为9额外+1点体力。（x为受到的伤害）",
    // 王思媛
    "lit_daha": "大哈",
    "lit_daha_info": "锁定技；你即将造成的伤害视作失去体力，<span class='redtext' style='color:Red'>除非</span>你弃置所有手牌。",
    "lit_fushu": "腹书",
    "lit_fushu_info": "锁定技；你的手牌数小于x时，你将手牌补至x张。（x为你已失去的体力且至少为1）",
    // 9钟雨桐
    "lit_gaoshang": "高尚",
    "lit_gaoshang_info": "若你在出牌阶段没有使用过“杀”，则你可以跳过弃牌阶段；锁定技；死亡时<span class='redtext' style='color:Red'>所有人</span>-1点体力。",
    "lit_danchun": "单纯",
    "lit_danchun_info": "出牌阶段限1次，你可以观看其他1人手牌并可以将其1张♥牌拿走或放至牌堆顶。",
    "lit_cidi": "次第",
    "lit_cidi_info": "当你在回合外失去牌时，可以判定：<span class='redtext' style='color:Red'>不为A</span>则将判定牌明置在你的人物牌上称为“第”，你的“第”可作顺手牵羊使用。锁定技；你与他人计算的距离-“第”数。",
    // 彭丽颖
    "lit_wuma": "无马",
    "lit_wuma_info": "你可以选择你的1张坐骑牌并指定1人，视为其使用了这张坐骑牌，然后你+1点体力并摸1张牌。",
    "lit_qingxiu": "清秀",
    "lit_qingxiu_info": "当你的判定结束后，你可以获得你的判定牌。",
    "lit_teshe": "特赦",
    "lit_teshe_info": "你即将受到伤害时，可以进行2次判定：<span class='redtext' style='color:Green'>花色或数字</span>相同，则免伤；锁定技；你首次濒死时获得“母魂”。",
    "lit_muhun": "母魂",
    "lit_muhun_info": "限定技；若你<span class='redtext' style='color:Red'>体力<3</span>，你可令其他人依次弃x张牌，否则受到x点火焰伤害。（x至少为其上家的弃牌数*2-1且至少为2）",
};

export const dynamicTranslate = {
};

export const pinyins = {
};
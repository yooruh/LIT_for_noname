import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';

export const connectBanned = [];
export const characterSort = {
    'lit': {
        'lit_ybs': ['lit_qbQb', 'lit_zhangshengjie张盛杰', 'lit_zhangqinyi张钦奕', 'lit_pangjianlong庞建龙', 'lit_zigao自高', 'lit_zengpinjia曾品嘉',
            'lit_liuchenmu刘晨沐', 'lit_zhengmohan郑墨翰', 'lit_ritaRita', 'lit_hupan胡畔', 'lit_lanboxun兰柏勋', 'lit_huxinyu胡馨予',
            'lit_hujunwei胡峻玮', 'lit_jianghaixu蒋海旭', 'lit_qianbaocan钱保灿', 'lit_zhangchi张驰', 'lit_yangxiangling杨湘铃'],
        'lit_sdp': ['lit_wuxiaoqi伍小戚', 'lit_boshu菠树'],
        // 羲烨、牉
        'lit_jbs': ['lit_zhangchi9张驰', 'lit_wangcan9王灿', 'lit_liyang9李洋', 'lit_zhangshengjie9张盛杰', 'lit_chenke陈可', 'lit_linmiao林淼'],
    },
};

export const character = {

    'lit_zhangchi9张驰': {
        sex: "male",
        group: "nine",
        hp: 4,
        maxHp: 5,
        skills: ["lit_bolun", "lit_jiqingsishe"],
        groupInGuozhan: "three",
    },
    'lit_wangcan9王灿': {
        sex: "male",
        group: "nine",
        hp: 3,
        skills: ["lit_huoshan", "lit_renxiao", "lit_xiaoqiao"],
        groupInGuozhan: "three",
    },
    'lit_liyang9李洋': {
        sex: "male",
        group: "nine",
        hp: 4,
        skills: ["lit_xiuer", "lit_huangse"],
        groupInGuozhan: "three",
    },
    'lit_zhangshengjie9张盛杰': {
        sex: "male",
        group: "nine",
        hp: 1,
        maxHp: 2,
        skills: ["lit_shenjie", "lit_zhewan"],
        groupInGuozhan: "three",
    },
    'lit_chenke陈可': {
        sex: "male",
        group: "nine",
        hp: 3,
        skills: ["lit_nitian", "lit_yizhu"],
        groupInGuozhan: "three",
    },
    'lit_linmiao林淼': {
        sex: "female",
        group: "nine",
        hp: 3,
        skills: ["lit_shenge", "lit_gugu"],
        groupInGuozhan: "three",
    },

    'lit_qbQb': {
        sex: "male",
        group: "three",
        hp: 4,
        skills: ["lit_shengjiqb", "lit_33", "lit_qiantui", "lit_tianna"],
        isZhugong: true,
    },
    'lit_zhangshengjie张盛杰': {
        sex: "male",
        group: "three",
        hp: 4,
        skills: ["lit_shengjizsj", "lit_wutou", "lit_youxia"],
    },
    'lit_zhangqinyi张钦奕': {
        sex: "male",
        group: "three",
        hp: 3,
        skills: ["lit_shengjizqy", "lit_danke", "lit_lantong", "lit_zisha"],
    },
    'lit_pangjianlong庞建龙': {
        sex: "male",
        group: "three",
        hp: 4,
        skills: ["lit_shengjipjl", "lit_qiangjian", "lit_duilian"],
    },
    'lit_wuxiaoqi伍小戚': {
        sex: "male",
        group: "three",
        hp: 4,
        skills: ["lit_shengjiwxq", "lit_shencaocao", "lit_jiwa", "lit_mianju"],
    },

    'lit_zigao自高': {
        sex: "male",
        group: "three",
        hp: 4,
        skills: ["lit_shengjizg", "lit_xinren", "lit_chantaer", "lit_zhanshi"],
        isZhugong: true,
    },
    'lit_zengpinjia曾品嘉': {
        sex: "male",
        group: "three",
        hp: 3,
        skills: ["lit_shengjizpj", "lit_kuaihuo", "lit_saohua"],
    },
    'lit_boshu菠树': {
        sex: "female",
        group: "three",
        hp: 1,
        skills: ["lit_shengjibs", "lit_guimi", "lit_yisui"],
    },
    'lit_liuchenmu刘晨沐': {
        sex: "male",
        group: "three",
        hp: 3,
        skills: ["lit_shengjilcm", "lit_gufeng", "lit_jijin"],
    },
    'lit_zhengmohan郑墨翰': {
        sex: "male",
        group: "three",
        hp: 4,
        skills: ["lit_shengjizmh", "lit_mensao", "lit_jianren"],
    },

    'lit_ritaRita': {
        sex: "female",
        group: "three",
        hp: 3,
        skills: ["lit_shengjirita", "lit_dafang", "lit_nuoruo", "lit_hengshuiti"],
        isZhugong: true,
    },
    'lit_hupan胡畔': {
        sex: "male",
        group: "three",
        hp: 4,
        skills: ["lit_shengjihp", "lit_cuiruo", "lit_shichou"],
    },
    'lit_lanboxun兰柏勋': {
        sex: "male",
        group: "three",
        hp: 4,
        skills: ["lit_shengjilbx", "lit_yuqiu", "lit_shouwang"],
    },
    'lit_huxinyu胡馨予': {
        sex: "female",
        group: "three",
        hp: 3,
        skills: ["lit_shengjihxy", "lit_mimang", "lit_shihuai"],
    },
    'lit_hujunwei胡峻玮': {
        sex: "male",
        group: "three",
        hp: 4,
        skills: ["lit_shengjihjw", "lit_biaoxian", "lit_wutong"],
    },

    'lit_jianghaixu蒋海旭': {
        sex: "male",
        group: "three",
        hp: 3,
        skills: ["lit_shengjijhx", "lit_yuanzhu", "lit_chenshui", "lit_shanliang"],
    },
    'lit_qianbaocan钱保灿': {
        sex: "male",
        group: "three",
        hp: 3,
        skills: ["lit_shengjiqbc", "lit_chushou", "lit_zhixun", "lit_male"],
    },
    'lit_zhangchi张驰': {
        sex: "male",
        group: "three",
        hp: 3,
        skills: ["lit_shengjizc", "lit_guibian", "lit_shuxin"],
    },
    'lit_yangxiangling杨湘铃': {
        sex: "female",
        group: "three",
        hp: 4,
        skills: ["lit_shengjiyxl", "lit_lenmo", "lit_xiaosa"],
    },

};

export const characterTitle = {

    'lit_qbQb': '控血·控人·中',
    'lit_zhangshengjie张盛杰': '跳判定·发育流·较易',
    'lit_zhangqinyi张钦奕': '控血·爆发·易',
    'lit_pangjianlong庞建龙': '消耗·强杀·易',
    'lit_wuxiaoqi伍小戚': '换牌·复活·亡语·较易',
    'lit_zigao自高': '补牌·辅助·较难',
    'lit_zengpinjia曾品嘉': '凑牌·追击·中',
    'lit_boshu菠树': '辅助·反伤·较难',
    'lit_liuchenmu刘晨沐': '辅助·干扰·较易',
    'lit_zhengmohan郑墨翰': '过牌·爆发·回血·易',
    'lit_ritaRita': '装备·补牌·爆发·较难',
    'lit_hupan胡畔': '反击·续航·中',
    'lit_lanboxun兰柏勋': '控牌·顺风爆发·易',
    'lit_huxinyu胡馨予': '拆牌·消耗·中',
    'lit_hujunwei胡峻玮': '改判·强杀·爆发·较易',
    'lit_jianghaixu蒋海旭': '防拆·补牌·复活·中',
    'lit_qianbaocan钱保灿': '群伤·爆发·较易',
    'lit_zhangchi张驰': '拆牌·反伤·较难',
    'lit_yangxiangling杨湘铃': '控人·连破·流失体力·中',

};

export const characterIntro = {

    'lit_qbQb': '被防御类和爆发类克制，一个是让你不能回血，一个是让你控完就没<li>主公：建议适当屯牌，控血在3左右，保证不会被一套带走并且能在回合内造成伤害以稳定血量<li>忠臣、内奸：跟主公差不多，不过可以冒风险<li>反贼：适当卖血控人',
    'lit_zhangshengjie张盛杰': '装延时锦囊牌前，其实你只有1个技能。当然，能免疫未来的延时类锦囊牌也是好事<li>主公：走发育流，前期亟需保护<li>忠臣、反贼：利用移牌技能控场，同伙可以帮助发育<li>内奸：前期猥琐，后期可移牌控主公',
    'lit_zhangqinyi张钦奕': '卖血？？白银狮子？！2血，薄纱！薄纱！<li>主公、忠臣、反贼、内奸：逆风保桃控血，顺风挑软柿子捏',
    'lit_pangjianlong庞建龙': '什么超级吕布，摸牌白罢了<li>主公、反贼、内奸：适当决斗控场<li>忠臣：控场同时不能坑主公',
    'lit_wuxiaoqi伍小戚': '天呐，他真恶心！甚至能复活！赶快留点垃圾牌恶心他！<li>主公：开头先稳，后面尽量用牌，减少手牌数量再换牌<li>忠臣：放技能保证自己和主公的牌能大于其他人<li>反贼、内奸：尽量用光牌恶心人',
    'lit_zigao自高': '可能被反噬或拖死，自带两种模式：逆风牌少回血恶心人，顺风牌多扣血给人牌；对于缺牌的对手和牌多的队友有奇效。<li>主公：辅助伤害的同时要控好牌，回合外没人理，回合内打不出伤害的话只能一直扣血<li>忠臣：牌多时塞主公，牌少时抢嘲讽小的反贼<li>反贼、内奸：持续保证自己的输出，手牌越少，手牌越多',
    'lit_zengpinjia曾品嘉': '又要牌运又要计算，联机浪费时间，伤害高而慢……什么，铁索连环？<li>主公：多留防御牌，不奢求打伤害<li>忠臣、反贼、内奸：要尽量用牌，通常牌的点数越高越好',
    'lit_boshu菠树': '受闺蜜限制，建议找不容易死，能留牌的闺蜜（或者打雷伤的），自身完全能够爆发<li>主公：完全不推荐，闺蜜给到反贼就废了一半了<li>忠臣、内奸：建议选主公为闺蜜<li>反贼：乱选，55开',
    'lit_liuchenmu刘晨沐': '干扰对手，辅助队友造成伤害或者为其提供补益，如杀、桃、无中生有等，对付他时需注意好牌后出<li>主公：回合内可以盲杀，这样下一张杀就不会杀你；回合外可以先不用技能，在别人吃桃或无中生有时再用<li>忠臣：控敌人的杀<li>反贼：一直杀主公<li>内奸：嫖别人的补益牌',
    'lit_zhengmohan郑墨翰': '被控制类限制，需要控状态打爆发，有些时候为敌人加血收益更高<li>主公：利用加血活命<li>忠臣、反贼：横置控场，择机压血打爆发<li>内奸：利用重铸屯牌，不要轻易掉血',
    'lit_ritaRita': '威慑全场的装备牌使用，靠后位极易爆发，对付她需要屯防御牌<li>主公：让忠臣拆装备补牌，自身囤装备≈桃<li>忠臣、反贼、内奸：多使用装备牌当寒冰剑+杀破坏手牌',
    'lit_hupan胡畔': '带反击嘲讽低，但被光脚1血、爆发和卖血类克制，队友要小心释放AOE，回合内非必要不吃桃<li>主公：负责活着，建议控血在2左右<li>忠臣：适当碰瓷承受伤害，防御主公AOE<li>反贼：碰瓷主公<li>内奸：屯牌成为不动白，最后再爆发',
    'lit_lanboxun兰柏勋': '多拿AOE，杀藤甲和仁王盾仍能触发技能，以此可维持血量和手牌优势<li>主公、内奸：适当杀人，放AOE来巩固自身地位<li>忠臣、反贼：在清楚队友有防御牌时可以杀队友弃负面牌',
    'lit_huxinyu胡馨予': '利用释怀来决斗消耗牌，结束阶段重铸废牌并破坏他人的防御，回合外防御低<li>主公、内奸：攒“茫”来后期爆发，留点牌来保持威慑，弃太多将成为众矢之的<li>忠臣、反贼：可以多弃牌来索敌消耗对手，同时保留攻击性',
    'lit_hujunwei胡峻玮': '对血多甲厚的破防强杀，但可能因此成为脆皮<li>主公：有5血，可以轻松收走残血反贼<li>忠臣、反贼：可以牺牲自己打爆发，平均下来3/4血换2血<li>内奸：必要的时候改判控场，顺便捡个人头',
    'lit_jianghaixu蒋海旭': '队友可卖血补牌，濒死也可补牌，牌多的可蓄手牌，但菠树、胡馨予之类的得考虑考虑，受爆伤压制<li>主公、反贼：前期几乎死不掉，可多补牌，援助容易蓄牌的队友<li>忠臣、内奸：辅助主公，但有可能把主公的桃抢了……',
    'lit_qianbaocan钱保灿': '不怎么怕兵粮寸断，需要留杀，放南蛮万箭后爆发，多目标牌可针对性地使用，越到后期越容易劣势，但纯单挑强<li>主公、忠臣：第一手留牌，看清身份后爆发<li>反贼：南蛮+万箭后可乱杀主公<li>内奸：留牌，五谷桃园在关键时候都可控场',
    'lit_zhangchi张驰': '当你与氹诡辩之时，你会怀念仁王盾和藤甲的。什么？你卖血啊~那没事了<li>主公：留防御牌方便诡辩，竖心改为主动技后，小心对使用者的真实收益<li>忠臣：诡辩反贼的伤害牌，吸引火力<li>反贼：诡辩酒、闪、无懈可击，或满血诡辩桃100%成功<li>内奸：有竖心在很容易苟到最后，苟吧',
    'lit_yangxiangling杨湘铃': '前期约等于没有技能，要杀趁早，就算是队友也可能被AOE杀穿<li>主公：前期只考虑活下来，及时翻面高嘲讽敌方；<li>忠臣、反贼：及时补刀残血，扣双倍；<li>内奸：很容易发死人财，找准机会连破定胜',

};

// 角色替换
export const characterReplace = {
    'lit_zhangshengjie': ['lit_zhangshengjie张盛杰', 'lit_zhangshengjie9张盛杰'],
    'lit_zhangchi': ['lit_zhangchi张驰', 'lit_zhangchi9张驰'],
};

// 暂时于precontent集中处理
export const characterFilter = {
    // xxx(mode) {
    //	 return mode != 'guozhan';
    // },
};

// 特殊时机皮肤切换
export const characterSubstitute = {
    // 'lit_jianghaixu蒋海旭' : [["azure",[`img:${basic.path}/image/character/lit_jianghaixu_azure.png`]]],
};

// 珠联璧合
export const perfectPair = {
    'lit_qbQb': ["lit_zigao自高", "lit_hujunwei胡峻玮"],
    'lit_zigao自高': ["lit_zengpinjia曾品嘉", "lit_lanboxun兰柏勋"],
    'lit_ritaRita': ["lit_huxinyu胡馨予", "lit_yangxiangling杨湘铃"],
    'lit_zengpinjia曾品嘉': ["lit_chenke陈可", "lit_qianbaocan钱保灿"],
    'lit_hupan胡畔': ["lit_zhengmohan郑墨翰"],
    'lit_zhangchi9张驰': ["lit_zhangchi张驰", "lit_liyang9李洋"],
    'lit_yangxiangling杨湘铃': ["lit_linmiao林淼"],
};
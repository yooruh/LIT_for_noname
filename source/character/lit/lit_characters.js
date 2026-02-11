import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';

function B(text) {
    return `<span style='color:LightBlue'>${text}</span>`;
}

export const connectBanned = [];
export const characterSort = {
    'lit': {
        'lit_ybs': ['lit_qbQb', 'lit_zhangshengjie张盛杰', 'lit_zhangqinyi张钦奕', 'lit_pangjianlong庞建龙', 'lit_zigao自高', 'lit_zengpinjia曾品嘉',
            'lit_liuchenmu刘晨沐', 'lit_zhengmohan郑墨翰', 'lit_ritaRita', 'lit_hupan胡畔', 'lit_lanboxun兰柏勋', 'lit_huxinyu胡馨予', 'lit_hujunwei胡峻玮',
            'lit_wangrong王荣', 'lit_jianghaixu蒋海旭', 'lit_qianbaocan钱保灿', 'lit_zhangchi张驰', 'lit_yangxiangling杨湘铃'],
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

    'lit_wangrong王荣': {
        sex: "male",
        group: "three",
        hp: 4,
        skills: ["lit_shengjirs", "lit_manmanlai", "lit_diaogui", "lit_kushi", "lit_qixu"],
        isZhugong: true,
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
        hp: 4,
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

    'lit_qbQb': "卖血·控人·中",
    'lit_zhangshengjie张盛杰': "跳判定·发育流·较易",
    'lit_zhangqinyi张钦奕': "控血·爆发·较易",
    'lit_pangjianlong庞建龙': "控场·强杀·易",
    'lit_wuxiaoqi伍小戚': "换牌·复活·亡语·较易",

    'lit_zigao自高': "补牌·辅助·较难",
    'lit_zengpinjia曾品嘉': "凑牌·追击·中",
    'lit_boshu菠树': "辅助·反伤·过牌·较难",
    'lit_liuchenmu刘晨沐': "辅助·干扰·中",
    'lit_zhengmohan郑墨翰': "过牌·回血·爆发·较易",

    'lit_ritaRita': "装备·补牌·爆发·易",
    'lit_hupan胡畔': "反击·续航·较难",
    'lit_lanboxun兰柏勋': "扒牌·顺风压制·易",
    'lit_huxinyu胡馨予': "拆牌·消耗·中",
    'lit_hujunwei胡峻玮': "改判·爆发·强杀·较易",

    'lit_wangrong王荣': "过牌·控人·强杀·中",
    'lit_jianghaixu蒋海旭': "防拆·补牌·复活·中",
    'lit_qianbaocan钱保灿': "群伤·爆发·较易",
    'lit_zhangchi张驰': "拆牌·反伤·较难",
    'lit_yangxiangling杨湘铃': "控人·斩杀·连破·较难",

};

export const characterIntro = {

    'lit_qbQb': `前期被防御类和爆发类克制，防御类让${B("Qb")}不容易发动${get.poptip("lit_tianna")}回血，爆发类容易让${B("Qb")}血量回不上来。后期升级后有名刀，而且有机会收残血，只要${B("Qb")}有伤害牌，回血难度会降一些。`
        + "<li>主公：建议适当屯牌，不一定回满血，只要保证不会被一套带走，就可以留牌用于在回合内造成伤害。毕竟你还可以让你的“忠臣”们自愿给你献血，前期没那么容易死的"
        + "<li>反贼：血量上限更低，回合外要尽可能保证满血。多与队友配合，最好间隔一轮卖血控不同的人，压制对面的配合"
        + "<li>忠臣、内奸：跟主公和反贼差不多，不过要优先针对威胁最大的敌方，保证主公生存要紧",
    'lit_zhangshengjie张盛杰': `很多时候，尤其是装延时锦囊牌前，${B("张盛杰")}可能只有免疫延时锦囊牌的技能，毕竟全场都不一定有装备和延时锦囊牌……（说实话有点牢了，以后会改的）`
        + "<li>主公：发育会比较快，前期亟需保护，到后期关键时刻可以拿判定区的牌来控场"
        + "<li>忠臣、反贼：队友可能会觉得给你发育牌收益太低了，还是捡队友判定区的垃圾来发育吧"
        + "<li>内奸：前期装反猥琐发育，到后期有机会再跳内",
    'lit_zhangqinyi张钦奕': `卖血？？白银狮子？！遇到他们不要怕，只要${B("张钦奕")}2血，薄纱！全部薄纱！`
        + `<li>主公：在真人局，开场几乎就能逼其他人跳身份了，但这似乎是唯一的优点，不然遇到带有${get.poptip("lit_shichou")}的家伙，直接天崩开局`
        + "<li>忠臣：辅助卖血主公有奇效，除此之外可以挑对面的玻璃大炮来打"
        + "<li>反贼：在近主位说不定可以秒杀，只要队内有同性能记得留桃，就可以火攻自己万人迷"
        + "<li>内奸：屯桃等候时机，再突然爆发，也许能瞬间进主内对决。只要主公没卖血、没复活或者名刀等，就算有再多防御牌都挡不住",
    'lit_pangjianlong庞建龙': `什么超级吕布，摸牌白罢了。不过${B("庞建龙")}比较适合新手，乱打也容易出伤害，尤其针对不清楚技能出两张牌机制的人`
        + "<li>主公、内奸：适当决斗控场，对有杀但是杀不多的人，记得让自己来决斗"
        + "<li>忠臣：放AOE前先看看主公状态，可千万不能坑主公"
        + "<li>反贼：负责捣乱就好了",
    'lit_wuxiaoqi伍小戚': `天呐，他真恶心！甚至能复活！赶快留点垃圾牌恶心他！要是${B("伍小戚")}费尽心思换来的牌全是废牌，他才能真正体会到${get.poptip("lit_xiaochou")}的滋味！`
        + `<li>主公：别急着用牌，等没血或者输出型队友没牌的时候再发动技能，千万别提前把${get.poptip("lit_mianju")}用完了，不然少一个复活`
        + "<li>忠臣：开头有复活，后期有亡语，直接给主公递牌就好了。不过不要乱开技能，把好牌换废牌就舒服了"
        + "<li>反贼、内奸：直接用光牌，然后给别人底裤都扒下来。当然了，最好祈祷没人会因此发动神秘索敌技",

    'lit_zigao自高': `如果没人理${B("自高")}，而他又打不出伤害，那很可能被活活拖死。他自带两种模式：牌少回血拿对手牌，牌多扣血送队友牌；对于缺牌的对手和牌多的队友有奇效，不过有一定风险。`
        + `<li>主公：回合外的防御牌随便出，压低手牌方便回血。但是回合内的伤害牌不要乱用，尤其是AOE，通过${get.poptip("lit_xinren")}给队友开很关键。不仅可以联动队友的技能，而且队友造成的伤害也能防止回合内的崩血`
        + `<li>忠臣、反贼：主要辅助队友过牌，如果不能保证对手被控，或者让他打不出伤害，就要注意白送${get.poptip("lit_zhanshi_sub")}的风险`
        + "<li>内奸：前期要会忍耐，升级后自己也有输出能力了，再打伤害。有些时候，手牌越少，手牌越多",
    'lit_zengpinjia曾品嘉': `${B("曾品嘉")}想要玩得舒服，又要牌运又要计算，联机时浪费时间，伤害高而慢……什么，铁索连环？只要没有${get.poptip("lit_zigaodebeixin")}${get.poptip("lit_qbzhimao")}之类的技能，完全有可能“五连·诸天灭地”！`
        + `<li>主公：非常不建议当主公，在当前环境下（26.2.11）一轮下来的存活率不超过1成，除非队友特别合适。硬要玩的话记得多留防御牌，不要奢求打伤害`
        + "<li>忠臣、反贼、内奸：用好右上角的记牌器功能很关键。要尽量用牌，通常牌的点数越高越好，前期可以预先存一些点数为3~6的牌，升级后往往可以直接破敌",
    'lit_boshu菠树': `受${get.poptip("lit_yisui")}限制，建议找不容易死，能留牌的角色当${get.poptip("lit_guimi")}（或者打雷伤的）。${B("菠树")}自身完全能够爆发，过牌量堪比半个高达`
        + "<li>主公：完全不推荐，闺蜜给到反贼就废了一半了，而且能留的牌也很少。唯一能想到的打法是利用“闺蜜”+“易碎”可以摸6张初始牌的性质，用手气卡刷出AK，然后突突全场，直到杀到忠臣把AK丢了，损失也不会很大"
        + "<li>忠臣、内奸：建议选主公为闺蜜，第一轮因为有闺蜜回血，主公牌消耗得也比较少，很容易满血。前期因此不用留防御牌，不过后期就要注意了，要想打输出，装备（AK、防具、木牛流马）必须先发育好"
        + "<li>反贼：虽然开局不给主公闺蜜就已经跳身份了，但你反而可以选前面一点的座位，想来主公也不敢动你。",
    'lit_liuchenmu刘晨沐': `干扰对手，辅助队友造成伤害或者为其提供补益（如杀、桃、无中生有等），对付${B("刘晨沐")}时需注意好牌后出`
        + `<li>主公：在${get.poptip("lit_jijin")}的加持下开局可以盲杀，如果能造成伤害，下一张杀就没法杀你；如果血量比较低，回合外可以先不用技能，在别人吃桃或无中生有时再用`
        + "<li>忠臣、反贼：看队友的主要输出牌是什么，例如靠“杀”打伤害的，就可以帮他加“杀”的目标，从而最大化收益。借敌人的输出灭残血、让敌方互拆、偷桃、吊卡、无中生有等都是常规操作。此外，可以参考主公的玩法，杀对面来换取己方关键队友的防御"
        + `<li>内奸：前期嫖别人的补益牌来发育，到主内单挑的时候，“贯石斧”会是你的好朋友，主公一旦${get.poptip("lit_shouji")}，就很难再杀到你了`,
    'lit_zhengmohan郑墨翰': `每回合群体回血+制衡的收益很恐怖，因此跟${B("郑墨翰")}打消耗战很不现实，留点爆发利用连锁打暴击通常比较好。对${B("郑墨翰")}自己而言，专门控状态打爆发太亏了，这更多是个保底技能`
        + "<li>主公：利用加血活命，即便拖到主内对决都不慌，只要对面不是强命斩杀将，单挑问题不大"
        + "<li>忠臣、反贼：横置控场，血低时择机打爆发。如果确信伤害能中，即便是给对面先回1点血都不一定亏"
        + "<li>内奸：利用制衡屯牌，不要轻易掉血，后期就是主公打法",

    'lit_ritaRita': `威慑全场的装备牌使用，后置位极易爆发，对付${B("Rita")}，防御牌是必不可少的`
        + "<li>主公：必要时可以让忠臣拆装备补牌，后期自身的装备≈桃，不是急着拿人头可以不着急装备"
        + "<li>忠臣、反贼：前期爆发能力很弱，后期可以为队友补牌，让队友多用装备换集中爆发"
        + "<li>内奸：不一定要打出伤害，可以多使用装备牌当冰杀破坏手牌控场",
    'lit_hupan胡畔': `自带反击嘲讽低，但被光着脚的1血角色，以及爆发和卖血类克制。队友如果不卖血，就要要小心释放AOE，避免被${B("胡畔")}的${get.poptip("lit_shichou")}无差别攻击。${B("胡畔")}有自回血，回合内非必要不吃桃`
        + "<li>主公：负责活着，等到敌方血较多且怕掉血的时候，再尝试故意掉血。忠臣记得留桃，只要能活到下个回合，状态一下子就回来了"
        + "<li>忠臣：适当碰瓷承受伤害，防御主公AOE，尤其是某个不可言说的主公，当他的忠臣比内奸还反贼"
        + `<li>反贼：碰瓷主公，升级后${get.poptip("lit_yinren")}双刀+${get.poptip("lit_mengying")}buff可以终结残血`
        + "<li>内奸：利用负嘲讽囤牌成为不动白，最后再爆发",
    'lit_lanboxun兰柏勋': `多拿AOE，杀藤甲和仁王盾仍能触发技能，以此可维持血量和手牌优势。因此限制${B("兰柏勋")}的方法也很简单，在升级前不击杀就别管，升级后只需要压血拆牌就好了`
        + "<li>主公、内奸：适当杀人，放AOE来巩固自身地位。升级时相当于触发半个复活技，可以利用此机会爆发"
        + "<li>忠臣、反贼：作为简单的顺风输出位，如果有必要，在清楚队友有防御牌时可以杀队友弃负面牌",
    'lit_huxinyu胡馨予': `利用${get.poptip("lit_shihuai")}来决斗消耗自己和敌方的牌，以此来触发索敌，结束阶段还能重铸废牌并破坏他人的防御。但也正因如此，${B("胡馨予")}回合外通常防御较低，强杀流可以较容易地干掉她`
        + "<li>主公、内奸：要留少量防御牌来保持威慑，同时可以慢慢积攒“茫”，用于在中期拆牌，在结束阶段弃太多将成为众矢之的"
        + "<li>忠臣、反贼：可以多弃牌来索敌消耗对手，重铸完手牌后很容易收割残血",
    'lit_hujunwei胡峻玮': `作为高贵的强杀流，${B("胡峻玮")}可以破防血多甲厚的敌方目标，但可能因此成为脆皮。因此即使有改判，也很少能作为团队的辅助。不过对关键的改判，崩血也不亏，升级后更是如此，尤其是在过牌流队友的辅助之下`
        + "<li>主公：有5血，可以轻松收走残血反贼，可惜回合外防御不够，比较吃忠臣选将"
        + "<li>忠臣、反贼：可以牺牲自己打爆发，平均下来3/4血换2血"
        + "<li>内奸：前期可以玩成辅助，到必要的时候改判控场，升级前后捡个人头就能爆发",

    'lit_wangrong王荣': `${B("王荣")}集“控场”“过牌”“输出”为一身，虽然在特定环境下才能发挥出最大的威力，但其综合能力并不弱。对付他时要谨慎使用判定技能，优先拆他的武器和-1马`
        + `<li>主公：开场几乎一定要转移${get.poptip("lit_diaogui")}，然后可以对攻击范围内嘲讽较高的角色使用${get.poptip("lit_qixu")}来换牌。如果因此判闪电劈到忠臣了，那就当是“吊诡”发力了吧`
        + `<li>忠臣、反贼、内奸：控人拿牌，拿到${get.poptip("lit_zhijian")}之后就有输出了`,
    'lit_jianghaixu蒋海旭': `如果己方队友是${B("蒋海旭")}，那每回合都相当于有一次卖血技。而且${B("蒋海旭")}的补牌技能在濒死之前触发，对能转化桃的队友很友好。还能防止队友弃牌，不过对${get.poptip("lit_boshu菠树")}、${get.poptip("lit_huxinyu胡馨予")}之类的得考虑考虑。`
        + `<li>主公、反贼：除非受到巨额爆伤，否则前期几乎死不掉，而且队友在有${get.poptip("lit_yuanzhu")}的情况下，对${B("蒋海旭")}的桃相当于能用两次.可多补牌，援助容易蓄牌的队友`
        + "<li>忠臣、内奸：辅助主公，但有可能把主公的桃抢了……因此在主公血量危急的时候尽量别被打进濒死了",
    'lit_qianbaocan钱保灿': `不怎么怕兵粮寸断，需要留杀或决斗，方便在放南蛮万箭后爆发。${B("钱保灿")}到中后期会有些劣势，但到单挑的时候也不弱`
        + "<li>主公、忠臣：第一回合建议留牌，看清身份后到次轮再爆发。队友如果能为牌多填目标，那爆发力度会几何倍数增长"
        + "<li>反贼：南蛮+万箭后可乱杀主公，一轮残是常有的事，主公的一轮生存率就是这么被拉低的"
        + "<li>内奸：留牌，进可南蛮万箭，退可五谷桃园，AOE在关键时候都可以用来控场",
    'lit_zhangchi张驰': `与${B("氹")}诡辩之时，你会怀念仁王盾和藤甲的。什么？你卖血啊~那没事了，${B("氹")}最怕的就是不怕自己会反伤自己的人`
        + `<li>主公：留防御牌方便${get.poptip("lit_guibian")}。${get.poptip("lit_shuxin")}改为主动技后，要小心发动技能对使用者的真实收益`
        + "<li>忠臣：诡辩反贼的伤害牌，吸引火力以便进行消耗战"
        + "<li>反贼：诡辩酒、闪、无懈可击，或满血诡辩桃100%成功。可以显著干扰对面关键人物的牌型"
        + "<li>内奸：有竖心在很容易苟到最后，苟吧",
    'lit_yangxiangling杨湘铃': `前期约等于没有技能，想杀${B("杨湘铃")}要趁早，就算是队友也可能被AOE误伤。一旦${B("杨湘铃")}到了后期，可以显著提高敌方的斩杀线，对手的血量变化完全可能为5→4→3→2→-2→-3→-4……`
        + `<li>主公：前期只考虑活下来，及时翻面高嘲讽敌方。后期可以亲自下场，利用${get.poptip("lit_dongjie")}掉血效果杀到忠臣也不怕`
        + "<li>忠臣、反贼：及时补刀残血，可以造成双倍伤害，不过很多时候人头不会是你的，算的是「使其从正常状态进入濒死状态」的伤害源"
        + "<li>内奸：很容易发死人财，找准机会连破定胜",

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
    // 'lit_jianghaixu蒋海旭' : [["azure",[`img: ${ basic.path }/image/character / lit_jianghaixu_azure.png`]]],
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
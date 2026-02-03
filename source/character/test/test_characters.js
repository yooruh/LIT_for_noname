import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';
import basic from '../../tool/basic.js';

export const connectBanned = [];
export const characterSort = {
    'lit_test': {
        'lit_jbs': ['lit_hupan9胡畔', 'lit_zhengmohan9郑墨翰', 'lit_zengpinjia9曾品嘉', 'lit_wangsiyuan王思媛', 'lit_zhongyutong9钟雨桐', 'lit_pengliying彭丽颖'],
    },
};

export const character = {
    'lit_hupan9胡畔': {
        sex: "male",
        group: "nine",
        hp: 2,
        maxHp: 3,
        skills: ["lit_beiai", "lit_baoshi", "lit_yuyan"],
        groupInGuozhan: "nine",
    },
    'lit_zhengmohan9郑墨翰': {
        sex: "male",
        group: "nine",
        hp: 3,
        maxHp: 5,
        skills: ["lit_maitou", "lit_yiyu", "lit_moshou"],
        groupInGuozhan: "nine",
    },
    'lit_zengpinjia9曾品嘉': {
        sex: "male",
        group: "nine",
        hp: 3,
        skills: ["lit_yingjun", "lit_kuizeng", "lit_chuangshi"],
        groupInGuozhan: "nine",
    },
    'lit_wangsiyuan王思媛': {
        sex: "female",
        group: "nine",
        hp: 4,
        skills: ["lit_daha", "lit_fushu"],
        groupInGuozhan: "nine",
    },
    'lit_zhongyutong9钟雨桐': {
        sex: "female",
        group: "nine",
        hp: 3,
        skills: ["lit_jinshan", "lit_cidi", "lit_danchun"],
        groupInGuozhan: "nine",
    },
    'lit_pengliying彭丽颖': {
        sex: "female",
        group: "key",
        hp: 3,
        skills: ["lit_wuma", "lit_qingxiu", "lit_teshe"],
        groupInGuozhan: "key",
    },
};

export const characterTitle = {

    'lit_pengliying彭丽颖': "时过境迁，藻已物是人非",
    'lit_zhengmohan9郑墨翰': "应该是颟翰",

};

export const characterIntro = {

};

// 角色替换
export const characterReplace = {
    'lit_hupan': ['lit_hupan胡畔', 'lit_hupan9胡畔'],
    'lit_zhengmohan': ['lit_zhengmohan郑墨翰', 'lit_zhengmohan9郑墨翰'],
    'lit_zengpinjia': ['lit_zengpinjia曾品嘉', 'lit_zengpinjia9曾品嘉'],
};

export const characterFilter = {};
// 特殊时机皮肤切换
export const characterSubstitute = {
    // 'lit_jianghaixu蒋海旭' : [["azure",[`img:${basic.path}/image/character/lit_jianghaixu_azure.png`]]],
};
// 珠联璧合
export const perfectPair = {};
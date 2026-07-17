import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';
import basic from '../../tool/basic.js';

export const connectBanned = [];
export const characterSort = {
    'lit_test': {
        'lit_jbs': ['lit_hupan9胡畔', 'lit_zhengmohan9郑墨翰', 'lit_zengpinjia9曾品嘉', 'lit_wangsiyuan王思媛', 'lit_zhongyutong9钟雨桐', 'lit_pengliying彭丽颖'],
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
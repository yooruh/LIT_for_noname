import { lib, game, ui, get, ai, _status } from '../../../../noname.js';

let lit_pack = { ...(await import(`./lit.js`)).info };
// 处理 translate characterTitle characterSubstitute（字符串、数组）
for (let name of ['translate', 'characterTitle', 'characterSubstitute']) {
    lit_pack[name] = Object.keys(lit_pack[name]).reduce((acc, key) => {
        acc[`gz_${key}`] = lit_pack[name][key];
        if (lit_pack[name][`${key}_prefix`]) {
            acc[`gz_${key}_prefix`] = lit_pack[name][`${key}_prefix`];
        }
        return acc;
    }, {});
}
// 处理 character（对象）
lit_pack['character'] = Object.keys(lit_pack['character']).reduce((acc, key) => {
    // 使用展开运算符浅拷贝对象
    let value = { ...lit_pack['character'][key] };
    acc[`gz_${key}`] = value;
    // 设置国战势力为key
    acc[`gz_${key}`].groupInGuozhan = 'key';
    return acc;
}, {});
// lit_pack['character'] = Object.entries(lit_pack['character']).reduce((acc, [key, character]) => {
//     const characterArray = [
//         character.sex,
//         "key" || character.group,
//         character.maxHp != character.hp ? `${character.hp}/${character.maxHp}` : character.hp,
//         character.skills || [],
//         []
//     ];
//     // 处理图片和死亡音频
//     if (character.img) {
//         characterArray[4].push(`img:${character.img}`);
//     }
//     if (character.dieAudios && Array.isArray(character.dieAudios)) {
//         character.dieAudios.forEach(die => characterArray[4].push(`die:${die}`));
//     }
//     // 处理主公标记
//     if (character.isZhugong) {
//         characterArray[4].push('zhu');
//     }
//     acc[`gz_${key}`] = characterArray;
//     return acc;
// }, {});

export let info = {
    name: 'lit_gz',
    mode: 'guozhan',
    connect: true,
    connectBanned: lit_pack['connectBanned'],
    characterSort: {
        'lit_gz': Object.keys(lit_pack.characterSort['lit']).reduce((acc, key) => {
            let value = lit_pack.characterSort['lit'][key];
            acc[key] = value.map(e => `gz_${e}`);
            return acc;
        }, {}),
    },
    character: lit_pack['character'],
    characterTitle: lit_pack['characterTitle'],
    characterIntro: {},
    characterFilter: {},
    characterSubstitute: lit_pack['characterSubstitute'],
    perfectPair: Object.keys(lit_pack.perfectPair).reduce((acc, key) => {
        let value = lit_pack.perfectPair[key];
        acc[`gz_${key}`] = value.map(e => `gz_${e}`);
        return acc;
    }, {}),
    skill: lit_pack['skill'],
    translate: lit_pack['translate'],
    dynamicTranslate: {},
    pinyins: lit_pack['pinyins'],
};

// var guozhanRank={
// 	'8':['gz_linmiao','gz_chenke','gz_pengliying'],
// 	'7':['gz_zhangshengjie','gz_liyang','gz_huxinyu'],
// 	'6':['gz_chenqiuxia','gz_wangsiyuan','gz_dingxianyu'],
// 	'5':['gz_zhengmohan','gz_pengyuyue','gz_chenjun','gz_zengpinjia'],
// 	'4':['gz_boyanyuanhang','gz_wangcan','gz_zhongyutong'],
// 	'3':['gz_heyingqi','gz_chenyizhou','gz_xiedan'],
// 	'2':['gz_liangxinyu','gz_yuansenyaoting','gz_jinyuxin'],
// 	'1':['gz_hupan','gz_qiuyiqin','gz_zhangchi'],
// };
// for(var i in guozhanRank){
// 	lib.guozhanRank[i].addArray(guozhanRank[i])
// }
import { lib, game, ui, get, ai, _status } from '../../../../noname.js';

const { info: baseInfo } = await import(`./lit.js`);
const lit_pack = { ...baseInfo };
const gzModule = await import(`./lit_gz/index.js`);
const gzOverrides = gzModule.overrides || {};
const characterIds = Object.keys(lit_pack.character || {});
const characterIdSet = new Set(characterIds);

function gzId(id) {
    return `gz_${id}`;
}

function mapCharacterKeyedObject(source, mapValue) {
    return Object.keys(source || {}).reduce((acc, key) => {
        acc[gzId(key)] = mapValue ? mapValue(source[key], key) : source[key];
        return acc;
    }, {});
}

function mapCharacterListObject(source) {
    return mapCharacterKeyedObject(source, value => value.map(id => gzId(id)));
}

function mapTranslate(source) {
    return Object.keys(source || {}).reduce((acc, key) => {
        if (characterIdSet.has(key)) {
            acc[gzId(key)] = source[key];
            return acc;
        }
        if (key.endsWith('_prefix')) {
            const baseKey = key.slice(0, -7);
            if (characterIdSet.has(baseKey)) {
                acc[`${gzId(baseKey)}_prefix`] = source[key];
                return acc;
            }
        }
        acc[key] = source[key];
        return acc;
    }, {});
}

function mapCharacters(source) {
    return Object.keys(source || {}).reduce((acc, key) => {
        acc[gzId(key)] = {
            ...source[key],
            groupInGuozhan: 'key',
        };
        return acc;
    }, {});
}

function mergeMappedSection(baseSection, overrideSection) {
    return {
        ...(baseSection || {}),
        ...(overrideSection || {}),
    };
}

const mappedCharacter = mapCharacters(lit_pack.character);
const mappedCharacterTitle = mapCharacterKeyedObject(lit_pack.characterTitle);
const mappedCharacterIntro = mapCharacterKeyedObject(lit_pack.characterIntro);
const mappedCharacterReplace = mapCharacterListObject(lit_pack.characterReplace);
const mappedCharacterFilter = mapCharacterKeyedObject(lit_pack.characterFilter);
const mappedCharacterSubstitute = mapCharacterKeyedObject(lit_pack.characterSubstitute);
const mappedPerfectPair = mapCharacterListObject(lit_pack.perfectPair);
const mappedTranslate = mapTranslate(lit_pack.translate);

export let info = {
    name: 'lit_gz',
    mode: 'guozhan',
    connect: true,
    connectBanned: gzModule.connectBanned || lit_pack.connectBanned,
    characterSort: gzModule.characterSort || {
        lit_gz: Object.keys(lit_pack.characterSort?.lit || {}).reduce((acc, key) => {
            acc[key] = lit_pack.characterSort.lit[key].map(id => gzId(id));
            return acc;
        }, {}),
    },
    character: mergeMappedSection(mappedCharacter, gzOverrides.character),
    characterTitle: mergeMappedSection(mappedCharacterTitle, gzOverrides.characterTitle),
    characterIntro: mergeMappedSection(mappedCharacterIntro, gzOverrides.characterIntro),
    characterReplace: mergeMappedSection(mappedCharacterReplace, gzOverrides.characterReplace),
    characterFilter: mergeMappedSection(mappedCharacterFilter, gzOverrides.characterFilter),
    characterSubstitute: mergeMappedSection(mappedCharacterSubstitute, gzOverrides.characterSubstitute),
    perfectPair: mergeMappedSection(mappedPerfectPair, gzOverrides.perfectPair),
    skill: {
        ...lit_pack.skill,
        ...gzOverrides.skill,
    },
    translate: mergeMappedSection(mappedTranslate, gzOverrides.translate),
    dynamicTranslate: {
        ...lit_pack.dynamicTranslate,
        ...gzOverrides.dynamicTranslate,
    },
    pinyins: {
        ...lit_pack.pinyins,
        ...gzOverrides.pinyins,
    },
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

import { characterSort as litCharacterSort, characterTitle as litCharacterTitle,
         characterIntro as litCharacterIntro, characterReplace as litCharacterReplace,
         characterFilter as litCharacterFilter, characterSubstitute as litCharacterSubstitute,
         perfectPair as litPerfectPair, connectBanned as litConnectBanned } from '../lit/lit_characters.js';

const gzId = id => `gz_${id}`;

function mapCharacterKeyedObject(source, mapValue) {
    return Object.keys(source || {}).reduce((acc, key) => {
        acc[gzId(key)] = mapValue ? mapValue(source[key], key) : source[key];
        return acc;
    }, {});
}

function mapCharacterListObject(source) {
    return mapCharacterKeyedObject(source, value => value.map(id => gzId(id)));
}

export const connectBanned = litConnectBanned || [];

export const characterSort = {
    lit_gz: Object.keys(litCharacterSort?.lit || {}).reduce((acc, key) => {
        acc[key] = litCharacterSort.lit[key].map(id => gzId(id));
        return acc;
    }, {}),
};

export const characterTitle = mapCharacterKeyedObject(litCharacterTitle);
export const characterIntro = mapCharacterKeyedObject(litCharacterIntro);
export const characterReplace = mapCharacterListObject(litCharacterReplace);
export const characterFilter = mapCharacterKeyedObject(litCharacterFilter);
export const characterSubstitute = mapCharacterKeyedObject(litCharacterSubstitute);
export const perfectPair = mapCharacterListObject(litPerfectPair);

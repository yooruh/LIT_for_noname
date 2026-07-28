import { fullTranslate as litTranslate, dynamicTranslate as litDynamicTranslate, pinyins as litPinyins, character as litCharacter } from '../lit/index.js';

const characterIds = Object.keys(litCharacter || {});
const characterIdSet = new Set(characterIds);
const gzId = id => `gz_${id}`;

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

export const translate = mapTranslate(litTranslate);
export const dynamicTranslate = litDynamicTranslate;
export const pinyins = litPinyins;

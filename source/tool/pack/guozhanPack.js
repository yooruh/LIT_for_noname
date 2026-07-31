export function mapObjectKeys(source, mapKey, mapValue) {
    return Object.fromEntries(Object.entries(source || {}).map(([key, value]) => [
        mapKey(key),
        mapValue ? mapValue(value, key) : value,
    ]));
}

export function prefixCharacterId(id) {
    return `gz_${id}`;
}

export function mapCharacterKeys(source, mapValue) {
    return mapObjectKeys(source, prefixCharacterId, mapValue);
}

export function mapCharacterLists(source) {
    return mapCharacterKeys(source, value => value.map(prefixCharacterId));
}

export function mapCharacterSort(source, sourcePack = 'lit', targetPack = 'lit_gz') {
    return {
        [targetPack]: mapObjectKeys(source?.[sourcePack], key => key, value => value.map(prefixCharacterId)),
    };
}

export function mapCharacterTranslate(source, characterIds) {
    const characterIdSet = new Set(characterIds);
    return mapObjectKeys(source, key => {
        if (characterIdSet.has(key)) return prefixCharacterId(key);
        if (key.endsWith('_prefix') && characterIdSet.has(key.slice(0, -7))) {
            return `${prefixCharacterId(key.slice(0, -7))}_prefix`;
        }
        return key;
    });
}

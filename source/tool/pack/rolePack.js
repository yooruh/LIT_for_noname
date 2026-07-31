function getCharacterId(role, fileName) {
    const characterIds = Object.keys(role.character || {});
    if (characterIds.length !== 1) {
        throw new Error(`角色模块 ${fileName} 必须且只能导出一个角色`);
    }
    return characterIds[0];
}

export function createRolePack(fileNames, modules, packName) {
    const roles = Object.fromEntries(fileNames.map((fileName, index) => [fileName, modules[index]]));
    const characterIds = Object.fromEntries(fileNames.map(fileName => [fileName, getCharacterId(roles[fileName], fileName)]));

    return {
        fileNames,
        roles,
        characterIds,
        merge(prop) {
            return Object.assign({}, ...fileNames.map(fileName => roles[fileName][prop]).filter(Boolean));
        },
        collect(prop) {
            return Object.fromEntries(fileNames.flatMap(fileName => {
                const value = roles[fileName][prop];
                return value == null ? [] : [[characterIds[fileName], value]];
            }));
        },
        createCharacterSort() {
            const groups = {};
            for (const fileName of fileNames) {
                const sort = roles[fileName].sort;
                if (!sort) continue;
                (groups[`lit_${sort}`] ??= []).push(characterIds[fileName]);
            }
            return { [packName]: groups };
        },
        createResourceNames(namespace = 'lit_') {
            return Object.fromEntries(fileNames.map(fileName => [characterIds[fileName], `${namespace}${fileName}`]));
        },
    };
}

import { lib, game } from '../../../../../noname.js';
import { extensionPath } from '../utils/paths.js';

const EXTENSION_NAME = '叁岛世界';

function fillSkillAudio(info) {
    for (const skill of Object.values(info.skill || {})) {
        if (typeof skill.audio === 'number') {
            skill.audio = `${extensionPath}/audio/skill:${skill.audio}`;
        }
    }
}

function fillCharacterResources(info, resourceNames) {
    for (const [characterId, character] of Object.entries(info.character || {})) {
        const resourceName = resourceNames?.[characterId];
        if (!resourceName) {
            throw new Error(`角色包 ${info.name} 未提供 ${characterId} 的资源名`);
        }
        character.img ??= `${extensionPath}/image/character/${resourceName}.png`;
        character.skinPath ??= `${extensionPath}/image/skin/${resourceName}/`;
        character.dieAudios ??= [];
        const dieAudio = `${extensionPath}/audio/die/${resourceName}.mp3`;
        if (!character.dieAudios.includes(dieAudio)) character.dieAudios.push(dieAudio);
    }
}

function getDisplayName(info, config) {
    return config.displayName
        || info.translate?.[info.name]
        || info.name;
}

function shouldLoad(config) {
    return !config.extensionConfig || Boolean(game.getExtensionConfig(EXTENSION_NAME, config.extensionConfig));
}

function enablePack(type, info, config) {
    if (config.defaultEnabled === false) return;
    const configKey = `${info.name}_${type}_pack`;
    if (game.getExtensionConfig(EXTENSION_NAME, configKey)) return;

    const enabledPacks = type === 'character' ? lib.config.characters : lib.config.cards;
    enabledPacks.add(info.name);
    game.saveConfig(type === 'character' ? 'characters' : 'cards', enabledPacks);
    game.saveExtensionConfig(EXTENSION_NAME, configKey, true);
}

export async function loadPackRegistry(type, fileNames, registry, deferredPacks, infoPacks) {
    const baseDir = type === 'character' ? '../character' : '../card';
    for (const modulePath of fileNames) {
        const module = await import(`${baseDir}/${modulePath}.js`);
        const { info, resourceNames, packConfig = {} } = module;
        if (!info?.name) throw new Error(`${baseDir}/${modulePath}.js 未导出有效的 info`);
        if (registry[info.name]) throw new Error(`重复的${type === 'character' ? '角色' : '卡牌'}包名称：${info.name}`);

        const entry = {
            modulePath,
            displayName: getDisplayName(info, packConfig),
            info,
            resourceNames: resourceNames || {},
            ...packConfig,
        };
        registry[info.name] = entry;
        if (!shouldLoad(entry)) continue;

        fillSkillAudio(info);
        if (type === 'character') {
            fillCharacterResources(info, resourceNames);
            infoPacks[info.name] = info;
        }
        lib.translate[`${info.name}_${type}_config`] = entry.displayName;
        enablePack(type, info, entry);

        if (entry.deferred) {
            deferredPacks[info.name] = entry;
        } else {
            game.import(type, () => info);
        }
    }
}

export function registerCharacterPack(info, displayName) {
    for (const [sectionName, section] of Object.entries(info)) {
        switch (sectionName) {
            case 'name':
            case 'mode':
            case 'forbid':
            case 'connect':
                break;
            case 'character':
                for (const [characterId, character] of Object.entries(section)) {
                    for (const skill of character.skills || []) lib.skilllist.add(skill);
                    lib.character[characterId] ??= character;
                }
                break;
            case 'skill':
                for (const [skillId, skill] of Object.entries(section)) {
                    lib.skill[skillId] ??= skill;
                }
                break;
            default:
                if (!section || typeof section !== 'object' || !lib[sectionName]) break;
                if (Array.isArray(section) && Array.isArray(lib[sectionName])) {
                    lib[sectionName].addArray(section);
                    break;
                }
                if (Array.isArray(section)) break;
                for (const key of Reflect.ownKeys(section)) {
                    if (lib[sectionName][key] != null) continue;
                    const descriptor = Object.getOwnPropertyDescriptor(section, key);
                    if (descriptor) Object.defineProperty(lib[sectionName], key, descriptor);
                }
        }
    }
    lib.characterPack[info.name] = info.character;
    lib.translate[`${info.name}_character_config`] = displayName;
}

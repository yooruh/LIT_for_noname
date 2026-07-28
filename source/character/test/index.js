import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';

const ROLE_FILES = ["9hupan","9zengpinjia","9zhengmohan","9zhongyutong","pengliying","wangsiyuan"];

const _modules = await Promise.all(ROLE_FILES.map(name =>
    import(`./roles/${name}.js`)
));

const _roles = {};
ROLE_FILES.forEach((name, i) => { _roles[name] = _modules[i]; });

const _merge = (prop) => {
    const result = {};
    for (const name of ROLE_FILES) if (_roles[name][prop]) Object.assign(result, _roles[name][prop]);
    return result;
};

export {
    connectBanned, characterSort, characterTitle,
    characterIntro, characterReplace, characterFilter,
    characterSubstitute, perfectPair
} from './test_characters.js';

import { translate as _metaTranslate, dynamicTranslate as _metaDynamicTranslate, pinyins as _metaPinyins } from './_meta.js';

export const character = _merge('character');
export const skill = _merge('skill');
export const translate = { ..._metaTranslate, ..._merge('translate') };
export const dynamicTranslate = { ..._metaDynamicTranslate, ..._merge('dynamicTranslate') };
export const pinyins = { ..._metaPinyins, ..._merge('pinyins') };

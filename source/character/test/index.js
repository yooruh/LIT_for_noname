import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';

const ROLE_FILES = ["9hupan", "9zengpinjia", "9zhengmohan", "9zhongyutong", "pengliying", "wangsiyuan"];

const _modules = await Promise.all(ROLE_FILES.map(name =>
    import(`./roles/${name}.js`)
));

const _roles = {};
ROLE_FILES.forEach((name, i) => { _roles[name] = _modules[i]; });

const _merge = (prop) => {
    const r = {};
    for (const name of ROLE_FILES) if (_roles[name][prop]) Object.assign(r, _roles[name][prop]);
    return r;
};

export {
    connectBanned, characterSort, characterTitle,
    characterIntro, characterReplace, characterFilter,
    characterSubstitute, perfectPair
} from './test_characters.js';

export { dynamicTranslate, pinyins } from './test_translate.js';

import { translate as _tt } from './test_translate.js';

export const character = _merge('character');
export const skill     = _merge('skill');
export const translate = { ..._tt, ..._merge('translate') };

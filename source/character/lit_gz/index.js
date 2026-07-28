import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';

// ════════════════════════════════════════════════════════════
//  Guozhan overrides — add role files here when a lit role
//  needs a dedicated 国战 version while the rest still inherits lit
// ════════════════════════════════════════════════════════════

const ROLE_FILES = [
    // 'hujunwei',
];

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
} from './lit_gz_characters.js';

export { translate, dynamicTranslate, pinyins } from './lit_gz_translate.js';

export const overrides = {
    character: _merge('character'),
    skill: _merge('skill'),
    characterTitle: _merge('characterTitle'),
    characterIntro: _merge('characterIntro'),
    characterReplace: _merge('characterReplace'),
    characterFilter: _merge('characterFilter'),
    characterSubstitute: _merge('characterSubstitute'),
    perfectPair: _merge('perfectPair'),
    translate: _merge('translate'),
    dynamicTranslate: _merge('dynamicTranslate'),
    pinyins: _merge('pinyins'),
};

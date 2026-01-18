import { lib, game, ui, get, ai, _status } from '../../../noname.js';
import { suiSet } from "../source/tool/suiSet.js";
import { doudizhu } from './mode/doudizhu.js';
import { identity } from './mode/identity.js';
export let chooseCharacterOL = function () {
	const mode = get.mode()
	const switchMode = {
		identity: identity.chooseMode,
		doudizhu: doudizhu.chooseMode,
	}
	if (typeof switchMode[mode] === 'function') {
		eval(`${mode}.modeConfig()`)
		switchMode[mode].call(this, arguments)
	}
}
Object.defineProperty(game, 'chooseCharacterOL', {
	configurable: false,
	get() {
		return chooseCharacterOL
	},
	set(v) {
		const m = get.mode() || lib.config.mode;
		loadModeConfig(m)
		if (m && !suiSet.mode.includes(m)) {
			chooseCharacterOL = v
		}
	}
})

function loadModeConfig(mode) {
	const switchMode = {
		doudizhu,
		identity
	}
	if (typeof switchMode[mode] === 'function') {
		switchMode[mode]()
	}
}



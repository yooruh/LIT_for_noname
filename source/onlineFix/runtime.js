import { createLoaderRuntime } from './loader.js';
import { createLobbyRuntime } from './lobby.js';
import { createOnlineUtils } from './utils.js';
import { createHandcardRuntime } from './handcards.js';
import { createCharacterSelectionRuntime } from './characterSelection.js';
import { createTransportRuntime } from './transport.js';
import { createPlayerControlRuntime } from './playerControl.js';

export const suiSet = {};
export const loaderRuntime = createLoaderRuntime(suiSet);
export const lobbyRuntime = createLobbyRuntime(suiSet);
export const onlineUtils = createOnlineUtils(suiSet);
export const handcardRuntime = createHandcardRuntime(suiSet);
export const characterSelectionRuntime = createCharacterSelectionRuntime(suiSet);
export const transportRuntime = createTransportRuntime(suiSet);
export const playerControlRuntime = createPlayerControlRuntime(suiSet);

Object.assign(
    suiSet,
    lobbyRuntime,
    loaderRuntime,
    onlineUtils,
    handcardRuntime,
    characterSelectionRuntime,
    transportRuntime,
    playerControlRuntime,
);

for (const key of ['replaceHandcardsnum', 'replaceHandcardsOver']) {
    Object.defineProperty(handcardRuntime, key, {
        get: () => suiSet[key],
        set: value => { suiSet[key] = value; },
        configurable: true,
    });
}

export function setOnlineFixConfig(config) {
    suiSet.config = config;
}

window.suiSet = suiSet;

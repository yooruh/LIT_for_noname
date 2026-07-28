import { game, ui, _status, ai, lib, get } from "../../../noname.js";
import { suiSet } from "../tool/suiSet.js";

ui.create.buttonPresets.vcardx = suiSet.vcardx;
get.identityList = suiSet.identityList;
// lib.element.player.chooseButtonOL = suiSet.chooseButtonOL;
// lib.element.player.chooseButton = suiSet.chooseButton;

const originalPhaseLoop = game.phaseLoop.bind(game);
const originalGameDraw = game.gameDraw.bind(game);
const originalReplaceHandcardsOL = lib.element.content.replaceHandcardsOL;

lib.config.extensionsCopy = suiSet.getEnabledExtensionsCopy();
if (lib.config["extension_叁岛世界_fun_handCardsFix"]) {
	game.gameDraw = function (player = game.me, num = 4, targets = game.players) {
		return suiSet.gameDraw(player, num, targets, originalGameDraw);
	};
	game.replaceHandcards = function (...args) {
		return suiSet.replaceHandcards(...args);
	};
	lib.element.content.replaceHandcardsOL = function (event, trigger, player) {
		return suiSet.replaceHandcardEvent.call(this, event, trigger, player, originalReplaceHandcardsOL);
	};
}

game.TrueHasExtension = ext => lib.config.extensions && lib.config.extensions.includes(ext);
game.HasExtension = ext => game.TrueHasExtension(ext) && lib.config["extension_" + ext + "_enable"];
game.phaseLoop = function (player) {
	if (lib.config["extension_叁岛世界_fun_handCardsFix"] && !suiSet.replaceHandcardsOver) {
		game.replaceHandcards(game.players.slice(0));
	}
	return originalPhaseLoop(player);
};

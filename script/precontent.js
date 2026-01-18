import { game, ui, _status, ai, lib, get } from "../../../noname.js";
import { suiSet } from "../source/tool/suiSet.js";
import basic from '../source/tool/basic.js'

ui.create.buttonPresets.vcardx = suiSet.vcardx;
get.identityList = suiSet.identityList;
// lib.element.player.chooseButtonOL = suiSet.chooseButtonOL;
// lib.element.player.chooseButton = suiSet.chooseButton;
lib.config.extensionsCopy = lib.config.extensions.filter(e => {
	return !suiSet.igextension.includes(e) && lib.config[`extension_${e}_enable`];
});
if(lib.config['extension_叁岛世界_fun_handCardsFix']){
	game.gameDraw = suiSet.gameDraw;
	game.replaceHandcards = suiSet.replaceHandcards;
	lib.element.content.replaceHandcardsOL = suiSet.replaceHandcardEvent;
}

const mode = ['identity'/* ,'doudizhu' */];
mode.forEach(m => suiSet.addImport(`${basic.path}/script/mode/${m}.js`));

game.TrueHasExtension = ext => lib.config.extensions && lib.config.extensions.includes(ext);
game.HasExtension = ext => game.TrueHasExtension(ext) && lib.config['extension_' + ext + '_enable'];
game.phaseLoop = function (player) {
	if(lib.config['extension_叁岛世界_fun_handCardsFix']){
		if (!suiSet.replaceHandcardsOver) {
			game.replaceHandcards(game.players);
		}
	}
	const next = game.createEvent("phaseLoop");
	next.player = player;
	next._isStandardLoop = true;
	next.setContent("phaseLoop");
}
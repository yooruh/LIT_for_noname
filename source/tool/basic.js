import { lib, game, ui, get, ai, _status } from '../../../../noname.js'
let basicPath = lib.init.getCurrentFileLocation(import.meta.url);
const basic = {
	path: basicPath.slice(0, basicPath.lastIndexOf('/source/tool/basic.js')),
	files: basicPath.slice(0, basicPath.lastIndexOf('extension'))+'files',
};
export default basic;
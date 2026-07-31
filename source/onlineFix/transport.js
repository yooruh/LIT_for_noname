import { get } from '../../../../noname.js';

export function createTransportRuntime(suiSet) {
	return {
	toString() {
		const args = Array.from(arguments);
		if (typeof args[0] == "function") {
			args.unshift("exec");
		}
		for (let i = 1; i < args.length; i++) {
			args[i] = get.stringifiedResult(args[i]);
		}
		return JSON.stringify(args)
	},
	send(name, ...args) {
		if (!suiSet.strings[name]) {
			suiSet.strings[name] = suiSet.toString(...args)
		}
		return this.ws.send(suiSet.strings[name])
	},
	strings: {},
	};
}

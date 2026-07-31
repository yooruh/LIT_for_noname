import { lib } from '../../../../noname.js';

export function createLoaderRuntime(suiSet) {
	return {
	addImport(url, end = () => { }) {
		const script = document.createElement('script')
		script.type = 'module'
		script.src = lib.assetURL + url
		document.head.appendChild(script)
		script.onload = () => {
			end()
			script.remove()
		}
		return script
	},
	};
}

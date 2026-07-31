import { lib } from '../../../../../noname.js';

const currentFilePath = lib.init.getCurrentFileLocation(import.meta.url);
const sourceSuffix = '/source/tool/utils/paths.js';

export const extensionPath = currentFilePath.slice(0, currentFilePath.lastIndexOf(sourceSuffix));
export const extensionFilesPath = currentFilePath.slice(0, currentFilePath.lastIndexOf('extension')) + 'files/lit';

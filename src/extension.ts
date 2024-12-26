
import * as vscode from 'vscode';
import { checkExtension } from './check';
import {initChat} from  './chat'; 
import { initInitializr } from './initializr';
import { initYmlSuggestion } from './yml';
import {initConfig} from './config';

/**
 * 应用入口
 * @param context 
 */
export function activate(context: vscode.ExtensionContext) {
    checkExtension();
    initConfig();
    initYmlSuggestion(context);
    initInitializr(context);
    initChat(context);

}
export function deactivate() { }

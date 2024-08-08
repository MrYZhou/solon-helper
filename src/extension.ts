
import * as vscode from 'vscode';
import { checkExtension } from './check';
import { initInitializr } from './initializr';
import { initYmlSuggestion } from './yml';
import {initConfig} from './config';


export function activate(context: vscode.ExtensionContext) {
    checkExtension();
    initConfig(context);
    initYmlSuggestion(context);
    initInitializr(context);
}
export function deactivate() { }

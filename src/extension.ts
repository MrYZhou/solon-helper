
import * as vscode from 'vscode';
import { checkExtension } from './check';
import { initInitializr } from './initializr';
import { initYmlSuggestion } from './yml';



export function activate(context: vscode.ExtensionContext) {
    checkExtension();
    initYmlSuggestion(context);
    initInitializr(context);
}
export function deactivate() { }

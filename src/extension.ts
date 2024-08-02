
import * as vscode from 'vscode';
import { checkExtension } from './check';
import { initInitializr } from './initializr';
import { initStartButton } from './start';
import { initYmlSuggestion } from './yml';



export function activate(context: vscode.ExtensionContext) {
    checkExtension();
    initInitializr(context);
    initStartButton(context);
    initYmlSuggestion(context);
}
export function deactivate() { }

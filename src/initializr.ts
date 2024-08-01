import * as vscode from 'vscode';

const initInitializr = (context: vscode.ExtensionContext) =>{
    context.subscriptions.push(vscode.commands.registerCommand('solon.helper.initSolonProject', async () => {
        vscode.window.showInformationMessage('run');
    }))
}

export {initInitializr}
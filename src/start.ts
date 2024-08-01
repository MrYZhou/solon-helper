import * as vscode from 'vscode';

const initStartButton = (context: vscode.ExtensionContext) => {
    context.subscriptions.push(vscode.commands.registerCommand('solon.helper.run', async () => {
        vscode.window.showInformationMessage('run');
    }))
}

export { initStartButton }
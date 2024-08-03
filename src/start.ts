import * as vscode from 'vscode';
import * as tool from './tool';
const initStartButton = (context: vscode.ExtensionContext) => {
    context.subscriptions.push(vscode.commands.registerCommand('solon.run', async () => {
        // 默认的java插件自带
    }));
};

export { initStartButton };
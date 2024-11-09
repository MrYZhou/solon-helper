
import * as vscode from 'vscode';
const initChat = (context: vscode.ExtensionContext) => {
    let initBtn = vscode.commands.registerCommand("solon.chatPanel", function () {
        const myButton = vscode.window.createStatusBarItem(
          vscode.StatusBarAlignment.Left,
          100
        );
        myButton.tooltip = "打开聊天面板";
        myButton.text = `$(comment-discussion)`;
        myButton.color = "white";
        myButton.command = "aa";
        myButton.show();
      });
    context.subscriptions.push(initBtn);
    vscode.commands.executeCommand("solon.chatPanel");
};

export { initChat };

   
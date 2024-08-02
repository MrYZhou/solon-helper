import * as vscode from 'vscode';
const checkExtension = async () => {
    let pom = vscode.workspace.findFiles('**/pom.xml');
    if (pom !== undefined) {
        const env = vscode.extensions.getExtension('vscjava.vscode-maven');
        if (!env) {
            const select = await vscode.window.showInformationMessage('检测到当前无Maven相关插件,推荐安装', '确定', '取消');
            if (select === '确定') {
                vscode.commands.executeCommand('workbench.extensions.search', 'vscjava.vscode-java-pack');
            }
        }
    } else {
        const env = vscode.extensions.getExtension('vscjava.vscode-gradle');
        if (!env) {
            const select = await vscode.window.showInformationMessage('检测到当前无Gradle相关插件,推荐安装', '确定', '取消');
            if (select === '确定') {
                vscode.commands.executeCommand('workbench.extensions.search', 'vscjava.vscode-gradle');
            }
        }
    }


};

export { checkExtension };

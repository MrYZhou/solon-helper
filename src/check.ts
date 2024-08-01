import * as vscode from 'vscode';
const checkExtension = async () => {
    const env = vscode.extensions.getExtension('oracle.oracle-java')
    if (!env) {
        const select = await vscode.window.showInformationMessage('检测到当前无Java相关插件,推荐安装', '确定','取消')
        if (select === '确定') {
            vscode.commands.executeCommand('workbench.extensions.search', 'vscjava.vscode-java-pack');
        }
    }
    
}

export { checkExtension }

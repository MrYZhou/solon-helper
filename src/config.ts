import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
/**
 * 初始化设置里面的配置属性
 */
const initConfig = () => {
    const configuration = vscode.workspace.getConfiguration('solon-helper');
    let customPath: any = configuration.inspect('customPath');
    if (!customPath?.globalValue) {
        configuration.update('customPath', {
            '桌面': path.join(os.homedir(), 'Desktop')
        }, vscode.ConfigurationTarget.Global);
    }
};

export { initConfig };
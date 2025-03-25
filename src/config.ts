import * as vscode from 'vscode';
import { getDesktopPath } from './tool';
/**
 * 初始化设置里面的配置属性
 */
const initConfig = () => {
    const configuration = vscode.workspace.getConfiguration('solon-helper');
    let customPath: any = configuration.inspect('customPath');
    if (!customPath?.globalValue) {
        configuration.update('customPath', {
            '桌面': getDesktopPath()
        }, vscode.ConfigurationTarget.Global);
    }
};

export { initConfig };
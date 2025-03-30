import * as vscode from 'vscode';
import { getDesktopPath } from './tool';
/**
 * 初始化设置里面的配置属性
 */
const initConfig = () => {
    const configuration = vscode.workspace.getConfiguration('solon-helper');
    // 每次都要更新为当前电脑的桌面路径
    configuration.update('customPath', {
        '桌面': getDesktopPath()
    }, vscode.ConfigurationTarget.Global);
};

export { initConfig };
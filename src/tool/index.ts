import { exec } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * 在vscode中打开命令执行
 * @param command 命令
 * @param sourceDir 执行位置
 */
const  runInTerminal = (command: string, sourceDir: string = '') => {
    if(!sourceDir) {
        sourceDir = getConfig().workspaceDir;
    }
    // 创建一个终端实例
    const terminal = vscode.window.createTerminal({
        name: 'Command Terminal',
        cwd: sourceDir
    });
    // 显示终端
    terminal.show();
    // 发送命令到终端
    terminal.sendText(command);
};
/**
 * 后台执行命令
 * @param command 命令
 * @param sourceDir 执行位置
 * @returns 
 */
const execFn = (command: string, sourceDir: string = './'): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        const options = {
            cwd: sourceDir,
            timeout: 100000, // 100 seconds
            maxBuffer: 2000 * 1024 * 1024, // 2 GB, which is still quite large but more reasonable
        };

        const execInfo = exec(command, options);

        execInfo?.stdout?.on('data', (data: Buffer | string) => {
            process.stdout.write(data.toString());
        });

        execInfo?.stderr?.on('data', (data: Buffer | string) => {
            console.error('Error:', data.toString());
        });

        execInfo.on('close', (code: number) => {
            if (code === 0) {
                resolve(true);
            } else {
                resolve(false);
            }
        });

        execInfo.on('error', (error: Error) => {
            reject(error);
        });
    });
};

const showMessage = (message: string) => {
    vscode.window.showInformationMessage(message);
};

type Config = {
    /**
     * 当前打开文件的文件夹
     */
    currentDir: string;
    /**
     * 当前的工作目录
     */
    workspaceDir: string;
    /**
     * 当前打开文件的路径
     */
    focusFilePath: string;
};
const getConfig = () => {
    const editor = vscode.window.activeTextEditor as vscode.TextEditor;
    const filePath = editor.document.uri.fsPath;
    let workspaceDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath as string;
    let config:Config = {
        currentDir: path.dirname(filePath),
        workspaceDir,
        focusFilePath: filePath
    };
    return config;
};

export { execFn, showMessage, getConfig ,runInTerminal};
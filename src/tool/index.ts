import { exec as execFn } from 'child_process';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { YmlConfig } from './type';
import * as path from 'path';
import { execSync } from "child_process";
import { join, normalize } from "path";
import * as os from "os";
import * as iconv from 'iconv-lite'; // 修正后的导入方式‌:ml-citation{ref="2,7" data="citationList"}
/**
 * 在vscode中打开命令执行
 * @param command 命令
 * @param sourceDir 执行位置
 */
const runInTerminal = (command: string, sourceDir: string = '') => {
    if (!sourceDir) {
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
const exec = (command: string, sourceDir: string = './'): Promise<boolean | string> => {
    return new Promise((resolve, reject) => {
        const encoding = process.platform === 'win32' ? 'gbk' : 'utf8';
        const options = {
            cwd: sourceDir,
            timeout: 100000, // 100 seconds
            maxBuffer: 2000 * 1024 * 1024, // 2 GB, which is still quite large but more reasonable
            encoding: 'buffer' as BufferEncoding, // 确保接收Buffer数据
        };

        let result = '';
        const execInfo = execFn(command, options);
        execInfo?.stdout?.on('data', (data: Buffer) => {
            const decoded = iconv.decode(data, encoding);
            result += decoded;
            process.stdout.write(decoded);
        });

        execInfo?.stderr?.on('data', (data: Buffer) => {
            const decoded = iconv.decode(data, encoding);
            console.error('Solon Helper :: Error:\n', decoded);
        });

        execInfo.on('close', (code: number) => {
            code === 0 ? resolve(result) : resolve(false);
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
    const focusFilePath = editor ? editor.document.uri.fsPath : '';
    let currentDir = path.dirname(focusFilePath);
    let workspaceDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath as string;
    let config: Config = {
        currentDir,
        workspaceDir,
        focusFilePath
    };
    return config;
};

const isSolonProject = () => {
    try {
        let workspaceDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath as string;
        let filePath = path.join(workspaceDir, 'pom.xml');
        const data = fs.readFileSync(filePath, 'utf8');
        return data.includes('solon');
    } catch (error) {
        console.error(`Error reading file from disk: ${error}`);
        throw error;
    }
};

// 桌面api
// 缓存桌面路径（提升性能）
let cachedPath: string | null = null;

function getDesktopPath(): string {
    if (cachedPath) { return cachedPath; }

    try {
        switch (process.platform) {
            case "win32":
                return (cachedPath = getWindowsDesktopPath());
            case "darwin":
                return (cachedPath = getMacDesktopPath());
            case "linux":
                return (cachedPath = getLinuxDesktopPath());
            default:
                throw new Error("UNSUPPORTED_PLATFORM");
        }
    } catch (e: any) {
        console.warn(`[getDesktopPath] Fallback to default: ${e.message}`);
        const fallback = join(os.homedir(), "Desktop");
        return (cachedPath = validatePath(fallback) ? fallback : os.homedir());
    }
}

// Windows 专用逻辑（兼容64/32位）
function getWindowsDesktopPath(): string {
    //  PowerShell命令（最可靠）
    try {
        const psPath = execSync(
            `powershell -NoProfile -Command "[Environment]::GetFolderPath([Environment+SpecialFolder]::Desktop)"`,
            {
                windowsHide: true,
                encoding: "utf-8",
                stdio: ["ignore", "pipe", "ignore"],
            }
        ).trim();
        if (validatePath(psPath)) { return normalize(psPath); }
    } catch (e) {
        /* Ignore failure */
    }
    // 环境变量回退（终极兼容）
    const defaultPath = process.env.USERPROFILE
        ? join(process.env.USERPROFILE, "Desktop")
        : join(os.homedir(), "Desktop");
    return validatePath(defaultPath) ? normalize(defaultPath) : os.homedir();
}

// macOS 多语言支持
function getMacDesktopPath(): string {
    const locales: Record<string, string> = {
        en: "Desktop",
        zh: "桌面",
        ja: "デスクトップ",
        ko: "바탕화면",
        fr: "Bureau",
        es: "Escritorio",
    };

    for (const folder of Object.values(locales)) {
        const path = join(os.homedir(), folder);
        if (validatePath(path)) { return path; }
    }
    return join(os.homedir(), "Desktop");
}

// Linux 多桌面环境支持
function getLinuxDesktopPath(): string {
    try {
        const xdgPath = execSync("xdg-user-dir DESKTOP", {
            encoding: "utf-8",
        }).trim();
        if (validatePath(xdgPath)) { return xdgPath; }
    } catch (e) {
        /* Ignore failure */
    }

    const candidates = [
        process.env.XDG_DESKTOP_DIR,
        join(os.homedir(), "Desktop"),
        join(os.homedir(), "桌面"),
    ].filter((path): path is string => path !== undefined);

    for (const path of candidates) {
        if (validatePath(path)) { return path; }
    }
    return os.homedir();
}

// 路径有效性验证
function validatePath(path: string): boolean {
    try {
        return fs.existsSync(path) && fs.statSync(path).isDirectory();
    } catch (e) {
        return false;
    }
}




export { exec, showMessage, getConfig, runInTerminal, isSolonProject, getDesktopPath };



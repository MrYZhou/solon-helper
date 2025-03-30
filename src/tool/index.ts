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


// 获取指定内容行的行号
function getLineInFile(text: string, targetLine: string): number {
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === targetLine.trim()) {
            return i + 1;
        }
    }
    return -1;
}
// 获取第 n 行的内容
function getNthLine(text: string, n: number): string {
    // 分割文本为行数组
    const lines = text.split("\n");
    // 检查行号是否有效
    if (n > 0 && n <= lines.length) {
        // 返回第 n 行的内容（记住数组索引是从0开始的）
        return lines[n - 1]; // trim() 用于移除行首尾的空白字符
    } else {
        // 如果行号无效，可以返回 null 或者抛出错误
        return '';
    }
}
function getLineSpace(line: string) {
    let count = 0;
    for (let char of line) {
        if (char === ' ') {
            count++;
        } else {
            break;
        }
    }
    return count;
}

let addline: string;
// 获取上层限定
function getPrefix(content: string, line: string, prefix: string, currentNum: number): string {
    let num = currentNum > 0 ? currentNum : getLineInFile(content, line);

    let count = getLineSpace(line);
    // 说明存在上层key
    if (count > 0) {
        let lastNum = num;
        let lastLine = '';
        let spaceCount = 0;
        do {
            lastNum--;
            lastLine = getNthLine(content, lastNum);
            // 获取行的缩进
            spaceCount = getLineSpace(lastLine);
            if (lastNum === 0) { break; }

            // 找上一个不是空行的line且空格缩进只能递减的
        } while (lastLine.trim() === '' || spaceCount >= count || lastLine.trim().startsWith('-'));
        prefix = getPrefix(content, lastLine,
            lastLine.endsWith(':') ?
                lastLine.trim().replace(':', '') :
                lastLine.split(':')[0].trim(),
            lastNum) + prefix;
    }
    // 最后一次递归就不用在拼点了。
    return prefix.endsWith('.') ? prefix : prefix + '.';
}

/**
 * 添加键到json对象
 * @param currentObj 当前json 
 * @param keys 
 * @param index 
 * @param defaultValue 键值 
 * @returns 
 */
const addKeysToJSON = (currentObj: any, keys: string[], index = 0, defaultValue = '') => {
    let currentKey = keys[index];
    if (index + 1 < keys.length) {
        // 如果不是最后一个键，则继续深入层级
        if (!currentObj[currentKey]) {
            // 如果键不存在，创建一个新的对象
            currentObj[currentKey] = {};
        }
        return addKeysToJSON(currentObj[currentKey], keys, index + 1, defaultValue);
    } else {
        // 当到达最后一个键时，初始化其值（这里设为空字符串）
        if (currentObj[currentKey]) { defaultValue = currentObj[currentKey]; }
        currentObj[currentKey] = defaultValue;
        addline = defaultValue ? `${currentKey}: ${defaultValue}` : `${currentKey}: ''`;
        return addline;
    }
};

/**
 * 子路径在不在全路径中
 * @param subPath 子路径
 * @param mainPath 全路径
 * @returns 
 */
function isSubPath(subPath: string, mainPath: string) {
    let subParts = subPath.replace('.', '').split('');
    let mainParts = mainPath.replace('.', '').split('');

    let subIndex = 0;
    let mainIndex = 0;

    while (mainIndex < mainParts.length && subIndex < subParts.length) {
        if (subParts[subIndex] === mainParts[mainIndex]) {
            subIndex++;
        }
        mainIndex++;
    }
    return subIndex === subParts.length;
}
function getAllKeys(obj: any, keys: string[] = []) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (key.includes('.')) { keys.push(key); }
            if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                getAllKeys(obj[key], keys);
            }
        }
    }
    return keys;
}
function getOrderKey(key: string, arr: string[]): string[] {
    if (!key) { return []; };
    for (let index = 0; index < arr.length; index++) {
        const center = arr[index];
        // 处理 'e.a.a2' 会被 'a.a' 这种子结构匹配。故下一个字符判断是点或末尾代表不是其他子串的情况
        if (key.includes(center) && ['.', ''].includes(key.charAt(key.indexOf(center) + center.length))) {
            const keyArr = key.split(center);
            return [
                ...getOrderKey(keyArr[0].slice(0, -1), arr),
                center,
                ...getOrderKey(keyArr[1].slice(1), arr),
            ];
        }
    }
    return key.split(".");
}

export { exec, showMessage, getConfig, runInTerminal, isSolonProject, getDesktopPath, getPrefix, addKeysToJSON, getLineInFile, isSubPath, getAllKeys,getOrderKey };



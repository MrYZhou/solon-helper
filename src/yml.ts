import * as vscode from 'vscode';
import { YmlConfig, HintType, HintValue } from './tool/type';
import { getPrefix, addKeysToJSON, getLineInFile, isSubPath, getAllKeys, getOrderKey, getRepositoryPath } from './tool';
import * as path from 'path';
import * as  fs from 'fs';

let yaml: any;
let tool: any;
let pathInfo: any;
let AdmZip: any;
class MyInjectCompletionProvider implements vscode.CompletionItemProvider {
    async provideCompletionItems(document: any, position: { character: any; }) {
        let lineText: string = document.lineAt(position).text.substring(0, position.character);

        let key = '';
        if (lineText) {
            lineText = lineText.trim();
            if (!lineText.startsWith("@Inject(")) {
                return null;
            }
            //解析数据,获取引号内的字符
            const tipMatch = lineText.match(/"(.*)/);
            if (tipMatch) { key = tipMatch[1]; };
            // 字符是空则不提示
            if (!key) { return; };
        }
        // 添加补全建议
        const editor = vscode.window.activeTextEditor as vscode.TextEditor;
        let items: vscode.CompletionItem[] = [];
        let config: YmlConfig[] = await getYmlTips();
        let allTips = await getAllInjectTip();
        config.forEach(element => {
            // 当前输入的字符是项目中已经配置的属性且是属性的子串
            if (allTips.includes(element.name) && isSubPath(key, element.name)) {
                let tip = new vscode.CompletionItem(element.name, vscode.CompletionItemKind.Property);
                tip.detail = element.description;
                tip.command = {
                    command: 'solon-helper.acceptComplete', title: '',
                    arguments: [editor, element]
                };
                let values: HintValue[] = hintMap[element.name];
                let detail = '';
                if (values) {
                    values.forEach(item => {
                        detail += '- ' + item.description + ': ' + item.value + '\n';
                    });
                }
                // 如果存在hint,增加可选值显示
                if (detail) {
                    let markdown = new vscode.MarkdownString();
                    markdown.isTrusted = true;
                    markdown.appendMarkdown(detail);
                    tip.documentation = markdown;
                }

                items.push(tip);
            }
        });
        return { items };
    }
}
class MyYamlCompletionProvider implements vscode.CompletionItemProvider {
    async provideCompletionItems(document: any, position: { character: any; }) {
        let line: string = document.lineAt(position).text.substring(0, position.character);
        if (line.trim().endsWith(':') || line.trim().startsWith('-')) { return null; }

        const editor = vscode.window.activeTextEditor as vscode.TextEditor;
        let content = editor.document.getText();
        let prefixKey = getPrefix(content, line, '', -1);
        let subPath = (prefixKey === '.' ? '' : prefixKey) + line.trim();

        // 添加补全建议
        let items: vscode.CompletionItem[] = [];
        let config: YmlConfig[] = await getYmlTips();
        config.forEach(element => {
            if (isSubPath(subPath, element.name)) {
                let tip = new vscode.CompletionItem(element.name, vscode.CompletionItemKind.Property);
                tip.detail = element.description;
                tip.command = {
                    command: 'solon-helper.acceptComplete', title: '',
                    arguments: [editor, element]
                };
                let values: HintValue[] = hintMap[element.name];
                let detail = '';
                if (values) {
                    values.forEach(item => {
                        detail += '- ' + item.description + ': ' + item.value + '\n';
                    });
                }
                // 如果存在hint,增加可选值显示
                if (detail) {
                    let markdown = new vscode.MarkdownString();
                    markdown.isTrusted = true;
                    markdown.appendMarkdown(detail);
                    tip.documentation = markdown;
                }

                items.push(tip);
            }
        });
        return { items };
    }

}

function getAllInjectTip() {
    return new Promise<string[]>(async (resolve, reject) => {
        // 1.读取src/main目录下所有的yml和yaml结尾的文件的内容
        const pathInfo = await tool.getConfig();
        let allTips: string[] = [];
        const resourcesPath = vscode.Uri.file(path.join(pathInfo.workspaceDir, "src", "main", "resources"));
        let entries = await vscode.workspace.fs.readDirectory(resourcesPath);
        let jsonData = {};
        for (const [fileName, fileType] of entries) {
            if (fileName.endsWith('.yml') || fileName.endsWith('.yaml')) {
                const filePath = resourcesPath.with({ path: `${resourcesPath.path}/${fileName}` });
                const content = await vscode.workspace.fs.readFile(filePath);
                const doc = yaml.load(content, 'utf8');
                jsonData = { ...jsonData, ...doc };               
            }
        }
        // todo json变扁平key
        resolve(allTips);
    });

}
let addline: string;
/**
 * yml提示功能
 * @param context 
 * @returns 
 */
const initYmlSuggestion = async (context: vscode.ExtensionContext) => {
    if (!tool) {
        tool = await import('./tool');
    }
    // 如果不是solon项目不提示，避免和boot提示冲突。
    if (!tool.isSolonProject()) { return null; };
    if (!AdmZip) { AdmZip = require('adm-zip'); }
    if (!yaml) { yaml = require('js-yaml'); }
    pathInfo = await tool.getConfig();

    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
        ['yaml', 'yml'],
        new MyYamlCompletionProvider()
    ));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
        ['java'],
        new MyInjectCompletionProvider()
    ));
    // inject hover tip
    context.subscriptions.push(vscode.languages.registerHoverProvider('java', {
        async provideHover(document, position) {
            try {
                let line = document.lineAt(position.line);
                let lineText = line.text;
                if (lineText) {
                    lineText = lineText.trim();
                    if (!lineText.startsWith("@Inject(")) {
                        return null;
                    }
                    //解析数据,获取引号内的字符
                    let key = '';
                    const tipMatch = lineText.match(/"(.*)"/);
                    if (tipMatch) { key = tipMatch[1]; };
                    if (!key) { return; };
                    // 获取到当前yml中配置的属性
                    let config: YmlConfig[] = await getYmlTips();
                    let hoverMessage = '';
                    for (let index = 0; index < config.length; index++) {
                        const element = config[index];
                        if (element.name === key) {
                            hoverMessage = element.description;
                            break;
                        }
                    }
                    return new vscode.Hover(hoverMessage);
                }

            } catch (error) {
                return null;
            }
        }
    }));
    context.subscriptions.push(vscode.languages.registerHoverProvider('yaml', {
        async provideHover(document, position) {
            try {
                let line = document.lineAt(position.line);
                let content = document.getText();
                let lineText = line.text;
                let prefixKey = getPrefix(content, lineText, '', -1);
                let subPath = (prefixKey === '.' ? '' : prefixKey) + lineText.trim();
                let key = subPath.includes(":") ? subPath.split(":")[0] : subPath;
                let config: YmlConfig[] = await getYmlTips();
                let hoverMessage = '';
                for (let index = 0; index < config.length; index++) {
                    const element = config[index];
                    if (element.name === key) {
                        hoverMessage = element.description;
                        break;
                    }
                }
                return new vscode.Hover(hoverMessage);
            } catch (error) {
                return null;
            }
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('solon-helper.acceptComplete', (editor, element: YmlConfig) => {
        // 读取yml配置信息,更新key后写入文件
        try {
            let addKey = element.name;
            let defaultValue = element.defaultValue ? element.defaultValue : '';
            // 获取文档
            const document = editor.document;
            // 执行编辑操作
            editor.edit((editBuilder: any) => {
                let originContent = document.getText().replace(addKey, '');
                const doc = yaml.load(originContent, 'utf8');
                let compositeKey: string[] | undefined = [];
                getAllKeys(doc, compositeKey);

                let orderArr: string[] = getOrderKey(addKey, compositeKey);
                addline = addKeysToJSON(doc, orderArr, 0, defaultValue as string);

                let newYamlData = yaml.dump(doc, {
                    'styles': { '!!null': 'canonical' },
                    'sortKeys': false        // sort object keys
                });

                editBuilder.replace(new vscode.Range(document.lineAt(0).range.start, document.lineAt(document.lineCount - 1).range.end), newYamlData);
            }).then(() => {
                // 成功替换后跳转指定行，鼠标focus
                const editor = vscode.window.activeTextEditor as vscode.TextEditor;
                if (editor) {
                    let originContent = editor.document.getText();
                    const lineNum = getLineInFile(originContent, addline);
                    if (lineNum < 0) { return; };
                    const line = editor.document.lineAt(lineNum - 1);
                    const endOfLinePosition = new vscode.Position(lineNum - 1,
                        line.text.endsWith("'") ? line.text.length - 1 : line.text.length);
                    const selection = new vscode.Selection(endOfLinePosition, endOfLinePosition);
                    editor.selection = selection;
                    // focus至于中心
                    const targetRange = new vscode.Range(endOfLinePosition, endOfLinePosition);
                    editor.revealRange(targetRange, vscode.TextEditorRevealType.InCenter);
                }
            }).catch((error: any) => {
                // 错误处理
                vscode.window.showErrorMessage(`Failed to replace file content: ${error}`);
            });
        } catch (e) {
            console.log(e);
        }
    }));

};


let ymlTips: YmlConfig[];
let extensionPath: any = '';
let currentkey: string[] = [];
let hintMap: any = {};
// 处理下拉数据封装到title
function solveData(config: any): YmlConfig[] {
    let res: YmlConfig[] = [];
    config.properties.forEach((data: YmlConfig) => {
        if (!currentkey.includes(data.name)) {
            res.push(data);
            currentkey.push(data.name);
        }
    });
    // 存在hint
    if (config.hints) {
        config.hints.forEach((element: HintType) => {
            hintMap[element.name] = element.values;
        });
    }
    return res;
}
let targetDir: string;

function getYmlTips() {
    return new Promise<YmlConfig[]>(async (resolve, reject) => {
        try {
            if (!ymlTips || ymlTips.length === 0) {
                ymlTips = [];
                extensionPath = vscode.extensions.getExtension('larry.solon-helper')?.extensionPath;
                // 解压到json文件目录
                targetDir = path.join(extensionPath, 'resources');
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }
                const resourcesPath = vscode.Uri.file(`${extensionPath}/resources/`);
                let entries = await vscode.workspace.fs.readDirectory(resourcesPath);
                // 创建配置json
                ymlInit(pathInfo.workspaceDir);
                // 读取配置json
                entries.forEach(async (entry) => {
                    const fileName = entry[0];
                    const filePath = resourcesPath.with({ path: `${resourcesPath.path}/${fileName}` });
                    const content = await vscode.workspace.fs.readFile(filePath);
                    const configContent = content.toString();
                    const config = JSON.parse(configContent);
                    ymlTips = ymlTips.concat(solveData(config));
                });
            }
            resolve(ymlTips);
        } catch (error) {
            console.log(error);
            reject(error);
        }
    });
}

async function ymlInit(projectPath: string) {
    Promise.all([
        getRepositoryPath(),
        tool.exec("mvn dependency:tree", projectPath),
    ]).then(async (res) => {
        const baseDir = res[0];
        const result = res[1];
        const lines = result.split("\r\n");
        lines.forEach(async (input: string) => {
            const pattern = /-\s(.*):compile/;
            const match = input.match(pattern);
            if (match) {
                const matchedContent = match[1];
                const content = matchedContent.split(":");
                const groupId = content[0];
                const artifactId = content[1];
                const version = content[3];
                initJson(baseDir, groupId, artifactId, version);
            }
        });


    });
}
// 生成到插件内部目录
async function initJson(baseDir: string, groupId: string, artifactId: string, version: string) {
    // 在不在本地仓库中
    const jarPath = `${baseDir}/${groupId.replace(
        /\./g,
        "/"
    )}/${artifactId}/${version}/${artifactId}-${version}.jar`;
    // 确保目标jar存在
    if (!fs.existsSync(jarPath)) {
        // 下载到本地仓库
        let getCommand = `mvn dependency:get -DgroupId=${groupId} -DartifactId=${artifactId} -Dversion=${version} -DrepoUrl=https://mirrors.cloud.tencent.com/nexus/repository/maven-public/`;
        await tool.exec(getCommand, "./");
    }
    createJson(targetDir, jarPath, artifactId + "-" + version);
}

function createJson(targetDir: string, jarPath: string, jarTag: string) {
    const targetFilePath = path.join(targetDir, jarTag + ".json");
    // 检测缓存文件
    if (fs.existsSync(targetFilePath)) {
        return targetFilePath;
    }
    const zip = new AdmZip(jarPath);
    const zipEntry = zip.getEntry(
        "META-INF/solon/solon-configuration-metadata.json"
    );
    // 读取文件内容并写入目标文件
    if (zipEntry) {
        const fileData = zipEntry.getData().toString("utf8");
        fs.writeFileSync(targetFilePath, fileData);
    }
}

export { initYmlSuggestion };
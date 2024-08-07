import * as vscode from 'vscode';
import { YmlConfig } from './tool/type';
let yaml: any;
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
class MyYamlCompletionProvider implements vscode.CompletionItemProvider {
    async provideCompletionItems(document: any, position: { character: any; }, token: any, context: any) {
        const tool = await import('./tool');
        if (!yaml) { yaml = require('js-yaml'); }
        // 如果不是solon项目不提示，避免和boot提示冲突。
        if (!tool.isSolonProject()) { return null; };

        let line: string = document.lineAt(position).text.substring(0, position.character);
        if (line.trim().endsWith(':') || line.trim().startsWith('-')) { return null; }

        const editor = vscode.window.activeTextEditor as vscode.TextEditor;
        let content = editor.document.getText();
        let prefixKey = getPrefix(content, line, '', -1);
        let subPath = (prefixKey === '.' ? '' : prefixKey) + line.trim();

        // 添加补全建议
        let items: vscode.CompletionItem[] = [];
        let config: YmlConfig[] = await tool.getYmlTips();
        config.forEach(element => {
            if (isSubPath(subPath, element.name)) {
                let tip = new vscode.CompletionItem(element.name, vscode.CompletionItemKind.Property);
                tip.detail = element.description;
                tip.command = {
                    command: 'solon-helper.acceptComplete', title: '',
                    arguments: [editor, element]
                };
                let markdown = new vscode.MarkdownString(element.moreDetail);
                markdown.isTrusted = true;
                tip.documentation = markdown;
                items.push(tip);
            }
        });
        return { items };
    }

    resolveCompletionItem(item: any, token: any) {
        // 高级功能定制
        return item;
    }
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
const initYmlSuggestion = (context: vscode.ExtensionContext) => {
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
        ['yaml', 'yml'],
        new MyYamlCompletionProvider()
    ));
    context.subscriptions.push(vscode.commands.registerCommand('solon-helper.acceptComplete', (editor, element: YmlConfig) => {
        // 读取yml配置信息,更新key后写入文件
        try {
            let addKey = element.name;
            let defaultValue = element.defaultValue;
            // 获取文档
            const document = editor.document;
            // 执行编辑操作
            editor.edit((editBuilder: any) => {
                let originContent = document.getText().replace(addKey, '');
                const doc = yaml.load(originContent, 'utf8');

                let compositeKey: string[] | undefined = [];
                getAllKeys(doc, compositeKey);

                // todo 处理复合key生成
                // doc['solon.app'].a=111;

                let newYamlData = yaml.dump(doc, {
                    'styles': { '!!null': 'canonical' },
                    'sortKeys': false        // sort object keys
                });

                editBuilder.replace(new vscode.Range(document.lineAt(0).range.start, document.lineAt(document.lineCount - 1).range.end), newYamlData);
            }).then(() => {
                // todo 成功替换后跳转指定行，鼠标focus

            }).catch((error: any) => {
                // 错误处理
                vscode.window.showErrorMessage(`Failed to replace file content: ${error}`);
            });
        } catch (e) {
            console.log(e);
        }
    }));

};
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
export { initYmlSuggestion };
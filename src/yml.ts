import * as vscode from 'vscode';
import * as path from 'path';
import * as  fs from 'fs';

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

        let trigger = context.triggerCharacter;

        try {
            // 读取配置json
            const configContent = fs.readFileSync(path.join(__filename, '..', '..', 'resources', 'solon-configuration-metadata.json'), 'utf8');

        } catch (e) {
            console.log(e);
        }

        // 读取yml配置信息
        try {
            const doc = yaml.load(content, 'utf8');
            console.log(doc);
        } catch (e) {
            console.log(e);
        }

        // 添加补全建议

        let tip1 = new vscode.CompletionItem('server.http.gzip.mimeTypes', vscode.CompletionItemKind.Property);
        tip1.detail = 'gzip 启用类型';
        let markdown = new vscode.MarkdownString(`gzip 启用类型<br>
            更多内容参考: [https://code.visualstudio.com/api/references/icons-in-labels#icon-listing](https://code.visualstudio.com/api/references/icons-in-labels#icon-listing)`);
        markdown.isTrusted = true;
        tip1.documentation = markdown;
        return {
            items: [
                tip1,
                new vscode.CompletionItem('solon.app.ff', vscode.CompletionItemKind.Property),
                new vscode.CompletionItem('attribute2', vscode.CompletionItemKind.Property),
            ]
        };
    }

    resolveCompletionItem(item: any, token: any) {
        // 高级功能定制
        return item;
    }
}
const initYmlSuggestion = (context: vscode.ExtensionContext) => {
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
        ['yaml', 'yml'],
        new MyYamlCompletionProvider()
    ));
};

export { initYmlSuggestion };
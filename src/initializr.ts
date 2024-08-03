import * as vscode from 'vscode';
import * as path from 'path';
const fetch = require('node-fetch');
const AdmZip = require('adm-zip');
import * as  fs from 'fs';
import * as tool from './tool';

const os = require('os');
const initInitializr = (context: vscode.ExtensionContext) => {
    context.subscriptions.push(vscode.commands.registerCommand('solon.initSolonProject', showDialog));
};
const dependenciesMap: any = {
    'Solon Api': 'solon-api',
    'Solon Lib': 'solon-core',
    'Solon Job': 'solon-job',
    'Solon Web': 'solon-web',
    'Solon Rpc': 'solon-rpc',
};
const javaVerMap: any = {
    'Java 22': '22',
    'Java 21': '21',
    'Java 17': '17',
    'Java 11': '11',
    'Java 8': '1.8'
};
const showDialog = async () => {
    const items: vscode.QuickPickItem[] = [
        { label: 'Solon Api', description: 'Solon Lib + Smart-Http + StaticFiles + Cors', detail: 'A full-featured Solon application with extra libraries.' },
        { label: 'Solon Lib', description: 'Solon base shortcut package', detail: 'The core library for building Solon applications.' },
        { label: 'Solon Job', description: 'Solon Lib + Scheduling Simple', detail: 'For scheduling tasks in your Solon application.' },
        { label: 'Solon Web', description: 'Solon Api + Freemarker + SessionState', detail: 'Web application template with view engine and session management.' },
        { label: 'Solon Rpc', description: 'Solon Api + Nami + Json + Hessian', detail: 'RPC service support with various serialization formats.' }
    ];
    let res = await vscode.window.showQuickPick(items, {
        title: '创建solon项目',
        placeHolder: '请选择开发包组合',
        ignoreFocusOut: true,
    });
    if (!res) { return; }
    const dependencies = dependenciesMap[res.label];

    let javaVer = await vscode.window.showQuickPick([
        'Java 22', 'Java 21', 'Java 17', 'Java 11', 'Java 8'], {
        title: '创建solon项目',
        placeHolder: '请选择java版本', ignoreFocusOut: true
    });
    if (!javaVer) { return; }
    javaVer = javaVerMap[javaVer];

    let project = await vscode.window.showQuickPick([
        'Maven', 'Gradle'], {
        title: '创建solon项目',
        placeHolder: '请选择构建方式', ignoreFocusOut: true
    });
    if (!project) { return; }
    project = project === 'Gradle' ? 'gradle_kotlin' : 'maven';

    let projectName = await vscode.window.showInputBox({
        title: '创建solon项目',
        placeHolder: '请输入项目名称,或使用默认',
        ignoreFocusOut: true,
        prompt: '项目名称'
    });
    if (!projectName) { projectName = dependencies + '-app'; }

    let workDir = path.join(os.homedir(), 'Desktop');
    let item = await vscode.window.showQuickPick(['桌面', '自定义'], {
        title: '创建solon项目',
        placeHolder: '请选择工作目录',
        ignoreFocusOut: true
    });
    if (!item) { return; }
    if (item === '自定义') {
        let files = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
        });
        if (files) {
            workDir = files[0].fsPath;
        } else {
            let res = await vscode.window.showInformationMessage('选择了取消,是否生成到桌面',
                '确定', '不用了'
            );
            if (res === '不用了') {
                workDir = '';
            }
        }
    }

    // 下载项目
    if (workDir) {
        let projectPath = path.join(workDir, projectName);
        let res = await downLoad({ dependencies, javaVer, project, projectPath });
        if (res) {
            await tool.execFn('code .', projectPath);
        }
    }
};
const downLoad = (data: any) => {
    return new Promise((resolve) => {

        let url = `https://solon.noear.org/start/build.do?javaVer=${data.javaVer}&dependencies=${data.dependencies}&project=${data.project}`;

        fetch(url).then((res: any) => {
            res.body?.pipe(fs.createWriteStream(data.projectPath + '.zip').on('finish', () => {
                const unzip = new AdmZip(data.projectPath + '.zip'); // 下载压缩包
                unzip.extractAllTo(data.projectPath, /* overwrite*/ true); // 解压替换本地文件
                fs.unlink(path.join(data.projectPath + '.zip'), () => { });
                resolve(true);
            }));
        }).catch((e: any) => {
            //自定义异常处理
            resolve(false);
        });
    });
};
export { initInitializr };
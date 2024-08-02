import * as vscode from 'vscode';
import path = require('path');
import fetch from 'node-fetch';
import * as  fs from 'fs';
import * as tool from './tool';

const os = require('os');
const initInitializr = (context: vscode.ExtensionContext) => {
    context.subscriptions.push(vscode.commands.registerCommand('solon.helper.initSolonProject', showDialog));
};
const dependenciesMap: any = {
    'Solon Api':'solon-api',
    'Solon Lib':'solon-core',
    'Solon Job':'solon-job',
    'Solon Web':'solon-web',
    'Solon Rpc':'solon-rpc',
};
const showDialog = async () => {
    let a = await downLoad({javaVer:'22',dependencies:'solon-api'});
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
        let res = await downLoad({javaVer,dependencies});
        if(res){
            await tool.execFn('code .','');
        }
    }
};
const downLoad = (body:any) => {
    return new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream('./app.zip');
        fileStream.on('finish', () => {
            console.log('下载完成');
            resolve(true);
        });

        let url = 'https://solon.noear.org/start/build.do';
        fetch(url, {
            method: 'post',
            body
        }).then(res => {
            res.body?.pipe(fileStream);
        }).catch(e => {
            //自定义异常处理
            console.log(e);
            resolve(false);
        });
    });
};
export { initInitializr};
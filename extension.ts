/**
该代码以一系列导入语句开始，引入扩展功能所需的各种模块和文件。
值得注意的导入包括与配置验证、VSCode API (vscode)、扩展基本功能、全局变量、日志记录和路径操作相关的模块。
配置验证器：
导入不同配置设置的验证器。 这些验证器可能会检查并确保配置设置正确。
 */

/**
 * Extension.ts is a lightweight wrapper around ModeHandler. It converts key
 * events to their string names and passes them on to ModeHandler via
 * handleKeyEvent().
 */
import './src/actions/include-main';
import './src/actions/include-plugins';

/**
 * Load configuration validator
 */

import './src/configuration/validators/inputMethodSwitcherValidator';
import './src/configuration/validators/remappingValidator';
import './src/configuration/validators/neovimValidator';
import './src/configuration/validators/vimrcValidator';

import * as vscode from 'vscode';
import { activate as activateFunc, registerCommand, registerEventListener } from './extensionBase';
import { Globals } from './src/globals';
import { Register } from './src/register/register';
import { vimrc } from './src/configuration/vimrc';
import { configuration } from './src/configuration/configuration';
import * as path from 'path';
import { Logger } from './src/util/logger';

export { getAndUpdateModeHandler } from './extensionBase';

/**
当扩展被激活时会自动调用。
该函数通过设置存储路径并调用activateFunc函数来初始化和配置扩展。
注册事件侦听器来处理文本文档的保存。 如果启用了 Vim 模拟并保存了 .vimrc 文件，则扩展将重新加载配置。
注册一个命令以在编辑器中打开用户的 .vimrc 文件。
 */
export async function activate(context: vscode.ExtensionContext) {
  // Set the storage path to be used by history files
  Globals.extensionStoragePath = context.globalStoragePath;

  console.log('ruo-vim-test===>extension--activate',)

  await activateFunc(context);

  registerEventListener(context, vscode.workspace.onDidSaveTextDocument, async (document) => {
    if (
      configuration.vimrc.enable &&
      vimrc.vimrcPath &&
      path.relative(document.fileName, vimrc.vimrcPath) === ''
    ) {
      // TODO: Should instead probably call `loadConfiguration` (in extensionBase.ts)
      await configuration.load();
      Logger.info('Sourced new .vimrc');
    }
  });

  registerCommand(
    context,
    'vim.editVimrc',
    async () => {
      if (vimrc.vimrcPath) {
        const document = await vscode.workspace.openTextDocument(vimrc.vimrcPath);
        await vscode.window.showTextDocument(document);
      } else {
        await vscode.window.showWarningMessage('No .vimrc found. Please set `vim.vimrc.path.`');
      }
    },
    false,
  );
}

/**
 * 当扩展被停用时，会调用 deactivate 函数。 它将 Vim 寄存器保存到磁盘。
 */
export async function deactivate() {
  await Register.saveToDisk(true);
}

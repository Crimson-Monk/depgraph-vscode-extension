import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { DepGraphRunnerService } from '../analyzer/depgraphRunner';
import { ImpactReport, OutputJSON } from '../types';

export class DepGraphPanel {
  public static currentPanel: DepGraphPanel | undefined;
  public static readonly viewType = 'depgraphVisualizer';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionContext: vscode.ExtensionContext;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionContext: vscode.ExtensionContext) {
    this._panel = panel;
    this._extensionContext = extensionContext;

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async message => {
        switch (message.command) {
          case 'READY':
            const cached = DepGraphRunnerService.getCachedOutput();
            if (cached) {
              this.updateGraphData(cached);
            } else {
              await this.triggerRescan();
            }
            break;

          case 'OPEN_FILE_LOCATION':
            await this.openFileLocation(message.file, message.line);
            break;

          case 'SIMULATE_NODE_IMPACT':
            await this.simulateNodeImpact(message.nodeId, message.nodeName);
            break;

          case 'SIMULATE_GIT_IMPACT':
            await this.simulateGitImpact();
            break;

          case 'REQUEST_RESCAN':
            await this.triggerRescan();
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public static createOrShow(extensionContext: vscode.ExtensionContext): DepGraphPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (DepGraphPanel.currentPanel) {
      DepGraphPanel.currentPanel._panel.reveal(column);
      return DepGraphPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      DepGraphPanel.viewType,
      'DepGraph Visualizer',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(extensionContext.extensionPath, 'dist', 'media')),
          vscode.Uri.file(path.join(extensionContext.extensionPath, 'src', 'webview', 'media'))
        ]
      }
    );

    DepGraphPanel.currentPanel = new DepGraphPanel(panel, extensionContext);
    return DepGraphPanel.currentPanel;
  }

  public updateGraphData(data: OutputJSON): void {
    this._panel.webview.postMessage({ command: 'SET_GRAPH_DATA', data });
  }

  public showImpact(impact: ImpactReport): void {
    this._panel.webview.postMessage({ command: 'HIGHLIGHT_IMPACT', impact });
  }

  private async triggerRescan(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showWarningMessage('DepGraph: No workspace folder open.');
      return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'DepGraph: Analyzing workspace dependencies...',
        cancellable: false
      },
      async () => {
        try {
          const result = await DepGraphRunnerService.runAnalysis({ workspacePath }, this._extensionContext);
          this.updateGraphData(result);
          vscode.window.setStatusBarMessage(`DepGraph: Analyzed ${result.summary.totalNodes} nodes across ${result.meta.totalFiles} files`, 4000);
        } catch (err: any) {
          vscode.window.showErrorMessage(`DepGraph analysis error: ${err.message || err}`);
        }
      }
    );
  }

  private async simulateNodeImpact(nodeId: string, nodeName: string): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) { return; }
    const workspacePath = workspaceFolders[0].uri.fsPath;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `DepGraph: Simulating impact for ${nodeName}...`,
        cancellable: false
      },
      async () => {
        try {
          const result = await DepGraphRunnerService.runAnalysis(
            { workspacePath, impactTarget: nodeName, impactDescription: `Simulating changes to ${nodeName}` },
            this._extensionContext
          );
          if (result.impact) {
            this.showImpact(result.impact);
          } else {
            this.updateGraphData(result);
          }
        } catch (err: any) {
          vscode.window.showErrorMessage(`Impact simulation error: ${err.message || err}`);
        }
      }
    );
  }

  private async simulateGitImpact(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) { return; }
    const workspacePath = workspaceFolders[0].uri.fsPath;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'DepGraph: Simulating uncommitted git impact...',
        cancellable: false
      },
      async () => {
        try {
          const result = await DepGraphRunnerService.runAnalysis(
            { workspacePath, gitImpact: true },
            this._extensionContext
          );
          if (result.impact) {
            this.showImpact(result.impact);
          } else {
            this.updateGraphData(result);
          }
        } catch (err: any) {
          vscode.window.showErrorMessage(`Git impact simulation error: ${err.message || err}`);
        }
      }
    );
  }

  private async openFileLocation(filePath: string, line: number): Promise<void> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      let targetUri: vscode.Uri;

      if (path.isAbsolute(filePath)) {
        targetUri = vscode.Uri.file(filePath);
      } else if (workspaceFolders && workspaceFolders.length > 0) {
        targetUri = vscode.Uri.file(path.join(workspaceFolders[0].uri.fsPath, filePath));
      } else {
        return;
      }

      const doc = await vscode.workspace.openTextDocument(targetUri);
      const editor = await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.One });

      const targetLine = Math.max(0, (line || 1) - 1);
      const pos = new vscode.Position(targetLine, 0);
      editor.selection = new vscode.Selection(pos, pos);
      editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
    } catch (err: any) {
      vscode.window.showErrorMessage(`DepGraph: Unable to open file ${filePath}: ${err.message || err}`);
    }
  }

  private _update(): void {
    const webview = this._panel.webview;
    this._panel.title = 'DepGraph Visualizer';
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const mediaDir = fs.existsSync(path.join(this._extensionContext.extensionPath, 'dist', 'media'))
      ? path.join(this._extensionContext.extensionPath, 'dist', 'media')
      : path.join(this._extensionContext.extensionPath, 'src', 'webview', 'media');

    const htmlPath = path.join(mediaDir, 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    const cssUri = webview.asWebviewUri(vscode.Uri.file(path.join(mediaDir, 'main.css')));
    const cytoscapeUri = webview.asWebviewUri(vscode.Uri.file(path.join(mediaDir, 'cytoscape.min.js')));
    const visualizerUri = webview.asWebviewUri(vscode.Uri.file(path.join(mediaDir, 'visualizer.js')));

    html = html.replace('href="main.css"', `href="${cssUri}"`);
    html = html.replace('src="cytoscape.min.js"', `src="${cytoscapeUri}"`);
    html = html.replace('src="visualizer.js"', `src="${visualizerUri}"`);

    return html;
  }

  public dispose(): void {
    DepGraphPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}

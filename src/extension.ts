import * as path from 'path';
import * as vscode from 'vscode';
import { DepGraphRunnerService } from './analyzer/depgraphRunner';
import { DepGraphCodeLensProvider } from './codelens/depgraphCodeLens';
import { DepGraphPanel } from './webview/DepGraphPanel';

let statusBarItem: vscode.StatusBarItem;
let codeLensProvider: DepGraphCodeLensProvider;
let autoSaveDebounceTimer: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('DepGraph extension is now active!');

  // Register CodeLens Provider
  codeLensProvider = new DepGraphCodeLensProvider();
  const supportedLanguages = [
    'javascript',
    'typescript',
    'javascriptreact',
    'typescriptreact',
    'python',
    'go'
  ];

  for (const lang of supportedLanguages) {
    context.subscriptions.push(
      vscode.languages.registerCodeLensProvider({ language: lang, scheme: 'file' }, codeLensProvider)
    );
  }

  // Create Status Bar Item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'depgraph.openVisualizer';
  statusBarItem.text = '$(graph) DepGraph';
  statusBarItem.tooltip = 'Click to open DepGraph Dependency Visualizer';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Register Command: Open Visualizer
  const openVisualizerCmd = vscode.commands.registerCommand('depgraph.openVisualizer', async () => {
    const panel = DepGraphPanel.createOrShow(context);
    const cached = DepGraphRunnerService.getCachedOutput();
    if (!cached) {
      await runInitialWorkspaceAnalysis(context);
    }
  });

  // Register Command: Rescan Workspace
  const rescanCmd = vscode.commands.registerCommand('depgraph.rescanWorkspace', async () => {
    await runInitialWorkspaceAnalysis(context);
  });

  // Register Command: Simulate Impact of Current Entity
  const simulateImpactCmd = vscode.commands.registerCommand(
    'depgraph.simulateImpact',
    async (targetName?: string, targetId?: string) => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showWarningMessage('DepGraph: No workspace folder open.');
        return;
      }

      const editor = vscode.window.activeTextEditor;
      let entityToSimulate = targetName;

      // If entity name was not passed explicitly, attempt to detect word under editor cursor
      if (!entityToSimulate && editor) {
        const cursorPosition = editor.selection.active;
        const wordRange = editor.document.getWordRangeAtPosition(cursorPosition);
        if (wordRange) {
          entityToSimulate = editor.document.getText(wordRange);
        }
      }

      if (!entityToSimulate) {
        entityToSimulate = await vscode.window.showInputBox({
          prompt: 'Enter entity name to simulate impact (e.g. getUserById)',
          placeHolder: 'getUserById'
        });
      }

      if (!entityToSimulate) { return; }

      const panel = DepGraphPanel.createOrShow(context);
      const workspacePath = workspaceFolders[0].uri.fsPath;

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `DepGraph: Simulating blast radius for '${entityToSimulate}'...`,
          cancellable: false
        },
        async () => {
          try {
            const result = await DepGraphRunnerService.runAnalysis(
              {
                workspacePath,
                impactTarget: entityToSimulate,
                impactDescription: `Simulating changes to ${entityToSimulate}`
              },
              context
            );

            panel.updateGraphData(result);
            if (result.impact) {
              panel.showImpact(result.impact);
            }
            codeLensProvider.refresh();
          } catch (err: any) {
            vscode.window.showErrorMessage(`DepGraph impact simulation failed: ${err.message || err}`);
          }
        }
      );
    }
  );

  // Register Command: Analyze Uncommitted Git Impact
  const analyzeGitImpactCmd = vscode.commands.registerCommand('depgraph.analyzeGitImpact', async () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showWarningMessage('DepGraph: No workspace folder open.');
      return;
    }

    const panel = DepGraphPanel.createOrShow(context);
    const workspacePath = workspaceFolders[0].uri.fsPath;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'DepGraph: Analyzing uncommitted Git changes...',
        cancellable: false
      },
      async () => {
        try {
          const result = await DepGraphRunnerService.runAnalysis(
            { workspacePath, gitImpact: true },
            context
          );
          panel.updateGraphData(result);
          if (result.impact) {
            panel.showImpact(result.impact);
          }
          codeLensProvider.refresh();
        } catch (err: any) {
          vscode.window.showErrorMessage(`DepGraph Git impact failed: ${err.message || err}`);
        }
      }
    );
  });

  context.subscriptions.push(openVisualizerCmd, rescanCmd, simulateImpactCmd, analyzeGitImpactCmd);

  // Auto-rescan on file save (with debounce)
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      const config = vscode.workspace.getConfiguration('depgraph');
      const autoRescan = config.get<boolean>('autoRescanOnSave', true);
      const debounceMs = config.get<number>('autoRescanDebounceMs', 2000);

      if (!autoRescan) { return; }

      const ext = path.extname(document.fileName).toLowerCase();
      if (!['.js', '.ts', '.jsx', '.tsx', '.py', '.go'].includes(ext)) {
        return;
      }

      if (autoSaveDebounceTimer) {
        clearTimeout(autoSaveDebounceTimer);
      }

      autoSaveDebounceTimer = setTimeout(async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
          try {
            const workspacePath = workspaceFolders[0].uri.fsPath;
            const output = await DepGraphRunnerService.runAnalysis({ workspacePath }, context);
            codeLensProvider.refresh();

            if (DepGraphPanel.currentPanel) {
              DepGraphPanel.currentPanel.updateGraphData(output);
            }
          } catch (e) {
            console.error('Auto rescan background error:', e);
          }
        }
      }, debounceMs);
    })
  );

  // Initial background workspace scan if a workspace folder is open
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    runInitialWorkspaceAnalysis(context).catch(err => {
      console.error('Initial background analysis error:', err);
    });
  }
}

async function runInitialWorkspaceAnalysis(context: vscode.ExtensionContext) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) { return; }

  const workspacePath = workspaceFolders[0].uri.fsPath;
  try {
    const result = await DepGraphRunnerService.runAnalysis({ workspacePath }, context);
    if (codeLensProvider) {
      codeLensProvider.refresh();
    }
    if (statusBarItem) {
      statusBarItem.text = `$(graph) DepGraph: ${result.summary.totalNodes} nodes`;
    }
    if (DepGraphPanel.currentPanel) {
      DepGraphPanel.currentPanel.updateGraphData(result);
    }
  } catch (err: any) {
    console.error('Workspace initial analysis failed:', err);
  }
}

export function deactivate() {
  if (autoSaveDebounceTimer) {
    clearTimeout(autoSaveDebounceTimer);
  }
}

import * as path from 'path';
import * as vscode from 'vscode';
import { DepGraphRunnerService } from '../analyzer/depgraphRunner';
import { DepNode } from '../types';

export class DepGraphCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const config = vscode.workspace.getConfiguration('depgraph');
    if (!config.get<boolean>('enableCodeLens', true)) {
      return [];
    }

    const output = DepGraphRunnerService.getCachedOutput();
    if (!output || !output.nodes) {
      return [];
    }

    const codeLenses: vscode.CodeLens[] = [];
    const docPath = document.uri.fsPath;

    // Filter nodes matching this file
    const fileNodes = output.nodes.filter(node => {
      const normalizedNodePath = path.normalize(node.file);
      const normalizedDocPath = path.normalize(docPath);
      return normalizedDocPath.endsWith(normalizedNodePath) || normalizedNodePath.endsWith(normalizedDocPath);
    });

    for (const node of fileNodes) {
      const lineIndex = Math.max(0, node.line - 1);
      if (lineIndex >= document.lineCount) {
        continue;
      }

      const lineRange = document.lineAt(lineIndex).range;
      const isCritical = output.summary.criticalNodes.includes(node.id) || node.centralityScore >= 20;

      let title = `DepGraph: ${node.inDegree} Dependents | Centrality: ${node.centralityScore}`;
      if (isCritical) {
        title += ` | 🔥 Critical Node`;
      } else {
        title += ` | Complexity: ${node.complexity.toUpperCase()}`;
      }

      const codeLens = new vscode.CodeLens(lineRange, {
        title,
        tooltip: `Click to simulate impact of changing ${node.name}`,
        command: 'depgraph.simulateImpact',
        arguments: [node.name, node.id],
      });

      codeLenses.push(codeLens);
    }

    return codeLenses;
  }
}

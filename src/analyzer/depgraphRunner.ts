import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as vscode from 'vscode';
import { DepGraphRunOptions, OutputJSON } from '../types';

const execFileAsync = util.promisify(child_process.execFile);

export class DepGraphRunnerService {
  private static cachedOutput: OutputJSON | null = null;
  private static lastRunTimestamp: number = 0;

  /**
   * Resolves the absolute path to depgraph-core executable script.
   */
  private static getDepGraphCliPath(extensionContext?: vscode.ExtensionContext): string {
    try {
      const resolved = require.resolve('depgraph-core/depgraph.js');
      if (fs.existsSync(resolved)) {
        return resolved;
      }
    } catch (_) {
      // Fallback relative to workspace node_modules
    }

    if (extensionContext) {
      const inExtFolder = path.join(extensionContext.extensionPath, 'node_modules', 'depgraph-core', 'depgraph.js');
      if (fs.existsSync(inExtFolder)) {
        return inExtFolder;
      }
    }

    const localFallback = path.join(__dirname, '..', 'node_modules', 'depgraph-core', 'depgraph.js');
    if (fs.existsSync(localFallback)) {
      return localFallback;
    }

    // Default system fallback
    return 'depgraph';
  }

  /**
   * Runs depgraph-core analysis on the target workspace folder.
   */
  public static async runAnalysis(
    options: DepGraphRunOptions,
    extensionContext?: vscode.ExtensionContext
  ): Promise<OutputJSON> {
    const workspacePath = options.workspacePath;
    const tempOutputDir = path.join(workspacePath, '.vscode');
    if (!fs.existsSync(tempOutputDir)) {
      fs.mkdirSync(tempOutputDir, { recursive: true });
    }

    const outputPath = options.outputPath || path.join(tempOutputDir, 'depgraph-output.json');
    const cliPath = this.getDepGraphCliPath(extensionContext);

    const args: string[] = [workspacePath, '--output', outputPath];

    if (options.gitImpact) {
      args.push('--git-impact');
    } else if (options.impactTarget) {
      args.push('--impact', options.impactTarget, options.impactDescription || 'impact simulation');
    }

    try {
      if (cliPath.endsWith('.js')) {
        await execFileAsync(process.execPath, [cliPath, ...args], { cwd: workspacePath });
      } else {
        await execFileAsync(cliPath, args, { cwd: workspacePath });
      }

      if (!fs.existsSync(outputPath)) {
        throw new Error(`Analysis output file was not found at ${outputPath}`);
      }

      const fileContent = fs.readFileSync(outputPath, 'utf8');
      const parsed: OutputJSON = JSON.parse(fileContent);

      this.cachedOutput = parsed;
      this.lastRunTimestamp = Date.now();

      return parsed;
    } catch (error: any) {
      console.error('DepGraphRunnerService analysis error:', error);
      throw new Error(`DepGraph analysis failed: ${error.message || error}`);
    }
  }

  /**
   * Gets cached OutputJSON result if available.
   */
  public static getCachedOutput(): OutputJSON | null {
    return this.cachedOutput;
  }

  /**
   * Clears the cached graph analysis result.
   */
  public static clearCache(): void {
    this.cachedOutput = null;
    this.lastRunTimestamp = 0;
  }
}

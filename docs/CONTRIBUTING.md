# Contributing to DepGraph VS Code Extension

Thank you for your interest in contributing to the **DepGraph VS Code Extension**! This guide will walk you through setting up your development environment, building the extension, running tests, and submitting changes.

---

## 🛠️ Prerequisites

Before you begin, ensure you have installed:
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **VS Code**: `v1.80.0` or higher

---

## 🚀 Quickstart Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/arafat2020/depgraph-vscode-extension.git
   cd depgraph-vscode-extension
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the extension assets**:
   ```bash
   npm run build
   ```

---

## 💻 Running & Debugging in VS Code

1. Open the project folder in VS Code:
   ```bash
   code .
   ```

2. Start the watcher to automatically rebuild assets when modifying source files:
   ```bash
   npm run watch
   ```

3. Press **`F5`** (or go to **Run & Debug** `Cmd+Shift+D` $\rightarrow$ click **Run Extension**).

4. A new VS Code window titled **`[Extension Development Host]`** will open. In this window:
   - Open any workspace (such as [`samples/sample-project`](file:///Users/betopia/depgraph-vscode-extension/samples/sample-project)).
   - Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and type `DepGraph: Open Visualizer`.

---

## 🧪 Running Tests

We use `tsx` to run TypeScript unit & integration tests against sample fixtures.

Execute all automated tests with:
```bash
npm test
```

### Test Suite Structure
- `src/__tests__/runner.test.ts`: Verifies `DepGraphRunnerService` execution against `samples/sample-project`, checking parsed node counts, edge counts, and impact simulation risk scores.

---

## 📁 Repository Directory Map

```
vscode-depgraph/
├── docs/                     # Technical architecture, guides, and contributing docs
│   ├── ARCHITECTURE.md
│   ├── CONTRIBUTING.md
│   └── USER_GUIDE.md
├── esbuild.js                # Bundles Extension host & copies Webview assets
├── package.json              # Extension manifest & contribution definitions
├── samples/                  # Sample test fixture projects
│   └── sample-project/
├── src/
│   ├── extension.ts          # Main extension entry point
│   ├── types.ts              # Shared TypeScript interfaces
│   ├── __tests__/            # Unit test suite
│   ├── analyzer/
│   │   └── depgraphRunner.ts # depgraph-core wrapper service
│   ├── codelens/
│   │   └── depgraphCodeLens.ts # CodeLens provider for editor
│   └── webview/
│       ├── DepGraphPanel.ts  # WebviewPanel controller & IPC bridge
│       └── media/
│           ├── index.html    # Webview HTML shell
│           ├── main.css      # Custom styling matching VS Code theme
│           └── visualizer.js # Cytoscape.js canvas controller
└── tsconfig.json
```

---

## 📦 Packaging `.vsix` Extension

To package the extension into an installable `.vsix` package:

```bash
npx @vscode/vsce package
```

To install the generated `.vsix` into your local VS Code instance:
```bash
code --install-extension depgraph-vscode-0.1.0.vsix
```

---

## 🎨 Code Style & Guidelines

- **TypeScript**: Enforce strict typing (`strict: true`). Avoid using `any` whenever possible; use interfaces from [`src/types.ts`](file:///Users/betopia/depgraph-vscode-extension/src/types.ts).
- **VS Code Theme Tokens**: When updating `main.css`, always use native VS Code CSS variables (e.g. `var(--vscode-editor-background)`, `var(--vscode-foreground)`) to ensure full dark/light theme support.
- **Asynchronous Execution**: Long-running operations must use `vscode.window.withProgress` to keep the VS Code UI responsive.

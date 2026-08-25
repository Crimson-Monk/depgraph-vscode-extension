# DepGraph VS Code Extension

> Interactive Dependency Tree, Complexity Metrics & Blast Radius Impact Simulation powered by `depgraph-core`.

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Transform static dependency analysis into an **interactive visual workspace** directly inside VS Code. Visualize module dependencies, inspect centrality & complexity metrics, and simulate the blast radius of code changes before committing them.

---

## ⚡ Quick Links

- 📖 [User Guide](docs/USER_GUIDE.md) - Features, Command Palette, and Settings.
- 🏗️ [Architecture Overview](docs/ARCHITECTURE.md) - IPC Message Protocol, Cytoscape engine & data flow.
- 🛠️ [Contributing Guide](docs/CONTRIBUTING.md) - Setup, debug environment, tests & packaging.

---

## 🚀 Features

- **Visual Dependency Canvas**: Cytoscape.js force-directed, concentric, and DAG layout rendering.
- **Complexity & Centrality Scaling**: Node size scales with `centralityScore` ($\text{inDegree} \times 2 + \text{outDegree}$) with complexity glow indicators.
- **Blast Radius Impact Simulation**: Reverse BFS traversal showing affected downstream nodes, risk score ($0..100$), breaking change tags, and recommendations.
- **Git Impact Auto-Simulation**: Uncommitted git changes automatically trigger impact analysis.
- **In-Editor CodeLens**: Live inline metric annotations above functions and classes.
- **Jump-to-Source Editor Sync**: Double click any node in the graph to open the file & line number in VS Code.

---

## 💻 Getting Started

### Installation

1. Package the extension:
   ```bash
   npx @vscode/vsce package
   ```
2. Install in VS Code:
   ```bash
   code --install-extension depgraph-vscode-0.1.0.vsix
   ```

### Usage

1. Open any JS/TS/Py/Go workspace in VS Code.
2. Press `Cmd+Shift+P` (or `Ctrl+Shift+P`) and type `DepGraph: Open Visualizer`.
3. Or click **`⚡ DepGraph`** in the status bar at the bottom right.

---

## 🧪 Testing

Run automated TypeScript test suite:
```bash
npm test
```

---

## 📄 License

MIT © [Arafat Mannan](https://github.com/arafat2020)

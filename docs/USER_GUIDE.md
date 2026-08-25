# DepGraph VS Code Extension User Guide

The **DepGraph VS Code Extension** brings interactive dependency visualization, code complexity depth analysis, and blast-radius impact simulation directly into your editor using `depgraph-core`.

---

## 🌟 Key Features

### 1. Interactive Visual Dependency Canvas
- **Layout Engines**: Switch dynamically between Tiered DAG (`breadthfirst`), Concentric Centrality, and Force-Directed physics (`cose`).
- **Entity Identification**: Shape and color coded by entity category (Hexagon for API Endpoints, Circle for Functions, Square for Classes, Diamond for Interfaces).
- **Search & Filter**: Real-time filtering by node name, file path, or entity type (`Function`, `Class`, `API Endpoint`, `Interface`).

### 2. Complexity & Centrality Metrics
- **Node Scaling**: Node sizes are scaled proportionally to `centralityScore` ($\text{inDegree} \times 2 + \text{outDegree}$).
- **Complexity Glow**: Color-coded borders indicating complexity (`low` = emerald green, `medium` = amber yellow, `high` = coral red).

### 3. Blast Radius Impact Simulation
- **Manual Node Simulation**: Right-click any node in the graph or select **DepGraph: Simulate Impact of Current Entity** in code to simulate breaking changes.
- **Git Impact**: Automatically calculates affected downstream modules based on uncommitted git diffs.
- **Impact Report Drawer**: Displays risk level badge (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), risk score ($0..100$), and downstream affected nodes breakdown grouped by depth ($1..N$).

### 4. Jump-to-Source Editor Sync
- Double click any graph node to open the exact file and scroll to the line number in your active editor.

---

## ⌨️ Command Palette Reference

Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux) to access commands:

| Command | Identifier | Description |
|---|---|---|
| `DepGraph: Open Visualizer` | `depgraph.openVisualizer` | Opens the interactive visualizer panel. |
| `DepGraph: Simulate Impact of Current Entity` | `depgraph.simulateImpact` | Simulates blast radius for the entity at text cursor. |
| `DepGraph: Analyze Uncommitted Changes (Git Impact)` | `depgraph.analyzeGitImpact` | Auto-detects modified files from git diff and simulates impact. |
| `DepGraph: Rescan Workspace Dependencies` | `depgraph.rescanWorkspace` | Forces a fresh static analysis scan of workspace. |

---

## ⚙️ Extension Settings

Configure these options in VS Code Settings (`Cmd+,` $\rightarrow$ search `DepGraph`):

| Setting | Type | Default | Description |
|---|---|---|---|
| `depgraph.autoRescanOnSave` | `boolean` | `true` | Automatically rescan dependencies on file save. |
| `depgraph.autoRescanDebounceMs` | `number` | `2000` | Debounce delay (in ms) for auto-rescan on file save. |
| `depgraph.enableCodeLens` | `boolean` | `true` | Display in-editor inline CodeLens metric annotations. |

---

## 📌 Status Bar Indicator

Look at the bottom-right status bar in VS Code:
- Click **`⚡ DepGraph`** at any time to toggle open the visualizer panel.

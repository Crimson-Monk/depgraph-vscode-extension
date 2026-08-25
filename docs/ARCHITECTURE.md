# DepGraph VS Code Extension Architecture

This document provides a deep technical dive into the architecture, design patterns, message protocol, and data flow of the `depgraph-vscode` extension.

---

## 1. System Overview

The extension bridges `depgraph-core`'s static analysis engine with an interactive Cytoscape.js canvas running inside a sandboxed VS Code Webview Panel.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        VS Code Extension Host                          │
│                                                                        │
│  ┌───────────────────────┐         ┌────────────────────────────────┐  │
│  │ Commands & CodeLens   │         │ DepGraphRunnerService          │  │
│  │ - extension.ts        │ ──────> │ - depgraphRunner.ts            │  │
│  │ - depgraphCodeLens.ts │         │ - Executes depgraph-core CLI   │  │
│  └───────────────────────┘         └────────────────────────────────┘  │
│              │                                     │                   │
│              └─────────────────┬───────────────────┘                   │
│                                │ Bi-directional Message Passing (IPC)  │
│                                ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                       Webview Panel (UI)                         │  │
│  │  DepGraphPanel.ts / index.html / main.css / visualizer.js        │  │
│  │                                                                  │  │
│  │  [ Cytoscape Canvas ]          [ Impact Report & Inspector ]     │  │
│  │  - Tiered DAG Layout           - Risk Level Badge (LOW..CRITICAL)│  │
│  │  - Concentric Layout           - Affected Nodes Depth 1..N       │  │
│  │  - Force-Directed (cose)       - Risk Score Gauge (0..100)       │  │
│  │                                                                  │  │
│  │  [ Editor Sync ] ──> Clicks node to open file & highlight line  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Components & Responsibilities

### Extension Host (`src/`)

- **`src/extension.ts`**:
  - Main activation entry point.
  - Registers commands (`depgraph.openVisualizer`, `depgraph.simulateImpact`, `depgraph.analyzeGitImpact`, `depgraph.rescanWorkspace`).
  - Registers `DepGraphCodeLensProvider` for JS/TS/Py/Go files.
  - Controls status bar indicator (`⚡ DepGraph`).
  - Listens to `vscode.workspace.onDidSaveTextDocument` to trigger debounced auto-rescan.

- **`src/analyzer/depgraphRunner.ts` (`DepGraphRunnerService`)**:
  - Locates `depgraph-core/depgraph.js` in Node dependencies.
  - Executes `depgraph` static analysis asynchronously over target workspace folders.
  - Supports `--impact <targetNode> <description>` and `--git-impact` options.
  - Caches `OutputJSON` in memory to serve CodeLens and Webview requests instantly.

- **`src/codelens/depgraphCodeLens.ts` (`DepGraphCodeLensProvider`)**:
  - Queries cached graph nodes matching the active document file path.
  - Renders inline annotations above functions/classes (e.g. `DepGraph: 3 Dependents | Centrality: 7 | Complexity: LOW`).

- **`src/webview/DepGraphPanel.ts`**:
  - Singleton manager for `vscode.WebviewPanel`.
  - Serves HTML/CSS/JS static assets from `dist/media/` using `webview.asWebviewUri`.
  - Handles incoming JSON messages from the Webview and posts graph updates back.

---

### Webview UI (`src/webview/media/`)

- **`index.html`**: Toolbar, Cytoscape canvas container (`#cy`), slide-in Inspector drawer (`#drawer`), search bar, dropdown filters, and status legend.
- **`main.css`**: Uses native VS Code CSS variables (`var(--vscode-editor-background)`, `var(--vscode-foreground)`, `var(--vscode-button-background)`) to seamlessly match dark/light editor themes.
- **`visualizer.js`**: Cytoscape.js rendering engine:
  - Layouts: `breadthfirst` (Tiered DAG), `concentric` (Centrality), `cose` (Force-Directed).
  - Node Sizing: Proportional to `centralityScore` ($\text{inDegree} \times 2 + \text{outDegree}$).
  - Shapes: `ellipse` (Function), `rectangle` (Class), `hexagon` (API Endpoint), `diamond` (Interface).
  - Ripple Animations: Color-coded blast radius overlays for target node and affected downstream nodes.

---

## 3. Bi-directional IPC Message Protocol

Communication between Extension Host (`DepGraphPanel.ts`) and Webview (`visualizer.js`) uses standard `postMessage` protocol:

### Webview $\rightarrow$ Host Commands

| Command | Payload | Description |
|---|---|---|
| `READY` | - | Webview loaded; requests initial `OutputJSON` graph data. |
| `OPEN_FILE_LOCATION` | `{ file: string, line: number }` | Opens target text document in editor and highlights line number. |
| `SIMULATE_NODE_IMPACT` | `{ nodeId: string, nodeName: string }` | Runs impact analysis for target entity and returns `ImpactReport`. |
| `SIMULATE_GIT_IMPACT` | - | Runs `--git-impact` mode for uncommitted git changes. |
| `REQUEST_RESCAN` | - | Forces full re-analysis of workspace folder dependencies. |

### Host $\rightarrow$ Webview Commands

| Command | Payload | Description |
|---|---|---|
| `SET_GRAPH_DATA` | `{ data: OutputJSON }` | Renders all nodes, directed edges, and metrics in Cytoscape canvas. |
| `HIGHLIGHT_IMPACT` | `{ impact: ImpactReport }` | Highlights target node, affected downstream nodes, and updates side drawer. |

---

## 4. Output Data Model (`OutputJSON`)

`depgraph-core` generates output structured as follows:

```typescript
interface OutputJSON {
  meta: {
    version: string;
    timestamp: string;
    totalFiles: number;
    totalLines: number;
  };
  summary: {
    totalNodes: number;
    totalEdges: number;
    entryPoints: string[];
    leafNodes: string[];
    isolatedNodes: string[];
    criticalNodes: string[];
  };
  nodes: DepNode[];
  edges: DepEdge[];
  files: ParsedFile[];
  impact?: ImpactReport;
}
```

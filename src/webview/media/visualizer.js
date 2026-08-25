(function () {
  const vscode = acquireVsCodeApi();

  let cy = null;
  let graphData = null;
  let selectedNodeData = null;

  // Initialize Cytoscape Instance
  function initCytoscape() {
    cy = cytoscape({
      container: document.getElementById('cy'),
      boxSelectionEnabled: false,
      autounselectify: false,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(name)',
            'color': '#f3f4f6',
            'font-size': '11px',
            'font-weight': '600',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'background-color': '#3b82f6',
            'border-width': 2,
            'border-color': '#1d4ed8',
            'width': 'mapData(centralityScore, 0, 30, 30, 75)',
            'height': 'mapData(centralityScore, 0, 30, 30, 75)',
            'transition-property': 'background-color, border-color, width, height',
            'transition-duration': '0.3s'
          }
        },
        {
          selector: 'node[type = "class"]',
          style: {
            'shape': 'rectangle',
            'background-color': '#8b5cf6',
            'border-color': '#6d28d9'
          }
        },
        {
          selector: 'node[type = "api"]',
          style: {
            'shape': 'hexagon',
            'background-color': '#ec4899',
            'border-color': '#be185d'
          }
        },
        {
          selector: 'node[type = "interface"]',
          style: {
            'shape': 'diamond',
            'background-color': '#06b6d4',
            'border-color': '#0e7490'
          }
        },
        {
          selector: 'node[type = "component"]',
          style: {
            'shape': 'round-rectangle',
            'background-color': '#10b981',
            'border-color': '#047857'
          }
        },
        {
          selector: 'node[complexity = "high"]',
          style: {
            'border-color': '#ef4444',
            'border-width': 4
          }
        },
        {
          selector: 'node.impact-target',
          style: {
            'background-color': '#ef4444',
            'border-color': '#f87171',
            'border-width': 6,
            'shadow-blur': 20,
            'shadow-color': '#ef4444',
            'shadow-opacity': 0.8
          }
        },
        {
          selector: 'node.impact-affected-1',
          style: {
            'background-color': '#f97316',
            'border-color': '#fb923c',
            'border-width': 4
          }
        },
        {
          selector: 'node.impact-affected-2',
          style: {
            'background-color': '#eab308',
            'border-color': '#fde047',
            'border-width': 3
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#4b5563',
            'target-arrow-color': '#4b5563',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'opacity': 0.6
          }
        },
        {
          selector: 'edge.impact-edge',
          style: {
            'line-color': '#ef4444',
            'target-arrow-color': '#ef4444',
            'width': 3,
            'opacity': 0.95
          }
        }
      ]
    });

    // Event Handlers for Cytoscape elements
    cy.on('tap', 'node', function (evt) {
      const node = evt.target;
      selectedNodeData = node.data();
      openDrawerWithNode(selectedNodeData);
    });

    cy.on('dbltap', 'node', function (evt) {
      const node = evt.target;
      const data = node.data();
      if (data.file) {
        vscode.postMessage({
          command: 'OPEN_FILE_LOCATION',
          file: data.file,
          line: data.line || 1
        });
      }
    });

    cy.on('cxttap', 'node', function (evt) {
      const node = evt.target;
      const data = node.data();
      vscode.postMessage({
        command: 'SIMULATE_NODE_IMPACT',
        nodeId: data.id,
        nodeName: data.name
      });
    });
  }

  // Render Graph Elements
  function renderGraph(data) {
    graphData = data;
    if (!cy) return;

    cy.elements().remove();

    const elements = [];

    // Map Nodes
    (data.nodes || []).forEach(n => {
      elements.push({
        data: {
          id: n.id,
          name: n.name,
          type: n.type || 'function',
          file: n.file,
          line: n.line,
          centralityScore: n.centralityScore || 1,
          complexity: n.complexity || 'low',
          inDegree: n.inDegree || 0,
          outDegree: n.outDegree || 0,
          connections: n.connections || []
        }
      });
    });

    // Map Edges
    (data.edges || []).forEach(e => {
      elements.push({
        data: {
          id: `${e.from}__to__${e.to}`,
          source: e.from,
          target: e.to,
          description: e.description
        }
      });
    });

    cy.add(elements);

    // Apply Layout
    runLayout('breadthfirst');

    // If impact report is attached in data, render it automatically
    if (data.impact) {
      renderImpactReport(data.impact);
    }
  }

  // Layout runner
  function runLayout(layoutName) {
    if (!cy) return;

    let options = {};
    if (layoutName === 'breadthfirst') {
      options = {
        name: 'breadthfirst',
        directed: true,
        padding: 40,
        spacingFactor: 1.25,
        animate: true,
        animationDuration: 400
      };
    } else if (layoutName === 'concentric') {
      options = {
        name: 'concentric',
        concentric: function (node) {
          return node.data('centralityScore') || 1;
        },
        levelWidth: function () { return 2; },
        padding: 40,
        animate: true
      };
    } else if (layoutName === 'cose') {
      options = {
        name: 'cose',
        animate: true,
        componentSpacing: 60,
        nodeRepulsion: function () { return 400000; },
        idealEdgeLength: function () { return 80; }
      };
    }

    const layout = cy.layout(options);
    layout.run();
  }

  // Open Drawer with Node details
  function openDrawerWithNode(nodeData) {
    document.getElementById('statName').textContent = nodeData.name;
    document.getElementById('statType').textContent = nodeData.type.toUpperCase();
    document.getElementById('statCentrality').textContent = nodeData.centralityScore;
    document.getElementById('statComplexity').textContent = nodeData.complexity.toUpperCase();
    document.getElementById('statInDegree').textContent = nodeData.inDegree;
    document.getElementById('statOutDegree').textContent = nodeData.outDegree;
    document.getElementById('statFile').textContent = nodeData.file + ':' + (nodeData.line || 1);

    document.getElementById('drawerTitle').textContent = `🔍 ${nodeData.name}`;
    document.getElementById('drawer').classList.add('open');
  }

  // Render Impact Report
  function renderImpactReport(impact) {
    const impactSection = document.getElementById('impactSection');
    impactSection.style.display = 'block';

    const riskBadge = document.getElementById('riskBadge');
    riskBadge.textContent = impact.riskLevel || 'LOW';
    riskBadge.className = `badge badge-${(impact.riskLevel || 'low').toLowerCase()}`;

    const riskScore = impact.riskScore || 0;
    document.getElementById('statRiskScore').textContent = `${riskScore} / 100`;

    const gaugeFill = document.getElementById('riskGaugeFill');
    gaugeFill.style.width = `${Math.min(100, riskScore)}%`;

    if (riskScore >= 75) {
      gaugeFill.style.backgroundColor = '#a855f7';
    } else if (riskScore >= 50) {
      gaugeFill.style.backgroundColor = '#ef4444';
    } else if (riskScore >= 25) {
      gaugeFill.style.backgroundColor = '#f59e0b';
    } else {
      gaugeFill.style.backgroundColor = '#10b981';
    }

    const affectedList = document.getElementById('affectedList');
    affectedList.innerHTML = '';

    (impact.affectedNodes || []).forEach(node => {
      const li = document.createElement('li');
      li.className = 'affected-item';
      li.innerHTML = `
        <div class="affected-item-header">
          <span class="affected-name">${node.name}</span>
          <span class="badge badge-${(node.impact || 'low').toLowerCase()}">${node.impact}</span>
        </div>
        <div class="affected-reason">${node.reason || 'Affected downstream'}</div>
        <div class="affected-action">⚡ ${node.changeRequired || 'Verify compatibility'}</div>
      `;
      affectedList.appendChild(li);
    });

    // Highlight nodes on graph
    cy.nodes().removeClass('impact-target impact-affected-1 impact-affected-2');
    cy.edges().removeClass('impact-edge');

    const targetEle = cy.getElementById(impact.targetNode);
    if (targetEle) {
      targetEle.addClass('impact-target');
    }

    (impact.affectedNodes || []).forEach(an => {
      const ele = cy.getElementById(an.nodeId);
      if (ele) {
        if (an.depth === 1) {
          ele.addClass('impact-affected-1');
        } else {
          ele.addClass('impact-affected-2');
        }
      }
    });

    // Drawer auto open
    document.getElementById('drawer').classList.add('open');
  }

  // Setup UI Toolbar Controls
  function setupControls() {
    document.getElementById('btnLayoutDag').addEventListener('click', (e) => {
      setActiveButton(e.target);
      runLayout('breadthfirst');
    });

    document.getElementById('btnLayoutConcentric').addEventListener('click', (e) => {
      setActiveButton(e.target);
      runLayout('concentric');
    });

    document.getElementById('btnLayoutCose').addEventListener('click', (e) => {
      setActiveButton(e.target);
      runLayout('cose');
    });

    document.getElementById('btnCloseDrawer').addEventListener('click', () => {
      document.getElementById('drawer').classList.remove('open');
    });

    document.getElementById('btnJumpToSource').addEventListener('click', () => {
      if (selectedNodeData && selectedNodeData.file) {
        vscode.postMessage({
          command: 'OPEN_FILE_LOCATION',
          file: selectedNodeData.file,
          line: selectedNodeData.line || 1
        });
      }
    });

    document.getElementById('btnSimulateImpact').addEventListener('click', () => {
      if (selectedNodeData) {
        vscode.postMessage({
          command: 'SIMULATE_NODE_IMPACT',
          nodeId: selectedNodeData.id,
          nodeName: selectedNodeData.name
        });
      }
    });

    document.getElementById('btnRescan').addEventListener('click', () => {
      vscode.postMessage({ command: 'REQUEST_RESCAN' });
    });

    document.getElementById('btnGitImpact').addEventListener('click', () => {
      vscode.postMessage({ command: 'SIMULATE_GIT_IMPACT' });
    });

    // Real-time search filter
    document.getElementById('searchInput').addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      if (!cy) return;

      if (!term) {
        cy.nodes().style('opacity', 1);
        cy.edges().style('opacity', 0.6);
        return;
      }

      cy.nodes().forEach(node => {
        const name = (node.data('name') || '').toLowerCase();
        const file = (node.data('file') || '').toLowerCase();
        if (name.includes(term) || file.includes(term)) {
          node.style('opacity', 1);
        } else {
          node.style('opacity', 0.15);
        }
      });
    });

    // Type filter dropdown
    document.getElementById('typeFilter').addEventListener('change', (e) => {
      const selectedType = e.target.value;
      if (!cy) return;

      if (selectedType === 'all') {
        cy.nodes().style('display', 'element');
      } else {
        cy.nodes().forEach(node => {
          if (node.data('type') === selectedType) {
            node.style('display', 'element');
          } else {
            node.style('display', 'none');
          }
        });
      }
    });
  }

  function setActiveButton(btn) {
    document.querySelectorAll('.toolbar .btn').forEach(b => {
      if (b.id && b.id.startsWith('btnLayout')) {
        b.classList.remove('active');
      }
    });
    btn.classList.add('active');
  }

  // Handle Extension Host Messages
  window.addEventListener('message', event => {
    const message = event.data;

    switch (message.command) {
      case 'SET_GRAPH_DATA':
        renderGraph(message.data);
        break;

      case 'HIGHLIGHT_IMPACT':
        if (message.impact) {
          renderImpactReport(message.impact);
        }
        break;
    }
  });

  // Initialize App
  initCytoscape();
  setupControls();
  vscode.postMessage({ command: 'READY' });
})();

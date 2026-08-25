export interface RawEntity {
  name: string;
  type: string;
  line: number;
  complexity: 'low' | 'medium' | 'high' | string;
}

export interface RawImport {
  source: string;
  names: string[];
  isLocal: boolean;
}

export interface ParsedFile {
  filePath: string;
  lang: string;
  lines: number;
  entities: RawEntity[];
  imports: RawImport[];
  exports: string[];
}

export interface DepNode {
  id: string;
  name: string;
  type: string;
  file: string;
  line: number;
  lang: string;
  complexity: 'low' | 'medium' | 'high' | string;
  inDegree: number;
  outDegree: number;
  centralityScore: number;
  connections: string[];
  extends?: string;
  method?: string;
  route?: string;
}

export interface DepEdge {
  from: string;
  to: string;
  type: string;
  description: string;
}

export interface AffectedNode {
  nodeId: string;
  name: string;
  file: string;
  depth: number;
  impact: 'critical' | 'high' | 'medium' | 'low' | string;
  reason: string;
  changeRequired: string;
  breakingChange: boolean;
}

export interface ImpactReport {
  targetNode: string;
  changeDescription: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  affectedNodes: AffectedNode[];
  breakingChanges: AffectedNode[];
  testingPlan: string[];
  recommendations: string[];
}

export interface OutputJSON {
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

export interface DepGraphRunOptions {
  workspacePath: string;
  outputPath?: string;
  impactTarget?: string;
  impactDescription?: string;
  gitImpact?: boolean;
}

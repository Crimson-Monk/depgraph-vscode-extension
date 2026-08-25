import * as assert from 'assert';
import * as path from 'path';
import { DepGraphRunnerService } from '../analyzer/depgraphRunner';

async function runTests() {
  console.log('🧪 Running DepGraph Extension Runner Tests...');

  const samplePath = path.join(__dirname, '..', '..', 'samples', 'sample-project');

  // Test 1: Full workspace static analysis
  console.log('  Testing DepGraphRunnerService.runAnalysis...');
  const output = await DepGraphRunnerService.runAnalysis({ workspacePath: samplePath });

  assert.ok(output.meta, 'Meta object must exist');
  assert.ok(output.summary, 'Summary object must exist');
  assert.ok(Array.isArray(output.nodes), 'Nodes array must exist');
  assert.ok(Array.isArray(output.edges), 'Edges array must exist');
  assert.strictEqual(output.nodes.length >= 4, true, 'Should parse at least 4 nodes');

  console.log(`    ✅ Parsed ${output.nodes.length} nodes and ${output.edges.length} edges successfully.`);

  // Test 2: Impact Simulation
  console.log('  Testing DepGraphRunnerService.runAnalysis with impact target...');
  const impactResult = await DepGraphRunnerService.runAnalysis({
    workspacePath: samplePath,
    impactTarget: 'validateToken',
    impactDescription: 'modifying signature'
  });

  assert.ok(impactResult.impact, 'Impact report must be generated');
  assert.strictEqual(typeof impactResult.impact.riskScore, 'number', 'Risk score must be a number');
  assert.ok(Array.isArray(impactResult.impact.affectedNodes), 'Affected nodes array must exist');

  console.log(`    ✅ Impact simulation returned risk score: ${impactResult.impact.riskScore}, risk level: ${impactResult.impact.riskLevel}`);

  console.log('🎉 All tests passed successfully!');
}

runTests().catch(err => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});

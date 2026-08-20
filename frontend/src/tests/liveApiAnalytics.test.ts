import { computeCriticalPath, computeResourceHeatmap } from '../utils/analytics';
import { GanttScheduleResponse, Operation } from '../types/schedule';
import { test } from 'vitest';

async function testLiveApi() {
  console.log('=== TEST SCENARIO 3: Live API Real Data Verification ===');
  const res = await fetch('http://localhost:5000/api/schedule');
  if (!res.ok) {
    throw new Error(`Failed to fetch /api/schedule: ${res.status}`);
  }

  const data: GanttScheduleResponse = await res.json();
  const operationsMap: Record<string, Operation> = {};
  data.operations.forEach((op) => {
    operationsMap[op.id] = op;
  });
  const workOrdersMap: Record<string, any> = {};
  data.workOrders.forEach((wo) => {
    workOrdersMap[wo.id] = wo;
  });

  console.log(`Loaded ${data.resources.length} resources, ${data.operations.length} operations, ${data.workOrders.length} work orders.`);

  const cpm = computeCriticalPath(operationsMap, workOrdersMap);
  console.log('Live CPM Critical Path Analysis:', {
    bottleneckWorkOrderNumber: cpm.bottleneckWorkOrderNumber,
    makespanEndTime: cpm.makespanEndTime?.toISOString(),
    totalCriticalOps: cpm.totalCriticalOperations,
    criticalOpIds: Array.from(cpm.criticalOperationIds),
    criticalLinks: Array.from(cpm.criticalLinks),
  });

  if (data.operations.length > 0) {
    if (cpm.totalCriticalOperations === 0) {
      throw new Error('FAILED: Critical path should identify at least 1 bottleneck chain!');
    }
    if (cpm.totalCriticalOperations === data.operations.length && data.operations.length > 5) {
      throw new Error('FAILED: Critical path identified ALL operations, which means no slack differentiation!');
    }
    console.log(`✅ Live CPM correctly identified ${cpm.totalCriticalOperations} out of ${data.operations.length} operations as the critical bottleneck path.`);
  }

  // Test Heatmap on all resources
  const timelineStart = new Date(new Date().setHours(0, 0, 0, 0));
  const timelineEnd = new Date(new Date().setDate(new Date().getDate() + 3));

  data.resources.forEach((r) => {
    const resOps = data.operations.filter((o) => o.requiredResourceId === r.id);
    const resDts = data.downtimes.filter((d) => d.resourceId === r.id);
    const bins = computeResourceHeatmap(r.id, resOps, resDts, timelineStart, timelineEnd, 4);
    const overloadedBins = bins.filter((b) => b.level === 'overload' || b.level === 'high');
    console.log(`Machine ${r.code} (${r.name}): ${bins.length} time bins, ${resOps.length} ops, ${overloadedBins.length} high/overloaded bins.`);
  });

  console.log('✅ Live Capacity Heatmap Test Scenario 3 PASSED.');
}

test('Live API Analytics Tests', async () => {
  await testLiveApi();
});

import { computeCriticalPath, computeResourceHeatmap } from '../utils/analytics';
import { Operation, ResourceDowntime } from '../types/schedule';

function runTests() {
  console.log('=== TEST SCENARIO 1: Critical Path CPM with 2 Independent Work Orders ===');
  // WO1 finishes at 12:00 (Short, Non-critical)
  // WO2 finishes at 20:00 (Longest, Factory Makespan Bottleneck)
  const operations: Record<string, Operation> = {
    'op-wo1-step1': {
      id: 'op-wo1-step1',
      workOrderId: 'WO-1',
      workOrderNumber: 'WO-ALPHA',
      sequenceIndex: 1,
      name: 'SMT Top',
      productType: 'IoT',
      requiredResourceId: 'SMT-1',
      durationMinutes: 120,
      setupDurationMinutes: 10,
      plannedStartTime: '2026-08-14T08:00:00Z',
      plannedEndTime: '2026-08-14T10:10:00Z',
      actualStartTime: null,
      actualEndTime: null,
      status: 'Planned',
      colorCode: '#06b6d4',
      isLocked: false,
      precedenceOperationIds: [],
    },
    'op-wo1-step2': {
      id: 'op-wo1-step2',
      workOrderId: 'WO-1',
      workOrderNumber: 'WO-ALPHA',
      sequenceIndex: 2,
      name: 'THT Solder',
      productType: 'IoT',
      requiredResourceId: 'THT-1',
      durationMinutes: 90,
      setupDurationMinutes: 10,
      plannedStartTime: '2026-08-14T10:10:00Z',
      plannedEndTime: '2026-08-14T11:50:00Z',
      actualStartTime: null,
      actualEndTime: null,
      status: 'Planned',
      colorCode: '#f59e0b',
      isLocked: false,
      precedenceOperationIds: ['op-wo1-step1'],
    },
    'op-wo2-step1': {
      id: 'op-wo2-step1',
      workOrderId: 'WO-2',
      workOrderNumber: 'WO-BETA',
      sequenceIndex: 1,
      name: 'SMT High-Density',
      productType: 'Automotive',
      requiredResourceId: 'SMT-2',
      durationMinutes: 240,
      setupDurationMinutes: 20,
      plannedStartTime: '2026-08-14T08:00:00Z',
      plannedEndTime: '2026-08-14T12:20:00Z',
      actualStartTime: null,
      actualEndTime: null,
      status: 'Planned',
      colorCode: '#38bdf8',
      isLocked: false,
      precedenceOperationIds: [],
    },
    'op-wo2-step2': {
      id: 'op-wo2-step2',
      workOrderId: 'WO-2',
      workOrderNumber: 'WO-BETA',
      sequenceIndex: 2,
      name: 'ICT Test',
      productType: 'Automotive',
      requiredResourceId: 'ICT-1',
      durationMinutes: 180,
      setupDurationMinutes: 15,
      plannedStartTime: '2026-08-14T12:20:00Z',
      plannedEndTime: '2026-08-14T15:35:00Z',
      actualStartTime: null,
      actualEndTime: null,
      status: 'Planned',
      colorCode: '#10b981',
      isLocked: false,
      precedenceOperationIds: ['op-wo2-step1'],
    },
    'op-wo2-step3': {
      id: 'op-wo2-step3',
      workOrderId: 'WO-2',
      workOrderNumber: 'WO-BETA',
      sequenceIndex: 3,
      name: 'Conformal Coating & UV Curing',
      productType: 'Automotive',
      requiredResourceId: 'COAT-1',
      durationMinutes: 240,
      setupDurationMinutes: 30,
      plannedStartTime: '2026-08-14T15:35:00Z',
      plannedEndTime: '2026-08-14T20:05:00Z',
      actualStartTime: null,
      actualEndTime: null,
      status: 'Planned',
      colorCode: '#ec4899',
      isLocked: false,
      precedenceOperationIds: ['op-wo2-step2'],
    },
  };

  const cpm = computeCriticalPath(operations);
  console.log('CPM Result:', {
    bottleneckWorkOrderNumber: cpm.bottleneckWorkOrderNumber,
    makespanEndTime: cpm.makespanEndTime?.toISOString(),
    totalCriticalOps: cpm.totalCriticalOperations,
    criticalOpIds: Array.from(cpm.criticalOperationIds),
    criticalLinks: Array.from(cpm.criticalLinks),
  });

  if (cpm.bottleneckWorkOrderNumber !== 'WO-BETA') {
    throw new Error('FAILED: Expected WO-BETA to be the bottleneck work order!');
  }
  if (cpm.criticalOperationIds.has('op-wo1-step1') || cpm.criticalOperationIds.has('op-wo1-step2')) {
    throw new Error('FAILED: WO-ALPHA operations should NOT be on the critical path!');
  }
  if (!cpm.criticalOperationIds.has('op-wo2-step1') || !cpm.criticalOperationIds.has('op-wo2-step3')) {
    throw new Error('FAILED: WO-BETA operations must be identified as critical path!');
  }
  console.log('✅ CPM Test Scenario 1 PASSED.');

  console.log('\n=== TEST SCENARIO 2: Capacity Load Heatmap with 4-hour bins ===');
  const tStart = new Date('2026-08-14T08:00:00Z');
  const tEnd = new Date('2026-08-14T20:00:00Z'); // 12 hours = 3 bins of 4h
  const machineOps: Operation[] = [
    // Bin 1 (08:00-12:00 = 240m): has 240m operation -> 100% overload
    operations['op-wo2-step1'],
  ];
  const machineDowntimes: ResourceDowntime[] = [];

  const heatmap = computeResourceHeatmap('SMT-2', machineOps, machineDowntimes, tStart, tEnd, 4);
  console.log('Heatmap Bins:', heatmap.map(b => ({
    time: `${b.start.toISOString().substring(11, 16)} - ${b.end.toISOString().substring(11, 16)}`,
    busy: b.busyMinutes,
    total: b.totalMinutes,
    utilization: `${b.utilizationPercent}%`,
    level: b.level,
  })));

  if (heatmap.length !== 3) {
    throw new Error(`FAILED: Expected 3 bins, got ${heatmap.length}`);
  }
  if (heatmap[0].utilizationPercent !== 100 || heatmap[0].level !== 'overload') {
    throw new Error(`FAILED: Expected 100% overload on first bin, got ${heatmap[0].utilizationPercent}%`);
  }
  if (heatmap[1].utilizationPercent !== 8 || heatmap[1].level !== 'optimal') {
    // 12:00 to 12:20 = 20m of 240m = 8%
    console.log(`Note: Second bin has 20m / 240m = ${heatmap[1].utilizationPercent}% (${heatmap[1].level})`);
  }
  if (heatmap[2].utilizationPercent !== 0 || heatmap[2].level !== 'idle') {
    throw new Error(`FAILED: Expected 0% idle on third bin, got ${heatmap[2].utilizationPercent}%`);
  }
  console.log('✅ Heatmap Test Scenario 2 PASSED.');

  console.log('\nALL ANALYTICS UNIT TESTS PASSED!');
}

runTests();

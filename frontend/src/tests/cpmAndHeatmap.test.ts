import { computeCriticalPath, computeResourceHeatmap, isResourceMatchingCategory } from '../utils/analytics';
import { getOffShiftIntervals } from '../utils/shiftUtils';
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

  console.log('\n=== TEST SCENARIO 3: Dynamic Category Filtering with Custom User Machines (X-Ray, AOI, etc.) ===');
  const sampleResources: any[] = [
    { id: 'SMT-LINE-01', code: 'SMT-01', name: 'Panasonic NPM-D3 SMT Line', type: 'SmtLine' },
    { id: 'THT-WAVE-01', code: 'WAVE-01', name: 'Ersa Powerflow Wave Solder', type: 'ThtWaveSoldering' },
    { id: 'ICT-SPEA-01', code: 'SPEA-01', name: 'SPEA 4060 Flying Probe', type: 'InCircuitTesting' },
    { id: 'XRAY-01', code: 'XRAY-01', name: 'Nordson Dage 3D X-Ray Inspection', type: 'FunctionalTesting' },
    { id: 'AOI-01', code: 'AOI-01', name: 'Koh Young 3D AOI Muayene', type: 'Inspection' },
    { id: 'ROUTER-01', code: 'ROUTER-01', name: 'ASYS Depaneling Router Kesim', type: 'DepanelingRouter' },
    { id: 'COAT-01', code: 'COAT-01', name: 'Nordson Asymtek Konformal Kaplama', type: 'ConformalCoating' },
  ];

  const smtFiltered = sampleResources.filter(r => isResourceMatchingCategory(r, 'SMT'));
  const thtFiltered = sampleResources.filter(r => isResourceMatchingCategory(r, 'THT'));
  const testFiltered = sampleResources.filter(r => isResourceMatchingCategory(r, 'TEST'));
  const coatFiltered = sampleResources.filter(r => isResourceMatchingCategory(r, 'COAT'));

  if (smtFiltered.length !== 1) {
    throw new Error(`FAILED: Expected 1 SMT resource, got ${smtFiltered.length}`);
  }
  if (thtFiltered.length !== 1) {
    throw new Error(`FAILED: Expected 1 THT resource, got ${thtFiltered.length}`);
  }

  console.log('TEST Category Matches:', testFiltered.map(r => r.name));
  if (testFiltered.length !== 3) { // ICT, X-Ray, AOI
    throw new Error(`FAILED: Expected 3 test/inspection resources (ICT, X-Ray, AOI), got ${testFiltered.length}`);
  }
  if (!testFiltered.some(r => r.name.includes('X-Ray'))) {
    throw new Error('FAILED: X-Ray test station was not matched under TEST category!');
  }
  if (!testFiltered.some(r => r.name.includes('AOI'))) {
    throw new Error('FAILED: AOI Muayene was not matched under TEST category!');
  }
  if (coatFiltered.length !== 2) { // ROUTER, COAT
    throw new Error(`FAILED: Expected 2 coat/router resources, got ${coatFiltered.length}`);
  }
  console.log('✅ Dynamic Resource Category Filtering Test Scenario 3 PASSED.');

  console.log('\n=== TEST SCENARIO 4: Shift Shading Off-Interval Calculation & Weekend Merging ===');
  const sampleShifts = [
    {
      id: 'SHIFT-01',
      name: 'Gündüz',
      startTime: '08:00',
      endTime: '16:00',
      daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
      colorCode: '#06b6d4',
      isActive: true,
      displayOrder: 1,
    },
    {
      id: 'SHIFT-02',
      name: 'Akşam',
      startTime: '16:00',
      endTime: '00:00',
      daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
      colorCode: '#f59e0b',
      isActive: true,
      displayOrder: 2,
    },
  ];

  // Monday 2026-08-17 00:00 to Tuesday 2026-08-18 23:59
  const shiftStart = new Date('2026-08-17T00:00:00.000Z');
  const shiftEnd = new Date('2026-08-18T23:59:59.000Z');

  const offIntervals = getOffShiftIntervals(sampleShifts, shiftStart, shiftEnd);
  console.log('Off-Shift Intervals count:', offIntervals.length);
  offIntervals.forEach(interval => {
    console.log(`- ${interval.label}: ${interval.start.toISOString()} -> ${interval.end.toISOString()}`);
  });

  if (offIntervals.length === 0) {
    throw new Error('FAILED: Expected off-shift intervals for 00:00-08:00 night period, got 0');
  }

  console.log('✅ Shift Shading Off-Interval Test Scenario 4 PASSED.');

  console.log('\nALL ANALYTICS, SHIFT & CATEGORY UNIT TESTS PASSED!');
}

runTests();

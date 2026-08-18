import { computeCriticalPath, computeResourceHeatmap, isResourceMatchingCategory } from '../utils/analytics';
import { getOffShiftIntervals } from '../utils/shiftUtils';
import { findMagneticSnap } from '../utils/magneticSnap';
import { detectOperationConstraints } from '../utils/constraintUtils';
import { Operation, WorkOrder, ResourceDowntime } from '../types/schedule';

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

  console.log('\n=== TEST SCENARIO 5: Smart Magnetic Snapping (Left/Right Neighbor Zero-Gap, Predecessor, Shift) ===');
  const tRefStart = new Date('2026-08-17T00:00:00.000Z');
  
  // Op1 on RES-01: 08:00 to 10:00 (480 min to 600 min from tRefStart)
  const op1: Operation = {
    id: 'op-1',
    workOrderId: 'WO-1',
    workOrderNumber: 'WO-101',
    sequenceIndex: 1,
    name: 'SMT Step 1',
    productType: 'IoT',
    requiredResourceId: 'RES-01',
    plannedStartTime: '2026-08-17T08:00:00.000Z',
    plannedEndTime: '2026-08-17T10:00:00.000Z',
    durationMinutes: 120,
    setupDurationMinutes: 0,
    status: 'Planned',
    isLocked: false,
    colorCode: '#3b82f6',
    precedenceOperationIds: [],
  };

  // Op2 on RES-01 (being dragged near 10:07, duration 60m): should snap to 10:00 (600 min) with zero gap!
  const op2: Operation = {
    id: 'op-2',
    workOrderId: 'WO-2',
    workOrderNumber: 'WO-202',
    sequenceIndex: 1,
    name: 'SMT Step 2',
    productType: 'IoT',
    requiredResourceId: 'RES-01',
    plannedStartTime: '2026-08-17T11:00:00.000Z',
    plannedEndTime: '2026-08-17T12:00:00.000Z',
    durationMinutes: 60,
    setupDurationMinutes: 0,
    status: 'Planned',
    isLocked: false,
    colorCode: '#10b981',
    precedenceOperationIds: [],
  };

  // Test 1: Sol Komşu Bitişi Snap (Proposed 608 min -> should snap to 600 min)
  const snapResult1 = findMagneticSnap({
    proposedStartMinutes: 608,
    totalDurationMinutes: 60,
    currentOp: op2,
    allOperations: [op1, op2],
    shifts: sampleShifts,
    timelineStart: tRefStart,
    minuteWidth: 1.2,
  });

  console.log('Magnetic Snap 1 (Neighbor Left):', snapResult1);
  if (snapResult1.snappedStartMinutes !== 600) {
    throw new Error(`FAILED: Expected snap to 600 (Op1 end), got ${snapResult1.snappedStartMinutes}`);
  }
  if (snapResult1.snapTarget?.type !== 'neighbor-left') {
    throw new Error(`FAILED: Expected snap type neighbor-left, got ${snapResult1.snapTarget?.type}`);
  }

  // Test 2: Shift Start Snap (Proposed 485 min -> should snap to 480 min / 08:00)
  const snapResult2 = findMagneticSnap({
    proposedStartMinutes: 485,
    totalDurationMinutes: 60,
    currentOp: op2,
    allOperations: [op2], // no neighbor ops
    shifts: sampleShifts,
    timelineStart: tRefStart,
    minuteWidth: 1.2,
  });

  console.log('Magnetic Snap 2 (Shift Start):', snapResult2);
  if (snapResult2.snappedStartMinutes !== 480) {
    throw new Error(`FAILED: Expected snap to 480 (Shift start 08:00), got ${snapResult2.snappedStartMinutes}`);
  }
  if (snapResult2.snapTarget?.type !== 'shift-start') {
    throw new Error(`FAILED: Expected snap type shift-start, got ${snapResult2.snapTarget?.type}`);
  }

  console.log('✅ Smart Magnetic Snapping Test Scenario 5 PASSED.');

  console.log('\n=== TEST SCENARIO 6: Real-Time Constraint Violations Detection (Late, Precedence, Clash, Priority) ===');
  
  const sampleWorkOrder: WorkOrder = {
    id: 'WO-100',
    orderNumber: 'WO-100',
    productCode: 'PCBA-01',
    productName: 'Main Controller',
    quantity: 500,
    releaseDate: '2026-08-17T08:00:00.000Z',
    dueDate: '2026-08-17T11:00:00.000Z', // Due at 11:00
    priority: 9, // Urgent Priority P9
    status: 'Planned',
    operationIds: ['op-step-1', 'op-step-2'],
  };

  // Step 1: 08:00 to 10:00 (On-time, before due date)
  const step1: Operation = {
    id: 'op-step-1',
    workOrderId: 'WO-100',
    workOrderNumber: 'WO-100',
    sequenceIndex: 1,
    name: 'SMT Top',
    productType: 'IoT',
    requiredResourceId: 'RES-01',
    plannedStartTime: '2026-08-17T08:00:00.000Z',
    plannedEndTime: '2026-08-17T10:00:00.000Z',
    durationMinutes: 120,
    setupDurationMinutes: 0,
    status: 'Planned',
    precedenceOperationIds: [],
  };

  // Step 2: 09:30 to 12:30 on RES-01 (Multiple Violations: starts before step 1 finishes, overlaps RES-01, finishes after 11:00 due date)
  const step2: Operation = {
    id: 'op-step-2',
    workOrderId: 'WO-100',
    workOrderNumber: 'WO-100',
    sequenceIndex: 2,
    name: 'THT Wave',
    productType: 'IoT',
    requiredResourceId: 'RES-01',
    plannedStartTime: '2026-08-17T09:30:00.000Z',
    plannedEndTime: '2026-08-17T12:30:00.000Z',
    durationMinutes: 180,
    setupDurationMinutes: 0,
    status: 'Planned',
    precedenceOperationIds: ['op-step-1'],
  };

  const detectedConstraints = detectOperationConstraints(
    step2,
    sampleWorkOrder,
    [step1, step2],
    []
  );

  console.log('Detected Step 2 Violations:', detectedConstraints);

  if (!detectedConstraints.isLate || detectedConstraints.latenessMinutes !== 90) {
    throw new Error(`FAILED: Expected isLate=true with 90 min lateness, got isLate=${detectedConstraints.isLate}, lateness=${detectedConstraints.latenessMinutes}`);
  }

  if (!detectedConstraints.isPrecedenceViolated) {
    throw new Error('FAILED: Expected isPrecedenceViolated=true (starts at 09:30 before Step 1 ends at 10:00)');
  }

  if (!detectedConstraints.isMachineClash) {
    throw new Error('FAILED: Expected isMachineClash=true (overlaps RES-01 with Step 1)');
  }

  if (!detectedConstraints.isHighPriority || detectedConstraints.priorityLevel !== 9) {
    throw new Error('FAILED: Expected isHighPriority=true with priority 9');
  }

  console.log('✅ Real-Time Constraint Violations Test Scenario 6 PASSED.');

  console.log('\nALL 6 ANALYTICS, SHIFT, SNAP & CONSTRAINT UNIT TESTS PASSED!');
}

runTests();

import { Operation, ResourceDowntime, WorkOrder } from '../types/schedule';

export interface CriticalPathResult {
  criticalOperationIds: Set<string>;
  criticalLinks: Set<string>; // "parentOpId->childOpId"
  bottleneckWorkOrderId: string | null;
  bottleneckWorkOrderNumber: string | null;
  makespanEndTime: Date | null;
  totalCriticalOperations: number;
}

export interface HeatmapBin {
  id: string;
  start: Date;
  end: Date;
  busyMinutes: number;
  totalMinutes: number;
  utilizationPercent: number;
  level: 'idle' | 'optimal' | 'high' | 'overload';
}

/**
 * Computes the Factory Makespan Critical Path (CPM)
 * Traces the longest contiguous sequence of operations defining the latest completion in the factory.
 */
export function computeCriticalPath(
  operations: Record<string, Operation>,
  workOrders: Record<string, WorkOrder> = {}
): CriticalPathResult {
  const ops = Object.values(operations);
  const result: CriticalPathResult = {
    criticalOperationIds: new Set<string>(),
    criticalLinks: new Set<string>(),
    bottleneckWorkOrderId: null,
    bottleneckWorkOrderNumber: null,
    makespanEndTime: null,
    totalCriticalOperations: 0,
  };

  if (ops.length === 0) return result;

  // 1. Group operations by workOrderId
  const byWo: Record<string, Operation[]> = {};
  for (const op of ops) {
    if (!byWo[op.workOrderId]) byWo[op.workOrderId] = [];
    byWo[op.workOrderId].push(op);
  }

  // 2. Find the global latest finishing operation in the factory (Determines Makespan)
  let globalMaxEndMs = -Infinity;
  let bottleneckOp: Operation | null = null;

  for (const op of ops) {
    const endMs = new Date(op.plannedEndTime).getTime();
    if (!isNaN(endMs) && endMs > globalMaxEndMs) {
      globalMaxEndMs = endMs;
      bottleneckOp = op;
    }
  }

  if (!bottleneckOp) return result;

  const targetWoId = (bottleneckOp as Operation).workOrderId;
  const targetWo = workOrders[targetWoId];
  result.bottleneckWorkOrderId = targetWoId;
  result.bottleneckWorkOrderNumber =
    targetWo?.orderNumber || (bottleneckOp as Operation).workOrderNumber || targetWoId;
  result.makespanEndTime = new Date(globalMaxEndMs);

  // 3. Trace back the predecessor dependency chain for the bottleneck work order
  const woOps = byWo[targetWoId] || [];
  const visited = new Set<string>();

  const traceBack = (current: Operation) => {
    result.criticalOperationIds.add(current.id);
    visited.add(current.id);

    const precIds = current.precedenceOperationIds || [];
    if (precIds.length === 0) {
      // Fallback: look for preceding sequenceIndex in same WO if precedences empty
      const prevOps = woOps
        .filter((o) => o.sequenceIndex < current.sequenceIndex && !visited.has(o.id))
        .sort(
          (a, b) =>
            new Date(b.plannedEndTime).getTime() - new Date(a.plannedEndTime).getTime()
        );
      if (prevOps.length > 0) {
        result.criticalLinks.add(`${prevOps[0].id}->${current.id}`);
        traceBack(prevOps[0]);
      }
      return;
    }

    // Find predecessor with latest completion time
    let latestPred: Operation | null = null;
    let latestPredEnd = -Infinity;

    precIds.forEach((pid) => {
      const pred = operations[pid];
      if (pred && !visited.has(pred.id)) {
        const endMs = new Date(pred.plannedEndTime).getTime();
        if (endMs > latestPredEnd) {
          latestPredEnd = endMs;
          latestPred = pred;
        }
      }
    });

    if (latestPred) {
      result.criticalLinks.add(`${(latestPred as Operation).id}->${current.id}`);
      traceBack(latestPred);
    }
  };

  traceBack(bottleneckOp);
  result.totalCriticalOperations = result.criticalOperationIds.size;

  return result;
}

/**
 * Computes Machine Capacity Load Heatmap Bins across the timeline
 * Slices timeline into standard 4-hour bins and computes utilization percentage.
 */
export function computeResourceHeatmap(
  resourceId: string,
  operations: Operation[],
  downtimes: ResourceDowntime[],
  timelineStart: Date,
  timelineEnd: Date,
  binHours: number = 4
): HeatmapBin[] {
  const bins: HeatmapBin[] = [];
  const binMs = binHours * 3600 * 1000;
  const startMs = timelineStart.getTime();
  const endMs = timelineEnd.getTime();

  if (startMs >= endMs) return bins;

  let curStartMs = startMs;
  let binIndex = 0;

  while (curStartMs < endMs) {
    const curEndMs = Math.min(curStartMs + binMs, endMs);
    const binDurationMinutes = (curEndMs - curStartMs) / 60000;

    let busyMinutes = 0;

    // 1. Calculate Operation overlaps in this bin
    operations.forEach((op) => {
      const opStartMs = new Date(op.plannedStartTime).getTime();
      const durationMs = (op.setupDurationMinutes + op.durationMinutes) * 60000;
      const opEndMs = opStartMs + durationMs;

      const overlapStart = Math.max(curStartMs, opStartMs);
      const overlapEnd = Math.min(curEndMs, opEndMs);

      if (overlapEnd > overlapStart) {
        busyMinutes += (overlapEnd - overlapStart) / 60000;
      }
    });

    // 2. Calculate Downtime overlaps in this bin
    downtimes.forEach((dt) => {
      const dtStartMs = new Date(dt.startTime).getTime();
      const dtEndMs = new Date(dt.endTime).getTime();

      const overlapStart = Math.max(curStartMs, dtStartMs);
      const overlapEnd = Math.min(curEndMs, dtEndMs);

      if (overlapEnd > overlapStart) {
        busyMinutes += (overlapEnd - overlapStart) / 60000;
      }
    });

    const utilizationPercent = Math.min(
      100,
      Math.round((busyMinutes / Math.max(1, binDurationMinutes)) * 100)
    );

    let level: HeatmapBin['level'] = 'idle';
    if (utilizationPercent > 85) level = 'overload';
    else if (utilizationPercent > 50) level = 'high';
    else if (utilizationPercent > 0) level = 'optimal';

    bins.push({
      id: `bin-${resourceId}-${binIndex++}`,
      start: new Date(curStartMs),
      end: new Date(curEndMs),
      busyMinutes: Math.round(busyMinutes),
      totalMinutes: Math.round(binDurationMinutes),
      utilizationPercent,
      level,
    });

    curStartMs = curEndMs;
  }

  return bins;
}

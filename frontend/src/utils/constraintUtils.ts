import { Operation, WorkOrder, ResourceDowntime, ShiftSchedule } from '../types/schedule';
import { getOffShiftIntervals } from './shiftUtils';

export interface OperationConstraintViolation {
  isLate: boolean;
  latenessMinutes: number;
  isPrecedenceViolated: boolean;
  precedingOpName?: string;
  isMachineClash: boolean;
  clashingOpName?: string;
  isDowntimeClash: boolean;
  downtimeReason?: string;
  isOffShiftClash: boolean;
  offShiftReason?: string;
  isHighPriority: boolean;
  priorityLevel: number;
}

/**
 * Detects real-time scheduling constraint violations on an operation:
 * 1. Due Date Violation (Work order due date exceeded)
 * 2. Precedence Violation (Starting before predecessor finished)
 * 3. Machine Clash (Overlapping operations on same resource)
 * 4. Downtime / Maintenance Clash (Overlapping with planned line maintenance)
 * 5. Off-Shift / Weekend Violation (Scheduled during factory off-hours or holiday)
 * 6. High / Urgent Priority Order
 */
export function detectOperationConstraints(
  operation: Operation,
  workOrder: WorkOrder | undefined,
  allOperations: Record<string, Operation> | Operation[],
  allDowntimes: Record<string, ResourceDowntime> | ResourceDowntime[],
  shifts?: ShiftSchedule[]
): OperationConstraintViolation {
  const opsList = Array.isArray(allOperations) ? allOperations : Object.values(allOperations || {});
  const dtsList = Array.isArray(allDowntimes) ? allDowntimes : Object.values(allDowntimes || {});

  const opStartMs = new Date(operation.plannedStartTime).getTime();
  const opEndMs = new Date(operation.plannedEndTime).getTime();

  let isLate = false;
  let latenessMinutes = 0;

  // 1. Due Date Violation Check
  if (workOrder?.dueDate) {
    const dueMs = new Date(workOrder.dueDate).getTime();
    if (!isNaN(dueMs) && opEndMs > dueMs) {
      isLate = true;
      latenessMinutes = Math.max(1, Math.round((opEndMs - dueMs) / 60000));
    }
  }

  // 2. Precedence Violation (Sequence Dependency)
  let isPrecedenceViolated = false;
  let precedingOpName: string | undefined;

  const earlierOps = opsList.filter(
    (o) => o.workOrderId === operation.workOrderId && o.sequenceIndex < operation.sequenceIndex
  );
  for (const prevOp of earlierOps) {
    const prevEndMs = new Date(prevOp.plannedEndTime).getTime();
    if (prevEndMs > opStartMs) {
      isPrecedenceViolated = true;
      precedingOpName = `${prevOp.name} (#${prevOp.sequenceIndex})`;
      break;
    }
  }

  // 3. Machine Overlap / Clash Check (Same Resource)
  let isMachineClash = false;
  let clashingOpName: string | undefined;

  const sameResourceOps = opsList.filter(
    (o) => o.id !== operation.id && o.requiredResourceId === operation.requiredResourceId
  );
  for (const otherOp of sameResourceOps) {
    const oStartMs = new Date(otherOp.plannedStartTime).getTime();
    const oEndMs = new Date(otherOp.plannedEndTime).getTime();

    // Time overlap condition: (StartA < EndB) && (EndA > StartB)
    if (opStartMs < oEndMs && opEndMs > oStartMs) {
      isMachineClash = true;
      clashingOpName = `${otherOp.workOrderNumber} (${otherOp.name})`;
      break;
    }
  }

  // 4. Resource Maintenance / Downtime Clash
  let isDowntimeClash = false;
  let downtimeReason: string | undefined;

  const sameResourceDts = dtsList.filter((d) => d.resourceId === operation.requiredResourceId);
  for (const dt of sameResourceDts) {
    const dtStartMs = new Date(dt.startTime).getTime();
    const dtEndMs = new Date(dt.endTime).getTime();

    if (opStartMs < dtEndMs && opEndMs > dtStartMs) {
      isDowntimeClash = true;
      downtimeReason = dt.reason || 'Planlı Bakım';
      break;
    }
  }

  // 5. Off-Shift & Weekend Overlap Check
  let isOffShiftClash = false;
  let offShiftReason: string | undefined;

  const activeShifts = (shifts || []).filter((s) => s.isActive);
  if (activeShifts.length > 0 && !isNaN(opStartMs) && !isNaN(opEndMs)) {
    const offIntervals = getOffShiftIntervals(
      activeShifts,
      new Date(opStartMs),
      new Date(opEndMs)
    );

    for (const interval of offIntervals) {
      const iStartMs = interval.start.getTime();
      const iEndMs = interval.end.getTime();

      // Overlap: (OpStart < IntervalEnd) && (OpEnd > IntervalStart)
      if (opStartMs < iEndMs && opEndMs > iStartMs) {
        isOffShiftClash = true;
        offShiftReason = interval.label;
        break;
      }
    }
  }

  // 6. Priority Level (Priority >= 8 is High / Urgent, Priority >= 9 is Critical P1)
  const priority = workOrder?.priority ?? 1;
  const isHighPriority = priority >= 8;

  return {
    isLate,
    latenessMinutes,
    isPrecedenceViolated,
    precedingOpName,
    isMachineClash,
    clashingOpName,
    isDowntimeClash,
    downtimeReason,
    isOffShiftClash,
    offShiftReason,
    isHighPriority,
    priorityLevel: priority,
  };
}

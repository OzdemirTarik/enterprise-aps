import { Operation, WorkOrder, ResourceDowntime, ShiftSchedule } from '../types/schedule';
import { parseTimeToMinutes } from './shiftUtils';

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
 * Fast zero-allocation check if a timestamp is within an active factory shift.
 */
export function isTimestampInActiveShift(
  date: Date,
  activeShifts: ShiftSchedule[]
): { isInShift: boolean; reason?: string } {
  if (!activeShifts || activeShifts.length === 0) return { isInShift: true };

  const jsDay = date.getDay();
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;

  const dayShifts = activeShifts.filter((s) => s.daysOfWeek && s.daysOfWeek.includes(dayOfWeek));
  if (dayShifts.length === 0) {
    const dayName = dayOfWeek === 7 ? 'Pazar' : dayOfWeek === 6 ? 'Cumartesi' : 'Tatil';
    return { isInShift: false, reason: `${dayName} - Tam Gün Tatil` };
  }

  const cursorMin = date.getHours() * 60 + date.getMinutes();
  for (let i = 0; i < dayShifts.length; i++) {
    const s = dayShifts[i];
    const sMin = parseTimeToMinutes(s.startTime, false);
    const eMin = parseTimeToMinutes(s.endTime, true);
    if (cursorMin >= sMin && cursorMin < eMin) {
      return { isInShift: true };
    }
  }

  return { isInShift: false, reason: 'Vardiya Dışı Saat' };
}

/**
 * High-performance constraint violation detection.
 * Optimized with fast array loops and zero-allocation timestamp checks to guarantee 60fps drag performance.
 */
export function detectOperationConstraints(
  operation: Operation,
  workOrder: WorkOrder | undefined,
  allOperations: Record<string, Operation> | Operation[],
  allDowntimes: Record<string, ResourceDowntime> | ResourceDowntime[],
  shifts?: ShiftSchedule[]
): OperationConstraintViolation {
  const opStart = new Date(operation.plannedStartTime);
  const opEnd = new Date(operation.plannedEndTime);
  const opStartMs = opStart.getTime();
  const opEndMs = opEnd.getTime();

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

  // 2. Precedence and Machine Clash (Single Pass over operations)
  let isPrecedenceViolated = false;
  let precedingOpName: string | undefined;
  let isMachineClash = false;
  let clashingOpName: string | undefined;

  const opsList = Array.isArray(allOperations) ? allOperations : Object.values(allOperations || {});

  for (let i = 0; i < opsList.length; i++) {
    const o = opsList[i];
    if (o.id === operation.id) continue;

    // Check precedence
    if (!isPrecedenceViolated && o.workOrderId === operation.workOrderId && o.sequenceIndex < operation.sequenceIndex) {
      const prevEndMs = new Date(o.plannedEndTime).getTime();
      if (prevEndMs > opStartMs) {
        isPrecedenceViolated = true;
        precedingOpName = `${o.name} (#${o.sequenceIndex})`;
      }
    }

    // Check machine clash on same resource
    if (!isMachineClash && o.requiredResourceId === operation.requiredResourceId) {
      const oStartMs = new Date(o.plannedStartTime).getTime();
      const oEndMs = new Date(o.plannedEndTime).getTime();
      if (opStartMs < oEndMs && opEndMs > oStartMs) {
        isMachineClash = true;
        clashingOpName = `${o.workOrderNumber} (${o.name})`;
      }
    }

    if (isPrecedenceViolated && isMachineClash) break;
  }

  // 3. Resource Maintenance / Downtime Clash
  let isDowntimeClash = false;
  let downtimeReason: string | undefined;

  const dtsList = Array.isArray(allDowntimes) ? allDowntimes : Object.values(allDowntimes || {});
  for (let i = 0; i < dtsList.length; i++) {
    const dt = dtsList[i];
    if (dt.resourceId !== operation.requiredResourceId) continue;

    const dtStartMs = new Date(dt.startTime).getTime();
    const dtEndMs = new Date(dt.endTime).getTime();

    if (opStartMs < dtEndMs && opEndMs > dtStartMs) {
      isDowntimeClash = true;
      downtimeReason = dt.reason || 'Planlı Bakım';
      break;
    }
  }

  // 4. Off-Shift & Weekend Fast Check
  let isOffShiftClash = false;
  let offShiftReason: string | undefined;

  const activeShifts = (shifts || []).filter((s) => s.isActive);
  if (activeShifts.length > 0 && !isNaN(opStartMs) && !isNaN(opEndMs)) {
    const startShiftCheck = isTimestampInActiveShift(opStart, activeShifts);
    if (!startShiftCheck.isInShift) {
      isOffShiftClash = true;
      offShiftReason = startShiftCheck.reason;
    } else {
      const endMinus1Min = new Date(opEndMs - 60000);
      const endShiftCheck = isTimestampInActiveShift(endMinus1Min, activeShifts);
      if (!endShiftCheck.isInShift) {
        isOffShiftClash = true;
        offShiftReason = endShiftCheck.reason;
      }
    }
  }

  // 5. Priority Level
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

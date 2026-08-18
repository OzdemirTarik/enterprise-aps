import { Operation, ShiftSchedule } from '../types/schedule';
import { parseTimeToMinutes } from './shiftUtils';
import { startOfDay, addDays, getDay } from 'date-fns';

export interface SnapTarget {
  type:
    | 'neighbor-left'
    | 'neighbor-right'
    | 'predecessor'
    | 'successor'
    | 'shift-start'
    | 'shift-end'
    | 'grid';
  labelKey: string;
  detail: string;
  snappedStartMinutes: number;
  guideLineMinutes: number; // Position where vertical snap line is drawn
}

export interface SnapParams {
  proposedStartMinutes: number; // proposed start in minutes from timelineStart
  totalDurationMinutes: number; // setup + processing duration
  currentOp: Operation;
  allOperations: Operation[];
  shifts: ShiftSchedule[];
  timelineStart: Date;
  minuteWidth: number;
  snapThresholdMinutes?: number;
  gridMinutes?: number;
}

/**
 * High-performance smart magnetic snapping algorithm for APS Gantt scheduling.
 * Snaps to:
 * 1. Same resource neighbor operations (Sol/Sağ Komşu bitiş/başlangıcı - Zero Gap)
 * 2. Predecessor & Successor operations within the same Work Order (Öncül/Ardıl adımlar)
 * 3. Factory Shift Start & End boundaries (08:00, 16:00, etc.)
 * 4. Standard 15-minute time grid fallback
 */
export function findMagneticSnap({
  proposedStartMinutes,
  totalDurationMinutes,
  currentOp,
  allOperations,
  shifts,
  timelineStart,
  minuteWidth,
  gridMinutes = 15,
}: SnapParams): { snappedStartMinutes: number; snapTarget: SnapTarget | null } {
  // If minuteWidth is large (zoomed in), threshold in minutes is smaller (e.g. 18px / minuteWidth)
  const dynamicThresholdMinutes = Math.max(6, Math.min(30, 18 / (minuteWidth || 1)));

  const timelineStartMs = timelineStart.getTime();

  let bestSnap: SnapTarget | null = null;
  let minDiff = dynamicThresholdMinutes;

  // 1. Same Resource Neighbors (Zero-Gap SMT/THT line optimization)
  const sameResourceOps = allOperations.filter(
    (op) => op.id !== currentOp.id && op.requiredResourceId === currentOp.requiredResourceId
  );

  sameResourceOps.forEach((otherOp) => {
    const oStartMs = new Date(otherOp.plannedStartTime).getTime();
    const oEndMs = new Date(otherOp.plannedEndTime).getTime();
    const otherStartMin = (oStartMs - timelineStartMs) / 60000;
    const otherEndMin = (oEndMs - timelineStartMs) / 60000;

    // A) Snap our START to other operation's END (Sol Komşu Bitişi)
    const diffLeft = Math.abs(proposedStartMinutes - otherEndMin);
    if (diffLeft < minDiff) {
      minDiff = diffLeft;
      bestSnap = {
        type: 'neighbor-left',
        labelKey: 'snappedToNeighborLeft',
        detail: `${otherOp.workOrderNumber} (${otherOp.name})`,
        snappedStartMinutes: otherEndMin,
        guideLineMinutes: otherEndMin,
      };
    }

    // B) Snap our END to other operation's START (Sağ Komşu Başlangıcı)
    const targetStartForRightSnap = otherStartMin - totalDurationMinutes;
    const diffRight = Math.abs(proposedStartMinutes - targetStartForRightSnap);
    if (diffRight < minDiff) {
      minDiff = diffRight;
      bestSnap = {
        type: 'neighbor-right',
        labelKey: 'snappedToNeighborRight',
        detail: `${otherOp.workOrderNumber} (${otherOp.name})`,
        snappedStartMinutes: targetStartForRightSnap,
        guideLineMinutes: otherStartMin,
      };
    }
  });

  // 2. Predecessor in same Work Order (Öncül Operasyon Bitişi)
  if (currentOp.sequenceIndex > 1) {
    const predecessor = allOperations.find(
      (op) =>
        op.workOrderId === currentOp.workOrderId &&
        op.sequenceIndex === currentOp.sequenceIndex - 1
    );
    if (predecessor) {
      const pEndMs = new Date(predecessor.plannedEndTime).getTime();
      const predEndMin = (pEndMs - timelineStartMs) / 60000;
      const diffPred = Math.abs(proposedStartMinutes - predEndMin);
      if (diffPred < minDiff) {
        minDiff = diffPred;
        bestSnap = {
          type: 'predecessor',
          labelKey: 'snappedToPredecessor',
          detail: `${predecessor.name} (#${predecessor.sequenceIndex})`,
          snappedStartMinutes: predEndMin,
          guideLineMinutes: predEndMin,
        };
      }
    }
  }

  // 3. Successor in same Work Order (Ardıl Operasyon Başlangıcı)
  const successor = allOperations.find(
    (op) =>
      op.workOrderId === currentOp.workOrderId &&
      op.sequenceIndex === currentOp.sequenceIndex + 1
  );
  if (successor) {
    const sStartMs = new Date(successor.plannedStartTime).getTime();
    const succStartMin = (sStartMs - timelineStartMs) / 60000;
    const targetStartForSucc = succStartMin - totalDurationMinutes;
    const diffSucc = Math.abs(proposedStartMinutes - targetStartForSucc);
    if (diffSucc < minDiff) {
      minDiff = diffSucc;
      bestSnap = {
        type: 'successor',
        labelKey: 'snappedToSuccessor',
        detail: `${successor.name} (#${successor.sequenceIndex})`,
        snappedStartMinutes: targetStartForSucc,
        guideLineMinutes: succStartMin,
      };
    }
  }

  // 4. Active Shift Boundaries (Vardiya Başlangıç / Bitiş Saatleri)
  const activeShifts = (shifts || []).filter((s) => s.isActive);
  if (activeShifts.length > 0) {
    const centerDay = Math.floor(proposedStartMinutes / 1440);
    for (let dayOffset = centerDay - 1; dayOffset <= centerDay + 1; dayOffset++) {
      if (dayOffset < 0) continue;
      const dayDate = addDays(startOfDay(timelineStart), dayOffset);
      const jsDay = getDay(dayDate);
      const isoDayNumber = jsDay === 0 ? 7 : jsDay;
      const dayBaseMin = dayOffset * 1440;

      const dayShifts = activeShifts.filter((s) => s.daysOfWeek.includes(isoDayNumber));
      dayShifts.forEach((s) => {
        const sMin = parseTimeToMinutes(s.startTime, false);
        const eMin = parseTimeToMinutes(s.endTime, true);

        // Shift start snap
        const shiftStartMin = dayBaseMin + sMin;
        const diffShiftStart = Math.abs(proposedStartMinutes - shiftStartMin);
        if (diffShiftStart < minDiff) {
          minDiff = diffShiftStart;
          bestSnap = {
            type: 'shift-start',
            labelKey: 'snappedToShiftStart',
            detail: `${s.name} (${s.startTime})`,
            snappedStartMinutes: shiftStartMin,
            guideLineMinutes: shiftStartMin,
          };
        }

        // Shift end snap (our end aligns to shift end)
        const shiftEndMin = dayBaseMin + eMin;
        const targetForShiftEnd = shiftEndMin - totalDurationMinutes;
        const diffShiftEnd = Math.abs(proposedStartMinutes - targetForShiftEnd);
        if (diffShiftEnd < minDiff) {
          minDiff = diffShiftEnd;
          bestSnap = {
            type: 'shift-end',
            labelKey: 'snappedToShiftEnd',
            detail: `${s.name} (${s.endTime})`,
            snappedStartMinutes: targetForShiftEnd,
            guideLineMinutes: shiftEndMin,
          };
        }
      });
    }
  }

  // If magnetic snap found, return it!
  if (bestSnap) {
    return {
      snappedStartMinutes: Math.max(0, (bestSnap as SnapTarget).snappedStartMinutes),
      snapTarget: bestSnap,
    };
  }

  // Otherwise, fallback to standard grid snap (e.g. 15 min)
  const gridSnapped = Math.round(proposedStartMinutes / gridMinutes) * gridMinutes;
  return {
    snappedStartMinutes: Math.max(0, gridSnapped),
    snapTarget: null,
  };
}

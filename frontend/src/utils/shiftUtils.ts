import { ShiftSchedule } from '../types/schedule';
import { startOfDay, addDays, isValid } from 'date-fns';

export interface ShiftInterval {
  id: string;
  start: Date;
  end: Date;
  isFullDayOff: boolean;
  isWeekend: boolean;
  label: string;
}

/**
 * Parses time string (e.g. "08:00" or "08:00:00") into minutes from midnight (0..1440).
 */
export function parseTimeToMinutes(timeStr: string, isEndTime = false): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map((p) => parseInt(p, 10));
  const hours = isNaN(parts[0]) ? 0 : parts[0];
  const minutes = isNaN(parts[1]) ? 0 : parts[1];

  if (isEndTime && hours === 0 && minutes === 0) {
    return 1440; // 00:00 as end time represents 24:00 (end of day)
  }
  return hours * 60 + minutes;
}

/**
 * Calculates non-working / off-shift intervals across the timeline based on active shift schedules.
 */
export function getOffShiftIntervals(
  shifts: ShiftSchedule[],
  timelineStart: Date,
  timelineEnd: Date
): ShiftInterval[] {
  if (!isValid(timelineStart) || !isValid(timelineEnd) || timelineEnd <= timelineStart) {
    return [];
  }

  // Filter only active shifts
  const activeShifts = (shifts || []).filter((s) => s.isActive);
  if (activeShifts.length === 0) {
    return [];
  }

  const intervals: ShiftInterval[] = [];
  let currentDay = startOfDay(timelineStart);
  const endLimit = addDays(startOfDay(timelineEnd), 1);
  let idCounter = 0;

  while (currentDay < endLimit) {
    // 1 = Monday, 2 = Tuesday, ..., 7 = Sunday
    const jsDay = currentDay.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;
    const isWeekendDay = dayOfWeek === 6 || dayOfWeek === 7;

    const dayShifts = activeShifts.filter((s) => s.daysOfWeek.includes(dayOfWeek));

    if (dayShifts.length === 0) {
      // Entire day is non-working (e.g. Sunday or Saturday)
      const dayStart = new Date(
        currentDay.getFullYear(),
        currentDay.getMonth(),
        currentDay.getDate(),
        0,
        0,
        0,
        0
      );
      const dayEnd = new Date(
        currentDay.getFullYear(),
        currentDay.getMonth(),
        currentDay.getDate() + 1,
        0,
        0,
        0,
        0
      );

      const dayName = dayOfWeek === 7 ? 'Pazar' : dayOfWeek === 6 ? 'Cumartesi' : 'Tatil';
      intervals.push({
        id: `full-off-day-${idCounter++}`,
        start: dayStart,
        end: dayEnd,
        isFullDayOff: true,
        isWeekend: isWeekendDay,
        label: `${dayName} - Tam Gün Tatil (Off-Day)`,
      });
    } else {
      // Working day: collect all working spans
      const workSpans: Array<{ startMin: number; endMin: number }> = [];

      dayShifts.forEach((s) => {
        const sMin = parseTimeToMinutes(s.startTime, false);
        const eMin = parseTimeToMinutes(s.endTime, true);
        if (eMin > sMin) {
          workSpans.push({ startMin: sMin, endMin: eMin });
        } else if (eMin < sMin) {
          // Cross-midnight shift starting today
          workSpans.push({ startMin: sMin, endMin: 1440 });
        }
      });

      // Check if previous day had a shift crossing into today
      const prevJsDay = addDays(currentDay, -1).getDay();
      const prevDayOfWeek = prevJsDay === 0 ? 7 : prevJsDay;
      const prevDayShifts = activeShifts.filter((s) => s.daysOfWeek.includes(prevDayOfWeek));
      prevDayShifts.forEach((s) => {
        const sMin = parseTimeToMinutes(s.startTime, false);
        const eMin = parseTimeToMinutes(s.endTime, true);
        if (eMin < sMin && eMin > 0) {
          workSpans.push({ startMin: 0, endMin: eMin });
        }
      });

      workSpans.sort((a, b) => a.startMin - b.startMin);

      // Merge overlapping work spans
      const mergedWork: Array<{ startMin: number; endMin: number }> = [];
      workSpans.forEach((span) => {
        if (mergedWork.length === 0) {
          mergedWork.push({ ...span });
        } else {
          const prev = mergedWork[mergedWork.length - 1];
          if (span.startMin <= prev.endMin) {
            prev.endMin = Math.max(prev.endMin, span.endMin);
          } else {
            mergedWork.push({ ...span });
          }
        }
      });

      // Invert work spans to find off-shift slots on this working day
      let cursorMin = 0;
      mergedWork.forEach((span) => {
        if (span.startMin > cursorMin) {
          const sDate = new Date(
            currentDay.getFullYear(),
            currentDay.getMonth(),
            currentDay.getDate(),
            Math.floor(cursorMin / 60),
            cursorMin % 60,
            0,
            0
          );
          const eDate = new Date(
            currentDay.getFullYear(),
            currentDay.getMonth(),
            currentDay.getDate(),
            Math.floor(span.startMin / 60),
            span.startMin % 60,
            0,
            0
          );

          const sTimeStr = `${String(Math.floor(cursorMin / 60)).padStart(2, '0')}:${String(cursorMin % 60).padStart(2, '0')}`;
          const eTimeStr = `${String(Math.floor(span.startMin / 60)).padStart(2, '0')}:${String(span.startMin % 60).padStart(2, '0')}`;

          intervals.push({
            id: `off-shift-${idCounter++}`,
            start: sDate,
            end: eDate,
            isFullDayOff: false,
            isWeekend: false,
            label: `Vardiya Dışı (${sTimeStr} - ${eTimeStr})`,
          });
        }
        cursorMin = Math.max(cursorMin, span.endMin);
      });

      if (cursorMin < 1440) {
        const sDate = new Date(
          currentDay.getFullYear(),
          currentDay.getMonth(),
          currentDay.getDate(),
          Math.floor(cursorMin / 60),
          cursorMin % 60,
          0,
          0
        );
        const eDate = new Date(
          currentDay.getFullYear(),
          currentDay.getMonth(),
          currentDay.getDate() + 1,
          0,
          0,
          0,
          0
        );

        const sTimeStr = `${String(Math.floor(cursorMin / 60)).padStart(2, '0')}:${String(cursorMin % 60).padStart(2, '0')}`;

        intervals.push({
          id: `off-shift-${idCounter++}`,
          start: sDate,
          end: eDate,
          isFullDayOff: false,
          isWeekend: false,
          label: `Vardiya Dışı (${sTimeStr} - 00:00)`,
        });
      }
    }

    currentDay = addDays(currentDay, 1);
  }

  return intervals;
}


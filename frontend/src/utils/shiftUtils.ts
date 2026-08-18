import { ShiftSchedule } from '../types/schedule';
import { startOfDay, addDays, isValid } from 'date-fns';

export interface ShiftInterval {
  id: string;
  start: Date;
  end: Date;
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
 * Merges adjacent intervals (such as weekend off-times) for optimal DOM rendering.
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

  const rawIntervals: Array<{ start: Date; end: Date; isWeekend: boolean; label: string }> = [];

  let currentDay = startOfDay(timelineStart);
  const endLimit = addDays(startOfDay(timelineEnd), 1);

  while (currentDay < endLimit) {
    // 1 = Monday, 2 = Tuesday, ..., 7 = Sunday
    const jsDay = currentDay.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;
    const isWeekend = dayOfWeek >= 6;

    const dayShifts = activeShifts.filter((s) => s.daysOfWeek.includes(dayOfWeek));

    if (dayShifts.length === 0) {
      // Entire day is non-working
      const dayStart = new Date(currentDay.getTime());
      const dayEnd = new Date(currentDay.getTime() + 1440 * 60000);
      rawIntervals.push({
        start: dayStart,
        end: dayEnd,
        isWeekend,
        label: isWeekend ? 'Hafta Sonu (Weekend)' : 'Vardiya Dışı (Off-Shift)',
      });
    } else {
      // Collect and sort working time spans in minutes from 0..1440
      const workSpans: Array<{ startMin: number; endMin: number }> = [];
      dayShifts.forEach((s) => {
        const sMin = parseTimeToMinutes(s.startTime, false);
        const eMin = parseTimeToMinutes(s.endTime, true);
        if (eMin > sMin) {
          workSpans.push({ startMin: sMin, endMin: eMin });
        }
      });

      workSpans.sort((a, b) => a.startMin - b.startMin);

      // Merge overlapping or adjacent work spans
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

      // Invert merged work spans to find off-shift periods
      let cursorMin = 0;
      mergedWork.forEach((span) => {
        if (span.startMin > cursorMin) {
          rawIntervals.push({
            start: new Date(currentDay.getTime() + cursorMin * 60000),
            end: new Date(currentDay.getTime() + span.startMin * 60000),
            isWeekend,
            label: 'Vardiya Dışı (Off-Shift)',
          });
        }
        cursorMin = Math.max(cursorMin, span.endMin);
      });

      if (cursorMin < 1440) {
        rawIntervals.push({
          start: new Date(currentDay.getTime() + cursorMin * 60000),
          end: new Date(currentDay.getTime() + 1440 * 60000),
          isWeekend,
          label: 'Vardiya Dışı (Off-Shift)',
        });
      }
    }

    currentDay = addDays(currentDay, 1);
  }

  // Merge continuous adjacent off-shift intervals across midnight/days
  const mergedIntervals: ShiftInterval[] = [];
  rawIntervals.forEach((item, index) => {
    if (mergedIntervals.length === 0) {
      mergedIntervals.push({
        id: `off-shift-${index}`,
        start: item.start,
        end: item.end,
        isWeekend: item.isWeekend,
        label: item.label,
      });
    } else {
      const prev = mergedIntervals[mergedIntervals.length - 1];
      // If previous end equals current start, merge them
      if (Math.abs(prev.end.getTime() - item.start.getTime()) <= 1000) {
        prev.end = item.end;
        if (item.isWeekend) {
          prev.isWeekend = true;
          prev.label = 'Hafta Sonu / Tatil (Weekend)';
        }
      } else {
        mergedIntervals.push({
          id: `off-shift-${index}`,
          start: item.start,
          end: item.end,
          isWeekend: item.isWeekend,
          label: item.label,
        });
      }
    }
  });

  return mergedIntervals;
}

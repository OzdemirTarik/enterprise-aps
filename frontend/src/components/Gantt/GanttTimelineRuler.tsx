import React from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useTranslation } from '../../i18n/useTranslation';
import { addHours, format, addDays, getDay } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';

interface GanttTimelineRulerProps {
  minuteWidth: number;
  canvasWidth: number;
  timelineStart: Date;
  totalDays: number;
  totalHours?: number;
}

export const GanttTimelineRuler: React.FC<GanttTimelineRulerProps> = ({
  minuteWidth,
  canvasWidth,
  timelineStart,
  totalDays,
}) => {
  const { language } = useTranslation();
  const shifts = useScheduleStore((state) => state.shifts) || [];

  const hourWidth = minuteWidth * 60;
  const dayWidth = 24 * hourWidth;
  const dateLocale = language === 'tr' ? tr : enUS;

  // Adaptive label step to prevent overlapping on zoom out
  // hourWidth for month (0.12 * 60) = 7.2px -> Step 6 (4 slots of 43.2px per day)
  // hourWidth for week (0.45 * 60) = 27px -> Step 4 (6 slots of 108px per day)
  // hourWidth for day (1.2 * 60) = 72px -> Step 2 (12 slots of 144px per day)
  // hourWidth for hour (3.0 * 60) = 180px -> Step 1 (24 slots of 180px per day)
  const hourStep =
    hourWidth < 15
      ? 6
      : hourWidth < 40
      ? 4
      : hourWidth < 75
      ? 2
      : 1;

  const daysData = React.useMemo(() => {
    return Array.from({ length: totalDays }).map((_, dayIdx) => {
      const dayDate = addDays(timelineStart, dayIdx);
      const jsDay = getDay(dayDate);
      const isoDayNumber = jsDay === 0 ? 7 : jsDay;
      const hasActiveShifts = shifts.some(
        (s) => s.isActive && (s.daysOfWeek || [1, 2, 3, 4, 5, 6, 7]).includes(isoDayNumber)
      );
      const dayLabelFormat = hourWidth < 15 ? 'EEE, dd MMM' : 'EEE, dd MMM yyyy';
      const label = format(dayDate, dayLabelFormat, { locale: dateLocale });

      const slotCount = 24 / hourStep;
      const slotWidth = hourStep * hourWidth;

      const slots = Array.from({ length: slotCount }).map((_, slotIdx) => {
        const hourNum = slotIdx * hourStep;
        const hourDate = addHours(dayDate, hourNum);

        // Check if any active shift starts around this slot
        const matchingShift = shifts.find((s) => {
          if (!s || !s.isActive) return false;
          const daysList = s.daysOfWeek || [1, 2, 3, 4, 5, 6, 7];
          if (!daysList.includes(isoDayNumber)) return false;
          if (!s.startTime) return false;
          const shiftStartHour = parseInt(s.startTime.split(':')[0], 10);
          return shiftStartHour >= hourNum && shiftStartHour < hourNum + hourStep;
        });

        return {
          hourNum,
          label: format(hourDate, 'HH:00'),
          matchingShift,
          slotWidth,
        };
      });

      return {
        date: dayDate,
        label,
        hasActiveShifts,
        isWeekend: isoDayNumber === 6 || isoDayNumber === 7,
        width: dayWidth,
        slots,
      };
    });
  }, [totalDays, timelineStart, hourWidth, dayWidth, shifts, dateLocale, hourStep]);

  return (
    <div
      className="sticky top-0 z-30 bg-[#0f172a] border-b border-slate-800 select-none shadow-md flex-shrink-0"
      style={{ width: `${canvasWidth}px` }}
    >
      {/* Top Layer: Days */}
      <div className="flex border-b border-slate-800/80 h-7 text-xs font-mono text-slate-300" style={{ width: `${canvasWidth}px` }}>
        {daysData.map((day, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between px-3 border-r font-semibold tracking-wider shrink-0 capitalize truncate ${
              !day.hasActiveShifts
                ? 'bg-slate-950/90 text-amber-400/90 border-slate-700'
                : day.isWeekend
                ? 'bg-[#121c2e] text-cyan-300 border-slate-800'
                : 'bg-[#141e33] text-cyan-400 border-slate-800'
            }`}
            style={{ width: `${day.width}px` }}
          >
            <span className="truncate">{day.label}</span>
            {!day.hasActiveShifts && day.width >= 100 && (
              <span className="text-[10px] bg-amber-950/80 text-amber-300 px-1.5 py-0.2 rounded border border-amber-800/60 font-mono lowercase shrink-0 ml-1">
                tatil
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Layer: Hours & Dynamic Shift Bands with Adaptive Density */}
      <div className="flex h-7 text-[11px] font-mono text-slate-400 relative" style={{ width: `${canvasWidth}px` }}>
        {daysData.map((day, dayIdx) => (
          <div
            key={dayIdx}
            className="flex shrink-0 h-full overflow-hidden border-r border-slate-700/60"
            style={{ width: `${day.width}px` }}
          >
            {day.slots.map((slot, slotIdx) => {
              const shift = slot.matchingShift;
              const shiftColor = shift?.colorCode || '#06b6d4';
              const shiftName = shift?.name || 'Shift';
              const nameParts = shiftName.split(' ');

              return (
                <div
                  key={slotIdx}
                  className={`flex items-center justify-between px-1.5 border-r border-slate-800/50 shrink-0 h-full overflow-hidden min-w-0 transition-colors ${
                    shift ? 'bg-slate-800/40 font-semibold' : ''
                  }`}
                  style={{
                    width: `${slot.slotWidth}px`,
                    borderRightColor: shift ? shiftColor : undefined,
                  }}
                >
                  <span
                    className={`truncate text-[10px] ${
                      shift
                        ? 'text-cyan-300 font-bold'
                        : slot.hourNum === 0
                        ? 'text-amber-400 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    {slot.label}
                  </span>

                  {/* Shift Name Badge when enough space */}
                  {shift && slot.slotWidth >= 65 && (
                    <span
                      className="text-[9px] font-bold uppercase tracking-tighter truncate max-w-[80px] px-1 py-0.5 rounded ml-1 shrink-0"
                      style={{
                        backgroundColor: `${shiftColor}25`,
                        color: shiftColor,
                        border: `1px solid ${shiftColor}50`,
                      }}
                      title={`${shiftName} (${shift.startTime || ''} - ${shift.endTime || ''})`}
                    >
                      {nameParts[0]} {nameParts[1] || ''}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

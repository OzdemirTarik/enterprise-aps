import React from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useTranslation } from '../../i18n/useTranslation';
import { addHours, format, differenceInHours, startOfDay, addDays, getDay, isValid } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';

interface GanttTimelineRulerProps {
  minuteWidth: number;
  canvasWidth: number;
}

export const GanttTimelineRuler: React.FC<GanttTimelineRulerProps> = ({
  minuteWidth,
  canvasWidth,
}) => {
  const { language } = useTranslation();
  const rawTimelineStart = useScheduleStore((state) => state.timelineStart);
  const rawTimelineEnd = useScheduleStore((state) => state.timelineEnd);
  const shifts = useScheduleStore((state) => state.shifts) || [];

  const validStart = isValid(rawTimelineStart)
    ? rawTimelineStart
    : new Date(new Date().setHours(0, 0, 0, 0));
  const validEnd = isValid(rawTimelineEnd)
    ? rawTimelineEnd
    : new Date(new Date().setDate(new Date().getDate() + 4));

  // Align start to start of day for perfectly synchronized day & hour boundaries
  const timelineStart = startOfDay(validStart);
  const timelineEnd = validEnd;

  const hourWidth = minuteWidth * 60;
  const totalHours = Math.max(24, Math.min(720, differenceInHours(timelineEnd, timelineStart)));
  const daysCount = Math.ceil(totalHours / 24);

  const dateLocale = language === 'tr' ? tr : enUS;

  // Adaptive label step to prevent overlapping on zoom out
  // hourWidth >= 75px: 1h steps (01:00, 02:00...)
  // hourWidth >= 40px: 2h steps (00:00, 02:00, 04:00...)
  // hourWidth >= 20px: 4h steps (00:00, 04:00, 08:00, 12:00...)
  // hourWidth >= 10px: 6h steps (00:00, 06:00, 12:00, 18:00...)
  // hourWidth < 10px:  12h steps (00:00, 12:00)
  const hourStep =
    hourWidth >= 75
      ? 1
      : hourWidth >= 40
      ? 2
      : hourWidth >= 20
      ? 4
      : hourWidth >= 10
      ? 6
      : 12;

  const days = Array.from({ length: daysCount }).map((_, idx) => {
    const dayDate = addDays(timelineStart, idx);
    const dayLabelFormat = hourWidth < 15 ? 'EEE, dd MMM' : 'EEE, dd MMM yyyy';
    return {
      date: dayDate,
      label: format(dayDate, dayLabelFormat, { locale: dateLocale }),
      width: 24 * hourWidth,
    };
  });

  const hours = Array.from({ length: totalHours }).map((_, idx) => {
    const hourDate = addHours(timelineStart, idx);
    const hourNum = hourDate.getHours();
    const jsDay = getDay(hourDate);
    const isoDayNumber = jsDay === 0 ? 7 : jsDay;

    // Check if any active shift starts at this hour on this day
    const matchingShift = shifts.find((s) => {
      if (!s || !s.isActive) return false;
      const daysList = s.daysOfWeek || [1, 2, 3, 4, 5, 6, 7];
      if (!daysList.includes(isoDayNumber)) return false;

      if (!s.startTime) return false;
      const shiftStartHour = parseInt(s.startTime.split(':')[0], 10);
      return shiftStartHour === hourNum;
    });

    const isStepHour = hourNum % hourStep === 0;
    const shouldShowText = isStepHour || !!matchingShift;

    return {
      date: hourDate,
      hourNum,
      matchingShift,
      shouldShowText,
      label: format(hourDate, 'HH:00'),
      offset: idx * hourWidth,
    };
  });

  return (
    <div
      className="sticky top-0 z-30 bg-[#0f172a] border-b border-slate-800 select-none shadow-md"
      style={{ width: `${canvasWidth}px` }}
    >
      {/* Top Layer: Days */}
      <div className="flex border-b border-slate-800/80 h-7 text-xs font-mono text-slate-300">
        {days.map((day, idx) => (
          <div
            key={idx}
            className="flex items-center px-3 border-r border-slate-800 bg-[#141e33] font-semibold tracking-wider text-cyan-400 shrink-0 capitalize truncate"
            style={{ width: `${day.width}px` }}
          >
            {day.label}
          </div>
        ))}
      </div>

      {/* Bottom Layer: Hours & Dynamic Shift Bands with Adaptive Density */}
      <div className="flex h-7 text-[11px] font-mono text-slate-400 relative">
        {hours.map((hr, idx) => {
          const shift = hr.matchingShift;
          const shiftColor = shift?.colorCode || '#06b6d4';
          const shiftName = shift?.name || 'Shift';
          const nameParts = shiftName.split(' ');

          return (
            <div
              key={idx}
              className={`flex items-center justify-between px-1 border-r shrink-0 transition-colors overflow-hidden ${
                shift
                  ? 'border-r-2 bg-slate-800/40 font-semibold'
                  : 'border-slate-800/50'
              }`}
              style={{
                width: `${hourWidth}px`,
                borderRightColor: shift ? shiftColor : undefined,
              }}
            >
              {hr.shouldShowText ? (
                <span
                  className={`truncate ${
                    shift
                      ? 'text-cyan-300 font-bold'
                      : hr.hourNum === 0
                      ? 'text-amber-400 font-bold'
                      : 'text-slate-400'
                  }`}
                  style={{ fontSize: hourWidth < 35 ? '10px' : '11px' }}
                >
                  {hr.label}
                </span>
              ) : (
                <span className="text-slate-700/50 text-[9px] mx-auto select-none">·</span>
              )}

              {/* Shift Name Badge when enough space */}
              {shift && hourWidth >= 65 && (
                <span
                  className="text-[9px] font-bold uppercase tracking-tighter truncate max-w-[90px] px-1 py-0.5 rounded ml-1"
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
    </div>
  );
};

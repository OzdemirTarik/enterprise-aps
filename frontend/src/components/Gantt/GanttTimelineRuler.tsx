import React from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useTranslation } from '../../i18n/useTranslation';
import { addHours, format, differenceInHours, startOfDay, addDays, getDay } from 'date-fns';
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
  const timelineStart = useScheduleStore((state) => state.timelineStart);
  const timelineEnd = useScheduleStore((state) => state.timelineEnd);
  const shifts = useScheduleStore((state) => state.shifts);

  const hourWidth = minuteWidth * 60;
  const totalHours = Math.max(24, differenceInHours(timelineEnd, timelineStart));
  const daysCount = Math.ceil(totalHours / 24);

  const dateLocale = language === 'tr' ? tr : enUS;

  const days = Array.from({ length: daysCount }).map((_, idx) => {
    const dayDate = addDays(startOfDay(timelineStart), idx);
    return {
      date: dayDate,
      label: format(dayDate, 'EEE, dd MMM yyyy', { locale: dateLocale }),
      width: 24 * hourWidth,
    };
  });

  const hours = Array.from({ length: totalHours }).map((_, idx) => {
    const hourDate = addHours(timelineStart, idx);
    const hourNum = hourDate.getHours();
    // In date-fns: 0 is Sunday, 1 is Monday... convert to 1=Monday..7=Sunday
    const jsDay = getDay(hourDate);
    const isoDayNumber = jsDay === 0 ? 7 : jsDay;

    // Check if any active shift starts at this hour on this day
    const matchingShift = shifts.find((s) => {
      if (!s.isActive) return false;
      const days = s.daysOfWeek || [1, 2, 3, 4, 5, 6, 7];
      if (!days.includes(isoDayNumber)) return false;

      const shiftStartHour = parseInt(s.startTime.split(':')[0], 10);
      return shiftStartHour === hourNum;
    });

    return {
      date: hourDate,
      hourNum,
      matchingShift,
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
            className="flex items-center px-3 border-r border-slate-800 bg-[#141e33] font-semibold tracking-wider text-cyan-400 shrink-0 capitalize"
            style={{ width: `${day.width}px` }}
          >
            {day.label}
          </div>
        ))}
      </div>

      {/* Bottom Layer: Hours & Dynamic Shift Bands */}
      <div className="flex h-7 text-[11px] font-mono text-slate-400 relative">
        {hours.map((hr, idx) => {
          const shift = hr.matchingShift;
          return (
            <div
              key={idx}
              className={`flex items-center justify-between px-1.5 border-r shrink-0 transition-colors ${
                shift
                  ? 'border-r-2 bg-slate-800/30 font-semibold'
                  : 'border-slate-800/50'
              }`}
              style={{
                width: `${hourWidth}px`,
                borderRightColor: shift ? shift.colorCode : undefined,
              }}
            >
              <span className={shift ? 'text-slate-200 font-bold' : 'text-slate-400'}>
                {hr.label}
              </span>
              {shift && hourWidth > 45 && (
                <span
                  className="text-[9px] font-bold uppercase tracking-tighter truncate max-w-[110px] px-1 py-0.5 rounded"
                  style={{
                    backgroundColor: `${shift.colorCode}20`,
                    color: shift.colorCode,
                    border: `1px solid ${shift.colorCode}40`,
                  }}
                  title={`${shift.name} (${shift.startTime} - ${shift.endTime})`}
                >
                  {shift.name.split(' ')[0]} {shift.name.split(' ')[1] || ''}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

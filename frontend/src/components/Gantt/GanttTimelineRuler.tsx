import React from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { addHours, format, differenceInHours, startOfDay, addDays } from 'date-fns';

interface GanttTimelineRulerProps {
  minuteWidth: number;
  canvasWidth: number;
}

export const GanttTimelineRuler: React.FC<GanttTimelineRulerProps> = ({
  minuteWidth,
  canvasWidth,
}) => {
  const timelineStart = useScheduleStore((state) => state.timelineStart);
  const timelineEnd = useScheduleStore((state) => state.timelineEnd);

  const hourWidth = minuteWidth * 60;
  const totalHours = Math.max(24, differenceInHours(timelineEnd, timelineStart));
  const daysCount = Math.ceil(totalHours / 24);

  const days = Array.from({ length: daysCount }).map((_, idx) => {
    const dayDate = addDays(startOfDay(timelineStart), idx);
    return {
      date: dayDate,
      label: format(dayDate, 'EEE, dd MMM yyyy'),
      width: 24 * hourWidth,
    };
  });

  const hours = Array.from({ length: totalHours }).map((_, idx) => {
    const hourDate = addHours(timelineStart, idx);
    const hourNum = hourDate.getHours();

    let shiftBadge = '';
    if (hourNum === 8) shiftBadge = 'SHIFT 1 (MORNING)';
    if (hourNum === 16) shiftBadge = 'SHIFT 2 (EVENING)';
    if (hourNum === 0) shiftBadge = 'SHIFT 3 (NIGHT)';

    return {
      date: hourDate,
      hourNum,
      shiftBadge,
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
            className="flex items-center px-3 border-r border-slate-800 bg-[#141e33] font-semibold tracking-wider text-sky-400 shrink-0"
            style={{ width: `${day.width}px` }}
          >
            {day.label}
          </div>
        ))}
      </div>

      {/* Bottom Layer: Hours & Shift Bands */}
      <div className="flex h-7 text-[11px] font-mono text-slate-400 relative">
        {hours.map((hr, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between px-1.5 border-r border-slate-800/50 shrink-0 ${
              hr.hourNum % 8 === 0 ? 'border-r-2 border-r-slate-700 bg-slate-800/20' : ''
            }`}
            style={{ width: `${hourWidth}px` }}
          >
            <span className={hr.hourNum % 8 === 0 ? 'text-slate-200 font-bold' : 'text-slate-400'}>
              {hr.label}
            </span>
            {hr.shiftBadge && hourWidth > 60 && (
              <span className="text-[9px] font-bold text-amber-400/80 uppercase tracking-tighter truncate max-w-[80px]">
                {hr.shiftBadge.split(' ')[0]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

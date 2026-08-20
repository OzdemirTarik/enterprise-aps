import React from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { addHours, startOfDay, isValid } from 'date-fns';

interface GanttGridProps {
  minuteWidth: number;
  totalWidth: number;
  totalHeight: number;
  timelineStart?: Date;
  totalDays?: number;
}

export const GanttGrid: React.FC<GanttGridProps> = ({
  minuteWidth,
  totalWidth,
  totalHeight,
  timelineStart: propTimelineStart,
  totalDays: propTotalDays,
}) => {
  const rawTimelineStart = useScheduleStore((state) => state.timelineStart);
  const rawTimelineEnd = useScheduleStore((state) => state.timelineEnd);

  const timelineStart =
    propTimelineStart ??
    (isValid(rawTimelineStart) ? startOfDay(rawTimelineStart) : startOfDay(new Date()));
  const totalDays =
    propTotalDays ??
    Math.max(
      1,
      Math.ceil(
        ((isValid(rawTimelineEnd)
          ? rawTimelineEnd.getTime()
          : timelineStart.getTime() + 4 * 86400000) -
          timelineStart.getTime()) /
          86400000
      )
    );

  const hourWidth = minuteWidth * 60;
  const totalHours = totalDays * 24;

  // Adaptive step for vertical grid lines
  const step = hourWidth < 15 ? 8 : hourWidth < 40 ? 4 : hourWidth < 75 ? 2 : 1;
  const lineCount = Math.floor(totalHours / step);

  const hourLines = React.useMemo(() => {
    return Array.from({ length: lineCount }).map((_, idx) => {
      const hourOffset = idx * step;
      const date = addHours(timelineStart, hourOffset);
      const hour = date.getHours();
      const isDayBoundary = hour === 0;
      const isShiftBoundary = hour % 8 === 0;

      return {
        offset: hourOffset * hourWidth,
        isShiftBoundary,
        isDayBoundary,
      };
    });
  }, [lineCount, step, timelineStart, hourWidth]);

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-0"
      style={{ width: `${totalWidth}px`, height: `${totalHeight}px` }}
    >
      {hourLines.map((col, idx) => (
        <div
          key={idx}
          className={`absolute top-0 bottom-0 ${
            col.isDayBoundary
              ? 'border-r-2 border-slate-700/60 z-10'
              : col.isShiftBoundary
              ? 'border-r border-slate-800/60'
              : 'border-r border-slate-800/30'
          }`}
          style={{
            left: `${col.offset}px`,
            width: '1px',
          }}
        />
      ))}
    </div>
  );
};


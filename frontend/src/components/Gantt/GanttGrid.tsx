import React from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { differenceInHours, addHours } from 'date-fns';

interface GanttGridProps {
  minuteWidth: number;
  totalWidth: number;
  totalHeight: number;
}

export const GanttGrid: React.FC<GanttGridProps> = ({
  minuteWidth,
  totalWidth,
  totalHeight,
}) => {
  const timelineStart = useScheduleStore((state) => state.timelineStart);
  const timelineEnd = useScheduleStore((state) => state.timelineEnd);

  const hourWidth = minuteWidth * 60;
  const totalHours = Math.max(24, differenceInHours(timelineEnd, timelineStart));

  const hourLines = Array.from({ length: totalHours }).map((_, idx) => {
    const date = addHours(timelineStart, idx);
    const hour = date.getHours();
    const isShiftBoundary = hour % 8 === 0;
    const isDayBoundary = hour === 0;
    const isNightShift = hour < 8;

    return {
      offset: idx * hourWidth,
      isShiftBoundary,
      isDayBoundary,
      isNightShift,
    };
  });

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ width: `${totalWidth}px`, height: `${totalHeight}px` }}
    >
      {hourLines.map((col, idx) => (
        <React.Fragment key={idx}>
          {/* Night shift shading */}
          {col.isNightShift && (
            <div
              className="absolute top-0 bottom-0 bg-slate-950/40"
              style={{
                left: `${col.offset}px`,
                width: `${hourWidth}px`,
              }}
            />
          )}

          {/* Vertical Grid Line */}
          <div
            className={`absolute top-0 bottom-0 ${
              col.isDayBoundary
                ? 'border-r-2 border-slate-700/80 z-10'
                : col.isShiftBoundary
                ? 'border-r border-slate-700/50'
                : 'border-r border-slate-800/30'
            }`}
            style={{
              left: `${col.offset}px`,
              width: '1px',
            }}
          />
        </React.Fragment>
      ))}
    </div>
  );
};

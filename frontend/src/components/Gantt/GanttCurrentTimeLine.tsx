import React, { useState, useEffect } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { differenceInMilliseconds } from 'date-fns';

interface GanttCurrentTimeLineProps {
  minuteWidth: number;
  totalHeight: number;
}

export const GanttCurrentTimeLine: React.FC<GanttCurrentTimeLineProps> = ({
  minuteWidth,
  totalHeight,
}) => {
  const timelineStart = useScheduleStore((state) => state.timelineStart);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const elapsedMs = differenceInMilliseconds(now, timelineStart);
  const elapsedMinutes = elapsedMs / 60000;
  const leftPx = elapsedMinutes * minuteWidth;

  if (leftPx < 0) return null;

  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none z-20 flex flex-col items-center"
      style={{ left: `${leftPx}px`, height: `${totalHeight}px` }}
    >
      {/* Top indicator badge */}
      <div className="bg-rose-500 text-white font-mono text-[9px] font-bold px-1 py-0.5 rounded-b shadow-md shadow-rose-500/50 uppercase tracking-tighter">
        NOW
      </div>
      {/* Vertical line with glow */}
      <div className="w-[2px] h-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
    </div>
  );
};

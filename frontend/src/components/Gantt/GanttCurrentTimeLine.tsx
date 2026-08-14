import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { differenceInMilliseconds, format } from 'date-fns';

interface GanttCurrentTimeLineProps {
  minuteWidth: number;
  totalHeight: number;
  timelineStart: Date;
}

export const GanttCurrentTimeLine: React.FC<GanttCurrentTimeLineProps> = ({
  minuteWidth,
  totalHeight,
  timelineStart,
}) => {
  const { t } = useTranslation();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Live update every 10 seconds
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const elapsedMs = differenceInMilliseconds(now, timelineStart);
  const elapsedMinutes = elapsedMs / 60000;
  const leftPx = elapsedMinutes * minuteWidth;

  if (leftPx < 0) return null;

  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none z-30 flex flex-col items-center -ml-[1px]"
      style={{ left: `${leftPx}px`, height: `${totalHeight}px` }}
    >
      {/* Top Indicator Badge with Live Clock & Ping Dot */}
      <div className="bg-rose-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg shadow-rose-600/60 uppercase tracking-tight flex items-center gap-1 border border-rose-400/50 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
        <span>{t('nowBadge')} {format(now, 'HH:mm')}</span>
      </div>

      {/* High-visibility Vertical Line with Neon Glow */}
      <div className="w-[2px] h-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.9)]" />
    </div>
  );
};

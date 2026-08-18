import React, { useMemo } from 'react';
import { Resource } from '../../types/schedule';
import { useScheduleStore, computeResourceHeatmap } from '../../store/useScheduleStore';
import { getOffShiftIntervals } from '../../utils/shiftUtils';
import { GanttOperationBlock } from './GanttOperationBlock';
import { GanttDowntimeBlock } from './GanttDowntimeBlock';
import { format, startOfDay, isValid } from 'date-fns';

interface GanttRowProps {
  resource: Resource;
  minuteWidth: number;
  rowHeight: number;
}

const GanttRowComponent: React.FC<GanttRowProps> = ({
  resource,
  minuteWidth,
  rowHeight,
}) => {
  const operations = useScheduleStore((s) => s.operations);
  const downtimes = useScheduleStore((s) => s.downtimes);
  const shifts = useScheduleStore((s) => s.shifts);
  const locks = useScheduleStore((s) => s.locks);
  const isHeatmapActive = useScheduleStore((s) => s.isHeatmapActive);
  const isShiftOverlayActive = useScheduleStore((s) => s.isShiftOverlayActive);
  const rawTimelineStart = useScheduleStore((s) => s.timelineStart);
  const rawTimelineEnd = useScheduleStore((s) => s.timelineEnd);

  const timelineStart = isValid(rawTimelineStart) ? startOfDay(rawTimelineStart) : startOfDay(new Date());
  const timelineEnd = isValid(rawTimelineEnd) ? rawTimelineEnd : new Date(timelineStart.getTime() + 4 * 86400000);

  const resourceOps = useMemo(
    () => Object.values(operations).filter((op) => op.requiredResourceId === resource.id),
    [operations, resource.id]
  );

  const resourceDowntimes = useMemo(
    () => Object.values(downtimes).filter((dt) => dt.resourceId === resource.id),
    [downtimes, resource.id]
  );

  const activeLock = locks[resource.id];
  const timelineStartMs = timelineStart.getTime();

  // Compute off-shift / non-working intervals
  const offShiftIntervals = useMemo(() => {
    if (!isShiftOverlayActive) return [];
    return getOffShiftIntervals(shifts, timelineStart, timelineEnd);
  }, [isShiftOverlayActive, shifts, timelineStart, timelineEnd]);

  // Compute 4-hour Heatmap Bins for this resource track
  const heatmapBins = useMemo(() => {
    if (!isHeatmapActive) return [];
    return computeResourceHeatmap(
      resource.id,
      resourceOps,
      resourceDowntimes,
      timelineStart,
      timelineEnd,
      4
    );
  }, [isHeatmapActive, resource.id, resourceOps, resourceDowntimes, timelineStart, timelineEnd]);

  return (
    <div
      id={`resource-row-${resource.id}`}
      className="relative w-full border-b border-slate-800/60 transition-colors"
      style={{ height: `${rowHeight}px` }}
    >
      {/* Off-Shift & Non-Working Time Diagonal Shading Background */}
      {isShiftOverlayActive && offShiftIntervals.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          {offShiftIntervals.map((interval) => {
            const startMs = interval.start.getTime();
            const endMs = interval.end.getTime();
            const left = Math.max(0, ((startMs - timelineStartMs) / 60000) * minuteWidth);
            const width = Math.max(4, ((endMs - startMs) / 60000) * minuteWidth);

            return (
              <div
                key={interval.id}
                title={`${interval.label}: ${format(interval.start, 'dd.MM HH:mm')} - ${format(interval.end, 'dd.MM HH:mm')}`}
                className={`absolute top-0 bottom-0 border-r border-slate-800/80 transition-opacity ${
                  interval.isFullDayOff ? 'opacity-85' : 'opacity-50'
                }`}
                style={{
                  left: `${left}px`,
                  width: `${width}px`,
                  background: interval.isFullDayOff
                    ? `repeating-linear-gradient(
                        -45deg,
                        rgba(10, 15, 30, 0.96),
                        rgba(10, 15, 30, 0.96) 10px,
                        rgba(30, 41, 59, 0.65) 10px,
                        rgba(30, 41, 59, 0.65) 20px
                      )`
                    : `repeating-linear-gradient(
                        -45deg,
                        rgba(15, 23, 42, 0.75),
                        rgba(15, 23, 42, 0.75) 6px,
                        rgba(30, 41, 59, 0.35) 6px,
                        rgba(30, 41, 59, 0.35) 12px
                      )`,
                }}
              >
                {width >= 60 && (
                  <div
                    className={`absolute top-1 left-1.5 px-1 py-0.5 rounded text-[8px] font-mono border select-none pointer-events-none truncate max-w-[90%] ${
                      interval.isFullDayOff
                        ? 'bg-amber-950/80 text-amber-300 border-amber-800/50'
                        : 'bg-slate-900/90 text-slate-400 border-slate-800'
                    }`}
                  >
                    {interval.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Active Regional Lock Overlay if locked by another user */}
      {activeLock && (
        <div
          className="absolute inset-0 z-10 pointer-events-none opacity-15"
          style={{ backgroundColor: activeLock.userColor }}
        />
      )}

      {/* Machine Capacity Load Heatmap Background Matrix */}
      {isHeatmapActive && (
        <div className="absolute inset-0 z-0 pointer-events-auto flex">
          {heatmapBins.map((bin) => {
            const startMs = bin.start.getTime();
            const endMs = bin.end.getTime();
            const left = Math.max(0, ((startMs - timelineStartMs) / 60000) * minuteWidth);
            const width = ((endMs - startMs) / 60000) * minuteWidth;

            const getBg = () => {
              if (bin.level === 'overload') return 'bg-rose-950/50 border-r border-rose-500/40 hover:bg-rose-900/60';
              if (bin.level === 'high') return 'bg-amber-950/40 border-r border-amber-500/30 hover:bg-amber-900/50';
              if (bin.level === 'optimal') return 'bg-emerald-950/30 border-r border-emerald-500/30 hover:bg-emerald-900/40';
              return 'bg-slate-950/20 border-r border-slate-800/40 hover:bg-slate-900/30';
            };

            const getBadgeColor = () => {
              if (bin.level === 'overload') return 'bg-rose-500 text-white font-bold shadow-[0_0_8px_rgba(244,63,94,0.8)]';
              if (bin.level === 'high') return 'bg-amber-500 text-slate-950 font-bold';
              if (bin.level === 'optimal') return 'bg-emerald-500/80 text-slate-950 font-semibold';
              return 'bg-slate-800 text-slate-400';
            };

            const tooltipText = `${resource.code} (${resource.name})\nSaat: ${format(bin.start, 'dd MMM HH:mm')} - ${format(bin.end, 'HH:mm')}\nYük: %${bin.utilizationPercent} (${bin.busyMinutes} dk / ${bin.totalMinutes} dk)`;

            return (
              <div
                key={bin.id}
                title={tooltipText}
                className={`absolute top-0 bottom-0 transition-colors flex flex-col justify-start p-1 ${getBg()}`}
                style={{ left: `${left}px`, width: `${width}px` }}
              >
                <div className="flex items-center justify-between pointer-events-none">
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded leading-none ${getBadgeColor()}`}
                  >
                    %{bin.utilizationPercent}
                  </span>
                  <span className="text-[8px] font-mono text-slate-500 opacity-60">
                    {format(bin.start, 'HH:mm')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Render Downtime & Maintenance blocks */}
      {resourceDowntimes.map((dt) => (
        <GanttDowntimeBlock
          key={dt.id}
          downtime={dt}
          minuteWidth={minuteWidth}
        />
      ))}

      {/* Render Operation Blocks */}
      {resourceOps.map((op) => (
        <GanttOperationBlock
          key={op.id}
          operation={op}
          minuteWidth={minuteWidth}
          rowHeight={rowHeight}
        />
      ))}
    </div>
  );
};

export const GanttRow = React.memo(GanttRowComponent);

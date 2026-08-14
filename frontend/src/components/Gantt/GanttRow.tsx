import React from 'react';
import { Resource } from '../../types/schedule';
import { useScheduleStore } from '../../store/useScheduleStore';
import { GanttOperationBlock } from './GanttOperationBlock';
import { GanttDowntimeBlock } from './GanttDowntimeBlock';

interface GanttRowProps {
  resource: Resource;
  minuteWidth: number;
  rowHeight: number;
}

export const GanttRow: React.FC<GanttRowProps> = ({
  resource,
  minuteWidth,
  rowHeight,
}) => {
  const operations = useScheduleStore((s) => s.operations);
  const downtimes = useScheduleStore((s) => s.downtimes);
  const locks = useScheduleStore((s) => s.locks);
  const isHeatmapActive = useScheduleStore((s) => s.isHeatmapActive);
  const timelineStart = useScheduleStore((s) => s.timelineStart);

  const resourceOps = Object.values(operations).filter(
    (op) => op.requiredResourceId === resource.id
  );

  const resourceDowntimes = Object.values(downtimes).filter(
    (dt) => dt.resourceId === resource.id
  );

  const activeLock = locks[resource.id];
  const timelineStartMs = timelineStart.getTime();

  return (
    <div
      id={`resource-row-${resource.id}`}
      className="relative w-full border-b border-slate-800/60 transition-colors"
      style={{ height: `${rowHeight}px` }}
    >
      {/* Active Regional Lock Overlay if locked by another user */}
      {activeLock && (
        <div
          className="absolute inset-0 z-10 pointer-events-none opacity-15"
          style={{ backgroundColor: activeLock.userColor }}
        />
      )}

      {/* Machine Capacity Load Heat Strip */}
      {isHeatmapActive && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-950/80 z-10 pointer-events-none">
          {resourceOps.map((op) => {
            const opStartMs = new Date(op.plannedStartTime).getTime();
            const durationMin = op.setupDurationMinutes + op.durationMinutes;
            const left = Math.max(0, ((opStartMs - timelineStartMs) / 60000) * minuteWidth);
            const width = durationMin * minuteWidth;
            return (
              <div
                key={op.id}
                className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 opacity-90 shadow-[0_0_6px_rgba(245,158,11,0.6)]"
                style={{ left: `${left}px`, width: `${width}px` }}
              />
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

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

  const resourceOps = Object.values(operations).filter(
    (op) => op.requiredResourceId === resource.id
  );

  const resourceDowntimes = Object.values(downtimes).filter(
    (dt) => dt.resourceId === resource.id
  );

  const activeLock = locks[resource.id];

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

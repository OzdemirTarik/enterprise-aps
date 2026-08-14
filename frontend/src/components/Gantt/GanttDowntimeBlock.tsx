import React from 'react';
import { ResourceDowntime } from '../../types/schedule';
import { useScheduleStore } from '../../store/useScheduleStore';
import { AlertTriangle, X } from 'lucide-react';

interface GanttDowntimeBlockProps {
  downtime: ResourceDowntime;
  minuteWidth: number;
}

export const GanttDowntimeBlock: React.FC<GanttDowntimeBlockProps> = ({
  downtime,
  minuteWidth,
}) => {
  const timelineStart = useScheduleStore((s) => s.timelineStart);
  const deleteDowntime = useScheduleStore((s) => s.deleteDowntime);

  const startMs = new Date(downtime.startTime).getTime();
  const endMs = new Date(downtime.endTime).getTime();
  const timelineStartMs = timelineStart.getTime();

  const startMinutes = (startMs - timelineStartMs) / 60000;
  const durationMinutes = (endMs - startMs) / 60000;

  const left = Math.max(0, startMinutes * minuteWidth);
  const width = Math.max(20, durationMinutes * minuteWidth);

  return (
    <div
      className="absolute top-1 bottom-1 rounded border border-amber-500/60 z-10 flex items-center justify-between px-2 text-[10px] font-semibold text-amber-200 shadow-md group cursor-pointer"
      style={{
        left: `${left}px`,
        width: `${width}px`,
        background: `repeating-linear-gradient(
          -45deg,
          rgba(245, 158, 11, 0.25),
          rgba(245, 158, 11, 0.25) 8px,
          rgba(217, 119, 6, 0.4) 8px,
          rgba(217, 119, 6, 0.4) 16px
        )`,
      }}
      title={`${downtime.isPlanned ? 'Planned Maintenance' : 'Machine Breakdown'}: ${
        downtime.reason
      }\n${new Date(downtime.startTime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })} - ${new Date(downtime.endTime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`}
    >
      <div className="flex items-center gap-1.5 truncate">
        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
        <span className="truncate">{downtime.reason}</span>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm(`Delete maintenance '${downtime.reason}'?`)) {
            deleteDowntime(downtime.id);
          }
        }}
        className="opacity-0 group-hover:opacity-100 hover:bg-amber-600/40 rounded p-0.5 text-amber-300 transition-opacity"
        title="Remove Maintenance"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

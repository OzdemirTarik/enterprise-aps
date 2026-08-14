import React, { useState } from 'react';
import { Operation } from '../../types/schedule';
import { useScheduleStore } from '../../store/useScheduleStore';

interface GanttOperationBlockProps {
  operation: Operation;
  minuteWidth: number;
  rowHeight: number;
}

export const GanttOperationBlock: React.FC<GanttOperationBlockProps> = ({
  operation,
  minuteWidth,
}) => {
  const timelineStart = useScheduleStore((s) => s.timelineStart);
  const selectedOperationId = useScheduleStore((s) => s.selectedOperationId);
  const hoveredOperationId = useScheduleStore((s) => s.hoveredOperationId);
  const setSelectedOperationId = useScheduleStore((s) => s.setSelectedOperationId);
  const setHoveredOperationId = useScheduleStore((s) => s.setHoveredOperationId);
  const rescheduleOptimistic = useScheduleStore((s) => s.rescheduleOptimistic);
  const resizeOperationOptimistic = useScheduleStore((s) => s.resizeOperationOptimistic);
  const setContextMenu = useScheduleStore((s) => s.setContextMenu);
  const searchQuery = useScheduleStore((s) => s.searchQuery);
  const workOrderFilter = useScheduleStore((s) => s.workOrderFilter);
  const statusFilter = useScheduleStore((s) => s.statusFilter);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [dragOffsetMinutes, setDragOffsetMinutes] = useState(0);
  const [resizeDeltaMinutes, setResizeDeltaMinutes] = useState(0);

  const startMs = new Date(operation.plannedStartTime).getTime();
  const timelineStartMs = timelineStart.getTime();

  const baseStartMinutes = (startMs - timelineStartMs) / 60000;
  const effectiveStartMinutes = baseStartMinutes + dragOffsetMinutes;
  const effectiveDuration = Math.max(15, operation.durationMinutes + resizeDeltaMinutes);

  const setupWidth = operation.setupDurationMinutes * minuteWidth;
  const processWidth = effectiveDuration * minuteWidth;
  const totalWidth = setupWidth + processWidth;
  const leftPosition = effectiveStartMinutes * minuteWidth;

  const isSelected = selectedOperationId === operation.id;
  const isHovered = hoveredOperationId === operation.id;

  // Search & Filter matching
  const matchesSearch =
    !searchQuery ||
    operation.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    operation.workOrderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    operation.productType.toLowerCase().includes(searchQuery.toLowerCase());

  const matchesFilter =
    (!workOrderFilter || operation.workOrderId === workOrderFilter) &&
    (!statusFilter || operation.status === statusFilter);

  const isDimmed = !matchesSearch || !matchesFilter;

  // Move Dragging (Horizontal + Snap)
  const handleMouseDownMove = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    if (operation.isLocked) return;

    e.stopPropagation();
    setIsDragging(true);
    const startClientX = e.clientX;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - startClientX;
      let rawDeltaMin = deltaPx / minuteWidth;
      // 15-minute magnetic snapping
      const snappedDeltaMin = Math.round(rawDeltaMin / 15) * 15;
      setDragOffsetMinutes(snappedDeltaMin);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setIsDragging(false);

      if (dragOffsetMinutes !== 0) {
        const newStartMs = startMs + dragOffsetMinutes * 60000;
        rescheduleOptimistic(
          operation.id,
          operation.requiredResourceId,
          new Date(newStartMs)
        );
      }
      setDragOffsetMinutes(0);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Right Edge Duration Resize Dragging
  const handleMouseDownResizeRight = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (operation.isLocked) return;

    e.stopPropagation();
    setIsResizingRight(true);
    const startClientX = e.clientX;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - startClientX;
      let rawDeltaMin = deltaPx / minuteWidth;
      const snappedDeltaMin = Math.round(rawDeltaMin / 15) * 15;
      const newDuration = operation.durationMinutes + snappedDeltaMin;
      if (newDuration >= 15) {
        setResizeDeltaMinutes(snappedDeltaMin);
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setIsResizingRight(false);

      const finalDuration = Math.max(15, operation.durationMinutes + resizeDeltaMinutes);
      if (finalDuration !== operation.durationMinutes) {
        resizeOperationOptimistic(operation.id, finalDuration);
      }
      setResizeDeltaMinutes(0);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedOperationId(operation.id);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      operationId: operation.id,
    });
  };

  const getStatusBorder = () => {
    if (operation.status === 'Delayed') return 'border-rose-500 shadow-rose-950/40';
    if (operation.status === 'InProgress') return 'border-emerald-400 shadow-emerald-950/40';
    if (operation.status === 'Completed') return 'border-indigo-400 opacity-75';
    return 'border-sky-500/50 shadow-sky-950/40';
  };

  const baseColor = operation.colorCode || '#0284c7';

  return (
    <div
      id={`gantt-op-${operation.id}`}
      onMouseDown={handleMouseDownMove}
      onContextMenu={handleContextMenu}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedOperationId(operation.id);
      }}
      onMouseEnter={() => setHoveredOperationId(operation.id)}
      onMouseLeave={() => setHoveredOperationId(null)}
      className={`absolute top-1 bottom-1 rounded-md border text-xs cursor-move select-none transition-shadow group ${getStatusBorder()} ${
        isSelected ? 'ring-2 ring-sky-400 ring-offset-1 ring-offset-slate-900 shadow-lg z-30' : 'z-20'
      } ${isHovered ? 'brightness-110 shadow-md' : ''} ${
        isDragging || isResizingRight ? 'opacity-90 shadow-2xl scale-[1.01]' : ''
      } ${isDimmed ? 'opacity-25 grayscale-[60%]' : ''}`}
      style={{
        left: `${leftPosition}px`,
        width: `${totalWidth}px`,
        backgroundColor: '#0f172a',
      }}
    >
      <div className="flex h-full w-full overflow-hidden rounded-[5px]">
        {/* Sequence Setup Time Zone (Hatched) */}
        {operation.setupDurationMinutes > 0 && (
          <div
            className="h-full flex items-center justify-center border-r border-slate-700/60 text-[10px] font-mono text-amber-300 font-semibold px-1 shrink-0"
            style={{
              width: `${setupWidth}px`,
              background: `repeating-linear-gradient(
                45deg,
                rgba(245, 158, 11, 0.15),
                rgba(245, 158, 11, 0.15) 6px,
                rgba(245, 158, 11, 0.3) 6px,
                rgba(245, 158, 11, 0.3) 12px
              )`,
            }}
            title={`Setup Time: ${operation.setupDurationMinutes} min (${operation.productType})`}
          >
            {setupWidth > 28 && <span>{operation.setupDurationMinutes}m</span>}
          </div>
        )}

        {/* Processing Duration Zone */}
        <div
          className="h-full flex-1 flex items-center justify-between px-2 text-white font-medium overflow-hidden relative"
          style={{
            backgroundColor: `${baseColor}22`,
            borderLeft: `3px solid ${baseColor}`,
          }}
        >
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            {operation.isLocked && <span className="text-amber-400 text-xs">🔒</span>}
            <span className="font-mono text-[11px] font-bold text-sky-300 shrink-0">
              {operation.workOrderNumber || operation.workOrderId}
            </span>
            <span className="text-slate-200 text-[11px] truncate">{operation.name}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono text-slate-400 pl-1">
            <span className="bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/50">
              {effectiveDuration}m
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Right Edge Resize Handle */}
      {!operation.isLocked && (
        <div
          onMouseDown={handleMouseDownResizeRight}
          className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-sky-400/60 rounded-r transition-colors z-40 group-hover:bg-sky-500/20"
          title="Drag to resize duration"
        />
      )}
    </div>
  );
};

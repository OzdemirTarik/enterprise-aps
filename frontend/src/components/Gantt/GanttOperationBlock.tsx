import React, { useState, useMemo } from 'react';
import { Operation } from '../../types/schedule';
import { useScheduleStore, computeCriticalPath } from '../../store/useScheduleStore';
import { useTranslation } from '../../i18n/useTranslation';
import { Lock, Link2, Flame } from 'lucide-react';
import { format, isValid, startOfDay } from 'date-fns';

interface GanttOperationBlockProps {
  operation: Operation;
  minuteWidth: number;
  rowHeight: number;
}

export const GanttOperationBlock: React.FC<GanttOperationBlockProps> = ({
  operation,
  minuteWidth,
}) => {
  const { t } = useTranslation();
  const rawTimelineStart = useScheduleStore((s) => s.timelineStart);
  const timelineStart = isValid(rawTimelineStart) ? startOfDay(rawTimelineStart) : startOfDay(new Date());
  const selectedOperationId = useScheduleStore((s) => s.selectedOperationId);
  const hoveredOperationId = useScheduleStore((s) => s.hoveredOperationId);
  const scrollToOperationId = useScheduleStore((s) => s.scrollToOperationId);
  const setSelectedOperationId = useScheduleStore((s) => s.setSelectedOperationId);
  const setHoveredOperationId = useScheduleStore((s) => s.setHoveredOperationId);
  const rescheduleOptimistic = useScheduleStore((s) => s.rescheduleOptimistic);
  const rescheduleWorkOrderChain = useScheduleStore((s) => s.rescheduleWorkOrderChain);
  const resizeOperationOptimistic = useScheduleStore((s) => s.resizeOperationOptimistic);
  const setContextMenu = useScheduleStore((s) => s.setContextMenu);
  const searchQuery = useScheduleStore((s) => s.searchQuery);
  const workOrderFilter = useScheduleStore((s) => s.workOrderFilter);
  const statusFilter = useScheduleStore((s) => s.statusFilter);
  const isChainDragActive = useScheduleStore((s) => s.isChainDragActive);
  const isCriticalPathActive = useScheduleStore((s) => s.isCriticalPathActive);
  const operations = useScheduleStore((s) => s.operations);
  const workOrders = useScheduleStore((s) => s.workOrders);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [dragOffsetMinutes, setDragOffsetMinutes] = useState(0);
  const [resizeDeltaMinutes, setResizeDeltaMinutes] = useState(0);
  const [isShiftPressedWhileDragging, setIsShiftPressedWhileDragging] = useState(false);

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
  const isTargetFocused = scrollToOperationId === operation.id;

  // Critical Path calculation
  const cpmResult = useMemo(() => {
    if (!isCriticalPathActive) return null;
    return computeCriticalPath(operations, workOrders);
  }, [isCriticalPathActive, operations, workOrders]);

  const isCritical = !!cpmResult?.criticalOperationIds.has(operation.id);

  // Tooltip live times
  const tooltipStartMs = startMs + dragOffsetMinutes * 60000;
  const tooltipEndMs = tooltipStartMs + (operation.setupDurationMinutes + effectiveDuration) * 60000;

  // Search & Filter matching
  const matchesSearch =
    !searchQuery ||
    operation.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    operation.workOrderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    operation.productType.toLowerCase().includes(searchQuery.toLowerCase());

  const matchesFilter =
    (!workOrderFilter || operation.workOrderId === workOrderFilter) &&
    (!statusFilter || operation.status === statusFilter);

  const isDimmed =
    !matchesSearch ||
    !matchesFilter ||
    (isCriticalPathActive && !isCritical);

  const isSearchHit = !!searchQuery && matchesSearch;

  // Move Dragging (Horizontal + Snap + Chain Drag)
  const handleMouseDownMove = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (operation.isLocked) return;

    e.stopPropagation();
    setIsDragging(true);
    const isGroupMode = e.shiftKey || isChainDragActive;
    setIsShiftPressedWhileDragging(isGroupMode);

    const startClientX = e.clientX;
    let currentOffsetMin = 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - startClientX;
      const rawDeltaMin = deltaPx / minuteWidth;
      const snappedDeltaMin = Math.round(rawDeltaMin / 15) * 15;
      currentOffsetMin = snappedDeltaMin;
      setDragOffsetMinutes(snappedDeltaMin);

      if (moveEvent.shiftKey || isChainDragActive) {
        setIsShiftPressedWhileDragging(true);
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setIsDragging(false);

      if (currentOffsetMin !== 0) {
        if (isGroupMode) {
          rescheduleWorkOrderChain(operation.workOrderId, currentOffsetMin);
        } else {
          const newStartMs = startMs + currentOffsetMin * 60000;
          rescheduleOptimistic(
            operation.id,
            operation.requiredResourceId,
            new Date(newStartMs)
          );
        }
      }
      setDragOffsetMinutes(0);
      setIsShiftPressedWhileDragging(false);
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
    let currentDeltaMin = 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - startClientX;
      const rawDeltaMin = deltaPx / minuteWidth;
      const snappedDeltaMin = Math.round(rawDeltaMin / 15) * 15;
      const newDuration = operation.durationMinutes + snappedDeltaMin;
      if (newDuration >= 15) {
        currentDeltaMin = snappedDeltaMin;
        setResizeDeltaMinutes(snappedDeltaMin);
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setIsResizingRight(false);

      const finalDuration = Math.max(15, operation.durationMinutes + currentDeltaMin);
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
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      operationId: operation.id,
    });
  };

  const getStatusBorder = () => {
    if (isTargetFocused) return 'border-cyan-400 ring-4 ring-cyan-400 shadow-2xl shadow-cyan-500/80 animate-pulse';
    if (isCritical) return 'border-rose-400 ring-2 ring-rose-500 shadow-[0_0_24px_rgba(244,63,94,0.95)] z-40';
    if (isSearchHit) return 'border-cyan-400 ring-2 ring-cyan-400/80 shadow-lg shadow-cyan-950';
    if (operation.status === 'Delayed') return 'border-rose-500 shadow-rose-950/40';
    if (operation.status === 'InProgress') return 'border-emerald-400 shadow-emerald-950/40';
    if (operation.status === 'Completed') return 'border-indigo-400 opacity-75';
    return 'border-sky-500/50 shadow-sky-950/40';
  };

  const baseColor = isCritical ? '#f43f5e' : operation.colorCode || '#0284c7';

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
      className={`absolute top-1 bottom-1 rounded-md border text-xs cursor-move select-none transition-all group ${getStatusBorder()} ${
        isSelected ? 'ring-2 ring-sky-400 ring-offset-1 ring-offset-slate-900 shadow-lg z-30' : 'z-20'
      } ${isHovered ? 'brightness-110 shadow-md' : ''} ${
        isDragging || isResizingRight ? 'opacity-95 shadow-2xl scale-[1.01] z-50' : ''
      } ${isDimmed ? 'opacity-25 grayscale-[70%]' : ''}`}
      style={{
        left: `${leftPosition}px`,
        width: `${totalWidth}px`,
        backgroundColor: '#0f172a',
      }}
    >
      {/* Real-time Floating Drag / Resize Micro-Tooltip */}
      {(isDragging || isResizingRight) && (
        <div className="absolute -top-11 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-cyan-400 rounded-md px-2.5 py-1 text-[11px] font-mono text-cyan-300 shadow-2xl pointer-events-none flex flex-col items-center gap-0.5 whitespace-nowrap backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <span className="font-bold">
              {isValid(new Date(tooltipStartMs)) ? format(new Date(tooltipStartMs), 'dd MMM HH:mm') : ''} →{' '}
              {isValid(new Date(tooltipEndMs)) ? format(new Date(tooltipEndMs), 'HH:mm') : ''}
            </span>
            <span className="text-slate-400">({effectiveDuration}m)</span>
            {dragOffsetMinutes !== 0 && (
              <span
                className={`px-1 rounded text-[10px] font-bold ${
                  dragOffsetMinutes > 0 ? 'text-amber-400 bg-amber-950/80' : 'text-emerald-400 bg-emerald-950/80'
                }`}
              >
                {dragOffsetMinutes > 0 ? `+${dragOffsetMinutes}m` : `${dragOffsetMinutes}m`}
              </span>
            )}
            {resizeDeltaMinutes !== 0 && (
              <span
                className={`px-1 rounded text-[10px] font-bold ${
                  resizeDeltaMinutes > 0 ? 'text-cyan-400 bg-cyan-950/80' : 'text-rose-400 bg-rose-950/80'
                }`}
              >
                {resizeDeltaMinutes > 0 ? `+${resizeDeltaMinutes}m` : `${resizeDeltaMinutes}m`}
              </span>
            )}
          </div>
          {isShiftPressedWhileDragging && (
            <div className="flex items-center gap-1 text-[9px] text-amber-300 font-bold">
              <Link2 className="w-2.5 h-2.5" />
              <span>{t('chainDraggingTooltip')}</span>
            </div>
          )}
        </div>
      )}

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
          className={`h-full flex-1 flex items-center justify-between px-2 font-medium overflow-hidden relative ${
            isCritical ? 'bg-gradient-to-r from-rose-950/90 via-red-950/80 to-rose-950/90 text-white font-bold' : 'text-white'
          }`}
          style={{
            backgroundColor: isCritical ? undefined : `${baseColor}22`,
            borderLeft: `3px solid ${baseColor}`,
          }}
        >
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            {isCritical && (
              <span title={t('criticalPathDesc')} className="flex items-center">
                <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-400 shrink-0 inline animate-bounce" />
              </span>
            )}
            {operation.isLocked && <Lock className="w-3 h-3 text-amber-400 shrink-0 inline" />}
            <span className={`font-mono text-[11px] font-bold shrink-0 ${isCritical ? 'text-rose-200' : 'text-sky-300'}`}>
              {operation.workOrderNumber || operation.workOrderId}
            </span>
            <span className="text-slate-100 text-[11px] truncate">{operation.name}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono text-slate-400 pl-1">
            <span className={`px-1.5 py-0.5 rounded border ${isCritical ? 'bg-rose-900/80 text-rose-200 border-rose-600' : 'bg-slate-800/80 border-slate-700/50'}`}>
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

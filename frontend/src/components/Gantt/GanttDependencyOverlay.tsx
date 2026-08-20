import React from 'react';
import { useScheduleStore, computeCriticalPath, isResourceMatchingCategory } from '../../store/useScheduleStore';
import { parseISO, startOfDay, isValid } from 'date-fns';
import { Operation } from '../../types/schedule';

interface GanttDependencyOverlayProps {
  minuteWidth: number;
  rowHeight: number;
  canvasWidth?: number;
}

export const GanttDependencyOverlay: React.FC<GanttDependencyOverlayProps> = ({
  minuteWidth,
  rowHeight,
  canvasWidth,
}) => {
  const resources = useScheduleStore((state) => state.resources);
  const operations = useScheduleStore((state) => state.operations);
  const workOrders = useScheduleStore((state) => state.workOrders);
  const rawTimelineStart = useScheduleStore((state) => state.timelineStart);
  const rawTimelineEnd = useScheduleStore((state) => state.timelineEnd);
  const timelineStart = isValid(rawTimelineStart) ? startOfDay(rawTimelineStart) : startOfDay(new Date());
  const timelineEnd = isValid(rawTimelineEnd) ? rawTimelineEnd : new Date(timelineStart.getTime() + 4 * 86400000);
  const selectedOperationId = useScheduleStore((state) => state.selectedOperationId);
  const hoveredOperationId = useScheduleStore((state) => state.hoveredOperationId);
  const isCriticalPathActive = useScheduleStore((state) => state.isCriticalPathActive);
  const workCenterCategory = useScheduleStore((state) => state.workCenterCategory);

  const resourceList = Object.values(resources).filter((r) =>
    isResourceMatchingCategory(r, workCenterCategory)
  );
  const opList = Object.values(operations);

  const criticalResult = React.useMemo(() => {
    if (!isCriticalPathActive) return null;
    return computeCriticalPath(operations, workOrders);
  }, [isCriticalPathActive, operations, workOrders]);

  const resourceIndexMap = React.useMemo(() => {
    const map = new Map<string, number>();
    resourceList.forEach((r, idx) => map.set(r.id, idx));
    return map;
  }, [resourceList]);

  const operationMap = React.useMemo(() => {
    const map = new Map<string, Operation>();
    opList.forEach((op) => map.set(op.id, op));
    return map;
  }, [opList]);

  const timelineStartMs = timelineStart.getTime();

  // Compute dependency paths
  const links = React.useMemo(() => {
    const result: Array<{
      id: string;
      d: string;
      isHighlighted: boolean;
      isViolated: boolean;
      isCritical: boolean;
    }> = [];

    opList.forEach((childOp) => {
      const childResIdx = resourceIndexMap.get(childOp.requiredResourceId);
      if (childResIdx === undefined) return;

      const childStartMs = parseISO(childOp.plannedStartTime).getTime();
      const childX = Math.max(0, ((childStartMs - timelineStartMs) / 60000) * minuteWidth);
      const childY = childResIdx * rowHeight + rowHeight / 2;

      const precs = childOp.precedenceOperationIds || [];
      precs.forEach((parentOpId) => {
        const parentOp = operationMap.get(parentOpId);
        if (!parentOp) return;

        const parentResIdx = resourceIndexMap.get(parentOp.requiredResourceId);
        if (parentResIdx === undefined) return;

        const parentEndMs = parseISO(parentOp.plannedEndTime).getTime();
        const parentX = Math.max(0, ((parentEndMs - timelineStartMs) / 60000) * minuteWidth);
        const parentY = parentResIdx * rowHeight + rowHeight / 2;

        const isHighlighted =
          selectedOperationId === childOp.id ||
          selectedOperationId === parentOp.id ||
          hoveredOperationId === childOp.id ||
          hoveredOperationId === parentOp.id;

        const isViolated = childStartMs < parentEndMs;
        const linkKey = `${parentOp.id}->${childOp.id}`;
        const isCritical = isCriticalPathActive && !!criticalResult?.criticalLinks.has(linkKey);

        // Smooth S-curve Bézier
        const dx = Math.max(30, Math.abs(childX - parentX) * 0.5);
        const d = `M ${parentX} ${parentY} C ${parentX + dx} ${parentY}, ${childX - dx} ${childY}, ${childX} ${childY}`;

        result.push({
          id: linkKey,
          d,
          isHighlighted,
          isViolated,
          isCritical,
        });
      });
    });

    return result;
  }, [
    opList,
    resourceIndexMap,
    operationMap,
    timelineStartMs,
    minuteWidth,
    rowHeight,
    selectedOperationId,
    hoveredOperationId,
    isCriticalPathActive,
    criticalResult,
  ]);

  const totalMinutes = (timelineEnd.getTime() - timelineStart.getTime()) / 60000;
  const svgWidth = canvasWidth ?? (totalMinutes * minuteWidth);
  const totalHeight = resourceList.length * rowHeight;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-20"
      style={{ width: `${svgWidth}px`, height: `${totalHeight}px` }}
    >
      <defs>
        {/* Normal Arrowhead */}
        <marker
          id="arrow-default"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#64748b" />
        </marker>

        {/* Highlighted Glowing Arrowhead */}
        <marker
          id="arrow-highlighted"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8" />
        </marker>

        {/* Violated Arrowhead */}
        <marker
          id="arrow-violated"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#f43f5e" />
        </marker>

        {/* Critical Path Arrowhead */}
        <marker
          id="arrow-critical"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="9"
          markerHeight="9"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#f43f5e" />
        </marker>
      </defs>

      {/* Render standard non-highlighted links first */}
      {links
        .filter((l) => !l.isHighlighted && !l.isCritical)
        .map((link) => (
          <path
            key={link.id}
            d={link.d}
            fill="none"
            stroke={link.isViolated ? '#f43f5e' : '#475569'}
            strokeWidth={link.isViolated ? 2 : 1.2}
            strokeDasharray={link.isViolated ? '4 2' : 'none'}
            opacity={isCriticalPathActive ? 0.15 : 0.65}
            markerEnd={link.isViolated ? 'url(#arrow-violated)' : 'url(#arrow-default)'}
          />
        ))}

      {/* Render Critical Path links */}
      {links
        .filter((l) => l.isCritical && !l.isHighlighted)
        .map((link) => (
          <path
            key={link.id}
            d={link.d}
            fill="none"
            stroke="#f43f5e"
            strokeWidth={3.5}
            strokeDasharray="6 3"
            opacity={1}
            markerEnd="url(#arrow-critical)"
            className="drop-shadow-[0_0_10px_rgba(244,63,94,1)] animate-pulse"
          />
        ))}

      {/* Render user-highlighted links on top */}
      {links
        .filter((l) => l.isHighlighted)
        .map((link) => (
          <path
            key={link.id}
            d={link.d}
            fill="none"
            stroke={link.isViolated ? '#f43f5e' : '#38bdf8'}
            strokeWidth={3}
            opacity={1}
            markerEnd={link.isViolated ? 'url(#arrow-violated)' : 'url(#arrow-highlighted)'}
            className="drop-shadow-[0_0_8px_rgba(56,189,248,0.9)]"
          />
        ))}
    </svg>
  );
};

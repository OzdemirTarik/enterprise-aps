import React from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { parseISO } from 'date-fns';
import { Operation } from '../../types/schedule';

interface GanttDependencyOverlayProps {
  minuteWidth: number;
  rowHeight: number;
}

export const GanttDependencyOverlay: React.FC<GanttDependencyOverlayProps> = ({
  minuteWidth,
  rowHeight,
}) => {
  const resources = useScheduleStore((state) => state.resources);
  const operations = useScheduleStore((state) => state.operations);
  const timelineStart = useScheduleStore((state) => state.timelineStart);
  const timelineEnd = useScheduleStore((state) => state.timelineEnd);
  const selectedOperationId = useScheduleStore((state) => state.selectedOperationId);
  const hoveredOperationId = useScheduleStore((state) => state.hoveredOperationId);

  const workCenterCategory = useScheduleStore((state) => state.workCenterCategory);

  const resourceList = Object.values(resources).filter((r) => {
    if (workCenterCategory === 'ALL') return true;
    if (workCenterCategory === 'SMT') return r.id.startsWith('SMT');
    if (workCenterCategory === 'THT') return r.id.startsWith('THT');
    if (workCenterCategory === 'TEST') return r.id.startsWith('ICT') || r.id.startsWith('FCT');
    if (workCenterCategory === 'COAT') return r.id.startsWith('COAT') || r.id.startsWith('DEPANEL');
    return true;
  });
  const opList = Object.values(operations);

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
    }> = [];

    opList.forEach((childOp) => {
      const childResIdx = resourceIndexMap.get(childOp.requiredResourceId);
      if (childResIdx === undefined) return;

      const childStartMs = parseISO(childOp.plannedStartTime).getTime();
      const childX = Math.max(0, ((childStartMs - timelineStartMs) / 60000) * minuteWidth);
      const childY = childResIdx * rowHeight + rowHeight / 2;

      childOp.precedenceOperationIds.forEach((parentOpId) => {
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

        // Smooth S-curve Bézier
        const dx = Math.max(30, Math.abs(childX - parentX) * 0.5);
        const d = `M ${parentX} ${parentY} C ${parentX + dx} ${parentY}, ${childX - dx} ${childY}, ${childX} ${childY}`;

        result.push({
          id: `${parentOp.id}->${childOp.id}`,
          d,
          isHighlighted,
          isViolated,
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
  ]);

  const totalMinutes = (timelineEnd.getTime() - timelineStart.getTime()) / 60000;
  const totalWidth = Math.max(1200, totalMinutes * minuteWidth);
  const totalHeight = resourceList.length * rowHeight;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-20"
      style={{ width: `${totalWidth}px`, height: `${totalHeight}px` }}
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
      </defs>

      {/* Render non-highlighted links first */}
      {links
        .filter((l) => !l.isHighlighted)
        .map((link) => (
          <path
            key={link.id}
            d={link.d}
            fill="none"
            stroke={link.isViolated ? '#f43f5e' : '#475569'}
            strokeWidth={link.isViolated ? 2 : 1.2}
            strokeDasharray={link.isViolated ? '4 2' : 'none'}
            opacity={0.7}
            markerEnd={link.isViolated ? 'url(#arrow-violated)' : 'url(#arrow-default)'}
          />
        ))}

      {/* Render highlighted links on top */}
      {links
        .filter((l) => l.isHighlighted)
        .map((link) => (
          <path
            key={link.id}
            d={link.d}
            fill="none"
            stroke={link.isViolated ? '#f43f5e' : '#38bdf8'}
            strokeWidth={2.5}
            opacity={1}
            markerEnd={link.isViolated ? 'url(#arrow-violated)' : 'url(#arrow-highlighted)'}
            className="drop-shadow-[0_0_6px_rgba(56,189,248,0.7)]"
          />
        ))}
    </svg>
  );
};

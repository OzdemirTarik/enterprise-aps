import React, { useRef } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { isValid, startOfDay } from 'date-fns';
import { GanttTimelineRuler } from './GanttTimelineRuler';
import { GanttSidebar } from './GanttSidebar';
import { GanttRow } from './GanttRow';
import { GanttDependencyOverlay } from './GanttDependencyOverlay';
import { GanttCurrentTimeLine } from './GanttCurrentTimeLine';
import { GanttContextMenu } from './GanttContextMenu';

const ROW_HEIGHT = 56;

export const GanttScheduler: React.FC = () => {
  const resources = useScheduleStore((s) => s.resources);
  const zoomLevel = useScheduleStore((s) => s.zoomLevel);
  const rawTimelineStart = useScheduleStore((s) => s.timelineStart);
  const rawTimelineEnd = useScheduleStore((s) => s.timelineEnd);
  const setSelectedOperationId = useScheduleStore((s) => s.setSelectedOperationId);
  const workCenterCategory = useScheduleStore((s) => s.workCenterCategory);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);

  const validStart = isValid(rawTimelineStart)
    ? rawTimelineStart
    : new Date(new Date().setHours(0, 0, 0, 0));
  const validEnd = isValid(rawTimelineEnd)
    ? rawTimelineEnd
    : new Date(new Date().setDate(new Date().getDate() + 4));

  const timelineStart = startOfDay(validStart);
  const timelineEnd = validEnd;

  // Zoom scale: pixel width per minute
  const minuteWidth = zoomLevel === 'hour' ? 3.0 : zoomLevel === 'day' ? 1.2 : 0.45;

  const totalMinutes = Math.max(1440, (timelineEnd.getTime() - timelineStart.getTime()) / 60000);
  const canvasWidth = Math.max(1200, totalMinutes * minuteWidth);

  const resourceList = Object.values(resources).filter((r) => {
    if (workCenterCategory === 'ALL') return true;
    if (workCenterCategory === 'SMT') return r.id.startsWith('SMT');
    if (workCenterCategory === 'THT') return r.id.startsWith('THT');
    if (workCenterCategory === 'TEST') return r.id.startsWith('ICT') || r.id.startsWith('FCT');
    if (workCenterCategory === 'COAT') return r.id.startsWith('COAT') || r.id.startsWith('DEPANEL');
    return true;
  });

  const handleTimelineScroll = () => {
    if (scrollContainerRef.current && sidebarScrollRef.current) {
      sidebarScrollRef.current.scrollTop = scrollContainerRef.current.scrollTop;
    }
  };

  return (
    <div
      onClick={() => setSelectedOperationId(null)}
      className="flex-1 flex overflow-hidden relative bg-[#090d16]"
    >
      {/* Fixed Left Sidebar with Resource/Machine Info & Locks */}
      <GanttSidebar rowHeight={ROW_HEIGHT} sidebarScrollRef={sidebarScrollRef} />

      {/* Scrollable Gantt Timeline Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleTimelineScroll}
        className="flex-1 overflow-auto relative custom-scrollbar select-none"
      >
        <div style={{ width: `${canvasWidth}px` }} className="relative min-h-full">
          {/* Top Timeline Time Ruler */}
          <GanttTimelineRuler minuteWidth={minuteWidth} canvasWidth={canvasWidth} />

          {/* Gantt Rows Container */}
          <div className="relative">
            {/* SVG Dependency Precedence Lines Overlay */}
            <GanttDependencyOverlay minuteWidth={minuteWidth} rowHeight={ROW_HEIGHT} />

            {/* Current Real-Time Indicator Line */}
            <GanttCurrentTimeLine
              minuteWidth={minuteWidth}
              totalHeight={resourceList.length * ROW_HEIGHT}
            />

            {/* Work Center Resource Tracks */}
            {resourceList.map((resource) => (
              <GanttRow
                key={resource.id}
                resource={resource}
                minuteWidth={minuteWidth}
                rowHeight={ROW_HEIGHT}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating Right-Click Context Menu */}
      <GanttContextMenu />
    </div>
  );
};

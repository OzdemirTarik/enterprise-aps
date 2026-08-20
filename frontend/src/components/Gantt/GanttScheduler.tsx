import React, { useRef, useMemo } from 'react';
import { useScheduleStore, isResourceMatchingCategory } from '../../store/useScheduleStore';
import { isValid, startOfDay, format } from 'date-fns';
import { GanttTimelineRuler } from './GanttTimelineRuler';
import { GanttSidebar } from './GanttSidebar';
import { GanttGrid } from './GanttGrid';
import { GanttRow } from './GanttRow';
import { GanttDependencyOverlay } from './GanttDependencyOverlay';
import { GanttCurrentTimeLine } from './GanttCurrentTimeLine';
import { GanttContextMenu } from './GanttContextMenu';
import { getOffShiftIntervals } from '../../utils/shiftUtils';

const ROW_HEIGHT = 56;

export const GanttScheduler: React.FC = () => {
  const resources = useScheduleStore((s) => s.resources);
  const zoomLevel = useScheduleStore((s) => s.zoomLevel);
  const rawTimelineStart = useScheduleStore((s) => s.timelineStart);
  const rawTimelineEnd = useScheduleStore((s) => s.timelineEnd);
  const setSelectedOperationId = useScheduleStore((s) => s.setSelectedOperationId);
  const workCenterCategory = useScheduleStore((s) => s.workCenterCategory);
  const shifts = useScheduleStore((s) => s.shifts);
  const isShiftOverlayActive = useScheduleStore((s) => s.isShiftOverlayActive);

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
  const timelineStartMs = timelineStart.getTime();

  // Zoom scale: pixel width per minute
  const minuteWidth =
    zoomLevel === 'hour'
      ? 3.0
      : zoomLevel === 'day'
      ? 1.2
      : zoomLevel === 'week'
      ? 0.45
      : 0.12; // 'month' view (1 day = ~172.8px)

  const minDaysForZoom =
    zoomLevel === 'month' ? 32 : zoomLevel === 'week' ? 14 : zoomLevel === 'day' ? 7 : 4;

  const totalDays = Math.max(
    minDaysForZoom,
    Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000))
  );
  const totalHours = totalDays * 24;
  const totalMinutes = totalHours * 60;
  const canvasWidth = totalMinutes * minuteWidth;

  const resourceList = useMemo(
    () => Object.values(resources).filter((r) => isResourceMatchingCategory(r, workCenterCategory)),
    [resources, workCenterCategory]
  );

  // Compute off-shift / non-working intervals ONCE for the entire Gantt (97% DOM reduction)
  const offShiftIntervals = useMemo(() => {
    if (!isShiftOverlayActive) return [];
    return getOffShiftIntervals(shifts, timelineStart, timelineEnd);
  }, [isShiftOverlayActive, shifts, timelineStart, timelineEnd]);

  const scrollToNowTrigger = useScheduleStore((s) => s.scrollToNowTrigger);
  const scrollToOperationId = useScheduleStore((s) => s.scrollToOperationId);
  const scrollToDateTrigger = useScheduleStore((s) => s.scrollToDateTrigger);
  const searchQuery = useScheduleStore((s) => s.searchQuery);
  const operations = useScheduleStore((s) => s.operations);
  const isInitialized = useScheduleStore((s) => s.isInitialized);
  const hasCenteredOnLoadRef = useRef(false);

  // Robustly center on NOW line upon initial page load / refresh once store data & DOM layout dimensions are ready
  React.useEffect(() => {
    if (hasCenteredOnLoadRef.current) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const tryCenterNow = (): boolean => {
      if (hasCenteredOnLoadRef.current) return true;
      if (!isInitialized) return false;
      const currentContainer = scrollContainerRef.current;
      if (!currentContainer) return false;

      const clientWidth = currentContainer.clientWidth;
      const scrollWidth = currentContainer.scrollWidth;

      // Ensure container has rendered layout dimensions and scrollable content
      if (clientWidth <= 0 || scrollWidth <= clientWidth) {
        return false;
      }

      const nowMs = Date.now();
      const elapsedMinutes = (nowMs - timelineStart.getTime()) / 60000;
      const targetLeft = elapsedMinutes * minuteWidth - clientWidth / 2;

      currentContainer.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: 'auto',
      });

      hasCenteredOnLoadRef.current = true;
      return true;
    };

    // 1. Synchronous attempt if layout is already ready
    if (tryCenterNow()) return;

    // 2. Next animation frame attempt
    const rafId = requestAnimationFrame(() => {
      tryCenterNow();
    });

    // 3. ResizeObserver to catch layout completion when container or scroll dimensions become valid
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (tryCenterNow() && resizeObserver) {
          resizeObserver.disconnect();
        }
      });
      resizeObserver.observe(container);
    }

    return () => {
      cancelAnimationFrame(rafId);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [isInitialized, minuteWidth, timelineStart]);

  const handleTimelineScroll = () => {
    if (scrollContainerRef.current && sidebarScrollRef.current) {
      sidebarScrollRef.current.scrollTop = scrollContainerRef.current.scrollTop;
    }
  };

  // Canvas Mouse Drag Panning (Sağa / Sola fare ile akıcı pan kaydırma)
  const isPanningRef = useRef(false);
  const panStartXRef = useRef(0);
  const panScrollLeftRef = useRef(0);
  const panStartYRef = useRef(0);
  const panScrollTopRef = useRef(0);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.button === 0 || e.button === 1) && scrollContainerRef.current) {
      const target = e.target as HTMLElement;
      // If clicked on an operation block, resize handle, or button, don't initiate canvas pan
      if (
        target.closest('[id^="gantt-op-"]') ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('.cursor-ew-resize')
      ) {
        return;
      }

      isPanningRef.current = true;
      panStartXRef.current = e.clientX;
      panScrollLeftRef.current = scrollContainerRef.current.scrollLeft;
      panStartYRef.current = e.clientY;
      panScrollTopRef.current = scrollContainerRef.current.scrollTop;

      let rafPanId: number | null = null;

      const handleCanvasMouseMove = (moveEvt: MouseEvent) => {
        if (!isPanningRef.current || !scrollContainerRef.current) return;
        if (rafPanId) cancelAnimationFrame(rafPanId);

        rafPanId = requestAnimationFrame(() => {
          if (!scrollContainerRef.current) return;
          const dx = moveEvt.clientX - panStartXRef.current;
          const dy = moveEvt.clientY - panStartYRef.current;
          scrollContainerRef.current.scrollLeft = panScrollLeftRef.current - dx;
          scrollContainerRef.current.scrollTop = panScrollTopRef.current - dy;
        });
      };

      const handleCanvasMouseUp = () => {
        isPanningRef.current = false;
        if (rafPanId) cancelAnimationFrame(rafPanId);
        window.removeEventListener('mousemove', handleCanvasMouseMove);
        window.removeEventListener('mouseup', handleCanvasMouseUp);
      };

      window.addEventListener('mousemove', handleCanvasMouseMove);
      window.addEventListener('mouseup', handleCanvasMouseUp);
    }
  };

  // Smooth scroll to current time
  React.useEffect(() => {
    if (scrollToNowTrigger > 0 && scrollContainerRef.current) {
      const nowMs = Date.now();
      const elapsedMinutes = (nowMs - timelineStart.getTime()) / 60000;
      const targetLeft = elapsedMinutes * minuteWidth - scrollContainerRef.current.clientWidth / 2;
      scrollContainerRef.current.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: 'smooth',
      });
    }
  }, [scrollToNowTrigger, minuteWidth, timelineStart]);

  // Smooth scroll to picked date
  React.useEffect(() => {
    if (scrollToDateTrigger && scrollContainerRef.current) {
      const dateMs = new Date(scrollToDateTrigger).getTime();
      const elapsedMinutes = (dateMs - timelineStart.getTime()) / 60000;
      const targetLeft = elapsedMinutes * minuteWidth - 100;
      scrollContainerRef.current.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: 'smooth',
      });
    }
  }, [scrollToDateTrigger, minuteWidth, timelineStart]);

  // Smooth scroll to targeted operation
  React.useEffect(() => {
    if (scrollToOperationId && scrollContainerRef.current) {
      const targetOp = operations[scrollToOperationId];
      if (targetOp) {
        const opStartMs = new Date(targetOp.plannedStartTime).getTime();
        const elapsedMinutes = (opStartMs - timelineStart.getTime()) / 60000;
        const targetLeft = elapsedMinutes * minuteWidth - scrollContainerRef.current.clientWidth / 3;
        scrollContainerRef.current.scrollTo({
          left: Math.max(0, targetLeft),
          behavior: 'smooth',
        });
      }
    }
  }, [scrollToOperationId, operations, minuteWidth, timelineStart]);

  // Auto-focus on first search match
  React.useEffect(() => {
    if (searchQuery.trim().length >= 2 && scrollContainerRef.current) {
      const matchingOp = Object.values(operations).find(
        (o) =>
          o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.workOrderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.productType.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (matchingOp) {
        const opStartMs = new Date(matchingOp.plannedStartTime).getTime();
        const elapsedMinutes = (opStartMs - timelineStart.getTime()) / 60000;
        const targetLeft = elapsedMinutes * minuteWidth - scrollContainerRef.current.clientWidth / 3;
        scrollContainerRef.current.scrollTo({
          left: Math.max(0, targetLeft),
          behavior: 'smooth',
        });
      }
    }
  }, [searchQuery, operations, minuteWidth, timelineStart]);

  const totalGridHeight = resourceList.length * ROW_HEIGHT;

  return (
    <div
      onClick={() => setSelectedOperationId(null)}
      className="flex-1 flex overflow-hidden relative bg-[#090d16]"
    >
      {/* Fixed Left Sidebar with Resource/Machine Info & Locks */}
      <GanttSidebar rowHeight={ROW_HEIGHT} sidebarScrollRef={sidebarScrollRef} />

      {/* Scrollable Gantt Timeline Area with High-Performance Drag Panning */}
      <div
        ref={scrollContainerRef}
        onScroll={handleTimelineScroll}
        onMouseDown={handleCanvasMouseDown}
        className="flex-1 overflow-auto relative custom-scrollbar select-none cursor-grab active:cursor-grabbing"
      >
        <div style={{ width: `${canvasWidth}px` }} className="relative">
          {/* Top Timeline Time Ruler */}
          <GanttTimelineRuler
            minuteWidth={minuteWidth}
            canvasWidth={canvasWidth}
            timelineStart={timelineStart}
            totalDays={totalDays}
            totalHours={totalHours}
          />

          {/* Gantt Rows Container */}
          <div className="relative" style={{ height: `${totalGridHeight}px` }}>
            {/* Background Grid Lines (Day & Shift columns) */}
            <GanttGrid
              minuteWidth={minuteWidth}
              totalWidth={canvasWidth}
              totalHeight={totalGridHeight}
              timelineStart={timelineStart}
              totalDays={totalDays}
            />

            {/* Global Unified Off-Shift & Weekend Diagonal Shading Background (Zero Overdraw Layer) */}
            {isShiftOverlayActive && offShiftIntervals.length > 0 && (
              <div
                className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
                style={{ height: `${totalGridHeight}px` }}
              >
                {offShiftIntervals.map((interval) => {
                  const startMs = interval.start.getTime();
                  const endMs = interval.end.getTime();
                  const left = Math.max(0, ((startMs - timelineStartMs) / 60000) * minuteWidth);
                  const width = Math.max(4, ((endMs - startMs) / 60000) * minuteWidth);

                  return (
                    <div
                      key={interval.id}
                      title={`${interval.label}: ${format(interval.start, 'dd.MM HH:mm')} - ${format(interval.end, 'dd.MM HH:mm')}`}
                      className={`absolute top-0 bottom-0 border-r border-slate-800/80 ${
                        interval.isFullDayOff ? 'opacity-85' : 'opacity-40'
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
                      {width >= 70 && (
                        <div
                          className={`absolute top-1.5 left-2 px-1.5 py-0.5 rounded text-[9px] font-mono border select-none pointer-events-none truncate max-w-[90%] shadow-sm ${
                            interval.isFullDayOff
                              ? 'bg-amber-950/85 text-amber-300 border-amber-800/60'
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

            {/* SVG Dependency Precedence Lines Overlay */}
            <GanttDependencyOverlay
              minuteWidth={minuteWidth}
              rowHeight={ROW_HEIGHT}
              canvasWidth={canvasWidth}
            />

            {/* Current Real-Time Indicator Line */}
            <GanttCurrentTimeLine
              minuteWidth={minuteWidth}
              totalHeight={totalGridHeight}
              timelineStart={timelineStart}
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

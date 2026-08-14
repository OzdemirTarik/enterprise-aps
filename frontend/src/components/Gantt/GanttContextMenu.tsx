import React, { useEffect, useRef } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';

export const GanttContextMenu: React.FC = () => {
  const contextMenu = useScheduleStore((s) => s.contextMenu);
  const setContextMenu = useScheduleStore((s) => s.setContextMenu);
  const setSelectedOperationId = useScheduleStore((s) => s.setSelectedOperationId);
  const setIsSplitModalOpen = useScheduleStore((s) => s.setIsSplitModalOpen);
  const deleteOperation = useScheduleStore((s) => s.deleteOperation);
  const operations = useScheduleStore((s) => s.operations);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [setContextMenu]);

  if (!contextMenu) return null;

  const currentOp = operations[contextMenu.operationId];
  if (!currentOp) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] rounded-lg border border-slate-700/80 bg-slate-900/95 py-1.5 shadow-2xl backdrop-blur-md text-xs font-medium text-slate-200 animate-in fade-in zoom-in-95 duration-100"
      style={{
        left: `${Math.min(window.innerWidth - 220, contextMenu.x)}px`,
        top: `${Math.min(window.innerHeight - 200, contextMenu.y)}px`,
      }}
    >
      <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-semibold text-slate-400 truncate">
        {currentOp.name}
      </div>

      <button
        onClick={() => {
          setSelectedOperationId(contextMenu.operationId);
          setContextMenu(null);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-sky-500/20 hover:text-sky-300 transition-colors"
      >
        <span className="text-sm">📝</span>
        <span>Edit Operation Details</span>
      </button>

      <button
        onClick={() => {
          setIsSplitModalOpen(true, contextMenu.operationId);
          setContextMenu(null);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-amber-500/20 hover:text-amber-300 transition-colors"
      >
        <span className="text-sm">✂️</span>
        <span>Split Operation (Sub-lot)</span>
      </button>

      <div className="my-1 border-t border-slate-800" />

      <button
        onClick={() => {
          if (confirm(`Are you sure you want to delete '${currentOp.name}'?`)) {
            deleteOperation(contextMenu.operationId);
          }
          setContextMenu(null);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
      >
        <span className="text-sm">🗑️</span>
        <span>Delete Operation</span>
      </button>
    </div>
  );
};

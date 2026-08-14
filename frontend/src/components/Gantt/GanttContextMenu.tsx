import React, { useEffect, useRef } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useTranslation } from '../../i18n/useTranslation';
import { FileEdit, Scissors, Trash2 } from 'lucide-react';

export const GanttContextMenu: React.FC = () => {
  const { t } = useTranslation();
  const contextMenu = useScheduleStore((s) => s.contextMenu);
  const setContextMenu = useScheduleStore((s) => s.setContextMenu);
  const setSelectedOperationId = useScheduleStore((s) => s.setSelectedOperationId);
  const setIsSplitModalOpen = useScheduleStore((s) => s.setIsSplitModalOpen);
  const deleteOperation = useScheduleStore((s) => s.deleteOperation);
  const deleteWorkOrder = useScheduleStore((s) => s.deleteWorkOrder);
  const operations = useScheduleStore((s) => s.operations);
  const workOrders = useScheduleStore((s) => s.workOrders);
  const fetchSchedule = useScheduleStore((s) => s.fetchSchedule);

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
      className="fixed z-50 min-w-[210px] rounded-lg border border-slate-700/80 bg-slate-900/95 py-1.5 shadow-2xl backdrop-blur-md text-xs font-medium text-slate-200 animate-in fade-in zoom-in-95 duration-100 select-none"
      style={{
        left: `${Math.min(window.innerWidth - 230, contextMenu.x)}px`,
        top: `${Math.min(window.innerHeight - 220, contextMenu.y)}px`,
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
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors"
      >
        <FileEdit className="w-3.5 h-3.5 text-cyan-400" />
        <span>{t('contextEdit')}</span>
      </button>

      <button
        onClick={() => {
          setIsSplitModalOpen(true, contextMenu.operationId);
          setContextMenu(null);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-amber-500/20 hover:text-amber-300 transition-colors"
      >
        <Scissors className="w-3.5 h-3.5 text-amber-400" />
        <span>{t('contextSplit')}</span>
      </button>

      <div className="my-1 border-t border-slate-800" />

      <button
        onClick={() => {
          if (confirm(`'${currentOp.name}' ${t('deleteOpConfirm')}?`)) {
            deleteOperation(contextMenu.operationId);
          }
          setContextMenu(null);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5 text-red-400" />
        <span>{t('contextDelete')}</span>
      </button>

      <button
        onClick={async () => {
          const wo = workOrders[currentOp.workOrderId];
          const woNumber = wo?.orderNumber || currentOp.workOrderId;
          const opCount = Object.values(operations).filter(
            (o) => o.workOrderId === currentOp.workOrderId
          ).length;
          if (
            confirm(
              `'${woNumber}' ${t('deleteWorkOrderConfirm')} (${opCount} ${t('routingSteps')})`
            )
          ) {
            await deleteWorkOrder(currentOp.workOrderId);
            setSelectedOperationId(null);
            await fetchSchedule();
          }
          setContextMenu(null);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors font-semibold"
      >
        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
        <span>{t('deleteWorkOrderFull')}</span>
      </button>
    </div>
  );
};

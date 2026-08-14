import React, { useState } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useTranslation } from '../../i18n/useTranslation';
import {
  ClipboardList,
  Search,
  Trash2,
  Filter,
  Plus,
  X,
  CheckCircle2,
  Cpu,
  Calendar,
  Layers,
  Building2,
} from 'lucide-react';
import { format, isValid } from 'date-fns';

export const WorkOrderManagerModal: React.FC = () => {
  const { t, language } = useTranslation();
  const isOpen = useScheduleStore((s) => s.isWorkOrderManagerOpen);
  const setIsOpen = useScheduleStore((s) => s.setIsWorkOrderManagerOpen);
  const setIsCreateOpen = useScheduleStore((s) => s.setIsCreateWorkOrderOpen);
  const workOrders = useScheduleStore((s) => s.workOrders);
  const operations = useScheduleStore((s) => s.operations);
  const deleteWorkOrder = useScheduleStore((s) => s.deleteWorkOrder);
  const setWorkOrderFilter = useScheduleStore((s) => s.setWorkOrderFilter);
  const fetchSchedule = useScheduleStore((s) => s.fetchSchedule);

  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const woList = Object.values(workOrders);

  const filteredWos = woList.filter((wo) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (wo.orderNumber || '').toLowerCase().includes(q) ||
      (wo.productCode || '').toLowerCase().includes(q) ||
      (wo.productName || '').toLowerCase().includes(q) ||
      (wo.customerName || '').toLowerCase().includes(q)
    );
  });

  const handleDelete = async (woId: string, woNumber: string, opCount: number) => {
    const confirmPrompt =
      language === 'tr'
        ? `'${woNumber}' iş emrini ve ona bağlı ${opCount} operasyonun tamamını silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz ve iş istasyonlarındaki tüm ilgili üretim adımları kaldırılacaktır.`
        : `Are you sure you want to delete work order '${woNumber}' and all ${opCount} of its scheduled operations?\n\nThis action will remove all corresponding operations from work centers.`;

    if (!window.confirm(confirmPrompt)) return;

    setDeletingId(woId);
    try {
      await deleteWorkOrder(woId);
      await fetchSchedule();
      setSuccessMsg(t('woDeletedSuccess'));
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Failed to delete work order: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleFilterInGantt = (woId: string) => {
    setWorkOrderFilter(woId);
    setIsOpen(false);
  };

  const formatDateSafe = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return isValid(d) ? format(d, 'dd.MM.yyyy HH:mm') : '-';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>{t('workOrderManagerTitle')}</span>
                <span className="text-[11px] bg-slate-800 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/30 font-mono">
                  {woList.length} {t('workOrders')}
                </span>
              </h2>
              <p className="text-xs text-slate-400">{t('workOrderManagerDesc')}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Search */}
        <div className="px-6 py-3.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                language === 'tr'
                  ? 'İş emri no, ürün kodu, model veya müşteri ara...'
                  : 'Search by WO#, product code, name, or customer...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 placeholder-slate-500"
            />
          </div>

          <button
            onClick={() => {
              setIsOpen(false);
              setIsCreateOpen(true);
            }}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-950 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{t('newWorkOrder')}</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Work Orders List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredWos.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <ClipboardList className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs font-semibold">
                {language === 'tr' ? 'Kayıtlı iş emri bulunamadı.' : 'No work orders found.'}
              </p>
            </div>
          ) : (
            filteredWos.map((wo) => {
              const woOps = Object.values(operations).filter((o) => o.workOrderId === wo.id);
              const isDeleting = deletingId === wo.id;

              return (
                <div
                  key={wo.id}
                  className="bg-slate-950 border border-slate-800/90 hover:border-slate-700 rounded-xl p-4 transition-all shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                        <Cpu className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-cyan-300">
                            {wo.orderNumber}
                          </span>
                          <span className="text-[10px] bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 px-2 py-0.5 rounded font-mono font-semibold">
                            {wo.productCode}
                          </span>
                          {wo.customerName && (
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-medium border border-slate-700 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{wo.customerName}</span>
                            </span>
                          )}
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                              wo.priority === 1
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : wo.priority === 2
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            P{wo.priority || 2}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 font-medium">{wo.productName}</p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleFilterInGantt(wo.id)}
                        className="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 hover:border-cyan-500/50 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        title={t('filterInGantt')}
                      >
                        <Filter className="w-3.5 h-3.5" />
                        <span>{t('filterInGantt')}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleDelete(wo.id, wo.orderNumber, woOps.length)}
                        className="bg-rose-950/80 hover:bg-rose-900 disabled:opacity-50 text-rose-300 border border-rose-700/60 hover:border-rose-500 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                        title={t('deleteWorkOrderFull')}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>
                          {isDeleting
                            ? language === 'tr'
                              ? 'Siliniyor...'
                              : 'Deleting...'
                            : t('deleteWorkOrderFull')}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex items-center gap-4 text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="font-semibold text-slate-300">{woOps.length}</span>
                      <span>{t('routingSteps')}</span>
                    </div>

                    <div>
                      <span>{t('quantity')}: </span>
                      <span className="font-mono font-bold text-slate-200">{wo.quantity} adet</span>
                    </div>

                    <div className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{t('releaseDate')}: </span>
                      <span className="text-slate-300">{formatDateSafe(wo.releaseDate)}</span>
                    </div>

                    <div className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      <span>{t('dueDate')}: </span>
                      <span className="text-amber-300 font-semibold">{formatDateSafe(wo.dueDate)}</span>
                    </div>
                  </div>

                  {/* Operations preview pills */}
                  {woOps.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {woOps
                        .sort((a, b) => a.sequenceIndex - b.sequenceIndex)
                        .map((op, idx) => (
                          <div
                            key={op.id}
                            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 flex items-center gap-1.5 text-[10px]"
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: op.colorCode || '#06b6d4' }} />
                            <span className="text-slate-400 font-mono">{idx + 1}.</span>
                            <span className="text-slate-200 truncate max-w-[140px]">{op.name}</span>
                            <span className="text-slate-500 font-mono text-[9px]">({op.requiredResourceId})</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            <span>{t('allWorkOrdersCount')}: </span>
            <span className="font-bold text-slate-200">{woList.length}</span>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-1.5 rounded-lg font-semibold text-xs transition-colors"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

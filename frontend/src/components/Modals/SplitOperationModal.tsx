import React, { useState, useEffect } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useTranslation } from '../../i18n/useTranslation';
import { Scissors, X } from 'lucide-react';

export const SplitOperationModal: React.FC = () => {
  const { t } = useTranslation();
  const isOpen = useScheduleStore((s) => s.isSplitModalOpen);
  const setIsOpen = useScheduleStore((s) => s.setIsSplitModalOpen);
  const targetOpId = useScheduleStore((s) => s.splitTargetOperationId);
  const operations = useScheduleStore((s) => s.operations);
  const splitOperation = useScheduleStore((s) => s.splitOperation);

  const targetOp = targetOpId ? operations[targetOpId] : null;
  const [splitDuration, setSplitDuration] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (targetOp) {
      setSplitDuration(Math.floor(targetOp.durationMinutes / 2));
    }
  }, [targetOp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOp) return;

    setIsSubmitting(true);
    try {
      await splitOperation(targetOp.id, splitDuration);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !targetOp) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Scissors className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">{t('splitTitle')}</h2>
              <p className="text-xs text-slate-400">{t('splitDesc')}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-200 text-lg p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <div className="font-semibold text-slate-200">{targetOp.name}</div>
            <div className="text-slate-400 font-mono">
              {t('originalDuration')}: {targetOp.durationMinutes} min
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
              <span>{t('part1Duration')}: {splitDuration} min</span>
              <span className="text-cyan-400 font-mono">
                {t('part2Duration')}: {targetOp.durationMinutes - splitDuration} min
              </span>
            </div>
            <input
              type="range"
              min={15}
              max={targetOp.durationMinutes - 15}
              step={15}
              value={splitDuration}
              onChange={(e) => setSplitDuration(Number(e.target.value))}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          <div className="border-t border-slate-800 pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-md font-semibold text-xs"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-md text-xs transition-colors shadow-lg shadow-cyan-950 flex items-center gap-1.5"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>{isSubmitting ? '...' : t('splitBtn')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

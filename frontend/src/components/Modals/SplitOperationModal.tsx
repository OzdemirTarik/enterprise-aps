import React, { useState, useEffect } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';

export const SplitOperationModal: React.FC = () => {
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

  if (!isOpen || !targetOp) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">✂️</span>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Split Operation (Sub-lot)</h2>
              <p className="text-xs text-slate-400">Divide batch into two sequential tasks.</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-200 text-lg p-1"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <div className="font-semibold text-slate-200">{targetOp.name}</div>
            <div className="text-slate-400 font-mono">
              Total Duration: {targetOp.durationMinutes} min
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
              <span>Part 1 Duration: {splitDuration} min</span>
              <span className="text-sky-400 font-mono">
                Part 2: {targetOp.durationMinutes - splitDuration} min
              </span>
            </div>
            <input
              type="range"
              min={15}
              max={targetOp.durationMinutes - 15}
              step={15}
              value={splitDuration}
              onChange={(e) => setSplitDuration(Number(e.target.value))}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>

          <div className="border-t border-slate-800 pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-md font-semibold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-md text-xs transition-colors shadow-lg shadow-sky-950"
            >
              {isSubmitting ? 'Splitting...' : '✂️ Split Operation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

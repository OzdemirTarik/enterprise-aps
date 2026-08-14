import React, { useState } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { scheduleApi } from '../../services/api';
import { AlertTriangle, Wrench, X } from 'lucide-react';

export const AddDowntimeModal: React.FC = () => {
  const isOpen = useScheduleStore((s) => s.isAddDowntimeOpen);
  const setIsOpen = useScheduleStore((s) => s.setIsAddDowntimeOpen);
  const resources = useScheduleStore((s) => s.resources);
  const fetchSchedule = useScheduleStore((s) => s.fetchSchedule);

  const [resourceId, setResourceId] = useState(Object.keys(resources)[0] || 'SMT-LINE-01');
  const [reason, setReason] = useState('SMT Squeegee & Stencil Auto-Wipe and Paste Inspection');
  const [startHourOffset, setStartHourOffset] = useState(2);
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [isPlanned, setIsPlanned] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const loadPreset = (
    targetResourceId: string,
    presetReason: string,
    minutes: number,
    offset: number
  ) => {
    setResourceId(targetResourceId);
    setReason(presetReason);
    setDurationMinutes(minutes);
    setStartHourOffset(offset);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceId || !reason) return;

    setIsSubmitting(true);
    try {
      const startTime = new Date(Date.now() + startHourOffset * 3600 * 1000);
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

      await scheduleApi.createDowntime({
        resourceId,
        reason,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        isPlanned,
      });

      await fetchSchedule();
      setIsOpen(false);
    } catch (err: any) {
      alert(`Failed to add maintenance window: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-lg bg-slate-900 border border-amber-500/50 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-amber-300">Schedule EMS Line Maintenance</h2>
              <p className="text-xs text-slate-400">
                Reserve an SMT/THT maintenance block. Overlapping jobs automatically shift forward.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-200 text-lg p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="px-6 pt-4">
          <label className="block text-slate-400 font-semibold mb-1.5 flex items-center gap-1">
            <Wrench className="w-3 h-3 text-amber-400" />
            <span>EMS Maintenance Quick Presets:</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                loadPreset(
                  'SMT-LINE-01',
                  'SMT Squeegee & Stencil Auto-Wipe and Paste Inspection',
                  15,
                  2
                )
              }
              className="bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-amber-500 rounded p-2 text-left"
            >
              <div className="font-semibold text-amber-300 text-[11px]">SMT Stencil Auto-Wipe</div>
              <div className="text-[10px] text-slate-400">SMT-LINE-01 (15m in 2h)</div>
            </button>
            <button
              type="button"
              onClick={() =>
                loadPreset(
                  'THT-WAVE-01',
                  'Solder Pot Dross Skimming & Wave Height Verification',
                  25,
                  3
                )
              }
              className="bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-amber-500 rounded p-2 text-left"
            >
              <div className="font-semibold text-amber-300 text-[11px]">Wave Dross Skimming</div>
              <div className="text-[10px] text-slate-400">THT-WAVE-01 (25m in 3h)</div>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Target EMS Work Center</label>
            <select
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-slate-200 focus:border-amber-500 focus:outline-none"
            >
              {Object.values(resources).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Maintenance Reason</label>
            <input
              type="text"
              required
              placeholder="e.g. SMT Feeder Reel Splice & Nozzle Cleaning"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-slate-200 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Starts In (Hours from Now)</label>
              <input
                type="number"
                min={0}
                max={72}
                value={startHourOffset}
                onChange={(e) => setStartHourOffset(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-slate-200 focus:border-amber-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Duration (Minutes)</label>
              <input
                type="number"
                min={5}
                step={5}
                max={1440}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-slate-200 focus:border-amber-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 bg-slate-950/60 p-2 rounded border border-slate-800">
            <input
              type="checkbox"
              id="isPlanned"
              checked={isPlanned}
              onChange={(e) => setIsPlanned(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="isPlanned" className="text-slate-300 font-medium cursor-pointer">
              Planned Preventive Maintenance (Checked) vs Line Breakdown (Unchecked)
            </label>
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
              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-bold px-5 py-2 rounded-md text-xs transition-colors shadow-lg shadow-amber-950 flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Scheduling...' : 'Reserve Maintenance Window'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useTranslation } from '../../i18n/useTranslation';
import { scheduleApi } from '../../services/api';
import { Layers, Trash2, Save, X } from 'lucide-react';

export const OperationDetailDrawer: React.FC = () => {
  const { t } = useTranslation();
  const selectedOperationId = useScheduleStore((s) => s.selectedOperationId);
  const setSelectedOperationId = useScheduleStore((s) => s.setSelectedOperationId);
  const operations = useScheduleStore((s) => s.operations);
  const resources = useScheduleStore((s) => s.resources);
  const workOrders = useScheduleStore((s) => s.workOrders);
  const deleteOperation = useScheduleStore((s) => s.deleteOperation);
  const deleteWorkOrder = useScheduleStore((s) => s.deleteWorkOrder);
  const fetchSchedule = useScheduleStore((s) => s.fetchSchedule);

  const operation = selectedOperationId ? operations[selectedOperationId] : null;
  const workOrder = operation ? workOrders[operation.workOrderId] : null;

  // Form State
  const [name, setName] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [productType, setProductType] = useState('Automotive-ECU');
  const [duration, setDuration] = useState(120);
  const [setupDuration, setSetupDuration] = useState(15);
  const [status, setStatus] = useState('Planned');
  const [colorCode, setColorCode] = useState('#06b6d4');
  const [isLocked, setIsLocked] = useState(false);
  const [precedences, setPrecedences] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (operation) {
      setName(operation.name);
      setResourceId(operation.requiredResourceId);
      setProductType(operation.productType || 'Automotive-ECU');
      setDuration(operation.durationMinutes);
      setSetupDuration(operation.setupDurationMinutes);
      setStatus(operation.status);
      setColorCode(operation.colorCode || '#06b6d4');
      setIsLocked(!!operation.isLocked);
      setPrecedences(operation.precedenceOperationIds || []);
    }
  }, [operation]);

  if (!operation) return null;

  const handleTogglePrecedence = (opId: string) => {
    if (precedences.includes(opId)) {
      setPrecedences(precedences.filter((id) => id !== opId));
    } else {
      setPrecedences([...precedences, opId]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operation) return;

    setIsSaving(true);
    try {
      await scheduleApi.updateOperation(operation.id, {
        name,
        requiredResourceId: resourceId,
        durationMinutes: Number(duration),
        setupDurationMinutes: Number(setupDuration),
        plannedStartTime: operation.plannedStartTime,
        status,
        colorCode,
        isLocked,
        precedenceOperationIds: precedences,
      });
      await fetchSchedule();
    } catch (err: any) {
      alert(`Failed to save operation: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const otherOperationsInWo = Object.values(operations).filter(
    (o) => o.workOrderId === operation.workOrderId && o.id !== operation.id
  );

  return (
    <aside className="w-88 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-40 text-xs shadow-2xl animate-in slide-in-from-right duration-200 select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold text-cyan-400">
              {workOrder?.orderNumber || operation.workOrderId}
            </span>
            <span className="text-[9px] bg-slate-800 text-slate-300 px-1 py-0.5 rounded border border-slate-700">
              {operation.productType}
            </span>
          </div>
          <h2 className="text-sm font-bold text-slate-100 truncate max-w-[220px]">
            {operation.name}
          </h2>
        </div>
        <button
          onClick={() => setSelectedOperationId(null)}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="block text-slate-400 font-semibold mb-1">{t('opName')}</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">{t('assignedCenter')}</label>
          <select
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            {Object.values(resources).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">{t('productFamily')}</label>
          <select
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            <option value="Automotive-ECU">Automotive-ECU</option>
            <option value="IoT-Gateway">IoT-Gateway</option>
            <option value="Medical-Monitor">Medical-Monitor</option>
            <option value="Industrial-Power">Industrial-Power</option>
            <option value="Aerospace-Telemetry">Aerospace-Telemetry</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">{t('runDuration')}</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={15}
                step={15}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
              />
              <span className="text-slate-500">min</span>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">{t('setupDuration')}</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                step={5}
                value={setupDuration}
                onChange={(e) => setSetupDuration(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
              />
              <span className="text-slate-500">min</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">{t('statusLabel')}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="Planned">{t('statusPlanned')}</option>
              <option value="InProgress">{t('statusInProgress')}</option>
              <option value="Completed">{t('statusCompleted')}</option>
              <option value="Delayed">{t('statusDelayed')}</option>
              <option value="Blocked">{t('statusBlocked')}</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">{t('stageColor')}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={colorCode}
                onChange={(e) => setColorCode(e.target.value)}
                className="w-7 h-7 bg-transparent border-0 cursor-pointer rounded"
              />
              <span className="font-mono text-slate-400 text-[11px]">{colorCode}</span>
            </div>
          </div>
        </div>

        {/* Lock Toggle */}
        <div className="flex items-center gap-2 pt-1 bg-slate-950/60 p-2 rounded border border-slate-800">
          <input
            type="checkbox"
            id="isLockedCheck"
            checked={isLocked}
            onChange={(e) => setIsLocked(e.target.checked)}
            className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500"
          />
          <label htmlFor="isLockedCheck" className="text-slate-300 font-medium cursor-pointer">
            🔒 {t('lockInSequence')}
          </label>
        </div>

        {/* Precedences DAG Checklist */}
        <div className="border-t border-slate-800 pt-3">
          <label className="block text-slate-400 font-semibold mb-2 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('dagPrecedences')}</span>
          </label>
          {otherOperationsInWo.length === 0 ? (
            <div className="text-slate-500 italic">{t('noOtherOps')}</div>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto bg-slate-950 p-2 rounded border border-slate-800">
              {otherOperationsInWo.map((otherOp) => (
                <label
                  key={otherOp.id}
                  className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-cyan-300"
                >
                  <input
                    type="checkbox"
                    checked={precedences.includes(otherOp.id)}
                    onChange={() => handleTogglePrecedence(otherOp.id)}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="truncate">{otherOp.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="border-t border-slate-800 pt-4 space-y-2">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold py-2 rounded shadow-lg shadow-cyan-950 transition-colors flex items-center justify-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? t('saving') : t('saveDag')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (confirm(`'${operation.name}' ${t('deleteOpConfirm')}?`)) {
                deleteOperation(operation.id);
              }
            }}
            className="w-full bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/50 font-semibold py-1.5 rounded transition-colors flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('deleteOp')}</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              const woNumber = workOrder?.orderNumber || operation.workOrderId;
              const opCount = Object.values(operations).filter(
                (o) => o.workOrderId === operation.workOrderId
              ).length;
              if (
                confirm(
                  `'${woNumber}' ${t('deleteWorkOrderConfirm')} (${opCount} ${t('routingSteps')})`
                )
              ) {
                await deleteWorkOrder(operation.workOrderId);
                setSelectedOperationId(null);
                await fetchSchedule();
              }
            }}
            className="w-full bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-600/60 font-bold py-1.5 rounded transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>{t('deleteWorkOrderFull')}</span>
          </button>
        </div>
      </form>
    </aside>
  );
};

import React, { useState } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useTranslation } from '../../i18n/useTranslation';
import { scheduleApi } from '../../services/api';
import { Cpu, RefreshCw, Trash2, Plus, X } from 'lucide-react';

export const ResourceManagerModal: React.FC = () => {
  const { t } = useTranslation();
  const isOpen = useScheduleStore((s) => s.isResourceManagerOpen);
  const setIsOpen = useScheduleStore((s) => s.setIsResourceManagerOpen);
  const resources = useScheduleStore((s) => s.resources);
  const setupMatrices = useScheduleStore((s) => s.setupMatrices);
  const deleteResource = useScheduleStore((s) => s.deleteResource);
  const fetchSchedule = useScheduleStore((s) => s.fetchSchedule);

  const [activeTab, setActiveTab] = useState<'machines' | 'matrix'>('machines');

  // Add Machine Form
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('SmtLine');
  const [workingHours, setWorkingHours] = useState(24);
  const [hourlyRate, setHourlyRate] = useState(350);
  const [colorHex, setColorHex] = useState('#06b6d4');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Setup Matrix Form
  const [fromType, setFromType] = useState('Automotive-ECU');
  const [toType, setToType] = useState('IoT-Gateway');
  const [setupMinutes, setSetupMinutes] = useState(45);

  const handleCreateMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;

    setIsSubmitting(true);
    try {
      await scheduleApi.createResource({
        name,
        code,
        type,
        capacity: 1.0,
        workingHoursPerDay: Number(workingHours),
        hourlyRate: Number(hourlyRate),
        colorHex,
      });
      await fetchSchedule();
      setName('');
      setCode('');
    } catch (err: any) {
      alert(`Failed to create EMS work center: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveMatrixRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await scheduleApi.updateSetupMatrix({
        fromProductType: fromType,
        toProductType: toType,
        setupMinutes: Number(setupMinutes),
      });
      await fetchSchedule();
    } catch (err: any) {
      alert(`Failed to update setup matrix: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">{t('resourceModalTitle')}</h2>
              <p className="text-xs text-slate-400">
                {t('resourceModalDesc')}
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

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('machines')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'machines'
                ? 'border-cyan-500 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{t('tabCenters')} ({Object.keys(resources).length})</span>
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'matrix'
                ? 'border-cyan-500 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('tabMatrix')} ({setupMatrices.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs space-y-6">
          {activeTab === 'machines' ? (
            <>
              {/* Add New Machine */}
              <form
                onSubmit={handleCreateMachine}
                className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3"
              >
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t('addNewCenter')}</span>
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">{t('centerName')}</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SMT Line 03 (Fuji AimEX)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">{t('centerCode')}</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SMT-03"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">{t('equipmentClass')}</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="SmtLine">SMT Line (Printer + P&P + Reflow + AOI)</option>
                      <option value="ThtWaveSoldering">THT Dual-Wave Solder Conveyor</option>
                      <option value="ThtSelectiveSoldering">High-Precision Selective Soldering</option>
                      <option value="InCircuitTesting">In-Circuit Testing (ICT / SPEA)</option>
                      <option value="FunctionalTesting">Functional Test Bench (FCT & Flash)</option>
                      <option value="ConformalCoating">Conformal Coating & UV Tunnel</option>
                      <option value="DepanelingRouter">CNC PCB Depaneling Router</option>
                      <option value="ManualAssembly">Manual Box-Build & THT Insertion</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">{t('operatingHours')}</label>
                    <input
                      type="number"
                      min={8}
                      max={24}
                      value={workingHours}
                      onChange={(e) => setWorkingHours(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">{t('hourlyRate')}</label>
                    <input
                      type="number"
                      min={10}
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">{t('accentColor')}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colorHex}
                        onChange={(e) => setColorHex(e.target.value)}
                        className="w-8 h-7 bg-transparent border-0 cursor-pointer rounded"
                      />
                      <span className="text-slate-400 font-mono text-[11px]">{colorHex}</span>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-1.5 px-3 rounded text-xs transition-colors shadow-sm"
                  >
                    {t('addCenterBtn')}
                  </button>
                </div>
              </form>

              {/* Machine List */}
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold text-[11px]">
                    <tr>
                      <th className="p-2.5">{t('tableColor')}</th>
                      <th className="p-2.5">{t('tableName')}</th>
                      <th className="p-2.5">{t('tableCode')}</th>
                      <th className="p-2.5">{t('tableType')}</th>
                      <th className="p-2.5">{t('tableHours')}</th>
                      <th className="p-2.5">{t('tableRate')}</th>
                      <th className="p-2.5 text-right">{t('tableActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                    {Object.values(resources).map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/40">
                        <td className="p-2.5">
                          <span
                            className="inline-block w-3.5 h-3.5 rounded-full"
                            style={{ backgroundColor: r.colorHex || '#38bdf8' }}
                          />
                        </td>
                        <td className="p-2.5 font-semibold text-slate-200">{r.name}</td>
                        <td className="p-2.5 font-mono text-slate-300">{r.code}</td>
                        <td className="p-2.5 text-slate-400">{r.type}</td>
                        <td className="p-2.5 text-slate-300 font-mono">{r.workingHoursPerDay}h</td>
                        <td className="p-2.5 text-slate-300 font-mono">${r.hourlyRate}/h</td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => {
                              if (confirm(`${r.name} ${t('deleteOpConfirm')}?`)) {
                                deleteResource(r.id);
                              }
                            }}
                            className="text-red-400 hover:text-red-300 p-1 flex items-center gap-1 ml-auto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              {/* Setup Matrix Rules */}
              <form
                onSubmit={handleSaveMatrixRule}
                className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3"
              >
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t('matrixTitle')}</span>
                </h3>
                <div className="grid grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">{t('fromFamily')}</label>
                    <select
                      value={fromType}
                      onChange={(e) => setFromType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 focus:border-cyan-500"
                    >
                      <option value="Automotive-ECU">Automotive-ECU</option>
                      <option value="IoT-Gateway">IoT-Gateway</option>
                      <option value="Medical-Monitor">Medical-Monitor</option>
                      <option value="Industrial-Power">Industrial-Power</option>
                      <option value="Aerospace-Telemetry">Aerospace-Telemetry</option>
                      <option value="SAC305-LeadFree">SAC305-LeadFree</option>
                      <option value="SnPb-Leaded">SnPb-Leaded</option>
                      <option value="FinePitch-0.10mm">FinePitch-0.10mm</option>
                      <option value="Standard-0.15mm">Standard-0.15mm</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">{t('toFamily')}</label>
                    <select
                      value={toType}
                      onChange={(e) => setToType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 focus:border-cyan-500"
                    >
                      <option value="IoT-Gateway">IoT-Gateway</option>
                      <option value="Automotive-ECU">Automotive-ECU</option>
                      <option value="Medical-Monitor">Medical-Monitor</option>
                      <option value="Industrial-Power">Industrial-Power</option>
                      <option value="Aerospace-Telemetry">Aerospace-Telemetry</option>
                      <option value="SAC305-LeadFree">SAC305-LeadFree</option>
                      <option value="SnPb-Leaded">SnPb-Leaded</option>
                      <option value="FinePitch-0.10mm">FinePitch-0.10mm</option>
                      <option value="Standard-0.15mm">Standard-0.15mm</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">{t('setupPenalty')}</label>
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={setupMinutes}
                      onChange={(e) => setSetupMinutes(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-1.5 px-3 rounded text-xs transition-colors shadow-sm"
                  >
                    {t('saveRule')}
                  </button>
                </div>
              </form>

              {/* Setup Matrix List */}
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold text-[11px]">
                    <tr>
                      <th className="p-2.5">{t('fromFamily')}</th>
                      <th className="p-2.5">{t('toFamily')}</th>
                      <th className="p-2.5">{t('setupPenalty')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                    {setupMatrices.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="p-2.5 font-semibold text-slate-200">{s.fromProductType}</td>
                        <td className="p-2.5 font-semibold text-slate-200">{s.toProductType}</td>
                        <td className="p-2.5 text-amber-300 font-mono font-bold">
                          {s.setupMinutes} min
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

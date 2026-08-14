import React, { useState } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useTranslation } from '../../i18n/useTranslation';
import { scheduleApi } from '../../services/api';
import { Cpu, Sparkles, Plus, Trash2, ShieldCheck, X } from 'lucide-react';

interface OperationInput {
  name: string;
  productType: string;
  requiredResourceId: string;
  durationMinutes: number;
  setupDurationMinutes: number;
  colorCode: string;
}

export const CreateWorkOrderModal: React.FC = () => {
  const { t } = useTranslation();
  const isOpen = useScheduleStore((s) => s.isCreateWorkOrderOpen);
  const setIsOpen = useScheduleStore((s) => s.setIsCreateWorkOrderOpen);
  const resources = useScheduleStore((s) => s.resources);
  const fetchSchedule = useScheduleStore((s) => s.fetchSchedule);

  const [orderNumber, setOrderNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState(500);
  const [priority, setPriority] = useState(2);
  const [dueDateDays, setDueDateDays] = useState(2);
  const [industryStandard, setIndustryStandard] = useState('Automotive (IATF 16949)');
  const [solderAlloy, setSolderAlloy] = useState('SAC305-LeadFree');

  const [operations, setOperations] = useState<OperationInput[]>([
    {
      name: 'Top-Side Stencil Print & 3D SPI',
      productType: 'Automotive-ECU',
      requiredResourceId: 'SMT-LINE-01',
      durationMinutes: 60,
      setupDurationMinutes: 15,
      colorCode: '#06b6d4',
    },
    {
      name: 'Top-Side SMT Placement & 10-Zone Reflow',
      productType: 'Automotive-ECU',
      requiredResourceId: 'SMT-LINE-01',
      durationMinutes: 90,
      setupDurationMinutes: 10,
      colorCode: '#06b6d4',
    },
    {
      name: 'Top-Side 3D AOI Optical Inspection',
      productType: 'Automotive-ECU',
      requiredResourceId: 'SMT-LINE-01',
      durationMinutes: 45,
      setupDurationMinutes: 5,
      colorCode: '#a855f7',
    },
    {
      name: 'Bottom-Side SMT Placement & Reflow',
      productType: 'Automotive-ECU',
      requiredResourceId: 'SMT-LINE-01',
      durationMinutes: 110,
      setupDurationMinutes: 20,
      colorCode: '#0284c7',
    },
    {
      name: 'THT Connectors Precision Selective Soldering',
      productType: 'Automotive-ECU',
      requiredResourceId: 'THT-SELECTIVE-01',
      durationMinutes: 75,
      setupDurationMinutes: 15,
      colorCode: '#d97706',
    },
    {
      name: 'In-Circuit Bed-of-Nails Testing (ICT)',
      productType: 'Automotive-ECU',
      requiredResourceId: 'ICT-STATION-01',
      durationMinutes: 60,
      setupDurationMinutes: 10,
      colorCode: '#10b981',
    },
    {
      name: 'Conformal Moisture Coating & UV Curing',
      productType: 'Automotive-ECU',
      requiredResourceId: 'COAT-UV-01',
      durationMinutes: 60,
      setupDurationMinutes: 15,
      colorCode: '#ec4899',
    },
    {
      name: 'Final Automated FCT Functional Test & Flash',
      productType: 'Automotive-ECU',
      requiredResourceId: 'FCT-BENCH-01',
      durationMinutes: 45,
      setupDurationMinutes: 10,
      colorCode: '#059669',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preset Template loader
  const loadPreset = (presetType: 'DOUBLE_SMT_THT' | 'SINGLE_SMT_WAVE' | 'NPI_FAST' | 'MEDICAL_CLASS3') => {
    if (presetType === 'DOUBLE_SMT_THT') {
      setProductCode('ECU-MAIN-V5');
      setProductName('Automotive ECU Multi-Core Controller Board');
      setCustomerName('Bosch Mobility');
      setIndustryStandard('Automotive (IATF 16949)');
      setOperations([
        { name: 'Top-Side Stencil Print & 3D SPI', productType: 'Automotive-ECU', requiredResourceId: 'SMT-LINE-01', durationMinutes: 60, setupDurationMinutes: 15, colorCode: '#06b6d4' },
        { name: 'Top-Side SMT Placement & 10-Zone Reflow', productType: 'Automotive-ECU', requiredResourceId: 'SMT-LINE-01', durationMinutes: 90, setupDurationMinutes: 10, colorCode: '#06b6d4' },
        { name: 'Top-Side 3D AOI Optical Inspection', productType: 'Automotive-ECU', requiredResourceId: 'SMT-LINE-01', durationMinutes: 45, setupDurationMinutes: 5, colorCode: '#a855f7' },
        { name: 'Bottom-Side SMT Placement & Reflow', productType: 'Automotive-ECU', requiredResourceId: 'SMT-LINE-01', durationMinutes: 110, setupDurationMinutes: 20, colorCode: '#0284c7' },
        { name: 'THT Connectors Precision Selective Soldering', productType: 'Automotive-ECU', requiredResourceId: 'THT-SELECTIVE-01', durationMinutes: 75, setupDurationMinutes: 15, colorCode: '#d97706' },
        { name: 'In-Circuit Bed-of-Nails Testing (ICT)', productType: 'Automotive-ECU', requiredResourceId: 'ICT-STATION-01', durationMinutes: 60, setupDurationMinutes: 10, colorCode: '#10b981' },
        { name: 'Conformal Moisture Coating & UV Curing', productType: 'Automotive-ECU', requiredResourceId: 'COAT-UV-01', durationMinutes: 60, setupDurationMinutes: 15, colorCode: '#ec4899' },
        { name: 'Final Automated FCT Functional Test & Flash', productType: 'Automotive-ECU', requiredResourceId: 'FCT-BENCH-01', durationMinutes: 45, setupDurationMinutes: 10, colorCode: '#059669' },
      ]);
    } else if (presetType === 'SINGLE_SMT_WAVE') {
      setProductCode('IOT-NODE-500');
      setProductName('Single-Sided Smart Metering IoT Board');
      setCustomerName('Honeywell Smart Energy');
      setIndustryStandard('IoT & Telecom');
      setOperations([
        { name: 'Top-Side High-Speed SMT (RF + Passives)', productType: 'IoT-Gateway', requiredResourceId: 'SMT-LINE-01', durationMinutes: 100, setupDurationMinutes: 45, colorCode: '#06b6d4' },
        { name: 'THT Dual-Wave Lead-Free Soldering', productType: 'IoT-Gateway', requiredResourceId: 'THT-WAVE-01', durationMinutes: 80, setupDurationMinutes: 20, colorCode: '#f59e0b' },
        { name: 'In-Circuit ICT & RF Calibration', productType: 'IoT-Gateway', requiredResourceId: 'ICT-STATION-01', durationMinutes: 60, setupDurationMinutes: 10, colorCode: '#10b981' },
        { name: 'CNC Panel Singulation & Router', productType: 'IoT-Gateway', requiredResourceId: 'DEPANEL-ROUTER-01', durationMinutes: 40, setupDurationMinutes: 10, colorCode: '#8b5cf6' },
      ]);
    } else if (presetType === 'NPI_FAST') {
      setProductCode('AERO-PROTO-99');
      setProductName('Avionics Radar Sensor Prototype (NPI)');
      setCustomerName('Lockheed Martin Aero');
      setIndustryStandard('Aerospace (AS9100)');
      setSolderAlloy('SnPb-Leaded');
      setOperations([
        { name: 'NPI Top SMT Placement & Profiling', productType: 'Aerospace-Telemetry', requiredResourceId: 'SMT-LINE-02', durationMinutes: 110, setupDurationMinutes: 35, colorCode: '#06b6d4' },
        { name: 'NPI Bottom SMT Component Placement', productType: 'Aerospace-Telemetry', requiredResourceId: 'SMT-LINE-02', durationMinutes: 70, setupDurationMinutes: 15, colorCode: '#0284c7' },
        { name: 'Flying Probe Fixtureless High-Precision ICT', productType: 'Aerospace-Telemetry', requiredResourceId: 'ICT-STATION-01', durationMinutes: 90, setupDurationMinutes: 20, colorCode: '#10b981' },
        { name: 'Mil-Spec Parylene Vapor Barrier Coating', productType: 'Aerospace-Telemetry', requiredResourceId: 'COAT-UV-01', durationMinutes: 80, setupDurationMinutes: 20, colorCode: '#ec4899' },
      ]);
    } else if (presetType === 'MEDICAL_CLASS3') {
      setProductCode('MED-CARDIAC-V3');
      setProductName('Implantable Cardiac Telemetry Controller');
      setCustomerName('Medtronic BioSystems');
      setIndustryStandard('Medical (ISO 13485)');
      setOperations([
        { name: 'Medical Grade SMT Placement & N2 Nitrogen Reflow', productType: 'Medical-Monitor', requiredResourceId: 'SMT-LINE-02', durationMinutes: 140, setupDurationMinutes: 30, colorCode: '#06b6d4' },
        { name: '100% 3D AXI X-Ray BGA Voiding & Solder Joint Verification', productType: 'Medical-Monitor', requiredResourceId: 'SMT-LINE-02', durationMinutes: 60, setupDurationMinutes: 10, colorCode: '#a855f7' },
        { name: 'THT Isolated Sensor Port Selective Soldering', productType: 'Medical-Monitor', requiredResourceId: 'THT-SELECTIVE-01', durationMinutes: 80, setupDurationMinutes: 15, colorCode: '#d97706' },
        { name: 'Medical Silicone Conformal Moisture Coating', productType: 'Medical-Monitor', requiredResourceId: 'COAT-UV-01', durationMinutes: 70, setupDurationMinutes: 30, colorCode: '#ec4899' },
        { name: 'Multi-Parameter Comprehensive FCT Validation', productType: 'Medical-Monitor', requiredResourceId: 'FCT-BENCH-01', durationMinutes: 60, setupDurationMinutes: 15, colorCode: '#059669' },
      ]);
    }
  };

  const handleAddOperation = () => {
    setOperations([
      ...operations,
      {
        name: `PCBA Step ${operations.length + 1}`,
        productType: operations[operations.length - 1]?.productType || 'Automotive-ECU',
        requiredResourceId: Object.keys(resources)[0] || 'SMT-LINE-01',
        durationMinutes: 60,
        setupDurationMinutes: 15,
        colorCode: '#06b6d4',
      },
    ]);
  };

  const handleRemoveOperation = (index: number) => {
    if (operations.length <= 1) return;
    setOperations(operations.filter((_, i) => i !== index));
  };

  const handleOpChange = (index: number, field: keyof OperationInput, value: any) => {
    const updated = [...operations];
    updated[index] = { ...updated[index], [field]: value };
    setOperations(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber || !productCode || !productName) {
      alert('Please fill all required work order fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const releaseDate = new Date();
      const dueDate = new Date(Date.now() + dueDateDays * 24 * 3600 * 1000);

      await scheduleApi.createWorkOrder({
        orderNumber,
        customerName: customerName || undefined,
        productCode,
        productName: `[${industryStandard.split(' ')[0]}] ${productName}`,
        quantity,
        releaseDate: releaseDate.toISOString(),
        dueDate: dueDate.toISOString(),
        priority,
        operations: operations.map((op) => ({
          name: op.name,
          productType: op.productType,
          requiredResourceId: op.requiredResourceId,
          durationMinutes: Number(op.durationMinutes),
          setupDurationMinutes: Number(op.setupDurationMinutes),
          colorCode: op.colorCode,
        })),
      });

      await fetchSchedule();
      setIsOpen(false);
      setOrderNumber('');
      setCustomerName('');
      setProductCode('');
      setProductName('');
    } catch (err: any) {
      alert(`Failed to create work order: ${err.message}`);
    } finally {
      setIsSubmitting(false);
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
              <h2 className="text-sm font-bold text-slate-100">{t('createModalTitle')}</h2>
              <p className="text-xs text-slate-400">
                {t('createModalDesc')}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Quick Routing Template Selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('quickTemplates')}</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => loadPreset('DOUBLE_SMT_THT')}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 rounded-md p-2 text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-cyan-300 group-hover:text-cyan-200">
                  {t('tmplDoubleSmt')}
                </div>
                <div className="text-[10px] text-slate-400">{t('tmplDoubleSmtDesc')}</div>
              </button>
              <button
                type="button"
                onClick={() => loadPreset('SINGLE_SMT_WAVE')}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 rounded-md p-2 text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-amber-300 group-hover:text-amber-200">
                  {t('tmplSingleSmt')}
                </div>
                <div className="text-[10px] text-slate-400">{t('tmplSingleSmtDesc')}</div>
              </button>
              <button
                type="button"
                onClick={() => loadPreset('NPI_FAST')}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 rounded-md p-2 text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-purple-300 group-hover:text-purple-200">
                  {t('tmplNpiFast')}
                </div>
                <div className="text-[10px] text-slate-400">{t('tmplNpiFastDesc')}</div>
              </button>
              <button
                type="button"
                onClick={() => loadPreset('MEDICAL_CLASS3')}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 rounded-md p-2 text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-emerald-300 group-hover:text-emerald-200">
                  {t('tmplMedical')}
                </div>
                <div className="text-[10px] text-slate-400">{t('tmplMedicalDesc')}</div>
              </button>
            </div>
          </div>

          {/* Work Order Info */}
          <div className="grid grid-cols-3 gap-4 border-t border-slate-800 pt-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                {t('woNumber')}
              </label>
              <input
                type="text"
                required
                placeholder="e.g. WO-2026-PCBA-701"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">{t('customer')}</label>
              <input
                type="text"
                placeholder="e.g. Continental Automotive"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">{t('qualityStd')}</label>
              <select
                value={industryStandard}
                onChange={(e) => setIndustryStandard(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="Automotive (IATF 16949)">Automotive (IATF 16949)</option>
                <option value="Medical (ISO 13485)">Medical (ISO 13485)</option>
                <option value="Industrial (IEC 61508)">Industrial (IEC 61508)</option>
                <option value="Aerospace (AS9100)">Aerospace (AS9100)</option>
                <option value="IoT & Telecom">IoT & Telecom</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">{t('productCode')}</label>
              <input
                type="text"
                required
                placeholder="e.g. ECU-MAIN-V4"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">{t('productDesc')}</label>
              <input
                type="text"
                required
                placeholder="e.g. Engine Control Dual-Sided Board"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">{t('solderAlloy')}</label>
              <select
                value={solderAlloy}
                onChange={(e) => setSolderAlloy(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="SAC305-LeadFree">Lead-Free (SAC305 / RoHS)</option>
                <option value="SnPb-Leaded">Leaded (Sn63Pb37 / High-Rel)</option>
                <option value="HighTemp-SAC387">High-Temp (SAC387)</option>
                <option value="LowTemp-Bi58Sn42">Low-Temp Bismuth (Bi58Sn42)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">{t('quantity')}</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">{t('priority')}</label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value={1}>{t('prioCritical')}</option>
                <option value={2}>{t('prioNormal')}</option>
                <option value={3}>{t('prioLow')}</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">{t('targetLeadTime')}</label>
              <select
                value={dueDateDays}
                onChange={(e) => setDueDateDays(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value={1}>{t('day1')}</option>
                <option value={2}>{t('day2')}</option>
                <option value={3}>{t('day3')}</option>
                <option value={5}>{t('day5')}</option>
              </select>
            </div>
          </div>

          {/* Sequential Operations Builder */}
          <div className="border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('routingSteps')} ({operations.length})</span>
              </h3>
              <button
                type="button"
                onClick={handleAddOperation}
                className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded px-2.5 py-1 font-semibold flex items-center gap-1 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('addStep')}</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {operations.map((op, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2.5 text-[11px]"
                >
                  <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-mono font-bold text-cyan-400 shrink-0 text-[10px]">
                    {idx + 1}
                  </span>

                  <div className="flex-1 grid grid-cols-4 gap-2">
                    <input
                      type="text"
                      placeholder="Op Name"
                      value={op.name}
                      onChange={(e) => handleOpChange(idx, 'name', e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-cyan-500"
                    />

                    <select
                      value={op.requiredResourceId}
                      onChange={(e) => handleOpChange(idx, 'requiredResourceId', e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-cyan-500"
                    >
                      {Object.values(resources).map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={15}
                        step={15}
                        placeholder="Duration"
                        value={op.durationMinutes}
                        onChange={(e) =>
                          handleOpChange(idx, 'durationMinutes', Number(e.target.value))
                        }
                        className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-cyan-500 font-mono text-center"
                      />
                      <span className="text-slate-400 text-[10px]">min</span>
                    </div>

                    <select
                      value={op.productType}
                      onChange={(e) => handleOpChange(idx, 'productType', e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-cyan-500"
                    >
                      <option value="Automotive-ECU">Automotive-ECU</option>
                      <option value="IoT-Gateway">IoT-Gateway</option>
                      <option value="Medical-Monitor">Medical-Monitor</option>
                      <option value="Industrial-Power">Industrial-Power</option>
                      <option value="Aerospace-Telemetry">Aerospace-Telemetry</option>
                    </select>
                  </div>

                  {operations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOperation(idx)}
                      className="text-red-400 hover:text-red-300 p-1 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Modal Footer */}
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
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-5 py-2 rounded-md font-semibold text-xs transition-colors shadow-lg shadow-cyan-950 flex items-center gap-1.5"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{isSubmitting ? t('creatingWo') : t('submitWo')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

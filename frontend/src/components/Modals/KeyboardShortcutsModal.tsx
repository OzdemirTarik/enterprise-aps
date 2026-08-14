import React from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useTranslation } from '../../i18n/useTranslation';
import { Keyboard, X } from 'lucide-react';

export const KeyboardShortcutsModal: React.FC = () => {
  const { t, language } = useTranslation();
  const isOpen = useScheduleStore((s) => s.isShortcutsOpen);
  const setIsOpen = useScheduleStore((s) => s.setIsShortcutsOpen);

  if (!isOpen) return null;

  const shortcutList = [
    {
      keys: ['Ctrl', 'Z'],
      desc: t('shortcutsUndo'),
      category: language === 'tr' ? 'Düzenleme' : 'Editing',
    },
    {
      keys: ['Ctrl', 'Y'],
      desc: t('shortcutsRedo'),
      category: language === 'tr' ? 'Düzenleme' : 'Editing',
    },
    {
      keys: ['T'],
      desc: t('shortcutsJumpNow'),
      category: language === 'tr' ? 'Gezinme' : 'Navigation',
    },
    {
      keys: ['Esc'],
      desc: t('shortcutsClose'),
      category: language === 'tr' ? 'Pencereler' : 'Windows',
    },
    {
      keys: ['?'],
      desc: t('keyboardShortcuts'),
      category: language === 'tr' ? 'Yardım' : 'Help',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#141e33]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">{t('shortcutsHelpTitle')}</h2>
              <p className="text-[11px] text-slate-400">
                {language === 'tr' ? 'Hızlı ve verimli planlama için kısayollar' : 'Shortcuts for fast and productive scheduling'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts Table */}
        <div className="p-5 space-y-3">
          {shortcutList.map((sc, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300 font-medium">{sc.desc}</span>
              </div>
              <div className="flex items-center gap-1">
                {sc.keys.map((k, kIdx) => (
                  <kbd
                    key={kIdx}
                    className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-mono text-[11px] font-bold shadow-sm"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#141e33] border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>{language === 'tr' ? 'İpucu: Herhangi bir operasyona tıklayarak çekmecede detayları açabilirsiniz.' : 'Tip: Click on any operation to view its details in the drawer.'}</span>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

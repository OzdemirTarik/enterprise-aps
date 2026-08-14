import { useScheduleStore } from '../store/useScheduleStore';
import { translations, TranslationKey } from './translations';

export const useTranslation = () => {
  const language = useScheduleStore((s) => s.language);
  const setLanguage = useScheduleStore((s) => s.setLanguage);

  const t = (key: TranslationKey): string => {
    return translations[language]?.[key] || translations['tr']?.[key] || key;
  };

  return { t, language, setLanguage };
};

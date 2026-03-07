import useSettingsStore from '../store/settingsStore.js';
import { translations } from '../i18n/translations.js';

export function useTranslation() {
  const settings = useSettingsStore((s) => s.settings);
  const lang = settings?.language || 'en';
  const strings = translations[lang] || translations.en;

  const t = (key) => strings[key] ?? translations.en[key] ?? key;

  return { t, lang };
}

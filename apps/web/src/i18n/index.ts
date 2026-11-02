import { DEFAULT_LOCALE, type Locale } from '@savdo/shared';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ru from './locales/ru.json';
import uz from './locales/uz.json';

export const resources = {
  uz: { translation: uz },
  en: { translation: en },
  ru: { translation: ru },
} as const;

export function initI18n(locale: Locale = DEFAULT_LOCALE) {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources,
      lng: locale,
      fallbackLng: DEFAULT_LOCALE,
      interpolation: { escapeValue: false },
      initAsync: false,
    });
  } else if (i18n.language !== locale) {
    void i18n.changeLanguage(locale);
  }
  return i18n;
}

export default i18n;

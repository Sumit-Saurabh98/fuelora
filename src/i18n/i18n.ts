import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { isLanguage, LANGUAGES, type Language } from '@/domain/preferences';

import en from './en.json';
import hi from './hi.json';

export { isLanguage, LANGUAGES as SUPPORTED_LANGUAGES, type Language };

export type DeviceLocale = {
  languageTag: string;
  regionCode: string | null;
  currencyCode: string | null;
};

export function deviceLocale(): DeviceLocale {
  const locale = getLocales()[0];
  return {
    languageTag: locale?.languageTag ?? 'en',
    regionCode: locale?.regionCode ?? null,
    currencyCode: locale?.currencyCode ?? null,
  };
}

export function deviceLanguage(): Language {
  const code = getLocales()[0]?.languageCode;
  return isLanguage(code) ? code : 'en';
}

export const i18n = createInstance();

// Synchronous init so the first render already has strings (resources are bundled).
void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi } },
  lng: deviceLanguage(),
  fallbackLng: 'en',
  supportedLngs: LANGUAGES,
  interpolation: { escapeValue: false },
  initAsync: false,
});

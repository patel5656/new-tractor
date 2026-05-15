import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './locales/en.json';
import yoTranslation from './locales/yo.json';
import pcmTranslation from './locales/pcm.json';
import esTranslation from './locales/es.json';

const savedLanguage = localStorage.getItem('tractorlink_lang') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      yo: { translation: yoTranslation },
      pcm: { translation: pcmTranslation },
      es: { translation: esTranslation }
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;

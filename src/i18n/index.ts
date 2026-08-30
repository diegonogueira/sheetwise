import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import pt from './pt.json'
import en from './en.json'

const LANG_KEY = 'sheetwise-lang'

function detectLang(): 'pt' | 'en' {
  // Guard: localStorage/navigator não existem no Node (Vitest) nem em SSR
  if (typeof localStorage === 'undefined') return 'pt'
  const stored = localStorage.getItem(LANG_KEY)
  if (stored === 'pt' || stored === 'en') return stored
  if (typeof navigator === 'undefined') return 'pt'
  return navigator.language.toLowerCase().startsWith('pt') ? 'pt' : 'en'
}

void i18n.use(initReactI18next).init({
  resources: {
    pt: { translation: pt },
    en: { translation: en },
  },
  lng: detectLang(),
  fallbackLng: 'pt',
  interpolation: { escapeValue: false },
  // Sem Suspense: os recursos são embutidos no bundle, então o init é síncrono.
  react: { useSuspense: false },
})

export function setLanguage(lang: 'pt' | 'en'): void {
  localStorage.setItem(LANG_KEY, lang)
  void i18n.changeLanguage(lang)
}

export default i18n

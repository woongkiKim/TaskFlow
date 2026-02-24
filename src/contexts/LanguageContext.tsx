import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import en from '../locales/en';
import ko from '../locales/ko';
import sw from '../locales/sw';
import type { TranslationKeys } from '../locales/en';

export type { TranslationKeys };

type Lang = 'ko' | 'en' | 'sw';
const dictionaries = { ko, en, sw };

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKeys) => string | string[];
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('taskflow-lang');
    return (saved === 'en' || saved === 'ko' || saved === 'sw') ? (saved as Lang) : 'ko';
  });

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('taskflow-lang', newLang);
  }, []);

  const t = useCallback((key: TranslationKeys): string | string[] => {
    return dictionaries[lang][key as keyof typeof en] ?? key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};

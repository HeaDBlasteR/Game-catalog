import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Language, TranslationKey, translations } from './translations';
import { toUserErrorMessage } from '../shared/feedback';
import { DEFAULT_GENRES } from '../shared/default-genres';

const STORAGE_KEY = 'language';

type TranslateParams = Record<string, string | number>;

interface I18nContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, params?: TranslateParams) => string;
  errorText: (error: unknown, fallback: TranslationKey) => string;
  genreDescription: (name: string, description: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function readStoredLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'ru' || stored === 'en') return stored;
  } catch {
    return 'ru';
  }
  return 'ru';
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
    window.electronAPI.setLanguage(language).catch(() => undefined);
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      return;
    }
  }, [language]);

  const t = useCallback((key: TranslationKey, params?: TranslateParams) => {
    const template = translations[language][key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
  }, [language]);

  const errorText = useCallback(
    (error: unknown, fallback: TranslationKey) => toUserErrorMessage(error, fallback, t),
    [t]
  );

  const genreDescription = useCallback((name: string, description: string) => {
    if (language === 'ru') return description;
    const defaultGenre = DEFAULT_GENRES.find(genre => genre.name === name);
    return defaultGenre && defaultGenre.description.ru === description ? defaultGenre.description.en : description;
  }, [language]);

  const value = useMemo(
    () => ({ language, setLanguage: setLanguageState, t, errorText, genreDescription }),
    [language, t, errorText, genreDescription]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
};

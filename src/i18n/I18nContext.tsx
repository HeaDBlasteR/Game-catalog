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
  formatDate: (value: string | null) => string;
  formatDateTime: (value: string | null) => string;
  formatDuration: (seconds: number) => string;
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

  const formatDate = useCallback((value: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }, [language]);

  const formatDateTime = useCallback((value: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [language]);

  const formatDuration = useCallback((seconds: number) => {
    const totalMinutes = Math.floor(Math.max(0, seconds) / 60);
    if (totalMinutes < 1) return t('time.lessThanMinute');

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours
      ? t('time.hoursMinutes', { hours, minutes })
      : t('time.minutes', { minutes });
  }, [t]);

  const value = useMemo(
    () => ({ language, setLanguage: setLanguageState, t, errorText, genreDescription, formatDate, formatDateTime, formatDuration }),
    [language, t, errorText, genreDescription, formatDate, formatDateTime, formatDuration]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
};

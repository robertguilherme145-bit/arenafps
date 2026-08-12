import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultLanguage, languages as availableLanguages, translations, type LanguageCode } from "./translations";

const storageKey = "arena-language";

type I18nContextValue = {
  language: LanguageCode;
  languages: typeof availableLanguages;
  setLanguage: (language: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
  format: (key: string, values: Record<string, string | number>, fallback?: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function normalizeLanguage(value?: string | null): LanguageCode {
  if (!value) return defaultLanguage;
  const code = value.toLowerCase();
  if (code.startsWith("en")) return "en-US";
  if (code.startsWith("es")) return "es-ES";
  return "pt-BR";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>(() => {
    if (typeof window === "undefined") return defaultLanguage;
    return normalizeLanguage(window.localStorage.getItem(storageKey) ?? window.navigator.language);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18nContextValue>(() => {
    const activeSet = translations[language] as Record<string, string>;
    const fallbackSet = translations[defaultLanguage] as Record<string, string>;
    const translate = (key: string, fallback?: string) =>
      activeSet[key] ?? fallbackSet[key] ?? fallback ?? key;

    return {
      language,
      languages: availableLanguages,
      setLanguage,
      t: translate,
      format: (key, values, fallback) =>
        Object.entries(values).reduce(
          (text, [name, replacement]) => text.split(`{${name}}`).join(String(replacement)),
          translate(key, fallback)
        )
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}

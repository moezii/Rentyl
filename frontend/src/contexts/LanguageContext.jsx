import React, { createContext, useContext, useState, useEffect } from 'react';

// Import English translations
import enTranslations from '../translations/en';

// Import Arabic translations
import arTranslations from '../translations/ar';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Language configuration
const SUPPORTED_LANGUAGES = {
  en: {
    code: 'en',
    name: 'English',
    displayName: 'En',
    abbreviation: 'En',
    flag: '🇺🇸',
    dir: 'ltr',
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    displayName: 'العربية',
    abbreviation: 'AR',
    flag: '🇸🇦',
    dir: 'rtl',
  },
};

// Fallback translations (will be replaced by modular imports)
// This contains the full original translations as a fallback
// TODO: Remove this once all modules are migrated
const fallbackTranslations = {
  en: {
    // Original translations will stay here temporarily
    // They will be gradually replaced by the modular imports
  },
  ar: {
    // Arabic translations
  },
};

/**
 * Merge modular translations with fallback translations
 * This allows gradual migration from monolithic to modular structure
 */
function mergeTranslations(modular, fallback) {
  return {
    ...fallback,
    ...modular,
  };
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    // Get saved language from localStorage or default to 'en'
    return localStorage.getItem('language') || 'en';
  });

  // Merge modular and fallback translations
  const translations = {
    en: mergeTranslations(enTranslations, fallbackTranslations.en),
    ar: mergeTranslations(arTranslations, fallbackTranslations.ar),
  };

  useEffect(() => {
    // Save language preference
    localStorage.setItem('language', language);

    // Update document direction and lang attribute
    document.documentElement.dir = SUPPORTED_LANGUAGES[language].dir;
    document.documentElement.lang = language;
  }, [language]);

  const changeLanguage = newLanguage => {
    if (SUPPORTED_LANGUAGES[newLanguage]) {
      setLanguage(newLanguage);
    }
  };

  /**
   * Translation function
   * @param {string} key - Translation key in dot notation (e.g., 'nav.home', 'dashboard.title')
   * @param {object} params - Optional parameters for interpolation
   * @returns {string} - Translated string
   */
  const t = (key, params = {}) => {
    const keys = key.split('.');
    let value = translations[language];

    // Navigate through the nested object
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        // Key not found, return the key itself as fallback
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    // If value is still an object, something went wrong
    if (typeof value === 'object') {
      console.warn(`Translation key points to an object, not a string: ${key}`);
      return key;
    }

    // Handle string interpolation
    if (typeof value === 'string' && Object.keys(params).length > 0) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? params[paramKey] : match;
      });
    }

    return value || key;
  };

  const value = {
    language,
    changeLanguage,
    t,
    languages: SUPPORTED_LANGUAGES,
    currentLanguage: SUPPORTED_LANGUAGES[language],
    isRTL: SUPPORTED_LANGUAGES[language].dir === 'rtl',
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export default LanguageContext;

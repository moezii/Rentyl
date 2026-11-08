import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const LanguageSelector = ({ className = '', variant = 'default' }) => {
  const { currentLanguage, languages, changeLanguage, isRTL } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = langCode => {
    changeLanguage(langCode);
    setIsOpen(false);
  };

  const currentLang = currentLanguage;

  // Different styles for landing page vs dashboard vs mobile
  const getButtonStyles = () => {
    if (variant === 'landing') {
      return 'inline-flex items-center justify-between px-4 py-2 text-sm font-medium text-gray-300 hover:text-blue-400 bg-blue-500/10 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 hover:shadow-md hover:shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300';
    }
    if (variant === 'sidebar') {
      return 'inline-flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-white bg-gray-900 border border-gray-700 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-colors';
    }
    if (variant === 'mobile') {
      return 'inline-flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-blue-100 bg-gray-800 border border-blue-500/40 rounded-lg shadow-sm shadow-blue-500/20 hover:bg-blue-500/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:ring-offset-0 transition-all';
    }
    // Dashboard variant (dark theme)
    return 'inline-flex items-center justify-between px-3 py-2 text-sm font-medium text-white bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors';
  };

  const getDropdownStyles = () => {
    const positionClass = isRTL ? 'left-0' : 'right-0';
    if (variant === 'landing') {
      return `absolute ${positionClass} z-50 mt-2 w-48 bg-gray-900/95 backdrop-blur-xl border border-blue-500/30 rounded-lg shadow-lg shadow-blue-500/20`;
    }
    if (variant === 'sidebar') {
      return `absolute left-0 right-0 bottom-full mb-2 z-50 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl shadow-black/30`;
    }
    if (variant === 'mobile') {
      return `absolute ${positionClass} z-50 mt-1.5 w-44 bg-gray-900/95 backdrop-blur-xl border border-blue-500/30 rounded-lg shadow-lg shadow-blue-500/20`;
    }
    // Dashboard variant (dark theme)
    return `absolute ${positionClass} z-50 mt-2 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-lg`;
  };

  const getItemStyles = langCode => {
    const isSelected = currentLanguage === langCode;

    if (variant === 'landing') {
      return `w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
      }`;
    }
    if (variant === 'sidebar') {
      return `w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors ${
        isSelected ? 'bg-blue-500/20 text-blue-100' : 'text-gray-200'
      }`;
    }
    if (variant === 'mobile') {
      return `w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors ${
        isSelected ? 'bg-blue-500/20 text-blue-100' : 'text-gray-200'
      }`;
    }
    // Dashboard variant (dark theme)
    return `w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors ${
      isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-gray-300'
    }`;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Language Button */}
      <button onClick={() => setIsOpen(!isOpen)} className={getButtonStyles()}>
        <div className="flex items-center">
          <span className="font-medium">
            {variant === 'mobile' ? currentLang?.abbreviation : currentLang?.displayName}
          </span>
        </div>
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform ${
            isOpen ? 'rotate-180' : ''
          } ${variant === 'landing' ? 'text-white' : variant === 'mobile' ? 'text-blue-200' : 'text-gray-400'} ${
            isRTL ? 'mr-5' : 'ml-2'
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={getDropdownStyles()}>
          {Object.entries(languages).map(([langCode, language]) => (
            <button
              key={langCode}
              onClick={() => handleLanguageChange(langCode)}
              className={getItemStyles(langCode)}
            >
              <div
                className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <div className="flex items-center">
                  <div>
                    <div
                      className={`text-sm font-medium ${
                        variant === 'landing'
                          ? currentLanguage === langCode
                            ? 'text-blue-600'
                            : 'text-gray-900'
                          : 'text-current'
                      }`}
                    >
                      {language.displayName}
                    </div>
                    <div
                      className={`text-xs ${
                        variant === 'landing' ? 'text-gray-500' : 'text-gray-400'
                      }`}
                    >
                      {language.name}
                    </div>
                  </div>
                </div>
                {currentLanguage === langCode && (
                  <div className="flex items-center">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        variant === 'landing' ? 'bg-blue-500' : 'bg-green-400'
                      }`}
                    ></div>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;

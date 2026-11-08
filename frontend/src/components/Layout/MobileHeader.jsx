import React from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import LanguageSelector from '../LanguageSelector';
import footer1 from '../../assets/footer1.webp';

const MobileHeader = () => {
  const { t, isRTL } = useLanguage();
  const location = useLocation();

  const navItems = [
    { path: '/', label: t('nav.home') },
    { path: '/features', label: t('nav.features') },
    { path: '/pricing', label: t('nav.pricing') },
    { path: '/about', label: t('nav.about') },
    { path: '/contact', label: t('nav.contact') },
  ];

  return (
    <header
      className="bg-gray-900 border-b border-blue-500/20 fixed top-0 left-0 right-0 z-50"
      data-mobile-header
    >
      <div className="max-w-lg mx-auto px-4 py-2">
        {/* Top row with logo centered and language selector */}
        <div className="flex items-center justify-between mb-3">
          <div className="w-12"></div> {/* Spacer */}
          {/* Centered Logo - bigger */}
          <div className="flex-1 flex justify-center">
            <a href="/" className="block">
              <img
                src={footer1}
                alt="Rentyl"
                className="h-7 w-auto object-contain brightness-150"
              />
            </a>
          </div>
          {/* Language Selector - small */}
          <div className="flex-shrink-0 text-xs scale-75">
            <LanguageSelector variant="mobile" />
          </div>
        </div>

        {/* Mobile Navigation - bottom row */}
        <div
          className={`flex ${isRTL ? 'space-x-reverse space-x-0.5' : 'space-x-0.5'} justify-center`}
        >
          {(isRTL ? [...navItems].reverse() : navItems).map(item => (
            <a
              key={item.path}
              href={item.path}
              className={`px-2 py-1.5 text-[10px] font-medium rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;

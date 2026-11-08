import React, { useState, useRef, useEffect } from 'react';
import { useCurrency } from './context/CurrencyContext';
import { ChevronDownIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import FlagIcon from './FlagIcon';
import { useLanguage } from '../contexts/LanguageContext';

const CurrencySelector = ({ className = '' }) => {
  const {
    selectedCurrency,
    supportedCurrencies,
    changeCurrency,
    getCurrentCurrency,
    refreshRates,
    lastUpdated,
    loading,
  } = useCurrency();

  const { t } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  const handleCurrencyChange = currencyCode => {
    changeCurrency(currencyCode);
    setIsOpen(false);
  };

  const handleRefresh = async e => {
    e.preventDefault();
    e.stopPropagation();

    if (isRefreshing) return; // Prevent multiple clicks

    setIsRefreshing(true);

    try {
      // Ensure minimum spin duration so user can see the animation
      const [refreshResult] = await Promise.all([
        refreshRates(),
        new Promise(resolve => setTimeout(resolve, 800)), // Minimum 800ms spin
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const currentCurrency = getCurrentCurrency();

  const formatLastUpdated = timestamp => {
    if (!timestamp) return t('common.never');
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return t('common.justNow');
    if (diffMins < 60) return `${diffMins}${t('common.mAgo')}`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}${t('common.hAgo')}`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        <span className="text-sm text-gray-400">{t('common.loadingCurrencies')}</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Currency Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between px-4 py-2 text-sm font-medium text-white bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors"
      >
        <div className="flex items-center space-x-7">
          <FlagIcon
            countryCode={currentCurrency?.countryCode}
            flag={currentCurrency?.flag}
            className="text-lg"
          />
          <span className="font-medium">{selectedCurrency}</span>
          <span className="text-gray-400 text-xs">{currentCurrency?.symbol}</span>
        </div>
        <ChevronDownIcon
          className={`h-4 w-4 text-gray-400 transition-transform ml-2 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 bg-gray-800 border border-gray-600 rounded-lg shadow-lg">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-600">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">{t('common.selectCurrency')}</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {t('common.updated')}: {formatLastUpdated(lastUpdated)}
                </span>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-1.5 text-white bg-gray-700 border border-gray-600 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                  title={t('common.refreshExchangeRates')}
                >
                  <ArrowPathIcon
                    className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-1000 ${isRefreshing ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Currency List */}
          <div className="max-h-64 overflow-y-auto">
            {Object.entries(supportedCurrencies).map(([code, currency]) => (
              <button
                key={code}
                onClick={() => handleCurrencyChange(code)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors ${
                  selectedCurrency === code ? 'bg-blue-600 hover:bg-blue-700' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-7 ">
                    <FlagIcon
                      countryCode={currency.countryCode}
                      flag={currency.flag}
                      className="text-lg"
                    />
                    <div>
                      <div className="text-sm font-medium text-white">{currency.name}</div>
                      <div className="text-xs text-gray-400">
                        {code} • {currency.symbol}
                      </div>
                    </div>
                  </div>
                  {selectedCurrency === code && (
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-600 bg-gray-750">
            <p className="text-xs text-gray-400 text-center">{t('common.exchangeRatesUpdated')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencySelector;

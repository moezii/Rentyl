import React, { useState } from 'react';
import { useMileage } from './context/MileageContext';
import { useLanguage } from '../contexts/LanguageContext';

const MileageSelector = () => {
  const { selectedUnit, supportedUnits, changeUnit } = useMileage();
  const { t, isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const handleUnitChange = unitCode => {
    changeUnit(unitCode);
    setIsOpen(false);
  };

  const currentUnit = supportedUnits[selectedUnit];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <span className="text-sm font-medium">{t(`mileage.${selectedUnit}`)}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div
            className={`absolute top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 ${isRTL ? 'right-0' : 'left-0'}`}
          >
            <div className="p-2">
              <div
                className={`text-xs text-gray-500 dark:text-gray-400 px-3 py-2 font-medium ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('mileage.selectUnit')}
              </div>

              {Object.values(supportedUnits).map(unit => (
                <button
                  key={unit.code}
                  onClick={() => handleUnitChange(unit.code)}
                  className={`w-full ${isRTL ? 'text-right' : 'text-left'} px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''} ${
                    selectedUnit === unit.code
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{t(`mileage.${unit.code}`)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {t(`mileage.${unit.code === 'km' ? 'kilometers' : 'miles'}`)}
                    </div>
                  </div>
                  {selectedUnit === unit.code && (
                    <svg
                      className="w-4 h-4 text-blue-600 dark:text-blue-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MileageSelector;

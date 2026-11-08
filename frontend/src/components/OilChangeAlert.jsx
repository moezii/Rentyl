// src/components/OilChangeAlert.jsx
import React from 'react';
import { needsOilChange } from '../utils/carUtils';
import { useLanguage } from '../contexts/LanguageContext';

const OilChangeAlert = ({ car, variant = 'compact', debugId = 'oil-alert' }) => {
  const { t, isRTL } = useLanguage();

  // Don't render if car data is missing
  if (!car) {
    console.log(`${debugId}: No car data provided`);
    return null;
  }

  // Check if oil change is actually needed
  const oilChangeNeeded = needsOilChange(car);

  if (!oilChangeNeeded) {
    console.log(`${debugId}: Oil change not needed for ${car.make} ${car.model}`);
    return null;
  }

  // Calculate values for display
  const currentMileage = parseInt(car.current_mileage) || 0;
  const lastOilChangeMileage = parseInt(car.last_oil_change_mileage) || 0;
  const interval = parseInt(car.oil_change_interval) || 10000;
  const mileageSinceLastChange = currentMileage - lastOilChangeMileage;
  const overdueMileage = mileageSinceLastChange - interval;

  console.log(`${debugId}: Rendering oil change alert for ${car.make} ${car.model}`);
  console.log(`  Current: ${currentMileage}, Last: ${lastOilChangeMileage}, Interval: ${interval}`);
  console.log(`  Since last change: ${mileageSinceLastChange}, Overdue by: ${overdueMileage}`);

  if (variant === 'compact') {
    // Compact version for car cards
    return (
      <div className="bg-yellow-900/70 border border-yellow-500 rounded-lg p-3">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-4 w-4 text-yellow-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-2">
            <h4 className="text-sm font-medium text-yellow-300">Oil Change Due</h4>
            <p className="text-xs text-yellow-200 mt-1">
              Overdue by {overdueMileage?.toLocaleString()} km
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Full version for detailed pages
  return (
    <div className="bg-yellow-900/70 border-l-4 border-yellow-500 p-4 mb-4">
      <div className={`flex items-start ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className={`${isRTL ? 'mr-3 text-right' : 'ml-3 text-left'}`}>
          <h3 className="text-sm font-medium text-yellow-100">
            {t('maintenance.oilChangeRequired')}
          </h3>
          <div className="mt-2 text-sm text-yellow-200">
            <div className="space-y-1">
              <div className="flex items-start">
                <span className="inline-block w-2 h-2 bg-current rounded-full mt-2 flex-shrink-0"></span>
                <div className={`${isRTL ? 'mr-3' : 'ml-3'}`}>
                  {t('cars.currentMileage')}: {currentMileage?.toLocaleString()} {t('cars.km')}
                </div>
              </div>
              <div className="flex items-start">
                <span className="inline-block w-2 h-2 bg-current rounded-full mt-2 flex-shrink-0"></span>
                <div className={`${isRTL ? 'mr-3' : 'ml-3'}`}>
                  {t('cars.lastOilChange')}: {lastOilChangeMileage?.toLocaleString()} {t('cars.km')}
                </div>
              </div>
              <div className="flex items-start">
                <span className="inline-block w-2 h-2 bg-current rounded-full mt-2 flex-shrink-0"></span>
                <div className={`${isRTL ? 'mr-3' : 'ml-3'}`}>
                  {t('cars.mileageSinceLastChange')}: {mileageSinceLastChange?.toLocaleString()}{' '}
                  {t('cars.km')}
                </div>
              </div>
              <div className="flex items-start">
                <span className="inline-block w-2 h-2 bg-current rounded-full mt-2 flex-shrink-0"></span>
                <div className={`${isRTL ? 'mr-3' : 'ml-3'}`}>
                  {t('cars.oilChangeInterval')}: {interval?.toLocaleString()} {t('cars.km')}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-yellow-600">
              <p className="font-medium text-yellow-100">
                {t('maintenance.vehicleOverdueOilChange', {
                  mileage: overdueMileage?.toLocaleString(),
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OilChangeAlert;

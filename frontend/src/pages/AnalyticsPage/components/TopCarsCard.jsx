// frontend/src/pages/AnalyticsPage/components/TopCarsCard.jsx
import React from 'react';
import { formatPrice } from '../../../utils/currencySymbols';

// TopCarsCard Component (updated layout)
const TopCarsCard = ({ car, metric, index, companyCurrency, t, isRTL }) => {
  // Function to display the appropriate metric value
  const getMetricValue = () => {
    switch (metric) {
      case 'highest_earning':
      case 'lowest_earning':
        return formatPrice(car.analytics.net_income || 0, companyCurrency || '');
      case 'highest_utility':
      case 'lowest_utility':
        return `${Math.round(car.utilization_rate || 0)}%`;
      case 'highest_maintenance':
      case 'lowest_maintenance':
        return formatPrice(car.analytics.total_maintenance || 0, companyCurrency || '');
      default:
        return formatPrice(car.analytics.net_income || 0, companyCurrency || '');
    }
  };

  // Function to get metric label
  const getMetricLabel = () => {
    switch (metric) {
      case 'highest_earning':
      case 'lowest_earning':
        return t('analytics.netIncome');
      case 'highest_utility':
      case 'lowest_utility':
        return t('analytics.utilization');
      case 'highest_maintenance':
      case 'lowest_maintenance':
        return t('analytics.costs');
      default:
        return t('analytics.netIncome');
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
      {/* Car Image */}
      <div className="h-48 bg-gray-700 flex items-center justify-center overflow-hidden relative">
        {/* Year badge positioned on the image */}
        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
          {car.year}
        </div>

        {car.image_url ? (
          <img
            src={car.image_url}
            alt={`${car.make} ${car.model}`}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
            onError={e => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/400x200?text=Car+Image';
            }}
          />
        ) : (
          <img
            src="https://via.placeholder.com/400x200?text=Car+Image"
            alt="Default Car"
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
          />
        )}
      </div>

      {/* Car Details */}
      <div className="p-6">
        {/* Car name - now has full width for single line */}
        <h3
          className={`font-bold text-xl text-white truncate ${isRTL ? 'text-right' : 'text-left'}`}
        >
          {car.make} {car.model}
        </h3>

        {/* License plate */}
        <div
          className={`flex mt-3 ${isRTL ? 'space-x-reverse space-x-2 justify-end' : 'space-x-2'}`}
        >
          <span
            className={`px-3 py-1 bg-gray-700/50 rounded-full text-sm text-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}
          >
            {car.license_plate}
          </span>
        </div>

        {/* Metrics and ranking */}
        <div
          className={`mt-6 pt-4 border-t border-gray-700/50 flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <span className="block text-gray-400 text-sm">{getMetricLabel()}</span>
            <span className="font-bold text-white text-lg">{getMetricValue()}</span>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-blue-400 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform duration-200">
            #{index + 1}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopCarsCard;


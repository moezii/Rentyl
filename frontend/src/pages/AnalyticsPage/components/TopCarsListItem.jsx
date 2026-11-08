// frontend/src/pages/AnalyticsPage/components/TopCarsListItem.jsx
import React from 'react';
import { formatPrice } from '../../../utils/currencySymbols';

// TopCarsListItem Component (exact copy from original)
const TopCarsListItem = ({ car, metric, index, companyCurrency, t, isRTL }) => {
  const getMetricValue = () => {
    switch (metric) {
      case 'highest_earning':
      case 'lowest_earning':
        return formatPrice(car.analytics.net_income, companyCurrency || '');
      case 'highest_utility':
      case 'lowest_utility':
        return `${Math.round(car.utilization_rate)}%`;
      case 'highest_maintenance':
      case 'lowest_maintenance':
        return formatPrice(car.analytics.total_maintenance, companyCurrency || '');
      default:
        return '-';
    }
  };

  return (
    <div className="flex justify-between items-center bg-gray-900 p-3 rounded-md border border-gray-700">
      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
        <span className="text-sm text-white font-medium" style={{ direction: 'ltr' }}>
          {index + 1}.
        </span>
        <span className="text-sm text-white font-medium">
          {car.make} {car.model} ({car.license_plate})
        </span>
      </div>
      <div className="text-sm text-blue-400 font-bold">{getMetricValue()}</div>
    </div>
  );
};

export default TopCarsListItem;


import React from 'react';
import { formatPrice } from '../../utils/currencySymbols';
import { UtilizationIcon, RevenueIcon, CarIcon } from './icons/AnalyticsIcon';

// Utility function for date formatting (extracted from RefAnalyticsPage)
const formatDateUtils = {
  getMonthLabel(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  },
};

// Stats Card Component (exact copy from RefAnalyticsPage)
const StatsCard = ({ title, value, icon, description, trend, positive, isRTL }) => {
  const changeColorClass = positive
    ? 'text-green-400'
    : positive === false
      ? 'text-red-400'
      : 'text-blue-400';

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border border-gray-700/50">
      <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h3 className={`text-gray-300 font-medium text-lg ${isRTL ? 'text-right' : 'text-left'}`}>
          {title}
        </h3>
        <div className="text-blue-400 bg-blue-400/10 p-2 rounded-lg">{icon}</div>
      </div>
      <p
        className={`text-4xl font-bold ${changeColorClass} mb-3 ${isRTL ? 'text-right' : 'text-left'}`}
      >
        {value}
      </p>
      {description && (
        <div className={`flex items-center ${isRTL ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`text-gray-400 text-sm font-medium flex items-center ${isRTL ? 'text-right' : 'text-left'}`}
          >
            {description}
          </div>
        </div>
      )}
    </div>
  );
};

const FleetStats = ({ fleetData, monthlyTrends, selectedMonth, cars, t, isRTL, companyCurrency }) => {
  // Format currency with fallback
  const formatCurrency = value => {
    return formatPrice(value || 0, companyCurrency || '');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <StatsCard
        title={t('analytics.fleetUtilization')}
        value={`${Math.round(fleetData.utilization)}%`}
        icon={<UtilizationIcon />}
        description={`${t('analytics.for')} ${formatDateUtils.getMonthLabel(selectedMonth)}`}
        trend={monthlyTrends.utilization}
      />
      <StatsCard
        title={t('analytics.netIncome')}
        value={formatCurrency(fleetData.net_income)}
        icon={<RevenueIcon />}
        description={`${t('analytics.for')} ${formatDateUtils.getMonthLabel(selectedMonth)}`}
        trend={monthlyTrends.net_income}
        positive={fleetData.net_income >= 0}
      />
      <StatsCard
        title={t('dashboard.totalCars')}
        value={cars ? cars.length : 0}
        icon={<CarIcon />}
      />
    </div>
  );
};

export default FleetStats;


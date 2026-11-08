import React from 'react';
import Select from 'react-select';
import {
  LineChart,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Line,
  Bar,
  ResponsiveContainer,
} from 'recharts';
import { formatPrice } from '../../utils/currencySymbols';
import ChartCard from './components/ChartCard';
import StatItem from './components/StatItem';

const CarAnalyticsSection = ({
  cars,
  selectedCar,
  setSelectedCar,
  carData,
  t,
  isRTL,
  companyCurrency,
}) => {
  // Format currency using the new utility
  const formatCurrency = value => {
    return formatPrice(value || 0, companyCurrency || '');
  };
  // Extract currency symbol from formatCurrency function
  const getCurrencySymbol = value => {
    const formatted = formatCurrency(value);
    const match = formatted.match(/^([^\d\s]+)/);
    return match ? match[1] : '';
  };

  // Get currency code from formatCurrency function
  const getCurrencyCode = value => {
    const formatted = formatCurrency(value);
    const match = formatted.match(/\s([A-Z]{3})$/);
    return match ? match[1] : '';
  };

  // Format currency for Y-axis (symbol + value only)
  const formatYAxisCurrency = value => {
    const formatted = formatCurrency(value).replace('.00', '');
    // Remove currency code (like RM, USD, EUR) from anywhere in the string
    return formatted.replace(/[A-Z]{2,3}/g, '').trim();
  };

  const currencyCode = carData.length > 0 ? getCurrencyCode(carData[0].gross_revenue || 0) : '';

  // Defensive programming: ensure cars is always an array
  const safeCars = Array.isArray(cars) ? cars : [];

  const netIncomeSummary = carData.length
    ? carData.reduce(
        (acc, item) => {
          const netIncome = item.net_income || 0;
          acc.total += netIncome;
          if (!acc.best || netIncome > acc.best.net_income) acc.best = item;
          if (!acc.worst || netIncome < acc.worst.net_income) acc.worst = item;
          if (netIncome > 0) acc.positiveCount += 1;
          return acc;
        },
        { total: 0, best: null, worst: null, positiveCount: 0 }
      )
    : null;
  const avgNetIncome = netIncomeSummary ? netIncomeSummary.total / carData.length : 0;

  return (
    <div className="mb-8">
      <div className={`flex justify-between items-center mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h2
          className={`text-xl font-bold text-white flex-shrink-0 ${isRTL ? 'text-right' : 'text-left'}`}
        >
          {t('analytics.vehiclePerformance')}
        </h2>

        <div className="w-full md:w-96 relative">
          <Select
            options={safeCars.map(car => ({
              value: car.encrypted_car_id,
              label: `${car.make} ${car.model} (${car.year}) - ${car.license_plate}`,
            }))}
            value={safeCars
              .map(car => ({
                value: car.encrypted_car_id,
                label: `${car.make} ${car.model} (${car.year}) - ${car.license_plate}`,
              }))
              .find(option => option.value === selectedCar)}
            onChange={selectedOption => setSelectedCar(selectedOption?.value || '')}
            placeholder={t('analytics.selectVehicle')}
            noOptionsMessage={() => t('analytics.noOptions')}
            isSearchable
            isRtl={isRTL}
            menuPortalTarget={document.body}
            menuPosition="fixed"
            styles={{
              control: base => ({
                ...base,
                backgroundColor: '#1f2937',
                borderColor: '#374151',
                color: 'white',
                textAlign: isRTL ? 'right' : 'left',
              }),
              singleValue: base => ({
                ...base,
                color: 'white',
                textAlign: isRTL ? 'right' : 'left',
              }),
              input: base => ({
                ...base,
                color: 'white',
                textAlign: isRTL ? 'right' : 'left',
              }),
              menu: base => ({
                ...base,
                backgroundColor: '#1f2937',
                color: 'white',
                textAlign: isRTL ? 'right' : 'left',
              }),
              menuPortal: base => ({
                ...base,
                zIndex: 9999,
              }),
              option: (base, { isFocused }) => ({
                ...base,
                backgroundColor: isFocused ? '#2563eb' : '#1f2937',
                color: 'white',
                textAlign: isRTL ? 'right' : 'left',
              }),
            }}
          />
        </div>
      </div>

      {!selectedCar ? (
        <div className="bg-gradient-to-r from-gray-900 to-black rounded-lg p-8 text-center shadow-lg border border-gray-700/50">
          <p className={`text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('analytics.selectVehicleToView')}
          </p>
        </div>
      ) : carData.length === 0 ? (
        <div className="bg-gradient-to-r from-gray-900 to-black rounded-lg p-8 text-center shadow-lg border border-gray-700/50">
          <p className={`text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('analytics.noDataForVehicle')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" dir="ltr">
          {/* Vehicle Utilization Chart */}
          <ChartCard title={t('analytics.vehicleUtilization')} isRTL={isRTL}>
            <div dir="ltr">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={carData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                  <YAxis
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', dx: -5 }}
                    domain={[0, 100]}
                    tickFormatter={value => `${value}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      borderColor: '#374151',
                      borderRadius: '0.5rem',
                    }}
                    labelStyle={{ color: '#F9FAFB' }}
                    formatter={value => [`${value}%`, t('analytics.utilization')]}
                  />
                  <Legend wrapperStyle={{ color: '#9CA3AF' }} />
                  <Line
                    type="monotone"
                    dataKey="utilization_rate"
                    name={t('analytics.utilization')}
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', r: 4 }}
                    activeDot={{ r: 6, stroke: '#2563EB', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Vehicle Revenue and Costs */}
          <ChartCard title={t('analytics.revenueVsMaintenanceCosts')} isRTL={isRTL}>
            <div dir="ltr">
              {/* Currency Legend */}
              {currencyCode && (
                <div className="mb-2 flex justify-end">
                  <span className="text-xs text-gray-400 bg-gray-700/30 px-2 py-1 rounded">
                    {t('analytics.currency', { currency: currencyCode }) ||
                      `Currency: ${currencyCode}`}
                  </span>
                </div>
              )}
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={carData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                  <YAxis
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', dx: -5 }}
                    tickFormatter={formatYAxisCurrency}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      borderColor: '#374151',
                      borderRadius: '0.5rem',
                    }}
                    labelStyle={{ color: '#F9FAFB' }}
                    formatter={value => [formatCurrency(value), '']}
                  />
                  <Legend wrapperStyle={{ color: '#9CA3AF' }} />
                  <Line
                    type="monotone"
                    dataKey="gross_revenue"
                    name={t('analytics.revenue')}
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ fill: '#10B981', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="maintenance_cost"
                    name={t('analytics.costs')}
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={{ fill: '#EF4444', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="net_income"
                    name={t('analytics.netIncome')}
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={{ fill: '#F59E0B', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Vehicle Monthly Performance Summary */}
          <ChartCard title={t('analytics.monthlyNetIncome')} isRTL={isRTL}>
            <div dir="ltr">
              {/* Currency Legend */}
              {currencyCode && (
                <div className="mb-2 flex justify-end">
                  <span className="text-xs text-gray-400 bg-gray-700/30 px-2 py-1 rounded">
                    {t('analytics.currency', { currency: currencyCode }) ||
                      `Currency: ${currencyCode}`}
                  </span>
                </div>
              )}
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={carData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                  <YAxis
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', dx: -5 }}
                    tickFormatter={formatYAxisCurrency}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      borderColor: '#374151',
                      borderRadius: '0.5rem',
                    }}
                    labelStyle={{ color: '#F9FAFB' }}
                    formatter={value => [formatCurrency(value), t('analytics.netIncome')]}
                  />
                  <Bar
                    dataKey="net_income"
                    name={t('analytics.netIncome')}
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {netIncomeSummary && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">
                    {t('analytics.bestPerformingMonth')}
                  </div>
                  <div className="text-white font-semibold">
                    {netIncomeSummary.best?.monthFull || netIncomeSummary.best?.month}
                  </div>
                  <div className="text-sm text-green-400">
                    {formatCurrency(netIncomeSummary.best?.net_income || 0)}
                  </div>
                </div>
                <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">
                    {t('analytics.worstPerformingMonth')}
                  </div>
                  <div className="text-white font-semibold">
                    {netIncomeSummary.worst?.monthFull || netIncomeSummary.worst?.month}
                  </div>
                  <div className="text-sm text-red-400">
                    {formatCurrency(netIncomeSummary.worst?.net_income || 0)}
                  </div>
                </div>
                <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">{t('analytics.avgNetIncome')}</div>
                  <div className="text-white font-semibold">{formatCurrency(avgNetIncome)}</div>
                </div>
                <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">{t('analytics.positiveMonths')}</div>
                  <div className="text-white font-semibold">
                    {netIncomeSummary.positiveCount}/{carData.length}
                  </div>
                </div>
              </div>
            )}
          </ChartCard>

          {/* Vehicle Stats Summary */}
          <div className="bg-gradient-to-br from-gray-900/70 to-black/70 rounded-lg shadow-lg border border-gray-700/50 p-6">
            <h3
              className={`text-lg font-semibold text-white mb-4 ${isRTL ? 'text-right' : 'text-left'}`}
            >
              {t('analytics.performanceSummary')}
            </h3>

            {carData.length > 0 && (
              <>
                {/* Calculate overall averages */}
                <div className="grid grid-cols-2 gap-4">
                  <StatItem
                    label={t('analytics.avgUtilization')}
                    value={`${Math.round(carData.reduce((sum, item) => sum + item.utilization_rate, 0) / carData.length)}%`}
                    isRTL={isRTL}
                  />
                  <StatItem
                    label={t('analytics.avgMonthlyRevenue')}
                    value={formatCurrency(
                      carData.reduce((sum, item) => sum + item.gross_revenue, 0) / carData.length
                    )}
                    isRTL={isRTL}
                  />
                  <StatItem
                    label={t('analytics.avgMaintenance')}
                    value={formatCurrency(
                      carData.reduce((sum, item) => sum + item.maintenance_cost, 0) / carData.length
                    )}
                    isRTL={isRTL}
                  />
                  <StatItem
                    label={t('analytics.avgNetIncome')}
                    value={formatCurrency(
                      carData.reduce((sum, item) => sum + item.net_income, 0) / carData.length
                    )}
                    isRTL={isRTL}
                  />
                </div>

                <div className="mt-6">
                  <h4
                    className={`text-md font-medium text-white mb-3 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t('analytics.monthlyNetIncome')}
                  </h4>
                  <div className="h-44 bg-gray-900/60 border border-gray-700/50 rounded-lg p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={carData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                        <YAxis
                          stroke="#9CA3AF"
                          tick={{ fill: '#9CA3AF', dx: -5 }}
                          tickFormatter={formatYAxisCurrency}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1F2937',
                            borderColor: '#374151',
                            borderRadius: '0.5rem',
                          }}
                          labelStyle={{ color: '#F9FAFB' }}
                          formatter={value => [formatCurrency(value), t('analytics.netIncome')]}
                        />
                        <Bar
                          dataKey="net_income"
                          name={t('analytics.netIncome')}
                          fill="#3B82F6"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-700/60">
                  <h4
                    className={`text-md font-medium text-white mb-3 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t('analytics.bestPerformingMonth')}
                  </h4>
                  {(() => {
                    const bestMonth = [...carData].sort((a, b) => b.net_income - a.net_income)[0];
                    return (
                      <div className="bg-gradient-to-br from-gray-900/70 to-black/70 border border-gray-700/50 rounded-lg p-4">
                        <div
                          className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <span
                            className={`text-blue-300 font-medium ${isRTL ? 'text-right' : 'text-left'}`}
                          >
                            {bestMonth.monthFull}
                          </span>
                          <span className="text-green-400 font-bold">
                            {formatCurrency(bestMonth.net_income)}
                          </span>
                        </div>
                        <div
                          className={`mt-2 text-sm text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`}
                        >
                          {t('analytics.utilization')}: {Math.round(bestMonth.utilization_rate)}% |
                          {t('analytics.revenue')}: {formatCurrency(bestMonth.gross_revenue)} |
                          {t('analytics.costs')}: {formatCurrency(bestMonth.maintenance_cost)}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CarAnalyticsSection;


import React from 'react';
import { Link } from 'react-router-dom';
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
import CustomLegend from './components/CustomLegend';
import TimeFrameButton from './components/TimeFrameButton';

const HistoricalCharts = ({
  historicalData,
  timeFrame,
  handleTimeFrameChange,
  cars,
  t,
  isRTL,
  companyCurrency,
}) => {
  // Format currency using the new utility
  const formatCurrency = value => {
    return formatPrice(value || 0, companyCurrency || '');
  };
  return (
    <div className="mb-8">
      <div className={`flex justify-between items-center mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h2 className={`text-xl font-bold text-white ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('analytics.historicalPerformance')}
        </h2>
        <div className="flex gap-3">
          <TimeFrameButton
            label={t('analytics.threeMonths')}
            active={timeFrame === '3months'}
            onClick={() => handleTimeFrameChange('3months')}
          />
          <TimeFrameButton
            label={t('analytics.sixMonths')}
            active={timeFrame === '6months'}
            onClick={() => handleTimeFrameChange('6months')}
          />
          <TimeFrameButton
            label={t('analytics.oneYear')}
            active={timeFrame === '1year'}
            onClick={() => handleTimeFrameChange('1year')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8">
        {/* Fleet Utilization Chart - Only show if user has cars */}
        {cars.length > 0 ? (
          <>
            <ChartCard title={t('analytics.fleetUtilizationOverTime')} isRTL={isRTL}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={historicalData}
                  margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                  <YAxis
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', dx: -40 }}
                    domain={[0, 100]}
                    tickFormatter={value => `${value}%`}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      borderColor: '#374151',
                      borderRadius: '0.5rem',
                    }}
                    labelStyle={{ color: '#F9FAFB' }}
                    itemStyle={{ color: '#3B82F6' }}
                    formatter={value => [`${value}%`, t('analytics.utilization')]}
                  />
                  <Legend wrapperStyle={{ color: '#9CA3AF' }} />
                  <Line
                    type="monotone"
                    dataKey="utilization"
                    name={t('analytics.utilization')}
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', r: 4 }}
                    activeDot={{ r: 6, stroke: '#2563EB', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Fleet Revenue & Costs Chart */}
            <ChartCard title={t('analytics.revenueVsMaintenanceCosts')} isRTL={isRTL}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={historicalData}
                  margin={{ top: 20, right: 30, left: 130, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                  <YAxis
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', dx: -70 }}
                    tickFormatter={value => {
                      const formatted = formatCurrency(value);
                      return formatted.length > 8 ? formatted.replace('.00', '') : formatted;
                    }}
                    width={100}
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
                  <Bar
                    dataKey="net_income"
                    name={t('analytics.netIncome')}
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="maintenance_costs"
                    name={t('analytics.costs')}
                    fill="#EF4444"
                    radius={[4, 4, 0, 0]}
                  />
                  <Legend content={<CustomLegend />} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </>
        ) : (
          /* No vehicles message */
          <div className="bg-gradient-to-r from-gray-900 to-black rounded-lg p-12 text-center shadow-lg border border-gray-700/50">
            <div className="mb-4">
              <svg
                className="mx-auto h-16 w-16 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <h3
              className={`text-xl font-semibold text-white mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
            >
              {t('dashboard.noCarsAvailable')}
            </h3>
            <p className={`text-gray-400 mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('analytics.noVehiclesForAnalytics')}
            </p>
            <Link
              to="/cars/add"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              {t('dashboard.registerFirstVehicle')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoricalCharts;


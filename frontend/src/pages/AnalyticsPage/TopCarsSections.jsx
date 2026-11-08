import React, { useMemo } from 'react';
import TopCarsCard from './components/TopCarsCard';
import TopCarsListItem from './components/TopCarsListItem';

// Utility function for sorting cars by metric (extracted from RefAnalyticsPage)
const analyticsUtils = {
  sortCarsByMetric(cars, metric) {
    const sortedCars = [...cars];
    switch (metric) {
      case 'highest_earning':
        return sortedCars.sort(
          (a, b) => (b.analytics.net_income || 0) - (a.analytics.net_income || 0)
        );
      case 'lowest_earning':
        return sortedCars.sort(
          (a, b) => (a.analytics.net_income || 0) - (b.analytics.net_income || 0)
        );
      case 'highest_utility':
        return sortedCars.sort((a, b) => (b.utilization_rate || 0) - (a.utilization_rate || 0));
      case 'lowest_utility':
        return sortedCars.sort((a, b) => (a.utilization_rate || 0) - (b.utilization_rate || 0));
      case 'highest_maintenance':
        return sortedCars.sort(
          (a, b) => (b.analytics.total_maintenance || 0) - (a.analytics.total_maintenance || 0)
        );
      case 'lowest_maintenance':
        return sortedCars.sort(
          (a, b) => (a.analytics.total_maintenance || 0) - (b.analytics.total_maintenance || 0)
        );
      default:
        return sortedCars.sort(
          (a, b) => (b.analytics.net_income || 0) - (a.analytics.net_income || 0)
        );
    }
  },
};

const TopCarsSection = ({
  allCarsAnalytics,
  topCarsMetric,
  setTopCarsMetric,
  showAllCars,
  setShowAllCars,
  searchQuery,
  setSearchQuery,
  t,
  isRTL,
  companyCurrency,
  loading = false,
}) => {
  // Memoized sorted cars based on current metric
  const sortedCars = useMemo(() => {
    return analyticsUtils.sortCarsByMetric(allCarsAnalytics, topCarsMetric);
  }, [allCarsAnalytics, topCarsMetric]);

  // Memoized top cars (first 5)
  const topCars = useMemo(() => {
    return sortedCars.slice(0, 5);
  }, [sortedCars]);

  // Memoized filtered cars for search
  const filteredCars = useMemo(() => {
    if (!searchQuery) return sortedCars;
    return sortedCars.filter(car =>
      `${car.make} ${car.model} ${car.license_plate}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
  }, [sortedCars, searchQuery]);

  return (
    <div className="mb-8">
      <div className={`flex justify-between items-center mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h2
          className={`text-xl font-bold text-white flex-shrink-0 ${isRTL ? 'text-right' : 'text-left'}`}
        >
          {t('analytics.carsPerformance')}
        </h2>
        <div className={`flex items-center gap-4 flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <select
            value={topCarsMetric}
            onChange={e => setTopCarsMetric(e.target.value)}
            className={`bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
            dir={isRTL ? 'rtl' : 'ltr'}
            style={isRTL ? { textAlign: 'right', paddingRight: '12px' } : {}}
          >
            <option value="highest_earning" style={isRTL ? { textAlign: 'right' } : {}}>
              {t('analytics.highestEarning')}
            </option>
            <option value="lowest_earning" style={isRTL ? { textAlign: 'right' } : {}}>
              {t('analytics.lowestEarning')}
            </option>
            <option value="highest_utility" style={isRTL ? { textAlign: 'right' } : {}}>
              {t('analytics.highestUtility')}
            </option>
            <option value="lowest_utility" style={isRTL ? { textAlign: 'right' } : {}}>
              {t('analytics.lowestUtility')}
            </option>
            <option value="highest_maintenance" style={isRTL ? { textAlign: 'right' } : {}}>
              {t('analytics.highestMaintenance')}
            </option>
            <option value="lowest_maintenance" style={isRTL ? { textAlign: 'right' } : {}}>
              {t('analytics.lowestMaintenance')}
            </option>
          </select>

          <button
            onClick={() => setShowAllCars(!showAllCars)}
            className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
              showAllCars
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-900 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {showAllCars ? t('analytics.back') : t('analytics.showAllCars')}
          </button>
        </div>
      </div>

      {/* Search bar for all cars view */}
      {showAllCars && (
        <div className="mb-4">
          <input
            type="text"
            placeholder={t('analytics.searchCars')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={`w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : allCarsAnalytics.length === 0 ? (
        <div className="bg-gradient-to-r from-gray-900 to-black rounded-lg p-8 text-center shadow-lg border border-gray-700/50">
          <p className={`text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('analytics.noDataAvailable')}
          </p>
        </div>
      ) : (
        <div className={showAllCars ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-5 gap-6'}>
          {showAllCars ? (
            // All cars view - scrollable list
            <div className="bg-gradient-to-r from-gray-900 to-black rounded-lg shadow-lg border border-gray-700/50 max-h-96 overflow-y-auto">
              <div className="p-4 border-b border-gray-700/50">
                <h3
                  className={`text-lg font-semibold text-white ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  {t('analytics.allCarsRanking')} ({filteredCars.length})
                </h3>
              </div>
              <div className="space-y-2 p-4">
                {filteredCars.map((car, index) => (
                  <TopCarsListItem
                    key={car.encrypted_car_id}
                    car={car}
                    metric={topCarsMetric}
                    index={index}
                    companyCurrency={companyCurrency || ''}
                    t={t}
                    isRTL={isRTL}
                  />
                ))}
              </div>
            </div>
          ) : (
            // Top 5 cards view
            topCars.map((car, index) => (
              <TopCarsCard
                key={car.encrypted_car_id}
                car={car}
                metric={topCarsMetric}
                index={index}
                companyCurrency={companyCurrency || ''}
                t={t}
                isRTL={isRTL}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TopCarsSection;



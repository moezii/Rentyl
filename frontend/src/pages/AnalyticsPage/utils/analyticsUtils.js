import secureApi from '../../../utils/secureApi';

// Example: Sorting helper
export function sortCarsByMetric(cars, metric, order = 'desc') {
  return [...cars].sort((a, b) =>
    order === 'asc' ? a[metric] - b[metric] : b[metric] - a[metric]
  );
}

// Date utility functions
const formatDateUtils = {
  getLastMonths(count = 12) {
    const months = [];
    const today = new Date();
    for (let i = 0; i < count; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
      const monthLabel = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      months.push({ value: monthString, label: monthLabel });
    }
    return months;
  },

};

// Process car analytics data
export function processCarAnalytics(monthlyData) {
  if (!Array.isArray(monthlyData) || monthlyData.length === 0) {
    return {
      total_revenue: 0,
      total_maintenance: 0,
      net_income: 0,
      utilization_rate: 0,
    };
  }

  const total_revenue = monthlyData.reduce((sum, item) => sum + (item.gross_revenue || 0), 0);
  const total_maintenance = monthlyData.reduce(
    (sum, item) => sum + (item.maintenance_cost || 0),
    0
  );
  const net_income = total_revenue - total_maintenance;
  const utilization_rate =
    monthlyData.reduce((sum, item) => sum + (item.utilization_rate || 0), 0) / monthlyData.length;

  return {
    total_revenue,
    total_maintenance,
    net_income,
    utilization_rate,
  };
}

// API functions with aggressive caching
export async function getFleetStats(selectedMonth) {
  try {
    // Check sessionStorage for immediate cache
    const cacheKey = `fleet-stats-${selectedMonth}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 2 * 60 * 1000) {
        // 2 minutes cache
        return parsed.data;
      }
    }

    const response = await secureApi.get('/analytics/fleet', {
      params: { month: selectedMonth },
    });

    const data = {
      utilization: response.data.utilization || 0,
      net_income: response.data.net_income || 0,
      maintenance_costs: response.data.maintenance_costs || 0,
    };

    // Cache the result
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );

    return data;
  } catch (error) {
    console.error('Error fetching fleet stats:', error);
    return {
      utilization: 0,
      net_income: 0,
      maintenance_costs: 0,
    };
  }
}

export async function getTopCarsData() {
  try {
    // Check cache first
    const cacheKey = 'top-cars-data';
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 3 * 60 * 1000) {
        // 3 minutes cache
        return parsed.data;
      }
    }

    const allCars = await secureApi.get('/cars/');

    // Limit to first 6 cars for much better performance (reduced from 8)
    const carsToProcess = allCars.data.slice(0, 6);

    // Process cars in smaller batches with longer delays
    const batchSize = 2; // Reduced batch size
    const carsWithAnalytics = [];

    for (let i = 0; i < carsToProcess.length; i += batchSize) {
      const batch = carsToProcess.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(async car => {
          try {
            const analyticsRes = await secureApi.get(`/analytics/car/${car.encrypted_car_id}`, {
              params: { view_type: 'monthly' },
            });

            const monthlyData = analyticsRes.data || [];
            const analytics = processCarAnalytics(monthlyData);

            return {
              ...car,
              analytics: {
                total_revenue: analytics.total_revenue,
                total_maintenance: analytics.total_maintenance,
                net_income: analytics.net_income,
              },
              utilization_rate: analytics.utilization_rate,
            };
          } catch (err) {
            console.error(`Error fetching analytics for car ${car.encrypted_car_id}:`, err);
            return {
              ...car,
              analytics: {
                total_revenue: 0,
                total_maintenance: 0,
                net_income: 0,
              },
              utilization_rate: 0,
            };
          }
        })
      );

      // Add successful results to the array
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          carsWithAnalytics.push(result.value);
        }
      });

      // Longer delay between batches to be very nice to the server
      if (i + batchSize < carsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 200)); // Increased delay
      }
    }

    // Cache the results
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        data: carsWithAnalytics,
        timestamp: Date.now(),
      })
    );

    return carsWithAnalytics;
  } catch (error) {
    console.error('Error fetching top cars data:', error);
    return [];
  }
}

export async function getFleetCharts(timeFrame) {
  try {
    // Check cache first
    const cacheKey = `fleet-charts-${timeFrame}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
        // 5 minutes cache
        console.log(`Using cached data for ${timeFrame}:`, parsed.data.length, 'months');
        return parsed.data;
      }
    }

    // Fetch the correct number of months based on timeFrame
    let monthsToFetch;
    if (timeFrame === '1year') {
      monthsToFetch = 12; // Full year
    } else if (timeFrame === '6months') {
      monthsToFetch = 6; // Full 6 months
    } else {
      monthsToFetch = 3; // Default 3 months
    }

    console.log(`Fetching ${monthsToFetch} months for timeframe: ${timeFrame}`);
    const months = formatDateUtils.getLastMonths(monthsToFetch);
    console.log(
      'Months to fetch:',
      months.map(m => m.label)
    );

    // Fetch data sequentially instead of parallel to avoid overwhelming the server
    const historicalData = [];

    for (const month of months) {
      try {
        const res = await secureApi.get('/analytics/fleet', {
          params: {
            month: month.value,
            _t: new Date().getTime(),
          },
        });

        historicalData.push({
          month: month.label,
          monthValue: month.value,
          utilization: res.data.utilization || 0,
          net_income: res.data.net_income || 0,
          maintenance_costs: res.data.maintenance_costs || 0,
        });

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching data for ${month.label}:`, error);
        historicalData.push({
          month: month.label,
          monthValue: month.value,
          utilization: 0,
          net_income: 0,
          maintenance_costs: 0,
        });
      }
    }

    historicalData.sort((a, b) => new Date(a.monthValue) - new Date(b.monthValue));
    console.log(
      `Fetched ${historicalData.length} months of data:`,
      historicalData.map(d => d.month)
    );

    // Cache the results
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        data: historicalData,
        timestamp: Date.now(),
      })
    );

    return historicalData;
  } catch (error) {
    console.error('Error fetching fleet charts:', error);
    return [];
  }
}

export async function getCarSummary(carId) {
  try {
    // Check cache first
    const cacheKey = `car-summary-${carId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 2 * 60 * 1000) {
        // 2 minutes cache
        return parsed.data;
      }
    }

    const response = await secureApi.get(`/analytics/car/${carId}`, {
      params: {
        view_type: 'monthly',
        _t: new Date().getTime(),
      },
    });

    if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
      return {
        data: [],
        utilization: [],
        revenue: [],
        maintenance: [],
      };
    }

    const sortedData = [...response.data].sort((a, b) => new Date(a.month) - new Date(b.month));

    const formattedData = sortedData.map(item => {
      let monthDate;
      try {
        monthDate = new Date(item.month);
        if (isNaN(monthDate.getTime())) {
          monthDate = new Date();
        }
      } catch (e) {
        monthDate = new Date();
      }

      return {
        month: monthDate.toLocaleString('default', { month: 'short', year: 'numeric' }),
        monthFull: monthDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
        net_income: item.net_income || 0,
        gross_revenue: item.gross_revenue || 0,
        maintenance_cost: item.maintenance_cost || 0,
        utilization_rate: item.utilization_rate || 0,
      };
    });

    const result = {
      data: formattedData,
      utilization: formattedData.map(item => ({ month: item.month, value: item.utilization_rate })),
      revenue: formattedData.map(item => ({ month: item.month, value: item.gross_revenue })),
      maintenance: formattedData.map(item => ({ month: item.month, value: item.maintenance_cost })),
    };

    // Cache the results
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        data: result,
        timestamp: Date.now(),
      })
    );

    return result;
  } catch (error) {
    console.error('Error fetching car summary:', error);
    return {
      data: [],
      utilization: [],
      revenue: [],
      maintenance: [],
    };
  }
}

export async function getCarHistory(carId) {
  // This function returns the same data as getCarSummary for now
  // In the original implementation, they were the same
  return await getCarSummary(carId);
}

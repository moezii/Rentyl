import { useEffect, useState, useRef, useCallback } from 'react';
import { getFleetStats, getTopCarsData, getFleetCharts } from '../utils/analyticsUtils';
import secureApi from '../../../utils/secureApi';

export default function useFleetAnalytics(selectedMonth, timeFrame) {
  const [fleetData, setFleetData] = useState({
    utilization: 0,
    net_income: 0,
    maintenance_costs: 0,
  });
  const [previousFleetData, setPreviousFleetData] = useState({
    utilization: 0,
    net_income: 0,
    maintenance_costs: 0,
  });
  const [monthlyTrends, setMonthlyTrends] = useState({
    utilization: 0,
    net_income: 0,
    maintenance_costs: 0,
  });
  const [historicalData, setHistoricalData] = useState([]);
  const [cars, setCars] = useState([]);
  const [allCarsAnalytics, setAllCarsAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Enhanced caching with localStorage
  const cacheRef = useRef({});
  const lastFetchRef = useRef({ selectedMonth: null, timeFrame: null });
  const debounceTimeoutRef = useRef(null);

  // Load cache from localStorage on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem('analytics-cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        cacheRef.current = parsed;
      }
    } catch (err) {
      console.warn('Failed to load analytics cache:', err);
    }
  }, []);

  // Save cache to localStorage
  const saveCache = useCallback((cacheKey, data) => {
    try {
      cacheRef.current[cacheKey] = {
        ...data,
        timestamp: Date.now(),
      };
      // Keep only last 10 cache entries to prevent localStorage bloat
      const keys = Object.keys(cacheRef.current);
      if (keys.length > 10) {
        const oldestKey = keys[0];
        delete cacheRef.current[oldestKey];
      }
      localStorage.setItem('analytics-cache', JSON.stringify(cacheRef.current));
    } catch (err) {
      console.warn('Failed to save analytics cache:', err);
    }
  }, []);

  // Check if cache is still valid (5 minutes)
  const isCacheValid = useCallback(timestamp => {
    return timestamp && Date.now() - timestamp < 5 * 60 * 1000;
  }, []);

  useEffect(() => {
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Reduced debounce time for faster response
    debounceTimeoutRef.current = setTimeout(async () => {
      async function fetchFleetAnalytics() {
        const cacheKey = `${selectedMonth}-${timeFrame}`;
        const cachedData = cacheRef.current[cacheKey];

        // Check if we have valid cached data
        if (
          cachedData &&
          isCacheValid(cachedData.timestamp) &&
          lastFetchRef.current.selectedMonth === selectedMonth &&
          lastFetchRef.current.timeFrame === timeFrame
        ) {
          setFleetData(cachedData.fleetData);
          setHistoricalData(cachedData.historicalData);
          setCars(cachedData.cars);
          setAllCarsAnalytics(cachedData.allCarsAnalytics);
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);

        try {
          // Fetch fleet stats and historical data in parallel
          const [stats, charts] = await Promise.all([
            getFleetStats(selectedMonth),
            getFleetCharts(timeFrame),
          ]);

          setFleetData(
            stats || {
              utilization: 0,
              net_income: 0,
              maintenance_costs: 0,
            }
          );
          setHistoricalData(charts || []);

          // Fetch cars data with caching
          try {
            const allCars = await secureApi.get('/cars/');
            setCars(allCars.data || []);

            // Only fetch car analytics if we have cars and cache is invalid
            let carsWithAnalytics = [];
            if (allCars.data && allCars.data.length > 0) {
              carsWithAnalytics = await getTopCarsData();
              setAllCarsAnalytics(carsWithAnalytics || []);
            } else {
              setAllCarsAnalytics([]);
            }

            // Cache the results
            saveCache(cacheKey, {
              fleetData: stats,
              historicalData: charts,
              cars: allCars.data || [],
              allCarsAnalytics: carsWithAnalytics || [],
            });
          } catch (carsError) {
            console.error('Error fetching cars:', carsError);
            setCars([]);
            setAllCarsAnalytics([]);

            // Cache the results even on error
            saveCache(cacheKey, {
              fleetData: stats,
              historicalData: charts,
              cars: [],
              allCarsAnalytics: [],
            });
          }

          // Set default values for missing data
          setPreviousFleetData({
            utilization: 0,
            net_income: 0,
            maintenance_costs: 0,
          });
          setMonthlyTrends({
            utilization: 0,
            net_income: 0,
            maintenance_costs: 0,
          });

          lastFetchRef.current = { selectedMonth, timeFrame };
        } catch (err) {
          setError(err.message);
          // Set default values on error
          setFleetData({
            utilization: 0,
            net_income: 0,
            maintenance_costs: 0,
          });
          setAllCarsAnalytics([]);
          setHistoricalData([]);
          setCars([]);
        } finally {
          setLoading(false);
        }
      }

      fetchFleetAnalytics();
    }, 150); // Reduced from 300ms to 150ms for faster response

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [selectedMonth, timeFrame, saveCache, isCacheValid]);

  return {
    fleetData,
    previousFleetData,
    monthlyTrends,
    historicalData,
    cars,
    allCarsAnalytics,
    loading,
    error,
  };
}

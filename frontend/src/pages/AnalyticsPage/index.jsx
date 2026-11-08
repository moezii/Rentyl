import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from './../../components/context/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import secureApi from '../../utils/secureApi';
import { getCurrencySymbol } from '../../utils/currencySymbols';
import FleetStats from './FleetStats';
import TopCarsSection from './TopCarsSections';
import CarAnalyticsSection from './CarAnalyticsSection';
import HistoricalCharts from './HistoricalCharts';
import useFleetAnalytics from './hooks/useFleetAnalytics';
import useCarAnalytics from './hooks/useCarAnalytics';

// Utility function for date formatting
const formatDateUtils = {
  getCurrentMonthString() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  },
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

const AnalyticsPage = () => {
  const { user, isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t, isRTL, language } = useLanguage();

  // Fetch/derive company currency (avoid auth/me dependency)
  const [companyCurrency, setCompanyCurrency] = useState('');

  const deriveCurrencyFromData = data => {
    if (!data) return null;
    if (Array.isArray(data)) {
      const found =
        data.find(d => d.currency)?.currency ||
        data.find(d => d.car?.currency)?.car?.currency ||
        data.find(d => d.company_currency)?.company_currency;
      return found || null;
    }
    return data.currency || data.company_currency || null;
  };

  const fetchCompanyCurrency = async companyId => {
    if (!companyId) return null;
    try {
      const companyResponse = await secureApi.get(`/companies/${companyId}`);
      if (companyResponse.data?.currency) {
        setCompanyCurrency(companyResponse.data.currency);
        return companyResponse.data.currency;
      }
    } catch (err) {
      console.warn('Failed to fetch company currency for analytics:', err);
    }
    return null;
  };

  // Global state management
  const [selectedMonth, setSelectedMonth] = useState(formatDateUtils.getCurrentMonthString());
  const [selectedCar, setSelectedCar] = useState('');
  const [topCarsMetric, setTopCarsMetric] = useState('highest_earning');
  const [showAllCars, setShowAllCars] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFrame, setTimeFrame] = useState('3months');
  const [downloadingStatement, setDownloadingStatement] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Set dark theme for the entire application
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.body.className = 'bg-gray-900 text-white';

    return () => {
      document.body.className = '';
    };
  }, []);

  // Custom hooks for data fetching
  const {
    fleetData,
    previousFleetData,
    monthlyTrends,
    historicalData,
    cars,
    allCarsAnalytics,
    loading: fleetLoading,
    error: fleetError,
  } = useFleetAnalytics(selectedMonth, timeFrame);

  const { carData, loading: carLoading, error: carError } = useCarAnalytics(selectedCar);

  // Derive currency from fetched analytics data when available
  useEffect(() => {
    if (companyCurrency) return;
    const fromFleet =
      deriveCurrencyFromData(fleetData) ||
      deriveCurrencyFromData(previousFleetData) ||
      deriveCurrencyFromData(monthlyTrends) ||
      deriveCurrencyFromData(historicalData);
    const fromCars = deriveCurrencyFromData(cars) || deriveCurrencyFromData(allCarsAnalytics);
    const derived = fromFleet || fromCars;
    if (derived) {
      setCompanyCurrency(derived);
    }
  }, [
    companyCurrency,
    fleetData,
    previousFleetData,
    monthlyTrends,
    historicalData,
    cars,
    allCarsAnalytics,
  ]);

  // If currency still missing, derive from car/company ids
  useEffect(() => {
    const hydrateFromCars = async () => {
      if (companyCurrency) return;
      const carCurrency =
        (Array.isArray(cars) && cars.find(c => c?.currency)?.currency) ||
        (Array.isArray(cars) && cars.find(c => c?.company_currency)?.company_currency) ||
        null;
      if (carCurrency) {
        setCompanyCurrency(carCurrency);
        return;
      }
      const analyticsCompanyId =
        (Array.isArray(cars) && cars.find(c => c?.company_id)?.company_id) ||
        (Array.isArray(allCarsAnalytics) &&
          allCarsAnalytics.find(a => a?.company_id)?.company_id) ||
        fleetData?.company_id;
      if (analyticsCompanyId) {
        await fetchCompanyCurrency(analyticsCompanyId);
      }
    };
    hydrateFromCars();
  }, [companyCurrency, cars, allCarsAnalytics, fleetData]);

  // Get company currency from AuthContext as additional fallback
  useEffect(() => {
    if (companyCurrency || !user) return;
    // Use company from AuthContext if available
    const authCompany = user?.company || null;
    if (authCompany?.currency) {
      setCompanyCurrency(authCompany.currency);
    }
  }, [companyCurrency, user]);

  // Handle month change
  const handleMonthChange = e => {
    setSelectedMonth(e.target.value);
  };

  // Handle time frame change
  const handleTimeFrameChange = newTimeFrame => {
    setTimeFrame(newTimeFrame);
  };

  // Handle download net income statement
  const handleDownloadNetIncomeStatement = async () => {
    try {
      setDownloadingStatement(true);
      setStatusMessage(t('analytics.downloadingStatement'));

      // Get current currency symbol
      const currentCurrency = getCurrencySymbol(companyCurrency);

      // Build query params
      const params = new URLSearchParams({
        month_start: selectedMonth,
        month_end: selectedMonth, // For now, single month only
        currency_symbol: currentCurrency,
        lang: language, // Add language parameter
      });

      const response = await secureApi.get(
        `/analytics/net-income-statement/download?${params.toString()}`,
        {
          responseType: 'blob',
        }
      );

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Extract filename from response header or create default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `net_income_statement_${selectedMonth}.pdf`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=(.+)/);
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setStatusMessage(t('analytics.statementDownloaded'));

      // Clear the message after 5 seconds
      setTimeout(() => {
        setStatusMessage('');
      }, 5000);
    } catch (error) {
      console.error('Error downloading net income statement:', error);
      setStatusMessage(t('common.error') + ': ' + (error.response?.data?.detail || error.message));

      // Clear error after 5 seconds
      setTimeout(() => {
        setStatusMessage('');
      }, 5000);
    } finally {
      setDownloadingStatement(false);
    }
  };

  // Loading state
  if (fleetLoading || carLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Error state
  if (fleetError || carError) {
    return (
      <div className="p-4 bg-red-900/50 text-red-200 rounded-lg m-4">{fleetError || carError}</div>
    );
  }

  return (
    <div className="p-6 w-full text-white min-h-screen" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header Section */}
      <div className="mb-8 bg-gradient-to-r from-gray-900 to-black rounded-xl p-6 text-white shadow-lg border border-gray-700/50">
        <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h1 className="text-3xl font-bold mb-2">{t('analytics.title')}</h1>
            <p className="opacity-90">{t('analytics.subtitle')}</p>
          </div>
          <div className={`flex gap-3 items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
            {/* Download Statement Button */}
            <button
              onClick={handleDownloadNetIncomeStatement}
              disabled={downloadingStatement}
              className={`bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              {downloadingStatement ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span className="text-sm">{t('analytics.downloadingStatement')}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="text-sm">{t('analytics.downloadStatement')}</span>
                </>
              )}
            </button>

            {/* Month Selector */}
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={handleMonthChange}
                className={`appearance-none bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'pl-8 pr-4 text-right' : 'pr-8 pl-4 text-left'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                {formatDateUtils.getLastMonths().map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <div
                className={`pointer-events-none absolute inset-y-0 flex items-center px-2 text-white ${isRTL ? 'left-0' : 'right-0'}`}
              >
                <svg
                  className="fill-current h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`mt-4 p-3 rounded-lg ${statusMessage.includes('Error') || statusMessage.includes('error') ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}
          >
            {statusMessage}
          </div>
        )}
      </div>

      {/* Key Performance Indicators with Trends */}
      <FleetStats
        fleetData={fleetData}
        monthlyTrends={monthlyTrends}
        selectedMonth={selectedMonth}
        cars={cars}
        t={t}
        isRTL={isRTL}
        companyCurrency={companyCurrency}
      />

      {/* Top Performing Cars */}
      <TopCarsSection
        allCarsAnalytics={allCarsAnalytics}
        topCarsMetric={topCarsMetric}
        setTopCarsMetric={setTopCarsMetric}
        showAllCars={showAllCars}
        setShowAllCars={setShowAllCars}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        t={t}
        isRTL={isRTL}
        companyCurrency={companyCurrency}
        loading={fleetLoading}
      />

      {/* Historical Data Section */}
      <HistoricalCharts
        historicalData={historicalData}
        timeFrame={timeFrame}
        handleTimeFrameChange={handleTimeFrameChange}
        cars={cars}
        t={t}
        isRTL={isRTL}
        companyCurrency={companyCurrency}
      />

      {/* Vehicle-Specific Analytics */}
      <CarAnalyticsSection
        cars={cars}
        selectedCar={selectedCar}
        setSelectedCar={setSelectedCar}
        carData={carData}
        t={t}
        isRTL={isRTL}
        companyCurrency={companyCurrency}
      />
    </div>
  );
};

export default AnalyticsPage;



// src/pages/Dashboard.jsx - Fixed version
import { useState, useEffect, useContext, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from './../components/context/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { formatPrice } from '../utils/currencySymbols';
import secureApi from './../utils/secureApi';
import DefaultCarImg from './../assets/DefaultCarImg.png';
import { MaintenanceIcon } from './AnalyticsPage/icons/AnalyticsIcon';
import {
  carNeedsAttention,
  needsOilChange,
  hasExpiringDocuments,
  getAttentionClassName,
  isDateWithinTwoWeeks,
} from '../utils/carUtils';
import MileageSelector from '../components/MileageSelector';

const Dashboard = () => {
  const { user, isAdmin } = useContext(AuthContext);
  const isUserAdmin = isAdmin();
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch company currency from database (no hardcoded fallback)
  const [companyCurrency, setCompanyCurrency] = useState('');
  const [stats, setStats] = useState({
    totalCars: 0,
    availableCars: 0,
    activeRentals: 0,
    totalRevenue: 0,
    totalRentals: 0,
    activeContracts: 0,
    fleetUtilization: 0,
    fleetNetIncome: 0,
    mainetenanceCosts: 0,
    popularCars: [],
    revenueByMonth: [],
    utilizationByType: {},
    upcomingReturns: [],
    maintenanceAlerts: [],
    revenueMetrics: {
      daily: 0,
      weekly: 0,
      monthly: 0,
      yearly: 0,
      growth: 0,
    },
    rentalMetrics: {
      averageDuration: 0,
      completionRate: 0,
      cancellationRate: 0,
    },
  });
  const [cars, setCars] = useState([]);
  // Use car currency as fallback if company currency hasn't loaded yet
  useEffect(() => {
    if (!companyCurrency && cars.length > 0) {
      const firstCurrency = cars.find(c => c.currency)?.currency;
      if (firstCurrency) setCompanyCurrency(firstCurrency);
    }
  }, [cars, companyCurrency]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(
    location.pathname.includes('/cars')
      ? 'vehicles'
      : location.pathname.includes('/clients')
        ? 'clients'
        : location.pathname.includes('/rentals')
          ? 'rentals'
          : location.pathname.includes('/users')
            ? 'users'
            : 'vehicles'
  );

  // Get company currency from AuthContext
  const { company } = useContext(AuthContext);

  // Update currency when company data is available
  useEffect(() => {
    if (company?.currency && !companyCurrency) {
      setCompanyCurrency(company.currency);
    }
  }, [company, companyCurrency]);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        // Fetch cars data
        const carsRes = await secureApi.get('/cars/');
        const carsList = (carsRes.data || []).map(car => ({
          ...car,
          encrypted_car_id: car.encrypted_car_id,
        }));

        // Get current date for analytics
        const today = new Date();

        // Check all cars for expiring documents and add flag if needed
        carsList.forEach(car => {
          // Check if car has expiring documents
          const hasDocExpiring = hasExpiringDocuments(car);
          // Check if car needs oil change
          const oilChangeNeeded = needsOilChange(car);
          // Set alert flags
          car.alertFlags = {
            hasDocAlert: hasDocExpiring,
            hasOilAlert: oilChangeNeeded,
            hasAnyAlert: hasDocExpiring || oilChangeNeeded,
          };

          // Also set the alert_expiry flag for backward compatibility
          car.alert_expiry = hasDocExpiring;

          // Specifically mark SAND and Haval cars for alerts
          if (car.make === 'SAND' || (car.make === 'Haval' && car.model === 'H6')) {
            car.alert_expiry = true;
            car.alertFlags.hasDocAlert = true;
            car.alertFlags.hasAnyAlert = true;
          }
        });

        // Detailed logging for fetched car data in Dashboard
        // if (carsList.length > 0) {
        //   console.log('--- Dashboard: Fetched carsList (first 3) ---');
        //   carsList.slice(0, 3).forEach((c, index) => {
        //     console.log(`Car ${index + 1} ID: ${c.encrypted_car_id}`);
        //     console.log(`  Make: ${c.make}, Model: ${c.model}`);
        //     console.log(`  Registration Expiry: ${c.registration_expiry_date}`);
        //     console.log(`  Insurance Expiry: ${c.insurance_expiry_date}`);
        //     console.log(`  alert_expiry flag: ${c.alert_expiry ? 'YES' : 'no'}`);
        //     // Log the result of hasExpiringDocuments for immediate feedback
        //     console.log(`  hasExpiringDocuments: ${hasExpiringDocuments(c)}`);
        //   });
        // } else {
        //   console.log('--- Dashboard: Fetched carsList is empty ---');
        // }

        setCars(carsList);
        // If company currency is still empty, try to derive/fetch it from cars
        if (!companyCurrency) {
          const derivedCurrency = carsList.find(c => c.currency)?.currency;
          if (derivedCurrency) {
            setCompanyCurrency(derivedCurrency);
          } else if (carsList.length > 0 && carsList[0].company_id) {
            try {
              const fallbackCompany = await secureApi.get(`/companies/${carsList[0].company_id}`);
              if (fallbackCompany.data?.currency) {
                setCompanyCurrency(fallbackCompany.data.currency);
              }
            } catch (fallbackErr) {
              // console.warn('Could not fetch company currency from cars fallback:', fallbackErr);
            }
          }
        }

        // Fetch rentals data - ALWAYS ensure it's an array
        let rentalsList = [];
        try {
          const rentalsRes = await secureApi.get('/rentals/');
          rentalsList = Array.isArray(rentalsRes.data) ? rentalsRes.data : [];
        } catch (err) {
          // console.log('Could not fetch rentals, using empty array');
          rentalsList = []; // Explicitly set to empty array
        }

        // Count active contract_status - rentalsList is guaranteed to be an array
        const activeContracts = rentalsList.filter(
          rental => rental.contract_status === 'active'
        ).length;

        // Format the date string for the API call - current month's first day
        const currentMonthFirstDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

        // Default fleet utilization and net income in case API fails
        let fleetUtilization = 0;
        let fleetNetIncome = 0;
        let maintenanceCosts = 0;

        try {
          // console.log(`Fetching fleet analytics for month: ${currentMonthFirstDay}`);
          const fleetRes = await secureApi.get('/analytics/fleet', {
            params: { month: currentMonthFirstDay },
          });

          // Log the response for debugging
          // console.log('Fleet analytics response:', fleetRes.data);

          // Check if we got data back
          if (fleetRes.data && typeof fleetRes.data.utilization !== 'undefined') {
            fleetUtilization = fleetRes.data.utilization;
            fleetNetIncome = fleetRes.data.net_income || 0; // Ensure this has a default
            maintenanceCosts = fleetRes.data.maintenance_costs || 0; // Ensure this has a default
            // console.log(`Utilization value from API: ${fleetUtilization}%`);
          } else {
            // console.warn('Fleet analytics response missing utilization data');
          }
        } catch (fleetErr) {
          // console.error('Error fetching fleet analytics:', fleetErr);
          // Continue with default values
        }

        // Calculate basic stats
        const totalCars = carsList.length;
        const availableCars = carsList.filter(car => car.status === 'available').length;
        const activeRentals = rentalsList.filter(r => r.status === 'active').length;

        // Calculate revenue metrics
        const now = new Date();
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
        const recentRentals = rentalsList.filter(r => new Date(r.start_date) >= thirtyDaysAgo);

        const revenueMetrics = {
          daily: recentRentals.reduce((sum, r) => sum + (r.total_cost || 0), 0) / 30,
          weekly: recentRentals.reduce((sum, r) => sum + (r.total_cost || 0), 0) / 4,
          monthly: recentRentals.reduce((sum, r) => sum + (r.total_cost || 0), 0),
          yearly: recentRentals.reduce((sum, r) => sum + (r.total_cost || 0), 0) * 12,
          growth: calculateGrowthRate(rentalsList),
        };

        // Calculate rental metrics
        const rentalMetrics = {
          averageDuration: calculateAverageDuration(rentalsList),
          completionRate: calculateCompletionRate(rentalsList),
          cancellationRate: calculateCancellationRate(rentalsList),
        };

        // Calculate utilization by car type
        const utilizationByType = calculateUtilizationByType(carsList, rentalsList);

        // Get upcoming returns
        const upcomingReturns = getUpcomingReturns(rentalsList);

        // Get maintenance alerts
        const maintenanceAlerts = await getMaintenanceAlerts(carsList);

        // Set stats
        setStats({
          totalCars,
          availableCars,
          activeRentals,
          totalRevenue: revenueMetrics.yearly,
          totalRentals: rentalsList.length,
          activeContracts,
          fleetUtilization, // Use the value from API or fallback
          fleetNetIncome, // Use the value from API or fallback
          maintenanceCosts,
          popularCars: getPopularCars(carsList, rentalsList),
          revenueByMonth: getRevenueByMonth(rentalsList),
          utilizationByType,
          upcomingReturns,
          maintenanceAlerts,
          revenueMetrics,
          rentalMetrics,
        });

        // Clear any previous error
        setError(null);
      } catch (err) {
        // console.error('Error fetching dashboard data:', err);
        setError(err.response?.data?.detail || t('common.failedToLoadDashboardData'));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [isUserAdmin]); // Use the boolean value, not the function

  // Handle navigation to different sections
  const handleNavigate = path => {
    navigate(path);
  };

  // Helper functions for calculations
  const calculateGrowthRate = rentals => {
    if (rentals.length < 2) return 0;
    const recent = rentals.filter(
      r => new Date(r.start_date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    const previous = rentals.filter(
      r =>
        new Date(r.start_date) >= new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) &&
        new Date(r.start_date) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    if (previous.length === 0) return 100;
    return ((recent.length - previous.length) / previous.length) * 100;
  };

  const calculateAverageDuration = rentals => {
    if (rentals.length === 0) return 0;
    const durations = rentals.map(r => {
      const start = new Date(r.start_date);
      const end = new Date(r.end_date);
      return (end - start) / (1000 * 60 * 60 * 24);
    });
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  };

  const calculateCompletionRate = rentals => {
    if (rentals.length === 0) return 0;
    const completed = rentals.filter(r => r.status === 'completed').length;
    return (completed / rentals.length) * 100;
  };

  const calculateCancellationRate = rentals => {
    if (rentals.length === 0) return 0;
    const cancelled = rentals.filter(r => r.status === 'cancelled').length;
    return (cancelled / rentals.length) * 100;
  };

  const calculateUtilizationByType = (cars, rentals) => {
    const utilization = {};
    cars.forEach(car => {
      const type = car.type || 'unknown';
      if (!utilization[type]) {
        utilization[type] = {
          total: 0,
          rented: 0,
        };
      }
      utilization[type].total++;
      if (car.status === 'rented') {
        utilization[type].rented++;
      }
    });
    return utilization;
  };

  const getUpcomingReturns = rentals => {
    const now = new Date();
    const nextWeek = new Date(now.setDate(now.getDate() + 7));
    return rentals
      .filter(r => r.status === 'active' && new Date(r.end_date) <= nextWeek)
      .sort((a, b) => new Date(a.end_date) - new Date(b.end_date));
  };

  const getMaintenanceAlerts = async currentCars => {
    try {
      // Fetch maintenance records from API
      const response = await secureApi.get('/maintenance/');
      let alerts = [];

      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        // Filter only records that are not completed (pending or in_progress)
        alerts = response.data.data.filter(record => record.status !== 'completed');
      }

      // console.log('Checking cars for oil change alerts...');

      // Add oil change alerts for cars that need oil changes
      const oilChangeAlerts = currentCars
        .filter(car => {
          const oilChangeNeeded = needsOilChange(car);
          // console.log(
          //   `Car ${car.make} ${car.model} (${car.encrypted_car_id}) needs oil change: ${oilChangeNeeded}`
          // );
          // console.log(
          //   `Current mileage: ${car.current_mileage}, last oil change: ${car.last_oil_change_mileage || 'N/A'}`
          // );
          return oilChangeNeeded;
        })
        .map(car => ({
          maintenance_id: `oil_${car.encrypted_car_id}`,
          encrypted_maintenance_id: `oil_${car.encrypted_car_id}`,
          car: car,
          description: 'Oil Change Required',
          service_type: 'oil_change',
          status: 'pending',
          isOilChange: true,
        }));

      // console.log(`Found ${oilChangeAlerts.length} cars needing oil changes`);

      // Add document expiry alerts for cars with expiring documents
      const documentExpiryAlerts = currentCars
        .filter(car => hasExpiringDocuments(car))
        .map(car => {
          // Determine which document is expiring
          const isRegistrationExpiring = isDateWithinTwoWeeks(car.registration_expiry_date);
          const isInsuranceExpiring = isDateWithinTwoWeeks(car.insurance_expiry_date);

          let description = '';
          if (isRegistrationExpiring && isInsuranceExpiring) {
            description = 'Registration & Insurance Expiring Soon';
          } else if (isRegistrationExpiring) {
            description = 'Registration Expiring Soon';
          } else {
            description = 'Insurance Expiring Soon';
          }

          return {
            maintenance_id: `doc_${car.encrypted_car_id}`,
            encrypted_maintenance_id: `doc_${car.encrypted_car_id}`,
            car: car,
            description: description,
            service_type: 'document_renewal',
            status: 'pending',
            isDocExpiry: true,
          };
        });

      const allAlerts = [...alerts, ...oilChangeAlerts, ...documentExpiryAlerts];
      // console.log(`Returning ${allAlerts.length} total alerts`);
      return allAlerts;
    } catch (err) {
      // console.error('Error fetching maintenance records:', err);
      return [];
    }
  };

  const getRevenueByMonth = rentals => {
    const months = {};
    rentals.forEach(rental => {
      const month = new Date(rental.start_date).toLocaleString('default', { month: 'long' });
      if (!months[month]) months[month] = 0;
      months[month] += rental.total_cost || 0;
    });
    return Object.entries(months).map(([month, revenue]) => ({ month, revenue }));
  };

  const getPopularCars = (cars, rentals) => {
    const carRentalCounts = {};
    rentals.forEach(rental => {
      const carId = rental.encrypted_car_id;
      carRentalCounts[carId] = (carRentalCounts[carId] || 0) + 1;
    });

    return Object.entries(carRentalCounts)
      .map(([carId, count]) => {
        const car = cars.find(c => c.encrypted_car_id === carId);
        return car
          ? {
              car: {
                encrypted_car_id: car.encrypted_car_id,
                make: car.make,
                model: car.model,
                year: car.year,
                plateNumber: car.license_plate,
                rentalRate: { daily: car.daily_rate },
              },
              count,
              revenue: count * car.daily_rate * 30, // Estimated monthly revenue
            }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  if (error) return <div className="p-4 bg-red-900/50 text-red-200 rounded-lg m-4">{error}</div>;

  return (
    <div className="p-6 w-full text-white min-h-screen">
      {/* Welcome Section */}
      <div className="mb-8 bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 text-white shadow-2xl border border-gray-700/30 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
          {/* Welcome Text */}
          <div className={`space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {t('dashboard.welcome')}, {user?.name || user?.first_name}
              </h1>
              <p className="text-gray-300 text-sm">
                {isUserAdmin ? t('dashboard.fleetAdministrator') : t('dashboard.fleetAgent')}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          </div>

          {/* Controls - VERTICAL STACK FORCED */}
          <div className="w-full max-w-sm">
            {/* KM BUTTON - BLOCK LEVEL ON TOP */}
            <div className="w-full flex justify-end">
              <MileageSelector />
            </div>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title={t('dashboard.totalCars')}
          value={stats.totalCars}
          icon={<MaintenanceIcon />}
          change={t('dashboard.inYourFleet')}
        />
        <StatsCard
          title={t('dashboard.netIncome')}
          value={formatPrice(stats.fleetNetIncome, companyCurrency)}
          icon={<RevenueIcon />}
          change={t('dashboard.totalThisMonth')}
          positive={stats.fleetNetIncome >= 0}
        />
        <StatsCard
          title={t('dashboard.maintenanceCosts')}
          value={formatPrice(stats.maintenanceCosts, companyCurrency)}
          icon={<RevenueIcon />}
          change={t('dashboard.thisMonth')}
          positive={false}
        />
        <StatsCard
          title={t('dashboard.activeContracts')}
          value={stats.activeContracts}
          icon={<ContractIcon />}
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 text-white">{t('dashboard.quickActions')}</h2>
        <div className="bg-gradient-to-r from-gray-900 to-black rounded-lg p-2 shadow-lg border border-gray-700/50">
          <div className={`flex w-full gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {isRTL ? (
              [
                {
                  key: 'maintenance',
                  title: t('nav.maintenance'),
                  icon: <UtilizationIcon />,
                  onClick: () => handleNavigate('/maintenance'),
                  active: activeTab === 'maintenance',
                },
                {
                  key: 'rentals',
                  title: t('dashboard.rentalContracts'),
                  icon: <ContractIcon />,
                  onClick: () => handleNavigate('/rentals'),
                  active: activeTab === 'rentals',
                },
                {
                  key: 'clients',
                  title: t('dashboard.clientDatabase'),
                  icon: <ClientIcon />,
                  onClick: () => handleNavigate('/clients'),
                  active: activeTab === 'clients',
                },
                {
                  key: 'vehicles',
                  title: t('dashboard.vehicleInventory'),
                  icon: <DocumentIcon />,
                  onClick: () => handleNavigate('/cars'),
                  active: activeTab === 'vehicles',
                },
              ].map(tab => (
                <QuickActionTab
                  key={tab.key}
                  title={tab.title}
                  icon={tab.icon}
                  onClick={tab.onClick}
                  active={tab.active}
                />
              ))
            ) : (
              <>
                <QuickActionTab
                  title={t('dashboard.vehicleInventory')}
                  icon={<DocumentIcon />}
                  onClick={() => handleNavigate('/cars')}
                  active={activeTab === 'vehicles'}
                />
                <QuickActionTab
                  title={t('dashboard.clientDatabase')}
                  icon={<ClientIcon />}
                  onClick={() => handleNavigate('/clients')}
                  active={activeTab === 'clients'}
                />
                <QuickActionTab
                  title={t('dashboard.rentalContracts')}
                  icon={<ContractIcon />}
                  onClick={() => handleNavigate('/rentals')}
                  active={activeTab === 'rentals'}
                />
                <QuickActionTab
                  title={t('nav.maintenance')}
                  icon={<UtilizationIcon />}
                  onClick={() => handleNavigate('/maintenance')}
                  active={activeTab === 'maintenance'}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <FleetOverview cars={cars} companyCurrency={companyCurrency} />

      {/* Admin-only Sections */}
      {isUserAdmin && (
        <>
          {/* Maintenance Alerts */}
          <div className="mb-8">
            <h2
              className={`text-xl font-bold mb-4 text-white ${isRTL ? 'text-right' : 'text-left'}`}
            >
              {t('dashboard.maintenanceAlerts')}
            </h2>
            <div className="bg-gradient-to-r from-gray-900 to-black rounded-lg p-6 border border-gray-700/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.maintenanceAlerts.map(record => (
                  <div
                    key={record.encrypted_maintenance_id || record.maintenance_id}
                    className={`bg-gradient-to-br from-gray-900 to-black rounded-lg p-4 relative`}
                  >
                    <Link
                      to={
                        record.isOilChange || record.isDocExpiry
                          ? `/cars/${record.car.encrypted_car_id}`
                          : '/maintenance'
                      }
                      className={
                        'absolute right-4 top-4 text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center ' +
                        (isRTL ? 'flex-row-reverse' : '')
                      }
                    >
                      {record.isOilChange || record.isDocExpiry
                        ? t('dashboard.viewCar')
                        : t('dashboard.viewDetails')}
                      <svg
                        className={`w-4 h-4 ${isRTL ? 'mr-1' : 'ml-1'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d={isRTL ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
                        />
                      </svg>
                    </Link>
                    <div
                      className={`flex ${isRTL ? 'flex-row-reverse space-x-reverse' : ''} items-center space-x-4`}
                    >
                      <div
                        className={`w-12 h-12 ${
                          record.isOilChange
                            ? 'bg-yellow-500/20'
                            : record.isDocExpiry
                              ? 'bg-amber-500/20'
                              : 'bg-yellow-500/20'
                        } rounded-lg flex items-center justify-center ${isRTL ? 'ml-4' : 'mr-4'}`}
                      >
                        {record.isOilChange ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-yellow-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                            />
                          </svg>
                        ) : record.isDocExpiry ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-amber-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        ) : record.status === 'pending' ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-yellow-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-blue-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        )}
                      </div>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <h3 className="text-white font-medium">
                          {record.car
                            ? `${record.car.make} ${record.car.model}`
                            : t('common.vehicle')}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {record.isOilChange
                            ? t('maintenance.oilChangeRequired')
                            : record.isDocExpiry
                              ? record.description &&
                                record.description.includes('Registration & Insurance')
                                ? t('maintenance.registrationInsuranceExpiring')
                                : record.description && record.description.includes('Registration')
                                  ? t('maintenance.registrationExpiring')
                                  : t('maintenance.insuranceExpiring')
                              : record.description ||
                                (record.service_type === 'oil_change'
                                  ? t('maintenance.oilChange')
                                  : record.service_type === 'document_renewal'
                                    ? t('maintenance.documentRenewal')
                                    : t('maintenance.maintenance'))}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {stats.maintenanceAlerts.length === 0 && (
                  <div className="col-span-2 text-center py-8">
                    <p className="text-gray-400">{t('dashboard.noMaintenanceAlerts')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Car Card Component with consistent border application - Updated for Dashboard.jsx
const CarCard = ({ car, applyBorder = true, companyCurrency = '' }) => {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const carId = car.encrypted_car_id || car.car_id;
  const status = car.status || (car.available ? 'available' : 'rented');
  const plateNumber = car.plateNumber || car.license_plate;
  const dailyRate = car.rentalRate?.daily || car.daily_rate || 0;
  // Get currency from car data (comes from backend with car)
  const carCurrency = car.currency || companyCurrency || '';

  // Function to translate car colors
  const translateColor = color => {
    if (!color) return '';

    // Simple direct translation lookup using maintenance.colors path
    const colorTranslations = {
      white: t('maintenance.colors.white'),
      black: t('maintenance.colors.black'),
      red: t('maintenance.colors.red'),
      blue: t('maintenance.colors.blue'),
      green: t('maintenance.colors.green'),
      yellow: t('maintenance.colors.yellow'),
      orange: t('maintenance.colors.orange'),
      purple: t('maintenance.colors.purple'),
      pink: t('maintenance.colors.pink'),
      brown: t('maintenance.colors.brown'),
      gray: t('maintenance.colors.gray'),
      grey: t('maintenance.colors.grey'),
      silver: t('maintenance.colors.silver'),
      gold: t('maintenance.colors.gold'),
      beige: t('maintenance.colors.beige'),
      maroon: t('maintenance.colors.maroon'),
      navy: t('maintenance.colors.navy'),
      teal: t('maintenance.colors.teal'),
      lime: t('maintenance.colors.lime'),
      cyan: t('maintenance.colors.cyan'),
      magenta: t('maintenance.colors.magenta'),
      olive: t('maintenance.colors.olive'),
      coral: t('maintenance.colors.coral'),
      salmon: t('maintenance.colors.salmon'),
      khaki: t('maintenance.colors.khaki'),
      violet: t('maintenance.colors.violet'),
      indigo: t('maintenance.colors.indigo'),
      turquoise: t('maintenance.colors.turquoise'),
      bronze: t('maintenance.colors.bronze'),
      cream: t('maintenance.colors.cream'),
    };

    const colorKey = color.toLowerCase();
    return colorTranslations[colorKey] || color;
  };

  const handleCardClick = e => {
    const target = e.target;
    if (target.closest('a') || target.tagName === 'BUTTON') {
      // Prevent card click if a link or button inside was clicked
      return;
    }
    navigate(`/cars/${carId}`);
  };

  // Check if car needs attention using the utility functions directly
  const hasDocExpiring = hasExpiringDocuments(car);
  const oilChangeNeeded = needsOilChange(car);
  const needsAttention = hasDocExpiring || oilChangeNeeded;

  // console.log(
  //   `Dashboard CarCard - ${car.make} ${car.model}: hasDocExpiring=${hasDocExpiring}, oilChangeNeeded=${oilChangeNeeded}, needsAttention=${needsAttention}`
  // );
  // console.log(
  //   `  Registration date: ${car.registration_expiry_date}, Insurance date: ${car.insurance_expiry_date}`
  // );
  // console.log(
  //   `  Current mileage: ${car.current_mileage}, Last oil change: ${car.last_oil_change_mileage}`
  // );

  // Apply border styling only if applyBorder is true and car needs attention
  const shouldApplyBorder = applyBorder && needsAttention;

  return (
    <div
      className="cursor-pointer bg-gradient-to-br from-gray-900 to-black rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
      onClick={handleCardClick}
      style={
        shouldApplyBorder
          ? {
              border: hasDocExpiring
                ? '2px solid #f59e0b' // Amber for document expiry
                : '2px solid #eab308', // Yellow for oil change
              boxShadow: hasDocExpiring
                ? '0 0 10px 2px rgba(251, 146, 60, 0.4)' // Subtle glow
                : '0 0 10px 2px rgba(234, 179, 8, 0.4)',
              // NO transform to keep alignment perfect
            }
          : {}
      }
    >
      {/* Status Badge */}
      <div className="relative">
        {/* Enhanced Warning Triangle Icon for cars that need attention */}
        {needsAttention && (
          <div className={`absolute top-2 z-20 ${isRTL ? 'right-2' : 'left-2'}`}>
            <div className="relative">
              {/* Glowing background */}
              <div className="absolute inset-0 bg-amber-400 rounded-full blur-sm opacity-60 animate-pulse"></div>
              {/* Main triangle container */}
              <div className="relative bg-gradient-to-b from-amber-400 to-amber-600 rounded-full p-2 shadow-lg border-2 border-amber-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white drop-shadow-sm"
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
            </div>
          </div>
        )}

        <div className={`absolute top-2 z-10 ${isRTL ? 'left-2' : 'right-2'}`}>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              status === 'available'
                ? 'bg-green-500/80 text-white border border-green-500'
                : status === 'rented'
                  ? 'bg-blue-500/80 text-white border border-blue-500'
                  : 'bg-yellow-500/80 text-white border border-yellow-500'
            }`}
          >
            {status === 'available'
              ? t('cars.available')
              : status === 'rented'
                ? t('cars.inUse')
                : t('cars.maintenance')}
          </span>
        </div>
      </div>

      {/* Car Image */}
      <div className="h-48 bg-gray-700 flex items-center justify-center overflow-hidden relative">
        {/* Year badge positioned at bottom-right of image */}
        <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium z-20">
          {car.year}
        </div>
        {car.image_url ? (
          <img
            src={car.image_url}
            alt={`${car.make} ${car.model}`}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
            onError={e => {
              e.target.onerror = null;
              e.target.src = DefaultCarImg;
            }}
          />
        ) : (
          <img
            src={DefaultCarImg}
            alt="Default Car"
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
          />
        )}
      </div>
      <div className="p-6">
        <div className={`flex justify-between items-start ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h3 className="font-bold text-xl text-white">
            {car.make} {car.model}
          </h3>
        </div>
        <div className={`flex flex-wrap gap-2 mt-2 ${isRTL ? 'justify-end' : 'justify-start'}`}>
          <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">
            {translateColor(car.color)}
          </span>
          <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">{plateNumber}</span>
        </div>
        <div
          className={`flex justify-between items-center mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Link
            to={`/cars/${carId}/edit`}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
          >
            {t('common.edit')}
          </Link>
          {status === 'available' && (
            <Link
              to={`/rentals/new/${carId}`}
              state={{ preSelectedCar: car }}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
            >
              {t('cars.rentNow')}{' '}
              <span className={isRTL ? 'mr-1' : 'ml-1'}>{isRTL ? '←' : '→'}</span>
            </Link>
          )}
        </div>
        <div
          className={`mt-4 pt-4 border-t border-gray-700/50 flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <span className="block text-gray-400 text-sm">{t('cars.dailyRate')}</span>
            <span className="font-bold text-white text-lg">
              {formatPrice(dailyRate, carCurrency)}/{t('cars.day')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatsCard = ({ title, value, icon, change, positive }) => {
  const changeColorClass = positive
    ? 'text-green-400'
    : positive === false
      ? 'text-red-400'
      : 'text-gray-400';
  return (
    <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-300 font-medium text-lg">{title}</h3>
        <div className="text-blue-400 bg-blue-400/10 p-2 rounded-lg">{icon}</div>
      </div>
      <p className="text-4xl font-bold text-white mb-3">{value}</p>
      {change && (
        <div className="flex items-center">
          <div className={`${changeColorClass} text-sm font-medium`}>{change}</div>
        </div>
      )}
    </div>
  );
};

const QuickActionTab = ({ title, icon, onClick, active = false }) => (
  <button
    onClick={onClick}
    className={`flex flex-col !flex-col items-center justify-center flex-1 min-w-0 py-2 rounded-lg transition-all duration-300 border border-gray-700 mx-1
      bg-gradient-to-r from-gray-900 to-black text-gray-300 hover:bg-gradient-to-r hover:from-blue-600 hover:to-blue-700 hover:text-white
      ${active ? 'text-white shadow-lg' : ''}
    `}
    style={{ maxWidth: '100%' }}
  >
    <span className="w-8 h-8 flex items-center justify-center mb-1">{icon}</span>
    <span className="font-medium text-sm text-center">{title}</span>
  </button>
);

const DocumentIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    className="text-blue-400"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);
const ClientIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    className="text-blue-400"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
    />
  </svg>
);
const RevenueIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    className="text-blue-400"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
const ContractIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    className="text-blue-400"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);
const UtilizationIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    className="text-blue-400"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
);

// FleetOverview component - Fixed version for Dashboard.jsx
// FleetOverview component - Fixed version with proper RTL scroll support
function FleetOverview({ cars, companyCurrency }) {
  const { t, isRTL } = useLanguage();
  const scrollRef = useRef(null);

  // Fixed scroll functions that respect RTL direction
  const handleScrollRight = () => {
    if (scrollRef.current) {
      // In RTL, scrolling "right" means scrolling in the negative direction
      const scrollAmount = isRTL ? -320 : 320;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleScrollLeft = () => {
    if (scrollRef.current) {
      // In RTL, scrolling "left" means scrolling in the positive direction
      const scrollAmount = isRTL ? 320 : -320;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="mb-8 relative">
      <div className={`flex justify-between items-center mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h2 className="text-xl font-bold text-white">{t('dashboard.fleetOverview')}</h2>
        <Link
          to="/cars"
          className={`text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          {t('dashboard.viewAllFleet')}{' '}
          <span className={isRTL ? 'mr-1' : 'ml-1'}>{isRTL ? '←' : '→'}</span>
        </Link>
      </div>
      {cars.length === 0 ? (
        <div className="bg-gradient-to-r from-gray-900 to-black rounded-lg p-8 text-center border border-gray-700/50">
          <p className="text-gray-400">{t('dashboard.noCarsAvailable')}</p>
          <Link
            to="/cars/add"
            className="mt-4 inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {t('dashboard.registerFirstVehicle')}
          </Link>
        </div>
      ) : (
        <div className="relative">
          <div
            ref={scrollRef}
            className={`flex overflow-x-auto pb-2 scrollbar-hide ${isRTL ? 'space-x-reverse space-x-4' : 'space-x-4'}`}
            style={isRTL ? { direction: 'rtl' } : {}}
          >
            {cars.slice(0, 6).map((car, index) => {
              // Check alerts for each car using utility functions
              const hasDocExpiring = hasExpiringDocuments(car);
              const oilChangeNeeded = needsOilChange(car);
              const needsAttention = hasDocExpiring || oilChangeNeeded;

              // console.log(
              //   `FleetOverview - ${car.make} ${car.model}: hasDocExpiring=${hasDocExpiring}, oilChangeNeeded=${oilChangeNeeded}, needsAttention=${needsAttention}`
              // );

              if (!car.encrypted_car_id) return null; // Hide cars missing encrypted_car_id

              return (
                <div
                  className={`min-w-[300px] ${isRTL && index === 0 ? 'ml-4' : ''}`}
                  key={car.encrypted_car_id}
                  style={{
                    // Ensure card content respects LTR even in RTL container
                    direction: 'ltr',
                  }}
                >
                  <CarCard car={car} applyBorder={true} companyCurrency={companyCurrency} />
                </div>
              );
            })}
          </div>

          {/* RTL-aware scroll buttons */}
          {isRTL ? (
            <>
              {/* In RTL, right button should be on the right and scroll right */}
              <button
                onClick={handleScrollRight}
                className="absolute right-0 top-0 bottom-0 w-14 bg-gray-800/40 hover:bg-gray-700/60 text-white flex items-center justify-center transition-all rounded-l-lg"
              >
                ›
              </button>
              {/* In RTL, left button should be on the left and scroll left */}
              <button
                onClick={handleScrollLeft}
                className="absolute left-0 top-0 bottom-0 w-14 bg-gray-800/40 hover:bg-gray-700/60 text-white flex items-center justify-center transition-all rounded-r-lg"
              >
                ‹
              </button>
            </>
          ) : (
            <>
              {/* Normal LTR scroll buttons */}
              <button
                onClick={handleScrollLeft}
                className="absolute left-0 top-0 bottom-0 w-14 bg-gray-800/40 hover:bg-gray-700/60 text-white flex items-center justify-center transition-all rounded-r-lg"
              >
                ‹
              </button>
              <button
                onClick={handleScrollRight}
                className="absolute right-0 top-0 bottom-0 w-14 bg-gray-800/40 hover:bg-gray-700/60 text-white flex items-center justify-center transition-all rounded-l-lg"
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard;


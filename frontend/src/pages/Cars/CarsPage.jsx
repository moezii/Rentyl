// src/pages/Cars/CarsPage.jsx - FIXED Oil Change Alerts
import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../components/context/AuthContext';
import secureApi from '../../utils/secureApi';
import { formatPrice } from '../../utils/currencySymbols';
import { useMileageDisplay } from '../../hooks/useMileageDisplay';
import { useLanguage } from '../../contexts/LanguageContext';
import DefaultCarImg from '../../assets/DefaultCarImg.png';
import { hasExpiringDocuments, needsOilChange } from '../../utils/carUtils';
import OilChangeAlert from '../../components/OilChangeAlert';
import ExpiryAlert from '../../components/ExpiryAlert';

const CarsPage = () => {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const { company } = useContext(AuthContext);
  const [cars, setCars] = useState([]);
  const [filteredCars, setFilteredCars] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quota, setQuota] = useState({ car_quota: 10, current_cars: 0, has_quota: true });
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [quotaLastFetched, setQuotaLastFetched] = useState(null);
  // Fetch quota
  const fetchQuota = async () => {
    try {
      const response = await secureApi.get('/cars/check-quota');
      setQuota(response.data);
      setQuotaLastFetched(Date.now());
    } catch (err) {
      // console.error('Error fetching quota:', err);
      // Use default quota on error
      setQuota({ car_quota: 10, current_cars: 0, has_quota: true });
    }
  };

  // Fetch cars on component mount
  useEffect(() => {
    const fetchCars = async () => {
      try {
        setLoading(true);
        const response = await secureApi.get('/cars/');

        const formattedCars = (response.data || []).map(car => {
          // console.log(`CarsPage - Processing car: ${car.make} ${car.model}`);
          // console.log(`  Registration date: ${car.registration_expiry_date}`);
          // console.log(`  Insurance date: ${car.insurance_expiry_date}`);
          // console.log(`  Current mileage: ${car.current_mileage}`);
          // console.log(`  Oil change tracking: ${car.oil_change_tracking}`);
          // console.log(`  Last oil change: ${car.last_oil_change_mileage}`);
          // console.log(`  Oil change interval: ${car.oil_change_interval}`);

          // Check for alerts using the utility functions
          const hasDocAlert = hasExpiringDocuments(car);
          const hasOilAlert = needsOilChange(car);

          // console.log(`  Document alert: ${hasDocAlert}`);
          // console.log(`  Oil change alert: ${hasOilAlert}`);

          // Store alert flags
          const alertFlags = {
            hasDocAlert,
            hasOilAlert,
            hasAnyAlert: hasDocAlert || hasOilAlert,
          };

          // console.log(`  Final alert flags:`, alertFlags);

          // Return formatted car with alert flags
          return {
            ...car,
            imageUrl: car.image_url || car.imageUrl,
            plateNumber: car.plateNumber || car.license_plate,
            rentalRate: {
              daily: car.rentalRate?.daily || car.daily_rate || 0,
              weekly: car.rentalRate?.weekly || car.weekly_rate || 0,
              monthly: car.rentalRate?.monthly || car.monthly_rate || 0,
            },
            status: car.status || (car.available ? 'available' : 'rented'),
            alertFlags,
          };
        });

        setCars(formattedCars);
        setFilteredCars(formattedCars);
      } catch (err) {
        // console.error('Error fetching cars:', err);
        setError(t('common.error') + ': ' + t('cars.noVehiclesFound'));
        setCars([]);
        setFilteredCars([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCars();
    fetchQuota();
  }, [t]);

  // Filter cars based on active filter and search term
  useEffect(() => {
    let result = [...cars];

    // Apply status filter
    if (activeFilter !== 'all') {
      result = result.filter(car => car.status === activeFilter);
    }

    // Apply search filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        car =>
          (car.make?.toLowerCase() || '').includes(term) ||
          (car.model?.toLowerCase() || '').includes(term) ||
          (car.plateNumber?.toLowerCase() || '').includes(term) ||
          (car.color?.toLowerCase() || '').includes(term)
      );
    }

    setFilteredCars(result);
  }, [activeFilter, searchTerm, cars]);

  // Function to handle add car button click
  const handleAddCarClick = async () => {
    // Check if quota needs refresh (cache for 30 seconds)
    const now = Date.now();
    if (!quotaLastFetched || now - quotaLastFetched > 30000) {
      await fetchQuota();
    }

    // Check quota
    if (!quota.has_quota) {
      setShowQuotaModal(true);
    } else {
      navigate('/cars/add');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`p-6 w-full text-white min-h-screen ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Quota Modal */}
      {showQuotaModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowQuotaModal(false)}
        >
          <div
            className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-center mb-4">
              <div className="bg-yellow-500/20 rounded-full p-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-yellow-500"
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
            <h3 className="text-xl font-bold text-center mb-2">{t('cars.quotaLimitReached')}</h3>
            <p className="text-gray-300 text-center mb-6">
              Contact us to upgrade your quota at{' '}
              <a
                href="mailto:support@rentyl.app"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                support@rentyl.app
              </a>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuotaModal(false)}
                className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                {t('cars.close')}
              </button>
              <button
                onClick={() => {
                  window.location.href = 'mailto:support@rentyl.app';
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {t('cars.upgradePlan')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header section */}
      <div
        className={`flex flex-col md:flex-row justify-between items-start md:items-center mb-6 ${isRTL ? 'md:flex-row-reverse' : ''}`}
      >
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h1 className="text-2xl font-bold">{t('cars.title')}</h1>
          <p className="text-gray-400 mt-1">{t('cars.subtitle')}</p>
          {/* Quota Display */}
          <p className="text-sm text-gray-500 mt-2" dir={isRTL ? 'rtl' : 'ltr'}>
            {isRTL ? (
              <>
                استخدام <span className="font-semibold text-blue-400">{quota.current_cars}</span> من{' '}
                <span className="font-semibold text-blue-400">{quota.car_quota}</span> سيارة
              </>
            ) : (
              <>
                Using <span className="font-semibold text-blue-400">{quota.current_cars}</span> of{' '}
                <span className="font-semibold text-blue-400">{quota.car_quota}</span> cars
              </>
            )}
          </p>
        </div>
        <button
          onClick={handleAddCarClick}
          className={`mt-4 md:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          {t('cars.addNewVehicle')}
        </button>
      </div>

      {/* Error message */}
      {error && <div className="bg-red-900/30 text-red-200 px-4 py-3 rounded-lg mb-6">{error}</div>}

      {/* Search and filter section */}
      <div className="mb-6">
        <div
          className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}
        >
          {/* Search Input */}
          <div className="relative md:w-1/3">
            <div className="relative">
              {isRTL ? (
                // RTL Version - Icon on the right
                <>
                  <input
                    type="text"
                    placeholder={t('cars.searchVehicles')}
                    className="w-full py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    style={{ paddingRight: '1rem', paddingLeft: '3rem', textAlign: 'right' }}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    dir="rtl"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </>
              ) : (
                // LTR Version - Icon on the left
                <>
                  <input
                    type="text"
                    placeholder={t('cars.searchVehicles')}
                    className="w-full py-3 pl-12 pr-4 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Filter Buttons */}
          <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
            <FilterButton
              label={t('cars.allStatuses')}
              active={activeFilter === 'all'}
              onClick={() => setActiveFilter('all')}
            />
            <FilterButton
              label={t('cars.available')}
              active={activeFilter === 'available'}
              onClick={() => setActiveFilter('available')}
            />
            <FilterButton
              label={t('cars.rented')}
              active={activeFilter === 'rented'}
              onClick={() => setActiveFilter('rented')}
            />
            <FilterButton
              label={t('cars.maintenance')}
              active={activeFilter === 'maintenance'}
              onClick={() => setActiveFilter('maintenance')}
            />
          </div>
        </div>
      </div>

      {/* Car listing */}
      {filteredCars.length === 0 ? (
        <div className="text-center py-10 bg-gray-900 rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 mx-auto text-gray-400 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 16v3M19 9V6M3 9l9-6 9 6m0 0v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9m2 10V9m14 10V9"
            />
          </svg>
          <h3 className="text-lg font-medium text-white">{t('cars.noVehiclesFound')}</h3>
          <p className="text-gray-400 mt-1 mb-4">{t('common.tryAgain')}</p>
          <button
            onClick={() => navigate('/cars/add')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {t('cars.addFirstVehicle')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCars.map(car => (
            <CarCard
              key={car.encrypted_car_id || car._id}
              car={car}
              companyCurrency={company?.currency || ''}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Car Card Component
const CarCard = ({ car, companyCurrency }) => {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const carId = car.encrypted_car_id;
  const carCurrency = car.currency || companyCurrency || '';

  // Check for alerts
  const hasDocExpiring = car.alertFlags?.hasDocAlert || hasExpiringDocuments(car);
  const oilChangeNeeded = car.alertFlags?.hasOilAlert || needsOilChange(car);

  const handleImageError = e => {
    e.target.src = DefaultCarImg;
    e.target.onerror = null; // Prevent infinite loop
  };

  // Click handler for the main card div (excluding buttons/links inside)
  const handleCardClick = e => {
    // Only navigate if the click was directly on the card (not on a button/link)
    if (e.target === e.currentTarget || e.target.closest('.card-clickable-area')) {
      navigate(`/cars/${carId}`);
    }
  };

  if (!carId) return null; // Hide cars missing encrypted_car_id

  return (
    <div
      onClick={handleCardClick}
      className="relative bg-gray-900 rounded-lg overflow-hidden shadow-md transition-all duration-300 hover:shadow-xl cursor-pointer card-clickable-area"
    >
      {/* Alert Badges - Top Left */}
      {(hasDocExpiring || oilChangeNeeded) && (
        <div className={`absolute top-2 ${isRTL ? 'right-2' : 'left-2'} z-20 flex gap-2`}>
          {hasDocExpiring && (
            <span className="px-2 py-1 bg-amber-600 text-white rounded text-xs font-medium">
              {t('maintenance.documentsDue')}
            </span>
          )}
          {oilChangeNeeded && (
            <span className="px-2 py-1 bg-yellow-600 text-white rounded text-xs font-medium">
              {t('maintenance.oilChangeDue')}
            </span>
          )}
        </div>
      )}

      {/* Status Badge - Top Right */}
      <div className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} z-10`}>
        <span
          className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
            car.status === 'available'
              ? 'bg-green-500 text-white'
              : car.status === 'rented'
                ? 'bg-blue-500 text-white'
                : 'bg-yellow-500 text-white'
          }`}
        >
          {car.status === 'available'
            ? t('cars.available')
            : car.status === 'rented'
              ? t('cars.inUse')
              : t('cars.maintenance')}
        </span>
      </div>

      {/* Car Image */}
      <div className="h-48 bg-gray-700 flex items-center justify-center overflow-hidden">
        <img
          src={car.imageUrl || DefaultCarImg}
          alt={`${car.make} ${car.model}`}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
          onError={handleImageError}
        />
      </div>

      {/* Car Details */}
      <div className="p-4">
        <div className={`flex justify-between items-start ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h3 className={`font-bold text-lg text-white ${isRTL ? 'text-right' : 'text-left'}`}>
            {car.make} {car.model}
          </h3>
          <span className="text-gray-300">{car.year}</span>
        </div>

        <div className={`flex flex-wrap gap-2 mt-2 ${isRTL ? 'justify-end' : 'justify-start'}`}>
          <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">{car.color}</span>
          <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">
            {car.plateNumber}
          </span>
        </div>

        <div className={`mt-3 pt-3 border-t border-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
          <div className={`flex gap-1.5 mb-3 ${isRTL ? 'justify-end' : 'justify-start'}`}>
            <div className="px-2.5 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded-md">
              <div className="text-[11px] text-blue-300 font-medium">{t('cars.dailyRate')}</div>
              <div className="text-xs font-bold text-white">
                {formatPrice(car.rentalRate.daily, carCurrency)}
              </div>
            </div>
            {car.rentalRate.weekly > 0 && (
              <div className="px-2.5 py-1.5 bg-green-600/20 border border-green-500/30 rounded-md">
                <div className="text-[11px] text-green-300 font-medium">{t('cars.weeklyRate')}</div>
                <div className="text-xs font-bold text-white">
                  {formatPrice(car.rentalRate.weekly, carCurrency)}
                </div>
              </div>
            )}
            {car.rentalRate.monthly > 0 && (
              <div className="px-2.5 py-1.5 bg-purple-600/20 border border-purple-500/30 rounded-md">
                <div className="text-[11px] text-purple-300 font-medium">
                  {t('cars.monthlyRate')}
                </div>
                <div className="text-xs font-bold text-white">
                  {formatPrice(car.rentalRate.monthly, carCurrency)}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className={`flex gap-2 mt-3 ${isRTL ? 'flex-row-reverse' : 'justify-end'}`}>
            <Link
              to={`/cars/${carId}/edit`}
              className="px-2 py-1.5 text-blue-400 rounded text-xs font-medium hover:text-blue-300 transition-colors"
              onClick={e => e.stopPropagation()}
            >
              {t('cars.edit')}
            </Link>
            <button
              onClick={e => {
                e.stopPropagation();
                if (window.confirm(t('cars.areYouSureDeleteVehicle'))) {
                  // Handle delete - you may want to add a proper delete handler
                  console.log('Delete car:', carId);
                }
              }}
              className="px-2 py-1.5 text-red-400 rounded text-xs font-medium hover:text-red-300 transition-colors"
            >
              {t('cars.delete')}
            </button>
            {car.status === 'available' && (
              <Link
                to={`/rentals/new/${carId}`}
                state={{ preSelectedCar: car }}
                className="px-2 py-1.5 text-blue-400 rounded text-xs font-medium hover:text-blue-300 transition-colors"
                onClick={e => e.stopPropagation()}
              >
                {t('cars.rentNow')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Filter button component
const FilterButton = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg transition-colors ${
      active ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-300 hover:bg-gray-700'
    }`}
  >
    {label}
  </button>
);

export default CarsPage;

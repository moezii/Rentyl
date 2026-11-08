import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import secureApi from '../utils/secureApi';
import DefaultCarImg from '../assets/DefaultCarImg.png';
import SEOHead from '../components/SEO/SEOHead';
import { formatPrice } from '../utils/currencySymbols';
import BookingConfirmationModal from '../components/BookingConfirmationModal';

const BookPage = () => {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCar, setSelectedCar] = useState(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationModalData, setConfirmationModalData] = useState({
    type: 'failure',
    bookingId: null,
    email: '',
    transactionId: null,
  });

  // Date selection state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datesSelected, setDatesSelected] = useState(false);
  const [dateErrors, setDateErrors] = useState({});

  useEffect(() => {
    // Scroll to top when page loads
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const modalData = location.state?.paymentModal;
    if (modalData) {
      setConfirmationModalData(modalData);
      setShowConfirmationModal(true);
    }
  }, [location.state]);

  const fetchAvailableCars = async (start, end) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch cars available for the selected date range
      const response = await secureApi.get('/cars/public/available', {
        params: {
          start_date: start,
          end_date: end,
        },
      });

      // Ensure response.data is an array
      const carsData = Array.isArray(response.data) ? response.data : [];

      // Format data
      const availableCars = carsData.map(car => ({
        ...car,
        imageUrl: car.image_url || car.imageUrl,
        plateNumber: car.plateNumber || car.license_plate,
        rentalRate: {
          daily: car.rentalRate?.daily || car.daily_rate || 0,
          weekly: car.rentalRate?.weekly || car.weekly_rate || 0,
          monthly: car.rentalRate?.monthly || car.monthly_rate || 0,
        },
      }));

      setCars(availableCars);
    } catch (err) {
      console.error('Error fetching cars:', err);
      setError(t('book.unableToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelection = () => {
    // Validate dates
    const errors = {};

    if (!startDate) {
      errors.startDate = t('booking.startDateRequired');
    }

    if (!endDate) {
      errors.endDate = t('booking.endDateRequired');
    }

    if (startDate && startDate > maxStartDateStr) {
      errors.startDate =
        t('booking.startDateTooFar') || 'Start date must be within 7 days from today';
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        errors.endDate = t('booking.endDateInvalid');
      }
    }

    setDateErrors(errors);

    if (Object.keys(errors).length === 0) {
      setDatesSelected(true);
      fetchAvailableCars(startDate, endDate);
    }
  };

  const handleDateChange = () => {
    setDatesSelected(false);
    setCars([]);
  };

  // Filter cars based on search
  const filteredCars = cars.filter(car => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (car.make?.toLowerCase() || '').includes(term) ||
      (car.model?.toLowerCase() || '').includes(term) ||
      (car.color?.toLowerCase() || '').includes(term) ||
      (car.year?.toString() || '').includes(term)
    );
  });

  // Get today's date and max start date (today + 7 days) in YYYY-MM-DD format
  const today = new Date();
  const maxStartDateObj = new Date();
  maxStartDateObj.setDate(maxStartDateObj.getDate() + 7);
  const formatDateInput = dateObj => dateObj.toISOString().split('T')[0];
  const todayStr = formatDateInput(today);
  const maxStartDateStr = formatDateInput(maxStartDateObj);

  return (
    <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 min-h-screen">
      <SEOHead
        title="Book a Car - Rentyl"
        description="Browse and book from our wide selection of available rental cars. Find the perfect vehicle for your needs with Rentyl."
        keywords="car rental, book car, rent vehicle, car booking"
        canonical="https://rentyl.app/book"
      />

      {/* Animated Background Grid */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        ></div>
      </div>

      {/* Hero Section */}
      <div className="relative pt-24 pb-12 px-4">
        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-block mb-6 px-6 py-3 bg-blue-500/10 border border-blue-500/30 rounded-full"
            >
              <span className="text-blue-400 text-sm font-bold tracking-wide">
                {t('book.available').toUpperCase()}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent"
            >
              {t('book.title')}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-gray-300 mb-8"
            >
              {datesSelected ? t('book.subtitle') : t('book.selectDatesFirst') || 'Select your rental period to see available vehicles'}
            </motion.p>

            {/* Date Selection Section - Shows only if dates not selected */}
            {!datesSelected && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="max-w-3xl mx-auto"
              >
                <div className="bg-gradient-to-br from-gray-900/60 to-black/60 backdrop-blur-2xl border border-blue-500/30 rounded-3xl p-8 shadow-2xl shadow-blue-500/20">
                  <h2 className="text-2xl font-bold text-white mb-6">
                    {t('booking.selectRentalPeriod') || 'Select Your Rental Period'}
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label
                        htmlFor="startDate"
                        className="block text-sm font-semibold text-gray-300 mb-2"
                      >
                        {t('booking.startDate')}{' '}
                        <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="startDate"
                        name="startDate"
                        type="date"
                        min={todayStr}
                        max={maxStartDateStr}
                        value={startDate}
                        onChange={e => {
                          setStartDate(e.target.value);
                          setDateErrors(prev => ({ ...prev, startDate: '' }));
                        }}
                        className={`w-full px-4 py-3 bg-gray-900/50 border rounded-xl text-white focus:outline-none focus:ring-2 transition-all duration-300 ${
                          dateErrors.startDate
                            ? 'border-red-500/50 focus:ring-red-500/50'
                            : 'border-blue-500/30 focus:ring-blue-500/50 focus:border-blue-500/50'
                        }`}
                      />
                      {dateErrors.startDate && (
                        <p className="mt-2 text-sm text-red-400">{dateErrors.startDate}</p>
                      )}
                      {!dateErrors.startDate && (
                        <p className="mt-2 text-xs text-gray-400">
                          {t('booking.startDateLimitNote') ||
                            'Start date can be selected up to 7 days from today.'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="endDate"
                        className="block text-sm font-semibold text-gray-300 mb-2"
                      >
                        {t('booking.endDate')}{' '}
                        <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="endDate"
                        name="endDate"
                        type="date"
                        min={startDate || todayStr}
                        value={endDate}
                        onChange={e => {
                          setEndDate(e.target.value);
                          setDateErrors(prev => ({ ...prev, endDate: '' }));
                        }}
                        className={`w-full px-4 py-3 bg-gray-900/50 border rounded-xl text-white focus:outline-none focus:ring-2 transition-all duration-300 ${
                          dateErrors.endDate
                            ? 'border-red-500/50 focus:ring-red-500/50'
                            : 'border-blue-500/30 focus:ring-blue-500/50 focus:border-blue-500/50'
                        }`}
                      />
                      {dateErrors.endDate && (
                        <p className="mt-2 text-sm text-red-400">{dateErrors.endDate}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleDateSelection}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-4 px-6 rounded-full shadow-lg shadow-blue-500/50 transition-all duration-300 flex items-center justify-center text-lg hover:scale-105"
                  >
                    {t('book.searchAvailableCars') || 'Search Available Cars'}
                    <svg className="w-6 h-6 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Search Bar - Shows only if dates are selected */}
            {datesSelected && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-2xl mx-auto"
              >
                {/* Selected Dates Display */}
                <div className="mb-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-semibold">{startDate}</span>
                    <span>to</span>
                    <span className="font-semibold">{endDate}</span>
                  </div>
                  <button
                    onClick={handleDateChange}
                    className="text-blue-400 hover:text-blue-300 text-sm font-semibold flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {t('book.changeDates') || 'Change Dates'}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder={t('book.searchPlaceholder')}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full px-12 py-4 bg-gray-900/50 border border-blue-500/30 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <svg
                      className="w-6 h-6 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Cars Grid Section - Only show when dates are selected */}
      {datesSelected && (
        <div className="relative py-16 px-4">
          <div className="container mx-auto">
            {error && (
              <div className="max-w-4xl mx-auto mb-8 bg-red-500/20 border border-red-500/30 text-red-400 p-4 rounded-xl">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center py-16">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
                  <p className="text-gray-400 mt-4">{t('book.loadingVehicles')}</p>
                </div>
              </div>
            ) : filteredCars.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto text-center py-16"
              >
                <div className="bg-gray-800/50 backdrop-blur-sm border border-blue-500/20 rounded-3xl p-12">
                  <svg
                    className="w-24 h-24 mx-auto text-gray-600 mb-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="text-2xl font-bold text-white mb-4">{t('book.noVehiclesFound')}</h3>
                  <p className="text-gray-400">{t('book.noVehiclesMessage')}</p>
                  <button
                    onClick={handleDateChange}
                    className="mt-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 px-6 rounded-full transition-all duration-300"
                  >
                    {t('book.tryDifferentDates') || 'Try Different Dates'}
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                {filteredCars.map((car, index) => (
                  <CarCard
                    key={car.encrypted_car_id || car._id}
                    car={car}
                    index={index}
                    onViewDetails={() => setSelectedCar(car)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Car Details Modal */}
      <AnimatePresence>
        {selectedCar && (
          <CarDetailsModal
            car={selectedCar}
            onClose={() => setSelectedCar(null)}
            onBook={() => {
              navigate(`/booking/${selectedCar.encrypted_car_id}`, {
                state: {
                  car: selectedCar,
                  startDate: startDate,
                  endDate: endDate
                }
              });
            }}
          />
        )}
      </AnimatePresence>

      <BookingConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        type={confirmationModalData.type}
        bookingId={confirmationModalData.bookingId}
        email={confirmationModalData.email}
        transactionId={confirmationModalData.transactionId}
      />
    </div>
  );
};

// Car Card Component
const CarCard = ({ car, index, onViewDetails }) => {
  const { t } = useLanguage();

  const handleImageError = e => {
    e.target.src = DefaultCarImg;
    e.target.onerror = null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative bg-gradient-to-br from-gray-900/60 to-black/60 backdrop-blur-2xl border border-blue-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-blue-500/10 hover:border-blue-500/50 hover:shadow-blue-500/20 transition-all duration-300 cursor-pointer"
      onClick={onViewDetails}
    >
      {/* Car Image */}
      <div className="relative h-56 bg-gray-900/50 overflow-hidden">
        <img
          src={car.imageUrl || DefaultCarImg}
          alt={`${car.make} ${car.model}`}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={handleImageError}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
      </div>

      {/* Car Details */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">
              {car.make} {car.model}
            </h3>
            <p className="text-gray-400">{car.year}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-400 rounded-full text-sm font-semibold">
              {t('book.available')}
            </span>
            {(car.city || car.province) && (
              <div className="flex items-center text-sm text-gray-400">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {car.city && car.province
                  ? `${car.city}, ${car.province}`
                  : car.city || car.province}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg text-sm">
            {car.color}
          </span>
          <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg text-sm">
            {car.transmission || t('book.automatic')}
          </span>
          {car.fuel_type && (
            <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg text-sm">
              {car.fuel_type}
            </span>
          )}
        </div>

        <div className="pt-4 border-t border-blue-500/20">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="block text-gray-400 text-sm mb-1">{t('book.startingFrom')}</span>
              <span className="text-2xl font-bold text-white">{formatPrice(car.rentalRate.daily, car.currency)}</span>
              <span className="text-gray-400 text-sm">{t('book.perDay')}</span>
            </div>
          </div>
          {(car.rentalRate.weekly > 0 || car.rentalRate.monthly > 0) && (
            <div className="flex flex-wrap gap-3 text-sm text-gray-300 mb-4">
              {car.rentalRate.weekly > 0 && (
                <div>
                  <span className="text-gray-400">{t('book.weekly')}:</span>{' '}
                  <span className="text-white font-semibold">
                    {formatPrice(car.rentalRate.weekly, car.currency)}
                  </span>
                </div>
              )}
              {car.rentalRate.monthly > 0 && (
                <div>
                  <span className="text-gray-400">{t('book.monthly')}:</span>{' '}
                  <span className="text-white font-semibold">
                    {formatPrice(car.rentalRate.monthly, car.currency)}
                  </span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={e => {
              e.stopPropagation();
              onViewDetails();
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 px-4 rounded-full transition-all duration-300 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-blue-500/50"
          >
            {t('book.viewDetails')}
            <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Car Details Modal Component
const CarDetailsModal = ({ car, onClose, onBook }) => {
  const { t } = useLanguage();

  const handleImageError = e => {
    e.target.src = DefaultCarImg;
    e.target.onerror = null;
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Main Modal */}
        <div className="relative bg-gradient-to-br from-gray-900/60 to-black/60 backdrop-blur-2xl border border-blue-500/30 rounded-2xl shadow-2xl shadow-blue-500/20 overflow-hidden">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors z-10 bg-gray-900/50 hover:bg-gray-900/80 p-2 rounded-lg"
            aria-label={t('book.closeModal')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Car Image */}
          <div className="relative h-48 bg-gray-900/50 overflow-hidden">
            <img
              src={car.imageUrl || DefaultCarImg}
              alt={`${car.make} ${car.model}`}
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
            <div className="absolute top-3 left-3">
              <span className="px-3 py-1.5 bg-green-500/90 backdrop-blur-sm border border-green-400 text-white rounded-full text-xs font-bold shadow-lg">
                {t('book.availableNow')}
              </span>
            </div>
          </div>

          {/* Car Information */}
          <div className="p-5">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-white mb-1">
                {car.make} {car.model}
              </h2>
              <p className="text-base text-gray-400">{car.year}</p>
            </div>

            {/* Specifications Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <div className="bg-gray-900/50 border border-blue-500/20 rounded-lg p-3">
                <div className="text-gray-400 text-xs mb-0.5">{t('book.color')}</div>
                <div className="text-white font-semibold text-sm">{car.color}</div>
              </div>
              <div className="bg-gray-900/50 border border-blue-500/20 rounded-lg p-3">
                <div className="text-gray-400 text-xs mb-0.5">{t('book.transmission')}</div>
                <div className="text-white font-semibold text-sm">
                  {car.transmission || t('book.automatic')}
                </div>
              </div>
              <div className="bg-gray-900/50 border border-blue-500/20 rounded-lg p-3">
                <div className="text-gray-400 text-xs mb-0.5">{t('book.fuelType')}</div>
                <div className="text-white font-semibold text-sm">{car.fuel_type || t('book.petrol')}</div>
              </div>
              <div className="bg-gray-900/50 border border-blue-500/20 rounded-lg p-3">
                <div className="text-gray-400 text-xs mb-0.5">{t('book.seats')}</div>
                <div className="text-white font-semibold text-sm">{car.seating_capacity || '5'}</div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-xl p-3 mb-4">
              <h3 className="text-base font-bold text-white mb-2">{t('book.rentalRates')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <div className="text-gray-400 text-xs mb-0.5">{t('book.daily')}</div>
                  <div className="text-lg font-bold text-white">{formatPrice(car.rentalRate.daily, car.currency)}</div>
                </div>
                {car.rentalRate.weekly > 0 && (
                  <div>
                    <div className="text-gray-400 text-xs mb-0.5">{t('book.weekly')}</div>
                    <div className="text-lg font-bold text-white">{formatPrice(car.rentalRate.weekly, car.currency)}</div>
                  </div>
                )}
                {car.rentalRate.monthly > 0 && (
                  <div>
                    <div className="text-gray-400 text-xs mb-0.5">{t('book.monthly')}</div>
                    <div className="text-lg font-bold text-white">
                      {formatPrice(car.rentalRate.monthly, car.currency)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Book Button */}
            <button
              onClick={onBook}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-2.5 px-6 rounded-full shadow-lg shadow-blue-500/50 transition-all duration-300 flex items-center justify-center hover:scale-105"
            >
              {t('book.bookThisVehicle')}
              <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default BookPage;


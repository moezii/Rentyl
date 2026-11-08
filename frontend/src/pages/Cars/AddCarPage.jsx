// src/pages/Cars/AddCarPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../components/context/AuthContext';
import secureApi from '../../utils/secureApi';
import { useMileageDisplay } from '../../hooks/useMileageDisplay';
import { useLanguage } from '../../contexts/LanguageContext';
import { getCurrencySymbol } from '../../utils/currencySymbols';

const AddCarPage = () => {
  const { getMileageUnit } = useMileageDisplay();
  const mileageUnit = getMileageUnit();
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { company } = useContext(AuthContext); // Get company currency from AuthContext
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [quota, setQuota] = useState({ car_quota: 10, current_cars: 0, has_quota: true });

  // Form state
  const [formData, setFormData] = useState({
    plateNumber: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    type: 'Sedan',
    status: 'available',
    rentalRate: {
      daily: '',
      weekly: '',
      monthly: '',
    },
    description: '',
    image: null,
    imagePreview: null,
    mileage: 0,
    registrationExpiryDate: '',
    insuranceExpiryDate: '',
  });

  const handleInputChange = e => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleFileChange = e => {
    const file = e.target.files[0];
    if (file) {
      // Frontend validation - protects against basic malicious file types
      const allowedTypes = ['image/jpeg', 'image/png'];
      const allowedExtensions = ['.jpg', '.jpeg', '.png'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        setError(t('cars.invalidFileType'));
        return;
      }

      // Validate file extension
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (!allowedExtensions.includes(fileExtension)) {
        setError(t('cars.invalidFileExtension'));
        return;
      }

      // Validate file size
      if (file.size > maxSize) {
        setError(t('cars.fileSizeExceeds'));
        return;
      }

      // Clear any previous errors
      setError(null);

      setFormData({
        ...formData,
        image: file,
        imagePreview: URL.createObjectURL(file),
      });
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!formData.plateNumber) errors.plateNumber = t('cars.plateNumberRequired');
    if (!formData.make) errors.make = t('cars.makeRequired');
    if (!formData.model) errors.model = t('cars.modelRequired');
    if (!formData.year) errors.year = t('cars.yearRequired');
    if (!formData.color) errors.color = t('cars.colorRequired');
    if (!formData.rentalRate.daily) errors.daily = t('cars.dailyRateRequired');

    // Check that rates are valid numbers
    if (isNaN(Number(formData.rentalRate.daily))) errors.daily = t('cars.dailyRateMustBeNumber');

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check quota on page load
  useEffect(() => {
    const initializePage = async () => {
      try {
        // Check car quota
        const quotaResponse = await secureApi.get('/cars/check-quota');
        setQuota(quotaResponse.data);
        if (!quotaResponse.data.has_quota) {
          setQuotaExceeded(true);
        }
      } catch (err) {
        console.error('Error initializing page:', err);
        // Allow proceeding if checks fail (fail open)
      }
    };
    initializePage();
  }, []);

  // Handle form submission - updated to match backend field names
  const handleSubmit = async e => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      // Create FormData with exact field names matching your backend/database
      const formSubmitData = new FormData();

      // Add basic car information matching your schema exactly
      formSubmitData.append('make', formData.make);
      formSubmitData.append('model', formData.model);
      formSubmitData.append('year', formData.year);
      formSubmitData.append('color', formData.color);
      formSubmitData.append('license_plate', formData.plateNumber); // Map plateNumber to license_plate
      formSubmitData.append('type', formData.type);
      formSubmitData.append('status', formData.status);
      formSubmitData.append('current_mileage', formData.mileage || 0);

      // Add rental rate
      if (formData.rentalRate && formData.rentalRate.daily) {
        formSubmitData.append('daily_rate', formData.rentalRate.daily);
      }
      if (formData.rentalRate && formData.rentalRate.weekly) {
        formSubmitData.append('weekly_rate', formData.rentalRate.weekly);
      }
      if (formData.rentalRate && formData.rentalRate.monthly) {
        formSubmitData.append('monthly_rate', formData.rentalRate.monthly);
      }

      // Add description
      if (formData.description) {
        formSubmitData.append('description', formData.description);
      }

      // Add expiry dates
      if (formData.registrationExpiryDate) {
        formSubmitData.append('registration_expiry_date', formData.registrationExpiryDate);
      }
      if (formData.insuranceExpiryDate) {
        formSubmitData.append('insurance_expiry_date', formData.insuranceExpiryDate);
      }

      // Add image if provided
      if (formData.image) {
        formSubmitData.append('image', formData.image);
      }

      // Log what we're sending
      console.log('Submitting car with data:');
      for (let [key, value] of formSubmitData.entries()) {
        console.log(`${key}: ${value}`);
      }

      // Make the API call
      const response = await secureApi.post('/cars/', formSubmitData, {
        headers: {
          // Let browser set Content-Type for multipart/form-data
        },
      });

      console.log('API Response:', response);

      // Extract encrypted_car_id from the nested response structure
      const encryptedCarId = response.data?.data?.[0]?.encrypted_car_id;

      if (!encryptedCarId) {
        console.error('Error: API response missing encrypted_car_id', response.data);
        setError(
          t('cars.failedToAddVehicle') +
            ' ' +
            'Car created but ID not returned from server. Please refresh and try again.'
        );
        setSuccess(true); // Show partial success
        setTimeout(() => navigate('/cars'), 3000); // Navigate to cars list instead
        return;
      }

      setSuccess(true);

      // Navigate to car details using encrypted_car_id
      navigate(`/cars/${encryptedCarId}`);
    } catch (err) {
      console.error('Error adding car:', err);

      // Detailed error handling
      let errorMessage = t('cars.failedToAddVehicle') + ' ';

      if (!err) {
        errorMessage += t('cars.unknownError');
      } else if (err.status === 0) {
        errorMessage += t('cars.networkConnectionIssue');
      } else if (err.response) {
        // Format the error response
        const responseData = err.response.data;
        if (typeof responseData === 'object') {
          errorMessage += JSON.stringify(responseData);
        } else {
          errorMessage += String(
            responseData?.detail || responseData || err.response.statusText || t('cars.serverError')
          );
        }
      } else if (err.request) {
        errorMessage += t('cars.noResponseFromServer');
      } else if (err.message) {
        errorMessage += err.message;
      }

      setError(errorMessage);
      window.scrollTo(0, 0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`p-4 md:p-8 max-w-4xl mx-auto text-white`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Quota Exceeded Modal */}
      {quotaExceeded && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
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
              {t('cars.quotaLimitMessage', { quota: quota.car_quota })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/cars')}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {t('cars.backToCars')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add CSS to hide number input arrows */}
      <style>
        {`
          /* Hide number input arrows */
          input[type="number"]::-webkit-outer-spin-button,
          input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          
          input[type="number"] {
            -moz-appearance: textfield;
          }
        `}
      </style>

      {/* Breadcrumb navigation */}
      <div className="mb-4">
        <div className={`flex items-center text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Link to="/dashboard" className="text-gray-400 hover:text-blue-400">
            {t('common.dashboard')}
          </Link>
          <span className={`mx-2 text-gray-600 ${isRTL ? 'rotate-180' : ''}`}>/</span>
          <Link to="/cars" className="text-gray-400 hover:text-blue-400">
            {t('cars.title')}
          </Link>
          <span className={`mx-2 text-gray-600 ${isRTL ? 'rotate-180' : ''}`}>/</span>
          <span className="text-white">{t('cars.addNewVehicle')}</span>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">{t('cars.addNewVehicle')}</h1>

          {/* Success message */}
          {success && (
            <div className="bg-green-900/30 text-green-200 px-4 py-3 rounded-lg mb-6">
              {t('cars.vehicleAddedSuccessfully')}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-900/30 text-red-200 px-4 py-3 rounded-lg mb-6">{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Basic car details */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold border-b border-gray-700 pb-2">
                  {t('cars.vehicleInformation')}
                </h2>

                <div>
                  <label
                    htmlFor="plateNumber"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    {t('cars.plateNumber')}*
                  </label>
                  <input
                    type="text"
                    id="plateNumber"
                    name="plateNumber"
                    value={formData.plateNumber}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 bg-gray-700 border ${validationErrors.plateNumber ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600`}
                    placeholder={t('cars.platePlaceholder')}
                  />
                  {validationErrors.plateNumber && (
                    <p className="mt-1 text-sm text-red-400">{validationErrors.plateNumber}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="make" className="block text-sm font-medium text-gray-300 mb-1">
                    {t('cars.make')}*
                  </label>
                  <input
                    type="text"
                    id="make"
                    name="make"
                    value={formData.make}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 bg-gray-700 border ${validationErrors.make ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600`}
                    placeholder={t('cars.makePlaceholder')}
                  />
                  {validationErrors.make && (
                    <p className="mt-1 text-sm text-red-400">{validationErrors.make}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="model" className="block text-sm font-medium text-gray-300 mb-1">
                    {t('cars.model')}*
                  </label>
                  <input
                    type="text"
                    id="model"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 bg-gray-700 border ${validationErrors.model ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600`}
                    placeholder={t('cars.modelPlaceholder')}
                  />
                  {validationErrors.model && (
                    <p className="mt-1 text-sm text-red-400">{validationErrors.model}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="year" className="block text-sm font-medium text-gray-300 mb-1">
                      {t('cars.year')}*
                    </label>
                    <input
                      type="number"
                      id="year"
                      name="year"
                      value={formData.year}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 bg-gray-700 border ${validationErrors.year ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600`}
                      min="1990"
                      max={new Date().getFullYear() + 1}
                    />
                    {validationErrors.year && (
                      <p className="mt-1 text-sm text-red-400">{validationErrors.year}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="color" className="block text-sm font-medium text-gray-300 mb-1">
                      {t('cars.color')}*
                    </label>
                    <input
                      type="text"
                      id="color"
                      name="color"
                      value={formData.color}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 bg-gray-700 border ${validationErrors.color ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600`}
                      placeholder={t('cars.colorPlaceholder')}
                    />
                    {validationErrors.color && (
                      <p className="mt-1 text-sm text-red-400">{validationErrors.color}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-1">
                      {t('cars.type')}
                    </label>
                    <select
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="sedan">{t('cars.vehicleTypes.sedan')}</option>
                      <option value="suv">{t('cars.vehicleTypes.suv')}</option>
                      <option value="hatchback">{t('cars.vehicleTypes.hatchback')}</option>
                      <option value="crossover">{t('cars.vehicleTypes.crossover')}</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="status"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      {t('cars.status')}
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="available">{t('cars.vehicleStatuses.available')}</option>
                      <option value="rented">{t('cars.vehicleStatuses.rented')}</option>
                      <option value="maintenance">{t('cars.vehicleStatuses.maintenance')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="mileage" className="block text-sm font-medium text-gray-300 mb-1">
                    {t('cars.mileage')} ({mileageUnit})
                  </label>
                  <input
                    type="number"
                    id="mileage"
                    name="mileage"
                    value={formData.mileage}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    min="0"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="registrationExpiryDate"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      {t('cars.registrationExpiryDate')}
                    </label>
                    <input
                      type="date"
                      id="registrationExpiryDate"
                      name="registrationExpiryDate"
                      value={formData.registrationExpiryDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="insuranceExpiryDate"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      {t('cars.insuranceExpiryDate')}
                    </label>
                    <input
                      type="date"
                      id="insuranceExpiryDate"
                      name="insuranceExpiryDate"
                      value={formData.insuranceExpiryDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Rental rates and features */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold border-b border-gray-700 pb-2">
                  {t('cars.rentalRatesDescription')}
                </h2>

                <div>
                  <label htmlFor="daily" className="block text-sm font-medium text-gray-300 mb-1">
                    {t('cars.dailyRate')} ({getCurrencySymbol(company?.currency || 'USD')})*
                  </label>
                  <input
                    type="number"
                    id="daily"
                    name="rentalRate.daily"
                    value={formData.rentalRate.daily}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 bg-gray-700 border ${validationErrors.daily ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600`}
                    min="0"
                    step="0.01"
                    placeholder={t('cars.dailyRatePlaceholder')}
                  />
                  {validationErrors.daily && (
                    <p className="mt-1 text-sm text-red-400">{validationErrors.daily}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    {t('cars.priceStoredInCurrency', {
                      currency: getCurrencySymbol(company?.currency || 'USD'),
                    })}
                  </p>
                </div>

                <div>
                  <label htmlFor="weekly" className="block text-sm font-medium text-gray-300 mb-1">
                    {t('cars.weeklyRate')} ({getCurrencySymbol(company?.currency || 'USD')})
                  </label>
                  <input
                    type="number"
                    id="weekly"
                    name="rentalRate.weekly"
                    value={formData.rentalRate.weekly}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    min="0"
                    step="0.01"
                    placeholder={t('cars.weeklyRatePlaceholder')}
                  />
                  <p className="mt-1 text-xs text-gray-400">{t('cars.optionalWeeklyRate')}</p>
                </div>

                <div>
                  <label htmlFor="monthly" className="block text-sm font-medium text-gray-300 mb-1">
                    {t('cars.monthlyRate')} ({getCurrencySymbol(company?.currency || 'USD')})
                  </label>
                  <input
                    type="number"
                    id="monthly"
                    name="rentalRate.monthly"
                    value={formData.rentalRate.monthly}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    min="0"
                    step="0.01"
                    placeholder={t('cars.monthlyRatePlaceholder')}
                  />
                  <p className="mt-1 text-xs text-gray-400">{t('cars.optionalMonthlyRate')}</p>
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    {t('cars.description')}
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder={t('cars.enterVehicleDescription')}
                    rows="3"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    {t('cars.optionalAdditionalInfo')}
                  </p>
                </div>

                <div>
                  <label htmlFor="image" className="block text-sm font-medium text-gray-300 mb-1">
                    {t('cars.vehicleImage')}
                  </label>
                  <input
                    type="file"
                    id="image"
                    name="image"
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png"
                    className="hidden"
                  />
                  <div className={`flex items-center gap-4`}>
                    <label
                      htmlFor="image"
                      className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white cursor-pointer hover:bg-gray-600 transition-colors"
                    >
                      {t('cars.chooseFile')}
                    </label>
                    <span className="text-sm text-gray-400">
                      {formData.image ? formData.image.name : t('cars.noFileChosen')}
                    </span>
                  </div>
                  {formData.imagePreview && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-300 mb-1">{t('cars.preview')}:</p>
                      <img
                        src={formData.imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div
              className={`flex mt-6 border-t border-gray-700 pt-6 gap-4 ${isRTL ? 'justify-start flex-row-reverse' : 'justify-end'}`}
            >
              <button
                type="button"
                onClick={() => navigate('/cars')}
                className="px-6 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className={`px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
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
                    {t('cars.saving')}
                  </>
                ) : (
                  t('cars.saveVehicle')
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddCarPage;

// src/pages/Cars/CarEditPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../components/context/AuthContext';
import secureApi from '../../utils/secureApi';
import { hasExpiringDocuments, isDateWithinTwoWeeks } from '../../utils/carUtils';
import { useMileageDisplay } from '../../hooks/useMileageDisplay';
import { useLanguage } from '../../contexts/LanguageContext';
import { getCurrencySymbol } from '../../utils/currencySymbols';

const EditCarPage = () => {
  const { t, isRTL } = useLanguage();
  const { getMileageUnit } = useMileageDisplay();
  const mileageUnit = getMileageUnit();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Debug the router params
  useEffect(() => {
    console.log('Car ID from URL params:', id);
  }, [id]);

  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    color: '',
    type: '',
    license_plate: '',
    vin: '',
    current_mileage: '',
    daily_rate: '',
    weekly_rate: '',
    monthly_rate: '',
    registration_expiry_date: '',
    insurance_expiry_date: '',
    status: '',
    description: '',
  });

  // Get company from AuthContext for currency access
  const { company } = useContext(AuthContext);

  // Handle navigation intercepting
  useEffect(() => {
    const handleNavigation = e => {
      const target = e.target;
      const navLink = target.closest('a[href]');

      if (navLink) {
        const href = navLink.getAttribute('href');
        // Explicitly allow these navigation paths
        if (
          href === '/dashboard' ||
          href === '/cars' ||
          href === '/rentals' ||
          href === '/calendar' ||
          href === '/analytics' ||
          href === '/maintenance'
        ) {
          // Allow default behavior for these links
          return;
        }
      }
    };

    document.addEventListener('click', handleNavigation, true);

    return () => {
      document.removeEventListener('click', handleNavigation, true);
    };
  }, []);

  // Fetch car data
  useEffect(() => {
    const fetchCarDetails = async () => {
      try {
        // Check if ID is valid before fetching
        if (!id) {
          setError(t('cars.invalidCarId'));
          setLoading(false);
          return;
        }

        setLoading(true);
        console.log(`Fetching car details for ID: ${id}`);

        // Debug the API request
        console.log(`API request URL: /cars/${id}`);

        const response = await secureApi.get(`/cars/${id}`);
        console.log('API response:', response);

        if (response && response.data && response.data.encrypted_car_id) {
          // Format dates for HTML date inputs (YYYY-MM-DD)
          const formatDateForInput = dateString => {
            if (!dateString) return '';
            try {
              const date = new Date(dateString);
              return date.toISOString().split('T')[0];
            } catch (e) {
              console.error('Error formatting date:', e);
              return '';
            }
          };

          // Log car data structure for debugging
          console.log('Car data structure:', response.data);
          console.log(
            'Registration date:',
            response.data.registration_expiry || response.data.registration_expiry_date
          );
          console.log(
            'Insurance date:',
            response.data.insurance_expiry || response.data.insurance_expiry_date
          );
          console.log('VIN:', response.data.vin);

          // Clean description by removing oil change tracking data
          const cleanDescription = desc => {
            if (!desc) return '';
            // Remove oil change tracking data that looks like [OIL_CHANGE_DATA]
            const match = desc.match(/^(.*?)(\[OIL_CHANGE_DATA\].*)?$/s);
            if (match && match[1]) {
              return match[1].trim();
            }
            return desc;
          };

          // Store daily rate as-is without any conversion
          const dailyRate = response.data.daily_rate || 0;
          const weeklyRate = response.data.weekly_rate || 0;
          const monthlyRate = response.data.monthly_rate || 0;

          setFormData({
            make: response.data.make || '',
            model: response.data.model || '',
            year: response.data.year || '',
            color: response.data.color || '',
            type: response.data.type || '',
            license_plate: response.data.license_plate || '',
            vin: response.data.vin || '',
            current_mileage: response.data.current_mileage || '',
            daily_rate: dailyRate.toString(),
            weekly_rate: weeklyRate.toString(),
            monthly_rate: monthlyRate.toString(),
            registration_expiry_date: formatDateForInput(
              response.data.registration_expiry || response.data.registration_expiry_date
            ),
            insurance_expiry_date: formatDateForInput(
              response.data.insurance_expiry || response.data.insurance_expiry_date
            ),
            status: response.data.status || 'available',
            description: cleanDescription(response.data.description),
          });
        } else {
          console.error('Response or response.data is undefined:', response);
          setError(t('cars.carNotFoundError'));
        }
      } catch (err) {
        console.error('Error fetching car details:', err);
        console.error('Error details:', err.response || err.message || err);
        setError(t('cars.failedToLoadVehicleDetails'));
      } finally {
        setLoading(false);
      }
    };

    fetchCarDetails();
  }, [id, t]);

  // Handle input changes
  const handleChange = e => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async e => {
    e.preventDefault();
    e.stopPropagation();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Check for valid ID
      if (!id) {
        setError(t('cars.invalidCarIdCannotUpdate'));
        setSubmitting(false);
        return;
      }

      console.log('Starting form submission for car ID:', id);

      // Debug what we're submitting
      console.log('Form data being submitted:', formData);

      // Ensure we're sending the right data format
      const submitData = {
        ...formData,
        // Parse numeric values
        year: parseInt(formData.year, 10),
        current_mileage: parseInt(formData.current_mileage, 10),
        // Store rates as-is in company currency (no conversion)
        daily_rate: parseFloat(formData.daily_rate),
        weekly_rate: formData.weekly_rate ? parseFloat(formData.weekly_rate) : null,
        monthly_rate: formData.monthly_rate ? parseFloat(formData.monthly_rate) : null,
      };

      // Make sure the field names match the database column names
      if (formData.registration_expiry_date) {
        submitData.registration_expiry_date = formData.registration_expiry_date;
      }

      if (formData.insurance_expiry_date) {
        submitData.insurance_expiry_date = formData.insurance_expiry_date;
      }

      // Ensure all required fields are present
      const requiredFields = [
        'make',
        'model',
        'year',
        'color',
        'license_plate',
        'type',
        'status',
        'current_mileage',
        'daily_rate',
      ];
      const missingFields = requiredFields.filter(
        field => submitData[field] === undefined || submitData[field] === ''
      );

      if (missingFields.length > 0) {
        setError(t('cars.missingRequiredFields', { fields: missingFields.join(', ') }));
        setSubmitting(false);
        window.scrollTo(0, 0);
        return;
      }

      // Log what we're submitting
      console.log('Updating car with clean data:', submitData);

      // Use the API utility to update the car (it will handle FormData conversion)
      const response = await secureApi.updateCar(id, submitData);
      console.log('Update response:', response);

      // Check if this car now has expiring documents that need attention
      const updatedCar = response.data;
      const registrationExpiring = isDateWithinTwoWeeks(updatedCar.registration_expiry_date);
      const insuranceExpiring = isDateWithinTwoWeeks(updatedCar.insurance_expiry_date);

      // Special success message if documents are expiring
      if (registrationExpiring || insuranceExpiring) {
        let expiryWarning = t('cars.vehicleUpdatedSuccessfully') + ' ';
        if (registrationExpiring && insuranceExpiring) {
          expiryWarning += t('cars.warningBothExpiring');
        } else if (registrationExpiring) {
          expiryWarning += t('cars.warningRegistrationExpiring');
        } else {
          expiryWarning += t('cars.warningInsuranceExpiring');
        }
        setSuccess(expiryWarning);
      } else {
        // Regular success message
        setSuccess(t('cars.vehicleUpdatedSuccessfully'));
      }

      // Navigate back to car details after showing success message
      window.location.href = `/cars/${id}?refresh=true`;
    } catch (err) {
      console.error('Error updating car:', err);
      console.error('Error details:', err.response || err.message || err);
      setError(
        t('cars.failedToUpdateVehicle', {
          error:
            err.response?.data?.detail ||
            err.response?.data?.message ||
            err.message ||
            t('common.error'),
        })
      );
      window.scrollTo(0, 0);
    } finally {
      setSubmitting(false);
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto text-white" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Add global styles to hide number input spinners */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          input[type="number"]::-webkit-outer-spin-button,
          input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          input[type="number"] {
            -moz-appearance: textfield;
          }
        `,
        }}
      />
      {/* Breadcrumb navigation */}
      <div className="mb-4">
        <div className={`flex items-center text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            type="button"
            onClick={() => (window.location.href = '/dashboard')}
            className="text-gray-400 hover:text-blue-400 cursor-pointer"
          >
            {t('common.dashboard')}
          </button>
          <span className="mx-2 text-gray-600">/</span>
          <button
            type="button"
            onClick={() => (window.location.href = '/cars')}
            className="text-gray-400 hover:text-blue-400 cursor-pointer"
          >
            {t('cars.vehicleInventory')}
          </button>
          <span className="mx-2 text-gray-600">/</span>
          <button
            type="button"
            onClick={() => (window.location.href = `/cars/${id}`)}
            className="text-gray-400 hover:text-blue-400 cursor-pointer"
          >
            {formData.make} {formData.model}
          </button>
          <span className="mx-2 text-gray-600">/</span>
          <span className="text-white">{t('common.edit')}</span>
        </div>
      </div>

      {/* Page Title */}
      <h1 className={`text-2xl font-bold mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t('cars.editVehicle')}: {formData.make} {formData.model}
      </h1>

      {/* Error message */}
      {error && (
        <div
          className={`bg-red-900/30 text-red-200 px-4 py-3 rounded-lg mb-6 ${isRTL ? 'text-right' : 'text-left'}`}
        >
          {error}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div
          className={`${
            success.includes(t('cars.warning')) || success.includes('WARNING')
              ? 'bg-amber-900/30 text-amber-200 border border-amber-500'
              : 'bg-green-900/30 text-green-200'
          } px-4 py-3 rounded-lg mb-6 ${isRTL ? 'text-right' : 'text-left'}`}
        >
          {success}
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          {/* Basic Information Section */}
          <h2
            className={`text-xl font-semibold mb-4 text-blue-400 ${isRTL ? 'text-right' : 'text-left'}`}
          >
            {t('cars.basicInformation')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label
                htmlFor="make"
                className={`block text-sm font-medium text-gray-300 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('cars.make')}*
              </label>
              <input
                type="text"
                id="make"
                name="make"
                value={formData.make}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
                required
              />
            </div>

            <div>
              <label
                htmlFor="model"
                className={`block text-sm font-medium text-gray-300 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('cars.model')}*
              </label>
              <input
                type="text"
                id="model"
                name="model"
                value={formData.model}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
                required
              />
            </div>

            <div>
              <label
                htmlFor="year"
                className={`block text-sm font-medium text-gray-300 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('cars.year')}*
              </label>
              <input
                type="number"
                id="year"
                name="year"
                value={formData.year}
                onChange={handleChange}
                min="1900"
                max="2099"
                className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
                required
              />
            </div>

            <div>
              <label
                htmlFor="color"
                className={`block text-sm font-medium text-gray-300 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('cars.color')}
              </label>
              <input
                type="text"
                id="color"
                name="color"
                value={formData.color}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>

            <div>
              <label
                htmlFor="type"
                className={`block text-sm font-medium text-gray-300 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('cars.type')}
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <option value="">{t('cars.selectType')}</option>
                <option value="sedan">{t('cars.sedan')}</option>
                <option value="suv">{t('cars.suv')}</option>
                <option value="hatchback">{t('cars.hatchback')}</option>
                <option value="crossover">{t('cars.crossover')}</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="license_plate"
                className={`block text-sm font-medium text-gray-300 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('cars.licensePlate')}*
              </label>
              <input
                type="text"
                id="license_plate"
                name="license_plate"
                value={formData.license_plate}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
                required
              />
            </div>
          </div>

          {/* Vehicle Details Section */}
          <h2
            className={`text-xl font-semibold mb-4 text-blue-400 ${isRTL ? 'text-right' : 'text-left'}`}
          >
            {t('cars.vehicleDetails')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label
                htmlFor="vin"
                className={`block text-sm font-medium text-gray-300 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('cars.vin')}
              </label>
              <input
                type="text"
                id="vin"
                name="vin"
                value={formData.vin}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>

            <div>
              <label
                htmlFor="current_mileage"
                className={`block text-sm font-medium text-gray-300 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('cars.currentMileage')} ({mileageUnit})
              </label>
              <input
                type="number"
                id="current_mileage"
                name="current_mileage"
                value={formData.current_mileage}
                onChange={handleChange}
                min="0"
                className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>

            <div>
              <label
                htmlFor="daily_rate"
                className={`block text-sm font-medium text-gray-300 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('cars.dailyRate')} ({getCurrencySymbol(company?.currency || 'USD')})
              </label>
              <input
                type="number"
                id="daily_rate"
                name="daily_rate"
                value={formData.daily_rate}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
                placeholder={t('cars.enterDailyRate')}
              />
            </div>

            <div>
              <label
                htmlFor="weekly_rate"
                className={`block text-sm font-medium text-gray-300 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('cars.weeklyRate')} ({getCurrencySymbol(company?.currency || 'USD')})
              </label>
              <input
                type="number"
                id="weekly_rate"
                name="weekly_rate"
                value={formData.weekly_rate}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
                placeholder="350.00"
              />
              <p className={`mt-1 text-xs text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('cars.optionalWeeklyRate')}
              </p>
            </div>

            <div>
              <label
                htmlFor="monthly_rate"
                className={`block text-sm font-medium text-gray-300 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('cars.monthlyRate')} ({getCurrencySymbol(company?.currency || 'USD')})
              </label>
              <input
                type="number"
                id="monthly_rate"
                name="monthly_rate"
                value={formData.monthly_rate}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
                placeholder="1200.00"
              />
              <p className={`mt-1 text-xs text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('cars.optionalMonthlyRate')}
              </p>
            </div>

            <div>
              <label
                htmlFor="registration_expiry_date"
                className={`block text-sm font-medium text-gray-300 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('cars.registrationExpiry')}
              </label>
              <input
                type="date"
                id="registration_expiry_date"
                name="registration_expiry_date"
                value={formData.registration_expiry_date}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>

            <div>
              <label
                htmlFor="insurance_expiry_date"
                className={`block text-sm font-medium text-gray-300 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('cars.insuranceExpiry')}
              </label>
              <input
                type="date"
                id="insurance_expiry_date"
                name="insurance_expiry_date"
                value={formData.insurance_expiry_date}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>

            <div>
              <label
                htmlFor="status"
                className={`block text-sm font-medium text-gray-300 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('cars.status')}
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <option value="available">{t('common.available')}</option>
                <option value="rented">{t('common.rented')}</option>
                <option value="maintenance">{t('common.maintenance')}</option>
              </select>
            </div>
          </div>

          {/* Description Section */}
          <h2
            className={`text-xl font-semibold mb-4 text-blue-400 ${isRTL ? 'text-right' : 'text-left'}`}
          >
            {t('cars.additionalInformation')}
          </h2>
          <div className="mb-6">
            <label
              htmlFor="description"
              className={`block text-sm font-medium text-gray-300 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}
            >
              {t('cars.description')}
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
              dir={isRTL ? 'rtl' : 'ltr'}
              placeholder={t('cars.enterVehicleDescription')}
            ></textarea>
          </div>
        </div>

        {/* Form Actions */}
        <div
          className={`border-t border-gray-700 p-6 bg-gray-900 flex gap-4 ${isRTL ? 'flex-row-reverse justify-start' : 'justify-end'}`}
        >
          <button
            type="button"
            onClick={() => (window.location.href = `/cars/${id}`)}
            className="px-6 py-2 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 rounded-md text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center transition-colors"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <svg
                  className={`animate-spin h-4 w-4 text-white ${isRTL ? 'ml-2' : '-ml-1 mr-2'}`}
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
                {t('cars.savingChanges')}
              </>
            ) : (
              t('cars.saveChanges')
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditCarPage;


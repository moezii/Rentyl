// src/pages/Rentals/CreateRentalPage.jsx TEST
import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { AuthContext } from '../../components/context/AuthContext';
import secureApi from '../../utils/secureApi';
import DefaultCarImg from '../../assets/DefaultCarImg.png';
import { useMileageDisplay } from '../../hooks/useMileageDisplay';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatPrice, getCurrencySymbol } from '../../utils/currencySymbols';
import { calculateOptimalRentalPrice, formatPriceBreakdown } from '../../utils/priceCalculation';

const CreateRentalPage = () => {
  const { getMileageUnit } = useMileageDisplay();
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { carId } = useParams();
  const location = useLocation();
  const preSelectedCar = location.state?.preSelectedCar;
  const returnedFromClient = location.state?.returnedFromClient;
  const newClientId = location.state?.newClientId;
  const restoredFormData = location.state?.restoredFormData;
  const restoredSelectedCar = location.state?.restoredSelectedCar;
  const restoredSearchTerm = location.state?.restoredSearchTerm;

  // Debug logging
  useEffect(() => {
    if (returnedFromClient) {
      console.log('=== RETURNED FROM CLIENT CREATION ===');
      console.log('returnedFromClient:', returnedFromClient);
      console.log('newClientId:', newClientId);
      console.log('restoredFormData:', restoredFormData);
      console.log('restoredSelectedCar:', restoredSelectedCar);
      console.log('restoredSearchTerm:', restoredSearchTerm);
      console.log('location.state:', location.state);
    }
  }, [
    returnedFromClient,
    newClientId,
    restoredFormData,
    restoredSelectedCar,
    restoredSearchTerm,
    location.state,
  ]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [cars, setCars] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);
  const [showCarDetails, setShowCarDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [formData, setFormData] = useState({
    car_id: '', // Will be set when car is selected
    client_id: '',
    rental_start_date: new Date().toISOString().split('T')[0],
    rental_start_time: new Date().toTimeString().slice(0, 5), // HH:MM format
    rental_end_date: '',
    rental_end_time: '00:00',
    total_days: 1,
    daily_rate: 0,
    final_price: 0,
    amount_paid: 0,
    mileage_before: 0,
    mileage_after: null,
    additional_charges: 0,
    additional_charges_description: '',
    payment_status: 'unpaid',
  });

  // Get company from AuthContext for currency access
  const { company } = useContext(AuthContext);

  // Active currency helper
  const getActiveCurrency = () => selectedCar?.currency || company?.currency || '';

  // Handle clicking outside of dropdown
  useEffect(() => {
    const handleClickOutside = event => {
      if (showDropdown && !event.target.closest('.car-dropdown')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Clear success message after displaying it
  useEffect(() => {
    if (location.state?.message) {
      const timer = setTimeout(() => {
        // Clear the message from history state
        navigate(location.pathname, { replace: true });
      }, 5000); // Clear after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [location.state?.message, navigate, location.pathname]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch available cars
        console.log('Fetching cars for create rental form...');
        const carsResponse = await secureApi.get('/cars/');
        if (carsResponse.data && Array.isArray(carsResponse.data)) {
          console.log(`Received ${carsResponse.data.length} cars from API`);

          // Process cars to ensure consistent license plate data
          const processedCars = carsResponse.data.map(car => ({
            ...car,
            license_plate:
              car.license_plate || car.plate_number || car.plateNumber || t('common.notAvailable'),
            // Keep both car_id (integer) and encrypted_car_id (string) as-is from backend
          }));

          // Only show available cars
          const availableCars = processedCars.filter(car => car.status === 'available');
          console.log(`${availableCars.length} cars with available status`);

          // Log license plates for debugging
          availableCars.forEach(car => {
            console.log(
              `Car ID: ${car.car_id}, Make: ${car.make}, Model: ${car.model}, Plate: ${car.license_plate}`
            );
          });

          setCars(availableCars);

          // Handle different scenarios for car selection
          if (returnedFromClient && restoredSelectedCar) {
            // Returning from client creation - restore the previously selected car
            console.log('Restoring car selection after client creation:', restoredSelectedCar);
            const car = availableCars.find(c => c.car_id === restoredSelectedCar.car_id);
            if (car) {
              selectCar(car);
              // Restore search term if available
              if (restoredSearchTerm) {
                setSearchTerm(restoredSearchTerm);
              }
            }
          } else if (preSelectedCar && preSelectedCar.car_id) {
            // Check for preSelectedCar from state first
            console.log('Using pre-selected car from navigation state:', preSelectedCar);
            selectCar(preSelectedCar);
          } else if (carId) {
            // If no preSelectedCar but carId is provided (encrypted), find car by encrypted_car_id
            console.log(`Looking for car with encrypted ID: ${carId}`);
            const car = availableCars.find(c => c.encrypted_car_id === carId);
            if (car) {
              console.log(`Found car to select:`, car);
              selectCar(car);
            } else {
              console.log(`Car with encrypted ID ${carId} not found or not available`);
              setError(t('common.carNotAvailable', { id: carId }));
            }
          }
        } else {
          console.error('Invalid cars data format:', carsResponse.data);
          setError(t('common.couldNotLoadCars'));
        }

        // Fetch clients
        let clientsResponse = await secureApi.get('/clients/');

        // If returning from client creation, wait a bit and refetch to ensure new client is included
        if (returnedFromClient && newClientId) {
          console.log('Returned from client creation, waiting and refetching clients...');
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
          clientsResponse = await secureApi.get('/clients/'); // Refetch
          console.log('Refetched clients after client creation');
        }

        if (clientsResponse.data && Array.isArray(clientsResponse.data)) {
          console.log('=== CLIENTS DATA FROM API ===');
          console.log('Total clients:', clientsResponse.data.length);
          console.log('First client full object:', clientsResponse.data[0]);
          clientsResponse.data.forEach((client, idx) => {
            console.log(`Client ${idx}: ${client.name}`);
            console.log('  - client_id:', client.client_id, '(type:', typeof client.client_id, ')');
            console.log('  - encrypted_client_id:', client.encrypted_client_id);
            console.log('  - Has client_id?', 'client_id' in client);
            console.log('  - client_id === undefined?', client.client_id === undefined);
          });

          setClients(clientsResponse.data);

          // If returning from client creation, restore form data and select new client
          if (returnedFromClient) {
            console.log('Processing return from client creation...');

            if (restoredFormData) {
              console.log('Restoring form data after client creation:', restoredFormData);
              setFormData(restoredFormData);
            }

            // Select the newly created client
            if (newClientId) {
              console.log('Selecting newly created client:', newClientId);
              // Check if the client exists in the fetched clients
              const clientExists = clientsResponse.data.find(
                client => client.client_id === parseInt(newClientId)
              );
              if (clientExists) {
                console.log('Client found in list, selecting:', clientExists);
                setFormData(prev => ({ ...prev, client_id: parseInt(newClientId) }));
              } else {
                console.log('Client not found in list yet, client ID:', newClientId);
                console.log(
                  'Available clients:',
                  clientsResponse.data.map(c => ({ id: c.client_id, name: c.name }))
                );
                // Still set it - it might be there but with a slight delay
                setFormData(prev => ({ ...prev, client_id: parseInt(newClientId) }));
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(t('common.failedToLoadData'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    carId,
    preSelectedCar,
    returnedFromClient,
    restoredFormData,
    restoredSelectedCar,
    restoredSearchTerm,
    newClientId,
  ]);

  // Helper function to select a car and update form data
  const selectCar = car => {
    if (!car || !car.car_id) {
      console.error(t('common.invalidCarData'), car);
      return;
    }

    setSelectedCar(car);
    setShowCarDetails(true);
    setSearchTerm(`${car.make} ${car.model} - ${car.license_plate}`);
    setShowDropdown(false);

    // Set daily rate to 0 if undefined to avoid NaN issues
    const dailyRate = car.daily_rate || 0;

    // Set the initial mileage to the car's current mileage
    const initialMileage = car.current_mileage || 0;

    setFormData(prev => ({
      ...prev,
      car_id: car.car_id, // Use the integer car_id, not encrypted_car_id
      daily_rate: dailyRate,
      mileage_before: initialMileage,
    }));

    // Use current values or defaults for updating end date
    const startDate = formData.rental_start_date || new Date().toISOString().split('T')[0];
    const startTime = formData.rental_start_time || '00:00';
    const days = formData.total_days || 1;

    updateEndDate(startDate, startTime, days, dailyRate);
  };

  // Filter cars based on search term
  const filteredCars = cars.filter(car => {
    const searchLower = searchTerm.toLowerCase();
    const carText = `${car.make} ${car.model} ${car.license_plate}`.toLowerCase();
    return carText.includes(searchLower);
  });

  // Update end date based on rental duration
  const updateEndDate = (startDate, startTime, days, dailyRate) => {
    if (!startDate) {
      console.error('Start date is required to calculate end date');
      return;
    }

    try {
      // Ensure days is a positive integer
      let daysInt = parseInt(days, 10) || 1;
      if (daysInt < 1) daysInt = 1;

      // Parse the date components to avoid timezone issues
      const [year, month, day] = startDate.split('-').map(Number);
      const [hours, minutes] = (startTime || '00:00').split(':').map(Number);

      // Create start datetime using UTC to avoid timezone shifts
      const start = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
      if (isNaN(start.getTime())) {
        console.error('Invalid start date/time:', startDate, startTime);
        return;
      }

      // Calculate end datetime by adding the number of days (1 day = 24 hours)
      let end = new Date(start);
      end.setUTCDate(start.getUTCDate() + daysInt);

      // Total days represents the rental duration in 24-hour periods
      const diffDays = daysInt;

      // Calculate final price using optimal pricing (monthly + weekly + daily)
      const rate = parseFloat(dailyRate) || 0;
      const weeklyRate = selectedCar?.weekly_rate || null;
      const monthlyRate = selectedCar?.monthly_rate || null;

      // Use the optimal pricing calculation
      const priceCalculation = calculateOptimalRentalPrice(diffDays, rate, weeklyRate, monthlyRate);
      const baseFinalPrice = priceCalculation.totalCost;

      setFormData(prev => {
        // Add any existing additional charges (already in company/car currency)
        const additionalChargesAmount = parseFloat(prev.additional_charges) || 0;
        const finalPrice = baseFinalPrice + additionalChargesAmount;

        // Format dates back to local date strings (YYYY-MM-DD)
        const endDateStr = end.toISOString().split('T')[0];
        const endTimeStr = `${String(end.getUTCHours()).padStart(2, '0')}:${String(end.getUTCMinutes()).padStart(2, '0')}`;

        return {
          ...prev,
          rental_end_date: endDateStr,
          rental_end_time: endTimeStr,
          total_days: diffDays,
          final_price: finalPrice,
        };
      });
    } catch (e) {
      console.error('Error calculating end date:', e);
    }
  };

  // Calculate total days from end date (reverse of updateEndDate)
  const updateTotalDays = (startDate, startTime, endDate, endTime, dailyRate) => {
    try {
      if (!startDate || !endDate) return;

      // Parse dates with times
      const start = new Date(`${startDate}T${startTime || '00:00'}:00Z`);
      const end = new Date(`${endDate}T${endTime || '00:00'}:00Z`);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

      // Calculate difference in days
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Ensure at least 1 day
      const totalDays = Math.max(1, diffDays);

      // Calculate final price using optimal pricing
      const rate = parseFloat(dailyRate) || 0;
      const weeklyRate = selectedCar?.weekly_rate || null;
      const monthlyRate = selectedCar?.monthly_rate || null;

      const priceCalculation = calculateOptimalRentalPrice(
        totalDays,
        rate,
        weeklyRate,
        monthlyRate
      );
      const baseFinalPrice = priceCalculation.totalCost;

      setFormData(prev => {
        const additionalChargesAmount = parseFloat(prev.additional_charges) || 0;
        const finalPrice = baseFinalPrice + additionalChargesAmount;

        return {
          ...prev,
          total_days: totalDays,
          final_price: finalPrice,
        };
      });
    } catch (e) {
      console.error('Error calculating total days:', e);
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!formData.car_id || formData.car_id === '') {
      errors.car_id = t('common.pleaseSelectVehicle');
    }

    if (!formData.client_id || formData.client_id === '') {
      errors.client_id = t('common.pleaseSelectClient');
    }

    if (!formData.rental_start_date) {
      errors.rental_start_date = t('common.startDateRequired');
    }

    if (!formData.total_days || formData.total_days < 1) {
      errors.total_days = t('common.totalDaysMinimum');
    }

    if (!formData.daily_rate || formData.daily_rate <= 0) {
      errors.daily_rate = t('common.dailyRateMinimum');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async e => {
    e.preventDefault();

    console.log('=== FORM SUBMISSION ===');
    console.log('formData:', formData);
    console.log('formData.car_id:', formData.car_id, typeof formData.car_id);
    console.log('formData.client_id:', formData.client_id, typeof formData.client_id);

    // Validate form
    if (!validateForm()) {
      console.log('Validation failed!');
      setError(t('common.fillRequiredFields'));
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Format datetime as ISO strings (YYYY-MM-DDTHH:MM:SS.sssZ)
      const formatDateTimeForAPI = (dateString, timeString) => {
        if (!dateString) return null;
        // Combine date and time, then create ISO string
        const datetime = new Date(`${dateString}T${timeString || '00:00'}:00`);
        return datetime.toISOString();
      };

      // Validate IDs are numbers before sending
      const carIdNum = parseInt(formData.car_id, 10);
      const clientIdNum = parseInt(formData.client_id, 10);

      if (isNaN(carIdNum)) {
        setError(t('common.pleaseSelectVehicle'));
        return;
      }

      if (isNaN(clientIdNum)) {
        setError(t('common.pleaseSelectClient'));
        return;
      }

      // Match database column names exactly
      const rentalData = {
        car_id: carIdNum,
        client_id: clientIdNum,
        rental_start_date: formatDateTimeForAPI(
          formData.rental_start_date,
          formData.rental_start_time
        ),
        rental_end_date: formatDateTimeForAPI(formData.rental_end_date, formData.rental_end_time),
        total_days: parseInt(formData.total_days, 10),
        daily_rate: parseFloat(formData.daily_rate),
        final_price: parseFloat(formData.final_price),
        amount_paid: parseFloat(formData.amount_paid) || 0,
        mileage_before: parseInt(formData.mileage_before) || 0,
        payment_status: formData.payment_status,
      };

      // If additional charges are set, include them
      if (formData.additional_charges > 0) {
        rentalData.additional_charges = parseFloat(formData.additional_charges);
        rentalData.additional_charges_description = formData.additional_charges_description;
      }

      console.log('Submitting rental data:', rentalData);

      // Use api helper for better error handling
      try {
        const response = await secureApi.post('/rentals/', rentalData);
        console.log('Rental created successfully!', response.data);
        navigate('/rentals', { state: { message: t('rentals.rentalCreatedSuccessfully') } });
      } catch (apiError) {
        // Log the detailed error information
        console.error('API Error details:', apiError);
        console.error('Request data that caused error:', rentalData);

        if (apiError.response) {
          console.error('Error response:', apiError.response.data);
          console.error('Status code:', apiError.response.status);

          // Handle different error types
          if (apiError.response.status === 404) {
            setError(t('common.resourceNotFound'));
          } else if (apiError.response.status === 400) {
            setError(
              t('common.badRequest', {
                detail: apiError.response.data.detail || t('common.checkFormData'),
              })
            );
          } else if (apiError.response.status === 422) {
            setError(
              t('common.validationError', {
                detail: apiError.response.data.detail || t('common.checkFormFields'),
              })
            );
          } else {
            setError(
              t('common.failedToCreateRental', {
                detail: apiError.response.data.detail || t('common.serverError'),
              })
            );
          }
        } else {
          setError(
            t('common.networkError', { message: apiError.message || t('common.checkConnection') })
          );
        }
      }
    } catch (err) {
      console.error('Error creating rental:', err);
      setError(t('rentals.failedToCreateRental'));
    } finally {
      setSaving(false);
    }
  };

  // Function to get car image based on make/model
  const getCarImage = car => {
    if (!car) return null;

    // If car has an image_url, use it
    if (car.image_url) {
      return car.image_url;
    }

    // Return default image
    return DefaultCarImg;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
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
      <div
        className={`p-4 md:p-8 max-w-4xl mx-auto text-white ${isRTL ? 'text-right' : 'text-left'}`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="mb-6">
          <h1 className={`text-2xl font-bold ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('rentals.createNewRental')}
          </h1>
          <p className={`text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('rentals.fillDetailsToCreate')}
          </p>
        </div>

        {error && (
          <div
            className={`bg-red-900/30 text-red-200 px-4 py-3 rounded-lg mb-6 ${isRTL ? 'text-right' : 'text-left'}`}
          >
            {error}
          </div>
        )}

        {location.state?.message && (
          <div
            className={`bg-green-900/30 text-green-200 px-4 py-3 rounded-lg mb-6 ${isRTL ? 'text-right' : 'text-left'}`}
          >
            {location.state.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg shadow-lg p-6">
          {/* Select Car */}
          <div className="mb-6">
            <label
              className={`block text-sm font-medium text-gray-300 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}
            >
              {t('rentals.selectVehicle')} <span className="text-red-400">*</span>
            </label>

            {/* Clear selection button - only show if a car is selected */}
            {formData.car_id && (
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    car_id: '',
                    daily_rate: 0,
                    final_price: 0,
                  }));
                  setSelectedCar(null);
                  setShowCarDetails(false);
                  setSearchTerm('');
                  setShowDropdown(false);
                }}
                className={`mb-3 px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded border border-gray-600 hover:bg-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('common.clearSelection')}
              </button>
            )}

            {cars.length === 0 ? (
              <p className={`text-yellow-500 text-sm mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('rentals.noAvailableVehicles')}
              </p>
            ) : (
              <div className="relative car-dropdown">
                {/* Searchable dropdown input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t('cars.searchVehicles')}
                    value={searchTerm}
                    onChange={e => {
                      setSearchTerm(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className={`w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 ${isRTL ? 'text-right pr-10' : 'text-left pl-4 pr-10'}`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                  <div
                    className={`absolute inset-y-0 ${isRTL ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center pointer-events-none`}
                  >
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
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

                {/* Dropdown list */}
                {showDropdown && filteredCars.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCars.map(car => (
                      <div
                        key={car.car_id}
                        onClick={() => selectCar(car)}
                        className={`px-4 py-3 cursor-pointer hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0 ${
                          formData.car_id === car.car_id ? 'bg-blue-900/30 border-blue-500' : ''
                        }`}
                      >
                        <div
                          className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <div className={isRTL ? 'text-right' : 'text-left'}>
                            <p className="font-medium text-white">
                              {car.make} {car.model}
                            </p>
                            <p className="text-sm text-gray-400">
                              {t('rentals.licensePlate')}:{' '}
                              {car.license_plate && car.license_plate !== t('common.notAvailable')
                                ? car.license_plate
                                : t('common.noPlateAssigned')}
                            </p>
                          </div>
                          {formData.car_id === car.car_id && (
                            <div className="bg-blue-500 rounded-full p-1">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 text-white"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* No results message */}
                {showDropdown && searchTerm && filteredCars.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg">
                    <div
                      className={`px-4 py-3 text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      {t('cars.noVehiclesFound')}
                    </div>
                  </div>
                )}
              </div>
            )}

            {formErrors.car_id && (
              <p className={`text-red-500 text-xs mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {formErrors.car_id}
              </p>
            )}
          </div>

          {/* Selected Car Details - With car image */}
          {selectedCar && (
            <div className="mb-6 bg-gradient-to-br from-gray-900 to-black rounded-lg p-4 border border-gray-600">
              <h3
                className={`text-lg font-medium mb-2 text-blue-300 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('rentals.selectedVehicle')}
              </h3>
              <div className={`flex flex-col md:flex-row ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                <div
                  className={`w-full md:w-1/3 flex justify-center mb-4 md:mb-0 ${isRTL ? 'md:ml-4' : 'md:mr-4'}`}
                >
                  {selectedCar.image_url ? (
                    <img
                      src={selectedCar.image_url}
                      alt={`${selectedCar.make} ${selectedCar.model}`}
                      className="w-40 h-40 object-cover rounded-lg"
                      onError={e => {
                        e.target.onerror = null;
                        e.target.src = DefaultCarImg;
                      }}
                    />
                  ) : (
                    <img
                      src={DefaultCarImg}
                      alt={t('common.defaultCar')}
                      className="w-40 h-40 object-cover rounded-lg"
                    />
                  )}
                </div>
                <div className="w-full md:w-2/3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="text-gray-400 text-sm">{t('rentals.carId')}</p>
                      <p className="font-medium">{selectedCar.car_id}</p>
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="text-gray-400 text-sm">
                        {t('cars.make')} & {t('cars.model')}
                      </p>
                      <p className="font-medium">
                        {selectedCar.make} {selectedCar.model}
                      </p>
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="text-gray-400 text-sm">{t('rentals.licensePlate')}</p>
                      <p className="font-medium">{selectedCar.license_plate}</p>
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="text-gray-400 text-sm">{t('rentals.dailyRate')}</p>
                      <p className="font-medium">
                        {formatPrice(selectedCar.daily_rate || 0, getActiveCurrency())}/
                        {t('common.day')}
                      </p>
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="text-gray-400 text-sm">{t('cars.year')}</p>
                      <p className="font-medium">{selectedCar.year || t('common.notAvailable')}</p>
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="text-gray-400 text-sm">{t('rentals.vehicleStatus')}</p>
                      <p className="font-medium text-green-400">{t('cars.available')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Select Client */}
          <div className="mb-6">
            <div
              className={`flex justify-between items-center mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <label
                className={`text-sm font-medium text-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('rentals.selectClient')} <span className="text-red-400">*</span>
              </label>
              <Link
                to="/clients/add"
                state={{
                  returnTo: '/rentals/new',
                  rentalFormData: formData,
                  selectedCar: selectedCar,
                  searchTerm: searchTerm,
                }}
                className={`bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                {t('clients.addClient')}
              </Link>
            </div>
            <select
              value={formData.client_id}
              onChange={e => {
                console.log('Client selected:', e.target.value);
                console.log('Client value type:', typeof e.target.value);
                console.log(
                  'Available clients:',
                  clients.map(c => ({ id: c.client_id, name: c.name }))
                );
                setFormData(prev => ({ ...prev, client_id: e.target.value }));
              }}
              className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                formErrors.client_id ? 'border-red-500' : 'border-gray-600'
              } ${isRTL ? 'text-right' : 'text-left'}`}
              dir={isRTL ? 'rtl' : 'ltr'}
              required
            >
              <option value="">{t('common.selectClient')}</option>
              {clients.map(client => (
                <option key={client.encrypted_client_id} value={client.client_id}>
                  {client.name} ({client.phone_number})
                </option>
              ))}
            </select>
            {formErrors.client_id && (
              <p className={`text-red-500 text-xs mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {formErrors.client_id}
              </p>
            )}
          </div>

          {/* Rental Details */}
          <div className="space-y-6 mb-6">
            {/* Section: Rental Period */}
            <div className="bg-gray-800/50 rounded-lg p-5 border border-gray-700">
              <h3
                className={`text-lg font-semibold text-white mb-4 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('rentals.rentalDuration')}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Start Date & Time */}
                <div>
                  <div
                    className={`flex justify-between items-center mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <label
                      className={`text-sm font-medium text-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      {t('rentals.rentalStartDate')} <span className="text-red-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const date = now.toISOString().split('T')[0];
                        const time = now.toTimeString().slice(0, 5);
                        setFormData(prev => ({
                          ...prev,
                          rental_start_date: date,
                          rental_start_time: time,
                        }));
                        updateEndDate(date, time, formData.total_days || 1, formData.daily_rate);
                      }}
                      className={`bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Set to Now
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={formData.rental_start_date}
                      onChange={e => {
                        const startDate = e.target.value;
                        setFormData(prev => ({ ...prev, rental_start_date: startDate }));
                        updateEndDate(
                          startDate,
                          formData.rental_start_time,
                          formData.total_days || 1,
                          formData.daily_rate
                        );
                      }}
                      className={`flex-1 px-4 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600 ${formErrors.rental_start_date ? 'border-red-500' : 'border-gray-600'} ${isRTL ? 'text-right' : 'text-left'}`}
                      dir={isRTL ? 'rtl' : 'ltr'}
                      required
                    />
                    <input
                      type="time"
                      value={formData.rental_start_time}
                      onChange={e => {
                        const startTime = e.target.value;
                        setFormData(prev => ({ ...prev, rental_start_time: startTime }));
                        updateEndDate(
                          formData.rental_start_date,
                          startTime,
                          formData.total_days || 1,
                          formData.daily_rate
                        );
                      }}
                      className={`w-32 px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600 ${formErrors.rental_start_date ? 'border-red-500' : 'border-gray-600'} ${isRTL ? 'text-right' : 'text-left'}`}
                      dir={isRTL ? 'rtl' : 'ltr'}
                      required
                    />
                  </div>
                  {formErrors.rental_start_date && (
                    <p
                      className={`text-red-500 text-xs mt-1 ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      {formErrors.rental_start_date}
                    </p>
                  )}
                </div>

                {/* Total Days */}
                <div>
                  <label
                    className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t('rentals.totalDays')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.total_days || 1}
                    onChange={e => {
                      const days = parseInt(e.target.value) || 1;
                      setFormData(prev => ({ ...prev, total_days: days }));
                      updateEndDate(
                        formData.rental_start_date,
                        formData.rental_start_time,
                        days,
                        formData.daily_rate
                      );
                    }}
                    className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600 ${formErrors.total_days ? 'border-red-500' : 'border-gray-600'} ${isRTL ? 'text-right' : 'text-left'}`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    required
                  />
                  {formErrors.total_days && (
                    <p
                      className={`text-red-500 text-xs mt-1 ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      {formErrors.total_days}
                    </p>
                  )}
                </div>

                {/* End Date & Time (Editable - syncs with Total Days) */}
                <div className="md:col-span-2">
                  <label
                    className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t('rentals.rentalEndDate')} <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={formData.rental_end_date}
                      onChange={e => {
                        const endDate = e.target.value;
                        setFormData(prev => ({ ...prev, rental_end_date: endDate }));
                        updateTotalDays(
                          formData.rental_start_date,
                          formData.rental_start_time,
                          endDate,
                          formData.rental_end_time,
                          formData.daily_rate
                        );
                      }}
                      className={`flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600 ${isRTL ? 'text-right' : 'text-left'}`}
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                    <input
                      type="time"
                      value={formData.rental_end_time}
                      onChange={e => {
                        const endTime = e.target.value;
                        setFormData(prev => ({ ...prev, rental_end_time: endTime }));
                        updateTotalDays(
                          formData.rental_start_date,
                          formData.rental_start_time,
                          formData.rental_end_date,
                          endTime,
                          formData.daily_rate
                        );
                      }}
                      className={`w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600 ${isRTL ? 'text-right' : 'text-left'}`}
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                  </div>
                  <p className={`text-xs text-gray-400 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Syncs automatically with Total Days
                  </p>
                </div>
              </div>
            </div>

            {/* Section: Pricing Information */}
            <div className="bg-gray-800/50 rounded-lg p-5 border border-gray-700">
              <h3
                className={`text-lg font-semibold text-white mb-4 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('rentals.costBreakdown')}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Price Breakdown - Shows actual calculation */}
                <div className="md:col-span-2">
                  <label
                    className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t('rentals.priceBreakdown')}
                  </label>
                  <div
                    className={`w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {formData.total_days > 0 && selectedCar ? (
                      (() => {
                        try {
                          const calc = calculateOptimalRentalPrice(
                            formData.total_days,
                            selectedCar.daily_rate || 0,
                            selectedCar.weekly_rate,
                            selectedCar.monthly_rate
                          );
                          return (
                            <div>
                              <div className="font-medium text-blue-400">
                                {formatPriceBreakdown(
                                  calc.breakdown,
                                  price => formatPrice(price, getActiveCurrency()),
                                  getActiveCurrency()
                                )}
                              </div>
                              <div className="text-sm text-gray-400 mt-1">
                                {formData.total_days}{' '}
                                {formData.total_days === 1
                                  ? t('rentals.days').slice(0, -1)
                                  : t('rentals.days')}{' '}
                                • Base Cost: {formatPrice(calc.totalCost, getActiveCurrency())}
                              </div>
                            </div>
                          );
                        } catch (error) {
                          return <span className="text-gray-400">{t('common.notAvailable')}</span>;
                        }
                      })()
                    ) : (
                      <span className="text-gray-400">
                        {!selectedCar
                          ? t('rentals.pleaseSelectVehicle')
                          : t('rentals.pleaseEnterStartDate')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Additional Charges */}
                <div>
                  <label
                    className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t('rentals.additionalCharges')}{' '}
                    {getActiveCurrency() ? `(${getCurrencySymbol(getActiveCurrency())})` : ''}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.additional_charges}
                    onChange={e => {
                      const charges = parseFloat(e.target.value) || 0;
                      // Recalculate with optimal pricing
                      const rate = parseFloat(formData.daily_rate) || 0;
                      const weeklyRate = selectedCar?.weekly_rate || null;
                      const monthlyRate = selectedCar?.monthly_rate || null;
                      const priceCalculation = calculateOptimalRentalPrice(
                        formData.total_days,
                        rate,
                        weeklyRate,
                        monthlyRate
                      );
                      const newFinalPrice = priceCalculation.totalCost + charges;

                      setFormData(prev => ({
                        ...prev,
                        additional_charges: charges,
                        final_price: newFinalPrice,
                      }));
                    }}
                    className={`w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600 ${isRTL ? 'text-right' : 'text-left'}`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>

                {/* Additional Charges Description */}
                <div className="md:col-span-2">
                  <label
                    className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t('rentals.additionalChargesDescription')}
                  </label>
                  <input
                    type="text"
                    value={formData.additional_charges_description}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        additional_charges_description: e.target.value,
                      }))
                    }
                    className={`w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600 ${isRTL ? 'text-right' : 'text-left'}`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    placeholder={t('rentals.description')}
                  />
                </div>

                {/* Final Price (Read-only, highlighted) */}
                <div className="md:col-span-2">
                  <label
                    className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t('rentals.finalPrice')}
                  </label>
                  <div
                    className={`w-full px-4 py-3 bg-blue-900/30 border border-blue-600 rounded-lg text-white font-bold text-lg ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {formatPrice(formData.final_price || 0, getActiveCurrency())}
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Payment Information */}
            <div className="bg-gray-800/50 rounded-lg p-5 border border-gray-700">
              <h3
                className={`text-lg font-semibold text-white mb-4 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('rentals.paymentStatusLabel')}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Amount Paid */}
                <div>
                  <label
                    className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t('rentals.amountPaid')}{' '}
                    {getActiveCurrency() ? `(${getCurrencySymbol(getActiveCurrency())})` : ''}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount_paid}
                    onChange={e => {
                      const paid = parseFloat(e.target.value) || 0;
                      let paymentStatus = 'unpaid';
                      if (paid >= formData.final_price) {
                        paymentStatus = 'paid';
                      } else if (paid > 0) {
                        paymentStatus = 'partially_paid';
                      }
                      setFormData(prev => ({
                        ...prev,
                        amount_paid: paid,
                        payment_status: paymentStatus,
                      }));
                    }}
                    className={`w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600 ${isRTL ? 'text-right' : 'text-left'}`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>

                {/* Payment Status */}
                <div>
                  <label
                    className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t('rentals.paymentStatusLabel')}
                  </label>
                  <select
                    value={formData.payment_status}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, payment_status: e.target.value }))
                    }
                    className={`w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600 ${isRTL ? 'text-right' : 'text-left'}`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  >
                    <option value="unpaid">{t('rentals.unpaid')}</option>
                    <option value="partially_paid">{t('rentals.partiallyPaid')}</option>
                    <option value="paid">{t('rentals.paidInFull')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section: Additional Information */}
            <div className="bg-gray-800/50 rounded-lg p-5 border border-gray-700">
              <h3
                className={`text-lg font-semibold text-white mb-4 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('rentals.additionalNotes')}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Initial Mileage */}
                <div>
                  <label
                    className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t('rentals.initialMileage')} ({getMileageUnit()})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.mileage_before}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        mileage_before: parseInt(e.target.value) || 0,
                      }))
                    }
                    className={`w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600 ${isRTL ? 'text-right' : 'text-left'}`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>

                {/* Notes - Full width */}
                <div className="md:col-span-2">
                  <label
                    className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t('rentals.notes')}
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows="3"
                    className={`w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none ${isRTL ? 'text-right' : 'text-left'}`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    placeholder={t('rentals.additionalNotes')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} justify-end gap-4 mt-8`}>
            <Link
              to="/rentals"
              className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              {t('common.cancel')}
            </Link>
            <button
              type="submit"
              disabled={saving}
              className={`px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center ${saving ? 'opacity-70 cursor-not-allowed' : ''} ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              {saving ? (
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
                  {t('common.saving')}
                </>
              ) : (
                t('rentals.createRental')
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default CreateRentalPage;

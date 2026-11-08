// src/pages/Cars/CarDetailsPage.jsx - COMPLETE VERSION WITH OIL CHANGE FIXES
import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import secureApi from '../../utils/secureApi';
import { useMileageDisplay } from '../../hooks/useMileageDisplay';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatPrice } from '../../utils/currencySymbols';
import axios from 'axios';
import MaintenanceHistoryTab from '../Maintenance/MaintenanceHistoryTab';
import ExpiryAlert from '../../components/ExpiryAlert';
import OilChangeAlert from '../../components/OilChangeAlert';
import {
  needsOilChange,
  getAttentionClassName,
  extractOilChangeData,
  hasExpiringDocuments,
} from '../../utils/carUtils';
import DiagnosticCarBorder from '../../components/DiagnosticCarBorder';
import DefaultCarImg from '../../assets/DefaultCarImg.png';

const CarDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { formatMileageValue } = useMileageDisplay();
  const { t, isRTL } = useLanguage();
  const [car, setCar] = useState(null);
  const [rentalHistory, setRentalHistory] = useState([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [loadingMaintenance, setLoadingMaintenance] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  const [companyCurrency, setCompanyCurrency] = useState('');

  // Oil change tracking modal state
  const [showOilChangeModal, setShowOilChangeModal] = useState(false);
  const [oilChangeMileage, setOilChangeMileage] = useState('');
  const [oilChangeInterval, setOilChangeInterval] = useState('10000');
  const [isStartingTracking, setIsStartingTracking] = useState(false);

  useEffect(() => {
    // Set dark theme
    document.documentElement.classList.add('dark');
    document.body.className = 'bg-gray-900 text-white';

    return () => {
      document.body.className = '';
    };
  }, []);

  // Function to refresh car details after updates
  const refreshCarDetails = async () => {
    try {
      setLoading(true);
      console.log(`Refreshing car details for ID: ${id}`);
      const response = await secureApi.get(`/cars/${id}`);

      if (response.data) {
        const rawData = response.data;

        const carData = {
          ...rawData,
          encrypted_car_id: rawData.encrypted_car_id || '',
          current_mileage: parseInt(rawData.current_mileage) || 0,
          last_oil_change_mileage: parseInt(rawData.last_oil_change_mileage) || 0,
          oil_change_interval: parseInt(rawData.oil_change_interval) || 10000,
          oil_change_tracking: rawData.oil_change_tracking || false,
        };

        if (!carData.encrypted_car_id) {
          setError(t('cars.failedToLoadVehicleDetails'));
          setCar(null);
          setLoading(false);
          return;
        }

        setCar(carData);
        setLastRefreshTime(Date.now());
      }
    } catch (error) {
      console.error('Error refreshing car details:', error);
      setError('Failed to refresh car details');
    } finally {
      setLoading(false);
    }
  };

  // Listen for focus event to refresh data when returning to the page
  useEffect(() => {
    const handleFocus = () => {
      if (Date.now() - lastRefreshTime > 1000) {
        refreshCarDetails();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [lastRefreshTime]);

  // Check for refresh signal from navigation
  useEffect(() => {
    if (location.state?.refresh) {
      console.log(
        'Refresh signal received from navigation with timestamp:',
        location.state.timestamp
      );
      refreshCarDetails();
    }
  }, [location.state?.refresh, location.state?.timestamp]);

  // Force refresh on component mount
  useEffect(() => {
    refreshCarDetails();
  }, []);

  useEffect(() => {
    const fetchCarDetails = async () => {
      try {
        setLoading(true);
        window.cachedClients = window.cachedClients || {};
        const response = await secureApi.get(`/cars/${id}`);
        if (response.data) {
          const carData = {
            ...response.data,
            vin: response.data.vin || null,
            registration_expiry_date: response.data.registration_expiry_date || null,
            insurance_expiry_date: response.data.insurance_expiry_date || null,
            oil_change_tracking: response.data.oil_change_tracking || false,
            last_oil_change_mileage: parseInt(response.data.last_oil_change_mileage) || 0,
            oil_change_interval: parseInt(response.data.oil_change_interval) || 10000,
            encrypted_car_id: response.data.encrypted_car_id || '',
          };
          setCar(carData);
          if (carData.currency && !companyCurrency) {
            setCompanyCurrency(carData.currency);
          } else if (!companyCurrency && carData.company_id) {
            try {
              const companyResponse = await secureApi.get(`/companies/${carData.company_id}`);
              if (companyResponse.data?.currency) {
                setCompanyCurrency(companyResponse.data.currency);
              }
            } catch (err) {
              console.warn('Failed to fetch company currency from car company_id:', err);
            }
          }
          if (!carData.encrypted_car_id) {
            setError(t('cars.failedToLoadVehicleDetails'));
            setRentalHistory([]);
            setMaintenanceHistory([]);
            setLoading(false);
            return;
          }
          // Fetch rental history
          try {
            const rentalResponse = await secureApi.get(
              `/rentals/?car_id=${carData.encrypted_car_id}`
            );
            if (rentalResponse.data && Array.isArray(rentalResponse.data)) {
              setRentalHistory(rentalResponse.data);

              // Fetch clients to populate window.cachedClients
              try {
                const clientsResponse = await secureApi.get('/clients/');
                if (clientsResponse.data && Array.isArray(clientsResponse.data)) {
                  window.cachedClients = {};
                  clientsResponse.data.forEach(client => {
                    if (client.encrypted_client_id) {
                      window.cachedClients[client.encrypted_client_id] = client;
                    }
                  });
                }
              } catch (clientErr) {
                console.error('Failed to fetch clients:', clientErr);
              }
            } else {
              setRentalHistory([]);
            }
          } catch (err) {
            setRentalHistory([]);
          }
          // Fetch maintenance history
          try {
            setLoadingMaintenance(true);
            const maintenanceResponse = await secureApi.get(
              `/maintenance/car/${carData.encrypted_car_id}`
            );
            if (maintenanceResponse.data && maintenanceResponse.data.data) {
              setMaintenanceHistory(maintenanceResponse.data.data);
            } else {
              setMaintenanceHistory([]);
            }
          } catch (err) {
            setMaintenanceHistory([]);
          } finally {
            setLoadingMaintenance(false);
          }
        } else {
          setError('Car not found. It may have been removed from the database.');
        }
      } catch (err) {
        setError(t('cars.failedToLoadVehicleDetails'));
      } finally {
        setLoading(false);
      }
    };
    fetchCarDetails();
  }, [id]);

  const handleDeleteCar = async () => {
    if (window.confirm(t('cars.areYouSureDeleteVehicle'))) {
      try {
        setLoading(true);
        await secureApi.delete(`/cars/${id}`);
        navigate('/cars', { state: { message: t('common.vehicleDeletedSuccessfully') } });
      } catch (err) {
        console.error('Error deleting car:', err);
        alert(`${t('cars.failedToUpdateStatus')}: ${err.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleStatusChange = async newStatus => {
    try {
      console.log(`Updating car ${id} status to ${newStatus}`);

      const carResponse = await secureApi.get(`/cars/${id}`);
      const currentCarData = carResponse.data;

      const formData = new FormData();
      formData.append('make', currentCarData.make);
      formData.append('model', currentCarData.model);
      formData.append('year', currentCarData.year.toString());
      formData.append('color', currentCarData.color);
      formData.append('license_plate', currentCarData.license_plate);
      formData.append('type', currentCarData.type);
      formData.append('status', newStatus);
      formData.append('current_mileage', currentCarData.current_mileage.toString());
      formData.append('daily_rate', currentCarData.daily_rate.toString());

      if (currentCarData.description) {
        formData.append('description', currentCarData.description);
      }

      if (currentCarData.registration_expiry_date) {
        formData.append('registration_expiry_date', currentCarData.registration_expiry_date);
      }
      if (currentCarData.insurance_expiry_date) {
        formData.append('insurance_expiry_date', currentCarData.insurance_expiry_date);
      }

      const response = await secureApi.put(`/cars/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Status update response:', response);

      if (response.data) {
        console.log('Full car data from status update:', response.data);

        setCar(prev => ({
          ...prev,
          ...response.data,
          status: newStatus,
        }));
      } else {
        setCar(prev => ({ ...prev, status: newStatus }));
      }

      if (newStatus === 'maintenance') {
        setActiveTab('maintenance');

        try {
          console.log(`Re-fetching maintenance history for car ID: ${id}`);
          const maintenanceResponse = await secureApi.get(`/maintenance/car/${id}`);
          if (maintenanceResponse.data && maintenanceResponse.data.data) {
            console.log('Updated maintenance history:', maintenanceResponse.data.data);
            setMaintenanceHistory(maintenanceResponse.data.data);
          }
        } catch (err) {
          console.error('Error re-fetching maintenance history:', err);
        }
      }

      // Translate the status before showing the alert
      const translatedStatus = t(`common.${newStatus}`);
      alert(
        `${t('cars.vehicleStatusChangedTo')} ${translatedStatus}. ${t('cars.allMaintenanceRecordsPreserved')}`
      );
    } catch (err) {
      console.error('Failed to update status:', err);
      alert(`${t('common.error')}: ${err.message || t('cars.failedToUpdateStatus')}`);
    }
  };

  // Format date string
  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getCarCurrency = () => car?.currency || companyCurrency || '';

  // Determine rental status based on contract_status and payment_status
  const determineRentalStatus = rental => {
    if (rental.contract_status === 'completed') {
      return 'completed';
    }

    if (rental.contract_status === 'cancelled') {
      return 'cancelled';
    }

    if (rental.payment_status === 'overdue') {
      return 'overdue';
    }

    const today = new Date();
    const start = new Date(rental.rental_start_date);
    const end = new Date(rental.rental_end_date);

    const endDateOnly = new Date(end);
    endDateOnly.setHours(0, 0, 0, 0);
    const todayOnly = new Date(today);
    todayOnly.setHours(0, 0, 0, 0);

    if (endDateOnly.getTime() === todayOnly.getTime()) {
      return 'due today';
    }

    return 'active';
  };

  // Format payment status for display
  const formatPaymentStatus = status => {
    switch (status) {
      case 'paid':
        return t('rentals.paid') || t('common.paidInFull');
      case 'partially_paid':
        return t('rentals.partiallyPaid') || t('common.partiallyPaid');
      case 'unpaid':
        return t('rentals.unpaid') || t('common.unpaid');
      case 'overdue':
        return t('rentals.overdue') || t('common.paymentOverdue');
      case 'cancelled':
        return t('common.cancelled');
      default:
        return status?.charAt(0).toUpperCase() + status?.slice(1) || t('common.unknown');
    }
  };

  // Get payment status badge styling
  const getPaymentBadge = status => {
    switch (status) {
      case 'paid':
        return 'bg-green-900/30 text-green-300';
      case 'partially_paid':
        return 'bg-yellow-900/30 text-yellow-300';
      case 'unpaid':
        return 'bg-orange-900/30 text-orange-300';
      case 'overdue':
        return 'bg-red-900/30 text-red-300';
      case 'cancelled':
        return 'bg-gray-900/30 text-gray-300';
      default:
        return 'bg-orange-900/30 text-orange-300';
    }
  };

  // Extract client name and phone from rental record
  const getClientInfo = rental => {
    console.log('Rental object structure:', rental);

    if (rental.client && typeof rental.client === 'object') {
      return {
        name: rental.client.name || 'Unknown Client',
        phone: rental.client.phone_number || 'No phone',
      };
    }

    if (rental.client_info && typeof rental.client_info === 'object') {
      return {
        name: rental.client_info.name || 'Unknown Client',
        phone: rental.client_info.phone_number || 'No phone',
      };
    }

    if (rental.client_id && typeof rental.client_id === 'object') {
      return {
        name: rental.client_id.name || 'Unknown Client',
        phone: rental.client_id.phone_number || 'No phone',
      };
    }

    if (rental.encrypted_client_id || rental.client_id) {
      try {
        const clientKey = rental.encrypted_client_id || rental.client_id;
        if (window.cachedClients && window.cachedClients[clientKey]) {
          const client = window.cachedClients[clientKey];
          return {
            name: client.name || 'Unknown Client',
            phone: client.phone_number || 'No phone',
          };
        }

        if (rental.fetchClientInfo) {
          rental.fetchClientInfo(rental.client_id);
        }
      } catch (err) {
        console.error('Error getting client info:', err);
      }
    }

    return {
      name: 'Unknown Client',
      phone: 'Client details unavailable',
    };
  };

  // Tab content
  const renderVehicleDetailsTab = () => {
    console.log('Car data in render tab:', car);
    console.log('VIN specifics:', car.vin);
    console.log('Registration date specifics:', car.registration_expiry_date);
    console.log('Insurance date specifics:', car.insurance_expiry_date);

    let cleanDescription = '';
    if (car.description) {
      const match = car.description.match(/^(.*?)(\[OIL_CHANGE_DATA\].*)?$/s);
      if (match && match[1]) {
        cleanDescription = match[1].trim();
      }
    }

    return (
      <div className={isRTL ? 'text-right' : 'text-left'}>
        <h2 className="text-xl font-bold mb-4">{t('cars.vehicleSpecifications')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-gray-400 text-sm">{t('cars.vin')}</p>
            <p className="text-white">{car.vin || t('cars.notRecorded')}</p>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-gray-400 text-sm">{t('cars.registrationExpiry')}</p>
            <p className="text-white">
              {car.registration_expiry_date
                ? formatDate(car.registration_expiry_date)
                : t('cars.notRecorded')}
            </p>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-gray-400 text-sm">{t('cars.insuranceExpiry')}</p>
            <p className="text-white">
              {car.insurance_expiry_date
                ? formatDate(car.insurance_expiry_date)
                : t('cars.notRecorded')}
            </p>
          </div>
        </div>

        {cleanDescription && cleanDescription.length > 0 && (
          <div className="mt-6 border-t border-gray-700 pt-6">
            <h3 className="text-lg font-bold mb-4">{t('cars.description')}</h3>
            <p className="text-white">{cleanDescription}</p>
          </div>
        )}

        {car.oil_change_tracking && (
          <div className="mt-6 border-t border-gray-700 pt-6">
            <h3 className="text-lg font-bold mb-4">{t('cars.oilChangeTracking')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-gray-400 text-sm">{t('cars.oilChangeInterval')}</p>
                <p className="text-white">
                  {car.oil_change_interval?.toLocaleString() || '10,000'} {t('cars.km')}
                </p>
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-gray-400 text-sm">{t('cars.lastOilChange')}</p>
                <p className="text-white">
                  {car.last_oil_change_mileage?.toLocaleString() || t('cars.notRecorded')}{' '}
                  {t('cars.km')}
                </p>
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-gray-400 text-sm">{t('cars.nextOilChangeDue')}</p>
                <p
                  className={`${needsOilChange(car) ? 'text-yellow-400' : 'text-white'} font-medium`}
                >
                  {car.last_oil_change_mileage
                    ? `${(car.last_oil_change_mileage + (car.oil_change_interval || 10000)).toLocaleString()} ${t('cars.km')}`
                    : t('cars.notCalculated')}
                  {needsOilChange(car) && ` (${t('cars.overdue')})`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Record an oil change for a car or start oil change tracking
  // Complete recordOilChange function - REPLACE THE ENTIRE FUNCTION
  const recordOilChange = async () => {
    // Validate inputs
    if (!oilChangeMileage) {
      setError(t('cars.enterValidMileage'));
      return;
    }

    const mileage = parseInt(oilChangeMileage);
    if (isNaN(mileage) || mileage < 0) {
      setError(t('cars.enterValidMileage'));
      return;
    }

    // Validate interval for new tracking
    if (isStartingTracking) {
      if (!oilChangeInterval) {
        setError(t('cars.enterValidInterval'));
        return;
      }

      const intervalValue = parseInt(oilChangeInterval);
      if (isNaN(intervalValue) || intervalValue <= 0) {
        setError(t('cars.enterValidInterval'));
        return;
      }
    }

    try {
      // Get the current car data from the backend
      const carResponse = await secureApi.get(`/cars/${car.encrypted_car_id}`);
      const currentCarData = carResponse.data;

      console.log('=== RECORDING OIL CHANGE ===');
      console.log('Current mileage to record:', mileage);
      console.log('Oil change interval:', oilChangeInterval);
      console.log('Is starting tracking:', isStartingTracking);
      console.log('Current car data:', currentCarData);

      // Create FormData for the update
      const formData = new FormData();

      // Add all required fields
      formData.append('make', currentCarData.make);
      formData.append('model', currentCarData.model);
      formData.append('year', currentCarData.year.toString());
      formData.append('color', currentCarData.color);
      formData.append('license_plate', currentCarData.license_plate);
      formData.append('type', currentCarData.type);
      formData.append('status', currentCarData.status);

      // Update current_mileage if the oil change mileage is higher
      const newCurrentMileage = Math.max(parseInt(currentCarData.current_mileage) || 0, mileage);
      formData.append('current_mileage', newCurrentMileage.toString());

      const dailyRate = parseFloat(currentCarData.daily_rate) || 0;
      formData.append('daily_rate', dailyRate.toString());

      // FIXED: Properly determine interval based on context
      const intervalToUse = isStartingTracking
        ? parseInt(oilChangeInterval)
        : parseInt(currentCarData.oil_change_interval) || 10000;

      console.log('=== OIL CHANGE DATA BEING SENT ===');
      console.log('oil_change_tracking: true');
      console.log('last_oil_change_mileage:', mileage);
      console.log('oil_change_interval:', intervalToUse);
      console.log('isStartingTracking:', isStartingTracking);

      // CRITICAL: Send oil change fields
      formData.append('oil_change_tracking', 'true');
      formData.append('last_oil_change_mileage', mileage.toString());
      formData.append('oil_change_interval', intervalToUse.toString());

      // Add other optional fields
      if (currentCarData.vin) formData.append('vin', currentCarData.vin);
      if (currentCarData.description) formData.append('description', currentCarData.description);
      if (currentCarData.registration_expiry_date)
        formData.append('registration_expiry_date', currentCarData.registration_expiry_date);
      if (currentCarData.insurance_expiry_date)
        formData.append('insurance_expiry_date', currentCarData.insurance_expiry_date);

      // Debug all FormData
      console.log('=== ALL FORM DATA BEING SENT ===');
      for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
      }

      console.log('Sending update request to backend...');

      // Send the update request
      const response = await secureApi.put(`/cars/${car.encrypted_car_id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Handle success
      if (response.data) {
        console.log('=== UPDATE SUCCESSFUL ===');
        console.log('Response from backend:', response.data);

        setShowOilChangeModal(false);
        setOilChangeMileage('');
        setOilChangeInterval('10000'); // Reset to default
        setError(null);
        setIsStartingTracking(false);

        // Calculate if oil change is needed after this update
        const mileageDifference = newCurrentMileage - mileage;
        const needsOilChangeNow = mileageDifference >= intervalToUse;

        console.log('=== POST-UPDATE CALCULATIONS ===');
        console.log('New current mileage:', newCurrentMileage);
        console.log('Last oil change mileage:', mileage);
        console.log('Oil change interval:', intervalToUse);
        console.log('Mileage difference:', mileageDifference);
        console.log('Needs oil change now:', needsOilChangeNow);

        // Create updated car object with all needed fields
        const updatedCar = {
          ...car,
          ...response.data.data, // Use response.data.data since backend returns { message, data }
          current_mileage: newCurrentMileage,
          last_oil_change_mileage: mileage,
          oil_change_interval: intervalToUse,
          oil_change_tracking: true,
          alertFlags: {
            ...(car.alertFlags || {}),
            hasOilAlert: needsOilChangeNow,
          },
        };

        console.log('=== UPDATED CAR OBJECT ===');
        console.log(updatedCar);

        // Update the car state
        setCar(updatedCar);
        setLastRefreshTime(Date.now());

        // Show success message
        const message = isStartingTracking
          ? t('cars.oilChangeTrackingStartedSuccessfully')
          : t('cars.oilChangeRecordedSuccessfully');
        alert(message);

        // Refresh the car details after a short delay
        setTimeout(() => {
          console.log('Refreshing car details after oil change update');
          refreshCarDetails();
        }, 1000);
      } else {
        console.error('No response data received');
        setError(t('cars.updateCompletedNoData'));
      }
    } catch (error) {
      console.error('=== ERROR UPDATING CAR ===');
      console.error('Error details:', error);
      console.error('Error response:', error.response);
      setError(t('cars.failedToUpdateOilChangeData'));
    }
  };

  // Simulate high mileage for testing oil change alerts
  const simulateHighMileage = async () => {
    try {
      let oilChangeData = extractOilChangeData(car);

      if (!oilChangeData) {
        setError(t('cars.noOilChangeTrackingData'));
        return;
      }

      const interval = oilChangeData.oil_change_interval || 10000;
      const lastOilChangeMileage = oilChangeData.last_oil_change_mileage || 0;

      const highMileage = lastOilChangeMileage + interval + 1000;

      await secureApi.put(`/cars/${car.encrypted_car_id}`, {
        current_mileage: highMileage,
      });

      setCar(prev => ({
        ...prev,
        current_mileage: highMileage,
      }));

      alert(t('cars.mileageUpdatedToTest', { mileage: highMileage }));

      navigate('/dashboard', { state: { refresh: true, timestamp: Date.now() } });
    } catch (err) {
      console.error('Error simulating high mileage:', err);
      setError(t('cars.failedToSimulateHighMileage'));
    }
  };

  useEffect(() => {
    if (car && car.last_oil_change_mileage > 0) {
      console.log('CHECKING OIL CHANGE STATUS AFTER CAR UPDATE');
      console.log('Car data:', car);

      const currentMileage = parseInt(car.current_mileage);
      const lastOilChangeMileage = parseInt(car.last_oil_change_mileage);

      const interval = parseInt(car.oil_change_interval) || 10000;

      const mileageDiff = currentMileage - lastOilChangeMileage;
      const needsOilChange = mileageDiff >= interval;

      console.log('OIL CHANGE CHECK:');
      console.log('- Current mileage:', currentMileage);
      console.log('- Last oil change:', lastOilChangeMileage);
      console.log('- Interval:', interval);
      console.log('- Mileage difference:', mileageDiff);
      console.log('- Needs oil change:', needsOilChange);
    }
  }, [car]);

  useEffect(() => {
    if (car) {
      const hasDocAlert = hasExpiringDocuments(car);
      const hasOilAlert = needsOilChange(car);
      const hasAnyAlert = hasDocAlert || hasOilAlert;

      car.alertFlags = {
        hasDocAlert,
        hasOilAlert,
        hasAnyAlert,
      };

      console.log(`Car details: ${car.make} ${car.model} - Has alerts: ${hasAnyAlert}`);
      console.log(`Document expiring: ${hasDocAlert}, Oil change needed: ${hasOilAlert}`);
    }
  }, [car]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!car) {
    return (
      <div
        className={`p-8 max-w-7xl mx-auto bg-gray-900 text-white ${isRTL ? 'rtl text-right' : 'ltr text-left'}`}
      >
        <div className="bg-red-900/30 text-red-200 px-4 py-3 rounded-lg mb-6">
          {t('cars.vehicleNotFound')}
        </div>
        <Link
          to="/cars"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          {t('cars.backToInventory')}
        </Link>
      </div>
    );
  }

  // Check if oil change is needed
  const oilChangeNeeded = needsOilChange(car);
  const isTrackingOilChanges = car.oil_change_tracking && car.last_oil_change_mileage > 0;

  return (
    <div className={`p-4 md:p-8 max-w-7xl mx-auto bg-gray-900 text-white ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Breadcrumb navigation */}
      <div className="mb-4">
        <div className={`flex items-center text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Link to="/dashboard" className="text-gray-400 hover:text-blue-400">
            {t('cars.backToDashboard')}
          </Link>
          <span className="mx-2 text-gray-600">/</span>
          <Link to="/cars" className="text-gray-400 hover:text-blue-400">
            {t('cars.backToInventory')}
          </Link>
          <span className="mx-2 text-gray-600">/</span>
          <span className="text-white">
            {car.make} {car.model}
          </span>
        </div>
      </div>

      {/* Error message */}
      {error && <div className="bg-red-900/30 text-red-200 px-4 py-3 rounded-lg mb-6">{error}</div>}

      {/* Car details section */}
      <div
        className="mb-6 p-6 bg-gray-900/70 rounded-lg shadow-lg"
        style={
          car.alertFlags?.hasDocAlert
            ? {
                border: '5px solid #f59e0b',
                boxShadow: '0 0 12px 5px rgba(251, 146, 60, 0.7)',
              }
            : car.alertFlags?.hasOilAlert
              ? {
                  border: '3px solid #eab308',
                  boxShadow: '0 0 10px 3px rgba(234, 179, 8, 0.7)',
                }
              : {}
        }
      >
        <div className={`grid md:grid-cols-2 gap-8 ${isRTL ? 'md:grid-flow-col-dense' : ''}`}>
          {/* Car Image */}
          <div
            className={`bg-gray-700 rounded-lg overflow-hidden shadow-md ${isRTL ? 'md:order-2' : ''}`}
          >
            {car.image_url ? (
              <img
                src={car.image_url}
                alt={`${car.make} ${car.model}`}
                className="w-full h-full object-cover"
                onError={e => {
                  e.target.onerror = null;
                  e.target.src = DefaultCarImg;
                }}
              />
            ) : (
              <img src={DefaultCarImg} alt="Default Car" className="w-full h-full object-cover" />
            )}
          </div>

          <div className={`md:w-1/2 p-6 ${isRTL ? 'md:order-1 text-right' : 'text-left'}`}>
            <div className={`flex justify-between items-start ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <h1 className="text-2xl font-bold text-white">
                  {car.make} {car.model}
                </h1>
                <p className="text-lg font-bold text-gray-300">{car.year}</p>
                <p className="text-lg text-gray-300">{car.license_plate}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-md text-sm font-medium whitespace-nowrap ${
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
                    : t('cars.inMaintenance')}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-gray-400 text-sm">{t('cars.color')}</p>
                <p className="text-white">{car.color}</p>
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-gray-400 text-sm">{t('cars.type')}</p>
                <p className="text-white">{car.type || 'N/A'}</p>
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-gray-400 text-sm">{t('cars.mileage')}</p>
                <p className="text-white">{formatMileageValue(car.current_mileage)}</p>
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-gray-400 text-sm">{t('cars.lastService')}</p>
                <p className="text-white">
                  {maintenanceHistory.length > 0
                    ? formatDate(
                        maintenanceHistory[0].maintenance_date || maintenanceHistory[0].date
                      )
                    : 'N/A'}
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-gray-700 pt-6">
              <div className="grid grid-cols-3 gap-4">
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-gray-400 text-sm">{t('cars.dailyRate')}</p>
                  <p className="text-white font-bold">
                    {formatPrice(car.daily_rate || 0, getCarCurrency())}
                  </p>
                </div>
                {car.weekly_rate && (
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <p className="text-gray-400 text-sm">{t('cars.weeklyRate')}</p>
                    <p className="text-white font-bold">
                      {formatPrice(car.weekly_rate, getCarCurrency())}
                    </p>
                  </div>
                )}
                {car.monthly_rate && (
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <p className="text-gray-400 text-sm">{t('cars.monthlyRate')}</p>
                    <p className="text-white font-bold">
                      {formatPrice(car.monthly_rate, getCarCurrency())}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="mb-6 border border-gray-700 rounded-lg p-4 bg-gray-900/50">
        <h3 className={`text-lg font-bold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('cars.alerts')}
        </h3>

        {/* Document Expiry Alert */}
        {hasExpiringDocuments(car) && (
          <div className="mb-4">
            <ExpiryAlert
              registrationDate={car.registration_expiry_date}
              insuranceDate={car.insurance_expiry_date}
              variant="full"
              debugId={`car-details-${car.encrypted_car_id}`}
            />
          </div>
        )}

        {/* Oil Change Alert */}
        {oilChangeNeeded && (
          <div className="mb-4">
            <OilChangeAlert
              car={car}
              variant="full"
              debugId={`oil-change-${car.encrypted_car_id}`}
            />
          </div>
        )}

        {/* Oil Change Status (when tracking but no alert) */}
        {isTrackingOilChanges && !oilChangeNeeded && (
          <div className="mb-4 p-4 rounded-lg border border-blue-500 bg-blue-900/30">
            <div className={`flex items-start ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className={`${isRTL ? 'mr-3 text-right' : 'ml-3 text-left'}`}>
                <h3 className="text-sm font-medium text-blue-300">
                  {t('cars.oilChangeTrackingActive')}
                </h3>
                <div className="mt-2 text-sm text-blue-200">
                  <p>
                    {t('cars.currentMileage')}: {car.current_mileage?.toLocaleString()}{' '}
                    {t('cars.km')}
                    <br />
                    {t('cars.lastOilChange')}: {car.last_oil_change_mileage?.toLocaleString()}{' '}
                    {t('cars.km')}
                    <br />
                    {t('cars.mileageSinceLastChange')}:{' '}
                    {(car.current_mileage - car.last_oil_change_mileage)?.toLocaleString()}{' '}
                    {t('cars.km')}
                    <br />
                    {t('cars.oilChangeInterval')}: {car.oil_change_interval?.toLocaleString()}{' '}
                    {t('cars.km')}
                    <br />
                    <span className="font-medium mt-1 block">
                      {t('cars.nextOilChangeIn')}{' '}
                      {Math.max(
                        0,
                        car.last_oil_change_mileage + car.oil_change_interval - car.current_mileage
                      )?.toLocaleString()}{' '}
                      {t('cars.km')}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No alerts message */}
        {!hasExpiringDocuments(car) && !isTrackingOilChanges && (
          <div className={`text-gray-400 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('cars.noAlertsAtThisTime')}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className={`flex flex-wrap gap-3 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {/* Primary Action Buttons - Always visible */}
        <Link
          to={car.encrypted_car_id ? `/cars/${car.encrypted_car_id}/edit` : '#'}
          className={`bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}
          onClick={e => {
            if (!car.encrypted_car_id) e.preventDefault();
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
            <path
              fillRule="evenodd"
              d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
              clipRule="evenodd"
            />
          </svg>
          {t('cars.editVehicle')}
        </Link>

        <button
          onClick={handleDeleteCar}
          className={`bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {t('cars.deleteVehicle')}
        </button>

        {car.status === 'available' && (
          <Link
            to={car.encrypted_car_id ? `/rentals/new/${car.encrypted_car_id}` : '#'}
            state={{ preSelectedCar: car }}
            className={`bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}
            onClick={e => {
              if (!car.encrypted_car_id) e.preventDefault();
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z"
                clipRule="evenodd"
              />
            </svg>
            {t('cars.rentNow')}
          </Link>
        )}

        {/* Secondary Action Buttons - Conditional */}
        {car.status === 'available' && (
          <button
            onClick={() => handleStatusChange('maintenance')}
            className={`bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700 transition-colors flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
            {t('cars.markForMaintenance')}
          </button>
        )}

        {car.status === 'maintenance' && (
          <button
            onClick={() => handleStatusChange('available')}
            className={`bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            {t('cars.markAsAvailable')}
          </button>
        )}

        {/* Track Oil Change Button - Only show when NOT tracking */}
        {!isTrackingOilChanges && (
          <button
            onClick={() => {
              setOilChangeMileage(car.current_mileage?.toString() || '');
              setOilChangeInterval('10000');
              setIsStartingTracking(true);
              setShowOilChangeModal(true);
            }}
            className={`bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                clipRule="evenodd"
              />
            </svg>
            {t('cars.trackOilChanges')}
          </button>
        )}

        {/* Record Oil Change Button - Only show when alert is active */}
        {oilChangeNeeded && (
          <button
            onClick={() => {
              setOilChangeMileage(car.current_mileage?.toString() || '');
              setIsStartingTracking(false);
              setShowOilChangeModal(true);
            }}
            className={`bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700 transition-colors flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 10-1.414-1.414L11 10.586V7z"
                clipRule="evenodd"
              />
            </svg>
            {t('cars.recordOilChange')}
          </button>
        )}
      </div>

      {/* Tabs for history information */}
      <div className="mb-4">
        <div className="border-b border-gray-700">
          <nav
            className={`flex ${isRTL ? 'flex-row-reverse' : ''} justify-start`}
            aria-label="Tabs"
          >
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-4 px-4 ${
                activeTab === 'details'
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'border-b-2 border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              } font-medium text-sm text-center`}
            >
              {t('cars.vehicleDetails')}
            </button>
            <button
              onClick={() => setActiveTab('rental')}
              className={`flex-1 py-4 px-4 ${
                activeTab === 'rental'
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'border-b-2 border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              } font-medium text-sm text-center`}
            >
              {t('cars.rentalHistory')}
            </button>
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`flex-1 py-4 px-4 ${
                activeTab === 'maintenance'
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'border-b-2 border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              } font-medium text-sm text-center`}
            >
              {t('cars.maintenanceHistory')}
            </button>
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <div className="bg-gray-900 rounded-lg p-6">
        {activeTab === 'details' && renderVehicleDetailsTab()}

        {activeTab === 'rental' && (
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div
              className={`flex justify-between items-center mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <h2 className="text-xl font-bold">{t('cars.rentalHistory')}</h2>
              <Link
                to={car.encrypted_car_id ? `/rentals/new/${car.encrypted_car_id}` : '#'}
                className={`text-sm px-3 py-1 rounded-md font-medium ${
                  car.status === 'available'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
                onClick={e => {
                  if (!car.encrypted_car_id || car.status !== 'available') e.preventDefault();
                }}
              >
                {car.status === 'available' ? t('cars.createNewRental') : t('cars.carUnavailable')}
              </Link>
            </div>

            {rentalHistory.length === 0 ? (
              <div className="text-center py-8 bg-gray-700 rounded-lg">
                <p className="text-gray-300">{t('cars.noRentalHistoryAvailable')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead>
                    <tr>
                      <th
                        className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-400 uppercase tracking-wider`}
                      >
                        {t('cars.rentalPeriod')}
                      </th>
                      <th
                        className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-400 uppercase tracking-wider`}
                      >
                        {t('cars.client')}
                      </th>
                      <th
                        className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-400 uppercase tracking-wider`}
                      >
                        {t('cars.amount')}
                      </th>
                      <th
                        className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-400 uppercase tracking-wider`}
                      >
                        {t('cars.status')}
                      </th>
                      <th
                        className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-400 uppercase tracking-wider`}
                      >
                        {t('cars.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {rentalHistory.map(rental => {
                      const status = determineRentalStatus(rental);
                      const client = getClientInfo(rental);

                      return (
                        <tr key={rental.encrypted_rental_id} className="hover:bg-gray-700">
                          <td
                            className={`px-4 py-3 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}
                          >
                            <div className="text-sm text-white">
                              {formatDate(rental.rental_start_date)}
                            </div>
                            <div className="text-sm text-gray-400">
                              {t('cars.to')} {formatDate(rental.rental_end_date)}
                            </div>
                          </td>
                          <td
                            className={`px-4 py-3 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}
                          >
                            <div className="text-white">{client.name}</div>
                            <div className="text-gray-400">{client.phone}</div>
                          </td>
                          <td
                            className={`px-4 py-3 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}
                          >
                            <div className="text-sm text-white">
                              {formatPrice(rental.final_price, getCarCurrency())}
                            </div>
                            {rental.payment_status && (
                              <div
                                className={`text-xs px-2 py-1 mt-1 inline-flex rounded-full ${getPaymentBadge(rental.payment_status)}`}
                              >
                                {formatPaymentStatus(rental.payment_status)}
                              </div>
                            )}
                            {(rental.payment_status === 'unpaid' ||
                              rental.payment_status === 'partially_paid' ||
                              rental.payment_status === 'overdue') && (
                              <div className="text-xs text-red-400 mt-1">
                                {t('cars.due')}:{' '}
                                {formatPrice(
                                  Math.max(
                                    0,
                                    parseFloat(rental.final_price || 0) -
                                      parseFloat(rental.amount_paid || 0)
                                  ),
                                  getCarCurrency()
                                )}
                              </div>
                            )}
                          </td>
                          <td
                            className={`px-4 py-3 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}
                          >
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                status === 'completed'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                  : status === 'overdue'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                    : status === 'cancelled'
                                      ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                                      : status === 'due today'
                                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              }`}
                            >
                              {status === 'due today'
                                ? t('cars.dueToday')
                                : status === 'active'
                                  ? t('cars.active')
                                  : status === 'completed'
                                    ? t('cars.completed')
                                    : status === 'cancelled'
                                      ? t('cars.cancelled')
                                      : status === 'overdue'
                                        ? t('cars.overdue')
                                        : status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                          </td>
                          <td
                            className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}
                          >
                            <Link
                              to={`/rentals/${rental.encrypted_rental_id}`}
                              className="text-blue-400 hover:text-blue-300"
                              onClick={e => {
                                console.log('Clicked rental:', rental);

                                if (!rental.encrypted_rental_id) {
                                  e.preventDefault();
                                  alert(t('cars.unableToViewRental'));
                                  console.error('Missing rental ID', rental);
                                }
                              }}
                            >
                              {t('cars.view')}
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'maintenance' && (
          <MaintenanceHistoryTab
            car={car}
            maintenanceHistory={maintenanceHistory}
            loading={loadingMaintenance && maintenanceHistory.length === 0}
            companyCurrency={companyCurrency}
          />
        )}
      </div>

      {showOilChangeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div
            className={`bg-gray-900 rounded-lg p-6 w-full max-w-md ${isRTL ? 'text-right' : 'text-left'}`}
          >
            <h3 className="text-xl font-bold mb-4">
              {isStartingTracking ? t('cars.startOilChangeTracking') : t('cars.recordOilChange')}
            </h3>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-md text-red-200">
                {error}
              </div>
            )}

            {/* CSS to hide ALL spinners */}
            <style jsx>{`
              input[type='number']::-webkit-outer-spin-button,
              input[type='number']::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
              }

              input[type='number'] {
                -moz-appearance: textfield;
              }
            `}</style>

            <div>
              {/* Current mileage input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {isStartingTracking ? t('cars.startingMileageKm') : t('cars.currentMileageKm')}
                </label>
                <input
                  type="number"
                  value={oilChangeMileage}
                  onChange={e => setOilChangeMileage(e.target.value)}
                  placeholder={`${t('cars.currentMileage')}: ${car.current_mileage || 0} ${t('cars.km')}`}
                  className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isRTL ? 'text-right' : 'text-left'
                  }`}
                  dir={isRTL ? 'rtl' : 'ltr'}
                  style={{}}
                  step="1000"
                  min="0"
                />
                <p className={`text-xs text-gray-400 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isStartingTracking
                    ? t('cars.enterMileageWhenLastChanged')
                    : `${t('cars.lastOilChangeWasAt')} ${car.last_oil_change_mileage?.toLocaleString()} ${t('cars.km')}`}
                </p>
              </div>

              {/* Oil change interval - only show when starting tracking */}
              {isStartingTracking && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {t('cars.oilChangeIntervalKm')}
                  </label>
                  <input
                    type="number"
                    value={oilChangeInterval}
                    onChange={e => setOilChangeInterval(e.target.value)}
                    className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isRTL ? 'text-right' : 'text-left'
                    }`}
                    placeholder="10000"
                    dir={isRTL ? 'rtl' : 'ltr'}
                    style={{}}
                    step="1000"
                    min="1000"
                  />
                  <p className={`text-xs text-gray-400 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('cars.youllBeAlertedWhen')}
                  </p>
                </div>
              )}
            </div>

            {/* Fixed button spacing */}
            <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} gap-4 mt-6`}>
              <button
                onClick={() => {
                  setShowOilChangeModal(false);
                  setError(null);
                  setIsStartingTracking(false);
                }}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                {t('cars.cancel')}
              </button>
              <button
                onClick={recordOilChange}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {isStartingTracking ? t('cars.startTracking') : t('cars.recordOilChange')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarDetailsPage;

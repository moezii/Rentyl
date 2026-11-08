// src/pages/Rentals/RentalsPage.jsx
import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../components/context/AuthContext';
import secureApi from '../../utils/secureApi';
import { formatPrice, getCurrencySymbol } from '../../utils/currencySymbols';
import { useMileageDisplay } from '../../hooks/useMileageDisplay';
import { useLanguage } from '../../contexts/LanguageContext';
import './RentalsPage.css';

const RentalsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { formatMileageValue, getMileageUnit } = useMileageDisplay();
  const { t, isRTL, language } = useLanguage();
  const [rentals, setRentals] = useState([]);
  const [filteredRentals, setFilteredRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [cars, setCars] = useState({});
  const [clients, setClients] = useState({});
  const [showMileageModal, setShowMileageModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [modalStep, setModalStep] = useState('mileage'); // 'mileage' or 'payment'
  const [mileageData, setMileageData] = useState({
    rentalId: null,
    carId: null,
    initialMileage: 0,
    newMileage: 0,
    error: '',
    isCollectOnly: false, // Flag to distinguish between collecting (green button) vs completing
  });
  const [paymentData, setPaymentData] = useState({
    rentalId: null,
    amountPaid: 0,
    amountDue: 0,
    finalPrice: 0,
    paymentAmount: '',
    error: '',
  });

  // Get company from AuthContext for currency access
  const { company } = useContext(AuthContext);

  // Filter rentals based on active filter and search term
  useEffect(() => {
    // Don't run filtering if we're still loading
    if (loading) return;

    let result = [...rentals];

    // Apply status filter based on payment_status and dates
    if (activeFilter !== 'all') {
      if (activeFilter === 'active') {
        // Active rentals: contract status is active (includes overdue ones)
        result = result.filter(rental => rental.contract_status === 'active');
      } else if (activeFilter === 'completed') {
        // Completed rentals: contract status is completed
        result = result.filter(rental => rental.contract_status === 'completed');
      } else if (activeFilter === 'overdue') {
        // Overdue rentals: payment status is overdue
        result = result.filter(rental => rental.payment_status === 'overdue');
      }
    }

    // Apply search filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        rental =>
          (clients[rental.encrypted_client_id]?.name?.toLowerCase() || '').includes(term) ||
          (cars[rental.encrypted_car_id]?.make?.toLowerCase() || '').includes(term) ||
          (cars[rental.encrypted_car_id]?.model?.toLowerCase() || '').includes(term) ||
          (cars[rental.encrypted_car_id]?.license_plate?.toLowerCase() || '').includes(term)
      );
    }

    // Sort rentals by days remaining (lowest first)
    result.sort((a, b) => {
      // First sort by contract status - completed ones go to the bottom
      if (a.contract_status === 'completed' && b.contract_status !== 'completed') {
        return 1; // a goes after b
      }
      if (a.contract_status !== 'completed' && b.contract_status === 'completed') {
        return -1; // a goes before b
      }

      // For active rentals, sort by days remaining (lowest first)
      if (a.contract_status !== 'completed' && b.contract_status !== 'completed') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const aEndDate = new Date(a.rental_end_date);
        aEndDate.setHours(0, 0, 0, 0);
        const aDaysRemaining = Math.ceil((aEndDate - today) / (1000 * 60 * 60 * 24));

        const bEndDate = new Date(b.rental_end_date);
        bEndDate.setHours(0, 0, 0, 0);
        const bDaysRemaining = Math.ceil((bEndDate - today) / (1000 * 60 * 60 * 24));

        // Sort by days remaining (lowest/most urgent first)
        return aDaysRemaining - bDaysRemaining;
      }

      // For completed rentals, sort by created_at date (newest first)
      const aDate = new Date(a.created_at || '1970-01-01');
      const bDate = new Date(b.created_at || '1970-01-01');
      return bDate - aDate; // Newest first
    });

    setFilteredRentals(result);
  }, [activeFilter, searchTerm, rentals, cars, clients, loading]);

  // Check for status message from redirect
  useEffect(() => {
    if (location.state?.message) {
      setStatusMessage(location.state.message);

      const timer = setTimeout(() => {
        setStatusMessage('');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // Process rentals after fetching to add derived fields
  const processRentals = rentalsData => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return rentalsData.map(rental => {
      // Set id if missing but rental_id exists
      if (!rental.id && rental.rental_id) {
        rental.id = rental.rental_id;
      }
      // Set rental_id if missing but id exists
      if (!rental.rental_id && rental.id) {
        rental.rental_id = rental.id;
      }

      // Don't process completed or cancelled contracts - return them exactly as they are
      if (rental.contract_status === 'completed' || rental.contract_status === 'cancelled') {
        console.log(
          `Rental ${rental.rental_id || rental.id} is ${rental.contract_status}, returning as-is`
        );
        return rental;
      }

      // FIXED: If car_collected is true, return rental as-is with NO status changes
      if (rental.car_collected === true) {
        console.log(
          `Rental ${rental.rental_id || rental.id} has car_collected=true, preserving ALL original status`
        );
        return rental; // Return EXACTLY what's in the database - no changes at all
      }

      // Only process rentals that are truly active (no car collected, not completed)
      console.log(`Processing active rental ${rental.rental_id || rental.id}`);

      let contractStatus = 'active';
      let paymentStatus = rental.payment_status || 'unpaid';

      // Update payment status based on amounts (only for active contracts)
      const amountPaid = parseFloat(rental.amount_paid) || 0;
      const finalPrice = parseFloat(rental.final_price) || 0;

      if (finalPrice > 0) {
        const endDate = new Date(rental.rental_end_date);
        endDate.setHours(0, 0, 0, 0);

        if (amountPaid === 0) {
          paymentStatus = endDate < today ? 'overdue' : 'unpaid';
        } else if (amountPaid < finalPrice) {
          paymentStatus = endDate < today ? 'overdue' : 'partially_paid';
        } else if (amountPaid >= finalPrice) {
          paymentStatus = 'paid';
        }
      }

      return {
        ...rental,
        contract_status: contractStatus,
        payment_status: paymentStatus,
        car_collected: false,
      };
    });
  };

  // Fetch rentals data
  const fetchRentals = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [carsResponse, clientsResponse, rentalsResponse] = await Promise.all([
        secureApi.get('/cars/'),
        secureApi.get('/clients/'),
        secureApi.get('/rentals/'),
      ]);

      // Process cars data
      if (carsResponse.data && Array.isArray(carsResponse.data)) {
        const carsMap = {};
        carsResponse.data.forEach(car => {
          if (car.encrypted_car_id) {
            carsMap[car.encrypted_car_id] = car;
          }
        });
        setCars(carsMap);
      }

      // Process clients data
      if (clientsResponse.data && Array.isArray(clientsResponse.data)) {
        const clientsMap = {};
        clientsResponse.data.forEach(client => {
          const encryptedId = client.encrypted_client_id;
          if (encryptedId) {
            clientsMap[encryptedId] = {
              encrypted_client_id: encryptedId,
              name: client.name || 'Unknown Client',
              phone_number: client.phone_number || 'No Phone',
              email_address: client.email_address || '',
              address: client.address || '',
            };
          }
        });
        setClients(clientsMap);
      }

      // Process rentals data
      if (!rentalsResponse.data || !Array.isArray(rentalsResponse.data)) {
        throw new Error('Invalid rentals data format');
      }

      const processedRentals = processRentals(rentalsResponse.data);
      setRentals(processedRentals);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(t('rentals.failedToLoadRentalContracts'));
      setRentals([]);
      setFilteredRentals([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount and when navigating back
  useEffect(() => {
    fetchRentals();
  }, []);

  // Refetch data when location changes
  useEffect(() => {
    if (location.state?.refresh || rentals.length === 0) {
      fetchRentals();
    }
  }, [location.pathname, location.state]);

  // Get car details for a rental
  const getCarDetails = rental => {
    if (!rental || !rental.encrypted_car_id) return {};
    return cars[rental.encrypted_car_id] || {};
  };

  // Determine currency for a rental from its car or rental data
  const getRentalCurrency = rental => {
    const car = getCarDetails(rental);
    return car.currency || rental.currency || company?.currency || '';
  };

  // Get client details for a rental
  const getClientDetails = rental => {
    if (!rental || !rental.encrypted_client_id) {
      return { name: '', phone_number: '' };
    }
    const client = clients[rental.encrypted_client_id];
    if (!client) {
      return { name: '', phone_number: '' };
    }
    return {
      name: client.name || '',
      phone_number: client.phone_number || '',
    };
  };

  // Function to get car image based on make/model or ID
  const getCarImage = car => {
    // Safeguard against null car
    if (!car) {
      return null;
    }

    // If car has an image URL from the database, use it
    if (car.image_url) {
      return car.image_url;
    }

    // Use default images based on make/model
    if (car.make) {
      const make = car.make.toLowerCase();
      const model = car.model ? car.model.toLowerCase() : '';

      if (make.includes('toyota') || model.includes('camry')) {
        return camryImage;
      } else if (make.includes('honda') || model.includes('civic') || model.includes('accord')) {
        return hondaImage;
      } else if (make.includes('ford') || model.includes('mustang')) {
        return mustangImage;
      }
    }

    // Fallback: return null to use license plate display
    return null;
  };

  // Function to determine if today is the last day of the rental
  const isDueToday = rental => {
    if (!rental || !rental.rental_end_date) return false;

    const endDate = new Date(rental.rental_end_date);
    const today = new Date();

    // Set time to 0 for date comparison only
    endDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return endDate.getTime() === today.getTime();
  };

  // Function to get days remaining for active rentals
  const getDaysRemaining = endDate => {
    if (!endDate) return null;

    const end = new Date(endDate);
    const now = new Date();

    // Set time to 0 for date comparison only
    end.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    // If today is the end date, return 0 for "due today"
    if (end.getTime() === now.getTime()) {
      return 0;
    }

    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  // Open mileage modal before completing a rental
  const openMileageModal = async (rental, isCollectOnly = false) => {
    try {
      // First get the current car data to ensure we have the latest mileage
      const carResponse = await secureApi.get(`/cars/${rental.encrypted_car_id}`);
      const currentCarData = carResponse.data;

      // Use the car's current mileage as the initial mileage
      const currentMileage = currentCarData.current_mileage || 0;

      setMileageData({
        rentalId: rental.encrypted_rental_id,
        carId: rental.encrypted_car_id,
        initialMileage: currentMileage,
        newMileage: currentMileage + 1, // Default to current mileage + 1
        error: '',
        isCollectOnly: isCollectOnly, // Set the flag
      });

      setShowMileageModal(true);
    } catch (err) {
      console.error('Error fetching car data for mileage modal:', err);
      setError(`Failed to fetch car data: ${err.message || 'Unknown error'}`);
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

  // Format payment status for display
  const formatPaymentStatus = status => {
    switch (status) {
      case 'paid':
        return t('rentals.paid');
      case 'partially_paid':
        return t('rentals.partiallyPaid');
      case 'unpaid':
        return t('rentals.unpaid');
      case 'overdue':
        return t('rentals.overdue');
      case 'cancelled':
        return t('rentals.cancelled');
      default:
        return t('rentals.unpaid');
    }
  };

  const getBookingTotals = rental => {
    const description = rental?.additional_charges_description || '';
    const match = description.match(/Customer paid\s+([0-9]+(?:\.[0-9]+)?)/i);
    if (!match) return null;
    const totalPaid = parseFloat(match[1]);
    if (Number.isNaN(totalPaid)) return null;
    const totalBeforePlatformFee = totalPaid / 1.05;
    return {
      totalPaid,
      totalMinusFee: parseFloat(totalBeforePlatformFee.toFixed(3)),
    };
  };

  // Handle collect button (make car available again)
  const handleCollectCar = async rental => {
    try {
      const carId = rental.encrypted_car_id;

      // Check if mileage_after is available
      if (!rental.mileage_after) {
        openMileageModal(rental, true); // Pass true to indicate collect-only mode
        return;
      }

      console.log(`Updating car ${carId} status to available`);

      // Update car status and mileage
      const carResponse = await secureApi.get(`/cars/${carId}`);
      const currentCarData = carResponse.data;

      const formData = new FormData();
      formData.append('make', currentCarData.make);
      formData.append('model', currentCarData.model);
      formData.append('year', currentCarData.year.toString());
      formData.append('color', currentCarData.color);
      formData.append('license_plate', currentCarData.license_plate);
      formData.append('type', currentCarData.type);
      formData.append('status', 'available');
      formData.append('current_mileage', rental.mileage_after.toString());
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

      await secureApi.put(`/cars/${carId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // FIXED: ONLY update car_collected - NO other changes
      const rentalUpdate = {
        car_collected: true,
        // NO payment_status, NO contract_status, NO amount_paid changes
      };

      await secureApi.put(`/rentals/${rental.encrypted_rental_id}`, rentalUpdate);
      console.log('Rental updated - ONLY car_collected flag set');

      // FIXED: Update local state - preserve ALL original status
      setRentals(prevRentals =>
        prevRentals.map(r =>
          r.encrypted_rental_id === rental.encrypted_rental_id
            ? {
                ...r,
                car_collected: true,
                // NO other changes - preserve payment_status, contract_status, amount_paid
              }
            : r
        )
      );

      // Update car data
      setCars(prevCars => ({
        ...prevCars,
        [carId]: {
          ...prevCars[carId],
          status: 'available',
          current_mileage: parseInt(rental.mileage_after),
        },
      }));

      setStatusMessage(t('rentals.carCollectedReturnedToFleet'));

      setTimeout(() => {
        setStatusMessage('');
      }, 5000);
    } catch (err) {
      console.error('Failed to collect car:', err);
      setError(`Error: ${err.message || 'Failed to collect car'}`);
    }
  };

  // Handle "Paid in Full" button
  const handlePaidInFull = async () => {
    try {
      const rental = rentals.find(r => r.encrypted_rental_id === paymentData.rentalId);

      const updateData = {
        mileage_after: parseInt(mileageData.newMileage),
        car_collected: true,
        amount_paid: paymentData.finalPrice,
        payment_status: 'paid',
        contract_status: 'completed',
      };

      await secureApi.put(`/rentals/${paymentData.rentalId}`, updateData);

      // Update car status and mileage
      try {
        const carResponse = await secureApi.get(`/cars/${mileageData.carId}`);
        const currentCarData = carResponse.data;

        const formData = new FormData();
        formData.append('make', currentCarData.make);
        formData.append('model', currentCarData.model);
        formData.append('year', currentCarData.year.toString());
        formData.append('color', currentCarData.color);
        formData.append('license_plate', currentCarData.license_plate);
        formData.append('type', currentCarData.type);
        formData.append('status', 'available');
        formData.append('current_mileage', mileageData.newMileage.toString());
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
        if (currentCarData.vin) {
          formData.append('vin', currentCarData.vin);
        }
        if (currentCarData.oil_change_tracking !== undefined) {
          formData.append('oil_change_tracking', currentCarData.oil_change_tracking.toString());
        }
        if (currentCarData.oil_change_interval) {
          formData.append('oil_change_interval', currentCarData.oil_change_interval.toString());
        }
        if (currentCarData.last_oil_change_mileage) {
          formData.append(
            'last_oil_change_mileage',
            currentCarData.last_oil_change_mileage.toString()
          );
        }

        await secureApi.put(`/cars/${mileageData.carId}`, formData);
      } catch (carUpdateError) {
        console.warn('Car update failed, but rental was updated:', carUpdateError);
      }

      setRentals(prevRentals =>
        prevRentals.map(r =>
          r.encrypted_rental_id === paymentData.rentalId
            ? {
                ...r,
                mileage_after: parseInt(mileageData.newMileage),
                car_collected: true,
                amount_paid: paymentData.finalPrice,
                payment_status: 'paid',
                contract_status: 'completed',
              }
            : r
        )
      );

      // Update car data
      setCars(prevCars => ({
        ...prevCars,
        [mileageData.carId]: {
          ...prevCars[mileageData.carId],
          current_mileage: parseInt(mileageData.newMileage),
          status: 'available',
        },
      }));

      setShowMileageModal(false);
      setModalStep('mileage'); // Reset for next time
      setStatusMessage(t('rentals.rentalCompletedSuccessfully'));

      setTimeout(() => {
        setStatusMessage('');
      }, 5000);
    } catch (err) {
      console.error('Error logging full payment:', err);
      setPaymentData(prev => ({
        ...prev,
        error: `Failed to log payment: ${err.message || 'Unknown error'}`,
      }));
    }
  };

  // Handle partial payment
  const handlePartialPayment = async () => {
    const paymentAmount = parseFloat(paymentData.paymentAmount);

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setPaymentData(prev => ({
        ...prev,
        error: 'Please enter a valid payment amount',
      }));
      return;
    }

    if (paymentAmount > paymentData.amountDue) {
      setPaymentData(prev => ({
        ...prev,
        error: 'Payment amount cannot exceed amount due',
      }));
      return;
    }

    try {
      const newAmountPaid = paymentData.amountPaid + paymentAmount;
      const newAmountDue = paymentData.finalPrice - newAmountPaid;

      const updateData = {
        amount_paid: newAmountPaid,
        payment_status: newAmountDue <= 0 ? 'paid' : 'partially_paid',
        contract_status: newAmountDue <= 0 ? 'completed' : 'active',
      };

      await secureApi.put(`/rentals/${paymentData.rentalId}`, updateData);

      setRentals(prevRentals =>
        prevRentals.map(r =>
          r.encrypted_rental_id === paymentData.rentalId
            ? {
                ...r,
                amount_paid: newAmountPaid,
                payment_status: updateData.payment_status,
                contract_status: updateData.contract_status,
              }
            : r
        )
      );

      setShowMileageModal(false);
      setModalStep('mileage'); // Reset for next time
      setStatusMessage(
        newAmountDue <= 0
          ? t('rentals.rentalCompletedSuccessfully')
          : t('rentals.paymentLoggedSuccessfully') || 'Payment logged successfully'
      );

      setTimeout(() => {
        setStatusMessage('');
      }, 5000);
    } catch (err) {
      console.error('Error logging partial payment:', err);
      setPaymentData(prev => ({
        ...prev,
        error: `Failed to log payment: ${err.message || 'Unknown error'}`,
      }));
    }
  };

  // Handle skip payment
  const handleSkipPayment = () => {
    setShowMileageModal(false);
    setModalStep('mileage'); // Reset for next time
    setPaymentData({
      rentalId: null,
      amountPaid: 0,
      amountDue: 0,
      finalPrice: 0,
      paymentAmount: '',
      error: '',
    });
  };

  // Handle "Next" button on mileage page (for unpaid rentals)
  const handleMileageNext = () => {
    // Validate new mileage
    if (mileageData.newMileage <= mileageData.initialMileage) {
      setMileageData(prev => ({
        ...prev,
        error: 'New mileage must be greater than initial mileage',
      }));
      return;
    }

    // Check payment status to determine next step
    const rental = rentals.find(r => r.encrypted_rental_id === mileageData.rentalId);
    const amountPaid = parseFloat(rental.amount_paid) || 0;
    const finalPrice = parseFloat(rental.final_price) || 0;
    const amountDue = finalPrice - amountPaid;

    if (amountDue <= 0) {
      // Fully paid - submit directly
      handleMileageSubmit();
    } else {
      // Not fully paid - transition to payment page
      setPaymentData({
        rentalId: mileageData.rentalId,
        amountPaid: amountPaid,
        amountDue: amountDue,
        finalPrice: finalPrice,
        paymentAmount: '',
        error: '',
      });
      setModalStep('payment');
    }
  };

  // Handle mileage submission and complete rental (for fully paid only)
  const handleMileageSubmit = async () => {
    // Validate new mileage
    if (mileageData.newMileage <= mileageData.initialMileage) {
      setMileageData(prev => ({
        ...prev,
        error: 'New mileage must be greater than initial mileage',
      }));
      return;
    }

    try {
      const rental = rentals.find(r => r.encrypted_rental_id === mileageData.rentalId);

      // Update mileage and mark car as collected
      const rentalUpdate = {
        mileage_after: parseInt(mileageData.newMileage),
        car_collected: true,
        contract_status: 'completed',
        payment_status: 'paid',
      };

      await secureApi.put(`/rentals/${mileageData.rentalId}`, rentalUpdate);
      console.log('Mileage logged and rental completed');

      // Update car status and mileage
      try {
        const carResponse = await secureApi.get(`/cars/${mileageData.carId}`);
        const currentCarData = carResponse.data;

        const formData = new FormData();
        formData.append('make', currentCarData.make);
        formData.append('model', currentCarData.model);
        formData.append('year', currentCarData.year.toString());
        formData.append('color', currentCarData.color);
        formData.append('license_plate', currentCarData.license_plate);
        formData.append('type', currentCarData.type);
        formData.append('status', 'available');
        formData.append('current_mileage', mileageData.newMileage.toString());
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
        if (currentCarData.vin) {
          formData.append('vin', currentCarData.vin);
        }
        if (currentCarData.oil_change_tracking !== undefined) {
          formData.append('oil_change_tracking', currentCarData.oil_change_tracking.toString());
        }
        if (currentCarData.oil_change_interval) {
          formData.append('oil_change_interval', currentCarData.oil_change_interval.toString());
        }
        if (currentCarData.last_oil_change_mileage) {
          formData.append(
            'last_oil_change_mileage',
            currentCarData.last_oil_change_mileage.toString()
          );
        }

        await secureApi.put(`/cars/${mileageData.carId}`, formData);
        console.log('Car updated successfully');
      } catch (carUpdateError) {
        console.warn('Car update failed, but rental was updated:', carUpdateError);
      }

      // Update local state
      setRentals(prevRentals =>
        prevRentals.map(r =>
          r.encrypted_rental_id === mileageData.rentalId
            ? {
                ...r,
                mileage_after: parseInt(mileageData.newMileage),
                car_collected: true,
                contract_status: 'completed',
                payment_status: 'paid',
              }
            : r
        )
      );

      // Update car data
      setCars(prevCars => ({
        ...prevCars,
        [mileageData.carId]: {
          ...prevCars[mileageData.carId],
          current_mileage: parseInt(mileageData.newMileage),
          status: 'available',
        },
      }));

      setShowMileageModal(false);
      setModalStep('mileage'); // Reset for next time
      setStatusMessage(t('rentals.rentalCompletedSuccessfully'));

      setTimeout(() => {
        setStatusMessage('');
      }, 5000);
    } catch (err) {
      console.error('Error collecting car:', err);

      let errorMessage = 'Unknown error';
      if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err.response && err.response.data) {
        errorMessage =
          typeof err.response.data === 'string' ? err.response.data : 'Server validation error';
      }

      setMileageData(prev => ({
        ...prev,
        error: `Failed to collect car: ${errorMessage}`,
      }));
    }
  };

  // Handler functions for rental actions
  const handleCompleteRental = async rental => {
    openMileageModal(rental);
    return;

    try {
      const today = new Date().toISOString().split('T')[0];

      const updateData = {
        rental_end_date: today,
        payment_status: 'paid',
        contract_status: 'completed', // Explicitly set the contract status
        car_collected: true, // Mark as collected in the database
      };

      await secureApi.put(`/rentals/${rental.encrypted_rental_id}`, updateData);

      // First get the current car data to ensure we have all required fields
      const carResponse = await secureApi.get(`/cars/${rental.encrypted_car_id}`);
      const currentCarData = carResponse.data;

      // Create a simple update with just the essential fields
      const carUpdate = {
        status: 'available',
        current_mileage: currentCarData.current_mileage, // Keep the current mileage
      };

      // Update the car using the API
      await secureApi.put(`/cars/${rental.encrypted_car_id}`, carUpdate);

      // Update local state
      setRentals(prevRentals =>
        prevRentals.map(r =>
          r.encrypted_rental_id === rental.encrypted_rental_id
            ? {
                ...r,
                contract_status: 'completed',
                payment_status: 'paid',
                car_collected: true, // Mark as collected
              }
            : r
        )
      );

      setCars(prevCars => ({
        ...prevCars,
        [rental.encrypted_car_id]: {
          ...prevCars[rental.encrypted_car_id],
          status: 'available',
        },
      }));

      setStatusMessage(t('rentals.rentalMarkedCompleted'));

      // Clear the message after 5 seconds
      setTimeout(() => {
        setStatusMessage('');
      }, 5000);
    } catch (err) {
      console.error('Error completing rental:', err);

      // Format the error message properly
      let errorMessage = 'Unknown error';
      if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err.response && err.response.data) {
        // Handle axios error format
        errorMessage =
          typeof err.response.data === 'string'
            ? err.response.data
            : JSON.stringify(err.response.data);
      }

      setError(`Failed to complete rental: ${errorMessage}`);
    }
  };

  const handleDeleteRental = async rentalId => {
    if (!rentalId) {
      console.error('Cannot delete rental: No rental ID provided');
      return;
    }

    if (
      window.confirm('Are you sure you want to delete this rental? This action cannot be undone.')
    ) {
      try {
        console.log(`Deleting rental ${rentalId}`);
        await secureApi.delete(`/rentals/${rentalId}`);

        // Remove the rental from the list
        setRentals(prevRentals =>
          prevRentals.filter(rental => rental.encrypted_rental_id !== rentalId)
        );

        setStatusMessage(t('rentals.rentalDeletedSuccessfully'));

        // Clear the message after 5 seconds
        setTimeout(() => {
          setStatusMessage('');
        }, 5000);
      } catch (err) {
        console.error('Error deleting rental:', err);
        setError(t('rentals.failedToDeleteRental'));
      }
    }
  };

  const handleDownloadReceipt = async rentalId => {
    try {
      // Find the rental to get its pricing data
      const rental = filteredRentals.find(r => (r.encrypted_rental_id || r.id) === rentalId);
      if (!rental) {
        setError('Rental not found');
        return;
      }

      // Get rental currency from car/rental and prepare currency data for PDF
      const rentalCurrency = getRentalCurrency(rental);

      // Create URL with currency and mileage parameters
      const params = new URLSearchParams({
        lang: language, // Add language parameter
        currency_symbol: getCurrencySymbol(rentalCurrency),
        // Send the display values in the chosen currency
        daily_rate_display: formatPrice(rental.daily_rate || 0, rentalCurrency),
        additional_charges_display: formatPrice(rental.additional_charges || 0, rentalCurrency),
        final_price_display: formatPrice(rental.final_price || 0, rentalCurrency),
        amount_paid_display: formatPrice(rental.amount_paid || 0, rentalCurrency),
        // Send the display values with proper mileage units
        mileage_before_display: formatMileageValue(rental.mileage_before || 0),
        mileage_after_display: rental.mileage_after ? formatMileageValue(rental.mileage_after) : '',
        total_distance_display:
          rental.mileage_after && rental.mileage_before
            ? formatMileageValue(rental.mileage_after - rental.mileage_before)
            : '',
      });

      const response = await secureApi.get(
        `/rentals/${rentalId}/download-receipt?${params.toString()}`,
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
      let filename = `rental_receipt_${rentalId}.pdf`;

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

      setStatusMessage(t('rentals.receiptDownloaded'));

      // Clear the message after 5 seconds
      setTimeout(() => {
        setStatusMessage('');
      }, 5000);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      setError(t('rentals.failedToDownloadReceipt'));
    }
  };

  // Format date - cleaner and more compact
  const formatDate = dateString => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="bg-red-900/30 p-6 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-xl font-bold mb-4 text-red-200">{t('common.error')}</h2>
          <p className="mb-4 text-red-300 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-red-400"
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
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-block bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded"
          >
            {t('common.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 w-full text-white min-h-screen ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} justify-between items-center mb-6`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h1 className="text-2xl font-bold text-white">{t('rentals.title')}</h1>
          <p className="text-gray-400 mt-1">{t('rentals.subtitle')}</p>
        </div>
        <Link
          to="/rentals/new"
          className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex ${isRTL ? 'flex-row-reverse' : ''} items-center gap-2`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          {t('rentals.createNew')}
        </Link>
      </div>

      {/* Search and Filters */}
      <div
        className={`flex ${isRTL ? 'flex-row-reverse' : ''} flex-col md:flex-row gap-4 mb-6 px-4`}
      >
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder={t('rentals.searchPlaceholder')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'pr-12 text-right' : 'pl-12'}`}
              dir={isRTL ? 'rtl' : 'ltr'}
              style={isRTL ? { textAlign: 'right', paddingRight: '48px' } : {}}
            />
            <svg
              className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400`}
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

        <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} flex-wrap gap-4`}>
          <FilterButton
            label={t('rentals.allRentals')}
            active={activeFilter === 'all'}
            onClick={() => setActiveFilter('all')}
            isRTL={isRTL}
          />
          <FilterButton
            label={t('rentals.active')}
            active={activeFilter === 'active'}
            onClick={() => setActiveFilter('active')}
            isRTL={isRTL}
          />
          <FilterButton
            label={t('rentals.completed')}
            active={activeFilter === 'completed'}
            onClick={() => setActiveFilter('completed')}
            isRTL={isRTL}
          />
          <FilterButton
            label={t('rentals.overdue')}
            active={activeFilter === 'overdue'}
            onClick={() => setActiveFilter('overdue')}
            isRTL={isRTL}
          />
        </div>
      </div>

      {/* Status message */}
      {statusMessage && (
        <div className="bg-green-900/30 text-green-200 px-4 py-3 rounded-lg mb-6">
          {statusMessage}
        </div>
      )}

      {/* Rental listing */}
      {filteredRentals.length === 0 ? (
        <div className="text-center py-10 bg-gradient-to-br from-gray-900 to-black border border-gray-700/50 rounded-lg">
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <h3 className="text-lg font-medium text-white">{t('rentals.noRentalsFound')}</h3>
          <p className="text-gray-400 mt-1 mb-4">{t('rentals.createFirstRental')}</p>
          <button
            onClick={() => navigate('/rentals/new')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {t('rentals.createNew')}
          </button>
        </div>
      ) : (
        <div className={`rentals-list ${isRTL ? 'rtl' : ''}`}>
          {filteredRentals.map(rental => {
            if (
              !rental.encrypted_rental_id ||
              !rental.encrypted_client_id ||
              !rental.encrypted_car_id
            )
              return null;

            const daysRemaining = getDaysRemaining(rental.rental_end_date);
            const isToday = isDueToday(rental);
            const carDetails = getCarDetails(rental);
            const clientDetails = getClientDetails(rental);
            const carImage = getCarImage(carDetails);

            // Determine status badge
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startDate = new Date(rental.rental_start_date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(rental.rental_end_date);
            endDate.setHours(0, 0, 0, 0);
            const isPastDue = endDate <= today;

            let statusBadgeClass = 'status-badge active';
            let statusText = t('rentals.active');

            if (rental.contract_status === 'completed') {
              statusBadgeClass = 'status-badge completed';
              statusText = t('rentals.completed');
            } else if (rental.contract_status === 'cancelled') {
              statusBadgeClass = 'status-badge';
              statusText = t('rentals.cancelled');
            } else if (today < startDate) {
              statusBadgeClass = 'status-badge future';
              statusText = t('rentals.future') || 'Future';
            } else if (isToday) {
              statusBadgeClass = 'status-badge due-today';
              statusText = t('rentals.dueToday');
            } else if (daysRemaining < 0) {
              statusBadgeClass = 'status-badge overdue';
              statusText = t('rentals.overdue');
            }

            // Payment badge
            let paymentBadgeClass = 'payment-badge unpaid';
            if (rental.payment_status === 'paid') paymentBadgeClass = 'payment-badge paid';
            else if (rental.payment_status === 'partially_paid')
              paymentBadgeClass = 'payment-badge partially-paid';
            else if (rental.payment_status === 'overdue')
              paymentBadgeClass = 'payment-badge payment-overdue';

            const bookingTotals = getBookingTotals(rental);
            const displayTotalCost =
              bookingTotals?.totalMinusFee ?? (parseFloat(rental.final_price) || 0);

            return (
              <div key={rental.encrypted_rental_id} className="rental-card">
                {/* Card Header */}
                <div className={`rental-card-header ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="rental-card-title">
                      {carDetails.make} {carDetails.model}
                    </div>
                    {carDetails.year && (
                      <span
                        className="status-badge"
                        style={{ backgroundColor: '#1f2937', color: '#d1d5db' }}
                      >
                        {carDetails.year}
                      </span>
                    )}
                    {carDetails.license_plate && carDetails.license_plate !== 'N/A' && (
                      <span
                        className="status-badge"
                        style={{ backgroundColor: '#1f2937', color: '#d1d5db' }}
                      >
                        {carDetails.license_plate}
                      </span>
                    )}
                    <span className={statusBadgeClass}>{statusText}</span>
                    <span className="text-xs text-gray-400">
                      {formatDate(rental.rental_start_date)} {t('rentals.to')} {formatDate(rental.rental_end_date)}
                    </span>
                  </div>
                  <div className={`flex gap-2 items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {isPastDue &&
                      rental.contract_status !== 'completed' &&
                      !rental.car_collected && (
                        <button
                          onClick={() => handleCollectCar(rental)}
                          className="rental-action-btn success"
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                        >
                          {t('rentals.collectCar')}
                        </button>
                      )}
                  </div>
                </div>

                {/* Card Body */}
                <Link
                  to={`/rentals/${rental.encrypted_rental_id}`}
                  className="rental-card-body"
                  style={{
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    gap: '1rem',
                    alignItems: 'center',
                    padding: '1rem 1.5rem',
                  }}
                >
                  {/* Car Image */}
                  <div className="h-24 w-24 rounded bg-blue-800 overflow-hidden flex-shrink-0">
                    {carImage ? (
                      <img
                        src={carImage}
                        alt={`${carDetails.make} ${carDetails.model}`}
                        className="h-24 w-24 object-cover"
                      />
                    ) : (
                      <div className="h-24 w-24 flex items-center justify-center">
                        <span className="text-sm font-bold text-white">
                          {carDetails.license_plate && carDetails.license_plate !== 'N/A'
                            ? carDetails.license_plate.substring(0, 3)
                            : carDetails.encrypted_car_id
                              ? carDetails.encrypted_car_id.slice(0, 6)
                              : 'N/A'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'none' }}>
                    <div className="text-sm font-medium text-gray-300">
                      {formatDate(rental.rental_start_date)}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">{t('rentals.to')}</div>
                    <div className="text-sm font-medium text-gray-300 mt-1">
                      {formatDate(rental.rental_end_date)}
                    </div>
                    {rental.contract_status !== 'completed' &&
                      rental.contract_status !== 'cancelled' && (
                        <div className="mt-2">
                          <span
                            className={`status-badge ${
                              isToday
                                ? 'due-today'
                                : daysRemaining < 0
                                  ? 'overdue'
                                  : daysRemaining <= 2
                                    ? 'due-today'
                                    : 'active'
                            }`}
                          >
                            {isToday
                              ? t('rentals.dueToday')
                              : daysRemaining < 0
                                ? t('rentals.overdue')
                                : daysRemaining === 1
                                  ? `1 ${t('rentals.dayLeft')}`
                                  : `${daysRemaining} ${t('rentals.daysLeft')}`}
                          </span>
                        </div>
                      )}
                  </div>

                  <div className="rental-details" style={{ flex: 1, minWidth: 0 }}>
                    <div className={`rental-meta ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="rental-client">{clientDetails.name}</span>
                      <span className={paymentBadgeClass}>
                        {formatPaymentStatus(rental.payment_status)}
                      </span>
                      <span className="text-white font-medium">
                        {formatPrice(displayTotalCost, getRentalCurrency(rental))}
                      </span>
                      {(rental.payment_status === 'unpaid' ||
                        rental.payment_status === 'partially_paid' ||
                        rental.payment_status === 'overdue') && (
                        <span className="text-red-400">
                          {t('rentals.due')}:{' '}
                          {formatPrice(
                            Math.max(
                              0,
                              parseFloat(rental.final_price || 0) -
                                parseFloat(rental.amount_paid || 0)
                            ),
                            getRentalCurrency(rental)
                          )}
                        </span>
                      )}
                    </div>

                    <div className={`rental-description ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className="text-xs text-gray-500 mt-1">
                        {t('rentals.created')}: {formatDate(rental.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Days Remaining Section */}
                  {rental.contract_status !== 'completed' &&
                    rental.contract_status !== 'cancelled' && (
                      <div className="rental-time" style={{ minWidth: '120px', textAlign: isRTL ? 'left' : 'right' }}>
                        <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
                          <span
                            className={`status-badge ${
                              isToday
                                ? 'due-today'
                                : daysRemaining < 0
                                  ? 'overdue'
                                  : daysRemaining <= 2
                                    ? 'due-today'
                                    : 'active'
                            }`}
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
                          >
                            {isToday
                              ? t('rentals.dueToday')
                              : daysRemaining < 0
                                ? t('rentals.overdue')
                                : daysRemaining === 1
                                  ? `1 ${t('rentals.dayLeft')}`
                                  : `${daysRemaining} ${t('rentals.daysLeft')}`}
                          </span>
                        </div>
                      </div>
                    )}
                </Link>

                {/* Card Actions */}
                <div className="rental-actions">
                  <Link
                    to={`/rentals/${rental.encrypted_rental_id}`}
                    className="rental-action-btn secondary"
                  >
                    {t('rentals.viewDetails')}
                  </Link>

                  <button
                    onClick={() => handleDownloadReceipt(rental.encrypted_rental_id)}
                    className="rental-action-btn secondary"
                  >
                    {t('rentals.downloadReceipt')}
                  </button>

                  <Link
                    to={`/rentals/${rental.encrypted_rental_id}?edit=true`}
                    className="rental-action-btn secondary"
                  >
                    {t('rentals.edit')}
                  </Link>

                  <button
                    onClick={() => handleDeleteRental(rental.encrypted_rental_id)}
                    className="rental-action-btn danger"
                  >
                    {t('rentals.delete')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Unified Mileage & Payment Modal */}
      {showMileageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-700/50 rounded-lg p-6 max-w-md w-full relative overflow-hidden">
            {/* Step Indicator */}
            <div className="flex justify-center mb-4 gap-2">
              <div
                className={`h-2 w-16 rounded-full transition-all ${modalStep === 'mileage' ? 'bg-blue-600' : 'bg-gray-600'}`}
              ></div>
              <div
                className={`h-2 w-16 rounded-full transition-all ${modalStep === 'payment' ? 'bg-blue-600' : 'bg-gray-600'}`}
              ></div>
            </div>

            {/* Mileage Page */}
            {modalStep === 'mileage' && (
              <div className="transition-opacity duration-300">
                <h3 className={`text-xl font-bold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('rentals.enterFinalMileage')}
                </h3>

                {mileageData.error && (
                  <div
                    className={`bg-red-900/30 text-red-200 px-3 py-2 rounded-lg mb-4 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {mileageData.error}
                  </div>
                )}

                <p className={`text-gray-300 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('rentals.toCompleteRental')}
                </p>

                <div className="mb-4">
                  <label
                    className={`block text-sm font-medium text-gray-300 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t('rentals.initialMileage')}
                  </label>
                  <input
                    type="number"
                    value={mileageData.initialMileage}
                    readOnly
                    className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-not-allowed ${isRTL ? 'text-right' : 'text-left'}`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>

                <div className="mb-6">
                  <label
                    className={`block text-sm font-medium text-gray-300 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t('rentals.newMileage')}
                  </label>
                  <input
                    type="number"
                    value={mileageData.newMileage}
                    onChange={e =>
                      setMileageData(prev => ({
                        ...prev,
                        newMileage: e.target.value,
                        error: '',
                      }))
                    }
                    className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600 ${isRTL ? 'text-right' : 'text-left'}`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    min={mileageData.initialMileage + 1}
                  />
                </div>

                <div
                  className={`flex ${isRTL ? 'flex-row-reverse' : ''} justify-end ${isRTL ? 'gap-3' : 'space-x-3'}`}
                >
                  <button
                    onClick={() => {
                      setShowMileageModal(false);
                      setModalStep('mileage');
                    }}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                  >
                    {t('rentals.cancel')}
                  </button>
                  <button
                    onClick={handleMileageNext}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    {/* Show 'Next' if payment will follow, 'Submit' if fully paid */}
                    {(() => {
                      const rental = rentals.find(
                        r => r.encrypted_rental_id === mileageData.rentalId
                      );
                      if (rental) {
                        const amountDue =
                          (parseFloat(rental.final_price) || 0) -
                          (parseFloat(rental.amount_paid) || 0);
                        if (amountDue > 0) {
                          return (
                            <>
                              {t('rentals.next') || 'Next'}
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </>
                          );
                        }
                      }
                      return t('rentals.submitComplete');
                    })()}
                  </button>
                </div>
              </div>
            )}

            {/* Payment Page */}
            {modalStep === 'payment' && (
              <div className="transition-opacity duration-300">
                <h3 className={`text-xl font-bold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('rentals.logPayment') || 'Log Payment'}
                </h3>

                {paymentData.error && (
                  <div
                    className={`bg-red-900/30 text-red-200 px-3 py-2 rounded-lg mb-4 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {paymentData.error}
                  </div>
                )}

                <p className={`text-gray-300 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('rentals.carCollectedPaymentPending') ||
                    'Car has been collected. Would you like to log payment?'}
                </p>

                <div className="mb-4 bg-gray-700/50 p-4 rounded-lg">
                  <div className={`flex justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-gray-400">
                      {t('rentals.amountPaid') || 'Amount Paid'}:
                    </span>
                    <span className="text-white font-medium">
                      {formatPrice(
                        paymentData.amountPaid,
                        getRentalCurrency(
                          rentals.find(r => r.encrypted_rental_id === paymentData.rentalId) || {}
                        )
                      )}
                    </span>
                  </div>
                  <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-gray-400">{t('rentals.amountDue') || 'Amount Due'}:</span>
                    <span className="text-red-400 font-bold">
                      {formatPrice(
                        paymentData.amountDue,
                        getRentalCurrency(
                          rentals.find(r => r.encrypted_rental_id === paymentData.rentalId) || {}
                        )
                      )}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <label
                    className={`block text-sm font-medium text-gray-300 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t('rentals.paymentAmount') || 'Payment Amount (Optional)'}
                  </label>
                  <input
                    type="number"
                    value={paymentData.paymentAmount}
                    onChange={e =>
                      setPaymentData(prev => ({
                        ...prev,
                        paymentAmount: e.target.value,
                        error: '',
                      }))
                    }
                    placeholder={t('rentals.enterAmount') || 'Enter amount'}
                    className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600 ${isRTL ? 'text-right' : 'text-left'}`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} flex-col gap-3`}>
                  <button
                    onClick={handlePaidInFull}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    {t('rentals.paidInFull') || 'Paid in Full'}
                  </button>

                  {paymentData.paymentAmount && (
                    <button
                      onClick={handlePartialPayment}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {t('rentals.logPayment') || 'Log Payment'}
                    </button>
                  )}

                  <button
                    onClick={handleSkipPayment}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                  >
                    {t('rentals.skip') || 'Skip (No Payment)'}
                  </button>

                  <button
                    onClick={() => setModalStep('mileage')}
                    className="w-full px-4 py-2 bg-gray-900 text-gray-400 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    {t('rentals.back') || 'Back'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Filter button component
const FilterButton = ({ label, active, onClick, isRTL }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg transition-colors ${
      active ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-300 hover:bg-gray-700'
    } ${isRTL ? 'text-right' : 'text-left'}`}
  >
    {label}
  </button>
);

export default RentalsPage;


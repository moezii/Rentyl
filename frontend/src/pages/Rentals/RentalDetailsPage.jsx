// src/pages/Rentals/RentalDetailsPage.jsx
import { useState, useEffect, useContext } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../components/context/AuthContext';
import secureApi from '../../utils/secureApi';
import { useMileageDisplay } from '../../hooks/useMileageDisplay';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatPrice, getCurrencySymbol } from '../../utils/currencySymbols';
import { calculateOptimalRentalPrice } from '../../utils/priceCalculation';

const RentalDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { formatMileageValue, getMileageUnit } = useMileageDisplay();
  const { t, isRTL, language } = useLanguage();
  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [car, setCar] = useState(null);
  const [client, setClient] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showMileageModal, setShowMileageModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [modalStep, setModalStep] = useState('mileage'); // 'mileage' or 'payment'
  const [mileageData, setMileageData] = useState({
    initialMileage: 0,
    newMileage: 0,
    error: '',
  });
  const [paymentData, setPaymentData] = useState({
    rentalId: null,
    amountPaid: 0,
    amountDue: 0,
    finalPrice: 0,
    paymentAmount: '',
    error: '',
  });
  const [companyCurrency, setCompanyCurrency] = useState('');

  // Check for edit parameter in URL and enable edit mode
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('edit') === 'true') {
      setIsEditing(true);
    }
  }, [location.search]);

  // Get company currency from AuthContext
  const { company } = useContext(AuthContext);

  useEffect(() => {
    if (company?.currency && !companyCurrency) {
      setCompanyCurrency(company.currency);
    }
  }, [company, companyCurrency]);

  // Fetch rental details
  useEffect(() => {
    const fetchRentalDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(`Fetching rental details for ID: ${id}`);

        // Fetch rental data
        const rentalResponse = await secureApi.get(`/rentals/${id}`);

        if (rentalResponse.data) {
          const rentalData = rentalResponse.data;
          console.log('Rental data:', rentalData);

          // Ensure rental has an id field
          if (!rentalData.id && rentalData.rental_id) {
            rentalData.id = rentalData.rental_id;
          } else if (!rentalData.rental_id && rentalData.id) {
            rentalData.rental_id = rentalData.id;
          }

          // Update payment status based on amounts
          const amountPaid = parseFloat(rentalData.amount_paid) || 0;
          const finalPrice = parseFloat(rentalData.final_price) || 0;

          // Determine payment status based on payment and due date
          if (rentalData.payment_status !== 'cancelled') {
            const endDate = new Date(rentalData.rental_end_date);
            const today = new Date();

            // Set time to 0 for date comparison only
            endDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            if (amountPaid === 0) {
              rentalData.payment_status = endDate < today ? 'overdue' : 'unpaid';
            } else if (amountPaid < finalPrice) {
              rentalData.payment_status = endDate < today ? 'overdue' : 'partially_paid';
            } else if (amountPaid >= finalPrice) {
              rentalData.payment_status = 'paid';
            }
          }

          setRental(rentalData);
          // Set currency from rental if present
          if (rentalData.currency && !companyCurrency) {
            setCompanyCurrency(rentalData.currency);
          }

          // Initialize edit data with current rental data
          setEditData({
            rental_end_date: rentalData.rental_end_date,
            amount_paid: rentalData.amount_paid || 0,
            mileage_after: rentalData.mileage_after,
            payment_status: rentalData.payment_status || 'unpaid',
            additional_charges: rentalData.additional_charges || 0,
            additional_charges_description: rentalData.additional_charges_description || '',
            final_price: rentalData.final_price || 0, // Include final price in edit data
          });

          // Initialize mileage data
          setMileageData({
            initialMileage: rentalData.mileage_before || 0,
            newMileage: rentalData.mileage_before ? rentalData.mileage_before + 1 : 1,
            error: '',
          });

          // Fetch car details
          const encryptedCarId = rentalData.encrypted_car_id;
          if (encryptedCarId) {
            try {
              const carResponse = await secureApi.get(`/cars/${encryptedCarId}`);
              if (carResponse.data) {
                console.log('Car data:', carResponse.data);
                setCar(carResponse.data);
                if (carResponse.data.currency && !companyCurrency) {
                  setCompanyCurrency(carResponse.data.currency);
                }
                if (!companyCurrency && carResponse.data.company_id) {
                  try {
                    const companyResponse = await secureApi.get(
                      `/companies/${carResponse.data.company_id}`
                    );
                    if (companyResponse.data?.currency) {
                      setCompanyCurrency(companyResponse.data.currency);
                    }
                  } catch (err) {
                    console.warn('Failed to fetch company currency from car data:', err);
                  }
                }
              }
            } catch (carErr) {
              console.error('Error fetching car details:', carErr);
              // Continue with other data fetching even if car fetch fails
            }
          }

          // Fetch client details
          const encryptedClientId = rentalData.encrypted_client_id || rentalData.client_id;
          if (encryptedClientId) {
            try {
              const clientResponse = await secureApi.get(`/clients/${encryptedClientId}/`);
              if (clientResponse.data) {
                console.log('Client data:', clientResponse.data);
                setClient(clientResponse.data);
              }
            } catch (clientErr) {
              console.error('Error fetching client details:', clientErr);
              // Continue even if client fetch fails
            }
          }
        } else {
          setError('Rental contract not found.');
        }
      } catch (err) {
        console.error('Error fetching rental details:', err);
        const errorMsg = err.response?.data?.detail || t('rentals.failedToLoadRentalDetails');
        setError(`${t('common.error')}: ${errorMsg}. ${t('common.tryAgain')}.`);
      } finally {
        setLoading(false);
      }
    };

    fetchRentalDetails();
  }, [id]);

  // Helper function to check if today is the last day of the rental
  const isDueToday = () => {
    if (!rental || !rental.rental_end_date) return false;

    const endDate = new Date(rental.rental_end_date);
    const today = new Date();

    // Set hours to 0 for date comparison only
    endDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return endDate.getTime() === today.getTime();
  };

  // Function to open mileage modal before completing a rental
  const openMileageModal = () => {
    setMileageData({
      initialMileage: rental.mileage_before || 0,
      newMileage: rental.mileage_before ? rental.mileage_before + 1 : 1,
      error: '',
    });

    setShowMileageModal(true);
  };

  // Handle mileage submission and complete rental
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
      // First, update mileage and mark car as collected
      const rentalUpdate = {
        mileage_after: parseInt(mileageData.newMileage),
        car_collected: true,
      };

      await secureApi.put(`/rentals/${rental.encrypted_rental_id}`, rentalUpdate);

      // Update car's current mileage
      const carFormData = new FormData();
      carFormData.append('current_mileage', mileageData.newMileage);
      carFormData.append('status', 'available');

      await secureApi.put(`/cars/${rental.encrypted_car_id}`, carFormData);

      // Update local state
      setRental({
        ...rental,
        mileage_after: mileageData.newMileage,
        car_collected: true,
      });

      // Update car data if present
      if (car) {
        setCar({
          ...car,
          current_mileage: mileageData.newMileage,
          status: 'available',
        });
      }

      // Close mileage modal
      setShowMileageModal(false);

      // Check payment status
      const amountPaid = parseFloat(rental.amount_paid) || 0;
      const finalPrice = parseFloat(rental.final_price) || 0;
      const amountDue = finalPrice - amountPaid;

      if (amountDue <= 0) {
        // Fully paid - auto-complete the contract
        const completeUpdate = {
          contract_status: 'completed',
          payment_status: 'paid',
        };

        await secureApi.put(`/rentals/${rental.encrypted_rental_id}`, completeUpdate);

        setRental({
          ...rental,
          mileage_after: mileageData.newMileage,
          car_collected: true,
          contract_status: 'completed',
          payment_status: 'paid',
        });

        setStatusMessage(t('rentals.rentalCompletedSuccessfully'));

        // Navigate to car details page
        setTimeout(() => {
          navigate(`/cars/${rental.encrypted_car_id}`, {
            state: {
              refresh: true,
              timestamp: Date.now(),
            },
          });
        }, 1500);
      } else {
        // Not fully paid - show payment modal
        setPaymentData({
          rentalId: rental.encrypted_rental_id,
          amountPaid: amountPaid,
          amountDue: amountDue,
          finalPrice: finalPrice,
          paymentAmount: '',
          error: '',
        });
        // Transition to payment step within same modal
        setModalStep('payment');
        setStatusMessage(t('rentals.carCollectedReturnedToFleet'));
      }

      // Clear the message after 5 seconds
      setTimeout(() => {
        setStatusMessage('');
      }, 5000);
    } catch (err) {
      console.error('Error updating mileage:', err);
      setMileageData(prev => ({
        ...prev,
        error: `Failed to update: ${err.message || 'Unknown error'}`,
      }));
    }
  };

  // Handle "Paid in Full" button
  const handlePaidInFull = async () => {
    try {
      const updateData = {
        amount_paid: paymentData.finalPrice,
        payment_status: 'paid',
        contract_status: 'completed',
      };

      await secureApi.put(`/rentals/${paymentData.rentalId}`, updateData);

      setRental({
        ...rental,
        amount_paid: paymentData.finalPrice,
        payment_status: 'paid',
        contract_status: 'completed',
      });

      setShowMileageModal(false);
      setModalStep('mileage'); // Reset for next time
      setStatusMessage(t('rentals.rentalCompletedSuccessfully'));

      setTimeout(() => {
        setStatusMessage('');
        navigate('/rentals');
      }, 2000);
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

      setRental({
        ...rental,
        amount_paid: newAmountPaid,
        payment_status: updateData.payment_status,
        contract_status: updateData.contract_status,
      });

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

  const handleCompleteRental = async () => {
    // If current mileage after is not set, show the mileage modal
    if (!rental.mileage_after) {
      openMileageModal();
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];

      const updateData = {
        rental_end_date: today,
        payment_status: 'paid',
        contract_status: 'completed', // Explicitly set the contract status
      };

      const response = await secureApi.put(`/rentals/${rental.encrypted_rental_id}`, updateData);

      // Update car status to available if not already updated
      const carFormData = new FormData();
      carFormData.append('status', 'available');

      await secureApi.put(`/cars/${rental.encrypted_car_id}`, carFormData);

      // Update local state
      setRental({
        ...rental,
        contract_status: 'completed',
        payment_status: 'paid',
        car_collected: true, // Mark as collected
      });

      if (car) {
        setCar({
          ...car,
          status: 'available',
        });
      }

      setStatusMessage(t('rentals.rentalMarkedCompleted'));

      // Clear the message after 5 seconds
      setTimeout(() => {
        setStatusMessage('');
      }, 5000);
    } catch (err) {
      console.error('Error completing rental:', err);
      setError(`Failed to complete rental: ${err.message || 'Unknown error'}`);
    }
  };

  const getFinalPriceLabel = () => {
    const label = t('rentals.finalPrice');
    return label && label !== 'rentals.finalPrice' ? label : t('rentals.totalCost');
  };

  const getBookingTotals = rentalData => {
    const description = rentalData?.additional_charges_description || '';
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

  const handleDeleteRental = async () => {
    if (
      window.confirm('Are you sure you want to delete this rental? This action cannot be undone.')
    ) {
      try {
        await secureApi.delete(`/rentals/${rental?.encrypted_rental_id || id}`);
        navigate('/rentals', { state: { message: t('rentals.rentalDeletedSuccessfully') } });
      } catch (err) {
        console.error('Error deleting rental:', err);
        setError(t('rentals.failedToDeleteRental'));
      }
    }
  };

  const handleDownloadReceipt = async () => {
    try {
      // Get currency from rental/car/company and prepare currency data for PDF
      const rentalCurrency = getRentalCurrency();

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
        `/rentals/${rental?.encrypted_rental_id || id}/download-receipt?${params.toString()}`,
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
      let filename = `rental_receipt_${id}.pdf`;

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
    } catch (error) {
      console.error('Error downloading receipt:', error);
      setError(t('rentals.failedToDownloadReceipt'));
    }
  };

  // Contract editing functionality
  const handleEditToggle = () => {
    if (isEditing) {
      // Reset form data when canceling edit
      setEditData({
        rental_end_date: rental.rental_end_date,
        amount_paid: rental.amount_paid || 0,
        mileage_after: rental.mileage_after,
        payment_status: rental.payment_status || 'unpaid',
        additional_charges: rental.additional_charges || 0,
        additional_charges_description: rental.additional_charges_description || '',
      });
    }
    setIsEditing(!isEditing);
  };

  // Updated handleEditChange function in RentalDetailsPage.jsx
  const handleEditChange = e => {
    const { name, value } = e.target;

    // Handle numeric fields
    if (name === 'amount_paid') {
      // Ensure value is a valid number or empty string
      const numValue = value === '' ? '' : parseFloat(value);
      setEditData({
        ...editData,
        [name]: numValue,
      });
    } else if (name === 'additional_charges') {
      // Handle additional charges and recalculate final price
      const numValue = value === '' ? '' : parseFloat(value);

      // Recalculate final price when additional charges change
      const startDate = new Date(rental.rental_start_date);
      const endDate = new Date(editData.rental_end_date || rental.rental_end_date);

      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // Use optimal pricing calculation
        const dailyRate = parseFloat(rental.daily_rate) || 0;
        const weeklyRate = car?.weekly_rate || null;
        const monthlyRate = car?.monthly_rate || null;

        const priceCalc = calculateOptimalRentalPrice(diffDays, dailyRate, weeklyRate, monthlyRate);
        const baseFinalPrice = priceCalc.totalCost;

        const additionalCharges = parseFloat(numValue) || 0;
        const newFinalPrice = baseFinalPrice + additionalCharges;

        setEditData({
          ...editData,
          [name]: numValue,
          final_price: newFinalPrice,
        });
      } else {
        setEditData({
          ...editData,
          [name]: numValue,
        });
      }
    } else if (name === 'mileage_after') {
      // Ensure mileage is a valid integer or empty string
      const numValue = value === '' ? '' : parseInt(value, 10);
      setEditData({
        ...editData,
        [name]: numValue,
      });
    } else if (name === 'rental_end_date') {
      // When end date changes, recalculate final price based on optimal pricing
      const startDate = new Date(rental.rental_start_date);
      const newEndDate = new Date(value);

      if (!isNaN(startDate.getTime()) && !isNaN(newEndDate.getTime())) {
        // Calculate the difference in days between start and new end date
        const diffTime = Math.abs(newEndDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // Use optimal pricing calculation
        const dailyRate = parseFloat(rental.daily_rate) || 0;
        const weeklyRate = car?.weekly_rate || null;
        const monthlyRate = car?.monthly_rate || null;

        const priceCalc = calculateOptimalRentalPrice(diffDays, dailyRate, weeklyRate, monthlyRate);
        const baseFinalPrice = priceCalc.totalCost;

        // Add any additional charges to the final price
        const additionalCharges = parseFloat(editData.additional_charges) || 0;
        const newFinalPrice = baseFinalPrice + additionalCharges;

        // Update the edit data with the new end date and recalculated final price
        setEditData({
          ...editData,
          [name]: value,
          final_price: newFinalPrice,
        });
      } else {
        // If dates are invalid, just update the end date without recalculating
        setEditData({
          ...editData,
          [name]: value,
        });
      }
    } else {
      setEditData({
        ...editData,
        [name]: value,
      });
    }
  };

  const validateEditData = () => {
    // Check if end date is valid and not before start date
    if (editData.rental_end_date) {
      const startDate = new Date(rental.rental_start_date);
      const endDate = new Date(editData.rental_end_date);
      if (isNaN(endDate.getTime())) {
        setError('Invalid end date');
        return false;
      }
      if (endDate < startDate) {
        setError('End date cannot be before start date');
        return false;
      }
    }

    // Check if mileage_after is greater than mileage_before if set
    if (
      editData.mileage_after !== null &&
      editData.mileage_after !== undefined &&
      editData.mileage_after !== ''
    ) {
      if (parseInt(editData.mileage_after, 10) < parseInt(rental.mileage_before || 0, 10)) {
        setError('Ending mileage cannot be less than starting mileage');
        return false;
      }
    }

    return true;
  };

  const handleSaveEdit = async () => {
    try {
      // Validate edit data
      if (!validateEditData()) {
        return;
      }

      // Format numbers and dates properly
      const updateData = {
        rental_end_date: editData.rental_end_date,
        amount_paid: parseFloat(editData.amount_paid) || 0,
        mileage_after: editData.mileage_after !== '' ? parseInt(editData.mileage_after, 10) : null,
        payment_status: editData.payment_status || 'unpaid',
        additional_charges: parseFloat(editData.additional_charges) || 0,
        additional_charges_description: editData.additional_charges_description || '',
        final_price: editData.final_price || rental.final_price, // Include the updated final price
      };

      // Determine payment status based on the amount paid
      const finalPrice = editData.final_price || rental.final_price || 0;
      if (updateData.amount_paid === 0) {
        updateData.payment_status = 'unpaid';
      } else if (updateData.amount_paid < finalPrice) {
        updateData.payment_status = 'partially_paid';
      } else {
        updateData.payment_status = 'paid';
      }

      // Check if the rental is overdue
      const endDate = new Date(updateData.rental_end_date);
      const today = new Date();

      // Set time to 0 for date comparison only
      endDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      if (endDate < today && updateData.payment_status !== 'paid') {
        updateData.payment_status = 'overdue';
      }

      console.log('Saving rental updates:', updateData);

      // Make sure we're using the proper ID field
      const rentalId = rental.encrypted_rental_id;
      const response = await secureApi.put(`/rentals/${rentalId}`, updateData);

      if (response.data) {
        // Update the local state with returned data
        setRental({
          ...rental,
          ...response.data,
          payment_status: updateData.payment_status,
          final_price: updateData.final_price, // Update the final price in the local state
        });

        setStatusMessage(t('rentals.rentalDetailsUpdatedSuccessfully'));
        setIsEditing(false);

        // Navigate back to rentals with refresh flag after a short delay
        setTimeout(() => {
          navigate('/rentals', {
            state: {
              message: t('rentals.rentalDetailsUpdatedSuccessfully'),
              refresh: true,
            },
          });
        }, 1500);
      } else {
        throw new Error('No data returned from update');
      }
    } catch (err) {
      console.error('Error updating rental:', err);
      setError(`Failed to update rental: ${err.message || 'Unknown error'}`);
    }
  };

  // Function to get car image based on make/model
  const getCarImage = () => {
    if (!car) return null;

    // If car has an image URL, use it
    if (car.image_url) {
      console.log(`Using image URL for car ${car.encrypted_car_id}:`, car.image_url);
      return car.image_url;
    }

    // Use default images based on car make
    const make = car.make?.toLowerCase() || '';
    const model = car.model?.toLowerCase() || '';

    if (make.includes('toyota') || model.includes('camry')) {
      console.log(`Using default Toyota image for car ${car.encrypted_car_id}`);
      return camryImage;
    } else if (make.includes('honda') || model.includes('civic') || model.includes('accord')) {
      console.log(`Using default Honda image for car ${car.encrypted_car_id}`);
      return hondaImage;
    } else if (make.includes('ford') || model.includes('mustang')) {
      console.log(`Using default Ford image for car ${car.encrypted_car_id}`);
      return mustangImage;
    }

    // If no match, log for debugging
    console.log(`No matching image found for car ${car.encrypted_car_id} (${make} ${model})`);
    return null;
  };

  // Format date for display
  const formatDate = dateString => {
    if (!dateString) return 'Not specified';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';

    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Determine currency for this rental
  const getRentalCurrency = () => {
    return (car && car.currency) || (rental && rental.currency) || companyCurrency || '';
  };

  // Fallback currency fetch based on rental/company if still missing
  useEffect(() => {
    const fetchCurrencyFallback = async () => {
      if (companyCurrency) return;
      const rentalCompanyId = rental?.company_id;
      const carCompanyId = car?.company_id;
      const companyId = rentalCompanyId || carCompanyId;
      if (!companyId) return;
      try {
        const companyResponse = await secureApi.get(`/companies/${companyId}`);
        if (companyResponse.data?.currency) {
          setCompanyCurrency(companyResponse.data.currency);
        }
      } catch (err) {
        console.warn('Failed to fetch company currency fallback (rental details):', err);
      }
    };
    fetchCurrencyFallback();
  }, [companyCurrency, rental?.company_id, car?.company_id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !rental) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-white">
        <div
          className={`bg-red-900/30 text-red-200 px-4 py-3 rounded-lg mb-6 ${isRTL ? 'text-right' : 'text-left'}`}
        >
          {error || t('rentals.rentalNotFound')}
        </div>
        <Link
          to="/rentals"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          {t('rentals.backToRentals')}
        </Link>
      </div>
    );
  }

  const bookingTotals = getBookingTotals(rental);
  const displayTotalCost = bookingTotals?.totalMinusFee ?? (rental.final_price || 0);
  const displayTotalPaid = bookingTotals?.totalPaid ?? (rental.amount_paid || 0);

  // Rental ID is hidden for security

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
      <div className="p-4 md:p-8 max-w-7xl mx-auto text-white">
        {/* Breadcrumb navigation */}
        <div className="mb-6">
          <div className={`flex items-center text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Link to="/dashboard" className="text-gray-400 hover:text-blue-400">
              {t('nav.dashboard')}
            </Link>
            <span className="mx-2 text-gray-600">/</span>
            <Link to="/rentals" className="text-gray-400 hover:text-blue-400">
              {t('nav.rentals')}
            </Link>
            <span className="mx-2 text-gray-600">/</span>
            <span className="text-white">{t('rentals.rentalDetails')}</span>
          </div>
        </div>

        {/* Status message */}
        {statusMessage && (
          <div className="bg-green-900/30 text-green-200 px-4 py-3 rounded-lg mb-6">
            {statusMessage}
          </div>
        )}

        <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl shadow-lg overflow-hidden mb-8 border border-gray-700/50">
          <div className="p-6">
            <div
              className={`flex ${isRTL ? 'flex-row-reverse' : ''} justify-between items-center mb-6`}
            >
              <h1 className={`text-2xl font-bold ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('rentals.rentalContractDetails')}
              </h1>
              <span
                className={`px-3 py-1 rounded text-sm font-medium ${
                  rental.payment_status === 'paid'
                    ? 'bg-green-500/80 text-white border border-green-500'
                    : rental.payment_status === 'partially_paid'
                      ? 'bg-yellow-500/80 text-white border border-yellow-500'
                      : rental.payment_status === 'overdue'
                        ? 'bg-red-500/80 text-white border border-red-500'
                        : rental.payment_status === 'cancelled'
                          ? 'bg-gray-500/80 text-white border border-gray-500'
                          : 'bg-orange-500/80 text-white border border-orange-500'
                }`}
              >
                {rental.payment_status === 'partially_paid'
                  ? t('rentals.partiallyPaid')
                  : rental.payment_status === 'paid'
                    ? t('rentals.paid')
                    : rental.payment_status === 'unpaid'
                      ? t('rentals.unpaid')
                      : rental.payment_status === 'overdue'
                        ? t('rentals.overdue')
                        : rental.payment_status === 'cancelled'
                          ? t('rentals.cancelled')
                          : t('rentals.pending')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Rental Details */}
              <div className="space-y-6">
                <div className="bg-gray-900/50 rounded-lg p-6">
                  {/* Edit button - standalone at the top for visibility */}
                  <div className="mb-6">
                    <button
                      onClick={handleEditToggle}
                      className={`w-full text-white bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-md text-base font-medium flex items-center justify-center transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      {isEditing ? (
                        <>
                          <svg
                            className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`}
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
                          {t('rentals.cancelEditing')}
                        </>
                      ) : (
                        <>
                          <svg
                            className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                          {t('rentals.editContractDetails')}
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mb-6">
                    <h2
                      className={`text-lg font-semibold text-blue-400 ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      {t('rentals.contractInformation')}
                    </h2>
                  </div>

                  {/* Contract ID hidden for security */}

                  <div className="grid grid-cols-2 gap-6 mt-4">
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="text-gray-400 text-sm mb-1">{t('rentals.totalCost')}</p>
                      <p className="text-white text-xl font-bold">
                        {formatPrice(displayTotalCost, getRentalCurrency())}
                      </p>
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="text-gray-400 text-sm mb-1">{t('rentals.startDate')}</p>
                      <p className="text-white font-medium">
                        {formatDate(rental.rental_start_date)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mt-4">
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="text-gray-400 text-sm mb-1">{t('rentals.endDate')}</p>
                      {isEditing ? (
                        <input
                          type="date"
                          name="rental_end_date"
                          value={editData.rental_end_date}
                          onChange={handleEditChange}
                          className={`w-full px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                          dir={isRTL ? 'rtl' : 'ltr'}
                        />
                      ) : (
                        <p className="text-white font-medium">
                          {formatDate(rental.rental_end_date)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Financial Details Section */}
                  <div className="grid grid-cols-2 gap-6 mt-4">
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="text-gray-400 text-sm mb-1">{t('rentals.dailyRate')}</p>
                      <p className="text-white font-medium">
                        {formatPrice(rental.daily_rate || 0, getRentalCurrency())}
                      </p>
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="text-gray-400 text-sm mb-1">{t('rentals.totalDays')}</p>
                      {isEditing ? (
                        <p className="text-white font-medium">
                          {/* Calculate days based on current editData */}
                          {Math.ceil(
                            (new Date(editData.rental_end_date) -
                              new Date(rental.rental_start_date)) /
                              (1000 * 60 * 60 * 24)
                          ) ||
                            rental.total_days ||
                            0}
                        </p>
                      ) : (
                        <p className="text-white font-medium">{rental.total_days || 0}</p>
                      )}
                    </div>
                  </div>
                  {/* Final Price Section */}
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div
                      className={`flex ${isRTL ? 'flex-row-reverse' : ''} justify-between items-center`}
                    >
                      <p className="text-gray-400 text-sm">{getFinalPriceLabel()}</p>
                      {isEditing && (
                        <p className="text-xs text-blue-400">{t('rentals.updatesAutomatically')}</p>
                      )}
                    </div>
                    {isEditing ? (
                      <p className="text-white text-xl font-bold">
                        {formatPrice(
                          editData.final_price || rental.final_price || 0,
                          getRentalCurrency()
                        )}
                      </p>
                    ) : (
                      <p className="text-white text-xl font-bold">
                        {formatPrice(displayTotalCost, getRentalCurrency())}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6 mt-4">
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="text-gray-400 text-sm mb-1">
                        {t('rentals.paymentStatusLabel')}
                      </p>
                      {isEditing ? (
                        <p className="text-white font-medium">{t('rentals.setAutomatically')}</p>
                      ) : (
                        <p className="text-white font-medium">
                          {rental.payment_status === 'partially_paid'
                            ? t('rentals.partiallyPaid')
                            : rental.payment_status === 'paid'
                              ? t('rentals.paid')
                              : rental.payment_status === 'unpaid'
                                ? t('rentals.unpaid')
                                : rental.payment_status === 'overdue'
                                  ? t('rentals.overdue')
                                  : rental.payment_status === 'cancelled'
                                    ? t('rentals.cancelled')
                                    : t('rentals.notSpecified')}
                        </p>
                      )}
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="text-gray-400 text-sm mb-1">{t('rentals.amountPaid')}</p>
                      {isEditing ? (
                        <input
                          type="number"
                          name="amount_paid"
                          step="0.01"
                          value={editData.amount_paid}
                          onChange={handleEditChange}
                          className={`w-full px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                          dir={isRTL ? 'rtl' : 'ltr'}
                        />
                      ) : (
                        <p className="text-white font-medium">
                          {formatPrice(displayTotalPaid, getRentalCurrency())}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <p
                      className={`text-gray-400 text-sm mb-1 ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      {t('rentals.additionalCharges')}
                    </p>
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="number"
                          name="additional_charges"
                          step="0.01"
                          value={editData.additional_charges}
                          onChange={handleEditChange}
                          className={`w-full px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                          placeholder={t('rentals.amount')}
                          dir={isRTL ? 'rtl' : 'ltr'}
                        />
                        <input
                          type="text"
                          name="additional_charges_description"
                          value={editData.additional_charges_description}
                          onChange={handleEditChange}
                          className={`w-full px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                          placeholder={t('rentals.description')}
                          dir={isRTL ? 'rtl' : 'ltr'}
                        />
                      </div>
                    ) : (
                      <>
                        <p className="text-white font-medium">
                          {formatPrice(rental.additional_charges || 0, getRentalCurrency())}
                        </p>
                      </>
                    )}
                  </div>

                  {rental.notes && (
                    <div className="mt-4">
                      <p
                        className={`text-gray-400 text-sm mb-1 ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {t('rentals.notes')}
                      </p>
                      <p
                        className={`text-white bg-gray-700/50 rounded-lg p-3 ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {rental.notes}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p
                      className={`text-gray-400 text-sm mb-1 ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      {t('rentals.createdAt')}
                    </p>
                    <p className="text-white font-medium">{formatDate(rental.created_at)}</p>
                  </div>

                  {isEditing && (
                    <div className="mt-6">
                      <button
                        onClick={handleSaveEdit}
                        className={`w-full py-3 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors flex items-center justify-center ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <svg
                          className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {t('rentals.saveChanges')}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle and Client Info */}
              <div className="space-y-6">
                <div className="bg-gray-900/50 rounded-lg p-6">
                  <h2
                    className={`text-lg font-semibold mb-4 text-blue-400 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t('rentals.vehicleInformation')}
                  </h2>
                  {car ? (
                    <div
                      className={`flex flex-col md:flex-row gap-6 ${isRTL ? 'md:flex-row-reverse' : ''}`}
                    >
                      <div
                        className={`md:w-1/3 mb-6 md:mb-0 ${isRTL ? 'md:ml-0' : 'md:mr-12'} p-4`}
                      >
                        {getCarImage() ? (
                          <img
                            src={getCarImage()}
                            alt={`${car.make} ${car.model}`}
                            className="w-full h-auto rounded-lg shadow-lg"
                            onError={e => {
                              console.log(
                                `Image load error for car ${car.encrypted_car_id}, falling back to placeholder`
                              );
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.parentNode.innerHTML = `
                              <div class="w-full h-32 bg-gray-700 rounded-lg flex items-center justify-center">
                                <span class="text-4xl font-bold text-white">${car.make?.charAt(0) || '?'}</span>
                              </div>
                            `;
                            }}
                          />
                        ) : (
                          <div className="w-full h-32 bg-gray-700 rounded-lg flex items-center justify-center">
                            <span className="text-4xl font-bold text-white">
                              {car.make?.charAt(0) || '?'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="md:w-2/3 pl-4">
                        <div className="space-y-3">
                          <div className={isRTL ? 'text-right' : 'text-left'}>
                            {/*  <p className="text-gray-400 text-sm mb-1">{t('rentals.carId')}</p>
                          
                          <p className="text-white font-medium">{rental.encrypted_car_id || 'N/A'}</p>
                          */}
                          </div>
                          <div className={isRTL ? 'text-right' : 'text-left'}>
                            <p className="text-gray-400 text-sm mb-1">
                              {t('cars.make')} & {t('cars.model')}
                            </p>
                            <p className="text-white font-medium text-lg">
                              {car.make || ''} {car.model || ''} {car.year ? `(${car.year})` : ''}
                            </p>
                          </div>
                          <div className={isRTL ? 'text-right' : 'text-left'}>
                            <p className="text-gray-400 text-sm mb-1">
                              {t('rentals.licensePlate')}
                            </p>
                            <p className="text-white font-medium">
                              {car.license_plate || t('rentals.notAvailable')}
                            </p>
                          </div>
                          <div className="pt-2">
                            <Link
                              to={
                                rental.encrypted_car_id ? `/cars/${rental.encrypted_car_id}` : '#'
                              }
                              className={`text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}
                              onClick={e => {
                                if (!rental.encrypted_car_id) e.preventDefault();
                              }}
                            >
                              {t('rentals.viewVehicleDetails')}
                              <svg
                                className={`w-4 h-4 ${isRTL ? 'mr-1 rotate-180' : 'ml-1'}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className={`text-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t('rentals.carInfoUnavailable')} {rental.encrypted_car_id || 'N/A'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-gray-900/50 rounded-lg p-6">
                  <h2
                    className={`text-lg font-semibold mb-4 text-blue-400 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t('rentals.clientInformation')}
                  </h2>
                  {client ? (
                    <div className="space-y-2">
                      <div
                        className={`font-bold text-white text-base block w-full ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {client.name}
                      </div>
                      <div
                        className={`text-gray-300 text-sm block w-full ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        <span dir="ltr" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
                          {client.phone_number || client.phone}
                        </span>
                      </div>
                      {client.email && (
                        <div
                          className={`text-gray-300 text-sm block w-full ${isRTL ? 'text-right' : 'text-left'}`}
                        >
                          {client.email}
                        </div>
                      )}
                      {client.documents && client.documents.length > 0 && (
                        <div className="mt-2">
                          <span className="text-gray-400 text-xs font-semibold block mb-1">
                            {t('clients.documents')}
                          </span>
                          <ul className="space-y-1">
                            {client.documents.map((doc, idx) => (
                              <li key={doc.document_id || idx}>
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:underline text-xs"
                                >
                                  {doc.name || t('clients.document')}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic">Client information unavailable.</p>
                  )}
                </div>

                <div className="bg-gray-900/50 rounded-lg p-6">
                  <h2
                    className={`text-lg font-semibold mb-4 text-blue-400 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t('rentals.mileageInformation')}
                  </h2>
                  <div className="space-y-4">
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="text-gray-400 text-sm mb-1">{t('rentals.mileageBefore')}</p>
                      <p className="text-white font-medium">
                        {formatMileageValue(rental.mileage_before || 0)}
                      </p>
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="text-gray-400 text-sm mb-1">{t('rentals.mileageAfter')}</p>
                      {isEditing ? (
                        <input
                          type="number"
                          name="mileage_after"
                          value={editData.mileage_after || ''}
                          onChange={handleEditChange}
                          className={`w-full px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                          dir={isRTL ? 'rtl' : 'ltr'}
                        />
                      ) : (
                        <p className="text-white font-medium">
                          {rental.mileage_after !== null && rental.mileage_after !== undefined
                            ? formatMileageValue(rental.mileage_after)
                            : t('rentals.notRecordedYet')}
                        </p>
                      )}
                    </div>
                    {rental.mileage_after && rental.mileage_before && (
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <p className="text-gray-400 text-sm mb-1">{t('rentals.totalDistance')}</p>
                        <p className="text-white font-medium">
                          {formatMileageValue(rental.mileage_after - rental.mileage_before)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 space-y-4">
              {/* Only show action buttons for active rentals */}

              {rental.contract_status === 'completed' && (
                <div className="bg-gray-700/30 border border-gray-700 rounded-md p-4 text-center text-gray-400">
                  {t('rentals.rentalCompleted')}
                </div>
              )}

              {/* PDF Download Button */}
              <button
                onClick={handleDownloadReceipt}
                className={`w-full text-white bg-green-600 hover:bg-green-700 py-3 px-4 rounded-md text-base font-medium flex items-center justify-center transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <svg
                  className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {t('rentals.downloadReceipt')}
              </button>

              <button
                onClick={handleDeleteRental}
                className={`w-full text-white bg-red-800 hover:bg-red-900 py-2 px-4 rounded-md text-base font-medium flex items-center justify-center ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <svg
                  className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                {t('rentals.deleteRental')}
              </button>
            </div>
          </div>
        </div>

        {/* Unified Mileage & Payment Modal */}
        {showMileageModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full relative overflow-hidden">
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
                      onClick={handleMileageSubmit}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      {t('rentals.submitComplete')}
                      {/* Show arrow icon if payment step will follow */}
                      {(() => {
                        if (rental) {
                          const amountDue =
                            (parseFloat(rental.final_price) || 0) -
                            (parseFloat(rental.amount_paid) || 0);
                          if (amountDue > 0) {
                            return (
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
                            );
                          }
                        }
                        return null;
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
                        {formatPrice(paymentData.amountPaid, getRentalCurrency())}
                      </span>
                    </div>
                    <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-gray-400">
                        {t('rentals.amountDue') || 'Amount Due'}:
                      </span>
                      <span className="text-red-400 font-bold">
                        {formatPrice(paymentData.amountDue, getRentalCurrency())}
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
    </>
  );
};

export default RentalDetailsPage;

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import DefaultCarImg from '../assets/DefaultCarImg.png';
import SEOHead from '../components/SEO/SEOHead';
import { initializePayment, loadSmartBox } from '../utils/amwalPayment';
import secureApi from '../utils/secureApi';
import { formatPrice } from '../utils/currencySymbols';
import BookingConfirmationModal from '../components/BookingConfirmationModal';

const BookingPage = () => {
  const { t, isRTL } = useLanguage();
  const { carId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const car = location.state?.car;
  const rentalStartDate = location.state?.startDate;
  const rentalEndDate = location.state?.endDate;
  const searchParams = new URLSearchParams(location.search);
  const responseCodeParam =
    searchParams.get('responseCode') ||
    searchParams.get('ResponseCode') ||
    searchParams.get('code') ||
    '';
  const isSuccessParam = searchParams.get('isSuccess');
  let urlPaymentStatus = searchParams.get('payment');
  let urlPaymentCode = responseCodeParam;

  if (!urlPaymentStatus) {
    if (responseCodeParam) {
      urlPaymentStatus = responseCodeParam === '00' ? 'success' : 'failed';
    } else if (isSuccessParam) {
      urlPaymentStatus = isSuccessParam === 'true' ? 'success' : 'failed';
    }
  }
  const paymentStatus = urlPaymentStatus;
  const paymentCode = urlPaymentCode;
  const paymentFailed = paymentStatus === 'failed';

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    collectionAddress: '',
    pickupTime: '',
  });

  const [licenseFile, setLicenseFile] = useState(null);
  const [idFile, setIdFile] = useState(null);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const deliveryOffered = Boolean(car?.delivery_offered);
  const [deliveryRequested, setDeliveryRequested] = useState(false);

  const [formErrors, setFormErrors] = useState({});
  const [priceBreakdown, setPriceBreakdown] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationModalData, setConfirmationModalData] = useState({
    type: 'success',
    bookingId: null,
    email: '',
    transactionId: null,
  });
  const [isCompletingBooking, setIsCompletingBooking] = useState(false);

  const getRateDisplay = () => {
    const dailyRate = priceBreakdown?.daily_rate ?? car?.daily_rate ?? 0;
    const weeklyRate = car?.weekly_rate ?? 0;
    const monthlyRate = car?.monthly_rate ?? 0;
    const totalDays = priceBreakdown?.total_days ?? 0;

    const canUseWeekly = weeklyRate > 0 && dailyRate > 0 && weeklyRate < dailyRate * 7;

    if (monthlyRate > 0 && totalDays >= 30) {
      return {
        label: t('booking.monthlyRate'),
        value: monthlyRate,
        unit: t('booking.perMonth'),
      };
    }

    if (canUseWeekly && totalDays >= 7) {
      return {
        label: t('booking.weeklyRate'),
        value: weeklyRate,
        unit: t('booking.perWeek'),
      };
    }

    return {
      label: t('booking.dailyRate'),
      value: dailyRate,
      unit: t('booking.perDay'),
    };
  };

  const getMaxStartDateStr = () => {
    const today = new Date();
    const maxStart = new Date();
    maxStart.setDate(maxStart.getDate() + 7);
    return maxStart.toISOString().split('T')[0];
  };

  const isStartDateWithinWindow = startDate => {
    if (!startDate) return false;
    return startDate <= getMaxStartDateStr();
  };

  // SECURITY: Fetch price from backend - never calculate on frontend
  useEffect(() => {
    const fetchPrice = async () => {
      if (rentalStartDate && rentalEndDate && car) {
        if (!isStartDateWithinWindow(rentalStartDate)) {
          setPaymentError(
            t('booking.startDateTooFar') || 'Start date must be within 7 days from today'
          );
          setPriceBreakdown(null);
          return;
        }

        setPaymentError(null);
        setLoadingPrice(true);

        try {
          const response = await secureApi.get(
            `/bookings/calculate-price/${car.encrypted_car_id}`,
            {
              params: {
                start_date: rentalStartDate,
                end_date: rentalEndDate,
              },
            }
          );

          if (response.data && response.data.success) {
            setPriceBreakdown(response.data.data);
          }
        } catch (error) {
          console.error('Error fetching price:', error);
          setPriceBreakdown(null);
        } finally {
          setLoadingPrice(false);
        }
      } else {
        setPriceBreakdown(null);
      }
    };

    fetchPrice();
  }, [rentalStartDate, rentalEndDate, car]);

  // Redirect if no car data or dates
  useEffect(() => {
    if (!car || !rentalStartDate || !rentalEndDate) {
      if (paymentStatus) {
        if (!car) {
          if (paymentStatus === 'failed') {
            navigate('/book', {
              replace: true,
              state: {
                paymentModal: {
                  type: 'failure',
                  bookingId: null,
                  email: '',
                  transactionId: null,
                },
              },
            });
          } else {
            navigate('/book', { replace: true });
          }
        }
        return;
      }
      navigate('/book');
    }
  }, [car, rentalStartDate, rentalEndDate, navigate, paymentStatus]);

  useEffect(() => {
    if (!paymentStatus) {
      return;
    }

    setIsProcessingPayment(false);
    setIsCompletingBooking(false);
    setUploadingDocuments(false);

    if (paymentStatus === 'failed') {
      setPaymentError(
        paymentCode ? `Payment failed (code ${paymentCode}). Please try again.` : 'Payment failed. Please try again.'
      );
      setConfirmationModalData({
        type: 'failure',
        bookingId: null,
        email: '',
        transactionId: null,
      });
      setShowConfirmationModal(true);
    }
  }, [paymentStatus, paymentCode]);

  useEffect(() => {
    setDeliveryRequested(false);
    setFormData(prev => ({
      ...prev,
      collectionAddress: '',
      pickupTime: '',
    }));
    setFormErrors(prev => ({
      ...prev,
      collectionAddress: '',
      pickupTime: '',
    }));
  }, [car?.encrypted_car_id]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleDeliveryToggle = e => {
    const checked = e.target.checked;
    setDeliveryRequested(checked);
    if (!checked) {
      setFormData(prev => ({
        ...prev,
        collectionAddress: '',
        pickupTime: '',
      }));
      setFormErrors(prev => ({
        ...prev,
        collectionAddress: '',
        pickupTime: '',
      }));
    }
  };

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setFormErrors(prev => ({
          ...prev,
          [fileType]: 'File size must be less than 5MB',
        }));
        return;
      }

      // Validate file type (PDF, JPG, PNG)
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        setFormErrors(prev => ({
          ...prev,
          [fileType]: 'Only PDF, JPG, and PNG files are allowed',
        }));
        return;
      }

      if (fileType === 'license') {
        setLicenseFile(file);
      } else if (fileType === 'id') {
        setIdFile(file);
      }

      // Clear error for this field
      if (formErrors[fileType]) {
        setFormErrors(prev => ({
          ...prev,
          [fileType]: '',
        }));
      }
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.fullName.trim()) {
      errors.fullName = t('booking.fullNameRequired');
    }

    if (!formData.email.trim()) {
      errors.email = t('booking.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = t('booking.emailInvalid');
    }

    if (!formData.phone.trim()) {
      errors.phone = t('booking.phoneRequired');
    }

    if (!deliveryOffered && !formData.pickupTime.trim()) {
      errors.pickupTime = t('booking.pickupTimeRequired');
    }

    if (!licenseFile) {
      errors.license = t('booking.driverLicenseDocumentRequired');
    }

    if (!idFile) {
      errors.id = t('booking.idDocumentRequired');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const uploadDocument = async file => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await secureApi.post('/upload/document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.path && response.data.upload_token) {
        return {
          path: response.data.path,
          uploadToken: response.data.upload_token,
        };
      } else {
        throw new Error('Upload failed - no path returned');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      throw new Error('Failed to upload document');
    }
  };

  const validateDocument = async (file, fieldKey) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await secureApi.post('/upload/validate-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (response?.status >= 400 || !response?.data?.success) {
        const message =
          response?.data?.detail ||
          response?.data?.message ||
          'Document validation failed';
        setFormErrors(prev => ({
          ...prev,
          [fieldKey]: message,
        }));
        throw new Error(message);
      }
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        'Document validation failed';
      setFormErrors(prev => ({
        ...prev,
        [fieldKey]: message,
      }));
      throw new Error(message);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!isStartDateWithinWindow(rentalStartDate)) {
      setPaymentError(
        t('booking.startDateTooFar') || 'Start date must be within 7 days from today'
      );
      return;
    }

    try {
      if (licenseFile) {
        await validateDocument(licenseFile, 'license');
      }
      if (idFile) {
        await validateDocument(idFile, 'id');
      }
    } catch (error) {
      const message =
        error.message?.includes('PDF contains JavaScript')
          ? 'The PDF appears to be corrupted or unsafe. Please upload a different file.'
          : error.message || 'Document validation failed';
      setPaymentError(message);
      setConfirmationModalData({
        type: 'failure',
        bookingId: null,
        email: formData.email || '',
        transactionId: null,
      });
      setShowConfirmationModal(true);
      return;
    }

    try {
      setIsProcessingPayment(true);
      setPaymentError(null);

      // STEP 1: Silently validate booking BEFORE showing payment gateway
      // Do NOT upload documents yet - only validate data
      const validationData = {
        car_id: car.encrypted_car_id,
        customer_email: formData.email,
        customer_phone: formData.phone,
        customer_name: formData.fullName,
        rental_start_date: rentalStartDate,
        rental_end_date: rentalEndDate,
        collection_address: deliveryOffered && deliveryRequested ? formData.collectionAddress : null,
        pickup_time: deliveryOffered
          ? deliveryRequested
            ? formData.pickupTime
            : null
          : formData.pickupTime,
      };

      const validationResponse = await secureApi.post('/bookings/validate', validationData);

      if (!validationResponse.data || !validationResponse.data.success) {
        throw new Error('Booking validation failed. Please check your details and try again.');
      }

      // Validation successful - proceed with payment
      const validatedData = validationResponse.data.data;

      // STEP 2: Upload documents BEFORE payment to guarantee availability
      setUploadingDocuments(true);
      let licenseUpload = null;
      let idUpload = null;

      try {
        if (licenseFile) {
          licenseUpload = await uploadDocument(licenseFile);
        }
        if (idFile) {
          idUpload = await uploadDocument(idFile);
        }
      } catch (uploadError) {
        setUploadingDocuments(false);
        setIsProcessingPayment(false);

        setConfirmationModalData({
          type: 'failure',
          bookingId: null,
          email: formData.email || '',
          transactionId: null,
        });
        setShowConfirmationModal(true);
        return;
      }

      setUploadingDocuments(false);

      // Ensure SmartBox is loaded
      await loadSmartBox();

      // Generate unique merchant reference. The car is bound to the payment by
      // the backend's signed payment intent, so the (now longer) encrypted car ID
      // is not embedded here.
      const merchantReference = `RENTYL_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // SECURITY: Use backend-calculated price from validation (already includes 5% platform fee)
      const validatedPrice = validatedData.price_breakdown.total_cost;
      if (!validatedPrice) {
        throw new Error('Price not calculated. Please wait and try again.');
      }

      // STEP 3: Initialize payment with AMWAL gateway (only after successful validation)
      await initializePayment({
        amount: validatedPrice, // Use validated price (already includes platform fee)
        merchantReference: merchantReference,
        languageId: isRTL ? 'ar' : 'en',
        paymentViewType: 2, // 1 = Popup, 2 = Fullscreen
        sessionToken: '', // Empty for first-time payment

        // Success callback
        completeCallback: async (responseData, paymentToken) => {
          // console.log('[Booking] Payment successful');

          try {
            // Show completing booking overlay after payment gateway closes
            setIsCompletingBooking(true);

            const licenseUrl = licenseUpload?.path || null;
            const idUrl = idUpload?.path || null;

            // AMWAL response structure: responseData.data.data contains the payment data
            const paymentData = responseData.data.data;

            // STEP 4: Create booking record in database
            // The backend takes transaction, reference, amount and status from the
            // verified payment token; the other payment fields are informational.
            const bookingData = {
              car_id: car.encrypted_car_id,
              payment_token: paymentToken,
              payment_transaction_id: paymentData.transactionId,
              payment_reference: merchantReference,
              amount_paid: validatedPrice, // Use validated price (already includes platform fee)
              currency_id: 512,
              customer_email: formData.email,
              customer_phone: formData.phone,
              customer_name: formData.fullName,
              payment_status: 'completed',
              payment_response_code: paymentData.responseCode || '00',
              rental_start_date: rentalStartDate,
              rental_end_date: rentalEndDate,
              license_document_url: licenseUrl,
              id_document_url: idUrl,
              collection_address: deliveryOffered && deliveryRequested ? formData.collectionAddress : null,
              pickup_time: deliveryOffered
                ? deliveryRequested
                  ? formData.pickupTime
                  : null
                : formData.pickupTime,
            };

            // console.log('[Booking] Creating booking');

            const bookingResponse = await secureApi.post('/bookings/create', bookingData);

            if (bookingResponse.data && bookingResponse.data.success) {
              setIsCompletingBooking(false);
              setIsProcessingPayment(false);
              navigate('/book', {
                replace: true,
                state: {
                  paymentModal: {
                    type: 'success',
                    bookingId: bookingResponse.data.data.id,
                    email: formData.email,
                    transactionId: paymentData.transactionId,
                  },
                },
              });
            } else {
              throw new Error('Failed to create booking');
            }
          } catch (error) {
            console.error('[Booking] Error creating booking');
            // if (error.response) {
            //   console.error('[Booking] Error response:', error.response.data);
            // }
            setIsCompletingBooking(false);
            setIsProcessingPayment(false);

            // Show failure modal
            setConfirmationModalData({
              type: 'failure',
              bookingId: null,
              email: formData.email,
              transactionId: null,
            });
            setShowConfirmationModal(true);
          }
        },

        // Error callback
        errorCallback: data => {
          console.error('[Booking] Payment error');
          setIsProcessingPayment(false);

          // Extract error message from AMWAL response
          let errorMessage = 'Payment failed. Please try again.';
          if (data && data.data) {
            if (data.data.message) {
              errorMessage = data.data.message;
            } else if (data.data.errorMessage) {
              errorMessage = data.data.errorMessage;
            } else if (data.data.responseMessage) {
              errorMessage = data.data.responseMessage;
            } else if (typeof data.data === 'string') {
              errorMessage = data.data;
            }
          } else if (data && data.message) {
            errorMessage = data.message;
          }

          setPaymentError(errorMessage);
        },

        // Cancel callback
        cancelCallback: () => {
          // console.log('[Booking] Payment cancelled by user');
          setIsProcessingPayment(false);
          setPaymentError('Payment was cancelled.');
        },

        // Optional: Add return and cancel URLs
        returnUrl: `${window.location.origin}/api/payment/return?carId=${car.encrypted_car_id}`,
        cancelUrl: `${window.location.origin}/api/payment/return?carId=${car.encrypted_car_id}&cancel=1`,
        bookingContext: {
          car_id: car.encrypted_car_id,
          start_date: rentalStartDate,
          end_date: rentalEndDate,
          expected_amount: validatedPrice,
          license_upload_token: licenseUpload?.uploadToken,
          id_upload_token: idUpload?.uploadToken,
        },
      });
    } catch (error) {
      console.error('[Booking] Error initializing payment:', error);
      setIsProcessingPayment(false);
      const message = error.message || 'Failed to initialize payment. Please try again.';
      setPaymentError(message);
      setConfirmationModalData({
        type: 'failure',
        bookingId: null,
        email: formData.email || '',
        transactionId: null,
      });
      setShowConfirmationModal(true);
    }
  };

  const handleImageError = e => {
    e.target.src = DefaultCarImg;
    e.target.onerror = null;
  };

  const handleModalClose = () => {
    setShowConfirmationModal(false);
    if (confirmationModalData.type === 'success') {
      navigate('/book');
      return;
    }
    navigate('/book');
  };

  if (!car) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 min-h-screen">
      <SEOHead
        title={`${t('booking.title')} ${car.make} ${car.model} - Rentyl`}
        description={`${t('booking.completeBooking')} ${car.make} ${car.model}`}
        keywords="car rental booking, rent car, vehicle booking"
        canonical={`https://rentyl.app/booking/${car.encrypted_car_id}`}
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
      <div className="relative pt-32 pb-16 px-4">
        <div className="container mx-auto relative z-10">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-8"
            >
              <div className="inline-block mb-6 px-6 py-3 bg-blue-500/10 border border-blue-500/30 rounded-full">
                <span className="text-blue-400 text-sm font-bold tracking-wide">
                  {t('booking.completeBooking').toUpperCase()}
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
                {t('booking.title')}
              </h1>
            </motion.div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Booking Form - 2 columns */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="lg:col-span-2"
              >
                <div className="bg-gradient-to-br from-gray-900/60 to-black/60 backdrop-blur-2xl border border-blue-500/30 rounded-3xl p-8 shadow-2xl shadow-blue-500/20">
                  <h2 className="text-2xl font-bold text-white mb-6">
                    {t('booking.yourInformation')}
                  </h2>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Full Name */}
                    <div>
                      <label
                        htmlFor="fullName"
                        className="block text-sm font-semibold text-gray-300 mb-2"
                      >
                        {t('booking.fullName')}{' '}
                        <span className="text-red-400">{t('booking.required')}</span>
                      </label>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        value={formData.fullName}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 bg-gray-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 ${
                          formErrors.fullName
                            ? 'border-red-500/50 focus:ring-red-500/50'
                            : 'border-blue-500/30 focus:ring-blue-500/50 focus:border-blue-500/50'
                        }`}
                        placeholder="John Doe"
                      />
                      {formErrors.fullName && (
                        <p className="mt-2 text-sm text-red-400">{formErrors.fullName}</p>
                      )}
                    </div>

                    {/* Email & Phone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label
                          htmlFor="email"
                          className="block text-sm font-semibold text-gray-300 mb-2"
                        >
                          {t('booking.emailAddress')}{' '}
                          <span className="text-red-400">{t('booking.required')}</span>
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 bg-gray-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 ${
                            formErrors.email
                              ? 'border-red-500/50 focus:ring-red-500/50'
                              : 'border-blue-500/30 focus:ring-blue-500/50 focus:border-blue-500/50'
                          }`}
                          placeholder="john@example.com"
                        />
                        {formErrors.email && (
                          <p className="mt-2 text-sm text-red-400">{formErrors.email}</p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="phone"
                          className="block text-sm font-semibold text-gray-300 mb-2"
                        >
                          {t('booking.phoneNumber')}{' '}
                          <span className="text-red-400">{t('booking.required')}</span>
                        </label>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 bg-gray-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 ${
                            formErrors.phone
                              ? 'border-red-500/50 focus:ring-red-500/50'
                              : 'border-blue-500/30 focus:ring-blue-500/50 focus:border-blue-500/50'
                          }`}
                          placeholder="+1 234 567 8900"
                        />
                        {formErrors.phone && (
                          <p className="mt-2 text-sm text-red-400">{formErrors.phone}</p>
                        )}
                      </div>
                    </div>

                    {/* Delivery Option / Pickup Time */}
                    {deliveryOffered ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 bg-gray-900/40 border border-blue-500/20 rounded-xl p-4">
                          <input
                            id="deliveryRequested"
                            type="checkbox"
                            checked={deliveryRequested}
                            onChange={handleDeliveryToggle}
                            className="h-5 w-5 text-blue-500 bg-gray-800 border-blue-500/40 rounded focus:ring-blue-500/50"
                          />
                          <label
                            htmlFor="deliveryRequested"
                            className="text-sm font-semibold text-gray-200"
                          >
                            {t('booking.deliveryOption') || 'Request car delivery'}
                          </label>
                        </div>

                        {deliveryRequested && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label
                                htmlFor="collectionAddress"
                                className="block text-sm font-semibold text-gray-300 mb-2"
                              >
                                {t('booking.deliveryAddress') || 'Delivery Address'}
                              </label>
                              <input
                                id="collectionAddress"
                                name="collectionAddress"
                                type="text"
                                value={formData.collectionAddress}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 bg-gray-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 ${
                                  formErrors.collectionAddress
                                    ? 'border-red-500/50 focus:ring-red-500/50'
                                    : 'border-blue-500/30 focus:ring-blue-500/50 focus:border-blue-500/50'
                                }`}
                                placeholder={t('booking.collectionAddressPlaceholder')}
                              />
                              {formErrors.collectionAddress && (
                                <p className="mt-2 text-sm text-red-400">{formErrors.collectionAddress}</p>
                              )}
                            </div>
                            <div>
                              <label
                                htmlFor="pickupTime"
                                className="block text-sm font-semibold text-gray-300 mb-2"
                              >
                                {t('booking.deliveryTime') || 'Delivery Time'}
                              </label>
                              <input
                                id="pickupTime"
                                name="pickupTime"
                                type="time"
                                value={formData.pickupTime}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 bg-gray-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 ${
                                  formErrors.pickupTime
                                    ? 'border-red-500/50 focus:ring-red-500/50'
                                    : 'border-blue-500/30 focus:ring-blue-500/50 focus:border-blue-500/50'
                                }`}
                              />
                              {formErrors.pickupTime && (
                                <p className="mt-2 text-sm text-red-400">{formErrors.pickupTime}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label
                            htmlFor="pickupTime"
                            className="block text-sm font-semibold text-gray-300 mb-2"
                          >
                            {t('booking.pickupTime')}{' '}
                            <span className="text-red-400">{t('booking.required')}</span>
                          </label>
                          <input
                            id="pickupTime"
                            name="pickupTime"
                            type="time"
                            value={formData.pickupTime}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 bg-gray-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 ${
                              formErrors.pickupTime
                                ? 'border-red-500/50 focus:ring-red-500/50'
                                : 'border-blue-500/30 focus:ring-blue-500/50 focus:border-blue-500/50'
                            }`}
                          />
                          {formErrors.pickupTime && (
                            <p className="mt-2 text-sm text-red-400">{formErrors.pickupTime}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Document Uploads */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Driver License Upload */}
                      <div>
                        <label
                          htmlFor="licenseFile"
                          className="block text-sm font-semibold text-gray-300 mb-2"
                        >
                          {t('booking.driverLicenseDocument')}{' '}
                          <span className="text-red-400">{t('booking.required')}</span>
                        </label>
                        <div className="relative">
                          <input
                            id="licenseFile"
                            name="licenseFile"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={e => handleFileChange(e, 'license')}
                            className="hidden"
                          />
                          <label
                            htmlFor="licenseFile"
                            className={`flex items-center justify-center w-full px-4 py-3 bg-gray-900/50 border rounded-xl cursor-pointer transition-all duration-300 ${
                              formErrors.license
                                ? 'border-red-500/50'
                                : 'border-blue-500/30 hover:border-blue-500/50'
                            }`}
                          >
                            <svg
                              className="w-5 h-5 mr-2 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              />
                            </svg>
                            <span className="text-sm text-gray-300">
                              {licenseFile ? licenseFile.name : t('booking.uploadLicense')}
                            </span>
                          </label>
                        </div>
                        {formErrors.license && (
                          <p className="mt-2 text-sm text-red-400">{formErrors.license}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">{t('booking.fileTypeHint')}</p>
                      </div>

                      {/* ID Document Upload */}
                      <div>
                        <label
                          htmlFor="idFile"
                          className="block text-sm font-semibold text-gray-300 mb-2"
                        >
                          {t('booking.idDocument')}{' '}
                          <span className="text-red-400">{t('booking.required')}</span>
                        </label>
                        <div className="relative">
                          <input
                            id="idFile"
                            name="idFile"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={e => handleFileChange(e, 'id')}
                            className="hidden"
                          />
                          <label
                            htmlFor="idFile"
                            className={`flex items-center justify-center w-full px-4 py-3 bg-gray-900/50 border rounded-xl cursor-pointer transition-all duration-300 ${
                              formErrors.id
                                ? 'border-red-500/50'
                                : 'border-blue-500/30 hover:border-blue-500/50'
                            }`}
                          >
                            <svg
                              className="w-5 h-5 mr-2 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              />
                            </svg>
                            <span className="text-sm text-gray-300">
                              {idFile ? idFile.name : t('booking.uploadID')}
                            </span>
                          </label>
                        </div>
                        {formErrors.id && (
                          <p className="mt-2 text-sm text-red-400">{formErrors.id}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">{t('booking.fileTypeHint')}</p>
                      </div>
                    </div>

                    {/* Important Note */}
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                      <div className="flex items-start">
                        <svg
                          className={`w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0 ${isRTL ? 'ml-3' : 'mr-3'}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <div className="flex-1">
                          <p className="text-yellow-400 font-semibold text-sm mb-1">
                            {isRTL ? 'المتطلبات المهمة' : 'Important Requirements'}
                          </p>
                          <ul className={`text-yellow-200 text-xs space-y-1 list-disc ${isRTL ? 'list-inside mr-4' : 'list-inside'}`}>
                            <li>{isRTL ? 'يجب أن يكون عمرك 21 عامًا على الأقل' : 'You must be at least 21 years old'}</li>
                            <li>{isRTL ? 'يجب عليك تقديم نفس المستندات المرفوعة عند استلام السيارة' : 'You must present the same uploaded documents when collecting the car'}</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Rental Dates Display */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-300 mb-2">
                            {t('booking.rentalPeriod') || 'Rental Period'}
                          </h3>
                          <div className="flex items-center gap-2 text-white">
                            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="font-semibold">{rentalStartDate}</span>
                            <span className="text-gray-400">to</span>
                            <span className="font-semibold">{rentalEndDate}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate('/book')}
                          className="text-blue-400 hover:text-blue-300 text-sm font-semibold flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          {t('book.changeDates') || 'Change'}
                        </button>
                      </div>
                    </div>

                    {/* Payment Error Message */}
                    {paymentError && (
                      <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-4 rounded-xl">
                        {paymentError}
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isProcessingPayment || uploadingDocuments}
                      className={`w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-4 px-6 rounded-full shadow-lg shadow-blue-500/50 transition-all duration-300 flex items-center justify-center text-lg hover:scale-105 ${
                        isProcessingPayment || uploadingDocuments
                          ? 'opacity-50 cursor-not-allowed'
                          : ''
                      }`}
                    >
                      {uploadingDocuments ? (
                        <>
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white mr-2"></div>
                          Uploading Documents...
                        </>
                      ) : isProcessingPayment ? (
                        <>
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white mr-2"></div>
                          Processing Payment...
                        </>
                      ) : (
                        <>
                          {t('booking.proceedToPayment')}
                          <svg
                            className="w-6 h-6 ml-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 7l5 5m0 0l-5 5m5-5H6"
                            />
                          </svg>
                        </>
                      )}
                    </button>

                    <div className="text-center text-sm text-gray-400">
                      <p>{t('booking.securePayment')}</p>
                      <p className="mt-1">{t('booking.paymentEncrypted')}</p>
                    </div>
                  </form>
                </div>
              </motion.div>

              {/* Booking Summary - 1 column */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="lg:col-span-1"
              >
                <div className="bg-gradient-to-br from-gray-900/60 to-black/60 backdrop-blur-2xl border border-blue-500/30 rounded-3xl p-6 shadow-2xl shadow-blue-500/20 sticky top-24">
                  <h2 className="text-xl font-bold text-white mb-6">
                    {t('booking.bookingSummary')}
                  </h2>

                  {/* Car Image */}
                  <div className="relative h-40 bg-gray-900/50 rounded-2xl overflow-hidden mb-6">
                    <img
                      src={car.imageUrl || DefaultCarImg}
                      alt={`${car.make} ${car.model}`}
                      className="w-full h-full object-cover"
                      onError={handleImageError}
                    />
                  </div>

                  {/* Car Info */}
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {car.make} {car.model}
                    </h3>
                    <p className="text-gray-400">
                      {car.year} • {car.color}
                    </p>
                  </div>

                  {/* Rental Details */}
                  <div className="space-y-4 mb-6 pb-6 border-b border-blue-500/20">
                    {loadingPrice ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-400"></div>
                        <span className={`text-gray-400 text-sm ${isRTL ? 'mr-2' : 'ml-2'}`}>
                          {t('booking.calculatingPrice')}
                        </span>
                      </div>
                    ) : priceBreakdown ? (
                      <>
                        {(() => {
                          const rateDisplay = getRateDisplay();
                          return (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">{rateDisplay.label}</span>
                              <span className="text-white font-semibold">
                                {formatPrice(rateDisplay.value, car.currency)} {rateDisplay.unit}
                              </span>
                            </div>
                          );
                        })()}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">{t('booking.duration')}</span>
                          <span className="text-white font-semibold">
                            {priceBreakdown.total_days}{' '}
                            {priceBreakdown.total_days > 1 ? t('booking.days') : t('booking.day')}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">{t('booking.rentalCost')}</span>
                          <span className="text-white font-semibold">
                            {formatPrice(priceBreakdown.base_rental_cost, car.currency)}
                          </span>
                        </div>
                        {priceBreakdown.future_booking_fee > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-yellow-400">{t('booking.futureBookingFee')}</span>
                            <span className="text-yellow-400 font-semibold">
                              +{formatPrice(priceBreakdown.future_booking_fee, car.currency)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">{t('booking.subtotal')}</span>
                          <span className="text-white font-semibold">
                            {formatPrice(priceBreakdown.base_rental_cost + priceBreakdown.future_booking_fee, car.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-400">{t('booking.platformFee', { percent: 5 })}</span>
                          <span className="text-blue-400 font-semibold">
                            +{formatPrice(priceBreakdown.platform_fee, car.currency)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-gray-400 text-sm py-4">
                        {t('booking.selectDatesToSeePricing')}
                      </div>
                    )}
                  </div>

                  {/* Total Cost */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-lg">{t('booking.totalCost')}</span>
                      <span className="text-3xl font-bold text-white">
                        {priceBreakdown ? formatPrice(priceBreakdown.total_cost, car.currency) : formatPrice(0, car.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Info Note */}
                  <div className="mt-6 p-4 bg-gray-900/50 border border-blue-500/20 rounded-xl">
                    <p className="text-gray-400 text-xs leading-relaxed">
                      {t('booking.bookingTerms')}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Processing Overlay - Shows after payment gateway closes while creating booking */}
      {isCompletingBooking && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-blue-500/30 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl shadow-blue-500/20">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 mb-6">
                <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-500"></div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {uploadingDocuments
                  ? isRTL
                    ? 'جاري تحميل المستندات...'
                    : 'Uploading Documents...'
                  : isRTL
                    ? 'جاري إتمام الحجز...'
                    : 'Completing Your Booking...'}
              </h3>
              <p className="text-gray-400 text-center">
                {isRTL
                  ? 'يرجى الانتظار، هذا قد يستغرق بضع ثوانٍ'
                  : 'Please wait, this may take a few seconds'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Booking Confirmation Modal */}
      <BookingConfirmationModal
        isOpen={showConfirmationModal}
        onClose={handleModalClose}
        type={confirmationModalData.type}
        bookingId={confirmationModalData.bookingId}
        email={confirmationModalData.email}
        transactionId={confirmationModalData.transactionId}
      />
    </div>
  );
};

export default BookingPage;


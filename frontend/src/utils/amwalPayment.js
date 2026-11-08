/**
 * AMWAL Payment Gateway Integration Utility
 *
 * This file provides utility functions for integrating with the AMWAL Payment Gateway
 * using the SmartBox.js library for secure payment processing.
 *
 */

import secureApi from './secureApi';

/**
 * AMWAL Payment Configuration
 *
 * SECURITY: MID and TID are fetched from backend - NEVER exposed in frontend
 * Only environment setting comes from frontend .env
 */
const AMWAL_CONFIG = {
  // These will be populated from backend API
  MID: null,
  TID: null,
  CURRENCY_ID: 512,

  // Environment URLs
  ENVIRONMENTS: {
    PRODUCTION: 'https://checkout.amwalpg.com/js/SmartBox.js?v=1.1',
    SIT: 'https://test.amwalpg.com:19443/js/SmartBox.js?v=1.1',
    UAT: 'https://test.amwalpg.com:7443/js/SmartBox.js?v=1.1',
  },

  // Read from frontend .env (VITE_ prefix for Vite)
  CURRENT_ENV: import.meta.env.VITE_AMWAL_ENVIRONMENT || 'UAT',
};

/**
 * Fetch payment configuration from backend
 * Populates MID and TID from secure backend API
 */
const fetchPaymentConfig = async () => {
  if (AMWAL_CONFIG.MID && AMWAL_CONFIG.TID) {
    return AMWAL_CONFIG; // Already fetched
  }

  try {
    const response = await secureApi.get('/payment/config');
    if (response.data && response.data.success && response.data.data) {
      AMWAL_CONFIG.MID = response.data.data.merchantId;
      AMWAL_CONFIG.TID = response.data.data.terminalId;
      AMWAL_CONFIG.CURRENCY_ID = response.data.data.currencyId;
      if (response.data.data.environment) {
        AMWAL_CONFIG.CURRENT_ENV = response.data.data.environment;
      }
    }
    return AMWAL_CONFIG;
  } catch (error) {
    console.error('Failed to fetch payment config:', error);
    throw new Error('Unable to initialize payment gateway. Please try again later.');
  }
};

/**
 * Initialize the AMWAL SmartBox Payment Gateway
 *
 * @param {Object} paymentData - Payment configuration data
 * @param {number} paymentData.amount - Amount to charge (in OMR)
 * @param {string} paymentData.merchantReference - Unique reference for this transaction
 * @param {string} paymentData.languageId - Language ('en' or 'ar')
 * @param {number} paymentData.paymentViewType - Display type (1=Popup, 2=Fullscreen)
 * @param {string} paymentData.sessionToken - Session token for recurring payments (optional)
 * @param {Function} paymentData.completeCallback - Callback function on successful payment
 * @param {Function} paymentData.errorCallback - Callback function on payment error
 * @param {Function} paymentData.cancelCallback - Callback function on payment cancellation
 * @param {string} paymentData.returnUrl - URL to return after payment (optional)
 * @param {string} paymentData.cancelUrl - URL to return on cancellation (optional)
 * @returns {Promise<void>}
 */
export const initializePayment = async ({
  amount,
  merchantReference,
  languageId = 'en',
  paymentViewType = 1, // 1 = Popup, 2 = Fullscreen
  sessionToken = '',
  completeCallback,
  errorCallback,
  cancelCallback,
  returnUrl = '',
  cancelUrl = '',
  orderItems = [],
  contactInfoType = '',
  additionalCustomerData = {},
  bookingContext = {},
}) => {
  let paymentTimeout = null;

  try {
    // Fetch payment config from backend (MID, TID)
    await fetchPaymentConfig();

    // Validate required parameters
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount. Amount must be greater than 0.');
    }

    // Generate transaction datetime in ISO format
    const trxDateTime = new Date().toISOString();

    // Ensure amount is a number (not string) for hash generation
    const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error('Invalid amount. Amount must be a positive number.');
    }

    // Request secure hash from backend
    // IMPORTANT: Secure hash MUST be generated on the backend for security
    const secureHashData = await generateSecureHash(
      {
        amount: amountNum,
        currencyId: AMWAL_CONFIG.CURRENCY_ID,
        merchantId: AMWAL_CONFIG.MID,
        merchantReference,
        requestDateTime: trxDateTime,
        sessionToken: sessionToken || '',
        terminalId: AMWAL_CONFIG.TID,
      },
      bookingContext
    );

    // Validate hash was generated
    if (!secureHashData || !secureHashData.secureHash) {
      throw new Error('Failed to generate secure hash. Please try again.');
    }

    // Signed booking intent from the backend: needed to confirm the payment
    // (completeCallback) and, on the redirect path, to verify AMWAL's return.
    const paymentIntent = secureHashData.paymentIntent || null;

    // Check if SmartBox is loaded
    if (!window.SmartBox || !window.SmartBox.Checkout) {
      const loadError = new Error(
        'Payment gateway is not available. This may be due to a network issue or browser extension blocking the payment service. Please disable ad blockers and try again.'
      );
      loadError.code = 'SMARTBOX_NOT_LOADED';
      throw loadError;
    }

    // Validate configuration before proceeding
    if (!AMWAL_CONFIG.MID || !AMWAL_CONFIG.TID) {
      const configError = new Error(
        'Payment service configuration error. Please contact support.'
      );
      configError.code = 'PAYMENT_CONFIG_MISSING';
      throw configError;
    }

    // Log configuration for debugging (without sensitive data)
    // console.log('[AMWAL Payment] Initializing payment with config:', {
    //   environment: AMWAL_CONFIG.CURRENT_ENV,
    //   merchantId: AMWAL_CONFIG.MID,
    //   terminalId: AMWAL_CONFIG.TID,
    //   currencyId: AMWAL_CONFIG.CURRENCY_ID,
    //   amount: amount,
    //   merchantReference: merchantReference,
    //   hasSecureHash: !!secureHashData.secureHash
    // });

    // Set payment timeout (5 minutes)
    // If no callback fires within this time, assume payment gateway issue
    paymentTimeout = setTimeout(() => {
      console.error('[AMWAL Payment] Payment timeout - no response received');

      // Log timeout to backend
      logPaymentCallback({
        type: 'timeout',
        merchantReference: merchantReference,
      });

      if (errorCallback) {
        errorCallback({
          data: {
            message: 'Payment gateway timeout. Please check your booking status or try again.',
            errorMessage: 'No response received from payment gateway within 5 minutes',
          },
        });
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Configure SmartBox
    // Note: AmountTrxn must be a number, not a string
    window.SmartBox.Checkout.configure = {
      MID: String(AMWAL_CONFIG.MID), // Ensure it's a string
      TID: String(AMWAL_CONFIG.TID), // Ensure it's a string
      CurrencyId: AMWAL_CONFIG.CURRENCY_ID,
      AmountTrxn: amountNum, // Use validated numeric amount
      MerchantReference: merchantReference,
      LanguageId: languageId,
      PaymentViewType: paymentViewType,
      TrxDateTime: trxDateTime,
      SessionToken: sessionToken || '',
      SecureHash: secureHashData.secureHash,
      ReturnUrl: appendQueryParam(returnUrl || '', 'intent', paymentIntent),
      CancelUrl: cancelUrl || '',
      OrderItems: orderItems || [],
      ContactInfoType: contactInfoType || '',

      // Additional customer data (optional)
      AdditionalCustomerData: additionalCustomerData || {},

      // Callback functions
      completeCallback: async data => {
        // Clear timeout since we received a response
        if (paymentTimeout) {
          clearTimeout(paymentTimeout);
          paymentTimeout = null;
        }

        // Log success to backend
        const paymentData = data?.data?.data || {};
        logPaymentCallback({
          type: 'success',
          merchantReference: merchantReference,
          transactionId: paymentData.transactionId,
          responseCode: paymentData.responseCode || '00',
        });

        // Have the backend verify AMWAL's signed response; the returned payment
        // token is what /bookings/create accepts as proof of payment.
        const paymentToken = await confirmPayment(data, paymentIntent);

        if (completeCallback) completeCallback(data, paymentToken);
      },

      errorCallback: data => {
        // Clear timeout since we received a response
        if (paymentTimeout) {
          clearTimeout(paymentTimeout);
          paymentTimeout = null;
        }

        console.error('[AMWAL Payment] Payment error received');

        // Log error to backend
        const paymentData = data?.data?.data || data?.data || {};
        logPaymentCallback({
          type: 'error',
          merchantReference: merchantReference,
          responseCode: paymentData.responseCode || 'UNKNOWN',
          errorMessage: paymentData.message || paymentData.errorMessage || 'Payment failed',
        });

        if (errorCallback) errorCallback(data);
      },

      cancelCallback: () => {
        // Clear timeout since we received a response
        if (paymentTimeout) {
          clearTimeout(paymentTimeout);
          paymentTimeout = null;
        }

        // Log cancellation to backend
        logPaymentCallback({
          type: 'cancel',
          merchantReference: merchantReference,
        });

        if (cancelCallback) cancelCallback();
      },
    };

    // Show SmartBox payment interface
    window.SmartBox.Checkout.showSmartBox();
  } catch (error) {
    console.error('Error initializing payment:', error);
    throw error;
  }
};

/**
 * Generate secure hash from backend
 *
 * IMPORTANT: This function calls your backend API to generate the secure hash.
 * NEVER generate the secure hash on the client side as it requires the secret key.
 *
 * @param {Object} params - Parameters for hash generation
 * @returns {Promise<Object>} Object containing the secure hash
 */
const generateSecureHash = async (params, bookingContext = {}) => {
  try {
    // Call backend API to generate secure hash
    // TODO: Update this endpoint to match your backend route
    const response = await secureApi.post('/payment/generate-hash', {
      ...params,
      // Optional booking validation to block payment if booking is invalid
      booking_car_id: bookingContext.car_id,
      booking_start_date: bookingContext.start_date,
      booking_end_date: bookingContext.end_date,
      booking_expected_amount: bookingContext.expected_amount,
      license_upload_token: bookingContext.license_upload_token,
      id_upload_token: bookingContext.id_upload_token,
    });

    if (!response.data || !response.data.secureHash) {
      throw new Error('Failed to generate secure hash');
    }

    return response.data;
  } catch (error) {
    console.error('Error generating secure hash:', error);
    throw new Error('Failed to generate payment signature. Please try again.');
  }
};

/**
 * Append a query parameter to a URL (no-op when the value is empty).
 *
 * @param {string} url - Absolute or relative URL
 * @param {string} key - Parameter name
 * @param {string|null} value - Parameter value
 * @returns {string} URL with the parameter added
 */
export const appendQueryParam = (url, key, value) => {
  if (!url || !value) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
};

/**
 * Extract the fields of AMWAL's response that are covered by its secure hash.
 *
 * @param {Object} paymentData - responseData.data.data from the SmartBox callback
 * @returns {Object} Parameters for the backend hash check
 */
export const buildIntegrityParams = paymentData => ({
  // Keep amount as string exactly as AMWAL sends it (e.g. "5.000"): it is hashed verbatim
  amount: paymentData.amount,
  currencyId: paymentData.currencyId,
  customerId: paymentData.customerId || '',
  customerTokenId: paymentData.customerTokenId || '',
  merchantId: paymentData.merchantId,
  merchantReference: paymentData.merchantReference,
  responseCode: paymentData.responseCode,
  terminalId: paymentData.terminalId,
  transactionId: paymentData.transactionId,
  transactionTime: paymentData.transactionTime,
});

/**
 * Ask the backend to verify a completed payment.
 *
 * The backend checks AMWAL's response hash and that the payment matches the
 * booking intent, and returns a short-lived signed payment token.
 *
 * @param {Object} responseData - Data passed to the SmartBox completeCallback
 * @param {string|null} paymentIntent - paymentIntent from /payment/generate-hash
 * @returns {Promise<string|null>} Payment token, or null if verification failed
 */
export const confirmPayment = async (responseData, paymentIntent) => {
  const paymentData = responseData?.data?.data;
  if (!paymentData || !paymentIntent) {
    return null;
  }
  try {
    const response = await secureApi.post('/payment/confirm', {
      params: buildIntegrityParams(paymentData),
      receivedHash: paymentData.secureHashValue || '',
      paymentIntent,
    });
    return response.data?.paymentToken || null;
  } catch (error) {
    console.error('[AMWAL Payment] Payment verification failed');
    return null;
  }
};

/**
 * Log payment callback to backend for monitoring
 *
 * @param {Object} callbackData - Callback data to log
 */
const logPaymentCallback = async callbackData => {
  try {
    await secureApi.post('/payment/log-callback', callbackData);
  } catch (error) {
    console.error('[AMWAL Payment] Failed to log callback:', error);
    // Don't throw - logging failure shouldn't block payment flow
  }
};

/**
 * Get session token for recurring payments
 *
 * This function retrieves a session token that allows customers to use their saved cards
 * for recurring payments.
 *
 * @param {string} customerId - Unique customer ID from previous transaction
 * @returns {Promise<string>} Session token
 */
export const getSessionToken = async customerId => {
  try {
    if (!customerId) {
      throw new Error('Customer ID is required to get session token');
    }

    // Call backend API to get session token
    const response = await secureApi.post('/payment/get-session-token', {
      customerId,
      merchantId: AMWAL_CONFIG.MID,
    });

    if (!response.data || !response.data.success || !response.data.sessionToken) {
      throw new Error(response.data?.message || 'Failed to retrieve session token');
    }

    return response.data.sessionToken;
  } catch (error) {
    console.error('Error getting session token:', error);
    throw error;
  }
};

/**
 * Close the SmartBox payment interface
 */
export const closePaymentInterface = () => {
  if (window.SmartBox && window.SmartBox.Checkout) {
    window.SmartBox.Checkout.closeSmartBox();
  }
};

/**
 * Check if SmartBox is loaded and ready
 *
 * @returns {boolean} True if SmartBox is ready
 */
export const isSmartBoxReady = () => {
  return !!(window.SmartBox && window.SmartBox.Checkout);
};

/**
 * Load SmartBox.js dynamically
 *
 * @returns {Promise<void>}
 */
export const loadSmartBox = async () => {
  return new Promise(async (resolve, reject) => {
    // Check if already loaded
    if (isSmartBoxReady()) {
      console.log('[AMWAL] SmartBox already loaded');
      resolve();
      return;
    }

    // Ensure config is fetched to get the correct environment
    try {
      await fetchPaymentConfig();
    } catch (error) {
      console.error('[AMWAL] Failed to fetch payment config before loading SmartBox:', error);
      // Continue anyway - might use default environment
    }

    const scriptUrl = AMWAL_CONFIG.ENVIRONMENTS[AMWAL_CONFIG.CURRENT_ENV];
    console.log(
      `[AMWAL] Loading SmartBox.js from ${AMWAL_CONFIG.CURRENT_ENV} environment:`,
      scriptUrl
    );

    // Check if script already exists
    const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);
    if (existingScript) {
      console.log('[AMWAL] SmartBox script already in DOM, waiting for load...');
      // Wait a bit for it to load
      setTimeout(() => {
        if (isSmartBoxReady()) {
          resolve();
        } else {
          reject(new Error('SmartBox script exists but not loaded'));
        }
      }, 1000);
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;

    script.onload = () => {
      console.log(`[AMWAL] SmartBox.js loaded successfully from ${AMWAL_CONFIG.CURRENT_ENV}`);
      resolve();
    };

    script.onerror = () => {
      console.error(`[AMWAL] Failed to load SmartBox.js from ${scriptUrl}`);
      reject(
        new Error(
          `Failed to load payment gateway script from ${AMWAL_CONFIG.CURRENT_ENV} environment`
        )
      );
    };

    document.head.appendChild(script);
  });
};

export default {
  initializePayment,
  getSessionToken,
  closePaymentInterface,
  isSmartBoxReady,
  loadSmartBox,
  AMWAL_CONFIG,
};

// Secure API wrapper with HTTP-only cookie authentication
import axios from 'axios';
import deviceFingerprint from './deviceFingerprint.js';

// Create secure EventEmitter for auth events
export const SecureAuthEvents = {
  listeners: {},
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  },
  emit(event, ...args) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(...args));
    }
  },
};

// Security headers configuration
const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

class SecureApiClient {
  constructor() {
    // Initialize missing properties
    this.isProduction = import.meta.env.PROD;
    this.requestTimeout = this.isProduction ? 25000 : 30000; // Increased from 15s to 25s
    this.refreshTimeoutMs = this.isProduction ? 15000 : 20000; // Increased from 8s to 15s
    this.maxRefreshRetries = 5; // Increased from 3 to 5
    this.refreshRetryCount = 0;
    this.maxRequestRetries = 2; // Add request-level retries
    this.baseRetryDelay = 1000; // 1 second base delay for exponential backoff

    // Track refresh token attempts to prevent infinite loops
    this.isRefreshing = false;
    this.failedQueue = [];
    this.refreshTimeout = null;
    this.refreshPromise = null; // Track ongoing refresh attempts

    // Dynamic API URL based on environment - AUTO-DETECTION
    const getApiBaseUrl = () => {
      // Only allow VITE_API_URL override in development
      if (!import.meta.env.PROD && import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
      }
      if (import.meta.env.VITE_USE_LOCAL_API === 'true') {
        return 'http://localhost:8000';
      }
      // Always use relative /api in production
      if (import.meta.env.PROD) {
        return '/api';
      }
      // Auto-detect for dev
      const hostname = window.location.hostname;
      const port = window.location.port;
      if (port === '10000' || (hostname === 'localhost' && port === '')) {
        return '/api';
      }
      if (import.meta.env.DEV && port !== '10000') {
        return 'http://localhost:8000';
      }
      return '/api';
    };

    const baseURL = getApiBaseUrl();

    this.client = axios.create({
      baseURL,
      timeout: this.requestTimeout,
      withCredentials: true, // Essential for HTTP-only cookies
      headers: SECURITY_HEADERS,
      // Production optimizations
      maxRedirects: 2,
      validateStatus: status => status < 500, // Don't reject on 4xx errors
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      config => {
        // Add request ID for tracking
        config.headers['X-Request-ID'] = this.generateRequestId();

        // Add timestamp for request validation
        config.headers['X-Request-Time'] = Date.now().toString();

        // Add device fingerprint for session tracking
        const fingerprint = deviceFingerprint.getFingerprint();
        if (fingerprint) {
          config.headers['X-Device-Fingerprint'] = fingerprint;
        }

        // Handle FormData properly
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }

        // Validate URL to prevent SSRF
        if (!this.validateUrl(config.url)) {
          return Promise.reject(new Error('Invalid request URL'));
        }

        // Log API requests (only in development)
        if (!this.isProduction) {
          console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`);
        }

        return config;
      },
      error => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      response => {
        // Log successful responses (only in development)
        if (!this.isProduction) {
          console.log(
            `API Response: ${response.status} ${response.config.method.toUpperCase()} ${response.config.url}`
          );
        }

        return response;
      },
      async error => {
        const originalRequest = error.config;

        // Handle network errors with retry logic
        if (!error.response) {
          if (!this.isProduction) {
            console.error('🌐 Network error:', error.message);
          }

          // Add network error retry logic
          if (!originalRequest._networkRetryCount) {
            originalRequest._networkRetryCount = 0;
          }

          if (originalRequest._networkRetryCount < this.maxRequestRetries) {
            originalRequest._networkRetryCount++;
            const delay = this.baseRetryDelay * Math.pow(2, originalRequest._networkRetryCount - 1);

            if (!this.isProduction) {
              console.log(
                `🔄 Retrying network request in ${delay}ms (attempt ${originalRequest._networkRetryCount})`
              );
            }

            return new Promise(resolve => {
              setTimeout(() => {
                resolve(this.client(originalRequest));
              }, delay);
            });
          }

          return Promise.reject({
            status: 0,
            message:
              'Connection failed after multiple attempts. Please check your internet connection.',
            isNetworkError: true,
            originalError: this.isProduction ? undefined : error,
          });
        }

        // Handle specific status codes
        switch (error.response.status) {
          case 401:
            return await this.handle401Error(originalRequest);
          case 403:
            this.handle403Error(error.response);
            break;
          case 404:
            if (!this.isProduction) {
              console.error('Resource not found:', error.response.config.url);
            }
            break;
          case 422:
            if (!this.isProduction) {
              console.error('Validation error:', error.response.data);
            }
            break;
          case 500:
          case 502:
          case 503:
            this.handle5xxError(error.response);
            break;
          default:
            if (!this.isProduction || error.response.status >= 500) {
              console.error(
                `API Error ${error.response.status}:`,
                this.isProduction ? 'Server error' : error.response.data
              );
            }
        }

        return Promise.reject(this.formatError(error));
      }
    );
  }

  /**
   * Handle 401 unauthorized errors - attempt token refresh
   */
  async handle401Error(originalRequest) {
    if (!this.isProduction) {
      console.warn('🔑 Unauthorized request, attempting token refresh...');
    }

    // Don't attempt refresh for refresh token requests to prevent infinite loops
    if (originalRequest.url.includes('/auth/refresh')) {
      if (!this.isProduction) {
        console.error('Refresh token expired, redirecting to login');
      }
      this.resetRefreshState();
      this.processQueue(null, new Error('Session expired'));
      SecureAuthEvents.emit('logout', 'Your session has expired. Please log in again.');
      return Promise.reject(new Error('Session expired'));
    }

    // Prevent infinite retry loops
    if (originalRequest._retry) {
      if (!this.isProduction) {
        console.error('Request already retried, redirecting to login');
      }
      this.resetRefreshState();
      SecureAuthEvents.emit('logout', 'Your session has expired. Please log in again.');
      return Promise.reject(new Error('Authentication failed'));
    }

    originalRequest._retry = true;

    // If already refreshing, queue this request
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject, config: originalRequest });
      });
    }

    this.isRefreshing = true;

    // Set timeout to prevent hanging refresh
    this.refreshTimeout = setTimeout(() => {
      if (this.isRefreshing) {
        if (!this.isProduction) {
          console.error('Refresh token timeout, forcing logout');
        }
        this.resetRefreshState();
        this.processQueue(null, new Error('Session timeout'));
        SecureAuthEvents.emit('logout', 'Session timeout. Please log in again.');
      }
    }, this.refreshTimeoutMs);

    try {
      await this.refreshToken();

      if (!this.isProduction) {
        console.log('🔄 Token refreshed, retrying queued requests');
      }

      // Reset retry count on success
      this.refreshRetryCount = 0;

      // Process queued requests
      this.processQueue(null, null);

      // Retry original request
      return this.client(originalRequest);
    } catch (refreshError) {
      if (!this.isProduction) {
        console.error('Token refresh failed:', refreshError);
      }

      // Process queued requests with error
      this.processQueue(null, refreshError);

      SecureAuthEvents.emit('logout', 'Your session has expired. Please log in again.');
      return Promise.reject(new Error('Authentication failed'));
    } finally {
      this.resetRefreshState();
    }
  }

  /**
   * Process queued requests after token refresh
   */
  processQueue(token, error) {
    this.failedQueue.forEach(({ resolve, reject, config }) => {
      if (error) {
        reject(error);
      } else {
        resolve(this.client(config));
      }
    });

    this.failedQueue = [];
  }

  /**
   * Reset refresh state and cleanup timers
   */
  resetRefreshState() {
    this.isRefreshing = false;
    this.failedQueue = [];
    this.refreshPromise = null; // Clear ongoing refresh promise
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  /**
   * Handle 403 forbidden errors
   */
  handle403Error(response) {
    if (!this.isProduction) {
      console.error('🚫 Access forbidden:', response.data);
    }

    const message = this.isProduction
      ? 'Access denied. Please check your permissions.'
      : response.data?.detail || 'Access denied. Please check your permissions.';

    SecureAuthEvents.emit('companyError', message);
  }

  /**
   * Handle 5xx server errors
   */
  handle5xxError(response) {
    if (!this.isProduction) {
      console.error('🔥 Server error:', response.data);
    }

    const message = 'Service temporarily unavailable. Please try again in a moment.';
    SecureAuthEvents.emit('serverError', message);
  }

  /**
   * Format error for consistent handling
   */
  formatError(error) {
    const status = error.response?.status || 0;
    let message = 'An error occurred';

    if (this.isProduction) {
      // Generic messages for production
      if (status === 400) message = 'Invalid request. Please check your input.';
      else if (status === 401) message = 'Authentication required.';
      else if (status === 403) message = 'Access denied.';
      else if (status === 404) message = 'Requested resource not found.';
      else if (status === 422) message = 'Invalid data provided.';
      else if (status >= 500) message = 'Service temporarily unavailable.';
      else if (!error.response) message = 'Connection failed.';
    } else {
      // Detailed messages for development
      message = error.response?.data?.detail || error.message || 'An error occurred';
    }

    return {
      status,
      message,
      data: this.isProduction ? undefined : error.response?.data,
      isNetworkError: !error.response,
    };
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  /**
   * Validate URL to prevent SSRF attacks
   */
  validateUrl(url) {
    // Basic validation - could be more sophisticated
    if (!url || typeof url !== 'string') return false;

    // Block suspicious patterns
    const suspiciousPatterns = [
      /^https?:\/\/localhost(?::\d+)?(?!\/)/i,
      /^https?:\/\/127\.0\.0\.1(?::\d+)?(?!\/)/i,
      /^https?:\/\/192\.168\./i,
      /^https?:\/\/10\./i,
      /^https?:\/\/172\.(1[6-9]|2[0-9]|3[01])\./i,
      /^file:/i,
      /^ftp:/i,
    ];

    // Allow relative URLs
    if (url.startsWith('/')) return true;

    return !suspiciousPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Refresh access token using HTTP-only cookies
   * Uses direct axios call to avoid interceptors and prevent infinite loops
   */
  async refreshToken() {
    try {
      // Check if we've exceeded retry limit
      if (this.refreshRetryCount >= this.maxRefreshRetries) {
        throw new Error('Maximum refresh attempts exceeded');
      }

      // Prevent concurrent refresh attempts
      if (this.refreshPromise) {
        if (!this.isProduction) {
          console.log('🔄 Refresh already in progress, waiting...');
        }
        return await this.refreshPromise;
      }

      this.refreshRetryCount++;

      // Store the refresh promise to prevent concurrent calls
      this.refreshPromise = this._performRefresh();

      try {
        const result = await this.refreshPromise;

        if (!this.isProduction) {
          console.log('🔄 Token refreshed successfully');
        }

        // Reset retry count on success
        this.refreshRetryCount = 0;

        return result;
      } finally {
        // Always clear the promise when done
        this.refreshPromise = null;
      }
    } catch (error) {
      // Clear the promise on error
      this.refreshPromise = null;

      // Log error details only in development
      if (!this.isProduction) {
        console.error('Token refresh failed:', error.response?.data || error.message);
      }

      // Clear any stale auth state on refresh failure
      this.resetRefreshState();

      // Provide generic error message in production
      const errorMessage = this.isProduction
        ? 'Session refresh failed'
        : error.response?.data?.detail || 'Token refresh failed';

      throw new Error(errorMessage);
    }
  }

  async _performRefresh() {
    try {
      // Use direct axios call without interceptors to prevent infinite loops
      const response = await axios.post(
        `${this.client.defaults.baseURL}/auth/refresh`,
        {},
        {
          withCredentials: true,
          timeout: this.refreshTimeoutMs, // Use the configurable timeout
          headers: {
            'Content-Type': 'application/json',
            ...SECURITY_HEADERS,
          },
          // Production optimizations
          maxRedirects: 0,
          validateStatus: status => status === 200,
        }
      );

      return response.data;
    } catch (error) {
      // Enhanced error handling for refresh failures
      if (error.code === 'ECONNABORTED') {
        throw new Error('Token refresh timed out - please check your connection');
      }
      if (error.response?.status === 401) {
        throw new Error('Refresh token expired');
      }
      if (!error.response) {
        throw new Error('Network error during token refresh');
      }

      // Don't log here - let the calling method handle logging
      throw error;
    }
  }

  /**
   * Login with credentials
   */
  async login(email, password) {
    try {
      if (!this.isProduction) {
        console.log(`🔐 Attempting login for: ${email}`);
      }

      // Reset refresh state before login
      this.resetRefreshState();
      this.refreshRetryCount = 0;

      const response = await this.client.post(
        '/auth/login',
        {
          email,
          password,
        },
        {
          timeout: 10000, // 10 second timeout for login
        }
      );

      // Validate response has user data before considering it successful
      if (!response.data || !response.data.user) {
        throw new Error('Invalid login response: no user data received');
      }

      if (!this.isProduction) {
        console.log('✅ Login successful');
      }

      return response.data.user;
    } catch (error) {
      if (!this.isProduction) {
        console.error('❌ Login failed:', error);
      }

      // Provide generic error message in production
      const errorMessage = this.isProduction
        ? 'Invalid email or password'
        : error.response?.data?.detail || 'Login failed';

      throw errorMessage;
    }
  }

  /**
   * Logout and clear cookies
   */
  async logout() {
    try {
      // Reset refresh state immediately
      this.resetRefreshState();
      this.refreshRetryCount = 0;

      await this.client.post('/auth/logout');

      if (!this.isProduction) {
        console.log('✅ Logout successful');
      }
    } catch (error) {
      if (!this.isProduction) {
        console.error('Logout error:', error);
      }
      // Don't throw error for logout failures - still reset state
      this.resetRefreshState();
      this.refreshRetryCount = 0;
    }
  }

  /**
   * Check authentication status
   */
  async checkAuth() {
    try {
      const response = await this.client.get('/auth/check');
      return response.data;
    } catch (error) {
      return { authenticated: false };
    }
  }

  /**
   * Get user profile
   */
  async getProfile() {
    try {
      const response = await this.client.get('/auth/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data?.detail || 'Failed to get profile';
    }
  }

  // HTTP methods
  get(url, config = {}) {
    return this.client.get(url, config);
  }

  post(url, data, config = {}) {
    return this.client.post(url, data, config);
  }

  put(url, data, config = {}) {
    return this.client.put(url, data, config);
  }

  delete(url, config = {}) {
    return this.client.delete(url, config);
  }

  patch(url, data, config = {}) {
    return this.client.patch(url, data, config);
  }

  // === API Methods for existing functionality ===

  // Clients
  getClients() {
    return this.get('/clients/');
  }

  getClient(id) {
    return this.get(`/clients/${id}/`);
  }

  createClient(data) {
    return this.post('/clients/', data);
  }

  updateClient(id, data) {
    return this.put(`/clients/${id}/`, data);
  }

  deleteClient(id) {
    return this.delete(`/clients/${id}/`);
  }

  // Cars
  getCars() {
    return this.get('/cars/');
  }

  getCar(id) {
    return this.get(`/cars/${id}/`);
  }

  createCar(formData) {
    return this.post('/cars/', formData);
  }

  updateCar(id, data) {
    // Convert JSON data to FormData for car updates
    const formData = new FormData();

    // Required fields for the backend - ensure all these are included
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

    // Add all required fields first
    requiredFields.forEach(field => {
      if (data[field] !== undefined) {
        formData.append(field, data[field]);
      } else {
        console.error(`Missing required field: ${field}`);
      }
    });

    // Add optional fields
    if (data.description !== undefined) {
      formData.append('description', data.description);
    }

    // Handle image separately if it's a File object
    if (data.image instanceof File) {
      formData.append('image', data.image);
    }

    // Add other fields that might be in the data object but aren't part of the required fields
    Object.keys(data).forEach(key => {
      if (!requiredFields.includes(key) && key !== 'description' && key !== 'image') {
        if (data[key] !== null && data[key] !== undefined) {
          formData.append(key, data[key]);
        }
      }
    });

    // Debug what's being sent (only in development)
    if (!this.isProduction) {
      console.log('Sending form data for car update:', Object.fromEntries(formData));
    }

    // Use the put method with proper headers for FormData
    return this.put(`/cars/${id}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  deleteCar(id) {
    return this.delete(`/cars/${id}/`);
  }

  // Rentals
  getRentals() {
    return this.get('/rentals/');
  }

  getRental(id) {
    return this.get(`/rentals/${id}/`);
  }

  createRental(data) {
    return this.post('/rentals/', data);
  }

  updateRental(id, data) {
    return this.put(`/rentals/${id}/`, data);
  }

  deleteRental(id) {
    return this.delete(`/rentals/${id}/`);
  }

  // Maintenance
  getMaintenance() {
    return this.get('/maintenance/');
  }

  getCarMaintenance(carId) {
    return this.get(`/maintenance/${carId}/`);
  }

  createMaintenance(data) {
    return this.post('/maintenance/', data);
  }

  updateMaintenance(id, data) {
    return this.put(`/maintenance/${id}`, data);
  }

  deleteMaintenance(id) {
    return this.delete(`/maintenance/${id}`);
  }

  // Companies
  getCurrentCompany() {
    return this.get('/companies/current');
  }

  // Analytics
  getAnalytics() {
    return this.get('/analytics/');
  }
}

// Create and export the secure API client instance
const secureApi = new SecureApiClient();
export default secureApi;

// src/utils/api.js - FIXED
import axios from 'axios';

// Create an EventEmitter for auth events
export const AuthEvents = {
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

// Determine the correct base URL
const getBaseURL = () => {
  // If VITE_API_URL is explicitly set, use it
  if (import.meta.env.VITE_API_URL) {
    console.log('Using VITE_API_URL from environment:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }

  // Check if we're in development
  const isDev =
    import.meta.env.DEV ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (isDev) {
    console.log('Using development API URL: http://localhost:8000');
    return 'http://localhost:8000';
  }

  // Unified Docker container environment (nginx on port 10000)
  const port = window.location.port;
  if (port === '10000' || (window.location.hostname === 'localhost' && port === '')) {
    console.log('Unified Docker container detected, using relative /api path');
    return '/api'; // Use relative path for nginx proxy
  }

  // Production fallback - use relative /api path
  // Check if we're on the production domain
  const isProduction =
    window.location.hostname === 'rentyl-app.onrender.com' ||
    window.location.hostname === 'rentyl.app' ||
    window.location.hostname === 'www.rentyl.app';

  if (isProduction) {
    console.log('Using relative /api path for production');
    return '/api';
  }

  // Fallback for any other production environment
  console.log('Using relative /api path as fallback');
  return '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Validate and fix base URL if needed
const validateBaseURL = () => {
  const currentBaseURL = api.defaults.baseURL;

  // Ensure HTTPS in production
  if (window.location.protocol === 'https:' && currentBaseURL.startsWith('http:')) {
    const fixedURL = currentBaseURL.replace('http:', 'https:');
    console.warn(`Fixed base URL from ${currentBaseURL} to ${fixedURL}`);
    api.defaults.baseURL = fixedURL;
  }

  // Ensure /api prefix in production
  if (
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1' &&
    !currentBaseURL.endsWith('/api')
  ) {
    const fixedURL = currentBaseURL.endsWith('/')
      ? currentBaseURL + 'api'
      : currentBaseURL + '/api';
    console.warn(`Fixed base URL from ${currentBaseURL} to ${fixedURL}`);
    api.defaults.baseURL = fixedURL;
  }
};

// Run validation
validateBaseURL();

// Log network configuration for debugging
console.log(`API configured with baseURL: ${api.defaults.baseURL}`);
console.log(`API timeout set to: ${api.defaults.timeout}ms`);
console.log(`Current environment: ${import.meta.env.MODE}`);
console.log(`VITE_API_URL: ${import.meta.env.VITE_API_URL || 'not set'}`);
console.log(`Current protocol: ${window.location.protocol}`);
console.log(`Current hostname: ${window.location.hostname}`);

// SIMPLIFIED: Only include token in requests (backend middleware handles company context)
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Important: For FormData (file uploads), don't set Content-Type header
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    // Log requests in development mode
    if (import.meta.env.DEV) {
      console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`);
    }

    // Always log the full URL being requested for debugging
    const fullUrl = `${config.baseURL}${config.url}`;
    console.log(`Making request to: ${fullUrl}`);

    return config;
  },
  error => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Handle common response errors
api.interceptors.response.use(
  response => response,
  error => {
    // Handle connection errors
    if (!error.response) {
      console.error('Network error:', error.message);
      return Promise.reject({
        status: 0,
        message: 'Network error. Please check your connection.',
      });
    }

    // Handle specific status codes
    switch (error.response.status) {
      case 401:
        // Unauthorized - clear token and notify app
        localStorage.removeItem('token');
        localStorage.removeItem('companyId');
        AuthEvents.emit('logout', 'Your session has expired. Please log in again.');
        break;
      case 403:
        // Forbidden - might be company access issue
        console.error('Access denied:', error.response.data);
        if (error.response.data?.detail?.includes('company')) {
          AuthEvents.emit('companyError', "You do not have access to this company's data.");
        }
        break;
      case 404:
        console.error('Resource not found:', error.response.config.url);
        break;
      case 422:
        console.error('Validation error:', error.response.data);
        break;

      case 500:
      case 502:
      case 503:
        console.error('Server error:', error.response.status, error.response.data);
        break;
      default:
        console.error(`Error ${error.response.status}:`, error.response.data);
    }

    const errorResponse = {
      status: error.response.status,
      message:
        error.response.data?.detail ||
        error.response.data?.message ||
        error.response.statusText ||
        'An error occurred',
      data: error.response.data,
      originalError: error,
    };

    return Promise.reject(errorResponse);
  }
);

// Add methods directly to the api instance
api.login = async function (email, password) {
  const response = await this.post('/auth/login', { email, password });
  if (response.data?.user?.company_id) {
    localStorage.setItem('companyId', response.data.user.company_id);
  }
  return response;
};

api.logout = async function () {
  localStorage.removeItem('token');
  localStorage.removeItem('companyId');
  delete this.defaults.headers.common['Authorization'];
};

// Client methods
api.getClients = function () {
  return this.get('/clients/');
};

api.getClient = function (id) {
  return this.get(`/clients/${id}/`); // Backend: /{encrypted_id}/ - HAS slash
};

api.createClient = function (data) {
  return this.post('/clients/', data);
};

api.updateClient = function (id, data) {
  return this.put(`/clients/${id}/`, data);
};

api.deleteClient = function (id) {
  return this.delete(`/clients/${id}/`);
};

// Car methods
api.getCars = function () {
  return this.get('/cars/');
};

api.getCar = function (id) {
  return this.get(`/cars/${id}`);
};

api.createCar = function (formData) {
  return this.post('/cars/', formData);
};

api.updateCar = function (id, data) {
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

  // Debug what's being sent
  console.log('Sending form data for car update:', Object.fromEntries(formData));

  // Use axios directly to have more control over the request
  return this.put(`/cars/${id}/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

api.deleteCar = function (id) {
  return this.delete(`/cars/${id}`);
};

// Rental methods
api.getRentals = function () {
  return this.get('/rentals/');
};

api.getRental = function (id) {
  return this.get(`/rentals/${id}`);
};

api.createRental = function (data) {
  return this.post('/rentals/', data);
};

api.updateRental = function (id, data) {
  return this.put(`/rentals/${id}`, data);
};

api.deleteRental = function (id) {
  return this.delete(`/rentals/${id}`);
};

// Maintenance methods
api.getMaintenance = function () {
  return this.get('/maintenance/');
};

api.getCarMaintenance = function (carId) {
  return this.get(`/maintenance/car/${carId}`);
};

api.createMaintenance = function (data) {
  return this.post('/maintenance/', data);
};

api.updateMaintenance = function (id, data) {
  return this.put(`/maintenance/${id}`, data); // Backend: /{maintenance_id} - NO slash
};

api.deleteMaintenance = function (id) {
  return this.delete(`/maintenance/${id}`); // Backend: /{maintenance_id} - NO slash
};

// Company methods
api.getCurrentCompany = function () {
  return this.get('/companies/current');
};

// Analytics methods
api.getAnalytics = function () {
  return this.get('/analytics/');
};

// Export the configured axios instance as default
export default api;

// src/components/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import secureApi, { SecureAuthEvents } from '../../utils/secureApi';
import { ThemeContext } from './ThemeContext';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { setMode } = useContext(ThemeContext);

  // Setup auth event listeners
  useEffect(() => {
    const handleLogout = message => {
      // console.log('Auth logout event received:', message);
      setError(message || 'Session expired');
      setUser(null);
      setCompany(null);
      setMode(false);
    };

    const handleCompanyError = message => {
      // console.warn('Company access error:', message);
      setError(message);
    };

    const handleServerError = message => {
      // console.error('Server error:', message);
      setError(message);
    };

    // Subscribe to auth events
    SecureAuthEvents.on('logout', handleLogout);
    SecureAuthEvents.on('companyError', handleCompanyError);
    SecureAuthEvents.on('serverError', handleServerError);

    return () => {
      // Cleanup listeners
      SecureAuthEvents.listeners = {};
    };
  }, [setMode]);

  // Load user and company on mount
  useEffect(() => {
    const loadUserAndCompany = async () => {
      try {
        // Check if user is authenticated via cookies
        const authStatus = await secureApi.checkAuth();

        if (!authStatus.authenticated) {
          setMode(false);
          setLoading(false);
          return;
        }

        // Get user profile (includes company data with currency)
        const userProfile = await secureApi.getProfile();

        // Extract company data from profile response (already includes currency)
        let companyData = userProfile?.company || null;

        // Update state - loading overlay will hide the flashing
        setUser(userProfile);
        setCompany(companyData);
        setMode(true);
        setError(null);
      } catch (error) {
        // console.error('Error loading user data:', error);

        // If it's a network error, don't immediately clear auth state
        if (error.isNetworkError) {
          setError('Could not connect to server');
        } else {
          // Clear auth state for other errors
          setUser(null);
          setCompany(null);
          setMode(false);
          setError(error.message || 'Authentication failed');
        }
      } finally {
        setLoading(false);
      }
    };

    loadUserAndCompany();
  }, [setMode]);

  // Proactive token refresh every 50 minutes to prevent session expiration
  useEffect(() => {
    if (!user) return; // Only run if user is authenticated

    const REFRESH_INTERVAL = 50 * 60 * 1000; // 50 minutes (token expires at 60)

    const refreshInterval = setInterval(async () => {
      try {
        // console.log('🔄 Proactively refreshing token...');
        await secureApi.refreshToken();
        // console.log('✅ Token refreshed successfully');
      } catch (error) {
        // console.error('❌ Proactive token refresh failed:', error);
        // Don't logout here - let the 401 handler deal with it on next request
      }
    }, REFRESH_INTERVAL);

    return () => clearInterval(refreshInterval);
  }, [user]);

  // Login function - simplified without security restrictions
  const login = async (email, password) => {
    try {
      // console.log('🔐 Attempting login for:', email);
      setError(null);
      setLoading(true);

      // Call the API login endpoint
      const response = await secureApi.login(email, password);
      const userData = response.user || response;
      const companyData = response.company;

      // Validate user data before considering login successful
      if (!userData || !userData.email) {
        throw new Error('Invalid user data received from login');
      }

      // console.log('✅ Login successful, user data:', userData);

      // Set company data if included in login response (performance optimization)
      if (companyData) {
        // console.log('🏢 Company loaded from login response:', companyData);
        setUser(userData);
        setCompany(companyData);
        setMode(true);
        setLoading(false);
      } else if (userData && userData.company_id) {
        // Fallback to separate request if company data not in response
        try {
          const companyResponse = await secureApi.get(`/companies/${userData.company_id}`);
          // console.log('🏢 Company loaded via separate request:', companyResponse.data);
          setUser(userData);
          setCompany(companyResponse.data);
          setMode(true);
          setLoading(false);
        } catch (companyError) {
          // console.error('Failed to load company details:', companyError);
          setUser(userData);
          setMode(true);
          setLoading(false);
        }
      } else {
        setUser(userData);
        setMode(true);
        setLoading(false);
      }

      return userData;
    } catch (error) {
      // console.error('❌ Login failed:', error);
      setLoading(false);

      // Simplified error handling
      let errorMessage = '';

      if (error.response) {
        const responseData = error.response.data;
        errorMessage = responseData.detail || error.message || 'Login failed';
      } else if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage = 'Login failed. Please try again.';
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // console.log('🔐 Logging out...');

      // Set loading first to prevent UI flicker
      setLoading(true);

      // Logout using secure API (clears HTTP-only cookies)
      await secureApi.logout();

      // Clear auth state first
      setUser(null);
      setCompany(null);
      setError(null);

      // Small delay to prevent UI flicker
      await new Promise(resolve => setTimeout(resolve, 150));

      // Change theme and clear loading last
      setMode(false);
      setLoading(false);

      // console.log('✅ Logout successful');
    } catch (error) {
      // console.error('❌ Logout error:', error);

      // Clear auth state first
      setUser(null);
      setCompany(null);
      setError(null);

      // Small delay to prevent UI flicker
      await new Promise(resolve => setTimeout(resolve, 150));

      // Change theme and clear loading last
      setMode(false);
      setLoading(false);
    }
  };

  // Switch company function
  const switchCompany = async companyId => {
    try {
      const companyResponse = await secureApi.get(`/companies/${companyId}`);
      setCompany(companyResponse.data);

      // Update user's company_id if endpoint exists (optional)
      try {
        const userResponse = await secureApi.put('/auth/profile', { company_id: companyId });
        setUser(userResponse.data);
      } catch (updateError) {
        // console.warn('Could not update user company_id:', updateError);
      }

      return companyResponse.data;
    } catch (error) {
      // console.error('Failed to switch company:', error);
      throw error;
    }
  };

  // Check if user is admin
  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  // Get user sessions
  const getSessions = async () => {
    try {
      const response = await secureApi.get('/auth/sessions');
      return response.data.sessions;
    } catch (error) {
      // console.error('Failed to get sessions:', error);
      throw error;
    }
  };

  // Revoke a specific session
  const revokeSession = async sessionId => {
    try {
      await secureApi.post('/auth/revoke-session', { session_id: sessionId });
    } catch (error) {
      // console.error('Failed to revoke session:', error);
      throw error;
    }
  };

  // Logout from all devices
  const logoutAllDevices = async () => {
    try {
      await secureApi.post('/auth/logout-all');

      // Clear local state
      setUser(null);
      setCompany(null);
      setMode(false);
      setError(null);

      // console.log('✅ Logged out from all devices');
    } catch (error) {
      // console.error('Failed to logout from all devices:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        loading,
        error,
        login,
        logout,
        switchCompany,
        isAdmin,
        getSessions,
        revokeSession,
        logoutAllDevices,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

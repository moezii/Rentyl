import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import footer1 from '../assets/footer1.webp';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if we have the access token from Supabase redirect
  useEffect(() => {
    // Supabase sends the token as a hash fragment
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');

    if (!accessToken) {
      setError('Invalid or expired reset link. Please request a new password reset.');
    }
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    // Validate passwords
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      // Get access token from hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (!accessToken) {
        throw new Error('No reset token found');
      }

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          access_token: accessToken,
          refresh_token: refreshToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to reset password');
      }

      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="bg-gradient-to-br from-gray-900 to-black backdrop-blur-2xl border border-blue-500/30 rounded-3xl shadow-2xl shadow-blue-500/20 overflow-hidden">
          {/* Header */}
          <div className="p-8 text-center border-b border-blue-500/20">
            <img
              src={footer1}
              alt="Rentyl"
              className="h-16 w-auto object-contain mx-auto brightness-150 mb-4"
            />
            <h2 className="text-2xl font-bold text-white mb-2">
              {success
                ? t('auth.passwordResetSuccess') || 'Password Reset Successfully'
                : t('auth.resetPassword') || 'Reset Your Password'}
            </h2>
            <p className="text-gray-400">
              {success
                ? t('auth.redirectingToLogin') || 'Redirecting to login...'
                : t('auth.resetPasswordSubtitle') || 'Enter your new password below'}
            </p>
          </div>

          {/* Form */}
          <div className="p-8" dir={isRTL ? 'rtl' : 'ltr'}>
            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-green-500/20 border border-green-500/30 text-green-400 p-6 rounded-xl text-center"
              >
                <svg
                  className="w-16 h-16 mx-auto mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-lg font-semibold">
                  {t('auth.passwordResetSuccess') || 'Password reset successfully!'}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  {t('auth.redirectingToLogin') || 'Redirecting to login...'}
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/20 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-gray-300 mb-2"
                  >
                    {t('auth.newPassword') || 'New Password'}
                  </label>
                  <div className="relative">
                    <div
                      className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}
                    >
                      <svg
                        className="w-5 h-5 text-gray-400"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className={`${isRTL ? 'pr-10' : 'pl-10'} w-full bg-gray-900/50 border border-blue-500/30 rounded-xl py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300`}
                      placeholder={t('auth.enterNewPassword') || 'Enter new password'}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-semibold text-gray-300 mb-2"
                  >
                    {t('auth.confirmPassword') || 'Confirm Password'}
                  </label>
                  <div className="relative">
                    <div
                      className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}
                    >
                      <svg
                        className="w-5 h-5 text-gray-400"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className={`${isRTL ? 'pr-10' : 'pl-10'} w-full bg-gray-900/50 border border-blue-500/30 rounded-xl py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300`}
                      placeholder={t('auth.confirmNewPassword') || 'Confirm new password'}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <motion.button
                    type="submit"
                    disabled={isLoading || !password || !confirmPassword}
                    whileHover={{
                      scale: isLoading ? 1 : 1.02,
                      boxShadow: '0 0 30px rgba(59, 130, 246, 0.5)',
                    }}
                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-4 px-4 rounded-full shadow-lg shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <svg
                          className={`animate-spin ${isRTL ? '-mr-1 ml-3' : '-ml-1 mr-3'} h-5 w-5 text-white`}
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
                        {t('auth.resettingPassword') || 'Resetting...'}
                      </div>
                    ) : (
                      t('auth.resetPasswordButton') || 'Reset Password'
                    )}
                  </motion.button>
                </div>
              </form>
            )}

            {!success && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => navigate('/login')}
                  className="text-sm text-gray-400 hover:text-blue-400 transition-colors"
                >
                  {t('auth.backToLogin') || 'Back to login'}
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import footer1 from '../../assets/footer1.webp';

const ForgotPasswordModal = ({ onClose, onBackToLogin }) => {
  const { t, isRTL } = useLanguage();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handle ESC key press to close modal
  useEffect(() => {
    const handleEscapeKey = e => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscapeKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  const handleSubmit = async e => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send reset email');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto my-auto"
      >
        {/* Main Modal */}
        <div className="relative bg-gradient-to-br from-gray-900 to-black backdrop-blur-2xl border border-blue-500/30 rounded-3xl shadow-2xl shadow-blue-500/20 overflow-hidden min-h-fit">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10 bg-gray-900/50 hover:bg-gray-900/80 p-2 rounded-lg"
            aria-label="Close modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
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
          </button>

          {/* Header section with logo */}
          <div className="relative p-8 text-center border-b border-blue-500/20">
            <img
              src={footer1}
              alt="Rentyl"
              className="h-16 w-auto object-contain mx-auto brightness-150 mb-4"
            />
            <h2 className="text-2xl font-bold text-white mb-2">
              {success
                ? t('auth.checkYourEmail') || 'Check Your Email'
                : t('auth.forgotPassword') || 'Forgot Password?'}
            </h2>
            <p className="text-gray-400">
              {success
                ? t('auth.resetLinkSent') ||
                  'If an account exists with this email, a password reset link has been sent.'
                : t('auth.forgotPasswordSubtitle') ||
                  "Enter your email address and we'll send you a link to reset your password."}
            </p>
          </div>

          {/* Form section */}
          <div className="relative p-8" dir={isRTL ? 'rtl' : 'ltr'}>
            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="bg-green-500/20 border border-green-500/30 text-green-400 p-6 rounded-xl text-center">
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
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-sm">
                    {t('auth.resetEmailInstruction') ||
                      'Please check your email and click the reset link to set a new password.'}
                  </p>
                </div>

                <motion.button
                  onClick={onBackToLogin}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-4 px-4 rounded-full shadow-lg shadow-blue-500/50 transition-all duration-300"
                >
                  {t('auth.backToLogin') || 'Back to Login'}
                </motion.button>
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
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-300 mb-2">
                    {t('auth.emailAddress') || 'Email Address'}
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
                        <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6z"></path>
                        <path d="M2 6l10 7 10-7"></path>
                      </svg>
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className={`${isRTL ? 'pr-10' : 'pl-10'} w-full bg-gray-900/50 border border-blue-500/30 rounded-xl py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300`}
                      placeholder={t('auth.enterEmail') || 'Enter your email'}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <motion.button
                    type="submit"
                    disabled={isLoading || !email}
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
                        {t('auth.sending') || 'Sending...'}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        {t('auth.sendResetLink') || 'Send Reset Link'}
                        <svg
                          className="w-5 h-5 ml-2"
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
                      </div>
                    )}
                  </motion.button>
                </div>
              </form>
            )}

            {!success && (
              <div className="mt-6 text-center">
                <button
                  onClick={onBackToLogin}
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

export default ForgotPasswordModal;

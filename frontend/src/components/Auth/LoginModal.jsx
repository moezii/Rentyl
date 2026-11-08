import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import footer1 from '../../assets/footer1.webp';
import ForgotPasswordModal from './ForgotPasswordModal';

const LoginModal = ({ onClose }) => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const { t, isRTL } = useLanguage();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

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

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');

    try {
      await login(formData.email, formData.password);
      onClose();
      navigate('/dashboard');
    } catch (error) {
      setLoginError(t('auth.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sign-up link click - navigate to contact page and scroll to demo section
  const handleSignUpClick = () => {
    onClose(); // Close the modal before navigating

    // Navigate to contact page
    navigate('/contact');

    // Add a small delay to ensure navigation completes, then scroll to demo section
    setTimeout(() => {
      const demoSection =
        document.getElementById('request-demo') ||
        document.querySelector('[data-section="demo"]') ||
        document.querySelector('.demo-section') ||
        document.querySelector('section[id*="demo"]') ||
        document.querySelector('section[class*="demo"]');

      if (demoSection) {
        demoSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      } else {
        // Fallback: scroll to a reasonable position if demo section not found
        window.scrollTo({
          top: window.innerHeight * 0.6,
          behavior: 'smooth',
        });
      }
    }, 300);
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
        className="relative w-full max-w-[380px] max-h-[90vh] overflow-y-auto my-auto"
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
          <div className="relative py-8 px-3 text-center border-b border-blue-500/20">
            <img
              src={footer1}
              alt="Rentyl"
              className="h-10 w-auto object-contain mx-auto brightness-150 mb-3"
            />
            <h2 className="text-base font-bold text-white mb-1.5">{t('auth.welcome')}</h2>
            <p className="text-xs text-gray-400">{t('auth.signInSubtitle')}</p>
          </div>

          {/* Form section */}
          <div className="relative py-10 px-4" dir={isRTL ? 'rtl' : 'ltr'}>
            <form onSubmit={handleSubmit} className="space-y-4">
              {loginError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/20 border border-red-500/30 text-red-400 p-2 rounded-xl text-xs"
                >
                  {loginError}
                </motion.div>
              )}

              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-gray-300 mb-2">
                  {t('auth.emailAddress')}
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
                    value={formData.email}
                    onChange={handleChange}
                    className={`${isRTL ? 'pr-10' : 'pl-10'} w-full bg-gray-900/50 border border-blue-500/30 rounded-xl py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300`}
                    placeholder={t('auth.enterEmail')}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-gray-300 mb-2"
                >
                  {t('auth.password')}
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
                    value={formData.password}
                    onChange={handleChange}
                    className={`${isRTL ? 'pr-10' : 'pl-10'} w-full bg-gray-900/50 border border-blue-500/30 rounded-xl py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300`}
                    placeholder={t('auth.enterPassword')}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {t('auth.forgotPassword') || 'Forgot password?'}
                </button>
              </div>

              <div className="pt-2">
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{
                    scale: isLoading ? 1 : 1.02,
                    boxShadow: '0 0 30px rgba(59, 130, 246, 0.5)',
                  }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-bold py-2.5 px-4 rounded-full shadow-lg shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      {t('auth.signingIn')}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      {t('auth.signIn')}
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

            <div className="mt-5 text-center">
              <p className="text-xs text-gray-400">
                {t('auth.noAccount')}{' '}
                <button
                  onClick={handleSignUpClick}
                  className="font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                >
                  {t('auth.requestDemo')}
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Help text */}
        <div className="text-center mt-4 text-gray-400 text-xs">{t('auth.helpText')}</div>
      </motion.div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <ForgotPasswordModal
          onClose={() => setShowForgotPassword(false)}
          onBackToLogin={() => setShowForgotPassword(false)}
        />
      )}
    </div>
  );
};

export default LoginModal;

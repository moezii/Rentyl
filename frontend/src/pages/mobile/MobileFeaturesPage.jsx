import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import SEOHead from '../../components/SEO/SEOHead';
import { serviceSchema } from '../../components/SEO/structuredData';
import emailjs from '@emailjs/browser';
import emailSecurity from '../../utils/emailSecurity';
import footer1 from '../../assets/footer1.webp';

// Mobile Feature Icon Component
const MobileFeatureIcon = ({ type }) => {
  const icons = {
    car: (
      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0h.01M15 17a2 2 0 104 0m-4 0h.01M17 16h.01" />
      </svg>
    ),
    cloud: (
      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
    money: (
      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    users: (
      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    wrench: (
      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    chat: (
      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  };
  return icons[type] || null;
};

const MobileFeaturesPage = () => {
  const [activeModal, setActiveModal] = useState(null);
  const { t, isRTL } = useLanguage();

  // Email signup state
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState({
    submitted: false,
    success: false,
    loading: false,
    message: '',
  });

  // Initialize EmailJS
  useEffect(() => {
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
    if (publicKey) {
      emailjs.init(publicKey);
    } else {
      console.error('EmailJS public key is missing. Check your environment variables.');
    }
  }, []);

  const openModal = modalType => {
    setActiveModal(modalType);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  // Handle secure email signup submission
  const handleEmailSubmit = async e => {
    e.preventDefault();

    setEmailStatus({
      submitted: false,
      success: false,
      loading: true,
      message: t('features.signingUp'),
    });

    try {
      // Comprehensive email validation
      const emailValidation = emailSecurity.validateEmail(email);
      if (!emailValidation.valid) {
        setEmailStatus({
          submitted: true,
          success: false,
          loading: false,
          message: emailValidation.error,
        });
        return;
      }

      // Prepare secure form data for early access signup
      const formData = {
        name: 'Mobile App Early Access Signup',
        email: emailValidation.email,
        message: `User signed up for mobile app early access notification`,
        company: 'Early Access Request',
        phone: '',
        fleetSize: '',
      };

      // Use secure email submission
      const result = await emailSecurity.secureEmailSubmission(
        formData,
        {
          serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
          templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        },
        'early_access'
      );

      console.log('Secure email sent successfully:', result.submissionId);

      setEmailStatus({
        submitted: true,
        success: true,
        loading: false,
        message: t('features.thanksForSigning'),
      });

      setEmail('');
    } catch (error) {
      console.error('Secure email submission failed:', error);

      setEmailStatus({
        submitted: true,
        success: false,
        loading: false,
        message: error.message || t('features.errorTryAgain'),
      });
    }
  };

  // Create FAQ structured data for features
  const featuresStructuredData = [serviceSchema];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <SEOHead
        title="Features - Rentyl Fleet Management"
        description="Explore Rentyl's features: fleet management, booking, maintenance, analytics, and more."
        keywords="car rental features, fleet management, booking, analytics"
        canonical="https://rentyl.app/features"
        structuredData={featuresStructuredData}
        hreflang={[
          { lang: 'en', href: 'https://rentyl.app/features' },
          { lang: 'ar', href: 'https://rentyl.app/ar/features' },
          { lang: 'ms', href: 'https://rentyl.app/ms/features' },
        ]}
      />
      {/* Visually hidden h1 for SEO */}
      <h1 className="sr-only">{t('features.title')}</h1>

      {/* Mobile Hero Section */}
      <div className="relative py-12 px-4">
        <div className="max-w-lg mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-block mb-4 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full"
          >
            <span className="text-blue-400 text-xs font-semibold tracking-wide">
              {t('features.powerfulTools')}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold mb-4 bg-gradient-to-r from-gray-200 via-blue-100 to-gray-200 bg-clip-text text-transparent"
          >
            {t('features.title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-base text-gray-300"
          >
            {t('features.subtitle')}
          </motion.p>
        </div>
      </div>

      {/* Mobile Main Features Section */}
      <div className="py-10 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-3 text-white">{t('pricing.coreFeatures')}</h2>
            <p className="text-gray-400 text-sm">{t('pricing.coreFeaturesSub')}</p>
          </div>

          <div className="space-y-4">
            {mobileFeatureCards.map((feature, index) => (
              <MobileFeatureCard key={index} {...feature} index={index} />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Analytics Preview */}
      <div className="py-10 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-3 text-white">
              {t('features.advancedAnalyticsDashboard')}
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              {t('features.advancedAnalyticsDashboardDesc')}
            </p>
          </div>

          {/* Mobile Analytics Dashboard Mockup */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-blue-500/20 shadow-xl shadow-blue-500/10 mb-6">
            <div className="bg-gray-900 px-4 py-3 flex items-center justify-between border-b border-blue-500/20">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              </div>
              <span className="text-xs font-medium text-gray-400">
                {t('features.rentylAnalytics')}
              </span>
              <div className="w-8"></div>
            </div>

            <div className="p-4">
              <div className="text-center mb-4">
                <h3 className="text-base font-bold text-white">{t('features.businessOverview')}</h3>
                <p className="text-gray-500 text-xs">{t('features.realtimePerformanceMetrics')}</p>
              </div>

              {/* Mobile KPI Cards */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                  <div className="text-lg font-bold text-white">$42.5k</div>
                  <div className="text-blue-400 text-xs font-medium">{t('features.revenue')}</div>
                  <div className="text-xs text-green-400 font-medium">+18%</div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                  <div className="text-lg font-bold text-white">84%</div>
                  <div className="text-emerald-400 text-xs font-medium">
                    {t('features.utilization')}
                  </div>
                  <div className="text-xs text-green-400 font-medium">+8%</div>
                </div>
              </div>

              {/* Mobile Chart */}
              <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700/50">
                <h4 className="font-semibold text-white mb-3 text-sm">
                  {t('features.weeklyRevenue')}
                </h4>
                <div className="flex items-end justify-between h-16 px-1">
                  <div className="bg-blue-500 w-4 h-8 rounded-t"></div>
                  <div className="bg-blue-500 w-4 h-10 rounded-t"></div>
                  <div className="bg-blue-600 w-4 h-16 rounded-t"></div>
                  <div className="bg-blue-500 w-4 h-12 rounded-t"></div>
                  <div className="bg-blue-500 w-4 h-6 rounded-t"></div>
                  <div className="bg-emerald-500 w-4 h-4 rounded-t"></div>
                  <div className="bg-emerald-500 w-4 h-3 rounded-t"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Analytics Features List */}
          <div className="space-y-2">
            {mobileAnalyticsFeatures.map((feature, index) => (
              <div
                key={index}
                className={`flex items-start bg-gray-800/50 backdrop-blur-sm border border-blue-500/20 p-3 rounded-xl gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <svg
                    className="h-4 w-4 text-blue-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className={`text-gray-300 text-sm ${isRTL ? 'text-right' : ''}`}>
                  {t(`features.${feature}`)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Coming Soon Section */}
      <div className="py-10 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 text-purple-400 px-3 py-1 rounded-full text-xs font-medium mb-4">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              {t('features.comingSoon')}
            </div>
            <h2 className="text-2xl font-bold mb-3 text-white">{t('features.mobileApps')}</h2>
            <p className="text-gray-400 text-sm mb-6">{t('features.mobileDashboardDesc')}</p>
          </div>

          {/* Mobile App Previews */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {/* iOS Preview */}
            <div className="text-center">
              <div className="w-full aspect-[9/16] max-w-[140px] mx-auto bg-black rounded-2xl p-1 shadow-xl shadow-blue-500/20 mb-3">
                <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl overflow-hidden relative">
                  {/* iPhone Notch */}
                  <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-12 h-3 bg-black rounded-full z-10"></div>

                  {/* Coming Soon Content */}
                  <div className="h-full px-2 pb-6 pt-8 flex flex-col items-center justify-center">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-lg mb-2">
                      <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.71.85-1.85 1.66-2.95 1.57-.13-1.15.4-2.35 1.05-3.26z" />
                      </svg>
                    </div>
                    <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                      {t('features.q2_2026')}
                    </div>
                    <div className="text-[10px] text-gray-600">{t('features.expectedLaunch')}</div>
                  </div>
                </div>
              </div>
              <h3 className="font-semibold text-white text-sm">iOS App</h3>
            </div>

            {/* Android Preview */}
            <div className="text-center">
              <div className="w-full aspect-[9/16] max-w-[140px] mx-auto bg-gray-800 rounded-2xl p-1 shadow-xl shadow-green-500/20 mb-3">
                <div className="w-full h-full bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl overflow-hidden relative">
                  {/* Android Punch-hole Camera */}
                  <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-black rounded-full z-10"></div>

                  {/* Coming Soon Content */}
                  <div className="h-full px-2 pb-6 pt-8 flex flex-col items-center justify-center">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-lg mb-2">
                      <svg
                        className="w-5 h-5 text-green-500"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3435-4.1021-2.6892-7.5743-6.1185-9.4396" />
                      </svg>
                    </div>
                    <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">
                      {t('features.q2_2026')}
                    </div>
                    <div className="text-[10px] text-gray-600">{t('features.expectedLaunch')}</div>
                  </div>
                </div>
              </div>
              <h3 className="font-semibold text-white text-sm">Android App</h3>
            </div>
          </div>

          {/* Mobile Email Signup */}
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-5">
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-2 bg-white/10 text-white px-3 py-1 rounded-full text-xs font-medium mb-3">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
                {t('features.earlyAccess')}
              </div>
              <h3 className="text-lg font-bold mb-2 text-white">{t('features.beFirstToKnow')}</h3>
              <p className="text-gray-300 text-sm mb-4">{t('features.joinThousands')}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-4">
              <div className="text-xs text-gray-200 space-y-1">
                <div>• {t('features.dayFreeTrial')}</div>
                <div>• {t('features.prioritySupport')}</div>
                <div>• {t('features.betaTesting')}</div>
                <div>• {t('features.specialPricing')}</div>
              </div>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (emailStatus.submitted && !emailStatus.success) {
                      setEmailStatus(prev => ({ ...prev, submitted: false, message: '' }));
                    }
                  }}
                  placeholder={t('features.enterEmailAddress')}
                  maxLength="254"
                  className={`w-full px-4 py-3 bg-gray-900/50 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 text-sm ${
                    emailStatus.submitted && !emailStatus.success && !emailStatus.loading
                      ? 'border-red-500/50 focus:ring-red-500/50'
                      : 'border-gray-600 focus:ring-purple-500/50 focus:border-purple-500/50'
                  }`}
                  disabled={emailStatus.loading}
                  required
                />
                {emailStatus.submitted && !emailStatus.success && !emailStatus.loading && (
                  <p className="mt-2 text-xs text-red-300 bg-red-500/20 rounded-lg px-3 py-2">
                    {emailStatus.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 rounded-xl font-bold text-sm shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={emailStatus.loading}
              >
                {emailStatus.loading ? t('features.signingUp') : t('features.getEarlyAccess')}
              </button>
            </form>

            {emailStatus.submitted && emailStatus.success && (
              <div className="text-center p-3 rounded-xl bg-green-500/20 border border-green-500/30 text-green-300 mt-3">
                <div className="flex items-center justify-center mb-1">
                  <svg
                    className="w-4 h-4 text-green-400 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm font-semibold">{emailStatus.message}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Footer */}
      <footer className="bg-black border-t border-blue-500/20 py-8 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-6">
            <img
              src={footer1}
              alt="Rentyl"
              className="h-8 w-auto object-contain mb-4 mx-auto brightness-150"
            />
            <p className="text-gray-400 text-sm">{t('landing.subtitle')}</p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="text-center">
              <h4 className="text-base font-semibold mb-4 text-white">{t('about.quickLinks')}</h4>
              <div className="space-y-2 text-gray-400 text-sm">
                <a href="/" className="block hover:text-blue-400 transition-colors">
                  {t('nav.home')}
                </a>
                <a href="/features" className="block hover:text-blue-400 transition-colors">
                  {t('nav.features')}
                </a>
                <a href="/about" className="block hover:text-blue-400 transition-colors">
                  {t('nav.about')}
                </a>
                <a href="/contact" className="block hover:text-blue-400 transition-colors">
                  {t('nav.contact')}
                </a>
              </div>
            </div>

            <div className="text-center">
              <h4 className="text-base font-semibold mb-4 text-white">{t('about.contactUs')}</h4>
              <div className="space-y-2 text-gray-400 text-sm" dir="ltr">
                <div>support@rentyl.app</div>
                <div>+968 0000 0000</div>
              </div>
            </div>
          </div>

          <div className="text-center pt-6 border-t border-blue-500/20">
            <p className="text-gray-500 text-xs mb-4">{t('about.allRightsReserved')}</p>
            <div className="flex justify-center gap-4 text-xs">
              <button
                onClick={() => openModal('privacy')}
                className="text-gray-500 hover:text-blue-400 transition-colors"
              >
                {t('about.privacyPolicy')}
              </button>
              <button
                onClick={() => openModal('terms')}
                className="text-gray-500 hover:text-blue-400 transition-colors"
              >
                {t('about.termsOfService')}
              </button>
              <button
                onClick={() => openModal('cookies')}
                className="text-gray-500 hover:text-blue-400 transition-colors"
              >
                {t('about.cookiePolicy')}
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Policy Modals */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={closeModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-gray-900 border border-blue-500/30 rounded-2xl shadow-2xl shadow-blue-500/20 max-w-sm w-full max-h-[80vh] overflow-hidden mx-4"
            >
              <div className="flex items-center justify-between p-4 border-b border-blue-500/20">
                <h2 className="text-lg font-bold text-white">
                  {activeModal === 'privacy' && t('about.privacyPolicy')}
                  {activeModal === 'terms' && t('about.termsOfService')}
                  {activeModal === 'cookies' && t('about.cookiePolicy')}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh] text-sm">
                {activeModal === 'privacy' && <PrivacyPolicy />}
                {activeModal === 'terms' && <TermsOfService />}
                {activeModal === 'cookies' && <CookiePolicy />}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Mobile Feature Card Component
const MobileFeatureCard = ({ title, description, icon, index }) => {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-gray-800/50 backdrop-blur-sm border border-blue-500/20 rounded-xl p-4"
    >
      <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-center mb-3">
        <MobileFeatureIcon type={icon} />
      </div>
      <h3 className="text-lg font-bold mb-2 text-white">{t(`features.${title}`)}</h3>
      <p className="text-gray-400 text-sm">{t(`features.${description}`)}</p>
    </motion.div>
  );
};

// Policy Components (dark theme)
const PrivacyPolicy = () => {
  const { t } = useLanguage();
  return (
    <div>
      <p className="text-gray-400 mb-3">{t('about.lastUpdated')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('about.informationWeCollect')}</h3>
      <p className="text-gray-400 mb-3">{t('about.informationWeCollectDesc')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('about.howWeUseInformation')}</h3>
      <p className="text-gray-400 mb-3">{t('about.howWeUseInformationDesc')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('about.informationSharing')}</h3>
      <p className="text-gray-400 mb-3">{t('about.informationSharingDesc')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('about.dataSecurity')}</h3>
      <p className="text-gray-400 mb-3">{t('about.dataSecurityDesc')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('about.contactUs')}</h3>
      <p className="text-gray-400">{t('about.contactUsPrivacy')}</p>
    </div>
  );
};

const TermsOfService = () => {
  const { t } = useLanguage();
  return (
    <div>
      <p className="text-gray-400 mb-3">{t('about.lastUpdated')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('about.acceptanceOfTerms')}</h3>
      <p className="text-gray-400 mb-3">{t('about.acceptanceOfTermsDesc')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('about.useLicense')}</h3>
      <p className="text-gray-400 mb-3">{t('about.useLicenseDesc')}</p>
      <ul className="list-disc list-inside text-gray-400 mb-3 space-y-1">
        <li>{t('about.modifyMaterials')}</li>
        <li>{t('about.commercialUse')}</li>
        <li>{t('about.reverseEngineer')}</li>
        <li>{t('about.removeCopyright')}</li>
      </ul>
      <h3 className="font-semibold mb-2 text-white">{t('about.serviceAvailability')}</h3>
      <p className="text-gray-400 mb-3">{t('about.serviceAvailabilityDesc')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('about.limitationOfLiability')}</h3>
      <p className="text-gray-400 mb-3">{t('about.limitationOfLiabilityDesc')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('about.contactInformation')}</h3>
      <p className="text-gray-400">{t('about.contactInformationDesc')}</p>
    </div>
  );
};

const CookiePolicy = () => {
  const { t } = useLanguage();
  return (
    <div>
      <p className="text-gray-400 mb-3">{t('about.lastUpdated')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('about.whatAreCookies')}</h3>
      <p className="text-gray-400 mb-3">{t('about.whatAreCookiesDesc')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('about.typesOfCookies')}</h3>
      <div className="space-y-2 mb-3">
        <div>
          <h4 className="font-medium text-gray-300">{t('about.essentialCookies')}</h4>
          <p className="text-gray-400 text-sm">{t('about.essentialCookiesDesc')}</p>
        </div>
        <div>
          <h4 className="font-medium text-gray-300">{t('about.analyticsCookies')}</h4>
          <p className="text-gray-400 text-sm">{t('about.analyticsCookiesDesc')}</p>
        </div>
        <div>
          <h4 className="font-medium text-gray-300">{t('about.functionalCookies')}</h4>
          <p className="text-gray-400 text-sm">{t('about.functionalCookiesDesc')}</p>
        </div>
      </div>
      <h3 className="font-semibold mb-2 text-white">{t('about.managingCookies')}</h3>
      <p className="text-gray-400 mb-3">{t('about.managingCookiesDesc')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('about.thirdPartyCookies')}</h3>
      <p className="text-gray-400 mb-3">{t('about.thirdPartyCookiesDesc')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('about.contactUs')}</h3>
      <p className="text-gray-400">{t('about.contactUsCookies')}</p>
    </div>
  );
};

// Mobile Features Data
const mobileFeatureCards = [
  {
    title: 'comprehensiveFleetManagement',
    description: 'comprehensiveFleetManagementDesc',
    icon: 'car',
  },
  {
    title: 'cloudBasedServices',
    description: 'cloudBasedServicesDesc',
    icon: 'cloud',
  },
  {
    title: 'financialTracking',
    description: 'financialTrackingDesc',
    icon: 'money',
  },
  {
    title: 'customerManagement',
    description: 'customerManagementDesc',
    icon: 'users',
  },
  {
    title: 'maintenanceScheduling',
    description: 'maintenanceSchedulingDesc',
    icon: 'wrench',
  },
  {
    title: 'support247',
    description: 'support247Desc',
    icon: 'chat',
  },
];

// Mobile Analytics Features
const mobileAnalyticsFeatures = [
  'realtimeRevenueTracking',
  'fleetUtilizationMetrics',
  'customerBehaviorAnalysis',
  'maintenanceCostTracking',
  'customKPIDashboards',
  'exportableReports',
];

export default MobileFeaturesPage;

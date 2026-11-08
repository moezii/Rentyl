import React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import SEOHead from '../components/SEO/SEOHead';
import { organizationSchema } from '../components/SEO/structuredData';
import emailjs from '@emailjs/browser';
import emailSecurity from '../utils/emailSecurity';
// Import imagess
import footer1 from '../assets/footer1.webp';

const AboutPage = () => {
  const { t, isRTL } = useLanguage();
  const [activeModal, setActiveModal] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [joinFormData, setJoinFormData] = useState({
    name: '',
    email: '',
    phone: '',
    field: '',
    message: '',
  });
  const [joinFormStatus, setJoinFormStatus] = useState({
    submitted: false,
    success: false,
    loading: false,
    message: '',
  });
  const [joinFormErrors, setJoinFormErrors] = useState({});

  // Initialize EmailJS
  useEffect(() => {
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
    if (publicKey) {
      emailjs.init(publicKey);
    }
  }, []);

  const openModal = modalType => {
    setActiveModal(modalType);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const handleJoinFormChange = e => {
    const { name, value } = e.target;
    setJoinFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    if (joinFormErrors[name]) {
      setJoinFormErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleJoinFormSubmit = async e => {
    e.preventDefault();
    setJoinFormErrors({});

    setJoinFormStatus({
      submitted: false,
      success: false,
      loading: true,
      message: t('contact.sending'),
    });

    try {
      const result = await emailSecurity.secureEmailSubmission(
        joinFormData,
        {
          serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
          templateId:
            import.meta.env.VITE_EMAILJS_CAREERS_TEMPLATE_ID ||
            import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        },
        'careers'
      );

      console.log('[About] Career form submitted successfully:', result.submissionId);

      setJoinFormStatus({
        submitted: true,
        success: true,
        loading: false,
        message: t('about.joinTeamSuccess'),
      });

      setJoinFormData({
        name: '',
        email: '',
        phone: '',
        field: '',
        message: '',
      });
    } catch (error) {
      console.error('Career form submission failed:', error);

      if (error.message && error.message.includes('Form validation failed:')) {
        const errorMessage = error.message.replace('Form validation failed: ', '');
        const fieldErrors = {};

        if (errorMessage.includes('name')) fieldErrors.name = t('contact.nameRequired');
        if (errorMessage.includes('email')) fieldErrors.email = t('contact.emailRequired');
        if (errorMessage.includes('phone')) fieldErrors.phone = t('contact.phoneRequired');
        if (errorMessage.includes('field')) fieldErrors.field = t('about.fieldRequired');

        setJoinFormErrors(fieldErrors);

        setJoinFormStatus({
          submitted: true,
          success: false,
          loading: false,
          message: errorMessage,
        });
      } else {
        setJoinFormStatus({
          submitted: true,
          success: false,
          loading: false,
          message: t('contact.messageFailedToSend'),
        });
      }
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 min-h-screen">
      <SEOHead
        title="About Rentyl"
        description="Learn about Rentyl's mission and team. Innovative car rental management."
        keywords="about rentyl, car rental company, fleet management"
        canonical="https://rentyl.app/about"
        structuredData={[organizationSchema]}
        hreflang={[
          { lang: 'en', href: 'https://rentyl.app/about' },
          { lang: 'ar', href: 'https://rentyl.app/ar/about' },
          { lang: 'ms', href: 'https://rentyl.app/ms/about' },
        ]}
      />

      {/* Visually hidden h1 for SEO */}
      <h1 className="sr-only">{t('about.title')}</h1>

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
      <div className="relative pt-32 pb-24 px-4 overflow-hidden">
        <div className="container mx-auto relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-block mb-6 px-6 py-3 bg-blue-500/10 border border-blue-500/30 rounded-full"
            >
              <span className="text-blue-400 text-sm font-bold tracking-wide">
                {t('about.whoWeAre')}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent"
            >
              {t('about.title')}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              {t('about.subtitle')}
            </motion.p>

            {/* Feature Boxes */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
            >
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-gradient-to-br from-gray-900/60 to-black/60 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6 shadow-xl shadow-blue-500/10"
              >
                <div className="flex justify-center mb-3">
                  <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="text-gray-300 text-sm font-semibold text-center">
                  {t('about.enterpriseGrade')}
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-gradient-to-br from-gray-900/60 to-black/60 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6 shadow-xl shadow-blue-500/10"
              >
                <div className="flex justify-center mb-3">
                  <svg className="w-10 h-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <div className="text-gray-300 text-sm font-semibold text-center">
                  {t('about.scalableSolution')}
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-gradient-to-br from-gray-900/60 to-black/60 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6 shadow-xl shadow-blue-500/10"
              >
                <div className="flex justify-center mb-3">
                  <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="text-gray-300 text-sm font-semibold text-center">
                  {t('about.secureReliable')}
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-gradient-to-br from-gray-900/60 to-black/60 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6 shadow-xl shadow-blue-500/10"
              >
                <div className="flex justify-center mb-3">
                  <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="text-gray-300 text-sm font-semibold text-center">
                  {t('about.fastEfficient')}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Core Values Section */}
      <div className="relative py-24 px-4 bg-black/30">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              {t('about.coreValues')}
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              {t('about.coreValuesSubtitle')}
            </p>
          </motion.div>

          {/* SEO text */}
          <div className="text-white opacity-0 h-0 overflow-hidden" style={{ userSelect: 'none' }}>
            About Rentyl: Our mission is to revolutionize car rental with innovative technology and
            service. Founded by industry experts, Rentyl provides tools for success. We value
            reliability, security, and user-centric design. Our leadership team brings decades of
            experience in fleet management and customer support. Join us to transform the car rental
            industry.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {coreValues.map((value, index) => (
              <ValueCard
                key={index}
                {...value}
                index={index}
                isHovered={hoveredCard === index}
                onHover={() => setHoveredCard(index)}
                onLeave={() => setHoveredCard(null)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Join Our Team Section */}
      <div className="relative py-24 px-4 bg-black/30">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-block mb-6 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
              <span className="text-green-400 text-sm font-bold tracking-wide">
                {t('about.joinUs')}
              </span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              {t('about.joinOurTeam')}
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">{t('about.joinTeamSubtitle')}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm border border-green-500/20 rounded-2xl p-8 md:p-12"
          >
            {joinFormStatus.submitted && joinFormStatus.success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="w-16 h-16 bg-green-500/20 border border-green-500/40 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-8 h-8 text-green-400"
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
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  {t('about.applicationReceived')}
                </h3>
                <p className="text-gray-300 mb-6">{joinFormStatus.message}</p>
                <button
                  onClick={() =>
                    setJoinFormStatus({
                      submitted: false,
                      success: false,
                      loading: false,
                      message: '',
                    })
                  }
                  className="px-6 py-3 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-all duration-300"
                >
                  {t('about.submitAnother')}
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleJoinFormSubmit} className="space-y-6">
                {/* Full Name */}
                <div>
                  <label htmlFor="name" className="block text-gray-300 font-medium mb-2">
                    {t('contact.fullName')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={joinFormData.name}
                    onChange={handleJoinFormChange}
                    className={`w-full px-4 py-3 bg-gray-900/50 border ${joinFormErrors.name ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white focus:outline-none focus:border-green-500 transition-colors`}
                    placeholder={t('contact.fullName')}
                    disabled={joinFormStatus.loading}
                  />
                  {joinFormErrors.name && (
                    <p className="text-red-400 text-sm mt-1">{joinFormErrors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-gray-300 font-medium mb-2">
                    {t('contact.emailAddress')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={joinFormData.email}
                    onChange={handleJoinFormChange}
                    className={`w-full px-4 py-3 bg-gray-900/50 border ${joinFormErrors.email ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white focus:outline-none focus:border-green-500 transition-colors`}
                    placeholder={t('contact.emailAddress')}
                    disabled={joinFormStatus.loading}
                  />
                  {joinFormErrors.email && (
                    <p className="text-red-400 text-sm mt-1">{joinFormErrors.email}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label htmlFor="phone" className="block text-gray-300 font-medium mb-2">
                    {t('contact.phoneNumber')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={joinFormData.phone}
                    onChange={handleJoinFormChange}
                    className={`w-full px-4 py-3 bg-gray-900/50 border ${joinFormErrors.phone ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white focus:outline-none focus:border-green-500 transition-colors`}
                    placeholder={t('contact.phoneNumber')}
                    disabled={joinFormStatus.loading}
                  />
                  {joinFormErrors.phone && (
                    <p className="text-red-400 text-sm mt-1">{joinFormErrors.phone}</p>
                  )}
                </div>

                {/* Field of Interest */}
                <div>
                  <label htmlFor="field" className="block text-gray-300 font-medium mb-2">
                    {t('about.fieldOfInterest')} <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="field"
                    name="field"
                    value={joinFormData.field}
                    onChange={handleJoinFormChange}
                    className={`w-full px-4 py-3 bg-gray-900/50 border ${joinFormErrors.field ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white focus:outline-none focus:border-green-500 transition-colors`}
                    disabled={joinFormStatus.loading}
                  >
                    <option value="">{t('about.selectField')}</option>
                    <option value="development">{t('about.development')}</option>
                    <option value="design">{t('about.design')}</option>
                    <option value="devops">{t('about.devops')}</option>
                    <option value="security">{t('about.security')}</option>
                    <option value="marketing">{t('about.marketing')}</option>
                    <option value="sales">{t('about.sales')}</option>
                    <option value="support">{t('about.support')}</option>
                    <option value="other">{t('about.other')}</option>
                  </select>
                  {joinFormErrors.field && (
                    <p className="text-red-400 text-sm mt-1">{joinFormErrors.field}</p>
                  )}
                </div>

                {/* Additional Message */}
                <div>
                  <label htmlFor="message" className="block text-gray-300 font-medium mb-2">
                    {t('contact.message')}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows="4"
                    value={joinFormData.message}
                    onChange={handleJoinFormChange}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 transition-colors resize-none"
                    placeholder={t('about.tellUsAboutYourself')}
                    disabled={joinFormStatus.loading}
                  />
                </div>

                {/* Error Message */}
                {joinFormStatus.submitted && !joinFormStatus.success && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">{joinFormStatus.message}</p>
                  </div>
                )}

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={joinFormStatus.loading}
                  whileHover={!joinFormStatus.loading ? { scale: 1.02 } : {}}
                  whileTap={!joinFormStatus.loading ? { scale: 0.98 } : {}}
                  className={`w-full py-4 rounded-lg font-bold text-white transition-all duration-300 ${
                    joinFormStatus.loading
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/30 hover:shadow-green-500/50'
                  }`}
                >
                  {joinFormStatus.loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      {t('contact.sending')}
                    </span>
                  ) : (
                    t('about.submitApplication')
                  )}
                </motion.button>
              </form>
            )}
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative bg-black border-t border-blue-500/20 py-16 px-4">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>

        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Company Info */}
            <div className="md:col-span-2">
              <img
                src={footer1}
                alt="Rentyl"
                className="h-12 w-auto object-contain mb-6 brightness-150"
              />
              <p className="text-gray-400 mb-6 max-w-md leading-relaxed">{t('landing.subtitle')}</p>
              <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                <motion.div
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="w-10 h-10 bg-gray-800/50 border border-blue-500/30 rounded-lg flex items-center justify-center text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all duration-300"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="w-10 h-10 bg-gray-800/50 border border-blue-500/30 rounded-lg flex items-center justify-center text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all duration-300"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="w-10 h-10 bg-gray-800/50 border border-blue-500/30 rounded-lg flex items-center justify-center text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all duration-300"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </motion.div>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className={`text-lg font-bold mb-6 text-white ${isRTL ? 'text-right' : ''}`}>
                {t('about.contactUs')}
              </h4>
              <div className={`space-y-4 text-gray-400 ${isRTL ? 'text-right' : ''}`}>
                <div
                  className={`flex items-center gap-3 ${
                    isRTL ? 'flex-row-reverse text-right ml-auto' : ''
                  }`}
                >
                  <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <a
                    href="mailto:support@rentyl.app"
                    className={`text-sm hover:text-blue-400 transition-colors ${
                      isRTL ? 'text-right' : ''
                    }`}
                    dir="ltr"
                  >
                    support@rentyl.app
                  </a>
                </div>
                <div
                  className={`flex items-start gap-3 ${
                    isRTL ? 'flex-row-reverse justify-end w-full' : ''
                  }`}
                >
                  <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                  </div>
                  <ul
                    className={`flex flex-col gap-3 text-sm ${
                      isRTL ? 'items-end text-right w-full' : ''
                    }`}
                    dir="ltr"
                  >
                    <li
                      className={`block hover:text-blue-400 transition-colors cursor-pointer ${
                        isRTL ? 'text-right w-full' : ''
                      }`}
                    >
                      +968 0000 0000
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-bold mb-6 text-white">{t('about.quickLinks')}</h4>
              <div className="space-y-3">
                <a
                  href="/"
                  className="block text-gray-400 hover:text-blue-400 transition-colors text-sm"
                >
                  {t('nav.home')}
                </a>
                <a
                  href="/features"
                  className="block text-gray-400 hover:text-blue-400 transition-colors text-sm"
                >
                  {t('nav.features')}
                </a>
                <a
                  href="/pricing"
                  className="block text-gray-400 hover:text-blue-400 transition-colors text-sm"
                >
                  {t('nav.pricing')}
                </a>
                <a
                  href="/contact"
                  className="block text-gray-400 hover:text-blue-400 transition-colors text-sm"
                >
                  {t('nav.contact')}
                </a>
              </div>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="border-t border-blue-500/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">{t('about.allRightsReserved')}</p>
            <div className={`flex gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => openModal('privacy')}
                className="text-gray-500 hover:text-blue-400 text-sm transition-colors"
              >
                {t('about.privacyPolicy')}
              </button>
              <button
                onClick={() => openModal('terms')}
                className="text-gray-500 hover:text-blue-400 text-sm transition-colors"
              >
                {t('about.termsOfService')}
              </button>
              <button
                onClick={() => openModal('cookies')}
                className="text-gray-500 hover:text-blue-400 text-sm transition-colors"
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
              className="relative bg-gray-900 border border-blue-500/30 rounded-2xl shadow-2xl shadow-blue-500/20 max-w-2xl w-full max-h-[80vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-blue-500/20">
                <h2 className="text-xl font-bold text-white">
                  {activeModal === 'privacy' && t('about.privacyPolicy')}
                  {activeModal === 'terms' && t('about.termsOfService')}
                  {activeModal === 'cookies' && t('about.cookiePolicy')}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
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

// Value Card Component with enhanced animations
const ValueCard = ({ icon, title, description, gradient, index, isHovered, onHover, onLeave }) => {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -10, scale: 1.02 }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="group relative bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-8 transition-all duration-300 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/20 overflow-hidden"
    >
      {/* Animated glow effect on hover */}
      <motion.div
        animate={{
          opacity: isHovered ? 1 : 0,
          scale: isHovered ? 1 : 0.8,
        }}
        transition={{ duration: 0.3 }}
        className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 blur-xl`}
      />

      <div className="relative z-10">
        <motion.div
          animate={{
            scale: isHovered ? 1.1 : 1,
            rotate: isHovered ? 5 : 0,
          }}
          transition={{ duration: 0.3 }}
          className={`w-16 h-16 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}
        >
          <AboutIcon type={icon} />
        </motion.div>

        <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-blue-400 transition-colors">
          {t(`about.${title}`)}
        </h3>
        <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
          {t(`about.${description}`)}
        </p>
      </div>

      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </motion.div>
  );
};

// Team Member Card Component with enhanced animations
const TeamMemberCard = ({ name, position, imgSrc, index, linkedinUrl }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -10, scale: 1.02 }}
      className="group relative bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl overflow-hidden transition-all duration-300 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/20"
    >
      <div className="relative h-full overflow-hidden">
        <motion.img
          src={imgSrc}
          alt={`${position} portrait`}
          className="w-full h-full object-cover"
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.4 }}
          onError={e => {
            e.target.onerror = null;
            e.target.src = 'https://via.placeholder.com/400x400?text=Photo';
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>

        {/* LinkedIn icon at top right */}
        {linkedinUrl && (
          <motion.a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-4 right-4 z-20 w-10 h-10 bg-blue-600/80 hover:bg-blue-600 backdrop-blur-sm border border-blue-400/30 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </motion.a>
        )}

        {/* Text overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
            {name}
          </h3>
          <p className="text-blue-400 font-semibold">{position}</p>
        </div>
      </div>
    </motion.div>
  );
};

// Policy Components
const PrivacyPolicy = () => {
  const { t } = useLanguage();
  return (
    <div className="prose prose-sm max-w-none prose-invert">
      <p className="text-gray-400 mb-4">{t('about.lastUpdated')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('about.informationWeCollect')}</h3>
      <p className="text-gray-400 mb-4">{t('about.informationWeCollectDesc')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('about.howWeUseInformation')}</h3>
      <p className="text-gray-400 mb-4">{t('about.howWeUseInformationDesc')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('about.informationSharing')}</h3>
      <p className="text-gray-400 mb-4">{t('about.informationSharingDesc')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('about.dataSecurity')}</h3>
      <p className="text-gray-400 mb-4">{t('about.dataSecurityDesc')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('about.contactUs')}</h3>
      <p className="text-gray-400">{t('about.contactUsPolicy')}</p>
    </div>
  );
};

const TermsOfService = () => {
  const { t } = useLanguage();
  return (
    <div className="prose prose-sm max-w-none prose-invert">
      <p className="text-gray-400 mb-4">{t('about.lastUpdated')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('about.acceptanceOfTerms')}</h3>
      <p className="text-gray-400 mb-4">{t('about.acceptanceOfTermsDesc')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('about.useLicense')}</h3>
      <p className="text-gray-400 mb-4">{t('about.useLicenseDesc')}</p>
      <ul className="list-disc list-inside text-gray-400 mb-4 space-y-1">
        <li>{t('about.modifyMaterials')}</li>
        <li>{t('about.commercialUse')}</li>
        <li>{t('about.reverseEngineer')}</li>
        <li>{t('about.removeCopyright')}</li>
      </ul>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('about.serviceAvailability')}</h3>
      <p className="text-gray-400 mb-4">{t('about.serviceAvailabilityDesc')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('about.limitationOfLiability')}</h3>
      <p className="text-gray-400 mb-4">{t('about.limitationOfLiabilityDesc')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('about.contactInformation')}</h3>
      <p className="text-gray-400">{t('about.contactInformationDesc')}</p>
    </div>
  );
};

const CookiePolicy = () => {
  const { t } = useLanguage();
  return (
    <div className="prose prose-sm max-w-none prose-invert">
      <p className="text-gray-400 mb-4">{t('about.lastUpdated')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('about.whatAreCookies')}</h3>
      <p className="text-gray-400 mb-4">{t('about.whatAreCookiesDesc')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('about.typesOfCookies')}</h3>
      <div className="space-y-3 mb-4">
        <div>
          <h4 className="font-medium text-white">{t('about.essentialCookies')}</h4>
          <p className="text-gray-400 text-sm">{t('about.essentialCookiesDesc')}</p>
        </div>
        <div>
          <h4 className="font-medium text-white">{t('about.analyticsCookies')}</h4>
          <p className="text-gray-400 text-sm">{t('about.analyticsCookiesDesc')}</p>
        </div>
        <div>
          <h4 className="font-medium text-white">{t('about.functionalCookies')}</h4>
          <p className="text-gray-400 text-sm">{t('about.functionalCookiesDesc')}</p>
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('about.managingCookies')}</h3>
      <p className="text-gray-400 mb-4">{t('about.managingCookiesDesc')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('about.thirdPartyCookies')}</h3>
      <p className="text-gray-400 mb-4">{t('about.thirdPartyCookiesDesc')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('about.contactUs')}</h3>
      <p className="text-gray-400">{t('about.contactUsCookies')}</p>
    </div>
  );
};

// Icon components for About page
const AboutIcon = ({ type }) => {
  const icons = {
    lightbulb: (
      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    handshake: (
      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    shield: (
      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    leaf: (
      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };
  return icons[type] || null;
};

// Core Values Data with gradients
const coreValues = [
  {
    icon: 'lightbulb',
    title: 'innovation',
    description: 'innovationDesc',
    gradient: 'from-yellow-500 to-orange-600',
  },
  {
    icon: 'handshake',
    title: 'customerSuccess',
    description: 'customerSuccessDesc',
    gradient: 'from-blue-500 to-cyan-600',
  },
  {
    icon: 'shield',
    title: 'trustSecurity',
    description: 'trustSecurityDesc',
    gradient: 'from-green-500 to-emerald-600',
  },
  {
    icon: 'leaf',
    title: 'sustainability',
    description: 'sustainabilityDesc',
    gradient: 'from-purple-500 to-pink-600',
  },
];

export default AboutPage;


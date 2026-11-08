import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import SEOHead from '../components/SEO/SEOHead';
import { serviceSchema } from '../components/SEO/structuredData';
import footer1 from '../assets/footer1.webp';

const FeaturesPage = () => {
  const [activeModal, setActiveModal] = useState(null);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const { t, isRTL } = useLanguage();

  // Email signup state
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState({
    submitted: false,
    success: false,
    loading: false,
    message: '',
  });

  const openModal = modalType => {
    setActiveModal(modalType);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  // Handle email signup submission (no email sent, just success message)
  const handleEmailSubmit = async e => {
    e.preventDefault();

    setEmailStatus({
      submitted: false,
      success: false,
      loading: true,
      message: t('features.signingUp'),
    });

    try {
      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        setEmailStatus({
          submitted: true,
          success: false,
          loading: false,
          message: 'Please enter a valid email address',
        });
        return;
      }

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Show success message
      setEmailStatus({
        submitted: true,
        success: true,
        loading: false,
        message: t('features.thanksForSigning'),
      });

      setEmail('');
    } catch (error) {
      setEmailStatus({
        submitted: true,
        success: false,
        loading: false,
        message: t('features.errorTryAgain'),
      });
    }
  };

  const featuresStructuredData = [serviceSchema];

  return (
    <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 min-h-screen">
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
                {t('features.powerfulFeatures')}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 bg-gradient-to-r from-gray-200 via-blue-100 to-gray-200 bg-clip-text text-transparent"
            >
              {t('features.title')}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              {t('features.subtitle')}
            </motion.p>

            {/* Key Highlights - Simple & Honest */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-500/10 to-blue-600/10 backdrop-blur-sm border border-blue-500/30 rounded-full px-6 py-3 shadow-lg shadow-blue-500/10"
              >
                <svg
                  className="w-5 h-5 text-blue-400"
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
                <span className="text-white font-semibold text-sm">{t('features.cloudBased')}</span>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 backdrop-blur-sm border border-emerald-500/30 rounded-full px-6 py-3 shadow-lg shadow-emerald-500/10"
              >
                <svg
                  className="w-5 h-5 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <span className="text-white font-semibold text-sm">
                  {t('features.realtimeUpdates')}
                </span>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-500/10 to-purple-600/10 backdrop-blur-sm border border-purple-500/30 rounded-full px-6 py-3 shadow-lg shadow-purple-500/10"
              >
                <svg
                  className="w-5 h-5 text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span className="text-white font-semibold text-sm">
                  {t('features.secureEncrypted')}
                </span>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-pink-500/10 to-pink-600/10 backdrop-blur-sm border border-pink-500/30 rounded-full px-6 py-3 shadow-lg shadow-pink-500/10"
              >
                <svg
                  className="w-5 h-5 text-pink-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <span className="text-white font-semibold text-sm">
                  {t('features.support247Badge')}
                </span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Core Features Section - Enhanced */}
      <div className="relative py-32 px-4 overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900/50 to-black"></div>
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-purple-500/10 rounded-full filter blur-3xl"></div>

        <div className="container mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-block mb-6 px-6 py-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-full"
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 text-sm font-bold tracking-wider uppercase">
                {t('features.completeSolution')}
              </span>
            </motion.div>

            <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
              {t('pricing.coreFeatures')}
            </h2>
            <p className="text-gray-400 text-xl max-w-3xl mx-auto leading-relaxed">
              {t('pricing.coreFeaturesSub')}
            </p>
          </motion.div>

          {/* White text for SEO */}
          <div className="text-white opacity-0 h-0 overflow-hidden" style={{ userSelect: 'none' }}>
            Rentyl's features empower car rental businesses with fleet management, automated
            maintenance, customer management, and analytics. Track vehicles, monitor usage, and get
            real-time alerts for maintenance. Our cloud-based solution is secure and accessible
            anywhere. The booking system is intuitive, and financial tools help manage revenue and
            expenses. Experience the power of Rentyl's features and take your business to the next
            level.
          </div>

          {/* Enhanced Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {featureCards.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                onMouseEnter={() => setHoveredFeature(index)}
                onMouseLeave={() => setHoveredFeature(null)}
                className="group relative"
              >
                {/* Glow effect on hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} rounded-3xl opacity-0 group-hover:opacity-20 blur-2xl transition-all duration-500`}
                ></div>

                {/* Card */}
                <div className="relative h-full bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-black/90 backdrop-blur-sm border border-gray-700/50 rounded-3xl p-8 transition-all duration-500 group-hover:border-blue-400/50 group-hover:-translate-y-2 overflow-hidden">
                  {/* Decorative corner */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                  {/* Icon container */}
                  <div className="relative mb-6">
                    <div
                      className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500`}
                    ></div>
                    <motion.div
                      animate={{
                        scale: hoveredFeature === index ? 1.1 : 1,
                        rotate: hoveredFeature === index ? 8 : 0,
                      }}
                      transition={{ duration: 0.3 }}
                      className={`relative w-20 h-20 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center shadow-2xl`}
                    >
                      <FeatureIcon type={feature.icon} />
                    </motion.div>
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 transition-all duration-300">
                    {t(`features.${feature.title}`)}
                  </h3>
                  <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                    {t(`features.${feature.description}`)}
                  </p>

                  {/* Animated bottom accent */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Dashboard Preview */}
      <div className="relative py-24 px-4 bg-black/30">
        <div className="container mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:w-1/2"
            >
              <div className="inline-block mb-6 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full">
                <span className="text-purple-400 text-sm font-bold tracking-wide">
                  {t('features.analyticsTitle')}
                </span>
              </div>

              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
                {t('features.advancedAnalyticsDashboard')}
              </h2>
              <p className="text-gray-400 mb-8 text-lg leading-relaxed">
                {t('features.advancedAnalyticsDashboardDesc')}
              </p>

              <div className="space-y-4">
                {analyticsFeatures.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex items-center gap-4 bg-gray-800/30 backdrop-blur-sm border border-blue-500/20 rounded-xl p-4 hover:border-blue-500/40 transition-all duration-300"
                  >
                    <div className="w-10 h-10 bg-blue-500/20 border border-blue-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-blue-400"
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
                    <span className="text-gray-300 font-medium">{t(`features.${feature}`)}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right Dashboard Preview */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:w-1/2"
            >
              <div className="relative bg-gradient-to-br from-gray-900/60 to-black/60 backdrop-blur-2xl border border-blue-500/40 rounded-3xl p-8 shadow-2xl shadow-blue-500/30 overflow-hidden">
                {/* Glow effects */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-white font-bold text-xl mb-1">
                      {t('features.businessOverview')}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {t('features.realtimePerformanceMetrics')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-green-500/20 border border-green-400/30 rounded-full px-3 py-1">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    <span className="text-green-400 text-xs font-bold">{t('features.live')}</span>
                  </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4"
                  >
                    <div className="text-sm text-blue-400 mb-2">{t('features.revenue')}</div>
                    <div className="text-2xl font-bold text-white">$42.5k</div>
                    <div className="text-xs text-green-400 font-medium mt-1">+18%</div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4"
                  >
                    <div className="text-sm text-emerald-400 mb-2">{t('features.utilization')}</div>
                    <div className="text-2xl font-bold text-white">84%</div>
                    <div className="text-xs text-green-400 font-medium mt-1">+8%</div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4"
                  >
                    <div className="text-sm text-purple-400 mb-2">{t('features.clients')}</div>
                    <div className="text-2xl font-bold text-white">143</div>
                    <div className="text-xs text-purple-400 font-medium mt-1">+12</div>
                  </motion.div>
                </div>

                {/* Enhanced Performance Metrics */}
                <div className="bg-black/40 rounded-2xl p-6 border border-blue-500/20">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-white font-semibold">{t('features.weeklyRevenue')}</h4>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400">{t('features.last7Days')}</span>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    </div>
                  </div>

                  {/* Modern line chart visualization */}
                  <div className="relative h-40">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-px bg-blue-500/10"></div>
                      ))}
                    </div>

                    {/* Chart line */}
                    <svg
                      className="absolute inset-0 w-full h-full"
                      viewBox="0 0 700 160"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>

                      {/* Area fill */}
                      <motion.path
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1 }}
                        d="M0,96 L100,90 L200,60 L300,72 L400,48 L500,84 L600,66 L700,54 L700,160 L0,160 Z"
                        fill="url(#chartGradient)"
                      />

                      {/* Line stroke */}
                      <motion.path
                        initial={{ pathLength: 0 }}
                        whileInView={{ pathLength: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                        d="M0,96 L100,90 L200,60 L300,72 L400,48 L500,84 L600,66 L700,54"
                        fill="none"
                        stroke="rgb(59, 130, 246)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Data points */}
                      {[
                        { x: 0, y: 96 },
                        { x: 100, y: 90 },
                        { x: 200, y: 60 },
                        { x: 300, y: 72 },
                        { x: 400, y: 48 },
                        { x: 500, y: 84 },
                        { x: 600, y: 66 },
                        { x: 700, y: 54 },
                      ].map((point, i) => (
                        <motion.circle
                          key={i}
                          initial={{ scale: 0, opacity: 0 }}
                          whileInView={{ scale: 1, opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: 0.2 + i * 0.1 }}
                          cx={point.x}
                          cy={point.y}
                          r="4"
                          fill="rgb(59, 130, 246)"
                          className="cursor-pointer hover:r-6 transition-all"
                        />
                      ))}
                    </svg>
                  </div>

                  {/* X-axis labels */}
                  <div className="flex justify-between mt-3 text-xs text-gray-500">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                      <span key={i}>{day}</span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Mobile App Section */}
      <div className="relative py-24 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span className="text-blue-400 font-bold">{t('features.comingSoon')}</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              {t('features.mobileApps')}
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              {t('features.mobileDashboardDesc')}
            </p>
          </motion.div>

          <div className="flex flex-col lg:flex-row items-center justify-center gap-12">
            {/* iOS Preview */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              whileHover={{ y: -10 }}
              className="relative"
            >
              <div className="w-72 h-[580px] bg-black rounded-[3rem] p-3 shadow-2xl shadow-blue-500/20 border-4 border-gray-800">
                <div className="w-full h-full bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-[2.5rem] overflow-hidden relative">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-7 bg-black rounded-b-3xl z-10"></div>

                  <div className="h-full flex items-center justify-center px-8 pt-12">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-8 mx-auto shadow-xl">
                        <svg
                          className="w-12 h-12 text-black"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.71.85-1.85 1.66-2.95 1.57-.13-1.15.4-2.35 1.05-3.26z" />
                        </svg>
                      </div>
                      <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-3">
                        Q2 2026
                      </div>
                      <div className="text-blue-300 text-sm">{t('features.expectedLaunch')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Android Preview */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              whileHover={{ y: -10 }}
              className="relative"
            >
              <div className="w-72 h-[580px] bg-gray-900 rounded-[2rem] p-3 shadow-2xl shadow-emerald-500/20 border-4 border-gray-800">
                <div className="w-full h-full bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-[1.5rem] overflow-hidden relative">
                  {/* Camera */}
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-black rounded-full z-10"></div>

                  <div className="h-full flex items-center justify-center px-8 pt-12">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-8 mx-auto shadow-xl">
                        <svg
                          className="w-12 h-12 text-emerald-500"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3435-4.1021-2.6892-7.5743-6.1185-9.4396" />
                        </svg>
                      </div>
                      <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 mb-3">
                        Q2 2026
                      </div>
                      <div className="text-emerald-300 text-sm">{t('features.expectedLaunch')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Email Signup Card */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:max-w-md w-full"
            >
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-8 shadow-2xl shadow-blue-500/30 border border-blue-400/30">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold mb-4">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                    </svg>
                    <span className="text-white">{t('features.earlyAccess')}</span>
                  </div>
                  <h3 className="text-3xl font-bold mb-4 text-white">
                    {t('features.beFirstToKnow')}
                  </h3>
                  <p className="text-blue-100 leading-relaxed">{t('features.joinThousands')}</p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <ul className="space-y-2 text-sm text-white">
                      <li className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-green-300"
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
                        {t('features.dayFreeTrial')}
                      </li>
                      <li className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-green-300"
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
                        {t('features.prioritySupport')}
                      </li>
                      <li className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-green-300"
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
                        {t('features.betaTesting')}
                      </li>
                      <li className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-green-300"
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
                        {t('features.specialPricing')}
                      </li>
                    </ul>
                  </div>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
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
                    className={`w-full px-5 py-4 bg-white/20 backdrop-blur-sm border rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                      emailStatus.submitted && !emailStatus.success && !emailStatus.loading
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-white/30 focus:ring-white/50'
                    }`}
                    disabled={emailStatus.loading}
                    required
                  />

                  {emailStatus.submitted && !emailStatus.success && !emailStatus.loading && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-red-200 bg-red-500/20 rounded-lg px-3 py-2"
                    >
                      {emailStatus.message}
                    </motion.p>
                  )}

                  {emailStatus.submitted && emailStatus.success && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2 bg-green-500/20 text-green-200 rounded-lg px-4 py-3"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="font-semibold">{emailStatus.message}</span>
                    </motion.div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full bg-white text-blue-600 px-6 py-4 rounded-xl font-bold hover:bg-blue-50 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={emailStatus.loading}
                  >
                    {emailStatus.loading ? t('features.signingUp') : t('features.getEarlyAccess')}
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </div>
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
                className="h-16 w-auto object-contain mb-6 brightness-150"
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
                  href="/pricing"
                  className="block text-gray-400 hover:text-blue-400 transition-colors text-sm"
                >
                  {t('nav.pricing')}
                </a>
                <a
                  href="/about"
                  className="block text-gray-400 hover:text-blue-400 transition-colors text-sm"
                >
                  {t('nav.about')}
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

// Feature Card Component with enhanced animations
const FeatureCard = ({
  title,
  description,
  icon,
  gradient,
  index,
  isHovered,
  onHover,
  onLeave,
}) => {
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
          <FeatureIcon type={icon} />
        </motion.div>

        <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-blue-400 transition-colors">
          {t(`features.${title}`)}
        </h3>
        <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
          {t(`features.${description}`)}
        </p>
      </div>

      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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
      <p className="text-gray-400">{t('about.contactUsPrivacy')}</p>
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

// Icon components
const FeatureIcon = ({ type }) => {
  const icons = {
    car: (
      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0h.01M15 17a2 2 0 104 0m-4 0h.01M17 16h.01" />
      </svg>
    ),
    cloud: (
      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
    money: (
      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    users: (
      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    wrench: (
      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    chat: (
      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  };
  return icons[type] || null;
};

// Features Data with gradients
const featureCards = [
  {
    title: 'comprehensiveFleetManagement',
    description: 'comprehensiveFleetManagementDesc',
    icon: 'car',
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    title: 'cloudBasedServices',
    description: 'cloudBasedServicesDesc',
    icon: 'cloud',
    gradient: 'from-cyan-500 to-blue-600',
  },
  {
    title: 'financialTracking',
    description: 'financialTrackingDesc',
    icon: 'money',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    title: 'customerManagement',
    description: 'customerManagementDesc',
    icon: 'users',
    gradient: 'from-purple-500 to-pink-600',
  },
  {
    title: 'maintenanceScheduling',
    description: 'maintenanceSchedulingDesc',
    icon: 'wrench',
    gradient: 'from-orange-500 to-red-600',
  },
  {
    title: 'support247',
    description: 'support247Desc',
    icon: 'chat',
    gradient: 'from-indigo-500 to-purple-600',
  },
];

// Analytics Features
const analyticsFeatures = [
  'realtimeRevenueTracking',
  'fleetUtilizationMetrics',
  'customerBehaviorAnalysis',
  'maintenanceCostTracking',
  'customKPIDashboards',
  'exportableReports',
  'profitMarginAnalysis',
  'seasonalTrendIdentification',
];

export default FeaturesPage;


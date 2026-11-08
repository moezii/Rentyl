import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import SEOHead from '../components/SEO/SEOHead';
import footer1 from '../assets/footer1.webp';

const PricingPage = () => {
  const { t, isRTL } = useLanguage();
  const [fleetSize, setFleetSize] = useState(30);
  const [activeModal, setActiveModal] = useState(null);

  const openModal = modalType => {
    setActiveModal(modalType);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  // Calculate price based on fleet size (4 OMR per 5 cars = 0.8 OMR per car)
  const calculatePrice = cars => {
    return (cars / 5) * 4;
  };

  const monthlyPrice = calculatePrice(fleetSize);

  return (
    <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 min-h-screen">
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, rgb(168, 85, 247), rgb(236, 72, 153));
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.5);
          transition: all 0.2s ease;
        }

        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 6px 16px rgba(168, 85, 247, 0.7);
        }

        input[type="range"]::-moz-range-thumb {
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, rgb(168, 85, 247), rgb(236, 72, 153));
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.5);
          transition: all 0.2s ease;
        }

        input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 6px 16px rgba(168, 85, 247, 0.7);
        }
      `}</style>

      <SEOHead
        title="Pricing - Rentyl Fleet Management"
        description="Simple, transparent pricing for car rental management. Choose the plan that fits your fleet size."
        keywords="car rental pricing, fleet management pricing, rental software cost"
        canonical="https://rentyl.app/pricing"
        hreflang={[
          { lang: 'en', href: 'https://rentyl.app/pricing' },
          { lang: 'ar', href: 'https://rentyl.app/ar/pricing' },
        ]}
      />

      {/* Visually hidden h1 for SEO */}
      <h1 className="sr-only">{t('pricing.title')}</h1>

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
      <div className="relative pt-32 pb-8 px-4 overflow-hidden">
        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-block mb-6 px-6 py-3 bg-blue-500/10 border border-blue-500/30 rounded-full"
            >
              <span className="text-blue-400 text-sm font-bold tracking-wide">
                {t('pricing.simpleTransparent')}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 bg-gradient-to-r from-gray-200 via-blue-100 to-gray-200 bg-clip-text text-transparent"
            >
              {t('pricing.title')}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              {t('pricing.subtitle')}
            </motion.p>
          </div>
        </div>
      </div>

      {/* Pricing Card */}
      <div className="relative py-8 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto"
          >
            {/* Card */}
            <div
              className={`relative bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-sm border border-purple-500/50 shadow-2xl shadow-purple-500/20 rounded-3xl p-8 md:p-12 ${
                isRTL ? 'text-right' : ''
              }`}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {/* Plan Name */}
              <div className="mb-8 text-center">
                <h3 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                  {t('pricing.fleetManagementPlan')}
                </h3>
                <p className="text-gray-400 text-sm">{t('pricing.scaleFleet')}</p>
              </div>

              {/* Fleet Size Slider */}
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <label
                    className={`text-gray-300 font-medium ${
                      isRTL ? 'order-2 text-right' : ''
                    }`}
                  >
                    {t('pricing.fleetSize')}:
                  </label>
                  <div
                    className={`inline-flex items-center gap-2 ${
                      isRTL ? 'order-1 mr-auto text-left' : 'ml-auto text-right'
                    }`}
                  >
                    {isRTL ? (
                      <>
                        <span className="text-4xl font-bold text-white">{fleetSize}</span>
                        <span className="text-gray-400">{t('pricing.car')}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-white">{fleetSize}</span>
                        <span className="text-gray-400">{t('pricing.cars')}</span>
                      </>
                    )}
                  </div>
                </div>

                <input
                  type="range"
                  min="1"
                  max="120"
                  value={fleetSize}
                  onChange={e => setFleetSize(parseInt(e.target.value))}
                  className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: isRTL
                      ? `linear-gradient(to left, rgb(168, 85, 247) 0%, rgb(236, 72, 153) ${(fleetSize / 120) * 100}%, rgb(55, 65, 81) ${(fleetSize / 120) * 100}%, rgb(55, 65, 81) 100%)`
                      : `linear-gradient(to right, rgb(168, 85, 247) 0%, rgb(236, 72, 153) ${(fleetSize / 120) * 100}%, rgb(55, 65, 81) ${(fleetSize / 120) * 100}%, rgb(55, 65, 81) 100%)`,
                  }}
                />

                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span className={isRTL ? 'order-2 text-right' : ''}>
                    1 {isRTL ? t('pricing.car') : t('pricing.car')}
                  </span>
                  <span className={isRTL ? 'order-1 text-left' : ''}>
                    120 {isRTL ? t('pricing.car') : t('pricing.cars')}
                  </span>
                </div>
              </div>

              {/* Price */}
              <div className="mb-10 text-center">
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-6xl font-bold text-white">{monthlyPrice}</span>
                  <span className="text-gray-400 text-xl">{t('pricing.omr')}</span>
                </div>
                <p className="text-gray-500 text-lg">{t('pricing.perMonth')}</p>
                <p className="text-purple-400 text-sm mt-2 font-medium">
                  {t('pricing.pricePer5Cars')}
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-10">
                {[
                  'cloudBased',
                  'digitalContracts',
                  'fleetManagement',
                  'maintenanceScheduling',
                  'financialReports',
                  'analytics',
                  'marketplaceListing',
                  'support247',
                ].map((feature, idx) => (
                  <li
                    key={idx}
                    className={`flex items-center gap-3 ${
                      isRTL ? 'flex-row-reverse justify-end' : ''
                    }`}
                  >
                    <svg
                      className={`w-5 h-5 text-green-400 flex-shrink-0 ${
                        isRTL ? 'order-2' : ''
                      }`}
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
                    <span className={`text-gray-300 ${isRTL ? 'order-1' : ''}`}>
                      {t(`pricing.${feature}`)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <motion.a
                href="/contact"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="block w-full py-4 rounded-xl font-bold text-center transition-all duration-300 bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70"
              >
                {t('pricing.getStarted')}
              </motion.a>
            </div>
          </motion.div>

          {/* Enterprise Custom Plan */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="max-w-4xl mx-auto mt-14"
          >
            <div className="bg-gradient-to-r from-gray-900/50 to-black/50 backdrop-blur-sm border border-yellow-500/30 rounded-2xl p-12 text-center">
              <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                {t('pricing.corporate')}
              </h3>
              <p className="text-gray-300 text-lg mb-2">
                {t('pricing.fleetSize')}:{' '}
                <span className="text-white font-semibold">121+ {t('pricing.cars')}</span>
              </p>
              <p className="text-gray-400 mb-6 max-w-2xl mx-auto leading-relaxed">
                {t('pricing.enterpriseSolution')}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-w-2xl mx-auto">
                <div className="bg-gray-900/30 border border-yellow-500/20 rounded-xl p-4">
                  <div className="text-yellow-400 font-semibold mb-1">
                    {t('pricing.unlimitedVehicles')}
                  </div>
                  <div className="text-gray-400 text-sm">{t('pricing.noLimits')}</div>
                </div>
                <div className="bg-gray-900/30 border border-yellow-500/20 rounded-xl p-4">
                  <div className="text-yellow-400 font-semibold mb-1">
                    {t('pricing.flexiblePricing')}
                  </div>
                  <div className="text-gray-400 text-sm">{t('pricing.contactForQuote')}</div>
                </div>
              </div>

              <motion.a
                href="/contact"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-block bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 transition-all duration-300"
              >
                {t('pricing.contactSales')}
              </motion.a>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Included Features Section */}
      <div className="relative py-24 px-4 bg-black/30">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              {t('pricing.includedFeatures')}
            </h2>
            <p className="text-gray-400 text-xl max-w-3xl mx-auto">
              {t('pricing.includedFeaturesDesc')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { key: 'cloudBasedManagement' },
              { key: 'digitalContractsFeature' },
              { key: 'vehicleFleetManagement' },
              { key: 'maintenanceHistory' },
              { key: 'financialReportsFeature' },
              { key: 'performanceDashboard' },
              { key: 'publicListing' },
              { key: 'secureCloudHosting' },
            ].map((feature, index) => (
              <motion.div
                key={feature.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="bg-gray-800/30 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6 hover:border-blue-500/40 transition-all duration-300"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h4 className="text-white font-semibold text-lg mb-2">
                  {t(`pricing.${feature.key}`)}
                </h4>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="relative py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-8 w-full ${
              isRTL ? 'text-right' : 'mx-auto'
            }`}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <h3
              className={`text-2xl font-bold text-white mb-6 ${isRTL ? 'text-right' : ''}`}
              style={isRTL ? { textAlign: 'right' } : undefined}
            >
              {t('pricing.notesTitle')}
            </h3>
            <ul
              className={`space-y-4 text-gray-300 ${isRTL ? 'text-right' : ''}`}
              style={
                isRTL
                  ? {
                      textAlign: 'right',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      width: '100%',
                    }
                  : undefined
              }
            >
              {['note1', 'note2', 'note3', 'note4'].map(note => (
                <li
                  key={note}
                  className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}
                  style={isRTL ? { textAlign: 'right', width: '100%' } : undefined}
                >
                  <p
                    className={isRTL ? 'text-right w-full m-0' : 'm-0'}
                    style={isRTL ? { textAlign: 'right', width: '100%' } : undefined}
                  >
                    {t(`pricing.${note}`)}
                  </p>
                </li>
              ))}
            </ul>
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
                <p className="text-gray-400">{t('about.policyPlaceholder')}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PricingPage;


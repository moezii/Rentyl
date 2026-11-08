import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import SEOHead from '../../components/SEO/SEOHead';
import footer1 from '../../assets/footer1.webp';

const MobilePricingPage = () => {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
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
          width: 20px;
          height: 20px;
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
              {t('pricing.simpleTransparent')}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold mb-4 bg-gradient-to-r from-gray-200 via-blue-100 to-gray-200 bg-clip-text text-transparent"
          >
            {t('pricing.title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-base text-gray-300"
          >
            {t('pricing.subtitle')}
          </motion.p>
        </div>
      </div>

      {/* Mobile Pricing Card */}
      <div className="py-6 px-4">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className={`bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-sm border border-purple-500/50 shadow-2xl shadow-purple-500/20 rounded-2xl p-6 ${
              isRTL ? 'text-right' : ''
            }`}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {/* Plan Name */}
            <div className="mb-6 text-center">
              <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                {t('pricing.fleetManagementPlan')}
              </h3>
              <p className="text-gray-400 text-xs">{t('pricing.scaleFleet')}</p>
            </div>

            {/* Fleet Size Slider */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <label
                  className={`text-gray-300 font-medium text-sm ${
                    isRTL ? 'order-2 text-right' : ''
                  }`}
                >
                  {t('pricing.fleetSize')}:
                </label>
                <div
                  className={`inline-flex items-center gap-2 text-right ${
                    isRTL ? 'order-1 mr-auto text-left' : 'ml-auto'
                  }`}
                >
                  {isRTL ? (
                    <>
                      <span className="text-3xl font-bold text-white">{fleetSize}</span>
                      <span className="text-gray-400 text-sm">{t('pricing.car')}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-white">{fleetSize}</span>
                      <span className="text-gray-400 text-sm">{t('pricing.cars')}</span>
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
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: isRTL
                    ? `linear-gradient(to left, rgb(168, 85, 247) 0%, rgb(236, 72, 153) ${(fleetSize / 120) * 100}%, rgb(55, 65, 81) ${(fleetSize / 120) * 100}%, rgb(55, 65, 81) 100%)`
                    : `linear-gradient(to right, rgb(168, 85, 247) 0%, rgb(236, 72, 153) ${(fleetSize / 120) * 100}%, rgb(55, 65, 81) ${(fleetSize / 120) * 100}%, rgb(55, 65, 81) 100%)`,
                }}
              />

              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span className={isRTL ? 'order-2 text-right' : ''}>
                  1 {t('pricing.car')}
                </span>
                <span className={isRTL ? 'order-1 text-left' : ''}>
                  120 {isRTL ? t('pricing.car') : t('pricing.cars')}
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="mb-8 text-center">
              <div className="flex items-baseline justify-center gap-2 mb-2">
                <span className="text-5xl font-bold text-white">{monthlyPrice}</span>
                <span className="text-gray-400 text-lg">{t('pricing.omr')}</span>
              </div>
              <p className="text-gray-500 text-base">{t('pricing.perMonth')}</p>
              <p className="text-purple-400 text-xs mt-2 font-medium">
                {t('pricing.pricePer5Cars')}
              </p>
            </div>

            {/* Features */}
            <div
              className={`space-y-3 mb-8 ${isRTL ? 'text-right' : ''}`}
              dir={isRTL ? 'rtl' : 'ltr'}
              style={isRTL ? { textAlign: 'right' } : undefined}
            >
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
                <div
                  key={idx}
                  className="flex items-center gap-3"
                  style={
                    isRTL
                      ? {
                          flexDirection: 'row-reverse',
                          justifyContent: 'flex-end',
                          textAlign: 'right',
                          width: '100%',
                        }
                      : undefined
                  }
                >
                  <svg
                    className="w-4 h-4 text-green-400 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    style={isRTL ? { order: 2 } : undefined}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span
                    className={`text-gray-300 text-sm ${isRTL ? 'text-right w-full' : ''}`}
                    style={isRTL ? { textAlign: 'right', width: '100%', order: 1 } : undefined}
                  >
                    {t(`pricing.${feature}`)}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <motion.a
              href="/contact"
              whileTap={{ scale: 0.95 }}
              className="block w-full py-4 rounded-xl font-bold text-center transition-all duration-300 bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50"
            >
              {t('pricing.getStarted')}
            </motion.a>
          </motion.div>

          {/* Enterprise Custom Plan */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6"
          >
            <div className="bg-gradient-to-r from-gray-900/50 to-black/50 backdrop-blur-sm border border-yellow-500/30 rounded-2xl p-6 text-center">
              <h3 className="text-xl font-bold mb-3 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                {t('pricing.corporate')}
              </h3>
              <p className="text-gray-300 text-sm mb-2">
                {t('pricing.fleetSize')}:{' '}
                <span className="text-white font-semibold">121+ {t('pricing.cars')}</span>
              </p>
              <p className="text-gray-400 text-xs mb-4">{t('pricing.enterpriseSolution')}</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-900/30 border border-yellow-500/20 rounded-xl p-3">
                  <div className="text-yellow-400 font-semibold text-sm mb-1">
                    {t('pricing.unlimitedVehicles')}
                  </div>
                  <div className="text-gray-400 text-xs">{t('pricing.noLimits')}</div>
                </div>
                <div className="bg-gray-900/30 border border-yellow-500/20 rounded-xl p-3">
                  <div className="text-yellow-400 font-semibold text-sm mb-1">
                    {t('pricing.flexiblePricing')}
                  </div>
                  <div className="text-gray-400 text-xs">{t('pricing.contactForQuote')}</div>
                </div>
              </div>

              <motion.a
                href="/contact"
                whileTap={{ scale: 0.95 }}
                className="inline-block bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-yellow-500/30 text-sm"
              >
                {t('pricing.contactSales')}
              </motion.a>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Mobile Included Features Section */}
      <div className="py-10 px-4 bg-black/30">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-3 text-white">{t('pricing.includedFeatures')}</h2>
            <p className="text-gray-400 text-sm">{t('pricing.includedFeaturesDesc')}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="bg-gray-800/30 backdrop-blur-sm border border-blue-500/20 rounded-xl p-4"
              >
                <h4 className="text-white font-semibold text-sm">{t(`pricing.${feature.key}`)}</h4>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Notes Section */}
      <div className="py-10 px-4">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className={`bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-5 ${
              isRTL ? 'text-right' : ''
            }`}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <h3
              className={`text-xl font-bold text-white mb-4 ${isRTL ? 'text-right' : ''}`}
              style={isRTL ? { textAlign: 'right' } : undefined}
            >
              {t('pricing.notesTitle')}
            </h3>
            <ul
              className={`space-y-3 text-gray-300 text-sm ${isRTL ? 'text-right' : ''}`}
              dir={isRTL ? 'rtl' : 'ltr'}
              style={
                isRTL
                  ? { textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }
                  : undefined
              }
            >
              {['note1', 'note2', 'note3', 'note4'].map(note => (
                <li key={note} style={isRTL ? { width: '100%' } : undefined}>
                  <p
                    className={isRTL ? 'text-right m-0' : 'm-0'}
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
      <p className="text-gray-400">{t('about.contactUsPolicy')}</p>
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

export default MobilePricingPage;


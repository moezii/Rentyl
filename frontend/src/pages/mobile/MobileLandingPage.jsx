import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import LoginModal from '../../components/Auth/LoginModal';
import SEOHead from '../../components/SEO/SEOHead';
import { organizationSchema, softwareApplicationSchema } from '../../components/SEO/structuredData';
import footer1 from '../../assets/footer1.webp';
import camryImg from '../../assets/camryJPG.jpg';
import civicImg from '../../assets/civic.jpg';

const MobileLandingPage = ({ initialShowLogin = false }) => {
  const { t, isRTL } = useLanguage();
  const [showLoginModal, setShowLoginModal] = useState(initialShowLogin);
  const [activeModal, setActiveModal] = useState(null);

  const openModal = modalType => {
    setActiveModal(modalType);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  // SEO structured data combining organization and software schemas
  const combinedStructuredData = [organizationSchema, softwareApplicationSchema];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <SEOHead
        title="Rentyl - Car Rental Management Software"
        description="Transform your car rental business with Rentyl's fleet management software. Track vehicles, manage bookings, and automate maintenance."
        keywords="car rental management, fleet management, vehicle rental software, rental business"
        canonical="https://rentyl.app/"
        structuredData={combinedStructuredData}
        hreflang={[
          { lang: 'en', href: 'https://rentyl.app/' },
          { lang: 'ar', href: 'https://rentyl.app/ar/' },
          { lang: 'ms', href: 'https://rentyl.app/ms/' },
        ]}
      />
      {/* Visually hidden h1 for SEO */}
      <h1 className="sr-only">{t('landing.title')}</h1>

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
              {t('landing.nextGenFleet')}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl font-bold mb-4 leading-tight bg-gradient-to-r from-gray-200 via-blue-100 to-gray-200 bg-clip-text text-transparent"
          >
            {t('landing.title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base text-gray-300 mb-8"
          >
            {t('landing.subtitle')}
          </motion.p>

          <div className="space-y-3">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              onClick={() => (window.location.href = '/contact')}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-blue-500/30"
            >
              {t('landing.getStarted')}
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              onClick={() => (window.location.href = '/features')}
              className="w-full bg-gray-800/50 border border-blue-500/30 text-white font-bold py-4 px-6 rounded-xl"
            >
              {t('features.exploreFeatures')}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Dashboard Preview */}
      <div className="py-10 px-4">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 backdrop-blur-md rounded-3xl overflow-hidden border border-blue-500/30 shadow-2xl shadow-blue-500/20"
          >
            <div className="bg-gray-900/80 h-8 w-full flex justify-center items-center border-b border-blue-500/30">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <div
                className={`flex items-start justify-between gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <div>
                  <div className="text-white font-bold text-lg leading-tight">
                    {t('features.rentylDashboard')}
                  </div>
                  <div className="text-gray-400 text-sm">{t('landing.fleetManagement')}</div>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/40 text-blue-100 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                  {t('landing.liveFleetPulse')}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 shadow-inner shadow-blue-500/10">
                  <div className="text-xs uppercase text-blue-200 tracking-wide">
                    {t('landing.totalCars')}
                  </div>
                  <div className="text-3xl font-bold text-white mt-1">24</div>
                  <div className="text-xs text-blue-300 mt-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                    {t('landing.available')}
                  </div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 shadow-inner shadow-emerald-500/10">
                  <div className="text-xs uppercase text-emerald-200 tracking-wide">
                    {t('features.revenue')}
                  </div>
                  <div className="text-3xl font-bold text-white mt-1">$1.2k</div>
                  <div className="text-xs text-emerald-300 mt-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    {t('features.realtimeUpdates')}
                  </div>
                </div>
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 shadow-inner shadow-indigo-500/10">
                  <div className="text-xs uppercase text-indigo-200 tracking-wide">
                    {t('landing.bookingsToday')}
                  </div>
                  <div className="text-3xl font-bold text-white mt-1">12</div>
                  <div className="text-xs text-indigo-300 mt-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    {t('landing.activeBookings')}
                  </div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 shadow-inner shadow-amber-500/10">
                  <div className="text-xs uppercase text-amber-100 tracking-wide">
                    {t('landing.fleetHealth')}
                  </div>
                  <div className="text-3xl font-bold text-white mt-1">96%</div>
                  <div className="text-xs text-amber-200 mt-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    {t('landing.pendingAlerts')}
                  </div>
                </div>
              </div>

              <div className="bg-black/20 border border-blue-500/20 rounded-2xl p-4 space-y-3 shadow-inner shadow-blue-500/10">
                <div
                  className={`flex items-center justify-between text-sm text-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <div className="font-semibold">{t('features.businessOverview')}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/15 text-blue-100 border border-blue-500/30">
                      {t('landing.uptime') || 'Uptime'}{' '}
                      <span className="font-semibold text-white">99.5%</span>
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="h-2 rounded-full bg-gray-700/60 overflow-hidden">
                      <div className="h-full w-[85%] bg-blue-500 rounded-full"></div>
                    </div>
                    <div className="h-2 rounded-full bg-gray-700/60 overflow-hidden">
                      <div className="h-full w-[68%] bg-emerald-500 rounded-full"></div>
                    </div>
                    <div className="h-2 rounded-full bg-gray-700/60 overflow-hidden">
                      <div className="h-full w-[52%] bg-amber-400 rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex flex-col justify-between text-xs text-gray-400">
                    <span>{t('features.utilization')}</span>
                    <span>{t('features.revenue')}</span>
                    <span>{t('maintenance.title')}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {[
                  {
                    name: 'Toyota Camry',
                    statusLabel: t('landing.active'),
                    statusColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                    badgeBg: 'bg-blue-500/15',
                    subtitle: t('landing.available'),
                    img: camryImg,
                  },
                  {
                    name: 'Honda Civic',
                    statusLabel: t('landing.service'),
                    statusColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                    badgeBg: 'bg-amber-500/15',
                    subtitle: t('landing.inMaintenance'),
                    img: civicImg,
                  },
                ].map((car, idx) => (
                  <div
                    key={car.name}
                    className="flex items-center justify-between p-3 bg-gray-900/60 rounded-xl border border-gray-700/60 shadow-inner shadow-black/20"
                  >
                    <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="w-12 h-10 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 border border-gray-700/70">
                        <img
                          src={car.img}
                          alt={car.name}
                          className="w-full h-full object-cover"
                          onError={e => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                        <div
                          className={`w-full h-full ${car.badgeBg} rounded-lg hidden items-center justify-center`}
                        >
                          <svg
                            className="w-4 h-4 text-white"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" />
                          </svg>
                        </div>
                      </div>
                      <div className={`${isRTL ? 'mr-3 text-right' : 'ml-3'}`}>
                        <div className="text-white font-semibold text-sm">{car.name}</div>
                        <div className="text-gray-400 text-xs">{car.subtitle}</div>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${car.statusColor}`}
                    >
                      {car.statusLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Mobile Features Section */}
      <div className="py-10 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-3 text-white">{t('landing.whyChoose')}</h2>
            <p className="text-gray-400 text-sm">{t('landing.whyChooseSubtitle')}</p>
          </div>

          <div className="space-y-4">
            {/* Mobile Feature Cards */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-blue-500/20 rounded-xl p-5">
              <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2 text-white">{t('features.fleetManagement')}</h3>
              <p className="text-gray-400 text-sm">{t('features.fleetManagementDesc')}</p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm border border-blue-500/20 rounded-xl p-5">
              <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-center mb-3">
                <svg
                  className="w-5 h-5 text-blue-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2 text-white">
                {t('features.maintenanceTracking')}
              </h3>
              <p className="text-gray-400 text-sm">{t('features.maintenanceTrackingDesc')}</p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm border border-blue-500/20 rounded-xl p-5">
              <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-center mb-3">
                <svg
                  className="w-5 h-5 text-blue-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2 text-white">{t('features.usageAnalytics')}</h3>
              <p className="text-gray-400 text-sm">{t('features.usageAnalyticsDesc')}</p>
            </div>
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
            <p className="text-gray-400 text-sm mb-4">{t('landing.subtitle')}</p>
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

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
      </AnimatePresence>
    </div>
  );
};

// Policy Components (dark theme)
const PrivacyPolicy = () => {
  const { t } = useLanguage();
  return (
    <div>
      <p className="text-gray-400 mb-3">{t('policies.lastUpdated')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('policies.informationWeCollect')}</h3>
      <p className="text-gray-400 mb-3">{t('policies.informationWeCollectDesc')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('policies.howWeUseInfo')}</h3>
      <p className="text-gray-400 mb-3">{t('policies.howWeUseInfoDesc')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('policies.informationSharing')}</h3>
      <p className="text-gray-400 mb-3">{t('policies.informationSharingDesc')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('policies.dataSecurity')}</h3>
      <p className="text-gray-400 mb-3">{t('policies.dataSecurityDesc')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('policies.contactUs')}</h3>
      <p className="text-gray-400">{t('policies.contactUsDesc')}</p>
    </div>
  );
};

const TermsOfService = () => {
  const { t } = useLanguage();
  return (
    <div>
      <p className="text-gray-400 mb-3">{t('policies.lastUpdated')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('policies.acceptanceOfTerms')}</h3>
      <p className="text-gray-400 mb-3">{t('policies.acceptanceOfTermsDesc')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('policies.useLicense')}</h3>
      <p className="text-gray-400 mb-3">{t('policies.useLicenseDesc')}</p>
      <ul className="list-disc list-inside text-gray-400 mb-3 space-y-1 text-sm">
        <li>{t('policies.useLicenseItem1')}</li>
        <li>{t('policies.useLicenseItem2')}</li>
        <li>{t('policies.useLicenseItem3')}</li>
        <li>{t('policies.useLicenseItem4')}</li>
      </ul>
      <h3 className="font-semibold mb-2 text-white">{t('policies.serviceAvailability')}</h3>
      <p className="text-gray-400 mb-3">{t('policies.serviceAvailabilityDesc')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('policies.limitationOfLiability')}</h3>
      <p className="text-gray-400 mb-3">{t('policies.limitationOfLiabilityDesc')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('policies.contactInformation')}</h3>
      <p className="text-gray-400">{t('policies.contactInformationDesc')}</p>
    </div>
  );
};

const CookiePolicy = () => {
  const { t } = useLanguage();
  return (
    <div>
      <p className="text-gray-400 mb-3">{t('policies.lastUpdated')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('policies.whatAreCookies')}</h3>
      <p className="text-gray-400 mb-3">{t('policies.whatAreCookiesDesc')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('policies.typesOfCookies')}</h3>
      <div className="space-y-2 mb-3">
        <div>
          <h4 className="font-medium text-gray-300">{t('policies.essentialCookies')}</h4>
          <p className="text-gray-400 text-sm">{t('policies.essentialCookiesDesc')}</p>
        </div>
        <div>
          <h4 className="font-medium text-gray-300">{t('policies.analyticsCookies')}</h4>
          <p className="text-gray-400 text-sm">{t('policies.analyticsCookiesDesc')}</p>
        </div>
        <div>
          <h4 className="font-medium text-gray-300">{t('policies.functionalCookies')}</h4>
          <p className="text-gray-400 text-sm">{t('policies.functionalCookiesDesc')}</p>
        </div>
      </div>
      <h3 className="font-semibold mb-2 text-white">{t('policies.managingCookies')}</h3>
      <p className="text-gray-400 mb-3">{t('policies.managingCookiesDesc')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('policies.thirdPartyCookies')}</h3>
      <p className="text-gray-400 mb-3">{t('policies.thirdPartyCookiesDesc')}</p>
      <h3 className="font-semibold mb-2 text-white">{t('policies.contactUs')}</h3>
      <p className="text-gray-400">{t('policies.cookieContactDesc')}</p>
    </div>
  );
};

export default MobileLandingPage;

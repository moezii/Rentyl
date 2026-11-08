import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import SEOHead from '../../components/SEO/SEOHead';
import { organizationSchema } from '../../components/SEO/structuredData';
// Import images
import footer1 from '../../assets/footer1.webp';

// Mobile About Icon Component
const MobileAboutIcon = ({ type }) => {
  const icons = {
    lightbulb: (
      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    handshake: (
      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
      </svg>
    ),
    shield: (
      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    leaf: (
      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  };
  return icons[type] || null;
};

const MobileAboutPage = () => {
  const { t } = useLanguage();
  const [activeModal, setActiveModal] = useState(null);

  const openModal = modalType => {
    setActiveModal(modalType);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
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
              {t('about.ourStory')}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold mb-4 bg-gradient-to-r from-gray-200 via-blue-100 to-gray-200 bg-clip-text text-transparent"
          >
            {t('about.title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-base text-gray-300"
          >
            {t('about.subtitle')}
          </motion.p>
        </div>
      </div>

      {/* Mobile Values Section */}
      <div className="py-10 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-3 text-white">{t('about.coreValues')}</h2>
            <p className="text-gray-400 text-sm">{t('about.coreValuesSubtitle')}</p>
          </div>

          <div className="space-y-4">
            {mobileCoreValues.map((value, index) => (
              <MobileValueCard key={index} {...value} index={index} />
            ))}
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

      {/* Mobile Policy Modals */}
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

// Mobile Value Card Component
const MobileValueCard = ({ icon, title, description, index }) => {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-gray-800/50 backdrop-blur-sm border border-blue-500/20 rounded-xl p-4"
    >
      <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-center mb-3">
        <MobileAboutIcon type={icon} />
      </div>
      <h3 className="text-lg font-bold mb-2 text-white">{t(`about.${title}`)}</h3>
      <p className="text-gray-400 text-sm">{t(`about.${description}`)}</p>
    </motion.div>
  );
};

// Mobile Team Member Card Component
const MobileTeamMemberCard = ({ name, position, imgSrc, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-gray-800/50 backdrop-blur-sm border border-blue-500/20 rounded-xl overflow-hidden"
    >
      <div className="h-28 bg-gray-700 relative overflow-hidden">
        <img
          src={imgSrc}
          alt={`${position} portrait`}
          className="w-full h-full object-cover"
          onError={e => {
            e.target.onerror = null;
            e.target.src = 'https://via.placeholder.com/200x200?text=Photo';
          }}
        />
      </div>
      <div className="p-3">
        <h3 className="text-sm font-bold text-white">{name}</h3>
        <p className="text-blue-400 font-medium text-xs">{position}</p>
      </div>
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

// Mobile Core Values Data
const mobileCoreValues = [
  {
    icon: 'lightbulb',
    title: 'innovation',
    description: 'innovationDesc',
  },
  {
    icon: 'handshake',
    title: 'customerSuccess',
    description: 'customerSuccessDesc',
  },
  {
    icon: 'shield',
    title: 'trustSecurity',
    description: 'trustSecurityDesc',
  },
  {
    icon: 'leaf',
    title: 'sustainability',
    description: 'sustainabilityDesc',
  },
];

export default MobileAboutPage;

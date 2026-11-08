import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import SEOHead from '../../components/SEO/SEOHead';
import { localBusinessSchema, faqSchema } from '../../components/SEO/structuredData';
import footer1 from '../../assets/footer1.webp';

const MobileContactPage = () => {
  const { t, isRTL } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    fleetSize: '',
    message: '',
    website: '', // Honeypot field for bot detection
    formTimestamp: Date.now(), // Timestamp for timing check
  });

  const [formStatus, setFormStatus] = useState({
    submitted: false,
    success: false,
    loading: false,
    message: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [activeModal, setActiveModal] = useState(null);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const openModal = modalType => {
    setActiveModal(modalType);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear specific field error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async e => {
    e.preventDefault();

    // Clear previous errors
    setFormErrors({});

    setFormStatus({
      submitted: false,
      success: false,
      loading: true,
      message: t('contact.sending'),
    });

    try {
      const response = await fetch('https://www.rentyl.app/api/contact/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Response is not JSON (likely HTML error page)
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(
          response.status === 405
            ? 'Service temporarily unavailable. Please try again or contact support@rentyl.app'
            : 'Failed to send message. Please try again later.'
        );
      }

      if (!response.ok) {
        // Handle error response
        throw new Error(data.detail || 'Failed to send message');
      }

      console.log('[Contact] Form submitted successfully');

      setFormStatus({
        submitted: true,
        success: true,
        loading: false,
        message: t('contact.teamWillContact'),
      });

      // Reset form after successful submission
      setFormData({
        name: '',
        email: '',
        company: '',
        phone: '',
        fleetSize: '',
        message: '',
        website: '',
        formTimestamp: Date.now(),
      });
    } catch (error) {
      console.error('Contact form submission failed:', error);

      // Parse error message for field-specific errors
      const errorMessage = error.message;
      const fieldErrors = {};

      if (errorMessage.includes('Name')) fieldErrors.name = errorMessage;
      if (errorMessage.includes('Email') || errorMessage.includes('email'))
        fieldErrors.email = errorMessage;
      if (errorMessage.includes('Message')) fieldErrors.message = errorMessage;
      if (errorMessage.includes('Phone') || errorMessage.includes('phone'))
        fieldErrors.phone = errorMessage;

      setFormErrors(fieldErrors);

      setFormStatus({
        submitted: true,
        success: false,
        loading: false,
        message:
          errorMessage || 'Sorry, there was an error sending your message. Please try again.',
      });
    }
  };

  // Create FAQ structured data for contact page
  const mobileContactFaqsData = mobileContactFaqs.map(faq => ({
    question: t(`contact.${faq.question}`),
    answer: t(`contact.${faq.answer}`),
  }));

  const contactStructuredData = [localBusinessSchema, faqSchema(mobileContactFaqsData)];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <SEOHead
        title="Contact Rentyl"
        description="Contact Rentyl for support, demos, and pricing. We're here to help."
        keywords="contact rentyl, car rental support, fleet management help"
        canonical="https://rentyl.app/contact"
        structuredData={contactStructuredData}
        hreflang={[
          { lang: 'en', href: 'https://rentyl.app/contact' },
          { lang: 'ar', href: 'https://rentyl.app/ar/contact' },
          { lang: 'ms', href: 'https://rentyl.app/ms/contact' },
        ]}
      />
      {/* Visually hidden h1 for SEO */}
      <h1 className="sr-only">{t('contact.title')}</h1>

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
              {t('contact.getInTouch')}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold mb-4 bg-gradient-to-r from-gray-200 via-blue-100 to-gray-200 bg-clip-text text-transparent"
          >
            {t('contact.title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-base text-gray-300"
          >
            {t('contact.subtitle')}
          </motion.p>
        </div>
      </div>

      {/* Mobile Contact Form Section */}
      <div className="py-8 px-4">
        <div className="max-w-lg mx-auto">
          <h2 className="text-xl font-bold mb-6 text-white text-center">
            {t('contact.requestDemo')}
          </h2>

          {formStatus.submitted && formStatus.success ? (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl mb-6 text-center">
              <svg
                className="w-8 h-8 mx-auto mb-3 text-green-400"
                xmlns="http://www.w3.org/2000/svg"
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
              <h3 className="text-lg font-semibold mb-2">{t('contact.thanksForReaching')}</h3>
              <p className="text-sm text-green-300">{t('contact.teamWillContact')}</p>
            </div>
          ) : formStatus.submitted && !formStatus.success ? (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-center">
              <svg
                className="w-8 h-8 mx-auto mb-3 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-lg font-semibold mb-2">{t('contact.messageFailedToSend')}</h3>
              <p className="text-sm text-red-300">{formStatus.message}</p>
              <button
                onClick={() => {
                  setFormStatus({ submitted: false, success: false, loading: false, message: '' });
                  setFormErrors({});
                }}
                className="mt-3 text-blue-400 hover:text-blue-300 font-medium text-sm"
              >
                {t('contact.tryAgain')}
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-gray-800/50 backdrop-blur-sm border border-blue-500/20 rounded-xl p-5"
            >
              {/* Honeypot field - hidden from users */}
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleChange}
                style={{ display: 'none' }}
                tabIndex="-1"
                autoComplete="off"
              />

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                    {t('contact.fullName')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    disabled={formStatus.loading}
                    value={formData.name}
                    onChange={handleChange}
                    maxLength="100"
                    className={`bg-gray-900/50 border rounded-lg px-3 py-3 w-full text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 disabled:opacity-50 text-sm ${
                      formErrors.name
                        ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50'
                        : 'border-gray-700 focus:ring-blue-500/50 focus:border-blue-500/50'
                    }`}
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                    {t('contact.emailAddress')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    disabled={formStatus.loading}
                    value={formData.email}
                    onChange={handleChange}
                    className={`bg-gray-900/50 border rounded-lg px-3 py-3 w-full text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 disabled:opacity-50 text-sm ${
                      formErrors.email
                        ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50'
                        : 'border-gray-700 focus:ring-blue-500/50 focus:border-blue-500/50'
                    }`}
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-1">
                    {t('contact.companyName')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    required
                    disabled={formStatus.loading}
                    value={formData.company}
                    onChange={handleChange}
                    className="bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-3 w-full text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 disabled:opacity-50 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1">
                    {t('contact.phoneNumber')}
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    disabled={formStatus.loading}
                    value={formData.phone}
                    onChange={handleChange}
                    className={`bg-gray-900/50 border rounded-lg px-3 py-3 w-full text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 disabled:opacity-50 text-sm ${
                      formErrors.phone
                        ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50'
                        : 'border-gray-700 focus:ring-blue-500/50 focus:border-blue-500/50'
                    }`}
                  />
                  {formErrors.phone && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.phone}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="fleetSize"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    {t('contact.fleetSize')}
                  </label>
                  <select
                    id="fleetSize"
                    name="fleetSize"
                    disabled={formStatus.loading}
                    value={formData.fleetSize}
                    onChange={handleChange}
                    className="bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-3 w-full text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 disabled:opacity-50 text-sm"
                  >
                    <option value="">{t('contact.selectFleetSize')}</option>
                    <option value="1-10">{t('contact.vehicles1to10')}</option>
                    <option value="11-50">{t('contact.vehicles11to50')}</option>
                    <option value="51-100">{t('contact.vehicles51to100')}</option>
                    <option value="101-500">{t('contact.vehicles101to500')}</option>
                    <option value="500+">{t('contact.vehicles500plus')}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">
                    {t('contact.howCanWeHelp')} <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows="4"
                    required
                    disabled={formStatus.loading}
                    value={formData.message}
                    onChange={handleChange}
                    maxLength="2000"
                    className={`bg-gray-900/50 border rounded-lg px-3 py-3 w-full text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 disabled:opacity-50 text-sm resize-none ${
                      formErrors.message
                        ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50'
                        : 'border-gray-700 focus:ring-blue-500/50 focus:border-blue-500/50'
                    }`}
                  ></textarea>
                  {formErrors.message && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.message.length}/2000 characters
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={formStatus.loading}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {formStatus.loading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
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
                        {t('contact.sending')}
                      </>
                    ) : (
                      t('contact.requestDemo')
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Mobile FAQ Section */}
      <div className="py-10 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-3 text-white">{t('contact.faq')}</h2>
            <p className="text-gray-400 text-sm">{t('contact.faqSubtitle')}</p>
          </div>

          <div className="space-y-3">
            {mobileContactFaqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="bg-gray-800/50 backdrop-blur-sm border border-blue-500/20 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className={`w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-700/30 transition-colors ${
                      isRTL ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <h3
                      className={`flex-1 text-base font-semibold text-white ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      {t(`contact.${faq.question}`)}
                    </h3>
                    <svg
                      className={`w-5 h-5 text-blue-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className={`px-5 pb-4 pt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                          <p className="text-gray-400 text-sm leading-relaxed">
                            {t(`contact.${faq.answer}`)}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
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

// Mobile FAQ Data
const mobileContactFaqs = [
  {
    question: 'howLongImplementation',
    answer: 'howLongImplementationAnswer',
  },
  {
    question: 'doYouOfferTraining',
    answer: 'doYouOfferTrainingAnswer',
  },
  {
    question: 'whatVehicleTypes',
    answer: 'whatVehicleTypesAnswer',
  },
  {
    question: 'doYouOffer24Support',
    answer: 'doYouOffer24SupportAnswer',
  },
];

export default MobileContactPage;

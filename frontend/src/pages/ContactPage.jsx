import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import SEOHead from '../components/SEO/SEOHead';
import { localBusinessSchema, faqSchema } from '../components/SEO/structuredData';
import footer1 from '../assets/footer1.webp';

// Contact Method Icon Component
const ContactIcon = ({ type }) => {
  const icons = {
    email: (
      <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
    phone: (
      <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
        />
      </svg>
    ),
    ticket: (
      <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
        />
      </svg>
    ),
  };
  return icons[type] || null;
};

const ContactPage = () => {
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
  const [activeFaq, setActiveFaq] = useState(null);

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

    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
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

      // Reset form
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

  const contactFaqsData = contactFaqs.map(faq => ({
    question: t(`contact.${faq.question}`),
    answer: t(`contact.${faq.answer}`),
  }));

  const contactStructuredData = [localBusinessSchema, faqSchema(contactFaqsData)];

  return (
    <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 min-h-screen">
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
              <span className="text-blue-400 text-sm font-bold tracking-wide">{t('contact.getInTouch').toUpperCase()}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent"
            >
              {t('contact.title')}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              {t('contact.subtitle')}
            </motion.p>

            {/* Contact Methods */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
            >
              <ContactMethodCard
                icon={<ContactIcon type="email" />}
                title={t('contact.emailUs')}
                content="support@rentyl.app"
                href="mailto:support@rentyl.app"
              />
              <ContactMethodCard
                icon={<ContactIcon type="phone" />}
                title={t('contact.callUs')}
                content="+968 0000 0000"
                href="tel:+96800000000"
              />
              <ContactMethodCard
                icon={<ContactIcon type="ticket" />}
                title={t('contact.submitTicket')}
                content={t('contact.fillFormBelow')}
                onClick={() => {
                  document.getElementById('request-demo')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  });
                }}
              />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Contact Form Section */}
      <div id="request-demo" className="relative py-24 px-4 bg-black/30">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              {t('contact.requestDemo')}
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              {t('contact.fillFormDescription')}
            </p>
          </motion.div>

          {/* SEO text */}
          <div className="text-white opacity-0 h-0 overflow-hidden" style={{ userSelect: 'none' }}>
            Contact Rentyl: We help with all your car rental management needs. Our team is ready to
            answer questions, provide support, and guide you through our platform. Customer
            satisfaction is our top priority. Reach us by phone, email, or our online form. Thank
            you for choosing Rentyl as your solution.
          </div>

          <div className="max-w-4xl mx-auto">
            {formStatus.submitted && formStatus.success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-12 text-center backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <svg
                    className="w-10 h-10 text-green-400"
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
                </motion.div>
                <h3 className="text-2xl font-bold mb-4 text-white">
                  {t('contact.thanksForReaching')}
                </h3>
                <p className="text-gray-300 mb-6">{t('contact.teamWillContact')}</p>
                <button
                  onClick={() =>
                    setFormStatus({ submitted: false, success: false, loading: false, message: '' })
                  }
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300"
                >
                  {t('contact.sendAnotherMessage')}
                </button>
              </motion.div>
            ) : formStatus.submitted && !formStatus.success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-2xl p-12 text-center backdrop-blur-sm"
              >
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-10 h-10 text-red-400"
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
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">
                  {t('contact.messageFailedToSend')}
                </h3>
                <p className="text-gray-300 mb-6">{formStatus.message}</p>
                <button
                  onClick={() => {
                    setFormStatus({
                      submitted: false,
                      success: false,
                      loading: false,
                      message: '',
                    });
                    setFormErrors({});
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300"
                >
                  {t('contact.tryAgain')}
                </button>
              </motion.div>
            ) : (
              <motion.form
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                onSubmit={handleSubmit}
                className="bg-gradient-to-br from-gray-900/60 to-black/60 backdrop-blur-2xl border border-blue-500/30 rounded-3xl p-8 md:p-12 shadow-2xl shadow-blue-500/20"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-semibold text-gray-300 mb-2"
                    >
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
                      className={`w-full px-4 py-3 bg-gray-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 disabled:opacity-50 ${
                        formErrors.name
                          ? 'border-red-500/50 focus:ring-red-500/50'
                          : 'border-blue-500/30 focus:ring-blue-500/50 focus:border-blue-500/50'
                      }`}
                      placeholder="John Doe"
                    />
                    {formErrors.name && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-sm text-red-400"
                      >
                        {formErrors.name}
                      </motion.p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-semibold text-gray-300 mb-2"
                    >
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
                      className={`w-full px-4 py-3 bg-gray-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 disabled:opacity-50 ${
                        formErrors.email
                          ? 'border-red-500/50 focus:ring-red-500/50'
                          : 'border-blue-500/30 focus:ring-blue-500/50 focus:border-blue-500/50'
                      }`}
                      placeholder="john@example.com"
                    />
                    {formErrors.email && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-sm text-red-400"
                      >
                        {formErrors.email}
                      </motion.p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label
                      htmlFor="company"
                      className="block text-sm font-semibold text-gray-300 mb-2"
                    >
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
                      className="w-full px-4 py-3 bg-gray-900/50 border border-blue-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 disabled:opacity-50"
                      placeholder="Your Company"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-semibold text-gray-300 mb-2"
                    >
                      {t('contact.phoneNumber')}
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      disabled={formStatus.loading}
                      value={formData.phone}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 bg-gray-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 disabled:opacity-50 ${
                        formErrors.phone
                          ? 'border-red-500/50 focus:ring-red-500/50'
                          : 'border-blue-500/30 focus:ring-blue-500/50 focus:border-blue-500/50'
                      }`}
                      placeholder="+968 0000 0000"
                    />
                    {formErrors.phone && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-sm text-red-400"
                      >
                        {formErrors.phone}
                      </motion.p>
                    )}
                  </div>
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="fleetSize"
                    className="block text-sm font-semibold text-gray-300 mb-2"
                  >
                    {t('contact.fleetSize')}
                  </label>
                  <select
                    id="fleetSize"
                    name="fleetSize"
                    disabled={formStatus.loading}
                    value={formData.fleetSize}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-blue-500/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 disabled:opacity-50"
                  >
                    <option value="" className="bg-gray-900">
                      {t('contact.selectFleetSize')}
                    </option>
                    <option value="1-10" className="bg-gray-900">
                      {t('contact.vehicles1to10')}
                    </option>
                    <option value="11-50" className="bg-gray-900">
                      {t('contact.vehicles11to50')}
                    </option>
                    <option value="51-100" className="bg-gray-900">
                      {t('contact.vehicles51to100')}
                    </option>
                    <option value="101-500" className="bg-gray-900">
                      {t('contact.vehicles101to500')}
                    </option>
                    <option value="500+" className="bg-gray-900">
                      {t('contact.vehicles500plus')}
                    </option>
                  </select>
                </div>

                <div className="mb-8">
                  <label
                    htmlFor="message"
                    className="block text-sm font-semibold text-gray-300 mb-2"
                  >
                    {t('contact.howCanWeHelp')} <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows="5"
                    required
                    disabled={formStatus.loading}
                    value={formData.message}
                    onChange={handleChange}
                    maxLength="2000"
                    className={`w-full px-4 py-3 bg-gray-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 disabled:opacity-50 resize-none ${
                      formErrors.message
                        ? 'border-red-500/50 focus:ring-red-500/50'
                        : 'border-blue-500/30 focus:ring-blue-500/50 focus:border-blue-500/50'
                    }`}
                    placeholder="Tell us about your needs..."
                  ></textarea>
                  {formErrors.message && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-sm text-red-400"
                    >
                      {formErrors.message}
                    </motion.p>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    {formData.message.length}/2000 characters
                  </p>
                </div>

                <div className="text-center">
                  <motion.button
                    type="submit"
                    disabled={formStatus.loading}
                    whileHover={{ scale: formStatus.loading ? 1 : 1.02 }}
                    whileTap={{ scale: formStatus.loading ? 1 : 0.98 }}
                    className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-4 px-12 rounded-full shadow-lg shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
                  >
                    {formStatus.loading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                      <>
                        {t('contact.requestDemo')}
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
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.form>
            )}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="relative py-24 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">{t('contact.faq')}</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">{t('contact.faqSubtitle')}</p>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-4">
            {contactFaqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl overflow-hidden hover:border-blue-500/40 transition-all duration-300"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  className="w-full p-6 text-left flex items-center justify-between"
                >
                  <h3 className="text-lg font-bold text-white pr-8">
                    {t(`contact.${faq.question}`)}
                  </h3>
                  <motion.svg
                    animate={{ rotate: activeFaq === index ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-6 h-6 text-blue-400 flex-shrink-0"
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
                  </motion.svg>
                </button>
                <AnimatePresence>
                  {activeFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 text-gray-400 leading-relaxed">
                        {t(`contact.${faq.answer}`)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative bg-black border-t border-blue-500/20 py-16 px-4">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>

        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
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
                  href="/about"
                  className="block text-gray-400 hover:text-blue-400 transition-colors text-sm"
                >
                  {t('nav.about')}
                </a>
              </div>
            </div>
          </div>

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

/// Contact Method Card Component
const ContactMethodCard = ({ icon, title, content, href, onClick }) => {
  // If onClick is provided, render as a button instead of a link
  if (onClick) {
    return (
      <motion.button
        onClick={onClick}
        whileHover={{ y: -5, scale: 1.02 }}
        className="group bg-gradient-to-br from-gray-900/60 to-black/60 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6 shadow-xl shadow-blue-500/10 hover:border-blue-500/50 hover:shadow-blue-500/20 transition-all duration-300 block w-full cursor-pointer"
      >
        <div className="mb-4 flex justify-center">{icon}</div>
        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
          {title}
        </h3>
        <p className="text-gray-400 text-sm">{content}</p>
      </motion.button>
    );
  }

  // only prepend https:// if it's a plain domain (not mailto:, tel:, etc.)
  const finalHref =
    href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')
      ? href
      : `https://${href}`;

  return (
    <motion.a
      href={finalHref}
      target={href.startsWith('mailto:') || href.startsWith('tel:') ? '_self' : '_blank'}
      rel="noopener noreferrer"
      whileHover={{ y: -5, scale: 1.02 }}
      className="group bg-gradient-to-br from-gray-900/60 to-black/60 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6 shadow-xl shadow-blue-500/10 hover:border-blue-500/50 hover:shadow-blue-500/20 transition-all duration-300 block"
    >
      <div className="mb-4 flex justify-center">{icon}</div>
      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
        {title}
      </h3>
      <p className="text-gray-400 text-sm">{content}</p>
    </motion.a>
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

// FAQ Data
const contactFaqs = [
  { question: 'howLongImplementation', answer: 'howLongImplementationAnswer' },
  { question: 'doYouOfferTraining', answer: 'doYouOfferTrainingAnswer' },
  { question: 'whatVehicleTypes', answer: 'whatVehicleTypesAnswer' },
  { question: 'doYouOffer24Support', answer: 'doYouOffer24SupportAnswer' },
];

export default ContactPage;


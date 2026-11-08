import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';

const BookingConfirmationModal = ({ isOpen, onClose, type, bookingId, email, transactionId }) => {
  const { t, isRTL } = useLanguage();

  const isSuccess = type === 'success';

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999]"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="bg-gradient-to-br from-gray-900 to-black border border-blue-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-blue-500/20 pointer-events-auto relative overflow-hidden"
            >
              {/* Decorative Background */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
                                   linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)`,
                    backgroundSize: '30px 30px',
                  }}
                ></div>
              </div>

              {/* Content */}
              <div className="relative z-10">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  {isSuccess ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                      className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/50"
                    >
                      <svg
                        className="w-12 h-12 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                      className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/50"
                    >
                      <svg
                        className="w-12 h-12 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </motion.div>
                  )}
                </div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className={`text-2xl font-bold text-center mb-4 ${
                    isSuccess ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {isSuccess
                    ? t('booking.successTitle')
                    : t('booking.failureTitle')}
                </motion.h2>

                {/* Message */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-center space-y-4 mb-6"
                >
                  {isSuccess ? (
                    <>
                      <p className="text-gray-300 leading-relaxed">
                        {t('booking.successMessage')}
                      </p>

                      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 space-y-2">
                        <div className="flex items-start">
                          <svg
                            className={`w-5 h-5 text-green-400 mt-0.5 flex-shrink-0 ${isRTL ? 'ml-2' : 'mr-2'}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          <p className="text-sm text-green-300 text-left">
                            {t('booking.emailConfirmation', { email })}
                          </p>
                        </div>
                        <div className="flex items-start">
                          <svg
                            className={`w-5 h-5 text-green-400 mt-0.5 flex-shrink-0 ${isRTL ? 'ml-2' : 'mr-2'}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <p className="text-sm text-green-300 text-left">
                            {t('booking.companyContact')}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-300 leading-relaxed">
                        {t('booking.failureMessage')}
                      </p>

                      {transactionId && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                          <p className="text-sm text-gray-400 mb-1">
                            {t('booking.transactionIdLabel')}
                          </p>
                          <p className="text-sm font-mono text-red-300">
                            {transactionId}
                          </p>
                        </div>
                      )}

                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                        <p className="text-sm text-yellow-300 text-left">
                          {t('booking.failureHelp')}
                        </p>
                      </div>
                    </>
                  )}
                </motion.div>

                {/* Button */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  onClick={onClose}
                  className={`w-full py-4 px-6 rounded-full font-bold text-white transition-all duration-300 hover:scale-105 shadow-lg ${
                    isSuccess
                      ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 shadow-green-500/50'
                      : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-blue-500/50'
                  }`}
                >
                  {isSuccess ? t('booking.goToHome') : t('booking.tryAgain')}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BookingConfirmationModal;


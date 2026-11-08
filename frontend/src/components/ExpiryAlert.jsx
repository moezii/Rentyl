import React, { useEffect } from 'react';
import { isDateWithinTwoWeeks } from '../utils/carUtils';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * ExpiryAlert component
 *
 * Displays alerts for expiring vehicle documents
 * @param {Object} props - Component props
 * @param {string} props.registrationDate - Registration expiry date
 * @param {string} props.insuranceDate - Insurance expiry date
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.variant - Display variant ('full', 'compact', or 'badge')
 * @param {string} props.debugId - ID for debugging purposes
 */
const ExpiryAlert = ({
  registrationDate,
  insuranceDate,
  className = '',
  variant = 'full',
  debugId = 'unknown',
}) => {
  const { t, isRTL } = useLanguage();

  // Check if either document is expiring soon
  const isRegistrationExpiring = isDateWithinTwoWeeks(registrationDate);
  const isInsuranceExpiring = isDateWithinTwoWeeks(insuranceDate);
  const hasExpiringDocuments = isRegistrationExpiring || isInsuranceExpiring;

  // Enhanced logging for debugging
  useEffect(() => {
    console.log(`ExpiryAlert (${debugId}):`);
    console.log(`  • Registration date: ${registrationDate} (expiring: ${isRegistrationExpiring})`);
    console.log(`  • Insurance date: ${insuranceDate} (expiring: ${isInsuranceExpiring})`);
    console.log(`  • Has expiring documents: ${hasExpiringDocuments}`);
    console.log(`  • Variant: ${variant}`);
  }, [
    registrationDate,
    insuranceDate,
    isRegistrationExpiring,
    isInsuranceExpiring,
    hasExpiringDocuments,
    variant,
    debugId,
  ]);

  // If no documents are expiring, don't render anything
  if (!hasExpiringDocuments) {
    return null;
  }

  // Format the dates for display
  const formatDate = dateString => {
    if (!dateString) return t('maintenance.notSet');

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateString;
    }
  };

  // Calculate days until expiry
  const getDaysUntilExpiry = dateString => {
    if (!dateString) return null;

    try {
      const expiryDate = new Date(dateString);
      const today = new Date();

      // Clear time components for date-only comparison
      expiryDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays;
    } catch (e) {
      console.error('Error calculating days until expiry:', e);
      return null;
    }
  };

  // Check if dates are already expired
  const isRegistrationExpired = registrationDate ? new Date(registrationDate) < new Date() : false;
  const isInsuranceExpired = insuranceDate ? new Date(insuranceDate) < new Date() : false;

  // Determine which alert message to show
  const getAlertMessage = () => {
    // Both documents expired
    if (isRegistrationExpired && isInsuranceExpired) {
      return t('maintenance.registrationAndInsuranceExpired');
    }
    // One document expired, one expiring soon
    else if (isRegistrationExpired && isInsuranceExpiring) {
      return t('maintenance.registrationExpiredInsuranceExpiring');
    } else if (isInsuranceExpired && isRegistrationExpiring) {
      return t('maintenance.insuranceExpiredRegistrationExpiring');
    }
    // Single document expired
    else if (isRegistrationExpired) {
      return t('maintenance.registrationExpired');
    } else if (isInsuranceExpired) {
      return t('maintenance.insuranceExpired');
    }
    // Both documents expiring soon
    else if (isRegistrationExpiring && isInsuranceExpiring) {
      return t('maintenance.registrationAndInsuranceExpiringSoon');
    }
    // Single document expiring soon
    else if (isRegistrationExpiring) {
      return t('maintenance.registrationExpiringSoon');
    } else {
      return t('maintenance.insuranceExpiringSoon');
    }
  };

  // Determine alert color based on expiry status
  const getAlertColor = () => {
    if (isRegistrationExpired || isInsuranceExpired) {
      return {
        bg: 'bg-red-900/70',
        border: 'border-red-500',
        text: 'text-red-100',
        textContent: 'text-red-200',
      };
    } else {
      return {
        bg: 'bg-amber-900/70',
        border: 'border-amber-500',
        text: 'text-amber-100',
        textContent: 'text-amber-200',
      };
    }
  };

  // Get the appropriate colors based on expiry status
  const colors = getAlertColor();

  // For badge variant
  if (variant === 'badge') {
    return (
      <div
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg.replace('bg-', 'bg-').replace('-50', '-100')} ${colors.text} ${className}`}
      >
        <svg
          className={`-ml-0.5 mr-1.5 h-2 w-2 ${colors.border.replace('border-', 'text-')}`}
          fill="currentColor"
          viewBox="0 0 8 8"
        >
          <circle cx="4" cy="4" r="3" />
        </svg>
        {isRegistrationExpired && isInsuranceExpired
          ? t('maintenance.docsExpired')
          : isRegistrationExpired
            ? t('maintenance.regExpired')
            : isInsuranceExpired
              ? t('maintenance.insExpired')
              : isRegistrationExpiring && isInsuranceExpiring
                ? t('maintenance.docsExpiring')
                : isRegistrationExpiring
                  ? t('maintenance.regExpiring')
                  : t('maintenance.insExpiring')}
      </div>
    );
  }

  // For compact variant
  if (variant === 'compact') {
    return (
      <div
        className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-1 ${colors.border.replace('border-', 'text-')} ${className}`}
      >
        <svg
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM10 15a2 2 0 100-4 2 2 0 000 4zm0-2a.5.5 0 100-1 .5.5 0 000 1zm0-6a.5.5 0 100-1 .5.5 0 000 1z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-sm font-medium">{getAlertMessage()}</span>
      </div>
    );
  }

  // Helper function to get proper plural form for days
  const getDaysText = days => {
    if (days === 1) {
      return t('maintenance.dayLeft'); // singular
    } else {
      return t('maintenance.daysLeft'); // plural
    }
  };

  // Full variant (default)
  return (
    <div
      className={`${colors.bg} ${isRTL ? 'border-r-4' : 'border-l-4'} ${colors.border} p-4 mb-4 ${className}`}
    >
      <div className={`flex items-start ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className="flex-shrink-0">
          <svg
            className={`h-5 w-5 ${colors.border.replace('border-', 'text-')}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM10 15a2 2 0 100-4 2 2 0 000 4zm0-2a.5.5 0 100-1 .5.5 0 000 1zm0-6a.5.5 0 100-1 .5.5 0 000 1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className={`${isRTL ? 'mr-3 text-right' : 'ml-3 text-left'}`}>
          <h3 className={`text-sm font-medium ${colors.text}`}>{getAlertMessage()}</h3>
          <div className={`mt-2 text-sm ${colors.textContent}`}>
            <div className="space-y-1">
              {(isRegistrationExpiring || isRegistrationExpired) && (
                <div className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-current rounded-full mt-2 flex-shrink-0"></span>
                  <div className={`${isRTL ? 'mr-3' : 'ml-3'}`}>
                    {isRegistrationExpired ? (
                      <span className="font-medium">
                        {t('maintenance.registrationExpiredOn')} {formatDate(registrationDate)}
                      </span>
                    ) : (
                      <>
                        {t('maintenance.registrationExpiresOn')} {formatDate(registrationDate)}
                        {getDaysUntilExpiry(registrationDate) !== null && (
                          <span className="font-medium">
                            {' '}
                            ({getDaysUntilExpiry(registrationDate)}{' '}
                            {getDaysText(getDaysUntilExpiry(registrationDate))})
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
              {(isInsuranceExpiring || isInsuranceExpired) && (
                <div className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-current rounded-full mt-2 flex-shrink-0"></span>
                  <div className={`${isRTL ? 'mr-3' : 'ml-3'}`}>
                    {isInsuranceExpired ? (
                      <span className="font-medium">
                        {t('maintenance.insuranceExpiredOn')} {formatDate(insuranceDate)}
                      </span>
                    ) : (
                      <>
                        {t('maintenance.insuranceExpiresOn')} {formatDate(insuranceDate)}
                        {getDaysUntilExpiry(insuranceDate) !== null && (
                          <span className="font-medium">
                            {' '}
                            ({getDaysUntilExpiry(insuranceDate)}{' '}
                            {getDaysText(getDaysUntilExpiry(insuranceDate))})
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpiryAlert;

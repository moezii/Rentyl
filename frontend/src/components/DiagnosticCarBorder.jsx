import React, { useEffect } from 'react';
import { hasExpiringDocuments, needsOilChange } from '../utils/carUtils';

/**
 * DiagnosticCarBorder component
 *
 * Provides consistent alert styling for car cards across the application.
 * Wraps its children in a div with styling based on the car's alert status.
 */
const DiagnosticCarBorder = ({ car, children, className = '', debugId = 'unknown' }) => {
  if (!car) {
    console.log('DiagnosticCarBorder: No car data provided');
    return <div className={className}>{children}</div>;
  }

  // Check for document expiry or oil change alerts
  const hasDocumentExpiry = hasExpiringDocuments(car);
  const needsOilChangeAlert = needsOilChange(car);

  // Check if dates are already expired
  const isRegistrationExpired = car.registration_expiry_date
    ? new Date(car.registration_expiry_date) < new Date()
    : false;
  const isInsuranceExpired = car.insurance_expiry_date
    ? new Date(car.insurance_expiry_date) < new Date()
    : false;
  const hasExpiredDocuments = isRegistrationExpired || isInsuranceExpired;

  // Log detailed diagnostics for this car
  useEffect(() => {
    console.log(`DiagnosticCarBorder: ${car.make} ${car.model} (${debugId})`);
    console.log(`  • Has document expiry: ${hasDocumentExpiry}`);
    console.log(`  • Has expired documents: ${hasExpiredDocuments}`);
    console.log(`  • Needs oil change: ${needsOilChangeAlert}`);
    console.log(`  • Applied style: ${getBorderClass()}`);

    if (hasDocumentExpiry) {
      console.log(`  • Document dates:`);
      console.log(
        `    - Registration: ${car.registration_expiry_date || 'none'} (expired: ${isRegistrationExpired})`
      );
      console.log(
        `    - Insurance: ${car.insurance_expiry_date || 'none'} (expired: ${isInsuranceExpired})`
      );
    }

    if (needsOilChangeAlert) {
      console.log(`  • Oil change data:`);
      console.log(`    - Current mileage: ${car.current_mileage || 0}`);
      console.log(`    - Last oil change: ${car.last_oil_change_mileage || 'unknown'}`);
      console.log(`    - Interval: ${car.oil_change_interval || 10000}`);
    }
  }, [car, hasDocumentExpiry, hasExpiredDocuments, needsOilChangeAlert, debugId]);

  /**
   * Get the appropriate CSS class for the border based on alert status
   * @returns {string} CSS classes for the border
   */
  const getBorderClass = () => {
    // Expired documents take highest priority
    if (hasExpiredDocuments) {
      return 'ring-2 ring-red-500 border-red-500 border-2 shadow-lg shadow-red-500/30';
    }

    // Document expiry has next priority
    if (hasDocumentExpiry) {
      return 'ring-2 ring-amber-500 border-amber-500 border-2 shadow-lg shadow-amber-500/30';
    }

    // Oil change alert
    if (needsOilChangeAlert) {
      return 'ring-2 ring-yellow-400 border-yellow-400 border-2 shadow-lg shadow-yellow-400/30';
    }

    // No alert
    return '';
  };

  // Combine all classes
  const combinedClassNames = `${className} ${getBorderClass()}`.trim();

  return <div className={combinedClassNames}>{children}</div>;
};

export default DiagnosticCarBorder;

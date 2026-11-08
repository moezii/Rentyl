/**
 * Car Utility Functions - FIXED Oil Change Detection
 * Handles checking for document expiry and oil change alerts
 */

/**
 * Checks if a given date is within two weeks from now or already expired
 * @param {string} dateString - The date to check in ISO format
 * @returns {boolean} True if date is expired or within two weeks, false otherwise
 */
export const isDateWithinTwoWeeks = dateString => {
  if (!dateString || dateString === 'null' || dateString === 'undefined') {
    return false;
  }

  try {
    // Parse the date string properly
    let targetDate;

    // Handle ISO format with T (e.g. "2023-07-25T00:00:00")
    if (dateString.includes('T')) {
      targetDate = new Date(dateString);
    }
    // Handle YYYY-MM-DD format
    else if (dateString.includes('-') && dateString.split('-').length === 3) {
      const [year, month, day] = dateString.split('-');
      targetDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    // Handle MM/DD/YYYY format
    else if (dateString.includes('/') && dateString.split('/').length === 3) {
      const [month, day, year] = dateString.split('/');
      targetDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    // Try default Date parsing as fallback
    else {
      targetDate = new Date(dateString);
    }

    // Validate the date is valid
    if (isNaN(targetDate.getTime())) {
      // console.error(`Invalid date: "${dateString}" could not be parsed`);
      return false;
    }

    const today = new Date();
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(today.getDate() + 14);

    // Clear time components for date-only comparison
    targetDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    twoWeeksFromNow.setHours(23, 59, 59, 999);

    // Check if date is expired or within two weeks
    const isExpired = targetDate < today;
    const isWithinTwoWeeks = targetDate >= today && targetDate <= twoWeeksFromNow;
    const result = isExpired || isWithinTwoWeeks;

    return result;
  } catch (error) {
    // console.error('Error parsing date:', dateString, error);
    return false;
  }
};

/**
 * Checks if a car has any document expiring soon (registration or insurance)
 * @param {Object} car - The car object to check
 * @returns {boolean} True if any document is expiring soon
 */
export const hasExpiringDocuments = car => {
  if (!car) {
    return false;
  }

  const registrationExpiring = isDateWithinTwoWeeks(car.registration_expiry_date);
  const insuranceExpiring = isDateWithinTwoWeeks(car.insurance_expiry_date);

  const result = registrationExpiring || insuranceExpiring;

  return result;
};

/**
 * Extract oil change data from car description if stored there
 * @param {Object} car - The car object to check
 * @returns {Object|null} Extracted oil change data or null if not found
 */
export const extractOilChangeData = car => {
  if (!car || !car.description) {
    return null;
  }

  try {
    const match = car.description.match(/\[OIL_CHANGE_DATA\](.*)/);
    if (match) {
      return JSON.parse(match[1]);
    }
  } catch (e) {
    // console.error('Error parsing oil change data:', e);
  }

  return null;
};

/**
 * Checks if a car needs an oil change based on tracking settings and mileage
 * FIXED: Properly detects oil change alerts
 * @param {Object} car - The car object to check
 * @returns {boolean} True if car needs oil change
 */
export const needsOilChange = car => {
  if (!car) {
    // console.log('needsOilChange: No car object provided');
    return false;
  }

  // FIRST: Check if oil change tracking is enabled
  const oilChangeTracking = car.oil_change_tracking;
  if (!oilChangeTracking) {
    // console.log(`needsOilChange for ${car.make} ${car.model}: Oil change tracking not enabled`);
    return false;
  }

  // SECOND: Check if we have a last oil change mileage recorded
  const lastOilChangeMileage = parseInt(car.last_oil_change_mileage);
  if (!lastOilChangeMileage || lastOilChangeMileage <= 0) {
    // console.log(`needsOilChange for ${car.make} ${car.model}: No last oil change mileage recorded`);
    return false;
  }

  // THIRD: Get current values and calculate
  const currentMileage = parseInt(car.current_mileage) || 0;
  const interval = parseInt(car.oil_change_interval) || 10000;

  // Calculate mileage since last oil change
  const mileageSinceLastChange = currentMileage - lastOilChangeMileage;

  // Determine if oil change is needed
  const result = mileageSinceLastChange >= interval;

  // Enhanced logging for debugging
  // console.log(`needsOilChange for ${car.make} ${car.model}:`);
  // console.log(`  Oil change tracking enabled: ${oilChangeTracking}`);
  // console.log(`  Current mileage: ${currentMileage}`);
  // console.log(`  Last oil change mileage: ${lastOilChangeMileage}`);
  // console.log(`  Oil change interval: ${interval}`);
  // console.log(`  Mileage since last change: ${mileageSinceLastChange}`);
  // console.log(`  Needs oil change: ${result} (${mileageSinceLastChange} >= ${interval})`);

  return result;
};

/**
 * Determines if a car needs attention (either document expiring or oil change needed)
 * @param {Object} car - The car object to check
 * @returns {boolean} True if car needs attention
 */
export const carNeedsAttention = car => {
  const docAlert = hasExpiringDocuments(car);
  const oilAlert = needsOilChange(car);
  const result = docAlert || oilAlert;

  // console.log(
  //   `carNeedsAttention for ${car.make} ${car.model}: ${result} (docs: ${docAlert}, oil: ${oilAlert})`
  // );

  return result;
};

/**
 * Returns a specific class name for car cards that need attention
 * @param {Object} car - The car object to check
 * @returns {string} Class names to apply to car cards that need attention
 */
export const getAttentionClassName = car => {
  const hasDocAlert = hasExpiringDocuments(car);
  const hasOilAlert = needsOilChange(car);

  if (hasDocAlert) {
    return 'border-amber-500 shadow-amber-500/50'; // Amber for document expiry
  } else if (hasOilAlert) {
    return 'border-yellow-500 shadow-yellow-500/50'; // Yellow for oil change
  }

  return '';
};

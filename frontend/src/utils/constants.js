/**
 * Application Constants & Configuration
 */

/**
 * DEBUG MODE SETTINGS
 *
 * Set DEBUG_MODE to true to:
 * - Force enhanced styling on ALL cars with alerts (make alerts more visible)
 * - Apply pulsing animations to alert elements
 * - Add more detailed debug logs
 *
 * Set to false for normal production behavior
 */
export const DEBUG_MODE = true;

/**
 * Alert Configuration Settings
 */
export const ALERT_CONFIG = {
  // Number of days before document expiry to show alerts
  DOCUMENT_EXPIRY_DAYS: 14,

  // Default oil change interval in km
  DEFAULT_OIL_CHANGE_INTERVAL: 10000,
};

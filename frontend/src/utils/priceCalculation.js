/**
 * Rental Price Calculation Utilities
 *
 * This module provides functions to calculate optimal rental pricing
 * using monthly, weekly, and daily rates. The logic matches the database
 * trigger to ensure frontend and backend calculations are consistent.
 */

/**
 * Calculate optimal rental price using monthly, weekly, and daily rates
 *
 * Algorithm:
 * 1. Use monthly rate for every 30 days (if available)
 * 2. Use weekly rate for every 7 remaining days (if available and cheaper than daily)
 * 3. Use daily rate for all remaining days
 *
 * @param {number} totalDays - Total rental duration in days
 * @param {number} dailyRate - Daily rental rate (required)
 * @param {number|null} weeklyRate - Weekly rental rate (optional)
 * @param {number|null} monthlyRate - Monthly rental rate (optional)
 * @returns {Object} {
 *   totalCost: number,
 *   breakdown: Array<{type: string, count: number, rate: number, subtotal: number}>,
 *   monthsUsed: number,
 *   weeksUsed: number,
 *   daysUsed: number
 * }
 *
 * @example
 * // 35-day rental with monthly=500, weekly=150, daily=25
 * const result = calculateOptimalRentalPrice(35, 25, 150, 500);
 * // Returns: { totalCost: 625, breakdown: [...], monthsUsed: 1, weeksUsed: 0, daysUsed: 5 }
 */
export const calculateOptimalRentalPrice = (
  totalDays,
  dailyRate,
  weeklyRate = null,
  monthlyRate = null
) => {
  // Validate inputs
  if (!totalDays || totalDays <= 0) {
    throw new Error('Total days must be greater than 0');
  }

  if (!dailyRate || dailyRate <= 0) {
    throw new Error('Daily rate must be greater than 0');
  }

  let cost = 0;
  let remainingDays = totalDays;
  let monthsUsed = 0;
  let weeksUsed = 0;
  let daysUsed = 0;
  const breakdown = [];

  // Step 1: Use monthly rate if available and beneficial (30 days = 1 month)
  if (monthlyRate && monthlyRate > 0 && remainingDays >= 30) {
    monthsUsed = Math.floor(remainingDays / 30);
    const monthlySubtotal = monthsUsed * monthlyRate;
    cost += monthlySubtotal;
    remainingDays -= monthsUsed * 30;

    breakdown.push({
      type: 'month',
      count: monthsUsed,
      rate: monthlyRate,
      subtotal: monthlySubtotal,
    });
  }

  // Step 2: Use weekly rate if available and cheaper than daily (7 days = 1 week)
  if (weeklyRate && weeklyRate > 0 && remainingDays >= 7) {
    // Only use weekly rate if it's cheaper than 7 days of daily rate
    if (weeklyRate < dailyRate * 7) {
      weeksUsed = Math.floor(remainingDays / 7);
      const weeklySubtotal = weeksUsed * weeklyRate;
      cost += weeklySubtotal;
      remainingDays -= weeksUsed * 7;

      breakdown.push({
        type: 'week',
        count: weeksUsed,
        rate: weeklyRate,
        subtotal: weeklySubtotal,
      });
    }
  }

  // Step 3: Use daily rate for all remaining days
  if (remainingDays > 0) {
    daysUsed = remainingDays;
    const dailySubtotal = remainingDays * dailyRate;
    cost += dailySubtotal;

    breakdown.push({
      type: 'day',
      count: remainingDays,
      rate: dailyRate,
      subtotal: dailySubtotal,
    });
  }

  return {
    totalCost: cost,
    breakdown,
    monthsUsed,
    weeksUsed,
    daysUsed,
  };
};

/**
 * Format price breakdown for display
 *
 * Converts the breakdown array into a human-readable string
 *
 * @param {Array} breakdown - Breakdown array from calculateOptimalRentalPrice
 * @param {Function} formatPrice - Currency formatting function (price, currency) => string
 * @param {string} currency - Currency code (e.g., 'OMR', 'USD')
 * @returns {string} Formatted breakdown string (e.g., "1 month × 500 + 5 days × 25")
 *
 * @example
 * const breakdown = [
 *   { type: 'month', count: 1, rate: 500, subtotal: 500 },
 *   { type: 'day', count: 5, rate: 25, subtotal: 125 }
 * ];
 * const formatted = formatPriceBreakdown(breakdown, formatPrice, 'OMR');
 * // Returns: "1 month × 500.000 + 5 days × 25.000"
 */
export const formatPriceBreakdown = (breakdown, formatPrice, currency) => {
  if (!breakdown || breakdown.length === 0) {
    return '';
  }

  return breakdown
    .map(item => {
      // Pluralize the unit name
      const unit = item.count === 1 ? item.type : item.type + 's';

      // Format: "1 month × 500.000" or "5 days × 25.000"
      return `${item.count} ${unit} × ${formatPrice(item.rate, currency)}`;
    })
    .join(' + ');
};


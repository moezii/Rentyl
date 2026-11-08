// Currency symbols and formatting utility
// This maps currency codes to their symbols and formatting rules

export const CURRENCY_SYMBOLS = {
  // Major currencies
  USD: { symbol: '$', position: 'before', name: 'US Dollar' },
  EUR: { symbol: '€', position: 'before', name: 'Euro' },
  GBP: { symbol: '£', position: 'before', name: 'British Pound' },
  JPY: { symbol: '¥', position: 'before', name: 'Japanese Yen' },
  CNY: { symbol: '¥', position: 'before', name: 'Chinese Yuan' },

  // Middle East currencies
  OMR: { symbol: 'OMR', position: 'after', name: 'Omani Rial' },
  AED: { symbol: 'AED', position: 'after', name: 'UAE Dirham' },
  SAR: { symbol: 'SAR', position: 'after', name: 'Saudi Riyal' },
  KWD: { symbol: 'KWD', position: 'after', name: 'Kuwaiti Dinar' },
  QAR: { symbol: 'QAR', position: 'after', name: 'Qatari Riyal' },
  BHD: { symbol: 'BHD', position: 'after', name: 'Bahraini Dinar' },

  // Other currencies
  CAD: { symbol: 'CA$', position: 'before', name: 'Canadian Dollar' },
  AUD: { symbol: 'A$', position: 'before', name: 'Australian Dollar' },
  NZD: { symbol: 'NZ$', position: 'before', name: 'New Zealand Dollar' },
  CHF: { symbol: 'CHF', position: 'before', name: 'Swiss Franc' },
  SEK: { symbol: 'kr', position: 'after', name: 'Swedish Krona' },
  NOK: { symbol: 'kr', position: 'after', name: 'Norwegian Krone' },
  DKK: { symbol: 'kr', position: 'after', name: 'Danish Krone' },
  PLN: { symbol: 'zł', position: 'after', name: 'Polish Zloty' },
  INR: { symbol: '₹', position: 'before', name: 'Indian Rupee' },
  MYR: { symbol: 'RM', position: 'before', name: 'Malaysian Ringgit' },
  SGD: { symbol: 'S$', position: 'before', name: 'Singapore Dollar' },
  THB: { symbol: '฿', position: 'before', name: 'Thai Baht' },
  IDR: { symbol: 'Rp', position: 'before', name: 'Indonesian Rupiah' },
  PHP: { symbol: '₱', position: 'before', name: 'Philippine Peso' },
  ZAR: { symbol: 'R', position: 'before', name: 'South African Rand' },
  BRL: { symbol: 'R$', position: 'before', name: 'Brazilian Real' },
  MXN: { symbol: 'MX$', position: 'before', name: 'Mexican Peso' },
  TRY: { symbol: '₺', position: 'before', name: 'Turkish Lira' },
  RUB: { symbol: '₽', position: 'before', name: 'Russian Ruble' },
  KRW: { symbol: '₩', position: 'before', name: 'South Korean Won' },
  HKD: { symbol: 'HK$', position: 'before', name: 'Hong Kong Dollar' },
  TWD: { symbol: 'NT$', position: 'before', name: 'Taiwan Dollar' },
};

/**
 * Get currency symbol for a given currency code
 * @param {string} currencyCode - Currency code (e.g., 'USD', 'OMR')
 * @returns {string} Currency symbol
 */
export const getCurrencySymbol = (currencyCode) => {
  if (!currencyCode) return '';
  const currency = CURRENCY_SYMBOLS[currencyCode.toUpperCase()];
  return currency ? currency.symbol : currencyCode;
};

/**
 * Format price with currency symbol
 * @param {number} amount - Price amount
 * @param {string} currencyCode - Currency code (e.g., 'USD', 'OMR')
 * @returns {string} Formatted price string
 */
export const formatPrice = (amount, currencyCode) => {
  if (!currencyCode) return amount.toString();

  const currency = CURRENCY_SYMBOLS[currencyCode.toUpperCase()];
  if (!currency) return `${amount} ${currencyCode}`;

  const formattedAmount = typeof amount === 'number' ? amount.toFixed(2) : amount;

  if (currency.position === 'before') {
    return `${currency.symbol}${formattedAmount}`;
  } else {
    return `${formattedAmount} ${currency.symbol}`;
  }
};


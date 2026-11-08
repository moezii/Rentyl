import React, { createContext, useContext, useState, useEffect } from 'react';
import secureApi from '../../utils/secureApi';

const CurrencyContext = createContext();

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export const CurrencyProvider = ({ children }) => {
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [exchangeRates, setExchangeRates] = useState({});
  const [supportedCurrencies, setSupportedCurrencies] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  // Fetch supported currencies and exchange rates
  useEffect(() => {
    const fetchCurrencyData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch supported currencies
        const currenciesResponse = await secureApi.get('/currency/supported-currencies');
        if (currenciesResponse.data) {
          setSupportedCurrencies(currenciesResponse.data.currencies);
        }

        // Fetch exchange rates
        const ratesResponse = await secureApi.get('/currency/exchange-rates');
        if (ratesResponse.data) {
          setExchangeRates(ratesResponse.data.rates);
          setLastUpdated(ratesResponse.data.last_updated);
        }
      } catch (error) {
        console.error('Error fetching currency data:', error);
        setError('Failed to load currency data');
        // Set fallback data with Unicode flag codes for better compatibility
        setSupportedCurrencies({
          USD: {
            name: 'US Dollar',
            symbol: '$',
            flag: '\uD83C\uDDFA\uD83C\uDDF8',
            countryCode: 'US',
          },
          EUR: { name: 'Euro', symbol: '€', flag: '\uD83C\uDDEA\uD83C\uDDFA', countryCode: 'EU' },
          GBP: {
            name: 'British Pound',
            symbol: '£',
            flag: '\uD83C\uDDEC\uD83C\uDDE7',
            countryCode: 'GB',
          },
          CAD: {
            name: 'Canadian Dollar',
            symbol: 'C$',
            flag: '\uD83C\uDDE8\uD83C\uDDE6',
            countryCode: 'CA',
          },
          AUD: {
            name: 'Australian Dollar',
            symbol: 'A$',
            flag: '\uD83C\uDDE6\uD83C\uDDFA',
            countryCode: 'AU',
          },
          MYR: {
            name: 'Malaysian Ringgit',
            symbol: 'RM',
            flag: '\uD83C\uDDF2\uD83C\uDDFE',
            countryCode: 'MY',
          },
          AED: {
            name: 'UAE Dirham',
            symbol: 'د.إ',
            flag: '\uD83C\uDDE6\uD83C\uDDEA',
            countryCode: 'AE',
          },
          SAR: {
            name: 'Saudi Riyal',
            symbol: 'ر.س',
            flag: '\uD83C\uDDF8\uD83C\uDDE6',
            countryCode: 'SA',
          },
          KWD: {
            name: 'Kuwaiti Dinar',
            symbol: 'د.ك',
            flag: '\uD83C\uDDF0\uD83C\uDDFC',
            countryCode: 'KW',
          },
          QAR: {
            name: 'Qatari Riyal',
            symbol: 'ر.ق',
            flag: '\uD83C\uDDF6\uD83C\uDDE6',
            countryCode: 'QA',
          },
          BHD: {
            name: 'Bahraini Dinar',
            symbol: 'د.ب',
            flag: '\uD83C\uDDE7\uD83C\uDDED',
            countryCode: 'BH',
          },
          OMR: {
            name: 'Omani Rial',
            symbol: 'ر.ع.',
            flag: '\uD83C\uDDF4\uD83C\uDDF2',
            countryCode: 'OM',
          },
        });
        setExchangeRates({
          USD: 1.0,
          EUR: 0.92,
          GBP: 0.79,
          CAD: 1.36,
          AUD: 1.52,
          AED: 3.67,
          SAR: 3.75,
          KWD: 0.31,
          QAR: 3.64,
          BHD: 0.38,
          OMR: 0.38,
          MYR: 4.72,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCurrencyData();

    // Refresh rates every 15 minutes
    const interval = setInterval(fetchCurrencyData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Load saved currency preference from localStorage
  useEffect(() => {
    const savedCurrency = localStorage.getItem('selectedCurrency');
    if (savedCurrency && supportedCurrencies[savedCurrency]) {
      setSelectedCurrency(savedCurrency);
    }
  }, [supportedCurrencies]);

  // Save currency preference to localStorage
  const changeCurrency = currencyCode => {
    setSelectedCurrency(currencyCode);
    localStorage.setItem('selectedCurrency', currencyCode);
  };

  // Convert amount from USD to selected currency
  const convertFromUSD = usdAmount => {
    if (!usdAmount || selectedCurrency === 'USD') return usdAmount;
    const rate = exchangeRates[selectedCurrency] || 1;
    return usdAmount * rate;
  };

  // Format amount with currency symbol
  const formatAmount = (amount, currencyCode = selectedCurrency) => {
    if (!amount && amount !== 0) return '';

    const currency = supportedCurrencies[currencyCode];
    if (!currency) return `${amount.toFixed(2)}`;

    const symbol = currency.symbol;
    const formattedAmount = Number(amount).toFixed(2);

    // For Arabic symbols, place after the number
    if (['AED', 'SAR', 'KWD', 'QAR', 'BHD', 'OMR'].includes(currencyCode)) {
      return `${formattedAmount} ${symbol}`;
    }

    return `${symbol}${formattedAmount}`;
  };

  // Get current currency info
  const getCurrentCurrency = () => {
    return supportedCurrencies[selectedCurrency] || supportedCurrencies['USD'];
  };

  // Refresh exchange rates manually
  const refreshRates = async () => {
    try {
      setError(null);
      const response = await secureApi.get('/currency/exchange-rates');
      if (response.data) {
        setExchangeRates(response.data.rates);
        // Always update timestamp to current time when manually refreshed
        setLastUpdated(Date.now());
        return true;
      }
    } catch (error) {
      console.error('Error refreshing rates:', error);
      setError('Failed to refresh exchange rates');
    }
    return false;
  };

  const value = {
    selectedCurrency,
    exchangeRates,
    supportedCurrencies,
    loading,
    lastUpdated,
    error,
    changeCurrency,
    convertFromUSD,
    formatAmount,
    getCurrentCurrency,
    refreshRates,
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

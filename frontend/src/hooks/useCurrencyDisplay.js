import { useCurrency } from '../components/context/CurrencyContext';

export const useCurrencyDisplay = () => {
  const { convertFromUSD, formatAmount, selectedCurrency, getCurrentCurrency } = useCurrency();

  // Format a USD amount to the selected currency
  const formatPrice = usdAmount => {
    if (!usdAmount && usdAmount !== 0) return '';
    const convertedAmount = convertFromUSD(usdAmount);
    return formatAmount(convertedAmount);
  };

  // Format a USD amount to the selected currency without symbol (for input fields)
  const formatPriceNumber = usdAmount => {
    if (!usdAmount && usdAmount !== 0) return '';
    const convertedAmount = convertFromUSD(usdAmount);
    return Number(convertedAmount).toFixed(2);
  };

  // Get just the currency symbol
  const getCurrencySymbol = () => {
    const currency = getCurrentCurrency();
    return currency?.symbol || '$';
  };

  return {
    formatPrice,
    formatPriceNumber,
    getCurrencySymbol,
    selectedCurrency,
    getCurrentCurrency,
  };
};

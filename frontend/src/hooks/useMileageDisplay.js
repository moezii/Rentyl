import { useMileage } from '../components/context/MileageContext';

export const useMileageDisplay = () => {
  const { convertFromKm, formatMileage, selectedUnit, getCurrentUnit, displayMileage } =
    useMileage();

  // Format a km amount to the selected unit
  const formatMileageValue = (kmAmount, precision = 0) => {
    if (!kmAmount && kmAmount !== 0) return '';
    return displayMileage(kmAmount, precision);
  };

  // Format a km amount to the selected unit without unit symbol (for input fields)
  const formatMileageNumber = (kmAmount, precision = 0) => {
    if (!kmAmount && kmAmount !== 0) return '';
    const convertedAmount = convertFromKm(kmAmount);
    return Number(convertedAmount.toFixed(precision));
  };

  // Get just the unit symbol
  const getMileageUnit = () => {
    const unit = getCurrentUnit();
    return unit?.symbol || 'km';
  };

  return {
    formatMileageValue,
    formatMileageNumber,
    getMileageUnit,
    selectedUnit,
    getCurrentUnit,
    displayMileage,
  };
};

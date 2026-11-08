import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const MileageContext = createContext();

export const useMileage = () => {
  const context = useContext(MileageContext);
  if (!context) {
    throw new Error('useMileage must be used within a MileageProvider');
  }
  return context;
};

export const MileageProvider = ({ children }) => {
  const [selectedUnit, setSelectedUnit] = useState('km');
  const { t } = useLanguage();

  // Supported mileage units
  const supportedUnits = {
    km: {
      code: 'km',
      name: 'Kilometers',
      symbol: 'km',
      factor: 1, // Base unit
    },
    mile: {
      code: 'mile',
      name: 'Miles',
      symbol: 'mi',
      factor: 0.621371, // 1 km = 0.621371 miles
    },
  };

  // Load saved unit preference from localStorage
  useEffect(() => {
    const savedUnit = localStorage.getItem('selectedMileageUnit');
    if (savedUnit && supportedUnits[savedUnit]) {
      setSelectedUnit(savedUnit);
    }
  }, []);

  // Save unit preference to localStorage
  const changeUnit = unitCode => {
    setSelectedUnit(unitCode);
    localStorage.setItem('selectedMileageUnit', unitCode);
  };

  // Convert from kilometers to selected unit
  const convertFromKm = kmAmount => {
    if (!kmAmount && kmAmount !== 0) return kmAmount;
    if (selectedUnit === 'km') return kmAmount;

    const unit = supportedUnits[selectedUnit];
    return kmAmount * unit.factor;
  };

  // Format mileage with unit symbol
  const formatMileage = (amount, unitCode = selectedUnit, showUnit = true) => {
    if (!amount && amount !== 0) return '';

    const unit = supportedUnits[unitCode];
    if (!unit) return `${amount}`;

    const formattedAmount = Number(amount).toLocaleString();

    if (!showUnit) return formattedAmount;

    // Get localized unit name
    const unitName = getUnitDisplayName(unitCode);
    return `${formattedAmount} ${unitName}`;
  };

  // Get localized unit display name
  const getUnitDisplayName = (unitCode = selectedUnit) => {
    if (unitCode === 'km') {
      return t('mileage.km') || 'km';
    } else if (unitCode === 'mile') {
      return t('mileage.mile') || 'mi';
    }
    return supportedUnits[unitCode]?.symbol || unitCode;
  };

  // Get current unit info
  const getCurrentUnit = () => {
    return supportedUnits[selectedUnit] || supportedUnits['km'];
  };

  // Format for display with automatic conversion and proper rounding
  const displayMileage = (kmAmount, precision = 0) => {
    if (!kmAmount && kmAmount !== 0) return '';

    const converted = convertFromKm(kmAmount);
    const rounded = Number(converted.toFixed(precision));
    return formatMileage(rounded);
  };

  const value = {
    selectedUnit,
    supportedUnits,
    changeUnit,
    convertFromKm,
    formatMileage,
    getUnitDisplayName,
    getCurrentUnit,
    displayMileage,
  };

  return <MileageContext.Provider value={value}>{children}</MileageContext.Provider>;
};

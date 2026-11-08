import React from 'react';

const FlagIcon = ({ countryCode, flag, className = 'text-lg' }) => {
  // Fallback mapping for country codes to flag emojis
  const flagMap = {
    US: '🇺🇸',
    EU: '🇪🇺',
    GB: '🇬🇧',
    CA: '🇨🇦',
    AU: '🇦🇺',
    AE: '🇦🇪',
    SA: '🇸🇦',
    KW: '🇰🇼',
    QA: '🇶🇦',
    BH: '🇧🇭',
    OM: '🇴🇲',
  };

  // Try to display the flag, with multiple fallbacks
  const displayFlag = flag || flagMap[countryCode] || countryCode || '🏳️';

  return (
    <span className={`${className} emoji-font flag-emoji`} title={`${countryCode} flag`}>
      {displayFlag}
    </span>
  );
};

export default FlagIcon;

// frontend/src/pages/AnalyticsPage/components/StatItem.jsx
import React from 'react';

// Stat Item Component (exact copy from RefAnalyticsPage)
const StatItem = ({ label, value, isRTL }) => {
  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-3">
      <div className={`text-gray-400 text-sm mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
        {label}
      </div>
      <div className={`text-white font-semibold text-lg ${isRTL ? 'text-right' : 'text-left'}`}>
        {value}
      </div>
    </div>
  );
};

export default StatItem;


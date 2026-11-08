// frontend/src/pages/AnalyticsPage/components/ChartCard.jsx
import React from 'react';

// Chart Card Component (exact copy from RefAnalyticsPage)
const ChartCard = ({ title, children, isRTL }) => {
  return (
    <div className="bg-gradient-to-br from-gray-900/70 to-black/70 rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl border border-gray-700/50">
      <h3 className={`text-lg font-semibold text-white mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
        {title}
      </h3>
      {children}
    </div>
  );
};

export default ChartCard;


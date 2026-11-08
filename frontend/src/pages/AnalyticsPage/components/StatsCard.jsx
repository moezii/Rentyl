// frontend/src/pages/AnalyticsPage/components/StatsCard.jsx
import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';

// Stats Card Component (updated to handle RTL internally)
const StatsCard = ({ title, value, icon, description, positive }) => {
  const { isRTL } = useLanguage();

  const changeColorClass = positive
    ? 'text-green-400'
    : positive === false
      ? 'text-red-400'
      : 'text-blue-400';

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border border-gray-700/50">
      <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h3 className={`text-gray-300 font-medium text-lg ${isRTL ? 'text-right' : 'text-left'}`}>
          {title}
        </h3>
        <div className="text-blue-400 bg-blue-400/10 p-2 rounded-lg">{icon}</div>
      </div>
      <p
        className={`text-4xl font-bold ${changeColorClass} mb-3 ${isRTL ? 'text-right' : 'text-left'}`}
      >
        {value}
      </p>
      {description && (
        <div className={`flex items-center ${isRTL ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`text-gray-400 text-sm font-medium flex items-center ${isRTL ? 'text-right' : 'text-left'}`}
          >
            {description}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsCard;


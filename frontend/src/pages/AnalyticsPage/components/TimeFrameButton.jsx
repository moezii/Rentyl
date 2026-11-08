// frontend/src/pages/AnalyticsPage/components/TimeFrameButton.jsx
import React from 'react';

// Time Frame Button Component (exact copy from RefAnalyticsPage)
const TimeFrameButton = ({ label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`py-2 px-4 rounded-lg transition-all duration-200 text-sm font-medium ${
        active ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-900 text-gray-300 hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );
};

export default TimeFrameButton;


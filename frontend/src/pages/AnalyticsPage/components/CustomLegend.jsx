// frontend/src/pages/AnalyticsPage/components/CustomLegend.jsx
import React from 'react';

// Custom Legend Component (exact copy from RefAnalyticsPage)
const CustomLegend = ({ payload }) => {
  return (
    <div className="flex justify-center gap-6 mt-4">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-400 text-sm">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default CustomLegend;

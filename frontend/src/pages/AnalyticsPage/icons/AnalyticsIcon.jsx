// frontend/src/pages/AnalyticsPage/icons/AnalyticsIcon.jsx
import React from 'react';
import { TruckIcon, CogIcon, ArrowTrendingUpIcon, ChartBarIcon } from '@heroicons/react/24/outline';

// Icon Components using Heroicons for consistency
export const UtilizationIcon = () => <ArrowTrendingUpIcon className="w-6 h-6" />;

export const RevenueIcon = () => <ChartBarIcon className="w-6 h-6" />;

export const MaintenanceIcon = () => <CogIcon className="w-6 h-6" />;

export const CarIcon = () => <TruckIcon className="w-6 h-6" />;

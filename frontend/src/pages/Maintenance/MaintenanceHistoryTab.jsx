import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  XMarkIcon,
  WrenchIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ClockIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PencilIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import secureApi from '../../utils/secureApi';
import { formatPrice } from '../../utils/currencySymbols';
import { useMileageDisplay } from '../../hooks/useMileageDisplay';
import { useLanguage } from '../../contexts/LanguageContext';

const MaintenanceHistoryTab = ({ car, maintenanceHistory, loading, companyCurrency = '' }) => {
  const { formatMileageValue } = useMileageDisplay();
  const { t, isRTL } = useLanguage();
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [updatingRecord, setUpdatingRecord] = useState(null);
  const [maintenanceData, setMaintenanceData] = useState([...maintenanceHistory]);

  const getCurrency = () => car?.currency || companyCurrency || '';

  // Format date for display
  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get status badge color
  const getStatusBadge = status => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  // Get status text
  const getStatusText = status => {
    switch (status) {
      case 'pending':
        return t('maintenance.pending');
      case 'in_progress':
        return t('maintenance.inProgress');
      case 'completed':
        return t('maintenance.completed');
      default:
        return status || 'N/A';
    }
  };

  // Handle status change
  const updateRecordStatus = async (record, newStatus) => {
    if (!record.encrypted_maintenance_id) {
      console.error('Cannot update record - missing encrypted_maintenance_id', record);
      return;
    }

    try {
      setUpdatingRecord(record.encrypted_maintenance_id);

      const updateData = {
        ...record,
        status: newStatus,
      };

      const response = await secureApi.put(
        `/maintenance/${record.encrypted_maintenance_id}/`,
        updateData
      );

      if (response.data) {
        // Update local state
        const updatedData = maintenanceData.map(item =>
          item.encrypted_maintenance_id === record.encrypted_maintenance_id
            ? { ...item, status: newStatus }
            : item
        );
        setMaintenanceData(updatedData);

        console.log(`Updated record ${record.encrypted_maintenance_id} status to ${newStatus}`);
      }
    } catch (err) {
      console.error('Error updating maintenance record:', err);
      alert(`Failed to update record: ${err.message || 'Unknown error'}`);
    } finally {
      setUpdatingRecord(null);
    }
  };

  // Hide all except the latest two records initially
  const visibleRecords = showAllRecords ? maintenanceData : maintenanceData.slice(0, 2);

  // If there's more than 2 records, we'll show a "View All" button
  const hasMoreRecords = maintenanceData.length > 2;

  useEffect(() => {
    setMaintenanceData([...maintenanceHistory]);
  }, [maintenanceHistory]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[120px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-xl font-bold text-white ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('cars.maintenanceHistory')}
        </h2>
        <div className="flex gap-2">
          {car.status === 'available' && (
            <button
              onClick={() => {
                // Update the car status directly from here
                const carId = car.encrypted_car_id || car._id;

                // Create FormData for the update
                const formData = new FormData();
                formData.append('status', 'maintenance');

                // Use FormData for the request body
                secureApi
                  .put(`/cars/${carId}`, formData)
                  .then(response => {
                    if (response) {
                      // Show feedback
                      alert('Vehicle marked for maintenance. You can now add maintenance records.');
                      // Update the UI
                      window.location.reload();
                    }
                  })
                  .catch(error => {
                    console.error('Failed to mark for maintenance:', error);
                    alert(t('maintenance.failedToMarkForMaintenance'));
                  });
              }}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-md text-sm flex items-center gap-1"
            >
              <WrenchIcon className="h-4 w-4" />
              {t('maintenance.markForMaintenance')}
            </button>
          )}
          <Link
            to="/maintenance"
            className={`text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <WrenchIcon className="h-4 w-4" />
            {t('maintenance.allMaintenance')}
          </Link>
        </div>
      </div>

      {maintenanceData.length === 0 ? (
        <div className="text-center py-8 bg-gray-900/80 rounded-lg">
          <p className="text-gray-400">{t('maintenance.noMaintenanceHistoryAvailable')}</p>

          {car.status === 'maintenance' && (
            <Link
              to="/maintenance"
              className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              {t('maintenance.addMaintenanceRecord')}
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="bg-gray-900/80 rounded-lg overflow-hidden">
            {/* Desktop view */}
            <div className="hidden md:block">
              <table className="min-w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th
                      className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-400 uppercase tracking-wider`}
                    >
                      {t('maintenance.date')}
                    </th>
                    <th
                      className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-400 uppercase tracking-wider`}
                    >
                      {t('maintenance.service')}
                    </th>
                    <th
                      className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-400 uppercase tracking-wider`}
                    >
                      {t('maintenance.mileage')}
                    </th>
                    <th
                      className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-400 uppercase tracking-wider`}
                    >
                      {t('maintenance.cost')}
                    </th>
                    <th
                      className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-400 uppercase tracking-wider`}
                    >
                      {t('maintenance.status')}
                    </th>
                    <th
                      className={`px-4 py-3 ${isRTL ? 'text-left' : 'text-right'} text-xs font-medium text-gray-400 uppercase tracking-wider`}
                    >
                      {t('maintenance.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {visibleRecords.map((record, index) => (
                    <tr
                      key={record.encrypted_maintenance_id || index}
                      className={`${index % 2 === 0 ? 'bg-gray-900/30' : 'bg-gray-900/70'} hover:bg-gray-700/40`}
                    >
                      <td
                        className={`px-4 py-3 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        <div className="text-sm text-white">
                          {formatDate(record.maintenance_date || record.date)}
                        </div>
                      </td>
                      <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="text-sm text-white">
                          {record.maintenance_type === 'regular' &&
                          record.service_type === 'oil_change'
                            ? t('maintenance.oilChange')
                            : record.description || t('maintenance.generalMaintenance')}
                        </div>
                        <div className="text-xs text-gray-400">
                          {record.maintenance_type === 'regular'
                            ? t('maintenance.regular')
                            : t('maintenance.irregular')}
                        </div>
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        <div className="text-sm text-white">
                          {formatMileageValue(record.current_mileage || record.mileage || 0)}
                        </div>
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        <div className="text-sm text-white">
                          {formatPrice(record.maintenance_cost || record.cost || 0, getCurrency())}
                        </div>
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(record.status)}`}
                        >
                          {getStatusText(record.status)}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap ${isRTL ? 'text-left' : 'text-right'}`}
                      >
                        <div
                          className={`flex items-center ${isRTL ? 'justify-start space-x-reverse space-x-0' : 'justify-end space-x-2'}`}
                        >
                          {record.status !== 'completed' && (
                            <button
                              onClick={() => updateRecordStatus(record, 'completed')}
                              disabled={updatingRecord === record.encrypted_maintenance_id}
                              className="text-green-400 hover:text-green-300 transition-colors"
                              title={t('maintenance.markAsCompleted')}
                            >
                              <CheckCircleIcon className="h-5 w-5" />
                            </button>
                          )}
                          {record.status === 'pending' && (
                            <button
                              onClick={() => updateRecordStatus(record, 'in_progress')}
                              disabled={updatingRecord === record.encrypted_maintenance_id}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                              title={t('maintenance.markAsInProgress')}
                            >
                              <ArrowPathIcon className="h-5 w-5" />
                            </button>
                          )}
                          <Link
                            to="/maintenance"
                            className="text-gray-400 hover:text-white transition-colors"
                            title={t('maintenance.viewAllMaintenance')}
                          >
                            <WrenchIcon className="h-5 w-5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile view */}
            <div className="md:hidden">
              {visibleRecords.map((record, index) => (
                <div
                  key={record.encrypted_maintenance_id || index}
                  className="border-b border-gray-700/50 p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-white font-medium">
                      {record.maintenance_type === 'regular' && record.service_type === 'oil_change'
                        ? t('maintenance.oilChange')
                        : record.description || t('maintenance.generalMaintenance')}
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(record.status)}`}
                    >
                      {getStatusText(record.status)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {t('maintenance.date')}: {formatDate(record.maintenance_date || record.date)}
                  </div>
                  <div className="text-sm text-gray-400">
                    {t('maintenance.mileage')}:{' '}
                    {formatMileageValue(record.current_mileage || record.mileage || 0)}
                  </div>
                  <div className="text-sm text-gray-400">
                    {t('maintenance.cost')}:{' '}
                    {formatPrice(record.maintenance_cost || record.cost || 0, getCurrency())}
                  </div>
                  <div className="mt-3 flex justify-end space-x-3">
                    {record.status !== 'completed' && (
                      <button
                        onClick={() => updateRecordStatus(record, 'completed')}
                        disabled={updatingRecord === record.encrypted_maintenance_id}
                        className="text-green-400 hover:text-green-300 transition-colors flex items-center gap-1"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        <span className="text-xs">{t('maintenance.complete')}</span>
                      </button>
                    )}
                    {record.status === 'pending' && (
                      <button
                        onClick={() => updateRecordStatus(record, 'in_progress')}
                        disabled={updatingRecord === record.encrypted_maintenance_id}
                        className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                      >
                        <ArrowPathIcon className="h-4 w-4" />
                        <span className="text-xs">{t('maintenance.inProgress')}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* View All Button */}
          {hasMoreRecords && !showAllRecords && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowAllRecords(true)}
                className="text-blue-400 hover:text-blue-300 transition-colors font-medium text-sm"
              >
                {t('maintenance.viewAllRecords', { count: maintenanceData.length })}
              </button>
            </div>
          )}
        </>
      )}

      {/* Full Maintenance History Modal */}
      {showAllRecords && maintenanceData.length > 2 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg w-full max-w-4xl shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h3 className="text-xl font-bold text-white">
                {t('maintenance.maintenanceHistoryTitle', { make: car.make, model: car.model })}
              </h3>
              <button
                onClick={() => setShowAllRecords(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <table className="min-w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th
                      className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-400 uppercase tracking-wider`}
                    >
                      {t('maintenance.date')}
                    </th>
                    <th
                      className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-400 uppercase tracking-wider`}
                    >
                      {t('maintenance.service')}
                    </th>
                    <th
                      className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-400 uppercase tracking-wider`}
                    >
                      {t('maintenance.mileage')}
                    </th>
                    <th
                      className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-400 uppercase tracking-wider`}
                    >
                      {t('maintenance.cost')}
                    </th>
                    <th
                      className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-400 uppercase tracking-wider`}
                    >
                      {t('maintenance.status')}
                    </th>
                    <th
                      className={`px-4 py-3 ${isRTL ? 'text-left' : 'text-right'} text-xs font-medium text-gray-400 uppercase tracking-wider`}
                    >
                      {t('maintenance.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {maintenanceData.map((record, index) => (
                    <tr
                      key={record.encrypted_maintenance_id || index}
                      className={`${index % 2 === 0 ? 'bg-gray-900/30' : 'bg-gray-900/70'} hover:bg-gray-700/40`}
                    >
                      <td
                        className={`px-4 py-3 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        <div className="text-sm text-white">
                          {formatDate(record.maintenance_date || record.date)}
                        </div>
                      </td>
                      <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="text-sm text-white">
                          {record.maintenance_type === 'regular' &&
                          record.service_type === 'oil_change'
                            ? t('maintenance.oilChange')
                            : record.description || t('maintenance.generalMaintenance')}
                        </div>
                        <div className="text-xs text-gray-400">
                          {record.maintenance_type === 'regular'
                            ? t('maintenance.regular')
                            : t('maintenance.irregular')}
                        </div>
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        <div className="text-sm text-white">
                          {formatMileageValue(record.current_mileage || record.mileage || 0)}
                        </div>
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        <div className="text-sm text-white">
                          {formatPrice(record.maintenance_cost || record.cost || 0, getCurrency())}
                        </div>
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(record.status)}`}
                        >
                          {getStatusText(record.status)}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap ${isRTL ? 'text-left' : 'text-right'}`}
                      >
                        <div
                          className={`flex items-center ${isRTL ? 'justify-start space-x-reverse space-x-2' : 'justify-end space-x-2'}`}
                        >
                          {record.status !== 'completed' && (
                            <button
                              onClick={() => updateRecordStatus(record, 'completed')}
                              disabled={updatingRecord === record.encrypted_maintenance_id}
                              className="text-green-400 hover:text-green-300 transition-colors"
                              title={t('maintenance.markAsCompleted')}
                            >
                              <CheckCircleIcon className="h-5 w-5" />
                            </button>
                          )}
                          {record.status === 'pending' && (
                            <button
                              onClick={() => updateRecordStatus(record, 'in_progress')}
                              disabled={updatingRecord === record.encrypted_maintenance_id}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                              title={t('maintenance.markAsInProgress')}
                            >
                              <ArrowPathIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-700 p-4 flex justify-end">
              <button
                onClick={() => setShowAllRecords(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceHistoryTab;


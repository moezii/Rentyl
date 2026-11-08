import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../components/context/AuthContext';
import {
  PlusIcon,
  XMarkIcon,
  WrenchIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ClockIcon,
  TrashIcon, // ADD THIS
} from '@heroicons/react/24/outline';
import secureApi from '../../utils/secureApi';
import { formatPrice, getCurrencySymbol } from '../../utils/currencySymbols';
import { useMileageDisplay } from '../../hooks/useMileageDisplay';
import { useLanguage } from '../../contexts/LanguageContext';

const Maintenance = () => {
  const { formatMileageValue, getMileageUnit } = useMileageDisplay();
  const { t, isRTL } = useLanguage();
  const [companyCurrency, setCompanyCurrency] = useState('');
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalCost: 0,
    pendingCount: 0,
    completedCount: 0,
    inProgressCount: 0,
  });

  // Default oil change price
  const DEFAULT_OIL_CHANGE_PRICE = 0;

  const [formData, setFormData] = useState({
    car_id: '',
    maintenance_type: 'regular',
    service_type: 'oil_change',
    description: '',
    cost: DEFAULT_OIL_CHANGE_PRICE,
    date: new Date().toISOString().split('T')[0],
    status: 'pending',
    notes: '',
    current_mileage: '',
  });

  const [showOtherDescription, setShowOtherDescription] = useState(false);
  const [cars, setCars] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [maintenanceSuccess, setMaintenanceSuccess] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editSuccess, setEditSuccess] = useState(false);
  const [updatingRecordId, setUpdatingRecordId] = useState(null);
  const [showNotePopup, setShowNotePopup] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  // Only use loading for cars, loadingRecords for records list
  const [loadingRecords, setLoadingRecords] = useState(true);

  const getCurrency = () => companyCurrency || '';
  const getRecordCurrency = record =>
    record?.currency || record?.car?.currency || companyCurrency || '';
  const getDisplayCurrency = () =>
    companyCurrency ||
    maintenanceRecords.find(r => r?.currency)?.currency ||
    maintenanceRecords.find(r => r?.car?.currency)?.car?.currency ||
    '';

  // Get company currency from AuthContext
  const { company } = useContext(AuthContext);

  useEffect(() => {
    if (company?.currency && !companyCurrency) {
      setCompanyCurrency(company.currency);
    }
  }, [company, companyCurrency]);

  useEffect(() => {
    fetchMaintenanceRecords();
    fetchCarsInMaintenance();
  }, []);

  // Reset cost when maintenance type changes
  useEffect(() => {
    if (formData.maintenance_type === 'regular' && formData.service_type === 'oil_change') {
      setFormData(prev => ({ ...prev, cost: DEFAULT_OIL_CHANGE_PRICE }));
    }
  }, [formData.maintenance_type, formData.service_type]);

  // Handle "Other" service type selection
  useEffect(() => {
    setShowOtherDescription(formData.service_type === 'other');
  }, [formData.service_type]);

  const fetchMaintenanceRecords = async () => {
    try {
      setLoadingRecords(true);
      const response = await secureApi.get('/maintenance/');
      if (response.data && response.data.data) {
        let derivedCurrency = companyCurrency;
        let derivedCompanyId = '';
        const recordsWithCars = await Promise.all(
          response.data.data.map(async record => {
            if (!record.car || !record.car.license_plate) {
              try {
                const encryptedCarId = record.encrypted_car_id || record.car_id;
                const carResponse = await secureApi.get(`/cars/${encryptedCarId}`);
                if (carResponse.data) {
                  if (!derivedCurrency && carResponse.data.currency) {
                    derivedCurrency = carResponse.data.currency;
                  }
                  if (!derivedCompanyId && carResponse.data.company_id) {
                    derivedCompanyId = carResponse.data.company_id;
                  }
                  return {
                    ...record,
                    car: {
                      license_plate: carResponse.data.license_plate,
                      make: carResponse.data.make,
                      model: carResponse.data.model,
                      year: carResponse.data.year,
                      current_mileage: carResponse.data.current_mileage || 0,
                      currency: carResponse.data.currency,
                      company_id: carResponse.data.company_id,
                    },
                  };
                }
              } catch (err) {}
            } else {
              if (!derivedCurrency && (record.currency || record.car?.currency)) {
                derivedCurrency = record.currency || record.car.currency;
              }
              if (!derivedCompanyId && record.car?.company_id) {
                derivedCompanyId = record.car.company_id;
              }
              return record;
            }
            return record;
          })
        );
        setMaintenanceRecords(recordsWithCars);
        calculateStats(recordsWithCars);
        if (!companyCurrency) {
          const currencyFromRecords =
            derivedCurrency ||
            recordsWithCars.find(r => r.currency)?.currency ||
            recordsWithCars.find(r => r.car?.currency)?.car?.currency;
          if (currencyFromRecords) {
            setCompanyCurrency(currencyFromRecords);
          } else if (derivedCompanyId) {
            try {
              const companyResponse = await secureApi.get(`/companies/${derivedCompanyId}`);
              if (companyResponse.data?.currency) {
                setCompanyCurrency(companyResponse.data.currency);
              }
            } catch (err) {
              console.warn('Failed to fetch company currency via maintenance company_id:', err);
            }
          }
        }
      } else {
        setMaintenanceRecords([]);
      }
    } catch (err) {
      setError('Failed to fetch maintenance records. Please try again.');
    } finally {
      setLoadingRecords(false);
    }
  };

  // Delete record function
  const handleDeleteRecord = async record => {
    if (!record.encrypted_maintenance_id) {
      setError(t('maintenance.cannotDeleteMissingId'));
      return;
    }

    try {
      setDeleting(true);
      console.log(`Deleting maintenance record ${record.maintenance_id}`);

      const response = await secureApi.delete(`/maintenance/${record.encrypted_maintenance_id}`);

      if (response.status === 200 || response.data) {
        // Remove the record from local state
        const updatedRecords = maintenanceRecords.filter(
          item => item.encrypted_maintenance_id !== record.encrypted_maintenance_id
        );
        setMaintenanceRecords(updatedRecords);
        calculateStats(updatedRecords);

        // Close confirmation modal
        setShowDeleteConfirm(false);
        setRecordToDelete(null);
        setError(null);
      }
    } catch (err) {
      console.error('Error deleting maintenance record:', err);
      setError(
        t('maintenance.failedToDeleteRecord', { error: err.response?.data?.detail || err.message })
      );
    } finally {
      setDeleting(false);
    }
  };

  // Show delete confirmation
  const confirmDelete = record => {
    setRecordToDelete(record);
    setShowDeleteConfirm(true);
  };

  const showNoteDetails = record => {
    setSelectedNote({
      note: record.notes,
      vehicle: `${record.car?.make} ${record.car?.model}`,
      licenseplate: record.car?.license_plate,
      date: formatDate(record.maintenance_date || record.date),
    });
    setShowNotePopup(true);
  };

  const fetchCarsInMaintenance = async () => {
    try {
      setLoading(true);

      // Fetch cars that are specifically marked for maintenance
      const carsResponse = await secureApi.get('/cars/');
      if (carsResponse.data && Array.isArray(carsResponse.data)) {
        const maintenanceCars = carsResponse.data
          .filter(car => car.status === 'maintenance')
          .map(car => ({
            car_id: car.car_id?.toString(),
            make: car.make || '',
            model: car.model || '',
            year: car.year || new Date().getFullYear(),
            license_plate: car.license_plate || '',
            current_mileage: car.current_mileage || 0,
            image_url: car.image_url || '',
          }));

        setCars(maintenanceCars);

        if (maintenanceCars.length === 0) {
          console.log('No cars marked for maintenance found');
        }
      }
    } catch (err) {
      console.error('Error fetching cars in maintenance:', err);
      setError('Failed to fetch maintenance vehicles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = records => {
    const stats = {
      totalCost: 0,
      pendingCount: 0,
      completedCount: 0,
      inProgressCount: 0,
    };

    // Get current month and year
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let derivedCurrency = companyCurrency;

    records.forEach(record => {
      const recordDate = new Date(record.maintenance_date || record.date);
      const isCurrentMonth =
        recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;

      // Only count costs from current month
      if (isCurrentMonth) {
        stats.totalCost += parseFloat(record.maintenance_cost || record.cost || 0);
        if (!derivedCurrency) {
          derivedCurrency =
            record.currency ||
            record.car?.currency ||
            records.find(r => r.currency)?.currency ||
            records.find(r => r.car?.currency)?.car?.currency;
        }
      }

      if (record.status === 'pending') stats.pendingCount++;
      else if (record.status === 'completed') stats.completedCount++;
      else if (record.status === 'in_progress') stats.inProgressCount++;
    });

    setStats(stats);
    if (!companyCurrency && derivedCurrency) {
      setCompanyCurrency(derivedCurrency);
    }
  };

  // Replace the handleSubmit function in Maintenance.jsx with this updated version
  // Updated handleSubmit function that matches the new database schema

  const handleSubmit = async e => {
    e.preventDefault();

    if (!formData.car_id) {
      setError(t('maintenance.pleaseSelectVehicle'));
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Get current car details
      const selectedCar = cars.find(car => car.car_id === formData.car_id);

      // Format the date as ISO string (YYYY-MM-DD)
      const formattedDate = formData.date ? formData.date : new Date().toISOString().split('T')[0];

      // Prepare maintenance data according to backend expectations
      const maintenanceData = {
        car_id: parseInt(formData.car_id), // Ensure this is an integer
        maintenance_cost: parseFloat(formData.cost), // Match backend field name
        maintenance_date: formattedDate, // Properly formatted date string
        description: formData.description || '',
        created_by: 'admin', // This is a TEXT field now, not UUID

        // Additional fields
        maintenance_type: formData.maintenance_type,
        service_type: formData.service_type,
        status: formData.status, // Use the status from formData
        notes: formData.notes || '',
        current_mileage: selectedCar?.current_mileage || parseInt(formData.current_mileage) || 0,
      };

      console.log('Sending maintenance data:', maintenanceData);

      // Submit maintenance record
      const response = await secureApi.post('/maintenance/', maintenanceData);

      if (response.data) {
        console.log('Maintenance record created:', response.data);

        // Add the newly created record to the list
        const newRecord = {
          ...(response.data.data?.[0] || response.data.data || response.data),
          car: selectedCar,
        };

        setMaintenanceRecords(prev => [newRecord, ...prev]);
        calculateStats([newRecord, ...maintenanceRecords]);

        // Reset form
        setFormData({
          car_id: '',
          maintenance_type: 'regular',
          service_type: 'oil_change',
          description: '',
          cost: DEFAULT_OIL_CHANGE_PRICE,
          date: new Date().toISOString().split('T')[0],
          status: 'pending',
          notes: '',
          current_mileage: '',
        });

        // Show success message
        setMaintenanceSuccess(true);
        setTimeout(() => {
          setMaintenanceSuccess(false);
          setShowForm(false);
        }, 2000);

        // Note: We no longer automatically change the car status to available
        // This allows maintenance records to accumulate and the car stays in maintenance until manually changed

        // Refresh cars list to show the latest state
        await fetchCarsInMaintenance();
      }
    } catch (err) {
      console.error('Error creating maintenance record:', err);
      console.error('Error details:', err.response?.data);

      let errorMsg = t('maintenance.failedToCreateRecord');
      if (err.response?.data) {
        errorMsg =
          typeof err.response.data === 'string'
            ? err.response.data
            : err.response.data.detail || JSON.stringify(err.response.data);
      }

      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = record => {
    // Set the form data with the record values
    setFormData({
      car_id: record.car_id?.toString() || '',
      maintenance_type: record.maintenance_type || 'regular',
      service_type: record.service_type || 'oil_change',
      description: record.description || '',
      cost: record.maintenance_cost || record.cost || DEFAULT_OIL_CHANGE_PRICE,
      date: record.maintenance_date || record.date || new Date().toISOString().split('T')[0],
      status: record.status || 'pending',
      notes: record.notes || '',
      current_mileage: record.current_mileage || '',
    });

    // Set the record being edited
    setEditingRecord(record);

    // Open the edit form
    setShowEditForm(true);
  };

  const handleUpdateSubmit = async e => {
    e.preventDefault();

    if (!formData.car_id) {
      setError(t('maintenance.pleaseSelectVehicle'));
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Get current car details
      const selectedCar = cars.find(car => car.car_id === formData.car_id) || editingRecord.car;

      // Format the date as ISO string (YYYY-MM-DD)
      const formattedDate = formData.date ? formData.date : new Date().toISOString().split('T')[0];

      // Prepare maintenance data according to backend expectations
      const maintenanceData = {
        car_id: parseInt(formData.car_id), // Ensure this is an integer
        maintenance_cost: parseFloat(formData.cost), // Match backend field name
        maintenance_date: formattedDate, // Properly formatted date string
        description: formData.description || '',
        edited_by: 'admin', // This is a TEXT field now, not UUID

        // Additional fields
        maintenance_type: formData.maintenance_type,
        service_type: formData.service_type,
        status: formData.status,
        notes: formData.notes || '',
        current_mileage: selectedCar?.current_mileage || parseInt(formData.current_mileage) || 0,
      };

      console.log(
        `Updating maintenance record ${editingRecord.encrypted_maintenance_id}:`,
        maintenanceData
      );

      // Submit maintenance record update
      const response = await secureApi.put(
        `/maintenance/${editingRecord.encrypted_maintenance_id}`,
        maintenanceData
      );

      if (response.data) {
        console.log('Maintenance record updated:', response.data);

        // Create updated record
        const updatedRecord = {
          ...editingRecord,
          ...maintenanceData,
          car: selectedCar,
        };

        // Update the record in the maintenance records list
        setMaintenanceRecords(prev =>
          prev.map(record =>
            record.encrypted_maintenance_id === editingRecord.encrypted_maintenance_id
              ? updatedRecord
              : record
          )
        );

        // Recalculate stats
        calculateStats(
          maintenanceRecords.map(record =>
            record.encrypted_maintenance_id === editingRecord.encrypted_maintenance_id
              ? updatedRecord
              : record
          )
        );

        // Show success message
        setEditSuccess(true);
        setTimeout(() => {
          setEditSuccess(false);
          setShowEditForm(false);
          setEditingRecord(null);
        }, 2000);
      }
    } catch (err) {
      console.error('Error updating maintenance record:', err);
      console.error('Error details:', err.response?.data);

      let errorMsg = t('maintenance.failedToUpdateRecord');
      if (err.response?.data) {
        errorMsg =
          typeof err.response.data === 'string'
            ? err.response.data
            : err.response.data.detail || JSON.stringify(err.response.data);
      }

      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = e => {
    const { name, value } = e.target;

    // For oil change selection, set default price
    if (name === 'service_type' && value === 'oil_change') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        cost: DEFAULT_OIL_CHANGE_PRICE,
      }));
    } else if (name === 'car_id') {
      const selectedCar = cars.find(car => car.car_id === value);

      setFormData(prev => ({
        ...prev,
        [name]: value,
        current_mileage: selectedCar?.current_mileage || '',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const getStatusBadge = status => {
    switch (status) {
      case 'pending':
        return (
          <span
            className={`inline-flex items-center whitespace-nowrap bg-yellow-900/30 text-yellow-300 px-3 py-1 rounded-full text-sm ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <ClockIcon className="h-4 w-4" />
            <span className={`${isRTL ? 'mr-2' : 'ml-1'} whitespace-nowrap`}>
              {t('maintenance.pending')}
            </span>
          </span>
        );
      case 'in_progress':
        return (
          <span
            className={`inline-flex items-center whitespace-nowrap bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full text-sm ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <ArrowPathIcon className="h-4 w-4" />
            <span className={`${isRTL ? 'mr-2' : 'ml-1'} whitespace-nowrap`}>
              {t('maintenance.inProgress')}
            </span>
          </span>
        );
      case 'completed':
        return (
          <span
            className={`inline-flex items-center gap-1 bg-green-900/30 text-green-300 px-3 py-1 rounded-full text-sm ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <CheckCircleIcon className="h-4 w-4" />
            {t('maintenance.completed')}
          </span>
        );
      default:
        return (
          <span
            className={`flex items-center gap-1 bg-gray-900/30 text-gray-300 px-3 py-1 rounded-full text-sm ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {status}
          </span>
        );
    }
  };

  const filteredRecords = maintenanceRecords.filter(record => {
    const matchesFilter = filter === 'all' || record.status === filter;

    const carPlate = record.car?.license_plate || '';
    const carMake = record.car?.make || '';
    const carModel = record.car?.model || '';
    const description = record.description || '';

    const matchesSearch =
      carPlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carMake.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      description.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Format date
  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Helper function to translate maintenance descriptions
  const translateDescription = record => {
    // Remove "Oil and filter change" completely - show empty instead
    if (record.description === 'Oil and filter change') {
      return '';
    }

    // If no description, show empty
    if (!record.description) {
      return '';
    }

    return record.description;
  };

  // Access navigation functionality

  // New function to quickly update maintenance record status
  const updateRecordStatus = async (record, newStatus) => {
    if (!record.encrypted_maintenance_id) {
      console.error('Cannot update record - missing encrypted_maintenance_id', record);
      return;
    }

    try {
      setUpdatingRecordId(record.encrypted_maintenance_id);

      const updateData = {
        ...record,
        status: newStatus,
        edited_by: 'admin',
        edited_at: new Date().toISOString(),
      };

      const response = await secureApi.put(
        `/maintenance/${record.encrypted_maintenance_id}`,
        updateData
      );

      if (response.data) {
        // Update local state
        const updatedRecords = maintenanceRecords.map(item =>
          item.encrypted_maintenance_id === record.encrypted_maintenance_id
            ? { ...item, status: newStatus }
            : item
        );

        setMaintenanceRecords(updatedRecords);
        calculateStats(updatedRecords);

        console.log(`Updated record ${record.encrypted_maintenance_id} status to ${newStatus}`);

        // Update the car status
        if (record.car && record.car.car_id) {
          try {
            console.log(`Updating car ${record.car.car_id} status to available`);

            // First get the current car data
            const encryptedCarId = record.encrypted_car_id || record.car_id;
            const carResponse = await secureApi.get(`/cars/${encryptedCarId}`);
            const currentCarData = carResponse.data;

            if (currentCarData) {
              // Create form data with all the current car details but change status to available
              const formData = new FormData();
              formData.append('make', currentCarData.make);
              formData.append('model', currentCarData.model);
              formData.append('year', currentCarData.year.toString());
              formData.append('color', currentCarData.color);
              formData.append('license_plate', currentCarData.license_plate);
              formData.append('type', currentCarData.type);
              // Set car status based on maintenance status
              const carStatus = newStatus === 'completed' ? 'available' : 'maintenance';
              formData.append('status', carStatus);
              formData.append('current_mileage', currentCarData.current_mileage.toString());
              formData.append('daily_rate', currentCarData.daily_rate.toString());

              if (currentCarData.description) {
                formData.append('description', currentCarData.description);
              }

              if (currentCarData.registration_expiry_date) {
                formData.append(
                  'registration_expiry_date',
                  currentCarData.registration_expiry_date
                );
              }
              if (currentCarData.insurance_expiry_date) {
                formData.append('insurance_expiry_date', currentCarData.insurance_expiry_date);
              }

              // Include oil change tracking fields if they exist
              if (currentCarData.oil_change_tracking !== undefined) {
                formData.append(
                  'oil_change_tracking',
                  currentCarData.oil_change_tracking.toString()
                );
              }
              if (currentCarData.last_oil_change_mileage !== undefined) {
                formData.append(
                  'last_oil_change_mileage',
                  currentCarData.last_oil_change_mileage.toString()
                );
              }
              if (currentCarData.oil_change_interval !== undefined) {
                formData.append(
                  'oil_change_interval',
                  currentCarData.oil_change_interval.toString()
                );
              }

              // Update the car
              const updateResponse = await secureApi.put(`/cars/${record.car.car_id}`, formData, {
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
              });

              console.log('Car status update response:', updateResponse);

              // Force refresh the car details page if the user goes to it
              // This creates a timestamp that will trigger a refresh when the user navigates to the car details
              const statusKey = newStatus === 'in_progress' ? 'inProgress' : newStatus;
              const translatedStatus = t(`maintenance.${statusKey}`);
              if (
                window.confirm(
                  t('maintenance.maintenanceRecordUpdated', { status: translatedStatus })
                )
              ) {
                const encryptedCarId = record.encrypted_car_id || (record.car && record.car.encrypted_car_id) || record.car_id;
                navigate(`/cars/${encryptedCarId}`, {
                  state: { refresh: true, timestamp: Date.now() },
                });
              }
            }
          } catch (carErr) {
            console.error('Error updating car status:', carErr);
            // Don't alert here to avoid confusing the user - the maintenance record was still updated
          }
        }
      }
    } catch (err) {
      console.error('Error updating maintenance record:', err);
      alert(`Failed to update record: ${err.message || 'Unknown error'}`);
    } finally {
      setUpdatingRecordId(null);
    }
  };

  if (loading && maintenanceRecords.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div
            className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}
          >
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h1 className="text-3xl font-bold">{t('maintenance.title')}</h1>
              <p className="text-gray-400 mt-1">{t('maintenance.subtitle')}</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className={`bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl ${isRTL ? 'flex-row-reverse' : ''}`}
              disabled={cars.length === 0}
            >
              <PlusIcon className={`h-5 w-5 ${isRTL ? 'ml-2 mr-0' : 'mr-2 ml-0'}`} />
              {t('maintenance.newMaintenanceRecord')}
            </button>
          </div>
        </div>

        {cars.length === 0 && !loading && (
          <div
            className={`bg-blue-900/30 text-blue-300 p-4 rounded-lg mb-6 ${isRTL ? 'text-right' : 'text-left'}`}
          >
            {t('maintenance.noVehiclesForMaintenance')}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Cost Card */}
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl p-6 border border-gray-700/50 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
            <div
              className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <h3 className="text-gray-300 font-medium">{t('maintenance.totalCosts')}</h3>
              <div className="bg-blue-900/30 p-2 rounded-lg">
                <WrenchIcon className="h-6 w-6 text-blue-300" />
              </div>
            </div>
            <p className={`text-3xl font-bold text-white ${isRTL ? 'text-right' : 'text-left'}`}>
              {formatPrice(stats.totalCost, getDisplayCurrency())}
            </p>
            <p className={`text-gray-400 text-sm mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('maintenance.thisMonthExpenses')}
            </p>
          </div>

          {/* Pending Tasks Card */}
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl p-6 border border-gray-700/50 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
            <div
              className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <h3 className="text-gray-300 font-medium">{t('maintenance.pendingTasks')}</h3>
              <div className="bg-yellow-900/30 p-2 rounded-lg">
                <ClockIcon className="h-6 w-6 text-yellow-300" />
              </div>
            </div>
            <p className={`text-3xl font-bold text-white ${isRTL ? 'text-right' : 'text-left'}`}>
              {stats.pendingCount}
            </p>
            <p className={`text-gray-400 text-sm mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('maintenance.tasksAwaitingService')}
            </p>
          </div>

          {/* In Progress Card */}
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl p-6 border border-gray-700/50 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
            <div
              className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <h3 className="text-gray-300 font-medium">{t('maintenance.inProgress')}</h3>
              <div className="bg-blue-900/30 p-2 rounded-lg">
                <ArrowPathIcon className="h-6 w-6 text-blue-300" />
              </div>
            </div>
            <p className={`text-3xl font-bold text-white ${isRTL ? 'text-right' : 'text-left'}`}>
              {stats.inProgressCount}
            </p>
            <p className={`text-gray-400 text-sm mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('maintenance.tasksInProgress')}
            </p>
          </div>

          {/* Completed Card */}
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl p-6 border border-gray-700/50 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
            <div
              className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <h3 className="text-gray-300 font-medium">{t('maintenance.completed')}</h3>
              <div className="bg-green-900/30 p-2 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-green-300" />
              </div>
            </div>
            <p className={`text-3xl font-bold text-white ${isRTL ? 'text-right' : 'text-left'}`}>
              {stats.completedCount}
            </p>
            <p className={`text-gray-400 text-sm mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('maintenance.completedServices')}
            </p>
          </div>
        </div>

        {error && (
          <div
            className={`bg-red-900/30 text-red-300 p-4 rounded-lg mb-6 ${isRTL ? 'text-right' : 'text-left'}`}
          >
            {error}
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl p-6 mb-6 border border-gray-700/50 shadow-lg">
          <div
            className={`flex flex-col md:flex-row gap-4 items-center mb-6 ${isRTL ? 'md:flex-row-reverse' : ''}`}
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={t('maintenance.searchMaintenance')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`w-full bg-gray-700/50 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'pr-14 pl-6 text-right' : 'pl-14 pr-6 text-left'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
                style={isRTL ? { textAlign: 'right', paddingRight: '60px' } : {}}
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 absolute top-2.5 text-gray-400 ${isRTL ? 'right-5' : 'left-5'}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            <div className={`flex flex-wrap gap-2 ${isRTL ? 'space-x-reverse' : ''}`}>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {t('maintenance.all')}
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'pending'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {t('maintenance.pending')}
              </button>
              <button
                onClick={() => setFilter('in_progress')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'in_progress'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {t('maintenance.inProgress')}
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'completed'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {t('maintenance.completed')}
              </button>
            </div>
          </div>

          {/* Maintenance Records Table or Loading Spinner (always show spinner on initial load) */}
          {loadingRecords ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className={`text-center py-12 ${isRTL ? 'text-right' : 'text-left'}`}>
              <WrenchIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                {t('maintenance.noMaintenanceFound')}
              </h3>
              <p className="text-gray-400">
                {searchTerm
                  ? t('maintenance.tryAdjustingSearch')
                  : filter !== 'all'
                    ? t('maintenance.noMaintenanceRecords', {
                        status:
                          filter === 'in_progress'
                            ? t('maintenance.inProgress')
                            : t(`maintenance.${filter}`),
                      })
                    : t('maintenance.createFirstRecord')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b border-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <th
                      className={`pb-3 px-4 font-semibold text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      {t('maintenance.vehicle')}
                    </th>
                    <th
                      className={`pb-3 px-4 font-semibold text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      {t('maintenance.service')}
                    </th>
                    <th
                      className={`pb-3 px-4 font-semibold text-gray-400 hidden md:table-cell ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      {t('maintenance.date')}
                    </th>
                    <th
                      className={`pb-3 px-4 font-semibold text-gray-400 hidden lg:table-cell ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      {t('maintenance.mileage')}
                    </th>
                    <th
                      className={`pb-3 px-4 font-semibold text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      {t('maintenance.cost')}
                    </th>
                    <th className="pb-3 px-4 font-semibold text-gray-400 text-center">
                      {t('maintenance.status')}
                    </th>
                    <th
                      className={`pb-3 px-4 font-semibold text-gray-400 ${isRTL ? 'text-left' : 'text-right'}`}
                    >
                      {t('maintenance.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, index) => (
                    <tr
                      key={record.encrypted_maintenance_id || index}
                      className="border-b border-gray-700/50 hover:bg-gray-900/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div
                          className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <div className="w-16 h-16 rounded-lg bg-gray-700/50 flex items-center justify-center flex-shrink-0">
                            {record.car?.image_url ? (
                              <img
                                src={record.car.image_url}
                                alt={`${record.car?.make} ${record.car?.model}`}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                            ) : (
                              <WrenchIcon className="h-8 w-8 text-gray-400" />
                            )}
                          </div>
                          <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                            <div className="font-medium text-white">
                              {record.car?.make} {record.car?.model}
                            </div>
                            <div className="text-sm text-gray-400">
                              {record.car?.license_plate || t('common.noPlateAssigned')}
                            </div>
                          </div>
                          {record.notes && record.notes.trim() && (
                            <button
                              onClick={() => showNoteDetails(record)}
                              className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 hover:text-amber-300 transition-all duration-200 flex items-center justify-center group relative"
                              title={t('maintenance.viewNotes')}
                            >
                              <ExclamationTriangleIcon className="h-4 w-4" />
                              {/* Tooltip */}
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                {t('maintenance.viewNotes')}
                              </div>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className={`py-4 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="font-medium text-white">{translateDescription(record)}</div>
                        <div className="text-sm text-gray-400">
                          {record.maintenance_type === 'regular'
                            ? t('maintenance.regularService')
                            : t('maintenance.irregularService')}
                        </div>
                      </td>
                      <td
                        className={`py-4 px-4 hidden md:table-cell text-gray-300 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {formatDate(record.maintenance_date || record.date)}
                      </td>
                      <td
                        className={`py-4 px-4 hidden lg:table-cell text-gray-300 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {formatMileageValue(record.current_mileage || record.mileage || 0)}
                      </td>
                      <td
                        className={`py-4 px-4 text-gray-300 font-medium ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {formatPrice(
                          parseFloat(record.maintenance_cost || record.cost || 0),
                          getRecordCurrency(record)
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">{getStatusBadge(record.status)}</td>
                      <td className={`py-4 px-4 ${isRTL ? 'text-left' : 'text-right'}`}>
                        <div
                          className={`flex items-center gap-2 ${isRTL ? 'justify-start flex-row-reverse' : 'justify-end'}`}
                        >
                          {/* Action buttons with icons */}
                          <div className={`flex gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            {record.status !== 'completed' && (
                              <button
                                onClick={() => updateRecordStatus(record, 'completed')}
                                disabled={updatingRecordId === record.encrypted_maintenance_id}
                                className="p-2 rounded-lg bg-green-900/20 text-green-400 hover:bg-green-900/30 hover:text-green-300 transition-all duration-200 flex items-center justify-center"
                                title={t('maintenance.markCompleted')}
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                              </button>
                            )}

                            {record.status === 'pending' && (
                              <button
                                onClick={() => updateRecordStatus(record, 'in_progress')}
                                disabled={updatingRecordId === record.encrypted_maintenance_id}
                                className="p-2 rounded-lg bg-blue-900/20 text-blue-400 hover:bg-blue-900/30 hover:text-blue-300 transition-all duration-200 flex items-center justify-center"
                                title={t('maintenance.markInProgress')}
                              >
                                <ArrowPathIcon className="h-4 w-4" />
                              </button>
                            )}

                            <button
                              onClick={() => confirmDelete(record)}
                              className="p-2 rounded-lg bg-red-900/20 text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-all duration-200 flex items-center justify-center"
                              title={t('maintenance.delete')}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Text buttons */}
                          <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Link
                              to={`/cars/${record.encrypted_car_id || (record.car && record.car.encrypted_car_id) || record.car_id}`}
                              className="px-3 py-1 text-xs rounded-md bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-200 whitespace-nowrap"
                            >
                              {t('maintenance.viewCar')}
                            </Link>
                            {record.status !== 'completed' && (
                              <button
                                onClick={() => handleEditClick(record)}
                                className="px-3 py-1 text-xs rounded-md bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-200 whitespace-nowrap"
                              >
                                {t('maintenance.edit')}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Maintenance Record Modal */}
      {showForm && (
        <>
          <style>
            {`
              /* Hide number input arrows */
              input[type="number"]::-webkit-outer-spin-button,
              input[type="number"]::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
              }
              
              input[type="number"] {
                -moz-appearance: textfield;
              }
            `}
          </style>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl w-full max-w-2xl shadow-2xl border border-gray-700/50 relative">
              {/* Modal Header */}
              <div className="border-b border-gray-700/50 p-6">
                <div
                  className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <h2
                    className={`text-2xl font-bold text-white ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {maintenanceSuccess
                      ? t('maintenance.recordCreated')
                      : t('maintenance.createMaintenanceRecord')}
                  </h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-gray-400 hover:text-white transition-colors p-1"
                    aria-label={t('common.close')}
                    disabled={isSubmitting}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {maintenanceSuccess ? (
                  <div
                    className={`flex flex-col items-center justify-center py-8 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <div
                      className={`bg-green-900/30 p-4 rounded-full ${isRTL ? 'mb-4 mx-8' : 'mb-4'}`}
                    >
                      <CheckCircleIcon className="h-16 w-16 text-green-400" />
                    </div>
                    <h3 className={`text-xl font-bold text-white ${isRTL ? 'mb-8 px-4' : 'mb-6'}`}>
                      {t('maintenance.recordCreated')}
                    </h3>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
                    {error && (
                      <div
                        className={`bg-red-900/30 text-red-300 p-4 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {error}
                      </div>
                    )}

                    {/* Car Selection */}
                    <div>
                      <label
                        className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {t('maintenance.selectVehicle')} *
                      </label>
                      <select
                        name="car_id"
                        value={formData.car_id}
                        onChange={handleInputChange}
                        className={`w-full bg-gray-700/50 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                        required
                        disabled={isSubmitting || cars.length === 0}
                      >
                        <option value="">{t('maintenance.selectVehicle')}</option>
                        {cars.map(car => (
                          <option key={car.car_id} value={car.car_id}>
                            {car.make} {car.model} ({car.license_plate}) -{' '}
                            {formatMileageValue(car.current_mileage)}
                          </option>
                        ))}
                      </select>
                      {cars.length === 0 && (
                        <p
                          className={`text-yellow-400 text-sm mt-2 ${isRTL ? 'text-right' : 'text-left'}`}
                        >
                          {t('maintenance.noVehiclesForMaintenance')}
                        </p>
                      )}
                    </div>

                    {/* Maintenance Type */}
                    <div>
                      <label
                        className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {t('maintenance.maintenanceType')} *
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData(prev => ({
                              ...prev,
                              maintenance_type: 'regular',
                              service_type: 'oil_change',
                              cost: DEFAULT_OIL_CHANGE_PRICE,
                              description: '',
                            }))
                          }
                          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border ${
                            formData.maintenance_type === 'regular'
                              ? 'border-blue-500 bg-blue-900/30 text-white'
                              : 'border-gray-600 bg-gray-700/50 text-gray-300'
                          } ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <CheckCircleIcon
                            className={`h-5 w-5 ${
                              formData.maintenance_type === 'regular'
                                ? 'text-blue-400'
                                : 'text-gray-400'
                            }`}
                          />
                          {t('maintenance.regular')}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData(prev => ({
                              ...prev,
                              maintenance_type: 'irregular',
                              service_type: 'other',
                              cost: '',
                              description: '',
                            }))
                          }
                          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border ${
                            formData.maintenance_type === 'irregular'
                              ? 'border-blue-500 bg-blue-900/30 text-white'
                              : 'border-gray-600 bg-gray-700/50 text-gray-300'
                          } ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <WrenchIcon
                            className={`h-5 w-5 ${
                              formData.maintenance_type === 'irregular'
                                ? 'text-blue-400'
                                : 'text-gray-400'
                            }`}
                          />
                          {t('maintenance.irregular')}
                        </button>
                      </div>
                    </div>

                    {/* Service Type - Only for Regular Maintenance */}
                    {formData.maintenance_type === 'regular' && (
                      <div>
                        <label
                          className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                        >
                          {t('maintenance.serviceType')} *
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() =>
                              setFormData(prev => ({
                                ...prev,
                                service_type: 'oil_change',
                                cost: DEFAULT_OIL_CHANGE_PRICE,
                                description: '',
                              }))
                            }
                            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border ${
                              formData.service_type === 'oil_change'
                                ? 'border-blue-500 bg-blue-900/30 text-white'
                                : 'border-gray-600 bg-gray-700/50 text-gray-300'
                            } ${isRTL ? 'flex-row-reverse' : ''}`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className={`h-5 w-5 ${
                                formData.service_type === 'oil_change'
                                  ? 'text-blue-400'
                                  : 'text-gray-400'
                              }`}
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5z" />
                              <path d="M11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                            {t('maintenance.oilChange')}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData(prev => ({
                                ...prev,
                                service_type: 'other',
                                cost: '',
                                description: '',
                              }))
                            }
                            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border ${
                              formData.service_type === 'other'
                                ? 'border-blue-500 bg-blue-900/30 text-white'
                                : 'border-gray-600 bg-gray-700/50 text-gray-300'
                            } ${isRTL ? 'flex-row-reverse' : ''}`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className={`h-5 w-5 ${
                                formData.service_type === 'other'
                                  ? 'text-blue-400'
                                  : 'text-gray-400'
                              }`}
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {t('maintenance.other')}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Description - Only for "Other" service type or Irregular maintenance */}
                    {(formData.service_type === 'other' ||
                      formData.maintenance_type === 'irregular') && (
                      <div>
                        <label
                          className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                        >
                          {t('maintenance.description')} *
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          className={`w-full bg-gray-700/50 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                          dir={isRTL ? 'rtl' : 'ltr'}
                          rows="3"
                          required
                          placeholder={t('maintenance.describeService')}
                        />
                      </div>
                    )}

                    {/* Cost */}
                    <div>
                      <label
                        className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {t('maintenance.cost')} ({getCurrencySymbol(companyCurrency)}) *
                      </label>
                      <input
                        type="number"
                        name="cost"
                        value={formData.cost}
                        onChange={handleInputChange}
                        className={`w-full bg-gray-700/50 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                        required
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Date */}
                    <div>
                      <label
                        className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {t('maintenance.date')} *
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        className={`w-full bg-gray-700/50 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                        required
                      />
                    </div>

                    {/* Status Selection - Only available in edit mode */}
                    <div>
                      <label
                        className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {t('maintenance.status')} *
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className={`w-full bg-gray-700/50 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                        required
                      >
                        <option value="pending">{t('maintenance.pending')}</option>
                        <option value="in_progress">{t('maintenance.inProgress')}</option>
                        <option value="completed">{t('maintenance.completed')}</option>
                      </select>
                    </div>

                    {/* Mileage - Read-only if car is selected */}
                    <div>
                      <label
                        className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {t('maintenance.currentMileage')} ({getMileageUnit()})
                      </label>
                      <input
                        type="number"
                        name="current_mileage"
                        value={formData.current_mileage}
                        onChange={handleInputChange}
                        className={`w-full bg-gray-700/50 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                        placeholder={t('maintenance.currentMileageNote')}
                        readOnly={!!formData.car_id}
                      />
                      {formData.car_id && (
                        <p
                          className={`text-gray-400 text-sm mt-1 ${isRTL ? 'text-right' : 'text-left'}`}
                        >
                          {t('maintenance.mileageAutoFetched')}
                        </p>
                      )}
                    </div>

                    {/* Notes - Optional */}
                    <div>
                      <label
                        className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {t('maintenance.additionalNotes')}
                      </label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        className={`w-full bg-gray-700/50 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                        rows="2"
                        placeholder={t('maintenance.additionalNotesPlaceholder')}
                      />
                    </div>

                    {/* Form Actions */}
                    <div
                      className={`flex gap-4 pt-4 border-t border-gray-700/50 ${isRTL ? 'justify-start flex-row-reverse' : 'justify-end'}`}
                    >
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                        disabled={isSubmitting}
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="submit"
                        className={`bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2 rounded-lg transition-all duration-300 shadow-lg flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                        disabled={isSubmitting || !formData.car_id}
                      >
                        {isSubmitting ? (
                          <>
                            <svg
                              className="animate-spin h-5 w-5 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            {t('maintenance.creating')}
                          </>
                        ) : (
                          <>
                            <CheckCircleIcon className="h-5 w-5" />
                            {t('maintenance.createRecord')}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Maintenance Record Modal */}
      {showEditForm && (
        <>
          <style>
            {`
              /* Hide number input arrows */
              input[type="number"]::-webkit-outer-spin-button,
              input[type="number"]::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
              }
              
              input[type="number"] {
                -moz-appearance: textfield;
              }
            `}
          </style>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl w-full max-w-2xl shadow-2xl border border-gray-700/50 relative">
              {/* Modal Header */}
              <div className="border-b border-gray-700/50 p-6">
                <div
                  className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <h2
                    className={`text-2xl font-bold text-white ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {editSuccess
                      ? t('maintenance.recordUpdated')
                      : t('maintenance.editMaintenanceRecord')}
                  </h2>
                  <button
                    onClick={() => setShowEditForm(false)}
                    className="text-gray-400 hover:text-white transition-colors p-1"
                    aria-label={t('common.close')}
                    disabled={isSubmitting}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {editSuccess ? (
                  <div
                    className={`flex flex-col items-center justify-center py-8 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <div
                      className={`bg-green-900/30 p-4 rounded-full ${isRTL ? 'mb-4 mx-8' : 'mb-4'}`}
                    >
                      <CheckCircleIcon className="h-16 w-16 text-green-400" />
                    </div>
                    <h3 className={`text-xl font-bold text-white ${isRTL ? 'mb-8 px-4' : 'mb-6'}`}>
                      {t('maintenance.recordUpdated')}
                    </h3>
                  </div>
                ) : (
                  <form
                    onSubmit={handleUpdateSubmit}
                    className="space-y-6"
                    dir={isRTL ? 'rtl' : 'ltr'}
                  >
                    {error && (
                      <div
                        className={`bg-red-900/30 text-red-300 p-4 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {error}
                      </div>
                    )}

                    {/* Car Display (Read-only in edit mode) */}
                    <div>
                      <label
                        className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {t('maintenance.vehicle')}
                      </label>
                      <div
                        className={`w-full bg-gray-700/50 border border-gray-600 text-white px-4 py-2 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {editingRecord.car
                          ? `${editingRecord.car.make} ${editingRecord.car.model} (${editingRecord.car.license_plate}) - ${formatMileageValue(editingRecord.car.current_mileage)}`
                          : t('maintenance.vehicleNotFound')}
                      </div>
                      <p
                        className={`text-gray-400 text-sm mt-1 ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {t('maintenance.carCannotBeChanged')}
                      </p>
                    </div>

                    {/* Maintenance Type */}
                    <div>
                      <label
                        className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {t('maintenance.maintenanceType')} *
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData(prev => ({
                              ...prev,
                              maintenance_type: 'regular',
                              service_type: 'oil_change',
                              cost: DEFAULT_OIL_CHANGE_PRICE,
                              description: '',
                            }))
                          }
                          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border ${
                            formData.maintenance_type === 'regular'
                              ? 'border-blue-500 bg-blue-900/30 text-white'
                              : 'border-gray-600 bg-gray-700/50 text-gray-300'
                          } ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <CheckCircleIcon
                            className={`h-5 w-5 ${
                              formData.maintenance_type === 'regular'
                                ? 'text-blue-400'
                                : 'text-gray-400'
                            }`}
                          />
                          {t('maintenance.regular')}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData(prev => ({
                              ...prev,
                              maintenance_type: 'irregular',
                              service_type: 'other',
                              cost: '',
                              description: '',
                            }))
                          }
                          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border ${
                            formData.maintenance_type === 'irregular'
                              ? 'border-blue-500 bg-blue-900/30 text-white'
                              : 'border-gray-600 bg-gray-700/50 text-gray-300'
                          } ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <WrenchIcon
                            className={`h-5 w-5 ${
                              formData.maintenance_type === 'irregular'
                                ? 'text-blue-400'
                                : 'text-gray-400'
                            }`}
                          />
                          {t('maintenance.irregular')}
                        </button>
                      </div>
                    </div>

                    {/* Service Type - Only for Regular Maintenance */}
                    {formData.maintenance_type === 'regular' && (
                      <div>
                        <label
                          className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                        >
                          {t('maintenance.serviceType')} *
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() =>
                              setFormData(prev => ({
                                ...prev,
                                service_type: 'oil_change',
                                cost: DEFAULT_OIL_CHANGE_PRICE,
                                description: '',
                              }))
                            }
                            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border ${
                              formData.service_type === 'oil_change'
                                ? 'border-blue-500 bg-blue-900/30 text-white'
                                : 'border-gray-600 bg-gray-700/50 text-gray-300'
                            } ${isRTL ? 'flex-row-reverse' : ''}`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className={`h-5 w-5 ${
                                formData.service_type === 'oil_change'
                                  ? 'text-blue-400'
                                  : 'text-gray-400'
                              }`}
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5z" />
                              <path d="M11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                            {t('maintenance.oilChange')}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData(prev => ({
                                ...prev,
                                service_type: 'other',
                                cost: '',
                                description: '',
                              }))
                            }
                            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border ${
                              formData.service_type === 'other'
                                ? 'border-blue-500 bg-blue-900/30 text-white'
                                : 'border-gray-600 bg-gray-700/50 text-gray-300'
                            } ${isRTL ? 'flex-row-reverse' : ''}`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className={`h-5 w-5 ${
                                formData.service_type === 'other'
                                  ? 'text-blue-400'
                                  : 'text-gray-400'
                              }`}
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {t('maintenance.other')}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Description - Only for "Other" service type or Irregular maintenance */}
                    {(formData.service_type === 'other' ||
                      formData.maintenance_type === 'irregular') && (
                      <div>
                        <label
                          className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                        >
                          {t('maintenance.description')} *
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          className={`w-full bg-gray-700/50 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                          dir={isRTL ? 'rtl' : 'ltr'}
                          rows="3"
                          required
                          placeholder={t('maintenance.describeService')}
                        />
                      </div>
                    )}

                    {/* Cost */}
                    <div>
                      <label
                        className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {t('maintenance.cost')} ({getCurrencySymbol(companyCurrency)}) *
                      </label>
                      <input
                        type="number"
                        name="cost"
                        value={formData.cost}
                        onChange={handleInputChange}
                        className={`w-full bg-gray-700/50 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                        required
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Date */}
                    <div>
                      <label
                        className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {t('maintenance.date')} *
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        className={`w-full bg-gray-700/50 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                        required
                      />
                    </div>

                    {/* Status Selection - Only available in edit mode */}
                    <div>
                      <label
                        className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {t('maintenance.status')} *
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className={`w-full bg-gray-700/50 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                        required
                      >
                        <option value="pending">{t('maintenance.pending')}</option>
                        <option value="in_progress">{t('maintenance.inProgress')}</option>
                        <option value="completed">{t('maintenance.completed')}</option>
                      </select>
                    </div>

                    {/* Mileage - Read-only if car is selected */}
                    <div>
                      <label
                        className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {t('maintenance.currentMileage')} ({getMileageUnit()})
                      </label>
                      <input
                        type="number"
                        name="current_mileage"
                        value={formData.current_mileage}
                        onChange={handleInputChange}
                        className={`w-full bg-gray-700/50 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                        placeholder={t('maintenance.currentMileageNote')}
                        readOnly={!!formData.car_id}
                      />
                      {formData.car_id && (
                        <p
                          className={`text-gray-400 text-sm mt-1 ${isRTL ? 'text-right' : 'text-left'}`}
                        >
                          {t('maintenance.mileageAutoFetched')}
                        </p>
                      )}
                    </div>

                    {/* Notes - Optional */}
                    <div>
                      <label
                        className={`block text-sm font-medium text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {t('maintenance.additionalNotes')}
                      </label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        className={`w-full bg-gray-700/50 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                        rows="2"
                        placeholder={t('maintenance.additionalNotesPlaceholder')}
                      />
                    </div>

                    {/* Form Actions */}
                    <div
                      className={`flex gap-4 pt-4 border-t border-gray-700/50 ${isRTL ? 'justify-start flex-row-reverse' : 'justify-end'}`}
                    >
                      <button
                        type="button"
                        onClick={() => setShowEditForm(false)}
                        className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                        disabled={isSubmitting}
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="submit"
                        className={`bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2 rounded-lg transition-all duration-300 shadow-lg flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                        disabled={isSubmitting || !formData.car_id}
                      >
                        {isSubmitting ? (
                          <>
                            <svg
                              className="animate-spin h-5 w-5 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            {t('maintenance.updating')}
                          </>
                        ) : (
                          <>
                            <CheckCircleIcon className="h-5 w-5" />
                            {t('maintenance.updateRecord')}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && recordToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl w-full max-w-md shadow-2xl border border-gray-700/50">
            <div className="border-b border-gray-700/50 p-6">
              <div className="flex items-center gap-3">
                <div className="bg-red-900/30 p-2 rounded-lg">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
                </div>
                <h2
                  className={`text-xl font-bold text-white ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  {t('maintenance.deleteMaintenanceRecord')}
                </h2>
              </div>
            </div>

            <div className="p-6">
              <p className={`text-gray-300 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('maintenance.deleteConfirmation')}
              </p>

              <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
                <div className={`text-sm text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('maintenance.recordDetails')}
                </div>
                <div className="text-white font-medium">
                  {recordToDelete.car?.make} {recordToDelete.car?.model} -{' '}
                  {recordToDelete.car?.license_plate}
                </div>
                <div className={`text-gray-300 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                  {translateDescription(recordToDelete)}
                </div>
                <div className={`text-gray-400 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('maintenance.cost')}:{' '}
                  {formatPrice(
                    parseFloat(recordToDelete.maintenance_cost || recordToDelete.cost || 0)
                  )}
                </div>
              </div>

              <div
                className={`flex gap-4 ${isRTL ? 'justify-start flex-row-reverse' : 'justify-end'}`}
              >
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setRecordToDelete(null);
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  disabled={deleting}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => handleDeleteRecord(recordToDelete)}
                  className={`bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      {t('maintenance.deleting')}
                    </>
                  ) : (
                    <>
                      <TrashIcon className="h-4 w-4" />
                      {t('maintenance.deleteRecord')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Note Popup Modal */}
      {showNotePopup && selectedNote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl w-full max-w-md shadow-2xl border border-gray-700/50 transform scale-100 transition-all duration-200 ease-out">
            {/* Header */}
            <div className="border-b border-gray-700/50 p-4">
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <ExclamationTriangleIcon className="h-4 w-4 text-amber-400" />
                </div>
                <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <h3 className="text-lg font-semibold text-white">
                    {t('maintenance.additionalNotes')}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {selectedNote.vehicle} • {selectedNote.licenseplate}
                  </p>
                </div>
                <button
                  onClick={() => setShowNotePopup(false)}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-700/50"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/30">
                <p
                  className={`text-gray-300 leading-relaxed ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  {selectedNote.note}
                </p>
              </div>

              {/* Footer */}
              <div
                className={`flex items-center justify-between mt-4 pt-3 border-t border-gray-700/30 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <span className="text-xs text-gray-500">{selectedNote.date}</span>
                <button
                  onClick={() => setShowNotePopup(false)}
                  className="px-4 py-1.5 text-sm bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-all duration-200"
                >
                  {t('maintenance.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;



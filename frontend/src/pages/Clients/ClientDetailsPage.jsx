// src/pages/Clients/ClientDetailsPage.jsx - COMPLETE FIXED VERSION
import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import secureApi from '../../utils/secureApi';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  TrashIcon,
  PhoneIcon,
  DocumentIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useMileageDisplay } from '../../hooks/useMileageDisplay';
import { formatPrice, getCurrencySymbol } from '../../utils/currencySymbols';

const ClientDetailsPage = () => {
  const { formatMileageValue, getMileageUnit } = useMileageDisplay();
  const { t, isRTL } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const [companyCurrency, setCompanyCurrency] = useState('');
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rentalHistory, setRentalHistory] = useState([]);
  const [clientDocuments, setClientDocuments] = useState([]);
  const [clientStats, setClientStats] = useState({
    totalRentals: 0,
    totalSpent: 0,
    averageRentalDuration: 0,
    favoriteCarType: '',
  });

  useEffect(() => {
    const fetchClientDetails = async () => {
      try {
        setLoading(true);
        console.log(`Fetching client details for ID: ${id}`);

        // Use the API utility method with explicit /api prefix
        const response = await secureApi.get(`/clients/${id}/`);

        console.log('Full response:', response);
        console.log('Response data:', response.data);
        console.log('Response status:', response.status);

        if (response.data) {
          console.log('Client data from API:', response.data);

          // Format client data for consistent display
          const clientData = {
            _id: response.data.encrypted_client_id,
            encrypted_client_id: response.data.encrypted_client_id,
            name: response.data.name || '',
            phone: response.data.phone_number || '',
            createdAt: response.data.created_at || '',
            documents: response.data.documents || [],
            company_id: response.data.company_id,
          };

          setClient(clientData);
          // Fallback: derive company currency from client.company_id if auth/me is unavailable
          if (!companyCurrency && clientData.company_id) {
            try {
              const companyResponse = await secureApi.get(`/companies/${clientData.company_id}`);
              if (companyResponse.data?.currency) {
                setCompanyCurrency(companyResponse.data.currency);
              }
            } catch (err) {
              console.warn('Failed to fetch company currency via client.company_id:', err);
            }
          }
          // Capture company currency from client if present
          if (response.data.company_currency && !companyCurrency) {
            setCompanyCurrency(response.data.company_currency);
          }

          // Fetch client documents
          if (response.data.documents) {
            setClientDocuments(response.data.documents);
          } else {
            // If no documents in client data, try to fetch them separately
            try {
              const docsResponse = await secureApi.get(`/documents/clients/${id}/documents/`);
              if (docsResponse.data && Array.isArray(docsResponse.data)) {
                setClientDocuments(docsResponse.data);
              }
            } catch (docErr) {
              console.log('No documents found or error fetching documents', docErr);
            }
          }

          // Fetch rental history
          const rentalsResponse = await secureApi.get(`/rentals/?client_id=${id}`);
          if (rentalsResponse.data && Array.isArray(rentalsResponse.data)) {
            console.log('Rental data:', rentalsResponse.data);

            // Create a map to track which car IDs we need to fetch
            const carIds = new Set();

            // First, build rentals with available data
            const formattedRentals = rentalsResponse.data.map(rental => {
              const rentalCurrency =
                rental.currency ||
                rental.company_currency ||
                rental?.car?.currency ||
                rental?.car?.company_currency ||
                '';
              if (rental.encrypted_car_id) {
                carIds.add(rental.encrypted_car_id);
              }
              return {
                id: rental.encrypted_rental_id,
                car_id: rental.encrypted_car_id || rental.car_id,
                encrypted_car_id: rental.encrypted_car_id || (rental.car && rental.car.encrypted_car_id),
                car: {
                  make: (rental.car && rental.car.make) || rental.car_make || t('common.loading'),
                  model:
                    (rental.car && rental.car.model) || rental.car_model || t('common.loading'),
                  type: (rental.car && rental.car.type) || rental.car_type || t('common.loading'),
                  license_plate:
                    (rental.car && rental.car.license_plate) ||
                    rental.car_license_plate ||
                    t('common.loading'),
                  encrypted_car_id:
                    rental.encrypted_car_id || (rental.car && rental.car.encrypted_car_id),
                  currency: rental.car?.currency || rental.company_currency,
                  company_currency: rental.company_currency,
                  company_id: rental.car?.company_id || rental.company_id,
                },
                startDate: rental.start_date || rental.rental_start_date,
                endDate: rental.end_date || rental.rental_end_date,
                totalCost: rental.total_cost || rental.final_price || 0,
                dailyRate: rental.daily_rate || 0,
                status: rental.contract_status || rental.status || 'completed',
                paymentStatus: rental.payment_status || 'paid',
                amountPaid: rental.amount_paid || 0,
                additionalCharges: rental.additional_charges || 0,
                mileageBefore: rental.mileage_before || 0,
                mileageAfter: rental.mileage_after || null,
                notes: rental.notes || '',
                currency: rentalCurrency,
              };
            });

            // If we need to fetch car details for any rentals
            if (carIds.size > 0) {
              try {
                // For each car ID, fetch complete car information
                const carDetailsPromises = Array.from(carIds).map(async carId => {
                  try {
                    const carResponse = await secureApi.get(`/cars/${carId}`);
                    return carResponse.data;
                  } catch (err) {
                    console.error(`Error fetching car ${carId}:`, err);
                    return null;
                  }
                });

                // Wait for all car details to be fetched
                const carDetails = await Promise.all(carDetailsPromises);

                // Create a map of car ID to car details
                const carDetailsMap = {};
                for (const car of carDetails) {
                  if (car && car.encrypted_car_id) {
                    carDetailsMap[car.encrypted_car_id] = car;
                  }
                }

                // Update rental records with complete car information
                formattedRentals.forEach(rental => {
                  if (rental.car_id && carDetailsMap[rental.car_id]) {
                    const car = carDetailsMap[rental.car_id];
                    rental.car = {
                      make: car.make || rental.car.make,
                      model: car.model || rental.car.model,
                      type: car.type || rental.car.type,
                      license_plate: car.license_plate || rental.car.license_plate,
                      currency: car.currency || rental.car.currency,
                      company_currency: car.currency || rental.car.company_currency,
                      company_id: car.company_id || rental.car.company_id,
                    };
                    if (!rental.currency && car.currency) {
                      rental.currency = car.currency;
                    }
                    if (!companyCurrency && car.currency) {
                      setCompanyCurrency(car.currency);
                    }
                    if (!rental.company_id && car.company_id) {
                      rental.company_id = car.company_id;
                    }
                  }
                });
              } catch (carErr) {
                console.error('Error fetching car details:', carErr);
              }
            }

            setRentalHistory(formattedRentals);
            // Derive currency from rentals if not set
            if (!companyCurrency) {
              const rentalCurrency =
                formattedRentals.find(r => r.currency)?.currency ||
                formattedRentals.find(r => r.car?.currency)?.car?.currency;
              if (rentalCurrency) {
                setCompanyCurrency(rentalCurrency);
              } else {
                const rentalCompanyId =
                  formattedRentals.find(r => r.company_id)?.company_id ||
                  formattedRentals.find(r => r.car?.company_id)?.car?.company_id ||
                  clientData.company_id;
                if (rentalCompanyId) {
                  try {
                    await secureApi
                      .get(`/companies/${rentalCompanyId}`)
                      .then(res => res.data?.currency && setCompanyCurrency(res.data.currency));
                  } catch (err) {
                    console.warn('Failed to derive company currency from rentals:', err);
                  }
                }
              }
            }

            // Calculate client statistics
            const stats = calculateClientStats(formattedRentals);
            setClientStats(stats);
          }
        } else {
          console.error('Client not found in response data');
          setError('Client not found.');
        }
      } catch (err) {
        console.error('Error fetching client details:', err);
        console.error('Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          statusText: err.response?.statusText,
        });
        setError(t('clients.failedToLoadClientDetails'));
      } finally {
        setLoading(false);
      }
    };

    fetchClientDetails();
  }, [id]);

  // Fetch company currency on mount
  useEffect(() => {
    const fetchCompanyCurrency = async () => {
      try {
        const userResponse = await secureApi.get('/auth/me');
        if (userResponse.data?.company_id) {
          const companyResponse = await secureApi.get(`/companies/${userResponse.data.company_id}`);
          if (companyResponse.data?.currency) {
            setCompanyCurrency(companyResponse.data.currency);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch company currency for client details:', err);
      }
    };
    fetchCompanyCurrency();
  }, []);

  const getRentalCurrency = rental =>
    (rental &&
      (rental.currency || rental.company_currency || rental.car?.currency || rental.car?.company_currency)) ||
    companyCurrency ||
    '';

  const getDisplayCurrency = () =>
    companyCurrency ||
    rentalHistory.find(r => r.currency)?.currency ||
    rentalHistory.find(r => r.car?.currency)?.car?.currency ||
    '';

  // Fallback: if currency still missing after rentals load, refetch company currency
  useEffect(() => {
    const refetchCompanyCurrency = async () => {
      if (companyCurrency) return;
      try {
        const userResponse = await secureApi.get('/auth/me');
        if (userResponse.data?.company_id) {
          const companyResponse = await secureApi.get(`/companies/${userResponse.data.company_id}`);
          if (companyResponse.data?.currency) {
            setCompanyCurrency(companyResponse.data.currency);
          }
        }
      } catch (err) {
        console.warn('Fallback fetch company currency for client details failed:', err);
      }
    };
    refetchCompanyCurrency();
  }, [companyCurrency, rentalHistory.length]);

  const handleDeleteDocument = async documentId => {
    if (!documentId) return;

    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        // Just update the UI immediately for better UX
        setClientDocuments(prevDocs => prevDocs.filter(doc => doc.document_id !== documentId));

        // Simple API call
        await secureApi.delete(`/documents/${documentId}/`);
        console.log('Document deleted successfully');
      } catch (err) {
        console.error('Error deleting document:', err);
        // Error already happened but UI is already updated, so no need to do anything
      }
    }
  };

  const calculateClientStats = rentals => {
    if (!rentals.length)
      return {
        totalRentals: 0,
        totalSpent: 0,
        averageRentalDuration: 0,
        lastRentalDate: null,
        activeRentals: 0,
        totalDays: 0,
        amountPaid: 0,
        amountOwed: 0,
        totalMileage: 0,
      };

    // Calculate basic stats
    const totalSpent = rentals.reduce((sum, rental) => sum + (rental.totalCost || 0), 0);
    const amountPaid = rentals.reduce((sum, rental) => sum + (rental.amountPaid || 0), 0);
    const amountOwed = Math.max(0, totalSpent - amountPaid);
    const activeRentals = rentals.filter(r => r.status === 'active').length;

    // Calculate total days rented
    const totalDays = rentals.reduce((sum, rental) => {
      const start = new Date(rental.startDate);
      const end = new Date(rental.endDate);
      return sum + Math.round((end - start) / (1000 * 60 * 60 * 24));
    }, 0);

    // Calculate total mileage (if available)
    let totalMileage = 0;
    const completedRentals = rentals.filter(
      r => r.status === 'completed' && r.mileageBefore !== null && r.mileageAfter !== null
    );

    if (completedRentals.length > 0) {
      totalMileage = completedRentals.reduce((sum, rental) => {
        const mileageDiff = (rental.mileageAfter || 0) - (rental.mileageBefore || 0);
        return sum + Math.max(0, mileageDiff); // Ensure we don't count negative mileage
      }, 0);
    }

    // Calculate average rental duration
    const avgDuration = totalDays / rentals.length || 0;

    // Get last rental date
    const lastRental = [...rentals].sort(
      (a, b) => new Date(b.startDate) - new Date(a.startDate)
    )[0];

    return {
      totalRentals: rentals.length,
      totalSpent,
      amountPaid,
      amountOwed,
      averageRentalDuration: avgDuration,
      lastRentalDate: lastRental?.startDate,
      activeRentals,
      totalDays,
      totalMileage,
    };
  };

  const handleDeleteClient = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteClient = async () => {
    try {
      await secureApi.deleteClient(id);
      navigate('/clients', { state: { message: t('clients.clientDeletedSuccessfully') } });
    } catch (err) {
      console.error('Error deleting client:', err);
      setError(t('clients.failedToDeleteClientLater'));
      setShowDeleteModal(false);
    }
  };

  const formatDate = dateString => {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Helper function to format file size
  const formatFileSize = bytes => {
    if (!bytes || bytes === 0) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Add a helper for compact date range
  const formatShortDate = dateString => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Helper function to format phone number
  const formatPhoneNumber = phone => {
    if (!phone) return '';
    return phone.toString().trim();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="bg-red-800/30 p-6 rounded-lg shadow-lg max-w-md w-full border border-red-700">
          <h2 className="text-xl font-bold mb-4">{t('clients.error')}</h2>
          <p className="mb-4">{error}</p>
          <Link
            to="/clients"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
          >
            {t('clients.backToClients')}
          </Link>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="bg-gray-900 p-6 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-xl font-bold mb-4">{t('clients.clientNotFound')}</h2>
          <p className="mb-4">{t('clients.clientNotFoundMessage')}</p>
          <Link
            to="/clients"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
          >
            {t('clients.backToClients')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            to="/clients"
            className={`text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <ArrowLeftIcon className="h-5 w-5" />
            {t('clients.backToClients')}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main client info card */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900/70 border border-gray-800/70 rounded-lg shadow overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-800/70">
                <div
                  className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {/* Client name and header */}
                  <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'space-x-4'}`}>
                    <div
                      className={`h-14 w-14 bg-gray-900 rounded-md flex items-center justify-center shadow-md ${isRTL ? 'ml-4' : ''}`}
                      style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }}
                    >
                      <UserIcon className="h-10 w-10 text-blue-300" />
                    </div>
                    <div className={`${isRTL ? 'text-right' : 'ml-16 text-left'}`}>
                      <h1 className="text-2xl font-bold text-white">
                        {client.name}
                      </h1>
                      <p className="text-sm text-gray-400"></p>
                      <p className="text-sm text-gray-400 mt-1">
                        {t('clients.addedOn')} {formatDate(client.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Link
                      to={`/clients/${client.encrypted_client_id}/edit`}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                      {t('clients.edit')}
                    </Link>
                    <button
                      onClick={handleDeleteClient}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                      <TrashIcon className="h-5 w-5" />
                      {t('clients.delete')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4">
                {/* Contact information */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-white mb-4">
                    {t('clients.contactInformation')}
                  </h2>
                  <div className="bg-gray-900/70 rounded-lg p-4">
                    <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <PhoneIcon className={`h-5 w-5 text-gray-400 ${isRTL ? 'ml-4' : 'mr-4'}`} />
                      <p className="text-white" dir="ltr">
                        {client.phone ? formatPhoneNumber(client.phone) : t('clients.noPhoneNumber')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-white">
                      {t('clients.documents')}
                    </h2>
                    <Link
                      to={`/clients/${client.encrypted_client_id}/edit`}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm flex items-center"
                    >
                      <PencilSquareIcon className="h-4 w-4 mr-1" />
                      {t('clients.addDocuments')}
                    </Link>
                  </div>

                  {clientDocuments && clientDocuments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {clientDocuments.map((doc, index) => (
                        <div
                          key={index}
                          className="bg-gray-900/70 rounded-lg p-3 flex items-start space-x-3"
                        >
                          {doc.file_type?.includes('image/') ? (
                            <div className="flex-shrink-0">
                              <img
                                src={doc.url}
                                alt={doc.name}
                                className="h-16 w-16 object-cover rounded-md shadow-sm"
                              />
                            </div>
                          ) : (
                            <div className="flex-shrink-0 h-16 w-16 bg-blue-50 dark:bg-blue-900/20 rounded-md flex items-center justify-center">
                              <DocumentTextIcon className="h-8 w-8 text-blue-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between">
                              <p className="text-sm font-medium text-white truncate">
                                {doc.name}
                              </p>
                              <button
                                onClick={() => handleDeleteDocument(doc.document_id)}
                                className="text-red-400 hover:text-red-600"
                                title={t('clients.deleteDocument')}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                            <p className="text-xs text-gray-400">
                              {doc.file_type
                                ? formatFileType(doc.file_type)
                                : t('clients.document')}{' '}
                              • {formatFileSize(doc.file_size)}
                            </p>
                            <div className="mt-1">
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                {t('clients.viewDocument')}
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-900/70 rounded-lg p-4 text-center">
                      <DocumentIcon className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-400">
                        {t('clients.noDocumentsUploaded')}
                      </p>
                      <Link
                        to={`/clients/${client.encrypted_client_id}/edit`}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm inline-block mt-2"
                      >
                        {t('clients.uploadDocuments')}
                      </Link>
                    </div>
                  )}
                </div>

                {/* Rental History */}
                <div>
                  <h2 className="text-lg font-semibold text-white mb-4">
                    {t('clients.rentalHistory')}
                  </h2>

                  {rentalHistory.length > 0 ? (
                    <div className="overflow-x-auto w-full rounded-lg border border-gray-800/70">
                      <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-900/70">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              {t('clients.vehicle')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              {t('clients.rentalPeriod')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              {t('clients.pricing')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              {t('clients.status')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              {t('clients.actions')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-gray-900/70 divide-y divide-gray-700">
                          {rentalHistory.map((rental, index) => {
                            // Calculate rental duration
                            const startDate = new Date(rental.startDate);
                            const endDate = new Date(rental.endDate);
                            const durationDays = Math.round(
                              (endDate - startDate) / (1000 * 60 * 60 * 24)
                            );

                            // Format payment status indicator
                            const getPaymentStatusIndicator = status => {
                              switch (status?.toLowerCase()) {
                                case 'paid':
                                  return {
                                    bg: 'bg-green-900/30 text-green-300',
                                    label: t('clients.paidInFull'),
                                  };
                                case 'partially_paid':
                                  return {
                                    bg: 'bg-yellow-900/30 text-yellow-300',
                                    label: t('clients.partiallyPaid'),
                                  };
                                case 'unpaid':
                                  return {
                                    bg: 'bg-red-900/30 text-red-300',
                                    label: t('clients.unpaid'),
                                  };
                                case 'overdue':
                                  return {
                                    bg: 'bg-red-900/30 text-red-300',
                                    label: t('clients.paymentOverdue'),
                                  };
                                case 'cancelled':
                                  return {
                                    bg: 'bg-gray-900/70 text-gray-200',
                                    label: t('clients.cancelled'),
                                  };
                                default:
                                  return {
                                    bg: 'bg-gray-900/70 text-gray-200',
                                    label: status || t('clients.unknown'),
                                  };
                              }
                            };

                            // Format contract status
                            const getContractStatusIndicator = status => {
                              switch (status?.toLowerCase()) {
                                case 'active':
                                  return {
                                    bg: 'bg-green-900/30 text-green-300',
                                    label: t('clients.active'),
                                  };
                                case 'completed':
                                  return {
                                    bg: 'bg-blue-900/30 text-blue-300',
                                    label: t('clients.completed'),
                                  };
                                case 'cancelled':
                                  return {
                                    bg: 'bg-gray-900/70 text-gray-200',
                                    label: 'Cancelled',
                                  };
                                default:
                                  return {
                                    bg: 'bg-gray-900/70 text-gray-200',
                                    label: status || 'Unknown',
                                  };
                              }
                            };

                            const paymentStatus = getPaymentStatusIndicator(rental.paymentStatus);
                            const contractStatus = getContractStatusIndicator(rental.status);

                            return (
                              <tr
                                key={index}
                                onClick={() => navigate(`/rentals/${rental.id}`)}
                                className="hover:bg-gray-900/70 cursor-pointer transition-colors"
                              >
                                <td className="px-4 py-3">
                                  <div className="text-sm font-medium text-white">
                                    <Link
                                      to={`/cars/${rental.encrypted_car_id || rental.car.encrypted_car_id}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="hover:text-blue-600 dark:hover:text-blue-400"
                                    >
                                      {rental.car.make} {rental.car.model}
                                    </Link>
                                  </div>
                                  <div className="text-sm text-gray-400">
                                    {rental.car.type} • {rental.car.license_plate}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm text-white whitespace-nowrap">
                                    {formatShortDate(rental.startDate)} -{' '}
                                    {formatShortDate(rental.endDate)}
                                  </div>
                                  <div className="text-sm text-gray-400">
                                    {durationDays}{' '}
                                    {durationDays === 1 ? t('clients.day') : t('clients.days')}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-sm font-medium text-white">
                                    {formatPrice(rental.totalCost, getRentalCurrency(rental))}{' '}
                                    {t('clients.total')}
                                  </div>
                                  <div className="text-sm text-gray-400">
                                    {formatPrice(rental.dailyRate, getRentalCurrency(rental))}/
                                    {t('clients.day')} •{' '}
                                    {rental.amountPaid
                                      ? `${formatPrice(
                                          rental.amountPaid,
                                          getRentalCurrency(rental)
                                        )} ${t('clients.paid')}`
                                      : t('clients.noPayment')}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="space-y-1">
                                    <span
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${contractStatus.bg}`}
                                    >
                                      {contractStatus.label}
                                    </span>
                                    <div>
                                      <span
                                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${paymentStatus.bg}`}
                                      >
                                        {paymentStatus.label}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                  <Link
                                    to={`/rentals/${rental.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                  >
                                    {t('clients.viewDetails')}
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-gray-900/70 rounded-lg p-4 text-center">
                      <p className="text-gray-400">
                        {t('clients.noRentalHistory')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Client stats card */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900/70 border border-gray-800/70 rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800/70">
                <h2 className="text-lg font-semibold text-white">
                  {t('clients.clientStatistics')}
                </h2>
              </div>

              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div className="bg-gray-900/70 rounded-lg p-4">
                    <p className="text-sm text-gray-400">
                      {t('clients.totalRentals')}
                    </p>
                    <p className="text-2xl font-bold text-white">
                      {clientStats.totalRentals}
                    </p>
                  </div>

                  <div className="bg-gray-900/70 rounded-lg p-4">
                    <p className="text-sm text-gray-400">
                      {t('clients.activeRentals')}
                    </p>
                    <p className="text-2xl font-bold text-white">
                      {clientStats.activeRentals}
                    </p>
                  </div>

                  <div className="bg-gray-900/70 rounded-lg p-4">
                    <p className="text-sm text-gray-400">
                      {t('clients.financialSummary')}
                    </p>
                    <p className="text-xl font-bold text-white">
                      {formatPrice(clientStats.totalSpent, getDisplayCurrency())}{' '}
                      {t('clients.total')}
                    </p>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-green-600 dark:text-green-400">
                        {formatPrice(clientStats.amountPaid, getDisplayCurrency())}{' '}
                        {t('clients.paid')}
                      </span>
                      {clientStats.amountOwed > 0 && (
                        <span className="text-red-600 dark:text-red-400">
                          {formatPrice(clientStats.amountOwed, getDisplayCurrency())}{' '}
                          {t('clients.outstanding')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-900/70 rounded-lg p-4">
                    <p className="text-sm text-gray-400">
                      {t('clients.rentalDuration')}
                    </p>
                    <p className="text-xl font-bold text-white">
                      {clientStats.totalDays} {t('clients.totalDays')}
                    </p>
                    <p className="text-sm text-gray-300 mt-1">
                      {clientStats.averageRentalDuration.toFixed(1)} {t('clients.avgPerRental')}
                    </p>
                  </div>

                  {clientStats.totalMileage > 0 && (
                    <div className="bg-gray-900/70 rounded-lg p-4">
                      <p className="text-sm text-gray-400">
                        {t('clients.totalDistance')}
                      </p>
                      <p className="text-xl font-bold text-white">
                        {clientStats.totalMileage} {t('clients.km')}
                      </p>
                    </div>
                  )}

                  {clientStats.lastRentalDate && (
                    <div className="bg-gray-900/70 rounded-lg p-4">
                      <p className="text-sm text-gray-400">
                        {t('clients.lastRental')}
                      </p>
                      <p className="text-lg font-bold text-white">
                        {formatDate(clientStats.lastRentalDate)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900/70 border border-gray-800/70 rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-white">
              {t('clients.confirmDeletion')}
            </h3>
            <p className="mb-6 text-gray-300">
              {t('clients.deleteClientConfirm')}
            </p>
            <div
              className={`flex ${isRTL ? 'justify-start flex-row-reverse gap-3' : 'justify-end gap-3'}`}
            >
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
              >
                {t('clients.cancel')}
              </button>
              <button
                onClick={confirmDeleteClient}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                {t('clients.deleteClient')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to format file type
const formatFileType = mimeType => {
  const types = {
    'application/pdf': 'PDF',
    'image/jpeg': 'JPEG',
    'image/jpg': 'JPG',
    'image/png': 'PNG',
  };
  return types[mimeType] || mimeType;
};

export default ClientDetailsPage;









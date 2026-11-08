// src/pages/Clients/ClientsPage.jsx - Fixed version (client info left-aligned)
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import secureApi from '../../utils/secureApi';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  DocumentIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

const ClientsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, isRTL } = useLanguage();
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMessage, setStatusMessage] = useState(location.state?.message || '');
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);

  // Clear status message after 5 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage('');
        // Clear location state without navigation if possible, or just accept it clears from view
        window.history.replaceState({}, document.title);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Fetch clients data with improved error handling
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        setError(null);

        // console.log('Fetching clients...');
        const response = await secureApi.get('/clients/');

        // console.log('Raw API response:', response);
        // console.log('Response data:', response.data);
        // console.log('Response data type:', typeof response.data);
        // console.log('Is response.data an array?', Array.isArray(response.data));

        // FIXED: Simplified data extraction - backend returns array directly
        let clientsData = [];

        if (Array.isArray(response.data)) {
          // Backend returns clients array directly
          clientsData = response.data;
        } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
          // Handle wrapped response format
          clientsData = response.data.data;
        } else {
          // console.error('Unexpected response format:', response.data);
          setError(t('common.error') + ': ' + t('clients.noClientsFound'));
          setClients([]);
          setFilteredClients([]);
          return;
        }

        // console.log('Extracted clients data:', clientsData);
        // console.log('Number of clients:', clientsData.length);

        if (clientsData.length === 0) {
          // console.log('No clients found - setting empty array');
          setClients([]);
          setFilteredClients([]);
          return;
        }

        // FIXED: Simplified client processing without async document fetching
        const processedClients = clientsData.map((client, index) => {
          // console.log(`Processing client ${index + 1}:`, client);

          // Use encrypted_client_id from backend
          const encryptedId = client.encrypted_client_id;
          if (!encryptedId) {
            // console.warn('Client missing encrypted_client_id:', client);
            return null;
          }
          const clientData = {
            _id: encryptedId,
            encrypted_client_id: encryptedId,
            name: client.name || t('clients.name'),
            phone: client.phone_number || client.phone || t('clients.phone'),
            email: client.email || '',
            documents: client.documents || [],
          };

          // console.log(`Processed client data for ${clientData.name}:`, clientData);
          return clientData;
        });

        // Filter out any null clients (those missing IDs)
        const validClients = processedClients.filter(client => client !== null);

        // console.log('Final processed clients:', validClients);
        // console.log('Number of valid clients:', validClients.length);

        setClients(validClients);
        setFilteredClients(validClients);

        // FIXED: Fetch documents separately for each client after setting initial state
        if (validClients.length > 0) {
          fetchClientDocuments(validClients);
        }
      } catch (err) {
        // console.error('Error fetching clients:', err);
        // console.error('Error details:', {
        //   message: err.message,
        //   response: err.response?.data,
        //   status: err.response?.status,
        //   statusText: err.response?.statusText,
        // });

        // Set a more specific error message
        let errorMessage = t('common.error') + ': ';
        if (err.response?.status === 401) {
          errorMessage += t('auth.signIn');
        } else if (err.response?.status === 403) {
          errorMessage += t('common.error');
        } else if (err.response?.status === 500) {
          errorMessage += t('common.tryAgain');
        } else if (err.message) {
          errorMessage += err.message;
        } else {
          errorMessage += t('clients.noClientsFound');
        }

        setError(errorMessage);
        setClients([]);
        setFilteredClients([]);
      } finally {
        setLoading(false);
      }
    };

    // FIXED: Separate function to fetch documents without blocking main client loading
    const fetchClientDocuments = async clientsList => {
      const updatedClients = await Promise.all(
        clientsList.map(async client => {
          try {
            // console.log(`Fetching documents for client ${client.encrypted_client_id}...`);
            const docsResponse = await secureApi.get(
              `/documents/clients/${client.encrypted_client_id}/documents/`
            );
            // console.log(
            //   `Documents response for client ${client.encrypted_client_id}:`,
            //   docsResponse.data
            // );

            if (docsResponse.data && Array.isArray(docsResponse.data)) {
              return {
                ...client,
                documents: docsResponse.data,
              };
            }
          } catch (docErr) {
            // console.log(`No documents found for client ${client.name}:`, docErr.message);
            // This is not a critical error, so we continue with empty documents
          }

          return client;
        })
      );

      // Update clients with document information
      setClients(updatedClients);
      setFilteredClients(updatedClients);
    };

    fetchClients();
  }, [t]);

  // Filter clients based on search term
  useEffect(() => {
    // console.log('Filtering clients. Search term:', searchTerm);
    // console.log('Total clients to filter:', clients.length);

    if (searchTerm.trim() === '') {
      setFilteredClients(clients);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = clients.filter(client => {
        const matchesName = client.name?.toLowerCase().includes(term);
        const matchesPhone = client.phone?.toLowerCase().includes(term);
        const matchesEmail = client.email?.toLowerCase().includes(term);
        const matchesDocuments =
          client.documents &&
          client.documents.some(doc => doc.name && doc.name.toLowerCase().includes(term));

        return matchesName || matchesPhone || matchesEmail || matchesDocuments;
      });

      // console.log('Filtered clients:', filtered.length);
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  const handleRowClick = id => {
    navigate(`/clients/${id}`);
  };

  // Handle client deletion
  const handleDeleteClient = id => {
    // console.log('Deleting client with ID:', id);
    setSelectedClientId(id);
    setIsDeleting(true);
  };

  const confirmDelete = async () => {
    try {
      // console.log('Confirming delete for client:', selectedClientId);
      await secureApi.delete(`/clients/${selectedClientId}/`);

      // Update the state to remove the deleted client
      const updatedClients = clients.filter(client => client._id !== selectedClientId);
      const updatedFilteredClients = filteredClients.filter(
        client => client._id !== selectedClientId
      );

      setClients(updatedClients);
      setFilteredClients(updatedFilteredClients);

      setStatusMessage(t('clients.clientDeletedSuccessfully'));

      // Clear the message after 5 seconds
      setTimeout(() => {
        setStatusMessage('');
      }, 5000);
    } catch (err) {
      // console.error('Error deleting client:', err);
      setError(t('clients.failedToDeleteClient'));
    } finally {
      setIsDeleting(false);
      setSelectedClientId(null);
    }
  };

  const cancelDelete = () => {
    setIsDeleting(false);
    setSelectedClientId(null);
  };

  // Debug render
  // console.log('Rendering ClientsPage with:', {
  //   loading,
  //   error,
  //   clientsCount: clients.length,
  //   filteredClientsCount: filteredClients.length,
  //   searchTerm,
  // });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full text-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h1 className="text-2xl font-bold text-white">{t('clients.title')}</h1>
          <p className="text-gray-400 mt-1">
            {t('clients.showingClients', { count: filteredClients.length, total: clients.length })}
          </p>
        </div>
        <Link
          to="/clients/add"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          {t('clients.addNew')}
        </Link>
      </div>

      {/* Status message */}
      {statusMessage && (
        <div className="bg-green-900/30 text-green-200 px-4 py-3 rounded-lg mb-6 flex items-center">
          <CheckCircleIcon className="h-5 w-5 mr-2" />
          {statusMessage}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-900/30 text-red-200 px-4 py-3 rounded-lg mb-6 flex items-center">
          <ExclamationCircleIcon className="h-5 w-5 mr-2" />
          <span className={isRTL ? 'flex-1 text-right mr-4' : 'flex-1 text-left ml-4'}>
            {error}
          </span>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
          >
            {t('common.tryAgain')}
          </button>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder={t('clients.searchPlaceholder')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'pr-12 text-right' : 'pl-12'}`}
            dir={isRTL ? 'rtl' : 'ltr'}
            style={isRTL ? { textAlign: 'right', paddingRight: '48px' } : {}}
          />
          <svg
            className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Client listing */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-10 bg-gray-900 rounded-lg">
          <DocumentIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-white">
            {clients.length === 0 ? t('clients.noClientsFound') : t('clients.noClientsFound')}
          </h3>
          <p className="text-gray-400 mt-1 mb-4">
            {clients.length === 0 ? t('clients.addFirstClient') : t('common.tryAgain')}
          </p>
          <button
            onClick={() => navigate('/clients/add')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {t('clients.addClient')}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto bg-gray-900 rounded-lg shadow-md">
          <table className="min-w-full divide-y divide-gray-700" dir="ltr">
            <thead className="bg-gray-900">
              <tr>
                {isRTL ? (
                  <>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t('clients.actions')}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t('clients.documents')}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t('clients.contactInformation')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t('clients.clientInformation')}
                    </th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t('clients.clientInformation')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t('clients.contactInformation')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t('clients.documents')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t('clients.actions')}
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredClients.map((client, index) => {
                if (!client.encrypted_client_id) return null; // Hide clients missing encrypted_client_id
                const clientId = client.encrypted_client_id;
                return (
                  <tr
                    key={clientId || index}
                    className="hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => handleRowClick(clientId)}
                  >
                    {isRTL ? (
                      <>
                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                          <div className="flex flex-row-reverse space-x-reverse space-x-2 justify-end mr-2">
                            <Link
                              to={`/clients/${clientId}`}
                              className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-blue-900/30"
                              title={t('clients.viewDetails')}
                              onClick={e => e.stopPropagation()}
                            >
                              <EyeIcon className="h-5 w-5" />
                            </Link>
                            <Link
                              to={`/clients/${clientId}/edit`}
                              className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-blue-900/30"
                              title={t('clients.editClient')}
                              onClick={e => e.stopPropagation()}
                            >
                              <PencilSquareIcon className="h-5 w-5" />
                            </Link>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleDeleteClient(clientId);
                              }}
                              className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-900/30"
                              title={t('clients.deleteClient')}
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                        {/* Documents */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {client.documents && client.documents.length > 0 ? (
                            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 justify-end mr-8">
                              {client.documents.length} {t('clients.documents')}
                            </div>
                          ) : (
                            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300 justify-end mr-8">
                              0 {t('clients.documents')}
                            </div>
                          )}
                        </td>
                        {/* Contact Info */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-300 ltr text-left" dir="ltr">
                            {client.phone}
                          </div>
                          {client.email && (
                            <div className="text-sm text-gray-400">{client.email}</div>
                          )}
                        </td>
                        {/* Client Info */}
                        <td className={`px-6 py-4 whitespace-nowrap${isRTL ? ' text-center' : ''}`}>
                          <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="flex-shrink-0">
                              <UserIcon className="h-10 w-10 text-blue-400 bg-blue-900/30 rounded-lg p-1" />
                            </div>
                            <div className={`${isRTL ? 'mr-4 text-right' : 'ml-4 text-left'}`}>
                              <div className="text-sm font-medium text-white leading-tight">
                                {client.name}
                              </div>
                            </div>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        {/* Client Info */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <UserIcon className="h-10 w-10 text-blue-400 bg-blue-900/30 rounded-lg p-1" />
                            </div>
                            <div className="ml-4 text-left">
                              <div className="text-sm font-medium text-white leading-tight">
                                {client.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        {/* Contact Info */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300 ltr text-left" dir="ltr">
                            {client.phone}
                          </div>
                          {client.email && (
                            <div className="text-sm text-gray-400">{client.email}</div>
                          )}
                        </td>
                        {/* Documents */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {client.documents && client.documents.length > 0 ? (
                            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                              {client.documents.length} {t('clients.documents')}
                            </div>
                          ) : (
                            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">
                              0 {t('clients.documents')}
                            </div>
                          )}
                        </td>
                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                          <div className="flex flex-row-reverse space-x-reverse space-x-2 justify-end mr-2">
                            <Link
                              to={`/clients/${clientId}`}
                              className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-blue-900/30"
                              title={t('clients.viewDetails')}
                              onClick={e => e.stopPropagation()}
                            >
                              <EyeIcon className="h-5 w-5" />
                            </Link>
                            <Link
                              to={`/clients/${clientId}/edit`}
                              className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-blue-900/30"
                              title={t('clients.editClient')}
                              onClick={e => e.stopPropagation()}
                            >
                              <PencilSquareIcon className="h-5 w-5" />
                            </Link>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleDeleteClient(clientId);
                              }}
                              className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-900/30"
                              title={t('clients.deleteClient')}
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation modal */}
      {isDeleting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold mb-4">{t('clients.confirmDelete')}</h3>
            <p className="mb-6">{t('clients.thisActionCannotBeUndone')}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmDelete}
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

export default ClientsPage;


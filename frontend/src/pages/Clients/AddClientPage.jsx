// src/pages/Clients/AddClientPage.jsx - FIXED
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import secureApi from '../../utils/secureApi';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  ArrowLeftIcon,
  DocumentArrowUpIcon,
  ExclamationCircleIcon,
  XMarkIcon,
  DocumentIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const AddClientPage = () => {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Get return navigation data from location state
  const returnTo = location.state?.returnTo;
  const rentalFormData = location.state?.rentalFormData;
  const selectedCar = location.state?.selectedCar;
  const searchTerm = location.state?.searchTerm;

  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    company_id: 989899,
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.body.className = 'bg-gray-900 text-white';

    return () => {
      document.body.className = '';
    };
  }, []);

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name) errors.name = t('clients.nameRequired');
    if (!formData.phone_number) errors.phone_number = t('clients.phoneRequired');

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFileChange = e => {
    const files = Array.from(e.target.files);

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const validFiles = files.filter(file => allowedTypes.includes(file.type));

    if (validFiles.length !== files.length) {
      setUploadError(t('clients.invalidFileTypes'));
    } else {
      setUploadError(null);
    }

    const newUploadedFiles = validFiles.map(file => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));

    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
  };

  const removeUploadedFile = index => {
    setUploadedFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Creating client with data:', formData);

      // Create the client using the correct API method
      const response = await secureApi.createClient(formData);
      console.log('Client creation response:', response);
      console.log('Response data:', response.data);
      console.log('Response data type:', typeof response.data);
      console.log('Is response.data an array?', Array.isArray(response.data));

      let rawClientId = null;
      let encryptedClientId = null;

      // Extract client IDs from response - try multiple approaches
      if (response.data) {
        const clientData = Array.isArray(response.data)
          ? response.data[0]
          : Array.isArray(response.data?.data)
            ? response.data.data[0]
            : response.data;
        if (clientData) {
          rawClientId = clientData.client_id || clientData.id || null;
          encryptedClientId = clientData.encrypted_client_id || null;
          console.log('Extracted raw client_id:', rawClientId);
          console.log('Extracted encrypted_client_id:', encryptedClientId);
        } else {
          console.log(
            'Could not find client data in response. Full response:',
            JSON.stringify(response.data, null, 2)
          );
        }
      }

      console.log('Final extracted raw client ID:', rawClientId);
      console.log('Final extracted encrypted client ID:', encryptedClientId);
      console.log('Return to path:', returnTo);
      console.log('Rental form data to restore:', rentalFormData);

      // Upload documents if any and we have a client ID
      if (encryptedClientId && uploadedFiles.length > 0) {
        try {
          const formDataFiles = new FormData();
          formDataFiles.append('client_id', encryptedClientId);

          uploadedFiles.forEach(fileObj => {
            formDataFiles.append('files', fileObj.file);
          });

          console.log('Uploading documents for client:', encryptedClientId);

          // Use the correct document upload endpoint
          await secureApi.post('/documents/clients/documents/', formDataFiles);

          console.log('Documents uploaded successfully');
        } catch (docErr) {
          console.error('Error uploading documents:', docErr);
          // Don't fail the entire operation if document upload fails
        }
      }

      setSuccess(true);

      setTimeout(() => {
        // Check if we need to return to a specific page (like create rental)
        if (returnTo && rawClientId) {
          console.log('Returning to:', returnTo, 'with client ID:', rawClientId);
          navigate(returnTo, {
            state: {
              returnedFromClient: true,
              newClientId: rawClientId,
              newClientEncryptedId: encryptedClientId,
              restoredFormData: rentalFormData,
              restoredSelectedCar: selectedCar,
              restoredSearchTerm: searchTerm,
              message: t('clients.clientAddedSuccessfully'),
            },
          });
        } else {
          // Default navigation to clients page
          navigate('/clients', { state: { message: t('clients.clientAddedSuccessfully') } });
        }
      }, 1500);
    } catch (err) {
      console.error('Error adding client:', err);
      let errorMessage = t('clients.failedToAddClient');

      if (err.status === 0) {
        errorMessage += ' ' + t('clients.networkConnectionIssue');
      } else if (err.message) {
        errorMessage += ' ' + err.message;
      } else {
        errorMessage += ' ' + t('clients.unknownErrorOccurred');
      }

      setError(errorMessage);
      window.scrollTo(0, 0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto bg-gray-900 text-white">
      <div className="mb-4">
        <div className={`flex items-center text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Link to="/dashboard" className="text-gray-400 hover:text-blue-400">
            {t('nav.dashboard')}
          </Link>
          <span className={`mx-2 text-gray-600 ${isRTL ? 'rotate-180' : ''}`}>/</span>
          {returnTo === '/rentals/new' ? (
            <>
              <Link to="/rentals" className="text-gray-400 hover:text-blue-400">
                {t('nav.rentals')}
              </Link>
              <span className={`mx-2 text-gray-600 ${isRTL ? 'rotate-180' : ''}`}>/</span>
              <Link
                to="/rentals/new"
                state={{
                  returnedFromClient: true,
                  restoredFormData: rentalFormData,
                  restoredSelectedCar: selectedCar,
                  restoredSearchTerm: searchTerm,
                }}
                className="text-gray-400 hover:text-blue-400"
              >
                {t('rentals.createRental')}
              </Link>
            </>
          ) : (
            <Link to="/clients" className="text-gray-400 hover:text-blue-400">
              {t('clients.title')}
            </Link>
          )}
          <span className={`mx-2 text-gray-600 ${isRTL ? 'rotate-180' : ''}`}>/</span>
          <span className="text-white">{t('clients.addNewClient')}</span>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">{t('clients.addNewClient')}</h1>

          {success && (
            <div
              className={`bg-green-900/30 text-green-200 px-4 py-3 rounded-lg mb-6 flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <CheckCircleIcon className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('clients.clientAddedSuccessfullyRedirecting')}
            </div>
          )}

          {error && (
            <div
              className={`bg-red-900/30 text-red-200 px-4 py-3 rounded-lg mb-6 flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <ExclamationCircleIcon className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold border-b border-gray-700 pb-2">
                  {t('clients.clientInformation')}
                </h2>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                    {t('clients.fullName')}*
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 bg-gray-700 border ${validationErrors.name ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                  {validationErrors.name && (
                    <p
                      className={`mt-1 text-sm text-red-400 ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      {validationErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="phone_number"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    {t('clients.phoneNumber')}*
                  </label>
                  <input
                    type="text"
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 bg-gray-700 border ${validationErrors.phone_number ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                  {validationErrors.phone_number && (
                    <p
                      className={`mt-1 text-sm text-red-400 ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      {validationErrors.phone_number}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold border-b border-gray-700 pb-2">
                  {t('clients.documents')}
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('clients.uploadDocuments')}
                  </label>
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center bg-gray-700/30">
                    <input
                      type="file"
                      id="document-upload"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      multiple
                      className="hidden"
                    />
                    <label
                      htmlFor="document-upload"
                      className="flex flex-col items-center justify-center cursor-pointer h-32"
                    >
                      <DocumentArrowUpIcon className="h-10 w-10 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-300">
                        {t('clients.clickToUploadFiles')}
                      </span>
                      <span className="text-xs text-gray-400 mt-1">
                        {t('clients.orDragAndDrop')}
                      </span>
                    </label>
                  </div>

                  {uploadError && (
                    <div
                      className={`mt-2 text-red-400 text-sm flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <ExclamationCircleIcon className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                      {uploadError}
                    </div>
                  )}

                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">
                        {t('clients.filesToUpload')}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {uploadedFiles.map((file, index) => (
                          <div
                            key={index}
                            className={`flex items-center justify-between bg-gray-700 p-2 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}
                          >
                            <div
                              className={`flex items-center overflow-hidden ${isRTL ? 'flex-row-reverse' : ''}`}
                            >
                              {file.preview ? (
                                <img
                                  src={file.preview}
                                  alt={t('clients.preview')}
                                  className={`h-10 w-10 object-cover rounded ${isRTL ? 'ml-2' : 'mr-2'}`}
                                />
                              ) : (
                                <DocumentIcon
                                  className={`h-8 w-8 text-blue-400 ${isRTL ? 'ml-2' : 'mr-2'}`}
                                />
                              )}
                              <div className="overflow-hidden">
                                <p
                                  className={`text-white text-sm truncate ${isRTL ? 'text-right' : 'text-left'}`}
                                >
                                  {file.name}
                                </p>
                                <p
                                  className={`text-gray-400 text-xs ${isRTL ? 'text-right' : 'text-left'}`}
                                >
                                  {formatFileType(file.type)} • {formatFileSize(file.size)}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeUploadedFile(index)}
                              className={`text-gray-400 hover:text-red-400 ${isRTL ? 'mr-2' : 'ml-2'}`}
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div
                className={`flex justify-end pt-6 border-t border-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <Link
                  to={returnTo || '/clients'}
                  state={
                    returnTo
                      ? {
                          returnedFromClient: true,
                          restoredFormData: rentalFormData,
                          restoredSelectedCar: selectedCar,
                          restoredSearchTerm: searchTerm,
                        }
                      : undefined
                  }
                  className={`px-6 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors ${isRTL ? 'ml-6' : 'mr-6'}`}
                >
                  {t('common.cancel')}
                </Link>
                <button
                  type="submit"
                  className={`px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg
                        className={`animate-spin h-4 w-4 text-white ${isRTL ? 'ml-2' : '-ml-1 mr-2'}`}
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
                      {t('clients.saving')}
                    </>
                  ) : (
                    t('clients.saveClient')
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const formatFileSize = bytes => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatFileType = mimeType => {
  const types = {
    'application/pdf': 'PDF',
    'image/jpeg': 'JPEG',
    'image/jpg': 'JPG',
    'image/png': 'PNG',
  };
  return types[mimeType] || mimeType;
};

export default AddClientPage;


// src/pages/Clients/EditClientPage.jsx - FIXED
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import secureApi from '../../utils/secureApi';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  ArrowLeftIcon,
  DocumentArrowUpIcon,
  ExclamationCircleIcon,
  XMarkIcon,
  DocumentIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const EditClientPage = () => {
  const { t, isRTL } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
  });
  const [documents, setDocuments] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadError, setUploadError] = useState(null);
  useEffect(() => {
    const fetchClientData = async () => {
      try {
        setLoading(true);

        // Use the API utility method
        const response = await secureApi.getClient(id);

        if (response.data) {
          console.log('Client data received:', response.data);

          setFormData({
            name: response.data.name || '',
            phone_number: response.data.phone_number || '',
          });

          // Fetch documents separately
          try {
            const docsResponse = await secureApi.get(`/documents/clients/${id}/documents/`);
            if (docsResponse.data && Array.isArray(docsResponse.data)) {
              setDocuments(docsResponse.data);
            }
          } catch (docErr) {
            console.log('No documents found:', docErr);
            setDocuments([]);
          }
        } else {
          setError(t('clients.clientNotFound'));
        }
      } catch (err) {
        console.error('Error fetching client data:', err);
        setError(t('clients.error'));
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, [id, t]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));
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

  const handleDeleteDocument = async documentId => {
    if (!documentId) return;

    if (window.confirm(t('clients.confirmDeleteDocument'))) {
      try {
        // Update the UI first for better UX
        setDocuments(prevDocs => prevDocs.filter(doc => doc.document_id !== documentId));

        // Simple API call
        await secureApi.delete(`/documents/${documentId}`);
        console.log('Document deleted successfully');
      } catch (err) {
        console.error('Error deleting document:', err);
        // Error already happened but UI is already updated, so no need to do anything
      }
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();

    try {
      setSubmitting(true);

      // Update the client data using the API utility method
      await secureApi.updateClient(id, formData);

      // Handle file uploads if any
      if (uploadedFiles.length > 0) {
        const formDataFiles = new FormData();
        formDataFiles.append('client_id', id);

        uploadedFiles.forEach(fileObj => {
          formDataFiles.append('files', fileObj.file);
        });

        // Upload using the correct endpoint
        await secureApi.post('/documents/clients/documents/', formDataFiles);
      }

      navigate(`/clients/${id}`, { state: { message: t('clients.clientUpdatedSuccessfully') } });
    } catch (err) {
      console.error('Error updating client:', err);
      setError(t('clients.failedToUpdateClient'));
    } finally {
      setSubmitting(false);
    }
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
        <div className="bg-red-800 p-6 rounded-lg shadow-lg max-w-md w-full">
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          to={`/clients/${id}`}
          className={`text-blue-500 hover:text-blue-400 inline-flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <ArrowLeftIcon className={`h-5 w-5 ${isRTL ? 'ml-1' : 'mr-1'}`} />
          {t('clients.backToClientDetails')}
        </Link>
      </div>

      <div className="bg-gray-900 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">{t('clients.editClient')}</h1>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-1">{t('clients.name')}</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full bg-gray-700 border border-gray-600 rounded py-2 px-3 text-white focus:outline-none focus:border-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">{t('clients.phoneNumber')}</label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  className={`w-full bg-gray-700 border border-gray-600 rounded py-2 px-3 text-white focus:outline-none focus:border-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold border-b border-gray-700 pb-2">
                {t('clients.documents')}
              </h2>

              {documents.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    {t('clients.savedDocuments')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {documents.map((doc, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between bg-gray-700 p-2 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <div
                          className={`flex items-center overflow-hidden ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          {doc.file_type?.startsWith('image/') ? (
                            <img
                              src={doc.url}
                              alt={t('clients.documentPreview')}
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
                              {doc.name}
                            </p>
                            <p
                              className={`text-gray-400 text-xs ${isRTL ? 'text-right' : 'text-left'}`}
                            >
                              {formatFileType(doc.file_type)} • {formatFileSize(doc.file_size)}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`flex items-center space-x-2 ${isRTL ? 'space-x-reverse flex-row-reverse' : ''}`}
                        >
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-xs"
                          >
                            {t('clients.viewDocument')}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc.document_id)}
                            className="text-red-400 hover:text-red-300"
                            title={t('clients.deleteDocument')}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-gray-400 mb-2">
                  {t('clients.uploadNewDocuments')}
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
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    <DocumentArrowUpIcon className="h-10 w-10 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-300">{t('clients.clickToUploadFiles')}</span>
                    <span className="text-xs text-gray-400 mt-1">{t('clients.orDragAndDrop')}</span>
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
                to={`/clients/${id}`}
                className={`px-6 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors ${isRTL ? 'ml-6' : 'mr-6'}`}
              >
                {t('common.cancel')}
              </Link>
              <button
                type="submit"
                className={`px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}
                disabled={submitting}
              >
                {submitting ? (
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
                  t('clients.saveChanges')
                )}
              </button>
            </div>
          </div>
        </form>
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

export default EditClientPage;


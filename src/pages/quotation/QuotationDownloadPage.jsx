import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Navigation from '../../components/common/Navigation';
import QuotationDetails from '../../components/quotations/QuotationDetails';
import QuotationPreview from '../../components/quotations/QuotationPreview';
import ApiHelper from '../../utils/api/ApiHelper';
import toast from 'react-hot-toast';

const QuotationDownloadPage = () => {
  const navigate = useNavigate();
  const { quotationId } = useParams();
  const [searchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState('details'); // 'details' or 'preview'
  const [quotationData, setQuotationData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if we should start with preview view
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'preview') {
      setCurrentView('preview');
    }
  }, [searchParams]);

  // Fetch quotation data from backend using quotationId
  useEffect(() => {
    const fetchQuotation = async () => {
      if (!quotationId) {
        toast.error('No quotation ID provided');
        navigate('/quotations');
        return;
      }

      setLoading(true);
      try {
        const response = await ApiHelper.get(`/api/quotations/by-id/${quotationId}`);
        if (response.data.success) {
          setQuotationData(response.data.data);
        } else {
          toast.error(`Failed to load quotation: ${response.data.message || 'Unknown error'}`);
          navigate('/quotations');
        }
      } catch (error) {
        console.error('Error fetching quotation:', error);
        toast.error(`Failed to load quotation: ${error.response?.data?.message || error.message}`);
        navigate('/quotations');
      } finally {
        setLoading(false);
      }
    };

    fetchQuotation();
  }, [quotationId, navigate]);

  const handleEdit = (context = {}) => {
    // Navigate to form page with edit context using URL parameters
    const mode = context.mode || 'edit-offer';
    const offerId = context.offer?._id || '';
    navigate(`/quotations/form/${quotationId}?mode=${mode}&offerId=${offerId}`);
  };

  const handleDelete = (quotation) => {
    // The delete is handled in the QuotationDetails component
    console.log('Quotation deleted:', quotation);
    // After deletion, redirect to list
    navigate('/quotations');
  };

  const handlePreview = (quotationData) => {
    setQuotationData(quotationData);
    setCurrentView('preview');
  };

  const handleBackToDetails = () => {
    setCurrentView('details');
  };

  const handleBackToList = () => {
    navigate('/quotations');
  };

  const handleDownload = () => {
    // Download is handled in QuotationPreview component
    // After download, we can stay on preview or go back to details
  };

  if (loading || !quotationData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation title="Quotation Management" subtitle="Loading..." />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading quotation data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation title="Quotation Management" subtitle="Kelola dan lacak quotation Anda" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <button
                onClick={handleBackToList}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentView === 'preview' ? 'Quotation Preview & Download' : 'Quotation Details'}
              </h1>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {currentView === 'details' ? (
              <QuotationDetails
                quotation={quotationData}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onClose={handleBackToList}
                onPreview={handlePreview}
              />
            ) : (
              <QuotationPreview
                quotationData={quotationData}
                onBack={handleBackToDetails}
                onDownload={handleDownload}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationDownloadPage;

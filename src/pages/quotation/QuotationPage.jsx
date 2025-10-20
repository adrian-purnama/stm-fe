import React, { useState, useContext, useEffect } from 'react';
import { ArrowLeft, BarChart3, CheckCircle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../../components/Navigation';
import QuotationList from '../../components/quotations/QuotationList';
import { UserContext } from '../../utils/UserContext';
import ApiHelper from '../../utils/ApiHelper';
import toast from 'react-hot-toast';

const QuotationPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('create');
  const [hasApproveRfqPermission, setHasApproveRfqPermission] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(true);

  // Check if user has approve_rfq permission using the new endpoint
  useEffect(() => {
    const checkPermission = async () => {
      try {
        setPermissionLoading(true);
        const response = await ApiHelper.get('/api/auth/ispermission/approve_rfq');
        const hasPermission = response.data.message?.hasPermission || response.data.data?.hasPermission || response.data.hasPermission;
        setHasApproveRfqPermission(hasPermission);
      } catch (error) {
        console.error('Error checking permission:', error);
        setHasApproveRfqPermission(false);
      } finally {
        setPermissionLoading(false);
      }
    };

    if (user?.isLoggedIn) {
      checkPermission();
    }
  }, [user]);

  const handleView = (quotationData) => {
    // Navigate to details page with quotation ID
    // Handle different data structures from QuotationList
    if (!quotationData) {
      toast.error('No quotation data provided');
      return;
    }
    
    let quotationId;
    
    // Try to find quotationId in various possible locations
    if (quotationData.header && quotationData.header._id) {
      // Structure: { header: { _id: ... }, offers: [...] } or { header: { _id: ... }, offers: [...], activeOfferId: ... }
      quotationId = quotationData.header._id;
    } else if (quotationData.header && quotationData.header.id) {
      // Structure: { header: { id: ... }, offers: [...] } - some objects use 'id' instead of '_id'
      quotationId = quotationData.header.id;
    } else if (quotationData.header && quotationData.header.quotationNumber) {
      // Fallback: use quotationNumber if _id is not available
      quotationId = quotationData.header.quotationNumber;
    } else if (quotationData._id) {
      // Structure: direct header object
      quotationId = quotationData._id;
    } else if (quotationData.id) {
      // Structure: direct header object with 'id' field
      quotationId = quotationData.id;
    } else {
      toast.error('Unable to find quotation ID');
      return;
    }
    
    // Ensure quotationId is a string
    const stringQuotationId = quotationId.toString();
    navigate(`/quotations/details/${stringQuotationId}`);
  };

  const handlePreview = (quotationData) => {
    // Navigate directly to document preview/download page
    if (!quotationData) {
      toast.error('No quotation data provided');
      return;
    }
    
    let quotationId;
    
    // Try to find quotationId in various possible locations
    if (quotationData.header && quotationData.header._id) {
      quotationId = quotationData.header._id;
    } else if (quotationData.header && quotationData.header.id) {
      quotationId = quotationData.header.id;
    } else if (quotationData.header && quotationData.header.quotationNumber) {
      quotationId = quotationData.header.quotationNumber;
    } else if (quotationData._id) {
      quotationId = quotationData._id;
    } else if (quotationData.id) {
      quotationId = quotationData.id;
    } else {
      toast.error('Unable to find quotation ID');
      return;
    }
    
    // Navigate to download page with preview mode active
    const stringQuotationId = quotationId.toString();
    navigate(`/quotations/details/${stringQuotationId}?view=preview`);
  };

  const handleEdit = (context = {}) => {
    // Navigate to form page with quotation ID and mode
    const quotationId = context.header?._id || context._id;
    const mode = context.mode || 'edit-offer';
    
    if (mode === 'create-quotation') {
      // For creating new quotation, no ID needed
      navigate('/quotations/form');
    } else {
      // For editing existing quotation, include ID and mode
      navigate(`/quotations/form/${quotationId}?mode=${mode}&offerId=${context.offer?._id || ''}`);
    }
  };

  const handleCreate = () => {
    // Navigate to form page for creation
    navigate('/quotations/form');
  };

  const handleDelete = () => {
    // The delete is handled in the QuotationList component
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation title="Quotation Management" subtitle="Kelola dan lacak quotation Anda" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Quotation Management</h1>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('create')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'create'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Create Quotation
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('request')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'request'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {hasApproveRfqPermission ? 'Approve RFQ' : 'Request Quotation'}
                </div>
              </button>
            </nav>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </button>
              <button
                onClick={() => navigate('/quotations/analysis')}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analysis
              </button>
            </div>
            <div className="text-sm text-gray-500">
              {activeTab === 'create' 
                ? 'Create and manage your quotations'
                : (hasApproveRfqPermission ? 'Review and approve RFQ requests' : 'Create and manage your quotation requests')
              }
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {permissionLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-500">Checking permissions...</p>
              </div>
            ) : activeTab === 'create' ? (
              <QuotationList
                onView={handleView}
                onPreview={handlePreview}
                onEdit={handleEdit}
                onCreate={handleCreate}
                onDelete={handleDelete}
              />
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {hasApproveRfqPermission ? 'Approve RFQ' : 'Request Quotation'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {hasApproveRfqPermission 
                    ? 'This section will contain the RFQ approval functionality.'
                    : 'This section will contain the quotation request functionality.'
                  }
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm text-blue-800">
                    <strong>Coming Soon:</strong> {hasApproveRfqPermission 
                      ? 'RFQ approval workflow, bid/no-bid decision tools, and vendor evaluation features.'
                      : 'RFQ creation, vendor selection, and quotation request management features.'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationPage;
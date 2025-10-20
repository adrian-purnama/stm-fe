import React, { useState, useContext, useEffect } from 'react';
import { ArrowLeft, BarChart3, CheckCircle, FileText, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../../components/Navigation';
import QuotationList from '../../components/quotations/QuotationList';
import RequestQuotationTab from '../../components/quotations/RequestQuotationTab';
import ApproveQuotationTab from '../../components/quotations/ApproveQuotationTab';
import { UserContext } from '../../utils/UserContext';
import ApiHelper from '../../utils/ApiHelper';
import toast from 'react-hot-toast';

const QuotationPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('create');
  const [hasApproveRfqPermission, setHasApproveRfqPermission] = useState(false);
  const [hasQuotationCreatePermission, setHasQuotationCreatePermission] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(true);

  // Check user permissions
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        setPermissionLoading(true);
        
        // Check approve_rfq permission
        const approveResponse = await ApiHelper.get('/api/auth/ispermission/approve_rfq');
        const hasApprovePermission = approveResponse.data.message?.hasPermission || approveResponse.data.data?.hasPermission || approveResponse.data.hasPermission;
        setHasApproveRfqPermission(hasApprovePermission);
        
        // Check quotation_create permission
        const createResponse = await ApiHelper.get('/api/auth/ispermission/quotation_create');
        const hasCreatePermission = createResponse.data.message?.hasPermission || createResponse.data.data?.hasPermission || createResponse.data.hasPermission;
        setHasQuotationCreatePermission(hasCreatePermission);
        
      } catch (error) {
        console.error('Error checking permissions:', error);
        setHasApproveRfqPermission(false);
        setHasQuotationCreatePermission(false);
      } finally {
        setPermissionLoading(false);
      }
    };

    if (user?.isLoggedIn) {
      checkPermissions();
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
              {/* Create Quotation Tab - Always visible */}
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
              
              {/* Request Quotation Tab - Only if user has quotation_create permission */}
              {hasQuotationCreatePermission && (
                <button
                  onClick={() => setActiveTab('request')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'request'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Request Quotation
                  </div>
                </button>
              )}
              
              {/* Approve Quotation Tab - Only if user has approve_rfq permission */}
              {hasApproveRfqPermission && (
                <button
                  onClick={() => setActiveTab('approve')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'approve'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Approve Quotation
                  </div>
                </button>
              )}
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
                : activeTab === 'request'
                ? 'Create and manage your quotation requests'
                : 'Review and approve RFQ requests'
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
            ) : activeTab === 'request' ? (
              <RequestQuotationTab />
            ) : (
              <ApproveQuotationTab />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationPage;
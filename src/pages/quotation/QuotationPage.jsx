import React, { useState, useContext, useEffect, useCallback } from 'react';
import { ArrowLeft, BarChart3, CheckCircle, FileText, Users, List, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Navigation from '../../components/common/Navigation';
import QuotationList from '../../components/quotations/QuotationList';
import RequestQuotationTab from '../../components/quotations/RequestQuotationTab';
import ApproveQuotationTab from '../../components/quotations/ApproveQuotationTab';
import RequestQuotationListTab from '../../components/quotations/RequestQuotationListTab';
import RFQDetailsView from '../../components/quotations/RFQDetailsView';
import { UserContext } from '../../utils/contexts/UserContext';
import axiosInstance from '../../utils/api/ApiHelper';
import toast from 'react-hot-toast';

const QuotationPage = () => {
  const navigate = useNavigate();
  const { rfqId } = useParams();
  const { user } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('list');
  const [hasApproveRfqPermission, setHasApproveRfqPermission] = useState(false);
  const [hasQuotationCreatePermission, setHasQuotationCreatePermission] = useState(false);
  const [hasQuotationRequesterPermission, setHasQuotationRequesterPermission] = useState(false);
  const [hasAdminPermission, setHasAdminPermission] = useState(false);
  const [hasAllQuotationViewerPermission, setHasAllQuotationViewerPermission] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [rfqDetails, setRfqDetails] = useState(null);
  const [rfqLoading, setRfqLoading] = useState(false);

  const fetchRFQDetails = useCallback(async () => {
    try {
      setRfqLoading(true);
      const response = await axiosInstance.get(`/api/rfq/${rfqId}`);
      setRfqDetails(response.data.data.rfq);
    } catch (error) {
      console.error('Error fetching RFQ details:', error);
      toast.error('Failed to fetch RFQ details');
    } finally {
      setRfqLoading(false);
    }
  }, [rfqId]);

  // Fetch RFQ details if rfqId is present
  useEffect(() => {
    if (rfqId) {
      fetchRFQDetails();
    }
  }, [rfqId, fetchRFQDetails]);

  // Check user permissions
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        setPermissionLoading(true);
        
        // Force clear any cached state
        setHasApproveRfqPermission(false);
        setHasQuotationCreatePermission(false);
        setHasQuotationRequesterPermission(false);
        setHasAdminPermission(false);
        setHasAllQuotationViewerPermission(false);
        
        // Check approve_rfq permission
        const approveResponse = await axiosInstance.get('/api/auth/ispermission/approve_rfq', {
          params: { _t: Date.now() } // Cache busting
        });
        const hasApprovePermission = approveResponse.data.message?.hasPermission;
        setHasApproveRfqPermission(hasApprovePermission);
        
        // Check quotation_create permission
        const createResponse = await axiosInstance.get('/api/auth/ispermission/quotation_create', {
          params: { _t: Date.now() } // Cache busting
        });
        const hasCreatePermission = createResponse.data.message?.hasPermission;
        setHasQuotationCreatePermission(hasCreatePermission);
        
        // Check quotation_requester permission
        const requesterResponse = await axiosInstance.get('/api/auth/ispermission/quotation_requester', {
          params: { 
            _t: Date.now(),
            _r: Math.random() // Additional cache busting
          }
        });
        const hasRequesterPermission = requesterResponse.data.message?.hasPermission;
        console.log('🔍 Frontend quotation_requester permission check:', {
          response: requesterResponse.data,
          hasPermission: hasRequesterPermission
        });
        setHasQuotationRequesterPermission(hasRequesterPermission);
        
        // Check admin permissions (quotation_admin, admin, or manager)
        const adminResponse = await axiosInstance.get('/api/auth/ispermission/quotation_admin', {
          params: { _t: Date.now() } // Cache busting
        });
        const managerResponse = await axiosInstance.get('/api/auth/ispermission/admin', {
          params: { _t: Date.now() } // Cache busting
        });
        const hasAdminPermission = adminResponse.data.message?.hasPermission || managerResponse.data.message?.hasPermission;
        setHasAdminPermission(hasAdminPermission);
        
        // Check all_quotation_viewer permission
        const allQuotationViewerResponse = await axiosInstance.get('/api/auth/ispermission/all_quotation_viewer', {
          params: { _t: Date.now() } // Cache busting
        });
        const hasAllQuotationViewerPermission = allQuotationViewerResponse.data.message?.hasPermission;
        setHasAllQuotationViewerPermission(hasAllQuotationViewerPermission);
        
        // Set default tab based on permissions
        // Priority: Approve RFQ > All Quotations Viewer > Quotation Create > Quotation Requester
        if (hasApprovePermission) {
          console.log('Setting active tab to approve - user has approve_rfq permission');
          setActiveTab('approve');
        } else if (hasAllQuotationViewerPermission) {
          console.log('Setting active tab to all-quotations - user has all_quotation_viewer permission');
          setActiveTab('all-quotations');
        } else if (hasCreatePermission) {
          console.log('Setting active tab to rfq-list - user has quotation_create permission');
          setActiveTab('rfq-list');
        } else if (hasRequesterPermission) {
          console.log('Setting active tab to request - user has quotation_requester permission');
          setActiveTab('request');
        } else {
          console.log('Setting active tab to list - no specific permissions found');
          setActiveTab('list');
        }
        
        // Debug final state
        console.log('🔍 Final permission state after API calls:', {
          hasApproveRfqPermission,
          hasQuotationCreatePermission,
          hasQuotationRequesterPermission,
          hasAdminPermission,
          hasAllQuotationViewerPermission
        });
        
      } catch (error) {
        console.error('Error checking permissions:', error);
        setHasApproveRfqPermission(false);
        setHasQuotationCreatePermission(false);
        setHasQuotationRequesterPermission(false);
      } finally {
        setPermissionLoading(false);
      }
    };

    if (user?.isLoggedIn) {
      checkPermissions();
    }
  }, [user]);

  // Additional effect to ensure tab is set correctly when permissions change
  useEffect(() => {
    if (!permissionLoading) {
      console.log('Permission loading complete. Current permissions:', {
        hasApproveRfqPermission,
        hasQuotationCreatePermission,
        hasQuotationRequesterPermission,
        hasAllQuotationViewerPermission,
        activeTab
      });
      
      // If user only has approve_rfq permission, ensure approve tab is active
      if (hasApproveRfqPermission && !hasQuotationCreatePermission && !hasQuotationRequesterPermission && !hasAllQuotationViewerPermission) {
        if (activeTab !== 'approve') {
          console.log('Forcing active tab to approve for user with only approve_rfq permission');
          setActiveTab('approve');
        }
      }
      // If user only has all_quotation_viewer permission, ensure all-quotations tab is active
      else if (hasAllQuotationViewerPermission && !hasApproveRfqPermission && !hasQuotationCreatePermission && !hasQuotationRequesterPermission) {
        if (activeTab !== 'all-quotations') {
          console.log('Forcing active tab to all-quotations for user with only all_quotation_viewer permission');
          setActiveTab('all-quotations');
        }
      }
    }
  }, [permissionLoading, hasApproveRfqPermission, hasQuotationCreatePermission, hasQuotationRequesterPermission, hasAllQuotationViewerPermission, activeTab]);

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

  // Get tab descriptions based on active tab
  const getTabDescription = () => {
    switch (activeTab) {
      case 'list':
        return 'View quotations created from your RFQ requests (view and download only)';
      case 'request':
        return 'Create new RFQ requests for quotation approval';
      case 'approve':
        return 'Review and approve/reject RFQ requests';
      case 'rfq-list':
        return 'View approved RFQ requests and create quotations';
      case 'my-created-quotations':
        return 'Manage quotations you have created (edit, add revisions, add offers)';
      case 'all-quotations':
        return 'View all quotations in the system';
      default:
        return 'Manage your quotation workflow';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation title="Quotation Management" subtitle="Kelola dan lacak quotation Anda" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Show RFQ Details if rfqId is present */}
        {rfqId ? (
          <RFQDetailsView rfq={rfqDetails} loading={rfqLoading} />
        ) : (
          <>
            <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Quotation Management</h1>

          {/* Role-based Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide px-1 sm:px-0">
              {/* Requester Role: "Request Quotation" and "Quotation List" tabs */}
              {hasQuotationRequesterPermission && (
                <>
                  <button
                    onClick={() => setActiveTab('request')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex-shrink-0 whitespace-nowrap ${
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
                  <button
                    onClick={() => setActiveTab('list')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex-shrink-0 whitespace-nowrap ${
                      activeTab === 'list'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <List className="h-4 w-4 mr-2" />
                      My Quotations
                    </div>
                  </button>
                </>
              )}

              {/* Approver Role: Only "Approve RFQ" tab */}
              {hasApproveRfqPermission && (
                <button
                  onClick={() => setActiveTab('approve')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex-shrink-0 whitespace-nowrap ${
                    activeTab === 'approve'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve RFQ
                  </div>
                </button>
              )}

              {/* Creator Role: "RFQ List" and "Quotation List" tabs */}
              {hasQuotationCreatePermission && (
                <>
                  <button
                    onClick={() => setActiveTab('rfq-list')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex-shrink-0 whitespace-nowrap ${
                      activeTab === 'rfq-list'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <List className="h-4 w-4 mr-2" />
                      RFQ List
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('my-created-quotations')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex-shrink-0 whitespace-nowrap ${
                      activeTab === 'my-created-quotations'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Manage My Quotations
                    </div>
                  </button>
                  {(hasAdminPermission || hasAllQuotationViewerPermission) && (
                    <button
                      onClick={() => setActiveTab('all-quotations')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm flex-shrink-0 whitespace-nowrap ${
                        activeTab === 'all-quotations'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        All Quotations
                      </div>
                    </button>
                  )}
                </>
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
              {getTabDescription()}
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
            ) : (
              <>
                {/* Requester Role Content */}
                {activeTab === 'request' && hasQuotationRequesterPermission && (
                  <RequestQuotationTab />
                )}
                {activeTab === 'list' && hasQuotationRequesterPermission && (
                  <QuotationList
                    onView={handleView}
                    onPreview={handlePreview}
                    onEdit={handleEdit}
                    onCreate={handleCreate}
                    onDelete={handleDelete}
                    showCreateButton={false}
                    filterMode="my_quotations"
                    actionMode="view_only"
                  />
                )}

                {/* Approver Role Content */}
                {activeTab === 'approve' && hasApproveRfqPermission && (
                  <ApproveQuotationTab />
                )}

                {/* Creator Role Content */}
                {activeTab === 'rfq-list' && hasQuotationCreatePermission && (
                  <RequestQuotationListTab />
                )}
                {activeTab === 'my-created-quotations' && hasQuotationCreatePermission && (
                  <QuotationList
                    onView={handleView}
                    onPreview={handlePreview}
                    onEdit={handleEdit}
                    onCreate={handleCreate}
                    onDelete={handleDelete}
                    showCreateButton={false}
                    filterMode="created_by_me"
                    actionMode="full"
                  />
                )}
                {/* All Quotations Content - for both admin and viewer permissions */}
                {activeTab === 'all-quotations' && (hasAdminPermission || hasAllQuotationViewerPermission) && (
                  <QuotationList
                    onView={handleView}
                    onPreview={handlePreview}
                    onEdit={handleEdit}
                    onCreate={handleCreate}
                    onDelete={handleDelete}
                    showCreateButton={false}
                    filterMode={hasAdminPermission ? "all" : "all_viewer"}
                    apiEndpoint={hasAdminPermission ? "/api/quotations" : "/api/quotations/all"}
                    actionMode="full"
                  />
                )}
              </>
            )}
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QuotationPage;
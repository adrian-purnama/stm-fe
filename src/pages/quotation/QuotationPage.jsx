import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { ArrowLeft, BarChart3, CheckCircle, CheckCircle2, FileText, List, Wrench } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Navigation from '../../components/common/Navigation';
import LazyTabs from '../../components/common/LazyTabs';
import RFQDetailsView from '../../components/quotations/RFQDetailsView';
import axiosInstance from '../../utils/api/ApiHelper';
import toast from 'react-hot-toast';
import useSmartBackNavigation from '../../hooks/useSmartBackNavigation';

const QuotationPage = () => {
  const navigate = useNavigate();
  const handleBack = useSmartBackNavigation('/dashboard');
  const { rfqId } = useParams();
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

  // Handler functions for quotation actions
  const handleView = useCallback((quotationData) => {
    if (!quotationData) {
      toast.error('No quotation data provided');
      return;
    }
    
    let quotationId;
    
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
    
    const stringQuotationId = quotationId.toString();
    // URL encode the quotation ID to handle slashes and special characters
    const encodedQuotationId = encodeURIComponent(stringQuotationId);
    navigate(`/quotations/details/${encodedQuotationId}`);
  }, [navigate]);

  const handlePreview = useCallback((quotationData) => {
    if (!quotationData) {
      toast.error('No quotation data provided');
      return;
    }
    
    let quotationId;
    
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
    
    const stringQuotationId = quotationId.toString();
    // URL encode the quotation ID to handle slashes and special characters
    const encodedQuotationId = encodeURIComponent(stringQuotationId);
    navigate(`/quotations/details/${encodedQuotationId}?view=preview`);
  }, [navigate]);

  const handleEdit = useCallback((context = {}) => {
    const quotationId = context.header?._id || context._id;
    const mode = context.mode || 'edit-offer';
    
    if (mode === 'create-quotation') {
      navigate('/quotations/form');
    } else {
      navigate(`/quotations/form/${quotationId}?mode=${mode}&offerId=${context.offer?._id || ''}`);
    }
  }, [navigate]);

  const handleCreate = useCallback(() => {
    navigate('/quotations/form');
  }, [navigate]);

  const handleDelete = useCallback(() => {
    // The delete is handled in the QuotationList component
  }, []);

  // Define tabs with lazy loading and permissions
  const tabs = useMemo(() => {
    const tabList = [];

    // Requester Role Tabs
    tabList.push(
      {
        key: 'request',
        label: 'Request Quotation',
        icon: FileText,
        permissionKey: 'quotation_requester',
        component: () => import('../../components/quotations/RequestQuotationTab')
      },
      {
        key: 'list',
        label: 'My Quotations',
        icon: List,
        permissionKey: 'quotation_requester',
        component: () => {
          return import('../../components/quotations/QuotationList').then(module => ({
            default: () => {
              const QuotationList = module.default;
              return (
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
              );
            }
          }));
        }
      }
    );

    // Engineering Role Tab
    tabList.push({
      key: 'engineering-review',
      label: 'Engineering Review',
      icon: FileText,
      permissionKey: 'engineer_review',
      component: () => import('../../components/quotations/EngineeringReviewTab')
    });

    // Approver Role Tab
    tabList.push({
      key: 'approve',
      label: 'Approve RFQ',
      icon: CheckCircle,
      permissionKey: 'approve_rfq',
      component: () => import('../../components/quotations/ApproveQuotationTab')
    });

    // Download Approval Role Tab
    tabList.push({
      key: 'download-approval',
      label: 'Download Approval',
      icon: CheckCircle2,
      permissionKey: ['engineer_download_approver', 'quotation_download_approver'], // Show if user has either permission
      component: () => import('../../components/quotations/DownloadApprovalTab')
    });

    // Creator Role Tabs
    tabList.push(
      {
        key: 'rfq-list',
        label: 'RFQ List',
        icon: List,
        permissionKey: 'quotation_create',
        component: () => import('../../components/quotations/RequestQuotationListTab')
      },
      {
        key: 'my-created-quotations',
        label: 'Manage My Quotations',
        icon: FileText,
        permissionKey: 'quotation_create',
        component: () => {
          return import('../../components/quotations/QuotationList').then(module => ({
            default: () => {
              const QuotationList = module.default;
              return (
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
              );
            }
          }));
        }
      }
    );

    // Admin/Viewer Role Tabs
    tabList.push({
      key: 'all-quotations',
      label: 'All Quotations',
      icon: FileText,
      permissionKey: 'all_quotation_viewer',
      component: () => {
        return import('../../components/quotations/QuotationList').then(module => ({
          default: () => {
            const QuotationList = module.default;
            return (
              <QuotationList
                onView={handleView}
                onPreview={handlePreview}
                onEdit={handleEdit}
                onCreate={handleCreate}
                onDelete={handleDelete}
                showCreateButton={false}
                filterMode="all"
                apiEndpoint="/api/quotations/all"
                actionMode="full"
              />
            );
          }
        }));
      }
    });

    tabList.push({
      key: 'all-rfq',
      label: 'All RFQ',
      icon: FileText,
      permissionKey: 'all_quotation_viewer',
      component: () => import('../../components/quotations/AllRFQTab')
    });

    return tabList;
  }, [handleView, handlePreview, handleEdit, handleCreate, handleDelete]);

  // Determine default active tab based on priority
  const getDefaultActiveTab = () => {
    // Priority: Approve RFQ > All Quotations Viewer > Quotation Create > Quotation Requester
    // This will be handled by LazyTabs based on visible tabs and permissions
    return 'list'; // Fallback, but LazyTabs will choose first visible tab
  };

  // Get tab description based on active tab
  const getTabDescription = (activeTab) => {
    switch (activeTab) {
      case 'list':
        return 'View quotations created from your RFQ requests (view and download only)';
      case 'request':
        return 'Create new RFQ requests for quotation approval';
      case 'approve':
        return 'Review and approve/reject RFQ requests';
      case 'download-approval':
        return 'Approve quotation offers for download (requires both engineer and management approval)';
      case 'rfq-list':
        return 'View approved RFQ requests and create quotations';
      case 'my-created-quotations':
        return 'Manage quotations you have created (edit, add revisions, add offers)';
      case 'all-quotations':
        return 'View all quotations in the system';
      case 'all-rfq':
        return 'View all RFQ requests in the system';
      default:
        return 'Manage your quotation workflow';
    }
  };

  const [activeTab, setActiveTab] = useState(null);

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
              <div className="flex flex-col gap-4 rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-gray-100 backdrop-blur sm:p-6">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Quotation Workspace
                    </span>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                        Quotation Management
                      </h1>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-gray-500 sm:text-base">
                    {activeTab ? getTabDescription(activeTab) : 'Kelola dan lacak seluruh proses quotation sesuai peran Anda.'}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
                  <button
                    onClick={handleBack}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 sm:w-auto"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                  </button>
                  <button
                    onClick={() => navigate('/quotations/analysis')}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 sm:w-auto"
                  >
                    <BarChart3 className="h-4 w-4" />
                    View Analysis
                  </button>
                </div>
              </div>
            </div>
            
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
              <div className="p-4 sm:p-6">
                <LazyTabs
                  tabs={tabs}
                  defaultActiveTab={getDefaultActiveTab()}
                  storageKey="quotation-active-tab"
                  loadInitialTab={true}
                  variant="default"
                  onTabChange={setActiveTab}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QuotationPage;

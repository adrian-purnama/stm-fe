import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationsContext } from '../../utils/contexts/NotificationsContext';
import axiosInstance from '../../utils/api/ApiHelper';
import BaseModal from '../modals/BaseModal';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, Eye, AlertCircle, X, MessageSquare, Search } from 'lucide-react';
import { UserContext } from '../../utils/contexts/UserContext';
import { usePermissions } from '../../hooks/usePermissions';

const DownloadApprovalTab = () => {
  const navigate = useNavigate();
  const { connected } = useContext(NotificationsContext);
  const { user } = useContext(UserContext);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Check user permissions using the permission hook (handles super_admin correctly)
  const { hasPermission, loading: permissionsLoading } = usePermissions(['engineer_download_approver', 'quotation_download_approver']);
  const hasEngineerPermission = hasPermission('engineer_download_approver');
  const hasManagementPermission = hasPermission('quotation_download_approver');
  
  // Debug logging
  useEffect(() => {
    if (!permissionsLoading) {
      console.log('[DownloadApprovalTab] Permissions loaded:', {
        hasEngineerPermission,
        hasManagementPermission,
        engineerPermission: hasPermission('engineer_download_approver'),
        managementPermission: hasPermission('quotation_download_approver')
      });
    }
  }, [permissionsLoading, hasEngineerPermission, hasManagementPermission, hasPermission]);

  // Fetch offers pending approval
  const fetchPendingOffers = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/quotations/pending-approval');
      const offersArray = response.data.data?.offers || [];
      setOffers(offersArray);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      toast.error('Failed to fetch pending approvals');
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle approval
  const handleApprove = async (offer, approvalType) => {
    try {
      setIsProcessing(true);
      // Get quotation header ID (prefer _id, fallback to quotationNumber)
      const quotationHeaderId = offer.header?._id || 
                                 offer.quotationHeaderId?._id || 
                                 offer.quotationHeaderId ||
                                 offer.header?.quotationNumber || 
                                 offer.quotationHeaderId?.quotationNumber;
      
      // Simple endpoint - all data in body
      const endpoint = `/api/quotations/approve/${approvalType}`;
      
      await axiosInstance.post(endpoint, {
        quotationHeaderId: quotationHeaderId,
        offerId: offer._id,
        action: 'approve',
        note: approvalNote.trim() || ''
      });
      
      toast.success(`Offer ${approvalType === 'engineer' ? 'engineer' : 'management'} approval successful`);
      fetchPendingOffers();
      setShowApprovalModal(false);
      setSelectedOffer(null);
      setApprovalNote('');
    } catch (error) {
      console.error('Error approving offer:', error);
      toast.error(error.response?.data?.message || 'Failed to approve offer');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle rejection
  const handleReject = async (offer, approvalType) => {
    if (!approvalNote.trim()) {
      toast.error('Please provide a rejection note');
      return;
    }

    try {
      setIsProcessing(true);
      // Get quotation header ID (prefer _id, fallback to quotationNumber)
      const quotationHeaderId = offer.header?._id || 
                                 offer.quotationHeaderId?._id || 
                                 offer.quotationHeaderId ||
                                 offer.header?.quotationNumber || 
                                 offer.quotationHeaderId?.quotationNumber;
      
      // Simple endpoint - all data in body
      const endpoint = `/api/quotations/approve/${approvalType}`;
      
      await axiosInstance.post(endpoint, {
        quotationHeaderId: quotationHeaderId,
        offerId: offer._id,
        action: 'reject',
        note: approvalNote.trim()
      });
      
      toast.success(`Offer ${approvalType === 'engineer' ? 'engineer' : 'management'} rejection successful`);
      fetchPendingOffers();
      setShowApprovalModal(false);
      setSelectedOffer(null);
      setApprovalNote('');
    } catch (error) {
      console.error('Error rejecting offer:', error);
      toast.error(error.response?.data?.message || 'Failed to reject offer');
    } finally {
      setIsProcessing(false);
    }
  };

  // Show approval modal
  const showApproval = (offer, approvalType, action) => {
    setSelectedOffer({ ...offer, approvalType, action });
    setApprovalNote('');
    setShowApprovalModal(true);
  };

  // View quotation details - Use header ID to avoid CORS issues with quotation numbers containing slashes
  const handleViewQuotation = (offer) => {
    // Prefer using _id to avoid URL encoding issues with quotation numbers containing slashes
    const quotationHeaderId = offer.header?._id || 
                               offer.quotationHeaderId?._id || 
                               offer.quotationHeaderId;
    
    // Fallback to quotationNumber if _id is not available
    const quotationIdentifier = quotationHeaderId || 
                                offer.header?.quotationNumber || 
                                offer.quotationHeaderId?.quotationNumber;
    
    // Use the identifier directly - React Router and the backend by-id endpoint handle both _id and quotationNumber
    navigate(`/quotations/details/${quotationIdentifier}?activeOfferId=${offer._id}`);
  };

  useEffect(() => {
    fetchPendingOffers();
  }, []);

  // Auto-refresh when WebSocket reconnects
  useEffect(() => {
    if (connected) {
      fetchPendingOffers();
    }
  }, [connected]);

  // Filter offers based on search
  const filteredOffers = offers.filter(offer => {
    const quotationNumber = offer.header?.quotationNumber || offer.quotationHeaderId?.quotationNumber || '';
    const customerName = offer.header?.customerName || offer.quotationHeaderId?.customerName || '';
    const offerNumber = offer.offerNumber || '';
    
    const searchLower = searchTerm.toLowerCase();
    return quotationNumber.toLowerCase().includes(searchLower) ||
           customerName.toLowerCase().includes(searchLower) ||
           offerNumber.toLowerCase().includes(searchLower);
  });

  // Get approval status badge
  const getApprovalStatusBadge = (offer, type) => {
    const approval = offer.downloadApproval?.[type === 'engineer' ? 'engineerApproval' : 'managementApproval'];
    const status = approval?.status || 'pending';
    
    if (status === 'approved') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Approved
        </span>
      );
    } else if (status === 'rejected') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </span>
      );
    }
  };

  // Check if user can approve this offer
  const canApprove = (offer, type) => {
    // Don't allow approval if permissions are still loading
    if (permissionsLoading) return false;
    
    const approval = offer.downloadApproval?.[type === 'engineer' ? 'engineerApproval' : 'managementApproval'];
    const status = approval?.status || 'pending';
    
    // User can approve if they have the permission and the status is pending
    if (type === 'engineer') {
      // Explicitly check engineer permission
      if (!hasEngineerPermission) return false;
      if (status !== 'pending') return false;
      return true;
    }
    if (type === 'management') {
      // Explicitly check management permission
      if (!hasManagementPermission) return false;
      if (status !== 'pending') return false;
      return true;
    }
    return false;
  };

  // Check if user can approve either type (for display purposes)
  const canApproveAny = (offer) => {
    return canApprove(offer, 'engineer') || canApprove(offer, 'management');
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Download Approval</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Approve quotation offers for download</p>
        </div>
        {filteredOffers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium leading-none text-white bg-blue-600 rounded-full">
              {filteredOffers.length}
            </span>
            <span className="text-xs sm:text-sm text-gray-600">pending approval</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by quotation number, customer, or offer number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Offers List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading pending approvals...</p>
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-600">No pending approvals found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOffers.map((offer) => {
            const quotationNumber = offer.header?.quotationNumber || offer.quotationHeaderId?.quotationNumber || 'N/A';
            const customerName = offer.header?.customerName || offer.quotationHeaderId?.customerName || 'N/A';
            const offerNumber = offer.offerNumber || 'N/A';
            const totalNetto = offer.totalNetto || 0;
            
            return (
              <div key={offer._id} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">
                        {quotationNumber}
                      </h3>
                      <span className="text-xs sm:text-sm text-gray-500">Offer: {offerNumber}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-3 break-words">Customer: {customerName}</p>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                      {/* Only show Engineer badge if user has engineer permission */}
                      {hasEngineerPermission && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 whitespace-nowrap">Engineer:</span>
                          {getApprovalStatusBadge(offer, 'engineer')}
                        </div>
                      )}
                      {/* Only show Management badge if user has management permission */}
                      {hasManagementPermission && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 whitespace-nowrap">Management:</span>
                          {getApprovalStatusBadge(offer, 'management')}
                        </div>
                      )}
                      <div className="text-xs sm:text-sm font-medium text-gray-900">
                        Total: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalNetto)}
                      </div>
                    </div>

                    {/* Approval/Rejection info - Only show for permissions user has */}
                    {hasEngineerPermission && offer.downloadApproval?.engineerApproval?.status === 'approved' && offer.downloadApproval?.engineerApproval?.approvedBy && (
                      <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800 break-words">
                        <strong>Engineer Approved</strong> by {offer.downloadApproval.engineerApproval.approvedBy?.fullName || 'Unknown'} 
                        {offer.downloadApproval.engineerApproval.approvedAt && (
                          <span className="ml-1 sm:ml-2 text-green-600">
                            ({new Date(offer.downloadApproval.engineerApproval.approvedAt).toLocaleDateString()})
                          </span>
                        )}
                      </div>
                    )}
                    {hasEngineerPermission && offer.downloadApproval?.engineerApproval?.status === 'rejected' && offer.downloadApproval?.engineerApproval?.rejectionNote && (
                      <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800 break-words">
                        <strong>Engineer Rejected:</strong> {offer.downloadApproval.engineerApproval.rejectionNote}
                        {offer.downloadApproval.engineerApproval.approvedBy && (
                          <span className="block sm:inline sm:ml-2 text-red-600">
                            by {offer.downloadApproval.engineerApproval.approvedBy?.fullName || 'Unknown'}
                          </span>
                        )}
                      </div>
                    )}
                    {hasManagementPermission && offer.downloadApproval?.managementApproval?.status === 'approved' && offer.downloadApproval?.managementApproval?.approvedBy && (
                      <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800 break-words">
                        <strong>Management Approved</strong> by {offer.downloadApproval.managementApproval.approvedBy?.fullName || 'Unknown'}
                        {offer.downloadApproval.managementApproval.approvedAt && (
                          <span className="ml-1 sm:ml-2 text-green-600">
                            ({new Date(offer.downloadApproval.managementApproval.approvedAt).toLocaleDateString()})
                          </span>
                        )}
                      </div>
                    )}
                    {hasManagementPermission && offer.downloadApproval?.managementApproval?.status === 'rejected' && offer.downloadApproval?.managementApproval?.rejectionNote && (
                      <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800 break-words">
                        <strong>Management Rejected:</strong> {offer.downloadApproval.managementApproval.rejectionNote}
                        {offer.downloadApproval.managementApproval.approvedBy && (
                          <span className="block sm:inline sm:ml-2 text-red-600">
                            by {offer.downloadApproval.managementApproval.approvedBy?.fullName || 'Unknown'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 lg:ml-4 lg:flex-shrink-0">
                    <button
                      onClick={() => handleViewQuotation(offer)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors self-start sm:self-auto"
                      title="View quotation"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    
                    {/* Show engineer approval buttons ONLY if user has engineer permission and offer is pending engineer approval */}
                    {!permissionsLoading && hasEngineerPermission && canApprove(offer, 'engineer') && (
                      <>
                        <button
                          onClick={() => showApproval(offer, 'engineer', 'approve')}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm font-medium whitespace-nowrap"
                          title="Approve as Engineer"
                        >
                          Approve (Eng)
                        </button>
                        <button
                          onClick={() => showApproval(offer, 'engineer', 'reject')}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm font-medium whitespace-nowrap"
                          title="Reject as Engineer"
                        >
                          Reject (Eng)
                        </button>
                      </>
                    )}
                    
                    {/* Show management approval buttons ONLY if user has management permission and offer is pending management approval */}
                    {!permissionsLoading && hasManagementPermission && canApprove(offer, 'management') && (
                      <>
                        <button
                          onClick={() => showApproval(offer, 'management', 'approve')}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm font-medium whitespace-nowrap"
                          title="Approve as Management"
                        >
                          Approve (Mgt)
                        </button>
                        <button
                          onClick={() => showApproval(offer, 'management', 'reject')}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm font-medium whitespace-nowrap"
                          title="Reject as Management"
                        >
                          Reject (Mgt)
                        </button>
                      </>
                    )}
                    
                    {/* Show message if user can't approve anything */}
                    {!canApproveAny(offer) && (
                      <span className="text-xs text-gray-400 italic px-2 py-2 text-center sm:text-left">
                        {offer.downloadApproval?.engineerApproval?.status === 'approved' && 
                         offer.downloadApproval?.managementApproval?.status === 'approved' 
                          ? 'Fully Approved' 
                          : 'No pending approvals for your role'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approval Modal */}
      <BaseModal
        isOpen={showApprovalModal}
        onClose={() => {
          setShowApprovalModal(false);
          setSelectedOffer(null);
          setApprovalNote('');
        }}
        title={`${selectedOffer?.action === 'approve' ? 'Approve' : 'Reject'} Offer - ${selectedOffer?.approvalType === 'engineer' ? 'Engineer' : 'Management'}`}
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Quotation: <strong>{selectedOffer?.header?.quotationNumber || selectedOffer?.quotationHeaderId?.quotationNumber}</strong>
            </p>
            <p className="text-sm text-gray-600">
              Offer: <strong>{selectedOffer?.offerNumber}</strong>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {selectedOffer?.action === 'reject' ? 'Rejection Note (Required)' : 'Approval Note (Optional)'}
            </label>
            <textarea
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={selectedOffer?.action === 'reject' ? 'Please provide a reason for rejection...' : 'Add any notes about this approval...'}
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
            <button
              onClick={() => {
                setShowApprovalModal(false);
                setSelectedOffer(null);
                setApprovalNote('');
              }}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm sm:text-base"
            >
              Cancel
            </button>
            {selectedOffer?.action === 'approve' ? (
              <button
                onClick={() => handleApprove(selectedOffer, selectedOffer.approvalType)}
                disabled={isProcessing}
                className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {isProcessing ? 'Processing...' : 'Approve'}
              </button>
            ) : (
              <button
                onClick={() => handleReject(selectedOffer, selectedOffer.approvalType)}
                disabled={isProcessing || !approvalNote.trim()}
                className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {isProcessing ? 'Processing...' : 'Reject'}
              </button>
            )}
          </div>
        </div>
      </BaseModal>
    </div>
  );
};

export default DownloadApprovalTab;

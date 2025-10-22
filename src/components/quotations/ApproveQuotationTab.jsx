import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../utils/UserContext';
import { NotificationsContext } from '../../utils/NotificationsContext';
import ApiHelper from '../../utils/ApiHelper';
import BaseModal from '../BaseModal';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, Users, FileText, Eye, ChevronDown, ChevronUp } from 'lucide-react';

const ApproveQuotationTab = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { connected } = useContext(NotificationsContext);
  const [rfqs, setRfqs] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expandedRFQ, setExpandedRFQ] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRFQ, setSelectedRFQ] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');

  // Fetch RFQs for the current user (as approver) - only RFQs assigned to this user for approval
  const fetchRFQs = async () => {
    try {
      setLoading(true);
      const response = await ApiHelper.get('/api/rfq');
      // The backend already filters by user role, so this will only return RFQs assigned to the current user for approval
      setRfqs(response.data.data.rfqs);
    } catch (error) {
      console.error('Error fetching RFQs:', error);
      toast.error('Failed to fetch RFQs');
    } finally {
      setLoading(false);
    }
  };

  // Fetch pending count for approvers
  const fetchPendingCount = async () => {
    try {
      const response = await ApiHelper.get('/api/rfq/pending-count');
      setPendingCount(response.data.data.count);
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  // Handle RFQ approval
  const handleApprove = async (rfqId, notes = '') => {
    try {
      await ApiHelper.patch(`/api/rfq/${rfqId}/approve`, { approvalNotes: notes });
      toast.success('RFQ approved successfully');
      fetchRFQs();
      fetchPendingCount();
      setShowApprovalModal(false);
      setSelectedRFQ(null);
      setApprovalNotes('');
    } catch (error) {
      console.error('Error approving RFQ:', error);
      toast.error('Failed to approve RFQ');
    }
  };

  // Handle RFQ rejection
  const handleReject = async (rfqId, notes = '') => {
    try {
      await ApiHelper.patch(`/api/rfq/${rfqId}/reject`, { rejectionNotes: notes });
      toast.success('RFQ rejected successfully');
      fetchRFQs();
      fetchPendingCount();
      setShowApprovalModal(false);
      setSelectedRFQ(null);
      setApprovalNotes('');
    } catch (error) {
      console.error('Error rejecting RFQ:', error);
      toast.error('Failed to reject RFQ');
    }
  };

  // Show approval modal
  const showApproval = (rfq, action) => {
    setSelectedRFQ({ ...rfq, action });
    setApprovalNotes('');
    setShowApprovalModal(true);
  };

  // Toggle RFQ expansion
  const toggleExpanded = (rfqId) => {
    setExpandedRFQ(expandedRFQ === rfqId ? null : rfqId);
  };

  useEffect(() => {
    fetchRFQs();
    fetchPendingCount();
  }, []);

  // Auto-refresh when WebSocket reconnects
  useEffect(() => {
    if (connected) {
      fetchRFQs();
      fetchPendingCount();
    }
  }, [connected]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'rejected':
        return <XCircle size={16} className="text-red-600" />;
      default:
        return <Clock size={16} className="text-yellow-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Approve Quotation</h2>
          <p className="text-sm text-gray-600 mt-1">Review and approve RFQ requests</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium leading-none text-white bg-red-600 rounded-full">
              {pendingCount}
            </span>
            <span className="text-sm text-gray-600">pending approval</span>
          </div>
        )}
      </div>

      {/* WebSocket Connection Status */}
      <div className="flex items-center gap-2 text-sm">
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-gray-600">
          {connected ? 'Real-time updates connected' : 'Real-time updates disconnected'}
        </span>
      </div>

      {/* RFQs List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading RFQs...</p>
        </div>
      ) : rfqs.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No RFQs to approve</h3>
          <p className="text-gray-600">All caught up! No pending RFQs at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rfqs.map((rfq) => (
            <div key={rfq._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      RFQ #{rfq.rfqNumber} - {rfq.customerName}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(rfq.status)}`}>
                      {getStatusIcon(rfq.status)}
                      {rfq.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Customer:</span> {rfq.customerName}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Contact:</span> {rfq.contactPerson?.name} ({rfq.contactPerson?.gender})
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Requester:</span> {rfq.requesterId?.fullName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Creator:</span> {rfq.quotationCreatorId?.fullName}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Priority:</span> 
                        <span className={`ml-1 capitalize px-2 py-1 rounded-full text-xs ${
                          rfq.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          rfq.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          rfq.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {rfq.priority}
                        </span>
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Created:</span> {new Date(rfq.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {rfq.description && (
                    <p className="text-gray-600 mb-3">
                      <span className="font-medium">Description:</span> {rfq.description}
                    </p>
                  )}

                  {/* Items Summary */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Items ({rfq.items?.length || 0})
                      </span>
                      <button
                        onClick={() => toggleExpanded(rfq._id)}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        {expandedRFQ === rfq._id ? (
                          <>
                            <ChevronUp size={14} />
                            Hide Details
                          </>
                        ) : (
                          <>
                            <ChevronDown size={14} />
                            Show Details
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Items Details */}
                  {expandedRFQ === rfq._id && rfq.items && (
                    <div className="border-t border-gray-200 pt-3 mt-3">
                      <div className="space-y-3">
                        {rfq.items.map((item, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-gray-900">Item {item.itemNumber}</h4>
                              <span className="text-sm text-gray-600">
                                Price: {item.price?.toLocaleString('id-ID')} | Net: {item.priceNet?.toLocaleString('id-ID')}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Karoseri:</span> {item.karoseri}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Chassis:</span> {item.chassis}
                              </p>
                            </div>

                            {item.notes && (
                              <p className="text-sm text-gray-600 mb-2">
                                <span className="font-medium">Notes:</span> {item.notes}
                              </p>
                            )}

                            {/* Specifications */}
                            {item.specifications && item.specifications.length > 0 && (
                              <div className="mt-3">
                                <p className="text-sm font-medium text-gray-700 mb-2">Specifications:</p>
                                <div className="space-y-2">
                                  {item.specifications.map((spec, specIndex) => (
                                    <div key={specIndex} className="bg-gray-50 rounded p-2">
                                      <h6 className="font-semibold text-gray-700 text-xs mb-1">
                                        {spec.category}
                                      </h6>
                                      <div className="grid grid-cols-1 gap-1">
                                        {spec.items && spec.items.map((specItem, itemIndex) => (
                                          <div key={itemIndex} className="flex items-start space-x-2">
                                            <span className="font-medium text-gray-600 text-xs min-w-0 flex-shrink-0">
                                              {specItem.name}:
                                            </span>
                                            <span className="text-gray-700 text-xs break-words">
                                              {specItem.specification}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => navigate(`/quotations/rfq/${rfq._id}`)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Eye size={14} />
                    View Details
                  </button>
                  
                  {rfq.status === 'pending' && (
                    <>
                      <button
                        onClick={() => showApproval(rfq, 'approve')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle size={14} />
                        Approve
                      </button>
                      <button
                        onClick={() => showApproval(rfq, 'reject')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <XCircle size={14} />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedRFQ && (
        <BaseModal
          isOpen={showApprovalModal}
          onClose={() => {
            setShowApprovalModal(false);
            setSelectedRFQ(null);
            setApprovalNotes('');
          }}
          title={`${selectedRFQ.action === 'approve' ? 'Approve' : 'Reject'} RFQ`}
        >
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-900 mb-2">RFQ Information</h3>
              <div className="space-y-2 text-sm text-blue-800">
                <p><span className="font-medium">RFQ Number:</span> {selectedRFQ.rfqNumber}</p>
                <p><span className="font-medium">Customer:</span> {selectedRFQ.customerName}</p>
                <p><span className="font-medium">Contact:</span> {selectedRFQ.contactPerson?.name}</p>
                <p><span className="font-medium">Requester:</span> {selectedRFQ.requesterId?.fullName}</p>
                <p><span className="font-medium">Creator:</span> {selectedRFQ.quotationCreatorId?.fullName}</p>
                <p><span className="font-medium">Priority:</span> {selectedRFQ.priority}</p>
                {selectedRFQ.description && (
                  <p><span className="font-medium">Description:</span> {selectedRFQ.description}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="approvalNotes" className="block text-sm font-medium text-gray-700 mb-2">
                {selectedRFQ.action === 'approve' ? 'Approval' : 'Rejection'} Notes
              </label>
              <textarea
                id="approvalNotes"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Enter ${selectedRFQ.action === 'approve' ? 'approval' : 'rejection'} notes...`}
                rows="4"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedRFQ(null);
                  setApprovalNotes('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedRFQ.action === 'approve') {
                    handleApprove(selectedRFQ._id, approvalNotes);
                  } else {
                    handleReject(selectedRFQ._id, approvalNotes);
                  }
                }}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                  selectedRFQ.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {selectedRFQ.action === 'approve' ? 'Approve RFQ' : 'Reject RFQ'}
              </button>
            </div>
          </div>
        </BaseModal>
      )}
    </div>
  );
};

export default ApproveQuotationTab;

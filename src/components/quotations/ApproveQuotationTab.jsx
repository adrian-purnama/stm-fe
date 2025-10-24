import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../utils/contexts/UserContext';
import { NotificationsContext } from '../../utils/contexts/NotificationsContext';
import axiosInstance from '../../utils/api/ApiHelper';
import BaseModal from '../modals/BaseModal';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, Users, FileText, Eye, ChevronDown, ChevronUp } from 'lucide-react';

const ApproveQuotationTab = () => {
  const navigate = useNavigate();
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
      const response = await axiosInstance.get('/api/rfq');
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
      const response = await axiosInstance.get('/api/rfq/pending-count');
      setPendingCount(response.data.data.count);
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  // Handle RFQ approval
  const handleApprove = async (rfqId, notes = '') => {
    try {
      await axiosInstance.patch(`/api/rfq/${rfqId}/approve`, { approvalNotes: notes });
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
      await axiosInstance.patch(`/api/rfq/${rfqId}/reject`, { rejectionNotes: notes });
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
          <h2 className="text-xl font-semibold text-gray-900">Approve RFQ</h2>
          <p className="text-sm text-gray-600 mt-1">Review and approve RFQ requests</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium leading-none text-white bg-red-600 rounded-full animate-pulse">
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
          <div className="bg-green-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
          <p className="text-gray-600">No pending RFQs require your approval at the moment.</p>
          <p className="text-sm text-gray-500 mt-2">You'll be notified when new RFQs are assigned to you.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rfqs.map((rfq) => (
            <div key={rfq._id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
              {/* Mobile Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
                <div className="flex-1 mb-2 sm:mb-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 break-words">
                      RFQ #{rfq.rfqNumber}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full w-fit ${getStatusColor(rfq.status)}`}>
                      {getStatusIcon(rfq.status)}
                      {rfq.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 break-words">
                    <span className="font-medium">Customer:</span> {rfq.customerName}
                  </p>
                </div>
              </div>
              
              {/* Mobile-friendly content layout */}
              <div className="space-y-3">
                {/* Basic Info - Stack on mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                  <div className="space-y-1">
                    <p className="text-gray-600">
                      <span className="font-medium">Contact:</span> {rfq.contactPerson?.name} ({rfq.contactPerson?.gender})
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Requester:</span> {rfq.requesterId?.fullName}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Creator:</span> {rfq.quotationCreatorId?.fullName}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-600">
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
                    <p className="text-gray-600">
                      <span className="font-medium">Location:</span> {rfq.deliveryLocation}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Created:</span> {new Date(rfq.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Key Information - Enhanced Design */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center mb-3">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
                    <h4 className="text-sm font-bold text-amber-800">Key Information</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Competitor */}
                    <div className="bg-white rounded-lg p-3 border border-amber-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">Competitor</span>
                        <div className={`w-2 h-2 rounded-full ${
                          rfq.competitor && rfq.competitor.trim() !== '' ? 'bg-green-400' : 'bg-red-400'
                        }`}></div>
                      </div>
                      <div className={`text-sm font-semibold ${
                        rfq.competitor && rfq.competitor.trim() !== '' ? 'text-green-700' : 'text-red-600'
                      }`}>
                        {rfq.competitor && rfq.competitor.trim() !== '' ? rfq.competitor : 'None'}
                      </div>
                    </div>

                    {/* Can Make */}
                    <div className="bg-white rounded-lg p-3 border border-amber-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">Can Make</span>
                        <div className={`w-2 h-2 rounded-full ${rfq.canMake ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      </div>
                      <div className={`text-sm font-semibold ${rfq.canMake ? 'text-green-700' : 'text-red-600'}`}>
                        {rfq.canMake ? 'Yes' : 'No'}
                      </div>
                    </div>

                    {/* Project Ongoing */}
                    <div className="bg-white rounded-lg p-3 border border-amber-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">Ongoing</span>
                        <div className={`w-2 h-2 rounded-full ${rfq.projectOngoing ? 'bg-blue-400' : 'bg-gray-400'}`}></div>
                      </div>
                      <div className={`text-sm font-semibold ${rfq.projectOngoing ? 'text-blue-700' : 'text-gray-600'}`}>
                        {rfq.projectOngoing ? 'Yes' : 'No'}
                      </div>
                    </div>

                    {/* Confidence Rate */}
                    <div className="bg-white rounded-lg p-3 border border-amber-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">Confidence</span>
                        <div className={`w-2 h-2 rounded-full ${
                          rfq.confidenceRate >= 70 ? 'bg-green-400' :
                          rfq.confidenceRate >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                        }`}></div>
                      </div>
                      <div className={`text-sm font-semibold ${
                        rfq.confidenceRate >= 70 ? 'text-green-700' :
                        rfq.confidenceRate >= 50 ? 'text-yellow-700' : 'text-red-600'
                      }`}>
                        {rfq.confidenceRate || 0}%
                      </div>
                    </div>
                  </div>
                </div>
                      
                {/* Budget Information - Enhanced Design */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center mb-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    <h4 className="text-sm font-bold text-blue-800">Budget Information</h4>
                  </div>
                  {rfq.items && rfq.items.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Total Price */}
                      <div className="bg-white rounded-lg p-4 border border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-600">Total Price</span>
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        </div>
                        <div className="text-lg font-bold text-green-700">
                          {rfq.items.reduce((sum, item) => sum + (item.price || 0), 0).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {rfq.items.length} item{rfq.items.length !== 1 ? 's' : ''}
                        </div>
                      </div>

                      {/* Total Net */}
                      <div className="bg-white rounded-lg p-4 border border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-600">Total Net</span>
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        </div>
                        <div className="text-lg font-bold text-blue-700">
                          {rfq.items.reduce((sum, item) => sum + (item.priceNet || 0), 0).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Net amount
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg p-6 border border-red-100 text-center">
                      <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <div className="w-6 h-6 bg-red-400 rounded-full"></div>
                      </div>
                      <div className="text-sm font-semibold text-red-600 mb-1">No Budget Information</div>
                      <div className="text-xs text-gray-500">No items found in this RFQ</div>
                    </div>
                  )}
                </div>

                {/* Description */}
                {rfq.description && (
                  <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                    <p className="text-xs sm:text-sm text-gray-600">
                      <span className="font-medium">Description:</span> {rfq.description}
                    </p>
                  </div>
                )}

                {/* Items Summary - Mobile optimized */}
                <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="text-xs sm:text-sm font-medium text-gray-700">
                      Items ({rfq.items?.length || 0})
                    </span>
                    <button
                      onClick={() => toggleExpanded(rfq._id)}
                      className="flex items-center justify-center gap-1 text-xs sm:text-sm text-blue-600 hover:text-blue-800 px-2 py-1 rounded"
                    >
                      {expandedRFQ === rfq._id ? (
                        <>
                          <ChevronUp size={12} />
                          Hide Details
                        </>
                      ) : (
                        <>
                          <ChevronDown size={12} />
                          Show Details
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Items Details - Mobile optimized */}
                {expandedRFQ === rfq._id && rfq.items && (
                  <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-3 mt-2">
                    <div className="space-y-2">
                      {rfq.items.map((item, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-2 sm:p-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-1">
                            <h4 className="text-xs sm:text-sm font-medium text-gray-900">Item {item.itemNumber}</h4>
                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 text-xs text-gray-600">
                              <span>Price: {item.price?.toLocaleString('id-ID')}</span>
                              <span>Net: {item.priceNet?.toLocaleString('id-ID')}</span>
                            </div>
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
                
                {/* Action Buttons - Mobile optimized */}
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between mt-3">
                  <button
                    onClick={() => navigate(`/quotations/rfq/${rfq._id}`)}
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Eye size={14} />
                    View Details
                  </button>
                  
                  {rfq.status === 'pending' && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => showApproval(rfq, 'approve')}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white text-xs sm:text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle size={14} />
                        Approve
                      </button>
                      <button
                        onClick={() => showApproval(rfq, 'reject')}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-2 bg-red-600 text-white text-xs sm:text-sm rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <XCircle size={14} />
                        Reject
                      </button>
                    </div>
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
                <p><span className="font-medium">Delivery Location:</span> {selectedRFQ.deliveryLocation}</p>
                <p><span className="font-medium">Competitor:</span> {selectedRFQ.competitor}</p>
                <p><span className="font-medium">Confidence Rate:</span> {selectedRFQ.confidenceRate}%</p>
                
                {/* Key Information - Enhanced Modal Design */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center mb-3">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
                    <h4 className="text-sm font-bold text-amber-800">Key Information</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Competitor */}
                    <div className="bg-white rounded-lg p-3 border border-amber-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">Competitor</span>
                        <div className={`w-2 h-2 rounded-full ${
                          selectedRFQ.competitor && selectedRFQ.competitor.trim() !== '' ? 'bg-green-400' : 'bg-red-400'
                        }`}></div>
                      </div>
                      <div className={`text-sm font-semibold ${
                        selectedRFQ.competitor && selectedRFQ.competitor.trim() !== '' ? 'text-green-700' : 'text-red-600'
                      }`}>
                        {selectedRFQ.competitor && selectedRFQ.competitor.trim() !== '' ? selectedRFQ.competitor : 'None'}
                      </div>
                    </div>

                    {/* Can Make */}
                    <div className="bg-white rounded-lg p-3 border border-amber-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">Can Make</span>
                        <div className={`w-2 h-2 rounded-full ${selectedRFQ.canMake ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      </div>
                      <div className={`text-sm font-semibold ${selectedRFQ.canMake ? 'text-green-700' : 'text-red-600'}`}>
                        {selectedRFQ.canMake ? 'Yes' : 'No'}
                      </div>
                    </div>

                    {/* Project Ongoing */}
                    <div className="bg-white rounded-lg p-3 border border-amber-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">Ongoing</span>
                        <div className={`w-2 h-2 rounded-full ${selectedRFQ.projectOngoing ? 'bg-blue-400' : 'bg-gray-400'}`}></div>
                      </div>
                      <div className={`text-sm font-semibold ${selectedRFQ.projectOngoing ? 'text-blue-700' : 'text-gray-600'}`}>
                        {selectedRFQ.projectOngoing ? 'Yes' : 'No'}
                      </div>
                    </div>

                    {/* Confidence Rate */}
                    <div className="bg-white rounded-lg p-3 border border-amber-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">Confidence</span>
                        <div className={`w-2 h-2 rounded-full ${
                          selectedRFQ.confidenceRate >= 70 ? 'bg-green-400' :
                          selectedRFQ.confidenceRate >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                        }`}></div>
                      </div>
                      <div className={`text-sm font-semibold ${
                        selectedRFQ.confidenceRate >= 70 ? 'text-green-700' :
                        selectedRFQ.confidenceRate >= 50 ? 'text-yellow-700' : 'text-red-600'
                      }`}>
                        {selectedRFQ.confidenceRate || 0}%
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Budget Information */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">Budget Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {selectedRFQ.items && selectedRFQ.items.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-blue-700">Total Price:</span>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            {selectedRFQ.items.reduce((sum, item) => sum + (item.price || 0), 0).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-blue-700">Total Net:</span>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            {selectedRFQ.items.reduce((sum, item) => sum + (item.priceNet || 0), 0).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2 text-center">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                          No Items / Budget: 0
                        </span>
                      </div>
                    )}
                  </div>
                </div>
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
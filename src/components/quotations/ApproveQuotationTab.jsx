import { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../utils/UserContext';
import { NotificationsContext } from '../../utils/NotificationsContext';
import ApiHelper from '../../utils/ApiHelper';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, Users, FileText } from 'lucide-react';

const ApproveQuotationTab = () => {
  const { user } = useContext(UserContext);
  const { connected } = useContext(NotificationsContext);
  const [rfqs, setRfqs] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);

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
  const handleApprove = async (rfqId) => {
    try {
      await ApiHelper.patch(`/api/rfq/${rfqId}/approve`);
      toast.success('RFQ approved successfully');
      fetchRFQs();
      fetchPendingCount();
    } catch (error) {
      console.error('Error approving RFQ:', error);
      toast.error('Failed to approve RFQ');
    }
  };

  // Handle RFQ rejection
  const handleReject = async (rfqId) => {
    try {
      await ApiHelper.patch(`/api/rfq/${rfqId}/reject`);
      toast.success('RFQ rejected successfully');
      fetchRFQs();
      fetchPendingCount();
    } catch (error) {
      console.error('Error rejecting RFQ:', error);
      toast.error('Failed to reject RFQ');
    }
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
                    <h3 className="text-lg font-medium text-gray-900">{rfq.title}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(rfq.status)}`}>
                      {getStatusIcon(rfq.status)}
                      {rfq.status}
                    </span>
                  </div>
                  
                  {rfq.description && (
                    <p className="text-gray-600 mb-2">{rfq.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>From: {rfq.userId?.fullName || rfq.userId?.email}</span>
                    <span>Created: {new Date(rfq.createdAt).toLocaleDateString()}</span>
                    {rfq.approvedAt && (
                      <span>Approved: {new Date(rfq.approvedAt).toLocaleDateString()}</span>
                    )}
                    {rfq.rejectedAt && (
                      <span>Rejected: {new Date(rfq.rejectedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                
                {rfq.status === 'pending' && (
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(rfq._id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle size={14} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(rfq._id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <XCircle size={14} />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApproveQuotationTab;

import { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../utils/UserContext';
import { NotificationsContext } from '../../utils/NotificationsContext';
import ApiHelper from '../../utils/ApiHelper';
import toast from 'react-hot-toast';
import { Plus, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import RequestRFQModal from '../RequestRFQModal';

const RequestQuotationTab = () => {
  const { user } = useContext(UserContext);
  const { connected } = useContext(NotificationsContext);
  const [rfqs, setRfqs] = useState([]);
  const [approvers, setApprovers] = useState([]);
  const [quotationCreators, setQuotationCreators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Fetch RFQs for the current user (as requester) - only RFQs created by this user
  const fetchRFQs = async () => {
    try {
      setLoading(true);
      const response = await ApiHelper.get('/api/rfq');
      // The backend already filters by user role, so this will only return RFQs created by the current user
      setRfqs(response.data.data.rfqs);
    } catch (error) {
      console.error('Error fetching RFQs:', error);
      toast.error('Failed to fetch RFQs');
    } finally {
      setLoading(false);
    }
  };

  // Fetch approvers for the dropdown
  const fetchApprovers = async () => {
    try {
      const response = await ApiHelper.get('/api/rfq/approvers');
      setApprovers(response.data.data.approvers);
    } catch (error) {
      console.error('Error fetching approvers:', error);
      toast.error('Failed to fetch approvers');
    }
  };

  // Fetch quotation creators for the dropdown
  const fetchQuotationCreators = async () => {
    try {
      const response = await ApiHelper.get('/api/rfq/quotation-creators');
      setQuotationCreators(response.data.data.quotationCreators);
    } catch (error) {
      console.error('Error fetching quotation creators:', error);
      toast.error('Failed to fetch quotation creators');
    }
  };

  // Handle new RFQ creation
  const handleCreateRFQ = async (rfqData) => {
    try {
      await ApiHelper.post('/api/rfq', rfqData);
      toast.success('RFQ submitted successfully');
      setShowModal(false);
      fetchRFQs();
    } catch (error) {
      console.error('Error creating RFQ:', error);
      toast.error('Failed to submit RFQ');
    }
  };

  useEffect(() => {
    fetchRFQs();
    fetchApprovers();
    fetchQuotationCreators();
  }, []);

  // Auto-refresh when WebSocket reconnects
  useEffect(() => {
    if (connected) {
      fetchRFQs();
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
          <h2 className="text-xl font-semibold text-gray-900">Request Quotation</h2>
          <p className="text-sm text-gray-600 mt-1">Create and manage your quotation requests</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Request Quotation
        </button>
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
          <FileText size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No RFQs yet</h3>
          <p className="text-gray-600 mb-4">Create your first RFQ request to get started.</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Request Quotation
          </button>
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
                    <span>Approver: {rfq.approverId?.fullName || rfq.approverId?.email}</span>
                    <span>Created: {new Date(rfq.createdAt).toLocaleDateString()}</span>
                    {rfq.approvedAt && (
                      <span>Approved: {new Date(rfq.approvedAt).toLocaleDateString()}</span>
                    )}
                    {rfq.rejectedAt && (
                      <span>Rejected: {new Date(rfq.rejectedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Request RFQ Modal */}
      {showModal && (
        <RequestRFQModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleCreateRFQ}
          approvers={approvers}
          quotationCreators={quotationCreators}
        />
      )}
    </div>
  );
};

export default RequestQuotationTab;

import React, { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, XCircle, Eye, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ApiHelper from '../../utils/ApiHelper';
import toast from 'react-hot-toast';

const RequestQuotationListTab = () => {
  const navigate = useNavigate();
  const [approvedRFQs, setApprovedRFQs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch approved RFQs for quotation creation
  useEffect(() => {
    const fetchApprovedRFQs = async () => {
      try {
        setLoading(true);
        const response = await ApiHelper.get('/api/rfq/approved-for-quotation');
        setApprovedRFQs(response.data.data?.rfqs || []);
      } catch (error) {
        console.error('Error fetching approved RFQs:', error);
        toast.error('Failed to load approved RFQs');
      } finally {
        setLoading(false);
      }
    };

    fetchApprovedRFQs();
  }, []);

  const handleCreateQuotation = (rfq) => {
    // Navigate to quotation form with RFQ data
    navigate(`/quotations/form?rfqId=${rfq._id}&mode=create-from-rfq`);
  };

  const handleViewRFQ = (rfq) => {
    // Navigate to RFQ details view
    navigate(`/quotations/rfq/${rfq._id}`);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ready for Quotation
          </span>
        );
      case 'quotation_created':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <FileText className="h-3 w-3 mr-1" />
            Quotation Created
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading RFQ requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Request Quotation List</h2>
          <p className="text-sm text-gray-600 mt-1">
            View approved RFQ requests ready for quotation creation
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {approvedRFQs.length} RFQ{approvedRFQs.length !== 1 ? 's' : ''} available
        </div>
      </div>

      {approvedRFQs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No RFQ Requests</h3>
          <p className="text-gray-600 mb-4">
            There are no approved RFQ requests available for quotation creation.
          </p>
          <p className="text-sm text-gray-500">
            Approved RFQ requests will appear here once they are approved by the approver.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {approvedRFQs.map((rfq) => (
            <div key={rfq._id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{rfq.title}</h3>
                    {getStatusBadge(rfq.status)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">RFQ Number:</span> {rfq.rfqNumber}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Customer:</span> {rfq.customerName}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Contact:</span> {rfq.contactPerson?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Requester:</span> {rfq.requesterId?.fullName}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Approved:</span> {new Date(rfq.approvedAt).toLocaleDateString()}
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
                    </div>
                  </div>

                  {rfq.description && (
                    <p className="text-sm text-gray-600 mb-4">
                      <span className="font-medium">Description:</span> {rfq.description}
                    </p>
                  )}

                  {rfq.approvalNotes && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                      <p className="text-sm text-green-800">
                        <span className="font-medium">Approval Notes:</span> {rfq.approvalNotes}
                      </p>
                    </div>
                  )}

                  {rfq.quotationId && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">Quotation Created:</span> {new Date(rfq.quotationCreatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  {rfq.status === 'approved' && (
                    <button
                      onClick={() => handleCreateQuotation(rfq)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Quotation
                    </button>
                  )}
                  <button
                    onClick={() => handleViewRFQ(rfq)}
                    className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RequestQuotationListTab;





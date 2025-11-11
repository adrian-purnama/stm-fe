import React, { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, XCircle, Eye, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ApiHelper from '../../utils/api/ApiHelper';
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-blue-500">
            Approved RFQs
          </span>
          <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">Request Quotation List</h2>
          <p className="text-sm text-gray-600 sm:text-base">
            View approved RFQ requests ready for quotation creation
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 shadow-sm">
          <FileText className="h-4 w-4 text-blue-500" />
          <span>
            {approvedRFQs.length} RFQ{approvedRFQs.length !== 1 ? 's' : ''} available
          </span>
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
        <div className="space-y-4">
          {approvedRFQs.map((rfq) => (
            <div
              key={rfq._id}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">{rfq.title}</h3>
                    {getStatusBadge(rfq.status)}
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">RFQ Number:</span> {rfq.rfqNumber}
                      </p>
                      <p>
                        <span className="font-medium">Customer:</span> {rfq.customerName}
                      </p>
                      <p>
                        <span className="font-medium">Contact:</span> {rfq.contactPerson?.name || '-'}
                      </p>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">Requester:</span> {rfq.requesterId?.fullName || '-'}
                      </p>
                      <p>
                        <span className="font-medium">Approved:</span>{' '}
                        {rfq.approvedAt ? new Date(rfq.approvedAt).toLocaleDateString() : '-'}
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="font-medium">Priority:</span>
                        <span
                          className={`rounded-full px-2 py-1 text-xs capitalize ${
                            rfq.priority === 'urgent'
                              ? 'bg-red-100 text-red-800'
                              : rfq.priority === 'high'
                              ? 'bg-orange-100 text-orange-800'
                              : rfq.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {rfq.priority || 'normal'}
                        </span>
                      </p>
                    </div>
                  </div>

                  {rfq.description && (
                    <p className="text-sm text-gray-600">
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

                <div className="flex flex-col gap-2 sm:min-w-[200px] sm:items-end">
                  <button
                    onClick={() => handleViewRFQ(rfq)}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </button>
                  {rfq.status === 'approved' && (
                    <button
                      onClick={() => handleCreateQuotation(rfq)}
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      Create Quotation
                    </button>
                  )}
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





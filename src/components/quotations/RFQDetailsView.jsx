import React from 'react';
import { ArrowLeft, CheckCircle, XCircle, Clock, Users, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RFQDetailsView = ({ rfq, loading }) => {
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = React.useState({});

  const toggleItemExpansion = (itemIndex) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemIndex]: !prev[itemIndex]
    }));
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading RFQ details...</span>
      </div>
    );
  }

  if (!rfq) {
    return (
      <div className="text-center py-12">
        <FileText size={48} className="text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">RFQ not found</h3>
        <p className="text-gray-600">The requested RFQ could not be found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/quotations')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Quotations
        </button>
      </div>

      {/* RFQ Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              RFQ #{rfq.rfqNumber}
            </h1>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(rfq.status)}`}>
                {getStatusIcon(rfq.status)}
                {rfq.status}
              </span>
              <span className={`capitalize px-2 py-1 rounded-full text-xs ${
                rfq.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                rfq.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                rfq.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {rfq.priority} Priority
              </span>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Customer Information</h3>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium text-gray-700">Customer:</span>
                <span className="ml-2 text-gray-900">{rfq.customerName}</span>
              </p>
              <p className="text-sm">
                <span className="font-medium text-gray-700">Contact Person:</span>
                <span className="ml-2 text-gray-900">{rfq.contactPerson?.name} ({rfq.contactPerson?.gender})</span>
              </p>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">RFQ Details</h3>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium text-gray-700">Requester:</span>
                <span className="ml-2 text-gray-900">{rfq.requesterId?.fullName}</span>
              </p>
              <p className="text-sm">
                <span className="font-medium text-gray-700">Approver:</span>
                <span className="ml-2 text-gray-900">{rfq.approverId?.fullName}</span>
              </p>
              <p className="text-sm">
                <span className="font-medium text-gray-700">Creator:</span>
                <span className="ml-2 text-gray-900">{rfq.quotationCreatorId?.fullName}</span>
              </p>
              <p className="text-sm">
                <span className="font-medium text-gray-700">Created:</span>
                <span className="ml-2 text-gray-900">{new Date(rfq.createdAt).toLocaleDateString()}</span>
              </p>
            </div>
          </div>
        </div>

        {rfq.description && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
            <p className="text-gray-700 bg-gray-50 rounded-lg p-3">{rfq.description}</p>
          </div>
        )}

        {/* Items Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Items ({rfq.items?.length || 0})
          </h3>
          
          {rfq.items && rfq.items.length > 0 ? (
            <div className="space-y-4">
              {rfq.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-medium text-gray-900">Item {item.itemNumber}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Price: {item.price?.toLocaleString('id-ID')}</span>
                      <span>Net: {item.priceNet?.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <span className="font-medium text-gray-700">Karoseri:</span>
                      <span className="ml-2 text-gray-900">{item.karoseri}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Chassis:</span>
                      <span className="ml-2 text-gray-900">{item.chassis}</span>
                    </div>
                  </div>

                  {item.notes && (
                    <div className="mb-3">
                      <span className="font-medium text-gray-700">Notes:</span>
                      <span className="ml-2 text-gray-900">{item.notes}</span>
                    </div>
                  )}

                  {/* Specifications */}
                  {item.specifications && item.specifications.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleItemExpansion(index)}
                        className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 mb-2"
                      >
                        {expandedItems[index] ? (
                          <>
                            <ChevronUp size={16} />
                            Hide Specifications
                          </>
                        ) : (
                          <>
                            <ChevronDown size={16} />
                            Show Specifications
                          </>
                        )}
                      </button>
                      
                      {expandedItems[index] && (
                        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                          {item.specifications.map((spec, specIndex) => (
                            <div key={specIndex} className="border border-gray-200 rounded-lg p-3 bg-white">
                              <h5 className="font-semibold text-gray-800 text-sm mb-3 pb-2 border-b border-gray-200">
                                {spec.category}
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {spec.items && spec.items.map((specItem, itemIndex) => (
                                  <div key={itemIndex} className="flex items-start space-x-2">
                                    <span className="font-medium text-gray-600 text-xs min-w-0 flex-shrink-0">
                                      {specItem.name}:
                                    </span>
                                    <span className="text-gray-800 text-xs break-words">
                                      {specItem.specification}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText size={32} className="mx-auto mb-2 text-gray-300" />
              <p>No items found for this RFQ</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RFQDetailsView;

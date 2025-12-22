import React from 'react';
import { ArrowLeft, CheckCircle, XCircle, Clock, Users, FileText, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, X, TrendingUp, MessageSquare, GitCompare, Download, Eye, X as XIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import ApiHelper from '../../utils/api/ApiHelper';
import useSmartBackNavigation from '../../hooks/useSmartBackNavigation';
import BaseModal from '../modals/BaseModal';

// Check if document is an image (moved outside component to avoid dependency issues)
const isImageDocument = (docEntry) => {
  const mimeType = docEntry.file?.mimeType || docEntry.mimeType || '';
  const fileName = docEntry.file?.originalName || docEntry.originalName || '';
  const imageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const imageExtensions = ['.jpg', '.jpeg', '.png'];
  
  return imageMimeTypes.includes(mimeType.toLowerCase()) || 
         imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
};

const RFQDetailsView = ({ rfq, loading, onApprove, onReject }) => {
  const goBack = useSmartBackNavigation('/quotations');
  const [expandedItems, setExpandedItems] = React.useState({});
  const [showSpecComparison, setShowSpecComparison] = React.useState(false);
  const [showApprovalModal, setShowApprovalModal] = React.useState(false);
  const [approvalAction, setApprovalAction] = React.useState(null); // 'approve' or 'reject'
  const [approvalNotes, setApprovalNotes] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [imagePreviews, setImagePreviews] = React.useState({}); // { documentId: previewUrl }
  const [loadingImages, setLoadingImages] = React.useState({}); // { documentId: true/false }
  const [showImageModal, setShowImageModal] = React.useState({ documentId: null, url: null });
  const imageUrlsRef = React.useRef(new Set()); // Track all blob URLs for cleanup

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

  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }
    return date.toLocaleDateString();
  };

  const formatFileSize = (bytes = 0) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Load image preview automatically
  const loadImagePreview = React.useCallback(async (docEntry, forceReload = false) => {
    const documentId = docEntry._id || docEntry.file?.fileId || docEntry.fileId;
    if (!documentId) {
      return null;
    }

    // Skip if already loaded (unless forcing reload)
    if (imagePreviews[documentId] && !forceReload) {
      return imagePreviews[documentId];
    }

    // Revoke old URL if reloading
    if (forceReload && imagePreviews[documentId]) {
      window.URL.revokeObjectURL(imagePreviews[documentId]);
    }

    try {
      setLoadingImages(prev => ({ ...prev, [documentId]: true }));
      
      const response = await ApiHelper.get(`/api/rfq/documents/${documentId}/download`, {
        responseType: 'blob'
      });
      
      // Ensure response.data is a Blob
      let blob;
      if (response.data instanceof Blob) {
        blob = response.data;
      } else {
        const mimeType = docEntry.file?.mimeType || docEntry.mimeType || 'image/jpeg';
        blob = new Blob([response.data], { type: mimeType });
      }
      
      const previewUrl = window.URL.createObjectURL(blob);
      imageUrlsRef.current.add(previewUrl); // Track URL for cleanup
      setImagePreviews(prev => ({ ...prev, [documentId]: previewUrl }));
      return previewUrl;
    } catch (error) {
      console.error('Error loading image preview:', error);
      // Remove failed preview from state
      setImagePreviews(prev => {
        const newState = { ...prev };
        delete newState[documentId];
        return newState;
      });
      return null;
    } finally {
      setLoadingImages(prev => {
        const newState = { ...prev };
        delete newState[documentId];
        return newState;
      });
    }
  }, [imagePreviews]);

  // Automatically load image previews when documents are available
  React.useEffect(() => {
    if (rfq?.documents && rfq.documents.length > 0) {
      rfq.documents.forEach((docEntry) => {
        if (isImageDocument(docEntry)) {
          loadImagePreview(docEntry);
        }
      });
    }
  }, [rfq?.documents, loadImagePreview]);

  // Cleanup object URLs on unmount only
  React.useEffect(() => {
    return () => {
      // Cleanup all tracked blob URLs on component unmount
      imageUrlsRef.current.forEach(url => {
        try {
          window.URL.revokeObjectURL(url);
        } catch (e) {
          // Ignore errors when revoking URLs
        }
      });
      imageUrlsRef.current.clear();
    };
  }, []); // Empty dependency array - only run on unmount

  const handleDownloadRfqDocument = async (docEntry) => {
    try {
      // The endpoint is /api/rfq/documents/:documentId/download (rfqDocuments.js is mounted at /api/rfq)
      const documentId = docEntry._id || docEntry.file?.fileId || docEntry.fileId;
      if (!documentId) {
        toast.error('Document ID not found');
        return;
      }
      
      const response = await ApiHelper.get(`/api/rfq/documents/${documentId}/download`, {
        responseType: 'blob'
      });
      
      // Get the original filename from the document entry
      const filename = docEntry.file?.originalName || docEntry.originalName || 'document';
      const mimeType = docEntry.file?.mimeType || docEntry.mimeType || 'application/octet-stream';
      
      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = filename;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading RFQ document:', error);
      toast.error(error.response?.data?.message || 'Failed to download document');
    }
  };

  // Handle approve/reject actions
  const handleApproveAction = async () => {
    try {
      setIsProcessing(true);
      if (onApprove) {
        await onApprove(rfq._id, approvalNotes);
      } else {
        await ApiHelper.patch(`/api/rfq/${rfq._id}/approve`, { approvalNotes });
        toast.success('RFQ approved successfully');
      }
      setShowApprovalModal(false);
      setApprovalNotes('');
      setApprovalAction(null);
      // Reload page or refresh data
      window.location.reload();
    } catch (error) {
      console.error('Error approving RFQ:', error);
      toast.error(error.response?.data?.message || 'Failed to approve RFQ');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectAction = async () => {
    try {
      setIsProcessing(true);
      if (onReject) {
        await onReject(rfq._id, approvalNotes);
      } else {
        await ApiHelper.patch(`/api/rfq/${rfq._id}/reject`, { rejectionNotes: approvalNotes });
        toast.success('RFQ rejected successfully');
      }
      setShowApprovalModal(false);
      setApprovalNotes('');
      setApprovalAction(null);
      // Reload page or refresh data
      window.location.reload();
    } catch (error) {
      console.error('Error rejecting RFQ:', error);
      toast.error(error.response?.data?.message || 'Failed to reject RFQ');
    } finally {
      setIsProcessing(false);
    }
  };

  const showApproval = (action) => {
    setApprovalAction(action);
    setShowApprovalModal(true);
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={goBack}
          className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          Back to Quotations
        </button>
        
        {/* Approve/Reject Buttons - Only show when status is pending and stage is approver */}
        {rfq.status === 'pending' && rfq.stage === 'approver' && (
          <div className="flex gap-2">
            <button
              onClick={() => showApproval('approve')}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle size={16} />
              {isProcessing ? 'Processing...' : 'Approve RFQ'}
            </button>
            <button
              onClick={() => showApproval('reject')}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle size={16} />
              {isProcessing ? 'Processing...' : 'Reject RFQ'}
            </button>
          </div>
        )}
      </div>

      {/* RFQ Header */}
      <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-gray-900">
              RFQ #{rfq.rfqNumber}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
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
          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
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

        {/* Key Information - Highlighted */}
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">Key Information</h3>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-yellow-700">Competitor:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                rfq.competitor && rfq.competitor.trim() !== '' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {rfq.competitor && rfq.competitor.trim() !== '' ? rfq.competitor : 'None'}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-yellow-700">Can Make:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                rfq.canMake ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {rfq.canMake ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-yellow-700">Project Ongoing:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                rfq.projectOngoing ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {rfq.projectOngoing ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-yellow-700">Confidence Rate:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                rfq.confidenceRate >= 70 ? 'bg-green-100 text-green-800' :
                rfq.confidenceRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {rfq.confidenceRate || 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Commercial Terms */}
        <div className="bg-white border border-purple-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-purple-800 mb-3">Commercial Terms</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Target Close Date:</span>
              <span className="ml-2 text-gray-900">{formatDate(rfq.targetCloseDate)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Expected Delivery:</span>
              <span className="ml-2 text-gray-900">{formatDate(rfq.expectedDeliveryDate)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Delivery Terms:</span>
              <span className="ml-2 text-gray-900">{rfq.deliveryTerms || '-'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Delivery Location:</span>
              <span className="ml-2 text-gray-900">{rfq.deliveryLocation || '-'}</span>
            </div>
            <div className="md:col-span-2">
              <span className="font-medium text-gray-700">Delivery Notes:</span>
              <p className="mt-1 text-gray-900 whitespace-pre-wrap">{rfq.deliveryNotes || '-'}</p>
            </div>
            <div className="md:col-span-2">
              <span className="font-medium text-gray-700">Payment Terms:</span>
              <p className="mt-1 text-gray-900 whitespace-pre-wrap">{rfq.paymentTerms || '-'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Prices Include Tax:</span>
              <span className={`ml-2 px-3 py-1 rounded-full text-xs font-medium ${
                rfq.isTaxIncluded ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {rfq.isTaxIncluded ? 'Included' : 'Excluded'}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">PPN Handling:</span>
              <span className={`ml-2 px-3 py-1 rounded-full text-xs font-medium ${
                rfq.includePPN ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {rfq.includePPN ? 'Include PPN' : 'Exclude PPN'}
              </span>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-700">Inclusion Notes:</span>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">{rfq.inclusionNotes || '-'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Exclusion Notes:</span>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">{rfq.exclusionNotes || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Budget Information */}
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">Budget Information</h3>
          <div className="space-y-3">
            {rfq.items && rfq.items.length > 0 ? (
              <>
                {rfq.items.map((item, index) => {
                  const perQuantity = parseFloat(item.estimatedRevenue) || 0;
                  const quantity = parseInt(item.quantity) || 1;
                  const totalRevenue = perQuantity * quantity;
                  const formatCurrency = (amount) => 
                    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
                  
                  return (
                    <div key={index} className="bg-white rounded-lg p-3 border border-blue-100">
                      <div className="font-medium text-blue-700 mb-2">Item {item.itemNumber || index + 1}:</div>
                      <div className="space-y-1.5 text-sm text-gray-700">
                        <div className="flex items-center justify-between">
                          <span>Estimated Revenue per Quantity:</span>
                          <span className="font-medium">{formatCurrency(perQuantity)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Quantity:</span>
                          <span className="font-medium">{quantity}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1.5 border-t border-blue-100">
                          <span className="font-semibold text-blue-800">Total Revenue:</span>
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                            {formatCurrency(totalRevenue)}
                          </span>
                        </div>
                        {perQuantity > 0 && quantity > 0 && (
                          <div className="text-xs text-gray-500 italic pt-1">
                            {formatCurrency(perQuantity)} × {quantity} = {formatCurrency(totalRevenue)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="bg-white rounded-lg p-3 border border-blue-200 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-800">Grand Total Revenue:</span>
                    <span className="px-3 py-1 rounded text-sm font-semibold bg-green-200 text-green-900">
                      {(() => {
                        const grandTotal = rfq.items?.reduce((sum, item) => {
                          const itemRevenue = parseFloat(item.estimatedRevenue) || 0;
                          const itemQuantity = parseInt(item.quantity) || 1;
                          return sum + (itemRevenue * itemQuantity);
                        }, 0) || 0;
                        return grandTotal > 0 
                          ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(grandTotal)
                          : 'Not Set';
                      })()}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-2">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  No Items / Budget: 0
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Engineering Verdict Section */}
        {rfq.engineeringTransit && rfq.engineeringTransit.status === 'reviewed' && (
          <div className={`border rounded-lg p-4 mb-6 ${
            rfq.engineeringTransit.canDo 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                rfq.engineeringTransit.canDo 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-red-100 text-red-600'
              }`}>
                {rfq.engineeringTransit.canDo ? (
                  <CheckCircle2 size={24} />
                ) : (
                  <X size={24} />
                )}
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-semibold mb-2 ${
                  rfq.engineeringTransit.canDo ? 'text-green-800' : 'text-red-800'
                }`}>
                  Engineering Verdict: {rfq.engineeringTransit.canDo ? 'Can Do' : 'Cannot Do'}
                </h3>
                <div className="space-y-2 text-sm">
                  {rfq.engineeringTransit.reviewedBy && (
                    <p className="text-gray-600">
                      <span className="font-medium">Reviewed by:</span> {rfq.engineeringTransit.reviewedBy.fullName || rfq.engineeringTransit.reviewedBy.email}
                    </p>
                  )}
                  {rfq.engineeringTransit.reviewedAt && (
                    <p className="text-gray-600">
                      <span className="font-medium">Reviewed on:</span> {new Date(rfq.engineeringTransit.reviewedAt).toLocaleString('id-ID')}
                    </p>
                  )}
                  {rfq.engineeringTransit.comments && (
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <div className="flex items-start gap-2">
                        <MessageSquare size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-700 mb-1">Engineering Comments:</p>
                          <p className="text-gray-600 whitespace-pre-wrap">{rfq.engineeringTransit.comments}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Specification Comparison Section */}
        {rfq.engineeringTransit && rfq.engineeringTransit.specsOriginal && rfq.engineeringTransit.specsModified && 
         rfq.engineeringTransit.specsModified.length > 0 && rfq.lineOfBusiness?.type === 'karoseri' && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <GitCompare size={20} className="text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Specification Comparison</h3>
              </div>
              <button
                onClick={() => setShowSpecComparison(!showSpecComparison)}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
              >
                {showSpecComparison ? (
                  <>
                    <ChevronUp size={16} />
                    Hide Comparison
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} />
                    Show Comparison
                  </>
                )}
              </button>
            </div>

            {showSpecComparison && (
              <div className="space-y-6">
                {rfq.engineeringTransit.specsModified.map((modifiedItem, itemIndex) => {
                  // Use specsOriginal if available, otherwise fallback to current items
                  const originalItem = rfq.engineeringTransit.specsOriginal?.[itemIndex] || rfq.items?.[itemIndex];
                  
                  // Helper to compare values
                  const compareValue = (modified, original) => {
                    if (!original) return false;
                    return String(modified || '').trim() !== String(original || '').trim();
                  };
                  
                  return (
                    <div key={itemIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <h4 className="font-medium text-gray-900">Item {modifiedItem.itemNumber || itemIndex + 1}</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-gray-200">
                        {/* Original (Left Side) */}
                        <div className="p-4 bg-gray-50">
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-300">
                            <FileText size={16} className="text-gray-500" />
                            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                              Original (Sales)
                            </span>
                          </div>
                          
                          <div className="space-y-3 text-xs">
                            <div>
                              <span className="font-medium text-gray-600">Karoseri:</span>
                              <span className="ml-2 text-gray-800">{originalItem?.karoseri || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Chassis:</span>
                              <span className="ml-2 text-gray-800">{originalItem?.chassis || 'N/A'} {originalItem?.chassisModel ? `- ${originalItem.chassisModel}` : ''}</span>
                            </div>
                            {originalItem?.notes && (
                              <div>
                                <span className="font-medium text-gray-600">Notes:</span>
                                <span className="ml-2 text-gray-800">{originalItem.notes}</span>
                              </div>
                            )}
                            
                            {/* Original Specifications */}
                            {originalItem?.specifications && originalItem.specifications.length > 0 ? (
                              <div className="mt-4 space-y-3">
                                {originalItem.specifications.map((spec, specIndex) => (
                                  <div key={specIndex} className="border border-gray-200 rounded p-2 bg-white">
                                    <h6 className="font-semibold text-gray-700 text-xs mb-2">{spec.category}</h6>
                                    <div className="space-y-1">
                                      {spec.items && spec.items.map((specItem, itemSpecIndex) => (
                                        <div key={itemSpecIndex} className="text-gray-600">
                                          <span className="font-medium">{specItem.name}:</span>{' '}
                                          <span>{specItem.specification}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="mt-4 text-xs text-gray-400">No specifications</div>
                            )}
                          </div>
                        </div>

                        {/* Modified (Right Side - Engineering) */}
                        <div className="p-4 bg-white">
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-300">
                            <TrendingUp size={16} className="text-blue-500" />
                            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
                              Modified (Engineering)
                            </span>
                          </div>
                          
                          <div className="space-y-3 text-xs">
                            <div>
                              <span className="font-medium text-gray-600">Karoseri:</span>
                              <span className={`ml-2 ${
                                compareValue(modifiedItem.karoseri, originalItem?.karoseri)
                                  ? 'text-yellow-700 font-medium bg-yellow-50 px-1 rounded' 
                                  : 'text-gray-800'
                              }`}>
                                {modifiedItem.karoseri || 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Chassis:</span>
                              <span className={`ml-2 ${
                                compareValue(modifiedItem.chassis, originalItem?.chassis) || compareValue(modifiedItem.chassisModel, originalItem?.chassisModel)
                                  ? 'text-yellow-700 font-medium bg-yellow-50 px-1 rounded' 
                                  : 'text-gray-800'
                              }`}>
                                {modifiedItem.chassis || 'N/A'} {modifiedItem.chassisModel ? `- ${modifiedItem.chassisModel}` : ''}
                              </span>
                            </div>
                            {(modifiedItem.notes || originalItem?.notes) && (
                              <div>
                                <span className="font-medium text-gray-600">Notes:</span>
                                <span className={`ml-2 ${
                                  compareValue(modifiedItem.notes, originalItem?.notes)
                                    ? 'text-yellow-700 font-medium bg-yellow-50 px-1 rounded' 
                                    : 'text-gray-800'
                                }`}>
                                  {modifiedItem.notes || originalItem?.notes || 'N/A'}
                                </span>
                              </div>
                            )}
                            
                            {/* Modified Specifications */}
                            {modifiedItem.specifications && modifiedItem.specifications.length > 0 ? (
                              <div className="mt-4 space-y-3">
                                {modifiedItem.specifications.map((spec, specIndex) => {
                                  const originalSpec = originalItem?.specifications?.[specIndex];
                                  const isDifferent = originalSpec && JSON.stringify(spec) !== JSON.stringify(originalSpec);
                                  
                                  return (
                                    <div 
                                      key={specIndex} 
                                      className={`border rounded p-2 ${
                                        isDifferent 
                                          ? 'border-yellow-300 bg-yellow-50' 
                                          : 'border-gray-200 bg-white'
                                      }`}
                                    >
                                      <h6 className={`font-semibold text-xs mb-2 ${
                                        isDifferent ? 'text-yellow-800' : 'text-gray-700'
                                      }`}>
                                        {spec.category}
                                        {isDifferent && <span className="ml-1 text-yellow-600">(Modified)</span>}
                                      </h6>
                                      <div className="space-y-1">
                                        {spec.items && spec.items.map((specItem, itemSpecIndex) => {
                                          const originalSpecItem = originalSpec?.items?.[itemSpecIndex];
                                          const itemIsDifferent = originalSpecItem && (
                                            (specItem.name || '').trim() !== (originalSpecItem.name || '').trim() || 
                                            (specItem.specification || '').trim() !== (originalSpecItem.specification || '').trim()
                                          );
                                          
                                          return (
                                            <div key={itemSpecIndex} className={itemIsDifferent ? 'bg-yellow-100 px-1 rounded' : ''}>
                                              <span className={`font-medium ${
                                                itemIsDifferent ? 'text-yellow-800' : 'text-gray-600'
                                              }`}>
                                                {specItem.name}:
                                              </span>{' '}
                                              <span className={itemIsDifferent ? 'text-yellow-900' : 'text-gray-600'}>
                                                {specItem.specification}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : originalItem?.specifications && originalItem.specifications.length > 0 ? (
                              <div className="mt-4 text-xs text-gray-400">No modifications (same as original)</div>
                            ) : (
                              <div className="mt-4 text-xs text-gray-400">No specifications</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Supporting Documents */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Supporting Documents</h3>
          {rfq.documents && rfq.documents.length > 0 ? (
            <div className="space-y-3">
              {rfq.documents.map((docEntry) => {
                const documentId = docEntry._id || docEntry.file?.fileId || docEntry.fileId;
                const isImage = isImageDocument(docEntry);
                const hasPreview = imagePreviews[documentId];
                const isLoading = loadingImages[documentId];
                
                return (
                  <div
                    key={docEntry._id}
                    className={`rounded-lg border border-gray-200 bg-gray-50 overflow-hidden ${isImage ? 'p-0' : 'px-4 py-3'}`}
                  >
                    {isImage ? (
                      <div className="flex flex-col">
                        {/* Image Preview Section */}
                        <div className="p-4 pb-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-800">{docEntry.file?.originalName || docEntry.originalName}</span>
                              <span className="text-xs text-gray-500">
                                {formatFileSize(docEntry.file?.fileSize || docEntry.fileSize)} • Uploaded {new Date(docEntry.uploadedAt || docEntry.createdAt).toLocaleString()}
                                {docEntry.uploadedBy && (
                                  <> • Uploaded by {docEntry.uploadedBy.fullName || docEntry.uploadedBy.email}</>
                                )}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDownloadRfqDocument(docEntry)}
                              className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-100"
                            >
                              <Download size={14} />
                              Download
                            </button>
                          </div>
                          
                          {/* Thumbnail Preview */}
                          {isLoading ? (
                            <div className="mt-3 flex items-center justify-center py-8 bg-gray-100 rounded-lg border border-gray-200">
                              <div className="flex flex-col items-center gap-2">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
                                <span className="text-xs text-gray-500">Loading preview...</span>
                              </div>
                            </div>
                          ) : hasPreview ? (
                            <div className="mt-3 relative group">
                              <img
                                src={imagePreviews[documentId]}
                                alt={docEntry.file?.originalName || docEntry.originalName}
                                className="w-full h-auto max-h-64 object-contain rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const previewUrl = imagePreviews[documentId];
                                  // Verify URL is still valid, reload if needed
                                  if (previewUrl) {
                                    setShowImageModal({ documentId, url: previewUrl });
                                  } else {
                                    // Reload if URL is missing
                                    const newUrl = await loadImagePreview(docEntry, true);
                                    if (newUrl) {
                                      setShowImageModal({ documentId, url: newUrl });
                                    } else {
                                      toast.error('Failed to load image preview');
                                    }
                                  }
                                }}
                                onError={async () => {
                                  // Try to reload the image
                                  const newUrl = await loadImagePreview(docEntry, true);
                                  if (!newUrl) {
                                    toast.error('Failed to load image preview');
                                  }
                                }}
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg flex items-center justify-center pointer-events-none">
                                <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium">Click to enlarge</span>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      /* Non-image document */
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">{docEntry.file?.originalName || docEntry.originalName}</span>
                          <span className="text-xs text-gray-500">
                            {formatFileSize(docEntry.file?.fileSize || docEntry.fileSize)} • Uploaded {new Date(docEntry.uploadedAt || docEntry.createdAt).toLocaleString()}
                            {docEntry.uploadedBy && (
                              <> • Uploaded by {docEntry.uploadedBy.fullName || docEntry.uploadedBy.email}</>
                            )}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownloadRfqDocument(docEntry)}
                          className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-100"
                        >
                          <Download size={14} />
                          Download
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No documents attached.</p>
          )}
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
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-md font-medium text-gray-900">Item {item.itemNumber}</h4>
                    <div className="flex flex-col items-end gap-1 text-sm text-gray-600">
                      <div>Quantity: {item.quantity || 1}</div>
                      {item.estimatedRevenue && (() => {
                        const perQuantity = parseFloat(item.estimatedRevenue) || 0;
                        const quantity = parseInt(item.quantity) || 1;
                        const totalRevenue = perQuantity * quantity;
                        const formatCurrency = (amount) => 
                          new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
                        return (
                          <>
                            <div className="text-gray-500 text-xs">Per Qty: {formatCurrency(perQuantity)}</div>
                            <div className="font-medium text-green-700">
                              Total Revenue: {formatCurrency(totalRevenue)}
                            </div>
                            <div className="text-gray-400 italic text-xs">
                              {formatCurrency(perQuantity)} × {quantity} = {formatCurrency(totalRevenue)}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  
                  {/* Type-specific fields */}
                  {rfq.lineOfBusiness?.type === 'karoseri' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <span className="font-medium text-gray-700">Karoseri:</span>
                        <span className="ml-2 text-gray-900">{item.karoseri}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Chassis:</span>
                        <span className="ml-2 text-gray-900">{item.chassis} {item.chassisModel ? `- ${item.chassisModel}` : ''}</span>
                      </div>
                    </div>
                  )}
                  
                  {rfq.lineOfBusiness?.type === 'service' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <span className="font-medium text-gray-700">Service Name:</span>
                        <span className="ml-2 text-gray-900">{item.serviceName}</span>
                      </div>
                      {item.serviceDetails && item.serviceDetails.length > 0 && (
                        <div className="md:col-span-2">
                          <span className="font-medium text-gray-700">Service Details:</span>
                          <ul className="list-disc list-inside ml-2 text-gray-900 mt-1">
                            {item.serviceDetails.map((detail, idx) => (
                              <li key={idx}>{detail}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {rfq.lineOfBusiness?.type === 'sparepart' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <span className="font-medium text-gray-700">Sparepart Name:</span>
                        <span className="ml-2 text-gray-900">{item.sparepartName}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Price Per Unit:</span>
                        <span className="ml-2 text-gray-900">
                          {item.pricePerUnit ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.pricePerUnit) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  )}

                  {item.notes && (
                    <div className="mb-3">
                      <span className="font-medium text-gray-700">Notes:</span>
                      <span className="ml-2 text-gray-900">{item.notes}</span>
                    </div>
                  )}

                  {/* Specifications (only for karoseri) */}
                  {rfq.lineOfBusiness?.type === 'karoseri' && item.specifications && item.specifications.length > 0 && (
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

      {/* Approval/Rejection Modal */}
      {showApprovalModal && approvalAction && (
        <BaseModal
          isOpen={showApprovalModal}
          onClose={() => {
            setShowApprovalModal(false);
            setApprovalNotes('');
            setApprovalAction(null);
          }}
          title={`${approvalAction === 'approve' ? 'Approve' : 'Reject'} RFQ`}
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="approvalNotes" className="block text-sm font-medium text-gray-700 mb-2">
                {approvalAction === 'approve' ? 'Approval' : 'Rejection'} Notes
              </label>
              <textarea
                id="approvalNotes"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Enter ${approvalAction === 'approve' ? 'approval' : 'rejection'} notes...`}
                rows="4"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setApprovalNotes('');
                  setApprovalAction(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={approvalAction === 'approve' ? handleApproveAction : handleRejectAction}
                disabled={isProcessing}
                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  approvalAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isProcessing 
                  ? (approvalAction === 'approve' ? 'Approving...' : 'Rejecting...')
                  : (approvalAction === 'approve' ? 'Approve RFQ' : 'Reject RFQ')
                }
              </button>
            </div>
          </div>
        </BaseModal>
      )}

      {/* Image Preview Modal */}
      <BaseModal
        isOpen={!!showImageModal.documentId && !!showImageModal.url}
        onClose={() => {
          setShowImageModal({ documentId: null, url: null });
        }}
        title={showImageModal.documentId ? (rfq.documents?.find(doc => (doc._id || doc.file?.fileId || doc.fileId) === showImageModal.documentId)?.file?.originalName || 'Image Preview') : 'Image Preview'}
        size="lg"
      >
          <div className="space-y-4">
            <div className="relative flex items-center justify-center bg-gray-100 rounded-lg p-4 max-h-[70vh] overflow-auto">
              {showImageModal.url ? (
                <img
                  src={showImageModal.url}
                  alt="Preview"
                  className="max-w-full max-h-[60vh] object-contain rounded-lg"
                  onError={async () => {
                    // Try to reload the image
                    if (showImageModal.documentId) {
                      const docEntry = rfq.documents?.find(doc => (doc._id || doc.file?.fileId || doc.fileId) === showImageModal.documentId);
                      if (docEntry) {
                        const newUrl = await loadImagePreview(docEntry, true);
                        if (newUrl) {
                          setShowImageModal({ documentId: showImageModal.documentId, url: newUrl });
                        } else {
                          toast.error('Failed to load image');
                          setShowImageModal({ documentId: null, url: null });
                        }
                      } else {
                        toast.error('Failed to load image');
                        setShowImageModal({ documentId: null, url: null });
                      }
                    } else {
                      toast.error('Failed to load image');
                      setShowImageModal({ documentId: null, url: null });
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
                    <span className="text-sm text-gray-500">Loading image...</span>
                  </div>
                </div>
              )}
            </div>
            {showImageModal.documentId && (
              <>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      const docEntry = rfq.documents?.find(doc => (doc._id || doc.file?.fileId || doc.fileId) === showImageModal.documentId);
                      if (docEntry) {
                        handleDownloadRfqDocument(docEntry);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download size={16} />
                    Download
                  </button>
                  <button
                    onClick={() => {
                      setShowImageModal({ documentId: null, url: null });
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </BaseModal>
    </div>
  );
};

export default RFQDetailsView;

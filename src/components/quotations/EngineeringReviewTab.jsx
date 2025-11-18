import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/api/ApiHelper';
import BaseModal from '../modals/BaseModal';
import PriceInput from '../common/PriceInput';
import toast from 'react-hot-toast';
import { Wrench, CheckCircle, XCircle, Clock, Eye, ChevronDown, ChevronUp, Plus, X, Download } from 'lucide-react';
import CustomDropdown from '../common/CustomDropdown';

const EngineeringReviewTab = () => {
  const navigate = useNavigate();
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRFQ, setExpandedRFQ] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRFQ, setSelectedRFQ] = useState(null);
  const [reviewData, setReviewData] = useState({
    canDo: null,
    comments: '',
    specsModified: []
  });
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState(null);
  const [bodyTypes, setBodyTypes] = useState([]);
  const [chassisTypes, setChassisTypes] = useState([]);
  const [loadingBodyTypes, setLoadingBodyTypes] = useState(false);
  const [loadingChassisTypes, setLoadingChassisTypes] = useState(false);

  const formatFileSize = (bytes = 0) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleDownloadDocument = async (docEntry) => {
    try {
      // The endpoint is /api/rfq/documents/:documentId/download (rfqDocuments.js is mounted at /api/rfq)
      const documentId = docEntry._id || docEntry.file?.fileId || docEntry.fileId;
      if (!documentId) {
        toast.error('Document ID not found');
        return;
      }
      
      const response = await axiosInstance.get(`/api/rfq/documents/${documentId}/download`, {
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

  // Fetch RFQs for engineering review - shows all RFQs in engineering stage
  const fetchRFQs = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/rfq', {
        params: { stage: 'engineering', limit: 100, viewScope: 'engineer' }
      });
      // Backend returns data in response.data.data.rfqs array
      let rfqsArray = response.data.data?.rfqs || response.data.data?.rfq || [];
      // Ensure it's always an array
      if (!Array.isArray(rfqsArray)) {
        console.error('API returned non-array data:', rfqsArray);
        rfqsArray = [];
      }
      setRfqs(rfqsArray);
    } catch (error) {
      console.error('Error fetching RFQs:', error);
      toast.error('Failed to fetch RFQs for review');
      setRfqs([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRFQs();
  }, []);

  const fetchBodyTypes = useCallback(async () => {
    setLoadingBodyTypes(true);
    try {
      const response = await axiosInstance.get('/api/body-types/list');
      const bodyTypesData = response.data?.data || [];
      setBodyTypes(Array.isArray(bodyTypesData) ? bodyTypesData : []);
    } catch (error) {
      console.error('Error fetching body types:', error);
      toast.error('Failed to load body types');
      setBodyTypes([]);
    } finally {
      setLoadingBodyTypes(false);
    }
  }, []);

  const fetchChassisTypes = useCallback(async () => {
    setLoadingChassisTypes(true);
    try {
      const response = await axiosInstance.get('/api/chassis-types/list');
      const chassisTypesData = response.data?.data || [];
      setChassisTypes(Array.isArray(chassisTypesData) ? chassisTypesData : []);
    } catch (error) {
      console.error('Error fetching chassis types:', error);
      toast.error('Failed to load chassis types');
      setChassisTypes([]);
    } finally {
      setLoadingChassisTypes(false);
    }
  }, []);

  useEffect(() => {
    fetchBodyTypes();
    fetchChassisTypes();
  }, [fetchBodyTypes, fetchChassisTypes]);

  const bodyTypeOptions = useMemo(() => {
    return (bodyTypes || []).map((bt) => {
      const name = bt.name || bt.displayName || bt.shortName || '';
      const short = bt.shortName && bt.shortName !== name ? bt.shortName : null;
      return {
        value: name,
        label: short ? `${name} (${short})` : name
      };
    });
  }, [bodyTypes]);

  const chassisTypeOptions = useMemo(() => {
    return (chassisTypes || []).map((ct) => {
      const name = ct.name || ct.displayName || ct.shortName || '';
      const short = ct.shortName && ct.shortName !== name ? ct.shortName : null;
      return {
        value: name,
        label: short ? `${name} (${short})` : name
      };
    });
  }, [chassisTypes]);

  useEffect(() => {
    let isMounted = true;

    const fetchDocuments = async () => {
      if (!showReviewModal || !selectedRFQ?._id) {
        if (isMounted) {
          setDocuments([]);
          setDocumentsError(null);
          setDocumentsLoading(false);
        }
        return;
      }

      try {
        if (isMounted) {
          setDocumentsLoading(true);
          setDocumentsError(null);
        }
        const response = await axiosInstance.get(`/api/rfq/${selectedRFQ._id}/documents`);
        const docs =
          response.data?.data?.documents ||
          response.data?.documents ||
          response.data ||
          [];
        if (isMounted) {
          setDocuments(Array.isArray(docs) ? docs : []);
        }
      } catch (error) {
        console.error('Error fetching RFQ documents:', error);
        if (isMounted) {
          setDocuments([]);
          setDocumentsError(error.response?.data?.message || 'Failed to load documents');
        }
      } finally {
        if (isMounted) {
          setDocumentsLoading(false);
        }
      }
    };

    fetchDocuments();

    return () => {
      isMounted = false;
    };
  }, [showReviewModal, selectedRFQ]);

  // Handle engineering review submission
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  const handleSubmitReview = async () => {
    try {
      if (reviewData.canDo === null) {
        toast.error('Please select whether this can be done (Can Do / Cannot Do)');
        return;
      }

      setIsSubmittingReview(true);
      await axiosInstance.patch(`/api/rfq/${selectedRFQ._id}/engineering-review`, {
        canDo: reviewData.canDo,
        comments: reviewData.comments,
        specsModified: reviewData.specsModified
      });

      toast.success('Engineering review submitted successfully');
      fetchRFQs();
      setShowReviewModal(false);
      setSelectedRFQ(null);
      setReviewData({
        canDo: null,
        comments: '',
        specsModified: []
      });
    } catch (error) {
      console.error('Error submitting engineering review:', error);
      toast.error(error.response?.data?.message || 'Failed to submit engineering review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Item management functions - unified for all types
  const addItem = () => {
    const lineOfBusinessType = selectedRFQ?.lineOfBusiness?.type || 'karoseri';
    const newItem = {
      itemNumber: reviewData.specsModified.length + 1,
      notes: ''
    };
    
    // Type-specific fields
    if (lineOfBusinessType === 'karoseri') {
      newItem.karoseri = '';
      newItem.chassis = '';
      newItem.chassisModel = '';
      newItem.specifications = [];
    } else if (lineOfBusinessType === 'service') {
      newItem.serviceName = '';
      newItem.serviceDetails = [''];
      newItem.estimatedRevenue = 0;
      newItem.quantity = 1;
    } else if (lineOfBusinessType === 'sparepart') {
      newItem.sparepartName = '';
      newItem.quantity = 1;
      newItem.pricePerUnit = 0;
      newItem.estimatedRevenue = 0;
    }
    
    setReviewData(prev => ({
      ...prev,
      specsModified: [...prev.specsModified, newItem]
    }));
  };

  const removeItem = (index) => {
    setReviewData(prev => ({
      ...prev,
      specsModified: prev.specsModified.filter((_, i) => i !== index).map((item, idx) => ({
        ...item,
        itemNumber: idx + 1
      }))
    }));
  };

  const updateItem = (index, field, value) => {
    setReviewData(prev => ({
      ...prev,
      specsModified: prev.specsModified.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  // Service details management functions
  const addServiceDetail = (itemIndex) => {
    setReviewData(prev => ({
      ...prev,
      specsModified: prev.specsModified.map((item, i) => 
        i === itemIndex 
          ? { ...item, serviceDetails: [...(item.serviceDetails || []), ''] }
          : item
      )
    }));
  };

  const removeServiceDetail = (itemIndex, detailIndex) => {
    setReviewData(prev => ({
      ...prev,
      specsModified: prev.specsModified.map((item, i) => 
        i === itemIndex 
          ? { ...item, serviceDetails: item.serviceDetails.filter((_, di) => di !== detailIndex) }
          : item
      )
    }));
  };

  const updateServiceDetail = (itemIndex, detailIndex, value) => {
    setReviewData(prev => ({
      ...prev,
      specsModified: prev.specsModified.map((item, i) => 
        i === itemIndex 
          ? {
              ...item,
              serviceDetails: item.serviceDetails.map((detail, di) => 
                di === detailIndex ? value : detail
              )
            }
          : item
      )
    }));
  };

  // Specification management functions
  const addSpecificationCategory = (itemIndex) => {
    const newCategory = { category: '', items: [] };
    setReviewData(prev => ({
      ...prev,
      specsModified: prev.specsModified.map((item, i) => 
        i === itemIndex 
          ? { ...item, specifications: [...(item.specifications || []), newCategory] }
          : item
      )
    }));
  };

  const removeSpecificationCategory = (itemIndex, categoryIndex) => {
    setReviewData(prev => ({
      ...prev,
      specsModified: prev.specsModified.map((item, i) => 
        i === itemIndex 
          ? { ...item, specifications: item.specifications.filter((_, ci) => ci !== categoryIndex) }
          : item
      )
    }));
  };

  const updateSpecificationCategory = (itemIndex, categoryIndex, field, value) => {
    setReviewData(prev => ({
      ...prev,
      specsModified: prev.specsModified.map((item, i) => 
        i === itemIndex 
          ? {
              ...item,
              specifications: item.specifications.map((spec, si) => 
                si === categoryIndex ? { ...spec, [field]: value } : spec
              )
            }
          : item
      )
    }));
  };

  const addSpecificationItem = (itemIndex, categoryIndex) => {
    const newSpecItem = { name: '', specification: '' };
    setReviewData(prev => ({
      ...prev,
      specsModified: prev.specsModified.map((item, i) => 
        i === itemIndex 
          ? {
              ...item,
              specifications: item.specifications.map((spec, si) => 
                si === categoryIndex 
                  ? { ...spec, items: [...(spec.items || []), newSpecItem] }
                  : spec
              )
            }
          : item
      )
    }));
  };

  const removeSpecificationItem = (itemIndex, categoryIndex, itemSpecIndex) => {
    setReviewData(prev => ({
      ...prev,
      specsModified: prev.specsModified.map((item, i) => 
        i === itemIndex 
          ? {
              ...item,
              specifications: item.specifications.map((spec, si) => 
                si === categoryIndex 
                  ? { ...spec, items: spec.items.filter((_, isi) => isi !== itemSpecIndex) }
                  : spec
              )
            }
          : item
      )
    }));
  };

  const updateSpecificationItem = (itemIndex, categoryIndex, itemSpecIndex, field, value) => {
    setReviewData(prev => ({
      ...prev,
      specsModified: prev.specsModified.map((item, i) => 
        i === itemIndex 
          ? {
              ...item,
              specifications: item.specifications.map((spec, si) => 
                si === categoryIndex 
                  ? {
                      ...spec,
                      items: spec.items.map((itemSpec, isi) => 
                        isi === itemSpecIndex ? { ...itemSpec, [field]: value } : itemSpec
                      )
                    }
                  : spec
              )
            }
          : item
      )
    }));
  };


  // Show review modal
  const showReview = (rfq) => {
    setSelectedRFQ(rfq);
    
    // Initialize review data with a deep copy of original specs for modification
    const lineOfBusinessType = rfq.lineOfBusiness?.type || 'karoseri';
    let specsModified = [];
    
    // If already has modified specs, use those; otherwise deep copy from original
    if (rfq.engineeringTransit?.specsModified && rfq.engineeringTransit.specsModified.length > 0) {
      specsModified = JSON.parse(JSON.stringify(rfq.engineeringTransit.specsModified));
      // Migrate old serviceDetail to serviceDetails array if needed
      if (lineOfBusinessType === 'service') {
        specsModified = specsModified.map(item => {
          if (item.serviceDetail && !Array.isArray(item.serviceDetails)) {
            item.serviceDetails = [item.serviceDetail];
            delete item.serviceDetail;
          }
          return item;
        });
      }
    } else {
      // Deep copy from original specs (from specsOriginal if available, otherwise from items)
      if (lineOfBusinessType === 'karoseri') {
        const sourceSpecs = rfq.engineeringTransit?.specsOriginal || rfq.items || [];
        specsModified = sourceSpecs.map(item => ({
          itemNumber: item.itemNumber,
          karoseri: item.karoseri || '',
          chassis: item.chassis || '',
          chassisModel: item.chassisModel || '',
          notes: item.notes || '',
          specifications: JSON.parse(JSON.stringify(item.specifications || []))
        }));
      } else if (lineOfBusinessType === 'service') {
        // Service now uses items structure
        const sourceSpecs = rfq.engineeringTransit?.specsOriginal || rfq.items || [];
        specsModified = sourceSpecs.map(item => {
          const migratedItem = {
            itemNumber: item.itemNumber,
            serviceName: item.serviceName || '',
            serviceDetails: item.serviceDetails || [],
            estimatedRevenue: item.estimatedRevenue || 0,
            quantity: item.quantity || 1,
            notes: item.notes || ''
          };
          // Migrate old serviceDetail to serviceDetails array if needed
          if (item.serviceDetail && !Array.isArray(item.serviceDetails)) {
            migratedItem.serviceDetails = [item.serviceDetail];
          }
          return migratedItem;
        });
      } else if (lineOfBusinessType === 'sparepart') {
        // Sparepart now uses items structure
        const sourceSpecs = rfq.engineeringTransit?.specsOriginal || rfq.items || [];
        specsModified = sourceSpecs.map(item => ({
          itemNumber: item.itemNumber,
          sparepartName: item.sparepartName || '',
          quantity: item.quantity || 1,
          pricePerUnit: item.pricePerUnit || 0,
          estimatedRevenue: item.estimatedRevenue || 0,
          notes: item.notes || ''
        }));
      }
    }
    
    setReviewData({
      canDo: rfq.engineeringTransit?.canDo ?? null,
      comments: rfq.engineeringTransit?.comments || '',
      specsModified: specsModified
    });
    setShowReviewModal(true);
  };

  // Toggle RFQ expansion
  const toggleExpand = (rfqId) => {
    setExpandedRFQ(expandedRFQ === rfqId ? null : rfqId);
  };

  // Get status badge
  const getStatusBadge = (rfq) => {
    const status = rfq.engineeringTransit?.status || 'pending';
    if (status === 'reviewed') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Reviewed
        </span>
      );
    } else if (status === 'in_progress') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Clock className="h-3 w-3 mr-1" />
          In Progress
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          Pending Review
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading RFQs for review...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-blue-500">
            Engineering Queue
          </span>
          <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">Engineering Review</h2>
          <p className="text-sm text-gray-600 sm:text-base">
            Review RFQs in engineering stage and provide technical feedback
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 shadow-sm sm:px-4">
          <Wrench className="h-4 w-4 text-blue-500" />
          <span>
            {rfqs.length} RFQ{rfqs.length !== 1 ? 's' : ''} pending review
          </span>
        </div>
      </div>

      {rfqs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No RFQs to Review</h3>
          <p className="text-gray-600">
            There are no RFQs currently in the engineering review stage.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rfqs.map((rfq) => (
            <div
              key={rfq._id}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{rfq.rfqNumber}</h3>
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                        rfq.lineOfBusiness?.type === 'karoseri' ? 'bg-blue-100 text-blue-800' :
                        rfq.lineOfBusiness?.type === 'service' ? 'bg-purple-100 text-purple-800' :
                        rfq.lineOfBusiness?.type === 'sparepart' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {rfq.lineOfBusiness?.type?.charAt(0).toUpperCase() + rfq.lineOfBusiness?.type?.slice(1) || 'N/A'}
                      </span>
                      {getStatusBadge(rfq)}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-700">
                        Customer: {rfq.customerName}
                      </p>
                      {rfq.contactPerson && (
                        <p className="text-sm text-gray-600">
                          Contact: {rfq.contactPerson.name}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                      <span>
                        Requester: {rfq.requesterId?.fullName || rfq.requesterId?.email || 'N/A'}
                      </span>
                      {rfq.engineeringTransit?.assignedTo && (
                        <span>
                          Assigned to:{' '}
                          {rfq.engineeringTransit.assignedTo?.fullName ||
                            rfq.engineeringTransit.assignedTo?.email ||
                            'N/A'}
                        </span>
                      )}
                      <span>Created: {new Date(rfq.createdAt).toLocaleDateString()}</span>
                      {rfq.engineeringTransit?.assignedAt && (
                        <span>
                          Assigned: {new Date(rfq.engineeringTransit.assignedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {rfq.description && (
                      <p className="text-sm text-gray-600">{rfq.description}</p>
                    )}
                    {rfq.engineeringTransit?.comments && (
                      <div className="rounded-md bg-gray-50 p-3">
                        <p className="mb-1 text-sm font-medium text-gray-700">
                          Previous Review Comments:
                        </p>
                        <p className="text-sm text-gray-600">{rfq.engineeringTransit.comments}</p>
                        {rfq.engineeringTransit.canDo !== null && (
                          <p className="mt-2 text-sm">
                            <span className="font-medium">Decision: </span>
                            <span
                              className={
                                rfq.engineeringTransit.canDo ? 'text-green-600' : 'text-red-600'
                              }
                            >
                              {rfq.engineeringTransit.canDo ? 'Can Do' : 'Cannot Do'}
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <button
                      onClick={() => toggleExpand(rfq._id)}
                      className="flex items-center justify-center rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                    >
                      {expandedRFQ === rfq._id ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          <span className="ml-1 hidden text-xs sm:inline">Collapse</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          <span className="ml-1 hidden text-xs sm:inline">Details</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => navigate(`/quotations/rfq/${rfq._id}`)}
                      className="flex items-center justify-center gap-2 rounded-md border border-blue-100 bg-white px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-900"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="hidden text-xs sm:inline">Open</span>
                    </button>
                    {rfq.engineeringTransit?.status !== 'reviewed' && (
                      <button
                        onClick={() => showReview(rfq)}
                        className="flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                      >
                        <Wrench className="h-4 w-4" />
                        Review
                      </button>
                    )}
                  </div>
                </div>
                {expandedRFQ === rfq._id && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Line of Business: {rfq.lineOfBusiness?.type || 'karoseri'}</h4>
                        
                        {rfq.lineOfBusiness?.type === 'karoseri' && rfq.items && (
                          <div className="space-y-3">
                            <p className="text-sm font-medium text-gray-700">Items:</p>
                            {rfq.items.map((item, index) => {
                              const isDrawing = item.templateMode === 'drawing';
                              const drawingId =
                                (item.templateSourceModel === 'DrawingSpecification' && item.templateSourceId) ||
                                item.drawingSpecification ||
                                (item.drawingSpecification?._id);
                              return (
                                <div key={index} className="p-3 bg-gray-50 rounded-md space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm">
                                      <span className="font-medium">Item {item.itemNumber}:</span>{' '}
                                      {item.karoseri} - {item.chassis} {item.chassisModel ? `- ${item.chassisModel}` : ''}
                                    </p>
                                    {isDrawing && drawingId && (
                                      <span className="text-xs font-medium text-indigo-600">
                                        From Drawing: {item.drawingSpecification?.drawingNumber || drawingId}
                                      </span>
                                    )}
                                  </div>

                                  {isDrawing && item.specifications && item.specifications.length > 0 && (
                                    <div className="bg-white border border-indigo-100 rounded-md p-3">
                                      <p className="text-xs font-semibold text-indigo-700 mb-2">
                                        Drawing Specifications
                                      </p>
                                      <div className="space-y-2">
                                        {item.specifications.map((category, catIndex) => (
                                          <div key={catIndex} className="text-xs text-gray-700">
                                            <span className="font-medium text-gray-800">{category.category}</span>
                                            <ul className="mt-1 ml-4 list-disc space-y-1">
                                              {(category.items || []).map((specItem, specIndex) => (
                                                <li key={specIndex} className="text-gray-600">
                                                  <span className="font-medium">{specItem.name}:</span>{' '}
                                                  {specItem.specification}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {!isDrawing && item.specifications && item.specifications.length > 0 && (
                                    <div className="bg-white border border-gray-100 rounded-md p-3">
                                      <p className="text-xs font-semibold text-gray-700 mb-2">
                                        Specifications ({item.specifications.length} categories)
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        Detailed specs available when using drawing or body template.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {rfq.lineOfBusiness?.type === 'service' && rfq.items && (
                          <div className="space-y-3">
                            <p className="text-sm font-medium text-gray-700">Service Items:</p>
                            {rfq.items.map((item, index) => (
                              <div key={index} className="p-3 bg-gray-50 rounded-md">
                                <p className="text-sm"><span className="font-medium">Item {item.itemNumber}:</span> {item.serviceName}</p>
                                {item.serviceDetails && item.serviceDetails.length > 0 && (
                                  <div className="text-xs text-gray-600 mt-1">
                                    {item.serviceDetails.map((detail, idx) => (
                                      <div key={idx}>{detail}</div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {rfq.lineOfBusiness?.type === 'sparepart' && rfq.items && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">Sparepart Items:</p>
                            {rfq.items.map((item, index) => (
                              <div key={index} className="p-3 bg-gray-50 rounded-md">
                                <p className="text-sm"><span className="font-medium">Item {item.itemNumber}:</span> {item.sparepartName}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {rfq.documents && rfq.documents.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Supporting Documents</h4>
                          <div className="space-y-2">
                            {rfq.documents.map((docEntry) => (
                              <div
                                key={docEntry._id}
                                className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-800">{docEntry.file?.originalName || docEntry.originalName}</span>
                                  <span className="text-xs text-gray-500">
                                    {formatFileSize(docEntry.file?.fileSize || docEntry.fileSize)} • Uploaded {new Date(docEntry.uploadedAt || docEntry.createdAt).toLocaleString()} {docEntry.uploadedBy ? `• ${docEntry.uploadedBy.fullName || docEntry.uploadedBy.email}` : ''}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadDocument(docEntry)}
                                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                                >
                                  <Download size={14} />
                                  Download
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {rfq.engineeringTransit?.specsOriginal && rfq.engineeringTransit.specsOriginal.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Original Specifications:</h4>
                          <div className="p-3 bg-gray-50 rounded-md">
                            <p className="text-xs text-gray-600">
                              {rfq.engineeringTransit.specsOriginal.length} item(s) captured for review
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Engineering Review Modal */}
      {showReviewModal && selectedRFQ && (
        <BaseModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedRFQ(null);
            setReviewData({ canDo: null, comments: '', specsModified: [], modifiedService: null, modifiedSparepart: null });
          }}
          title="Engineering Review"
          size="xl"
        >
          <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 sm:text-xl">{selectedRFQ.rfqNumber}</h3>
                <p className="text-sm text-gray-600">Customer: {selectedRFQ.customerName}</p>
                <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                  Line of Business: <span className="font-medium">{selectedRFQ.lineOfBusiness?.type || 'karoseri'}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 sm:text-sm">
                <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                  Requester: {selectedRFQ.requesterId?.fullName || selectedRFQ.requesterId?.email || 'N/A'}
                </span>
                {selectedRFQ.engineeringTransit?.assignedTo && (
                  <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                    Assigned to: {selectedRFQ.engineeringTransit.assignedTo.fullName || selectedRFQ.engineeringTransit.assignedTo.email}
                  </span>
                )}
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-800">Supporting Documents</h4>
                {documentsLoading && (
                  <span className="text-xs text-gray-500">Loading…</span>
                )}
              </div>

              {documentsError && (
                <p className="text-xs text-red-600">{documentsError}</p>
              )}

              {!documentsLoading && !documentsError && documents.length === 0 && (
                <p className="text-xs text-gray-500">
                  No documents attached to this RFQ.
                </p>
              )}

              {!documentsLoading && !documentsError && documents.length > 0 && (
                <div className="space-y-2">
                  {documents.map((docEntry) => (
                    <div
                      key={docEntry._id}
                      className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-800">
                          {docEntry.originalName || docEntry.file?.originalName || 'Document'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatFileSize(docEntry.fileSize || docEntry.file?.fileSize)} • Uploaded{' '}
                          {new Date(docEntry.uploadedAt || docEntry.createdAt).toLocaleString()}
                          {docEntry.uploadedBy ? ` • ${docEntry.uploadedBy.fullName || docEntry.uploadedBy.email}` : ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadDocument(docEntry)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                      >
                        <Download size={14} />
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Can this be done? <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setReviewData({ ...reviewData, canDo: true })}
                  className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                    reviewData.canDo === true
                      ? 'border-green-500 bg-green-50 text-green-700 shadow-sm'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                  }`}
                >
                  <CheckCircle className="h-5 w-5" />
                  <span>Can Do</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewData({ ...reviewData, canDo: false })}
                  className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                    reviewData.canDo === false
                      ? 'border-red-500 bg-red-50 text-red-700 shadow-sm'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-red-300'
                  }`}
                >
                  <XCircle className="h-5 w-5" />
                  <span>Cannot Do</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments
              </label>
              <textarea
                value={reviewData.comments}
                onChange={(e) => setReviewData({ ...reviewData, comments: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="4"
                placeholder="Enter your technical review comments, modifications, or recommendations..."
              />
            </div>

            {/* Karoseri Specifications Editor */}
            {selectedRFQ.lineOfBusiness?.type === 'karoseri' && (
              <div className="space-y-4 rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Modified Specifications
                  </label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add Item
                  </button>
                </div>
                
                <div className="space-y-4">
                  {reviewData.specsModified && reviewData.specsModified.map((item, itemIndex) => {
                    const originalItem =
                      selectedRFQ.engineeringTransit?.specsOriginal?.[itemIndex] ||
                      selectedRFQ.items?.[itemIndex] ||
                      null;

                    const karoseriOptionsBase = [...bodyTypeOptions];
                    if (item.karoseri && !karoseriOptionsBase.some((opt) => opt.value === item.karoseri)) {
                      karoseriOptionsBase.push({ value: item.karoseri, label: `${item.karoseri} (current)` });
                    }
                    const karoseriOptions = [{ value: '', label: 'Clear selection' }, ...karoseriOptionsBase];

                    const chassisOptionsBase = [...chassisTypeOptions];
                    if (item.chassis && !chassisOptionsBase.some((opt) => opt.value === item.chassis)) {
                      chassisOptionsBase.push({ value: item.chassis, label: `${item.chassis} (current)` });
                    }
                    const chassisOptions = [{ value: '', label: 'Clear selection' }, ...chassisOptionsBase];

                    const isKaroseriDifferent =
                      originalItem && item.karoseri !== originalItem.karoseri;
                    const isChassisDifferent =
                      originalItem && item.chassis !== originalItem.chassis;

                    return (
                    <div
                      key={itemIndex}
                      className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h4 className="text-sm font-medium text-gray-900">
                          Item {item.itemNumber}
                        </h4>
                        <button
                          type="button"
                          onClick={() => removeItem(itemIndex)}
                          className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                          Remove
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
                          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Original (Read Only)
                          </div>
                          {originalItem ? (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600">Karoseri</label>
                                <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-sm text-gray-900">
                                  {originalItem.karoseri || '-'}
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600">Chassis</label>
                                <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-sm text-gray-900">
                                  {originalItem.chassis || '-'}
                                </div>
                              </div>
                              {originalItem.chassisModel && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-600">
                                    Chassis Model
                                  </label>
                                  <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-sm text-gray-900">
                                    {originalItem.chassisModel || '-'}
                                  </div>
                                </div>
                              )}
                              <div>
                                <label className="block text-xs font-medium text-gray-600">Notes</label>
                                <div className="min-h-[3rem] rounded border border-gray-200 bg-gray-50 px-2 py-2 text-sm text-gray-900">
                                  {originalItem.notes || '-'}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-600">
                                  Specifications
                                </label>
                                {originalItem.specifications && originalItem.specifications.length > 0 ? (
                                  originalItem.specifications.map((spec, specIdx) => (
                                    <div key={specIdx} className="rounded border border-gray-200 bg-gray-50 p-2 text-xs text-gray-700">
                                      <div className="font-semibold text-gray-800">
                                        {spec.category || 'Unnamed Category'}
                                      </div>
                                      {spec.items && spec.items.length > 0 && (
                                        <ul className="mt-1 list-disc space-y-1 pl-4">
                                          {spec.items.map((si, siIdx) => (
                                            <li key={siIdx}>
                                              <span className="font-medium">{si.name || ''}</span>
                                              {si.name && si.specification && ':'}{' '}
                                              {si.specification || ''}
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <div className="rounded border border-dashed border-gray-300 bg-white px-3 py-2 text-xs text-gray-400">
                                    No specifications
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="rounded border border-dashed border-gray-300 bg-white px-3 py-2 text-xs text-gray-400">
                              Original item not found
                            </div>
                          )}
                        </div>

                        <div className="space-y-3 rounded-lg border border-indigo-100 bg-white p-4 shadow-sm">
                          <div className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                            Modified (Editable)
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Karoseri</label>
                                <div className={`rounded-lg ${isKaroseriDifferent ? 'bg-amber-50 border border-amber-200 p-1' : ''}`}>
                                  <CustomDropdown
                                    options={karoseriOptions}
                                value={item.karoseri || ''}
                                    onChange={(value) => updateItem(itemIndex, 'karoseri', value)}
                                    placeholder={loadingBodyTypes ? 'Loading body types...' : 'Select karoseri'}
                                    disabled={loadingBodyTypes}
                                  />
                                </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Chassis</label>
                                <div className={`rounded-lg ${isChassisDifferent ? 'bg-amber-50 border border-amber-200 p-1' : ''}`}>
                                  <CustomDropdown
                                    options={chassisOptions}
                                value={item.chassis || ''}
                                    onChange={(value) => updateItem(itemIndex, 'chassis', value)}
                                    placeholder={loadingChassisTypes ? 'Loading chassis types...' : 'Select chassis'}
                                    disabled={loadingChassisTypes}
                                  />
                                </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Chassis Model</label>
                              <input
                                type="text"
                                value={item.chassisModel || ''}
                                onChange={(e) => updateItem(itemIndex, 'chassisModel', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                placeholder="e.g., Dutro 500"
                                style={{
                                    backgroundColor: originalItem && item.chassisModel !== originalItem.chassisModel ? '#fef3c7' : 'white'
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                              <textarea
                                value={item.notes || ''}
                                onChange={(e) => updateItem(itemIndex, 'notes', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                rows="3"
                                style={{
                                    backgroundColor: originalItem && item.notes !== originalItem.notes ? '#fef3c7' : 'white'
                                }}
                              />
                              </div>
                            </div>
                            
                            <div className="mt-4">
                              <div className="flex items-center justify-between mb-2">
                               <label className="block text-xs font-medium text-gray-700">Specifications</label>
                          <button
                            type="button"
                            onClick={() => addSpecificationCategory(itemIndex)}
                            className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            <Plus className="h-3 w-3 inline mr-1" />
                            Add Category
                          </button>
                              </div>
                              
                              <div className="space-y-2">
                                {item.specifications && item.specifications.map((spec, specIndex) => {
                                  const originalSpec =
                                    originalItem?.specifications?.[specIndex] || null;
                                  const isDifferent =
                                    originalSpec && JSON.stringify(spec) !== JSON.stringify(originalSpec);
                                  
                                  return (
                                    <div 
                                      key={specIndex} 
                                      className="rounded border border-gray-200 p-2"
                                      style={{
                                        backgroundColor: isDifferent ? '#fef3c7' : 'white'
                                      }}
                                    >
                                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                <input
                                          type="text"
                                          value={spec.category || ''}
                                          onChange={(e) => updateSpecificationCategory(itemIndex, specIndex, 'category', e.target.value)}
                                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded mr-2"
                                          placeholder="Category name"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => removeSpecificationCategory(itemIndex, specIndex)}
                                          className="text-red-600 hover:text-red-800"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                      
                                      <div className="space-y-1 ml-2">
                                {spec.items && spec.items.map((specItem, specItemIndex) => (
                                  <div key={specItemIndex} className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={specItem.name || ''}
                                      onChange={(e) => updateSpecificationItem(itemIndex, specIndex, specItemIndex, 'name', e.target.value)}
                                      className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                                      placeholder="Name"
                                    />
                                    <span className="text-xs text-gray-500">:</span>
                                    <input
                                      type="text"
                                      value={specItem.specification || ''}
                                      onChange={(e) => updateSpecificationItem(itemIndex, specIndex, specItemIndex, 'specification', e.target.value)}
                                      className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                                      placeholder="Value"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeSpecificationItem(itemIndex, specIndex, specItemIndex)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => addSpecificationItem(itemIndex, specIndex)}
                                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                      <Plus className="h-3 w-3 inline mr-1" />
                                      Add Specification
                                    </button>
                                  </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Service Items Editor - Unified */}
            {selectedRFQ.lineOfBusiness?.type === 'service' && (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Modified Service Items
                  </label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Service Item
                  </button>
                </div>
                
                <div className="space-y-4">
                  {reviewData.specsModified && reviewData.specsModified.map((item, itemIndex) => (
                    <div key={itemIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-900">Service Item {item.itemNumber}</h4>
                        <button
                          type="button"
                          onClick={() => removeItem(itemIndex)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* Side-by-side comparison */}
                      <div className="grid grid-cols-2 gap-0 divide-x divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                        {/* Original (Left Side - Uneditable) */}
                        <div className="p-4 bg-gray-50">
                          <div className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">
                            Original (Read Only)
                          </div>
                          
                          {(() => {
                            const originalItem = selectedRFQ.engineeringTransit?.specsOriginal?.[itemIndex] || selectedRFQ.items?.[itemIndex] || null;
                            return originalItem ? (
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Service Name</label>
                                  <div className="px-2 py-1 text-sm bg-white border border-gray-200 rounded text-gray-900">
                                    {originalItem.serviceName || '-'}
                                  </div>
                                </div>
                                {originalItem.serviceDetails && originalItem.serviceDetails.length > 0 && (
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Service Details</label>
                                    <div className="space-y-1">
                                      {originalItem.serviceDetails.map((detail, idx) => (
                                        <div key={idx} className="px-2 py-1 text-sm bg-white border border-gray-200 rounded text-gray-900">
                                          {detail || '-'}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {originalItem.notes && (
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                                    <div className="px-2 py-1 text-sm bg-white border border-gray-200 rounded text-gray-900 min-h-[3rem]">
                                      {originalItem.notes || '-'}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400">Original item not found</div>
                            );
                          })()}
                        </div>
                        
                        {/* Modified (Right Side - Editable) */}
                        <div className="p-4 bg-white">
                          <div className="text-xs font-semibold text-blue-600 mb-3 uppercase tracking-wide">
                            Modified (Editable)
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Service Name</label>
                              <input
                                type="text"
                                value={item.serviceName || ''}
                                onChange={(e) => updateItem(itemIndex, 'serviceName', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                style={{
                                  backgroundColor: (() => {
                                    const orig = selectedRFQ.engineeringTransit?.specsOriginal?.[itemIndex] || selectedRFQ.items?.[itemIndex];
                                    return orig && item.serviceName !== orig.serviceName ? '#fef3c7' : 'white';
                                  })()
                                }}
                              />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-medium text-gray-700">Service Details</label>
                                <button
                                  type="button"
                                  onClick={() => addServiceDetail(itemIndex)}
                                  className="text-xs px-2 py-0.5 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  <Plus className="h-3 w-3 inline mr-1" />
                                  Add
                                </button>
                              </div>
                              
                              {/* Service Details List */}
                              {Array.isArray(item.serviceDetails) && item.serviceDetails.length > 0 ? (
                                <div className="space-y-1">
                                  {item.serviceDetails.map((detail, detailIndex) => (
                                    <div key={detailIndex} className="flex items-start space-x-1">
                                      <input
                                        type="text"
                                        value={detail || ''}
                                        onChange={(e) => updateServiceDetail(itemIndex, detailIndex, e.target.value)}
                                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                        placeholder="Enter service detail"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removeServiceDetail(itemIndex, detailIndex)}
                                        className="text-red-600 hover:text-red-800 p-1"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500">No details added yet</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                              <textarea
                                value={item.notes || ''}
                                onChange={(e) => updateItem(itemIndex, 'notes', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                rows="2"
                                style={{
                                  backgroundColor: (() => {
                                    const orig = selectedRFQ.engineeringTransit?.specsOriginal?.[itemIndex] || selectedRFQ.items?.[itemIndex];
                                    return orig && item.notes !== orig.notes ? '#fef3c7' : 'white';
                                  })()
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sparepart Items Editor - Unified */}
            {selectedRFQ.lineOfBusiness?.type === 'sparepart' && (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Modified Sparepart Items
                  </label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Sparepart Item
                  </button>
                </div>
                
                <div className="space-y-4">
                  {reviewData.specsModified && reviewData.specsModified.map((item, itemIndex) => (
                    <div key={itemIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-900">Sparepart Item {item.itemNumber}</h4>
                        <button
                          type="button"
                          onClick={() => removeItem(itemIndex)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* Side-by-side comparison */}
                      <div className="grid grid-cols-2 gap-0 divide-x divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                        {/* Original (Left Side - Uneditable) */}
                        <div className="p-4 bg-gray-50">
                          <div className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">
                            Original (Read Only)
                          </div>
                          
                          {(() => {
                            const originalItem = selectedRFQ.engineeringTransit?.specsOriginal?.[itemIndex] || selectedRFQ.items?.[itemIndex] || null;
                            return originalItem ? (
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Sparepart Name</label>
                                  <div className="px-2 py-1 text-sm bg-white border border-gray-200 rounded text-gray-900">
                                    {originalItem.sparepartName || '-'}
                                  </div>
                                </div>
                                {originalItem.notes && (
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                                    <div className="px-2 py-1 text-sm bg-white border border-gray-200 rounded text-gray-900 min-h-[3rem]">
                                      {originalItem.notes || '-'}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400">Original item not found</div>
                            );
                          })()}
                        </div>
                        
                        {/* Modified (Right Side - Editable) */}
                        <div className="p-4 bg-white">
                          <div className="text-xs font-semibold text-blue-600 mb-3 uppercase tracking-wide">
                            Modified (Editable)
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Sparepart Name</label>
                              <input
                                type="text"
                                value={item.sparepartName || ''}
                                onChange={(e) => updateItem(itemIndex, 'sparepartName', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                style={{
                                  backgroundColor: (() => {
                                    const orig = selectedRFQ.engineeringTransit?.specsOriginal?.[itemIndex] || selectedRFQ.items?.[itemIndex];
                                    return orig && item.sparepartName !== orig.sparepartName ? '#fef3c7' : 'white';
                                  })()
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                              <textarea
                                value={item.notes || ''}
                                onChange={(e) => updateItem(itemIndex, 'notes', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                rows="2"
                                style={{
                                  backgroundColor: (() => {
                                    const orig = selectedRFQ.engineeringTransit?.specsOriginal?.[itemIndex] || selectedRFQ.items?.[itemIndex];
                                    return orig && item.notes !== orig.notes ? '#fef3c7' : 'white';
                                  })()
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => {
                setShowReviewModal(false);
                setSelectedRFQ(null);
                setReviewData({ canDo: null, comments: '', specsModified: [] });
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitReview}
              disabled={reviewData.canDo === null || isSubmittingReview}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </BaseModal>
      )}
    </div>
  );
};

export default EngineeringReviewTab;


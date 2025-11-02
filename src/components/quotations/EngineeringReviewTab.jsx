import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/api/ApiHelper';
import BaseModal from '../modals/BaseModal';
import toast from 'react-hot-toast';
import { Wrench, CheckCircle, XCircle, Clock, Eye, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';

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
    specsModified: [],
    modifiedService: null,
    modifiedSparepart: null
  });

  // Fetch RFQs for engineering review - shows all RFQs in engineering stage
  const fetchRFQs = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/rfq', {
        params: { stage: 'engineering', limit: 100 }
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

  // Handle engineering review submission
  const handleSubmitReview = async () => {
    try {
      if (reviewData.canDo === null) {
        toast.error('Please select whether this can be done (Can Do / Cannot Do)');
        return;
      }

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
        specsModified: [],
        modifiedService: null,
        modifiedSparepart: null
      });
    } catch (error) {
      console.error('Error submitting engineering review:', error);
      toast.error(error.response?.data?.message || 'Failed to submit engineering review');
    }
  };

  // Item management functions for Karoseri
  const addItem = () => {
    const newItem = {
      itemNumber: reviewData.specsModified.length + 1,
      karoseri: '',
      chassis: '',
      notes: '',
      specifications: []
    };
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

  // Service management functions
  const updateServiceName = (value) => {
    setReviewData(prev => ({
      ...prev,
      modifiedService: { ...prev.modifiedService, serviceName: value },
      specsModified: [{ ...prev.modifiedService, serviceName: value }]
    }));
  };

  const addServiceDetail = () => {
    setReviewData(prev => ({
      ...prev,
      modifiedService: {
        ...prev.modifiedService,
        serviceDetails: [...(prev.modifiedService?.serviceDetails || []), '']
      },
      specsModified: [{
        ...prev.modifiedService,
        serviceDetails: [...(prev.modifiedService?.serviceDetails || []), '']
      }]
    }));
  };

  const removeServiceDetail = (index) => {
    setReviewData(prev => ({
      ...prev,
      modifiedService: {
        ...prev.modifiedService,
        serviceDetails: prev.modifiedService?.serviceDetails.filter((_, i) => i !== index) || []
      },
      specsModified: [{
        ...prev.modifiedService,
        serviceDetails: prev.modifiedService?.serviceDetails.filter((_, i) => i !== index) || []
      }]
    }));
  };

  const updateServiceDetail = (index, value) => {
    setReviewData(prev => {
      const newDetails = [...(prev.modifiedService?.serviceDetails || [])];
      newDetails[index] = value;
      return {
        ...prev,
        modifiedService: { ...prev.modifiedService, serviceDetails: newDetails },
        specsModified: [{ ...prev.modifiedService, serviceDetails: newDetails }]
      };
    });
  };

  // Sparepart management functions
  const addSparepart = () => {
    const newSparepart = { sparepartName: '', quantity: 1 };
    setReviewData(prev => ({
      ...prev,
      modifiedSparepart: [...(prev.modifiedSparepart || []), newSparepart],
      specsModified: [...(prev.modifiedSparepart || []), newSparepart]
    }));
  };

  const removeSparepart = (index) => {
    setReviewData(prev => ({
      ...prev,
      modifiedSparepart: prev.modifiedSparepart.filter((_, i) => i !== index),
      specsModified: prev.modifiedSparepart.filter((_, i) => i !== index)
    }));
  };

  const updateSparepart = (index, field, value) => {
    setReviewData(prev => {
      const newSpareparts = [...(prev.modifiedSparepart || [])];
      newSpareparts[index] = { ...newSpareparts[index], [field]: value };
      return {
        ...prev,
        modifiedSparepart: newSpareparts,
        specsModified: newSpareparts
      };
    });
  };

  // Show review modal
  const showReview = (rfq) => {
    setSelectedRFQ(rfq);
    
    // Initialize review data with a deep copy of original specs for modification
    const lineOfBusinessType = rfq.lineOfBusiness?.type || 'karoseri';
    let specsModified = [];
    let modifiedService = null;
    let modifiedSparepart = null;
    
    // If already has modified specs, use those; otherwise deep copy from original
    if (rfq.engineeringTransit?.specsModified && rfq.engineeringTransit.specsModified.length > 0) {
      specsModified = JSON.parse(JSON.stringify(rfq.engineeringTransit.specsModified));
      if (lineOfBusinessType === 'service') {
        modifiedService = JSON.parse(JSON.stringify(rfq.engineeringTransit.specsModified[0] || {}));
      } else if (lineOfBusinessType === 'sparepart') {
        modifiedSparepart = JSON.parse(JSON.stringify(rfq.engineeringTransit.specsModified || []));
      }
    } else {
      // Deep copy from original specs (from specsOriginal if available, otherwise from items)
      if (lineOfBusinessType === 'karoseri') {
        const sourceSpecs = rfq.engineeringTransit?.specsOriginal || rfq.items || [];
        specsModified = sourceSpecs.map(item => ({
          itemNumber: item.itemNumber,
          karoseri: item.karoseri || '',
          chassis: item.chassis || '',
          notes: item.notes || '',
          specifications: JSON.parse(JSON.stringify(item.specifications || []))
        }));
      } else if (lineOfBusinessType === 'service') {
        modifiedService = {
          serviceName: rfq.lineOfBusiness.service?.serviceName || '',
          serviceDetails: JSON.parse(JSON.stringify(rfq.lineOfBusiness.service?.serviceDetails || []))
        };
        specsModified = [modifiedService];
      } else if (lineOfBusinessType === 'sparepart') {
        modifiedSparepart = JSON.parse(JSON.stringify(rfq.lineOfBusiness.sparepart?.spareparts || []));
        specsModified = modifiedSparepart;
      }
    }
    
    setReviewData({
      canDo: rfq.engineeringTransit?.canDo ?? null,
      comments: rfq.engineeringTransit?.comments || '',
      specsModified: specsModified,
      modifiedService: modifiedService,
      modifiedSparepart: modifiedSparepart
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Engineering Review</h2>
          <p className="text-sm text-gray-600 mt-1">
            Review RFQs in engineering stage and provide technical feedback
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {rfqs.length} RFQ{rfqs.length !== 1 ? 's' : ''} pending review
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
            <div key={rfq._id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{rfq.rfqNumber}</h3>
                      {getStatusBadge(rfq)}
                    </div>
                    
                    <div className="space-y-1 mb-2">
                      <p className="text-sm font-medium text-gray-700">Customer: {rfq.customerName}</p>
                      {rfq.contactPerson && (
                        <p className="text-sm text-gray-600">Contact: {rfq.contactPerson.name}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                      <span>Requester: {rfq.requesterId?.fullName || rfq.requesterId?.email || 'N/A'}</span>
                      {rfq.engineeringTransit?.assignedTo && (
                        <span>Assigned to: {rfq.engineeringTransit.assignedTo?.fullName || rfq.engineeringTransit.assignedTo?.email || 'N/A'}</span>
                      )}
                      <span>Created: {new Date(rfq.createdAt).toLocaleDateString()}</span>
                      {rfq.engineeringTransit?.assignedAt && (
                        <span>Assigned: {new Date(rfq.engineeringTransit.assignedAt).toLocaleDateString()}</span>
                      )}
                    </div>

                    {rfq.description && (
                      <p className="text-sm text-gray-600 mt-2">{rfq.description}</p>
                    )}

                    {rfq.engineeringTransit?.comments && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm font-medium text-gray-700 mb-1">Previous Review Comments:</p>
                        <p className="text-sm text-gray-600">{rfq.engineeringTransit.comments}</p>
                        {rfq.engineeringTransit.canDo !== null && (
                          <p className="text-sm mt-2">
                            <span className="font-medium">Decision: </span>
                            <span className={rfq.engineeringTransit.canDo ? 'text-green-600' : 'text-red-600'}>
                              {rfq.engineeringTransit.canDo ? 'Can Do' : 'Cannot Do'}
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => toggleExpand(rfq._id)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                    >
                      {expandedRFQ === rfq._id ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={() => navigate(`/quotations/rfq/${rfq._id}`)}
                      className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-md"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    {rfq.engineeringTransit?.status !== 'reviewed' && (
                      <button
                        onClick={() => showReview(rfq)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Wrench className="h-4 w-4 inline mr-1" />
                        Review
                      </button>
                    )}
                  </div>
                </div>

                {expandedRFQ === rfq._id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Line of Business: {rfq.lineOfBusiness?.type || 'karoseri'}</h4>
                        
                        {rfq.lineOfBusiness?.type === 'karoseri' && rfq.items && (
                          <div className="space-y-3">
                            <p className="text-sm font-medium text-gray-700">Items:</p>
                            {rfq.items.map((item, index) => (
                              <div key={index} className="p-3 bg-gray-50 rounded-md">
                                <p className="text-sm"><span className="font-medium">Item {item.itemNumber}:</span> {item.karoseri} - {item.chassis}</p>
                                {item.specifications && item.specifications.length > 0 && (
                                  <p className="text-xs text-gray-600 mt-1">Specifications: {item.specifications.length} categories</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {rfq.lineOfBusiness?.type === 'service' && (
                          <div className="p-3 bg-gray-50 rounded-md">
                            <p className="text-sm"><span className="font-medium">Service:</span> {rfq.lineOfBusiness.service?.serviceName}</p>
                            {rfq.lineOfBusiness.service?.serviceDetails && rfq.lineOfBusiness.service.serviceDetails.length > 0 && (
                              <p className="text-xs text-gray-600 mt-1">
                                Details: {rfq.lineOfBusiness.service.serviceDetails.join(', ')}
                              </p>
                            )}
                          </div>
                        )}

                        {rfq.lineOfBusiness?.type === 'sparepart' && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">Spareparts:</p>
                            {rfq.lineOfBusiness.sparepart?.spareparts?.map((sp, index) => (
                              <div key={index} className="p-3 bg-gray-50 rounded-md">
                                <p className="text-sm">{sp.sparepartName} - Quantity: {sp.quantity}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

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
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedRFQ.rfqNumber}</h3>
              <p className="text-sm text-gray-600">Customer: {selectedRFQ.customerName}</p>
              <p className="text-xs text-gray-500 mt-1">
                Line of Business: <span className="font-medium">{selectedRFQ.lineOfBusiness?.type || 'karoseri'}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Can this be done? <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setReviewData({ ...reviewData, canDo: true })}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                    reviewData.canDo === true
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                  }`}
                >
                  <CheckCircle className="h-5 w-5 mx-auto mb-1" />
                  <span className="font-medium">Can Do</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewData({ ...reviewData, canDo: false })}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                    reviewData.canDo === false
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-red-300'
                  }`}
                >
                  <XCircle className="h-5 w-5 mx-auto mb-1" />
                  <span className="font-medium">Cannot Do</span>
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
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Modified Specifications
                  </label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </button>
                </div>
                
                <div className="space-y-4">
                  {reviewData.specsModified && reviewData.specsModified.map((item, itemIndex) => (
                    <div key={itemIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-900">Item {item.itemNumber}</h4>
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
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Karoseri</label>
                                  <div className="px-2 py-1 text-sm bg-white border border-gray-200 rounded text-gray-900">
                                    {originalItem.karoseri || '-'}
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Chassis</label>
                                  <div className="px-2 py-1 text-sm bg-white border border-gray-200 rounded text-gray-900">
                                    {originalItem.chassis || '-'}
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                                  <div className="px-2 py-1 text-sm bg-white border border-gray-200 rounded text-gray-900 min-h-[3rem]">
                                    {originalItem.notes || '-'}
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-2">Specifications</label>
                                  <div className="space-y-2">
                                    {originalItem.specifications && originalItem.specifications.length > 0 ? (
                                      originalItem.specifications.map((spec, specIdx) => (
                                        <div key={specIdx} className="border border-gray-200 rounded p-2 bg-white">
                                          <div className="text-xs font-medium text-gray-700 mb-1">{spec.category || 'Unnamed Category'}</div>
                                          {spec.items && spec.items.length > 0 && (
                                            <div className="space-y-1 ml-2">
                                              {spec.items.map((si, siIdx) => (
                                                <div key={siIdx} className="text-xs text-gray-600">
                                                  <span className="font-medium">{si.name || ''}</span>
                                                  {si.name && si.specification && ':'} {si.specification || ''}
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-xs text-gray-400 px-2 py-1">No specifications</div>
                                    )}
                                  </div>
                                </div>
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
                              <label className="block text-xs font-medium text-gray-700 mb-1">Karoseri</label>
                              <input
                                type="text"
                                value={item.karoseri || ''}
                                onChange={(e) => updateItem(itemIndex, 'karoseri', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                style={{
                                  backgroundColor: (() => {
                                    const orig = selectedRFQ.engineeringTransit?.specsOriginal?.[itemIndex] || selectedRFQ.items?.[itemIndex];
                                    return orig && item.karoseri !== orig.karoseri ? '#fef3c7' : 'white';
                                  })()
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Chassis</label>
                              <input
                                type="text"
                                value={item.chassis || ''}
                                onChange={(e) => updateItem(itemIndex, 'chassis', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                style={{
                                  backgroundColor: (() => {
                                    const orig = selectedRFQ.engineeringTransit?.specsOriginal?.[itemIndex] || selectedRFQ.items?.[itemIndex];
                                    return orig && item.chassis !== orig.chassis ? '#fef3c7' : 'white';
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
                                rows="3"
                                style={{
                                  backgroundColor: (() => {
                                    const orig = selectedRFQ.engineeringTransit?.specsOriginal?.[itemIndex] || selectedRFQ.items?.[itemIndex];
                                    return orig && item.notes !== orig.notes ? '#fef3c7' : 'white';
                                  })()
                                }}
                              />
                            </div>
                            
                            {/* Specifications - Editable */}
                            <div>
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
                                  const originalSpec = (() => {
                                    const orig = selectedRFQ.engineeringTransit?.specsOriginal?.[itemIndex] || selectedRFQ.items?.[itemIndex];
                                    return orig?.specifications?.[specIndex];
                                  })();
                                  const isDifferent = originalSpec && JSON.stringify(spec) !== JSON.stringify(originalSpec);
                                  
                                  return (
                                    <div 
                                      key={specIndex} 
                                      className="border border-gray-200 rounded p-2"
                                      style={{
                                        backgroundColor: isDifferent ? '#fef3c7' : 'white'
                                      }}
                                    >
                                      <div className="flex items-center justify-between mb-2">
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Service Editor */}
            {selectedRFQ.lineOfBusiness?.type === 'service' && reviewData.modifiedService && (
              <div className="border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Modified Service Details
                </label>
                
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Service Name</label>
                  <input
                    type="text"
                    value={reviewData.modifiedService.serviceName || ''}
                    onChange={(e) => updateServiceName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-gray-700">Service Details</label>
                    <button
                      type="button"
                      onClick={addServiceDetail}
                      className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      <Plus className="h-3 w-3 inline mr-1" />
                      Add Detail
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {reviewData.modifiedService.serviceDetails && reviewData.modifiedService.serviceDetails.map((detail, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={detail}
                          onChange={(e) => updateServiceDetail(index, e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                          placeholder="Service detail"
                        />
                        <button
                          type="button"
                          onClick={() => removeServiceDetail(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Sparepart Editor */}
            {selectedRFQ.lineOfBusiness?.type === 'sparepart' && (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Modified Spareparts
                  </label>
                  <button
                    type="button"
                    onClick={addSparepart}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Sparepart
                  </button>
                </div>
                
                <div className="space-y-3">
                  {reviewData.modifiedSparepart && reviewData.modifiedSparepart.map((sparepart, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded border border-gray-200">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Sparepart Name</label>
                        <input
                          type="text"
                          value={sparepart.sparepartName || ''}
                          onChange={(e) => updateSparepart(index, 'sparepartName', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          placeholder="Sparepart name"
                        />
                      </div>
                      <div className="w-32">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                        <input
                          type="number"
                          value={sparepart.quantity || 1}
                          onChange={(e) => updateSparepart(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          min="1"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSparepart(index)}
                        className="text-red-600 hover:text-red-800 mt-5"
                      >
                        <X className="h-4 w-4" />
                      </button>
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
                setReviewData({ canDo: null, comments: '', specsModified: [], modifiedService: null, modifiedSparepart: null });
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitReview}
              disabled={reviewData.canDo === null}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Review
            </button>
          </div>
        </BaseModal>
      )}
    </div>
  );
};

export default EngineeringReviewTab;


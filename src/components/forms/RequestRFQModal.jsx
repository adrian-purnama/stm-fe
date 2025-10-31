import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import BaseModal from '../modals/BaseModal';
import CustomDropdown from '../common/CustomDropdown';
import toast from 'react-hot-toast';
import axiosInstance from '../../utils/api/ApiHelper';

const RequestRFQModal = ({ isOpen, onClose, onSubmit, approvers, quotationCreators, engineers, rfqToEdit }) => {
  const [formData, setFormData] = useState({
    approverId: '',
    quotationCreatorId: '',
    engineeringId: '',
    description: '',
    customerName: '',
    contactPerson: {
      name: '',
      gender: 'Male'
    },
    priority: 'medium',
    expectedDeliveryDate: '',
    confidenceRate: '',
    estimatedRevenue: '',
    deliveryLocation: '',
    competitor: '',
    canMake: false,
    projectOngoing: false,
    lineOfBusiness: {
      type: 'karoseri'
    },
    items: [],
    service: {
      serviceName: '',
      serviceDetails: []
    },
    sparepart: {
      spareparts: []
    }
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [bodyTypes, setBodyTypes] = useState([]);
  const [chassisTypes, setChassisTypes] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [loadingBodyTypes, setLoadingBodyTypes] = useState(false);
  const [loadingChassisTypes, setLoadingChassisTypes] = useState(false);
  const [loadingDrawings, setLoadingDrawings] = useState(false);

  // Fetch master data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchBodyTypes();
      fetchChassisTypes();
      fetchDrawings();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && rfqToEdit) {
      setFormData({
        approverId: rfqToEdit.approverId?._id || '',
        quotationCreatorId: rfqToEdit.quotationCreatorId?._id || '',
        engineeringId: rfqToEdit.engineeringId || '',
        description: rfqToEdit.description || '',
        customerName: rfqToEdit.customerName || '',
        contactPerson: rfqToEdit.contactPerson || { name: '', gender: 'Male' },
        priority: rfqToEdit.priority || 'medium',
        expectedDeliveryDate: rfqToEdit.expectedDeliveryDate ? rfqToEdit.expectedDeliveryDate.substr(0,10) : '',
        confidenceRate: rfqToEdit.confidenceRate || '',
        estimatedRevenue: rfqToEdit.estimatedRevenue || '',
        deliveryLocation: rfqToEdit.deliveryLocation || '',
        competitor: rfqToEdit.competitor || '',
        canMake: typeof rfqToEdit.canMake === 'boolean' ? rfqToEdit.canMake : false,
        projectOngoing: typeof rfqToEdit.projectOngoing === 'boolean' ? rfqToEdit.projectOngoing : false,
        lineOfBusiness: rfqToEdit.lineOfBusiness || { type: 'karoseri' },
        items: Array.isArray(rfqToEdit.items) ? JSON.parse(JSON.stringify(rfqToEdit.items)) : [],
        service: rfqToEdit.lineOfBusiness?.service || { serviceName: '', serviceDetails: [] },
        sparepart: rfqToEdit.lineOfBusiness?.sparepart || { spareparts: [] }
      });
    } else if (isOpen && !rfqToEdit) {
      setFormData({
        approverId: '', quotationCreatorId: '', engineeringId: '',
        description: '', customerName: '', contactPerson: { name: '', gender: 'Male' },
        priority: 'medium', expectedDeliveryDate: '', confidenceRate: '', estimatedRevenue: '',
        deliveryLocation: '',
        competitor: '', canMake: false, projectOngoing: false, lineOfBusiness: { type: 'karoseri' },
        items: [], service: { serviceName: '', serviceDetails: [] }, sparepart: { spareparts: [] }
      });
    }
  }, [isOpen, rfqToEdit]);

  const fetchBodyTypes = async () => {
    setLoadingBodyTypes(true);
    try {
      const response = await axiosInstance.get('/api/body-types/list');
      if (response.data.success) {
        setBodyTypes(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching body types:', error);
      toast.error('Failed to load body types');
    } finally {
      setLoadingBodyTypes(false);
    }
  };

  const fetchChassisTypes = async () => {
    setLoadingChassisTypes(true);
    try {
      const response = await axiosInstance.get('/api/chassis-types/list');
      if (response.data.success) {
        setChassisTypes(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching chassis types:', error);
      toast.error('Failed to load chassis types');
    } finally {
      setLoadingChassisTypes(false);
    }
  };

  const fetchDrawings = async () => {
    setLoadingDrawings(true);
    try {
      const response = await axiosInstance.get('/api/drawing-specifications');
      console.log('[RFQ] Drawings fetch response:', response.data);
      if (response.data.success) {
        setDrawings(response.data.data);
        console.log('[RFQ] Set drawings:', response.data.data);
      }
    } catch (error) {
      console.error('Error fetching drawings:', error);
      toast.error('Failed to load drawings');
    } finally {
      setLoadingDrawings(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleNestedInputChange = (parentField, childField, value) => {
    setFormData(prev => ({
      ...prev,
      [parentField]: {
        ...prev[parentField],
        [childField]: value
      }
    }));
    
    // Clear error when user starts typing
    const errorKey = `${parentField}.${childField}`;
    if (errors[errorKey]) {
      setErrors(prev => ({
        ...prev,
        [errorKey]: ''
      }));
    }
  };

  // Item management functions
  const addItem = () => {
    const newItem = {
      quantity: 1,
      estimatedRevenue: 0,
      karoseri: '',
      chassis: '',
      chassisTypeId: '',
      templateMode: 'manual',
      templateSourceId: '',
      drawingSpecification: '',
      specifications: [],
      notes: ''
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  // Specification management functions
  const addSpecificationCategory = (itemIndex) => {
    const newCategory = {
      category: '',
      items: []
    };
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === itemIndex 
          ? { ...item, specifications: [...(item.specifications || []), newCategory] }
          : item
      )
    }));
  };

  const removeSpecificationCategory = (itemIndex, categoryIndex) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === itemIndex 
          ? { ...item, specifications: item.specifications.filter((_, ci) => ci !== categoryIndex) }
          : item
      )
    }));
  };

  const updateSpecificationCategory = (itemIndex, categoryIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
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
    const newSpecItem = {
      name: '',
      specification: ''
    };
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
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
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
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
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
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
  const addServiceDetail = () => {
    setFormData(prev => ({
      ...prev,
      service: {
        ...prev.service,
        serviceDetails: [...(prev.service.serviceDetails || []), '']
      }
    }));
  };

  const removeServiceDetail = (index) => {
    setFormData(prev => ({
      ...prev,
      service: {
        ...prev.service,
        serviceDetails: (prev.service.serviceDetails || []).filter((_, i) => i !== index)
      }
    }));
  };

  const updateServiceDetail = (index, value) => {
    setFormData(prev => {
      const newDetails = [...(prev.service.serviceDetails || [])];
      newDetails[index] = value;
      return {
        ...prev,
        service: {
          ...prev.service,
          serviceDetails: newDetails
        }
      };
    });
  };

  // Sparepart management functions
  const addSparepart = () => {
    setFormData(prev => ({
      ...prev,
      sparepart: {
        ...prev.sparepart,
        spareparts: [...(prev.sparepart.spareparts || []), { sparepartName: '', quantity: 1 }]
      }
    }));
  };

  const removeSparepart = (index) => {
    setFormData(prev => ({
      ...prev,
      sparepart: {
        ...prev.sparepart,
        spareparts: (prev.sparepart.spareparts || []).filter((_, i) => i !== index)
      }
    }));
  };

  const updateSparepart = (index, field, value) => {
    setFormData(prev => {
      const newSpareparts = [...(prev.sparepart.spareparts || [])];
      newSpareparts[index] = { ...newSpareparts[index], [field]: value };
      return {
        ...prev,
        sparepart: {
          ...prev.sparepart,
          spareparts: newSpareparts
        }
      };
    });
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.approverId) {
      newErrors.approverId = 'Please select an approver';
    }
    
    if (!formData.quotationCreatorId) {
      newErrors.quotationCreatorId = 'Please select a quotation creator';
    }
    
    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }
    
    if (!formData.contactPerson.name.trim()) {
      newErrors['contactPerson.name'] = 'Contact person name is required';
    }
    
    if (!formData.confidenceRate || formData.confidenceRate < 0 || formData.confidenceRate > 100) {
      newErrors.confidenceRate = 'Confidence rate is required and must be between 0 and 100';
    }
    
    if (formData.confidenceRate && !Number.isInteger(parseFloat(formData.confidenceRate))) {
      newErrors.confidenceRate = 'Confidence rate must be an integer';
    }
    
    // Validate estimated revenue
    if (!formData.estimatedRevenue || formData.estimatedRevenue < 0) {
      newErrors.estimatedRevenue = 'Estimated revenue is required and must be greater than or equal to 0';
    }
    
    if (!formData.deliveryLocation.trim()) {
      newErrors.deliveryLocation = 'Delivery location is required';
    }
    
    if (!formData.competitor.trim()) {
      newErrors.competitor = 'Competitor is required';
    }
    
    if (formData.canMake === undefined || formData.canMake === null) {
      newErrors.canMake = 'Can Make flag is required';
    }
    
    if (formData.projectOngoing === undefined || formData.projectOngoing === null) {
      newErrors.projectOngoing = 'Project Ongoing flag is required';
    }

    // Validate based on line of business type
    const lineOfBusinessType = formData.lineOfBusiness?.type || 'karoseri';
    
    if (lineOfBusinessType === 'karoseri') {
      if (formData.items.length === 0) {
        newErrors.items = 'At least one item is required';
      }
      
      // Validate each item with new template logic
      formData.items.forEach((item, index) => {
        // Quantity is now required
        if (!item.quantity || item.quantity < 1) {
          newErrors[`items.${index}.quantity`] = 'Quantity must be at least 1';
        }
        
        // Estimated Revenue is required
        if (!item.estimatedRevenue || item.estimatedRevenue < 0) {
          newErrors[`items.${index}.estimatedRevenue`] = 'Estimated revenue is required and must be >= 0';
        }
        
        // Validate template mode
        if (!item.templateMode || !['manual', 'bodyType', 'drawing'].includes(item.templateMode)) {
          newErrors[`items.${index}.templateMode`] = 'Please select a specification source';
        }
        
        // For manual mode, require templateSourceId (body type) and chassisTypeId
        if (item.templateMode === 'manual') {
          if (!item.templateSourceId) {
            newErrors[`items.${index}.templateSourceId`] = 'Please select a body type';
          }
          if (!item.chassisTypeId) {
            newErrors[`items.${index}.chassis`] = 'Chassis type is required';
          }
        }
        
        // For bodyType mode, require templateSourceId and chassisTypeId
        if (item.templateMode === 'bodyType') {
          if (!item.templateSourceId) {
            newErrors[`items.${index}.templateSourceId`] = 'Please select a body type template';
          }
          if (!item.chassisTypeId) {
            newErrors[`items.${index}.chassis`] = 'Chassis type is required';
          }
        }
        
        // For drawing mode, require templateSourceId
        if (item.templateMode === 'drawing' && !item.templateSourceId) {
          newErrors[`items.${index}.templateSourceId`] = 'Please select a drawing';
        }
      });
    } else if (lineOfBusinessType === 'service') {
      if (!formData.service.serviceName || !formData.service.serviceName.trim()) {
        newErrors['service.serviceName'] = 'Service name is required';
      }
    } else if (lineOfBusinessType === 'sparepart') {
      if (!formData.sparepart.spareparts || formData.sparepart.spareparts.length === 0) {
        newErrors['sparepart.spareparts'] = 'At least one sparepart is required';
      }
      
      // Validate each sparepart
      formData.sparepart.spareparts.forEach((sparepart, index) => {
        if (!sparepart.sparepartName || !sparepart.sparepartName.trim()) {
          newErrors[`sparepart.${index}.sparepartName`] = 'Sparepart name is required';
        }
        if (!sparepart.quantity || sparepart.quantity < 1) {
          newErrors[`sparepart.${index}.quantity`] = 'Quantity must be at least 1';
        }
      });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors below');
      return;
    }
    
    setLoading(true);
    try {
      // Format data based on line of business type
      const lineOfBusinessType = formData.lineOfBusiness?.type || 'karoseri';
      const submitData = { ...formData };
      
      // Build lineOfBusiness object for submission
      submitData.lineOfBusiness = {
        type: lineOfBusinessType
      };
      
      if (lineOfBusinessType === 'karoseri') {
        // Include items array for karoseri
        submitData.items = formData.items;
      } else if (lineOfBusinessType === 'service') {
        submitData.lineOfBusiness.service = {
          serviceName: formData.service.serviceName.trim(),
          serviceDetails: (formData.service.serviceDetails || []).map(d => d.trim()).filter(d => d)
        };
        // Don't include items for service
        delete submitData.items;
      } else if (lineOfBusinessType === 'sparepart') {
        submitData.lineOfBusiness.sparepart = {
          spareparts: formData.sparepart.spareparts.map(sp => ({
            sparepartName: sp.sparepartName.trim(),
            quantity: parseInt(sp.quantity)
          }))
        };
        // Don't include items for sparepart
        delete submitData.items;
      }

      await onSubmit(submitData);
      // Reset form
      setFormData({
        approverId: '', quotationCreatorId: '', engineeringId: '',
        description: '', customerName: '', contactPerson: { name: '', gender: 'Male' },
        priority: 'medium', expectedDeliveryDate: '', confidenceRate: '', estimatedRevenue: '',
        deliveryLocation: '',
        competitor: '', canMake: false, projectOngoing: false, lineOfBusiness: { type: 'karoseri' },
        items: [], service: { serviceName: '', serviceDetails: [] }, sparepart: { spareparts: [] }
      });
      setErrors({});
    } catch (error) {
      console.error('Error submitting RFQ:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        approverId: '', quotationCreatorId: '', engineeringId: '',
        description: '', customerName: '', contactPerson: { name: '', gender: 'Male' },
        priority: 'medium', expectedDeliveryDate: '', confidenceRate: '', estimatedRevenue: '',
        deliveryLocation: '',
        competitor: '', canMake: false, projectOngoing: false, lineOfBusiness: { type: 'karoseri' },
        items: [], service: { serviceName: '', serviceDetails: [] }, sparepart: { spareparts: [] }
      });
      setErrors({});
      onClose();
    }
  };

  // Prepare approver options for CustomDropdown
  const approverOptions = (approvers || []).map(approver => ({
    value: approver._id,
    label: `${approver.fullName || approver.email} (${approver.email})`
  }));

  // Prepare quotation creator options for CustomDropdown
  const quotationCreatorOptions = (quotationCreators || []).map(creator => ({
    value: creator._id,
    label: `${creator.fullName || creator.email} (${creator.email})`
  }));

  // Prepare engineer options for CustomDropdown (optional)
  const engineerOptions = (engineers || []).map(engineer => ({
    value: engineer._id,
    label: `${engineer.fullName || engineer.email} (${engineer.email})`
  }));

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title="Request Quotation">
      <form onSubmit={handleSubmit} className="space-y-8">

        {/* Section 1: Assignment */}
        <div className="border-t border-b border-gray-200 pt-6 pb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Approver <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                options={approverOptions}
                value={formData.approverId}
                onChange={(value) => handleInputChange('approverId', value)}
                placeholder="Select an approver"
                disabled={loading}
                error={errors.approverId}
              />
              {errors.approverId && (
                <p className="mt-1 text-sm text-red-600">{errors.approverId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quotation Creator <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                options={quotationCreatorOptions}
                value={formData.quotationCreatorId}
                onChange={(value) => handleInputChange('quotationCreatorId', value)}
                placeholder="Select a quotation creator"
                disabled={loading}
                error={errors.quotationCreatorId}
              />
              {errors.quotationCreatorId && (
                <p className="mt-1 text-sm text-red-600">{errors.quotationCreatorId}</p>
              )}
            </div>

            {engineers && engineers.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Engineer (Optional)
                </label>
                <CustomDropdown
                  options={[{ value: '', label: 'None - Assign Later' }, ...engineerOptions]}
                  value={formData.engineeringId || ''}
                  onChange={(value) => handleInputChange('engineeringId', value || null)}
                  placeholder="Select an engineer (optional)"
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Assign an engineer now or submit to engineering later
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Customer Information */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="customerName"
                value={formData.customerName}
                onChange={(e) => handleInputChange('customerName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.customerName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter customer name"
                disabled={loading}
              />
              {errors.customerName && (
                <p className="mt-1 text-sm text-red-600">{errors.customerName}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="contactName"
                  value={formData.contactPerson.name}
                  onChange={(e) => handleNestedInputChange('contactPerson', 'name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors['contactPerson.name'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter contact person name"
                  disabled={loading}
                />
                {errors['contactPerson.name'] && (
                  <p className="mt-1 text-sm text-red-600">{errors['contactPerson.name']}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person Gender <span className="text-red-500">*</span>
                </label>
                <CustomDropdown
                  options={[
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                    { value: 'Other', label: 'Other' }
                  ]}
                  value={formData.contactPerson.gender}
                  onChange={(value) => handleNestedInputChange('contactPerson', 'gender', value)}
                  placeholder="Select gender"
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Project Details */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <CustomDropdown
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'urgent', label: 'Urgent' }
                ]}
                value={formData.priority}
                onChange={(value) => handleInputChange('priority', value)}
                placeholder="Select priority"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="confidenceRate" className="block text-sm font-medium text-gray-700 mb-2">
                Confidence Rate (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="confidenceRate"
                value={formData.confidenceRate}
                onChange={(e) => handleInputChange('confidenceRate', parseInt(e.target.value) || '')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.confidenceRate ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter confidence rate (0-100)"
                disabled={loading}
                min="0"
                max="100"
                step="1"
              />
              {errors.confidenceRate && (
                <p className="mt-1 text-sm text-red-600">{errors.confidenceRate}</p>
              )}
            </div>

            <div>
              <label htmlFor="deliveryLocation" className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="deliveryLocation"
                value={formData.deliveryLocation}
                onChange={(e) => handleInputChange('deliveryLocation', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.deliveryLocation ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter delivery location"
                disabled={loading}
              />
              {errors.deliveryLocation && (
                <p className="mt-1 text-sm text-red-600">{errors.deliveryLocation}</p>
              )}
            </div>

            <div>
              <label htmlFor="competitor" className="block text-sm font-medium text-gray-700 mb-2">
                Competitor <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="competitor"
                value={formData.competitor}
                onChange={(e) => handleInputChange('competitor', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.competitor ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter competitor name"
                disabled={loading}
              />
              {errors.competitor && (
                <p className="mt-1 text-sm text-red-600">{errors.competitor}</p>
              )}
            </div>

            <div>
              <label htmlFor="expectedDeliveryDate" className="block text-sm font-medium text-gray-700 mb-2">
                Expected Delivery Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="expectedDeliveryDate"
                value={formData.expectedDeliveryDate}
                onChange={(e) => handleInputChange('expectedDeliveryDate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.expectedDeliveryDate ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.expectedDeliveryDate && (
                <p className="mt-1 text-sm text-red-600">{errors.expectedDeliveryDate}</p>
              )}
            </div>
          </div>
        </div>

         {/* Section 4: Project Flags */}
         <div className="border-b border-gray-200 pb-6">
           <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Information</h3>
           <div className="space-y-4">
             {/* Can Make Checkbox */}
             <div className="flex items-center">
               <input
                 type="checkbox"
                 id="canMake"
                 checked={formData.canMake}
                 onChange={(e) => handleInputChange('canMake', e.target.checked)}
                 className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                   errors.canMake ? 'border-red-500' : ''
                 }`}
                 disabled={loading}
               />
               <label htmlFor="canMake" className="ml-2 block text-sm font-medium text-gray-700">
                 Can Make <span className="text-red-500">*</span>
               </label>
             </div>
             {errors.canMake && (
               <p className="mt-1 text-sm text-red-600">{errors.canMake}</p>
             )}
             <p className="text-xs text-gray-500 ml-6">
               Check if we have the capability to manufacture this product
             </p>
             
             {/* Project Ongoing Checkbox */}
             <div className="flex items-center">
               <input
                 type="checkbox"
                 id="projectOngoing"
                 checked={formData.projectOngoing}
                 onChange={(e) => handleInputChange('projectOngoing', e.target.checked)}
                 className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                   errors.projectOngoing ? 'border-red-500' : ''
                 }`}
                 disabled={loading}
               />
               <label htmlFor="projectOngoing" className="ml-2 block text-sm font-medium text-gray-700">
                 Project Ongoing <span className="text-red-500">*</span>
               </label>
             </div>
             {errors.projectOngoing && (
               <p className="mt-1 text-sm text-red-600">{errors.projectOngoing}</p>
             )}
             <p className="text-xs text-gray-500 ml-6">
               Check if this is an ongoing project
             </p>
           </div>
         </div>

        {/* Section 5: Line of Business & Items */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Business & Items</h3>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Line of Business <span className="text-red-500">*</span>
            </label>
            <CustomDropdown
              options={[
                { value: 'karoseri', label: 'Karoseri' },
                { value: 'service', label: 'Service' },
                { value: 'sparepart', label: 'Sparepart' }
              ]}
              value={formData.lineOfBusiness?.type || 'karoseri'}
              onChange={(value) => {
                setFormData(prev => ({
                  ...prev,
                  lineOfBusiness: { type: value }
                }));
                // Clear errors when changing type
                setErrors(prev => {
                  const newErrors = { ...prev };
                  Object.keys(newErrors).forEach(key => {
                    if (key.startsWith('items.') || key.startsWith('service.') || key.startsWith('sparepart.')) {
                      delete newErrors[key];
                    }
                  });
                  return newErrors;
                });
              }}
              placeholder="Select line of business"
              disabled={loading}
            />
            {errors['lineOfBusiness.type'] && (
              <p className="mt-1 text-sm text-red-600">{errors['lineOfBusiness.type']}</p>
            )}
          </div>

        {/* Conditional Forms Based on Line of Business */}
        {formData.lineOfBusiness?.type === 'karoseri' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Items <span className="text-red-500">*</span>
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
          
          {errors.items && (
            <p className="mb-2 text-sm text-red-600">{errors.items}</p>
          )}
          
          {formData.items.map((item, itemIndex) => (
            <div key={itemIndex} className="border-2 border-gray-300 rounded-xl shadow-sm bg-white mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-gray-300 rounded-t-xl px-4 py-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-gray-900">Item {itemIndex + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeItem(itemIndex)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-4">
              {/* Item Configuration Section */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                <h5 className="text-sm font-semibold text-gray-800 mb-3">Configuration</h5>
                
                {/* Template Mode Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specification Source <span className="text-red-500">*</span>
                  </label>
                  <CustomDropdown
                    options={[
                      { value: 'manual', label: 'Manual - Enter everything manually' },
                      { value: 'bodyType', label: 'Body Type Template - Use default body type specs' },
                      { value: 'drawing', label: 'Drawing - Copy from existing drawing' }
                    ]}
                    value={item.templateMode || 'manual'}
                    onChange={(value) => {
                      updateItem(itemIndex, 'templateMode', value);
                      updateItem(itemIndex, 'karoseri', '');
                      updateItem(itemIndex, 'chassis', '');
                      updateItem(itemIndex, 'templateSourceId', '');
                      updateItem(itemIndex, 'drawingSpecification', '');
                      updateItem(itemIndex, 'specifications', []);
                    }}
                    placeholder="Select specification source"
                    disabled={loading}
                    error={errors[`items.${itemIndex}.templateMode`]}
                  />
                  {errors[`items.${itemIndex}.templateMode`] && (
                    <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.templateMode`]}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {item.templateMode === 'manual' && 'Select body type, enter chassis, and add specifications manually'}
                    {item.templateMode === 'bodyType' && 'Select a body type to auto-fill specifications. You still need to provide chassis info.'}
                    {item.templateMode === 'drawing' && 'Select an existing drawing to copy all specs, body type, and chassis info.'}
                  </p>
                </div>

                {/* Basic Info Fields - Quantity + Estimated Revenue + Context-specific fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Quantity - always shown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={item.quantity || ''}
                      onChange={(e) => updateItem(itemIndex, 'quantity', parseInt(e.target.value) || 1)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors[`items.${itemIndex}.quantity`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter quantity"
                      disabled={loading}
                      min="1"
                      step="1"
                    />
                    {errors[`items.${itemIndex}.quantity`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.quantity`]}</p>
                    )}
                  </div>

                  {/* Estimated Revenue - always shown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estimated Revenue (IDR) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.estimatedRevenue ? new Intl.NumberFormat('id-ID').format(item.estimatedRevenue) : ''}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/\./g, '');
                        const numValue = parseFloat(rawValue) || 0;
                        updateItem(itemIndex, 'estimatedRevenue', numValue);
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors[`items.${itemIndex}.estimatedRevenue`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter estimated revenue"
                      disabled={loading}
                    />
                    {errors[`items.${itemIndex}.estimatedRevenue`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.estimatedRevenue`]}</p>
                    )}
                  </div>

                  {/* Manual Mode: Show Body Type and Chassis fields */}
                  {item.templateMode === 'manual' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Body Type <span className="text-red-500">*</span>
                        </label>
                        <CustomDropdown
                          options={bodyTypes.map(bt => ({
                            value: bt._id,
                            label: `${bt.name} (${bt.shortName})`
                          }))}
                          value={item.templateSourceId || ''}
                          onChange={(value) => {
                            updateItem(itemIndex, 'templateSourceId', value);
                            const selectedBodyType = bodyTypes.find(bt => bt._id === value);
                            if (selectedBodyType) {
                              updateItem(itemIndex, 'karoseri', selectedBodyType.name);
                            }
                          }}
                          placeholder="Select body type"
                          disabled={loading || loadingBodyTypes}
                        />
                        {errors[`items.${itemIndex}.templateSourceId`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.templateSourceId`]}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Chassis Type <span className="text-red-500">*</span>
                        </label>
                        <CustomDropdown
                          options={chassisTypes.map(ct => ({
                            value: ct._id,
                            label: `${ct.name} (${ct.shortName})`
                          }))}
                          value={item.chassisTypeId || ''}
                          onChange={(value) => {
                            updateItem(itemIndex, 'chassisTypeId', value);
                            const selectedChassisType = chassisTypes.find(ct => ct._id === value);
                            if (selectedChassisType) {
                              updateItem(itemIndex, 'chassis', selectedChassisType.name);
                            }
                          }}
                          placeholder="Select chassis type"
                          disabled={loading || loadingChassisTypes}
                        />
                        {errors[`items.${itemIndex}.chassis`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.chassis`]}</p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Body Type Template Mode: Show Body Type selector */}
                  {item.templateMode === 'bodyType' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Body Type <span className="text-red-500">*</span>
                      </label>
                      <CustomDropdown
                        options={bodyTypes.map(bt => ({
                          value: bt._id,
                          label: `${bt.name} (${bt.shortName})`
                        }))}
                        value={item.templateSourceId || ''}
                        onChange={(value) => {
                          updateItem(itemIndex, 'templateSourceId', value);
                          const selectedBodyType = bodyTypes.find(bt => bt._id === value);
                          if (selectedBodyType && selectedBodyType.defaultSpecifications) {
                            updateItem(itemIndex, 'specifications', selectedBodyType.defaultSpecifications);
                            toast.success('Body type specifications loaded!');
                          }
                        }}
                        placeholder="Select body type"
                        disabled={loading || loadingBodyTypes}
                      />
                      {errors[`items.${itemIndex}.templateSourceId`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.templateSourceId`]}</p>
                      )}
                    </div>
                  )}

                  {/* Drawing Mode: Show Drawing selector */}
                  {item.templateMode === 'drawing' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Drawing <span className="text-red-500">*</span>
                      </label>
                      <CustomDropdown
                        options={drawings.map(d => {
                          const bodyTypeName = d.bodyTypeId?.name || 'Unknown Body';
                          const chassisTypeName = d.chassisTypeId?.name || 'Unknown Chassis';
                          return {
                            value: d._id,
                            label: `${d.drawingNumber || `Drawing ${d._id.substring(0, 8)}`} (${bodyTypeName} / ${chassisTypeName})`
                          };
                        })}
                        value={item.templateSourceId || ''}
                        onChange={(value) => {
                          console.log('[RFQ Drawing Selection] Selected value:', value);
                          updateItem(itemIndex, 'templateSourceId', value);
                          updateItem(itemIndex, 'drawingSpecification', value);
                          const selectedDrawing = drawings.find(d => d._id === value);
                          console.log('[RFQ Drawing Selection] Found drawing:', selectedDrawing);
                          if (selectedDrawing) {
                            // Populate body type
                            if (selectedDrawing.bodyTypeId) {
                              console.log('[RFQ Drawing Selection] Body Type:', selectedDrawing.bodyTypeId);
                              updateItem(itemIndex, 'karoseri', selectedDrawing.bodyTypeId?.name || '');
                            }
                            // Populate chassis type
                            if (selectedDrawing.chassisTypeId) {
                              console.log('[RFQ Drawing Selection] Chassis Type:', selectedDrawing.chassisTypeId);
                              updateItem(itemIndex, 'chassisTypeId', selectedDrawing.chassisTypeId._id);
                              updateItem(itemIndex, 'chassis', selectedDrawing.chassisTypeId?.name || '');
                            }
                            // Populate specifications
                            if (selectedDrawing.customSpecifications) {
                              console.log('[RFQ Drawing Selection] Specifications:', selectedDrawing.customSpecifications);
                              updateItem(itemIndex, 'specifications', selectedDrawing.customSpecifications);
                            }
                            toast.success('Drawing template loaded with all details!');
                          }
                        }}
                        placeholder="Select drawing"
                        disabled={loading || loadingDrawings || drawings.length === 0}
                      />
                      {errors[`items.${itemIndex}.templateSourceId`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.templateSourceId`]}</p>
                      )}
                      {drawings.length === 0 && !loadingDrawings && (
                        <p className="mt-1 text-xs text-gray-500">No drawings available. Create drawings first to use this option.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Show loaded drawing details for drawing mode */}
                {item.templateMode === 'drawing' && item.templateSourceId && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-green-50 border border-green-200 rounded-lg p-4">
                    <div>
                      <label className="block text-xs font-medium text-green-700 mb-1">
                        Body Type (from drawing)
                      </label>
                      <div className="text-sm text-green-900 font-medium">
                        {item.karoseri || 'Loading...'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-green-700 mb-1">
                        Chassis Type (from drawing)
                      </label>
                      <div className="text-sm text-green-900 font-medium">
                        {item.chassis || 'Loading...'}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-green-700 italic">
                        Specifications below are preloaded from the drawing
                      </p>
                    </div>
                  </div>
                )}

                {/* Show chassis field for bodyType mode */}
                {item.templateMode === 'bodyType' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chassis Type <span className="text-red-500">*</span>
                    </label>
                    <CustomDropdown
                      options={chassisTypes.map(ct => ({
                        value: ct._id,
                        label: `${ct.name} (${ct.shortName})`
                      }))}
                      value={item.chassisTypeId || ''}
                      onChange={(value) => {
                        updateItem(itemIndex, 'chassisTypeId', value);
                        const selectedChassisType = chassisTypes.find(ct => ct._id === value);
                        if (selectedChassisType) {
                          updateItem(itemIndex, 'chassis', selectedChassisType.name);
                        }
                      }}
                      placeholder="Select chassis type"
                      disabled={loading || loadingChassisTypes}
                    />
                    {errors[`items.${itemIndex}.chassis`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.chassis`]}</p>
                    )}
                  </div>
                )}
              </div>
              
              {/* Item Notes */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={item.notes}
                  onChange={(e) => updateItem(itemIndex, 'notes', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter item notes"
                  disabled={loading}
                  rows="2"
                />
              </div>
              
               {/* Specifications Section */}
               <div>
                 <div className="flex items-center justify-between mb-2">
                   <label className="block text-sm font-medium text-gray-700">
                     Specifications (Editable)
                   </label>
                   <button
                     type="button"
                     onClick={() => addSpecificationCategory(itemIndex)}
                     className="inline-flex items-center px-2 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
                   >
                     <Plus className="h-3 w-3 mr-1" />
                     Add Category
                   </button>
                 </div>
                
                {item.specifications && item.specifications.map((spec, specIndex) => (
                  <div key={specIndex} className="border border-gray-200 rounded-md p-3 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <input
                        type="text"
                        value={spec.category || ''}
                        onChange={(e) => updateSpecificationCategory(itemIndex, specIndex, 'category', e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Category name"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => removeSpecificationCategory(itemIndex, specIndex)}
                        className="ml-2 text-red-600 hover:text-red-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {spec.items && spec.items.map((specItem, specItemIndex) => (
                        <div key={specItemIndex} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={specItem.name || ''}
                            onChange={(e) => updateSpecificationItem(itemIndex, specIndex, specItemIndex, 'name', e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Specification name"
                            disabled={loading}
                          />
                          <span className="text-gray-500">:</span>
                          <input
                            type="text"
                            value={specItem.specification || ''}
                            onChange={(e) => updateSpecificationItem(itemIndex, specIndex, specItemIndex, 'specification', e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Specification value"
                            disabled={loading}
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
                        className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Specification
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              </div>
            </div>
          ))}
        </div>
        )}
        </div>

        {/* Service Form */}
        {formData.lineOfBusiness?.type === 'service' && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.service.serviceName}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  service: { ...prev.service, serviceName: e.target.value }
                }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors['service.serviceName'] ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter service name"
                disabled={loading}
              />
              {errors['service.serviceName'] && (
                <p className="mt-1 text-sm text-red-600">{errors['service.serviceName']}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Service Details
                </label>
                <button
                  type="button"
                  onClick={addServiceDetail}
                  className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Detail
                </button>
              </div>
              
              {formData.service.serviceDetails.map((detail, index) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={detail}
                    onChange={(e) => updateServiceDetail(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter service detail (e.g., inspection, maintenance)"
                    disabled={loading}
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
              
              {formData.service.serviceDetails.length === 0 && (
                <p className="text-sm text-gray-500">No service details added yet</p>
              )}
            </div>
          </div>
        )}

        {/* Sparepart Form */}
        {formData.lineOfBusiness?.type === 'sparepart' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Spareparts <span className="text-red-500">*</span>
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
            
            {errors['sparepart.spareparts'] && (
              <p className="mb-2 text-sm text-red-600">{errors['sparepart.spareparts']}</p>
            )}
            
            {formData.sparepart.spareparts.map((sparepart, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-900">Sparepart {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeSparepart(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sparepart Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={sparepart.sparepartName}
                      onChange={(e) => updateSparepart(index, 'sparepartName', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors[`sparepart.${index}.sparepartName`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter sparepart name"
                      disabled={loading}
                    />
                    {errors[`sparepart.${index}.sparepartName`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`sparepart.${index}.sparepartName`]}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={sparepart.quantity || ''}
                      onChange={(e) => updateSparepart(index, 'quantity', parseInt(e.target.value) || 1)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors[`sparepart.${index}.quantity`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter quantity"
                      disabled={loading}
                      min="1"
                      step="1"
                    />
                    {errors[`sparepart.${index}.quantity`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`sparepart.${index}.quantity`]}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {formData.sparepart.spareparts.length === 0 && (
              <p className="text-sm text-gray-500">No spareparts added yet</p>
            )}
          </div>
        )}

        {/* Expected Delivery Date Field */}
        <div>
          <label htmlFor="expectedDeliveryDate" className="block text-sm font-medium text-gray-700 mb-2">
            Expected Delivery Date
          </label>
          <input
            type="date"
            id="expectedDeliveryDate"
            value={formData.expectedDeliveryDate}
            onChange={(e) => handleInputChange('expectedDeliveryDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
        </div>

        {/* Description Field */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter additional details (optional)"
            disabled={loading}
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {rfqToEdit ? 'Saving...' : 'Submitting...'}
              </div>
            ) : (
              rfqToEdit ? 'Save' : 'Submit RFQ'
            )}
          </button>
         </div>
       </form>
     </BaseModal>
   );
 };
 
 export default RequestRFQModal;


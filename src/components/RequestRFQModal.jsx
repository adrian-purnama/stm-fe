import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import BaseModal from './BaseModal';
import CustomDropdown from './CustomDropdown';
import toast from 'react-hot-toast';
import ApiHelper from '../utils/ApiHelper';

const RequestRFQModal = ({ isOpen, onClose, onSubmit, approvers, quotationCreators }) => {
  const [formData, setFormData] = useState({
    approverId: '',
    quotationCreatorId: '',
    description: '',
    customerName: '',
    contactPerson: {
      name: '',
      gender: 'Male'
    },
    priority: 'medium',
    expectedDeliveryDate: '',
    confidenceRate: '',
    deliveryLocation: '',
    competitor: '',
    canMake: false,
    projectOngoing: false,
    items: []
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [truckTypes, setTruckTypes] = useState([]);
  const [loadingTruckTypes, setLoadingTruckTypes] = useState(false);
  const [showTruckTypeTemplateModal, setShowTruckTypeTemplateModal] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);

  // Fetch truck types when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTruckTypes();
    }
  }, [isOpen]);

  const fetchTruckTypes = async () => {
    setLoadingTruckTypes(true);
    try {
      const response = await ApiHelper.get('/api/truck-types');
      if (response.data.success) {
        setTruckTypes(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching truck types:', error);
      toast.error('Failed to load truck types');
    } finally {
      setLoadingTruckTypes(false);
    }
  };

  const openTruckTypeTemplateModal = (itemIndex) => {
    setSelectedItemIndex(itemIndex);
    setShowTruckTypeTemplateModal(true);
  };

  const closeTruckTypeTemplateModal = () => {
    setShowTruckTypeTemplateModal(false);
    setSelectedItemIndex(null);
  };

  const applyTruckTypeTemplate = (truckTypeId) => {
    if (selectedItemIndex !== null && truckTypeId) {
      const selectedTruckType = truckTypes.find(tt => tt._id === truckTypeId);
      if (selectedTruckType && selectedTruckType.defaultSpecifications) {
        // Convert truck type specifications to the current item's specifications
        const newSpecifications = selectedTruckType.defaultSpecifications.map(spec => ({
          category: spec.category,
          items: spec.items.map(item => ({
            name: item.name,
            specification: item.specification
          }))
        }));

        // Update the specific item's specifications
        updateItem(selectedItemIndex, 'specifications', newSpecifications);
        closeTruckTypeTemplateModal();
        toast.success('Truck type template applied successfully!');
      }
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
      karoseri: '',
      chassis: '',
      price: '',
      priceNet: '',
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
    
    if (formData.items.length === 0) {
      newErrors.items = 'At least one item is required';
    }
    
    // Validate each item
    formData.items.forEach((item, index) => {
      if (!item.karoseri.trim()) {
        newErrors[`items.${index}.karoseri`] = 'Karoseri is required';
      }
      if (!item.chassis.trim()) {
        newErrors[`items.${index}.chassis`] = 'Chassis is required';
      }
      if (!item.price || item.price <= 0) {
        newErrors[`items.${index}.price`] = 'Price must be greater than 0';
      }
      if (!item.priceNet || item.priceNet <= 0) {
        newErrors[`items.${index}.priceNet`] = 'Price Net must be greater than 0';
      }
    });
    
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
      await onSubmit(formData);
      // Reset form
      setFormData({
        title: '',
        approverId: '',
        description: ''
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
        approverId: '',
        quotationCreatorId: '',
        description: '',
        customerName: '',
        contactPerson: {
          name: '',
          gender: 'Male'
        },
        priority: 'medium',
        expectedDeliveryDate: '',
        confidenceRate: '',
        deliveryLocation: '',
        competitor: '',
        canMake: false,
        projectOngoing: false,
        items: []
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

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title="Request Quotation">
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Approver Field */}
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

        {/* Quotation Creator Field */}
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


        {/* Customer Name Field */}
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

        {/* Contact Person Fields */}
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

         {/* Priority Field */}
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

         {/* Confidence Rate Field */}
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
           <p className="mt-1 text-xs text-gray-500">
             Enter your confidence level for this RFQ request (0-100%)
           </p>
         </div>

         {/* Delivery Location Field */}
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

         {/* Competitor Field */}
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

         {/* Project Flags Section */}
         <div className="space-y-4">
           <h3 className="text-lg font-medium text-gray-900">Project Information</h3>
           
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

        {/* Items Section */}
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
            <div key={itemIndex} className="border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-900">Item {itemIndex + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeItem(itemIndex)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              {/* Item Basic Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Karoseri <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={item.karoseri}
                    onChange={(e) => updateItem(itemIndex, 'karoseri', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors[`items.${itemIndex}.karoseri`] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter karoseri"
                    disabled={loading}
                  />
                  {errors[`items.${itemIndex}.karoseri`] && (
                    <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.karoseri`]}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chassis <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={item.chassis}
                    onChange={(e) => updateItem(itemIndex, 'chassis', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors[`items.${itemIndex}.chassis`] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter chassis"
                    disabled={loading}
                  />
                  {errors[`items.${itemIndex}.chassis`] && (
                    <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.chassis`]}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={item.price || ''}
                    onChange={(e) => updateItem(itemIndex, 'price', parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors[`items.${itemIndex}.price`] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter price"
                    disabled={loading}
                    min="0"
                    step="0.01"
                  />
                  {errors[`items.${itemIndex}.price`] && (
                    <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.price`]}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price Net <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={item.priceNet || ''}
                    onChange={(e) => updateItem(itemIndex, 'priceNet', parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors[`items.${itemIndex}.priceNet`] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter price net"
                    disabled={loading}
                    min="0"
                    step="0.01"
                  />
                  {errors[`items.${itemIndex}.priceNet`] && (
                    <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.priceNet`]}</p>
                  )}
                </div>
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
                     Specifications
                   </label>
                   <div className="flex gap-2">
                     <button
                       type="button"
                       onClick={() => openTruckTypeTemplateModal(itemIndex)}
                       className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
                     >
                       <Plus className="h-3 w-3 mr-1" />
                       Use Template
                     </button>
                     <button
                       type="button"
                       onClick={() => addSpecificationCategory(itemIndex)}
                       className="inline-flex items-center px-2 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
                     >
                       <Plus className="h-3 w-3 mr-1" />
                       Add Category
                     </button>
                   </div>
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
          ))}
        </div>

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
                Submitting...
              </div>
            ) : (
              'Submit RFQ'
            )}
          </button>
         </div>
       </form>

       {/* Truck Type Template Modal */}
       {showTruckTypeTemplateModal && (
         <BaseModal
           isOpen={showTruckTypeTemplateModal}
           onClose={closeTruckTypeTemplateModal}
           title="Select Truck Type Template"
           size="md"
         >
           <div className="space-y-4">
             <p className="text-sm text-gray-600">
               Choose a truck type template to auto-populate specifications for this item:
             </p>
             
             {loadingTruckTypes ? (
               <div className="text-center py-4">
                 <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                 <p className="mt-2 text-sm text-gray-600">Loading truck types...</p>
               </div>
             ) : (
               <div className="space-y-2 max-h-60 overflow-y-auto">
                 {truckTypes.map((truckType) => (
                   <div
                     key={truckType._id}
                     className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                     onClick={() => applyTruckTypeTemplate(truckType._id)}
                   >
                     <div className="flex items-center justify-between">
                       <div>
                         <h4 className="font-medium text-gray-900">{truckType.name}</h4>
                         <p className="text-sm text-gray-600">
                           {truckType.defaultSpecifications?.length || 0} specification categories
                         </p>
                       </div>
                       <button
                         type="button"
                         onClick={(e) => {
                           e.stopPropagation();
                           applyTruckTypeTemplate(truckType._id);
                         }}
                         className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                       >
                         Use Template
                       </button>
                     </div>
                   </div>
                 ))}
                 
                 {truckTypes.length === 0 && (
                   <div className="text-center py-8 text-gray-500">
                     <p>No truck types available</p>
                   </div>
                 )}
               </div>
             )}
             
             <div className="flex justify-end pt-4 border-t border-gray-200">
               <button
                 type="button"
                 onClick={closeTruckTypeTemplateModal}
                 className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
               >
                 Cancel
               </button>
             </div>
           </div>
         </BaseModal>
       )}
     </BaseModal>
   );
 };
 
 export default RequestRFQModal;


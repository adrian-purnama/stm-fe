import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, X, Edit3, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import PriceInput from '../common/PriceInput';
import { formatPriceWithCurrency } from '../../utils/helpers/priceFormatter';
import DrawingSpecificationSelector from '../drawings/DrawingSpecificationSelector';
import CustomDropdown from '../common/CustomDropdown';
import axiosInstance from '../../utils/api/ApiHelper';

const OfferItemForm = ({ 
  item, 
  index, 
  onDelete, 
  onAdd,
  isEditing = false,
  onSave,
  onCancel,
  bulkSelection = null,
  onToggleSelect = null,
  lineOfBusinessType = 'karoseri'
}) => {
  const [formData, setFormData] = useState({
    karoseri: item?.karoseri || '',
    chassis: item?.chassis || '',
    chassisModel: item?.chassisModel || '',
    drawingSpecification: item?.drawingSpecification || null,
    bodyTypeId: item?.bodyTypeId || '',
    chassisTypeId: item?.chassisTypeId || '',
    sizeTypeId: item?.sizeTypeId || '',
    templateMode: item?.templateMode || 'manual',
    templateSourceModel: item?.templateSourceModel || null,
    templateSourceId: item?.templateSourceId || null,
    specifications: item?.specifications || [],
    quantity: item?.quantity || 1,
    price: item?.price || 0,
    discountType: item?.discountType || 'percentage',
    discountValue: item?.discountValue || 0,
    netto: item?.netto || 0,
    commission: item?.commission || 0,
    notes: item?.notes || ''
  });

  const [newSpecCategory, setNewSpecCategory] = useState('');
  const [showDrawingSelector, setShowDrawingSelector] = useState(false);
  const [selectedDrawingSpec, setSelectedDrawingSpec] = useState(null);
  
  // Master data for dropdowns
  const [bodyTypes, setBodyTypes] = useState([]);
  const [chassisTypes, setChassisTypes] = useState([]);
  const [sizeTypes, setSizeTypes] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [loadingBodyTypes, setLoadingBodyTypes] = useState(false);
  const [loadingChassisTypes, setLoadingChassisTypes] = useState(false);
  const [loadingSizeTypes, setLoadingSizeTypes] = useState(false);
  const [loadingDrawings, setLoadingDrawings] = useState(false);

  // Fetch master data when component mounts or editing starts
  useEffect(() => {
    if (isEditing) {
      fetchBodyTypes();
      fetchChassisTypes();
      fetchSizeTypes();
    }
    // Always load drawings since they're available in all modes (manual, bodyType, drawing)
    fetchDrawings();
  }, [isEditing]);

  const fetchBodyTypes = async () => {
    setLoadingBodyTypes(true);
    try {
      const response = await axiosInstance.get('/api/body-types');
      setBodyTypes(response.data.data || []);
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
      const response = await axiosInstance.get('/api/chassis-types');
      setChassisTypes(response.data.data || []);
    } catch (error) {
      console.error('Error fetching chassis types:', error);
      toast.error('Failed to load chassis types');
    } finally {
      setLoadingChassisTypes(false);
    }
  };

  const fetchSizeTypes = async () => {
    setLoadingSizeTypes(true);
    try {
      const response = await axiosInstance.get('/api/size-types');
      setSizeTypes(response.data.data || []);
    } catch (error) {
      console.error('Error fetching size types:', error);
      toast.error('Failed to load size types');
    } finally {
      setLoadingSizeTypes(false);
    }
  };

  const fetchDrawings = async () => {
    setLoadingDrawings(true);
    try {
      const response = await axiosInstance.get('/api/drawing-specifications');
      setDrawings(response.data.data || []);
    } catch (error) {
      console.error('Error fetching drawings:', error);
      toast.error('Failed to load drawings');
    } finally {
      setLoadingDrawings(false);
    }
  };

  // Update form data when item prop changes
  useEffect(() => {
    console.log('OfferItemForm: useEffect triggered, item:', item);
    const newFormData = {
      karoseri: item?.karoseri || '',
      chassis: item?.chassis || '',
      chassisModel: item?.chassisModel || '',
      drawingSpecification: item?.drawingSpecification || null,
      bodyTypeId: item?.bodyTypeId?._id || item?.bodyTypeId || '',
      chassisTypeId: item?.chassisTypeId?._id || item?.chassisTypeId || '',
      sizeTypeId: item?.sizeTypeId || '',
      templateMode: item?.templateMode || 'manual',
      templateSourceModel: item?.templateSourceModel || null,
      templateSourceId: item?.templateSourceId?._id || item?.templateSourceId || null,
      specifications: item?.specifications || [],
      quantity: item?.quantity || 1,
      price: item?.price || 0,
      discountType: item?.discountType || 'percentage',
      discountValue: item?.discountValue || 0,
      netto: item?.netto || 0,
      commission: item?.commission || 0,
      notes: item?.notes || ''
    };
    console.log('OfferItemForm: Setting formData to:', newFormData);
    setFormData(newFormData);
    
    // Set the selected drawing spec if it exists
    if (item?.drawingSpecification) {
      setSelectedDrawingSpec(item.drawingSpecification);
    }
  }, [item]);

  // Fetch drawing specification details when drawingSpecification ID changes
  useEffect(() => {
    const fetchDrawingSpec = async () => {
      if (formData.drawingSpecification && formData.drawingSpecification !== null && typeof formData.drawingSpecification === 'string') {
        try {
          const response = await ApiHelper.get(`/api/drawing-specifications/${formData.drawingSpecification}`);
          setSelectedDrawingSpec(response.data.data);
        } catch (error) {
          console.error('Error fetching drawing specification:', error);
          setSelectedDrawingSpec(null);
        }
      } else if (formData.drawingSpecification && formData.drawingSpecification !== null && typeof formData.drawingSpecification === 'object') {
        // If it's already an object (populated), use it directly
        setSelectedDrawingSpec(formData.drawingSpecification);
      } else {
        setSelectedDrawingSpec(null);
      }
    };

    fetchDrawingSpec();
  }, [formData.drawingSpecification]);

  const computeSuggestedNetto = (data) => {
    if (!data) return 0;
    const price = Number.isFinite(data.price) ? data.price : 0;
    const discountValue = Number.isFinite(data.discountValue) ? data.discountValue : 0;
    const commissionValue = Number.isFinite(data.commission) ? data.commission : 0;

    let discount = discountValue;
    if (data.discountType === 'percentage') {
      discount = (price * discountValue) / 100;
    }

    const suggested = price - discount - commissionValue;
    return suggested >= 0 ? suggested : 0;
  };

  const getDiscountAmount = (data = formData) => {
    if (!data) return 0;
    const price = Number.isFinite(data.price) ? data.price : 0;
    const discountValue = Number.isFinite(data.discountValue) ? data.discountValue : 0;

    if (data.discountType === 'percentage') {
      return (price * discountValue) / 100;
    }

    return discountValue;
  };

  const handleInputChange = (field, value) => {
    const numericValue =
      typeof value === 'number' && Number.isFinite(value) ? value : value === '' ? '' : value;

    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: numericValue
      };

      if (['price', 'discountValue', 'discountType', 'commission'].includes(field)) {
        const suggestedNetto = computeSuggestedNetto(updated);
        return {
          ...updated,
          suggestedNetto
        };
      }

      return updated;
    });
  };


  const addCategory = () => {
    if (newSpecCategory.trim()) {
      console.log('Adding category:', newSpecCategory.trim());
      console.log('Current specifications before adding:', formData.specifications);
      
      setFormData(prev => {
        const newSpecifications = [...prev.specifications, {
          category: newSpecCategory.trim(),
          items: []
        }];
        console.log('New specifications after adding:', newSpecifications);
        return {
          ...prev,
          specifications: newSpecifications
        };
      });
      setNewSpecCategory('');
    } else {
      console.log('Category name is empty, not adding');
    }
  };

  const addItemToCategory = (categoryIndex) => {
    setFormData(prev => {
      const newSpecifications = prev.specifications.map((spec, index) => 
        index === categoryIndex ? {
          ...spec,
          items: [...spec.items, {
            name: '',
            specification: ''
          }]
        } : spec
      );
      return {
        ...prev,
        specifications: newSpecifications
      };
    });
  };

  const removeSpecification = (categoryIndex, itemIndex = null) => {
    if (itemIndex !== null) {
      // Remove specific item from category
      setFormData(prev => ({
        ...prev,
        specifications: prev.specifications.map((spec, i) => 
          i === categoryIndex ? {
            ...spec,
            items: spec.items.filter((_, j) => j !== itemIndex)
          } : spec
        ).filter(spec => spec.items.length > 0) // Remove empty categories
      }));
    } else {
      // Remove entire category
      setFormData(prev => ({
        ...prev,
        specifications: prev.specifications.filter((_, i) => i !== categoryIndex)
      }));
    }
  };

  const handleSave = () => {
    console.log('OfferItemForm handleSave called with formData:', formData);
    console.log('OfferItemForm specifications:', formData.specifications);
    console.log('OfferItemForm specifications length:', formData.specifications.length);
    console.log('OfferItemForm onSave function exists:', !!onSave);
    
    // Validate required fields based on template mode
    if (!formData.karoseri.trim()) {
      console.log('Validation failed: karoseri is empty');
      toast.error('Please enter karoseri/body type');
      return;
    }
    if (!formData.chassis.trim()) {
      console.log('Validation failed: chassis is empty');
      toast.error('Please enter chassis');
      return;
    }
    
    // For bodyType mode, require templateSourceId
    if (formData.templateMode === 'bodyType' && !formData.templateSourceId) {
      console.log('Validation failed: body type template not selected');
      toast.error('Please select a body type template');
      return;
    }
    
    // For drawing mode, require templateSourceId
    if (formData.templateMode === 'drawing' && !formData.templateSourceId) {
      console.log('Validation failed: drawing not selected');
      toast.error('Please select a drawing');
      return;
    }
    
    if (formData.quantity <= 0) {
      console.log('Validation failed: quantity is invalid:', formData.quantity);
      toast.error('Please enter a valid quantity');
      return;
    }
    if (formData.price <= 0) {
      console.log('Validation failed: price is invalid:', formData.price);
      toast.error('Please enter a valid price');
      return;
    }
    if (formData.netto <= 0) {
      console.log('Validation failed: netto is invalid:', formData.netto);
      toast.error('Please enter a valid netto price');
      return;
    }
    
    console.log('OfferItemForm validation passed, calling onSave with:', formData);
    onSave && onSave(formData);
    console.log('OfferItemForm onSave call completed');
  };

  const handleCancel = () => {
    // Reset form data to original values
    setFormData({
      karoseri: item?.karoseri || '',
      chassis: item?.chassis || '',
      chassisModel: item?.chassisModel || '',
      drawingSpecification: item?.drawingSpecification || null,
      bodyTypeId: item?.bodyTypeId || '',
      chassisTypeId: item?.chassisTypeId || '',
      sizeTypeId: item?.sizeTypeId || '',
      templateMode: item?.templateMode || 'manual',
      templateSourceModel: item?.templateSourceModel || null,
      templateSourceId: item?.templateSourceId || null,
      specifications: item?.specifications || [],
      quantity: item?.quantity || 1,
      price: item?.price || 0,
      discountType: item?.discountType || 'percentage',
      discountValue: item?.discountValue || 0,
      netto: item?.netto || 0,
      commission: item?.commission || 0,
      notes: item?.notes || ''
    });
    setNewSpecCategory('');
    onCancel && onCancel();
  };

  const handleDelete = () => {
    onDelete && onDelete(index);
  };

  const handleAdd = () => {
    onAdd && onAdd();
  };

  const isSparepart = lineOfBusinessType === 'sparepart';

  const renderBulkActions = useCallback(() => {
    // Bulk actions currently apply only to sparepart mode.
    // Guard to ensure other line-of-business types (karoseri/service) are not affected.
    if (!isSparepart) {
      return null;
    }

    // TODO: Implement sparepart bulk discount/commission UI when supporting data is wired up.
    return null;
  }, [isSparepart]);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">
              {item ? index + 1 : '+'}
            </span>
          </div>
          <div>
            <h4 className="text-xl font-semibold text-gray-900">
              {item ? `Item ${index + 1}` : 'Add New Item'}
            </h4>
            <p className="text-sm text-gray-600">
              {item ? 'Edit item details' : 'Enter karoseri and chassis information'}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Item
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleAdd}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </button>
              {item && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {renderBulkActions()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Information */}
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <span className="text-blue-600 font-semibold text-sm">🚗</span>
            </div>
            <h5 className="font-semibold text-gray-900">Vehicle Information</h5>
          </div>
          
          <div className="space-y-4">
            {/* Template Mode Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specification Source *
              </label>
              <CustomDropdown
                options={[
                  { value: 'manual', label: 'Manual - Enter everything manually' },
                  { value: 'bodyType', label: 'Body Type Template - Use default body type specs' },
                  { value: 'drawing', label: 'Drawing - Copy from existing drawing' }
                ]}
                value={formData.templateMode}
                onChange={(value) => {
                  handleInputChange('templateMode', value);
                  handleInputChange('karoseri', '');
                  handleInputChange('chassis', '');
                  handleInputChange('chassisModel', '');
                  handleInputChange('templateSourceId', '');
                  handleInputChange('bodyTypeId', '');
                  handleInputChange('chassisTypeId', '');
                  handleInputChange('drawingSpecification', null);
                  handleInputChange('specifications', []);
                  setSelectedDrawingSpec(null);
                }}
                placeholder="Select specification source"
              />
              <p className="mt-1 text-xs text-gray-500">
                {formData.templateMode === 'manual' && 'Select body type, enter chassis, and add specifications manually'}
                {formData.templateMode === 'bodyType' && 'Select a body type to auto-fill specifications. You still need to provide chassis info.'}
                {formData.templateMode === 'drawing' && 'Select an existing drawing to copy all specs, body type, and chassis info.'}
              </p>
            </div>

            {/* Manual Mode: Show Body Type and Chassis dropdowns */}
            {formData.templateMode === 'manual' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Body Type *
                  </label>
                  <CustomDropdown
                    options={bodyTypes.map(bt => ({
                      value: bt._id,
                      label: `${bt.name} (${bt.shortName})`
                    }))}
                    value={formData.bodyTypeId || ''}
                    onChange={(value) => {
                      handleInputChange('bodyTypeId', value);
                      handleInputChange('templateSourceModel', 'BodyType');
                      handleInputChange('templateSourceId', value);
                      const selectedBodyType = bodyTypes.find(bt => bt._id === value);
                      if (selectedBodyType) {
                        handleInputChange('karoseri', selectedBodyType.name);
                      }
                    }}
                    placeholder="Select body type"
                    disabled={loadingBodyTypes}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chassis Type *
                  </label>
                  <CustomDropdown
                    options={chassisTypes.map(ct => ({
                      value: ct._id,
                      label: `${ct.name} (${ct.shortName})`
                    }))}
                    value={formData.chassisTypeId || ''}
                    onChange={(value) => {
                      handleInputChange('chassisTypeId', value);
                      const selectedChassisType = chassisTypes.find(ct => ct._id === value);
                      if (selectedChassisType) {
                        handleInputChange('chassis', selectedChassisType.name);
                      }
                    }}
                    placeholder="Select chassis type"
                    disabled={loadingChassisTypes}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chassis Model <span className="text-xs text-gray-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.chassisModel || ''}
                    onChange={(e) => handleInputChange('chassisModel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Dutro 500, Hino 200, etc."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Specify the specific chassis model if needed
                  </p>
                </div>

                {/* Drawing selector for manual mode (optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Drawing <span className="text-xs text-gray-500">(Optional)</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDrawingSelector(true)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className={selectedDrawingSpec ? 'text-gray-900' : 'text-gray-500'}>
                          {selectedDrawingSpec 
                            ? `${selectedDrawingSpec.drawingNumber || 'Drawing'} ${selectedDrawingSpec.bodyTypeId?.name || ''}`
                            : 'Select drawing (optional)'
                          }
                        </span>
                      </div>
                    </button>
                    {selectedDrawingSpec && (
                      <button
                        type="button"
                        onClick={() => {
                          handleInputChange('drawingSpecification', null);
                          setSelectedDrawingSpec(null);
                          toast.success('Drawing removed');
                        }}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove drawing"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Optional: Link a drawing to this item. This won't override your current settings.
                  </p>
                </div>
              </>
            )}

            {/* Body Type Template Mode: Show Body Type selector */}
            {formData.templateMode === 'bodyType' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Body Type *
                  </label>
                  <CustomDropdown
                    options={bodyTypes.map(bt => ({
                      value: bt._id,
                      label: `${bt.name} (${bt.shortName})`
                    }))}
                    value={formData.templateSourceId || ''}
                    onChange={(value) => {
                      handleInputChange('templateSourceModel', 'BodyType');
                      handleInputChange('templateSourceId', value);
                      handleInputChange('bodyTypeId', value); // Also store as bodyTypeId
                      const selectedBodyType = bodyTypes.find(bt => bt._id === value);
                      if (selectedBodyType) {
                        handleInputChange('karoseri', selectedBodyType.name);
                        if (selectedBodyType.defaultSpecifications) {
                          handleInputChange('specifications', selectedBodyType.defaultSpecifications);
                          toast.success('Body type specifications loaded!');
                        }
                      }
                    }}
                    placeholder="Select body type"
                    disabled={loadingBodyTypes}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chassis Type *
                  </label>
                  <CustomDropdown
                    options={chassisTypes.map(ct => ({
                      value: ct._id,
                      label: `${ct.name} (${ct.shortName})`
                    }))}
                    value={formData.chassisTypeId || ''}
                    onChange={(value) => {
                      handleInputChange('chassisTypeId', value);
                      const selectedChassisType = chassisTypes.find(ct => ct._id === value);
                      if (selectedChassisType) {
                        handleInputChange('chassis', selectedChassisType.name);
                      }
                    }}
                    placeholder="Select chassis type"
                    disabled={loadingChassisTypes}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chassis Model <span className="text-xs text-gray-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.chassisModel || ''}
                    onChange={(e) => handleInputChange('chassisModel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Dutro 500, Hino 200, etc."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Specify the specific chassis model if needed
                  </p>
                </div>

                {/* Drawing selector for bodyType mode (optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Drawing <span className="text-xs text-gray-500">(Optional)</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDrawingSelector(true)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className={selectedDrawingSpec ? 'text-gray-900' : 'text-gray-500'}>
                          {selectedDrawingSpec 
                            ? `${selectedDrawingSpec.drawingNumber || 'Drawing'} ${selectedDrawingSpec.bodyTypeId?.name || ''}`
                            : 'Select drawing (optional)'
                          }
                        </span>
                      </div>
                    </button>
                    {selectedDrawingSpec && (
                      <button
                        type="button"
                        onClick={() => {
                          handleInputChange('drawingSpecification', null);
                          setSelectedDrawingSpec(null);
                          toast.success('Drawing removed');
                        }}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove drawing"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Optional: Link a drawing to this item. This won't override your current settings.
                  </p>
                </div>
              </>
            )}

            {/* Drawing Mode: Show Drawing selector */}
            {formData.templateMode === 'drawing' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Drawing *
                </label>
                <CustomDropdown
                  options={drawings.map(d => ({
                    value: d._id,
                    label: `${d.drawingNumber || 'Drawing'} ${d.bodyTypeId?.name || ''}`
                  }))}
                  value={formData.templateSourceId || ''}
                  onChange={(value) => {
                    handleInputChange('templateSourceModel', 'DrawingSpecification');
                    handleInputChange('templateSourceId', value);
                    handleInputChange('drawingSpecification', value);
                    const selectedDrawing = drawings.find(d => d._id === value);
                    if (selectedDrawing) {
                      // Populate body type
                      if (selectedDrawing.bodyTypeId) {
                        handleInputChange('karoseri', selectedDrawing.bodyTypeId.name || '');
                        handleInputChange('bodyTypeId', selectedDrawing.bodyTypeId._id);
                      }
                      // Populate chassis type
                      if (selectedDrawing.chassisTypeId) {
                        handleInputChange('chassisTypeId', selectedDrawing.chassisTypeId._id);
                        handleInputChange('chassis', selectedDrawing.chassisTypeId.name || '');
                      }
                      // Populate chassis model if available
                      if (selectedDrawing.chassisModel) {
                        handleInputChange('chassisModel', selectedDrawing.chassisModel);
                      }
                      // Populate specifications
                      if (selectedDrawing.customSpecifications) {
                        handleInputChange('specifications', selectedDrawing.customSpecifications);
                      }
                      toast.success('Drawing template loaded with all details!');
                    }
                  }}
                  placeholder="Select drawing"
                  disabled={loadingDrawings}
                />
              </div>
            )}

          </div>
        </div>

      {/* Pricing Information */}
      <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
            <span className="text-green-600 font-semibold text-sm">💰</span>
          </div>
          <h5 className="font-semibold text-gray-900">Pricing & Discount</h5>
        </div>
        
        <div className="space-y-4">
          <div className="col-span-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Quantity *
            </label>
            <div className="relative rounded-lg border border-gray-200 bg-white shadow-sm">
              <input
                type="number"
                value={formData.quantity || 1}
                onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 pr-16 text-lg font-semibold text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-none"
                placeholder="1"
                min="1"
                step="1"
                required
              />
              <span className="absolute inset-y-0 right-0 flex items-center px-3 text-sm text-gray-400 border-l border-gray-100">
                units
              </span>
            </div>
          </div>

          <div className="col-span-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Base Price per Quantity *
            </label>
            <div className="rounded-lg border border-blue-200 bg-blue-50 shadow-sm px-3 py-2">
              <p className="text-[11px] text-blue-600 font-semibold uppercase tracking-wide">Gross Price</p>
              <PriceInput
                value={formData.price}
                onChange={(value) => handleInputChange('price', value)}
                placeholder="0"
                required
                className="bg-transparent border-none shadow-none px-0 text-lg font-semibold text-blue-900"
              />
              <p className="text-[10px] text-blue-500 mt-1">
                Enter the selling price before discounts for one unit/quantity.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Discount per Quantity
            </label>
            <div className="rounded-lg border border-amber-200 bg-amber-50 shadow-sm px-4 py-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">
                  Discount Type
                </span>
                <select
                  value={formData.discountType}
                  onChange={(e) => handleInputChange('discountType', e.target.value)}
                  className="text-sm font-medium text-amber-800 bg-white border border-amber-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  <option value="percentage">Percent (%)</option>
                  <option value="flat">Flat (Rp)</option>
                </select>
              </div>

              <div>
                {formData.discountType === 'flat' ? (
                  <PriceInput
                    value={formData.discountValue}
                    onChange={(value) => handleInputChange('discountValue', value)}
                    placeholder="0"
                    className="bg-white border border-amber-200 rounded-md text-sm font-semibold text-amber-900"
                  />
                ) : (
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.discountValue}
                      onChange={(e) => handleInputChange('discountValue', parseFloat(e.target.value) || 0)}
                      className="w-full pl-3 pr-8 py-2 border border-amber-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-semibold text-amber-900"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-amber-500 font-semibold">%</span>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-amber-600">
                {formData.discountType === 'percentage'
                  ? 'Percentage discount applied to the base price per quantity.'
                  : 'Flat discount amount deducted from the base price.'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Commission per Quantity (Optional)
            </label>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 shadow-sm px-3 py-2">
              <p className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wide">
                Sales Commission
              </p>
              <PriceInput
                value={formData.commission}
                onChange={(value) => handleInputChange('commission', value)}
                placeholder="0"
                className="bg-transparent border-none shadow-none px-0 text-lg font-semibold text-emerald-900"
              />
              <p className="text-[10px] text-emerald-500 mt-1">
                Amount reserved as commission per quantity (does not change netto).
              </p>
            </div>
          </div>

          <div className="col-span-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Netto per Quantity *
            </label>
            <div className="rounded-lg border border-purple-200 bg-purple-50 shadow-sm px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wide">
                  Final Netto
                </span>
                  <button
                    type="button"
                    onClick={() => {
                      const suggested = computeSuggestedNetto(formData);
                      handleInputChange('netto', suggested);
                    }}
                    className="text-[11px] bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 transition"
                  >
                    Use {formatPriceWithCurrency(computeSuggestedNetto(formData))}
                  </button>
              </div>
              <PriceInput
                value={formData.netto}
                onChange={(value) => handleInputChange('netto', value)}
                placeholder="0"
                required
                className="bg-white border border-purple-200 rounded-md text-lg font-semibold text-purple-900"
              />
              <p className="text-[10px] text-purple-500">
                Final price after discounts for each quantity. Totals use this × quantity.
              </p>
            </div>
          </div>
        </div>

        </div>
      </div>

      {/* Specifications */}
      <div className="mt-8 bg-white rounded-lg p-5 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h5 className="font-semibold text-gray-900">Specifications (Editable)</h5>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={newSpecCategory}
              onChange={(e) => setNewSpecCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCategory();
                }
              }}
              className="flex-1 sm:flex-initial min-w-[180px] px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="New category name"
            />
            <button
              type="button"
              onClick={addCategory}
              disabled={!newSpecCategory.trim()}
              className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Category
            </button>
          </div>
        </div>
        
        <div className="space-y-2">
          {formData.specifications.map((spec, categoryIndex) => (
            <div key={categoryIndex} className="border border-gray-200 rounded-md p-3">
              <div className="flex items-center justify-between mb-2">
                <input
                  type="text"
                  value={spec.category || ''}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      specifications: prev.specifications.map((s, i) => 
                        i === categoryIndex ? { ...s, category: e.target.value } : s
                      )
                    }));
                  }}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Category name"
                />
                <button
                  type="button"
                  onClick={() => removeSpecification(categoryIndex)}
                  className="ml-2 text-red-600 hover:text-red-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="space-y-2">
                {spec.items && spec.items.map((item, specItemIndex) => (
                  <div key={specItemIndex} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.name || ''}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          specifications: prev.specifications.map((s, i) => 
                            i === categoryIndex ? {
                              ...s,
                              items: s.items.map((it, j) => 
                                j === specItemIndex ? { ...it, name: e.target.value } : it
                              )
                            } : s
                          )
                        }));
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Specification name"
                    />
                    <span className="text-gray-500">:</span>
                    <input
                      type="text"
                      value={item.specification || ''}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          specifications: prev.specifications.map((s, i) => 
                            i === categoryIndex ? {
                              ...s,
                              items: s.items.map((it, j) => 
                                j === specItemIndex ? { ...it, specification: e.target.value } : it
                              )
                            } : s
                          )
                        }));
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Specification value"
                    />
                    <button
                      type="button"
                      onClick={() => removeSpecification(categoryIndex, specItemIndex)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => addItemToCategory(categoryIndex)}
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

      {/* Notes */}
      <div className="mt-8 bg-white rounded-lg p-5 shadow-sm border border-gray-100">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
            <span className="text-yellow-600 font-semibold text-sm">📝</span>
          </div>
          <h5 className="font-semibold text-gray-900">Additional Notes</h5>
        </div>
        <textarea
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          placeholder="Enter any additional notes or special requirements for this item..."
        />
      </div>

      {/* Price Summary */}
      {formData.price > 0 && (
        <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-5 border border-green-200">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <span className="text-green-600 font-semibold text-sm">💵</span>
            </div>
            <h5 className="font-semibold text-gray-900">Price Summary</h5>
          </div>
          {(() => {
            const price = Number.isFinite(formData.price) ? formData.price : 0;
            const discountAmount = getDiscountAmount(formData);
            const commissionAmount = Number.isFinite(formData.commission) ? formData.commission : 0;
            const afterDiscount = price - discountAmount;
            const suggestedNetto = computeSuggestedNetto(formData);

            return (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Base Price per Quantity:</span>
                    <span className="font-medium">{formatPriceWithCurrency(price)}</span>
                  </div>
                  {formData.quantity > 1 && (
                    <p className="text-xs text-gray-400 mt-1">
                      {formatPriceWithCurrency(price)} × {formData.quantity || 1} = {formatPriceWithCurrency(price * (formData.quantity || 1))}
                    </p>
                  )}
                </div>

                {discountAmount > 0 && (
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">
                        Discount ({formData.discountType === 'percentage' ? `${formData.discountValue || 0}%` : 'Flat'}):
                      </span>
                      <span className="text-red-600 font-medium">
                        - {formatPriceWithCurrency(discountAmount)}
                      </span>
                    </div>
                    {formData.discountType === 'percentage' && (
                      <p className="text-xs text-red-500 mt-1">
                        {formatPriceWithCurrency(price)} × {formData.discountValue || 0}% = {formatPriceWithCurrency(discountAmount)}
                      </p>
                    )}
                    {formData.quantity > 1 && (
                      <p className="text-xs text-red-400">
                        {formatPriceWithCurrency(discountAmount)} × {formData.quantity || 1} = {formatPriceWithCurrency(discountAmount * (formData.quantity || 1))}
                      </p>
                    )}
                  </div>
                )}

                {commissionAmount > 0 && (
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Commission:</span>
                      <span className="text-emerald-600 font-medium">
                        - {formatPriceWithCurrency(commissionAmount)}
                      </span>
                    </div>
                    {formData.quantity > 1 && (
                      <p className="text-xs text-emerald-500 mt-1">
                        {formatPriceWithCurrency(commissionAmount)} × {formData.quantity || 1} = {formatPriceWithCurrency(commissionAmount * (formData.quantity || 1))}
                      </p>
                    )}
                  </div>
                )}

                {(discountAmount > 0 || commissionAmount > 0) && (
                  <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                    <span className="text-gray-600">Auto-calculated Netto:</span>
                    <span className="text-blue-600 font-medium">
                      {formatPriceWithCurrency(suggestedNetto)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center border-t-2 border-green-300 pt-2">
                  <span className="font-semibold text-gray-900">Current Netto per Quantity:</span>
                  <span className="text-green-600 font-bold text-lg">
                    {formatPriceWithCurrency(Number.isFinite(formData.netto) ? formData.netto : 0)}
                  </span>
                </div>
                {formData.quantity > 1 && (
                  <p className="text-xs text-green-500">
                    Netto total: {formatPriceWithCurrency((Number.isFinite(formData.netto) ? formData.netto : 0) * (formData.quantity || 1))}
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Drawing Specification Selector Modal */}
      <DrawingSpecificationSelector
        isOpen={showDrawingSelector}
        value={formData.drawingSpecification?._id || formData.drawingSpecification}
        onChange={(drawingSpec) => {
          handleInputChange('drawingSpecification', drawingSpec._id);
          setSelectedDrawingSpec(drawingSpec);
          setShowDrawingSelector(false);
          // Only show toast for manual/bodyType modes (not drawing mode which auto-fills)
          if (formData.templateMode === 'manual' || formData.templateMode === 'bodyType') {
            toast.success('Drawing selected (optional - other fields not changed)');
          }
        }}
        onClose={() => setShowDrawingSelector(false)}
      />
    </div>
  );
};

export default OfferItemForm;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Save, X, Edit3, FileText, ChevronUp, ChevronDown } from 'lucide-react';
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
  // Helper function to normalize order values (0, 1, 2, ...)
  const normalizeOrderValues = (items) => {
    if (!items || items.length === 0) return [];
    // Sort by current order (or index if no order)
    const sorted = [...items].sort((a, b) => {
      const orderA = a.order !== undefined && a.order !== null ? a.order : Number.MAX_SAFE_INTEGER;
      const orderB = b.order !== undefined && b.order !== null ? b.order : Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
    // Re-assign sequential order values
    return sorted.map((item, index) => ({
      ...item,
      order: index
    }));
  };

  // Initialize formData based on lineOfBusinessType
  const getInitialFormData = () => {
    const baseData = {
      quantity: item?.quantity || 1,
      price: item?.price || 0,
      discountType: item?.discountType || 'percentage',
      discountValue: item?.discountValue || 0,
      netto: item?.netto || 0,
      commission: item?.commission || 0,
      notes: item?.notes || ''
    };

    if (lineOfBusinessType === 'karoseri') {
      // Extract ObjectId from drawingSpecification if it's a populated object
      const drawingSpecId = item?.drawingSpecification 
        ? (typeof item.drawingSpecification === 'object' && item.drawingSpecification._id 
          ? item.drawingSpecification._id 
          : item.drawingSpecification)
        : null;
      
      return {
        ...baseData,
        karoseri: item?.karoseri || '',
        chassis: item?.chassis || '',
        chassisModel: item?.chassisModel || '',
        drawingSpecification: drawingSpecId,
        bodyTypeId: item?.bodyTypeId || '',
        chassisTypeId: item?.chassisTypeId || '',
        sizeTypeId: item?.sizeTypeId || '',
        templateMode: item?.templateMode || 'manual',
        templateSourceModel: item?.templateSourceModel || null,
        templateSourceId: item?.templateSourceId || null,
        specifications: (item?.specifications || []).map(spec => ({
          ...spec,
          items: normalizeOrderValues(spec.items || [])
        }))
      };
    } else if (lineOfBusinessType === 'service') {
      return {
        ...baseData,
        serviceName: item?.serviceName || '',
        serviceDetails: item?.serviceDetails || []
      };
    } else if (lineOfBusinessType === 'sparepart') {
      return {
        ...baseData,
        sparepartName: item?.sparepartName || '',
        pricePerUnit: item?.pricePerUnit || 0
      };
    }
    return baseData;
  };

  const [formData, setFormData] = useState(getInitialFormData());

  const [newSpecCategory, setNewSpecCategory] = useState('');
  const [showDrawingSelector, setShowDrawingSelector] = useState(false);
  const [selectedDrawingSpec, setSelectedDrawingSpec] = useState(null);
  
  // Refs for specification input fields to manage focus
  const specInputRefs = useRef({});
  
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
      const response = await axiosInstance.get('/api/body-types/list');
      const list = response?.data?.data || response?.data?.bodyTypes || [];
      setBodyTypes(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Error fetching body types:', error);
      toast.error('Failed to load body types');
      setBodyTypes([]);
    } finally {
      setLoadingBodyTypes(false);
    }
  };

  const fetchChassisTypes = async () => {
    setLoadingChassisTypes(true);
    try {
      const response = await axiosInstance.get('/api/chassis-types/list');
      const list = response?.data?.data || response?.data?.chassisTypes || [];
      setChassisTypes(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Error fetching chassis types:', error);
      toast.error('Failed to load chassis types');
      setChassisTypes([]);
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

  // Update form data when item prop or lineOfBusinessType changes
  useEffect(() => {
    console.log('OfferItemForm: useEffect triggered, item:', item, 'lineOfBusinessType:', lineOfBusinessType);
    const baseData = {
      quantity: item?.quantity || 1,
      price: item?.price || 0,
      discountType: item?.discountType || 'percentage',
      discountValue: item?.discountValue || 0,
      netto: item?.netto || 0,
      commission: item?.commission || 0,
      notes: item?.notes || ''
    };

    let newFormData;
    if (lineOfBusinessType === 'karoseri') {
      // Extract ObjectId from drawingSpecification if it's a populated object
      const drawingSpecId = item?.drawingSpecification 
        ? (typeof item.drawingSpecification === 'object' && item.drawingSpecification._id 
          ? item.drawingSpecification._id 
          : item.drawingSpecification)
        : null;
      
      newFormData = {
        ...baseData,
        karoseri: item?.karoseri || '',
        chassis: item?.chassis || '',
        chassisModel: item?.chassisModel || '',
        drawingSpecification: drawingSpecId,
        bodyTypeId: item?.bodyTypeId?._id || item?.bodyTypeId || '',
        chassisTypeId: item?.chassisTypeId?._id || item?.chassisTypeId || '',
        sizeTypeId: item?.sizeTypeId || '',
        templateMode: item?.templateMode || 'manual',
        templateSourceModel: item?.templateSourceModel || null,
        templateSourceId: item?.templateSourceId?._id || item?.templateSourceId || null,
        specifications: (item?.specifications || []).map(spec => ({
          ...spec,
          items: normalizeOrderValues(spec.items || [])
        }))
      };
      // Set the selected drawing spec if it exists (use the populated object for display)
      if (item?.drawingSpecification) {
        // If it's already a populated object, use it directly
        if (typeof item.drawingSpecification === 'object' && item.drawingSpecification.drawingNumber) {
          setSelectedDrawingSpec(item.drawingSpecification);
        } else {
          // Otherwise, it will be fetched by the useEffect that watches drawingSpecification
          setSelectedDrawingSpec(null);
        }
      } else {
        setSelectedDrawingSpec(null);
      }
    } else if (lineOfBusinessType === 'service') {
      newFormData = {
        ...baseData,
        serviceName: item?.serviceName || '',
        serviceDetails: item?.serviceDetails || []
      };
    } else if (lineOfBusinessType === 'sparepart') {
      newFormData = {
        ...baseData,
        sparepartName: item?.sparepartName || '',
        pricePerUnit: item?.pricePerUnit || 0
      };
    } else {
      newFormData = baseData;
    }
    
    console.log('OfferItemForm: Setting formData to:', newFormData);
    setFormData(newFormData);
  }, [item, lineOfBusinessType]);

  // Fetch drawing specification details when drawingSpecification ID changes
  useEffect(() => {
    const fetchDrawingSpec = async () => {
      if (!formData.drawingSpecification || formData.drawingSpecification === null) {
        setSelectedDrawingSpec(null);
        return;
      }

      // Handle ObjectId string
      if (typeof formData.drawingSpecification === 'string') {
        try {
          const response = await axiosInstance.get(`/api/drawing-specifications/${formData.drawingSpecification}`);
          if (response.data?.success && response.data?.data) {
            setSelectedDrawingSpec(response.data.data);
          } else if (response.data?.data) {
            // Some APIs return data directly without success wrapper
            setSelectedDrawingSpec(response.data.data);
          } else {
            console.warn('Unexpected API response structure:', response.data);
            setSelectedDrawingSpec(null);
          }
        } catch (error) {
          console.error('Error fetching drawing specification:', error);
          setSelectedDrawingSpec(null);
        }
      } 
      // Handle populated object
      else if (typeof formData.drawingSpecification === 'object') {
        // If it has drawingNumber or other drawing properties, it's already populated
        if (formData.drawingSpecification.drawingNumber || formData.drawingSpecification.bodyTypeId) {
          setSelectedDrawingSpec(formData.drawingSpecification);
        } 
        // If it's an object with just _id, extract the ID and fetch
        else if (formData.drawingSpecification._id) {
          try {
            const response = await axiosInstance.get(`/api/drawing-specifications/${formData.drawingSpecification._id}`);
            if (response.data?.success && response.data?.data) {
              setSelectedDrawingSpec(response.data.data);
            } else if (response.data?.data) {
              setSelectedDrawingSpec(response.data.data);
            } else {
              setSelectedDrawingSpec(null);
            }
          } catch (error) {
            console.error('Error fetching drawing specification from object:', error);
            setSelectedDrawingSpec(null);
          }
        } else {
          setSelectedDrawingSpec(null);
        }
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


  const addCategory = (categoryName = null, focusFirstSpec = false) => {
    const categoryToAdd = categoryName || newSpecCategory.trim();
    if (categoryToAdd) {
      console.log('Adding category:', categoryToAdd);
      console.log('Current specifications before adding:', formData.specifications);
      
      setFormData(prev => {
        const newCategoryIndex = prev.specifications.length;
        const newSpecifications = [...prev.specifications, {
          category: categoryToAdd,
          items: [{
            name: '',
            specification: ''
          }]
        }];
        console.log('New specifications after adding:', newSpecifications);
        
        // Focus on the first spec name field of the new category
        if (focusFirstSpec) {
          setTimeout(() => {
            const refKey = `spec-name-${newCategoryIndex}-0`;
            if (specInputRefs.current[refKey]) {
              specInputRefs.current[refKey].focus();
            }
          }, 0);
        }
        
        return {
          ...prev,
          specifications: newSpecifications
        };
      });
      
      if (!categoryName) {
        setNewSpecCategory('');
      }
    } else {
      console.log('Category name is empty, not adding');
    }
  };

  const addItemToCategory = (categoryIndex, focusNewItem = false) => {
    setFormData(prev => {
      const currentItems = prev.specifications[categoryIndex]?.items || [];
      // Normalize existing items first
      const normalizedItems = normalizeOrderValues(currentItems);
      const newOrder = normalizedItems.length;
      
      const newSpecifications = prev.specifications.map((spec, index) => 
        index === categoryIndex ? {
          ...spec,
          items: [...normalizedItems, {
            name: '',
            specification: '',
            order: newOrder
          }]
        } : spec
      );
      
      // Focus on the new spec name field
      if (focusNewItem) {
        setTimeout(() => {
          const refKey = `spec-name-${categoryIndex}-${newOrder}`;
          if (specInputRefs.current[refKey]) {
            specInputRefs.current[refKey].focus();
          }
        }, 0);
      }
      
      return {
        ...prev,
        specifications: newSpecifications
      };
    });
  };

  const removeSpecification = (categoryIndex, itemOrder = null) => {
    if (itemOrder !== null) {
      // Remove specific item from category by order value
      setFormData(prev => {
        const spec = prev.specifications[categoryIndex];
        if (!spec || !spec.items) return prev;
        
        // Filter out the item with matching order, then normalize
        const filteredItems = spec.items.filter(item => {
          const itemOrderValue = item.order !== undefined && item.order !== null ? item.order : -1;
          return itemOrderValue !== itemOrder;
        });
        
        // Normalize order values after removal
        const normalizedItems = normalizeOrderValues(filteredItems);
        
        return {
        ...prev,
          specifications: prev.specifications.map((s, i) => 
          i === categoryIndex ? {
              ...s,
              items: normalizedItems
            } : s
          ).filter(s => s.items.length > 0) // Remove empty categories
        };
      });
    } else {
      // Remove entire category
      setFormData(prev => ({
        ...prev,
        specifications: prev.specifications.filter((_, i) => i !== categoryIndex)
      }));
    }
  };

  const moveSpecificationItemUp = (categoryIndex, itemOrder) => {
    setFormData(prev => {
      const spec = prev.specifications[categoryIndex];
      if (!spec || !spec.items) return prev;
      
      // Normalize and sort items by order
      const normalizedItems = normalizeOrderValues(spec.items);
      
      // Find the item index by order
      const itemIndex = normalizedItems.findIndex(item => item.order === itemOrder);
      if (itemIndex <= 0) return prev; // Can't move first item up
      
      // Swap items
      const temp = normalizedItems[itemIndex];
      normalizedItems[itemIndex] = normalizedItems[itemIndex - 1];
      normalizedItems[itemIndex - 1] = temp;
      
      // Re-normalize order values after swap
      const renormalizedItems = normalizeOrderValues(normalizedItems);
      
      return {
        ...prev,
        specifications: prev.specifications.map((s, i) => 
          i === categoryIndex ? {
            ...s,
            items: renormalizedItems
          } : s
        )
      };
    });
  };

  const moveSpecificationItemDown = (categoryIndex, itemOrder) => {
    setFormData(prev => {
      const spec = prev.specifications[categoryIndex];
      if (!spec || !spec.items) return prev;
      
      // Normalize and sort items by order
      const normalizedItems = normalizeOrderValues(spec.items);
      
      // Find the item index by order
      const itemIndex = normalizedItems.findIndex(item => item.order === itemOrder);
      if (itemIndex < 0 || itemIndex >= normalizedItems.length - 1) return prev; // Can't move last item down
      
      // Swap items
      const temp = normalizedItems[itemIndex];
      normalizedItems[itemIndex] = normalizedItems[itemIndex + 1];
      normalizedItems[itemIndex + 1] = temp;
      
      // Re-normalize order values after swap
      const renormalizedItems = normalizeOrderValues(normalizedItems);
      
      return {
        ...prev,
        specifications: prev.specifications.map((s, i) => 
          i === categoryIndex ? {
            ...s,
            items: renormalizedItems
          } : s
        )
      };
    });
  };

  const handleSave = () => {
    console.log('OfferItemForm handleSave called with formData:', formData);
    console.log('OfferItemForm lineOfBusinessType:', lineOfBusinessType);
    console.log('OfferItemForm onSave function exists:', !!onSave);
    
    // Validate required fields based on line of business type
    if (lineOfBusinessType === 'karoseri') {
      if (!formData.karoseri?.trim()) {
        console.log('Validation failed: karoseri is empty');
        toast.error('Please enter karoseri/body type');
        return;
      }
      if (!formData.chassis?.trim()) {
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
    } else if (lineOfBusinessType === 'service') {
      if (!formData.serviceName?.trim()) {
        console.log('Validation failed: serviceName is empty');
        toast.error('Please enter service name');
        return;
      }
    } else if (lineOfBusinessType === 'sparepart') {
      if (!formData.sparepartName?.trim()) {
        console.log('Validation failed: sparepartName is empty');
        toast.error('Please enter sparepart name');
        return;
      }
      if (!formData.pricePerUnit || formData.pricePerUnit <= 0) {
        console.log('Validation failed: pricePerUnit is invalid');
        toast.error('Please enter a valid price per unit');
        return;
      }
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
    
    // Normalize order values and ObjectId fields before saving
    const normalizedFormData = {
      ...formData,
      // Ensure drawingSpecification is always just the ID, not an object
      drawingSpecification: formData.drawingSpecification 
        ? (typeof formData.drawingSpecification === 'object' && formData.drawingSpecification._id 
          ? formData.drawingSpecification._id 
          : formData.drawingSpecification)
        : null,
      // Ensure bodyTypeId is just the ID
      bodyTypeId: formData.bodyTypeId 
        ? (typeof formData.bodyTypeId === 'object' && formData.bodyTypeId._id 
          ? formData.bodyTypeId._id 
          : formData.bodyTypeId)
        : '',
      // Ensure chassisTypeId is just the ID
      chassisTypeId: formData.chassisTypeId 
        ? (typeof formData.chassisTypeId === 'object' && formData.chassisTypeId._id 
          ? formData.chassisTypeId._id 
          : formData.chassisTypeId)
        : '',
      // Ensure templateSourceId is just the ID
      templateSourceId: formData.templateSourceId 
        ? (typeof formData.templateSourceId === 'object' && formData.templateSourceId._id 
          ? formData.templateSourceId._id 
          : formData.templateSourceId)
        : null,
      specifications: formData.specifications?.map(spec => ({
        ...spec,
        items: normalizeOrderValues(spec.items || [])
      })) || []
    };
    
    console.log('OfferItemForm validation passed, calling onSave with:', normalizedFormData);
    onSave && onSave(normalizedFormData);
    console.log('OfferItemForm onSave call completed');
  };

  const handleCancel = () => {
    // Reset form data to original values based on lineOfBusinessType
    const baseData = {
      quantity: item?.quantity || 1,
      price: item?.price || 0,
      discountType: item?.discountType || 'percentage',
      discountValue: item?.discountValue || 0,
      netto: item?.netto || 0,
      commission: item?.commission || 0,
      notes: item?.notes || ''
    };

    let resetData;
    if (lineOfBusinessType === 'karoseri') {
      resetData = {
        ...baseData,
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
        specifications: (item?.specifications || []).map(spec => ({
          ...spec,
          items: normalizeOrderValues(spec.items || [])
        }))
      };
    } else if (lineOfBusinessType === 'service') {
      resetData = {
        ...baseData,
        serviceName: item?.serviceName || '',
        serviceDetails: item?.serviceDetails || []
      };
    } else if (lineOfBusinessType === 'sparepart') {
      resetData = {
        ...baseData,
        sparepartName: item?.sparepartName || '',
        pricePerUnit: item?.pricePerUnit || 0
      };
    } else {
      resetData = baseData;
    }
    
    setFormData(resetData);
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
              {item ? 'Edit item details' : 
                lineOfBusinessType === 'karoseri' ? 'Enter karoseri and chassis information' :
                lineOfBusinessType === 'service' ? 'Enter service information' :
                lineOfBusinessType === 'sparepart' ? 'Enter sparepart information' :
                'Enter item information'}
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
        {/* Product Information - Conditional based on lineOfBusinessType */}
        {lineOfBusinessType === 'karoseri' && (
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
                      label: bt.shortName ? `${bt.name} (${bt.shortName})` : bt.name
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
                      label: ct.shortName ? `${ct.name} (${ct.shortName})` : ct.name
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
                      label: bt.shortName ? `${bt.name} (${bt.shortName})` : bt.name
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
                      label: ct.shortName ? `${ct.name} (${ct.shortName})` : ct.name
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

            {/* Drawing Mode: Show Drawing selector (using shared DrawingSpecificationSelector) */}
            {formData.templateMode === 'drawing' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Drawing *
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
                          : 'Click to select drawing'}
                      </span>
                    </div>
                  </button>
                  {selectedDrawingSpec && (
                    <button
                      type="button"
                      onClick={() => {
                        handleInputChange('drawingSpecification', null);
                        handleInputChange('templateSourceId', null);
                        handleInputChange('templateSourceModel', null);
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
                  Select an existing drawing to copy all specs, body type, and chassis info.
                </p>
              </div>
            )}

          </div>
        </div>
        )}

        {/* Service Information */}
        {lineOfBusinessType === 'service' && (
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <span className="text-blue-600 font-semibold text-sm">🔧</span>
            </div>
            <h5 className="font-semibold text-gray-900">Service Information</h5>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Name *
              </label>
              <input
                type="text"
                value={formData.serviceName || ''}
                onChange={(e) => handleInputChange('serviceName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter service name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Details
              </label>
              <div className="space-y-2">
                {Array.isArray(formData.serviceDetails) && formData.serviceDetails.map((detail, detailIndex) => (
                  <div key={detailIndex} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={detail || ''}
                      onChange={(e) => {
                        const newDetails = [...formData.serviceDetails];
                        newDetails[detailIndex] = e.target.value;
                        handleInputChange('serviceDetails', newDetails);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={`Service detail ${detailIndex + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newDetails = formData.serviceDetails.filter((_, i) => i !== detailIndex);
                        handleInputChange('serviceDetails', newDetails);
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange('serviceDetails', [...(formData.serviceDetails || []), '']);
                  }}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Service Detail
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Sparepart Information */}
        {lineOfBusinessType === 'sparepart' && (
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <span className="text-blue-600 font-semibold text-sm">⚙️</span>
            </div>
            <h5 className="font-semibold text-gray-900">Sparepart Information</h5>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sparepart Name *
              </label>
              <input
                type="text"
                value={formData.sparepartName || ''}
                onChange={(e) => handleInputChange('sparepartName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter sparepart name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Per Unit *
              </label>
              <PriceInput
                value={formData.pricePerUnit || 0}
                onChange={(value) => handleInputChange('pricePerUnit', value)}
                placeholder="0"
                required
                className="w-full"
              />
            </div>
          </div>
        </div>
        )}

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

      {/* Specifications - Only for karoseri */}
      {lineOfBusinessType === 'karoseri' && (
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
              onClick={() => {
                if (newSpecCategory.trim()) {
                  addCategory(null, true);
                }
              }}
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // If category has no items yet, add first item and focus on its name field
                      if (!spec.items || spec.items.length === 0) {
                        addItemToCategory(categoryIndex, true);
                      } else {
                        // Focus on first spec name field in this category
                        const refKey = `spec-name-${categoryIndex}-0`;
                        if (specInputRefs.current[refKey]) {
                          specInputRefs.current[refKey].focus();
                        }
                      }
                    }
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
                {(() => {
                  // Normalize items first to ensure all have order values
                  const normalizedItems = normalizeOrderValues(spec.items || []);
                  return normalizedItems.map((item, sortedIndex) => {
                    const itemOrder = item.order !== undefined && item.order !== null ? item.order : sortedIndex;
                    const isFirst = sortedIndex === 0;
                    const isLast = sortedIndex === normalizedItems.length - 1;
                    
                    return (
                    <div key={`${categoryIndex}-${itemOrder}`} className="flex items-center gap-2">
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveSpecificationItemUp(categoryIndex, itemOrder)}
                          disabled={isFirst}
                          className={`text-gray-600 hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed p-0.5 ${!isFirst ? 'hover:bg-gray-100 rounded' : ''}`}
                          title="Move up"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSpecificationItemDown(categoryIndex, itemOrder)}
                          disabled={isLast}
                          className={`text-gray-600 hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed p-0.5 ${!isLast ? 'hover:bg-gray-100 rounded' : ''}`}
                          title="Move down"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                    <input
                      ref={(el) => {
                          const refKey = `spec-name-${categoryIndex}-${itemOrder}`;
                        if (el) {
                          specInputRefs.current[refKey] = el;
                        } else {
                          delete specInputRefs.current[refKey];
                        }
                      }}
                      type="text"
                      value={item.name || ''}
                      onChange={(e) => {
                          setFormData(prev => {
                            return {
                          ...prev,
                          specifications: prev.specifications.map((s, i) => 
                            i === categoryIndex ? {
                              ...s,
                                  items: s.items.map((it) => {
                                    const itOrder = it.order !== undefined && it.order !== null ? it.order : -1;
                                    if (itOrder === itemOrder) {
                                      return { ...it, name: e.target.value };
                                    }
                                    return it;
                                  })
                            } : s
                          )
                            };
                          });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          // Move focus to value field
                            const valueRefKey = `spec-value-${categoryIndex}-${itemOrder}`;
                          if (specInputRefs.current[valueRefKey]) {
                            specInputRefs.current[valueRefKey].focus();
                          }
                        }
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Specification name"
                    />
                    <span className="text-gray-500">:</span>
                    <input
                      ref={(el) => {
                          const refKey = `spec-value-${categoryIndex}-${itemOrder}`;
                        if (el) {
                          specInputRefs.current[refKey] = el;
                        } else {
                          delete specInputRefs.current[refKey];
                        }
                      }}
                      type="text"
                      value={item.specification || ''}
                      onChange={(e) => {
                          setFormData(prev => {
                            return {
                          ...prev,
                          specifications: prev.specifications.map((s, i) => 
                            i === categoryIndex ? {
                              ...s,
                                  items: s.items.map((it) => {
                                    const itOrder = it.order !== undefined && it.order !== null ? it.order : -1;
                                    if (itOrder === itemOrder) {
                                      return { ...it, specification: e.target.value };
                                    }
                                    return it;
                                  })
                            } : s
                          )
                            };
                          });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          // Always add new item to current category and focus on its name field
                          addItemToCategory(categoryIndex, true);
                        }
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Specification value"
                    />
                    <button
                      type="button"
                        onClick={() => removeSpecification(categoryIndex, itemOrder)}
                      className="text-red-600 hover:text-red-800"
                        title="Remove specification"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                    );
                  });
                })()}
                
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
      )}

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

      {/* Drawing Specification Selector Modal (shared across modes) */}
      <DrawingSpecificationSelector
        isOpen={showDrawingSelector}
        value={formData.drawingSpecification?._id || formData.drawingSpecification}
        onChange={async (drawingSpec) => {
          // Always fetch full drawing details to ensure we have customSpecifications and master refs
          try {
            const response = await axiosInstance.get(`/api/drawing-specifications/${drawingSpec._id}`);
            const fullDrawing = response.data.data;

            handleInputChange('drawingSpecification', fullDrawing._id);
            setSelectedDrawingSpec(fullDrawing);
            setShowDrawingSelector(false);

            // If in drawing template mode, this is a hard copy-from-drawing:
            // update templateSource*, karoseri, chassis, model, and specs.
            if (formData.templateMode === 'drawing') {
              handleInputChange('templateSourceModel', 'DrawingSpecification');
              handleInputChange('templateSourceId', fullDrawing._id);

              if (fullDrawing.bodyTypeId) {
                handleInputChange('karoseri', fullDrawing.bodyTypeId.name || '');
                handleInputChange('bodyTypeId', fullDrawing.bodyTypeId._id || fullDrawing.bodyTypeId);
              }

              if (fullDrawing.chassisTypeId) {
                handleInputChange('chassisTypeId', fullDrawing.chassisTypeId._id || fullDrawing.chassisTypeId);
                handleInputChange('chassis', fullDrawing.chassisTypeId.name || '');
              }

              if (fullDrawing.chassisModel) {
                handleInputChange('chassisModel', fullDrawing.chassisModel);
              }

              if (fullDrawing.customSpecifications && fullDrawing.customSpecifications.length > 0) {
                handleInputChange('specifications', fullDrawing.customSpecifications);
              } else {
                handleInputChange('specifications', []);
              }

              toast.success('Drawing template loaded with all details!');
            } else {
              // Manual/bodyType modes: keep behavior optional and spec-focused
              if (fullDrawing.customSpecifications && fullDrawing.customSpecifications.length > 0) {
                handleInputChange('specifications', fullDrawing.customSpecifications);
                toast.success('Drawing selected - specifications overridden with drawing specifications');
              } else {
                toast.success('Drawing selected (optional - other fields not changed)');
              }
            }
          } catch (error) {
            console.error('Error fetching drawing details:', error);
            // Fallback to using the drawing spec as-is
            handleInputChange('drawingSpecification', drawingSpec._id);
            setSelectedDrawingSpec(drawingSpec);
            setShowDrawingSelector(false);

            if (formData.templateMode === 'drawing') {
              handleInputChange('templateSourceModel', 'DrawingSpecification');
              handleInputChange('templateSourceId', drawingSpec._id);

              if (drawingSpec.bodyTypeId) {
                const body = drawingSpec.bodyTypeId;
                handleInputChange('karoseri', body.name || '');
                handleInputChange('bodyTypeId', body._id || body);
              }

              if (drawingSpec.chassisTypeId) {
                const chassisType = drawingSpec.chassisTypeId;
                handleInputChange('chassisTypeId', chassisType._id || chassisType);
                handleInputChange('chassis', chassisType.name || '');
              }

              if (drawingSpec.chassisModel) {
                handleInputChange('chassisModel', drawingSpec.chassisModel);
              }

              if (drawingSpec.customSpecifications && drawingSpec.customSpecifications.length > 0) {
                handleInputChange('specifications', drawingSpec.customSpecifications);
              } else {
                handleInputChange('specifications', []);
              }

              toast.success('Drawing template loaded with all details!');
            } else {
              if (drawingSpec.customSpecifications && drawingSpec.customSpecifications.length > 0) {
                handleInputChange('specifications', drawingSpec.customSpecifications);
                toast.success('Drawing selected - specifications overridden with drawing specifications');
              } else {
                toast.success('Drawing selected (optional - other fields not changed)');
              }
            }
          }
        }}
        onClose={() => setShowDrawingSelector(false)}
      />
    </div>
  );
};

export default OfferItemForm;

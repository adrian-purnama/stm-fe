import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, Edit3, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import PriceInput from './PriceInput';
import { formatPriceWithCurrency } from '../utils/priceFormatter';
import DrawingSpecificationSelector from './DrawingSpecificationSelector';
import ApiHelper from '../utils/ApiHelper';

const OfferItemForm = ({ 
  item, 
  index, 
  onDelete, 
  onAdd,
  isEditing = false,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    karoseri: item?.karoseri || '',
    chassis: item?.chassis || '',
    drawingSpecification: item?.drawingSpecification || null,
    specificationMode: item?.specificationMode || 'simple',
    specifications: item?.specifications || [],
    price: item?.price || 0,
    discountType: item?.discountType || 'percentage',
    discountValue: item?.discountValue || 0,
    netto: item?.netto || 0,
    notes: item?.notes || ''
  });

  const [newSpecification, setNewSpecification] = useState('');
  const [newSpecLabel, setNewSpecLabel] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');
  const [editingSpecIndex, setEditingSpecIndex] = useState(-1);
  const [showDrawingSelector, setShowDrawingSelector] = useState(false);
  const [selectedDrawingSpec, setSelectedDrawingSpec] = useState(null);

  // Update form data when item prop changes
  useEffect(() => {
    console.log('OfferItemForm: useEffect triggered, item:', item);
    const newFormData = {
      karoseri: item?.karoseri || '',
      chassis: item?.chassis || '',
      drawingSpecification: item?.drawingSpecification || null,
      specificationMode: item?.specificationMode || 'simple',
      specifications: item?.specifications || [],
      price: item?.price || 0,
      discountType: item?.discountType || 'percentage',
      discountValue: item?.discountValue || 0,
      netto: item?.netto || 0,
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

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateDiscount = () => {
    const { price, discountType, discountValue } = formData;
    if (discountType === 'percentage') {
      return (price * discountValue) / 100;
    } else {
      return discountValue;
    }
  };


  const handleSpecificationKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSpecification();
    }
  };

  const addSpecification = () => {
    if (formData.specificationMode === 'simple') {
      if (newSpecification.trim()) {
        setFormData(prev => ({
          ...prev,
          specifications: [...prev.specifications, newSpecification.trim()]
        }));
        setNewSpecification('');
      }
    } else {
      if (newSpecLabel.trim() && newSpecValue.trim()) {
        setFormData(prev => ({
          ...prev,
          specifications: [...prev.specifications, {
            label: newSpecLabel.trim(),
            value: newSpecValue.trim()
          }]
        }));
        setNewSpecLabel('');
        setNewSpecValue('');
      }
    }
  };

  const editSpecification = (index) => {
    setEditingSpecIndex(index);
    const spec = formData.specifications[index];
    if (typeof spec === 'string') {
      setNewSpecification(spec);
    } else if (spec.category) {
      // Handle category-based specifications - for now, just show a message
      // TODO: Implement category-based editing
      toast.error('Category-based specifications editing not yet implemented');
      setEditingSpecIndex(-1);
    } else {
      setNewSpecLabel(spec.label || '');
      setNewSpecValue(spec.value || '');
    }
  };

  const updateSpecification = () => {
    if (editingSpecIndex >= 0) {
      const currentSpec = formData.specifications[editingSpecIndex];
      if (typeof currentSpec === 'string') {
        if (newSpecification.trim()) {
          setFormData(prev => ({
            ...prev,
            specifications: prev.specifications.map((spec, i) => 
              i === editingSpecIndex ? newSpecification.trim() : spec
            )
          }));
          setNewSpecification('');
          setEditingSpecIndex(-1);
        }
      } else if (currentSpec.category) {
        // Category-based specifications editing not implemented
        toast.error('Category-based specifications editing not yet implemented');
        setEditingSpecIndex(-1);
      } else {
        if (newSpecLabel.trim() && newSpecValue.trim()) {
          setFormData(prev => ({
            ...prev,
            specifications: prev.specifications.map((spec, i) => 
              i === editingSpecIndex ? { label: newSpecLabel.trim(), value: newSpecValue.trim() } : spec
            )
          }));
          setNewSpecLabel('');
          setNewSpecValue('');
          setEditingSpecIndex(-1);
        }
      }
    }
  };

  const cancelEditSpecification = () => {
    setNewSpecification('');
    setNewSpecLabel('');
    setNewSpecValue('');
    setEditingSpecIndex(-1);
  };

  const removeSpecification = (index) => {
    setFormData(prev => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    console.log('OfferItemForm handleSave called with formData:', formData);
    console.log('OfferItemForm onSave function exists:', !!onSave);
    
    // Validate required fields
    if (!formData.karoseri.trim()) {
      console.log('Validation failed: karoseri is empty');
      toast.error('Please enter karoseri');
      return;
    }
    if (!formData.chassis.trim()) {
      console.log('Validation failed: chassis is empty');
      toast.error('Please enter chassis');
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
      drawingSpecification: item?.drawingSpecification || null,
      specificationMode: item?.specificationMode || 'simple',
      specifications: item?.specifications || [],
      price: item?.price || 0,
      discountType: item?.discountType || 'percentage',
      discountValue: item?.discountValue || 0,
      netto: item?.netto || 0,
      notes: item?.notes || ''
    });
    setNewSpecification('');
    setEditingSpecIndex(-1);
    onCancel && onCancel();
  };

  const handleDelete = () => {
    onDelete && onDelete(index);
  };

  const handleAdd = () => {
    onAdd && onAdd();
  };

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
                onClick={handleSave}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Item
              </button>
              <button
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
                onClick={handleAdd}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </button>
              {item && (
                <button
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Karoseri (Body Type) *
              </label>
              <input
                type="text"
                value={formData.karoseri}
                onChange={(e) => handleInputChange('karoseri', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="e.g., Bus, Truck, Van"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chassis *
              </label>
              <input
                type="text"
                value={formData.chassis}
                onChange={(e) => handleInputChange('chassis', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="e.g., Mercedes, Hino, Isuzu"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Drawing Specification
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDrawingSelector(true)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-left bg-white hover:bg-gray-50"
                >
                  {formData.drawingSpecification && formData.drawingSpecification !== null ? (
                    <span className="text-gray-900">
                      {selectedDrawingSpec?.drawingNumber || 'Drawing Selected'}
                    </span>
                  ) : (
                    <span className="text-gray-500">Select or upload drawing specification</span>
                  )}
                </button>
                {formData.drawingSpecification && formData.drawingSpecification !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange('drawingSpecification', null);
                      setSelectedDrawingSpec(null);
                    }}
                    className="px-3 py-3 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Clear selection"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Base Price *
            </label>
            <PriceInput
              value={formData.price}
              onChange={(value) => handleInputChange('price', value)}
              placeholder="Enter base price"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discount Type
            </label>
            <select
              value={formData.discountType}
              onChange={(e) => handleInputChange('discountType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat Amount (Rp)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discount Value
            </label>
            {formData.discountType === 'flat' ? (
              <PriceInput
                value={formData.discountValue}
                onChange={(value) => handleInputChange('discountValue', value)}
                placeholder="Enter amount"
              />
            ) : (
              <div className="relative">
                <input
                  type="number"
                  value={formData.discountValue}
                  onChange={(e) => handleInputChange('discountValue', parseFloat(e.target.value) || 0)}
                  className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter percentage"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Netto Price *
              </label>
              {formData.price > 0 && formData.discountValue > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const calculatedNetto = formData.price - calculateDiscount();
                    handleInputChange('netto', calculatedNetto);
                  }}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                >
                  Use Calculated: {formatPriceWithCurrency(formData.price - calculateDiscount())}
                </button>
              )}
            </div>
            <PriceInput
              value={formData.netto}
              onChange={(value) => handleInputChange('netto', value)}
              placeholder="Enter final netto price"
              required
            />
          </div>

        </div>
      </div>

      {/* Specifications */}
      <div className="mt-8 bg-white rounded-lg p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <span className="text-purple-600 font-semibold text-sm">📋</span>
            </div>
            <h5 className="font-semibold text-gray-900">Technical Specifications</h5>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Mode:</span>
            <select
              value={formData.specificationMode}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, specificationMode: e.target.value }));
                // Clear specifications when switching modes
                setFormData(prev => ({ ...prev, specifications: [] }));
                setNewSpecification('');
                setNewSpecLabel('');
                setNewSpecValue('');
                setEditingSpecIndex(-1);
              }}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="simple">Simple</option>
              <option value="complex">Complex</option>
            </select>
          </div>
        </div>
        
        <div className="mb-4">
          {formData.specificationMode === 'simple' ? (
            <div className="flex gap-3">
              <input
                type="text"
                value={newSpecification}
                onChange={(e) => setNewSpecification(e.target.value)}
                onKeyPress={handleSpecificationKeyPress}
                placeholder="Enter specification and press Enter to add"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
              {editingSpecIndex >= 0 ? (
                <>
                  <button
                    type="button"
                    onClick={updateSpecification}
                    className="flex items-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditSpecification}
                    className="flex items-center px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={addSpecification}
                  className="flex items-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newSpecLabel}
                  onChange={(e) => setNewSpecLabel(e.target.value)}
                  placeholder="Label (e.g., Diameter Gentong)"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                <input
                  type="text"
                  value={newSpecValue}
                  onChange={(e) => setNewSpecValue(e.target.value)}
                  placeholder="Value (e.g., Luar Ø 2300 mm)"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                {editingSpecIndex >= 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={updateSpecification}
                      className="flex items-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditSpecification}
                      className="flex items-center px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={addSpecification}
                    className="flex items-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {formData.specifications.map((spec, specIndex) => (
            <div key={specIndex} className="p-3 bg-gray-50 rounded-md">
              {typeof spec === 'string' ? (
                <div className="flex items-center gap-3">
                  <span className="flex-1 text-gray-900">{spec}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => editSpecification(specIndex)}
                      className="px-2 py-1 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSpecification(specIndex)}
                      className="px-2 py-1 text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : spec.category ? (
                // New category-based structure
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-800 text-sm">{spec.category}</h4>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => editSpecification(specIndex)}
                        className="px-2 py-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSpecification(specIndex)}
                        className="px-2 py-1 text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {spec.items && spec.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-start space-x-2">
                        <span className="font-medium text-gray-600 text-xs min-w-0 flex-shrink-0">
                          {item.name}:
                        </span>
                        <span className="text-gray-800 text-xs break-words">
                          {item.specification}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Legacy label-value structure
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{spec.label}</span>
                    <span className="text-gray-600 ml-2">: {spec.value}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => editSpecification(specIndex)}
                      className="px-2 py-1 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSpecification(specIndex)}
                      className="px-2 py-1 text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {formData.specifications.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">
              No specifications added yet. {formData.specificationMode === 'simple' 
                ? 'Type above and press Enter to add.' 
                : 'Fill in label and value above and click + to add.'}
            </p>
          )}
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
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Base Price:</span>
              <span className="font-medium">{formatPriceWithCurrency(formData.price)}</span>
            </div>
            {formData.discountValue > 0 && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Discount ({formData.discountType === 'percentage' ? `${formData.discountValue}%` : 'Flat'}):</span>
                  <span className="text-red-600 font-medium">- {formatPriceWithCurrency(calculateDiscount())}</span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                  <span className="text-gray-600">After Discount:</span>
                  <span className="text-green-600 font-medium">{formatPriceWithCurrency(formData.price - calculateDiscount())}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center border-t-2 border-green-300 pt-2">
              <span className="font-semibold text-gray-900">Final Price:</span>
              <span className="text-green-600 font-bold text-lg">{formatPriceWithCurrency(formData.price - calculateDiscount())}</span>
            </div>
          </div>
        </div>
      )}

      {/* Drawing Specification Selector Modal */}
      <DrawingSpecificationSelector
        isOpen={showDrawingSelector}
        value={formData.drawingSpecification}
        onChange={(drawingSpec) => {
          handleInputChange('drawingSpecification', drawingSpec._id);
          setSelectedDrawingSpec(drawingSpec);
          setShowDrawingSelector(false);
        }}
        onClose={() => setShowDrawingSelector(false)}
      />
    </div>
  );
};

export default OfferItemForm;

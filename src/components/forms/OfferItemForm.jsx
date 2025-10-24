import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, Edit3, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import PriceInput from '../common/PriceInput';
import { formatPriceWithCurrency } from '../../utils/helpers/priceFormatter';
import DrawingSpecificationSelector from '../drawings/DrawingSpecificationSelector';
import axiosInstance from '../../utils/api/ApiHelper';

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
    specifications: item?.specifications || [],
    price: item?.price || 0,
    discountType: item?.discountType || 'percentage',
    discountValue: item?.discountValue || 0,
    netto: item?.netto || 0,
    notes: item?.notes || ''
  });

  const [newSpecLabel, setNewSpecLabel] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');
  const [newSpecCategory, setNewSpecCategory] = useState('');
  const [editingCategoryIndex, setEditingCategoryIndex] = useState(-1);
  const [editingItemIndex, setEditingItemIndex] = useState(-1);
  const [addingToCategory, setAddingToCategory] = useState(-1);
  const [showDrawingSelector, setShowDrawingSelector] = useState(false);
  const [selectedDrawingSpec, setSelectedDrawingSpec] = useState(null);

  // Update form data when item prop changes
  useEffect(() => {
    console.log('OfferItemForm: useEffect triggered, item:', item);
    const newFormData = {
      karoseri: item?.karoseri || '',
      chassis: item?.chassis || '',
      drawingSpecification: item?.drawingSpecification || null,
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
    if (newSpecLabel.trim() && newSpecValue.trim()) {
      console.log('Adding item to category:', categoryIndex);
      console.log('Item name:', newSpecLabel.trim());
      console.log('Item value:', newSpecValue.trim());
      console.log('Current specifications before adding item:', formData.specifications);
      
      setFormData(prev => {
        const newSpecifications = prev.specifications.map((spec, index) => 
          index === categoryIndex ? {
            ...spec,
            items: [...spec.items, {
              name: newSpecLabel.trim(),
              specification: newSpecValue.trim()
            }]
          } : spec
        );
        console.log('New specifications after adding item:', newSpecifications);
        return {
          ...prev,
          specifications: newSpecifications
        };
      });
      setNewSpecLabel('');
      setNewSpecValue('');
      setAddingToCategory(-1);
    } else {
      console.log('Item name or value is empty, not adding');
    }
  };

  const startAddingToCategory = (categoryIndex) => {
    setAddingToCategory(categoryIndex);
    setNewSpecLabel('');
    setNewSpecValue('');
  };

  const cancelAddingToCategory = () => {
    setAddingToCategory(-1);
    setNewSpecLabel('');
    setNewSpecValue('');
  };

  const editSpecification = (categoryIndex, itemIndex) => {
    setEditingCategoryIndex(categoryIndex);
    setEditingItemIndex(itemIndex);
    const spec = formData.specifications[categoryIndex];
    if (spec && spec.items && spec.items[itemIndex]) {
      const item = spec.items[itemIndex];
      setNewSpecCategory(spec.category || '');
      setNewSpecLabel(item.name || '');
      setNewSpecValue(item.specification || '');
    }
  };

  const updateSpecification = () => {
    if (editingCategoryIndex >= 0 && editingItemIndex >= 0) {
      if (newSpecCategory.trim() && newSpecLabel.trim() && newSpecValue.trim()) {
        setFormData(prev => ({
          ...prev,
          specifications: prev.specifications.map((spec, i) => 
            i === editingCategoryIndex ? {
              ...spec,
              items: spec.items.map((item, j) => 
                j === editingItemIndex ? {
                  name: newSpecLabel.trim(),
                  specification: newSpecValue.trim()
                } : item
              )
            } : spec
          )
        }));
        setNewSpecCategory('');
        setNewSpecLabel('');
        setNewSpecValue('');
        setEditingCategoryIndex(-1);
        setEditingItemIndex(-1);
      }
    }
  };

  const cancelEditSpecification = () => {
    setNewSpecLabel('');
    setNewSpecValue('');
    setNewSpecCategory('');
    setEditingCategoryIndex(-1);
    setEditingItemIndex(-1);
    setAddingToCategory(-1);
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
      specifications: item?.specifications || [],
      price: item?.price || 0,
      discountType: item?.discountType || 'percentage',
      discountValue: item?.discountValue || 0,
      netto: item?.netto || 0,
      notes: item?.notes || ''
    });
    setNewSpecLabel('');
    setNewSpecValue('');
    setNewSpecCategory('');
    setEditingCategoryIndex(-1);
    setEditingItemIndex(-1);
    setAddingToCategory(-1);
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
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
            <span className="text-purple-600 font-semibold text-sm">📋</span>
          </div>
          <h5 className="font-semibold text-gray-900">Technical Specifications</h5>
        </div>
        
        {/* Add New Category */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h6 className="font-medium text-blue-900 mb-3">Add New Category</h6>
          <div className="flex gap-3">
            <input
              type="text"
              value={newSpecCategory}
              onChange={(e) => setNewSpecCategory(e.target.value)}
              placeholder="Category Name (e.g., Engine, Body, Chassis)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
            <button
              type="button"
              onClick={addCategory}
              className="flex items-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {formData.specifications.map((spec, categoryIndex) => (
            <div key={categoryIndex} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-800 text-lg">{spec.category}</h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startAddingToCategory(categoryIndex)}
                    className="px-3 py-1 text-green-600 hover:text-green-800 text-sm bg-green-50 hover:bg-green-100 rounded-md transition-colors"
                  >
                    + Add Item
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSpecification(categoryIndex)}
                    className="px-3 py-1 text-red-600 hover:text-red-800 text-sm bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                  >
                    Delete Category
                  </button>
                </div>
              </div>
              
              {/* Add Item to Category Form */}
              {addingToCategory === categoryIndex && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <h6 className="font-medium text-green-900 mb-2">Add Item to {spec.category}</h6>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newSpecLabel}
                      onChange={(e) => setNewSpecLabel(e.target.value)}
                      placeholder="Specification Name (e.g., Engine Type)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      type="text"
                      value={newSpecValue}
                      onChange={(e) => setNewSpecValue(e.target.value)}
                      placeholder="Specification Value (e.g., 4 Cylinder Diesel)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      type="button"
                      onClick={() => addItemToCategory(categoryIndex)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={cancelAddingToCategory}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Edit Item Form */}
              {editingCategoryIndex === categoryIndex && editingItemIndex >= 0 && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h6 className="font-medium text-blue-900 mb-2">Edit Item</h6>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newSpecLabel}
                      onChange={(e) => setNewSpecLabel(e.target.value)}
                      placeholder="Specification Name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={newSpecValue}
                      onChange={(e) => setNewSpecValue(e.target.value)}
                      placeholder="Specification Value"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={updateSpecification}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditSpecification}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {spec.items && spec.items.length > 0 ? (
                  spec.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center justify-between p-2 bg-white rounded-md border border-gray-100">
                      <div className="flex-1">
                        <span className="font-medium text-gray-700">{item.name}:</span>
                        <span className="text-gray-600 ml-2">{item.specification}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => editSpecification(categoryIndex, itemIndex)}
                          className="px-2 py-1 text-blue-600 hover:text-blue-800 text-sm bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSpecification(categoryIndex, itemIndex)}
                          className="px-2 py-1 text-red-600 hover:text-red-800 text-sm bg-red-50 hover:bg-red-100 rounded transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4 bg-white rounded-md border-2 border-dashed border-gray-200">
                    No items in this category yet. Click "+ Add Item" to add specifications.
                  </p>
                )}
              </div>
            </div>
          ))}
          {formData.specifications.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              No categories added yet. Add a category above to get started.
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

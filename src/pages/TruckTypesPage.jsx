import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Loader2,
  Truck,
  ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import ApiHelper from '../utils/api/ApiHelper';
import BaseModal from '../components/modals/BaseModal';
import CustomDropdown from '../components/common/CustomDropdown';
import Navigation from '../components/common/Navigation';

const TruckTypesPage = () => {
  const navigate = useNavigate();
  
  // State for truck types
  const [truckTypes, setTruckTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // State for filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // State for modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  
  // State for form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Commercial',
    defaultSpecifications: []
  });
  
  // State for selected truck type
  const [selectedTruckType, setSelectedTruckType] = useState(null);

  // Helper functions for managing specifications
  const addSpecificationCategory = () => {
    setFormData({
      ...formData,
      defaultSpecifications: [
        ...(formData.defaultSpecifications || []),
        { category: '', items: [] }
      ]
    });
  };

  const removeSpecificationCategory = (index) => {
    setFormData({
      ...formData,
      defaultSpecifications: (formData.defaultSpecifications || []).filter((_, i) => i !== index)
    });
  };

  const updateSpecificationCategory = (index, field, value) => {
    const updated = [...(formData.defaultSpecifications || [])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, defaultSpecifications: updated });
  };

  const addSpecificationItem = (categoryIndex) => {
    const updated = [...(formData.defaultSpecifications || [])];
    updated[categoryIndex].items = [
      ...(updated[categoryIndex].items || []),
      { name: '', specification: '' }
    ];
    setFormData({ ...formData, defaultSpecifications: updated });
  };

  const removeSpecificationItem = (categoryIndex, itemIndex) => {
    const updated = [...(formData.defaultSpecifications || [])];
    updated[categoryIndex].items = (updated[categoryIndex].items || []).filter((_, i) => i !== itemIndex);
    setFormData({ ...formData, defaultSpecifications: updated });
  };

  const updateSpecificationItem = (categoryIndex, itemIndex, field, value) => {
    const updated = [...(formData.defaultSpecifications || [])];
    if (updated[categoryIndex] && updated[categoryIndex].items && updated[categoryIndex].items[itemIndex]) {
      updated[categoryIndex].items[itemIndex] = {
        ...updated[categoryIndex].items[itemIndex],
        [field]: value
      };
      setFormData({ ...formData, defaultSpecifications: updated });
    }
  };

  // Load truck types
  const loadTruckTypes = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.category = selectedCategory;
      
      const response = await ApiHelper.get('/api/truck-types', { params });
      setTruckTypes(response.data.data);
    } catch (error) {
      console.error('Error loading truck types:', error);
      toast.error('Failed to load truck types');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory]);

  // Create truck type
  const createTruckType = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error('Truck type name is required');
        return;
      }
      
      await ApiHelper.post('/api/truck-types', formData);
      toast.success('Truck type created successfully');
      setShowCreateModal(false);
      setFormData({ name: '', description: '', category: 'Commercial', defaultSpecifications: [] });
      loadTruckTypes();
    } catch (error) {
      console.error('Error creating truck type:', error);
      toast.error(error.response?.data?.message || 'Failed to create truck type');
    }
  };

  // Update truck type
  const updateTruckType = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error('Truck type name is required');
        return;
      }
      
      await ApiHelper.put(`/api/truck-types/${selectedTruckType._id}`, formData);
      toast.success('Truck type updated successfully');
      setShowEditModal(false);
      setSelectedTruckType(null);
      setFormData({ name: '', description: '', category: 'Commercial', defaultSpecifications: [] });
      loadTruckTypes();
    } catch (error) {
      console.error('Error updating truck type:', error);
      toast.error(error.response?.data?.message || 'Failed to update truck type');
    }
  };

  // Delete truck type
  const deleteTruckType = async (truckType) => {
    if (!window.confirm(`Are you sure you want to delete "${truckType.name}"?`)) {
      return;
    }
    
    try {
      await ApiHelper.delete(`/api/truck-types/${truckType._id}`);
      toast.success('Truck type deleted successfully');
      loadTruckTypes();
    } catch (error) {
      console.error('Error deleting truck type:', error);
      toast.error(error.response?.data?.message || 'Failed to delete truck type');
    }
  };

  // Handle edit
  const handleEdit = (truckType) => {
    setSelectedTruckType(truckType);
    setFormData({
      name: truckType.name,
      description: truckType.description || '',
      category: truckType.category,
      defaultSpecifications: Array.isArray(truckType.defaultSpecifications) ? truckType.defaultSpecifications : []
    });
    setShowEditModal(true);
  };

  // Handle view
  const handleView = (truckType) => {
    setSelectedTruckType(truckType);
    setShowViewModal(true);
  };

  // Load data on component mount
  useEffect(() => {
    loadTruckTypes();
  }, [loadTruckTypes]);

  // Category options
  const categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: 'Commercial', label: 'Commercial' },
    { value: 'Construction', label: 'Construction' },
    { value: 'Transportation', label: 'Transportation' },
    { value: 'Specialized', label: 'Specialized' },
    { value: 'Other', label: 'Other' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation title="Truck Types Management" subtitle="Manage truck types and their categories" />
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <button
              onClick={() => navigate('/')}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Truck Types Management</h1>
              <p className="text-gray-600">Manage truck types and their categories</p>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search truck types..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="min-w-48">
              <CustomDropdown
                options={categoryOptions}
                value={selectedCategory}
                onChange={setSelectedCategory}
                placeholder="All Categories"
              />
            </div>

            {/* Action Button */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Truck Type
              </button>
            </div>
          </div>
        </div>

        {/* Truck Types List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Truck Types</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500">Loading truck types...</p>
            </div>
          ) : truckTypes.length === 0 ? (
            <div className="p-8 text-center">
              <Truck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">No truck types found</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Truck Type
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {truckTypes.map((truckType) => (
                <div key={truckType._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {truckType.name}
                        </h3>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {truckType.category}
                        </span>
                      </div>
                      {truckType.description && (
                        <p className="text-sm text-gray-600">
                          {truckType.description}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        Created by {truckType.createdBy?.fullName || 'Unknown'} • 
                        {new Date(truckType.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleView(truckType)}
                        className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                      <button
                        onClick={() => handleEdit(truckType)}
                        className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTruckType(truckType)}
                        className="inline-flex items-center px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Modal */}
        <BaseModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setFormData({ name: '', description: '', category: 'Commercial' });
          }}
          title="Create New Truck Type"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Dump Truck"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Brief description of this truck type"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <CustomDropdown
                options={[
                  { value: 'Commercial', label: 'Commercial' },
                  { value: 'Construction', label: 'Construction' },
                  { value: 'Transportation', label: 'Transportation' },
                  { value: 'Specialized', label: 'Specialized' },
                  { value: 'Other', label: 'Other' }
                ]}
                value={formData.category}
                onChange={(value) => setFormData({ ...formData, category: value })}
                placeholder="Select category"
              />
            </div>

            {/* Default Specifications Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Default Specifications
                </label>
                <button
                  type="button"
                  onClick={addSpecificationCategory}
                  className="inline-flex items-center px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Category
                </button>
              </div>
              
              {formData.defaultSpecifications && formData.defaultSpecifications.length > 0 && formData.defaultSpecifications.map((spec, categoryIndex) => (
                <div key={categoryIndex} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <input
                      type="text"
                      value={spec.category || ''}
                      onChange={(e) => updateSpecificationCategory(categoryIndex, 'category', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mr-3"
                      placeholder="Category name (e.g., Engine, Dimensions)"
                    />
                    <button
                      type="button"
                      onClick={() => removeSpecificationCategory(categoryIndex)}
                      className="inline-flex items-center px-2 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {spec.items && spec.items.length > 0 && spec.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.name || ''}
                          onChange={(e) => updateSpecificationItem(categoryIndex, itemIndex, 'name', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Item name (e.g., Engine Type)"
                        />
                        <input
                          type="text"
                          value={item.specification || ''}
                          onChange={(e) => updateSpecificationItem(categoryIndex, itemIndex, 'specification', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Specification (e.g., Diesel V8)"
                        />
                        <button
                          type="button"
                          onClick={() => removeSpecificationItem(categoryIndex, itemIndex)}
                          className="inline-flex items-center px-2 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={() => addSpecificationItem(categoryIndex)}
                      className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setFormData({ name: '', description: '', category: 'Commercial', defaultSpecifications: [] });
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={createTruckType}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create
            </button>
          </div>
        </BaseModal>

        {/* Edit Modal */}
        <BaseModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTruckType(null);
            setFormData({ name: '', description: '', category: 'Commercial' });
          }}
          title="Edit Truck Type"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Dump Truck"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Brief description of this truck type"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <CustomDropdown
                options={[
                  { value: 'Commercial', label: 'Commercial' },
                  { value: 'Construction', label: 'Construction' },
                  { value: 'Transportation', label: 'Transportation' },
                  { value: 'Specialized', label: 'Specialized' },
                  { value: 'Other', label: 'Other' }
                ]}
                value={formData.category}
                onChange={(value) => setFormData({ ...formData, category: value })}
                placeholder="Select category"
              />
            </div>

            {/* Default Specifications Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Default Specifications
                </label>
                <button
                  type="button"
                  onClick={addSpecificationCategory}
                  className="inline-flex items-center px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Category
                </button>
              </div>
              
              {formData.defaultSpecifications && formData.defaultSpecifications.length > 0 && formData.defaultSpecifications.map((spec, categoryIndex) => (
                <div key={categoryIndex} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <input
                      type="text"
                      value={spec.category || ''}
                      onChange={(e) => updateSpecificationCategory(categoryIndex, 'category', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mr-3"
                      placeholder="Category name (e.g., Engine, Dimensions)"
                    />
                    <button
                      type="button"
                      onClick={() => removeSpecificationCategory(categoryIndex)}
                      className="inline-flex items-center px-2 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {spec.items && spec.items.length > 0 && spec.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.name || ''}
                          onChange={(e) => updateSpecificationItem(categoryIndex, itemIndex, 'name', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Item name (e.g., Engine Type)"
                        />
                        <input
                          type="text"
                          value={item.specification || ''}
                          onChange={(e) => updateSpecificationItem(categoryIndex, itemIndex, 'specification', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Specification (e.g., Diesel V8)"
                        />
                        <button
                          type="button"
                          onClick={() => removeSpecificationItem(categoryIndex, itemIndex)}
                          className="inline-flex items-center px-2 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={() => addSpecificationItem(categoryIndex)}
                      className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => {
                setShowEditModal(false);
                setSelectedTruckType(null);
                setFormData({ name: '', description: '', category: 'Commercial', defaultSpecifications: [] });
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={updateTruckType}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Update
            </button>
          </div>
        </BaseModal>

        {/* View Modal */}
        <BaseModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedTruckType(null);
          }}
          title="Truck Type Details"
        >
          {selectedTruckType && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <p className="text-lg font-semibold text-gray-900">{selectedTruckType.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {selectedTruckType.category}
                </span>
              </div>
              
              {selectedTruckType.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <p className="text-gray-900">{selectedTruckType.description}</p>
                </div>
              )}

              {/* Default Specifications Display */}
              {selectedTruckType.defaultSpecifications && selectedTruckType.defaultSpecifications.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Default Specifications
                  </label>
                  <div className="space-y-4">
                    {selectedTruckType.defaultSpecifications.map((spec, categoryIndex) => (
                      <div key={categoryIndex} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3">{spec.category}</h4>
                        <div className="space-y-2">
                          {spec.items && spec.items.length > 0 && spec.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="flex justify-between items-center py-1">
                              <span className="text-sm text-gray-700 font-medium">{item.name}:</span>
                              <span className="text-sm text-gray-600">{item.specification}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Created By
                  </label>
                  <p className="text-gray-900">{selectedTruckType.createdBy?.fullName || 'Unknown'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Created Date
                  </label>
                  <p className="text-gray-900">{new Date(selectedTruckType.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => {
                setShowViewModal(false);
                setSelectedTruckType(null);
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </BaseModal>
      </div>
    </div>
  );
};

export default TruckTypesPage;


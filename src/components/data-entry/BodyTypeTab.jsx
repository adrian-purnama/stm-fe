import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Loader2, Truck, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import ApiHelper from '../../utils/api/ApiHelper';
import BaseModal from '../modals/BaseModal';

const BodyTypeTab = () => {
  // State for body types
  const [bodyTypes, setBodyTypes] = useState([]);
  const [bodyTypesLoading, setBodyTypesLoading] = useState(false);
  const [bodyTypesSearchTerm, setBodyTypesSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [reloadKey, setReloadKey] = useState(0);
  const [showBodyTypeModal, setShowBodyTypeModal] = useState(false);
  const [showBodyTypeEditModal, setShowBodyTypeEditModal] = useState(false);
  const [showBodyTypeViewModal, setShowBodyTypeViewModal] = useState(false);
  const [selectedBodyType, setSelectedBodyType] = useState(null);
  const [bodyTypeFormData, setBodyTypeFormData] = useState({
    name: '',
    shortName: '',
    description: '',
    defaultSpecifications: []
  });

  // Load body types
  const loadBodyTypes = useCallback(async () => {
    try {
      setBodyTypesLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (bodyTypesSearchTerm) {
        params.search = bodyTypesSearchTerm.trim();
      }

      const response = await ApiHelper.get('/api/body-types', { params });
      const payload = response.data || {};
      const items = payload.data || [];
      const paginationInfo = payload.pagination || {};

      setBodyTypes(items);
      setPagination((prev) => {
        const next = {
          page: paginationInfo.page || prev.page,
          limit: paginationInfo.limit || prev.limit,
          total: paginationInfo.total ?? prev.total,
          pages:
            paginationInfo.pages ||
            Math.ceil((paginationInfo.total ?? prev.total) / (paginationInfo.limit || prev.limit) || 1)
        };

        if (
          next.page === prev.page &&
          next.limit === prev.limit &&
          next.total === prev.total &&
          next.pages === prev.pages
        ) {
          return prev;
        }
        return next;
      });
    } catch (error) {
      console.error('Error loading body types:', error);
      toast.error(error.response?.data?.message || 'Failed to load body types');
    } finally {
      setBodyTypesLoading(false);
    }
  }, [bodyTypesSearchTerm, pagination.page, pagination.limit, reloadKey]);

  // Load data on mount
  useEffect(() => {
    loadBodyTypes();
  }, [loadBodyTypes]);

  // Body Type handlers
  const createBodyType = async () => {
    try {
      if (!bodyTypeFormData.name.trim()) {
        toast.error('Body type name is required');
        return;
      }
      
      if (!bodyTypeFormData.shortName.trim()) {
        toast.error('Body type short name is required');
        return;
      }
      
      await ApiHelper.post('/api/body-types', bodyTypeFormData);
      toast.success('Body type created successfully');
      setShowBodyTypeModal(false);
      setBodyTypeFormData({ name: '', shortName: '', description: '', defaultSpecifications: [] });
      setPagination((prev) => ({ ...prev, page: 1 }));
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      console.error('Error creating body type:', error);
      toast.error(error.response?.data?.message || 'Failed to create body type');
    }
  };

  const updateBodyType = async () => {
    try {
      if (!bodyTypeFormData.name.trim()) {
        toast.error('Body type name is required');
        return;
      }
      
      if (!bodyTypeFormData.shortName.trim()) {
        toast.error('Body type short name is required');
        return;
      }
      
      await ApiHelper.put(`/api/body-types/${selectedBodyType._id}`, bodyTypeFormData);
      toast.success('Body type updated successfully');
      setShowBodyTypeEditModal(false);
      setSelectedBodyType(null);
      setBodyTypeFormData({ name: '', shortName: '', description: '', defaultSpecifications: [] });
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      console.error('Error updating body type:', error);
      toast.error(error.response?.data?.message || 'Failed to update body type');
    }
  };

  const deleteBodyType = async (bodyType) => {
    if (!window.confirm(`Are you sure you want to delete "${bodyType.name}"?`)) {
      return;
    }
    
    try {
      await ApiHelper.delete(`/api/body-types/${bodyType._id}`);
      toast.success('Body type deleted successfully');
      setPagination((prev) => {
        const nextTotal = Math.max(prev.total - 1, 0);
        const nextPages = Math.max(Math.ceil(nextTotal / prev.limit) || 1, 1);
        const nextPage = prev.page > nextPages ? nextPages : prev.page;
        return { ...prev, page: nextPage };
      });
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      console.error('Error deleting body type:', error);
      toast.error(error.response?.data?.message || 'Failed to delete body type');
    }
  };

  const handleBodyTypeEdit = (bodyType) => {
    setSelectedBodyType(bodyType);
    setBodyTypeFormData({
      name: bodyType.name,
      shortName: bodyType.shortName || '',
      description: bodyType.description || '',
      defaultSpecifications: Array.isArray(bodyType.defaultSpecifications) ? bodyType.defaultSpecifications : []
    });
    setShowBodyTypeEditModal(true);
  };

  // Specification management for body types
  const addSpecificationCategory = () => {
    setBodyTypeFormData({
      ...bodyTypeFormData,
      defaultSpecifications: [
        ...(bodyTypeFormData.defaultSpecifications || []),
        { category: '', items: [] }
      ]
    });
  };

  const removeSpecificationCategory = (index) => {
    setBodyTypeFormData({
      ...bodyTypeFormData,
      defaultSpecifications: (bodyTypeFormData.defaultSpecifications || []).filter((_, i) => i !== index)
    });
  };

  const updateSpecificationCategory = (index, field, value) => {
    const updated = [...(bodyTypeFormData.defaultSpecifications || [])];
    updated[index] = { ...updated[index], [field]: value };
    setBodyTypeFormData({ ...bodyTypeFormData, defaultSpecifications: updated });
  };

  const addSpecificationItem = (categoryIndex) => {
    const updated = [...(bodyTypeFormData.defaultSpecifications || [])];
    updated[categoryIndex].items = [...(updated[categoryIndex].items || []), { name: '', specification: '' }];
    setBodyTypeFormData({ ...bodyTypeFormData, defaultSpecifications: updated });
  };

  const removeSpecificationItem = (categoryIndex, itemIndex) => {
    const updated = [...(bodyTypeFormData.defaultSpecifications || [])];
    updated[categoryIndex].items = updated[categoryIndex].items.filter((_, i) => i !== itemIndex);
    setBodyTypeFormData({ ...bodyTypeFormData, defaultSpecifications: updated });
  };

  const updateSpecificationItem = (categoryIndex, itemIndex, field, value) => {
    const updated = [...(bodyTypeFormData.defaultSpecifications || [])];
    updated[categoryIndex].items[itemIndex] = { ...updated[categoryIndex].items[itemIndex], [field]: value };
    setBodyTypeFormData({ ...bodyTypeFormData, defaultSpecifications: updated });
  };

  const handlePaginationChange = (direction) => {
    setPagination((prev) => {
      const nextPage = direction === 'next' ? prev.page + 1 : prev.page - 1;
      if (nextPage < 1 || (prev.pages && nextPage > prev.pages)) {
        return prev;
      }
      if (nextPage === prev.page) {
        return prev;
      }
      return { ...prev, page: nextPage };
    });
  };

  return (
    <div className="p-6">
      {/* Body Types Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Body Types
            </h2>
            <p className="text-sm text-gray-600 mt-1">Manage body types and their specifications</p>
          </div>
          <button
            onClick={() => setShowBodyTypeModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Body Type
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search body types..."
              value={bodyTypesSearchTerm}
              onChange={(e) => {
                setBodyTypesSearchTerm(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Body Types List */}
        <div className="bg-white rounded-lg border border-gray-200">
          {bodyTypesLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500">Loading body types...</p>
            </div>
          ) : bodyTypes.length === 0 ? (
            <div className="p-8 text-center">
              <Truck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">No body types found</p>
              <button
                onClick={() => setShowBodyTypeModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Body Type
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {bodyTypes.map((bodyType) => (
                <div key={bodyType._id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">{bodyType.name}</h3>
                        {bodyType.shortName && (
                          <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                            {bodyType.shortName}
                          </span>
                        )}
                      </div>
                      {bodyType.description && (
                        <p className="text-sm text-gray-600 mt-1">{bodyType.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedBodyType(bodyType);
                          setShowBodyTypeViewModal(true);
                        }}
                        className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                      <button
                        onClick={() => handleBodyTypeEdit(bodyType)}
                        className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => deleteBodyType(bodyType)}
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
      </div>

      {bodyTypes.length > 0 && pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>
            Page {pagination.page} of {pagination.pages} · {pagination.total} items
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePaginationChange('prev')}
              disabled={pagination.page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1 border border-gray-200 rounded-lg text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <button
              onClick={() => handlePaginationChange('next')}
              disabled={pagination.page >= pagination.pages}
              className="inline-flex items-center gap-1 px-3 py-1 border border-gray-200 rounded-lg text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Body Type Create Modal */}
      <BaseModal
        isOpen={showBodyTypeModal}
        onClose={() => {
          setShowBodyTypeModal(false);
          setBodyTypeFormData({ name: '', shortName: '', description: '', defaultSpecifications: [] });
        }}
        title="Create New Body Type"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={bodyTypeFormData.name}
              onChange={(e) => setBodyTypeFormData({ ...bodyTypeFormData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Dump Truck"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Short Name * <span className="text-xs text-gray-500">(Product ID, max 20 characters)</span>
            </label>
            <input
              type="text"
              value={bodyTypeFormData.shortName}
              onChange={(e) => setBodyTypeFormData({ ...bodyTypeFormData, shortName: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
              placeholder="e.g., DT"
              maxLength={20}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={bodyTypeFormData.description}
              onChange={(e) => setBodyTypeFormData({ ...bodyTypeFormData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
              placeholder="Enter description..."
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Default Specifications
              </label>
              <button
                type="button"
                onClick={addSpecificationCategory}
                className="text-sm px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Plus className="h-4 w-4 inline mr-1" />
                Add Category
              </button>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {bodyTypeFormData.defaultSpecifications.map((spec, specIndex) => (
                <div key={specIndex} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <input
                      type="text"
                      value={spec.category || ''}
                      onChange={(e) => updateSpecificationCategory(specIndex, 'category', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm mr-2"
                      placeholder="Category name"
                    />
                    <button
                      type="button"
                      onClick={() => removeSpecificationCategory(specIndex)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-2 ml-4">
                    {spec.items && spec.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.name || ''}
                          onChange={(e) => updateSpecificationItem(specIndex, itemIndex, 'name', e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Name"
                        />
                        <span className="text-gray-500">:</span>
                        <input
                          type="text"
                          value={item.specification || ''}
                          onChange={(e) => updateSpecificationItem(specIndex, itemIndex, 'specification', e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Specification"
                        />
                        <button
                          type="button"
                          onClick={() => removeSpecificationItem(specIndex, itemIndex)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addSpecificationItem(specIndex)}
                      className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Plus className="h-3 w-3 inline mr-1" />
                      Add Item
                    </button>
                  </div>
                </div>
              ))}
              {bodyTypeFormData.defaultSpecifications.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No specifications added yet</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              setShowBodyTypeModal(false);
              setBodyTypeFormData({ name: '', shortName: '', description: '', defaultSpecifications: [] });
            }}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={createBodyType}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create
          </button>
        </div>
      </BaseModal>

      {/* Body Type Edit Modal */}
      <BaseModal
        isOpen={showBodyTypeEditModal}
        onClose={() => {
          setShowBodyTypeEditModal(false);
          setSelectedBodyType(null);
          setBodyTypeFormData({ name: '', shortName: '', description: '', defaultSpecifications: [] });
        }}
        title="Edit Body Type"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={bodyTypeFormData.name}
              onChange={(e) => setBodyTypeFormData({ ...bodyTypeFormData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Dump Truck"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Short Name * <span className="text-xs text-gray-500">(Product ID, max 20 characters)</span>
            </label>
            <input
              type="text"
              value={bodyTypeFormData.shortName}
              onChange={(e) => setBodyTypeFormData({ ...bodyTypeFormData, shortName: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
              placeholder="e.g., DT"
              maxLength={20}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={bodyTypeFormData.description}
              onChange={(e) => setBodyTypeFormData({ ...bodyTypeFormData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
              placeholder="Enter description..."
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Default Specifications
              </label>
              <button
                type="button"
                onClick={addSpecificationCategory}
                className="text-sm px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Plus className="h-4 w-4 inline mr-1" />
                Add Category
              </button>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {bodyTypeFormData.defaultSpecifications.map((spec, specIndex) => (
                <div key={specIndex} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <input
                      type="text"
                      value={spec.category || ''}
                      onChange={(e) => updateSpecificationCategory(specIndex, 'category', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm mr-2"
                      placeholder="Category name"
                    />
                    <button
                      type="button"
                      onClick={() => removeSpecificationCategory(specIndex)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-2 ml-4">
                    {spec.items && spec.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.name || ''}
                          onChange={(e) => updateSpecificationItem(specIndex, itemIndex, 'name', e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Name"
                        />
                        <span className="text-gray-500">:</span>
                        <input
                          type="text"
                          value={item.specification || ''}
                          onChange={(e) => updateSpecificationItem(specIndex, itemIndex, 'specification', e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Specification"
                        />
                        <button
                          type="button"
                          onClick={() => removeSpecificationItem(specIndex, itemIndex)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addSpecificationItem(specIndex)}
                      className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Plus className="h-3 w-3 inline mr-1" />
                      Add Item
                    </button>
                  </div>
                </div>
              ))}
              {bodyTypeFormData.defaultSpecifications.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No specifications added yet</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              setShowBodyTypeEditModal(false);
              setSelectedBodyType(null);
              setBodyTypeFormData({ name: '', shortName: '', description: '', defaultSpecifications: [] });
            }}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={updateBodyType}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Update
          </button>
        </div>
      </BaseModal>

      {/* Body Type View Modal */}
      <BaseModal
        isOpen={showBodyTypeViewModal}
        onClose={() => {
          setShowBodyTypeViewModal(false);
          setSelectedBodyType(null);
        }}
        title="Body Type Details"
        size="lg"
      >
        {selectedBodyType && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <div className="flex items-center gap-3">
                <p className="text-lg font-semibold text-gray-900">{selectedBodyType.name}</p>
                {selectedBodyType.shortName && (
                  <span className="px-2 py-1 text-sm font-medium bg-gray-200 text-gray-700 rounded">
                    {selectedBodyType.shortName}
                  </span>
                )}
              </div>
            </div>
            {selectedBodyType.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <p className="text-gray-900">{selectedBodyType.description}</p>
              </div>
            )}
            {selectedBodyType.defaultSpecifications && selectedBodyType.defaultSpecifications.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Specifications
                </label>
                <div className="space-y-2 border border-gray-200 rounded-lg p-3">
                  {selectedBodyType.defaultSpecifications.map((spec, specIndex) => (
                    <div key={specIndex} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <h4 className="font-semibold text-gray-900 mb-2">{spec.category}</h4>
                      {spec.items && spec.items.length > 0 && (
                        <div className="space-y-1 ml-2">
                          {spec.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="text-sm text-gray-700">
                              <span className="font-medium">{item.name}</span>: {item.specification}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              setShowBodyTypeViewModal(false);
              setSelectedBodyType(null);
            }}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </BaseModal>
    </div>
  );
};

export default BodyTypeTab;





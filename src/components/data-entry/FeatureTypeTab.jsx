import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Loader2, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import ApiHelper from '../../utils/api/ApiHelper';
import BaseModal from '../modals/BaseModal';

const FeatureTypeTab = () => {
  // State for feature types
  const [featureTypes, setFeatureTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [reloadKey, setReloadKey] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedFeatureType, setSelectedFeatureType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    shortName: ''
  });

  // Load feature types
  const loadFeatureTypes = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (searchTerm && searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      const response = await ApiHelper.get('/api/feature-types', { params });
      const payload = response.data || {};
      const items = payload.data || [];
      const paginationInfo = payload.pagination || {};

      setFeatureTypes(items);
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
      console.error('Error loading feature types:', error);
      toast.error(error.response?.data?.message || 'Failed to load feature types');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, reloadKey]);

  // Load data on mount
  useEffect(() => {
    loadFeatureTypes();
  }, [loadFeatureTypes]);

  // Debounced search - reset to page 1 and fetch after user stops typing
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
      // Trigger reload by updating reloadKey
      setReloadKey((prev) => prev + 1);
    }, 500); // 500ms debounce delay

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  // Create feature type
  const createFeatureType = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error('Feature type name is required');
        return;
      }
      
      if (!formData.shortName.trim()) {
        toast.error('Feature type short name is required');
        return;
      }
      
      await ApiHelper.post('/api/feature-types', formData);
      toast.success('Feature type created successfully');
      setShowCreateModal(false);
      setFormData({ name: '', shortName: '' });
      setPagination((prev) => ({ ...prev, page: 1 }));
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      console.error('Error creating feature type:', error);
      toast.error(error.response?.data?.message || 'Failed to create feature type');
    }
  };

  // Update feature type
  const updateFeatureType = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error('Feature type name is required');
        return;
      }
      
      if (!formData.shortName.trim()) {
        toast.error('Feature type short name is required');
        return;
      }
      
      await ApiHelper.put(`/api/feature-types/${selectedFeatureType._id}`, formData);
      toast.success('Feature type updated successfully');
      setShowEditModal(false);
      setSelectedFeatureType(null);
      setFormData({ name: '', shortName: '' });
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      console.error('Error updating feature type:', error);
      toast.error(error.response?.data?.message || 'Failed to update feature type');
    }
  };

  // Delete feature type
  const deleteFeatureType = async (featureType) => {
    if (!window.confirm(`Are you sure you want to delete "${featureType.name}"?`)) {
      return;
    }
    
    try {
      await ApiHelper.delete(`/api/feature-types/${featureType._id}`);
      toast.success('Feature type deleted successfully');
      setPagination((prev) => {
        const nextTotal = Math.max(prev.total - 1, 0);
        const nextPages = Math.max(Math.ceil(nextTotal / prev.limit) || 1, 1);
        const nextPage = prev.page > nextPages ? nextPages : prev.page;
        return { ...prev, page: nextPage };
      });
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      console.error('Error deleting feature type:', error);
      toast.error(error.response?.data?.message || 'Failed to delete feature type');
    }
  };

  // Handle edit
  const handleEdit = (featureType) => {
    setSelectedFeatureType(featureType);
    setFormData({
      name: featureType.name,
      shortName: featureType.shortName || ''
    });
    setShowEditModal(true);
  };

  // Handle view
  const handleView = (featureType) => {
    setSelectedFeatureType(featureType);
    setShowViewModal(true);
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
      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search feature types..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Action Button */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Feature Type
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Types List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900">Feature Types</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-gray-500">Loading feature types...</p>
          </div>
        ) : featureTypes.length === 0 ? (
          <div className="p-8 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No feature types found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Feature Type
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {featureTypes.map((featureType) => (
              <div key={featureType._id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{featureType.name}</h3>
                      {featureType.shortName && (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                          {featureType.shortName}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleView(featureType)}
                      className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => handleEdit(featureType)}
                      className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => deleteFeatureType(featureType)}
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

    {featureTypes.length > 0 && pagination.pages > 1 && (
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

      {/* Create Modal */}
      <BaseModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormData({ name: '', shortName: '' });
        }}
        title="Create New Feature Type"
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
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Air Conditioning"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Short Name * <span className="text-xs text-gray-500">(Product ID, max 20 characters)</span>
            </label>
            <input
              type="text"
              value={formData.shortName}
              onChange={(e) => setFormData({ ...formData, shortName: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
              placeholder="e.g., AC"
              maxLength={20}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              setShowCreateModal(false);
              setFormData({ name: '', shortName: '' });
            }}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={createFeatureType}
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
          setSelectedFeatureType(null);
          setFormData({ name: '', shortName: '' });
        }}
        title="Edit Feature Type"
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
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Air Conditioning"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Short Name * <span className="text-xs text-gray-500">(Product ID, max 20 characters)</span>
            </label>
            <input
              type="text"
              value={formData.shortName}
              onChange={(e) => setFormData({ ...formData, shortName: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
              placeholder="e.g., AC"
              maxLength={20}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              setShowEditModal(false);
              setSelectedFeatureType(null);
              setFormData({ name: '', shortName: '' });
            }}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={updateFeatureType}
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
          setSelectedFeatureType(null);
        }}
        title="Feature Type Details"
      >
        {selectedFeatureType && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <div className="flex items-center gap-3">
                <p className="text-lg font-semibold text-gray-900">{selectedFeatureType.name}</p>
                {selectedFeatureType.shortName && (
                  <span className="px-2 py-1 text-sm font-medium bg-gray-200 text-gray-700 rounded">
                    {selectedFeatureType.shortName}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              setShowViewModal(false);
              setSelectedFeatureType(null);
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

export default FeatureTypeTab;





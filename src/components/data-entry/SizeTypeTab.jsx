import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Loader2, Ruler } from 'lucide-react';
import toast from 'react-hot-toast';
import ApiHelper from '../../utils/api/ApiHelper';
import BaseModal from '../modals/BaseModal';

const SizeTypeTab = () => {
  // State for size types
  const [sizeTypes, setSizeTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSizeType, setSelectedSizeType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    shortName: ''
  });

  // Load size types
  const loadSizeTypes = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      
      const response = await ApiHelper.get('/api/size-types', { params });
      setSizeTypes(response.data.data || []);
    } catch (error) {
      console.error('Error loading size types:', error);
      toast.error('Failed to load size types');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  // Load data on mount
  useEffect(() => {
    loadSizeTypes();
  }, [loadSizeTypes]);

  // Create size type
  const createSizeType = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error('Size type name is required');
        return;
      }
      
      if (!formData.shortName.trim()) {
        toast.error('Size type short name is required');
        return;
      }
      
      await ApiHelper.post('/api/size-types', formData);
      toast.success('Size type created successfully');
      setShowCreateModal(false);
      setFormData({ name: '', shortName: '' });
      loadSizeTypes();
    } catch (error) {
      console.error('Error creating size type:', error);
      toast.error(error.response?.data?.message || 'Failed to create size type');
    }
  };

  // Update size type
  const updateSizeType = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error('Size type name is required');
        return;
      }
      
      if (!formData.shortName.trim()) {
        toast.error('Size type short name is required');
        return;
      }
      
      await ApiHelper.put(`/api/size-types/${selectedSizeType._id}`, formData);
      toast.success('Size type updated successfully');
      setShowEditModal(false);
      setSelectedSizeType(null);
      setFormData({ name: '', shortName: '' });
      loadSizeTypes();
    } catch (error) {
      console.error('Error updating size type:', error);
      toast.error(error.response?.data?.message || 'Failed to update size type');
    }
  };

  // Delete size type
  const deleteSizeType = async (sizeType) => {
    if (!window.confirm(`Are you sure you want to delete "${sizeType.name}"?`)) {
      return;
    }
    
    try {
      await ApiHelper.delete(`/api/size-types/${sizeType._id}`);
      toast.success('Size type deleted successfully');
      loadSizeTypes();
    } catch (error) {
      console.error('Error deleting size type:', error);
      toast.error(error.response?.data?.message || 'Failed to delete size type');
    }
  };

  // Handle edit
  const handleEdit = (sizeType) => {
    setSelectedSizeType(sizeType);
    setFormData({
      name: sizeType.name,
      shortName: sizeType.shortName || ''
    });
    setShowEditModal(true);
  };

  // Handle view
  const handleView = (sizeType) => {
    setSelectedSizeType(sizeType);
    setShowViewModal(true);
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
                  placeholder="Search size types..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                New Size Type
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Size Types List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900">Size Types</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-gray-500">Loading size types...</p>
          </div>
        ) : sizeTypes.length === 0 ? (
          <div className="p-8 text-center">
            <Ruler className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No size types found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Size Type
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sizeTypes.map((sizeType) => (
              <div key={sizeType._id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{sizeType.name}</h3>
                      {sizeType.shortName && (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                          {sizeType.shortName}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleView(sizeType)}
                      className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => handleEdit(sizeType)}
                      className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => deleteSizeType(sizeType)}
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
          setFormData({ name: '', shortName: '' });
        }}
        title="Create New Size Type"
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
              placeholder="e.g., Small"
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
              placeholder="e.g., S"
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
            onClick={createSizeType}
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
          setSelectedSizeType(null);
          setFormData({ name: '', shortName: '' });
        }}
        title="Edit Size Type"
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
              placeholder="e.g., Small"
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
              placeholder="e.g., S"
              maxLength={20}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              setShowEditModal(false);
              setSelectedSizeType(null);
              setFormData({ name: '', shortName: '' });
            }}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={updateSizeType}
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
          setSelectedSizeType(null);
        }}
        title="Size Type Details"
      >
        {selectedSizeType && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <div className="flex items-center gap-3">
                <p className="text-lg font-semibold text-gray-900">{selectedSizeType.name}</p>
                {selectedSizeType.shortName && (
                  <span className="px-2 py-1 text-sm font-medium bg-gray-200 text-gray-700 rounded">
                    {selectedSizeType.shortName}
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
              setSelectedSizeType(null);
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

export default SizeTypeTab;





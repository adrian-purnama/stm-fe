import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Loader2, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import ApiHelper from '../../utils/api/ApiHelper';
import BaseModal from '../modals/BaseModal';

const ChassisTypeTab = () => {
  // State for chassis types
  const [chassisTypes, setChassisTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedChassisType, setSelectedChassisType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    shortName: ''
  });

  // Load chassis types
  const loadChassisTypes = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      
      const response = await ApiHelper.get('/api/chassis-types', { params });
      setChassisTypes(response.data.data || []);
    } catch (error) {
      console.error('Error loading chassis types:', error);
      toast.error('Failed to load chassis types');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  // Load data on mount
  useEffect(() => {
    loadChassisTypes();
  }, [loadChassisTypes]);

  // Create chassis type
  const createChassisType = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error('Chassis type name is required');
        return;
      }
      if (!formData.shortName.trim()) {
        toast.error('Chassis type short name is required');
        return;
      }
      if (formData.shortName.trim().length > 20) {
        toast.error('Short name must be 20 characters or less');
        return;
      }
      
      await ApiHelper.post('/api/chassis-types', formData);
      toast.success('Chassis type created successfully');
      setShowCreateModal(false);
      setFormData({ name: '', shortName: '' });
      loadChassisTypes();
    } catch (error) {
      console.error('Error creating chassis type:', error);
      toast.error(error.response?.data?.message || 'Failed to create chassis type');
    }
  };

  // Update chassis type
  const updateChassisType = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error('Chassis type name is required');
        return;
      }
      if (!formData.shortName.trim()) {
        toast.error('Chassis type short name is required');
        return;
      }
      if (formData.shortName.trim().length > 20) {
        toast.error('Short name must be 20 characters or less');
        return;
      }
      
      await ApiHelper.put(`/api/chassis-types/${selectedChassisType._id}`, formData);
      toast.success('Chassis type updated successfully');
      setShowEditModal(false);
      setSelectedChassisType(null);
      setFormData({ name: '', shortName: '' });
      loadChassisTypes();
    } catch (error) {
      console.error('Error updating chassis type:', error);
      toast.error(error.response?.data?.message || 'Failed to update chassis type');
    }
  };

  // Delete chassis type
  const deleteChassisType = async (chassisType) => {
    if (!window.confirm(`Are you sure you want to delete "${chassisType.name}"?`)) {
      return;
    }
    
    try {
      await ApiHelper.delete(`/api/chassis-types/${chassisType._id}`);
      toast.success('Chassis type deleted successfully');
      loadChassisTypes();
    } catch (error) {
      console.error('Error deleting chassis type:', error);
      toast.error(error.response?.data?.message || 'Failed to delete chassis type');
    }
  };

  // Handle edit
  const handleEdit = (chassisType) => {
    setSelectedChassisType(chassisType);
    setFormData({
      name: chassisType.name,
      shortName: chassisType.shortName || ''
    });
    setShowEditModal(true);
  };

  // Handle view
  const handleView = (chassisType) => {
    setSelectedChassisType(chassisType);
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
                  placeholder="Search chassis types..."
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
                New Chassis Type
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chassis Types List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900">Chassis Types</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-gray-500">Loading chassis types...</p>
          </div>
        ) : chassisTypes.length === 0 ? (
          <div className="p-8 text-center">
            <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No chassis types found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Chassis Type
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {chassisTypes.map((chassisType) => (
              <div key={chassisType._id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{chassisType.name}</h3>
                      {chassisType.shortName && (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                          {chassisType.shortName}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleView(chassisType)}
                      className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => handleEdit(chassisType)}
                      className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => deleteChassisType(chassisType)}
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
        title="Create New Chassis Type"
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
              placeholder="e.g., Standard Chassis"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Short Name * <span className="text-xs text-gray-500">(max 20 characters, uppercase)</span>
            </label>
            <input
              type="text"
              value={formData.shortName}
              onChange={(e) => setFormData({ ...formData, shortName: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
              placeholder="e.g., STD"
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
            onClick={createChassisType}
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
          setSelectedChassisType(null);
          setFormData({ name: '', shortName: '' });
        }}
        title="Edit Chassis Type"
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
              placeholder="e.g., Standard Chassis"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Short Name * <span className="text-xs text-gray-500">(max 20 characters, uppercase)</span>
            </label>
            <input
              type="text"
              value={formData.shortName}
              onChange={(e) => setFormData({ ...formData, shortName: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
              placeholder="e.g., STD"
              maxLength={20}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              setShowEditModal(false);
              setSelectedChassisType(null);
              setFormData({ name: '', shortName: '' });
            }}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={updateChassisType}
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
          setSelectedChassisType(null);
        }}
        title="Chassis Type Details"
      >
        {selectedChassisType && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <div className="flex items-center gap-3">
                <p className="text-lg font-semibold text-gray-900">{selectedChassisType.name}</p>
                {selectedChassisType.shortName && (
                  <span className="px-2 py-1 text-sm font-medium bg-gray-200 text-gray-700 rounded">
                    {selectedChassisType.shortName}
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
              setSelectedChassisType(null);
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

export default ChassisTypeTab;



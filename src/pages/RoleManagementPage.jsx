import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Shield, Eye } from 'lucide-react';
import Navigation from '../components/Navigation';
import ApiHelper from '../utils/ApiHelper';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import CustomDropdown from '../components/CustomDropdown';
import RoleFormModal from '../components/RoleFormModal';
import RoleDetailsModal from '../components/RoleDetailsModal';

const PermissionManagementPage = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showPermissionForm, setShowPermissionForm] = useState(false);
  const [showPermissionDetails, setShowPermissionDetails] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState(null);
  const [actionType, setActionType] = useState('');

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await ApiHelper.get('/api/permissions');
      setPermissions(response.data.data || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to fetch permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePermission = () => {
    setSelectedPermission(null);
    setShowPermissionForm(true);
  };

  const handleEditPermission = (permission) => {
    setSelectedPermission(permission);
    setShowPermissionForm(true);
  };

  const handleViewPermission = (permission) => {
    setSelectedPermission(permission);
    setShowPermissionDetails(true);
  };

  const handlePermissionFormSubmit = async (permissionData) => {
    try {
      if (selectedPermission) {
        // Update existing permission
        const permissionId = selectedPermission._id || selectedPermission.id;
        await ApiHelper.put(`/api/permissions/${permissionId}`, permissionData);
        toast.success('Permission updated successfully');
      } else {
        // Create new permission
        await ApiHelper.post('/api/permissions', permissionData);
        toast.success('Permission created successfully');
      }
      
      setShowPermissionForm(false);
      setSelectedPermission(null);
      fetchPermissions();
    } catch (error) {
      console.error('Error saving permission:', error);
      toast.error('Failed to save permission');
    }
  };

  const handleDeletePermission = (permission) => {
    setSelectedPermission(permission);
    setActionType('delete');
    setShowConfirmModal(true);
  };

  const confirmAction = async () => {
    try {
      if (actionType === 'delete') {
        const permissionId = selectedPermission._id || selectedPermission.id;
        await ApiHelper.delete(`/api/permissions/${permissionId}`);
        toast.success('Permission deleted successfully');
        fetchPermissions();
      }
    } catch (error) {
      console.error('Error performing action:', error);
      toast.error('Failed to perform action');
    } finally {
      setShowConfirmModal(false);
      setSelectedPermission(null);
      setActionType('');
    }
  };


  const getPermissionCategory = (permission) => {
    if (permission.type === 'individual') return 'Individual';
    if (permission.type === 'multi') return 'Multi';
    return 'Basic';
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Individual': return 'bg-green-100 text-green-800';
      case 'Multi': return 'bg-blue-100 text-blue-800';
      case 'Basic': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };


  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = permission.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permission.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (permission.includes && permission.includes.some(perm => 
                           perm.toLowerCase().includes(searchTerm.toLowerCase())
                         ));
    
    const matchesCategory = !filterCategory || getPermissionCategory(permission) === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Permission Management</h1>
              <p className="mt-2 text-gray-600">Manage permissions and categories</p>
            </div>
            <button
              onClick={handleCreatePermission}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Permission
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search permissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="sm:w-64">
              <CustomDropdown
                options={[
                  { value: '', label: 'All Categories' },
                  { value: 'Individual', label: 'Individual Permissions' },
                  { value: 'Multi', label: 'Multi Permissions' },
                  { value: 'Basic', label: 'Basic Permissions' }
                ]}
                value={filterCategory}
                onChange={setFilterCategory}
                placeholder="Filter by category"
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Permissions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              Loading permissions...
            </div>
          ) : filteredPermissions.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No permissions found
            </div>
          ) : (
            filteredPermissions.map((permission) => (
              <div key={permission._id || permission.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* Permission Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Shield className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold text-gray-900">{permission.displayName}</h3>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(getPermissionCategory(permission))}`}>
                            {getPermissionCategory(permission)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{permission.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleViewPermission(permission)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditPermission(permission)}
                        className="text-indigo-600 hover:text-indigo-900 p-1"
                        title="Edit Permission"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePermission(permission)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Delete Permission"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-4">{permission.description}</p>

                  {/* Permissions (for multi-permissions) */}
                  {permission.type === 'multi' && permission.includes && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Includes</span>
                        <span className="text-xs text-gray-500">{permission.includes.length} permissions</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {permission.includes.slice(0, 3).map((perm, index) => (
                          <span
                            key={perm || index}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {perm}
                          </span>
                        ))}
                        {permission.includes.length > 3 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            +{permission.includes.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-200">
                    <span>Created: {formatDate(permission.createdAt)}</span>
                    <span className={`px-2 py-1 rounded-full ${
                      permission.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {permission.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      {showPermissionForm && (
        <RoleFormModal
          role={selectedPermission}
          onClose={() => setShowPermissionForm(false)}
          onSubmit={handlePermissionFormSubmit}
        />
      )}

      {showPermissionDetails && (
        <RoleDetailsModal
          role={selectedPermission}
          onClose={() => setShowPermissionDetails(false)}
        />
      )}

      {showConfirmModal && (
        <ConfirmModal
          title="Delete Permission"
          message={`Are you sure you want to delete the permission "${selectedPermission?.displayName}"? This action cannot be undone.`}
          onConfirm={confirmAction}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
    </div>
  );
};

export default PermissionManagementPage;

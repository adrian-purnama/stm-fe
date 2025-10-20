import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2 } from 'lucide-react';
import BaseModal from './BaseModal';
import ApiHelper from '../utils/ApiHelper';
import toast from 'react-hot-toast';
import CustomDropdown from './CustomDropdown';

const RoleFormModal = ({ role, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    category: '',
    type: 'individual',
    includes: [],
    isActive: true
  });
  const [newPermission, setNewPermission] = useState('');
  const [errors, setErrors] = useState({});
  const [permissions, setPermissions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Fetch permissions and categories from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [permissionsResponse, categoriesResponse] = await Promise.all([
          ApiHelper.get('/api/permissions'),
          ApiHelper.get('/api/permission-categories')
        ]);
        setPermissions(permissionsResponse.data.data || []);
        setCategories(categoriesResponse.data.data || []);
        console.log('Categories loaded:', categoriesResponse.data.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        console.error('Error details:', error.response?.data);
        if (error.response?.status === 401) {
          toast.error('Please login to access permission data');
        } else if (error.response?.status === 403) {
          toast.error('Insufficient permissions to access data');
        } else {
          toast.error('Failed to fetch data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Group permissions by category
  const groupedPermissions = (permissions || []).reduce((acc, permission) => {
    const categoryName = permission.category?.name || 'Other';
    if (!acc[categoryName]) {
      acc[categoryName] = {
        category: permission.category,
        permissions: []
      };
    }
    acc[categoryName].permissions.push(permission);
    return acc;
  }, {});

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name || '',
        displayName: role.displayName || '',
        description: role.description || '',
        category: role.category?._id || role.category || '',
        type: role.type || 'individual',
        includes: role.includes || [],
        isActive: role.isActive !== undefined ? role.isActive : true
      });
    }
  }, [role]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleAddPermission = () => {
    if (newPermission.trim() && !formData.includes.includes(newPermission.trim())) {
      setFormData(prev => ({
        ...prev,
        includes: [...prev.includes, newPermission.trim()]
      }));
      setNewPermission('');
    }
  };

  const handleRemovePermission = (permission) => {
    setFormData(prev => ({
      ...prev,
      includes: prev.includes.filter(p => p !== permission)
    }));
  };

  const handleSelectPermission = (permission) => {
    const permissionName = permission.name;
    if (formData.includes.includes(permissionName)) {
      handleRemovePermission(permissionName);
    } else {
      setFormData(prev => ({
        ...prev,
        includes: [...prev.includes, permissionName]
      }));
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      const response = await ApiHelper.post('/api/permission-categories', {
        name: newCategoryName.trim().toLowerCase().replace(/\s+/g, '_'),
        description: `Category for ${newCategoryName.trim()} permissions`
      });
      
      const newCategory = response.data.data;
      setCategories(prev => [...prev, newCategory]);
      setFormData(prev => ({ ...prev, category: newCategory._id }));
      setShowNewCategoryForm(false);
      setNewCategoryName('');
      toast.success('Category created successfully');
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Permission name is required';
    } else if (!/^[a-z_]+$/.test(formData.name)) {
      newErrors.name = 'Permission name must contain only lowercase letters and underscores';
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (formData.type === 'multi' && formData.includes.length === 0) {
      newErrors.includes = 'At least one permission must be included for multi-permissions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Automatically determine type based on includes array
    const submissionData = {
      name: formData.name,
      displayName: formData.displayName,
      description: formData.description,
      categoryId: formData.category, // Backend expects categoryId, not category
      type: formData.includes.length > 0 ? 'multi' : 'individual',
      includes: formData.includes,
      isActive: formData.isActive
    };

    console.log('Submitting permission data:', submissionData);
    onSubmit(submissionData);
  };




  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title={role ? 'Edit Permission' : 'Add New Permission'}
      size="xl"
    >
      <div className="space-y-6">
        {/* Permission Type Display */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-900">Permission Type</h3>
              <p className="text-sm text-blue-700 mt-1">
                {formData.includes.length === 0 && 'Individual Permission - Single permission for specific actions'}
                {formData.includes.length > 0 && `Multi Permission - Contains ${formData.includes.length} individual permissions`}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900 bg-blue-100 px-2 py-1 rounded-full">
                {formData.includes.length === 0 ? 'Individual' : 'Multi'}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Permission Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Shield className="w-4 h-4 inline mr-2" />
                Permission Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., truck_manager"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Use lowercase letters and underscores only
              </p>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name *
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.displayName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Truck Manager"
              />
              {errors.displayName && (
                <p className="mt-1 text-sm text-red-600">{errors.displayName}</p>
              )}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <div className="flex gap-2">
              {loading ? (
                <div className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                  Loading categories...
                </div>
              ) : (
                <CustomDropdown
                  options={[
                    { value: '', label: 'Select a category' },
                    ...categories.map((category) => ({
                      value: category._id,
                      label: category.name
                    }))
                  ]}
                  value={formData.category}
                  onChange={(value) => {
                    console.log('Category selected:', value);
                    handleInputChange('category', value);
                  }}
                  placeholder="Select a category"
                  className={`flex-1 ${errors.category ? 'border-red-500' : ''}`}
                />
              )}
              <button
                type="button"
                onClick={() => setShowNewCategoryForm(true)}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                New
              </button>
            </div>
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category}</p>
            )}
            
            {/* New Category Form */}
            {showNewCategoryForm && (
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Create New Category</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g., Drawing Management"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCategoryForm(false);
                      setNewCategoryName('');
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Describe what this role can do..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permissions *
            </label>
            
            {/* Add Custom Permission */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newPermission}
                onChange={(e) => setNewPermission(e.target.value)}
                placeholder="Add custom permission..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleAddPermission}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {/* Selected Permissions (for multi-permissions) */}
            {formData.type === 'multi' && formData.includes.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Included Permissions:</h4>
                <div className="flex flex-wrap gap-2">
                  {formData.includes.map(permission => (
                    <span
                      key={permission}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {permission}
                      <button
                        type="button"
                        onClick={() => handleRemovePermission(permission)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Available Permissions */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700">Available Permissions (Optional):</h4>
              <p className="text-xs text-gray-500">
                Select individual permissions to include. Leave empty for individual permission, or select multiple for multi-permission.
              </p>
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading permissions...</p>
                </div>
              ) : (
                Object.entries(groupedPermissions).map(([categoryName, categoryData]) => (
                  <div key={categoryName} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <h5 className="font-medium text-gray-900">{categoryName}</h5>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {categoryData.permissions.map(permission => (
                        <label key={permission._id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.includes.includes(permission.name)}
                            onChange={() => handleSelectPermission(permission)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {permission.displayName}
                            <span className="text-gray-500 ml-1">({permission.name})</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                Active Permission
              </span>
            </label>
          </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {role ? 'Update Permission' : 'Create Permission'}
          </button>
        </div>
        </form>
      </div>
    </BaseModal>
  );
};

export default RoleFormModal;

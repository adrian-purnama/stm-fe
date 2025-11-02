import React, { useState, useEffect } from 'react';
import { Shield, Check, X as XIcon } from 'lucide-react';
import BaseModal from './BaseModal';

const RoleManagementModal = ({ user, permissions, onClose, onSubmit }) => {
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.permissions) {
      setSelectedPermissions(user.permissions.map(permission => permission._id || permission.id));
    }
  }, [user]);

  const handlePermissionToggle = (permissionId) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(id => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedPermissions.length === filteredPermissions.length) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(filteredPermissions.map(permission => permission._id || permission.id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(user._id || user.id, selectedPermissions);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPermissions = permissions.filter(permission =>
    permission.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (permission.description && permission.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Group permissions by category
  const groupedPermissions = filteredPermissions.reduce((groups, permission) => {
    const categoryName = permission.category?.name || permission.category?.displayName || 'Other';
    if (!groups[categoryName]) {
      groups[categoryName] = [];
    }
    groups[categoryName].push(permission);
    return groups;
  }, {});

  const getPermissionType = (permission) => {
    return permission.type === 'individual' ? 'Individual' : 'Multi';
  };

  const getPermissionIncludes = (permission) => {
    if (permission.type === 'multi' && permission.includes && permission.includes.length > 0) {
      return permission.includes.join(', ');
    }
    return 'N/A';
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title={`Manage Permissions for ${user?.fullName}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search permissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Select All */}
          <div className="mb-4">
            <button
              type="button"
              onClick={handleSelectAll}
              className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              <Shield className="w-4 h-4 mr-2" />
              {selectedPermissions.length === filteredPermissions.length ? 'Deselect All' : 'Select All'}
              <span className="ml-2 text-gray-500">
                ({selectedPermissions.length}/{filteredPermissions.length} selected)
              </span>
            </button>
          </div>

          {/* Permissions List by Category */}
          <div className="space-y-6 mb-6">
            {Object.keys(groupedPermissions).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No permissions found matching your search.
              </div>
            ) : (
              Object.entries(groupedPermissions).map(([categoryName, categoryPermissions]) => (
                <div key={categoryName} className="space-y-3">
                  {/* Category Header */}
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-medium text-gray-900 capitalize">
                      {categoryName.replace('_', ' ')} Management
                    </h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {categoryPermissions.length} permissions
                    </span>
                  </div>
                  
                  {/* Permissions in this category */}
                  <div className="space-y-2 ml-4">
                    {categoryPermissions.map(permission => (
                      <div
                        key={permission._id || permission.id}
                        className={`border rounded-lg p-4 transition-colors ${
                          selectedPermissions.includes(permission._id || permission.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                              <input
                                type="checkbox"
                                checked={selectedPermissions.includes(permission._id || permission.id)}
                                onChange={() => handlePermissionToggle(permission._id || permission.id)}
                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-gray-900">{permission.displayName}</h4>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {getPermissionType(permission)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{permission.description}</p>
                              {permission.type === 'multi' && permission.includes && permission.includes.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs text-gray-500">
                                    <strong>Includes:</strong> {getPermissionIncludes(permission)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <Shield className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Current Selection Summary */}
          {selectedPermissions.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-blue-900 mb-2">Selected Permissions:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedPermissions.map(permissionId => {
                  const permission = permissions.find(p => (p._id || p.id) === permissionId);
                  return (
                    <span
                      key={permissionId}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {permission?.displayName}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePermissionToggle(permissionId);
                        }}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

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
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Updating...
              </>
            ) : (
              'Update Roles'
            )}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default RoleManagementModal;

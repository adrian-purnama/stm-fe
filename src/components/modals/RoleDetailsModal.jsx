import React from 'react';
import { Shield, Users, Calendar, CheckCircle, XCircle } from 'lucide-react';
import BaseModal from './BaseModal';

const RoleDetailsModal = ({ role: permission, onClose }) => {
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  if (!permission) {
    return (
      <BaseModal isOpen={true} onClose={onClose} title="Error">
        <div className="text-center py-8">
          <p className="text-gray-600">No permission data available</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </BaseModal>
    );
  }

  // For individual permissions, we don't need to group by category
  // For multi-permissions, we can show the included permissions
  const includedPermissions = permission?.includes || [];

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title={`Permission Details - ${permission?.displayName}`}
      size="xl"
    >
      <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Display Name</p>
                <p className="font-medium text-gray-900">{permission?.displayName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Permission Name</p>
                <p className="font-medium text-gray-900 font-mono">{permission?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <p className="font-medium text-gray-900">{permission?.type === 'individual' ? 'Individual' : 'Multi'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Description</p>
                <p className="font-medium text-gray-900">{permission?.description}</p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
            <div className="flex items-center">
              {permission?.isActive ? (
                <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500 mr-3" />
              )}
              <span className={`font-medium ${permission?.isActive ? 'text-green-700' : 'text-red-700'}`}>
                {permission?.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Metadata</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium text-gray-900">{formatDate(permission?.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="font-medium text-gray-900">{formatDate(permission?.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Included Permissions (for multi-permissions) */}
          {permission?.type === 'multi' && includedPermissions.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Included Permissions ({includedPermissions.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {includedPermissions.map(perm => (
                  <span
                    key={perm}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Permission Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Permission Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{permission?.type === 'individual' ? 'Individual' : 'Multi'}</div>
                <div className="text-sm text-gray-500">Permission Type</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{includedPermissions.length}</div>
                <div className="text-sm text-gray-500">Included Permissions</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
    </BaseModal>
  );
};

export default RoleDetailsModal;

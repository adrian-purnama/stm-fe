import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Shield, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import ApiHelper from '../utils/ApiHelper';
import BaseModal from './BaseModal';

const UserDetailsModal = ({ user, onClose }) => {
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserDetails();
    }
  }, [user]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const response = await ApiHelper.get(`/api/auth/users/${user._id}/roles`);
      setUserDetails(response.data.data);
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const getPermissionCategory = (permission) => {
    if (permission.includes('user_')) return 'User Management';
    if (permission.includes('role_')) return 'Role Management';
    if (permission.includes('truck_')) return 'Truck Management';
    if (permission.includes('drawing_')) return 'Drawing Management';
    if (permission.includes('quotation_')) return 'Quotation Management';
    if (permission.includes('notes_')) return 'Notes Management';
    return 'Other';
  };

  const groupPermissionsByCategory = (roles) => {
    const categories = {};
    
    roles.forEach(role => {
      role.permissions.forEach(permission => {
        const category = getPermissionCategory(permission);
        if (!categories[category]) {
          categories[category] = [];
        }
        if (!categories[category].includes(permission)) {
          categories[category].push(permission);
        }
      });
    });

    return categories;
  };

  if (loading) {
    return (
      <BaseModal isOpen={true} onClose={onClose} title="Loading...">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user details...</p>
        </div>
      </BaseModal>
    );
  }

  if (!userDetails) {
    return (
      <BaseModal isOpen={true} onClose={onClose} title="Error">
        <div className="text-center py-8">
          <p className="text-gray-600">Failed to load user details</p>
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

  const permissionCategories = groupPermissionsByCategory(userDetails.roles);

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title={`User Details - ${userDetails.fullName}`}
      size="xl"
    >
      <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <User className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium text-gray-900">{userDetails.fullName}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Mail className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{userDetails.email}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium text-gray-900">{formatDate(user.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Last Login</p>
                  <p className="font-medium text-gray-900">{formatDate(user.lastLogin)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
            <div className="flex items-center">
              {user.isActive ? (
                <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500 mr-3" />
              )}
              <span className={`font-medium ${user.isActive ? 'text-green-700' : 'text-red-700'}`}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Roles */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Assigned Roles</h3>
            <div className="space-y-3">
              {userDetails.roles.map(role => (
                <div key={role.id} className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{role.displayName}</h4>
                      <p className="text-sm text-gray-600">{role.description}</p>
                    </div>
                    <Shield className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Permissions</h3>
            <div className="space-y-4">
              {Object.entries(permissionCategories).map(([category, permissions]) => (
                <div key={category} className="bg-white rounded-lg p-3 border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">{category}</h4>
                  <div className="flex flex-wrap gap-2">
                    {permissions.map(permission => (
                      <span
                        key={permission}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {permission}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Phone Numbers */}
          {user.phoneNumbers && user.phoneNumbers.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Phone Numbers</h3>
              <div className="space-y-2">
                {user.phoneNumbers.map((phone, index) => (
                  <div key={index} className="flex items-center">
                    <Phone className="w-4 h-4 text-gray-400 mr-3" />
                    <span className="text-gray-900">{phone}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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

export default UserDetailsModal;

import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Trash2, Copy, Settings, ArrowLeft, Send, Mail } from 'lucide-react';
import Navigation from '../components/common/Navigation';
import axiosInstance from '../utils/api/ApiHelper';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/modals/ConfirmModal';
import RoleManagementModal from '../components/modals/RoleManagementModal';
import CustomDropdown from '../components/common/CustomDropdown';
import AddUserModal from '../components/modals/AddUserModal';
import EditUserModal from '../components/modals/EditUserModal';
import BaseModal from '../components/modals/BaseModal';
import BroadcastEmailModal from '../components/modals/BroadcastEmailModal';
import useSmartBackNavigation from '../hooks/useSmartBackNavigation';
import { usePermissions } from '../hooks/usePermissions';


const UserManagementPage = () => {
  const handleBack = useSmartBackNavigation('/');
  const { hasPermission } = usePermissions(['email_broadcast']);
  
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRoleManagement, setShowRoleManagement] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUserPermissions, setSelectedUserPermissions] = useState([]);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  const fetchUsers = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const params = {
        page: page,
        limit: 10,
        search: search
      };

      const response = await axiosInstance.get('/api/auth/users', { params });
      
      // Ensure we always have an array
      const usersData = response.data?.data || response.data || [];
      setUsers(Array.isArray(usersData) ? usersData : []);
      const paginationData = response.data?.pagination || response.data?.meta;
      setPagination({
        current: paginationData?.page || page,
        pages: paginationData?.pages || paginationData?.totalPages || 1,
        total: paginationData?.total || paginationData?.totalItems || usersData.length || 0
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
      setUsers([]); // Set empty array on error
      setPagination({ current: 1, pages: 1, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await axiosInstance.get('/api/permissions');
      const permissionsData = response.data?.data || response.data || [];
      setPermissions(Array.isArray(permissionsData) ? permissionsData : []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to fetch permissions');
      setPermissions([]); // Set empty array on error
    }
  };

  // Initial load
  useEffect(() => {
    fetchUsers(1, '');
    fetchPermissions();
  }, []);

  // Debounced search - fetch users from backend after user stops typing
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers(1, searchTerm); // Always reset to page 1 on search
    }, 500); // 500ms debounce delay

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const handleCreateUser = () => {
    setShowAddUser(true);
  };

  const submitCreateUser = async ({ fullName, email, password }) => {
    const createToast = toast.loading('Creating user...');
    try {
      await axiosInstance.post('/api/auth/users', { fullName, email, password });
      toast.success('User created successfully', { id: createToast });
      setShowAddUser(false);
      fetchUsers(pagination.current, searchTerm);
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error?.response?.data?.message || 'Failed to create user', { id: createToast });
    }
  };


  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setActionType('delete');
    setShowConfirmModal(true);
  };

  const handleCopyUser = (user) => {
    setSelectedUser(user);
    setActionType('copy');
    setShowConfirmModal(true);
  };

  const handleSendResetPrompt = async (user) => {
    const toastId = toast.loading('Sending reset instructions...');
    try {
      await axiosInstance.post('/api/auth/forgot-password', { email: user.email });
      toast.success('Reset instructions sent to user email', { id: toastId });
      const targetUrl = `/login?mode=forgot&email=${encodeURIComponent(user.email)}`;
      window.open(targetUrl, '_blank', 'noopener');
    } catch (error) {
      console.error('Error sending reset prompt:', error);
      toast.error(error.response?.data?.message || 'Failed to send reset instructions', { id: toastId });
    }
  };


  const confirmAction = async () => {
    try {
      switch (actionType) {
        case 'delete': {
          const deleteToast = toast.loading('Deleting user...');
          await axiosInstance.delete(`/api/auth/users/${selectedUser._id}`);
          toast.success('User deleted successfully', { id: deleteToast });
          break;
        }
        case 'copy': {
          const newEmail = prompt('Enter new email for copied user:');
          const newFullName = prompt('Enter new full name for copied user:');
          if (newEmail && newFullName) {
            const copyToast = toast.loading('Copying user...');
            await axiosInstance.post(`/api/auth/users/${selectedUser._id}/copy`, {
              email: newEmail,
              fullName: newFullName
            });
            toast.success('User copied successfully', { id: copyToast });
          }
          break;
        }
        case 'reset-password': {
          const newPassword = prompt('Enter new password:');
          if (newPassword) {
            const resetToast = toast.loading('Resetting password...');
            await axiosInstance.post(`/api/auth/users/${selectedUser._id}/reset-password`, {
              newPassword
            });
            toast.success('Password reset successfully', { id: resetToast });
          }
          break;
        }
      }
      fetchUsers(pagination.current, searchTerm);
    } catch (error) {
      console.error('Error performing action:', error);
      toast.error('Failed to perform action');
    } finally {
      setShowConfirmModal(false);
      setSelectedUser(null);
      setActionType('');
    }
  };


  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowEditUser(true);
  };

  const handleUpdateUser = async (userId, updateData) => {
    try {
      const updateToast = toast.loading('Updating user...');
      
      // If password is being changed, use reset-password endpoint
      if (updateData.newPassword) {
        await axiosInstance.post(`/api/auth/users/${userId}/reset-password`, {
          newPassword: updateData.newPassword
        });
        delete updateData.newPassword;
      }

      // Update other fields (fullName, email) if they exist
      if (updateData.fullName || updateData.email) {
        await axiosInstance.put(`/api/auth/users/${userId}`, {
          fullName: updateData.fullName,
          email: updateData.email
        });
      }

      toast.success('User updated successfully', { id: updateToast });
      setShowEditUser(false);
      setSelectedUser(null);
      fetchUsers(pagination.current, searchTerm);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleManagePermissions = async (userId, permissionIds) => {
    try {
      const updateToast = toast.loading('Updating user permissions...');
      // Update user permissions
      await axiosInstance.put(`/api/auth/users/${userId}`, {
        permissions: permissionIds
      });
      toast.success('User permissions updated successfully', { id: updateToast });
      fetchUsers(pagination.current, searchTerm);
      setShowRoleManagement(false);
    } catch (error) {
      console.error('Error updating user permissions:', error);
      toast.error('Failed to update user permissions');
    }
  };

  // No client-side filtering needed - backend handles search across all users
  const filteredUsers = users || [];

  const getPermissionNames = (userPermissions, maxLength = 50) => {
    if (!userPermissions || userPermissions.length === 0) return 'No permissions';
    const permissionString = userPermissions.map(permission => permission.displayName || permission.name).join(', ');
    
    if (permissionString.length <= maxLength) {
      return permissionString;
    }
    
    // Truncate and add "View All" indicator
    return permissionString.substring(0, maxLength) + '...';
  };

  const handleViewAllPermissions = (user) => {
    setSelectedUser(user);
    setSelectedUserPermissions(user.permissions || []);
    setShowPermissionsModal(true);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleBroadcastEmail = async ({ userIds, subject, message }) => {
    const toastId = toast.loading('Sending broadcast email...');
    try {
      const response = await axiosInstance.post('/api/auth/broadcast-email', {
        userIds,
        subject,
        message
      });
      
      const result = response.data?.data || {};
      const sent = result.sent || 0;
      const skipped = result.skipped || 0;
      const failed = result.failed || 0;
      
      let resultMessage = `Broadcast email completed: ${sent} sent`;
      if (skipped > 0) {
        resultMessage += `, ${skipped} skipped`;
        console.warn('Skipped emails - check backend logs for details. Common reasons: email notifications disabled (sendToEmail: false) or missing email address');
      }
      if (failed > 0) {
        resultMessage += `, ${failed} failed`;
        console.error('Email sending errors:', result.errors);
      }
      
      if (sent > 0) {
        toast.success(resultMessage, { id: toastId, duration: 5000 });
      } else if (failed > 0) {
        toast.error(resultMessage, { id: toastId, duration: 5000 });
      } else if (skipped > 0) {
        toast.error(resultMessage + ' - Check user email settings (sendToEmail must be true)', { id: toastId, duration: 7000 });
      } else {
        toast(resultMessage, { id: toastId, duration: 5000 });
      }
      
      setShowBroadcastModal(false);
    } catch (error) {
      console.error('Error sending broadcast email:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send broadcast email';
      toast.error(errorMessage, { id: toastId, duration: 5000 });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={handleBack}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                <p className="mt-2 text-gray-600">Manage users and permissions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {hasPermission('email_broadcast') && (
                <button
                  onClick={() => setShowBroadcastModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Mail className="w-5 h-5" />
                  Broadcast Email
                </button>
              )}
              <button
                onClick={handleCreateUser}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add User
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.fullName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {getPermissionNames(user.permissions)}
                          {user.permissions && user.permissions.length > 0 && 
                           getPermissionNames(user.permissions, Infinity).length > 50 && (
                            <button
                              onClick={() => handleViewAllPermissions(user)}
                              className="ml-2 text-blue-600 hover:text-blue-800 hover:underline text-xs"
                            >
                              View All
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyUser(user)}
                            className="text-green-600 hover:text-green-900"
                            title="Copy User"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSendResetPrompt(user)}
                            className="text-orange-500 hover:text-orange-700"
                            title="Send Reset Password Prompt"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit User"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowRoleManagement(true);
                            }}
                            className="text-purple-600 hover:text-purple-900"
                            title="Manage Permissions"
                          >
                            <Filter className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showAddUser && (
          <AddUserModal
            isOpen={showAddUser}
            onClose={() => setShowAddUser(false)}
            onSubmit={submitCreateUser}
          />
        )}

        {showEditUser && selectedUser && (
          <EditUserModal
            isOpen={showEditUser}
            onClose={() => {
              setShowEditUser(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
            onSubmit={handleUpdateUser}
          />
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-6 flex justify-center">
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchUsers(Math.max(1, pagination.current - 1), searchTerm)}
                disabled={pagination.current === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                Page {pagination.current} of {pagination.pages}
              </span>
              <button
                onClick={() => fetchUsers(Math.min(pagination.pages, pagination.current + 1), searchTerm)}
                disabled={pagination.current === pagination.pages}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showRoleManagement && (
        <RoleManagementModal
          user={selectedUser}
          permissions={permissions}
          onClose={() => setShowRoleManagement(false)}
          onSubmit={handleManagePermissions}
        />
      )}

      {showConfirmModal && (
        <ConfirmModal
          title={`${actionType === 'delete' ? 'Delete' : actionType === 'copy' ? 'Copy' : 'Reset Password'} User`}
          message={`Are you sure you want to ${actionType} ${selectedUser?.fullName}?`}
          onConfirm={confirmAction}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

      {/* Permissions View Modal */}
      {showPermissionsModal && selectedUser && (
        <BaseModal
          isOpen={showPermissionsModal}
          onClose={() => {
            setShowPermissionsModal(false);
            setSelectedUserPermissions([]);
          }}
          title={`Permissions - ${selectedUser.fullName}`}
        >
          <div className="space-y-4">
            {selectedUserPermissions.length === 0 ? (
              <p className="text-gray-500">No permissions assigned</p>
            ) : (
              <div className="space-y-2">
                {selectedUserPermissions.map((permission, index) => (
                  <div
                    key={permission._id || permission.id || index}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {permission.displayName || permission.name}
                        </h4>
                        {permission.description && (
                          <p className="text-xs text-gray-600 mt-1">
                            {permission.description}
                          </p>
                        )}
                        {permission.category && (
                          <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {permission.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowPermissionsModal(false);
                  setSelectedUserPermissions([]);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </BaseModal>
      )}

      {/* Broadcast Email Modal */}
      {showBroadcastModal && (
        <BroadcastEmailModal
          isOpen={showBroadcastModal}
          onClose={() => setShowBroadcastModal(false)}
          users={users}
          onSend={handleBroadcastEmail}
        />
      )}
    </div>
  );
};

export default UserManagementPage;

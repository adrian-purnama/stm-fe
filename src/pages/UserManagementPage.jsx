import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Trash2, Copy, Key, ArrowLeft } from 'lucide-react';
import Navigation from '../components/common/Navigation';
import axiosInstance from '../utils/api/ApiHelper';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/modals/ConfirmModal';
import RoleManagementModal from '../components/modals/RoleManagementModal';
import CustomDropdown from '../components/common/CustomDropdown';
import AddUserModal from '../components/modals/AddUserModal';


const UserManagementPage = () => {
  const navigate = useNavigate();
  
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
      setPagination(response.data?.pagination || { current: 1, pages: 1, total: 0 });
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
      setUsers([]); // Set empty array on error
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

  // Fetch users when search changes
  useEffect(() => {
    fetchUsers(1, searchTerm);
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


  const handleResetPassword = async (userId) => {
    const newPassword = prompt('Enter new password (minimum 6 characters):');
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      const resetToast = toast.loading('Resetting password...');
      await axiosInstance.post(`/api/auth/users/${userId}/reset-password`, {
        newPassword: newPassword
      });
      toast.success('Password reset successfully', { id: resetToast });
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password');
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

  const filteredUsers = (users || []).filter(user => {
    const matchesSearch = user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getPermissionNames = (userPermissions) => {
    if (!userPermissions || userPermissions.length === 0) return 'No permissions';
    return userPermissions.map(permission => permission.displayName).join(', ');
  };

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
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                <p className="mt-2 text-gray-600">Manage users and permissions</p>
              </div>
            </div>
            <button
              onClick={handleCreateUser}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add User
            </button>
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
                            onClick={() => handleResetPassword(user._id || user.id)}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Reset Password"
                          >
                            <Key className="w-4 h-4" />
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

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-6 flex justify-center">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, current: prev.current - 1 }))}
                disabled={pagination.current === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                Page {pagination.current} of {pagination.pages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, current: prev.current + 1 }))}
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
    </div>
  );
};

export default UserManagementPage;

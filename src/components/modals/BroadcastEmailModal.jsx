import React, { useState, useEffect, useMemo } from 'react';
import BaseModal from './BaseModal';
import { Check, X } from 'lucide-react';

const BroadcastEmailModal = ({ isOpen, onClose, users, onSend }) => {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setSelectedUsers([]);
      setSelectAll(false);
      setMessage('');
      setSubject('');
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredUsers = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];
    return users.filter(user => {
      const searchLower = searchTerm.toLowerCase();
      return (
        user.fullName?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
      );
    });
  }, [users, searchTerm]);

  useEffect(() => {
    if (selectAll) {
      setSelectedUsers(filteredUsers.map(u => u._id));
    } else {
      setSelectedUsers([]);
    }
  }, [selectAll, filteredUsers]);

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
    // Update selectAll if all filtered users are selected
    if (selectedUsers.length + 1 === filteredUsers.length) {
      setSelectAll(true);
    } else if (selectedUsers.length === filteredUsers.length) {
      setSelectAll(false);
    }
  };

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    if (newSelectAll) {
      setSelectedUsers(filteredUsers.map(u => u._id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSend = () => {
    if (!subject.trim()) {
      alert('Please enter a subject');
      return;
    }
    if (!message.trim()) {
      alert('Please enter a message');
      return;
    }
    if (selectedUsers.length === 0) {
      alert('Please select at least one user');
      return;
    }

    onSend({
      userIds: selectedUsers,
      subject: subject.trim(),
      message: message.trim()
    });
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Broadcast Email" size="lg">
      <div className="space-y-6">
        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter email subject"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your message"
            rows={6}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* User Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Select Recipients
            </label>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {selectedUsers.length} of {filteredUsers.length} selected
              </span>
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {selectAll ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* User List */}
          <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No users found
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredUsers.map((user) => {
                  const isSelected = selectedUsers.includes(user._id);
                  return (
                    <div
                      key={user._id}
                      onClick={() => handleUserToggle(user._id)}
                      className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                        isSelected ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {user.fullName}
                          </div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!subject.trim() || !message.trim() || selectedUsers.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send Email
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default BroadcastEmailModal;


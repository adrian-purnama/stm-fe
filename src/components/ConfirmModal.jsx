import React from 'react';
import { AlertTriangle } from 'lucide-react';
import BaseModal from './BaseModal';

const ConfirmModal = ({ title, message, onConfirm, onCancel, type = 'danger' }) => {
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case 'danger':
        return <AlertTriangle className="w-6 h-6 text-red-600" />;
      case 'info':
        return <AlertTriangle className="w-6 h-6 text-blue-600" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-red-600" />;
    }
  };

  const getButtonStyles = () => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700';
      default:
        return 'bg-red-600 hover:bg-red-700';
    }
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={onCancel}
      title={title}
      size="sm"
    >
      <div>
          <div className="flex items-start space-x-3">
            {getIcon()}
            <div className="flex-1">
              <p className="text-gray-700">{message}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-lg ${getButtonStyles()}`}
          >
            Confirm
          </button>
        </div>
    </BaseModal>
  );
};

export default ConfirmModal;

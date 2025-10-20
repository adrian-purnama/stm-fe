import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import BaseModal from './BaseModal';
import CustomDropdown from './CustomDropdown';
import axiosInstance from '../utils/ApiHelper';
import toast from 'react-hot-toast';

const StatusUpdateModal = ({ isOpen, onClose, quotation, onUpdate }) => {
  const [formData, setFormData] = useState({
    status: {
      type: '',
      reason: ''
    }
  });
  const [loading, setLoading] = useState(false);

  // Initialize form data with current quotation status when modal opens
  useEffect(() => {
    if (quotation && isOpen) {
      setFormData({
        status: {
          type: quotation.status?.type || 'open',
          reason: quotation.status?.reason || ''
        }
      });
    }
  }, [quotation, isOpen]);

  const handleStatusChange = (statusType) => {
    setFormData(prev => ({
      ...prev,
      status: {
        type: statusType,
        reason: ''
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        status: formData.status
      };

      // Add reason data for close/loss statuses
      if (['close', 'loss'].includes(formData.status.type)) {
        if (!formData.status.reason) {
          toast.error('Please select a reason');
          setLoading(false);
          return;
        }
      }


      const response = await axiosInstance.patch(`/api/quotations/${quotation._id}/status`, updateData);

      if (response.data.success) {
        toast.success('Quotation status updated successfully!');
        onUpdate(response.data.data.quotation);
        onClose();
        setFormData({
          status: {
            type: '',
            reason: ''
          }
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'open', label: 'Open' },
    { value: 'close', label: 'Closed' },
    { value: 'loss', label: 'Lost' },
    { value: 'win', label: 'Won' }
  ];

  const closeReasonOptions = [
    { value: 'spek_berubah', label: 'Specification Changed' },
    { value: 'scope_berubah', label: 'Scope Changed' },
    { value: 'custom_close', label: 'Custom Reason' }
  ];

  const lossReasonOptions = [
    { value: 'harga', label: 'Price' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'not_followed_up', label: 'Not Followed Up' },
    { value: 'custom_loss', label: 'Custom Reason' }
  ];

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Update Quotation Status">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <CustomDropdown
            options={statusOptions}
            value={formData.status.type}
            onChange={(value) => handleStatusChange(value)}
            placeholder="Select status"
            required
          />
        </div>

        {formData.status.type && ['close', 'loss'].includes(formData.status.type) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason Type
            </label>
            <CustomDropdown
              options={formData.status.type === 'close' ? closeReasonOptions : lossReasonOptions}
              value={formData.status.reason}
              onChange={(value) => setFormData(prev => ({ 
                ...prev, 
                status: { ...prev.status, reason: value }
              }))}
              placeholder="Select reason"
              required
            />
          </div>
        )}

        {formData.status.reason && formData.status.reason.includes('custom') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Reason
            </label>
            <input
              type="text"
              required
              value={formData.status.reason}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                status: { ...prev.status, reason: e.target.value }
              }))}
              placeholder="Enter custom reason"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
            />
          </div>
        )}


        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center gap-2"
          >
            <X size={16} />
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !formData.status}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {loading ? 'Updating...' : 'Update Status'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default StatusUpdateModal;

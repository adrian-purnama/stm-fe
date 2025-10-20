import { useState } from 'react';
import BaseModal from './BaseModal';
import CustomDropdown from './CustomDropdown';
import toast from 'react-hot-toast';

const RequestRFQModal = ({ isOpen, onClose, onSubmit, approvers }) => {
  const [formData, setFormData] = useState({
    title: '',
    approverId: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

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

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.approverId) {
      newErrors.approverId = 'Please select an approver';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors below');
      return;
    }
    
    setLoading(true);
    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        title: '',
        approverId: '',
        description: ''
      });
      setErrors({});
    } catch (error) {
      console.error('Error submitting RFQ:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        title: '',
        approverId: '',
        description: ''
      });
      setErrors({});
      onClose();
    }
  };

  // Prepare approver options for CustomDropdown
  const approverOptions = approvers.map(approver => ({
    value: approver._id,
    label: `${approver.fullName || approver.email} (${approver.email})`
  }));

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title="Request Quotation">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title Field */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter RFQ title"
            disabled={loading}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title}</p>
          )}
        </div>

        {/* Approver Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Approver <span className="text-red-500">*</span>
          </label>
          <CustomDropdown
            options={approverOptions}
            value={formData.approverId}
            onChange={(value) => handleInputChange('approverId', value)}
            placeholder="Select an approver"
            disabled={loading}
            error={errors.approverId}
          />
          {errors.approverId && (
            <p className="mt-1 text-sm text-red-600">{errors.approverId}</p>
          )}
        </div>

        {/* Description Field */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter additional details (optional)"
            disabled={loading}
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Submitting...
              </div>
            ) : (
              'Submit RFQ'
            )}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default RequestRFQModal;


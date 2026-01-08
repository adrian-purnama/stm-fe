import { useState, useEffect, useMemo } from 'react';
import { X, Save } from 'lucide-react';
import BaseModal from './BaseModal';
import CustomDropdown from '../common/CustomDropdown';
import axiosInstance from '../../utils/api/ApiHelper';
import toast from 'react-hot-toast';

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const ROMAN_MONTH_OPTIONS = ROMAN_MONTHS.map((month) => ({ value: month, label: month }));

const SPK_TAX_OPTIONS = [
  { value: 'P', label: 'P', description: 'P is pajak' },
  { value: '-', label: '""', description: 'Empty is non pajak' },
  { value: 'KBS', label: 'KBS', description: 'KBS is non pajak khusus non CV KBS' }
];

const getCurrentRomanMonthMeta = () => {
  const now = new Date();
  return {
    roman: ROMAN_MONTHS[now.getMonth()],
    year: String(now.getFullYear())
  };
};

const resolveSpkCodeValue = (type) => {
  const normalized = (type || '').toString().trim().toUpperCase();
  if (normalized === '-' || normalized === '""' || normalized === '') return '-';
  if (normalized === 'P') return 'P';
  if (normalized === 'KBS') return 'KBS';
  return '-';
};

const buildOcPreview = (sequence, monthRoman, year, isRange = false, endSequence = '') => {
  if (!sequence) return 'Not set';
  const roman = (monthRoman || getCurrentRomanMonthMeta().roman).toUpperCase();
  const normalizedYear = year || getCurrentRomanMonthMeta().year;
  if (isRange && endSequence) {
    return `${sequence} - ${endSequence}/${roman}/${normalizedYear}`;
  }
  return `${sequence}/${roman}/${normalizedYear}`;
};

const buildSpkPreview = (sequence, monthRoman, type, year, isRange = false, endSequence = '') => {
  if (!sequence) return 'Not set';
  const roman = (monthRoman || getCurrentRomanMonthMeta().roman).toUpperCase();
  const normalizedYear = year || getCurrentRomanMonthMeta().year;
  const codeValue = resolveSpkCodeValue(type);
  const displayCode = codeValue === '-' ? '' : codeValue;
  if (isRange && endSequence) {
    return `${sequence} - ${endSequence}/${roman}/${displayCode}/${normalizedYear}`;
  }
  return `${sequence}/${roman}/${displayCode}/${normalizedYear}`;
};

const StatusUpdateModal = ({ isOpen, onClose, quotation, onUpdate }) => {
  const [formData, setFormData] = useState({
    status: {
      type: '',
      reason: ''
    },
    ocSequence: '',
    ocSequenceEnd: '',
    ocMonthRoman: ROMAN_MONTHS[new Date().getMonth()],
    ocYear: String(new Date().getFullYear()),
    spkSequence: '',
    spkSequenceEnd: '',
    spkType: '-',
    spkMonthRoman: ROMAN_MONTHS[new Date().getMonth()],
    spkYear: String(new Date().getFullYear())
  });
  const [loading, setLoading] = useState(false);

  // Get quotation identifier (_id or quotationNumber) from quotation object (handle different structures)
  const quotationIdentifier = useMemo(() => {
    if (!quotation) return null;
    // Prefer quotationNumber if available, otherwise use _id
    // Try different possible structures
    return quotation.quotationNumber || 
           quotation.header?.quotationNumber || 
           quotation.header?._id ||
           quotation._id ||
           null;
  }, [quotation]);

  // Initialize form data with current quotation status when modal opens
  useEffect(() => {
    if (quotation && isOpen) {
      const status = quotation.status || quotation.header?.status;
      const header = quotation.header || quotation;
      const currentMeta = getCurrentRomanMonthMeta();
      
      // Parse OC number if exists (support range format: "10 - 100/XII/2025" or "10/XII/2025")
      // Also check ocSequenceNumber which might already be in range format "10 - 100"
      let ocSequence = '';
      let ocSequenceEnd = '';
      
      // First check ocSequenceNumber (might be "10 - 100" or "10")
      if (header.ocSequenceNumber) {
        const sequencePart = header.ocSequenceNumber.toString().trim();
        const rangeMatch = sequencePart.match(/^(\d+)\s*-\s*(\d+)$/);
        if (rangeMatch) {
          ocSequence = rangeMatch[1];
          ocSequenceEnd = rangeMatch[2];
        } else {
          ocSequence = sequencePart;
        }
      } else if (header.ocNumber) {
        // Fallback to parsing from ocNumber
        const ocParts = header.ocNumber.split('/');
        if (ocParts[0]) {
          const sequencePart = ocParts[0].trim();
          const rangeMatch = sequencePart.match(/^(\d+)\s*-\s*(\d+)$/);
          if (rangeMatch) {
            ocSequence = rangeMatch[1];
            ocSequenceEnd = rangeMatch[2];
          } else {
            ocSequence = sequencePart;
          }
        }
      }
      
      // Parse SPK number if exists (support range format)
      // Also check spkSequenceNumber which might already be in range format "10 - 100"
      let spkSequence = '';
      let spkSequenceEnd = '';
      
      // First check spkSequenceNumber (might be "10 - 100" or "10")
      if (header.spkSequenceNumber) {
        const sequencePart = header.spkSequenceNumber.toString().trim();
        const rangeMatch = sequencePart.match(/^(\d+)\s*-\s*(\d+)$/);
        if (rangeMatch) {
          spkSequence = rangeMatch[1];
          spkSequenceEnd = rangeMatch[2];
        } else {
          spkSequence = sequencePart;
        }
      } else if (header.spkNumber) {
        // Fallback to parsing from spkNumber
        const spkParts = header.spkNumber.split('/');
        if (spkParts[0]) {
          const sequencePart = spkParts[0].trim();
          const rangeMatch = sequencePart.match(/^(\d+)\s*-\s*(\d+)$/);
          if (rangeMatch) {
            spkSequence = rangeMatch[1];
            spkSequenceEnd = rangeMatch[2];
          } else {
            spkSequence = sequencePart;
          }
        }
      }
      
      setFormData({
        status: {
          type: status?.type || 'open',
          reason: status?.reason || ''
        },
        ocSequence: ocSequence || '',
        ocSequenceEnd: ocSequenceEnd || '',
        ocMonthRoman: header.ocMonthRoman || currentMeta.roman,
        ocYear: header.ocYear ? String(header.ocYear) : currentMeta.year,
        spkSequence: spkSequence || '',
        spkSequenceEnd: spkSequenceEnd || '',
        spkType: header.spkCode ? (header.spkCode === 'P' ? 'P' : header.spkCode === 'KBS' ? 'KBS' : '-') : '-',
        spkMonthRoman: header.spkMonthRoman || currentMeta.roman,
        spkYear: header.spkYear ? String(header.spkYear) : currentMeta.year
      });
    }
  }, [quotation, isOpen]);

  const handleStatusChange = (statusType) => {
    const currentMeta = getCurrentRomanMonthMeta();
    setFormData(prev => ({
      ...prev,
      status: {
        type: statusType,
        reason: ''
      },
      // Clear OC/SPK if status is not win
      ...(statusType !== 'win' ? {
        ocSequence: '',
        ocSequenceEnd: '',
        spkSequence: '',
        spkSequenceEnd: ''
      } : {
        // Initialize with current month/year if win
        ocMonthRoman: prev.ocMonthRoman || currentMeta.roman,
        ocYear: prev.ocYear || currentMeta.year,
        spkMonthRoman: prev.spkMonthRoman || currentMeta.roman,
        spkYear: prev.spkYear || currentMeta.year
      })
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Backend expects status and reason as top-level fields, not nested
      const updateData = {
        status: formData.status.type,
        reason: formData.status.reason || ''
      };

      // Add reason data for close/loss statuses
      if (['close', 'loss'].includes(formData.status.type)) {
        if (!formData.status.reason) {
          toast.error('Please select a reason');
          setLoading(false);
          return;
        }
      }

      // Add OC and SPK data for win status
      if (formData.status.type === 'win') {
        const currentMeta = getCurrentRomanMonthMeta();
        
        // Handle OC number (single or range)
        const ocSequenceTrimmed = (formData.ocSequence || '').trim();
        if (ocSequenceTrimmed) {
          // If range is provided, send both start and end
          if (formData.ocSequenceEnd && formData.ocSequenceEnd.trim()) {
            updateData.ocSequenceNumber = `${ocSequenceTrimmed} - ${formData.ocSequenceEnd.trim()}`;
          } else {
            updateData.ocSequenceNumber = ocSequenceTrimmed;
          }
          updateData.ocMonthRoman = (formData.ocMonthRoman || currentMeta.roman).toUpperCase();
          updateData.ocYear = Number(formData.ocYear || currentMeta.year);
        } else {
          updateData.ocSequenceNumber = '';
        }

        // Handle SPK number (single or range)
        const spkSequenceTrimmed = (formData.spkSequence || '').trim();
        if (spkSequenceTrimmed) {
          // If range is provided, send both start and end
          if (formData.spkSequenceEnd && formData.spkSequenceEnd.trim()) {
            updateData.spkSequenceNumber = `${spkSequenceTrimmed} - ${formData.spkSequenceEnd.trim()}`;
          } else {
            updateData.spkSequenceNumber = spkSequenceTrimmed;
          }
          updateData.spkLetterCode = resolveSpkCodeValue(formData.spkType);
          updateData.spkMonthRoman = (formData.spkMonthRoman || currentMeta.roman).toUpperCase();
          updateData.spkYear = Number(formData.spkYear || currentMeta.year);
        } else {
          updateData.spkSequenceNumber = '';
          updateData.spkLetterCode = '';
        }
      }

      // Use quotationIdentifier (_id or quotationNumber) - backend can handle both
      if (!quotationIdentifier) {
        toast.error('Quotation identifier not found');
        setLoading(false);
        return;
      }

      const response = await axiosInstance.patch(`/api/quotations/${encodeURIComponent(quotationIdentifier)}/status`, updateData);

      // Backend returns: { success: true, data: updatedHeader }
      if (response.data && response.data.success) {
        toast.success('Quotation status updated successfully!');
        
        // Backend returns the updated header directly in response.data.data
        // Call onUpdate if provided, passing the updated header data
        if (onUpdate && response.data.data) {
          try {
            onUpdate(response.data.data);
          } catch (updateError) {
            console.error('Error in onUpdate callback:', updateError);
            // Don't throw - we still want to close the modal even if onUpdate fails
          }
        }
        
        // Reset form
        const currentMeta = getCurrentRomanMonthMeta();
        setFormData({
          status: {
            type: '',
            reason: ''
          },
          ocSequence: '',
          ocSequenceEnd: '',
          ocMonthRoman: currentMeta.roman,
          ocYear: currentMeta.year,
          spkSequence: '',
          spkSequenceEnd: '',
          spkType: '-',
          spkMonthRoman: currentMeta.roman,
          spkYear: currentMeta.year
        });
        
        // Reset loading state BEFORE closing modal to prevent stuck loading state
        setLoading(false);
        
        // Close modal - use setTimeout to ensure state updates are processed
        setTimeout(() => {
          onClose();
        }, 0);
      } else {
        // If response is not successful, show error
        toast.error(response.data?.message || 'Failed to update status');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
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
    { value: 'no_feedback', label: 'No Feedback' },
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

        {formData.status.type === 'win' && (
          <div className="border border-green-200 bg-green-50/40 rounded-lg p-5 space-y-5">
            {/* Order Confirmation Number */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-800">
                  Order Confirmation Number
                </label>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Single or Range
                </span>
              </div>
              
              {/* Number Range Input */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Sequence Number
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Start Number *</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.ocSequence}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, '');
                        setFormData(prev => ({
                          ...prev,
                          ocSequence: digitsOnly
                        }));
                      }}
                      placeholder="e.g., 10"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div className="flex items-center pt-6">
                    <span className="text-lg font-semibold text-gray-400">-</span>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">End Number (Optional)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.ocSequenceEnd}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, '');
                        setFormData(prev => ({
                          ...prev,
                          ocSequenceEnd: digitsOnly
                        }));
                      }}
                      placeholder="e.g., 100"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 italic">
                  💡 Leave end empty for single number (e.g., 10), or enter end for range (e.g., 10-100)
                </p>
              </div>

              {/* Month and Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                    Month (Roman)
                  </label>
                  <CustomDropdown
                    options={ROMAN_MONTH_OPTIONS}
                    value={formData.ocMonthRoman}
                    onChange={(value) =>
                      setFormData(prev => ({
                        ...prev,
                        ocMonthRoman: (value || prev.ocMonthRoman || getCurrentRomanMonthMeta().roman).toUpperCase()
                      }))
                    }
                    placeholder="Select month"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                    Year
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.ocYear}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, '');
                      setFormData(prev => ({
                        ...prev,
                        ocYear: digitsOnly
                      }));
                    }}
                    placeholder="e.g., 2025"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-blue-700">Preview:</span>
                  <span className="text-sm font-bold text-blue-900">
                    {buildOcPreview(
                      formData.ocSequence,
                      formData.ocMonthRoman,
                      formData.ocYear,
                      !!formData.ocSequenceEnd,
                      formData.ocSequenceEnd
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* SPK Number */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-800">
                  SPK Number
                </label>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Single or Range
                </span>
              </div>

              {/* Number Range Input */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Sequence Number
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Start Number *</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.spkSequence}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, '');
                        setFormData(prev => ({
                          ...prev,
                          spkSequence: digitsOnly
                        }));
                      }}
                      placeholder="e.g., 10"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div className="flex items-center pt-6">
                    <span className="text-lg font-semibold text-gray-400">-</span>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">End Number (Optional)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.spkSequenceEnd}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, '');
                        setFormData(prev => ({
                          ...prev,
                          spkSequenceEnd: digitsOnly
                        }));
                      }}
                      placeholder="e.g., 100"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 italic">
                  💡 Leave end empty for single number (e.g., 10), or enter end for range (e.g., 10-100)
                </p>
              </div>

              {/* Month and Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                    Month (Roman)
                  </label>
                  <CustomDropdown
                    options={ROMAN_MONTH_OPTIONS}
                    value={formData.spkMonthRoman}
                    onChange={(value) =>
                      setFormData(prev => ({
                        ...prev,
                        spkMonthRoman: (value || prev.spkMonthRoman || getCurrentRomanMonthMeta().roman).toUpperCase()
                      }))
                    }
                    placeholder="Select month"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                    Year
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.spkYear}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, '');
                      setFormData(prev => ({
                        ...prev,
                        spkYear: digitsOnly
                      }));
                    }}
                    placeholder="e.g., 2025"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* SPK Classification */}
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                  SPK Classification
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {SPK_TAX_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex flex-col rounded-lg border-2 px-4 py-3 text-sm transition cursor-pointer ${
                        formData.spkType === option.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center gap-2 mb-1">
                        <input
                          type="radio"
                          name="spkType"
                          value={option.value}
                          checked={formData.spkType === option.value}
                          onChange={() =>
                            setFormData(prev => ({
                              ...prev,
                              spkType: option.value
                            }))
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-semibold">{option.label}</span>
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        {option.description}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-purple-700">Preview:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-purple-900">
                      {buildSpkPreview(
                        formData.spkSequence,
                        formData.spkMonthRoman,
                        formData.spkType,
                        formData.spkYear,
                        !!formData.spkSequenceEnd,
                        formData.spkSequenceEnd
                      )}
                    </span>
                    {formData.spkType === 'P' && (
                      <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded">Pajak</span>
                    )}
                    {formData.spkType === '-' && (
                      <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded">Non pajak</span>
                    )}
                    {formData.spkType === 'KBS' && (
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">Non pajak khusus</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
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

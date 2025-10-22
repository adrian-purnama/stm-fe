import React, { useState, useEffect } from 'react';
import {
  Search,
  Eye,
  Edit,
  Trash2,
  Plus,
  Calendar,
  User,
  Building,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Star,
  Filter,
  FileDown,
  X,
  Save
} from 'lucide-react';
import { Tooltip } from 'react-tooltip';
import toast from 'react-hot-toast';
import ApiHelper from '../../utils/ApiHelper';
import { formatPriceWithCurrency } from '../../utils/priceFormatter';
import CustomDropdown from '../CustomDropdown';
import BaseModal from '../BaseModal';
import { QUOTATION_FORM_MODES } from './quotationModes';
import { 
  updatePreferences, 
  getSectionPreferences,
  PREFERENCE_SECTIONS 
} from '../../utils/UserPreferences';

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'open', label: 'Open' },
  { value: 'win', label: 'Win' },
  { value: 'loss', label: 'Loss' },
  { value: 'close', label: 'Close' }
];

// Predefined reasons for loss and close statuses
const LOSS_REASONS = [
  { value: 'harga', label: 'Harga' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'notfollowedup', label: 'Not Followed Up' },
  { value: 'custom', label: 'Custom' }
];

const CLOSE_REASONS = [
  { value: 'project_canceled', label: 'Project Canceled' },
  { value: 'change_specification', label: 'Change Specification' },
  { value: 'custom', label: 'Custom' }
];

const statusClassMap = {
  open: 'bg-blue-100 text-blue-800',
  win: 'bg-green-100 text-green-800',
  loss: 'bg-red-100 text-red-800',
  close: 'bg-gray-100 text-gray-800'
};

const QuotationList = ({ onView, onPreview, onEdit, onCreate, onDelete, showCreateButton = false }) => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    customer: '',
    marketing: '',
    startDate: '',
    endDate: ''
  });
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    header: null,
    offers: []
  });
  const [statusForm, setStatusForm] = useState({
    status: '',
    reason: '',
    selectedOfferId: '',
    selectedItemIds: [],
    customReason: ''
  });
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [progressInputs, setProgressInputs] = useState({});
  const [editingProgress, setEditingProgress] = useState({});
  
  // User preferences state
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(true);
  const [favoriteStatuses, setFavoriteStatuses] = useState(['open']);

  // Load user preferences on component mount
  useEffect(() => {
    const preferences = getSectionPreferences(PREFERENCE_SECTIONS.QUOTATIONS);
    setIsFilterCollapsed(preferences.isFilterCollapsed ?? true);
    setFavoriteStatuses(preferences.favoriteStatuses ?? ['open']);
  }, []);

  useEffect(() => {
    if (pagination && pagination.current) {
      fetchQuotations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination?.current, JSON.stringify(filters)]);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination?.current || 1,
        limit: 10,
        ...filters
      };

      // Remove empty filters
      Object.keys(params).forEach((key) => {
        if (params[key] === '') {
          delete params[key];
        }
      });

      const response = await ApiHelper.get('/api/quotations', { params });
      setQuotations(Array.isArray(response.data.data) ? response.data.data : []);
      setPagination(response.data.pagination || { current: 1, pages: 1, total: 0 });
    } catch (error) {
      toast.error('Failed to fetch quotations');
      console.error('Error fetching quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value
    }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > pagination.pages) return;
    setPagination((prev) => ({ ...prev, current: page }));
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const openStatusModal = (header, offers) => {
    setStatusModal({
      isOpen: true,
      header,
      offers
    });
    setStatusForm({
      status: header?.status?.type || 'open',
      reason: header?.status?.reason || '',
      selectedOfferId: header?.selectedOfferId || (offers.length === 1 ? (offers[0].original?._id || offers[0]._id) : '')
    });
  };

  const closeStatusModal = () => {
    setStatusModal({ isOpen: false, header: null, offers: [] });
    setStatusForm({ status: '', reason: '', selectedOfferId: '', customReason: '' });
  };

  const handleStatusChange = (newStatus) => {
    setStatusForm(prev => {
      const updated = { ...prev, status: newStatus };
      
      // Clear reason and customReason when status changes to open
      if (newStatus === 'open') {
        updated.reason = '';
        updated.customReason = '';
      }
      
      // Clear selectedOfferId when status is not 'win'
      if (newStatus !== 'win') {
        updated.selectedOfferId = '';
      }
      
      return updated;
    });
  };

  const clearProgressForQuotation = (quotationNumber) => {
    setQuotations(prev => {
      const newQuotations = [...prev];
      const quotationIndex = newQuotations.findIndex(q => q.header.quotationNumber === quotationNumber);
      if (quotationIndex !== -1) {
        newQuotations[quotationIndex] = {
          ...newQuotations[quotationIndex],
          header: {
            ...newQuotations[quotationIndex].header,
            progress: []
          }
        };
      }
      return newQuotations;
    });
  };

  const handleStatusUpdate = async () => {
    try {
      setStatusUpdateLoading(true);
      const { status, reason, selectedOfferId, selectedItemIds, customReason } = statusForm;
      const { header, offers } = statusModal;

      if (!status) {
        toast.error('Please choose a status');
        return;
      }

      if ((status === 'loss' || status === 'close') && !reason.trim()) {
        toast.error('Reason is required for loss/close status');
        return;
      }

      if ((status === 'loss' || status === 'close') && reason === 'custom' && !customReason.trim()) {
        toast.error('Please enter a custom reason');
        return;
      }

      // Count total offers (original + revisions) for validation
      const totalOffers = offers.reduce((count, offerGroup) => {
        if (offerGroup.original) {
          return count + 1 + offerGroup.revisions.length;
        }
        return count + 1;
      }, 0);

      const winningOfferId = selectedOfferId || (offers[0]?.original?._id || offers[0]?._id);
      if (status === 'win' && totalOffers > 1 && !winningOfferId) {
        toast.error('Please pick the winning offer');
        return;
      }

      // For win status, validate item selection if the offer has multiple items
      if (status === 'win' && winningOfferId) {
        // Find the selected offer and its items
        let selectedOfferItems = [];
        offers.forEach((offerGroup) => {
          if (offerGroup.original && offerGroup.original._id === winningOfferId) {
            selectedOfferItems = offerGroup.original.offerItems || [];
          } else if (offerGroup.revisions) {
            const revision = offerGroup.revisions.find(rev => rev._id === winningOfferId);
            if (revision) {
              selectedOfferItems = revision.offerItems || [];
            }
          }
        });

        if (selectedOfferItems.length > 1 && (selectedItemIds?.length || 0) === 0) {
          toast.error('Please select at least one winning item');
          return;
        }
      }

      // Determine the final reason to send
      let finalReason = reason;
      if (reason === 'custom') {
        finalReason = customReason;
      }

      const payload = {
        status,
        reason: finalReason.trim() || undefined,
        selectedOfferId: status === 'win' ? winningOfferId : undefined,
        selectedOfferItemIds: status === 'win' ? (selectedItemIds || []) : undefined
      };

      await ApiHelper.patch(`/api/quotations/${encodeURIComponent(header.quotationNumber)}/status`, payload);
      
      // Clear progress if changing from 'win' to other status
      if (header.status?.type === 'win' && status !== 'win') {
        clearProgressForQuotation(header.quotationNumber);
      }
      
      toast.success('Status updated successfully');
      closeStatusModal();
      fetchQuotations();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleFollowUpQuotation = async (header) => {
    try {
      await ApiHelper.patch(`/api/quotations/${encodeURIComponent(header.quotationNumber)}/follow-up`);
      toast.success('Follow-up date recorded');
      fetchQuotations();
    } catch (error) {
      toast.error('Failed to update follow-up date');
      console.error('Error updating follow-up:', error);
    }
  };

  const handleDeleteOffer = async (offer, quotationNumber) => {
    if (window.confirm(`Are you sure you want to delete offer ${offer.offerNumber}?`)) {
      try {
        await ApiHelper.delete(`/api/quotations/${encodeURIComponent(quotationNumber)}/offers/${offer._id}`);
        toast.success('Quotation offer deleted successfully');
        fetchQuotations();
        onDelete && onDelete(offer);
      } catch {
        toast.error('Failed to delete quotation offer');
      }
    }
  };

  const handleDeleteQuotation = async (header) => {
    if (window.confirm(`Are you sure you want to delete the entire quotation ${header.quotationNumber}? This will delete all offers within this quotation.`)) {
      try {
        await ApiHelper.delete(`/api/quotations/${encodeURIComponent(header.quotationNumber)}`);
        toast.success('Quotation deleted successfully');
        fetchQuotations();
        onDelete && onDelete(header);
      } catch {
        toast.error('Failed to delete quotation');
      }
    }
  };

  const handleAddProgress = async (quotationNumber) => {
    const progressText = progressInputs[quotationNumber];
    if (!progressText || !progressText.trim()) {
      toast.error('Please enter progress text');
      return;
    }

    // Optimistically update the UI
    const newProgressEntry = progressText.trim();
    setQuotations(prev => {
      const newQuotations = [...prev];
      const quotationIndex = newQuotations.findIndex(q => q.header.quotationNumber === quotationNumber);
      if (quotationIndex !== -1) {
        newQuotations[quotationIndex] = {
          ...newQuotations[quotationIndex],
          header: {
            ...newQuotations[quotationIndex].header,
            progress: [...(newQuotations[quotationIndex].header.progress || []), newProgressEntry]
          }
        };
      }
      return newQuotations;
    });

    // Clear the input immediately
    setProgressInputs(prev => ({ ...prev, [quotationNumber]: '' }));

    try {
      await ApiHelper.post(
        `/api/quotations/${encodeURIComponent(quotationNumber)}/progress`,
        { progress: newProgressEntry }
      );
      toast.success('Progress added successfully');
    } catch (error) {
      // Revert optimistic update on error
      setQuotations(prev => {
        const newQuotations = [...prev];
        const quotationIndex = newQuotations.findIndex(q => q.header.quotationNumber === quotationNumber);
        if (quotationIndex !== -1) {
          newQuotations[quotationIndex] = {
            ...newQuotations[quotationIndex],
            header: {
              ...newQuotations[quotationIndex].header,
              progress: (newQuotations[quotationIndex].header.progress || []).slice(0, -1)
            }
          };
        }
        return newQuotations;
      });
      // Restore input text
      setProgressInputs(prev => ({ ...prev, [quotationNumber]: progressText }));
      toast.error(error.response?.data?.message || 'Failed to add progress');
    }
  };

  const handleEditProgress = (quotationNumber, index, currentText) => {
    setEditingProgress(prev => ({
      ...prev,
      [`${quotationNumber}-${index}`]: currentText
    }));
  };

  const handleSaveProgress = async (quotationNumber, index) => {
    const progressText = editingProgress[`${quotationNumber}-${index}`];
    if (!progressText || !progressText.trim()) {
      toast.error('Please enter progress text');
      return;
    }

    // Optimistically update the UI
    setQuotations(prev => {
      const newQuotations = [...prev];
      const quotationIndex = newQuotations.findIndex(q => q.header.quotationNumber === quotationNumber);
      if (quotationIndex !== -1) {
        const currentProgress = newQuotations[quotationIndex].header.progress || [];
        const newProgress = [...currentProgress];
        newProgress[index] = progressText.trim();
        newQuotations[quotationIndex] = {
          ...newQuotations[quotationIndex],
          header: {
            ...newQuotations[quotationIndex].header,
            progress: newProgress
          }
        };
      }
      return newQuotations;
    });

    // Clear editing state
    setEditingProgress(prev => {
      const newState = { ...prev };
      delete newState[`${quotationNumber}-${index}`];
      return newState;
    });

    try {
      // Note: The new API doesn't support updating individual progress entries
      // We'll need to implement this differently or remove this functionality
      toast.error('Progress editing not supported in new API structure');
      toast.success('Progress updated successfully');
    } catch (error) {
      // Revert optimistic update on error
      setQuotations(prev => {
        const newQuotations = [...prev];
        const quotationIndex = newQuotations.findIndex(q => q.header.quotationNumber === quotationNumber);
        if (quotationIndex !== -1) {
          const currentProgress = newQuotations[quotationIndex].header.progress || [];
          const newProgress = [...currentProgress];
          newProgress[index] = (quotations || []).find(q => q.header.quotationNumber === quotationNumber)?.header.progress?.[index] || '';
          newQuotations[quotationIndex] = {
            ...newQuotations[quotationIndex],
            header: {
              ...newQuotations[quotationIndex].header,
              progress: newProgress
            }
          };
        }
        return newQuotations;
      });
      // Restore editing state
      setEditingProgress(prev => ({
        ...prev,
        [`${quotationNumber}-${index}`]: progressText
      }));
      toast.error(error.response?.data?.message || 'Failed to update progress');
    }
  };

  const handleDeleteProgress = async (quotationNumber, index) => {
    if (!window.confirm('Are you sure you want to delete this progress entry?')) {
      return;
    }

    // Store the deleted item for potential rollback
    const deletedItem = (quotations || []).find(q => q.header.quotationNumber === quotationNumber)?.header.progress?.[index];

    // Optimistically update the UI
    setQuotations(prev => {
      const newQuotations = [...prev];
      const quotationIndex = newQuotations.findIndex(q => q.header.quotationNumber === quotationNumber);
      if (quotationIndex !== -1) {
        newQuotations[quotationIndex] = {
          ...newQuotations[quotationIndex],
          header: {
            ...newQuotations[quotationIndex].header,
            progress: (newQuotations[quotationIndex].header.progress || []).filter((_, i) => i !== index)
          }
        };
      }
      return newQuotations;
    });

    try {
      // Note: The new API doesn't support deleting individual progress entries
      // We'll need to implement this differently or remove this functionality
      toast.error('Progress deletion not supported in new API structure');
      toast.success('Progress deleted successfully');
    } catch (error) {
      // Revert optimistic update on error
      setQuotations(prev => {
        const newQuotations = [...prev];
        const quotationIndex = newQuotations.findIndex(q => q.header.quotationNumber === quotationNumber);
        if (quotationIndex !== -1) {
          const currentProgress = newQuotations[quotationIndex].header.progress || [];
          newQuotations[quotationIndex] = {
            ...newQuotations[quotationIndex],
            header: {
              ...newQuotations[quotationIndex].header,
              progress: [
                ...currentProgress.slice(0, index),
                deletedItem,
                ...currentProgress.slice(index)
              ]
            }
          };
        }
        return newQuotations;
      });
      toast.error(error.response?.data?.message || 'Failed to delete progress');
    }
  };

  // Handle filter collapse toggle
  const handleToggleFilterCollapse = () => {
    const newCollapsed = !isFilterCollapsed;
    setIsFilterCollapsed(newCollapsed);
    updatePreferences(PREFERENCE_SECTIONS.QUOTATIONS, {
      isFilterCollapsed: newCollapsed
    });
  };

  // Handle favorite status toggle
  const handleToggleFavoriteStatus = (status) => {
    const newFavorites = favoriteStatuses.includes(status)
      ? favoriteStatuses.filter(s => s !== status)
      : [...favoriteStatuses, status];
    
    setFavoriteStatuses(newFavorites);
    updatePreferences(PREFERENCE_SECTIONS.QUOTATIONS, {
      favoriteStatuses: newFavorites
    });
  };

  // Handle quick filter by favorite status
  const handleQuickFilterByStatus = (status) => {
    setFilters(prev => ({
      ...prev,
      status: status
    }));
  };

  const renderPagination = () => {
    if (pagination.pages <= 1) return null;

    const pages = [];
    for (let i = 1; i <= pagination.pages; i += 1) {
      if (i === 1 || i === pagination.pages || (i >= (pagination.current || 1) - 1 && i <= (pagination.current || 1) + 1)) {
        pages.push(
          <button
            key={i}
            onClick={() => handlePageChange(i)}
            className={`px-3 py-1 border rounded-md text-sm font-medium ${
              i === (pagination.current || 1)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {i}
          </button>
        );
      } else if (i === (pagination.current || 1) - 2 || i === (pagination.current || 1) + 2) {
        pages.push(
          <span key={`ellipsis-${i}`} className="px-2 text-gray-500">
            ...
          </span>
        );
      }
    }

    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={() => handlePageChange((pagination.current || 1) - 1)}
          disabled={(pagination.current || 1) === 1}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-600 disabled:opacity-50"
        >
          Previous
        </button>
        {pages}
        <button
          onClick={() => handlePageChange((pagination.current || 1) + 1)}
          disabled={(pagination.current || 1) === pagination.pages}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-600 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Quotations</h2>
        {showCreateButton && (
          <button
            onClick={onCreate}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Quotation
          </button>
        )}
      </div>

      {/* Filter Header with Favorites */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        {/* Filter Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleToggleFilterCollapse}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Filter className="h-5 w-5" />
              <span className="font-medium">Filters</span>
              {isFilterCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
          </div>
          
          {/* Favorite Status Quick Filters - Only show favorited statuses */}
          {favoriteStatuses.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 mr-2">Quick Filter:</span>
              {favoriteStatuses.map((statusValue) => {
                const status = statusOptions.find(s => s.value === statusValue);
                if (!status) return null;
                
                return (
                  <button
                    key={status.value}
                    onClick={() => handleQuickFilterByStatus(status.value)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      filters.status === status.value
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status.label}
                  </button>
                );
              })}
              <button
                onClick={() => handleQuickFilterByStatus('')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filters.status === ''
                    ? 'bg-gray-200 text-gray-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
            </div>
          )}
        </div>

        {/* Collapsible Filter Content */}
        {!isFilterCollapsed && (
          <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search karoseri, chassis, or specs"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <CustomDropdown
              options={statusOptions}
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              placeholder="Select status"
                  onStarClick={handleToggleFavoriteStatus}
                  starredValues={favoriteStatuses}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
            <input
              type="text"
              value={filters.customer}
              onChange={(e) => handleFilterChange('customer', e.target.value)}
              placeholder="Customer name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Marketing</label>
            <input
              type="text"
              value={filters.marketing}
              onChange={(e) => handleFilterChange('marketing', e.target.value)}
              placeholder="Marketing name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilters({
                  search: '',
                  status: '',
                  customer: '',
                  marketing: '',
                  startDate: '',
                  endDate: ''
                });
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
          </div>
        )}
      </div>

      {/* Quotation Cards */}
      {(quotations || []).map((quotationData) => {
        const { header, offers } = quotationData;
        return (
          <div key={header._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-6 py-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="space-y-3">
                <div className="flex items-center flex-wrap gap-3">
                    <h3 className="text-xl font-bold text-gray-900">{header.quotationNumber}</h3>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    statusClassMap[header.status?.type] || 'bg-gray-100 text-gray-800'
                  }`}>
                    {header.status?.type ? header.status.type.charAt(0).toUpperCase() + header.status.type.slice(1) : 'Open'}
                  </span>
                  {header.status?.reason && (
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Reason: {header.status.reason}
                    </span>
                  )}
                </div>
                  
                  {/* Customer Info */}
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2 text-gray-700">
                      <Building className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{header.customerName}</span>
                  </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <User className="h-4 w-4 text-gray-500" />
                    <span>{header.contactPerson?.name} ({header.contactPerson?.gender})</span>
                  </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <User className="h-4 w-4 text-gray-500" />
                    <span>Marketing: {header.marketingName}</span>
                  </div>
                  </div>

                  {/* Dates and Follow-up Status */}
                  <div className="flex items-center flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                    <span>Created: {formatDate(header.createdAt)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                    <span>Last Follow-up: {formatDate(header.lastFollowUpDate)}</span>
                      {header.followUpStatus && (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          header.followUpStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                          header.followUpStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {header.followUpStatus.label}
                        </span>
                      )}
                  </div>
                  <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                    <span>Updated: {formatDate(header.updatedAt)}</span>
                  </div>
                </div>
              </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-1">
                <button
                  onClick={() => {
                    // Ensure _id is converted to string
                    const processedQuotationData = {
                      ...quotationData,
                      header: {
                        ...header,
                        _id: header._id?.toString() || header._id
                      }
                    };
                    onView && onView(processedQuotationData);
                  }}
                  data-tooltip-id={`view-header-${header._id}`}
                  data-tooltip-content="View quotation details"
                    className="text-blue-600 hover:text-blue-900 p-2 transition-colors"
                >
                    <Eye className="h-5 w-5" />
                </button>
                <button
                  onClick={() => onEdit && onEdit({ mode: QUOTATION_FORM_MODES.NEW_OFFER, header })}
                  data-tooltip-id={`new-offer-${header._id}`}
                  data-tooltip-content="Create additional offer"
                    className="text-green-600 hover:text-green-900 p-2 transition-colors"
                >
                    <Plus className="h-5 w-5" />
                </button>
                <button
                  onClick={() => openStatusModal(header, offers)}
                  data-tooltip-id={`status-${header._id}`}
                  data-tooltip-content="Update quotation status"
                    className="text-indigo-600 hover:text-indigo-900 p-2 transition-colors"
                >
                    <CheckCircle className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleFollowUpQuotation(header)}
                  data-tooltip-id={`followup-${header._id}`}
                  data-tooltip-content="Record follow-up for this quotation"
                    className="text-blue-600 hover:text-blue-900 p-2 transition-colors"
                  >
                    <Clock className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteQuotation(header)}
                    data-tooltip-id={`delete-quotation-${header._id}`}
                    data-tooltip-content="Delete entire quotation"
                    className="text-red-600 hover:text-red-900 p-2 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4">
              {offers.length === 0 ? (
                <p className="text-sm text-gray-500">No offers found for this quotation.</p>
              ) : (
                <div className="space-y-4">
                  {header.status?.type === 'win' ? (
                    // Show only winning offer
                    (() => {
                      const winningOffer = offers.find(offerGroup => {
                        const isGrouped = offerGroup.original;
                        const originalOffer = isGrouped ? offerGroup.original : offerGroup;
                        const revisions = isGrouped ? offerGroup.revisions : [];
                        
                        // Check if original offer is the winning one
                        if (originalOffer._id === header.selectedOfferId) {
                          return true;
                        }
                        
                        // Check if any revision is the winning one
                        return revisions.some(revision => revision._id === header.selectedOfferId);
                      });

                      if (!winningOffer) return null;

                      const isGrouped = winningOffer.original;
                      const originalOffer = isGrouped ? winningOffer.original : winningOffer;
                      const revisions = isGrouped ? winningOffer.revisions : [];
                      
                      // Find the actual winning offer (original or revision)
                      let actualWinningOffer = originalOffer;
                      if (header.selectedOfferId !== originalOffer._id) {
                        actualWinningOffer = revisions.find(r => r._id === header.selectedOfferId) || originalOffer;
                      }

                      // Filter to show only winning items
                      const winningItems = (actualWinningOffer.offerItems || []).filter(item => 
                        header.selectedOfferItemIds && header.selectedOfferItemIds.includes(item._id)
                      );

                      return (
                        <div key={actualWinningOffer._id} className="border border-green-200 rounded-lg overflow-hidden bg-green-50">
                          <div className="px-4 py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium text-gray-900">
                                    {actualWinningOffer === originalOffer 
                                      ? `Offer ${originalOffer.offerNumberInQuotation || 1}` 
                                      : `Revision ${actualWinningOffer.revision}`
                                    }
                                  </span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                    {actualWinningOffer === originalOffer ? 'Original' : `Rev. ${actualWinningOffer.revision}`}
                                  </span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                    Winner
                                  </span>
                                </div>
                                <div className="text-sm text-gray-500">
                                  {winningItems.length} winning items
                                  {winningItems.length > 0 && (
                                    <span className="ml-2">
                                      ({winningItems[0].karoseri} - {winningItems[0].chassis}
                                      {winningItems.length > 1 && ` +${winningItems.length - 1} more`})
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className="text-sm text-gray-900 font-semibold">
                                  {formatPriceWithCurrency(winningItems.reduce((sum, item) => sum + (item.netto || 0), 0))}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => {
                                      console.log('=== QuotationList Offer View Button Clicked ===');
                                      console.log('header:', header);
                                      console.log('header._id:', header._id);
                                      console.log('activeOfferId:', actualWinningOffer._id);
                                      console.log('=== End Offer View Debug ===');
                                      onView && onView({ header, offers, activeOfferId: actualWinningOffer._id });
                                    }}
                                    data-tooltip-id={`offer-view-${actualWinningOffer._id}`}
                                    data-tooltip-content="View offer details"
                                    className="text-blue-600 hover:text-blue-900 p-1"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => onPreview && onPreview({ header, offers })}
                                    data-tooltip-id={`offer-generate-${actualWinningOffer._id}`}
                                    data-tooltip-content="Generate quotation document"
                                    className="text-orange-600 hover:text-orange-900 p-1"
                                  >
                                    <FileDown className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    // Show all offers (original behavior)
                    offers.map((offerGroup, groupIndex) => {
                    // Handle both grouped and flat structures
                    if (!offerGroup.original && !offerGroup._id) {
                      console.error('Invalid offerGroup structure:', offerGroup);
                      return null;
                    }
                    
                    // For flat structure (old data), convert to grouped structure
                    if (!offerGroup.original && offerGroup._id) {
                      return (
                        <div key={offerGroup._id} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-white">
                            <div className="px-4 py-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium text-gray-900">
                                      Offer {groupIndex + 1}
                                    </span>
                                    {offerGroup.revision > 0 ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                        Rev. {offerGroup.revision}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                        Original
                              </span>
                            )}
                            </div>
                                  <div className="text-sm text-gray-500">
                                    {offerGroup.offerItems?.length || 0} items
                                    {offerGroup.offerItems?.length > 0 && (
                                      <span className="ml-2">
                                        ({offerGroup.offerItems[0].karoseri} - {offerGroup.offerItems[0].chassis}
                                        {offerGroup.offerItems.length > 1 && ` +${offerGroup.offerItems.length - 1} more`})
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <div className="text-sm text-gray-900">
                                    {formatPriceWithCurrency(offerGroup.original?.totalNetto || 0)}
                                  </div>
                            <div className="flex items-center space-x-2">
                              <button
                                      onClick={() => onView && onView({ header, offers, activeOfferId: offerGroup._id })}
                                      data-tooltip-id={`offer-view-${offerGroup._id}`}
                                data-tooltip-content="View offer details"
                                className="text-blue-600 hover:text-blue-900 p-1"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                      onClick={() => onPreview && onPreview({ header, offers })}
                                      data-tooltip-id={`offer-generate-${offerGroup._id}`}
                                      data-tooltip-content="Generate quotation document"
                                      className="text-orange-600 hover:text-orange-900 p-1"
                                    >
                                      <FileDown className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => onEdit && onEdit({ mode: QUOTATION_FORM_MODES.EDIT_OFFER, header, offer: offerGroup.original })}
                                      data-tooltip-id={`offer-edit-${offerGroup._id}`}
                                data-tooltip-content="Edit offer"
                                className="text-indigo-600 hover:text-indigo-900 p-1"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                      onClick={() => onEdit && onEdit({ mode: QUOTATION_FORM_MODES.REVISION, header, offer: offerGroup.original })}
                                      data-tooltip-id={`offer-revision-${offerGroup._id}`}
                                data-tooltip-content="Create revision from this offer"
                                className="text-purple-600 hover:text-purple-900 p-1"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                              <button
                                      onClick={() => handleDeleteOffer(offerGroup, header.quotationNumber)}
                                      data-tooltip-id={`offer-delete-${offerGroup._id}`}
                                data-tooltip-content="Delete offer"
                                className="text-red-600 hover:text-red-900 p-1"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    // For grouped structure (new data) - this is what we want to display
                    return (
                    <div key={offerGroup.original?._id || `group-${groupIndex}`} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Original Offer */}
                      <div className="bg-white border-b border-gray-200">
                        <div className="px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">
                                Offer {offerGroup.original?.offerNumberInQuotation || (groupIndex + 1)}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Original
                              </span>
                            </div>
                              <div className="text-sm text-gray-500">
                                {offerGroup.original?.offerItems?.length || 0} items
                                {offerGroup.original?.offerItems?.length > 0 && (
                                  <span className="ml-2">
                                    ({offerGroup.original.offerItems[0].karoseri} - {offerGroup.original.offerItems[0].chassis}
                                    {offerGroup.original.offerItems.length > 1 && ` +${offerGroup.original.offerItems.length - 1} more`})
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-sm text-gray-900">
                                {formatPriceWithCurrency(offerGroup.original?.totalNetto || 0)}
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => onView && onView({ header, offers, activeOfferId: offerGroup.original?._id })}
                                  data-tooltip-id={`offer-view-${offerGroup.original?._id}`}
                                  data-tooltip-content="View offer details"
                                  className="text-blue-600 hover:text-blue-900 p-1"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => onPreview && onPreview({ header, offers })}
                                  data-tooltip-id={`offer-generate-${offerGroup.original?._id}`}
                                  data-tooltip-content="Generate quotation document"
                                  className="text-orange-600 hover:text-orange-900 p-1"
                                >
                                  <FileDown className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => onEdit && onEdit({ mode: QUOTATION_FORM_MODES.EDIT_OFFER, header, offer: offerGroup.original })}
                                  data-tooltip-id={`offer-edit-${offerGroup.original?._id}`}
                                  data-tooltip-content="Edit offer"
                                  className="text-indigo-600 hover:text-indigo-900 p-1"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                {(!offerGroup.revisions || offerGroup.revisions.length === 0) && (
                                  <button
                                    onClick={() => onEdit && onEdit({ mode: QUOTATION_FORM_MODES.REVISION, header, offer: offerGroup.original })}
                                    data-tooltip-id={`offer-revision-${offerGroup.original?._id}`}
                                    data-tooltip-content="Create revision from this offer"
                                    className="text-purple-600 hover:text-purple-900 p-1"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteOffer(offerGroup.original, header.quotationNumber)}
                                  data-tooltip-id={`offer-delete-${offerGroup.original?._id}`}
                                  data-tooltip-content="Delete offer"
                                  className="text-red-600 hover:text-red-900 p-1"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Revisions */}
                      {offerGroup.revisions && offerGroup.revisions.length > 0 && (
                        <div className="bg-gray-50">
                          {offerGroup.revisions.map((revision, revisionIndex) => {
                            const isLatestRevision = revisionIndex === offerGroup.revisions.length - 1;
                            return (
                            <div key={revision._id} className="px-4 py-3 border-b border-gray-200 last:border-b-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-4 h-px bg-gray-300"></div>
                                    <span className="text-sm font-medium text-gray-700">
                                      Revision {revision.revision}
                                    </span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                      Rev. {revision.revision}
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {revision.karoseri} - {revision.chassis}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <div className="text-sm text-gray-900">
                                    {formatPriceWithCurrency(revision.totalNetto || 0)}
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => onView && onView({ header, offers, activeOfferId: revision._id })}
                                      data-tooltip-id={`offer-view-${revision._id}`}
                                      data-tooltip-content="View revision details"
                                      className="text-blue-600 hover:text-blue-900 p-1"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => onEdit && onEdit({ mode: QUOTATION_FORM_MODES.EDIT_OFFER, header, offer: revision })}
                                      data-tooltip-id={`offer-edit-${revision._id}`}
                                      data-tooltip-content="Edit revision"
                                      className="text-indigo-600 hover:text-indigo-900 p-1"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    {isLatestRevision && (
                                      <button
                                        onClick={() => onEdit && onEdit({ mode: QUOTATION_FORM_MODES.REVISION, header, offer: revision })}
                                        data-tooltip-id={`offer-revision-${revision._id}`}
                                        data-tooltip-content="Create revision from this revision"
                                        className="text-purple-600 hover:text-purple-900 p-1"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteOffer(revision, header.quotationNumber)}
                                      data-tooltip-id={`offer-delete-${revision._id}`}
                                      data-tooltip-content="Delete revision"
                                      className="text-red-600 hover:text-red-900 p-1"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    );
                  })
                  )}
                </div>
              )}
              
              {/* Progress Section - Only show for win status */}
              {header.status?.type === 'win' && (
                <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Progress</h4>
                  
                  {/* Progress List */}
                  <div className="space-y-2 mb-3">
                    {quotationData.header.progress && quotationData.header.progress.length > 0 ? (
                      quotationData.header.progress.map((progressItem, index) => (
                        <div key={index} className="group flex items-center justify-between bg-white p-2 rounded border border-gray-200 text-sm">
                          {editingProgress[`${header.quotationNumber}-${index}`] !== undefined ? (
                            <div className="flex items-center space-x-2 flex-1">
                              <input
                                type="text"
                                value={editingProgress[`${header.quotationNumber}-${index}`]}
                                onChange={(e) => setEditingProgress(prev => ({
                                  ...prev,
                                  [`${header.quotationNumber}-${index}`]: e.target.value
                                }))}
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="Enter progress update"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveProgress(header.quotationNumber, index)}
                                className="p-1 text-green-600 hover:text-green-700"
                                title="Save"
                              >
                                <Save className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => setEditingProgress(prev => {
                                  const newState = { ...prev };
                                  delete newState[`${header.quotationNumber}-${index}`];
                                  return newState;
                                })}
                                className="p-1 text-gray-600 hover:text-gray-700"
                                title="Cancel"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="text-gray-700 flex-1">{progressItem}</span>
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEditProgress(header.quotationNumber, index, progressItem)}
                                  className="p-1 text-blue-600 hover:text-blue-700"
                                  title="Edit"
                                >
                                  <Edit className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProgress(header.quotationNumber, index)}
                                  className="p-1 text-red-600 hover:text-red-700"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No progress yet</p>
                    )}
                  </div>

                  {/* Add Progress Input */}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={progressInputs[header.quotationNumber] || ''}
                      onChange={(e) => setProgressInputs(prev => ({
                        ...prev,
                        [header.quotationNumber]: e.target.value
                      }))}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Add progress..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddProgress(header.quotationNumber);
                        }
                      }}
                    />
                    <button
                      onClick={() => handleAddProgress(header.quotationNumber)}
                      className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {renderPagination() && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing
            <span className="font-semibold ml-1 mr-1">
              {((pagination.current || 1) - 1) * 10 + 1}
            </span>
            to
            <span className="font-semibold ml-1 mr-1">
              {Math.min((pagination.current || 1) * 10, pagination.total)}
            </span>
            of
            <span className="font-semibold ml-1">{pagination.total}</span>
            results
          </div>
          {renderPagination()}
        </div>
      )}

      {(quotations || []).length === 0 && !loading && (
        <div className="text-center py-12">
          <Building className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No quotations found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new quotation.
          </p>
          {showCreateButton && (
            <div className="mt-6">
              <button
                onClick={onCreate}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Quotation
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tooltips */}
      {(quotations || []).map(({ header, offers }) => (
        <React.Fragment key={`tooltips-${header._id}`}>
          <Tooltip id={`view-header-${header._id}`} />
          <Tooltip id={`new-offer-${header._id}`} />
          <Tooltip id={`status-${header._id}`} />
          <Tooltip id={`followup-${header._id}`} />
          <Tooltip id={`delete-quotation-${header._id}`} />
          {offers.map((offerGroup) => {
            // Handle both grouped and flat structures
            if (offerGroup.original) {
              // New grouped structure
              return (
                <React.Fragment key={offerGroup.original._id}>
                  <Tooltip id={`offer-view-${offerGroup.original._id}`} />
                  <Tooltip id={`offer-edit-${offerGroup.original._id}`} />
                  <Tooltip id={`offer-revision-${offerGroup.original._id}`} />
                  <Tooltip id={`offer-delete-${offerGroup.original._id}`} />
                  {offerGroup.revisions && offerGroup.revisions.map((revision) => (
                    <React.Fragment key={revision._id}>
                      <Tooltip id={`offer-view-${revision._id}`} />
                      <Tooltip id={`offer-edit-${revision._id}`} />
                      <Tooltip id={`offer-revision-${revision._id}`} />
                      <Tooltip id={`offer-delete-${revision._id}`} />
            </React.Fragment>
          ))}
                </React.Fragment>
              );
            } else if (offerGroup._id) {
              // Old flat structure
              return (
                <React.Fragment key={offerGroup._id}>
                  <Tooltip id={`offer-view-${offerGroup._id}`} />
                  <Tooltip id={`offer-edit-${offerGroup._id}`} />
                  <Tooltip id={`offer-revision-${offerGroup._id}`} />
                  <Tooltip id={`offer-delete-${offerGroup._id}`} />
                </React.Fragment>
              );
            }
            return null;
          })}
        </React.Fragment>
      ))}

      {/* Status Modal */}
      <BaseModal
        isOpen={statusModal.isOpen}
        onClose={closeStatusModal}
        title="Update Quotation Status"
      >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <CustomDropdown
                  options={statusOptions.filter((option) => option.value !== '')}
                  value={statusForm.status}
              onChange={handleStatusChange}
                  placeholder="Select status"
                />
              </div>
              {(statusForm.status === 'loss' || statusForm.status === 'close') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
              <CustomDropdown
                options={statusForm.status === 'loss' ? LOSS_REASONS : CLOSE_REASONS}
                    value={statusForm.reason}
                onChange={(value) => setStatusForm((prev) => ({ ...prev, reason: value }))}
                placeholder="Select reason"
                required
              />
              {statusForm.reason === 'custom' && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Custom Reason *</label>
                  <textarea
                    value={statusForm.customReason}
                    onChange={(e) => setStatusForm((prev) => ({ ...prev, customReason: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Enter custom reason for ${statusForm.status} status`}
                    required
                  />
                </div>
              )}
            </div>
          )}
          {statusForm.status === 'win' && (() => {
            // Count total offers (original + revisions)
            const totalOffers = statusModal.offers.reduce((count, offerGroup) => {
              if (offerGroup.original) {
                return count + 1 + (offerGroup.revisions ? offerGroup.revisions.length : 0);
              }
              return count + 1;
            }, 0);
            return totalOffers > 1;
          })() && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Winning Offer *</label>
                  <CustomDropdown
                options={(() => {
                  const allOffers = [];
                  statusModal.offers.forEach((offerGroup, groupIndex) => {
                    if (offerGroup.original) {
                      // New grouped structure
                      allOffers.push({
                        value: offerGroup.original._id,
                        label: `Offer ${offerGroup.original.offerNumberInQuotation || (groupIndex + 1)} (Original) - ${offerGroup.original.offerItems?.length || 0} items`
                      });
                      offerGroup.revisions && offerGroup.revisions.forEach((revision) => {
                        allOffers.push({
                          value: revision._id,
                          label: `Offer ${revision.offerNumberInQuotation || (groupIndex + 1)} (Rev. ${revision.revision}) - ${revision.offerItems?.length || 0} items`
                        });
                      });
                    } else {
                      // Old flat structure
                      allOffers.push({
                        value: offerGroup._id,
                        label: `Offer ${groupIndex + 1}${offerGroup.revision > 0 ? ` (Rev. ${offerGroup.revision})` : ' (Original)'} - ${offerGroup.offerItems?.length || 0} items`
                      });
                    }
                  });
                  return allOffers;
                })()}
                    value={statusForm.selectedOfferId}
                    onChange={(value) => {
                      setStatusForm((prev) => ({ 
                        ...prev, 
                        selectedOfferId: value,
                        selectedItemIds: [] // Reset item selection when offer changes
                      }));
                    }}
                    placeholder="Select winning offer"
                required
                  />
                </div>
              )}
              
              {/* Item Selection for Winning Offer */}
              {statusForm.status === 'win' && statusForm.selectedOfferId && (() => {
                // Find the selected offer and its items
                let selectedOfferItems = [];
                
                statusModal.offers.forEach((offerGroup) => {
                  if (offerGroup.original && offerGroup.original._id === statusForm.selectedOfferId) {
                    selectedOfferItems = offerGroup.original.offerItems || [];
                  } else if (offerGroup.revisions) {
                    const revision = offerGroup.revisions.find(rev => rev._id === statusForm.selectedOfferId);
                    if (revision) {
                      selectedOfferItems = revision.offerItems || [];
                    }
                  }
                });
                
                return selectedOfferItems.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Winning Items * ({selectedOfferItems.length} items available)
                    </label>
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3 space-y-2">
                      {selectedOfferItems.map((item, index) => (
                        <label key={item._id || index} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={statusForm.selectedItemIds?.includes(item._id) || false}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setStatusForm(prev => ({
                                  ...prev,
                                  selectedItemIds: [...(prev.selectedItemIds || []), item._id]
                                }));
                              } else {
                                setStatusForm(prev => ({
                                  ...prev,
                                  selectedItemIds: (prev.selectedItemIds || []).filter(id => id !== item._id)
                                }));
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              Item {item.itemNumber || (index + 1)}: {item.karoseri} - {item.chassis}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatPriceWithCurrency(item.netto)}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      Selected: {statusForm.selectedItemIds?.length || 0} of {selectedOfferItems.length} items
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeStatusModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
            disabled={statusUpdateLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
            {statusUpdateLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>{statusUpdateLoading ? 'Updating...' : 'Update Status'}</span>
              </button>
            </div>
      </BaseModal>
    </div>
  );
};

export default QuotationList;



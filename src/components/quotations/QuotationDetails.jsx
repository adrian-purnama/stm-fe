import React, { useState, useEffect, useMemo } from 'react';
import {
  Edit,
  Trash2,
  Calendar,
  User,
  Building,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Plus,
  X,
  Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import ApiHelper from '../../utils/ApiHelper';
import { formatPriceWithCurrency } from '../../utils/priceFormatter';
import CustomDropdown from '../CustomDropdown';
import { generateQuotationDocument } from '../../utils/documentGenerator';
import BaseModal from '../BaseModal';
// Removed OfferItemAcceptance import - no longer needed
import { QUOTATION_FORM_MODES } from './quotationModes';

const STATUS_OPTIONS = [
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

const statusClasses = {
  open: 'bg-blue-100 text-blue-800',
  win: 'bg-green-100 text-green-800',
  loss: 'bg-red-100 text-red-800',
  close: 'bg-gray-100 text-gray-800'
};

const QuotationDetails = ({ quotation, onEdit, onDelete, onClose, onPreview }) => {
  const header = useMemo(() => {
    if (!quotation) return null;
    if (quotation.header) return quotation.header;
    if (quotation.quotationHeaderId) return quotation.quotationHeaderId;
    return quotation;
  }, [quotation]);

  const offers = useMemo(() => {
    if (!quotation) return [];
    if (Array.isArray(quotation.offers) && quotation.offers.length) {
      // Check if it's the new grouped structure
      if (quotation.offers[0] && quotation.offers[0].original) {
        // New grouped structure - return as is for cascaded display
        return quotation.offers;
      } else {
        // Old flat structure - convert to grouped structure for consistency
        const groupedOffers = [];
        quotation.offers.forEach(offer => {
          if (offer.revision === 0 || !offer.parentQuotationId) {
            // This is an original offer
            groupedOffers.push({
              original: offer,
              revisions: []
            });
          }
        });
        
        // Add revisions to their respective groups
        quotation.offers.forEach(offer => {
          if (offer.revision > 0 && offer.parentQuotationId) {
            const parentGroup = groupedOffers.find(group => 
              group.original._id.toString() === offer.parentQuotationId.toString()
            );
            if (parentGroup) {
              parentGroup.revisions.push(offer);
            }
          }
        });
        
        // Sort revisions within each group
        groupedOffers.forEach(group => {
          group.revisions.sort((a, b) => a.revision - b.revision);
        });
        
        return groupedOffers;
      }
    }
    if (quotation.offerNumber) {
      return [{
        original: quotation,
        revisions: []
      }];
    }
    return [];
  }, [quotation]);

  const initialActiveOfferId = useMemo(() => {
    if (quotation?.activeOfferId) return quotation.activeOfferId;
    return offers[0]?.original?._id || offers[0]?._id || null;
  }, [offers, quotation]);

  const [headerState, setHeaderState] = useState(header);
  const [activeOfferId, setActiveOfferId] = useState(initialActiveOfferId);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showHeaderEditModal, setShowHeaderEditModal] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: '',
    reason: '',
    selectedOfferId: '',
    selectedItemIds: [],
    customReason: ''
  });
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [headerEditForm, setHeaderEditForm] = useState({
    customerName: '',
    contactPerson: {
      name: '',
      gender: ''
    },
    marketingName: ''
  });
  const [newProgressText, setNewProgressText] = useState('');
  const [editingProgressIndex, setEditingProgressIndex] = useState(null);
  const [editingProgressText, setEditingProgressText] = useState('');

  // Get asset URL for notes images
  const getNotesImageAssetUrl = (imageId, fileId) => {
    const baseURL = window.location.origin.includes('localhost') ? 'http://localhost:5000' : 'http://localhost:5000';
    const token = localStorage.getItem('asb-token');
    return `${baseURL}/api/assets/notes-images/${imageId}/files/${fileId}?token=${token}`;
  };

  useEffect(() => {
    setHeaderState(header);
  }, [header]);

  useEffect(() => {
    setActiveOfferId(initialActiveOfferId);
  }, [initialActiveOfferId]);

  // Initialize header edit form when modal opens
  useEffect(() => {
    if (showHeaderEditModal && headerState) {
      setHeaderEditForm({
        customerName: headerState.customerName || '',
        contactPerson: {
          name: headerState.contactPerson?.name || '',
          gender: headerState.contactPerson?.gender || ''
        },
        marketingName: headerState.marketingName || ''
      });
    }
  }, [showHeaderEditModal, headerState]);

  const activeOffer = useMemo(() => {
    console.log('Calculating activeOffer with:', { activeOfferId, offers });
    if (!activeOfferId || !offers.length) return null;
    
    // Search through all offers and revisions to find the active one
    for (const offerGroup of offers) {
      if (offerGroup.original) {
        // New grouped structure
        if (offerGroup.original._id === activeOfferId) {
          console.log('Found active offer (original):', offerGroup.original);
          console.log('Active offer items:', offerGroup.original.offerItems);
          return offerGroup.original;
        }
        // Check revisions
        for (const revision of offerGroup.revisions) {
          if (revision._id === activeOfferId) {
            console.log('Found active offer (revision):', revision);
            console.log('Active offer items:', revision.offerItems);
            return revision;
          }
        }
      } else {
        // Old flat structure
        if (offerGroup._id === activeOfferId) {
          console.log('Found active offer (flat):', offerGroup);
          console.log('Active offer items:', offerGroup.offerItems);
          return offerGroup;
        }
      }
    }
    
    // Fallback to first available offer
    if (offers[0]) {
      const fallback = offers[0].original || offers[0];
      console.log('Using fallback offer:', fallback);
      console.log('Fallback offer items:', fallback.offerItems);
      return fallback;
    }
    
    return null;
  }, [offers, activeOfferId]);

  if (!headerState) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Quotation data is not available.</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to list
        </button>
      </div>
    );
  }

  const formatDate = (date, withTime = false) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', withTime
      ? {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }
      : {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }
    );
  };

  const getStatusBadge = (status) => {
    const classes = statusClasses[status] || 'bg-gray-100 text-gray-800';
    const icons = {
      open: <Clock className="h-4 w-4" />,
      win: <CheckCircle className="h-4 w-4" />,
      loss: <XCircle className="h-4 w-4" />,
      close: <CheckCircle className="h-4 w-4" />
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${classes}`}>
        {icons[status] || <FileText className="h-4 w-4" />}
        <span className="ml-2 capitalize">{status || 'open'}</span>
      </span>
    );
  };

  const handleOpenStatusModal = () => {
    setStatusForm({
      status: headerState.status?.type || 'open',
      reason: headerState.status?.reason || '',
      selectedOfferId:
        headerState.selectedOfferId || activeOffer?._id || offers[0]?._id || ''
    });
    setShowStatusModal(true);
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

  const clearProgress = () => {
    setHeaderState(prev => ({
      ...prev,
      progress: []
    }));
  };

  const handleStatusUpdate = async () => {
    try {
      setStatusUpdateLoading(true);
      const { status, reason, selectedOfferId, selectedItemIds, customReason } = statusForm;

      if (!status) {
        toast.error('Please select a status');
        return;
      }

      if ((status === 'loss' || status === 'close') && !reason.trim()) {
        toast.error('Reason is required for this status');
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
        toast.error('Please choose the winning offer');
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

      const response = await ApiHelper.patch(
        `/api/quotations/${encodeURIComponent(headerState.quotationNumber)}/status`,
        payload
      );

      setHeaderState(response.data.data);
      
      // Clear progress if changing from 'win' to other status
      if (headerState.status?.type === 'win' && status !== 'win') {
        clearProgress();
      }
      
      toast.success('Status updated successfully');
      setShowStatusModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleFollowUp = async () => {
    try {
      const response = await ApiHelper.patch(
        `/api/quotations/${encodeURIComponent(headerState.quotationNumber)}/follow-up`
      );
      const updatedHeader = response.data.data;
      if (updatedHeader) {
        setHeaderState(updatedHeader);
      }
      toast.success('Follow-up date updated successfully');
    } catch {
      toast.error('Failed to update follow-up date');
    }
  };

  const handleDeleteQuotation = async () => {
    if (!window.confirm(`Delete quotation ${headerState.quotationNumber}?`)) {
      return;
    }

    try {
      await ApiHelper.delete(`/api/quotations/${encodeURIComponent(headerState.quotationNumber)}`);
      toast.success('Quotation deleted successfully');
      onDelete && onDelete(headerState);
      onClose && onClose();
    } catch {
      toast.error('Failed to delete quotation');
    }
  };


  const handleCreateOffer = () => {
    onEdit && onEdit({
      mode: QUOTATION_FORM_MODES.NEW_OFFER,
      header: headerState
    });
  };

  const handleGenerateQuotation = () => {
    // Navigate to preview page with quotation data
    const quotationData = {
      header: headerState,
      offers: offers
    };
    
    // Use onPreview if available, otherwise fall back to onEdit
    if (onPreview) {
      onPreview(quotationData);
    } else if (onEdit) {
      onEdit({
        mode: 'preview',
        quotationData: quotationData
      });
    }
  };


  const handleOpenHeaderEditModal = () => {
    setShowHeaderEditModal(true);
  };

  const handleCloseHeaderEditModal = () => {
    setShowHeaderEditModal(false);
  };

  const handleHeaderEditSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await ApiHelper.put(
        `/api/quotations/${encodeURIComponent(headerState.quotationNumber)}`,
        headerEditForm
      );

      setHeaderState(response.data.data);
      toast.success('Quotation header updated successfully');
      setShowHeaderEditModal(false);
    } catch (error) {
      console.error('Header update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update quotation header');
    }
  };

  const handleAddProgress = async () => {
    if (!newProgressText.trim()) {
      toast.error('Please enter progress text');
      return;
    }

    // Optimistically update the UI
    const newProgressEntry = newProgressText.trim();
    setHeaderState(prev => {
      const currentProgress = prev.progress || [];
      return {
        ...prev,
        progress: [...currentProgress, newProgressEntry]
      };
    });
    setNewProgressText('');

    try {
      await ApiHelper.post(
        `/api/quotations/${encodeURIComponent(headerState.quotationNumber)}/progress`,
        { progress: newProgressEntry }
      );
      toast.success('Progress added successfully');
    } catch (err) {
      // Revert optimistic update on error
      setHeaderState(prev => {
        const currentProgress = prev.progress || [];
        return {
          ...prev,
          progress: currentProgress.slice(0, -1)
        };
      });
      setNewProgressText(newProgressEntry);
      toast.error(err.response?.data?.message || 'Failed to add progress');
    }
  };

  const handleEditProgress = (index, currentText) => {
    setEditingProgressIndex(index);
    setEditingProgressText(currentText);
  };

  const handleSaveProgress = async () => {
    if (!editingProgressText.trim()) {
      toast.error('Please enter progress text');
      return;
    }

    // Optimistically update the UI
    setHeaderState(prev => {
      const currentProgress = prev.progress || [];
      const newProgress = [...currentProgress];
      newProgress[editingProgressIndex] = editingProgressText.trim();
      return {
        ...prev,
        progress: newProgress
      };
    });

    setEditingProgressIndex(null);
    setEditingProgressText('');

    try {
      // Note: The new API doesn't support updating individual progress entries
      // We'll need to implement this differently or remove this functionality
      toast.error('Progress editing not supported in new API structure');
      toast.success('Progress updated successfully');
    } catch (err) {
      // Revert optimistic update on error
      setHeaderState(prev => {
        const currentProgress = prev.progress || [];
        const newProgress = [...currentProgress];
        newProgress[editingProgressIndex] = headerState.progress?.[editingProgressIndex] || '';
        return {
          ...prev,
          progress: newProgress
        };
      });
      setEditingProgressIndex(editingProgressIndex);
      setEditingProgressText(editingProgressText);
      toast.error(err.response?.data?.message || 'Failed to update progress');
    }
  };

  const handleDeleteProgress = async (index) => {
    if (!window.confirm('Are you sure you want to delete this progress entry?')) {
      return;
    }

    // Store the deleted item for potential rollback
    const deletedItem = headerState.progress?.[index];

    // Optimistically update the UI
    setHeaderState(prev => {
      const currentProgress = prev.progress || [];
      return {
        ...prev,
        progress: currentProgress.filter((_, i) => i !== index)
      };
    });

    try {
      // Note: The new API doesn't support deleting individual progress entries
      // We'll need to implement this differently or remove this functionality
      toast.error('Progress deletion not supported in new API structure');
      toast.success('Progress deleted successfully');
    } catch (err) {
      // Revert optimistic update on error
      setHeaderState(prev => {
        const currentProgress = prev.progress || [];
        return {
          ...prev,
          progress: [
            ...currentProgress.slice(0, index),
            deletedItem,
            ...currentProgress.slice(index)
          ]
        };
      });
      toast.error(err.response?.data?.message || 'Failed to delete progress');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-gray-900">
                {headerState.quotationNumber}
              </h2>
              {getStatusBadge(headerState.status?.type || 'open')}
              {headerState.status?.reason && (
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Reason: {headerState.status.reason}
                </span>
              )}
            </div>
            
            {/* Customer Info */}
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2 text-gray-700">
                <Building className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{headerState.customerName}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <User className="h-4 w-4 text-gray-500" />
                <span>
                  {headerState.contactPerson?.name}
                  {headerState.contactPerson?.gender && (
                    <span className="ml-1 text-gray-400">
                      ({headerState.contactPerson.gender})
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <User className="h-4 w-4 text-gray-500" />
                <span>Marketing: {headerState.marketingName}</span>
              </div>
            </div>

            {/* Dates and Follow-up Status */}
            <div className="flex items-center flex-wrap gap-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>Created: {formatDate(headerState.createdAt)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>Last follow-up: {formatDate(headerState.lastFollowUpDate)}</span>
                {headerState.followUpStatus && (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    headerState.followUpStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                    headerState.followUpStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {headerState.followUpStatus.label}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>Updated: {formatDate(headerState.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Quotation Header Actions */}
          <div className="flex flex-col space-y-2">
            <div className="text-xs text-gray-500 font-medium">Quotation Actions</div>
            <div className="flex items-center space-x-1">
              <button
                onClick={handleOpenHeaderEditModal}
                className="text-purple-600 hover:text-purple-900 p-2 transition-colors"
                title="Edit Quotation Header"
              >
                <Edit className="h-5 w-5" />
              </button>
              <button
                onClick={handleOpenStatusModal}
                className="text-indigo-600 hover:text-indigo-900 p-2 transition-colors"
                title="Update Status"
              >
                <CheckCircle className="h-5 w-5" />
              </button>
              <button
                onClick={handleFollowUp}
                className="text-blue-600 hover:text-blue-900 p-2 transition-colors"
                title="Mark Follow-up"
              >
                <Clock className="h-5 w-5" />
              </button>
              <button
                onClick={handleGenerateQuotation}
                className="text-orange-600 hover:text-orange-900 p-2 transition-colors"
                title="Preview Document"
              >
                <FileText className="h-5 w-5" />
              </button>
              <button
                onClick={handleDeleteQuotation}
                className="text-red-600 hover:text-red-900 p-2 transition-colors"
                title="Delete Quotation"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Offer Selector - Cascaded Structure */}
      {offers.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            {headerState.status?.type === 'win' ? 'Winning Offer' : 'Offers'}
          </h3>
          <div className="space-y-4">
            {headerState.status?.type === 'win' ? (
              // Show only winning offer
              (() => {
                const winningOffer = offers.find(offerGroup => {
                  const isGrouped = offerGroup.original;
                  const originalOffer = isGrouped ? offerGroup.original : offerGroup;
                  const revisions = isGrouped ? offerGroup.revisions : [];
                  
                  // Check if original offer is the winning one
                  if (originalOffer._id === headerState.selectedOfferId) {
                    return true;
                  }
                  
                  // Check if any revision is the winning one
                  return revisions.some(revision => revision._id === headerState.selectedOfferId);
                });

                if (!winningOffer) return null;

                const isGrouped = winningOffer.original;
                const originalOffer = isGrouped ? winningOffer.original : winningOffer;
                const revisions = isGrouped ? winningOffer.revisions : [];
                
                // Find the actual winning offer (original or revision)
                let actualWinningOffer = originalOffer;
                if (headerState.selectedOfferId !== originalOffer._id) {
                  actualWinningOffer = revisions.find(r => r._id === headerState.selectedOfferId) || originalOffer;
                }

                // Filter to show only winning items
                const winningItems = (actualWinningOffer.offerItems || []).filter(item => 
                  headerState.selectedOfferItemIds && headerState.selectedOfferItemIds.includes(item._id)
                );

                return (
                  <div key={actualWinningOffer._id} className="border border-green-200 rounded-lg overflow-hidden bg-green-50">
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="px-3 py-2 rounded-md text-sm border bg-green-600 text-white border-green-600">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">
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
                        <div className="flex items-center space-x-2">
                          <div className="text-sm text-gray-900 font-semibold">
                            {formatPriceWithCurrency(winningItems.reduce((sum, item) => sum + (item.netto || 0), 0))}
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
              const isGrouped = offerGroup.original;
              const originalOffer = isGrouped ? offerGroup.original : offerGroup;
              const revisions = isGrouped ? offerGroup.revisions : [];
              
              return (
                <div key={originalOffer._id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Original Offer */}
                  <div className="bg-white border-b border-gray-200">
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => setActiveOfferId(originalOffer._id)}
                            className={`px-3 py-2 rounded-md text-sm border ${
                              originalOffer._id === activeOfferId
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                               <span className="font-medium">Offer {originalOffer.offerNumberInQuotation || (groupIndex + 1)}</span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Original
                              </span>
                            </div>
                          </button>
                          <div className="text-sm text-gray-500">
                            {originalOffer.offerItems?.length || 0} items
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-sm text-gray-900">
                            {formatPriceWithCurrency(originalOffer.totalNetto || 0)}
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => onEdit({
                                mode: QUOTATION_FORM_MODES.EDIT_OFFER,
                                header: headerState,
                                offer: originalOffer
                              })}
                              className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors"
                              title="Edit Offer"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {revisions.length === 0 && (
                              <button
                                onClick={() => onEdit({
                                  mode: QUOTATION_FORM_MODES.REVISION,
                                  header: headerState,
                                  offer: originalOffer
                                })}
                                className="text-purple-600 hover:text-purple-900 p-1 transition-colors"
                                title="Create Revision"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Revisions */}
                  {revisions.length > 0 && (
                    <div className="bg-gray-50">
                      {revisions.map((revision, revisionIndex) => {
                        const isLatestRevision = revisionIndex === revisions.length - 1;
                        return (
                        <div key={revision._id} className="px-4 py-3 border-b border-gray-200 last:border-b-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => setActiveOfferId(revision._id)}
                                className={`px-3 py-2 rounded-md text-sm border ${
                                  revision._id === activeOfferId
                                    ? 'bg-purple-600 text-white border-purple-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <div className="w-4 h-px bg-gray-300"></div>
                                  <span className="font-medium">Revision {revision.revision}</span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                    Rev. {revision.revision}
                                  </span>
                                </div>
                              </button>
                              <div className="text-sm text-gray-500">
                                {revision.offerItems?.length || 0} items
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="text-sm text-gray-900">
                                {formatPriceWithCurrency(revision.totalNetto || 0)}
                              </div>
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => onEdit({
                                    mode: QUOTATION_FORM_MODES.EDIT_OFFER,
                                    header: headerState,
                                    offer: revision
                                  })}
                                  className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors"
                                  title="Edit Revision"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                {isLatestRevision && (
                                  <button
                                    onClick={() => onEdit({
                                      mode: QUOTATION_FORM_MODES.REVISION,
                                      header: headerState,
                                      offer: revision
                                    })}
                                    className="text-purple-600 hover:text-purple-900 p-1 transition-colors"
                                    title="Create New Revision"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                )}
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
          
          {/* Progress Section - Only show for win status */}
          {headerState.status?.type === 'win' && (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Progress</h4>
              
              {/* Simple Progress List */}
              <div className="space-y-2 mb-4">
                {headerState.progress && headerState.progress.length > 0 ? (
                  headerState.progress.map((progressItem, index) => (
                    <div key={index} className="group flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
                      {editingProgressIndex === index ? (
                        <div className="flex items-center space-x-2 flex-1">
                          <input
                            type="text"
                            value={editingProgressText}
                            onChange={(e) => setEditingProgressText(e.target.value)}
                            className="flex-1 px-3 py-1 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                            placeholder="Enter progress update"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveProgress}
                            className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors"
                            title="Save"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingProgressIndex(null)}
                            className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm text-gray-700 flex-1">{progressItem}</span>
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditProgress(index, progressItem)}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProgress(index)}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No progress yet</p>
                )}
              </div>

              {/* Simple Add Input */}
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newProgressText}
                  onChange={(e) => setNewProgressText(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add progress..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddProgress();
                    }
                  }}
                />
                <button
                  onClick={handleAddProgress}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </div>
          )}
          
          {/* New Offer Button - Only show if not win status */}
          {headerState.status?.type !== 'win' && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleCreateOffer}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              title="Create New Offer"
            >
              <Plus className="h-4 w-4" />
              <span>New Offer</span>
            </button>
          </div>
          )}
        </div>
      )}

      {/* Offer Information */}
      {activeOffer ? (
        <>
          {/* Offer Header */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Offer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="text-gray-600">Offer Number:</span>
                <p className="font-medium text-gray-900">{activeOffer.offerNumberInQuotation || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-600">Total Items:</span>
                <p className="font-medium text-gray-900">{activeOffer.offerItems?.length || 0}</p>
              </div>
            </div>
            {activeOffer.notes && (
              <div className="mt-4">
                <span className="text-gray-600">Notes:</span>
                <p className="font-medium text-gray-900 mt-1">{activeOffer.notes}</p>
              </div>
            )}
            
            {/* Notes Images */}
            {activeOffer.notesImages && activeOffer.notesImages.length > 0 && (
              <div className="mt-4">
                <span className="text-gray-600">Notes Images:</span>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                  {activeOffer.notesImages.map((imageData, index) => {
                    // Handle both populated objects and ObjectIds
                    const imageId = imageData._id || imageData.id || imageData;
                    const imageFile = imageData.imageFile;
                    const originalName = imageFile?.originalName || `Notes Image ${index + 1}`;
                    const fileId = imageFile?.fileId;
                    
                    return (
                      <div key={imageId} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          {fileId ? (
                            <img
                              src={getNotesImageAssetUrl(imageId, fileId)}
                              alt={originalName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error('Failed to load notes image:', e.target.src);
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm" style={{ display: fileId ? 'none' : 'flex' }}>
                            {fileId ? 'Failed to load' : 'Loading...'}
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-gray-600 truncate" title={originalName}>
                            {originalName}
                          </p>
                          {imageFile?.fileSize && (
                            <p className="text-xs text-gray-400">
                              {(imageFile.fileSize / 1024 / 1024).toFixed(2)} MB
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Offer Items */}
          {activeOffer.offerItems && activeOffer.offerItems.length > 0 ? (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {headerState.status?.type === 'win' ? 'Winning Items' : 'Offer Items'}
              </h3>
              <div className="space-y-4">
                {(headerState.status?.type === 'win' 
                  ? activeOffer.offerItems.filter(item => 
                      headerState.selectedOfferItemIds && headerState.selectedOfferItemIds.includes(item._id)
                    )
                  : activeOffer.offerItems
                ).map((item, index) => (
                  <div key={item._id || index} className={`border rounded-lg p-4 ${
                    headerState.status?.type === 'win' && headerState.selectedOfferItemIds && headerState.selectedOfferItemIds.includes(item._id)
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200'
                  }`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">Item {item.itemNumber || (index + 1)}</h4>
                          {headerState.status?.type === 'win' && headerState.selectedOfferItemIds && headerState.selectedOfferItemIds.includes(item._id) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Winner
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{item.karoseri} - {item.chassis}</p>
                        {item.drawingSpecification && (
                          <p className="text-xs text-gray-500">Drawing: {item.drawingSpecification.drawingNumber || 'Selected'}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatPriceWithCurrency(item.netto)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Netto Price
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Base Price:</span>
                        <p className="font-medium">{formatPriceWithCurrency(item.price)}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Discount:</span>
                        <p className="font-medium">
                          {item.discountType === 'percentage'
                            ? `${item.discountValue || 0}%`
                            : formatPriceWithCurrency(item.discountValue || 0)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Netto:</span>
                        <p className="font-medium">{formatPriceWithCurrency(item.netto)}</p>
                      </div>
                    </div>

                    {item.specifications && item.specifications.length > 0 && (
                      <div className="mt-3">
                        <span className="text-gray-600 text-sm">Specifications:</span>
                        <div className="mt-1 space-y-1">
                          {item.specifications.map((spec, specIndex) => (
                            <div key={specIndex} className="flex items-center text-sm">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2" />
                              {item.specificationMode === 'simple' ? (
                                <span className="text-gray-700">{spec}</span>
                              ) : (
                                <span className="text-gray-700">
                                  <span className="font-medium">{spec.label}</span>
                                  <span className="text-gray-600 ml-1">: {spec.value}</span>
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.notes && (
                      <div className="mt-3">
                        <span className="text-gray-600 text-sm">Notes:</span>
                        <p className="text-sm text-gray-700 mt-1">{item.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-gray-500">No items in this offer.</p>
            </div>
          )}

          {/* Offer Summary */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Offer Summary</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {activeOffer.totalItemsCount || activeOffer.offerItems?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Items</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatPriceWithCurrency(activeOffer.totalPrice || 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Base Price</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatPriceWithCurrency(activeOffer.totalNetto || 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Netto Price</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-600">Exclude PPN:</span>
                  <span className="font-medium">{activeOffer.excludePPN ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Item Acceptance Management removed - now handled in status update */}
        </>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500">No offers are available for this quotation.</p>
        </div>
      )}

      {/* Status Update Modal */}
      <BaseModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Update Status"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <CustomDropdown
              options={STATUS_OPTIONS}
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
            const totalOffers = offers.reduce((count, offerGroup) => {
              if (offerGroup.original) {
                return count + 1 + offerGroup.revisions.length;
              }
              return count + 1;
            }, 0);
            
            return totalOffers > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Winning Offer *</label>
                <CustomDropdown
                  options={(() => {
                    const allOffers = [];
                    offers.forEach((offerGroup, groupIndex) => {
                      if (offerGroup.original) {
                        // New grouped structure
                        const itemCount = offerGroup.original.offerItems?.length || 0;
                        allOffers.push({
                          value: offerGroup.original._id,
                          label: `Offer ${offerGroup.original.offerNumberInQuotation || (groupIndex + 1)} (Original) - ${itemCount} items`
                        });
                        offerGroup.revisions.forEach((revision) => {
                          const revisionItemCount = revision.offerItems?.length || 0;
                          allOffers.push({
                            value: revision._id,
                            label: `Offer ${revision.offerNumberInQuotation || (groupIndex + 1)} (Rev. ${revision.revision}) - ${revisionItemCount} items`
                          });
                        });
                      } else {
                        // Old flat structure
                        allOffers.push({
                          value: offerGroup._id,
                          label: `Offer ${groupIndex + 1}${offerGroup.revision > 0 ? ` (Rev. ${offerGroup.revision})` : ' (Original)'}`
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
            );
          })()}
          
          {/* Item Selection for Winning Offer */}
          {statusForm.status === 'win' && statusForm.selectedOfferId && (() => {
            // Find the selected offer and its items
            let selectedOfferItems = [];
            
            offers.forEach((offerGroup) => {
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
            onClick={() => setShowStatusModal(false)}
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

      {/* Header Edit Modal */}
      <BaseModal
        isOpen={showHeaderEditModal}
        onClose={handleCloseHeaderEditModal}
        title="Edit Quotation Header"
      >
        <form onSubmit={handleHeaderEditSubmit} className="space-y-4">
          {/* Customer Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name
            </label>
            <input
              type="text"
              value={headerEditForm.customerName}
              onChange={(e) => setHeaderEditForm(prev => ({ ...prev, customerName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Contact Person Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Person Name
            </label>
            <input
              type="text"
              value={headerEditForm.contactPerson.name}
              onChange={(e) => setHeaderEditForm(prev => ({ 
                ...prev, 
                contactPerson: { ...prev.contactPerson, name: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Contact Person Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Person Gender
            </label>
            <select
              value={headerEditForm.contactPerson.gender}
              onChange={(e) => setHeaderEditForm(prev => ({ 
                ...prev, 
                contactPerson: { ...prev.contactPerson, gender: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          {/* Marketing Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Marketing Name
            </label>
            <input
              type="text"
              value={headerEditForm.marketingName}
              onChange={(e) => setHeaderEditForm(prev => ({ ...prev, marketingName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>


          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={handleCloseHeaderEditModal}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Update Header
            </button>
          </div>
        </form>
      </BaseModal>

      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default QuotationDetails;

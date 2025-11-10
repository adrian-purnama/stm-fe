import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Save,
  ChevronDown,
  ChevronUp,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import ApiHelper from '../../utils/api/ApiHelper';
import { formatPriceWithCurrency } from '../../utils/helpers/priceFormatter';
import CustomDropdown from '../common/CustomDropdown';
// import { generateQuotationDocument } from '../../utils/templates/documentGenerator';
import BaseModal from '../modals/BaseModal';
// Removed OfferItemAcceptance import - no longer needed
import { QUOTATION_FORM_MODES } from './quotationModes';
import { getNotesImageAssetUrl } from '../../utils/helpers/assetUrlHelper';
import RFQDetailsView from './RFQDetailsView';
import RequestRFQModal from '../forms/RequestRFQModal';
import { useNavigate } from 'react-router-dom';

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

const WIN_SUB_STATUS_OPTIONS = [
  { value: 'order', label: 'Order' },
  { value: 'proceed', label: 'Proceed' },
  { value: 'delivery', label: 'Delivery' }
];

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const ROMAN_MONTH_OPTIONS = ROMAN_MONTHS.map((month) => ({ value: month, label: month }));

const getCurrentRomanMonthMeta = () => {
  const now = new Date();
  return {
    roman: ROMAN_MONTHS[now.getMonth()],
    year: String(now.getFullYear())
  };
};

const buildOcPreview = (sequence, monthRoman, year) => {
  if (!sequence) return 'Not set';
  const meta = getCurrentRomanMonthMeta();
  const roman = (monthRoman || meta.roman).toUpperCase();
  const normalizedYear = year || meta.year;
  return `${sequence}/${roman}/${normalizedYear}`;
};

const buildSpkPreview = (sequence, code, monthRoman, year) => {
  if (!sequence) return 'Not set';
  const safeCode = (code || '').toUpperCase();
  if (!safeCode) return 'Incomplete (missing code)';
  const meta = getCurrentRomanMonthMeta();
  const roman = (monthRoman || meta.roman).toUpperCase();
  const normalizedYear = year || meta.year;
  return `${sequence}/${safeCode}/${roman}/${normalizedYear}`;
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
  const currentRomanMeta = useMemo(() => getCurrentRomanMonthMeta(), []);
  const [statusForm, setStatusForm] = useState({
    status: '',
    reason: '',
    selectedOfferId: '',
    selectedItemIds: [],
    customReason: '',
    winSubStatus: 'order',
    ocSequence: '',
    ocMonthRoman: currentRomanMeta.roman,
    ocYear: currentRomanMeta.year,
    spkSequence: '',
    spkCode: '',
    spkMonthRoman: currentRomanMeta.roman,
    spkYear: currentRomanMeta.year
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
  const [rfqCollapsed, setRfqCollapsed] = useState(true);
  const [rfqDetails, setRfqDetails] = useState(null);
  const [rfqLoading, setRfqLoading] = useState(false);
  const [rfqError, setRfqError] = useState(null);
  const [showRfqEditModal, setShowRfqEditModal] = useState(false);
  const [rfqSupportLoading, setRfqSupportLoading] = useState(false);
  const [rfqSupportData, setRfqSupportData] = useState({
    approvers: [],
    quotationCreators: [],
    engineers: []
  });

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

  const fetchRfqDetails = useCallback(async () => {
    if (!headerState?.rfqId) return;
    try {
      setRfqLoading(true);
      setRfqError(null);
      const response = await ApiHelper.get(`/api/rfq/${headerState.rfqId}`);
      const fetchedRfq =
        response.data?.data?.rfq ||
        response.data?.rfq ||
        response.data?.data ||
        null;
      setRfqDetails(fetchedRfq);
    } catch (error) {
      console.error('Failed to fetch RFQ details:', error);
      setRfqError(error.response?.data?.message || 'Failed to load RFQ details');
    } finally {
      setRfqLoading(false);
    }
  }, [headerState?.rfqId]);

  useEffect(() => {
    if (headerState?.rfq) {
      setRfqDetails(headerState.rfq);
    } else if (headerState?.rfqId) {
      fetchRfqDetails();
    } else {
      setRfqDetails(null);
    }
  }, [headerState?.rfq, headerState?.rfqId, fetchRfqDetails]);

  const fetchRfqSupportData = useCallback(async () => {
    setRfqSupportLoading(true);
    try {
      const [approversRes, creatorsRes, engineersRes] = await Promise.all([
        ApiHelper.get('/api/rfq/approvers'),
        ApiHelper.get('/api/rfq/quotation-creators'),
        ApiHelper.get('/api/rfq/engineers')
      ]);
      setRfqSupportData({
        approvers: approversRes.data?.data?.approvers || [],
        quotationCreators: creatorsRes.data?.data?.quotationCreators || [],
        engineers: engineersRes.data?.data?.engineers || []
      });
    } catch (error) {
      console.error('Failed to load RFQ references:', error);
      toast.error('Failed to load RFQ references');
    } finally {
      setRfqSupportLoading(false);
    }
  }, []);

  const handleToggleRfqCollapse = () => {
    setRfqCollapsed(prev => !prev);
  };

  const handleRefreshRfq = async () => {
    await fetchRfqDetails();
    toast.success('RFQ details refreshed');
  };

  const navigate = useNavigate();

  const handleOpenRfqLink = () => {
    const rfqIdToOpen = rfqDetails?._id || headerState?.rfqId;
    if (!rfqIdToOpen) {
      toast.error('RFQ link is not available');
      return;
    }
    navigate(`/quotations/rfq/${rfqIdToOpen}`);
  };

  const handleOpenRfqEditModal = async () => {
    if (!rfqDetails && headerState?.rfqId) {
      await fetchRfqDetails();
    }
    await fetchRfqSupportData();
    setShowRfqEditModal(true);
  };

  const handleSubmitRfqEdit = async ({ data: update, newFiles = [], deleteDocumentIds = [] }) => {
    if (!rfqDetails?._id) return;

    try {
      await ApiHelper.patch(`/api/rfq/${rfqDetails._id}`, update);

      if (Array.isArray(deleteDocumentIds) && deleteDocumentIds.length > 0) {
        for (const documentId of deleteDocumentIds) {
          await ApiHelper.delete(`/api/rfq/${rfqDetails._id}/documents/${documentId}`);
        }
      }

      if (Array.isArray(newFiles) && newFiles.length > 0) {
        for (const file of newFiles) {
          const formData = new FormData();
          formData.append('document', file);
          await ApiHelper.post(`/api/rfq/${rfqDetails._id}/documents`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      }

      toast.success('RFQ updated successfully');
      setShowRfqEditModal(false);
      await fetchRfqDetails();
    } catch (error) {
      console.error('Failed to update RFQ:', error);
      toast.error(error.response?.data?.message || 'Failed to update RFQ');
    }
  };

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

  const lineOfBusinessType = headerState.lineOfBusiness?.type || 'karoseri';

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
    const currentMeta = getCurrentRomanMonthMeta();

    const ocNumber = headerState.ocNumber || '';
    const ocParts = ocNumber ? ocNumber.split('/') : [];
    const ocSequence =
      headerState.ocSequenceNumber ||
      (ocParts[0] || '').trim();
    const ocMonthRoman = (ocParts[1] || currentMeta.roman).toUpperCase();
    const ocYear = ocParts[2] || currentMeta.year;

    const spkNumber = headerState.spkNumber || '';
    const spkParts = spkNumber ? spkNumber.split('/') : [];
    const spkSequence =
      headerState.spkSequenceNumber ||
      (spkParts[0] || '').trim();
    const spkCode =
      headerState.spkCode ||
      (spkParts[1] || '').trim().toUpperCase();
    const spkMonthRoman =
      (spkParts.length >= 3 ? spkParts[2] : currentMeta.roman).toUpperCase();
    const spkYear = spkParts.length >= 4 ? spkParts[3] : currentMeta.year;

    const headerSelectedOfferId = headerState.selectedOfferId?.toString?.() || '';
    const headerSelectedItemIds =
      (headerState.selectedOfferItemIds || []).map((id) => id?.toString?.() ?? id) || [];

    const acceptedSelection = (() => {
      let foundOfferId = '';
      let foundItemIds = [];

      offers.forEach((offerGroup) => {
        const inspectOffer = (offer) => {
          if (!offer) return;
          const acceptedItems = (offer.offerItems || []).filter((item) => item.isAccepted);
          if (acceptedItems.length && !foundOfferId) {
            foundOfferId = offer._id?.toString?.() ?? offer._id;
            foundItemIds = acceptedItems.map((item) => item._id?.toString?.() ?? item._id);
          }
        };

        if (offerGroup.original) {
          inspectOffer(offerGroup.original);
        } else {
          inspectOffer(offerGroup);
        }
        (offerGroup.revisions || []).forEach(inspectOffer);
      });

      return {
        offerId: foundOfferId,
        itemIds: foundItemIds
      };
    })();

    const defaultOfferId = (() => {
      if (!offers.length) return '';
      const first = offers[0];
      if (first.original) {
        return first.original._id?.toString?.() ?? first.original._id ?? '';
      }
      return first._id?.toString?.() ?? first._id ?? '';
    })();

    const effectiveSelectedOfferId =
      headerSelectedOfferId || acceptedSelection.offerId || defaultOfferId;
    const effectiveSelectedItemIds =
      headerSelectedItemIds.length > 0 ? headerSelectedItemIds : acceptedSelection.itemIds;

    setStatusForm({
      status: headerState.status?.type || 'open',
      reason: headerState.status?.reason || '',
      selectedOfferId: effectiveSelectedOfferId,
      selectedItemIds: effectiveSelectedItemIds,
      customReason: '',
      winSubStatus: headerState.winSubStatus || 'order',
      ocSequence: ocSequence,
      ocMonthRoman,
      ocYear: String(ocYear),
      spkSequence: spkSequence,
      spkCode,
      spkMonthRoman,
      spkYear: String(spkYear)
    });
    setShowStatusModal(true);
  };

  const handleStatusChange = (newStatus) => {
    setStatusForm(prev => {
      const currentMeta = getCurrentRomanMonthMeta();
      const updated = { ...prev, status: newStatus };
      
      if (newStatus === 'open') {
        updated.reason = '';
        updated.customReason = '';
      }
      
      if (newStatus !== 'win') {
        updated.selectedOfferId = '';
        updated.selectedItemIds = [];
        updated.winSubStatus = 'order';
        updated.ocSequence = '';
        updated.ocMonthRoman = currentMeta.roman;
        updated.ocYear = currentMeta.year;
        updated.spkSequence = '';
        updated.spkCode = '';
        updated.spkMonthRoman = currentMeta.roman;
        updated.spkYear = currentMeta.year;
      }
      
      if (newStatus === 'win') {
        if (!prev.winSubStatus) {
          updated.winSubStatus = 'order';
        }
        if (!prev.ocSequence) {
          updated.ocSequence = '';
          updated.ocMonthRoman = currentMeta.roman;
          updated.ocYear = currentMeta.year;
        }
        if (!prev.spkSequence) {
          updated.spkSequence = '';
          updated.spkCode = '';
          updated.spkMonthRoman = currentMeta.roman;
          updated.spkYear = currentMeta.year;
        }

        if (!updated.selectedOfferId) {
          const defaultOfferId = (() => {
            if (!offers.length) return '';
            const first = offers[0];
            if (first.original) {
              return first.original._id?.toString?.() ?? first.original._id ?? '';
            }
            return first._id?.toString?.() ?? first._id ?? '';
          })();

          const acceptedSelection = (() => {
            let foundOfferId = '';
            let foundItemIds = [];

            offers.forEach((offerGroup) => {
              const inspectOffer = (offer) => {
                if (!offer) return;
                const acceptedItems = (offer.offerItems || []).filter((item) => item.isAccepted);
                if (acceptedItems.length && !foundOfferId) {
                  foundOfferId = offer._id?.toString?.() ?? offer._id;
                  foundItemIds = acceptedItems.map((item) => item._id?.toString?.() ?? item._id);
                }
              };

              if (offerGroup.original) {
                inspectOffer(offerGroup.original);
              } else {
                inspectOffer(offerGroup);
              }
              (offerGroup.revisions || []).forEach(inspectOffer);
            });

            return {
              offerId: foundOfferId,
              itemIds: foundItemIds
            };
          })();

          updated.selectedOfferId =
            acceptedSelection.offerId || defaultOfferId || updated.selectedOfferId;
          if (!updated.selectedItemIds.length) {
            updated.selectedItemIds = acceptedSelection.itemIds;
          }
        }
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
      const {
        status,
        reason,
        selectedOfferId,
        selectedItemIds,
        customReason,
        winSubStatus,
        ocSequence,
        ocMonthRoman,
        ocYear,
        spkSequence,
        spkCode,
        spkMonthRoman,
        spkYear
      } = statusForm;

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

      const totalOffers = offers.reduce((count, offerGroup) => {
        if (offerGroup.original) {
          return count + 1 + offerGroup.revisions.length;
        }
        return count + 1;
      }, 0);

      const normalizedWinningOfferId =
        selectedOfferId ||
        offers[0]?.original?._id?.toString?.() ||
        offers[0]?._id?.toString?.() ||
        '';

      if (status === 'win' && totalOffers > 1 && !normalizedWinningOfferId) {
        toast.error('Please choose the winning offer');
        return;
      }

      if (status === 'win' && normalizedWinningOfferId) {
        let selectedOfferItems = [];
        offers.forEach((offerGroup) => {
          const inspectOffer = (offer) => {
            if (!offer) return;
            if ((offer._id?.toString?.() ?? offer._id) === normalizedWinningOfferId) {
              selectedOfferItems = offer.offerItems || [];
            }
          };

          if (offerGroup.original) {
            inspectOffer(offerGroup.original);
          } else {
            inspectOffer(offerGroup);
          }
          (offerGroup.revisions || []).forEach(inspectOffer);
        });

        if (selectedOfferItems.length > 1 && (selectedItemIds?.length || 0) === 0) {
          toast.error('Please select at least one winning item');
          return;
        }
      }

      let finalReason = reason;
      if (reason === 'custom') {
        finalReason = customReason;
      }

      const payload = {
        status,
        reason: finalReason.trim() || undefined,
        selectedOfferId: status === 'win' ? normalizedWinningOfferId : undefined,
        selectedOfferItemIds:
          status === 'win'
            ? (selectedItemIds || []).map((id) => id?.toString?.() ?? id)
            : undefined
      };

      if (status === 'win') {
        const meta = getCurrentRomanMonthMeta();
        payload.winSubStatus = winSubStatus || 'order';

        const ocSequenceTrimmed = (ocSequence || '').trim();
        if (ocSequenceTrimmed) {
          payload.ocSequenceNumber = ocSequenceTrimmed;
          payload.ocMonthRoman = (ocMonthRoman || meta.roman).toUpperCase();
          payload.ocYear = Number(ocYear || meta.year);
        } else {
          payload.ocSequenceNumber = '';
        }

        const spkSequenceTrimmed = (spkSequence || '').trim();
        const spkCodeTrimmed = (spkCode || '').trim().toUpperCase();
        if (spkSequenceTrimmed) {
          if (!spkCodeTrimmed) {
            toast.error('SPK code is required when SPK number is provided');
            return;
          }
          payload.spkSequenceNumber = spkSequenceTrimmed;
          payload.spkLetterCode = spkCodeTrimmed;
          payload.spkMonthRoman = (spkMonthRoman || meta.roman).toUpperCase();
          payload.spkYear = Number(spkYear || meta.year);
        } else {
          if (spkCodeTrimmed) {
            toast.error('SPK number is required when SPK code is provided');
            return;
          }
          payload.spkSequenceNumber = '';
          payload.spkLetterCode = '';
        }
      }

      const response = await ApiHelper.patch(
        `/api/quotations/${encodeURIComponent(headerState.quotationNumber)}/status`,
        payload
      );

      setHeaderState(response.data.data);

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

      {/* RFQ Reference */}
      {(headerState.rfqId || rfqDetails) && (
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">RFQ Reference</h3>
              <p className="text-xs text-gray-500">
                {rfqDetails?.rfqNumber ? `RFQ #${rfqDetails.rfqNumber}` : 'Linked RFQ information'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleRfqCollapse}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {rfqCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                {rfqCollapsed ? 'Expand RFQ Details' : 'Collapse RFQ Details'}
              </button>
              <button
                type="button"
                onClick={handleOpenRfqLink}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Eye size={16} />
                Open RFQ
              </button>
              <button
                type="button"
                onClick={handleOpenRfqEditModal}
                disabled={rfqSupportLoading}
                className="inline-flex items-center gap-2 px-3 py-2 border border-emerald-200 rounded-md shadow-sm text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Edit size={16} />
                {rfqSupportLoading ? 'Preparing…' : 'Edit RFQ'}
              </button>
              <button
                type="button"
                onClick={handleRefreshRfq}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md shadow-sm text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
              >
                <Clock size={16} />
                Refresh
              </button>
            </div>
          </div>

          {rfqCollapsed && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
              {rfqLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                  Loading RFQ summary…
                </div>
              ) : rfqError ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {rfqError}
                </div>
              ) : rfqDetails ? (
                <>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    {rfqDetails.status && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 capitalize">
                        {rfqDetails.status.replace(/_/g, ' ')}
                      </span>
                    )}
                    {rfqDetails.priority && (
                      <span className="inline-flex items-center gap-2 text-xs text-gray-500">
                        Priority:{' '}
                        <span className="font-medium text-gray-800 capitalize">{rfqDetails.priority}</span>
                      </span>
                    )}
                    {rfqDetails.stage && (
                      <span className="inline-flex items-center gap-2 text-xs text-gray-500">
                        Stage:{' '}
                        <span className="font-medium text-gray-800 capitalize">{rfqDetails.stage}</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-700">
                    <div>
                      <span className="text-gray-500 block text-xs uppercase tracking-wide">Customer</span>
                      <span className="font-semibold text-gray-900">{rfqDetails.customerName || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs uppercase tracking-wide">Contact Person</span>
                      <span className="font-semibold text-gray-900">{rfqDetails.contactPerson?.name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs uppercase tracking-wide">Requester</span>
                      <span className="font-semibold text-gray-900">
                        {rfqDetails.requesterId?.fullName || rfqDetails.requesterId?.email || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs uppercase tracking-wide">Created</span>
                      <span className="font-semibold text-gray-900">{formatDate(rfqDetails.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs uppercase tracking-wide">Delivery Terms</span>
                      <span className="font-semibold text-gray-900">{rfqDetails.deliveryTerms || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs uppercase tracking-wide">Payment Terms</span>
                      <span className="font-semibold text-gray-900">{rfqDetails.paymentTerms || '-'}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    Expand the RFQ to review full engineering details or open it in a modal for a dedicated view.
                  </p>
                </>
              ) : (
                <div className="text-sm text-gray-500">RFQ details are not available.</div>
              )}
            </div>
          )}

          {!rfqCollapsed && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
              {rfqLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                  Loading RFQ details…
                </div>
              ) : rfqError ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {rfqError}
                </div>
              ) : rfqDetails ? (
                <div className="space-y-6">
                  <RFQDetailsView rfq={rfqDetails} loading={rfqLoading} />

                  {/* RFQ Items */}
                  {Array.isArray(rfqDetails.items) && rfqDetails.items.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">RFQ Items</h4>
                      <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                        {rfqDetails.items.map((item, index) => (
                          <div key={item._id || index} className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  Item {index + 1}: {item.karoseri || item.serviceName || item.sparepartName || 'Untitled'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Type: {item.templateMode || 'custom'}
                                </p>
                              </div>
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                {item.quantity || 1}{' '}
                                {(lineOfBusinessType === 'service' && 'unit(s)') ||
                                  (lineOfBusinessType === 'sparepart' && 'pcs') ||
                                  'pcs'}
                              </span>
                            </div>
                            {item.notes && (
                              <p className="mt-2 text-sm text-gray-600">
                                Notes: {item.notes}
                              </p>
                            )}
                            {item.specifications && item.specifications.length > 0 && (
                              <div className="mt-3 bg-gray-50 border border-gray-200 rounded-md p-3">
                                <p className="text-xs font-semibold text-gray-700 mb-2">Specifications</p>
                                <ul className="space-y-1 text-xs text-gray-600">
                                  {item.specifications.map((spec, specIndex) => (
                                    <li key={specIndex}>
                                      <span className="font-medium text-gray-700">{spec.category}:</span>{' '}
                                      {Array.isArray(spec.items)
                                        ? spec.items
                                            .map((entry) =>
                                              [entry.name, entry.specification].filter(Boolean).join(' - ')
                                            )
                                            .join(', ')
                                        : spec.description || '—'}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* RFQ Timeline */}
                  {Array.isArray(rfqDetails.timeline) && rfqDetails.timeline.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">RFQ Timeline</h4>
                      <div className="space-y-3">
                        {rfqDetails.timeline.map((entry, entryIndex) => (
                          <div key={entry._id || entryIndex} className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900 capitalize">
                                  {entry.action?.replace(/_/g, ' ') || 'update'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatDate(entry.timestamp, true)}
                                </p>
                              </div>
                              <span className="text-xs text-gray-600">
                                {entry.user?.fullName || entry.user?.email || 'System'}
                              </span>
                            </div>
                            {entry.notes && (
                              <p className="mt-2 text-sm text-gray-700">
                                {entry.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500">RFQ details are not available.</div>
              )}
            </div>
          )}
        </div>
      )}

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
                ).map((item, index) => {
                  const itemNumber = item.itemNumber || index + 1;
                  const isWinner =
                    headerState.status?.type === 'win' &&
                    headerState.selectedOfferItemIds &&
                    headerState.selectedOfferItemIds.includes(item._id);
                  const isService = lineOfBusinessType === 'service';
                  const isSparepart = lineOfBusinessType === 'sparepart';
                  const quantity = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
                  const basePriceValue = Number(item.price) || 0;
                  const discountRate = Number(item.discountValue) || 0;
                  const discountPerQty =
                    item.discountType === 'percentage'
                      ? Math.max((basePriceValue * discountRate) / 100, 0)
                      : Math.max(Number(item.discountValue) || 0, 0);
                  const commissionPerQty = Math.max(Number(item.commission) || 0, 0);
                  const nettoPerQty = Number(item.netto) || Math.max(basePriceValue - discountPerQty - commissionPerQty, 0);
                  const baseTotal = basePriceValue * quantity;
                  const discountTotal = discountPerQty * quantity;
                  const commissionTotal = commissionPerQty * quantity;
                  const nettoTotal = nettoPerQty * quantity;
                  const discountDescriptor =
                    item.discountType === 'percentage'
                      ? `${discountRate}% (${formatPriceWithCurrency(discountPerQty)})`
                      : formatPriceWithCurrency(discountPerQty);

                  return (
                    <div
                      key={item._id || index}
                      className={`border rounded-lg p-4 ${
                        isWinner ? 'border-green-200 bg-green-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">
                              {isService
                                ? `Service ${itemNumber}: ${item.serviceName || 'Untitled Service'}`
                                : `Item ${itemNumber}`}
                            </h4>
                            {isWinner && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                Winner
                              </span>
                            )}
                          </div>
                          {isService ? (
                            <p className="text-sm text-gray-600">
                              Qty:{' '}
                              <span className="font-semibold text-gray-900">
                                {quantity} {quantity > 1 ? 'units' : 'unit'}
                              </span>
                            </p>
                          ) : (
                            <>
                              {isSparepart ? (
                                <p className="text-sm text-gray-600">
                                  Sparepart: {item.sparepartName || `Item ${itemNumber}`}
                                </p>
                              ) : (
                                <>
                                  <p className="text-sm text-gray-600">
                                    {item.karoseri} - {item.chassis}
                                  </p>
                                  {item.drawingSpecification && (
                                    <p className="text-xs text-gray-500">
                                      Drawing: {item.drawingSpecification.drawingNumber || 'Selected'}
                                    </p>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                        <div className="text-right space-y-1">
                          <div className="text-xs uppercase text-gray-500">Netto / Qty</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {formatPriceWithCurrency(nettoPerQty)}
                          </div>
                          {quantity > 1 && (
                            <div className="text-xs text-gray-500">
                              Total: {formatPriceWithCurrency(nettoTotal)}
                            </div>
                          )}
                        </div>
                      </div>

                      {isService ? (
                        <div className="mt-4 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                              <p className="text-[11px] uppercase font-semibold text-blue-600 tracking-wide">
                                Base Price / Qty
                              </p>
                              <p className="text-lg font-semibold text-blue-800">
                                {formatPriceWithCurrency(basePriceValue)}
                              </p>
                              {quantity > 1 && (
                                <p className="text-xs text-blue-600 mt-1">
                                  Total: {formatPriceWithCurrency(baseTotal)}
                                </p>
                              )}
                            </div>

                            <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
                              <p className="text-[11px] uppercase font-semibold text-amber-600 tracking-wide">
                                Discount / Qty
                              </p>
                              <p className="text-lg font-semibold text-amber-700">
                                {discountDescriptor}
                              </p>
                              {quantity > 1 && (
                                <p className="text-xs text-amber-600 mt-1">
                                  Total: {formatPriceWithCurrency(discountTotal)}
                                </p>
                              )}
                            </div>

                            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                              <p className="text-[11px] uppercase font-semibold text-emerald-600 tracking-wide">
                                Commission / Qty
                              </p>
                              <p className="text-lg font-semibold text-emerald-700">
                                {formatPriceWithCurrency(commissionPerQty)}
                              </p>
                              {quantity > 1 && (
                                <p className="text-xs text-emerald-600 mt-1">
                                  Total: {formatPriceWithCurrency(commissionTotal)}
                                </p>
                              )}
                            </div>

                            <div className="rounded-lg border border-purple-100 bg-purple-50 p-4">
                              <p className="text-[11px] uppercase font-semibold text-purple-600 tracking-wide">
                                Netto / Qty
                              </p>
                              <p className="text-lg font-semibold text-purple-700">
                                {formatPriceWithCurrency(nettoPerQty)}
                              </p>
                              {quantity > 1 && (
                                <p className="text-xs text-purple-600 mt-1">
                                  Total: {formatPriceWithCurrency(nettoTotal)}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <p className="text-xs uppercase font-semibold text-gray-500 tracking-wide mb-2">
                              Price Breakdown
                            </p>
                            <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                              <span>{formatPriceWithCurrency(basePriceValue)}</span>
                              {discountPerQty > 0 && (
                                <span>
                                  − {formatPriceWithCurrency(discountPerQty)}
                                  {item.discountType === 'percentage' ? ` (${discountRate}%)` : ''}
                                </span>
                              )}
                              {commissionPerQty > 0 && (
                                <span>− {formatPriceWithCurrency(commissionPerQty)} (Komisi)</span>
                              )}
                              <span>= {formatPriceWithCurrency(nettoPerQty)} / qty</span>
                              {quantity > 1 && (
                                <span>→ {formatPriceWithCurrency(nettoTotal)} total</span>
                              )}
                            </div>
                          </div>

                          {Array.isArray(item.serviceDetails) && item.serviceDetails.length > 0 && (
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                              <p className="text-xs uppercase font-semibold tracking-wide text-gray-500 mb-2">
                                Service Details
                              </p>
                              <ul className="space-y-1 text-sm text-gray-700 list-disc list-inside">
                                {item.serviceDetails.map((detail, detailIndex) => (
                                  <li key={detailIndex}>{detail}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : isSparepart ? (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 block">Quantity</span>
                            <p className="font-medium">{quantity}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 block">Base Price</span>
                            <p className="font-medium">{formatPriceWithCurrency(basePriceValue)}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 block">Discount</span>
                            <p className="font-medium">
                              {item.discountType === 'percentage'
                                ? `${discountRate || 0}%`
                                : formatPriceWithCurrency(item.discountValue || 0)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600 block">Commission / Qty</span>
                            <p className="font-medium">{formatPriceWithCurrency(commissionPerQty)}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 block">Netto / Qty</span>
                            <p className="font-medium">{formatPriceWithCurrency(nettoPerQty)}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 block">Netto Total</span>
                            <p className="font-medium">{formatPriceWithCurrency(nettoTotal)}</p>
                          </div>
                        </div>
                      ) : (
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
                      )}

                      {!isService && item.specifications && item.specifications.length > 0 && (
                        <div className="mt-3">
                          <span className="text-gray-600 text-sm">Specifications:</span>
                          <div className="mt-2 space-y-3">
                            {item.specifications.map((spec, specIndex) => (
                              <div key={specIndex} className="bg-gray-50 rounded-lg p-3">
                                <h6 className="font-semibold text-gray-800 text-sm mb-2">
                                  {spec.category}
                                </h6>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {spec.items && spec.items.map((specItem, itemIndex) => (
                                    <div key={itemIndex} className="flex items-start space-x-2">
                                      <span className="font-medium text-gray-600 text-sm min-w-0 flex-shrink-0">
                                        {specItem.name}:
                                      </span>
                                      <span className="text-gray-700 text-sm break-words">
                                        {specItem.specification}
                                      </span>
                                    </div>
                                  ))}
                                </div>
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
                  );
                })}
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

      {/* RFQ Edit Modal */}
      {showRfqEditModal && (
        <RequestRFQModal
          isOpen={showRfqEditModal}
          onClose={() => setShowRfqEditModal(false)}
          onSubmit={handleSubmitRfqEdit}
          approvers={rfqSupportData.approvers}
          quotationCreators={rfqSupportData.quotationCreators}
          engineers={rfqSupportData.engineers}
          rfqToEdit={rfqDetails}
        />
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

          {statusForm.status === 'win' && (
            <div className="border border-green-200 bg-green-50/40 rounded-md p-4 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Win Sub Status
                </label>
                <CustomDropdown
                  options={WIN_SUB_STATUS_OPTIONS}
                  value={statusForm.winSubStatus}
                  onChange={(value) =>
                    setStatusForm((prev) => ({
                      ...prev,
                      winSubStatus: value || 'order'
                    }))
                  }
                  placeholder="Select win sub status"
                />
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Order Confirmation Number
                    </label>
                    <span className="text-xs text-gray-500">
                      Format: number/ROMAN/year
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={statusForm.ocSequence}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, '');
                        setStatusForm((prev) => ({
                          ...prev,
                          ocSequence: digitsOnly
                        }));
                      }}
                      placeholder="Number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <CustomDropdown
                      options={ROMAN_MONTH_OPTIONS}
                      value={statusForm.ocMonthRoman}
                      onChange={(value) =>
                        setStatusForm((prev) => ({
                          ...prev,
                          ocMonthRoman: (value || prev.ocMonthRoman || getCurrentRomanMonthMeta().roman).toUpperCase()
                        }))
                      }
                      placeholder="Month"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={statusForm.ocYear}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, '');
                        setStatusForm((prev) => ({
                          ...prev,
                          ocYear: digitsOnly
                        }));
                      }}
                      placeholder="Year"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Preview:{' '}
                    <span className="font-semibold text-gray-700">
                      {buildOcPreview(
                        statusForm.ocSequence,
                        statusForm.ocMonthRoman,
                        statusForm.ocYear
                      )}
                    </span>
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      SPK Number
                    </label>
                    <span className="text-xs text-gray-500">
                      Format: number/CODE/ROMAN/year
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={statusForm.spkSequence}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, '');
                        setStatusForm((prev) => ({
                          ...prev,
                          spkSequence: digitsOnly
                        }));
                      }}
                      placeholder="Number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={statusForm.spkCode}
                      onChange={(e) => {
                        const sanitized = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
                        setStatusForm((prev) => ({
                          ...prev,
                          spkCode: sanitized
                        }));
                      }}
                      placeholder="Code (e.g., MKT)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <CustomDropdown
                      options={ROMAN_MONTH_OPTIONS}
                      value={statusForm.spkMonthRoman}
                      onChange={(value) =>
                        setStatusForm((prev) => ({
                          ...prev,
                          spkMonthRoman: (value || prev.spkMonthRoman || getCurrentRomanMonthMeta().roman).toUpperCase()
                        }))
                      }
                      placeholder="Month"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={statusForm.spkYear}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, '');
                        setStatusForm((prev) => ({
                          ...prev,
                          spkYear: digitsOnly
                        }));
                      }}
                      placeholder="Year"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Preview:{' '}
                    <span className="font-semibold text-gray-700">
                      {buildSpkPreview(
                        statusForm.spkSequence,
                        statusForm.spkCode,
                        statusForm.spkMonthRoman,
                        statusForm.spkYear
                      )}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
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

          {/* Marketing Name - Read Only */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Marketing Name (Requester)
            </label>
            <input
              type="text"
              value={headerEditForm.marketingName}
              readOnly
              disabled
              className="w-full px-3 py-2 border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">
              Marketing name is automatically set based on the requester and cannot be edited.
            </p>
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

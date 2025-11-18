import React, { useState, useEffect, useCallback } from 'react';
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
  Save,
  Info,
  SlidersHorizontal,
  XCircle
} from 'lucide-react';
import { Tooltip } from 'react-tooltip';
import toast from 'react-hot-toast';
import ApiHelper from '../../utils/api/ApiHelper';
import { formatPriceWithCurrency } from '../../utils/helpers/priceFormatter';
import CustomDropdown from '../common/CustomDropdown';
import BaseModal from '../modals/BaseModal';
import { QUOTATION_FORM_MODES } from './quotationModes';
import { 
  updatePreferences, 
  getSectionPreferences,
  PREFERENCE_SECTIONS 
} from '../../utils/helpers/UserPreferences';

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

const WIN_SUB_STATUS_OPTIONS = [
  { value: 'order', label: 'Order' },
  { value: 'proceed', label: 'Proceed' },
  { value: 'delivery', label: 'Delivery' }
];

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

const formatWinSubStatus = (value) => {
  const option = WIN_SUB_STATUS_OPTIONS.find((opt) => opt.value === value);
  return option ? option.label : value;
};

const buildOcPreview = (sequence, monthRoman, year) => {
  if (!sequence) return 'Not set';
  const roman = (monthRoman || getCurrentRomanMonthMeta().roman).toUpperCase();
  const normalizedYear = year || getCurrentRomanMonthMeta().year;
  return `${sequence}/${roman}/${normalizedYear}`;
};

const resolveSpkCodeValue = (type) => {
  const normalized = (type || '').toString().trim().toUpperCase();
  if (normalized === '-' || normalized === '""' || normalized === '') return '-';
  if (normalized === 'P') return 'P';
  if (normalized === 'KBS') return 'KBS';
  return '-';
};

const buildSpkPreview = (sequence, monthRoman, type, year) => {
  if (!sequence) return 'Not set';
  const roman = (monthRoman || getCurrentRomanMonthMeta().roman).toUpperCase();
  const normalizedYear = year || getCurrentRomanMonthMeta().year;
  const codeValue = resolveSpkCodeValue(type);
  const displayCode = codeValue === '-' ? '' : codeValue;
  return `${sequence}/${roman}/${displayCode}/${normalizedYear}`;
};

const isRomanMonth = (value) => ROMAN_MONTHS.includes((value || '').toUpperCase());

const deriveSpkTypeFromCode = (code) => {
  const upper = (code || '').toString().trim().toUpperCase();
  if (upper === 'P') return 'P';
  if (upper === 'KBS') return 'KBS';
  if (upper === '-' || upper === '""' || !upper) return '-';
  return '-';
};

const QuotationList = ({ onView, onPreview, onEdit, onCreate, onDelete, showCreateButton = false, filterMode = 'all', apiEndpoint = '/api/quotations', actionMode = 'full' }) => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(new Set()); // Track which quotations are loading details
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });
  const [searchInput, setSearchInput] = useState('');
  const [chips, setChips] = useState([]); // [{ type: 'status', value: 'open' }, ...]
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    status: [],
    lineOfBusiness: [],
    customer: '',
    marketing: '',
    dateFrom: '',
    dateTo: ''
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
    customReason: '',
    winSubStatus: 'order',
    ocSequence: '',
    ocMonthRoman: ROMAN_MONTHS[new Date().getMonth()],
    ocYear: String(new Date().getFullYear()),
    spkSequence: '',
    spkType: '-',
    spkMonthRoman: ROMAN_MONTHS[new Date().getMonth()],
    spkYear: String(new Date().getFullYear())
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

  // Parse search tokens (like RFQ)
  const parseTokens = useCallback((input) => {
    const regex = /([a-z]+):("[^"]+"|\S+)|"([^"]+)"|(\S+)/g;
    const found = [];
    let m;
    while ((m = regex.exec(input))) {
      if (m[1] && m[2]) {
        let val = m[2];
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        found.push({ type: m[1], value: val });
      } else if (m[3]) {
        found.push({ type: 'phrase', value: m[3] });
      } else if (m[4]) {
        found.push({ type: 'global', value: m[4] });
      }
    }
    return found;
  }, []);

  const onSearchInput = (val) => {
    setSearchInput(val);
    // Don't reset pagination immediately - let debounced effect handle it
    // This prevents loading interruption while typing
  };

  const onRemoveChip = (idx) => {
    setChips((chips) => chips.filter((c, i) => i !== idx));
    setPagination((p) => ({ ...p, current: 1 }));
  };

  const onAddChipFromInput = () => {
    if (!searchInput.trim()) return;
    const tokens = parseTokens(searchInput.trim());
    setChips([...chips, ...tokens]);
    setSearchInput('');
  };

  const toggleMultiFilter = (key, value) => {
    setAdvancedFilters((prev) => {
      const currentValues = prev[key] || [];
      const exists = currentValues.includes(value);
      const updatedValues = exists
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];
      return {
        ...prev,
        [key]: updatedValues
      };
    });
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      status: [],
      lineOfBusiness: [],
      customer: '',
      marketing: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  // Build advanced filter chips
  const advancedFilterChips = [];
  const capitalize = (value = '') =>
    value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

  (advancedFilters.status || []).forEach((value) => {
    advancedFilterChips.push({
      key: `status-${value}`,
      label: `Status: ${capitalize(value)}`,
      onRemove: () => toggleMultiFilter('status', value)
    });
  });

  (advancedFilters.lineOfBusiness || []).forEach((value) => {
    advancedFilterChips.push({
      key: `lob-${value}`,
      label: `Line of Business: ${capitalize(value)}`,
      onRemove: () => toggleMultiFilter('lineOfBusiness', value)
    });
  });

  if (advancedFilters.customer) {
    advancedFilterChips.push({
      key: 'customer',
      label: `Customer: ${advancedFilters.customer}`,
      onRemove: () => setAdvancedFilters((prev) => ({ ...prev, customer: '' }))
    });
  }

  if (advancedFilters.marketing) {
    advancedFilterChips.push({
      key: 'marketing',
      label: `Marketing: ${advancedFilters.marketing}`,
      onRemove: () => setAdvancedFilters((prev) => ({ ...prev, marketing: '' }))
    });
  }

  if (advancedFilters.dateFrom) {
    advancedFilterChips.push({
      key: 'dateFrom',
      label: `From: ${advancedFilters.dateFrom}`,
      onRemove: () => setAdvancedFilters((prev) => ({ ...prev, dateFrom: '' }))
    });
  }

  if (advancedFilters.dateTo) {
    advancedFilterChips.push({
      key: 'dateTo',
      label: `To: ${advancedFilters.dateTo}`,
      onRemove: () => setAdvancedFilters((prev) => ({ ...prev, dateTo: '' }))
    });
  }

  const advancedFilterCount = advancedFilterChips.length;

  // Debounced search effect - only fetch after user stops typing
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (pagination && pagination.current) {
        fetchQuotations();
      }
    }, 500); // 500ms debounce delay

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination?.current, chips, searchInput, advancedFilters]);

  // Fetch quotation headers only (fast initial load)
  const fetchQuotations = async () => {
    try {
      // Only show loading spinner on initial load or when explicitly needed
      if (isInitialLoad || pagination?.current === 1) {
        setLoading(true);
      }
      
      // Build search string from chips and searchInput
      let search = '';
      chips.forEach((chip) => {
        if (chip.type === 'phrase') search += ' "' + chip.value + '"';
        else if (chip.type === 'global') search += ' ' + chip.value;
        else search += ` ${chip.type}:${chip.value}`;
      });
      if (searchInput.trim()) search += ' ' + searchInput.trim();
      
      const params = {
        page: pagination?.current || 1,
        limit: 10,
        filterMode,
        lightweight: 'true', // Request lightweight mode for fast header load
        search: search.trim() || undefined
      };

      // Add advanced filters
      if (advancedFilters.status?.length) {
        params.status = advancedFilters.status;
      }
      if (advancedFilters.lineOfBusiness?.length) {
        params.lineOfBusiness = advancedFilters.lineOfBusiness;
      }
      if (advancedFilters.customer) {
        params.customer = advancedFilters.customer;
      }
      if (advancedFilters.marketing) {
        params.marketing = advancedFilters.marketing;
      }
      if (advancedFilters.dateFrom) {
        params.startDate = advancedFilters.dateFrom;
      }
      if (advancedFilters.dateTo) {
        params.endDate = advancedFilters.dateTo;
      }

      // Remove undefined values
      Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === '') {
          delete params[key];
        }
      });

      const response = await ApiHelper.get(apiEndpoint, { params });
      const headers = Array.isArray(response.data.data) ? response.data.data : [];
      
      // Set quotations with empty offers (details will load asynchronously)
      setQuotations(headers);
      setPagination(response.data.pagination || { current: 1, pages: 1, total: 0 });
      
      // Trigger async loading of full details for each quotation
      // Fetch header details and offers separately for faster perceived performance
      headers.forEach(quotation => {
        const quotationNumber = quotation.header.quotationNumber || quotation.header._id?.toString();
        if (quotationNumber) {
            // Fetch full header details (populated user fields, customer info, etc.)
            fetchQuotationHeader(quotationNumber);
            // Fetch offers
            fetchQuotationDetails(quotationNumber);
        }
      });
      
      // Mark initial load as complete
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    } catch (error) {
      toast.error('Failed to fetch quotations');
      console.error('Error fetching quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch full header details for a quotation (async background fetch)
  const fetchQuotationHeader = async (quotationIdentifier) => {
    try {
      const quotationNumber = typeof quotationIdentifier === 'object' 
        ? (quotationIdentifier.quotationNumber || quotationIdentifier.toString())
        : quotationIdentifier;
      
      // Fetch full header details with populated fields
      const response = await ApiHelper.get(`${apiEndpoint}/${encodeURIComponent(quotationNumber)}/header`);
      const fullHeader = response.data.data || {};
      
      // Update the quotation header in state with full details
      setQuotations(prev => {
        const updated = prev.map(q => {
          const quoteNumber = q.header.quotationNumber || q.header._id?.toString();
          const compareNumber = quotationNumber.toString();
          
          const matches = quoteNumber === compareNumber || 
                          q.header.quotationNumber === compareNumber ||
                          (q.header._id && q.header._id.toString() === compareNumber);
          
          if (matches) {
            return {
              ...q,
              header: {
                ...q.header,
                ...fullHeader, // Merge full header data (customerName, populated user fields, etc.)
                _id: q.header._id // Preserve existing _id
              }
            };
          }
          return q;
        });
        
        return updated;
      });
    } catch (error) {
      console.error(`[QuotationList] Error fetching header for quotation ${quotationIdentifier}:`, error);
      // Silent failure - don't show error toast for background fetches
    }
  };

  // Fetch detailed data for a specific quotation (async background fetch)
  const fetchQuotationDetails = async (quotationIdentifier) => {
    try {
      // Mark this quotation as loading details (use string for Set key)
      const loadingKey = typeof quotationIdentifier === 'object' 
        ? (quotationIdentifier.toString() || quotationIdentifier.quotationNumber)
        : quotationIdentifier;
      setLoadingDetails(prev => new Set(prev).add(loadingKey));
      
      // Ensure we have quotationNumber (not _id) for the endpoint
      const quotationNumber = typeof quotationIdentifier === 'object' 
        ? (quotationIdentifier.quotationNumber || quotationIdentifier.toString())
        : quotationIdentifier;
      
      // Fetch full details for this quotation using the offers endpoint
      // This endpoint returns the grouped offer structure we need
      const response = await ApiHelper.get(`${apiEndpoint}/${encodeURIComponent(quotationNumber)}/offers`);
      const fetchedOffers = response.data.data || [];
      
      // Debug logging
      console.log(`[QuotationList] Fetched offers for ${quotationNumber}:`, {
        offersCount: fetchedOffers.length,
        offers: fetchedOffers,
        response: response.data
      });
      
      // Ensure fetchedOffers is an array
      if (!Array.isArray(fetchedOffers)) {
        console.warn(`[QuotationList] Offers for ${quotationNumber} is not an array:`, fetchedOffers);
        return;
      }
      
      // Update the quotation in state with full details
      // Match by quotationNumber since that's what we're using as identifier
      setQuotations(prev => {
        const updated = prev.map(q => {
          const quoteNumber = q.header.quotationNumber || q.header._id?.toString();
          const compareNumber = quotationNumber.toString();
          
          // Try multiple matching strategies
          const matches = quoteNumber === compareNumber || 
                          q.header.quotationNumber === compareNumber ||
                          (q.header._id && q.header._id.toString() === compareNumber);
          
          if (matches) {
            console.log(`[QuotationList] Updating quotation ${quoteNumber} with ${fetchedOffers.length} offer groups`);
            return {
              ...q,
              offers: fetchedOffers
            };
          }
          return q;
        });
        
        // Debug: Log if no match was found
        const foundMatch = updated.some(q => {
          const quoteNumber = q.header.quotationNumber || q.header._id?.toString();
          return (quoteNumber === quotationNumber.toString() || q.header.quotationNumber === quotationNumber.toString());
        });
        
        if (!foundMatch && prev.length > 0) {
          console.warn(`[QuotationList] No matching quotation found for ${quotationNumber}. Available:`, 
            prev.map(q => q.header.quotationNumber || q.header._id?.toString()));
        }
        
        return updated;
      });
    } catch (error) {
      console.error(`[QuotationList] Error fetching details for quotation ${quotationIdentifier}:`, error);
      console.error(`[QuotationList] Error details:`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      // Don't show error toast for background fetches - silent failure
    } finally {
      // Remove loading indicator - use the same quotationNumber key
      const quotationNumber = typeof quotationIdentifier === 'object' 
        ? (quotationIdentifier.quotationNumber || quotationIdentifier.toString())
        : quotationIdentifier;
      const removeKey = String(quotationNumber);
      
      setLoadingDetails(prev => {
        const newSet = new Set(prev);
        newSet.delete(removeKey);
        return newSet;
      });
    }
  };

  // Reset pagination when filters change (but don't fetch yet - debounced fetch will handle it)
  useEffect(() => {
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, [chips, advancedFilters]);

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
    const currentMeta = getCurrentRomanMonthMeta();
    const ocParts = (header.ocNumber || '').split('/');
    const spkParts = (header.spkNumber || '').split('/');

    const ocSequence = ocParts[0] || '';
    const ocRoman = (ocParts[1] || currentMeta.roman).toUpperCase();
    const ocYearValue = ocParts[2] || currentMeta.year;

    const currentSpkMeta = getCurrentRomanMonthMeta();
    const inferredSequence = header.spkSequenceNumber || (spkParts[0] || '').trim();
    let inferredMonth = (header.spkMonthRoman || '').toUpperCase();
    let inferredType = deriveSpkTypeFromCode(header.spkLetterCode || header.spkCode);
    let inferredYear = header.spkYear || currentSpkMeta.year;

    if (!inferredMonth || !isRomanMonth(inferredMonth)) {
      if (spkParts.length >= 4 && isRomanMonth(spkParts[1])) {
        inferredMonth = spkParts[1].toUpperCase();
        inferredType = deriveSpkTypeFromCode(spkParts[2]);
        inferredYear = spkParts[3] || currentSpkMeta.year;
      } else if (spkParts.length >= 4 && isRomanMonth(spkParts[2])) {
        inferredMonth = spkParts[2].toUpperCase();
        inferredType = deriveSpkTypeFromCode(spkParts[1]);
        inferredYear = spkParts[3] || currentSpkMeta.year;
      } else {
        inferredMonth = currentSpkMeta.roman;
      }
    }

    if (!inferredType) {
      inferredType = '-';
    }

    if (!inferredYear) {
      inferredYear = currentSpkMeta.year;
    }

    const headerSelectedOfferId = header.selectedOfferId?.toString?.() || '';
    const headerSelectedItemIds = (header.selectedOfferItemIds || []).map((id) => id?.toString?.() ?? id);

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

    setStatusModal({
      isOpen: true,
      header,
      offers
    });
    setStatusForm({
      status: header?.status?.type || 'open',
      reason: header?.status?.reason || '',
      selectedOfferId: effectiveSelectedOfferId,
      selectedItemIds: effectiveSelectedItemIds,
      customReason: '',
      winSubStatus: header?.winSubStatus || 'order',
      ocSequence,
      ocMonthRoman: ocRoman,
      ocYear: ocYearValue,
      spkSequence: inferredSequence,
      spkType: inferredType,
      spkMonthRoman: inferredMonth,
      spkYear: inferredYear
    });
  };

  const closeStatusModal = () => {
    setStatusModal({ isOpen: false, header: null, offers: [] });
    const currentMeta = getCurrentRomanMonthMeta();
    setStatusForm({
      status: '',
      reason: '',
      selectedOfferId: '',
      selectedItemIds: [],
      customReason: '',
      winSubStatus: 'order',
      ocSequence: '',
      ocMonthRoman: currentMeta.roman,
      ocYear: currentMeta.year,
      spkSequence: '',
      spkType: '-',
      spkMonthRoman: currentMeta.roman,
      spkYear: currentMeta.year
    });
  };

  const handleStatusChange = (newStatus) => {
    setStatusForm(prev => {
      const updated = { ...prev, status: newStatus };
      const currentMeta = getCurrentRomanMonthMeta();
      
      // Clear reason and customReason when status changes to open
      if (newStatus === 'open') {
        updated.reason = '';
        updated.customReason = '';
      }
      
      // Clear selectedOfferId when status is not 'win'
      if (newStatus !== 'win') {
        updated.selectedOfferId = '';
        updated.selectedItemIds = [];
        updated.spkSequence = '';
        updated.spkType = '-';
        updated.spkMonthRoman = currentMeta.roman;
        updated.spkYear = currentMeta.year;
      }
      
      if (newStatus === 'win') {
        if (!prev.winSubStatus) {
          updated.winSubStatus = 'order';
        }
        if (!prev.ocSequence) {
          updated.ocMonthRoman = currentMeta.roman;
          updated.ocYear = currentMeta.year;
        }
        if (!prev.spkSequence) {
          updated.spkMonthRoman = currentMeta.roman;
          updated.spkYear = currentMeta.year;
        }
        if (!updated.selectedOfferId) {
          const { header, offers } = statusModal;
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
                const items = (offer.offerItems || []).filter((item) => item.isAccepted);
                if (items.length && !foundOfferId) {
                  foundOfferId = offer._id?.toString?.() ?? offer._id;
                  foundItemIds = items.map((item) => item._id?.toString?.() ?? item._id);
                }
              };
              if (offerGroup.original) {
                inspectOffer(offerGroup.original);
              } else {
                inspectOffer(offerGroup);
              }
              (offerGroup.revisions || []).forEach(inspectOffer);
            });
            return { offerId: foundOfferId, itemIds: foundItemIds };
          })();

          updated.selectedOfferId = header?.selectedOfferId?.toString?.() || acceptedSelection.offerId || defaultOfferId;
          if (!updated.selectedItemIds.length) {
            updated.selectedItemIds = header?.selectedOfferItemIds?.map((id) => id?.toString?.() ?? id) || acceptedSelection.itemIds;
          }
        }
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
        spkType,
        spkMonthRoman,
        spkYear
      } = statusForm;
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

      const winningOfferId =
        selectedOfferId ||
        offers[0]?.original?._id?.toString?.() ||
        offers[0]?._id?.toString?.() ||
        '';
      if (status === 'win' && totalOffers > 1 && !winningOfferId) {
        toast.error('Please pick the winning offer');
        return;
      }

      // For win status, validate item selection if the offer has multiple items
      if (status === 'win' && winningOfferId) {
        // Find the selected offer and its items
        let selectedOfferItems = [];
        offers.forEach((offerGroup) => {
          if (offerGroup.original && (offerGroup.original._id?.toString?.() ?? offerGroup.original._id) === winningOfferId) {
            selectedOfferItems = offerGroup.original.offerItems || [];
          } else if (offerGroup.revisions) {
            const revision = offerGroup.revisions.find(
              (rev) => (rev._id?.toString?.() ?? rev._id) === winningOfferId
            );
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
        selectedOfferItemIds:
          status === 'win'
            ? (selectedItemIds || []).map((id) => id?.toString?.() ?? id)
            : undefined
      };

      if (status === 'win') {
        const currentMeta = getCurrentRomanMonthMeta();
        payload.winSubStatus = winSubStatus || 'order';

        const ocSequenceTrimmed = (ocSequence || '').trim();
        if (ocSequenceTrimmed) {
          payload.ocSequenceNumber = ocSequenceTrimmed;
          payload.ocMonthRoman = (ocMonthRoman || currentMeta.roman).trim().toUpperCase();
          payload.ocYear = Number(ocYear || currentMeta.year);
        } else {
          payload.ocSequenceNumber = '';
        }

        const spkSequenceTrimmed = (spkSequence || '').trim();
        if (spkSequenceTrimmed) {
          payload.spkSequenceNumber = spkSequenceTrimmed;
          payload.spkLetterCode = resolveSpkCodeValue(spkType);
          payload.spkMonthRoman = (spkMonthRoman || currentMeta.roman).trim().toUpperCase();
          payload.spkYear = Number(spkYear || currentMeta.year);
        } else {
          payload.spkSequenceNumber = '';
          payload.spkLetterCode = '';
        }
      }

      await ApiHelper.patch(
        `/api/quotations/${encodeURIComponent(header.quotationNumber)}/status`,
        payload
      );

      // Update local state with new status
      setQuotations(prev => 
        prev.map(q => {
          if (q.header.quotationNumber === header.quotationNumber) {
            return {
              ...q,
              header: {
                ...q.header,
                status: {
                  type: status,
                  reason: finalReason,
                  _id: q.header.status._id
                }
              }
            };
          }
          return q;
        })
      );

      // Update status form to reflect saved state
      setStatusForm(prev => ({
        ...prev,
        status,
        reason: finalReason,
        selectedOfferId: payload.selectedOfferId || '',
        selectedItemIds: payload.selectedOfferItemIds || [],
        winSubStatus: status === 'win' ? (payload.winSubStatus || 'order') : prev.winSubStatus,
        ocSequence: status === 'win' ? (payload.ocSequenceNumber || '') : prev.ocSequence,
        ocMonthRoman:
          status === 'win'
            ? (payload.ocMonthRoman || prev.ocMonthRoman || getCurrentRomanMonthMeta().roman)
            : prev.ocMonthRoman,
        ocYear: status === 'win' ? String(payload.ocYear || prev.ocYear || getCurrentRomanMonthMeta().year) : prev.ocYear,
        spkSequence: status === 'win' ? (payload.spkSequenceNumber || '') : prev.spkSequence,
        spkType:
          status === 'win'
            ? deriveSpkTypeFromCode(payload.spkLetterCode)
            : prev.spkType,
        spkMonthRoman:
          status === 'win'
            ? (payload.spkMonthRoman || prev.spkMonthRoman || getCurrentRomanMonthMeta().roman)
            : prev.spkMonthRoman,
        spkYear: status === 'win' ? String(payload.spkYear || prev.spkYear || getCurrentRomanMonthMeta().year) : prev.spkYear
      }));

      toast.success('Quotation status updated successfully');
      await fetchQuotations();
      closeStatusModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleFollowUpQuotation = async (header) => {
    try {
      await ApiHelper.patch(
        `/api/quotations/${encodeURIComponent(header.quotationNumber)}/follow-up`
      );
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

    const trimmedText = progressText.trim();
    const existingQuotation = (quotations || []).find(
      (q) => q.header.quotationNumber === quotationNumber
    );
    const originalEntry =
      existingQuotation?.header?.progress?.[index] ?? '';

    // Optimistically update the UI
    setQuotations(prev => {
      const newQuotations = [...prev];
      const quotationIndex = newQuotations.findIndex(q => q.header.quotationNumber === quotationNumber);
      if (quotationIndex !== -1) {
        const currentProgress = newQuotations[quotationIndex].header.progress || [];
        const newProgress = [...currentProgress];
        newProgress[index] = trimmedText;
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

    try {
      await ApiHelper.put(
        `/api/quotations/${encodeURIComponent(quotationNumber)}/progress/${index}`,
        { progress: trimmedText }
      );
      toast.success('Progress updated successfully');
      setEditingProgress(prev => {
        const newState = { ...prev };
        delete newState[`${quotationNumber}-${index}`];
        return newState;
      });
    } catch (error) {
      // Revert optimistic update on error
      setQuotations(prev => {
        const newQuotations = [...prev];
        const quotationIndex = newQuotations.findIndex(q => q.header.quotationNumber === quotationNumber);
        if (quotationIndex !== -1) {
          const currentProgress = newQuotations[quotationIndex].header.progress || [];
          const newProgress = [...currentProgress];
          newProgress[index] = originalEntry;
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
      await ApiHelper.delete(
        `/api/quotations/${encodeURIComponent(quotationNumber)}/progress/${index}`
      );
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
      <div className="flex flex-wrap items-center gap-2">
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

  // Check if a quotation is loading details
  const isQuotationLoadingDetails = (quotationId) => {
    // Check both quotationNumber and _id as string
    if (!quotationId) return false;
    
    const idStr = quotationId?.toString();
    const quoteNumber = typeof quotationId === 'object' ? quotationId.quotationNumber : quotationId;
    
    // Check if either the ID string or quotationNumber is in the loading set
    return loadingDetails.has(idStr) || loadingDetails.has(quoteNumber) || loadingDetails.has(quoteNumber?.toString());
  };

  // Only show loading spinner on initial load to avoid interrupting user while typing
  if (loading && isInitialLoad) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Quotations</h2>
        {showCreateButton && (
          <button
            onClick={onCreate}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            New Quotation
          </button>
        )}
      </div>

      {/* Search and Filter UI (like RFQ) */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 w-full">
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search by quotation number, customer, or use filters: status:open customer:ABC marketing:name..."
              value={searchInput}
              onChange={(e) => onSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddChipFromInput()}
            />
          </div>
          <button 
            onClick={() => {}}
            className="inline-flex items-center justify-center rounded-lg p-2.5 text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
            title="Search help"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {showAdvancedFilters ? 'Hide advanced filters' : 'Show advanced filters'}
            {advancedFilterCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 text-xs rounded-full bg-white text-blue-600 font-semibold">
                {advancedFilterCount}
              </span>
            )}
          </button>
        </div>

        {showAdvancedFilters && (
          <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <SlidersHorizontal className="w-4 h-4 text-blue-500" />
                Advanced Filters
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAdvancedFilters(false)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</p>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.filter(s => s.value).map((option) => {
                    const active = advancedFilters.status.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        onClick={() => toggleMultiFilter('status', option.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                          active
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Line of Business</p>
                <div className="flex flex-wrap gap-2">
                  {['karoseri', 'service', 'sparepart'].map((value) => {
                    const active = advancedFilters.lineOfBusiness.includes(value);
                    return (
                      <button
                        key={value}
                        onClick={() => toggleMultiFilter('lineOfBusiness', value)}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                          active
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-purple-400 hover:text-purple-600'
                        }`}
                      >
                        {capitalize(value)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Customer</p>
                <input
                  type="text"
                  value={advancedFilters.customer}
                  onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, customer: e.target.value }))}
                  placeholder="Customer name..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Marketing</p>
                <input
                  type="text"
                  value={advancedFilters.marketing}
                  onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, marketing: e.target.value }))}
                  placeholder="Marketing name..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Date Range</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">From</label>
                    <input
                      type="date"
                      value={advancedFilters.dateFrom}
                      onChange={(e) =>
                        setAdvancedFilters((prev) => ({
                          ...prev,
                          dateFrom: e.target.value
                        }))
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">To</label>
                    <input
                      type="date"
                      value={advancedFilters.dateTo}
                      min={advancedFilters.dateFrom || undefined}
                      onChange={(e) =>
                        setAdvancedFilters((prev) => ({
                          ...prev,
                          dateTo: e.target.value
                        }))
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chips UI */}
      <div className="mb-2 flex flex-wrap gap-2">
        {chips.map((chip, i) => (
          <span key={i} className="inline-flex items-center rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
            {chip.type}:{chip.value}
            <button className="ml-1" onClick={() => onRemoveChip(i)}>
              <XCircle className="h-3 w-3" />
            </button>
          </span>
        ))}
        {chips.length > 0 && (
          <button
            onClick={() => setChips([])}
            className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-200"
          >
            Clear Filters
          </button>
        )}
      </div>
      {advancedFilterChips.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {advancedFilterChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs text-purple-700"
            >
              {chip.label}
              <button
                onClick={chip.onRemove}
                className="text-purple-500 hover:text-purple-700"
              >
                <XCircle className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={clearAdvancedFilters}
            className="px-2.5 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
          >
            Clear advanced filters
          </button>
        </div>
      )}

      {/* Quotation Cards */}
      {(quotations || []).map((quotationData) => {
        const { header, offers } = quotationData;
        return (
          <div key={header._id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
            {/* Header Section */}
            <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900 sm:text-xl">{header.quotationNumber}</h3>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold sm:text-sm ${
                    header.lineOfBusiness?.type === 'karoseri' ? 'bg-blue-100 text-blue-800' :
                    header.lineOfBusiness?.type === 'service' ? 'bg-purple-100 text-purple-800' :
                    header.lineOfBusiness?.type === 'sparepart' ? 'bg-indigo-100 text-indigo-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {header.lineOfBusiness?.type?.charAt(0).toUpperCase() + header.lineOfBusiness?.type?.slice(1) || 'Karoseri'}
                  </span>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold sm:text-sm ${
                    statusClassMap[header.status?.type] || 'bg-gray-100 text-gray-800'
                  }`}>
                    {header.status?.type ? header.status.type.charAt(0).toUpperCase() + header.status.type.slice(1) : 'Open'}
                  </span>
                  {header.status?.reason && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 sm:text-sm">
                        Reason: {header.status.reason}
                    </span>
                  )}
                  </div>
                  
                  {/* Customer Info */}
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                    {header.customerName ? (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Building className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{header.customerName}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Building className="h-4 w-4 text-gray-300" />
                        <span className="h-4 w-24 animate-pulse rounded bg-gray-200 font-medium"></span>
                      </div>
                    )}
                    {header.contactPerson?.name ? (
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="h-4 w-4 text-gray-500" />
                        <span>{header.contactPerson.name} ({header.contactPerson.gender})</span>
                      </div>
                    ) : header.contactPerson === undefined ? (
                      <div className="flex items-center gap-2 text-gray-400">
                        <User className="h-4 w-4 text-gray-300" />
                        <span className="h-4 w-32 animate-pulse rounded bg-gray-200"></span>
                      </div>
                    ) : null}
                    {header.requesterId ? (
                      typeof header.requesterId === 'object' && header.requesterId.fullName ? (
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="h-4 w-4 text-gray-500" />
                          <span>Requester: {header.requesterId.fullName || header.requesterId.email}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-400">
                          <User className="h-4 w-4 text-gray-300" />
                          <span className="h-4 w-32 animate-pulse rounded bg-gray-200">Loading requester...</span>
                        </div>
                      )
                    ) : null}
                    {header.creatorId ? (
                      typeof header.creatorId === 'object' && header.creatorId.fullName ? (
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="h-4 w-4 text-gray-500" />
                          <span>Creator: {header.creatorId.fullName || header.creatorId.email}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-400">
                          <User className="h-4 w-4 text-gray-300" />
                          <span className="h-4 w-28 animate-pulse rounded bg-gray-200">Loading creator...</span>
                        </div>
                      )
                    ) : null}
                    {header.approverId ? (
                      typeof header.approverId === 'object' && header.approverId.fullName ? (
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="h-4 w-4 text-gray-500" />
                          <span>Approver: {header.approverId.fullName || header.approverId.email}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-400">
                          <User className="h-4 w-4 text-gray-300" />
                          <span className="h-4 w-32 animate-pulse rounded bg-gray-200">Loading approver...</span>
                        </div>
                      )
                    ) : null}
                  </div>

                  {/* Dates and Follow-up Status */}
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                    <span>Created: {formatDate(header.createdAt)}</span>
                  </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                    <span>Last Follow-up: {formatDate(header.lastFollowUpDate)}</span>
                      {header.followUpStatus ? (
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          header.followUpStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                          header.followUpStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {header.followUpStatus.label}
                        </span>
                      ) : header.lastFollowUpDate === undefined ? (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-400 animate-pulse">
                          <span className="h-3 w-16 rounded bg-gray-200"></span>
                        </span>
                      ) : null}
                  </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                    <span>Updated: {formatDate(header.updatedAt)}</span>
                  </div>
                </div>
              </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <button
                    onClick={() => {
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
                    className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100"
                  >
                    <Eye className="h-4 w-4" />
                    <span className="hidden text-xs sm:inline">Preview</span>
                  </button>
                {/* Action buttons - conditional based on actionMode */}
                {actionMode === 'full' && (
                  <>
                    <button
                      onClick={() => onEdit && onEdit({ mode: QUOTATION_FORM_MODES.NEW_OFFER, header })}
                      data-tooltip-id={`new-offer-${header._id}`}
                      data-tooltip-content="Create additional offer"
                      className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-sm font-medium text-green-600 transition-colors hover:bg-green-100"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden text-xs sm:inline">New Offer</span>
                    </button>
                    <button
                      onClick={() => openStatusModal(header, offers)}
                      data-tooltip-id={`status-${header._id}`}
                      data-tooltip-content="Update quotation status"
                      className="flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span className="hidden text-xs sm:inline">Status</span>
                    </button>
                    <button
                      onClick={() => handleFollowUpQuotation(header)}
                      data-tooltip-id={`followup-${header._id}`}
                      data-tooltip-content="Record follow-up for this quotation"
                      className="flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-sky-100"
                      >
                      <Clock className="h-4 w-4" />
                      <span className="hidden text-xs sm:inline">Follow-up</span>
                      </button>
                      <button
                        onClick={() => handleDeleteQuotation(header)}
                        data-tooltip-id={`delete-quotation-${header._id}`}
                        data-tooltip-content="Delete entire quotation"
                        className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden text-xs sm:inline">Delete</span>
                    </button>
                  </>
                )}
                </div>
              </div>
            </div>

            <div className="px-4 py-4 sm:px-6">
              {isQuotationLoadingDetails(header.quotationNumber || header._id) && offers.length === 0 ? (
                <div className="space-y-4">
                  <div className="animate-pulse">
                    <div className="h-20 bg-gray-200 rounded-lg mb-2"></div>
                    <div className="h-20 bg-gray-200 rounded-lg"></div>
                  </div>
                  <div className="text-xs text-gray-500 flex items-center">
                    <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></span>
                    <span>Loading details...</span>
                  </div>
                </div>
              ) : offers.length === 0 ? (
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
                                    {/* Offer action buttons - conditional based on actionMode */}
                                    {actionMode === 'full' && (
                                      <>
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
                                </>
                              )}
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
                                {/* Offer action buttons - conditional based on actionMode */}
                                {actionMode === 'full' && (
                                  <>
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
                                  </>
                                )}
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
                                    {/* Revision action buttons - conditional based on actionMode */}
                                    {actionMode === 'full' && (
                                      <>
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
                                      </>
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
                            checked={statusForm.selectedItemIds?.includes(item._id?.toString?.() ?? item._id) || false}
                            onChange={(e) => {
                              const itemId = item._id?.toString?.() ?? item._id;
                              if (e.target.checked) {
                                setStatusForm(prev => ({
                                  ...prev,
                                  selectedItemIds: [...(prev.selectedItemIds || []), itemId]
                                }));
                              } else {
                                setStatusForm(prev => ({
                                  ...prev,
                                  selectedItemIds: (prev.selectedItemIds || []).filter(id => id !== itemId)
                                }));
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              Item {item.itemNumber || (index + 1)}: {item.karoseri} - {item.chassis} {item.chassisModel ? `- ${item.chassisModel}` : ''}
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

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      SPK Number
                    </label>
                    <span className="text-xs text-gray-500">
                      Format: number/ROMAN/(P | "" | KBS)/year
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                      SPK Classification
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {SPK_TAX_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={`flex flex-col rounded-lg border px-3 py-2 text-sm transition ${
                            statusForm.spkType === option.value
                              ? 'border-blue-400 bg-blue-50 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="spkType"
                              value={option.value}
                              checked={statusForm.spkType === option.value}
                              onChange={() =>
                                setStatusForm((prev) => ({
                                  ...prev,
                                  spkType: option.value
                                }))
                              }
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-semibold">{option.label}</span>
                          </span>
                          <span className="mt-1 text-xs text-gray-500">
                            {option.description}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Preview:{' '}
                    <span className="font-semibold text-gray-700">
                      {buildSpkPreview(
                        statusForm.spkSequence,
                        statusForm.spkMonthRoman,
                        statusForm.spkType,
                        statusForm.spkYear
                      )}
                    </span>
                    {statusForm.spkType === 'P' && (
                      <span className="ml-2 text-xs text-blue-600">Pajak</span>
                    )}
                    {statusForm.spkType === '-' && (
                      <span className="ml-2 text-xs text-amber-600">Non pajak</span>
                    )}
                    {statusForm.spkType === 'KBS' && (
                      <span className="ml-2 text-xs text-emerald-600">Non pajak khusus non CV KBS</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
          
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



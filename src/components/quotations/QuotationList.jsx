import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
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
  XCircle,
  FileText,
  MessageSquare,
  AlertCircle
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
import { UserContext } from '../../utils/contexts/UserContext';

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'open', label: 'Open' },
  { value: 'win', label: 'Win' },
  { value: 'loss', label: 'Loss' },
  { value: 'close', label: 'Close' }
];

// Predefined reasons for loss and close statuses
const LOSS_REASONS = [
  { value: 'harga', label: 'Price' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'not_followed_up', label: 'Not Followed Up' },
  { value: 'custom_loss', label: 'Custom Reason' }
];

const CLOSE_REASONS = [
  { value: 'spek_berubah', label: 'Specification Changed' },
  { value: 'scope_berubah', label: 'Scope Changed' },
  { value: 'no_feedback', label: 'No Feedback' },
  { value: 'custom_close', label: 'Custom Reason' }
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

const buildOcPreview = (sequence, monthRoman, year, isRange = false, endSequence = '') => {
  if (!sequence) return 'Not set';
  const roman = (monthRoman || getCurrentRomanMonthMeta().roman).toUpperCase();
  const normalizedYear = year || getCurrentRomanMonthMeta().year;
  if (isRange && endSequence) {
    return `${sequence} - ${endSequence}/${roman}/${normalizedYear}`;
  }
  return `${sequence}/${roman}/${normalizedYear}`;
};

const resolveSpkCodeValue = (type) => {
  const normalized = (type || '').toString().trim().toUpperCase();
  if (normalized === '-' || normalized === '""' || normalized === '') return '-';
  if (normalized === 'P') return 'P';
  if (normalized === 'KBS') return 'KBS';
  return '-';
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

const isRomanMonth = (value) => ROMAN_MONTHS.includes((value || '').toUpperCase());

const deriveSpkTypeFromCode = (code) => {
  const upper = (code || '').toString().trim().toUpperCase();
  if (upper === 'P') return 'P';
  if (upper === 'KBS') return 'KBS';
  if (upper === '-' || upper === '""' || !upper) return '-';
  return '-';
};

// Helper function to get approval status badges
const getApprovalStatusBadges = (offer) => {
  if (!offer || !offer.downloadApproval) return null;
  
  const engineerStatus = offer.downloadApproval?.engineerApproval?.status || 'pending';
  const managementStatus = offer.downloadApproval?.managementApproval?.status || 'pending';
  
  const badges = [];
  
  // Engineer approval badge
  if (engineerStatus === 'approved') {
    badges.push(
      <span key="engineer-approved" className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800" title="Engineer Approved">
        Eng ✓
      </span>
    );
  } else if (engineerStatus === 'rejected') {
    badges.push(
      <span key="engineer-rejected" className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800" title={`Engineer Rejected: ${offer.downloadApproval?.engineerApproval?.rejectionNote || ''}`}>
        Eng ✗
      </span>
    );
  } else {
    badges.push(
      <span key="engineer-pending" className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800" title="Engineer Approval Pending">
        Eng ⏳
      </span>
    );
  }
  
  // Management approval badge
  if (managementStatus === 'approved') {
    badges.push(
      <span key="management-approved" className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800" title="Management Approved">
        Mgt ✓
      </span>
    );
  } else if (managementStatus === 'rejected') {
    badges.push(
      <span key="management-rejected" className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800" title={`Management Rejected: ${offer.downloadApproval?.managementApproval?.rejectionNote || ''}`}>
        Mgt ✗
      </span>
    );
  } else {
    badges.push(
      <span key="management-pending" className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800" title="Management Approval Pending">
        Mgt ⏳
      </span>
    );
  }
  
  return badges;
};

// Helper function to check if offer is approved
const isOfferApproved = (offer) => {
  if (!offer || !offer.downloadApproval) return false;
  return offer.downloadApproval?.engineerApproval?.status === 'approved' &&
         offer.downloadApproval?.managementApproval?.status === 'approved';
};

// Helper function to check if offer is rejected (either engineer or management or both)
const isOfferRejected = (offer) => {
  if (!offer || !offer.downloadApproval) return false;
  const engineerStatus = offer.downloadApproval?.engineerApproval?.status || 'pending';
  const managementStatus = offer.downloadApproval?.managementApproval?.status || 'pending';
  return engineerStatus === 'rejected' || managementStatus === 'rejected';
};

// Helper function to get rejection reasons display
const getRejectionReasons = (offer) => {
  if (!offer || !offer.downloadApproval) return null;
  
  const engineerStatus = offer.downloadApproval?.engineerApproval?.status || 'pending';
  const managementStatus = offer.downloadApproval?.managementApproval?.status || 'pending';
  const reasons = [];
  
  if (engineerStatus === 'rejected') {
    const rejectionNote = offer.downloadApproval?.engineerApproval?.rejectionNote?.trim() || '';
    // Only add if there's a note or approvedBy info
    if (rejectionNote || offer.downloadApproval?.engineerApproval?.approvedBy) {
      reasons.push({
        type: 'engineer',
        note: rejectionNote || 'No reason provided',
        approvedBy: offer.downloadApproval?.engineerApproval?.approvedBy
      });
    }
  }
  
  if (managementStatus === 'rejected') {
    const rejectionNote = offer.downloadApproval?.managementApproval?.rejectionNote?.trim() || '';
    // Only add if there's a note or approvedBy info
    if (rejectionNote || offer.downloadApproval?.managementApproval?.approvedBy) {
      reasons.push({
        type: 'management',
        note: rejectionNote || 'No reason provided',
        approvedBy: offer.downloadApproval?.managementApproval?.approvedBy
      });
    }
  }
  
  return reasons.length > 0 ? reasons : null;
};

const QuotationList = ({ onView, onPreview, onEdit, onCreate, onDelete, showCreateButton = false, filterMode = 'all', apiEndpoint = '/api/quotations', actionMode = 'full' }) => {
  const { user } = useContext(UserContext);
  
  // Helper function to check if user can edit/delete a quotation
  const canEditQuotation = useCallback((header) => {
    if (!user || !user.permissions) return false;
    
    const permissions = user.permissions.map(perm => {
      if (typeof perm === 'string') return perm;
      if (perm.name) return perm.name;
      return null;
    }).filter(Boolean);
    
    // Check if user has edit permissions
    const hasEditPermission = permissions.includes('quotation_edit') ||
                              permissions.includes('quotation_admin') ||
                              permissions.includes('admin') ||
                              permissions.includes('manager');
    
    // Check if user is the creator
    const creatorId = header?.creatorId?._id || header?.creatorId || header?.createdBy?._id || header?.createdBy;
    const userId = user.id || user._id;
    const isCreator = creatorId && userId && (
      creatorId.toString() === userId.toString() ||
      (typeof creatorId === 'object' && creatorId.toString() === userId.toString())
    );
    
    return hasEditPermission || isCreator;
  }, [user]);
  
  // Helper function to check if user can delete a quotation
  const canDeleteQuotation = useCallback((header) => {
    if (!user || !user.permissions) return false;
    
    const permissions = user.permissions.map(perm => {
      if (typeof perm === 'string') return perm;
      if (perm.name) return perm.name;
      return null;
    }).filter(Boolean);
    
    // Check if user has delete permissions
    const hasDeletePermission = permissions.includes('quotation_delete') ||
                                 permissions.includes('quotation_admin') ||
                                 permissions.includes('admin') ||
                                 permissions.includes('manager');
    
    // Check if user is the creator
    const creatorId = header?.creatorId?._id || header?.creatorId || header?.createdBy?._id || header?.createdBy;
    const userId = user.id || user._id;
    const isCreator = creatorId && userId && (
      creatorId.toString() === userId.toString() ||
      (typeof creatorId === 'object' && creatorId.toString() === userId.toString())
    );
    
    return hasDeletePermission || isCreator;
  }, [user]);

  // Download approver can add manager notes
  const canAddManagerNotes = useMemo(() => {
    if (!user || !user.permissions) return false;
    const permissions = user.permissions.map(perm => {
      if (typeof perm === 'string') return perm;
      if (perm.name) return perm.name;
      return null;
    }).filter(Boolean);
    return permissions.includes('quotation_download_approver');
  }, [user]);

  // All quotation viewer sees notes when added by download approver
  const hasAllQuotationViewer = useMemo(() => {
    if (!user || !user.permissions) return false;
    const permissions = user.permissions.map(perm => {
      if (typeof perm === 'string') return perm;
      if (perm.name) return perm.name;
      return null;
    }).filter(Boolean);
    return permissions.includes('all_quotation_viewer');
  }, [user]);
  
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(new Set()); // Track which quotations are loading details
  const [loadingMore, setLoadingMore] = useState(false); // Track if loading more items
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [chips, setChips] = useState([]); // [{ type: 'status', value: 'open' }, ...]
  const [advancedFilters, setAdvancedFilters] = useState({
    status: [],
    customer: ''
  });
  const [showSearchHelp, setShowSearchHelp] = useState(false);
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    header: null,
    offers: []
  });
  const [managerNotesModal, setManagerNotesModal] = useState({
    isOpen: false,
    header: null,
    manager_notes: ''
  });
  const [managerNotesSaving, setManagerNotesSaving] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: '',
    reason: '',
    selectedOfferId: '',
    selectedItemIds: [],
    customReason: '',
    winSubStatus: 'order',
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
  // Quotation number pattern: e.g., "11/QUO/STM/XI/2025" or "2/quo/XII/2025"
  const QUOTATION_NUMBER_PATTERN = /^\d+\/[A-Z]+\/[A-Z]+\/[IVX]+\/\d+$/i;
  
  const parseTokens = useCallback((input) => {
    const trimmed = input.trim();
    
    // Check if the entire input looks like a quotation number
    if (QUOTATION_NUMBER_PATTERN.test(trimmed)) {
      return [{ type: 'global', value: trimmed }];
    }
    
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
        // Check if this token looks like a quotation number
        if (QUOTATION_NUMBER_PATTERN.test(m[4])) {
          found.push({ type: 'global', value: m[4] });
        } else {
          found.push({ type: 'global', value: m[4] });
        }
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
    setCurrentPage(1);
    setQuotations([]);
    setHasMore(true);
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
      customer: ''
    });
  };

  // Build filter chips for display
  const filterChips = [];
  const capitalize = (value = '') =>
    value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

  (advancedFilters.status || []).forEach((value) => {
    filterChips.push({
      key: `status-${value}`,
      label: `Status: ${capitalize(value)}`,
      onRemove: () => toggleMultiFilter('status', value)
    });
  });

  if (advancedFilters.customer?.trim()) {
    filterChips.push({
      key: 'customer',
      label: `Customer: ${advancedFilters.customer.trim()}`,
      onRemove: () => setAdvancedFilters((prev) => ({ ...prev, customer: '' }))
    });
  }

  // Initial load effect
  useEffect(() => {
    if (isInitialLoad) {
      fetchQuotations(true);
    }
  }, []); // Only run on mount

  // Debounced search effect - only fetch after user stops typing
  useEffect(() => {
    if (isInitialLoad) return; // Skip if still on initial load
    
    const timeout = setTimeout(() => {
      fetchQuotations(true); // Reset and fetch first page
    }, 500); // 500ms debounce delay

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, advancedFilters]);

  // Fetch quotation headers only (fast initial load)
  const fetchQuotations = async (reset = false) => {
    try {
      // Determine which page to fetch
      const pageToFetch = reset ? 1 : currentPage;
      
      // If resetting, clear existing quotations and reset page
      if (reset) {
        setQuotations([]);
        setCurrentPage(1);
        setHasMore(true);
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      // One filter at a time: quotation number (search), status, or customer (backend else-if)
      const params = {
        page: pageToFetch,
        limit: 10,
        filterMode,
        lightweight: 'true' // Request lightweight mode for fast header load
      };
      const searchVal = searchInput.trim();
      const customerVal = advancedFilters.customer?.trim();
      if (searchVal) {
        params.search = searchVal;
      } else if (advancedFilters.status?.length) {
        params.status = advancedFilters.status;
      } else if (customerVal) {
        params.customer = customerVal;
      }

      // Remove undefined values
      Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === '') {
          delete params[key];
        }
      });

      console.log('[QuotationList] Fetching with params:', params);
      const response = await ApiHelper.get(apiEndpoint, { params });
      const headers = Array.isArray(response.data.data) ? response.data.data : [];
      const paginationData = response.data.pagination || { current: 1, pages: 1, total: 0 };
      
      // Append or replace quotations based on reset flag
      if (reset) {
        setQuotations(headers);
        setCurrentPage(2); // Next page to fetch will be 2
      } else {
        setQuotations(prev => [...prev, ...headers]);
        setCurrentPage(prev => prev + 1); // Increment for next fetch
      }
      
      // Update pagination state
      setTotal(paginationData.total || 0);
      const nextPage = paginationData.current + 1;
      setHasMore(nextPage <= paginationData.pages);
      
      // Trigger async loading of full details for each quotation
      // Fetch header details and offers separately for faster perceived performance
      // Limit concurrent requests to prevent memory issues and API overload
      const fetchWithLimit = async (items, limit, fn) => {
        for (let i = 0; i < items.length; i += limit) {
          const batch = items.slice(i, i + limit);
          // Process batch sequentially to avoid overwhelming the API
          for (const item of batch) {
            await fn(item);
          }
          // Small delay between batches to prevent memory buildup
          if (i + limit < items.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      };

      // Process quotations in batches of 5 to limit concurrent requests
      const quotationsToFetch = headers.filter(q => q.header);
      await fetchWithLimit(quotationsToFetch, 5, async (quotation) => {
        if (quotation.header) {
          // Fetch full header details (populated user fields, customer info, etc.)
          await fetchQuotationHeader(quotation.header);
          // Fetch offers
          await fetchQuotationDetails(quotation.header);
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
      setLoadingMore(false);
    }
  };

  // Fetch full header details for a quotation (async background fetch)
  const fetchQuotationHeader = async (quotationIdentifier) => {
    try {
      // Prefer using _id when available to avoid URL encoding issues with slashes
      let url;
      let quotationNumber;
      
      if (typeof quotationIdentifier === 'object' && quotationIdentifier._id) {
        // Use by-id endpoint when _id is available (avoids encoding issues)
        url = `/api/quotations/by-id/${quotationIdentifier._id}`;
        quotationNumber = quotationIdentifier.quotationNumber || quotationIdentifier._id.toString();
      } else {
        // Fall back to quotationNumber (must encode properly)
        quotationNumber = typeof quotationIdentifier === 'object' 
          ? (quotationIdentifier.quotationNumber || quotationIdentifier.toString())
          : quotationIdentifier;
        url = `${apiEndpoint}/${encodeURIComponent(quotationNumber)}/header`;
      }
      
      // Fetch full header details with populated fields
      const response = await ApiHelper.get(url);
      
      // Handle different response structures
      let fullHeader = {};
      if (typeof quotationIdentifier === 'object' && quotationIdentifier._id) {
        // by-id endpoint returns full quotation object
        const quotationData = response.data.data;
        if (quotationData && quotationData.header) {
          fullHeader = quotationData.header;
        } else if (quotationData) {
          fullHeader = quotationData;
        }
      } else {
        // /header endpoint returns header object directly
        fullHeader = response.data.data || {};
      }
      
      // Update the quotation header in state with full details
      setQuotations(prev => {
        const updated = prev.map(q => {
          const quoteNumber = q.header.quotationNumber || q.header._id?.toString();
          const compareNumber = quotationNumber.toString();
          
          const matches = quoteNumber === compareNumber || 
                          q.header.quotationNumber === compareNumber ||
                          (q.header._id && q.header._id.toString() === compareNumber) ||
                          (typeof quotationIdentifier === 'object' && quotationIdentifier._id && 
                           q.header._id && q.header._id.toString() === quotationIdentifier._id.toString());
          
          if (matches) {
            return {
              ...q,
              header: {
                ...q.header,
                ...fullHeader, // Merge full header data (customerName, populated user fields, etc.)
                _id: q.header._id || fullHeader._id // Preserve existing _id or use from response
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
      
      // Prefer using _id when available to avoid URL encoding issues with slashes
      let url;
      if (typeof quotationIdentifier === 'object' && quotationIdentifier._id) {
        // Use by-id endpoint when _id is available (avoids encoding issues)
        url = `/api/quotations/by-id/${quotationIdentifier._id}`;
      } else {
        // Fall back to quotationNumber (must encode properly)
        const quotationNumber = typeof quotationIdentifier === 'object' 
          ? (quotationIdentifier.quotationNumber || quotationIdentifier.toString())
          : quotationIdentifier;
        url = `${apiEndpoint}/${encodeURIComponent(quotationNumber)}/offers`;
      }
      
      // Fetch full details for this quotation
      const response = await ApiHelper.get(url);
      let fetchedOffers = [];
      
      // Handle different response structures
      if (typeof quotationIdentifier === 'object' && quotationIdentifier._id) {
        // by-id endpoint returns full quotation object with offers array
        const quotationData = response.data.data;
        if (quotationData && quotationData.offers) {
          fetchedOffers = Array.isArray(quotationData.offers) ? quotationData.offers : [];
        } else if (quotationData && Array.isArray(quotationData)) {
          fetchedOffers = quotationData;
        }
      } else {
        // /offers endpoint returns offers array directly
        fetchedOffers = response.data.data || [];
      }
      
      // Debug logging
      const quotationNumber = typeof quotationIdentifier === 'object' 
        ? (quotationIdentifier.quotationNumber || quotationIdentifier.toString())
        : quotationIdentifier;
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
      // Match by quotationNumber or _id
      setQuotations(prev => {
        const updated = prev.map(q => {
          const quoteNumber = q.header.quotationNumber || q.header._id?.toString();
          const compareNumber = quotationNumber.toString();
          
          // Try multiple matching strategies
          const matches = quoteNumber === compareNumber || 
                          q.header.quotationNumber === compareNumber ||
                          (q.header._id && q.header._id.toString() === compareNumber) ||
                          (typeof quotationIdentifier === 'object' && quotationIdentifier._id && 
                           q.header._id && q.header._id.toString() === quotationIdentifier._id.toString());
          
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
          const compareId = typeof quotationIdentifier === 'object' && quotationIdentifier._id 
            ? quotationIdentifier._id.toString() 
            : null;
          return (quoteNumber === quotationNumber.toString() || 
                  q.header.quotationNumber === quotationNumber.toString() ||
                  (compareId && q.header._id && q.header._id.toString() === compareId));
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

  // Reset infinite scroll when filters change (but don't fetch yet - debounced fetch will handle it)
  useEffect(() => {
    setCurrentPage(1);
    setQuotations([]);
    setHasMore(true);
  }, [chips, advancedFilters, searchInput]);

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const openManagerNotesModal = (header) => {
    const key = header.quotationNumber || header._id?.toString();
    const latest = quotations.find(q => (q.header.quotationNumber || q.header._id?.toString()) === key);
    const notes = (latest?.header?.manager_notes ?? header?.manager_notes ?? '').trim();
    setManagerNotesModal({
      isOpen: true,
      header: latest?.header || header,
      manager_notes: notes
    });
  };

  const handleSaveManagerNotes = async () => {
    const { header, manager_notes } = managerNotesModal;
    if (!header) return;
    setManagerNotesSaving(true);
    try {
      const quotationNumber = header.quotationNumber || header._id?.toString();
      const baseUrl = apiEndpoint === '/api/quotations/all' ? '/api/quotations' : apiEndpoint;
      const res = await ApiHelper.patch(
        `${baseUrl}/${encodeURIComponent(quotationNumber)}/manager-notes`,
        { manager_notes: (manager_notes || '').trim() }
      );
      const savedNotes = (res?.data?.data?.manager_notes ?? manager_notes ?? '').trim();
      const key = header.quotationNumber || header._id?.toString();
      setQuotations(prev => prev.map(q => {
        const qKey = q.header.quotationNumber || q.header._id?.toString();
        if (qKey === key) {
          return { ...q, header: { ...q.header, manager_notes: savedNotes } };
        }
        return q;
      }));
      setManagerNotesModal({ isOpen: false, header: null, manager_notes: '' });
      toast.success('Manager notes saved');
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to save manager notes';
      toast.error(msg);
    } finally {
      setManagerNotesSaving(false);
    }
  };

  const openStatusModal = (header, offers) => {
    const currentMeta = getCurrentRomanMonthMeta();
    
    // Parse OC number (support range format: "10 - 100/XII/2025" or "10/XII/2025")
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
    } else {
      const ocParts = (header.ocNumber || '').split('/');
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
    const ocRoman = (header.ocMonthRoman || currentMeta.roman).toUpperCase();
    const ocYearValue = header.ocYear || currentMeta.year;

    // Parse SPK number (support range format)
    let spkSequence = '';
    let spkSequenceEnd = '';
    const spkParts = (header.spkNumber || '').split('/');
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
    } else {
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
    const currentSpkMeta = getCurrentRomanMonthMeta();
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

    // Determine if current reason is a custom reason
    const currentStatus = header?.status?.type || 'open';
    const currentReason = header?.status?.reason || '';
    
    // Check if reason is one of the predefined values
    const predefinedLossReasons = ['harga', 'delivery', 'not_followed_up'];
    const predefinedCloseReasons = ['spek_berubah', 'scope_berubah', 'no_feedback'];
    const allPredefinedReasons = [...predefinedLossReasons, ...predefinedCloseReasons];
    
    // Check if reason matches a predefined value (case-insensitive comparison)
    const normalizedReason = currentReason.toLowerCase().trim();
    const isPredefinedReason = allPredefinedReasons.some(predefined => 
      normalizedReason === predefined.toLowerCase() || 
      normalizedReason === predefined
    );
    
    // If reason exists but is not predefined, it's a custom reason
    let formReason = currentReason;
    let formCustomReason = '';
    
    if (currentReason && !isPredefinedReason) {
      // It's a custom reason - set dropdown to custom and fill textarea
      if (currentStatus === 'loss') {
        formReason = 'custom_loss';
      } else if (currentStatus === 'close') {
        formReason = 'custom_close';
      }
      formCustomReason = currentReason; // Store the actual custom reason text
    } else if (currentReason) {
      // It's a predefined reason - use as is
      formReason = currentReason;
      formCustomReason = '';
    } else {
      // No reason set
      formReason = '';
      formCustomReason = '';
    }

    setStatusModal({
      isOpen: true,
      header,
      offers
    });
    setStatusForm({
      status: currentStatus,
      reason: formReason,
      selectedOfferId: effectiveSelectedOfferId,
      selectedItemIds: effectiveSelectedItemIds,
      customReason: formCustomReason,
      winSubStatus: header?.winSubStatus || 'order',
      ocSequence,
      ocSequenceEnd,
      ocMonthRoman: ocRoman,
      ocYear: ocYearValue,
      spkSequence,
      spkSequenceEnd,
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
      ocSequenceEnd: '',
      ocMonthRoman: currentMeta.roman,
      ocYear: currentMeta.year,
      spkSequence: '',
      spkSequenceEnd: '',
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
        updated.ocSequence = '';
        updated.ocSequenceEnd = '';
        updated.ocMonthRoman = currentMeta.roman;
        updated.ocYear = currentMeta.year;
        updated.spkSequence = '';
        updated.spkSequenceEnd = '';
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
        ocSequenceEnd,
        ocMonthRoman,
        ocYear,
        spkSequence,
        spkSequenceEnd,
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

      if ((status === 'loss' || status === 'close') && (reason === 'custom_loss' || reason === 'custom_close') && !customReason.trim()) {
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
      if (reason === 'custom_loss' || reason === 'custom_close') {
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
          // If range is provided, send both start and end
          if (ocSequenceEnd && ocSequenceEnd.trim()) {
            payload.ocSequenceNumber = `${ocSequenceTrimmed} - ${ocSequenceEnd.trim()}`;
          } else {
            payload.ocSequenceNumber = ocSequenceTrimmed;
          }
          payload.ocMonthRoman = (ocMonthRoman || currentMeta.roman).trim().toUpperCase();
          payload.ocYear = Number(ocYear || currentMeta.year);
        } else {
          payload.ocSequenceNumber = '';
        }

        const spkSequenceTrimmed = (spkSequence || '').trim();
        if (spkSequenceTrimmed) {
          // If range is provided, send both start and end
          if (spkSequenceEnd && spkSequenceEnd.trim()) {
            payload.spkSequenceNumber = `${spkSequenceTrimmed} - ${spkSequenceEnd.trim()}`;
          } else {
            payload.spkSequenceNumber = spkSequenceTrimmed;
          }
          payload.spkLetterCode = resolveSpkCodeValue(spkType);
          payload.spkMonthRoman = (spkMonthRoman || currentMeta.roman).trim().toUpperCase();
          payload.spkYear = Number(spkYear || currentMeta.year);
        } else {
          payload.spkSequenceNumber = '';
          payload.spkLetterCode = '';
        }
      }

      // Prefer using _id when available to avoid URL encoding issues
      const quotationId = header._id || header.quotationNumber;
      const statusUrl = header._id 
        ? `/api/quotations/${quotationId}/status`
        : `/api/quotations/${encodeURIComponent(quotationId)}/status`;
      await ApiHelper.patch(statusUrl, payload);

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
      // Parse OC and SPK sequences from response (may be ranges)
      let parsedOcSequence = '';
      let parsedOcSequenceEnd = '';
      if (status === 'win' && payload.ocSequenceNumber) {
        const sequencePart = payload.ocSequenceNumber.toString().trim();
        const rangeMatch = sequencePart.match(/^(\d+)\s*-\s*(\d+)$/);
        if (rangeMatch) {
          parsedOcSequence = rangeMatch[1];
          parsedOcSequenceEnd = rangeMatch[2];
        } else {
          parsedOcSequence = sequencePart;
        }
      }

      let parsedSpkSequence = '';
      let parsedSpkSequenceEnd = '';
      if (status === 'win' && payload.spkSequenceNumber) {
        const sequencePart = payload.spkSequenceNumber.toString().trim();
        const rangeMatch = sequencePart.match(/^(\d+)\s*-\s*(\d+)$/);
        if (rangeMatch) {
          parsedSpkSequence = rangeMatch[1];
          parsedSpkSequenceEnd = rangeMatch[2];
        } else {
          parsedSpkSequence = sequencePart;
        }
      }

      setStatusForm(prev => ({
        ...prev,
        status,
        reason: finalReason,
        selectedOfferId: payload.selectedOfferId || '',
        selectedItemIds: payload.selectedOfferItemIds || [],
        winSubStatus: status === 'win' ? (payload.winSubStatus || 'order') : prev.winSubStatus,
        ocSequence: status === 'win' ? parsedOcSequence : prev.ocSequence,
        ocSequenceEnd: status === 'win' ? parsedOcSequenceEnd : prev.ocSequenceEnd,
        ocMonthRoman:
          status === 'win'
            ? (payload.ocMonthRoman || prev.ocMonthRoman || getCurrentRomanMonthMeta().roman)
            : prev.ocMonthRoman,
        ocYear: status === 'win' ? String(payload.ocYear || prev.ocYear || getCurrentRomanMonthMeta().year) : prev.ocYear,
        spkSequence: status === 'win' ? parsedSpkSequence : prev.spkSequence,
        spkSequenceEnd: status === 'win' ? parsedSpkSequenceEnd : prev.spkSequenceEnd,
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
      // Prefer using _id when available to avoid URL encoding issues
      const quotationId = header._id || header.quotationNumber;
      const followUpUrl = header._id 
        ? `/api/quotations/${quotationId}/follow-up`
        : `/api/quotations/${encodeURIComponent(quotationId)}/follow-up`;
      await ApiHelper.patch(followUpUrl);
      toast.success('Follow-up date recorded');
      fetchQuotations();
    } catch (error) {
      toast.error('Failed to update follow-up date');
      console.error('Error updating follow-up:', error);
    }
  };

  const handleDeleteOffer = async (offer, header) => {
    if (window.confirm(`Are you sure you want to delete offer ${offer.offerNumber}?`)) {
      try {
        // Prefer using _id when available to avoid URL encoding issues
        const quotationId = header?._id || header?.quotationNumber;
        const url = header?._id 
          ? `/api/quotations/${quotationId}/offers/${offer._id}`
          : `/api/quotations/${encodeURIComponent(quotationId)}/offers/${offer._id}`;
        await ApiHelper.delete(url);
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
        // Prefer using _id when available to avoid URL encoding issues
        const quotationId = header._id || header.quotationNumber;
        const url = header._id 
          ? `/api/quotations/${quotationId}`
          : `/api/quotations/${encodeURIComponent(quotationId)}`;
        await ApiHelper.delete(url);
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

    // Find the quotation header to get _id if available
    const quotation = quotations.find(q => q.header.quotationNumber === quotationNumber);
    const header = quotation?.header;

    try {
      // Prefer using _id when available to avoid URL encoding issues
      const quotationId = header?._id || quotationNumber;
      const progressUrl = header?._id 
        ? `/api/quotations/${quotationId}/progress`
        : `/api/quotations/${encodeURIComponent(quotationId)}/progress`;
      await ApiHelper.post(progressUrl, { progress: newProgressEntry });
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

    // Find the quotation header to get _id if available
    const quotation = quotations.find(q => q.header.quotationNumber === quotationNumber);
    const header = quotation?.header;

    try {
      // Prefer using _id when available to avoid URL encoding issues
      const quotationId = header?._id || quotationNumber;
      const progressUrl = header?._id 
        ? `/api/quotations/${quotationId}/progress/${index}`
        : `/api/quotations/${encodeURIComponent(quotationId)}/progress/${index}`;
      await ApiHelper.put(progressUrl, { progress: trimmedText });
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

    // Find the quotation header to get _id if available
    const quotation = quotations.find(q => q.header.quotationNumber === quotationNumber);
    const header = quotation?.header;

    try {
      // Prefer using _id when available to avoid URL encoding issues
      const quotationId = header?._id || quotationNumber;
      const progressUrl = header?._id 
        ? `/api/quotations/${quotationId}/progress/${index}`
        : `/api/quotations/${encodeURIComponent(quotationId)}/progress/${index}`;
      await ApiHelper.delete(progressUrl);
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

  // Infinite scroll: Load more when scrolling to bottom
  useEffect(() => {
    if (!hasMore || loadingMore || loading || isInitialLoad) return;

    const handleIntersection = (entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        fetchQuotations(false); // Load next page
      }
    };

    const observer = new IntersectionObserver(handleIntersection, { threshold: 0.1 });

    // Use a small delay to ensure sentinel is rendered
    const timeout = setTimeout(() => {
      const sentinel = document.getElementById('quotation-list-sentinel');
      if (sentinel) {
        observer.observe(sentinel);
      }
    }, 100);

    return () => {
      clearTimeout(timeout);
      const sentinel = document.getElementById('quotation-list-sentinel');
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, loading, isInitialLoad, currentPage]);

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

      {/* Search and Filter UI */}
      <div className="space-y-3">
        {/* Search Input */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 w-full">
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Quotation number (e.g. 2/quo/XII/2025)"
              value={searchInput}
              onChange={(e) => onSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddChipFromInput()}
            />
          </div>
          <button 
            onClick={() => setShowSearchHelp(true)}
            className="inline-flex items-center justify-center rounded-lg p-2.5 text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
            title="Search help"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>

        {/* Inline Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {/* Customer filter (searches RFQ.customerName via QuotationHeader.rfqId) */}
          <div className="flex-1 sm:max-w-xs">
            <label className="block text-xs font-medium text-gray-700 mb-1">Customer</label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Filter by customer name"
              value={advancedFilters.customer}
              onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, customer: e.target.value }))}
            />
          </div>

          {/* Status Filter */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
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
        </div>
      </div>

      {/* Filter Chips UI */}
      {(chips.length > 0 || filterChips.length > 0) && (
        <div className="mb-2 flex flex-wrap gap-2">
          {chips.map((chip, i) => (
            <span key={i} className="inline-flex items-center rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
              {chip.type}:{chip.value}
              <button className="ml-1" onClick={() => onRemoveChip(i)}>
                <XCircle className="h-3 w-3" />
              </button>
            </span>
          ))}
          {filterChips.map((chip) => (
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
          {(chips.length > 0 || filterChips.length > 0) && (
            <button
              onClick={() => {
                setChips([]);
                clearAdvancedFilters();
              }}
              className="px-2.5 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
            >
              Clear All Filters
            </button>
          )}
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
                  <div className="flex flex-wrap items-center justify-between gap-3">
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
                    {canAddManagerNotes && (
                      <button
                        type="button"
                        onClick={() => openManagerNotesModal(header)}
                        data-tooltip-id={`manager-notes-${header._id}`}
                        data-tooltip-content={header.manager_notes ? 'View/edit manager notes' : 'Add manager notes'}
                        className="rounded-full p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                      >
                        <MessageSquare className="h-5 w-5" />
                      </button>
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
                  {hasAllQuotationViewer && header.manager_notes && (
                    <div className="mt-2 rounded-lg border border-gray-200 bg-amber-50/50 px-3 py-2 text-sm text-gray-700">
                      <p className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden />
                        <span><span className="font-medium text-gray-600">Manager notes:</span> {header.manager_notes}</span>
                      </p>
                    </div>
                  )}
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
                {/* Action buttons - conditional based on actionMode and permissions */}
                {actionMode === 'full' && canEditQuotation(header) && (
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
                  </>
                )}
                {actionMode === 'full' && canDeleteQuotation(header) && (
                  <button
                    onClick={() => handleDeleteQuotation(header)}
                    data-tooltip-id={`delete-quotation-${header._id}`}
                    data-tooltip-content="Delete entire quotation"
                    className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden text-xs sm:inline">Delete</span>
                  </button>
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
                      const allItems = actualWinningOffer.offerItems || [];
                      const winningItems = allItems.filter(item => {
                        // If no selectedOfferItemIds but there's only 1 item, treat it as winning (fallback for auto-selected case)
                        if (!header.selectedOfferItemIds || !header.selectedOfferItemIds.length) {
                          return allItems.length === 1;
                        }
                        const itemIdStr = item._id?.toString?.() ?? item._id;
                        return header.selectedOfferItemIds.some(id => {
                          const idStr = id?.toString?.() ?? id;
                          return idStr === itemIdStr;
                        });
                      });

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
                                  {getApprovalStatusBadges(actualWinningOffer)}
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
                        <div key={offerGroup._id}>
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
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
                                      {getApprovalStatusBadges(offerGroup)}
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
                                      {/* Offer action buttons - conditional based on actionMode and permissions */}
                                      {actionMode === 'full' && canEditQuotation(header) && !isOfferApproved(offerGroup) && !isOfferRejected(offerGroup) && (
                                        <>
                                          <button
                                            onClick={() => onEdit && onEdit({ mode: QUOTATION_FORM_MODES.EDIT_OFFER, header, offer: offerGroup.original || offerGroup })}
                                            data-tooltip-id={`offer-edit-${offerGroup._id}`}
                                            data-tooltip-content="Edit offer"
                                            className="text-indigo-600 hover:text-indigo-900 p-1"
                                          >
                                            <Edit className="h-4 w-4" />
                                          </button>
                                          <button
                                            onClick={() => onEdit && onEdit({ mode: QUOTATION_FORM_MODES.REVISION, header, offer: offerGroup.original || offerGroup })}
                                            data-tooltip-id={`offer-revision-${offerGroup._id}`}
                                            data-tooltip-content="Create revision from this offer"
                                            className="text-purple-600 hover:text-purple-900 p-1"
                                          >
                                            <Plus className="h-4 w-4" />
                                          </button>
                                        </>
                                      )}
                                      {actionMode === 'full' && canEditQuotation(header) && (isOfferApproved(offerGroup) || isOfferRejected(offerGroup)) && (
                                        <>
                                          <button
                                            onClick={() => onEdit && onEdit({ mode: QUOTATION_FORM_MODES.EDIT_OFFER, header, offer: offerGroup.original || offerGroup })}
                                            data-tooltip-id={`offer-notes-${offerGroup._id}`}
                                            data-tooltip-content="Add or edit notes and notes images"
                                            className="text-blue-600 hover:text-blue-900 p-1"
                                            title="Notes"
                                          >
                                            <FileText className="h-4 w-4" />
                                          </button>
                                          <button
                                            onClick={() => onEdit && onEdit({ mode: QUOTATION_FORM_MODES.REVISION, header, offer: offerGroup.original || offerGroup })}
                                            data-tooltip-id={`offer-revision-${offerGroup._id}`}
                                            data-tooltip-content={isOfferRejected(offerGroup) ? "Create revision (offer is rejected and cannot be edited)" : "Create revision (offer is approved and cannot be edited)"}
                                            className="text-purple-600 hover:text-purple-900 p-1"
                                          >
                                            <Plus className="h-4 w-4" />
                                          </button>
                                        </>
                                      )}
                                      {actionMode === 'full' && canDeleteQuotation(header) && !isOfferApproved(offerGroup) && !isOfferRejected(offerGroup) && (
                                        <button
                                          onClick={() => handleDeleteOffer(offerGroup, header)}
                                          data-tooltip-id={`offer-delete-${offerGroup._id}`}
                                          data-tooltip-content="Delete offer"
                                          className="text-red-600 hover:text-red-900 p-1"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      )}
                                      {actionMode === 'full' && isOfferApproved(offerGroup) && (
                                        <span 
                                          data-tooltip-id={`offer-approved-note-${offerGroup._id}`}
                                          data-tooltip-content="This offer is approved and cannot be edited or deleted. Create a revision to make changes."
                                          className="text-xs text-gray-400 italic"
                                        >
                                          Approved
                                        </span>
                                      )}
                                      {actionMode === 'full' && isOfferRejected(offerGroup) && (
                                        <span 
                                          data-tooltip-id={`offer-rejected-note-${offerGroup._id}`}
                                          data-tooltip-content="This offer is rejected and cannot be edited or deleted. Create a revision to make changes."
                                          className="text-xs text-red-400 italic"
                                        >
                                          Rejected
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Show rejection reasons if offer is rejected - below the offer card */}
                          {isOfferRejected(offerGroup) && (() => {
                            const rejectionReasons = getRejectionReasons(offerGroup);
                            if (!rejectionReasons || rejectionReasons.length === 0) return null;
                            return (
                              <div className="mt-3 px-4 pb-3 w-full">
                                <div className="space-y-3">
                                  {rejectionReasons.map((reason, idx) => {
                                    const approverName = reason.approvedBy 
                                      ? (typeof reason.approvedBy === 'object' 
                                        ? (reason.approvedBy.fullName || reason.approvedBy.email || 'Unknown')
                                        : 'Unknown')
                                      : null;
                                    return (
                                      <div key={idx} className="w-full bg-red-50 border border-red-200 rounded-md p-3">
                                        <div className="font-semibold text-red-800 mb-1">
                                          {reason.type === 'engineer' ? 'Engineer Rejection:' : 'Management Rejection:'}
                                        </div>
                                        {reason.note && reason.note !== 'No reason provided' && (
                                          <div className="text-red-700 mt-1.5 text-sm">{reason.note}</div>
                                        )}
                                        {reason.note === 'No reason provided' && (
                                          <div className="text-red-600 mt-1.5 italic text-sm">No reason provided</div>
                                        )}
                                        {approverName && (
                                          <div className="text-red-600 mt-2 text-xs">
                                            Rejected by: {approverName}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    }
                    
                    // For grouped structure (new data) - this is what we want to display
                    return (
                    <div key={offerGroup.original?._id || `group-${groupIndex}`}>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
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
                                {getApprovalStatusBadges(offerGroup.original)}
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
                              <div className="flex flex-col space-y-2">
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
                                    {/* Offer action buttons - conditional based on actionMode and permissions */}
                                    {actionMode === 'full' && canEditQuotation(header) && !isOfferApproved(offerGroup.original) && !isOfferRejected(offerGroup.original) && (
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
                                      </>
                                    )}
                                    {actionMode === 'full' && canEditQuotation(header) && (isOfferApproved(offerGroup.original) || isOfferRejected(offerGroup.original)) && (
                                      <>
                                        <button
                                          onClick={() => onEdit && onEdit({ mode: QUOTATION_FORM_MODES.EDIT_OFFER, header, offer: offerGroup.original })}
                                          data-tooltip-id={`offer-notes-${offerGroup.original?._id}`}
                                          data-tooltip-content="Add or edit notes and notes images"
                                          className="text-blue-600 hover:text-blue-900 p-1"
                                          title="Notes"
                                        >
                                          <FileText className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() => onEdit && onEdit({ mode: QUOTATION_FORM_MODES.REVISION, header, offer: offerGroup.original })}
                                          data-tooltip-id={`offer-revision-${offerGroup.original?._id}`}
                                          data-tooltip-content={isOfferRejected(offerGroup.original) ? "Create revision (offer is rejected and cannot be edited)" : "Create revision (offer is approved and cannot be edited)"}
                                          className="text-purple-600 hover:text-purple-900 p-1"
                                        >
                                          <Plus className="h-4 w-4" />
                                        </button>
                                      </>
                                    )}
                                    {actionMode === 'full' && canDeleteQuotation(header) && !isOfferApproved(offerGroup.original) && !isOfferRejected(offerGroup.original) && (
                                      <button
                                        onClick={() => handleDeleteOffer(offerGroup.original, header)}
                                        data-tooltip-id={`offer-delete-${offerGroup.original?._id}`}
                                        data-tooltip-content="Delete offer"
                                        className="text-red-600 hover:text-red-900 p-1"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    )}
                                    {actionMode === 'full' && isOfferApproved(offerGroup.original) && (
                                      <span 
                                        data-tooltip-id={`offer-approved-note-${offerGroup.original?._id}`}
                                        data-tooltip-content="This offer is approved and cannot be edited or deleted. Create a revision to make changes."
                                        className="text-xs text-gray-400 italic"
                                      >
                                        Approved
                                      </span>
                                    )}
                                    {actionMode === 'full' && isOfferRejected(offerGroup.original) && (
                                      <span 
                                        data-tooltip-id={`offer-rejected-note-${offerGroup.original?._id}`}
                                        data-tooltip-content="This offer is rejected and cannot be edited or deleted. Create a revision to make changes."
                                        className="text-xs text-red-400 italic"
                                      >
                                        Rejected
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Show rejection reasons if original offer is rejected - below the original offer */}
                        {isOfferRejected(offerGroup.original) && (() => {
                          const rejectionReasons = getRejectionReasons(offerGroup.original);
                          if (!rejectionReasons || rejectionReasons.length === 0) return null;
                          return (
                            <div className="px-4 py-3 bg-white border-t border-gray-200">
                              <div className="space-y-3">
                                {rejectionReasons.map((reason, idx) => {
                                  const approverName = reason.approvedBy 
                                    ? (typeof reason.approvedBy === 'object' 
                                      ? (reason.approvedBy.fullName || reason.approvedBy.email || 'Unknown')
                                      : 'Unknown')
                                    : null;
                                  return (
                                    <div key={idx} className="w-full bg-red-50 border border-red-200 rounded-md p-3">
                                      <div className="font-semibold text-red-800 mb-1">
                                        {reason.type === 'engineer' ? 'Engineer Rejection:' : 'Management Rejection:'}
                                      </div>
                                      {reason.note && reason.note !== 'No reason provided' && (
                                        <div className="text-red-700 mt-1.5 text-sm">{reason.note}</div>
                                      )}
                                      {reason.note === 'No reason provided' && (
                                        <div className="text-red-600 mt-1.5 italic text-sm">No reason provided</div>
                                      )}
                                      {approverName && (
                                        <div className="text-red-600 mt-2 text-xs">
                                          Rejected by: {approverName}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Revisions */}
                      {offerGroup.revisions && offerGroup.revisions.length > 0 && (
                        <div className="bg-gray-50">
                          {offerGroup.revisions.map((revision, revisionIndex) => {
                            const isLatestRevision = revisionIndex === offerGroup.revisions.length - 1;
                            return (
                            <React.Fragment key={revision._id}>
                              <div className="px-4 py-3 border-b border-gray-200 last:border-b-0">
                                <div className="flex flex-col space-y-2">
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
                                        {getApprovalStatusBadges(revision)}
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
                                        {/* Revision action buttons - conditional based on actionMode and permissions */}
                                        {actionMode === 'full' && canEditQuotation(header) && !isOfferApproved(revision) && !isOfferRejected(revision) && (
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
                                          </>
                                        )}
                                        {actionMode === 'full' && canEditQuotation(header) && (isOfferApproved(revision) || isOfferRejected(revision)) && (
                                          <>
                                            <button
                                              onClick={() => onEdit && onEdit({ mode: QUOTATION_FORM_MODES.EDIT_OFFER, header, offer: revision })}
                                              data-tooltip-id={`offer-notes-${revision._id}`}
                                              data-tooltip-content="Add or edit notes and notes images"
                                              className="text-blue-600 hover:text-blue-900 p-1"
                                              title="Notes"
                                            >
                                              <FileText className="h-4 w-4" />
                                            </button>
                                            <button
                                              onClick={() => onEdit && onEdit({ mode: QUOTATION_FORM_MODES.REVISION, header, offer: revision })}
                                              data-tooltip-id={`offer-revision-${revision._id}`}
                                              data-tooltip-content={isOfferRejected(revision) ? "Create revision (revision is rejected and cannot be edited)" : "Create revision (revision is approved and cannot be edited)"}
                                              className="text-purple-600 hover:text-purple-900 p-1"
                                            >
                                              <Plus className="h-4 w-4" />
                                            </button>
                                          </>
                                        )}
                                        {actionMode === 'full' && canDeleteQuotation(header) && !isOfferApproved(revision) && !isOfferRejected(revision) && (
                                          <button
                                            onClick={() => handleDeleteOffer(revision, header)}
                                            data-tooltip-id={`offer-delete-${revision._id}`}
                                            data-tooltip-content="Delete revision"
                                            className="text-red-600 hover:text-red-900 p-1"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        )}
                                        {actionMode === 'full' && isOfferApproved(revision) && (
                                          <span 
                                            data-tooltip-id={`offer-approved-note-${revision._id}`}
                                            data-tooltip-content="This revision is approved and cannot be edited or deleted. Create a new revision to make changes."
                                            className="text-xs text-gray-400 italic"
                                          >
                                            Approved
                                          </span>
                                        )}
                                        {actionMode === 'full' && isOfferRejected(revision) && (
                                          <span 
                                            data-tooltip-id={`offer-rejected-note-${revision._id}`}
                                            data-tooltip-content="This revision is rejected and cannot be edited or deleted. Create a new revision to make changes."
                                            className="text-xs text-red-400 italic"
                                          >
                                            Rejected
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {/* Show rejection reasons if revision is rejected - below the revision */}
                              {isOfferRejected(revision) && (() => {
                                const rejectionReasons = getRejectionReasons(revision);
                                if (!rejectionReasons || rejectionReasons.length === 0) return null;
                                return (
                                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                                    <div className="space-y-3">
                                      {rejectionReasons.map((reason, idx) => {
                                        const approverName = reason.approvedBy 
                                          ? (typeof reason.approvedBy === 'object' 
                                            ? (reason.approvedBy.fullName || reason.approvedBy.email || 'Unknown')
                                            : 'Unknown')
                                          : null;
                                        return (
                                          <div key={idx} className="w-full bg-red-50 border border-red-200 rounded-md p-3">
                                            <div className="font-semibold text-red-800 mb-1">
                                              {reason.type === 'engineer' ? 'Engineer Rejection:' : 'Management Rejection:'}
                                            </div>
                                            {reason.note && reason.note !== 'No reason provided' && (
                                              <div className="text-red-700 mt-1.5 text-sm">{reason.note}</div>
                                            )}
                                            {reason.note === 'No reason provided' && (
                                              <div className="text-red-600 mt-1.5 italic text-sm">No reason provided</div>
                                            )}
                                            {approverName && (
                                              <div className="text-red-600 mt-2 text-xs">
                                                Rejected by: {approverName}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}
                            </React.Fragment>
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
                          {editingProgress[`${header.quotationNumber}-${index}`] !== undefined && canEditQuotation(header) ? (
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
                              {canEditQuotation(header) && (
                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleEditProgress(header.quotationNumber, index, progressItem)}
                                    className="p-1 text-blue-600 hover:text-blue-700"
                                    title="Edit"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </button>
                                  {canDeleteQuotation(header) && (
                                    <button
                                      onClick={() => handleDeleteProgress(header.quotationNumber, index)}
                                      className="p-1 text-red-600 hover:text-red-700"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No progress yet</p>
                    )}
                  </div>

                  {/* Add Progress Input - Only show if user can edit */}
                  {canEditQuotation(header) && (
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
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Infinite scroll sentinel - triggers load more when visible */}
      {hasMore && (
        <div id="quotation-list-sentinel" className="h-10 flex items-center justify-center">
          {loadingMore && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
              <span>Loading more...</span>
            </div>
          )}
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
          <Tooltip id={`offer-approved-note-${header._id}`} />
          <Tooltip id={`offer-rejected-note-${header._id}`} />
          {offers.map((offerGroup) => {
            // Handle both grouped and flat structures
            if (offerGroup.original) {
              // New grouped structure
              return (
                <React.Fragment key={offerGroup.original._id}>
                  <Tooltip id={`offer-view-${offerGroup.original._id}`} />
                  <Tooltip id={`offer-edit-${offerGroup.original._id}`} />
                  <Tooltip id={`offer-notes-${offerGroup.original._id}`} />
                  <Tooltip id={`offer-revision-${offerGroup.original._id}`} />
                  <Tooltip id={`offer-delete-${offerGroup.original._id}`} />
                  {offerGroup.revisions && offerGroup.revisions.map((revision) => (
                    <React.Fragment key={revision._id}>
                      <Tooltip id={`offer-view-${revision._id}`} />
                      <Tooltip id={`offer-edit-${revision._id}`} />
                      <Tooltip id={`offer-notes-${revision._id}`} />
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
                  <Tooltip id={`offer-notes-${offerGroup._id}`} />
                  <Tooltip id={`offer-revision-${offerGroup._id}`} />
                  <Tooltip id={`offer-delete-${offerGroup._id}`} />
                  <Tooltip id={`offer-approved-note-${offerGroup._id}`} />
                  <Tooltip id={`offer-rejected-note-${offerGroup._id}`} />
                </React.Fragment>
              );
            }
            return null;
          })}
        </React.Fragment>
      ))}

      {/* Manager Notes Modal */}
      <BaseModal
        isOpen={managerNotesModal.isOpen}
        onClose={() => setManagerNotesModal({ isOpen: false, header: null, manager_notes: '' })}
        title={managerNotesModal.header ? `Manager notes – ${managerNotesModal.header.quotationNumber}` : 'Manager notes'}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Add notes for this quotation. Users with All Quotation Viewer permission will see these notes.</p>
          <textarea
            value={managerNotesModal.manager_notes}
            onChange={(e) => setManagerNotesModal(prev => ({ ...prev, manager_notes: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter manager notes..."
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setManagerNotesModal({ isOpen: false, header: null, manager_notes: '' })}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveManagerNotes}
              disabled={managerNotesSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {managerNotesSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </BaseModal>

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
              {(statusForm.reason === 'custom_loss' || statusForm.reason === 'custom_close') && (
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
                          value={statusForm.ocSequence}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/\D/g, '');
                            setStatusForm((prev) => ({
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
                          value={statusForm.ocSequenceEnd}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/\D/g, '');
                            setStatusForm((prev) => ({
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
                        value={statusForm.ocMonthRoman}
                        onChange={(value) =>
                          setStatusForm((prev) => ({
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
                        value={statusForm.ocYear}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/\D/g, '');
                          setStatusForm((prev) => ({
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
                          statusForm.ocSequence,
                          statusForm.ocMonthRoman,
                          statusForm.ocYear,
                          !!statusForm.ocSequenceEnd,
                          statusForm.ocSequenceEnd
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
                          value={statusForm.spkSequence}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/\D/g, '');
                            setStatusForm((prev) => ({
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
                          value={statusForm.spkSequenceEnd}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/\D/g, '');
                            setStatusForm((prev) => ({
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
                        value={statusForm.spkMonthRoman}
                        onChange={(value) =>
                          setStatusForm((prev) => ({
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
                        value={statusForm.spkYear}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/\D/g, '');
                          setStatusForm((prev) => ({
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
                            statusForm.spkType === option.value
                              ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span className="flex items-center gap-2 mb-1">
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
                            statusForm.spkSequence,
                            statusForm.spkMonthRoman,
                            statusForm.spkType,
                            statusForm.spkYear,
                            !!statusForm.spkSequenceEnd,
                            statusForm.spkSequenceEnd
                          )}
                        </span>
                        {statusForm.spkType === 'P' && (
                          <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded">Pajak</span>
                        )}
                        {statusForm.spkType === '-' && (
                          <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded">Non pajak</span>
                        )}
                        {statusForm.spkType === 'KBS' && (
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">Non pajak khusus</span>
                        )}
                      </div>
                    </div>
                  </div>
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



import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { NotificationsContext } from '../../utils/contexts/NotificationsContext';
import axiosInstance from '../../utils/api/ApiHelper';
import toast from 'react-hot-toast';
import { Clock, CheckCircle, XCircle, ArrowRight, Info, SlidersHorizontal } from 'lucide-react';
import BaseModal from '../modals/BaseModal';

const ADVANCED_FILTER_DEFAULTS = {
  lineOfBusiness: [],
  priority: [],
  stage: '',
  status: '',
  dateFrom: '',
  dateTo: ''
};

const AllRFQTab = () => {
  const { connected } = useContext(NotificationsContext);
  const [loading, setLoading] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedRFQ, setSelectedRFQ] = useState(null);
  const [selectedEngineer, setSelectedEngineer] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [rfqResults, setRfqResults] = useState([]);
  const [, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const listRef = useRef(null);
  const [chips, setChips] = useState([]);
  const [infoOpen, setInfoOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({ ...ADVANCED_FILTER_DEFAULTS });
  const isFetchingRef = useRef(false);
  const currentPageRef = useRef(1);

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

  const toggleSingleFilter = (key, value) => {
    setAdvancedFilters((prev) => ({
      ...prev,
      [key]: prev[key] === value ? '' : value
    }));
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters({ ...ADVANCED_FILTER_DEFAULTS });
  };

  const advancedFilterChips = [];

  const capitalize = (value = '') =>
    value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

  const formatStatusLabel = (value = '') => {
    if (!value) return value;
    if (value === 'quotation_created') return 'Quotation Created';
    return capitalize(value);
  };

  (advancedFilters.lineOfBusiness || []).forEach((value) => {
    advancedFilterChips.push({
      key: `lob-${value}`,
      label: `Line of Business: ${capitalize(value)}`,
      onRemove: () => toggleMultiFilter('lineOfBusiness', value)
    });
  });

  (advancedFilters.priority || []).forEach((value) => {
    advancedFilterChips.push({
      key: `priority-${value}`,
      label: `Priority: ${capitalize(value)}`,
      onRemove: () => toggleMultiFilter('priority', value)
    });
  });

  if (advancedFilters.stage) {
    advancedFilterChips.push({
      key: `stage-${advancedFilters.stage}`,
      label: `Stage: ${capitalize(advancedFilters.stage)}`,
      onRemove: () => toggleSingleFilter('stage', advancedFilters.stage)
    });
  }

  if (advancedFilters.status) {
    advancedFilterChips.push({
      key: `status-${advancedFilters.status}`,
      label: `Status: ${formatStatusLabel(advancedFilters.status)}`,
      onRemove: () => toggleSingleFilter('status', advancedFilters.status)
    });
  }

  if (advancedFilters.dateFrom) {
    advancedFilterChips.push({
      key: `dateFrom`,
      label: `From: ${advancedFilters.dateFrom}`,
      onRemove: () =>
        setAdvancedFilters((prev) => ({
          ...prev,
          dateFrom: ''
        }))
    });
  }

  if (advancedFilters.dateTo) {
    advancedFilterChips.push({
      key: `dateTo`,
      label: `To: ${advancedFilters.dateTo}`,
      onRemove: () =>
        setAdvancedFilters((prev) => ({
          ...prev,
          dateTo: ''
        }))
    });
  }

  const advancedFilterCount = advancedFilterChips.length;

  // Parse search tokens utility
  const parseTokens = (input) => {
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
  };

  const fetchRFQs = useCallback(async (pageOverride, reset = false) => {
    if (isFetchingRef.current && !reset) return;
    
    isFetchingRef.current = true;
    const page = pageOverride !== undefined ? pageOverride : (reset ? 1 : currentPageRef.current);
    
    setLoading(true);
    let search = '';
    chips.forEach((chip) => {
      if (chip.type === 'phrase') search += ' "' + chip.value + '"';
      else if (chip.type === 'global') search += ' ' + chip.value;
      else search += ` ${chip.type}:${chip.value}`;
    });
    if (searchInput.trim()) search += ' ' + searchInput.trim();
    
    // Build query params WITHOUT viewScope - backend will show all RFQs for users with all_quotation_viewer
    const params = { page, limit: 20, search };
    
    if (advancedFilters.lineOfBusiness?.length) {
      params.lineOfBusiness = advancedFilters.lineOfBusiness;
    }

    if (advancedFilters.priority?.length) {
      params.priority = advancedFilters.priority;
    }

    if (advancedFilters.stage) {
      params.stage = advancedFilters.stage;
    }

    if (advancedFilters.status) {
      params.status = advancedFilters.status;
    }

    if (advancedFilters.dateFrom) {
      params.from = advancedFilters.dateFrom;
    }

    if (advancedFilters.dateTo) {
      params.to = advancedFilters.dateTo;
    }
    
    try {
      const el = listRef.current;
      
      const resp = await axiosInstance.get('/api/rfq', { params });
      let newResults = resp.data.data?.rfqs || resp.data.data?.rfq || [];
      if (!Array.isArray(newResults)) {
        console.error('API returned non-array data:', newResults);
        newResults = [];
      }
      
      const responsePagination = resp.data.pagination || resp.data.data?.pagination || { page: 1, pages: 1, total: 0 };
      
      currentPageRef.current = responsePagination.page || page;
      
      if (reset) {
        setRfqResults(newResults);
        setPagination(responsePagination);
        if (el) {
          requestAnimationFrame(() => {
            el.scrollTop = 0;
          });
        }
      } else {
        setRfqResults(prev => [...prev, ...newResults]);
        setPagination(responsePagination);
      }
    } catch (error) {
      console.error('Error fetching RFQs:', error);
      toast.error('Failed to fetch RFQs');
      if (reset) {
        setRfqResults([]);
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [chips, searchInput, advancedFilters]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchRFQs(1, true);
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchInput, chips, fetchRFQs]);

  const onSearchInput = (val) => {
    setSearchInput(val);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const onRemoveChip = (idx) => {
    setChips((chips) => chips.filter((c, i) => i !== idx));
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const onAddChipFromInput = () => {
    if (!searchInput.trim()) return;
    const tokens = parseTokens(searchInput.trim());
    setChips([...chips, ...tokens]);
    setSearchInput('');
  };

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    if (loading || isFetchingRef.current) return;
    
    setPagination(current => {
      if (current.page >= current.pages) return current;
      
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceFromBottom < 150) {
        const nextPage = current.page + 1;
        fetchRFQs(nextPage, false);
      }
      return current;
    });
  }, [loading, fetchRFQs]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    fetchRFQs(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (connected) {
      fetchRFQs(1, true);
    }
  }, [connected, fetchRFQs]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'rejected':
        return <XCircle size={16} className="text-red-600" />;
      default:
        return <Clock size={16} className="text-yellow-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-gray-900">All RFQ</h2>
          <p className="text-sm text-gray-600">View all RFQ requests in the system</p>
        </div>
      </div>

      {/* WebSocket Connection Status */}
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm sm:inline-flex sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-gray-600">
          {connected ? 'Real-time updates connected' : 'Real-time updates disconnected'}
        </span>
      </div>

      {/* UI: Search bar and filters */}
      <div className="space-y-3 mb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 w-full">
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search by RFQ number, customer, description, or use filters: app:name status:pending stage:sales customer:ABC..."
              value={searchInput}
              onChange={(e) => onSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddChipFromInput()}
            />
          </div>
          <button 
            onClick={() => setInfoOpen(true)}
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
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {capitalize(value)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Priority</p>
                <div className="flex flex-wrap gap-2">
                  {['urgent', 'high', 'medium', 'low'].map((value) => {
                    const active = advancedFilters.priority.includes(value);
                    return (
                      <button
                        key={value}
                        onClick={() => toggleMultiFilter('priority', value)}
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
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Stage</p>
                <div className="flex flex-wrap gap-2">
                  {['sales', 'engineering', 'approver', 'quotation'].map((value) => {
                    const active = advancedFilters.stage === value;
                    return (
                      <button
                        key={value}
                        onClick={() => toggleSingleFilter('stage', value)}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                          active
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-400 hover:text-emerald-600'
                        }`}
                      >
                        {capitalize(value)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</p>
                <div className="flex flex-wrap gap-2">
                  {['pending', 'approved', 'rejected', 'quotation_created'].map((value) => {
                    const active = advancedFilters.status === value;
                    return (
                      <button
                        key={value}
                        onClick={() => toggleSingleFilter('status', value)}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                          active
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-amber-400 hover:text-amber-600'
                        }`}
                      >
                        {formatStatusLabel(value)}
                      </button>
                    );
                  })}
                </div>
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

      {/* chips UI */}
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

      {/* List container, infinite scrollable area */}
      <div ref={listRef} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {(!Array.isArray(rfqResults) || rfqResults.length === 0) && !loading && <div className="text-center text-gray-400 py-8">No RFQs found.</div>}
        {Array.isArray(rfqResults) && rfqResults.map(rfq => (
          <div
            key={rfq._id}
            className={`mb-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${rfq.status === 'rejected' ? 'border-red-300 bg-red-50/60' : ''}`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-1 gap-3">
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">{rfq.rfqNumber || rfq.title}</h3>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      rfq.lineOfBusiness?.type === 'karoseri' ? 'bg-blue-100 text-blue-800' :
                      rfq.lineOfBusiness?.type === 'service' ? 'bg-purple-100 text-purple-800' :
                      rfq.lineOfBusiness?.type === 'sparepart' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {rfq.lineOfBusiness?.type?.charAt(0).toUpperCase() + rfq.lineOfBusiness?.type?.slice(1) || 'N/A'}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(rfq.status)}`}>
                      {getStatusIcon(rfq.status)}
                      {rfq.status}
                    </span>
                  </div>
                  {rfq.customerName && (
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Customer:</span> {rfq.customerName}
                    </div>
                  )}
                  {rfq.status === 'rejected' && rfq.approvalNotes && (
                    <div className="text-sm font-semibold text-red-700">
                      <span className="font-bold">Rejected:</span> {rfq.approvalNotes}
                    </div>
                  )}
                  {rfq.description && (
                    <p className="text-gray-600">{rfq.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                    <span>Requester: {rfq.requesterId?.fullName || rfq.requesterId?.email || 'N/A'}</span>
                    <span>Approver: {rfq.approverId?.fullName || rfq.approverId?.email || 'N/A'}</span>
                    <span>Created: {new Date(rfq.createdAt).toLocaleDateString()}</span>
                    {rfq.stage && (
                      <span className="rounded bg-gray-100 px-2 py-1 text-xs">Stage: {rfq.stage}</span>
                    )}
                    {rfq.engineeringTransit?.status && (
                      <span className="rounded bg-blue-100 px-2 py-1 text-xs">Engineering: {rfq.engineeringTransit.status}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3 lg:flex-col lg:items-end">
                <button
                  onClick={() => window.location = `/quotations/rfq/${rfq._id}`}
                  className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-blue-100 bg-white px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-900 sm:w-auto"
                  title="View Details"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  View
                </button>
              </div>
            </div>
          </div>
        ))}
        {loading && <div className="py-8 text-center text-gray-500">Loading...</div>}
      </div>

      {/* Info Modal */}
      <BaseModal isOpen={infoOpen} onClose={() => setInfoOpen(false)} title="RFQ Search Help">
        <div className="space-y-4 text-sm text-gray-700">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Quick Start</p>
            <p className="mt-1 font-semibold text-blue-900">Type what you remember—keywords, customer, part numbers, anything.</p>
            <p className="mt-2 text-blue-800">
              The search looks across RFQ number, customer, notes, and specifications, so you can stay casual and still land hits.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-blue-100 bg-white p-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Find pending items</p>
                <code className="mt-1 block text-xs font-mono text-gray-800">"dump body" status:pending</code>
                <p className="mt-2 text-xs text-gray-500">Loose phrase + status filter for a fast triage.</p>
              </div>
              <div className="rounded-md border border-blue-100 bg-white p-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Check approvals</p>
                <code className="mt-1 block text-xs font-mono text-gray-800">app:anita from:2025-02-01</code>
                <p className="mt-2 text-xs text-gray-500">Approver-focused view with a date guardrail.</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Power Filters</p>
            <p className="mt-1 text-amber-900">Mix and match these tags for laser-focused results:</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <span className="rounded bg-amber-100 px-2 py-1 font-mono text-xs text-amber-800">app:</span>
                <p className="text-sm text-amber-900">
                  Approver username (<code className="font-mono text-xs text-amber-900">app:budi</code>)
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="rounded bg-amber-100 px-2 py-1 font-mono text-xs text-amber-800">crt:</span>
                <p className="text-sm text-amber-900">
                  Creator/requester (<code className="font-mono text-xs text-amber-900">crt:"budi susanto"</code>)
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="rounded bg-amber-100 px-2 py-1 font-mono text-xs text-amber-800">rf:</span>
                <p className="text-sm text-amber-900">
                  RFQ number snippets (<code className="font-mono text-xs text-amber-900">rf:8/RF</code>)
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="rounded bg-amber-100 px-2 py-1 font-mono text-xs text-amber-800">type:</span>
                <p className="text-sm text-amber-900">
                  RFQ type (<code className="font-mono text-xs text-amber-900">type:karoseri</code>)
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="rounded bg-amber-100 px-2 py-1 font-mono text-xs text-amber-800">status:</span>
                <p className="text-sm text-amber-900">
                  Workflow status (<code className="font-mono text-xs text-amber-900">status:pending status:approved</code>)
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="rounded bg-amber-100 px-2 py-1 font-mono text-xs text-amber-800">stage:</span>
                <p className="text-sm text-amber-900">
                  RFQ stage (<code className="font-mono text-xs text-amber-900">stage:sales stage:engineering</code>)
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="rounded bg-amber-100 px-2 py-1 font-mono text-xs text-amber-800">eng:</span>
                <p className="text-sm text-amber-900">
                  Engineer name/email (<code className="font-mono text-xs text-amber-900">eng:john</code>)
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="rounded bg-amber-100 px-2 py-1 font-mono text-xs text-amber-800">customer:</span>
                <p className="text-sm text-amber-900">
                  Customer name (<code className="font-mono text-xs text-amber-900">customer:"ABC Corp"</code>)
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="rounded bg-amber-100 px-2 py-1 font-mono text-xs text-amber-800">contact:</span>
                <p className="text-sm text-amber-900">
                  Contact person name (<code className="font-mono text-xs text-amber-900">contact:"john doe"</code>)
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="rounded bg-amber-100 px-2 py-1 font-mono text-xs text-amber-800">priority:</span>
                <p className="text-sm text-amber-900">
                  Priority level (<code className="font-mono text-xs text-amber-900">priority:high</code>)
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="rounded bg-amber-100 px-2 py-1 font-mono text-xs text-amber-800">from:/to:</span>
                <p className="text-sm text-amber-900">
                  Date range (<code className="font-mono text-xs text-amber-900">from:2025-01-01 to:2025-01-31</code>)
                </p>
              </div>
              <div className="flex items-start gap-2 sm:col-span-2">
                <span className="rounded bg-amber-100 px-2 py-1 font-mono text-xs text-amber-800">"phrase"</span>
                <p className="text-sm text-amber-900">Wrap multi-word terms in quotes for exact matches.</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Combo Recipes</p>
            <ul className="mt-2 space-y-2 text-green-900">
              <li>
                <code className="font-mono text-xs text-green-900">app:andi type:karoseri "dump body" from:2025-01-01</code>
                <span className="block text-xs text-green-700">Who approved what? Spot Andi&apos;s recent karoseri requests.</span>
              </li>
              <li>
                <code className="font-mono text-xs text-green-900">status:pending to:2025-02-15 rf:24/</code>
                <span className="block text-xs text-green-700">Zero in on older pending RFQs before they age out.</span>
              </li>
              <li>
                <code className="font-mono text-xs text-green-900">crt:"budi susanto" status:quotation_created</code>
                <span className="block text-xs text-green-700">Challenge: track Budi&apos;s latest wins.</span>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Pro Tips</p>
            <ul className="mt-2 space-y-1 text-gray-700">
              <li>Stack filters without commas—order does not matter.</li>
              <li>Need a reset? Clear the field and press enter to show everything again.</li>
              <li>Search is case-insensitive and shrugs off extra spaces.</li>
            </ul>
          </div>
        </div>
      </BaseModal>
    </div>
  );
};

export default AllRFQTab;


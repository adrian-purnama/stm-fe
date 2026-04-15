import { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationsContext } from '../../utils/contexts/NotificationsContext';
import axiosInstance from '../../utils/api/ApiHelper';
import BaseModal from '../modals/BaseModal';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, Eye, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, X, TrendingUp, MessageSquare, Search, SlidersHorizontal, Filter, XCircle as XCircleIcon } from 'lucide-react';

/** Sparepart RFQ items store estimatedRevenue as line total (qty × pricePerUnit); other LOBs use per-unit estimatedRevenue. */
const sumRfqBudgetTotal = (items, lobType) => {
  const sparepart = lobType === 'sparepart';
  return (items || []).reduce((sum, item) => {
    const itemRev = parseFloat(item.estimatedRevenue) || 0;
    const qty = parseInt(item.quantity, 10) || 1;
    const ppu = parseFloat(item.pricePerUnit) || 0;
    if (sparepart) return sum + (itemRev || ppu * qty);
    return sum + itemRev * qty;
  }, 0);
};

const getRfqItemBudgetDisplay = (item, lobType) => {
  const quantity = parseInt(item.quantity, 10) || 1;
  const sparepart = lobType === 'sparepart';
  const perQty = sparepart
    ? parseFloat(item.pricePerUnit) || 0
    : parseFloat(item.estimatedRevenue) || 0;
  const lineTotal = sparepart
    ? parseFloat(item.estimatedRevenue) || perQty * quantity
    : perQty * quantity;
  return { quantity, perQty, lineTotal };
};

const ApproveQuotationTab = () => {
  const navigate = useNavigate();
  const { connected } = useContext(NotificationsContext);
  const [rfqs, setRfqs] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expandedRFQ, setExpandedRFQ] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRFQ, setSelectedRFQ] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    lineOfBusiness: [],
    priority: [],
    verdict: 'all',
    minConfidence: 0
  });

  // Fetch RFQs for the current user (as approver) - only RFQs that have been reviewed by Engineering and are ready for approval
  const fetchRFQs = async () => {
    try {
      setLoading(true);
      // Filter for RFQs that:
      // 1. Are in 'approver' stage (engineering review completed)
      // 2. Have 'pending' status (not yet approved/rejected)
      // 3. Are assigned to current user as approver (backend will filter by approverId when stage='approver')
      const response = await axiosInstance.get('/api/rfq', {
        params: {
          stage: 'approver',
          status: 'pending',
          viewScope: 'approver'
        }
      });
      let rfqsArray = response.data.data?.rfqs || response.data.data?.rfq || [];
      // Ensure it's always an array
      if (!Array.isArray(rfqsArray)) {
        console.error('API returned non-array data:', rfqsArray);
        rfqsArray = [];
      }
      setRfqs(rfqsArray);
    } catch (error) {
      console.error('Error fetching RFQs:', error);
      toast.error('Failed to fetch RFQs');
      setRfqs([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Fetch pending count for approvers
  const fetchPendingCount = async () => {
    try {
      const response = await axiosInstance.get('/api/rfq/pending-count');
      setPendingCount(response.data.data.count);
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  const [isProcessing, setIsProcessing] = useState(false);

  // Handle RFQ approval
  const handleApprove = async (rfqId, notes = '') => {
    try {
      setIsProcessing(true);
      await axiosInstance.patch(`/api/rfq/${rfqId}/approve`, { approvalNotes: notes });
      toast.success('RFQ approved successfully');
      fetchRFQs();
      fetchPendingCount();
      setShowApprovalModal(false);
      setSelectedRFQ(null);
      setApprovalNotes('');
    } catch (error) {
      console.error('Error approving RFQ:', error);
      toast.error('Failed to approve RFQ');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle RFQ rejection
  const handleReject = async (rfqId, notes = '') => {
    try {
      setIsProcessing(true);
      await axiosInstance.patch(`/api/rfq/${rfqId}/reject`, { rejectionNotes: notes });
      toast.success('RFQ rejected successfully');
      fetchRFQs();
      fetchPendingCount();
      setShowApprovalModal(false);
      setSelectedRFQ(null);
      setApprovalNotes('');
    } catch (error) {
      console.error('Error rejecting RFQ:', error);
      toast.error('Failed to reject RFQ');
    } finally {
      setIsProcessing(false);
    }
  };

  // Show approval modal
  const showApproval = (rfq, action) => {
    setSelectedRFQ({ ...rfq, action });
    setApprovalNotes('');
    setShowApprovalModal(true);
  };

  // Toggle RFQ expansion
  const toggleExpanded = (rfqId) => {
    setExpandedRFQ(expandedRFQ === rfqId ? null : rfqId);
  };

  useEffect(() => {
    fetchRFQs();
    fetchPendingCount();
  }, []);

  // Auto-refresh when WebSocket reconnects
  useEffect(() => {
    if (connected) {
      fetchRFQs();
      fetchPendingCount();
    }
  }, [connected]);

  const toggleFilterValue = (key, value) => {
    setFilters((prev) => {
      const currentValues = prev[key];
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

  const resetFilters = () => {
    setFilters({
      lineOfBusiness: [],
      priority: [],
      verdict: 'all',
      minConfidence: 0
    });
    setSearchTerm('');
  };

  const filteredRfqs = useMemo(() => {
    return rfqs.filter((rfq) => {
      const searchTarget = [
        rfq.rfqNumber,
        rfq.customerName,
        rfq.contactPerson?.name,
        rfq.lineOfBusiness?.type,
        rfq.priority,
        rfq.competitor
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = searchTerm
        ? searchTarget.includes(searchTerm.trim().toLowerCase())
        : true;

      const matchesLOB =
        filters.lineOfBusiness.length === 0 ||
        (rfq.lineOfBusiness?.type &&
          filters.lineOfBusiness.includes(rfq.lineOfBusiness.type));

      const matchesPriority =
        filters.priority.length === 0 ||
        (rfq.priority && filters.priority.includes(rfq.priority));

      const verdict = rfq.engineeringTransit?.canDo;
      const matchesVerdict =
        filters.verdict === 'all' ||
        (filters.verdict === 'canDo' && verdict === true) ||
        (filters.verdict === 'cannotDo' && verdict === false) ||
        (filters.verdict === 'noVerdict' && (verdict === null || verdict === undefined));

      const confidence = parseInt(rfq.confidenceRate, 10) || 0;
      const matchesConfidence = confidence >= (filters.minConfidence || 0);

      return matchesSearch && matchesLOB && matchesPriority && matchesVerdict && matchesConfidence;
    });
  }, [rfqs, searchTerm, filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.lineOfBusiness.length > 0) count += filters.lineOfBusiness.length;
    if (filters.priority.length > 0) count += filters.priority.length;
    if (filters.verdict !== 'all') count += 1;
    if ((filters.minConfidence || 0) > 0) count += 1;
    return count;
  }, [filters]);

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Approve RFQ</h2>
          <p className="text-sm text-gray-600 mt-1">Review and approve RFQ requests</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium leading-none text-white bg-red-600 rounded-full animate-pulse">
              {pendingCount}
            </span>
            <span className="text-sm text-gray-600">pending approval</span>
          </div>
        )}
      </div>

      {/* WebSocket Connection Status */}
      <div className="flex items-center gap-2 text-sm">
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-gray-600">
          {connected ? 'Real-time updates connected' : 'Real-time updates disconnected'}
        </span>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search RFQs by number, customer, contact, line of business, priority, competitor..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
            <p className="mt-2 text-xs text-gray-500">
              Tip: combine filters to quickly narrow down RFQs. Showing {filteredRfqs.length} of {rfqs.length}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                <X className="h-4 w-4" />
                Clear Search
              </button>
            )}
            <button
              onClick={() => setFiltersOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 text-xs rounded-full bg-white text-blue-600 font-semibold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {filtersOpen && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Filter className="h-4 w-4 text-blue-500" />
                Advanced Filters
              </h3>
              <button
                onClick={resetFilters}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Reset Filters
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Line of Business</p>
                <div className="flex flex-wrap gap-2">
                  {['karoseri', 'service', 'sparepart'].map((lob) => {
                    const isActive = filters.lineOfBusiness.includes(lob);
                    return (
                      <button
                        key={lob}
                        onClick={() => toggleFilterValue('lineOfBusiness', lob)}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                          isActive
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {lob.charAt(0).toUpperCase() + lob.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Priority</p>
                <div className="flex flex-wrap gap-2">
                  {['urgent', 'high', 'medium', 'low'].map((priority) => {
                    const isActive = filters.priority.includes(priority);
                    const colorMap = {
                      urgent: 'bg-red-600 border-red-600',
                      high: 'bg-orange-500 border-orange-500',
                      medium: 'bg-yellow-500 border-yellow-500',
                      low: 'bg-green-600 border-green-600'
                    };
                    const inactiveMap = {
                      urgent: 'text-red-600',
                      high: 'text-orange-600',
                      medium: 'text-yellow-600',
                      low: 'text-green-600'
                    };

                    return (
                      <button
                        key={priority}
                        onClick={() => toggleFilterValue('priority', priority)}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                          isActive
                            ? `${colorMap[priority]} text-white`
                            : `bg-white border-gray-200 hover:border-gray-300 ${inactiveMap[priority]}`
                        }`}
                      >
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Engineering Verdict</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'canDo', label: 'Can Do' },
                    { value: 'cannotDo', label: 'Cannot Do' },
                    { value: 'noVerdict', label: 'No Verdict' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          verdict: option.value
                        }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                        filters.verdict === option.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Minimum Confidence Rate
                  </p>
                  <span className="text-sm font-semibold text-blue-600">
                    {filters.minConfidence || 0}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.minConfidence || 0}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      minConfidence: Number(e.target.value)
                    }))
                  }
                  className="w-full accent-blue-600"
                />
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2">
                {filters.lineOfBusiness.map((lob) => (
                  <span
                    key={`lob-${lob}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                  >
                    {lob.charAt(0).toUpperCase() + lob.slice(1)}
                    <button
                      onClick={() => toggleFilterValue('lineOfBusiness', lob)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <XCircleIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {filters.priority.map((priority) => (
                  <span
                    key={`priority-${priority}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    <button
                      onClick={() => toggleFilterValue('priority', priority)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <XCircleIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {filters.verdict !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-full">
                    Verdict: {
                      {
                        canDo: 'Can Do',
                        cannotDo: 'Cannot Do',
                        noVerdict: 'No Verdict'
                      }[filters.verdict]
                    }
                    <button
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          verdict: 'all'
                        }))
                      }
                      className="text-emerald-500 hover:text-emerald-700"
                    >
                      <XCircleIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {(filters.minConfidence || 0) > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                    Confidence ≥ {filters.minConfidence}%
                    <button
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          minConfidence: 0
                        }))
                      }
                      className="text-purple-500 hover:text-purple-700"
                    >
                      <XCircleIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RFQs List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading RFQs...</p>
        </div>
      ) : filteredRfqs.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-green-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No RFQs match your criteria</h3>
          <p className="text-gray-600">Try adjusting your search or filters to see more results.</p>
          {rfqs.length > 0 && (
            <button
              onClick={resetFilters}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
            >
              <Filter className="h-4 w-4" />
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRfqs.map((rfq) => {
            const totalRevenue = sumRfqBudgetTotal(rfq.items, rfq.lineOfBusiness?.type);

            // Engineering verdict
            const engVerdict = rfq.engineeringTransit;
            const canDo = engVerdict?.canDo;
            const engComments = engVerdict?.comments;
            const reviewedBy = engVerdict?.reviewedBy;
            const reviewedAt = engVerdict?.reviewedAt;

            return (
              <div key={rfq._id} className="border border-gray-200 rounded-lg hover:shadow-md transition-all bg-white">
                {/* Compact Header with Engineering Verdict */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    {/* Left: RFQ Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-base font-semibold text-gray-900">RFQ #{rfq.rfqNumber}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                          rfq.lineOfBusiness?.type === 'karoseri' ? 'bg-blue-100 text-blue-800' :
                          rfq.lineOfBusiness?.type === 'service' ? 'bg-purple-100 text-purple-800' :
                          rfq.lineOfBusiness?.type === 'sparepart' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {rfq.lineOfBusiness?.type?.charAt(0).toUpperCase() + rfq.lineOfBusiness?.type?.slice(1) || 'N/A'}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(rfq.status)}`}>
                          {getStatusIcon(rfq.status)}
                          {rfq.status}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                          rfq.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          rfq.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          rfq.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {rfq.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        <span className="font-medium">{rfq.customerName}</span>
                        {rfq.contactPerson?.name && <span className="text-gray-500"> • {rfq.contactPerson.name}</span>}
                      </p>
                    </div>

                    {/* Right: Engineering Verdict Badge */}
                    <div className="flex-shrink-0">
                      {canDo !== null && canDo !== undefined ? (
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                          canDo 
                            ? 'bg-green-50 border-green-200 text-green-800' 
                            : 'bg-red-50 border-red-200 text-red-800'
                        }`}>
                          {canDo ? (
                            <CheckCircle2 size={16} className="text-green-600" />
                          ) : (
                            <X size={16} className="text-red-600" />
                          )}
                          <span className="text-sm font-semibold">
                            {canDo ? 'Can Do' : 'Cannot Do'}
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-gray-50 border-gray-200 text-gray-600">
                          <AlertCircle size={16} />
                          <span className="text-sm font-medium">No Verdict</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Compact Content Grid */}
                <div className="p-4 space-y-3">
                  {/* Engineering Verdict Summary */}
                  {engVerdict && (
                    <div className={`rounded-lg p-3 border ${
                      canDo 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-start gap-2">
                        <TrendingUp size={16} className={`mt-0.5 flex-shrink-0 ${
                          canDo ? 'text-green-600' : 'text-red-600'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-semibold ${
                              canDo ? 'text-green-800' : 'text-red-800'
                            }`}>
                              Engineering Verdict: {canDo ? 'Can Do' : 'Cannot Do'}
                            </span>
                            {reviewedBy && (
                              <span className="text-xs text-gray-500">
                                by {reviewedBy.fullName || reviewedBy.email}
                              </span>
                            )}
                            {reviewedAt && (
                              <span className="text-xs text-gray-400">
                                {new Date(reviewedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {engComments && (
                            <div className="flex items-start gap-1.5 mt-1.5">
                              <MessageSquare size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-gray-700 leading-relaxed">{engComments}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                   {/* Budget Breakdown - Visible in List */}
                   {rfq.items && rfq.items.length > 0 && (
                     <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                       <div className="text-xs font-semibold text-blue-800 mb-2">Budget Breakdown</div>
                       <div className="space-y-2">
                         {rfq.items.map((item, idx) => {
                           const { perQty, quantity: qty, lineTotal: itemTotal } = getRfqItemBudgetDisplay(
                             item,
                             rfq.lineOfBusiness?.type
                           );
                           const formatCurrency = (amount) => 
                             new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
                           
                           return (
                             <div key={idx} className="bg-white rounded p-2 border border-blue-100">
                               <div className="text-xs font-medium text-gray-700 mb-1">Item {item.itemNumber || idx + 1}</div>
                               <div className="text-xs text-gray-600 space-y-0.5">
                                 <div className="flex justify-between">
                                   <span>Per Qty:</span>
                                   <span className="font-semibold">{formatCurrency(perQty)}</span>
                      </div>
                                 <div className="flex justify-between">
                                   <span>Qty:</span>
                                   <span className="font-semibold">{qty}</span>
                      </div>
                                 <div className="flex justify-between pt-0.5 border-t border-blue-100">
                                   <span>{formatCurrency(perQty)} × {qty}:</span>
                                   <span className="font-bold text-green-700">{formatCurrency(itemTotal)}</span>
                    </div>
                               </div>
                             </div>
                           );
                         })}
                         <div className="bg-blue-100 rounded p-2 border border-blue-200 mt-2">
                           <div className="flex justify-between items-center">
                             <span className="text-xs font-semibold text-blue-800">Total Budget:</span>
                             <span className="text-sm font-bold text-blue-900">
                               {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalRevenue)}
                             </span>
                           </div>
                         </div>
                       </div>
                     </div>
                   )}

                   {/* Compact Info Grid */}
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

                    {/* Confidence */}
                    <div className="bg-amber-50 rounded-lg p-2.5 border border-amber-100">
                      <div className="text-xs font-medium text-gray-600 mb-1">Confidence</div>
                      <div className={`text-sm font-bold ${
                        rfq.confidenceRate >= 70 ? 'text-green-700' :
                        rfq.confidenceRate >= 50 ? 'text-yellow-700' : 'text-red-600'
                      }`}>
                        {rfq.confidenceRate || 0}%
                      </div>
                    </div>

                    {/* Competitor */}
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <div className="text-xs font-medium text-gray-600 mb-1">Competitor</div>
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {rfq.competitor && rfq.competitor.trim() !== '' ? rfq.competitor : 'None'}
                      </div>
                    </div>

                    {/* Location */}
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <div className="text-xs font-medium text-gray-600 mb-1">Location</div>
                      <div className="text-sm font-medium text-gray-800 truncate" title={rfq.deliveryLocation}>
                        {rfq.deliveryLocation || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Description - Compact */}
                  {rfq.description && (
                    <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                      <p className="text-xs text-gray-600 line-clamp-2">
                        <span className="font-medium">Description:</span> {rfq.description}
                      </p>
                    </div>
                  )}

                  {/* Expandable Items */}
                  <div className="border-t border-gray-100 pt-3">
                    <button
                      onClick={() => toggleExpanded(rfq._id)}
                      className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      <span>
                        Items ({rfq.items?.length || 0})
                        {rfq.items && rfq.items.length > 0 && (
                          <span className="text-gray-500 font-normal ml-1">
                            • Qty: {rfq.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0)}
                          </span>
                        )}
                      </span>
                      {expandedRFQ === rfq._id ? (
                        <ChevronUp size={16} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={16} className="text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Items Details */}
                {expandedRFQ === rfq._id && rfq.items && (
                  <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                    {/* Approve/Reject Buttons in Expanded View - Only show when status is pending and stage is approver */}
                    {rfq.status === 'pending' && rfq.stage === 'approver' && (
                      <div className="mb-4 pt-3 flex gap-2">
                        <button
                          onClick={() => showApproval(rfq, 'approve')}
                          disabled={isProcessing}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle size={14} />
                          {isProcessing ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => showApproval(rfq, 'reject')}
                          disabled={isProcessing}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircle size={14} />
                          {isProcessing ? 'Processing...' : 'Reject'}
                        </button>
                      </div>
                    )}
                     <div className="pt-3 space-y-3">
                      {rfq.items.map((item, index) => {
                        const { perQty: perQuantity, quantity, lineTotal: totalRevenue } = getRfqItemBudgetDisplay(
                          item,
                          rfq.lineOfBusiness?.type
                        );
                        const formatCurrency = (amount) => 
                          new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
                        
                        return (
                        <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex items-start justify-between mb-2">
                             <h4 className="text-sm font-semibold text-gray-900">Item {item.itemNumber || index + 1}</h4>
                                  </div>
                           
                           {/* Budget Details - Simple Format */}
                           <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-200 mb-2">
                             <div className="text-xs text-gray-700 space-y-1">
                               <div className="flex items-center justify-between">
                                 <span>Per Qty:</span>
                                 <span className="font-semibold">{formatCurrency(perQuantity)}</span>
                                  </div>
                               <div className="flex items-center justify-between">
                                 <span>Qty:</span>
                                 <span className="font-semibold">{quantity}</span>
                               </div>
                               <div className="flex items-center justify-between pt-1 border-t border-blue-200">
                                 <span>{formatCurrency(perQuantity)} × {quantity}:</span>
                                 <span className="font-bold text-green-700">{formatCurrency(totalRevenue)}</span>
                               </div>
                            </div>
                          </div>
                          
                          {/* Type-specific fields */}
                          {rfq.lineOfBusiness?.type === 'karoseri' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                              <div>
                                <span className="font-medium">Karoseri:</span> {item.karoseri || 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium">Chassis:</span> {item.chassis || 'N/A'} {item.chassisModel ? `- ${item.chassisModel}` : ''}
                              </div>
                            </div>
                          )}
                          
                          {rfq.lineOfBusiness?.type === 'service' && (
                            <div className="grid grid-cols-1 sm:grid-cols-1 gap-2 text-xs text-gray-600 mb-2">
                              <div>
                                <span className="font-medium">Service:</span> {item.serviceName || 'N/A'}
                              </div>
                              {item.serviceDetails && item.serviceDetails.length > 0 && (
                                <div className="text-gray-500 italic">
                                  <ul className="list-disc list-inside space-y-0.5">
                                    {item.serviceDetails.map((detail, idx) => (
                                      <li key={idx}>{detail}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {rfq.lineOfBusiness?.type === 'sparepart' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                              <div>
                                <span className="font-medium">Sparepart:</span> {item.sparepartName || 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium">Price/Unit:</span> {item.pricePerUnit ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.pricePerUnit) : 'N/A'}
                              </div>
                            </div>
                          )}

                          {item.notes && (
                            <p className="text-xs text-gray-600 mb-2">
                              <span className="font-medium">Notes:</span> {item.notes}
                            </p>
                          )}

                          {/* Specifications - Compact */}
                          {item.specifications && item.specifications.length > 0 && (
                            <details className="mt-2">
                              <summary className="text-xs font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                                View Specifications ({item.specifications.length})
                              </summary>
                              <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-gray-200">
                                {item.specifications.map((spec, specIndex) => (
                                  <div key={specIndex} className="text-xs">
                                    <div className="font-semibold text-gray-700 mb-0.5">{spec.category}</div>
                                    {spec.items && spec.items.map((specItem, itemIndex) => (
                                      <div key={itemIndex} className="text-gray-600 ml-2">
                                        <span className="font-medium">{specItem.name}:</span> {specItem.specification}
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                  <div className="pt-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                    <button
                      onClick={() => navigate(`/quotations/rfq/${rfq._id}`)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Eye size={14} />
                      View Full Details
                    </button>
                    
                    {rfq.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => showApproval(rfq, 'approve')}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          <CheckCircle size={14} />
                          Approve
                        </button>
                        <button
                          onClick={() => showApproval(rfq, 'reject')}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedRFQ && (
        <BaseModal
          isOpen={showApprovalModal}
          onClose={() => {
            setShowApprovalModal(false);
            setSelectedRFQ(null);
            setApprovalNotes('');
          }}
          title={`${selectedRFQ.action === 'approve' ? 'Approve' : 'Reject'} RFQ`}
        >
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-900 mb-2">RFQ Information</h3>
              <div className="space-y-2 text-sm text-blue-800">
                <p><span className="font-medium">RFQ Number:</span> {selectedRFQ.rfqNumber}</p>
                <p><span className="font-medium">Customer:</span> {selectedRFQ.customerName}</p>
                <p><span className="font-medium">Contact:</span> {selectedRFQ.contactPerson?.name}</p>
                <p><span className="font-medium">Requester:</span> {selectedRFQ.requesterId?.fullName}</p>
                <p><span className="font-medium">Creator:</span> {selectedRFQ.quotationCreatorId?.fullName}</p>
                <p><span className="font-medium">Priority:</span> {selectedRFQ.priority}</p>
                <p><span className="font-medium">Delivery Location:</span> {selectedRFQ.deliveryLocation}</p>
                <p><span className="font-medium">Competitor:</span> {selectedRFQ.competitor}</p>
                <p><span className="font-medium">Confidence Rate:</span> {selectedRFQ.confidenceRate}%</p>
                
                {/* Key Information - Enhanced Modal Design */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center mb-3">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
                    <h4 className="text-sm font-bold text-amber-800">Key Information</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Competitor */}
                    <div className="bg-white rounded-lg p-3 border border-amber-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">Competitor</span>
                        <div className={`w-2 h-2 rounded-full ${
                          selectedRFQ.competitor && selectedRFQ.competitor.trim() !== '' ? 'bg-green-400' : 'bg-red-400'
                        }`}></div>
                      </div>
                      <div className={`text-sm font-semibold ${
                        selectedRFQ.competitor && selectedRFQ.competitor.trim() !== '' ? 'text-green-700' : 'text-red-600'
                      }`}>
                        {selectedRFQ.competitor && selectedRFQ.competitor.trim() !== '' ? selectedRFQ.competitor : 'None'}
                      </div>
                    </div>

                    {/* Can Make */}
                    <div className="bg-white rounded-lg p-3 border border-amber-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">Can Make</span>
                        <div className={`w-2 h-2 rounded-full ${selectedRFQ.canMake ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      </div>
                      <div className={`text-sm font-semibold ${selectedRFQ.canMake ? 'text-green-700' : 'text-red-600'}`}>
                        {selectedRFQ.canMake ? 'Yes' : 'No'}
                      </div>
                    </div>

                    {/* Project Ongoing */}
                    <div className="bg-white rounded-lg p-3 border border-amber-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">Ongoing</span>
                        <div className={`w-2 h-2 rounded-full ${selectedRFQ.projectOngoing ? 'bg-blue-400' : 'bg-gray-400'}`}></div>
                      </div>
                      <div className={`text-sm font-semibold ${selectedRFQ.projectOngoing ? 'text-blue-700' : 'text-gray-600'}`}>
                        {selectedRFQ.projectOngoing ? 'Yes' : 'No'}
                      </div>
                    </div>

                    {/* Confidence Rate */}
                    <div className="bg-white rounded-lg p-3 border border-amber-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">Confidence</span>
                        <div className={`w-2 h-2 rounded-full ${
                          selectedRFQ.confidenceRate >= 70 ? 'bg-green-400' :
                          selectedRFQ.confidenceRate >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                        }`}></div>
                      </div>
                      <div className={`text-sm font-semibold ${
                        selectedRFQ.confidenceRate >= 70 ? 'text-green-700' :
                        selectedRFQ.confidenceRate >= 50 ? 'text-yellow-700' : 'text-red-600'
                      }`}>
                        {selectedRFQ.confidenceRate || 0}%
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Budget Information */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">Budget Information</h4>
                  <div className="space-y-2 text-xs">
                    {selectedRFQ.items && selectedRFQ.items.length > 0 ? (
                      <>
                        {selectedRFQ.items.map((item, index) => {
                          const { perQty: perQuantity, quantity, lineTotal: totalRevenue } = getRfqItemBudgetDisplay(
                            item,
                            selectedRFQ.lineOfBusiness?.type
                          );
                          const formatCurrency = (amount) => 
                            new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
                          
                          return (
                             <div key={index} className="bg-white rounded-lg p-3 border border-blue-200">
                               <div className="font-semibold text-blue-800 mb-2 text-sm">Item {item.itemNumber || index + 1}</div>
                               
                               {/* Budget Details - Simple Format */}
                               <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-200">
                                 <div className="text-xs text-gray-700 space-y-1">
                                <div className="flex items-center justify-between">
                                     <span>Per Qty:</span>
                                     <span className="font-semibold">{formatCurrency(perQuantity)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                     <span>Qty:</span>
                                     <span className="font-semibold">{quantity}</span>
                                </div>
                                   <div className="flex items-center justify-between pt-1 border-t border-blue-200">
                                     <span>{formatCurrency(perQuantity)} × {quantity}:</span>
                                     <span className="font-bold text-green-700">{formatCurrency(totalRevenue)}</span>
                                </div>
                                  </div>
                              </div>
                            </div>
                          );
                        })}
                        <div className="bg-white rounded p-2 border border-blue-200 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-blue-800">Grand Total Revenue:</span>
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-green-200 text-green-900">
                              {(() => {
                                const grandTotal = sumRfqBudgetTotal(
                                  selectedRFQ.items,
                                  selectedRFQ.lineOfBusiness?.type
                                );
                                return grandTotal > 0 
                                  ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(grandTotal)
                                  : 'Not Set';
                              })()}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-2">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          No Items / Budget: 0
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {selectedRFQ.description && (
                  <p><span className="font-medium">Description:</span> {selectedRFQ.description}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="approvalNotes" className="block text-sm font-medium text-gray-700 mb-2">
                {selectedRFQ.action === 'approve' ? 'Approval' : 'Rejection'} Notes
              </label>
              <textarea
                id="approvalNotes"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Enter ${selectedRFQ.action === 'approve' ? 'approval' : 'rejection'} notes...`}
                rows="4"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedRFQ(null);
                  setApprovalNotes('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedRFQ.action === 'approve') {
                    handleApprove(selectedRFQ._id, approvalNotes);
                  } else {
                    handleReject(selectedRFQ._id, approvalNotes);
                  }
                }}
                disabled={isProcessing}
                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedRFQ.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isProcessing 
                  ? (selectedRFQ.action === 'approve' ? 'Approving...' : 'Rejecting...')
                  : (selectedRFQ.action === 'approve' ? 'Approve RFQ' : 'Reject RFQ')
                }
              </button>
            </div>
          </div>
        </BaseModal>
      )}
    </div>
  );
};

export default ApproveQuotationTab;
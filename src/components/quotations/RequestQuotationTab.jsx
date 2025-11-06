import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { UserContext } from '../../utils/contexts/UserContext';
import { NotificationsContext } from '../../utils/contexts/NotificationsContext';
import axiosInstance from '../../utils/api/ApiHelper';
import toast from 'react-hot-toast';
import { Plus, FileText, Clock, CheckCircle, XCircle, ArrowRight, Info, Filter, FolderPlus, CheckSquare, Square, Upload, Trash2, MoreVertical } from 'lucide-react';
import RequestRFQModal from '../forms/RequestRFQModal';
import BaseModal from '../modals/BaseModal';
import CustomDropdown from '../common/CustomDropdown';

const RequestQuotationTab = () => {
  const { connected } = useContext(NotificationsContext);
  const [approvers, setApprovers] = useState([]);
  const [quotationCreators, setQuotationCreators] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedRFQ, setSelectedRFQ] = useState(null);
  const [selectedEngineer, setSelectedEngineer] = useState('');
  const [rfqToEdit, setRfqToEdit] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [rfqResults, setRfqResults] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const listRef = useRef(null);
  const [chips, setChips] = useState([]); // [{ type: 'app', value: 'budi' }, ...]
  const [infoOpen, setInfoOpen] = useState(false);
  const [meetingFilter, setMeetingFilter] = useState('');
  
  // Folder management states
  const [folders, setFolders] = useState([]);
  const [selectedFolderFilter, setSelectedFolderFilter] = useState('');
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#3B82F6');
  const [selectedRFQIds, setSelectedRFQIds] = useState([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  
  // CSV Upload states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  
  // Folder edit/delete modal states
  const [showFolderEditModal, setShowFolderEditModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [editFolderColor, setEditFolderColor] = useState('#3B82F6');
  
  // Color options for folders
  const folderColors = [
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Orange', value: '#F59E0B' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Indigo', value: '#6366F1' },
    { name: 'Teal', value: '#14B8A6' },
  ];

  // ----- Search Parse Utility -----
  const parseTokens = (input) => {
    // e.g. app:admin type:karoseri "exact phrase" fuzzywords from:2025-01-01 to:2025-01-15
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
    let page = pageOverride || (pagination.page || 1);
    setLoading(true);
    // Build search string from chips and searchInput
    let search = '';
    chips.forEach((chip) => {
      if (chip.type === 'phrase') search += ' "' + chip.value + '"';
      else if (chip.type === 'global') search += ' ' + chip.value;
      else search += ` ${chip.type}:${chip.value}`;
    });
    if (searchInput.trim()) search += ' ' + searchInput.trim();
    
    // Build query params
    const params = { page, limit: 20, search };
    
    // Apply meeting filter if selected
    if (meetingFilter) {
      const filterMap = {
        'not_submitted': { stage: 'sales', status: 'pending' },
        'rejected': { status: 'rejected' },
        'pending_approval': { stage: 'approver', status: 'pending' },
        'in_engineering': { stage: 'engineering', status: 'pending' },
        'approved': { status: 'approved' },
        'quotation_created': { status: 'quotation_created' }
      };
      const filter = filterMap[meetingFilter];
      if (filter) {
        if (filter.stage) params.stage = filter.stage;
        if (filter.status) params.status = filter.status;
      }
    }
    
    // Apply folder filter if selected
    if (selectedFolderFilter) {
      params.folderId = selectedFolderFilter;
    }
    
    try {
      const resp = await axiosInstance.get('/api/rfq', { params });
      let newResults = resp.data.data?.rfqs || resp.data.data?.rfq || [];
      // Ensure newResults is always an array
      if (!Array.isArray(newResults)) {
        console.error('API returned non-array data:', newResults);
        newResults = [];
      }
      setPagination(resp.data.pagination || resp.data.data?.pagination || { page: 1, pages: 1, total: 0 });
      setRfqResults(prev => reset ? newResults : [...prev, ...newResults]);
    } catch (error) {
      console.error('Error fetching RFQs:', error);
      toast.error('Failed to fetch RFQs');
      setRfqResults([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  }, [chips, searchInput, meetingFilter, selectedFolderFilter, pagination.page]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchRFQs(1, true); // Reset to page 1 on new search
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchInput, chips, meetingFilter, selectedFolderFilter, fetchRFQs]);


  const onSearchInput = (val) => {
    setSearchInput(val);
    setPagination((p) => ({ ...p, page: 1 })); // Reset paging
  };

  const onRemoveChip = (idx) => {
    setChips((chips) => chips.filter((c, i) => i !== idx));
    setPagination((p) => ({ ...p, page: 1 })); // Reset paging
  };

  const onAddChipFromInput = () => {
    if (!searchInput.trim()) return;
    // Detect operators, else treat as global/phrase
    const tokens = parseTokens(searchInput.trim());
    setChips([...chips, ...tokens]);
    setSearchInput('');
  };

  // Infinite scroll (append more records)
  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    if (loading) return;
    if (pagination.page >= pagination.pages) return;
    // near bottom
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
      fetchRFQs(pagination.page + 1);
      setPagination((p) => ({ ...p, page: p.page + 1 }));
    }
  }, [loading, pagination, fetchRFQs]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Fetch approvers for the dropdown
  const fetchApprovers = async () => {
    try {
      const response = await axiosInstance.get('/api/rfq/approvers');
      setApprovers(response.data.data.approvers);
    } catch (error) {
      console.error('Error fetching approvers:', error);
      toast.error('Failed to fetch approvers');
    }
  };

  // Fetch quotation creators for the dropdown
  const fetchQuotationCreators = async () => {
    try {
      const response = await axiosInstance.get('/api/rfq/quotation-creators');
      setQuotationCreators(response.data.data.quotationCreators);
    } catch (error) {
      console.error('Error fetching quotation creators:', error);
      toast.error('Failed to fetch quotation creators');
    }
  };

  // Fetch engineers for the dropdown
  const fetchEngineers = async () => {
    try {
      const response = await axiosInstance.get('/api/rfq/engineers');
      setEngineers(response.data.data.engineers || []);
    } catch (error) {
      console.error('Error fetching engineers:', error);
      toast.error('Failed to fetch engineers');
    }
  };

  // Fetch folders for current user
  const fetchFolders = async () => {
    try {
      const response = await axiosInstance.get('/api/auth/folders');
      setFolders(response.data.data.folders || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast.error('Failed to fetch folders');
    }
  };

  // Handle CSV file upload
  const handleCSVUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setIsProcessing(false);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axiosInstance.post('/api/rfq/upload-seed', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percentCompleted);
          
          // When upload reaches 100%, switch to processing state
          if (percentCompleted >= 100) {
            setIsProcessing(true);
          }
        },
      });

      setUploadResult(response.data.data);
      toast.success('CSV uploaded and processed successfully!');
      
      // Refresh RFQ list
      fetchRFQs(1, true);
      fetchFolders();
    } catch (error) {
      console.error('Error uploading CSV:', error);
      toast.error(error.response?.data?.message || 'Failed to upload CSV file');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setIsProcessing(false);
    }
  };

  // Create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Folder name is required');
      return;
    }

    try {
      await axiosInstance.post('/api/auth/folders', {
        name: newFolderName.trim(),
        color: newFolderColor
      });
      toast.success('Folder created successfully');
      setShowFolderModal(false);
      setNewFolderName('');
      setNewFolderColor('#3B82F6');
      fetchFolders();
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error(error.response?.data?.message || 'Failed to create folder');
    }
  };

  // Move selected RFQs to folder
  const handleMoveToFolder = async (folderId) => {
    if (selectedRFQIds.length === 0) {
      toast.error('Please select RFQs to move');
      return;
    }

    try {
      await axiosInstance.patch('/api/rfq/move-to-folder', {
        rfqIds: selectedRFQIds,
        folderId: folderId || null
      });
      toast.success('RFQs moved successfully');
      setSelectedRFQIds([]);
      setIsSelectMode(false);
      fetchRFQs(1, true);
    } catch (error) {
      console.error('Error moving RFQs:', error);
      toast.error(error.response?.data?.message || 'Failed to move RFQs');
    }
  };

  // Open folder edit modal
  const handleOpenFolderEdit = (folder) => {
    setEditingFolder(folder);
    setEditFolderName(folder.name);
    setEditFolderColor(folder.color);
    setShowFolderEditModal(true);
  };

  // Update folder
  const handleUpdateFolder = async () => {
    if (!editFolderName.trim()) {
      toast.error('Folder name is required');
      return;
    }

    if (!editingFolder) return;

    try {
      await axiosInstance.put(`/api/auth/folders/${editingFolder._id}`, {
        name: editFolderName.trim(),
        color: editFolderColor
      });
      toast.success('Folder updated successfully');
      setShowFolderEditModal(false);
      setEditingFolder(null);
      fetchFolders();
      fetchRFQs(1, true);
    } catch (error) {
      console.error('Error updating folder:', error);
      toast.error(error.response?.data?.message || 'Failed to update folder');
    }
  };

  // Delete folder
  const handleDeleteFolder = async () => {
    if (!editingFolder) return;
    
    if (!window.confirm('Are you sure you want to delete this folder? RFQs in this folder will be moved to default (no folder).')) {
      return;
    }

    try {
      const response = await axiosInstance.delete(`/api/auth/folders/${editingFolder._id}`);
      const rfqsMoved = response.data.data?.rfqsMovedToDefault || 0;
      
      if (rfqsMoved > 0) {
        toast.success(`Folder deleted. ${rfqsMoved} RFQ${rfqsMoved > 1 ? 's' : ''} moved to default.`);
      } else {
        toast.success('Folder deleted successfully');
      }
      
      // Clear folder filter if deleted folder was selected
      if (selectedFolderFilter === editingFolder._id) {
        setSelectedFolderFilter('');
      }
      
      setShowFolderEditModal(false);
      setEditingFolder(null);
      fetchFolders();
      fetchRFQs(1, true);
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error(error.response?.data?.message || 'Failed to delete folder');
    }
  };

  // Handle new RFQ creation
  const handleCreateRFQ = async (rfqData) => {
    try {
      await axiosInstance.post('/api/rfq', rfqData);
      toast.success('RFQ submitted successfully');
      setShowModal(false);
      fetchRFQs();
    } catch (error) {
      console.error('Error creating RFQ:', error);
      toast.error('Failed to submit RFQ');
    }
  };

  // --- Edit handler for PATCH save only ---
  const handleEditRFQ = async (rfqId, update) => {
    try {
      await axiosInstance.patch(`/api/rfq/${rfqId}`, update);
      toast.success('RFQ saved');
      setShowModal(false);
      setRfqToEdit(null);
      fetchRFQs(1, true);
    } catch (error) {
      console.error('Error saving RFQ:', error);
      toast.error('Failed to save RFQ');
    }
  };

  // Handle submit to engineering
  const handleSubmitToEngineering = async () => {
    if (!selectedEngineer) {
      toast.error('Please select an engineer');
      return;
    }
    
    if (!selectedRFQ) {
      toast.error('No RFQ selected');
      return;
    }
    
    try {
      await axiosInstance.post(`/api/rfq/${selectedRFQ._id}/submit-to-engineering`, {
        engineeringId: selectedEngineer
      });
      toast.success('RFQ submitted to engineering successfully');
      setShowSubmitModal(false);
      setSelectedRFQ(null);
      setSelectedEngineer('');
      fetchRFQs(1, true);
    } catch (error) {
      console.error('Error submitting to engineering:', error);
      toast.error(error.response?.data?.message || 'Failed to submit to engineering');
    }
  };

  useEffect(() => {
    fetchRFQs(1, true);
    fetchApprovers();
    fetchQuotationCreators();
    fetchEngineers();
    fetchFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh when WebSocket reconnects
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Request Quotation</h2>
          <p className="text-sm text-gray-600 mt-1">Create and manage your quotation requests</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Upload size={16} />
            Upload RFQ CSV
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Request Quotation
          </button>
        </div>
      </div>

      {/* WebSocket Connection Status */}
      <div className="flex items-center gap-2 text-sm">
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-gray-600">
          {connected ? 'Real-time updates connected' : 'Real-time updates disconnected'}
        </span>
      </div>

      {/* Folder Management Bar */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Folders:</span>
          {folders.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setSelectedFolderFilter('');
                  fetchRFQs(1, true);
                }}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedFolderFilter === '' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All RFQs
              </button>
              {folders.map(folder => (
                <div
                  key={folder._id}
                  className="flex items-center gap-1 group relative"
                >
                  <button
                    onClick={() => {
                      setSelectedFolderFilter(folder._id);
                      fetchRFQs(1, true);
                    }}
                    className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-2 ${
                      selectedFolderFilter === folder._id
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={selectedFolderFilter === folder._id ? { backgroundColor: folder.color } : {}}
                  >
                    <span style={{ color: folder.color }}>●</span>
                    {folder.name}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenFolderEdit(folder);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Folder options"
                  >
                    <MoreVertical size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowFolderModal(true)}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <FolderPlus size={14} />
            New Folder
          </button>
        </div>
        <div className="flex-1"></div>
        <button
          onClick={() => {
            setIsSelectMode(!isSelectMode);
            setSelectedRFQIds([]);
          }}
          className={`inline-flex items-center gap-1 px-3 py-1 text-sm rounded-md transition-colors ${
            isSelectMode 
              ? 'bg-green-600 text-white hover:bg-green-700' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <CheckSquare size={14} />
          {isSelectMode ? 'Cancel Select' : 'Select RFQs'}
        </button>
        {isSelectMode && selectedRFQIds.length > 0 && folders.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{selectedRFQIds.length} selected</span>
            <CustomDropdown
              options={[
                { value: '', label: 'Remove from folder' },
                ...folders.map(f => ({ value: f._id, label: f.name }))
              ]}
              value=""
              onChange={(folderId) => handleMoveToFolder(folderId)}
              placeholder="Move to folder..."
            />
          </div>
        )}
      </div>

      {/* UI: Search bar, meeting filter, and info */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="Search by RFQ number, customer, description, or use filters: app:name status:pending stage:sales customer:ABC..."
              value={searchInput}
              onChange={(e) => onSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddChipFromInput()}
            />
          </div>
          <button 
            onClick={() => setInfoOpen(true)}
            className="p-2.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Search help"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
        
        {/* Meeting Purpose Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Meeting Filter:</span>
          </div>
          <div className="flex-1 max-w-xs">
            <CustomDropdown
              options={[
                { value: '', label: 'All RFQs' },
                { value: 'not_submitted', label: 'Not Yet Submitted (Sales/Pending)' },
                { value: 'rejected', label: 'Rejected' },
                { value: 'pending_approval', label: 'Pending Approval (Awaiting Approver)' },
                { value: 'in_engineering', label: 'In Engineering Review' },
                { value: 'approved', label: 'Approved (Ready for Quotation)' },
                { value: 'quotation_created', label: 'Quotation Created' }
              ]}
              value={meetingFilter}
              onChange={(val) => {
                setMeetingFilter(val);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              placeholder="Filter for meeting..."
            />
          </div>
          {meetingFilter && (
            <button
              onClick={() => {
                setMeetingFilter('');
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>
      {/* chips UI */}
      <div className="flex flex-wrap gap-2 mb-2">
        {chips.map((chip, i) => (
          <span key={i} className="bg-blue-100 rounded text-blue-800 px-2 py-1 text-xs inline-flex items-center">
            {chip.type}:{chip.value} <button className="ml-1" onClick={() => onRemoveChip(i)}><XCircle className="w-3 h-3" /></button>
          </span>
        ))}
        {chips.length > 0 && <button onClick={() => setChips([])} className="ml-2 px-2 py-1 bg-gray-100 text-xs rounded">Clear Filters</button>}
      </div>

      {/* List container, infinite scrollable area */}
      <div ref={listRef} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {(!Array.isArray(rfqResults) || rfqResults.length === 0) && !loading && <div className="text-center text-gray-400 py-8">No RFQs found.</div>}
        {Array.isArray(rfqResults) && rfqResults.map(rfq => (
          <div key={rfq._id} className={`border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${rfq.status === 'rejected' ? 'bg-red-50 border-red-300' : ''}`}>
            <div className="flex items-start justify-between">
              {isSelectMode && (
                <button
                  onClick={() => {
                    if (selectedRFQIds.includes(rfq._id)) {
                      setSelectedRFQIds(selectedRFQIds.filter(id => id !== rfq._id));
                    } else {
                      setSelectedRFQIds([...selectedRFQIds, rfq._id]);
                    }
                  }}
                  className="mr-3 mt-1"
                >
                  {selectedRFQIds.includes(rfq._id) ? (
                    <CheckSquare size={20} className="text-blue-600" />
                  ) : (
                    <Square size={20} className="text-gray-400" />
                  )}
                </button>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="text-lg font-medium text-gray-900">{rfq.rfqNumber || rfq.title}</h3>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                    rfq.lineOfBusiness?.type === 'karoseri' ? 'bg-blue-100 text-blue-800' :
                    rfq.lineOfBusiness?.type === 'service' ? 'bg-purple-100 text-purple-800' :
                    rfq.lineOfBusiness?.type === 'sparepart' ? 'bg-indigo-100 text-indigo-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {rfq.lineOfBusiness?.type?.charAt(0).toUpperCase() + rfq.lineOfBusiness?.type?.slice(1) || 'N/A'}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(rfq.status)}`}>
                    {getStatusIcon(rfq.status)}
                    {rfq.status}
                  </span>
                </div>
                {/* Customer Name Row */}
                {rfq.customerName && (
                  <div className="text-sm text-gray-700 mb-1">
                    <span className="font-medium">Customer:</span> {rfq.customerName}
                  </div>
                )}
                {rfq.status === 'rejected' && rfq.approvalNotes && (
                  <div className="mt-2 mb-2 text-sm text-red-700 font-semibold">
                    <span className="font-bold">Rejected:</span> {rfq.approvalNotes}
                  </div>
                )}
                {rfq.description && (
                  <p className="text-gray-600 mb-2">{rfq.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>Approver: {rfq.approverId?.fullName || rfq.approverId?.email}</span>
                  <span>Created: {new Date(rfq.createdAt).toLocaleDateString()}</span>
                  {rfq.stage && (
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">Stage: {rfq.stage}</span>
                  )}
                  {rfq.engineeringTransit?.status && (
                    <span className="px-2 py-1 bg-blue-100 rounded text-xs">Engineering: {rfq.engineeringTransit.status}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => window.location = `/quotations/rfq/${rfq._id}`}
                  className="inline-flex items-center gap-1 px-2 py-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 bg-white rounded-md border border-blue-100"
                  title="View Details"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  View
                </button>
                {/* Edit button - available for all RFQs in sales stage (including rejected ones) */}
                {(rfq.stage === 'sales' || rfq.status === 'rejected') && (
                  <button
                    onClick={async () => {
                      try {
                        // Fetch full RFQ details with items
                        const response = await axiosInstance.get(`/api/rfq/${rfq._id}`);
                        if (response.data.success) {
                          setRfqToEdit(response.data.data.rfq);
                          setShowModal(true);
                        } else {
                          toast.error('Failed to load RFQ details');
                        }
                      } catch (error) {
                        console.error('Error fetching RFQ details:', error);
                        toast.error('Failed to load RFQ details');
                      }
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-yellow-500 text-white text-sm rounded-md hover:bg-yellow-600 transition-colors"
                    title="Edit RFQ"
                  >
                    Edit
                  </button>
                )}
                {/* Resubmit button - only for rejected RFQs */}
                {rfq.status === 'rejected' && (
                  <button
                    onClick={() => {
                      setSelectedRFQ(rfq);
                      setShowSubmitModal(true);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                    title="Resubmit to Engineering after rejection"
                  >
                    <ArrowRight size={14}/>
                    Resubmit
                  </button>
                )}
                {/* Submit to Engineering button - for pending RFQs in sales stage */}
                {rfq.stage === 'sales' && rfq.status !== 'rejected' && (
                  <button
                    onClick={() => {
                      setSelectedRFQ(rfq);
                      setShowSubmitModal(true);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                    title="Submit to Engineering"
                  >
                    <ArrowRight size={14}/>
                    Submit to Engineering
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && <div className="py-8 text-center text-gray-500">Loading...</div>}
      </div>

      {/* Request RFQ Modal */}
      {showModal && (
        <RequestRFQModal
          isOpen={showModal}
          onClose={() => { setShowModal(false); setRfqToEdit(null); }}
          onSubmit={rfqToEdit ? (data) => handleEditRFQ(rfqToEdit._id, data) : handleCreateRFQ}
          approvers={approvers}
          quotationCreators={quotationCreators}
          engineers={engineers}
          rfqToEdit={rfqToEdit}
        />
      )}

      {/* Submit to Engineering Modal */}
      {showSubmitModal && selectedRFQ && (
        <BaseModal
          isOpen={showSubmitModal}
          onClose={() => {
            setShowSubmitModal(false);
            setSelectedRFQ(null);
            setSelectedEngineer('');
          }}
          title="Submit RFQ to Engineering"
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Select an engineer to review RFQ: <strong>{selectedRFQ.rfqNumber}</strong>
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Engineer <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                options={engineers.map(engineer => ({
                  value: engineer._id,
                  label: `${engineer.fullName || engineer.email} (${engineer.email})`
                }))}
                value={selectedEngineer}
                onChange={setSelectedEngineer}
                placeholder="Select engineer"
              />
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowSubmitModal(false);
                  setSelectedRFQ(null);
                  setSelectedEngineer('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitToEngineering}
                disabled={!selectedEngineer}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit to Engineering
              </button>
            </div>
          </div>
        </BaseModal>
      )}

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

      {/* CSV Upload Modal */}
      <BaseModal isOpen={showUploadModal} onClose={() => { setShowUploadModal(false); setUploadResult(null); }} title="Upload RFQ CSV">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 mb-2 font-medium">CSV Format Requirements:</p>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li>Required columns: Cutoff Date, Category, Line of Business, Product Type, Opportunity Description, Customer, Chassis, Probability, Location, Total Est Revenue</li>
              <li>Line of Business values: karoseri, service, or sparepart</li>
              <li>Category will be used to create/organize folders (max 5 folders per user)</li>
              <li>Missing BodyType and ChassisType will be created automatically</li>
            </ul>
          </div>

          <div>
            <label htmlFor="csvFile" className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              id="csvFile"
              accept=".csv"
              onChange={handleCSVUpload}
              disabled={uploading || isProcessing}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {(uploading || isProcessing) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  {isProcessing ? 'Processing CSV file...' : `Uploading... ${uploadProgress}%`}
                </span>
                {!isProcessing && <span>{uploadProgress}%</span>}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isProcessing ? 'bg-blue-600 animate-pulse' : 'bg-green-600'
                  }`}
                  style={{ width: isProcessing ? '100%' : `${uploadProgress}%` }}
                />
              </div>
              {isProcessing && (
                <p className="text-xs text-gray-500">Please wait while we process your data...</p>
              )}
            </div>
          )}

          {uploadResult && !uploading && !isProcessing && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-green-900">Upload Summary</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Total Rows:</span>
                  <span className="ml-2 font-medium text-gray-900">{uploadResult.summary?.totalRows || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Processed:</span>
                  <span className="ml-2 font-medium text-green-700">{uploadResult.summary?.processed || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">RFQs Created:</span>
                  <span className="ml-2 font-medium text-green-700">{uploadResult.summary?.rfqsCreated || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Errors:</span>
                  <span className="ml-2 font-medium text-red-600">{uploadResult.summary?.errors || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">New BodyTypes:</span>
                  <span className="ml-2 font-medium text-blue-700">{uploadResult.summary?.newBodyTypes || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">New ChassisTypes:</span>
                  <span className="ml-2 font-medium text-blue-700">{uploadResult.summary?.newChassisTypes || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Folders Created:</span>
                  <span className="ml-2 font-medium text-purple-700">{uploadResult.summary?.foldersCreated || 0}</span>
                </div>
              </div>

              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-green-300">
                  <p className="text-sm font-medium text-red-700 mb-2">Errors ({uploadResult.errors.length}):</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {uploadResult.errors.map((error, index) => (
                      <p key={index} className="text-xs text-red-600">{error}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => { setShowUploadModal(false); setUploadResult(null); }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              disabled={uploading}
            >
              {uploadResult ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Folder Creation Modal */}
      <BaseModal isOpen={showFolderModal} onClose={() => setShowFolderModal(false)} title="Create New Folder">
        <div className="space-y-4">
          <div>
            <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 mb-2">
              Folder Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="folderName"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter folder name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Folder Color
            </label>
            <div className="grid grid-cols-4 gap-2">
              {folderColors.map(color => (
                <button
                  key={color.value}
                  onClick={() => setNewFolderColor(color.value)}
                  className={`h-10 rounded-lg border-2 transition-all ${
                    newFolderColor === color.value 
                      ? 'border-gray-900 ring-2 ring-purple-500' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => setShowFolderModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateFolder}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
            >
              Create Folder
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Folder Edit/Delete Modal */}
      <BaseModal isOpen={showFolderEditModal} onClose={() => { setShowFolderEditModal(false); setEditingFolder(null); }} title="Edit Folder">
        <div className="space-y-4">
          <div>
            <label htmlFor="editFolderName" className="block text-sm font-medium text-gray-700 mb-2">
              Folder Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="editFolderName"
              value={editFolderName}
              onChange={(e) => setEditFolderName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter folder name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Folder Color
            </label>
            <div className="grid grid-cols-4 gap-2">
              {folderColors.map(color => (
                <button
                  key={color.value}
                  onClick={() => setEditFolderColor(color.value)}
                  className={`h-10 rounded-lg border-2 transition-all ${
                    editFolderColor === color.value 
                      ? 'border-gray-900 ring-2 ring-purple-500' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <button
              onClick={handleDeleteFolder}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-2"
            >
              <Trash2 size={14} />
              Delete Folder
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowFolderEditModal(false); setEditingFolder(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateFolder}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </BaseModal>
    </div>
  );
};

export default RequestQuotationTab;

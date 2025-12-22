import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileText, 
  Calendar,
  Target,
  ArrowLeft,
  Download,
  Filter,
  PieChart,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Star,
  Edit3,
  Save,
  RotateCcw
} from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Treemap } from 'recharts';
import Navigation from '../components/common/Navigation';
import CustomDropdown from '../components/common/CustomDropdown';
import BaseModal from '../components/modals/BaseModal';
import ApiHelper from '../utils/api/ApiHelper';
import toast from 'react-hot-toast';
import { 
  updatePreferences, 
  getSectionPreferences,
  PREFERENCE_SECTIONS 
} from '../utils/helpers/UserPreferences';
import useSmartBackNavigation from '../hooks/useSmartBackNavigation';

const QuotationAnalysisPage = () => {
  const navigate = useNavigate();
  const handleBack = useSmartBackNavigation('/');
  const [loading, setLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState({
    totalQuotations: 0,
    winRate: 0,
    lossRate: 0,
    closeRate: 0,
    statusBreakdown: {
      open: { count: 0 },
      win: { count: 0 },
      loss: { count: 0 },
      close: { count: 0 }
    },
    reasonAnalytics: {
      loss: {},
      close: {}
    },
    monthlyStats: [],
    timePeriodSummary: {
      startDate: '',
      endDate: '',
      period: 'year-to-date'
    },
    followUpStatus: {
      currentlyOpen: { count: 0 },
      notFollowedUp: { count: 0 },
      mediumWarning: { count: 0 },
      upToDate: { count: 0 }
    },
    rfqStats: {
      total: 0,
      approved: 0,
      rejected: 0,
      pending: 0
    },
    bodyTypeFrequency: [],
    quarterlyStatus: []
  });

  // Time period options
  const timePeriodOptions = [
    { value: 'year-to-date', label: 'Year to Date' },
    { value: 'last-30-days', label: 'Last 30 Days' },
    { value: 'last-90-days', label: 'Last 90 Days' },
    { value: 'last-6-months', label: 'Last 6 Months' },
    { value: 'last-12-months', label: 'Last 12 Months' },
    { value: 'custom', label: 'Custom Range' }
  ];

  // Available sections for customization
  const availableSections = [
    { id: 'rfqStats', title: 'RFQ Statistics', icon: FileText, color: 'blue' },
    { id: 'keyMetrics', title: 'Key Metrics', icon: BarChart3, color: 'blue' },
    { id: 'bodyTypeFrequency', title: 'Body Type Frequency', icon: PieChart, color: 'purple' },
    { id: 'quarterlyStatus', title: 'Quarterly Status', icon: BarChart3, color: 'indigo' },
    { id: 'followUpStatus', title: 'Follow-up Status', icon: Clock, color: 'green' },
    { id: 'statusOverview', title: 'Status Overview', icon: PieChart, color: 'purple' },
    { id: 'lossAnalysis', title: 'Loss Analysis', icon: TrendingDown, color: 'red' },
    { id: 'closeAnalysis', title: 'Close Analysis', icon: XCircle, color: 'gray' },
    { id: 'monthlyTrends', title: 'Monthly Trends', icon: BarChart3, color: 'indigo' }
  ];

  const [selectedTimePeriod, setSelectedTimePeriod] = useState('year-to-date');
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // User preferences state
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(true);
  const [selectedSections, setSelectedSections] = useState([
    'rfqStats',
    'keyMetrics',
    'bodyTypeFrequency',
    'quarterlyStatus',
    'followUpStatus', 
    'statusOverview',
    'lossAnalysis',
    'closeAnalysis',
    'monthlyTrends'
  ]);

  // Load user preferences on component mount
  useEffect(() => {
    const preferences = getSectionPreferences(PREFERENCE_SECTIONS.ANALYTICS);
    setIsFilterCollapsed(preferences.isFilterCollapsed ?? true);
    
    // Handle migration from old object format to new array format
    let sections = preferences.selectedSections;
    if (sections && typeof sections === 'object' && !Array.isArray(sections)) {
      // Convert old object format to new array format
      sections = [
        'rfqStats',
        'keyMetrics',
        'bodyTypeFrequency',
        'quarterlyStatus',
        'followUpStatus', 
        'statusOverview',
        'lossAnalysis',
        'closeAnalysis',
        'monthlyTrends'
      ];
    } else if (!sections || !Array.isArray(sections)) {
      // Default to all sections if no preferences or invalid format
      sections = [
        'rfqStats',
        'keyMetrics',
        'bodyTypeFrequency',
        'quarterlyStatus',
        'followUpStatus', 
        'statusOverview',
        'lossAnalysis',
        'closeAnalysis',
        'monthlyTrends'
      ];
    }
    
    // Filter out removed sections (topCustomers, recentActivity) from saved preferences
    if (Array.isArray(sections)) {
      sections = sections.filter(section => 
        section !== 'topCustomers' && section !== 'recentActivity'
      );
    }
    
    setSelectedSections(sections);
  }, []);

  useEffect(() => {
    fetchAnalysisData();
  }, [selectedTimePeriod, customDateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const getDateRange = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    switch (selectedTimePeriod) {
      case 'year-to-date':
        return {
          startDate: new Date(currentYear, 0, 1).toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
      case 'last-30-days': {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return {
          startDate: thirtyDaysAgo.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
      }
      case 'last-90-days': {
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return {
          startDate: ninetyDaysAgo.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
      }
      case 'last-6-months': {
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        return {
          startDate: sixMonthsAgo.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
      }
      case 'last-12-months': {
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);
        return {
          startDate: twelveMonthsAgo.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
      }
      case 'custom':
        return {
          startDate: customDateRange.startDate,
          endDate: customDateRange.endDate
        };
      default:
        return {
          startDate: new Date(currentYear, 0, 1).toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
    }
  };

  const fetchAnalysisData = async () => {
    try {
      setLoading(true);
      const dateRange = getDateRange();
      
      // Validate date range
      if (!dateRange.startDate || !dateRange.endDate) {
        console.error('Invalid date range:', dateRange);
        toast.error('Invalid date range. Please select a valid time period.');
        return;
      }
      
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };

      const response = await ApiHelper.get('/api/quotations/analysis/overview', { params });
      
      // Validate response structure
      if (!response || !response.data) {
        console.error('Invalid response structure:', response);
        toast.error('Invalid response from server');
        return;
      }
      
      // Check if request was successful
      if (response.data.success === false) {
        const errorMessage = response.data.message || 'Failed to load analysis data';
        console.error('API returned error:', response.data);
        toast.error(errorMessage);
        return;
      }
      
      // Validate data exists
      if (!response.data.data) {
        console.error('No data in response:', response.data);
        toast.error('No data received from server');
        return;
      }
      
      // Set analysis data with safe defaults
      const receivedData = response.data.data;
      setAnalysisData({
        totalQuotations: receivedData.totalQuotations || 0,
        winRate: receivedData.winRate || 0,
        lossRate: receivedData.lossRate || 0,
        closeRate: receivedData.closeRate || 0,
        statusBreakdown: receivedData.statusBreakdown || {
          open: { count: 0 },
          win: { count: 0 },
          loss: { count: 0 },
          close: { count: 0 }
        },
        reasonAnalytics: receivedData.reasonAnalytics || { loss: {}, close: {} },
        monthlyStats: receivedData.monthlyStats || [],
        timePeriodSummary: receivedData.timePeriodSummary || {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          period: selectedTimePeriod
        },
        followUpStatus: receivedData.followUpStatus || {
          currentlyOpen: { count: 0 },
          notFollowedUp: { count: 0 },
          mediumWarning: { count: 0 },
          upToDate: { count: 0 }
        },
        rfqStats: receivedData.rfqStats || {
          total: 0,
          approved: 0,
          rejected: 0,
          pending: 0
        },
        bodyTypeFrequency: receivedData.bodyTypeFrequency || [],
        quarterlyStatus: receivedData.quarterlyStatus || []
      });
    } catch (err) {
      console.error('Error fetching analysis data:', err);
      
      // Extract error message from different error formats
      let errorMessage = 'Failed to load analysis data';
      if (err.response) {
        // Server responded with error status
        errorMessage = err.response.data?.message || err.response.data?.error || errorMessage;
        console.error('Error response:', err.response.data);
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Please check your connection.';
        console.error('No response received:', err.request);
      } else {
        // Error setting up request
        errorMessage = err.message || errorMessage;
        console.error('Request setup error:', err.message);
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      const dateRange = getDateRange();
      
      // Validate date range
      if (!dateRange.startDate || !dateRange.endDate) {
        toast.error('Invalid date range. Please select a valid time period.');
        return;
      }
      
      const response = await ApiHelper.get('/api/quotations/analysis/export', {
        params: { 
          format: 'csv',
          startDate: dateRange.startDate, 
          endDate: dateRange.endDate 
        },
        responseType: 'blob'
      });
      
      // Check response status and content type
      const contentType = response.headers['content-type'] || '';
      
      // If content type is JSON, it's likely an error response
      if (contentType.includes('application/json')) {
        try {
          const text = await response.data.text();
          const errorData = JSON.parse(text);
          const errorMessage = errorData.message || 'Failed to export report';
          console.error('Export error:', errorData);
          toast.error(errorMessage);
          return;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          toast.error('Failed to export report. Invalid response format.');
          return;
        }
      }
      
      // Verify it's a CSV blob
      if (!(response.data instanceof Blob)) {
        console.error('Invalid response type:', typeof response.data);
        toast.error('Failed to export report. Invalid response format.');
        return;
      }
      
      // Create download link for blob
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quotation-analysis-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Report exported successfully');
    } catch (err) {
      console.error('Error exporting report:', err);
      
      // Extract error message from different error formats
      let errorMessage = 'Failed to export report';
      if (err.response) {
        // Check content type to determine if it's JSON error or blob
        const contentType = err.response.headers?.['content-type'] || '';
        
        if (contentType.includes('application/json')) {
          // JSON error response
          errorMessage = err.response.data?.message || err.response.data?.error || errorMessage;
        } else if (err.response.data instanceof Blob) {
          // Blob that might contain error JSON
          try {
            const text = await err.response.data.text();
            const errorData = JSON.parse(text);
            errorMessage = errorData.message || errorMessage;
          } catch {
            // If can't parse, use status-based message
            errorMessage = `Export failed with status ${err.response.status}`;
          }
        } else {
          // Regular error response
          errorMessage = err.response.data?.message || err.response.data?.error || errorMessage;
        }
        console.error('Error response:', {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your connection.';
        console.error('No response received:', err.request);
      } else {
        errorMessage = err.message || errorMessage;
        console.error('Request setup error:', err.message);
      }
      
      toast.error(errorMessage);
    }
  };

  const handleSectionToggle = (sectionId) => {
    // Ensure selectedSections is an array
    const currentSections = Array.isArray(selectedSections) ? selectedSections : [];
    
    const newSelectedSections = currentSections.includes(sectionId)
      ? currentSections.filter(id => id !== sectionId)
      : [...currentSections, sectionId];
    
    setSelectedSections(newSelectedSections);
    
    // Auto-save preferences
    updatePreferences(PREFERENCE_SECTIONS.ANALYTICS, {
      isFilterCollapsed,
      selectedSections: newSelectedSections
    });
  };

  // Chart data preparation
  const statusChartData = [
    { name: 'Open', value: analysisData.statusBreakdown.open.count, color: '#3B82F6' },
    { name: 'Win', value: analysisData.statusBreakdown.win.count, color: '#10B981' },
    { name: 'Loss', value: analysisData.statusBreakdown.loss.count, color: '#EF4444' },
    { name: 'Close', value: analysisData.statusBreakdown.close.count, color: '#6B7280' }
  ];

  const lossReasonData = Object.entries(analysisData.reasonAnalytics.loss).map(([reason, data]) => ({
    name: reason,
    value: data.count
  }));

  const closeReasonData = Object.entries(analysisData.reasonAnalytics.close).map(([reason, data]) => ({
    name: reason,
    value: data.count
  }));

  // eslint-disable-next-line no-unused-vars
  const StatCard = ({ title, value, icon: Icon, color = 'blue', subtitle }) => {
    const colorClasses = {
      blue: 'bg-blue-50 border-blue-200 text-blue-600',
      green: 'bg-green-50 border-green-200 text-green-600',
      red: 'bg-red-50 border-red-200 text-red-600',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600',
      gray: 'bg-gray-50 border-gray-200 text-gray-600',
      purple: 'bg-purple-50 border-purple-200 text-purple-600',
      indigo: 'bg-indigo-50 border-indigo-200 text-indigo-600',
      emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600',
      orange: 'bg-orange-50 border-orange-200 text-orange-600'
    };
    
    const bgColor = colorClasses[color] || colorClasses.blue;
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl ${bgColor.split(' ')[0]} border ${bgColor.split(' ')[1]}`}>
            <Icon className={`h-6 w-6 ${bgColor.split(' ')[2]}`} />
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation title="Quotation Analysis" subtitle="Analisis dan laporan quotation" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation title="Quotation Analysis" subtitle="Analisis dan laporan quotation" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <button
                onClick={handleBack}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-all shadow-sm hover:shadow"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Quotation Analysis</h1>
                <p className="text-gray-600 mt-1">Comprehensive analytics and insights for your quotations</p>
              </div>
            </div>
            <button
              onClick={handleExportReport}
              className="flex items-center px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </button>
          </div>
          
          {/* Collapsible Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <button
              onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">Filters & Settings</span>
              </div>
              {isFilterCollapsed ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              )}
            </button>
            
            {!isFilterCollapsed && (
              <div className="px-4 pb-4 border-t border-gray-200">
                {/* Time Period Filter */}
                <div className="flex items-center space-x-4 pt-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Time Period:</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-48">
                      <CustomDropdown
                        options={timePeriodOptions}
                        value={selectedTimePeriod}
                        onChange={setSelectedTimePeriod}
                        placeholder="Select time period"
                      />
                    </div>
                    {selectedTimePeriod === 'custom' && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                          <input
                            type="date"
                            value={customDateRange.startDate}
                            onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                            className="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                          <input
                            type="date"
                            value={customDateRange.endDate}
                            onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                            className="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Section Toggles */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <Star className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Show Sections:</span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {availableSections.map((section) => (
                      <div key={section.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <button
                          onClick={() => handleSectionToggle(section.id)}
                          className="flex items-center space-x-2 w-full text-left"
                        >
                          <Star 
                            className={`h-5 w-5 transition-colors ${
                              Array.isArray(selectedSections) && selectedSections.includes(section.id) 
                                ? 'text-yellow-500 fill-current' 
                                : 'text-gray-300 hover:text-yellow-400'
                            }`} 
                          />
                          <span className="text-sm text-gray-700">{section.title}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RFQ Statistics */}
        {Array.isArray(selectedSections) && selectedSections.includes('rfqStats') && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">RFQ Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total RFQs Created"
                value={analysisData.rfqStats?.total?.toLocaleString() || '0'}
                icon={FileText}
                color="blue"
              />
              <StatCard
                title="Approved"
                value={analysisData.rfqStats?.approved?.toLocaleString() || '0'}
                icon={CheckCircle}
                color="green"
              />
              <StatCard
                title="Rejected"
                value={analysisData.rfqStats?.rejected?.toLocaleString() || '0'}
                icon={XCircle}
                color="red"
              />
              <StatCard
                title="Pending"
                value={analysisData.rfqStats?.pending?.toLocaleString() || '0'}
                icon={Clock}
                color="yellow"
              />
            </div>
          </div>
        )}

        {/* Key Metrics */}
        {Array.isArray(selectedSections) && selectedSections.includes('keyMetrics') && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Key Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatCard
              title="Total Quotations"
              value={analysisData.totalQuotations.toLocaleString()}
              icon={FileText}
              color="blue"
            />
            <StatCard
              title="Total Open"
              value={analysisData.statusBreakdown.open.count.toLocaleString()}
              icon={Clock}
              color="blue"
            />
            <StatCard
              title="Total Win"
              value={analysisData.statusBreakdown.win.count.toLocaleString()}
              icon={CheckCircle}
              color="green"
            />
            <StatCard
              title="Total Loss"
              value={analysisData.statusBreakdown.loss.count.toLocaleString()}
              icon={XCircle}
              color="red"
            />
            <StatCard
              title="Total Close"
              value={analysisData.statusBreakdown.close.count.toLocaleString()}
              icon={AlertCircle}
              color="gray"
            />
            </div>
          </div>
        )}

        {/* Follow-up Status Section */}
        {Array.isArray(selectedSections) && selectedSections.includes('followUpStatus') && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Time Tracking & Follow-up Status</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Urgent Status */}
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-sm border border-red-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-lg bg-red-500 shadow-md">
                        <AlertCircle className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-red-900">Urgent</h4>
                        <p className="text-sm text-red-700">More than 7 days or never followed up</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-red-600">
                        {analysisData.followUpStatus?.notFollowedUp?.count?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                  
                  {analysisData.followUpStatus?.notFollowedUp?.quotations?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-red-200">
                      <p className="text-xs font-semibold text-red-800 mb-2 uppercase tracking-wide">Quotation Numbers:</p>
                      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                        {analysisData.followUpStatus.notFollowedUp.quotations.map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => navigate(`/quotations/details/${q.quotationId || q.quotationNumber}`)}
                            className="px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 hover:shadow-sm transition-all border border-red-200 hover:border-red-300"
                            title={`${q.customerName}${q.daysSinceFollowUp !== null ? ` - ${q.daysSinceFollowUp} days ago` : ' - Never followed up'}`}
                          >
                            {q.quotationNumber}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Warning Status */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl shadow-sm border border-amber-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-lg bg-amber-500 shadow-md">
                        <Clock className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-amber-900">Warning</h4>
                        <p className="text-sm text-amber-700">3-7 days since last follow-up</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-amber-600">
                        {analysisData.followUpStatus?.mediumWarning?.count?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                  
                  {analysisData.followUpStatus?.mediumWarning?.quotations?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-amber-200">
                      <p className="text-xs font-semibold text-amber-800 mb-2 uppercase tracking-wide">Quotation Numbers:</p>
                      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                        {analysisData.followUpStatus.mediumWarning.quotations.map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => navigate(`/quotations/details/${q.quotationId || q.quotationNumber}`)}
                            className="px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-amber-700 hover:bg-amber-50 hover:shadow-sm transition-all border border-amber-200 hover:border-amber-300"
                            title={`${q.customerName} - ${q.daysSinceFollowUp} days ago`}
                          >
                            {q.quotationNumber}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Save Status */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm border border-green-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-lg bg-green-500 shadow-md">
                        <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-green-900">Save</h4>
                        <p className="text-sm text-green-700">Followed up within 3 days</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-green-600">
                        {analysisData.followUpStatus?.upToDate?.count?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Currently Open */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-lg bg-blue-500 shadow-md">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-blue-900">Currently Open</h4>
                        <p className="text-sm text-blue-700">Total open quotations</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-blue-600">
                        {analysisData.followUpStatus?.currentlyOpen?.count?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Body Type Frequency Bar Chart */}
        {Array.isArray(selectedSections) && selectedSections.includes('bodyTypeFrequency') && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Body Type Frequency (RFQ & Quotation)</h3>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {analysisData.bodyTypeFrequency && Array.isArray(analysisData.bodyTypeFrequency) && analysisData.bodyTypeFrequency.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <RechartsBarChart data={analysisData.bodyTypeFrequency}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis 
                      label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="rfq" fill="#3B82F6" name="RFQ" />
                    <Bar dataKey="quotation" fill="#10B981" name="Quotation" />
                    <Bar dataKey="total" fill="#8B5CF6" name="Total" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500 mb-2">No body type data available</p>
                  <p className="text-xs text-gray-400">
                    {analysisData.bodyTypeFrequency 
                      ? 'Body type data is empty. Make sure RFQs and Quotations have bodyTypeId assigned.'
                      : 'Body type frequency data not loaded.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quarterly Status Chart */}
        {Array.isArray(selectedSections) && selectedSections.includes('quarterlyStatus') && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Quotation Status by Quarter</h3>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {analysisData.quarterlyStatus && analysisData.quarterlyStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <RechartsBarChart data={analysisData.quarterlyStatus}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis 
                      label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="win" fill="#10B981" name="Win" />
                    <Bar dataKey="loss" fill="#EF4444" name="Loss" />
                    <Bar dataKey="cancel" fill="#6B7280" name="Cancel" />
                    <Bar dataKey="open" fill="#3B82F6" name="Open" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">No quarterly data available</p>
              )}
            </div>
          </div>
        )}

        {/* Status Overview Chart */}
        {Array.isArray(selectedSections) && selectedSections.includes('statusOverview') && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Quotation Status Overview</h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          </div>
        )}

        {/* Loss Rate Chart and Reasons */}
        {Array.isArray(selectedSections) && selectedSections.includes('lossAnalysis') && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Loss Rate Analysis</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Loss Rate Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-red-600">{analysisData.lossRate}%</div>
                <div className="text-sm text-gray-500">Loss Rate</div>
                <div className="text-xs text-gray-400 mt-1">
                  {analysisData.statusBreakdown.loss.count} of {analysisData.totalQuotations} quotations
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPieChart>
                  <Pie
                    data={[
                      { name: 'Loss', value: analysisData.statusBreakdown.loss.count, color: '#EF4444' },
                      { name: 'Others', value: analysisData.totalQuotations - analysisData.statusBreakdown.loss.count, color: '#E5E7EB' }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#EF4444" />
                    <Cell fill="#E5E7EB" />
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            {/* Loss Reasons */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Loss Reasons</h4>
              {lossReasonData.length > 0 ? (
                <div className="space-y-3">
                  {lossReasonData.map((reason, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-900 capitalize">{reason.name}</span>
                      <span className="text-lg font-bold text-red-600">{reason.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No loss quotations with reasons found</p>
              )}
            </div>
          </div>
          </div>
        )}

        {/* Close Rate Chart and Reasons */}
        {Array.isArray(selectedSections) && selectedSections.includes('closeAnalysis') && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Close Rate Analysis</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Close Rate Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-gray-600">{analysisData.closeRate}%</div>
                <div className="text-sm text-gray-500">Close Rate</div>
                <div className="text-xs text-gray-400 mt-1">
                  {analysisData.statusBreakdown.close.count} of {analysisData.totalQuotations} quotations
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPieChart>
                  <Pie
                    data={[
                      { name: 'Close', value: analysisData.statusBreakdown.close.count, color: '#6B7280' },
                      { name: 'Others', value: analysisData.totalQuotations - analysisData.statusBreakdown.close.count, color: '#E5E7EB' }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#6B7280" />
                    <Cell fill="#E5E7EB" />
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            {/* Close Reasons */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Close Reasons</h4>
              {closeReasonData.length > 0 ? (
                <div className="space-y-3">
                  {closeReasonData.map((reason, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-900 capitalize">{reason.name}</span>
                      <span className="text-lg font-bold text-gray-600">{reason.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No close quotations with reasons found</p>
              )}
            </div>
          </div>
          </div>
        )}

        {/* Monthly Trends */}
        {Array.isArray(selectedSections) && selectedSections.includes('monthlyTrends') && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Monthly Trends</h3>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={analysisData.monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="statusBreakdown.open" stackId="a" fill="#3B82F6" name="Open" />
                  <Bar dataKey="statusBreakdown.win" stackId="a" fill="#10B981" name="Win" />
                  <Bar dataKey="statusBreakdown.loss" stackId="a" fill="#EF4444" name="Loss" />
                  <Bar dataKey="statusBreakdown.close" stackId="a" fill="#6B7280" name="Close" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default QuotationAnalysisPage;
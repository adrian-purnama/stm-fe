import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileText, 
  Calendar,
  Users,
  Target,
  ArrowLeft,
  Download,
  Filter,
  PieChart,
  Activity,
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
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Navigation from '../components/Navigation';
import CustomDropdown from '../components/CustomDropdown';
import BaseModal from '../components/BaseModal';
import ApiHelper from '../utils/ApiHelper';
import toast from 'react-hot-toast';
import { 
  updatePreferences, 
  getSectionPreferences,
  PREFERENCE_SECTIONS 
} from '../utils/UserPreferences';

const QuotationAnalysisPage = () => {
  const navigate = useNavigate();
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
    topCustomers: [],
    recentActivity: [],
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
    }
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
    { id: 'keyMetrics', title: 'Key Metrics', icon: BarChart3, color: 'blue' },
    { id: 'followUpStatus', title: 'Follow-up Status', icon: Clock, color: 'green' },
    { id: 'statusOverview', title: 'Status Overview', icon: PieChart, color: 'purple' },
    { id: 'lossAnalysis', title: 'Loss Analysis', icon: TrendingDown, color: 'red' },
    { id: 'closeAnalysis', title: 'Close Analysis', icon: XCircle, color: 'gray' },
    { id: 'monthlyTrends', title: 'Monthly Trends', icon: BarChart3, color: 'indigo' },
    { id: 'topCustomers', title: 'Top Customers', icon: Users, color: 'emerald' },
    { id: 'recentActivity', title: 'Recent Activity', icon: Activity, color: 'orange' }
  ];

  const [selectedTimePeriod, setSelectedTimePeriod] = useState('year-to-date');
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // User preferences state
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(true);
  const [selectedSections, setSelectedSections] = useState([
    'keyMetrics',
    'followUpStatus', 
    'statusOverview',
    'lossAnalysis',
    'closeAnalysis',
    'monthlyTrends',
    'topCustomers',
    'recentActivity'
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
        'keyMetrics',
        'followUpStatus', 
        'statusOverview',
        'lossAnalysis',
        'closeAnalysis',
        'monthlyTrends',
        'topCustomers',
        'recentActivity'
      ];
    } else if (!sections || !Array.isArray(sections)) {
      // Default to all sections if no preferences or invalid format
      sections = [
        'keyMetrics',
        'followUpStatus', 
        'statusOverview',
        'lossAnalysis',
        'closeAnalysis',
        'monthlyTrends',
        'topCustomers',
        'recentActivity'
      ];
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
      
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };

      const response = await ApiHelper.get('/api/quotations/analysis/overview', { params });
      setAnalysisData(response.data.data);
    } catch (err) {
      console.error('Error fetching analysis data:', err);
      toast.error('Failed to load analysis data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      const dateRange = getDateRange();
      const response = await ApiHelper.get('/api/quotations/analysis/export', {
        params: { 
          format: 'csv',
          startDate: dateRange.startDate, 
          endDate: dateRange.endDate 
        },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quotation-analysis-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Report exported successfully');
    } catch {
      toast.error('Failed to export report');
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

  const StatCard = ({ title, value, icon: Icon, color = 'blue', subtitle }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

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
    <div className="min-h-screen bg-gray-50">
      <Navigation title="Quotation Analysis" subtitle="Analisis dan laporan quotation" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/quotations')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
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
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </button>
          </div>
          
          {/* Collapsible Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <button
              onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filters</span>
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

        {/* Key Metrics */}
        {Array.isArray(selectedSections) && selectedSections.includes('keyMetrics') && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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
        )}

        {/* Follow-up Status Section */}
        {Array.isArray(selectedSections) && selectedSections.includes('followUpStatus') && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Follow-up Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Currently Open</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {analysisData.followUpStatus.currentlyOpen.count.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Total open quotations</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Not Followed Up</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">
                      {analysisData.followUpStatus.notFollowedUp.count.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Danger - needs immediate attention</p>
                  </div>
                  <div className="p-3 rounded-full bg-red-100">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Medium Warning</p>
                    <p className="text-2xl font-bold text-yellow-600 mt-1">
                      {analysisData.followUpStatus.mediumWarning.count.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">3-7 days since last follow-up</p>
                  </div>
                  <div className="p-3 rounded-full bg-yellow-100">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Up to Date</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      {analysisData.followUpStatus.upToDate.count.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Followed up within 3 days</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-100">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Overview Chart */}
        {Array.isArray(selectedSections) && selectedSections.includes('statusOverview') && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quotation Status Overview</h3>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Loss Rate Analysis</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Loss Rate Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Close Rate Analysis</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Close Rate Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends</h3>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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

        {/* Top Customers */}
        {Array.isArray(selectedSections) && selectedSections.includes('topCustomers') && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers</h3>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {analysisData.topCustomers.length > 0 ? (
                <div className="space-y-4">
                  {analysisData.topCustomers.map((customer, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                          <span className="text-sm font-semibold text-blue-600">#{index + 1}</span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{customer.name}</h4>
                          <p className="text-sm text-gray-500">
                            {customer.quotations} quotation{customer.quotations !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">Win:</span>
                            <span className="text-sm font-medium text-green-600">
                              {customer.statusBreakdown.win}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">Loss:</span>
                            <span className="text-sm font-medium text-red-600">
                              {customer.statusBreakdown.loss}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            {customer.quotations > 0 ? Math.round((customer.statusBreakdown.win / customer.quotations) * 100) : 0}%
                          </div>
                          <div className="text-xs text-gray-500">Win Rate</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">No customer data available</p>
              )}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {Array.isArray(selectedSections) && selectedSections.includes('recentActivity') && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {analysisData.recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {analysisData.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.type === 'win' ? 'bg-green-500' :
                          activity.type === 'loss' ? 'bg-red-500' :
                          activity.type === 'close' ? 'bg-gray-500' :
                          'bg-blue-500'
                        }`}></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                          <p className="text-xs text-gray-500 capitalize">
                            Status: {activity.type}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">{activity.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">No recent activity found</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotationAnalysisPage;
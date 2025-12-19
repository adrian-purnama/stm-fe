import React, { useState, useEffect } from 'react';
import ApiHelper from '../utils/api/ApiHelper';
import toast from 'react-hot-toast';
import { AlertTriangle, RefreshCw, Database, FileText, Package, AlertCircle, Eye, X } from 'lucide-react';

const QuotationEmergencyDiagnosticsPage = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [rebuilding, setRebuilding] = useState({});
  const [rebuildProgress, setRebuildProgress] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      const response = await ApiHelper.get('/api/quotations/emergency/diagnostics');
      if (response.data?.success && response.data?.data) {
        setData(response.data.data);
        toast.success('Diagnostics data loaded successfully');
      } else {
        toast.error('Failed to load diagnostics data');
      }
    } catch (error) {
      console.error('Error fetching diagnostics:', error);
      toast.error(error.response?.data?.message || 'Failed to load diagnostics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const handleRebuild = async (quotationNumber) => {
    const confirmed = window.confirm(
      `This will delete quotation ${quotationNumber}, rollback RFQ, and rebuild with preserved number. Continue?`
    );
    
    if (!confirmed) return;
    
    setRebuilding(prev => ({ ...prev, [quotationNumber]: true }));
    setRebuildProgress({
      quotationNumber,
      currentStep: 'initializing',
      steps: [
        { id: 'finding', label: 'Finding quotation...', status: 'pending' },
        { id: 'validating', label: 'Validating RFQ...', status: 'pending' },
        { id: 'deleting', label: 'Deleting broken quotation...', status: 'pending' },
        { id: 'rolling_back', label: 'Rolling back RFQ to approved...', status: 'pending' },
        { id: 'rebuilding', label: 'Rebuilding quotation with preserved number...', status: 'pending' },
        { id: 'updating', label: 'Updating RFQ status...', status: 'pending' },
        { id: 'complete', label: 'Rebuild complete!', status: 'pending' }
      ]
    });
    
    try {
      // Simulate progress updates
      const updateProgress = (stepId, status) => {
        setRebuildProgress(prev => ({
          ...prev,
          currentStep: stepId,
          steps: prev.steps.map(step => {
            if (step.id === stepId) {
              return { ...step, status };
            }
            if (status === 'complete' && step.id === prev.currentStep) {
              return { ...step, status: 'complete' };
            }
            return step;
          })
        }));
      };

      // Step 1: Finding quotation
      updateProgress('finding', 'in_progress');
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 2: Validating RFQ
      updateProgress('finding', 'complete');
      updateProgress('validating', 'in_progress');
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 3: Deleting broken quotation
      updateProgress('validating', 'complete');
      updateProgress('deleting', 'in_progress');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 4: Rolling back RFQ
      updateProgress('deleting', 'complete');
      updateProgress('rolling_back', 'in_progress');
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 5: Rebuilding quotation
      updateProgress('rolling_back', 'complete');
      updateProgress('rebuilding', 'in_progress');
      await new Promise(resolve => setTimeout(resolve, 800));

      // Make the actual API call
      const response = await ApiHelper.post(`/api/quotations/${encodeURIComponent(quotationNumber)}/rebuild`);
      
      // Step 6: Updating RFQ status
      updateProgress('rebuilding', 'complete');
      updateProgress('updating', 'in_progress');
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 7: Complete
      updateProgress('updating', 'complete');
      updateProgress('complete', 'complete');
      await new Promise(resolve => setTimeout(resolve, 500));

      if (response.data?.success) {
        toast.success(`Quotation ${quotationNumber} rebuilt successfully`);
        // Refresh diagnostics
        await fetchDiagnostics();
      } else {
        toast.error(response.data?.message || 'Failed to rebuild quotation');
      }
    } catch (error) {
      console.error('Error rebuilding quotation:', error);
      toast.error(error.response?.data?.message || 'Failed to rebuild quotation');
      
      // Mark current step as error
      setRebuildProgress(prev => {
        if (!prev) return null;
        return {
          ...prev,
          steps: prev.steps.map(step => {
            if (step.id === prev.currentStep) {
              return { ...step, status: 'error' };
            }
            return step;
          })
        };
      });
    } finally {
      setRebuilding(prev => ({ ...prev, [quotationNumber]: false }));
      // Clear progress after a delay
      setTimeout(() => {
        setRebuildProgress(null);
      }, 2000);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-600">No diagnostics data available</p>
            <button
              onClick={fetchDiagnostics}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { stats, issues } = data;
  const hasIssues = stats.mainIssues > 0 || 
                   stats.orphanedItems > 0 || 
                   stats.orphanedOffers > 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Rebuild Progress Modal */}
      {rebuildProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Rebuilding Quotation {rebuildProgress.quotationNumber}
              </h3>
              <button
                onClick={() => setRebuildProgress(null)}
                className="text-gray-400 hover:text-gray-600"
                disabled={rebuildProgress.steps.some(s => s.status === 'in_progress')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              {rebuildProgress.steps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {step.status === 'complete' && (
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    {step.status === 'in_progress' && (
                      <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                    )}
                    {step.status === 'error' && (
                      <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    )}
                    {step.status === 'pending' && (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${
                      step.status === 'complete' ? 'text-green-600 font-medium' :
                      step.status === 'in_progress' ? 'text-blue-600 font-medium' :
                      step.status === 'error' ? 'text-red-600 font-medium' :
                      'text-gray-500'
                    }`}>
                      {step.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Emergency Quotation Diagnostics</h1>
                <p className="text-sm text-gray-600 mt-1">Find decoupled quotation headers, offers, and items</p>
              </div>
            </div>
            <button
              onClick={fetchDiagnostics}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-700">Total Headers</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalHeaders}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-700">Total Offers</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalOffers}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-gray-700">Total Items</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalOfferItems}</p>
          </div>
          <div className={`bg-white rounded-lg shadow p-4 ${stats.mainIssues > 0 ? 'border-2 border-red-500' : ''}`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className={`h-5 w-5 ${stats.mainIssues > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              <h3 className="font-semibold text-gray-700">Main Issues</h3>
            </div>
            <p className={`text-2xl font-bold ${stats.mainIssues > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {stats.mainIssues}
            </p>
          </div>
          <div className={`bg-white rounded-lg shadow p-4 ${stats.orphanedItems > 0 ? 'border-2 border-orange-500' : ''}`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className={`h-5 w-5 ${stats.orphanedItems > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
              <h3 className="font-semibold text-gray-700">Orphaned Items</h3>
            </div>
            <p className={`text-2xl font-bold ${stats.orphanedItems > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
              {stats.orphanedItems}
            </p>
          </div>
          <div className={`bg-white rounded-lg shadow p-4 ${stats.orphanedOffers > 0 ? 'border-2 border-orange-500' : ''}`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className={`h-5 w-5 ${stats.orphanedOffers > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
              <h3 className="font-semibold text-gray-700">Orphaned Offers</h3>
            </div>
            <p className={`text-2xl font-bold ${stats.orphanedOffers > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
              {stats.orphanedOffers}
            </p>
          </div>
        </div>

        {/* Issues Summary */}
        {hasIssues ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h2 className="text-lg font-semibold text-red-900">Issues Detected</h2>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-red-800">
              {stats.mainIssues > 0 && (
                <li>• {stats.mainIssues} main issue(s) - quotations with missing offers or items</li>
              )}
              {stats.orphanedItems > 0 && (
                <li>• {stats.orphanedItems} orphaned item(s) with invalid offer references</li>
              )}
              {stats.orphanedOffers > 0 && (
                <li>• {stats.orphanedOffers} orphaned offer(s) with invalid header references</li>
              )}
            </ul>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-green-900">No Issues Detected</h2>
            </div>
            <p className="mt-1 text-sm text-green-800">All quotation data is properly linked.</p>
          </div>
        )}

        {/* Detailed Issues */}
        <div className="space-y-4">
          {/* Main Issues - Combined Headers Without Offers and Offers Without Items */}
          {issues.mainIssues && issues.mainIssues.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <button
                onClick={() => toggleSection('mainIssues')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Main Issues ({issues.mainIssues.length})
                  </h2>
                </div>
                <span className="text-gray-500">
                  {expandedSections.mainIssues ? '▼' : '▶'}
                </span>
              </button>
              {expandedSections.mainIssues && (
                <div className="px-6 pb-4">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quotation Number</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Offer Number</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {issues.mainIssues.map((issue, index) => (
                          <tr key={`${issue.header._id}-${index}`} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900 font-mono">{issue.header.quotationNumber}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{issue.header.customerName || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                issue.issueType === 'no_offer' 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {issue.issueType === 'no_offer' ? 'No Offer' : 'No Items'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {issue.offer ? issue.offer.offerNumber : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                issue.header.status?.type === 'win' ? 'bg-green-100 text-green-800' :
                                issue.header.status?.type === 'loss' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {issue.header.status?.type || 'open'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{formatDate(issue.header.createdAt)}</td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setSelectedDetail({ type: 'mainIssue', data: issue })}
                                  className="px-3 py-1 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700 flex items-center gap-1"
                                  title="View Details"
                                >
                                  <Eye className="h-3 w-3" />
                                  Details
                                </button>
                                <button
                                  onClick={() => handleRebuild(issue.header.quotationNumber)}
                                  disabled={rebuilding[issue.header.quotationNumber]}
                                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {rebuilding[issue.header.quotationNumber] ? 'Rebuilding...' : 'Rebuild'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Orphaned Items */}
          {issues.orphanedItems.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <button
                onClick={() => toggleSection('orphanedItems')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Orphaned Items ({issues.orphanedItems.length})
                  </h2>
                </div>
                <span className="text-gray-500">
                  {expandedSections.orphanedItems ? '▼' : '▶'}
                </span>
              </button>
              {expandedSections.orphanedItems && (
                <div className="px-6 pb-4">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Number</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Offer ID (Invalid)</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {issues.orphanedItems.map((item) => (
                          <tr key={item._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900 font-mono">{item._id}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.itemNumber}</td>
                            <td className="px-4 py-3 text-sm text-red-600 font-mono">{item.quotationOfferId || 'NULL'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.price?.toLocaleString() || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{formatDate(item.createdAt)}</td>
                            <td className="px-4 py-3 text-sm">
                              <button
                                onClick={() => setSelectedDetail({ type: 'orphanedItem', data: item })}
                                className="px-3 py-1 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700 flex items-center gap-1"
                                title="View Details"
                              >
                                <Eye className="h-3 w-3" />
                                Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Orphaned Offers */}
          {issues.orphanedOffers.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <button
                onClick={() => toggleSection('orphanedOffers')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Orphaned Offers ({issues.orphanedOffers.length})
                  </h2>
                </div>
                <span className="text-gray-500">
                  {expandedSections.orphanedOffers ? '▼' : '▶'}
                </span>
              </button>
              {expandedSections.orphanedOffers && (
                <div className="px-6 pb-4">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Offer Number</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Header ID (Invalid)</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {issues.orphanedOffers.map((offer) => (
                          <tr key={offer._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900 font-mono">{offer._id}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{offer.offerNumber}</td>
                            <td className="px-4 py-3 text-sm text-red-600 font-mono">{offer.quotationHeaderId || 'NULL'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{formatDate(offer.createdAt)}</td>
                            <td className="px-4 py-3 text-sm">
                              <button
                                onClick={() => setSelectedDetail({ type: 'orphanedOffer', data: offer })}
                                className="px-3 py-1 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700 flex items-center gap-1"
                                title="View Details"
                              >
                                <Eye className="h-3 w-3" />
                                Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Detail Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedDetail.type === 'mainIssue' && 'Quotation Details'}
                {selectedDetail.type === 'orphanedItem' && 'Orphaned Item Details'}
                {selectedDetail.type === 'orphanedOffer' && 'Orphaned Offer Details'}
              </h3>
              <button
                onClick={() => setSelectedDetail(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <pre className="bg-gray-50 p-4 rounded-md text-xs overflow-x-auto">
                {JSON.stringify(selectedDetail.data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationEmergencyDiagnosticsPage;


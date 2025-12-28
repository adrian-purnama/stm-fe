import React, { useState, useEffect } from 'react';
import { Key, Plus, Copy, Trash2, Loader2, RefreshCw, CheckCircle2, XCircle, Clock, Eye, EyeOff, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import ApiHelper from '../../utils/api/ApiHelper';

const SessionTab = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState(null);
  const [copiedLinkId, setCopiedLinkId] = useState(null);
  const [visibleTokens, setVisibleTokens] = useState(new Set());
  const [newlyGeneratedSession, setNewlyGeneratedSession] = useState(null);
  
  const [formData, setFormData] = useState({
    expiresInHours: '24',
    expiresAt: '',
    notes: ''
  });

  const expirationOptions = [
    { value: '1', label: '1 hour' },
    { value: '6', label: '6 hours' },
    { value: '12', label: '12 hours' },
    { value: '24', label: '24 hours' },
    { value: '168', label: '7 days' },
    { value: '720', label: '30 days' },
    { value: 'custom', label: 'Custom date' }
  ];

  useEffect(() => {
    loadSessions();
  }, [pagination.page]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await ApiHelper.get('/api/sessions', {
        params: {
          page: pagination.page,
          limit: pagination.limit
        }
      });
      
      const sessionsData = response.data?.data || [];
      const paginationData = response.data?.pagination || { page: 1, limit: 20, total: 0, pages: 0 };
      
      setSessions(sessionsData);
      setPagination(prev => ({
        ...prev,
        ...paginationData
      }));
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error(error.response?.data?.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const generateSession = async () => {
    try {
      if (formData.expiresInHours === 'custom' && !formData.expiresAt) {
        toast.error('Please select a custom expiration date');
        return;
      }

      setGenerating(true);
      
      const payload = {};
      if (formData.expiresInHours === 'custom') {
        payload.expiresAt = formData.expiresAt;
      } else {
        payload.expiresInHours = parseFloat(formData.expiresInHours);
      }
      
      if (formData.notes) {
        payload.notes = formData.notes;
      }

      const response = await ApiHelper.post('/api/sessions', payload);
      const newSession = response.data?.data;
      
      toast.success('Session generated successfully!');
      setShowGenerateForm(false);
      setFormData({ expiresInHours: '24', expiresAt: '', notes: '' });
      
      // Store newly generated session to show link
      setNewlyGeneratedSession(newSession);
      
      // Copy catalogue link to clipboard if available
      if (newSession?.catalogueLink) {
        await copyToClipboard(newSession.catalogueLink);
        toast.success('Catalogue link copied to clipboard!');
      } else if (newSession?.token) {
        // Fallback to copying token if link not available
        await copyToClipboard(newSession.token);
        toast.success('Session token copied to clipboard!');
      }
      
      // Reload sessions
      await loadSessions();
    } catch (error) {
      console.error('Error generating session:', error);
      toast.error(error.response?.data?.message || 'Failed to generate session');
    } finally {
      setGenerating(false);
    }
  };

  const revokeSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to revoke this session? It will no longer be valid.')) {
      return;
    }

    try {
      await ApiHelper.delete(`/api/sessions/${sessionId}`);
      toast.success('Session revoked successfully');
      await loadSessions();
    } catch (error) {
      console.error('Error revoking session:', error);
      toast.error(error.response?.data?.message || 'Failed to revoke session');
    }
  };

  const copyToClipboard = async (text, sessionId = null, isLink = false) => {
    try {
      await navigator.clipboard.writeText(text);
      if (sessionId) {
        if (isLink) {
          setCopiedLinkId(sessionId);
          setTimeout(() => setCopiedLinkId(null), 2000);
        } else {
          setCopiedTokenId(sessionId);
          setTimeout(() => setCopiedTokenId(null), 2000);
        }
      }
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy to clipboard');
      return false;
    }
  };

  const toggleTokenVisibility = (sessionId) => {
    setVisibleTokens(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const maskToken = (token) => {
    if (!token || token.length < 8) return token;
    return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (session) => {
    if (!session.isValid) {
      if (session.isExpired) {
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Expired
          </span>
        );
      }
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <XCircle className="h-3 w-3 mr-1" />
          Inactive
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Active
      </span>
    );
  };

  const getTimeRemaining = (expiresAt) => {
    if (!expiresAt) return 'N/A';
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Key className="h-5 w-5" />
            Catalogue Sessions
          </h2>
          <p className="text-sm text-gray-600 mt-1">Generate and manage session tokens for catalogue access</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadSessions}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowGenerateForm(!showGenerateForm)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Generate Session
          </button>
        </div>
      </div>

      {/* Newly Generated Session Link */}
      {newlyGeneratedSession && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Session Generated Successfully!
              </h3>
              {newlyGeneratedSession.catalogueLink && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catalogue Link:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={newlyGeneratedSession.catalogueLink}
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono"
                    />
                    <button
                      onClick={() => {
                        copyToClipboard(newlyGeneratedSession.catalogueLink);
                        toast.success('Catalogue link copied to clipboard!');
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      title="Copy link"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </button>
                    <a
                      href={newlyGeneratedSession.catalogueLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      title="Open in new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open
                    </a>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setNewlyGeneratedSession(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Generate Session Form */}
      {showGenerateForm && (
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate New Session</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiration Duration
              </label>
              <select
                value={formData.expiresInHours}
                onChange={(e) => setFormData({ ...formData, expiresInHours: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {expirationOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {formData.expiresInHours === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Expiration Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add notes about this session..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={generateSession}
                disabled={generating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                    Generating...
                  </>
                ) : (
                  'Generate Session'
                )}
              </button>
              <button
                onClick={() => {
                  setShowGenerateForm(false);
                  setFormData({ expiresInHours: '24', expiresAt: '', notes: '' });
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sessions List */}
      {loading && sessions.length === 0 ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="mt-2 text-gray-500">Loading sessions...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Key className="h-12 w-12 mx-auto text-gray-400" />
          <p className="mt-4 text-gray-600">No sessions found</p>
          <p className="text-sm text-gray-500 mt-1">Generate a new session to get started</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Token
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time Remaining
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Used
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Catalogue Link
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sessions.map((session) => {
                    const isVisible = visibleTokens.has(session._id);
                    const isCopied = copiedTokenId === session._id;
                    
                    return (
                      <tr key={session._id} className={session.isValid ? '' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono text-gray-900">
                              {isVisible ? session.token : maskToken(session.token)}
                            </code>
                            <button
                              onClick={() => toggleTokenVisibility(session._id)}
                              className="text-gray-400 hover:text-gray-600"
                              title={isVisible ? 'Hide token' : 'Show token'}
                            >
                              {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(session)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(session.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(session.expiresAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {getTimeRemaining(session.expiresAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {session.lastUsedAt ? formatDate(session.lastUsedAt) : 'Never'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {session.notes || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {session.catalogueLink ? (
                            <div className="flex items-center gap-2">
                              <a
                                href={session.catalogueLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                title="Open catalogue link"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span className="text-xs font-mono max-w-xs truncate">
                                  {session.catalogueLink.length > 40 
                                    ? `${session.catalogueLink.substring(0, 40)}...` 
                                    : session.catalogueLink}
                                </span>
                              </a>
                              <button
                                onClick={() => {
                                  copyToClipboard(session.catalogueLink, session._id, true);
                                  toast.success('Catalogue link copied!');
                                }}
                                className="text-gray-400 hover:text-gray-600"
                                title="Copy catalogue link"
                              >
                                {copiedLinkId === session._id ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Not available</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyToClipboard(session.token, session._id)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Copy token"
                            >
                              {isCopied ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                            {session.isValid && (
                              <button
                                onClick={() => revokeSession(session._id)}
                                className="text-red-600 hover:text-red-900"
                                title="Revoke session"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} sessions
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.pages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SessionTab;


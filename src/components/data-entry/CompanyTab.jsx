import React, { useState, useEffect } from 'react';
import { Edit, Save, Loader2, Building2, Mail, MessageSquare, Info, X, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import ApiHelper from '../../utils/api/ApiHelper';
import BaseModal from '../modals/BaseModal';

const CompanyTab = () => {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [brevoQuota, setBrevoQuota] = useState(null);
  const [loadingQuota, setLoadingQuota] = useState(false);
  const [companyFormData, setCompanyFormData] = useState({
    companyName: '',
    email: {
      sendTo: [],
      cc: []
    },
    whatsapp: [],
    npwp: '',
    address: '',
    phone: '',
    fax: '',
    website: '',
    notes: ''
  });

  // Load company information
  const loadCompany = async () => {
    try {
      setLoading(true);
      const response = await ApiHelper.get('/api/companies');
      const companyData = response.data?.data || null;
      
      if (companyData) {
        setCompany(companyData);
        setCompanyFormData({
          companyName: companyData.companyName || '',
          email: {
            sendTo: Array.isArray(companyData.email?.sendTo) ? companyData.email.sendTo : [],
            cc: Array.isArray(companyData.email?.cc) ? companyData.email.cc : []
          },
          whatsapp: Array.isArray(companyData.whatsapp) ? companyData.whatsapp : [],
          npwp: companyData.npwp || '',
          address: companyData.address || '',
          phone: companyData.phone || '',
          fax: companyData.fax || '',
          website: companyData.website || '',
          notes: companyData.notes || ''
        });
      }
    } catch (error) {
      console.error('Error loading company:', error);
      toast.error(error.response?.data?.message || 'Failed to load company information');
    } finally {
      setLoading(false);
    }
  };

  // Load Brevo quota information
  const loadBrevoQuota = async () => {
    try {
      setLoadingQuota(true);
      const response = await ApiHelper.get('/api/companies/brevo-quota');
      if (response.data?.success) {
        setBrevoQuota(response.data.data);
      }
    } catch (error) {
      console.error('Error loading Brevo quota:', error);
      // Don't show toast error as quota is optional information
    } finally {
      setLoadingQuota(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadCompany();
    loadBrevoQuota();
  }, []);

  // Save company information
  const saveCompany = async () => {
    try {
      if (!companyFormData.companyName.trim()) {
        toast.error('Company name is required');
        return;
      }
      
      setSaving(true);
      await ApiHelper.put('/api/companies', companyFormData);
      toast.success('Company information updated successfully');
      setIsEditing(false);
      await loadCompany(); // Reload to get updated data
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error(error.response?.data?.message || 'Failed to update company information');
    } finally {
      setSaving(false);
    }
  };

  // Email handlers
  const addEmailSendTo = () => {
    setCompanyFormData({
      ...companyFormData,
      email: {
        ...companyFormData.email,
        sendTo: [...(companyFormData.email.sendTo || []), { email: '' }]
      }
    });
  };

  const removeEmailSendTo = (index) => {
    setCompanyFormData({
      ...companyFormData,
      email: {
        ...companyFormData.email,
        sendTo: (companyFormData.email.sendTo || []).filter((_, i) => i !== index)
      }
    });
  };

  const updateEmailSendTo = (index, value) => {
    const updated = [...(companyFormData.email.sendTo || [])];
    updated[index] = { email: value };
    setCompanyFormData({
      ...companyFormData,
      email: { ...companyFormData.email, sendTo: updated }
    });
  };

  const addEmailCC = () => {
    setCompanyFormData({
      ...companyFormData,
      email: {
        ...companyFormData.email,
        cc: [...(companyFormData.email.cc || []), { email: '' }]
      }
    });
  };

  const removeEmailCC = (index) => {
    setCompanyFormData({
      ...companyFormData,
      email: {
        ...companyFormData.email,
        cc: (companyFormData.email.cc || []).filter((_, i) => i !== index)
      }
    });
  };

  const updateEmailCC = (index, value) => {
    const updated = [...(companyFormData.email.cc || [])];
    updated[index] = { email: value };
    setCompanyFormData({
      ...companyFormData,
      email: { ...companyFormData.email, cc: updated }
    });
  };

  // WhatsApp handlers
  const addWhatsApp = () => {
    setCompanyFormData({
      ...companyFormData,
      whatsapp: [...(companyFormData.whatsapp || []), { name: '', number: '' }]
    });
  };

  const removeWhatsApp = (index) => {
    setCompanyFormData({
      ...companyFormData,
      whatsapp: (companyFormData.whatsapp || []).filter((_, i) => i !== index)
    });
  };

  const updateWhatsApp = (index, field, value) => {
    const updated = [...(companyFormData.whatsapp || [])];
    updated[index] = { ...updated[index], [field]: value };
    setCompanyFormData({ ...companyFormData, whatsapp: updated });
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Reload original data
    if (company) {
      setCompanyFormData({
        companyName: company.companyName || '',
        email: {
          sendTo: Array.isArray(company.email?.sendTo) ? company.email.sendTo : [],
          cc: Array.isArray(company.email?.cc) ? company.email.cc : []
        },
        whatsapp: Array.isArray(company.whatsapp) ? company.whatsapp : [],
        npwp: company.npwp || '',
        address: company.address || '',
        phone: company.phone || '',
        fax: company.fax || '',
        website: company.website || '',
        notes: company.notes || ''
      });
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
        <p className="mt-2 text-gray-500">Loading company information...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information
          </h2>
          <p className="text-sm text-gray-600 mt-1">Manage your company information and messaging details</p>
        </div>
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </button>
        )}
      </div>

      {/* Brevo Email Quota Section */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Brevo Email Quota</h3>
              <p className="text-xs text-gray-600">Remaining email credits from your Brevo account</p>
            </div>
          </div>
          <button
            onClick={loadBrevoQuota}
            disabled={loadingQuota}
            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh quota"
          >
            <RefreshCw className={`h-4 w-4 ${loadingQuota ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {loadingQuota ? (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading quota information...</span>
          </div>
        ) : brevoQuota ? (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <div className="text-xs text-gray-600 mb-1">Plan</div>
                <div className="text-sm font-semibold text-gray-900">{brevoQuota.plan || 'Unknown'}</div>
                {brevoQuota.planType && (
                  <div className="text-xs text-gray-500 mt-1">{brevoQuota.planType}</div>
                )}
              </div>
              
              {brevoQuota.credits && (
                <>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="text-xs text-gray-600 mb-1">Remaining</div>
                    <div className={`text-lg font-bold ${
                      brevoQuota.credits.remaining !== null 
                        ? (brevoQuota.credits.remaining < 100 ? 'text-red-600' : 'text-green-600')
                        : 'text-gray-600'
                    }`}>
                      {brevoQuota.credits.remaining !== null ? brevoQuota.credits.remaining.toLocaleString() : 'N/A'}
                    </div>
                    {brevoQuota.credits.total !== null && (
                      <div className="text-xs text-gray-500 mt-1">
                        of {brevoQuota.credits.total.toLocaleString()} total
                      </div>
                    )}
                  </div>
                  
                  {brevoQuota.credits.used !== null && (
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <div className="text-xs text-gray-600 mb-1">Used</div>
                      <div className="text-lg font-bold text-gray-900">
                        {brevoQuota.credits.used.toLocaleString()}
                      </div>
                      {brevoQuota.credits.total !== null && (
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min((brevoQuota.credits.used / brevoQuota.credits.total) * 100, 100)}%`
                            }}
                          ></div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            
            {brevoQuota.credits?.remaining !== null && brevoQuota.credits.remaining < 100 && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-yellow-800">
                  <strong>Low Quota Warning:</strong> You have less than 100 emails remaining. Consider upgrading your plan or purchasing additional credits.
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 text-sm text-gray-500">
            Unable to load quota information. Please check your Brevo API configuration.
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {isEditing ? (
          <div className="space-y-6">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                value={companyFormData.companyName}
                onChange={(e) => setCompanyFormData({ ...companyFormData, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., PT Example Company"
                disabled={saving}
              />
            </div>

            {/* Email Section */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="h-4 w-4 text-gray-600" />
                <label className="block text-sm font-medium text-gray-700">
                  Email Information
                </label>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-600">Send To:</label>
                    <button
                      type="button"
                      onClick={addEmailSendTo}
                      disabled={saving}
                      className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1 disabled:opacity-50"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(companyFormData.email.sendTo || []).map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="email"
                          value={item.email}
                          onChange={(e) => updateEmailSendTo(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="email@example.com"
                          disabled={saving}
                        />
                        <button
                          type="button"
                          onClick={() => removeEmailSendTo(index)}
                          disabled={saving}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-600">CC:</label>
                    <button
                      type="button"
                      onClick={addEmailCC}
                      disabled={saving}
                      className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1 disabled:opacity-50"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(companyFormData.email.cc || []).map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="email"
                          value={item.email}
                          onChange={(e) => updateEmailCC(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="email@example.com"
                          disabled={saving}
                        />
                        <button
                          type="button"
                          onClick={() => removeEmailCC(index)}
                          disabled={saving}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* WhatsApp Section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-gray-600" />
                  <label className="block text-sm font-medium text-gray-700">
                    WhatsApp Contacts
                  </label>
                </div>
                <button
                  type="button"
                  onClick={addWhatsApp}
                  disabled={saving}
                  className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1 disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {(companyFormData.whatsapp || []).map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateWhatsApp(index, 'name', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Person name"
                      disabled={saving}
                    />
                    <input
                      type="text"
                      value={item.number}
                      onChange={(e) => updateWhatsApp(index, 'number', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Phone number"
                      disabled={saving}
                    />
                    <button
                      type="button"
                      onClick={() => removeWhatsApp(index)}
                      disabled={saving}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Company Information Section */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-gray-600" />
                <label className="block text-sm font-medium text-gray-700">
                  Company Information
                </label>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    NPWP
                  </label>
                  <input
                    type="text"
                    value={companyFormData.npwp}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, npwp: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="e.g., 01.234.567.8-901.000"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Address
                  </label>
                  <textarea
                    value={companyFormData.address}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    rows="2"
                    placeholder="Company address"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={companyFormData.phone}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="e.g., +62 21 1234 5678"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Fax
                  </label>
                  <input
                    type="text"
                    value={companyFormData.fax}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, fax: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="e.g., +62 21 1234 5679"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Website
                  </label>
                  <input
                    type="text"
                    value={companyFormData.website}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="e.g., https://www.example.com"
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={companyFormData.notes}
                onChange={(e) => setCompanyFormData({ ...companyFormData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Additional notes..."
                disabled={saving}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveCompany}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <p className="text-lg font-semibold text-gray-900">{company?.companyName || 'Not set'}</p>
            </div>

            {/* Email Information */}
            {(company?.email?.sendTo?.length > 0 || company?.email?.cc?.length > 0) && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="h-4 w-4 text-gray-600" />
                  <label className="block text-sm font-medium text-gray-700">
                    Email Information
                  </label>
                </div>
                <div className="space-y-3">
                  {company.email?.sendTo?.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Send To:</label>
                      <div className="space-y-1">
                        {company.email.sendTo.map((item, index) => (
                          <p key={index} className="text-sm text-gray-900 pl-4">{item.email}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  {company.email?.cc?.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">CC:</label>
                      <div className="space-y-1">
                        {company.email.cc.map((item, index) => (
                          <p key={index} className="text-sm text-gray-900 pl-4">{item.email}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* WhatsApp Information */}
            {company?.whatsapp?.length > 0 && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-4 w-4 text-gray-600" />
                  <label className="block text-sm font-medium text-gray-700">
                    WhatsApp Contacts
                  </label>
                </div>
                <div className="space-y-2">
                  {company.whatsapp.map((item, index) => (
                    <div key={index} className="text-sm text-gray-900 pl-4">
                      <span className="font-medium">{item.name}</span>: {item.number}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Company Information */}
            {(company?.npwp || company?.address || company?.phone || company?.fax || company?.website) && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-gray-600" />
                  <label className="block text-sm font-medium text-gray-700">
                    Company Information
                  </label>
                </div>
                <div className="space-y-2">
                  {company.npwp && (
                    <div className="text-sm text-gray-900 pl-4">
                      <span className="font-medium">NPWP</span>: {company.npwp}
                    </div>
                  )}
                  {company.address && (
                    <div className="text-sm text-gray-900 pl-4">
                      <span className="font-medium">Address</span>: {company.address}
                    </div>
                  )}
                  {company.phone && (
                    <div className="text-sm text-gray-900 pl-4">
                      <span className="font-medium">Phone</span>: {company.phone}
                    </div>
                  )}
                  {company.fax && (
                    <div className="text-sm text-gray-900 pl-4">
                      <span className="font-medium">Fax</span>: {company.fax}
                    </div>
                  )}
                  {company.website && (
                    <div className="text-sm text-gray-900 pl-4">
                      <span className="font-medium">Website</span>: {company.website}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {company?.notes && (
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <p className="text-gray-900 whitespace-pre-wrap">{company.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyTab;

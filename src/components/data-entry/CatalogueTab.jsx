import React, { useEffect, useState, useMemo } from 'react';
import { Package, Plus, Search, Edit, Trash2, Eye, Loader2, ChevronLeft, ChevronRight, X, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import ApiHelper from '../../utils/api/ApiHelper';
import BaseModal from '../modals/BaseModal';
import CustomDropdown from '../common/CustomDropdown';
import RichTextEditor from '../common/RichTextEditor';

const initialFormState = {
  bodyType: '',
  article: '',
  variantCategories: [],
  sizes: [],
  chassis: [],
  leadTime: '',
  notes: '',
  shopCatalogueOverrides: {}
};

// Helper to generate a valid-looking ObjectId for new items
const generateObjectId = () => {
  const timestamp = (new Date().getTime() / 1000 | 0).toString(16);
  return timestamp + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, () => (Math.random() * 16 | 0).toString(16)).toLowerCase();
};

const CatalogueTab = () => {
  const [catalogues, setCatalogues] = useState([]);
  const [cataloguesLoading, setCataloguesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [bodyTypeFilter, setBodyTypeFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [bodyTypeOptions, setBodyTypeOptions] = useState([]);
  const [sizeTypeOptions, setSizeTypeOptions] = useState([]);
  const [chassisTypeOptions, setChassisTypeOptions] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCatalogue, setSelectedCatalogue] = useState(null);
  const [reloadCounter, setReloadCounter] = useState(0);

  useEffect(() => {
    const loadBodyTypes = async () => {
      try {
        const response = await ApiHelper.get('/api/body-types/list');
        const options = (response.data.data || []).map((bodyType) => ({
          value: bodyType._id,
          label: bodyType.name
        }));
        setBodyTypeOptions(options);
      } catch (error) {
        console.error('Error loading body types list:', error);
        toast.error(error.response?.data?.message || 'Failed to load body types');
      }
    };

    const loadSizeTypes = async () => {
      try {
        const response = await ApiHelper.get('/api/size-types/list');
        const options = (response.data.data || []).map((sizeType) => ({
          value: sizeType._id,
          label: sizeType.name
        }));
        setSizeTypeOptions(options);
      } catch (error) {
        console.error('Error loading size types list:', error);
      }
    };

    const loadChassisTypes = async () => {
      try {
        const response = await ApiHelper.get('/api/chassis-types/list');
        const options = (response.data.data || []).map((chassisType) => ({
          value: chassisType._id,
          label: chassisType.name
        }));
        setChassisTypeOptions(options);
      } catch (error) {
        console.error('Error loading chassis types list:', error);
      }
    };

    loadBodyTypes();
    loadSizeTypes();
    loadChassisTypes();
  }, []);

  useEffect(() => {
    const loadCatalogues = async () => {
      try {
        setCataloguesLoading(true);
        const params = {
          page: pagination.page,
          limit: pagination.limit
        };

        if (searchTerm && searchTerm.trim()) {
          params.search = searchTerm.trim();
        }

        if (bodyTypeFilter) {
          params.bodyType = bodyTypeFilter;
        }

        const response = await ApiHelper.get('/api/catalogues', { params });
        const fetchedCatalogues = response.data.data || [];
        const paginationInfo = response.data.pagination || { page: 1, limit: 10, total: fetchedCatalogues.length, pages: 1 };

        setCatalogues(fetchedCatalogues);
        setPagination((prev) => ({
          ...prev,
          page: paginationInfo.page || prev.page,
          limit: paginationInfo.limit || prev.limit,
          total: paginationInfo.total || fetchedCatalogues.length,
          pages: paginationInfo.pages || Math.ceil((paginationInfo.total || fetchedCatalogues.length) / (paginationInfo.limit || prev.limit))
        }));
      } catch (error) {
        console.error('Error loading catalogues:', error);
        toast.error(error.response?.data?.message || 'Failed to load catalogues');
      } finally {
        setCataloguesLoading(false);
      }
    };

    loadCatalogues();
  }, [pagination.page, pagination.limit, bodyTypeFilter, reloadCounter, searchTerm]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
      setReloadCounter((prev) => prev + 1);
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const bodyTypeFilterOptions = useMemo(() => [
    { value: '', label: 'All Body Types' },
    ...bodyTypeOptions
  ], [bodyTypeOptions]);

  const handleOpenCreateModal = () => {
    setFormData(initialFormState);
    setIsCreateModalOpen(true);
  };


  const handleOpenEditModal = async (catalogue) => {
    try {
      // Fetch fresh catalogue data to ensure we have the latest overrides
      const response = await ApiHelper.get(`/api/catalogues/${catalogue._id}`);
      const freshCatalogue = response.data.data;

      setSelectedCatalogue(freshCatalogue);

      // Load shop catalogue overrides if they exist - convert array to object for formData
      // Normalize combinationIds (trim) to ensure they match generated IDs
      const overrides = {};
      if (freshCatalogue.shopCatalogueOverrides) {
        if (Array.isArray(freshCatalogue.shopCatalogueOverrides)) {
          // New format: array of override objects
          freshCatalogue.shopCatalogueOverrides.forEach((override) => {
            if (override && override.combinationId) {
              // Normalize combinationId by trimming to match generated IDs
              const normalizedId = String(override.combinationId).trim();
              overrides[normalizedId] = {
                // Preserve the actual enabled value (false should stay false)
                enabled: override.enabled !== undefined ? Boolean(override.enabled) : true,
                price: override.price !== undefined ? String(override.price).trim() : 'ask',
                baseModel: override.baseModel === true
              };
            }
          });
        } else if (freshCatalogue.shopCatalogueOverrides instanceof Map) {
          // Legacy format: Map
          freshCatalogue.shopCatalogueOverrides.forEach((value, key) => {
            if (value && typeof value === 'object') {
              const normalizedId = String(key).trim();
              overrides[normalizedId] = {
                // Preserve the actual enabled value (false should stay false)
                enabled: value.enabled !== undefined ? Boolean(value.enabled) : true,
                price: value.price !== undefined ? String(value.price).trim() : 'ask'
              };
            }
          });
        } else if (typeof freshCatalogue.shopCatalogueOverrides === 'object') {
          // Legacy format: plain object
          Object.entries(freshCatalogue.shopCatalogueOverrides).forEach(([key, value]) => {
            if (value && typeof value === 'object') {
              const normalizedId = String(key).trim();
              overrides[normalizedId] = {
                // Preserve the actual enabled value (false should stay false)
                enabled: value.enabled !== undefined ? Boolean(value.enabled) : true,
                price: value.price !== undefined ? String(value.price).trim() : 'ask'
              };
            }
          });
        }
      }

      // Set all form data including overrides in one call
      setFormData({
        bodyType: freshCatalogue.bodyType?._id || '',
        article: freshCatalogue.article || '',
        variantCategories: Array.isArray(freshCatalogue.variantCategories)
          ? freshCatalogue.variantCategories.map(cat => ({
            category: cat.category || '',
            values: Array.isArray(cat.values) ? [...cat.values] : []
          }))
          : [],
        sizes: Array.isArray(freshCatalogue.sizes)
          ? freshCatalogue.sizes.map(size => ({
            _id: size._id,
            sizeType: size.sizeType?._id || '',
            sizeCustom: size.sizeCustom || ''
          }))
          : [],
        chassis: Array.isArray(freshCatalogue.chassis)
          ? freshCatalogue.chassis.map(ch => ({
            _id: ch._id,
            chassisType: ch.chassisType?._id || '',
            chassisDetails: Array.isArray(ch.chassisDetails) ? [...ch.chassisDetails] : []
          }))
          : [],
        shopCatalogueOverrides: overrides,
        leadTime: freshCatalogue.leadTime || '',
        notes: freshCatalogue.notes || ''
      });

      // Reset debug flags for fresh logging
      window._loggedFoundOverride = false;
      window._loggedMissingOverride = false;

      // Debug: verify overrides are loaded
      console.log('📥 Edit modal opened - Overrides loaded from API:', {
        overrideCount: Object.keys(overrides).length,
        allOverrides: Object.entries(overrides).map(([key, val]) => ({
          combinationId: key.substring(0, 60) + (key.length > 60 ? '...' : ''),
          combinationIdLength: key.length,
          enabled: val.enabled,
          enabledType: typeof val.enabled,
          price: val.price
        })),
        rawOverridesFromAPI: freshCatalogue.shopCatalogueOverrides
      });

      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Error loading catalogue for edit:', error);
      toast.error('Failed to load catalogue data');
    }
  };

  const handleOpenViewModal = (catalogue) => {
    setSelectedCatalogue(catalogue);
    setIsViewModalOpen(true);
  };

  const resetModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsViewModalOpen(false);
    setSelectedCatalogue(null);
    setFormData(initialFormState);
  };

  const createCatalogue = async () => {
    if (!formData.bodyType) {
      toast.error('Body type is required');
      return;
    }

    const payload = {
      bodyType: formData.bodyType,
      article: formData.article || '',
      variantCategories: formData.variantCategories.filter(cat => cat.category && cat.values.length > 0),
      sizes: formData.sizes.filter(s => s.sizeType || s.sizeCustom),
      chassis: formData.chassis.filter(c => c.chassisType || (c.chassisDetails && c.chassisDetails.length > 0)),
      leadTime: formData.leadTime || '',
      notes: formData.notes || ''
    };

    try {
      await ApiHelper.post('/api/catalogues', payload);
      toast.success('Catalogue created successfully');
      resetModals();
      setPagination((prev) => ({ ...prev, page: 1 }));
      setReloadCounter((prev) => prev + 1);
    } catch (error) {
      console.error('Error creating catalogue:', error);
      toast.error(error.response?.data?.message || 'Failed to create catalogue');
    }
  };

  const updateCatalogue = async () => {
    if (!selectedCatalogue?._id) return;

    // Convert shopCatalogueOverrides object to array format for API
    const overridesArray = Object.entries(formData.shopCatalogueOverrides || {}).map(([combinationId, value]) => ({
      combinationId: String(combinationId),
      enabled: value.enabled !== false,
      price: value.price !== undefined ? String(value.price).trim() : 'ask',
      baseModel: value.baseModel === true
    }));

    const payload = {
      article: formData.article || '',
      variantCategories: formData.variantCategories.filter(cat => cat.category && cat.values.length > 0),
      sizes: formData.sizes.filter(s => s.sizeType || s.sizeCustom),
      chassis: formData.chassis.filter(c => c.chassisType || (c.chassisDetails && c.chassisDetails.length > 0)),
      shopCatalogueOverrides: overridesArray,
      leadTime: formData.leadTime || '',
      notes: formData.notes || ''
    };

    try {
      await ApiHelper.put(`/api/catalogues/${selectedCatalogue._id}`, payload);
      toast.success('Catalogue updated successfully');
      resetModals();
      setReloadCounter((prev) => prev + 1);
    } catch (error) {
      console.error('Error updating catalogue:', error);
      toast.error(error.response?.data?.message || 'Failed to update catalogue');
    }
  };

  const deleteCatalogue = async (catalogue) => {
    if (!catalogue?._id) return;

    if (!window.confirm(`Are you sure you want to delete the catalogue for "${catalogue.bodyType?.name}"?`)) {
      return;
    }

    try {
      await ApiHelper.delete(`/api/catalogues/${catalogue._id}`);
      toast.success('Catalogue deleted successfully');
      if (catalogues.length === 1 && pagination.page > 1) {
        setPagination((prev) => ({ ...prev, page: prev.page - 1 }));
      } else {
        setReloadCounter((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error deleting catalogue:', error);
      toast.error(error.response?.data?.message || 'Failed to delete catalogue');
    }
  };

  const addVariantCategory = () => {
    setFormData((prev) => ({
      ...prev,
      variantCategories: [...(prev.variantCategories || []), { category: '', values: [''] }]
    }));
  };

  const updateVariantCategory = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...(prev.variantCategories || [])];
      if (field === 'category') {
        updated[index] = { ...updated[index], category: value };
      } else if (field === 'values') {
        updated[index] = { ...updated[index], values: value };
      }
      return { ...prev, variantCategories: updated };
    });
  };

  const addVariantValue = (categoryIndex) => {
    setFormData((prev) => {
      const updated = [...(prev.variantCategories || [])];
      updated[categoryIndex].values = [...(updated[categoryIndex].values || []), ''];
      return { ...prev, variantCategories: updated };
    });
  };

  const updateVariantValue = (categoryIndex, valueIndex, value) => {
    setFormData((prev) => {
      const updated = [...(prev.variantCategories || [])];
      updated[categoryIndex].values[valueIndex] = value;
      return { ...prev, variantCategories: updated };
    });
  };

  const removeVariantValue = (categoryIndex, valueIndex) => {
    setFormData((prev) => {
      const updated = [...(prev.variantCategories || [])];
      updated[categoryIndex].values = updated[categoryIndex].values.filter((_, idx) => idx !== valueIndex);
      return { ...prev, variantCategories: updated };
    });
  };

  const removeVariantCategory = (index) => {
    setFormData((prev) => ({
      ...prev,
      variantCategories: (prev.variantCategories || []).filter((_, idx) => idx !== index)
    }));
  };

  const addSize = () => {
    setFormData((prev) => ({
      ...prev,
      sizes: [...(prev.sizes || []), { _id: generateObjectId(), sizeType: '', sizeCustom: '' }]
    }));
  };

  const updateSize = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...(prev.sizes || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, sizes: updated };
    });
  };

  const removeSize = (index) => {
    setFormData((prev) => ({
      ...prev,
      sizes: (prev.sizes || []).filter((_, idx) => idx !== index),
      shopCatalogue: (prev.shopCatalogue || []).map(entry => {
        const size = prev.sizes[index];
        if (size?._id && entry.size === size._id) {
          return { ...entry, size: null };
        }
        return entry;
      })
    }));
  };

  const addChassis = () => {
    setFormData((prev) => ({
      ...prev,
      chassis: [...(prev.chassis || []), { _id: generateObjectId(), chassisType: '', chassisDetails: [] }]
    }));
  };

  const updateChassis = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...(prev.chassis || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, chassis: updated };
    });
  };

  const addChassisDetail = (chassisIndex) => {
    setFormData((prev) => {
      const updated = [...(prev.chassis || [])];
      updated[chassisIndex].chassisDetails = [...(updated[chassisIndex].chassisDetails || []), ''];
      return { ...prev, chassis: updated };
    });
  };

  const updateChassisDetail = (chassisIndex, detailIndex, value) => {
    setFormData((prev) => {
      const updated = [...(prev.chassis || [])];
      updated[chassisIndex].chassisDetails[detailIndex] = value;
      return { ...prev, chassis: updated };
    });
  };

  const removeChassisDetail = (chassisIndex, detailIndex) => {
    setFormData((prev) => {
      const updated = [...(prev.chassis || [])];
      updated[chassisIndex].chassisDetails = updated[chassisIndex].chassisDetails.filter((_, idx) => idx !== detailIndex);
      return { ...prev, chassis: updated };
    });
  };

  const removeChassis = (index) => {
    setFormData((prev) => ({
      ...prev,
      chassis: (prev.chassis || []).filter((_, idx) => idx !== index),
      shopCatalogue: (prev.shopCatalogue || []).map(entry => {
        const chassis = prev.chassis[index];
        if (chassis?._id && entry.chassis === chassis._id) {
          return { ...entry, chassis: null };
        }
        return entry;
      })
    }));
  };


  const handlePaginationChange = (direction) => {
    setPagination((prev) => {
      const nextPage = direction === 'next' ? prev.page + 1 : prev.page - 1;
      if (nextPage < 1 || (prev.pages && nextPage > prev.pages)) {
        return prev;
      }
      return { ...prev, page: nextPage };
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Catalogues
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage catalogues for each body type with articles, variant categories, and shop entries.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Catalogue
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search catalogues..."
              value={searchTerm}
              onChange={(e) => {
                setPagination((prev) => ({ ...prev, page: 1 }));
                setSearchTerm(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <CustomDropdown
            options={bodyTypeFilterOptions}
            value={bodyTypeFilter}
            onChange={(value) => {
              setPagination((prev) => ({ ...prev, page: 1 }));
              setBodyTypeFilter(value);
            }}
            placeholder="Filter by body type"
            className="w-full"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        {cataloguesLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-gray-500">Loading catalogues...</p>
          </div>
        ) : catalogues.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No catalogues found</p>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Catalogue
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {catalogues.map((catalogue) => (
              <div key={catalogue._id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{catalogue.bodyType?.name}</h3>
                      {catalogue.shopCatalogue && catalogue.shopCatalogue.length > 0 && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                          {catalogue.shopCatalogue.length} entries
                        </span>
                      )}
                      {catalogue.variantCategories && catalogue.variantCategories.length > 0 && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                          {catalogue.variantCategories.length} categories
                        </span>
                      )}
                    </div>
                    {catalogue.createdBy && (
                      <p className="text-xs text-gray-500 mt-1">
                        Created by {catalogue.createdBy.fullName || catalogue.createdBy.email} ·{' '}
                        {new Date(catalogue.createdAt).toLocaleString()}
                      </p>
                    )}
                    {catalogue.leadTime && (
                      <p className="text-sm text-gray-600 mt-2">Lead Time: {catalogue.leadTime}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenViewModal(catalogue)}
                      className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(catalogue)}
                      className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => deleteCatalogue(catalogue)}
                      className="inline-flex items-center px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {catalogues.length > 0 && pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>
            Page {pagination.page} of {pagination.pages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePaginationChange('prev')}
              disabled={pagination.page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1 border border-gray-200 rounded-lg text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              onClick={() => handlePaginationChange('next')}
              disabled={pagination.page >= pagination.pages}
              className="inline-flex items-center gap-1 px-3 py-1 border border-gray-200 rounded-lg text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Catalogue Modal */}
      <BaseModal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={resetModals}
        title={isCreateModalOpen ? 'Create Catalogue' : 'Edit Catalogue'}
        size="xl"
      >
        <CatalogueForm
          formData={formData}
          setFormData={setFormData}
          bodyTypeOptions={bodyTypeOptions}
          sizeTypeOptions={sizeTypeOptions}
          chassisTypeOptions={chassisTypeOptions}
          onSubmit={isCreateModalOpen ? createCatalogue : updateCatalogue}
          onCancel={resetModals}
          actionLabel={isCreateModalOpen ? 'Create' : 'Update'}
          isEdit={isEditModalOpen}
          onAddVariantCategory={addVariantCategory}
          onUpdateVariantCategory={updateVariantCategory}
          onAddVariantValue={addVariantValue}
          onUpdateVariantValue={updateVariantValue}
          onRemoveVariantValue={removeVariantValue}
          onRemoveVariantCategory={removeVariantCategory}
          onAddSize={addSize}
          onUpdateSize={updateSize}
          onRemoveSize={removeSize}
          onAddChassis={addChassis}
          onUpdateChassis={updateChassis}
          onAddChassisDetail={addChassisDetail}
          onUpdateChassisDetail={updateChassisDetail}
          onRemoveChassisDetail={removeChassisDetail}
          onRemoveChassis={removeChassis}
        />
      </BaseModal>

      {/* View Catalogue Modal */}
      <BaseModal
        isOpen={isViewModalOpen}
        onClose={resetModals}
        title="Catalogue Details"
        size="xl"
      >
        {selectedCatalogue && (
          <ViewCatalogue catalogue={selectedCatalogue} onClose={resetModals} />
        )}
      </BaseModal>
    </div>
  );
};

const CatalogueForm = ({
  formData,
  setFormData,
  bodyTypeOptions,
  sizeTypeOptions,
  chassisTypeOptions,
  onSubmit,
  onCancel,
  actionLabel,
  isEdit,
  selectedCatalogue,
  onReload,
  onAddVariantCategory,
  onUpdateVariantCategory,
  onAddVariantValue,
  onUpdateVariantValue,
  onRemoveVariantValue,
  onRemoveVariantCategory,
  onAddSize,
  onUpdateSize,
  onRemoveSize,
  onAddChassis,
  onUpdateChassis,
  onAddChassisDetail,
  onUpdateChassisDetail,
  onRemoveChassisDetail,
  onRemoveChassis
}) => {
  // Calculate total combinations (including chassis details)
  const calculateCombinations = () => {
    const sizesCount = formData.sizes?.length || 0;
    const chassis = formData.chassis || [];

    // Count total chassis details (each detail creates a separate combination)
    let totalChassisDetails = 0;
    chassis.forEach(ch => {
      const detailsCount = Array.isArray(ch.chassisDetails) && ch.chassisDetails.length > 0
        ? ch.chassisDetails.length
        : 1; // If no details, count as 1
      totalChassisDetails += detailsCount;
    });

    let variantCombinations = 1;
    formData.variantCategories?.forEach(cat => {
      if (cat.values && cat.values.length > 0) {
        variantCombinations *= cat.values.length;
      }
    });

    return sizesCount * totalChassisDetails * variantCombinations;
  };

  const totalCombinations = calculateCombinations();


  return (
    <div className="space-y-4">
      {!isEdit && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Body Type *
          </label>
          <CustomDropdown
            options={bodyTypeOptions}
            value={formData.bodyType}
            onChange={(value) => setFormData((prev) => ({ ...prev, bodyType: value }))}
            placeholder="Select body type"
            required
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Article Content
        </label>
        <RichTextEditor
          value={formData.article}
          onChange={(html) => setFormData((prev) => ({ ...prev, article: html }))}
          placeholder="Write article content with formatting..."
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Variant Categories
          </label>
          <button
            type="button"
            onClick={onAddVariantCategory}
            className="text-sm px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Plus className="h-4 w-4 inline mr-1" />
            Add Category
          </button>
        </div>

        {(formData.variantCategories || []).length === 0 ? (
          <p className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-4 text-center">
            No variant categories yet. Add categories to define variants for this body type.
          </p>
        ) : (
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {formData.variantCategories.map((category, catIndex) => (
              <div key={catIndex} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex items-start gap-2 mb-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={category.category}
                      onChange={(e) => onUpdateVariantCategory(catIndex, 'category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm mb-2"
                      placeholder="Category name (e.g., bentuk, pintu)"
                    />
                    <div className="space-y-2">
                      {category.values.map((value, valIndex) => (
                        <div key={valIndex} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => onUpdateVariantValue(catIndex, valIndex, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="Variant value"
                          />
                          <button
                            type="button"
                            onClick={() => onRemoveVariantValue(catIndex, valIndex)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => onAddVariantValue(catIndex)}
                        className="text-sm px-2 py-1 text-blue-600 hover:text-blue-800"
                      >
                        <Plus className="h-4 w-4 inline mr-1" />
                        Add Value
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveVariantCategory(catIndex)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Sizes
          </label>
          <button
            type="button"
            onClick={onAddSize}
            className="text-sm px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Plus className="h-4 w-4 inline mr-1" />
            Add Size
          </button>
        </div>

        {(formData.sizes || []).length === 0 ? (
          <p className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-4 text-center">
            No sizes defined yet. Add sizes that can be mixed and matched with chassis.
          </p>
        ) : (
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {formData.sizes.map((size, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <CustomDropdown
                      options={[{ value: '', label: 'None' }, ...sizeTypeOptions]}
                      value={size.sizeType || ''}
                      onChange={(value) => onUpdateSize(index, 'sizeType', value || null)}
                      placeholder="Select size type"
                      className="w-full"
                    />
                    <input
                      type="text"
                      value={size.sizeCustom || ''}
                      onChange={(e) => onUpdateSize(index, 'sizeCustom', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Custom size string (e.g., 3880mm)"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveSize(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Chassis
          </label>
          <button
            type="button"
            onClick={onAddChassis}
            className="text-sm px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Plus className="h-4 w-4 inline mr-1" />
            Add Chassis
          </button>
        </div>

        {(formData.chassis || []).length === 0 ? (
          <p className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-4 text-center">
            No chassis defined yet. Add chassis that can be mixed and matched with sizes.
          </p>
        ) : (
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {formData.chassis.map((chassis, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <CustomDropdown
                      options={[{ value: '', label: 'None' }, ...chassisTypeOptions]}
                      value={chassis.chassisType || ''}
                      onChange={(value) => onUpdateChassis(index, 'chassisType', value || null)}
                      placeholder="Select chassis type"
                      className="w-full"
                    />
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-medium text-gray-600">Chassis Details</label>
                        <button
                          type="button"
                          onClick={() => onAddChassisDetail(index)}
                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          <Plus className="h-3 w-3 inline mr-1" />
                          Add
                        </button>
                      </div>
                      {(chassis.chassisDetails || []).length === 0 ? (
                        <p className="text-xs text-gray-400">No details yet</p>
                      ) : (
                        <div className="space-y-1">
                          {(chassis.chassisDetails || []).map((detail, detailIndex) => (
                            <div key={detailIndex} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={detail}
                                onChange={(e) => onUpdateChassisDetail(index, detailIndex, e.target.value)}
                                className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs"
                                placeholder="e.g., FM 260 JD"
                              />
                              <button
                                type="button"
                                onClick={() => onRemoveChassisDetail(index, detailIndex)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveChassis(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Shop Catalogue Management
        </label>
        <div className="border border-gray-200 rounded-lg p-4 bg-blue-50 mb-3">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Total combinations:</span> {totalCombinations}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            All combinations of sizes, chassis, and variants will be automatically generated.
            Each combination will default to price "ask". You can disable specific combinations or set custom prices below.
          </p>
          {totalCombinations === 0 && (
            <p className="text-xs text-amber-600 mt-2">
              Add at least one size and one chassis to generate combinations.
            </p>
          )}
        </div>

        {isEdit && totalCombinations > 0 && (
          <ShopCatalogueOverridesManager
            formData={formData}
            setFormData={setFormData}
            sizeTypeOptions={sizeTypeOptions}
            chassisTypeOptions={chassisTypeOptions}
            catalogueId={selectedCatalogue?._id}
            onSave={async () => {
              if (selectedCatalogue?._id) {
                try {
                  // Convert shopCatalogueOverrides object to array format for API
                  const overridesArray = Object.entries(formData.shopCatalogueOverrides || {}).map(([combinationId, value]) => ({
                    combinationId: String(combinationId),
                    enabled: value.enabled !== false,
                    price: value.price !== undefined ? String(value.price).trim() : 'ask'
                  }));

                  await ApiHelper.put(`/api/catalogues/${selectedCatalogue._id}/shop-overrides`, {
                    overrides: overridesArray
                  });
                  toast.success('Shop catalogue overrides saved successfully');
                  if (onReload) onReload();
                } catch (error) {
                  console.error('Error saving overrides:', error);
                  toast.error(error.response?.data?.message || 'Failed to save overrides');
                }
              }
            }}
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Lead Time
        </label>
        <input
          type="text"
          value={formData.leadTime}
          onChange={(e) => setFormData((prev) => ({ ...prev, leadTime: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., 2-3 weeks"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows="3"
          placeholder="Additional notes..."
        />
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
};

// Generate combination ID (must match backend exactly)
const generateCombinationId = (sizeId, chassisId, chassisDetail, variantSelections) => {
  // Convert to string consistently - handle ObjectId, string, or null
  const sizeStr = sizeId
    ? (typeof sizeId === 'string' ? sizeId : (sizeId.toString ? sizeId.toString() : String(sizeId)))
    : 'null';
  const chassisStr = chassisId
    ? (typeof chassisId === 'string' ? chassisId : (chassisId.toString ? chassisId.toString() : String(chassisId)))
    : 'null';
  // Normalize chassisDetail: null, undefined, or empty string all become 'no-detail'
  const detailStr = (chassisDetail && String(chassisDetail).trim()) ? String(chassisDetail).trim() : 'no-detail';

  // Sort variant selections by key for consistent IDs
  const variantEntries = Object.entries(variantSelections || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${String(key).trim()}:${String(value).trim()}`)
    .join('_');

  return `${sizeStr}_${chassisStr}_${detailStr}_${variantEntries || 'no-variants'}`;
};

// Helper function to find override by matching combinationId components
const findOverrideByMatching = (generatedId, overrides, sizeId, chassisId, chassisDetail, variantCombo) => {
  // First try exact match
  const normalizedGenerated = String(generatedId).trim();
  if (overrides[normalizedGenerated]) {
    return { key: normalizedGenerated, override: overrides[normalizedGenerated] };
  }

  // Try to find by comparing with all stored IDs
  for (const [storedId, override] of Object.entries(overrides)) {
    const normalizedStored = String(storedId).trim();

    // Exact match after normalization
    if (normalizedStored === normalizedGenerated) {
      return { key: storedId, override };
    }

    // Try matching without whitespace
    if (normalizedStored.replace(/\s+/g, '') === normalizedGenerated.replace(/\s+/g, '')) {
      return { key: storedId, override };
    }

    // Try to parse and rebuild the stored ID to compare components
    // Format: sizeId_chassisId_chassisDetail_variantEntries
    const storedParts = normalizedStored.split('_');
    if (storedParts.length >= 4) {
      const storedSizeId = storedParts[0];
      const storedChassisId = storedParts[1];
      const storedDetail = storedParts[2];
      const storedVariants = storedParts.slice(3).join('_');

      // Normalize the generated components for comparison
      const normalizedSizeId = String(sizeId).trim();
      const normalizedChassisId = String(chassisId).trim();
      const normalizedDetail = (chassisDetail && String(chassisDetail).trim()) ? String(chassisDetail).trim() : 'no-detail';
      const normalizedVariants = Object.entries(variantCombo || {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${String(key)}:${String(value)}`)
        .join('_') || 'no-variants';

      // Compare components
      if (storedSizeId === normalizedSizeId &&
        storedChassisId === normalizedChassisId &&
        storedDetail === normalizedDetail &&
        storedVariants === normalizedVariants) {
        return { key: storedId, override };
      }
    }
  }

  return null;
};

// Generate all possible combinations (including disabled ones)
const generateAllPossibleCombinations = (formData) => {
  const sizes = formData.sizes || [];
  const chassis = formData.chassis || [];
  const variantCategories = formData.variantCategories || [];
  const overrides = formData.shopCatalogueOverrides || {};

  if (sizes.length === 0 || chassis.length === 0) {
    return [];
  }

  // Generate all variant combinations
  let variantCombinations = [{}];

  variantCategories.forEach(category => {
    if (category.values && category.values.length > 0) {
      const newCombinations = [];
      variantCombinations.forEach(combo => {
        category.values.forEach(value => {
          newCombinations.push({
            ...combo,
            [category.category]: value
          });
        });
      });
      variantCombinations = newCombinations;
    }
  });

  // Generate all combinations: size × chassis × chassis details × variant combinations
  const allCombinations = [];

  sizes.forEach(size => {
    chassis.forEach(ch => {
      const chassisDetails = Array.isArray(ch.chassisDetails) && ch.chassisDetails.length > 0
        ? ch.chassisDetails
        : [null]; // If no details, create one entry with null detail

      chassisDetails.forEach(chassisDetail => {
        variantCombinations.forEach(variantCombo => {
          // Normalize IDs to strings for consistent combination ID generation
          // Use the _id field directly (it should be an ObjectId or string)
          const sizeId = size._id ? (typeof size._id === 'string' ? size._id : (size._id.toString ? size._id.toString() : String(size._id))) : 'null';
          const chassisId = ch._id ? (typeof ch._id === 'string' ? ch._id : (ch._id.toString ? ch._id.toString() : String(ch._id))) : 'null';
          const combinationId = generateCombinationId(sizeId, chassisId, chassisDetail, variantCombo);

          // Normalize combinationId for lookup (ensure it's a string and trimmed)
          const normalizedCombinationId = String(combinationId).trim();

          // Use the improved matching function to find override
          let override = null;
          const matchResult = findOverrideByMatching(
            normalizedCombinationId,
            overrides,
            sizeId,
            chassisId,
            chassisDetail,
            variantCombo
          );

          if (matchResult) {
            override = matchResult.override;
            // If the key doesn't match exactly, update the overrides object to use normalized key
            if (matchResult.key !== normalizedCombinationId) {
              overrides[normalizedCombinationId] = override;
              delete overrides[matchResult.key];
            }

            // Debug: log when override is found (only first time)
            if (!window._loggedFoundOverride) {
              console.log('✅ Override FOUND in generateAllPossibleCombinations:', {
                generatedId: normalizedCombinationId,
                matchedKey: matchResult.key,
                override: override,
                overrideEnabled: override.enabled,
                overrideEnabledType: typeof override.enabled,
                overridePrice: override.price
              });
              window._loggedFoundOverride = true;
            }
          } else if (Object.keys(overrides).length > 0) {
            // Debug: log when override is not found (only first time)
            if (!window._loggedMissingOverride) {
              console.log('❌ Override NOT found in generateAllPossibleCombinations:', {
                generatedId: normalizedCombinationId,
                generatedIdLength: normalizedCombinationId.length,
                availableIds: Object.keys(overrides).slice(0, 5).map(id => ({
                  id: id.substring(0, 50) + '...',
                  length: id.length
                })),
                sizeId,
                chassisId,
                chassisDetail,
                variantCombo
              });
              window._loggedMissingOverride = true;
            }
          }

          // If override exists, use its values; otherwise default to enabled=true, price='ask'
          // IMPORTANT: Preserve false values for enabled - don't convert to true
          const isEnabled = override !== null && override !== undefined
            ? (override.enabled !== undefined ? Boolean(override.enabled) : true)
            : true;
          const price = override !== null && override !== undefined && override.price !== undefined
            ? String(override.price).trim()
            : 'ask';
          const baseModel = override !== null && override !== undefined
            ? (override.baseModel === true)
            : false;

          // Create chassisData with only the specific detail
          const chassisDataForEntry = {
            ...ch,
            chassisDetails: chassisDetail ? [chassisDetail] : []
          };

          allCombinations.push({
            combinationId: normalizedCombinationId,
            size,
            chassis: chassisDataForEntry,
            variantSelections: variantCombo,
            enabled: isEnabled,
            price: price,
            baseModel: baseModel
          });
        });
      });
    });
  });

  return allCombinations;
};

const ShopCatalogueOverridesManager = ({ formData, setFormData, sizeTypeOptions, chassisTypeOptions, catalogueId, onSave }) => {
  // Generate combinations - this reads from formData.shopCatalogueOverrides
  const combinations = generateAllPossibleCombinations(formData);
  const [localOverrides, setLocalOverrides] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize localOverrides from formData.shopCatalogueOverrides whenever it changes
  // This ensures that when the modal opens with fresh data, localOverrides is updated
  useEffect(() => {
    const overrides = formData.shopCatalogueOverrides || {};
    // Clean and normalize overrides - normalize combinationIds (trim) to match generated IDs
    const cleanedOverrides = {};
    Object.entries(overrides).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        // Normalize combinationId by trimming to ensure it matches generated IDs
        const normalizedKey = String(key).trim();
        cleanedOverrides[normalizedKey] = {
          // Preserve the actual enabled value (false should stay false)
          enabled: value.enabled !== undefined ? Boolean(value.enabled) : true,
          price: value.price !== undefined ? String(value.price).trim() : 'ask',
          baseModel: value.baseModel === true
        };
      }
    });

    // Debug: log when overrides are loaded
    if (Object.keys(cleanedOverrides).length > 0) {
      console.log('🔄 Loading overrides into localOverrides:', {
        count: Object.keys(cleanedOverrides).length,
        sampleKeys: Object.keys(cleanedOverrides).slice(0, 3),
        sampleOverride: Object.values(cleanedOverrides)[0],
        allOverrides: Object.entries(cleanedOverrides).map(([k, v]) => ({
          id: k.substring(0, 50) + '...',
          enabled: v.enabled,
          price: v.price
        }))
      });
    }

    setLocalOverrides(cleanedOverrides);
  }, [formData.shopCatalogueOverrides, formData.sizes, formData.chassis, formData.variantCategories]);

  const getSizeLabel = (size) => {
    if (!size) return 'Unknown';
    const sizeTypeLabel = sizeTypeOptions.find(opt => opt.value === size.sizeType)?.label || '';
    return sizeTypeLabel + (size.sizeCustom ? ` - ${size.sizeCustom}` : '');
  };

  const getChassisLabel = (ch) => {
    if (!ch) return 'Unknown';
    const chassisTypeLabel = chassisTypeOptions.find(opt => opt.value === ch.chassisType)?.label || '';
    const details = ch.chassisDetails && ch.chassisDetails.length > 0 ? ` (${ch.chassisDetails.join(', ')})` : '';
    return chassisTypeLabel + details;
  };

  const handleToggleEnabled = (combinationId) => {
    // Normalize combinationId for consistent lookup
    const normalizedId = String(combinationId).trim();
    const current = localOverrides[normalizedId] || { enabled: true, price: 'ask', baseModel: false };
    const updated = {
      ...localOverrides,
      [normalizedId]: {
        // Only include enabled, price, and baseModel, no other fields
        enabled: !current.enabled,
        price: current.price !== undefined ? String(current.price).trim() : 'ask',
        baseModel: current.baseModel === true
      }
    };
    setLocalOverrides(updated);
    setFormData((prev) => ({ ...prev, shopCatalogueOverrides: updated }));
  };

  const handlePriceChange = (combinationId, price) => {
    // Normalize combinationId for consistent lookup
    const normalizedId = String(combinationId).trim();
    const current = localOverrides[normalizedId] || { enabled: true, price: 'ask', baseModel: false };
    const updated = {
      ...localOverrides,
      [normalizedId]: {
        // Only include enabled, price, and baseModel, no other fields
        enabled: current.enabled !== false,
        price: price.trim() || 'ask',
        baseModel: current.baseModel === true
      }
    };
    setLocalOverrides(updated);
    setFormData((prev) => ({ ...prev, shopCatalogueOverrides: updated }));
  };

  const handleToggleBaseModel = (combinationId) => {
    // Normalize combinationId for consistent lookup
    const normalizedId = String(combinationId).trim();
    const current = localOverrides[normalizedId] || { enabled: true, price: 'ask', baseModel: false };
    const isCurrentlyBaseModel = current.baseModel === true;
    
    // Toggle baseModel for this combination only (allow multiple base models)
    const updated = {
      ...localOverrides,
      [normalizedId]: {
        enabled: current.enabled !== false,
        price: current.price !== undefined ? String(current.price).trim() : 'ask',
        baseModel: !isCurrentlyBaseModel
      }
    };
    
    setLocalOverrides(updated);
    setFormData((prev) => ({ ...prev, shopCatalogueOverrides: updated }));
  };

  const handleReset = (combinationId) => {
    const normalizedId = String(combinationId).trim();
    const updated = { ...localOverrides };

    // Delete exact match
    if (updated[normalizedId]) {
      delete updated[normalizedId];
    }

    // Also look for and delete any fuzzy matches to be sure
    Object.keys(updated).forEach(key => {
      const normalizedKey = String(key).trim();
      if (normalizedKey === normalizedId ||
        normalizedKey.replace(/\s+/g, '') === normalizedId.replace(/\s+/g, '')) {
        delete updated[key];
      }
    });

    setLocalOverrides(updated);
    setFormData((prev) => ({ ...prev, shopCatalogueOverrides: updated }));
  };

  const filteredCombinations = combinations.filter(combo => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const sizeLabel = getSizeLabel(combo.size).toLowerCase();
    const chassisLabel = getChassisLabel(combo.chassis).toLowerCase();
    const variantStr = Object.entries(combo.variantSelections).map(([k, v]) => `${k}:${v}`).join(' ').toLowerCase();
    return sizeLabel.includes(search) || chassisLabel.includes(search) || variantStr.includes(search);
  });

  const enabledCount = combinations.filter(c => {
    const normalizedId = String(c.combinationId).trim();
    const override = localOverrides[normalizedId];
    // If override exists, use its enabled value; otherwise use combo's enabled value
    return override !== undefined
      ? (override.enabled !== false)
      : (c.enabled !== false);
  }).length;

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Manage Combinations</h3>
          <p className="text-xs text-gray-500 mt-1">
            {enabledCount} of {combinations.length} enabled
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search combinations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {catalogueId && (
            <button
              onClick={onSave}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Overrides
            </button>
          )}
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border-b">Size</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border-b">Chassis</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border-b">Variants</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border-b">Price</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border-b">Enabled</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border-b">Base Model</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCombinations.map((combo) => {
              // Normalize combinationId for lookup (trim to match stored IDs)
              const normalizedId = String(combo.combinationId).trim();

              // Try to find override in localOverrides - first by exact match
              let override = localOverrides[normalizedId];

              // If not found, try to find by comparing with all keys (handles formatting differences)
              if (override === undefined && Object.keys(localOverrides).length > 0) {
                const matchingKey = Object.keys(localOverrides).find(storedId => {
                  const normalizedStoredId = String(storedId).trim();
                  return normalizedStoredId === normalizedId ||
                    normalizedStoredId.replace(/\s+/g, '') === normalizedId.replace(/\s+/g, '');
                });
                if (matchingKey) {
                  override = localOverrides[matchingKey];
                }
              }

              // Use combo values as base (they come from DB via formData), override with localOverrides if user edited
              // This ensures pre-filled values are shown correctly
              // Priority: localOverrides (user edits/overrides from DB) > combo (from DB) > defaults
              // IMPORTANT: Check localOverrides first, then fall back to combo values
              // The combo values should already have overrides applied from generateAllPossibleCombinations,
              // but localOverrides is the source of truth for what's in the database
              const isEnabled = override !== undefined
                ? (override.enabled !== undefined ? Boolean(override.enabled) : true)  // Override exists (from DB or user edit)
                : (combo.enabled !== undefined ? Boolean(combo.enabled) : true);     // Use value from combo (already matched in generateAllPossibleCombinations)
              const price = override !== undefined && override.price !== undefined
                ? String(override.price).trim()                 // Override exists (from DB or user edit)
                : (combo.price ? String(combo.price).trim() : 'ask');        // Use value from combo (already matched in generateAllPossibleCombinations)
              const baseModel = override !== undefined
                ? (override.baseModel === true)  // Override exists (from DB or user edit)
                : (combo.baseModel === true);     // Use value from combo (already matched in generateAllPossibleCombinations)

              return (
                <tr
                  key={combo.combinationId}
                  className={`border-b ${!isEnabled ? 'bg-gray-50 opacity-60' : ''}`}
                >
                  <td className="px-3 py-2 text-gray-700">{getSizeLabel(combo.size)}</td>
                  <td className="px-3 py-2 text-gray-700">{getChassisLabel(combo.chassis)}</td>
                  <td className="px-3 py-2">
                    {Object.keys(combo.variantSelections).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(combo.variantSelections).map(([key, value]) => (
                          <span key={key} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                            {key}: {value}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">No variants</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={price}
                      onChange={(e) => handlePriceChange(combo.combinationId, e.target.value)}
                      className="w-24 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="ask"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => handleToggleEnabled(combo.combinationId)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={baseModel}
                      onChange={() => handleToggleBaseModel(combo.combinationId)}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      title="Mark as base/recommended model"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    {override !== undefined && (
                      <button
                        onClick={() => handleReset(combo.combinationId)}
                        className="text-gray-500 hover:text-red-600 transition-colors"
                        title="Reset to default"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredCombinations.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">
            {searchTerm ? 'No combinations match your search' : 'No combinations available'}
          </div>
        )}
      </div>
    </div>
  );
};

const ViewCatalogue = ({ catalogue, onClose }) => {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Body Type</label>
        <p className="text-gray-900 text-lg font-semibold">{catalogue.bodyType?.name}</p>
      </div>

      {catalogue.article && (
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Article Content</label>
          <div
            className="prose prose-sm max-w-none border border-gray-200 rounded-lg p-4 bg-gray-50"
            dangerouslySetInnerHTML={{ __html: catalogue.article }}
          />
        </div>
      )}

      {catalogue.variantCategories && catalogue.variantCategories.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Variant Categories</label>
          <div className="space-y-3">
            {catalogue.variantCategories.map((category, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <p className="font-semibold text-gray-800">{category.category}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {category.values.map((value, valIndex) => (
                    <span key={valIndex} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {catalogue.shopCatalogue && catalogue.shopCatalogue.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Shop Catalogue Entries ({catalogue.shopCatalogue.length} enabled combinations)
          </label>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-b">Size</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-b">Chassis</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-b">Variants</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-b">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {catalogue.shopCatalogue.map((entry, index) => {
                  // Get size label
                  const sizeData = entry.sizeData || {};
                  const sizeTypeName = sizeData.sizeType?.name || sizeData.sizeType?.shortName || '';
                  const sizeCustom = sizeData.sizeCustom || '';
                  const sizeLabel = sizeTypeName + (sizeCustom ? ` - ${sizeCustom}` : '') || (sizeCustom || 'Not specified');

                  // Get chassis label - show only first detail
                  const chassisData = entry.chassisData || {};
                  const chassisTypeName = chassisData.chassisType?.name || chassisData.chassisType?.shortName || '';
                  const chassisDetails = Array.isArray(chassisData.chassisDetails) ? chassisData.chassisDetails : [];
                  const firstDetail = chassisDetails.length > 0 ? chassisDetails[0] : '';
                  const chassisLabel = chassisTypeName + (firstDetail ? ` (${firstDetail})` : '') || 'Not specified';

                  // Get variants - handle both Map and plain object
                  let variantSelections = entry.variantSelections || {};
                  if (variantSelections instanceof Map) {
                    variantSelections = Object.fromEntries(variantSelections);
                  }
                  const variantEntries = Object.entries(variantSelections);

                  // Get price from entry (already includes override from backend)
                  // The backend's generateAllCombinations applies overrides, so entry.price reflects the override
                  const price = entry.price || 'ask';
                  const hasCustomPrice = price !== 'ask';

                  return (
                    <tr key={entry.combinationId || index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {sizeLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                          {chassisLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {variantEntries.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {variantEntries.map(([key, value]) => (
                              <span key={key} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">No variants</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${hasCustomPrice
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                          }`}>
                          {price}
                          {hasCustomPrice && <span className="ml-1 text-xs">(custom)</span>}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            * Only enabled combinations are shown. Disabled combinations are hidden from the shop catalogue.
          </p>
        </div>
      )}

      {catalogue.leadTime && (
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Lead Time</label>
          <p className="text-gray-900">{catalogue.leadTime}</p>
        </div>
      )}

      {catalogue.notes && (
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Notes</label>
          <p className="text-gray-900 whitespace-pre-wrap">{catalogue.notes}</p>
        </div>
      )}

      <div className="flex justify-end mt-6 pt-4 border-t border-gray-100">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default CatalogueTab;


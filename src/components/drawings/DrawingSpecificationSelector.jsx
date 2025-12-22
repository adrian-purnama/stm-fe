import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Upload,
  Plus,
  FileText,
  Eye,
  Check,
  X,
  Loader2,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../utils/api/ApiHelper';
import BaseModal from '../modals/BaseModal';
import CustomDropdown from '../common/CustomDropdown';

const DrawingSpecificationSelector = ({ 
  value, 
  onChange, 
  onClose,
  isOpen = false 
}) => {
  // State for drawing specifications
  const [drawings, setDrawings] = useState([]);
  const [loadingDrawings, setLoadingDrawings] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalDrawings, setTotalDrawings] = useState(0);
  
  // State for master data
  const [bodyTypes, setBodyTypes] = useState([]);
  const [chassisTypes, setChassisTypes] = useState([]);
  const [sizeTypes, setSizeTypes] = useState([]);
  const [featureTypes, setFeatureTypes] = useState([]);
  
  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBodyTypeFilter, setSelectedBodyTypeFilter] = useState('');
  const [selectedChassisTypeFilter, setSelectedChassisTypeFilter] = useState('');
  const [selectedSizeTypeFilter, setSelectedSizeTypeFilter] = useState('');
  
  // State for modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTruckTypeModal, setShowTruckTypeModal] = useState(false);
  
  // State for form data (full form like DrawingSpecificationsPage)
  const [formData, setFormData] = useState({
    bodyTypeId: '',
    chassisTypeId: '',
    chassisModel: '',
    sizeTypeId: '',
    dimension: '',
    features: [],
    customSpecifications: []
  });
  
  // State for truck type form
  const [truckTypeForm, setTruckTypeForm] = useState({
    name: '',
    description: '',
    category: 'Commercial'
  });
  
  // State for file uploads
  const [uploadFile, setUploadFile] = useState(null); // AutoCAD file
  const [uploadImageFile, setUploadImageFile] = useState(null); // JPG file
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileSize, setFileSize] = useState(null);
  const [imageFileSize, setImageFileSize] = useState(null);
  
  // Ref for scroll container
  const scrollContainerRef = useRef(null);

  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Helper function to normalize key segments (UPPERCASE, remove spaces and slashes)
  const normalizeKeySegment = (str) => {
    if (!str) return '';
    return String(str)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/\//g, '')
      .replace(/-/g, '');
  };

  // Helper function to format features for composite key
  const formatFeatures = (features) => {
    if (!features || features.length === 0) return '';
    
    return features
      .map(feature => {
        if (!feature.featureId) return null;
        // Get feature shortName from featureTypes array
        const featureType = featureTypes.find(ft => ft._id === feature.featureId);
        const featureKey = featureType?.shortName || feature.featureId.toString();
        const specValue = feature.spec ? normalizeKeySegment(feature.spec) : '';
        return specValue ? `${normalizeKeySegment(featureKey)}_${specValue}` : normalizeKeySegment(featureKey);
      })
      .filter(Boolean)
      .join('-');
  };

  // Generate drawing number from form data
  const generateDrawingNumber = () => {
    // Get body type shortName
    const bodyType = bodyTypes.find(bt => bt._id === formData.bodyTypeId);
    const bodyTypeKey = bodyType?.shortName || '';
    
    // Get chassis type shortName
    const chassisType = chassisTypes.find(ct => ct._id === formData.chassisTypeId);
    const chassisKey = chassisType?.shortName || '';
    
    // Get size type shortName
    const sizeType = sizeTypes.find(st => st._id === formData.sizeTypeId);
    const sizeKey = sizeType?.shortName || '';
    
    // Normalize other fields
    const chassisModelKey = normalizeKeySegment(formData.chassisModel || '');
    const dimensionKey = normalizeKeySegment(formData.dimension || '');
    const featuresKey = formatFeatures(formData.features || []);
    
    // Build composite key: BODYTYPE/CHASSIS/CHASSISMODEL/SIZE/DIMENSION/FEATURES
    const keyParts = [
      normalizeKeySegment(bodyTypeKey) || '-',
      chassisKey ? normalizeKeySegment(chassisKey) : '-',
      chassisModelKey || '-',
      sizeKey ? normalizeKeySegment(sizeKey) : '-',
      dimensionKey || '-',
      featuresKey || '-'
    ];
    
    return keyParts.join('/');
  };

  // Load master data
  const loadBodyTypes = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/api/body-types/list');
      if (response.data?.success && response.data?.data) {
        setBodyTypes(response.data.data);
      }
    } catch (error) {
      console.error('Error loading body types:', error);
    }
  }, []);

  const loadChassisTypes = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/api/chassis-types/list');
      if (response.data?.success && response.data?.data) {
        setChassisTypes(response.data.data);
      }
    } catch (error) {
      console.error('Error loading chassis types:', error);
    }
  }, []);

  const loadSizeTypes = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/api/size-types/list');
      if (response.data?.success && response.data?.data) {
        setSizeTypes(response.data.data);
      }
    } catch (error) {
      console.error('Error loading size types:', error);
    }
  }, []);

  const loadFeatureTypes = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/api/feature-types/list');
      if (response.data?.success && response.data?.data) {
        setFeatureTypes(response.data.data);
      }
    } catch (error) {
      console.error('Error loading feature types:', error);
    }
  }, []);

  // Load drawing specifications with pagination
  const loadDrawings = useCallback(async (page = 1, append = false) => {
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setLoadingDrawings(true);
      }

      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      
      // Add filters to API call (server-side filtering)
      if (selectedBodyTypeFilter) {
        params.append('bodyTypeId', selectedBodyTypeFilter);
      }
      if (selectedChassisTypeFilter) {
        params.append('chassisTypeId', selectedChassisTypeFilter);
      }
      if (selectedSizeTypeFilter) {
        params.append('sizeTypeId', selectedSizeTypeFilter);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await axiosInstance.get(`/api/drawing-specifications?${params.toString()}`);
      if (response.data && response.data.success) {
        const drawingsData = response.data.data || [];
        const paginationInfo = response.data.pagination || {};
        
        if (append) {
          // Append new drawings to existing array
          setDrawings(prev => [...prev, ...drawingsData]);
        } else {
          // Replace drawings array for initial load or filter change
          setDrawings(Array.isArray(drawingsData) ? drawingsData : []);
        }
        
        // Update pagination state
        setTotalDrawings(paginationInfo.total || 0);
        const totalPages = paginationInfo.pages || Math.ceil((paginationInfo.total || 0) / 20);
        setHasMore(page < totalPages);
      } else {
        if (!append) {
          setDrawings([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading drawing specifications:', error);
      if (!append) {
        toast.error('Failed to load drawing specifications');
        setDrawings([]);
      } else {
        toast.error('Failed to load more drawings');
      }
      setHasMore(false);
    } finally {
      if (append) {
        setIsLoadingMore(false);
      } else {
        setLoadingDrawings(false);
      }
    }
  }, [selectedBodyTypeFilter, selectedChassisTypeFilter, selectedSizeTypeFilter, searchTerm]);

  // Load more drawings function
  const loadMoreDrawings = useCallback(async () => {
    if (isLoadingMore || !hasMore || loadingDrawings) return;
    
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await loadDrawings(nextPage, true);
  }, [currentPage, hasMore, isLoadingMore, loadingDrawings, loadDrawings]);

  // Reset pagination and reload when filters change
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      setHasMore(true);
      setDrawings([]);
      loadDrawings(1, false);
    }
  }, [isOpen, selectedBodyTypeFilter, selectedChassisTypeFilter, selectedSizeTypeFilter, searchTerm, loadDrawings]);

  // Since filtering is now done server-side, filteredDrawings is just drawings
  const filteredDrawings = drawings;

  // Add feature row
  const addFeature = () => {
    setFormData({
      ...formData,
      features: [...formData.features, { featureId: '', spec: '' }]
    });
  };

  // Remove feature row
  const removeFeature = (index) => {
    const newFeatures = formData.features.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      features: newFeatures
    });
  };

  // Update feature
  const updateFeature = (index, field, value) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = {
      ...newFeatures[index],
      [field]: value
    };
    setFormData({
      ...formData,
      features: newFeatures
    });
  };

  // Add custom specification category
  const addCustomSpecCategory = () => {
    setFormData({
      ...formData,
      customSpecifications: [...formData.customSpecifications, { category: '', items: [] }]
    });
  };

  // Remove custom specification category
  const removeCustomSpecCategory = (index) => {
    const newCustomSpecs = formData.customSpecifications.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      customSpecifications: newCustomSpecs
    });
  };

  // Update custom specification category
  const updateCustomSpecCategory = (index, field, value) => {
    const updated = [...formData.customSpecifications];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, customSpecifications: updated });
  };

  // Add custom specification item
  const addCustomSpecItem = (categoryIndex) => {
    const updated = [...formData.customSpecifications];
    updated[categoryIndex] = {
      ...updated[categoryIndex],
      items: [...(updated[categoryIndex].items || []), { name: '', specification: '' }]
    };
    setFormData({ ...formData, customSpecifications: updated });
  };

  // Remove custom specification item
  const removeCustomSpecItem = (categoryIndex, itemIndex) => {
    const updated = [...formData.customSpecifications];
    updated[categoryIndex] = {
      ...updated[categoryIndex],
      items: updated[categoryIndex].items.filter((_, i) => i !== itemIndex)
    };
    setFormData({ ...formData, customSpecifications: updated });
  };

  // Update custom specification item
  const updateCustomSpecItem = (categoryIndex, itemIndex, field, value) => {
    const updated = [...formData.customSpecifications];
    updated[categoryIndex].items[itemIndex] = {
      ...updated[categoryIndex].items[itemIndex],
      [field]: value
    };
    setFormData({ ...formData, customSpecifications: updated });
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      bodyTypeId: '',
      chassisTypeId: '',
      chassisModel: '',
      sizeTypeId: '',
      dimension: '',
      features: [],
      customSpecifications: []
    });
    setUploadFile(null);
    setUploadImageFile(null);
    setFileSize(null);
    setImageFileSize(null);
    setUploadProgress(0);
  };

  // Create truck type (body type)
  const createTruckType = async () => {
    try {
      if (!truckTypeForm.name.trim()) {
        toast.error('Body type name is required');
        return;
      }
      
      await axiosInstance.post('/api/body-types', truckTypeForm);
      toast.success('Body type created successfully');
      setShowTruckTypeModal(false);
      setTruckTypeForm({ name: '', description: '', category: 'Commercial' });
      loadBodyTypes();
    } catch (error) {
      console.error('Error creating body type:', error);
      toast.error(error.response?.data?.message || 'Failed to create body type');
    }
  };

  // Create new drawing specification
  const createDrawing = async () => {
    try {
      // Validation - only bodyType is required (file uploads are also required)
      if (!formData.bodyTypeId) {
        toast.error('Body type is required');
        return;
      }
      if (!uploadFile) {
        toast.error('AutoCAD file (DWG/DXF) upload is required for archive purposes.');
        return;
      }
      if (!uploadImageFile) {
        toast.error('Quotation image/document (JPG/PNG/PDF) upload is required for quotation display.');
        return;
      }

      // Validate AutoCAD file type
      const fileName = uploadFile.name.toLowerCase();
      if (!fileName.endsWith('.dwg') && !fileName.endsWith('.dxf')) {
        toast.error('Invalid file type for AutoCAD file. Only DWG and DXF files are allowed.');
        return;
      }

      // Validate image/document file type
      const imageFileName = uploadImageFile.name.toLowerCase();
      const isValidType = imageFileName.endsWith('.jpg') || 
                         imageFileName.endsWith('.jpeg') || 
                         imageFileName.endsWith('.png') || 
                         imageFileName.endsWith('.pdf');
      if (!isValidType) {
        toast.error('Invalid file type for quotation image. Only JPG/JPEG/PNG/PDF files are allowed.');
        return;
      }

      setUploading(true);
      setUploadProgress(0);
      
      const formDataToSend = new FormData();
      formDataToSend.append('bodyTypeId', formData.bodyTypeId);
      if (formData.chassisTypeId) {
        formDataToSend.append('chassisTypeId', formData.chassisTypeId);
      }
      if (formData.chassisModel) {
        formDataToSend.append('chassisModel', formData.chassisModel);
      }
      if (formData.sizeTypeId) {
        formDataToSend.append('sizeTypeId', formData.sizeTypeId);
      }
      if (formData.dimension) {
        formDataToSend.append('dimension', formData.dimension);
      }
      formDataToSend.append('features', JSON.stringify(formData.features));
      formDataToSend.append('customSpecifications', JSON.stringify(formData.customSpecifications));
      
      // Append both files with correct field names
      formDataToSend.append('drawingFile', uploadFile);
      formDataToSend.append('quotationImage', uploadImageFile);
      
      const response = await axiosInstance.post('/api/drawing-specifications', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      toast.success('Drawing specification created successfully');
      setShowUploadModal(false);
      resetForm();
      
      // Reload drawings from page 1 and auto-select the new one
      setCurrentPage(1);
      setDrawings([]);
      await loadDrawings(1, false);
      const newDrawing = response.data.data;
      // Reset filters to show the new drawing
      setSearchTerm('');
      setSelectedBodyTypeFilter('');
      setSelectedChassisTypeFilter('');
      setSelectedSizeTypeFilter('');
      onChange(newDrawing);
      
    } catch (error) {
      console.error('Error creating drawing:', error);
      toast.error(error.response?.data?.message || 'Failed to create drawing specification');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle selection
  const handleSelect = (drawing) => {
    onChange(drawing);
    onClose();
  };

  // Load master data on component mount
  useEffect(() => {
    if (isOpen) {
      loadBodyTypes();
      loadChassisTypes();
      loadSizeTypes();
      loadFeatureTypes();
      // Reset filters when opening
      setSearchTerm('');
      setSelectedBodyTypeFilter('');
      setSelectedChassisTypeFilter('');
      setSelectedSizeTypeFilter('');
    }
  }, [isOpen, loadBodyTypes, loadChassisTypes, loadSizeTypes, loadFeatureTypes]);

  // Scroll detection for infinite scroll
  useEffect(() => {
    if (!isOpen || !scrollContainerRef.current) return;

    const scrollContainer = scrollContainerRef.current;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const threshold = 100; // Load more when 100px from bottom
      
      if (scrollHeight - scrollTop - clientHeight < threshold) {
        if (hasMore && !isLoadingMore && !loadingDrawings) {
          loadMoreDrawings();
        }
      }
    };

    // Debounce scroll events
    let timeoutId;
    const debouncedHandleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100);
    };

    scrollContainer.addEventListener('scroll', debouncedHandleScroll);

    return () => {
      scrollContainer.removeEventListener('scroll', debouncedHandleScroll);
      clearTimeout(timeoutId);
    };
  }, [isOpen, hasMore, isLoadingMore, loadingDrawings, loadMoreDrawings]);

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={() => {
          setSearchTerm('');
          setSelectedBodyTypeFilter('');
          setSelectedChassisTypeFilter('');
          setSelectedSizeTypeFilter('');
          onClose();
        }}
        title="Select Drawing Specification"
        size="lg"
      >
        <div className="space-y-4">
          {/* Search and Filter Section */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by drawing number, chassis model, body type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Body Type
                </label>
                <CustomDropdown
                  options={[
                    { value: '', label: 'All Body Types' },
                    ...bodyTypes.map((type) => ({
                      value: type._id,
                      label: type.shortName ? `${type.name} (${type.shortName})` : type.name
                    }))
                  ]}
                  value={selectedBodyTypeFilter}
                  onChange={setSelectedBodyTypeFilter}
                  placeholder="All Body Types"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Chassis Type
                </label>
                <CustomDropdown
                  options={[
                    { value: '', label: 'All Chassis Types' },
                    ...chassisTypes.map((type) => ({
                      value: type._id,
                      label: type.shortName ? `${type.name} (${type.shortName})` : type.name
                    }))
                  ]}
                  value={selectedChassisTypeFilter}
                  onChange={setSelectedChassisTypeFilter}
                  placeholder="All Chassis Types"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Size Type
                </label>
                <CustomDropdown
                  options={[
                    { value: '', label: 'All Size Types' },
                    ...sizeTypes.map((type) => ({
                      value: type._id,
                      label: type.shortName ? `${type.name} (${type.shortName})` : type.name
                    }))
                  ]}
                  value={selectedSizeTypeFilter}
                  onChange={setSelectedSizeTypeFilter}
                  placeholder="All Size Types"
                />
              </div>
            </div>

            {/* Upload New Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Upload className="h-4 w-4" />
                Upload New
              </button>
            </div>
          </div>

          {/* Drawing Specifications List */}
          <div ref={scrollContainerRef} className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
            {loadingDrawings && filteredDrawings.length === 0 ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : filteredDrawings.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">No drawing specifications found.</p>
                {searchTerm || selectedBodyTypeFilter || selectedChassisTypeFilter || selectedSizeTypeFilter ? (
                  <p className="text-sm text-gray-400 mt-2">Try adjusting your filters</p>
                ) : null}
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-200">
                  {filteredDrawings.map((drawing) => {
                    const bodyTypeName = typeof drawing.bodyTypeId === 'object'
                      ? drawing.bodyTypeId?.name || 'Unknown'
                      : 'Unknown';
                    const chassisTypeName = typeof drawing.chassisTypeId === 'object'
                      ? drawing.chassisTypeId?.name || 'Unknown'
                      : 'Unknown';
                    const sizeTypeName = typeof drawing.sizeTypeId === 'object'
                      ? drawing.sizeTypeId?.name || 'Unknown'
                      : 'Unknown';

                    return (
                      <div
                        key={drawing._id}
                        onClick={() => handleSelect(drawing)}
                        className="p-4 cursor-pointer hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 mb-1">
                              {drawing.drawingNumber || 'Drawing'}
                            </h3>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>
                                <span className="font-medium">Body:</span> {bodyTypeName}
                                {drawing.chassisTypeId && (
                                  <> • <span className="font-medium">Chassis:</span> {chassisTypeName}</>
                                )}
                                {drawing.sizeTypeId && (
                                  <> • <span className="font-medium">Size:</span> {sizeTypeName}</>
                                )}
                              </p>
                              {drawing.chassisModel && (
                                <p><span className="font-medium">Model:</span> {drawing.chassisModel}</p>
                              )}
                              {drawing.dimension && (
                                <p><span className="font-medium">Dimension:</span> {drawing.dimension}</p>
                              )}
                            </div>
                          </div>
                          <div className="ml-4">
                            <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                              Select
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Loading more indicator */}
                {isLoadingMore && (
                  <div className="flex justify-center items-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                    <span className="ml-2 text-sm text-gray-600">Loading more...</span>
                  </div>
                )}
                
                {/* No more results message */}
                {!hasMore && filteredDrawings.length > 0 && (
                  <div className="p-4 text-center">
                    <p className="text-sm text-gray-500">No more drawings to load</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Results Count */}
          {!loadingDrawings && filteredDrawings.length > 0 && (
            <p className="text-xs text-gray-500 text-center">
              Showing {filteredDrawings.length} of {totalDrawings} drawing{totalDrawings !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </BaseModal>

      {/* Upload New Drawing Modal - Full Form */}
      <BaseModal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          resetForm();
        }}
        title="Create New Drawing Specification"
        size="lg"
      >
        <div className="space-y-4">
          {/* Drawing Number Preview - Auto-generated */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Drawing Number (Auto-generated)
            </label>
            <p className="text-lg font-mono font-semibold text-blue-900">
              {generateDrawingNumber()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              This number will update automatically as you fill in the fields below
            </p>
          </div>

          {/* Body Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Body Type *
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <CustomDropdown
                  options={[
                    { value: '', label: 'Select Body Type' },
                    ...bodyTypes.map((type) => ({
                      value: type._id,
                      label: `${type.name} (${type.shortName})`
                    }))
                  ]}
                  value={formData.bodyTypeId}
                  onChange={(value) => setFormData({ ...formData, bodyTypeId: value })}
                  placeholder="Select Body Type"
                />
              </div>
              <button
                onClick={() => setShowTruckTypeModal(true)}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                title="Create new body type"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Chassis Type - Optional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chassis Type
            </label>
            <CustomDropdown
              options={[
                { value: '', label: 'Select Chassis Type (Optional)' },
                ...chassisTypes.map((type) => ({
                  value: type._id,
                  label: type.shortName ? `${type.name} (${type.shortName})` : type.name
                }))
              ]}
              value={formData.chassisTypeId}
              onChange={(value) => setFormData({ ...formData, chassisTypeId: value })}
              placeholder="Select Chassis Type (Optional)"
            />
          </div>

          {/* Chassis Model - Optional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chassis Model
            </label>
            <input
              type="text"
              value={formData.chassisModel}
              onChange={(e) => setFormData({ ...formData, chassisModel: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Hino 500 Series (Optional)"
            />
          </div>

          {/* Size Type - Optional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Size Type
            </label>
            <CustomDropdown
              options={[
                { value: '', label: 'Select Size Type (Optional)' },
                ...sizeTypes.map((type) => ({
                  value: type._id,
                  label: `${type.name} (${type.shortName})`
                }))
              ]}
              value={formData.sizeTypeId}
              onChange={(value) => setFormData({ ...formData, sizeTypeId: value })}
              placeholder="Select Size Type (Optional)"
            />
          </div>

          {/* Dimension - Optional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dimension
            </label>
            <input
              type="text"
              value={formData.dimension}
              onChange={(e) => setFormData({ ...formData, dimension: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 4500x2200x800 or 5.5m x 2.2m x 0.8m (Optional)"
            />
            <p className="mt-1 text-xs text-gray-500">Enter dimension as a single string (optional)</p>
          </div>

          {/* Features */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Features
              </label>
              <button
                type="button"
                onClick={addFeature}
                className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Feature
              </button>
            </div>
            
            {formData.features.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No features added</p>
            ) : (
              <div className="space-y-2">
                {formData.features.map((feature, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <CustomDropdown
                        options={[
                          { value: '', label: 'Select Feature' },
                          ...featureTypes.map((type) => ({
                            value: type._id,
                            label: `${type.name} (${type.shortName})`
                          }))
                        ]}
                        value={feature.featureId}
                        onChange={(value) => updateFeature(index, 'featureId', value)}
                        placeholder="Select Feature"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={feature.spec}
                        onChange={(e) => updateFeature(index, 'spec', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Spec value (optional)"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="p-2 text-red-600 hover:text-red-900"
                      title="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custom Specifications */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Custom Specifications
              </label>
              <button
                type="button"
                onClick={addCustomSpecCategory}
                className="text-sm px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Plus className="h-4 w-4 inline mr-1" />
                Add Category
              </button>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {formData.customSpecifications.map((spec, specIndex) => (
                <div key={specIndex} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <input
                      type="text"
                      value={spec.category || ''}
                      onChange={(e) => updateCustomSpecCategory(specIndex, 'category', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm mr-2"
                      placeholder="Category name"
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomSpecCategory(specIndex)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-2 ml-4">
                    {spec.items && spec.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.name || ''}
                          onChange={(e) => updateCustomSpecItem(specIndex, itemIndex, 'name', e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Name"
                        />
                        <span className="text-gray-500">:</span>
                        <input
                          type="text"
                          value={item.specification || ''}
                          onChange={(e) => updateCustomSpecItem(specIndex, itemIndex, 'specification', e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Specification"
                        />
                        <button
                          type="button"
                          onClick={() => removeCustomSpecItem(specIndex, itemIndex)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addCustomSpecItem(specIndex)}
                      className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Plus className="h-3 w-3 inline mr-1" />
                      Add Item
                    </button>
                  </div>
                </div>
              ))}
              {formData.customSpecifications.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No custom specifications added yet</p>
              )}
            </div>
          </div>

          {/* AutoCAD File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AutoCAD File (DWG/DXF) * - For Archive
            </label>
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files[0] || null;
                setUploadFile(file);
                if (file) {
                  setFileSize({
                    original: file.size,
                    formatted: formatFileSize(file.size)
                  });
                } else {
                  setFileSize(null);
                }
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              accept=".dwg,.dxf"
              required
            />
            {uploadFile && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">
                  {uploadFile.name}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Original size: {fileSize?.formatted || formatFileSize(uploadFile.size)}
                </p>
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Only DWG and DXF files are allowed. DWG files will be converted to DXF automatically.
            </p>
          </div>

          {/* Image/Document Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quotation Image/Document (JPG/PNG/PDF) * - For Quotation Display
            </label>
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files[0] || null;
                setUploadImageFile(file);
                if (file) {
                  setImageFileSize({
                    original: file.size,
                    formatted: formatFileSize(file.size)
                  });
                } else {
                  setImageFileSize(null);
                }
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              required
            />
            {uploadImageFile && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {uploadImageFile.type.startsWith('image/') ? (
                    <img 
                      src={URL.createObjectURL(uploadImageFile)} 
                      alt={uploadImageFile.name}
                      className="w-16 h-16 object-cover rounded border"
                    />
                  ) : uploadImageFile.type === 'application/pdf' ? (
                    <FileText className="w-16 h-16 text-red-600" />
                  ) : (
                    <FileText className="w-16 h-16 text-gray-400" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">
                      {uploadImageFile.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Original size: {imageFileSize?.formatted || formatFileSize(uploadImageFile.size)}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Only JPG/JPEG/PNG/PDF files are allowed. This file will be used in quotations.
            </p>
          </div>

          {uploading && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{uploadProgress}% uploaded</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4 px-6 pb-6">
          <button
            onClick={() => {
              setShowUploadModal(false);
              resetForm();
            }}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={createDrawing}
            disabled={uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                Creating...
              </>
            ) : (
              'Create & Select'
            )}
          </button>
        </div>
      </BaseModal>

      {/* Create Truck Type Modal */}
      <BaseModal
        isOpen={showTruckTypeModal}
        onClose={() => {
          setShowTruckTypeModal(false);
          setTruckTypeForm({ name: '', description: '', category: 'Commercial' });
        }}
        title="Create New Truck Type"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={truckTypeForm.name}
              onChange={(e) => setTruckTypeForm({ ...truckTypeForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Dump Truck"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={truckTypeForm.description}
              onChange={(e) => setTruckTypeForm({ ...truckTypeForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Brief description of this truck type"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <CustomDropdown
              options={[
                { value: 'Commercial', label: 'Commercial' },
                { value: 'Construction', label: 'Construction' },
                { value: 'Transportation', label: 'Transportation' },
                { value: 'Specialized', label: 'Specialized' }
              ]}
              value={truckTypeForm.category}
              onChange={(value) => setTruckTypeForm({ ...truckTypeForm, category: value })}
              placeholder="Select category"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => {
              setShowTruckTypeModal(false);
              setTruckTypeForm({ name: '', description: '', category: 'Commercial' });
            }}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={createTruckType}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Truck Type
          </button>
        </div>
      </BaseModal>
    </>
  );
};

export default DrawingSpecificationSelector;

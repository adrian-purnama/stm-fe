import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Loader2,
  FileImage,
  Download,
  Upload,
  FileText,
  ArrowLeft,
  X,
  Calculator,
  Ruler
} from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../utils/api/ApiHelper';
import BaseModal from '../components/modals/BaseModal';
import { getDrawingAssetUrl } from '../utils/helpers/assetUrlHelper';
import CustomDropdown from '../components/common/CustomDropdown';
import Navigation from '../components/common/Navigation';

const DrawingSpecificationsPage = () => {
  
  // State for drawing specifications
  const [drawings, setDrawings] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // State for master data
  const [bodyTypes, setBodyTypes] = useState([]);
  const [chassisTypes, setChassisTypes] = useState([]);
  const [sizeTypes, setSizeTypes] = useState([]);
  const [featureTypes, setFeatureTypes] = useState([]);
  
  // State for filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBodyType, setSelectedBodyType] = useState('');
  const [selectedChassisType, setSelectedChassisType] = useState('');
  const [selectedSizeType, setSelectedSizeType] = useState('');
  
  // State for modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  
  // State for form data
  const [formData, setFormData] = useState({
    bodyTypeId: '',
    chassisTypeId: '',
    chassisModel: '',
    sizeTypeId: '',
    dimension: '',
    features: [],
    customSpecifications: []
  });
  
  // State for file uploads
  const [uploadFile, setUploadFile] = useState(null); // AutoCAD file
  const [uploadImageFile, setUploadImageFile] = useState(null); // JPG file
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileSize, setFileSize] = useState(null);
  const [imageFileSize, setImageFileSize] = useState(null);
  
  // State for file removal flags (edit mode)
  const [removeDrawingFile, setRemoveDrawingFile] = useState(false);
  const [removeQuotationImage, setRemoveQuotationImage] = useState(false);
  
  // State for selected drawing
  const [selectedDrawing, setSelectedDrawing] = useState(null);

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
    // Always include all segments, use "-" for empty optional fields
    const keyParts = [
      normalizeKeySegment(bodyTypeKey) || '-', // Body type is required, but show "-" if not selected yet
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

  // Load drawing specifications
  const loadDrawings = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedBodyType) params.append('bodyTypeId', selectedBodyType);
      if (selectedChassisType) params.append('chassisTypeId', selectedChassisType);
      if (selectedSizeType) params.append('sizeTypeId', selectedSizeType);
      
      const response = await axiosInstance.get(`/api/drawing-specifications?${params}`);
      if (response.data?.success && response.data?.data) {
      setDrawings(response.data.data);
      }
    } catch (error) {
      console.error('Error loading drawings:', error);
      toast.error('Failed to load drawing specifications');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedBodyType, selectedChassisType, selectedSizeType]);

  // Create drawing specification
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
        toast.error('Quotation image (JPG) upload is required for quotation display.');
        return;
      }

      // Validate AutoCAD file type
      const fileName = uploadFile.name.toLowerCase();
      if (!fileName.endsWith('.dwg') && !fileName.endsWith('.dxf')) {
        toast.error('Invalid file type for AutoCAD file. Only DWG and DXF files are allowed.');
        return;
      }

      // Validate JPG file type
      const imageFileName = uploadImageFile.name.toLowerCase();
      if (!imageFileName.endsWith('.jpg') && !imageFileName.endsWith('.jpeg')) {
        toast.error('Invalid file type for quotation image. Only JPG/JPEG files are allowed.');
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
      
      await axiosInstance.post('/api/drawing-specifications', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      
      toast.success('Drawing specification created successfully');
      setShowCreateModal(false);
      resetForm();
      loadDrawings();
    } catch (error) {
      console.error('Error creating drawing:', error);
      toast.error(error.response?.data?.message || 'Failed to create drawing specification');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Update drawing specification
  const updateDrawing = async () => {
    try {
      // Validation
      if (!formData.bodyTypeId) {
        toast.error('Body type is required');
        return;
      }
      if (!formData.chassisTypeId) {
        toast.error('Chassis type is required');
        return;
      }
      if (!formData.chassisModel.trim()) {
        toast.error('Chassis model is required');
        return;
      }
      if (!formData.sizeTypeId) {
        toast.error('Size type is required');
        return;
      }
      if (!formData.dimension || !formData.dimension.trim()) {
        toast.error('Dimension is required');
        return;
      }
      
      setUploading(true);
      setUploadProgress(0);
      
      // Create FormData for file uploads
      const formDataToSend = new FormData();
      formDataToSend.append('bodyTypeId', formData.bodyTypeId);
      formDataToSend.append('chassisTypeId', formData.chassisTypeId || '');
      formDataToSend.append('chassisModel', formData.chassisModel);
      formDataToSend.append('sizeTypeId', formData.sizeTypeId || '');
      formDataToSend.append('dimension', formData.dimension);
      formDataToSend.append('features', JSON.stringify((formData.features || []).map((feature) => ({
        featureId:
          feature?.featureId && typeof feature.featureId === 'object'
            ? feature.featureId._id || feature.featureId.id || ''
            : feature?.featureId || '',
        spec: feature?.spec?.trim() || ''
      }))));
      formDataToSend.append('customSpecifications', JSON.stringify((formData.customSpecifications || []).map((category) => ({
        category: category?.category?.trim() || '',
        items: Array.isArray(category?.items)
          ? category.items
              .filter((item) => item && (item.name || item.specification))
              .map((item) => ({
                name: item?.name?.trim() || '',
                specification: item?.specification?.trim() || ''
              }))
          : []
      }))));
      
      // Add file removal flags
      if (removeDrawingFile) {
        formDataToSend.append('removeDrawingFile', 'true');
      }
      if (removeQuotationImage) {
        formDataToSend.append('removeQuotationImage', 'true');
      }
      
      // Add new files if selected
      if (uploadFile) {
        formDataToSend.append('drawingFile', uploadFile);
      }
      if (uploadImageFile) {
        formDataToSend.append('quotationImage', uploadImageFile);
      }
      
      await axiosInstance.put(`/api/drawing-specifications/${selectedDrawing._id}`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      
      toast.success('Drawing specification updated successfully');
      setShowEditModal(false);
      setSelectedDrawing(null);
      resetForm();
      loadDrawings();
    } catch (error) {
      console.error('Error updating drawing:', error);
      toast.error(error.response?.data?.message || 'Failed to update drawing specification');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Delete drawing specification
  const deleteDrawing = async (drawing) => {
    if (!window.confirm(`Are you sure you want to delete "${drawing.drawingNumber}"?`)) {
      return;
    }
    
    try {
      const response = await axiosInstance.delete(`/api/drawing-specifications/${drawing._id}`);
      if (response.data.success) {
      toast.success('Drawing specification deleted successfully');
      loadDrawings();
      }
    } catch (error) {
      console.error('Error deleting drawing:', error);
      toast.error(error.response?.data?.message || 'Failed to delete drawing specification');
    }
  };

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
    setRemoveDrawingFile(false);
    setRemoveQuotationImage(false);
  };

  // Handle edit
  const handleEdit = (drawing) => {
    setSelectedDrawing(drawing);
    setFormData({
      bodyTypeId: drawing.bodyTypeId?._id || drawing.bodyTypeId || '',
      chassisTypeId: drawing.chassisTypeId?._id || drawing.chassisTypeId || '',
      chassisModel: drawing.chassisModel || '',
      sizeTypeId: drawing.sizeTypeId?._id || drawing.sizeTypeId || '',
      dimension: drawing.dimension || '',
      features: (drawing.features || []).map((feature) => ({
        featureId: feature?.featureId?._id || feature?.featureId || '',
        spec: feature?.spec || ''
      })),
      customSpecifications: (drawing.customSpecifications || []).map((category) => ({
        category: category?.category || '',
        items: Array.isArray(category?.items)
          ? category.items.map((item) => ({
              name: item?.name || '',
              specification: item?.specification || ''
            }))
          : []
      }))
    });
    setShowEditModal(true);
  };

  // Handle view
  const handleView = (drawing) => {
    setSelectedDrawing(drawing);
    setShowViewModal(true);
  };

  // Download file
  const downloadFile = async (drawingId, fileId, originalName) => {
    try {
      const downloadUrl = getDrawingAssetUrl(drawingId, fileId, true);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', originalName);
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('File download started');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadBodyTypes();
    loadChassisTypes();
    loadSizeTypes();
    loadFeatureTypes();
    loadDrawings();
  }, [loadBodyTypes, loadChassisTypes, loadSizeTypes, loadFeatureTypes, loadDrawings]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation title="Drawing Specifications Management" subtitle="Manage drawing specifications with master data references" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Drawing Specifications Management</h1>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              {/* Search */}
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search drawing numbers or chassis models..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Body Type Filter */}
              <div className="min-w-48">
                <CustomDropdown
                  options={[
                    { value: '', label: 'All Body Types' },
                    ...bodyTypes.map((type) => ({
                      value: type._id,
                      label: type.name
                    }))
                  ]}
                  value={selectedBodyType}
                  onChange={setSelectedBodyType}
                  placeholder="All Body Types"
                />
              </div>

              {/* Chassis Type Filter */}
              <div className="min-w-48">
                <CustomDropdown
                  options={[
                  { value: '', label: 'All Chassis Types' },
                  ...chassisTypes.map((type) => ({
                    value: type._id,
                    label: type.shortName ? `${type.name} (${type.shortName})` : type.name
                  }))
                  ]}
                  value={selectedChassisType}
                  onChange={setSelectedChassisType}
                  placeholder="All Chassis Types"
                />
              </div>

              {/* Size Type Filter */}
              <div className="min-w-48">
                <CustomDropdown
                  options={[
                    { value: '', label: 'All Size Types' },
                    ...sizeTypes.map((type) => ({
                      value: type._id,
                      label: type.name
                    }))
                  ]}
                  value={selectedSizeType}
                  onChange={setSelectedSizeType}
                  placeholder="All Size Types"
                />
              </div>

              {/* Action Button */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    resetForm();
                    setShowCreateModal(true);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Drawing
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Drawing Specifications List */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Loading drawing specifications...</p>
            </div>
          ) : drawings.length === 0 ? (
            <div className="p-12 text-center">
              <FileImage className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">No drawing specifications found</p>
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Drawing
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drawing Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Body Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chassis</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chassis Model</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dimensions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Features</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {drawings.map((drawing) => {
                    return (
                      <tr key={drawing._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{drawing.drawingNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-gray-900">{drawing.bodyTypeId?.name || 'N/A'}</div>
                            {drawing.bodyTypeId?.shortName && (
                              <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                                {drawing.bodyTypeId.shortName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-gray-900">{drawing.chassisTypeId?.name || 'N/A'}</div>
                            {drawing.chassisTypeId?.shortName && (
                              <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                                {drawing.chassisTypeId.shortName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{drawing.chassisModel || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-gray-900">{drawing.sizeTypeId?.name || 'N/A'}</div>
                            {drawing.sizeTypeId?.shortName && (
                              <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                                {drawing.sizeTypeId.shortName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-sm text-gray-900">
                            <Ruler className="h-3 w-3" />
                            {drawing.dimension || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {drawing.features && drawing.features.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {drawing.features.slice(0, 3).map((feature, idx) => (
                                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                                    {feature.featureId?.name || feature.featureId}
                                    {feature.spec && `: ${feature.spec}`}
                      </span>
                                ))}
                                {drawing.features.length > 3 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                                    +{drawing.features.length - 3} more
                                  </span>
                                )}
                    </div>
                      ) : (
                              <span className="text-gray-400">No features</span>
                      )}
                    </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleView(drawing)}
                              className="text-blue-600 hover:text-blue-900 p-1"
                              title="View"
                      >
                              <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(drawing)}
                              className="text-green-600 hover:text-green-900 p-1"
                              title="Edit"
                      >
                              <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteDrawing(drawing)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        <BaseModal
          isOpen={showCreateModal || showEditModal}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedDrawing(null);
            resetForm();
          }}
          title={showEditModal ? "Edit Drawing Specification" : "Create New Drawing Specification"}
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

            {/* File Management - For edit mode */}
            {showEditModal && selectedDrawing && (
              <>
                {/* Existing AutoCAD File */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    AutoCAD File (DWG/DXF) - For Archive
                  </label>
                  {!removeDrawingFile && selectedDrawing.drawingFile && selectedDrawing.drawingFile.fileId ? (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">
                            {selectedDrawing.drawingFile.originalName}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {selectedDrawing.drawingFile.originalFileSize ? formatFileSize(selectedDrawing.drawingFile.originalFileSize) : 'File size unknown'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Format: {selectedDrawing.drawingFile.uploadedFormat} → {selectedDrawing.drawingFile.storedFormat}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => downloadFile(selectedDrawing._id, selectedDrawing.drawingFile.fileId, selectedDrawing.drawingFile.originalName)}
                            className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRemoveDrawingFile(true);
                              setUploadFile(null);
                            }}
                            className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : removeDrawingFile ? (
                    <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm text-red-700">File will be removed on update</p>
                      <button
                        type="button"
                        onClick={() => {
                          setRemoveDrawingFile(false);
                        }}
                        className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                      >
                        Cancel removal
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-500">No file uploaded</p>
                    </div>
                  )}
                  
                  {/* File upload for replacement */}
                  {!removeDrawingFile && (
                    <div className="mt-3">
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
                      />
                      {uploadFile && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-blue-900">
                                New file: {uploadFile.name}
                              </p>
                              <p className="text-xs text-blue-700 mt-1">
                                Original size: {fileSize?.formatted || formatFileSize(uploadFile.size)}
                              </p>
                              <p className="text-xs text-blue-600 mt-1 font-medium">
                                This will replace the existing file
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setUploadFile(null);
                                setFileSize(null);
                              }}
                              className="p-1 text-blue-600 hover:text-blue-900"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Select a new file to replace the existing one. Only DWG and DXF files are allowed.
                      </p>
                    </div>
                  )}
                </div>

                {/* Existing Quotation Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quotation Image (JPG) - For Quotation Display
                  </label>
                  {!removeQuotationImage && selectedDrawing.quotationImage && selectedDrawing.quotationImage.fileId ? (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <img 
                            src={getDrawingAssetUrl(selectedDrawing._id, selectedDrawing.quotationImage.fileId, false)}
                            alt={selectedDrawing.quotationImage.originalName}
                            className="w-16 h-16 object-cover rounded border"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700">
                              {selectedDrawing.quotationImage.originalName}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {selectedDrawing.quotationImage.originalFileSize ? formatFileSize(selectedDrawing.quotationImage.originalFileSize) : 'File size unknown'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => downloadFile(selectedDrawing._id, selectedDrawing.quotationImage.fileId, selectedDrawing.quotationImage.originalName)}
                            className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRemoveQuotationImage(true);
                              setUploadImageFile(null);
                            }}
                            className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : removeQuotationImage ? (
                    <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm text-red-700">Image will be removed on update</p>
                      <button
                        type="button"
                        onClick={() => {
                          setRemoveQuotationImage(false);
                        }}
                        className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                      >
                        Cancel removal
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-500">No image uploaded</p>
                    </div>
                  )}
                  
                  {/* Image upload for replacement */}
                  {!removeQuotationImage && (
                    <div className="mt-3">
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
                        accept=".jpg,.jpeg,image/jpeg"
                      />
                      {uploadImageFile && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              {uploadImageFile.type.startsWith('image/') && (
                                <img 
                                  src={URL.createObjectURL(uploadImageFile)} 
                                  alt={uploadImageFile.name}
                                  className="w-16 h-16 object-cover rounded border"
                                />
                              )}
                              <div className="flex-1">
                                <p className="text-sm font-medium text-blue-900">
                                  New image: {uploadImageFile.name}
                                </p>
                                <p className="text-xs text-blue-700 mt-1">
                                  Original size: {imageFileSize?.formatted || formatFileSize(uploadImageFile.size)}
                                </p>
                                <p className="text-xs text-blue-600 mt-1 font-medium">
                                  This will replace the existing image
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setUploadImageFile(null);
                                setImageFileSize(null);
                              }}
                              className="p-1 text-blue-600 hover:text-blue-900"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Select a new image to replace the existing one. Only JPG/JPEG files are allowed.
                      </p>
                    </div>
                  )}
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
              </>
            )}

            {/* File Uploads - Required for create */}
            {showCreateModal && (
              <>
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

                {/* JPG Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quotation Image (JPG) * - For Quotation Display
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
                    accept=".jpg,.jpeg,image/jpeg"
                    required
                  />
                  {uploadImageFile && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {uploadImageFile.type.startsWith('image/') && (
                          <img 
                            src={URL.createObjectURL(uploadImageFile)} 
                            alt={uploadImageFile.name}
                            className="w-16 h-16 object-cover rounded border"
                          />
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
                    Only JPG/JPEG files are allowed. This image will be used in quotations.
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
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4 px-6 pb-6">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                setSelectedDrawing(null);
                resetForm();
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={showEditModal ? updateDrawing : createDrawing}
              disabled={uploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  {showEditModal ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                showEditModal ? 'Update' : 'Create'
              )}
            </button>
          </div>
        </BaseModal>

        {/* View Modal */}
        <BaseModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedDrawing(null);
          }}
          title="Drawing Specification Details"
          size="lg"
        >
          {selectedDrawing && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Drawing Number (Auto-generated)
                </label>
                <p className="text-lg font-mono font-semibold text-gray-900">{selectedDrawing.drawingNumber}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Body Type
                </label>
                  <div className="flex items-center gap-3">
                    <p className="text-gray-900">{selectedDrawing.bodyTypeId?.name || 'N/A'}</p>
                    {selectedDrawing.bodyTypeId?.shortName && (
                      <span className="px-2 py-1 text-sm font-medium bg-gray-200 text-gray-700 rounded">
                        {selectedDrawing.bodyTypeId.shortName}
                      </span>
                    )}
                  </div>
              </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chassis Type
                  </label>
                  <div className="flex items-center gap-3">
                    <p className="text-gray-900">{selectedDrawing.chassisTypeId?.name || 'N/A'}</p>
                    {selectedDrawing.chassisTypeId?.shortName && (
                      <span className="px-2 py-1 text-sm font-medium bg-gray-200 text-gray-700 rounded">
                        {selectedDrawing.chassisTypeId.shortName}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chassis Model
                  </label>
                  <p className="text-gray-900">{selectedDrawing.chassisModel || 'N/A'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Size Type
                  </label>
                  <div className="flex items-center gap-3">
                    <p className="text-gray-900">{selectedDrawing.sizeTypeId?.name || 'N/A'}</p>
                    {selectedDrawing.sizeTypeId?.shortName && (
                      <span className="px-2 py-1 text-sm font-medium bg-gray-200 text-gray-700 rounded">
                        {selectedDrawing.sizeTypeId.shortName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dimension
                </label>
                <p className="text-gray-900 font-mono">{selectedDrawing.dimension || 'N/A'}</p>
              </div>

              {selectedDrawing.features && selectedDrawing.features.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Features ({selectedDrawing.features.length})
                  </label>
                  <div className="space-y-2">
                    {selectedDrawing.features.map((feature, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-medium text-gray-900">
                            {feature.featureId?.name || feature.featureId}
                          </span>
                          {feature.spec && (
                            <span className="text-gray-600 ml-2">: {feature.spec}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedDrawing.customSpecifications && selectedDrawing.customSpecifications.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Specifications
                  </label>
                  <div className="space-y-3">
                    {selectedDrawing.customSpecifications.map((spec, specIndex) => (
                      <div key={specIndex} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <h4 className="font-semibold text-gray-900 mb-2">{spec.category}</h4>
                        {spec.items && spec.items.length > 0 && (
                          <div className="space-y-1 ml-4">
                            {spec.items.map((item, itemIndex) => (
                              <div key={itemIndex} className="text-sm text-gray-700">
                                <span className="font-medium">{item.name}</span>
                                {item.specification && `: ${item.specification}`}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedDrawing.drawingFile && selectedDrawing.drawingFile.fileId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AutoCAD File (Archive)
                  </label>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-700">{selectedDrawing.drawingFile.originalName}</span>
                        </div>
                        <button
                      onClick={() => downloadFile(
                        selectedDrawing._id, 
                        selectedDrawing.drawingFile.fileId, 
                        selectedDrawing.drawingFile.originalName
                      )}
                          className="text-blue-600 hover:text-blue-900 p-1"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                  </div>
                </div>
              )}

              {selectedDrawing.quotationImage && selectedDrawing.quotationImage.fileId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quotation Image (JPG)
                  </label>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileImage className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-700">{selectedDrawing.quotationImage.originalName}</span>
                    </div>
                    <button
                      onClick={() => downloadFile(
                        selectedDrawing._id, 
                        selectedDrawing.quotationImage.fileId, 
                        selectedDrawing.quotationImage.originalName
                      )}
                      className="text-blue-600 hover:text-blue-900 p-1"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Created By
                  </label>
                  <p className="text-gray-900">{selectedDrawing.createdBy?.fullName || 'Unknown'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Created Date
                  </label>
                  <p className="text-gray-900">{new Date(selectedDrawing.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setShowViewModal(false);
                setSelectedDrawing(null);
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </BaseModal>
      </div>
    </div>
  );
};

export default DrawingSpecificationsPage;
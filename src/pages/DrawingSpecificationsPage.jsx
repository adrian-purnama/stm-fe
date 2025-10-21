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
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import ApiHelper from '../utils/ApiHelper';
import BaseModal from '../components/BaseModal';
import CustomDropdown from '../components/CustomDropdown';

const DrawingSpecificationsPage = () => {
  // State for drawing specifications
  const [drawings, setDrawings] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // State for truck types
  const [truckTypes, setTruckTypes] = useState([]);
  
  // State for filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTruckType, setSelectedTruckType] = useState('');
  
  // State for modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showTruckTypeModal, setShowTruckTypeModal] = useState(false);
  
  // State for form data
  const [formData, setFormData] = useState({
    drawingNumber: '',
    truckType: ''
  });
  
  // State for truck type form
  const [truckTypeForm, setTruckTypeForm] = useState({
    name: '',
    description: '',
    category: 'Commercial'
  });
  
  // State for file uploads
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  // State for selected drawing
  const [selectedDrawing, setSelectedDrawing] = useState(null);

  // Load truck types
  const loadTruckTypes = useCallback(async () => {
    try {
      const response = await ApiHelper.get('/api/truck-types/list');
      setTruckTypes(response.data.data);
    } catch (error) {
      console.error('Error loading truck types:', error);
    }
  }, []);

  // Load drawing specifications
  const loadDrawings = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedTruckType) params.truckType = selectedTruckType;
      
      const response = await ApiHelper.get('/api/drawing-specifications', { params });
      setDrawings(response.data.data);
    } catch (error) {
      console.error('Error loading drawings:', error);
      toast.error('Failed to load drawing specifications');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedTruckType]);

  // Create drawing specification
  const createDrawing = async () => {
    try {
      if (!formData.drawingNumber.trim()) {
        toast.error('Drawing number is required');
        return;
      }
      if (!formData.truckType) {
        toast.error('Truck type is required');
        return;
      }
      
      setUploading(true);
      
      // Create FormData to handle both text data and files
      const formDataToSend = new FormData();
      formDataToSend.append('drawingNumber', formData.drawingNumber);
      formDataToSend.append('truckType', formData.truckType);
      
      // Add file if any
      if (uploadFiles.length > 0) {
        formDataToSend.append('file', uploadFiles[0]);
      }
      
      const response = await ApiHelper.post('/api/drawing-specifications', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(response.data.message);
      setShowCreateModal(false);
      setFormData({ drawingNumber: '', truckType: '' });
      setUploadFiles([]);
      loadDrawings();
    } catch (error) {
      console.error('Error creating drawing:', error);
      toast.error(error.response?.data?.message || 'Failed to create drawing specification');
    } finally {
      setUploading(false);
    }
  };

  // Update drawing specification
  const updateDrawing = async () => {
    try {
      if (!formData.drawingNumber.trim()) {
        toast.error('Drawing number is required');
        return;
      }
      if (!formData.truckType) {
        toast.error('Truck type is required');
        return;
      }
      
      await ApiHelper.put(`/api/drawing-specifications/${selectedDrawing._id}`, formData);
      toast.success('Drawing specification updated successfully');
      setShowEditModal(false);
      setSelectedDrawing(null);
      setFormData({ drawingNumber: '', truckType: '' });
      loadDrawings();
    } catch (error) {
      console.error('Error updating drawing:', error);
      toast.error(error.response?.data?.message || 'Failed to update drawing specification');
    }
  };

  // Delete drawing specification
  const deleteDrawing = async (drawing) => {
    if (!window.confirm(`Are you sure you want to delete "${drawing.drawingNumber}" and all its associated files?`)) {
      return;
    }
    
    try {
      await ApiHelper.delete(`/api/drawing-specifications/${drawing._id}`);
      toast.success('Drawing specification deleted successfully');
      loadDrawings();
    } catch (error) {
      console.error('Error deleting drawing:', error);
      toast.error(error.response?.data?.message || 'Failed to delete drawing specification');
    }
  };

  // Upload files to drawing

  // Download file
  const downloadFile = async (drawingId, fileId, originalName) => {
    try {
      //const baseURL = window.location.origin.includes('localhost') ? 'http://localhost:5000' : 'http://localhost:5000';
      const baseURL = "https://stm-be.onrender.com";
      const token = localStorage.getItem('asb-token');
      const downloadUrl = `${baseURL}/api/assets/drawings/${drawingId}/files/${fileId}?token=${token}&download=true`;
      
      console.log('Downloading file from:', downloadUrl);
      
      // Create a temporary link to trigger download
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

  // Handle edit
  const handleEdit = (drawing) => {
    setSelectedDrawing(drawing);
    setFormData({
      drawingNumber: drawing.drawingNumber,
      truckType: drawing.truckType._id
    });
    setShowEditModal(true);
  };

  // Handle view
  const handleView = (drawing) => {
    setSelectedDrawing(drawing);
    setShowViewModal(true);
  };



  // Handle file selection for create drawing modal
  const handleCreateDrawingFileSelect = (event) => {
    const file = event.target.files[0];
    setUploadFiles(file ? [file] : []);
  };

  // Get file preview URL
  const getFilePreviewUrl = (file) => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  // Get file icon based on type
  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) {
      return '🖼️';
    } else if (fileType === 'application/pdf') {
      return '📄';
    } else if (fileType.includes('dwg') || fileType.includes('dxf')) {
      return '📐';
    }
    return '📁';
  };

  // Get asset URL for viewing uploaded files
  const getAssetUrl = (drawingId, fileId) => {
    // Use the same base URL as ApiHelper
    const baseURL = window.location.origin.includes('localhost') ? 'http://localhost:5000' : 'http://localhost:5000';
    const token = localStorage.getItem('asb-token');
    
    if (!token) {
      console.error('No token found in localStorage');
      return null;
    }
    
    if (!drawingId || !fileId) {
      console.error('Missing drawingId or fileId:', { drawingId, fileId });
      return null;
    }
    
    const url = `${baseURL}/api/assets/drawings/${drawingId}/files/${fileId}?token=${token}`;
    console.log('Generated asset URL:', url);
    console.log('Token length:', token.length);
    return url;
  };

  // Create truck type
  const createTruckType = async () => {
    try {
      if (!truckTypeForm.name.trim()) {
        toast.error('Truck type name is required');
        return;
      }
      
      await ApiHelper.post('/api/truck-types', truckTypeForm);
      toast.success('Truck type created successfully');
      setShowTruckTypeModal(false);
      setTruckTypeForm({ name: '', description: '', category: 'Commercial' });
      loadTruckTypes();
    } catch (error) {
      console.error('Error creating truck type:', error);
      toast.error(error.response?.data?.message || 'Failed to create truck type');
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadTruckTypes();
    loadDrawings();
  }, [loadTruckTypes, loadDrawings]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Drawing Specifications Management</h1>
          <p className="text-gray-600">Manage drawing specifications and their associated files</p>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search drawing numbers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Truck Type Filter */}
            <div className="min-w-48">
              <CustomDropdown
                options={[
                  { value: '', label: 'All Truck Types' },
                  ...truckTypes.map((type) => ({
                    value: type._id,
                    label: type.name
                  }))
                ]}
                value={selectedTruckType}
                onChange={setSelectedTruckType}
                placeholder="All Truck Types"
              />
            </div>

            {/* Action Button */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Drawing
              </button>
            </div>
          </div>
        </div>

        {/* Drawing Specifications List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Drawing Specifications</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500">Loading drawing specifications...</p>
            </div>
          ) : drawings.length === 0 ? (
            <div className="p-8 text-center">
              <FileImage className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">No drawing specifications found</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Drawing
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {drawings.map((drawing) => (
                <div key={drawing._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-lg text-gray-800">{drawing.drawingNumber}</h3>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {drawing.truckType?.name || 'N/A'}
                    </span>
                  </div>
                  
                      <div className="flex items-center text-xs text-gray-500 mb-3">
                        <FileText className="h-4 w-4 mr-1" />
                        <span>{drawing.drawingFile ? '1 file' : 'No file'}</span>
                      </div>
                  
                  <p className="text-sm text-gray-600 mb-4">
                    Created by {drawing.createdBy?.fullName || 'Unknown'}
                  </p>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleView(drawing)}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                    <button
                      onClick={() => handleEdit(drawing)}
                      className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => deleteDrawing(drawing)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Modal */}
        <BaseModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setFormData({ drawingNumber: '', truckType: '' });
            setUploadFiles([]);
          }}
          title="Create New Drawing Specification"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Drawing Number *
              </label>
              <input
                type="text"
                value={formData.drawingNumber}
                onChange={(e) => setFormData({ ...formData, drawingNumber: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., TRK-001"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Truck Type *
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <CustomDropdown
                    options={[
                      { value: '', label: 'Select truck type' },
                      ...truckTypes.map((type) => ({
                        value: type._id,
                        label: type.name
                      }))
                    ]}
                    value={formData.truckType}
                    onChange={(value) => setFormData({ ...formData, truckType: value })}
                    placeholder="Select truck type"
                    required={true}
                  />
                </div>
                <button
                  onClick={() => setShowTruckTypeModal(true)}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  title="Create new truck type"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Drawing File (Required)
              </label>
                  <input
                    type="file"
                    accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png"
                    onChange={handleCreateDrawingFileSelect}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: PDF, DWG, DXF, JPG, PNG (max 50MB)
                  </p>
              
              {uploadFiles.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Selected File:</p>
                  <div className="space-y-2">
                    {uploadFiles.map((file, index) => {
                      const previewUrl = getFilePreviewUrl(file);
                      return (
                        <div key={index} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            {previewUrl ? (
                              <img 
                                src={previewUrl} 
                                alt={file.name}
                                className="w-12 h-12 object-cover rounded border"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center text-2xl">
                                {getFileIcon(file.type)}
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setFormData({ drawingNumber: '', truckType: '' });
                setUploadFiles([]);
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
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
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Drawing
                </>
              )}
            </button>
          </div>
        </BaseModal>

        {/* Edit Modal */}
        <BaseModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedDrawing(null);
            setFormData({ drawingNumber: '', truckType: '' });
          }}
          title="Edit Drawing Specification"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Drawing Number *
              </label>
              <input
                type="text"
                value={formData.drawingNumber}
                onChange={(e) => setFormData({ ...formData, drawingNumber: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., TRK-001"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Truck Type *
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <CustomDropdown
                    options={[
                      { value: '', label: 'Select truck type' },
                      ...truckTypes.map((type) => ({
                        value: type._id,
                        label: type.name
                      }))
                    ]}
                    value={formData.truckType}
                    onChange={(value) => setFormData({ ...formData, truckType: value })}
                    placeholder="Select truck type"
                    required={true}
                  />
                </div>
                <button
                  onClick={() => setShowTruckTypeModal(true)}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  title="Create new truck type"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => {
                setShowEditModal(false);
                setSelectedDrawing(null);
                setFormData({ drawingNumber: '', truckType: '' });
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={updateDrawing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Update
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
                  Drawing Number
                </label>
                <p className="text-lg font-semibold text-gray-900">{selectedDrawing.drawingNumber}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Truck Type
                </label>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {selectedDrawing.truckType?.name || 'N/A'}
                </span>
              </div>
              
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Drawing File
                    </label>
                    {selectedDrawing.drawingFile ? (
                      <div className="border border-gray-200 rounded-lg p-6">
                        <div className="flex flex-col items-center space-y-4">
                          {(() => {
                            const file = selectedDrawing.drawingFile;
                            // Check both fileType and originalName for image detection
                            const isImageByType = ['JPG', 'PNG', 'JPEG', 'WEBP'].includes(file.fileType);
                            const isImageByName = /\.(jpg|jpeg|png|webp)$/i.test(file.originalName);
                            const isImage = isImageByType || isImageByName;
                            const assetUrl = getAssetUrl(selectedDrawing._id, file.fileId);
                            
                            console.log('File details:', {
                              fileType: file.fileType,
                              isImageByType: isImageByType,
                              isImageByName: isImageByName,
                              isImage: isImage,
                              originalName: file.originalName,
                              assetUrl: assetUrl
                            });
                            
                            return (
                              <>
                                {isImage && assetUrl ? (
                                  <div className="w-full max-w-md">
                                    <img 
                                      src={assetUrl}
                                      alt={file.originalName}
                                      className="w-full h-64 object-contain rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => {
                                        console.log('Opening image:', assetUrl);
                                        window.open(assetUrl, '_blank');
                                      }}
                                      onLoad={() => {
                                        console.log('Image loaded successfully:', assetUrl);
                                      }}
                                      onError={(e) => {
                                        console.error('Image failed to load:', assetUrl, e);
                                        console.error('Error details:', {
                                          drawingId: selectedDrawing._id,
                                          fileId: file.fileId,
                                          fileType: file.fileType,
                                          originalName: file.originalName
                                        });
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                      }}
                                    />
                                    <div className="w-full h-64 bg-gray-100 rounded-lg border items-center justify-center text-6xl hidden">
                                      {getFileIcon(`image/${file.fileType.toLowerCase()}`)}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-full max-w-md h-64 bg-gray-100 rounded-lg border flex items-center justify-center text-6xl">
                                    {isImage ? (
                                      <div className="text-center">
                                        <div className="text-4xl mb-2">⚠️</div>
                                        <div className="text-sm text-gray-600">Image not available</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          {!assetUrl ? 'Invalid URL' : 'Failed to load'}
                                        </div>
                                      </div>
                                    ) : (
                                      getFileIcon(`application/${file.fileType.toLowerCase()}`)
                                    )}
                                  </div>
                                )}
                                
                                <div className="text-center">
                                  <p className="font-medium text-gray-800 text-lg">{file.originalName}</p>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {file.fileType} • {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    Uploaded: {new Date(file.uploadDate).toLocaleDateString()}
                                  </p>
                                </div>
                                
                                <div className="flex gap-3">
                                  {isImage && (
                                    <button
                                      onClick={() => window.open(assetUrl, '_blank')}
                                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                                    >
                                      <Eye className="h-4 w-4" />
                                      View Full Size
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      console.log('Testing URL directly:', assetUrl);
                                      window.open(assetUrl, '_blank');
                                    }}
                                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
                                  >
                                    Test URL
                                  </button>
                                  <button
                                    onClick={() => downloadFile(selectedDrawing._id, file.fileId, file.originalName)}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                                  >
                                    <Download className="h-4 w-4" />
                                    Download
                                  </button>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500">No file uploaded</p>
                    )}
                  </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
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
          
          <div className="flex justify-end gap-3 mt-6">
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
                rows="3"
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
                  { value: 'Specialized', label: 'Specialized' },
                  { value: 'Other', label: 'Other' }
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
              Create
            </button>
          </div>
        </BaseModal>
      </div>
    </div>
  );
};

export default DrawingSpecificationsPage;

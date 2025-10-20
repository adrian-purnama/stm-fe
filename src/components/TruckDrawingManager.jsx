import React, { useState, useEffect, useCallback } from 'react';
import { 
  Upload, 
  Search, 
  Filter, 
  Plus, 
  FileText, 
  Download, 
  Trash2, 
  Eye,
  Check,
  X,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import ApiHelper from '../utils/ApiHelper';
import BaseModal from './BaseModal';
import CustomDropdown from './CustomDropdown';

const TruckDrawingManager = () => {
  // State for truck types
  const [truckTypes, setTruckTypes] = useState([]);
  
  // State for drawing specifications
  const [drawings, setDrawings] = useState([]);
  const [loadingDrawings, setLoadingDrawings] = useState(false);
  
  // State for filters and search
  const [selectedTruckType, setSelectedTruckType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for modals
  const [showTruckTypeModal, setShowTruckTypeModal] = useState(false);
  const [showDrawingModal, setShowDrawingModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // State for new truck type
  const [newTruckType, setNewTruckType] = useState({
    name: '',
    description: '',
    category: 'Commercial'
  });
  
  // State for new drawing
  const [newDrawing, setNewDrawing] = useState({
    drawingNumber: '',
    truckType: ''
  });
  
  // State for files in create drawing modal
  const [createDrawingFiles, setCreateDrawingFiles] = useState([]);
  
  // State for file upload
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
      toast.error('Failed to load truck types');
    }
  }, []);

  // Load drawing specifications
  const loadDrawings = useCallback(async () => {
    try {
      setLoadingDrawings(true);
      const params = {};
      if (selectedTruckType) params.truckType = selectedTruckType;
      if (searchTerm) params.search = searchTerm;
      
      const response = await ApiHelper.get('/api/drawing-specifications', { params });
      setDrawings(response.data.data);
    } catch (error) {
      console.error('Error loading drawings:', error);
      toast.error('Failed to load drawing specifications');
    } finally {
      setLoadingDrawings(false);
    }
  }, [selectedTruckType, searchTerm]);

  // Create new truck type
  const createTruckType = async () => {
    try {
      if (!newTruckType.name.trim()) {
        toast.error('Truck type name is required');
        return;
      }
      
      console.log('Creating truck type with data:', newTruckType);
      const response = await ApiHelper.post('/api/truck-types', newTruckType);
      console.log('Truck type creation response:', response.data);
      
      toast.success('Truck type created successfully');
      setShowTruckTypeModal(false);
      setNewTruckType({ name: '', description: '', category: 'Commercial' });
      loadTruckTypes();
    } catch (error) {
      console.error('Error creating truck type:', error);
      console.error('Error response:', error.response?.data);
      
      // Show more detailed error message
      const errorMessage = error.response?.data?.message || 'Failed to create truck type';
      const errorDetails = error.response?.data?.errors;
      
      if (errorDetails && Array.isArray(errorDetails)) {
        toast.error(`${errorMessage}: ${errorDetails.join(', ')}`);
      } else {
        toast.error(errorMessage);
      }
    }
  };

  // Create new drawing specification
  const createDrawing = async () => {
    try {
      if (!newDrawing.drawingNumber.trim()) {
        toast.error('Drawing number is required');
        return;
      }
      if (!newDrawing.truckType) {
        toast.error('Truck type is required');
        return;
      }
      
      setUploading(true);
      
      // Create FormData to handle both text data and files
      const formData = new FormData();
      formData.append('drawingNumber', newDrawing.drawingNumber);
      formData.append('truckType', newDrawing.truckType);
      
      // Add files if any
      createDrawingFiles.forEach(file => {
        formData.append('files', file);
      });
      
      const response = await ApiHelper.post('/api/drawing-specifications', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(response.data.message);
      setShowDrawingModal(false);
      setNewDrawing({ drawingNumber: '', truckType: '' });
      setCreateDrawingFiles([]);
      loadDrawings();
    } catch (error) {
      console.error('Error creating drawing:', error);
      toast.error(error.response?.data?.message || 'Failed to create drawing specification');
    } finally {
      setUploading(false);
    }
  };

  // Upload files to drawing
  const uploadFilesToDrawing = async (drawingId) => {
    try {
      if (uploadFiles.length === 0) {
        toast.error('Please select files to upload');
        return;
      }
      
      setUploading(true);
      const formData = new FormData();
      uploadFiles.forEach(file => {
        formData.append('files', file);
      });
      
      await ApiHelper.post(`/api/drawing-specifications/${drawingId}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Files uploaded successfully');
      setShowUploadModal(false);
      setUploadFiles([]);
      loadDrawings();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  // Download file
  const downloadFile = async (drawingId, fileId, filename) => {
    try {
      const baseURL = window.location.origin.includes('localhost') ? 'http://localhost:5000' : 'http://localhost:5000';
      const token = localStorage.getItem('asb-token');
      const downloadUrl = `${baseURL}/api/assets/drawings/${drawingId}/files/${fileId}?token=${token}&download=true`;
      
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
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

  // Delete drawing
  const deleteDrawing = async (drawingId) => {
    if (!window.confirm('Are you sure you want to delete this drawing specification?')) {
      return;
    }
    
    try {
      await ApiHelper.delete(`/api/drawing-specifications/${drawingId}`);
      toast.success('Drawing specification deleted successfully');
      loadDrawings();
    } catch (error) {
      console.error('Error deleting drawing:', error);
      toast.error('Failed to delete drawing specification');
    }
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setUploadFiles(files);
  };

  // Handle file selection for create drawing modal
  const handleCreateDrawingFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setCreateDrawingFiles(files);
  };

  // Load data on component mount
  useEffect(() => {
    loadTruckTypes();
    loadDrawings();
  }, [loadTruckTypes, loadDrawings]);

  // Reload drawings when filters change
  useEffect(() => {
    loadDrawings();
  }, [loadDrawings]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Truck Drawing Manager</h1>
        <p className="text-gray-600">Manage truck drawing specifications and upload drawing files</p>
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
                placeholder="Search by drawing number..."
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

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowTruckTypeModal(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Truck Type
            </button>
            <button
              onClick={() => setShowDrawingModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Drawing
            </button>
          </div>
        </div>
      </div>

      {/* Drawings List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Drawing Specifications</h2>
        </div>
        
        {loadingDrawings ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-gray-500">Loading drawings...</p>
          </div>
        ) : drawings.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No drawing specifications found</p>
            <button
              onClick={() => setShowDrawingModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Drawing
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {drawings.map((drawing) => (
              <div key={drawing._id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {drawing.drawingNumber}
                      </h3>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {drawing.truckType?.name || 'Unknown Type'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Created by {drawing.createdBy?.fullName || 'Unknown'} • 
                      {drawing.drawingFiles?.length || 0} files
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {drawing.drawingFiles && drawing.drawingFiles.length > 0 && (
                      <button
                        onClick={() => setSelectedDrawing(drawing)}
                        className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Files
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedDrawing(drawing);
                        setShowUploadModal(true);
                      }}
                      className="inline-flex items-center px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Upload Files
                    </button>
                    <button
                      onClick={() => deleteDrawing(drawing._id)}
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

      {/* New Truck Type Modal */}
      <BaseModal
        isOpen={showTruckTypeModal}
        onClose={() => setShowTruckTypeModal(false)}
        title="Create New Truck Type"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={newTruckType.name}
              onChange={(e) => setNewTruckType({ ...newTruckType, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Dump Truck"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={newTruckType.description}
              onChange={(e) => setNewTruckType({ ...newTruckType, description: e.target.value })}
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
              value={newTruckType.category}
              onChange={(value) => setNewTruckType({ ...newTruckType, category: value })}
              placeholder="Select category"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setShowTruckTypeModal(false)}
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

      {/* New Drawing Modal */}
      <BaseModal
        isOpen={showDrawingModal}
        onClose={() => {
          setShowDrawingModal(false);
          setCreateDrawingFiles([]);
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
              value={newDrawing.drawingNumber}
              onChange={(e) => setNewDrawing({ ...newDrawing, drawingNumber: e.target.value.toUpperCase() })}
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
                  value={newDrawing.truckType}
                  onChange={(value) => setNewDrawing({ ...newDrawing, truckType: value })}
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
              Upload Drawing Files (Optional)
            </label>
            <input
              type="file"
              multiple
              accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png"
              onChange={handleCreateDrawingFileSelect}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported formats: PDF, DWG, DXF, JPG, PNG (max 50MB each)
            </p>
            
            {createDrawingFiles.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Selected Files:</p>
                <div className="space-y-1">
                  {createDrawingFiles.map((file, index) => (
                    <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      • {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => {
              setShowDrawingModal(false);
              setCreateDrawingFiles([]);
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

      {/* Upload Files Modal */}
      <BaseModal
        isOpen={showUploadModal && selectedDrawing !== null}
        onClose={() => {
          setShowUploadModal(false);
          setSelectedDrawing(null);
          setUploadFiles([]);
        }}
        title={selectedDrawing ? `Upload Files to ${selectedDrawing.drawingNumber}` : 'Upload Files'}
      >
        <div className="space-y-4">
          {selectedDrawing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Great!</strong> Your drawing specification "{selectedDrawing.drawingNumber}" has been created. 
                Now you can upload the drawing files.
              </p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Files
            </label>
            <input
              type="file"
              multiple
              accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported formats: PDF, DWG, DXF, JPG, PNG (max 50MB each)
            </p>
          </div>
          
          {uploadFiles.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Selected Files:</p>
              <div className="space-y-1">
                {uploadFiles.map((file, index) => (
                  <div key={index} className="text-sm text-gray-600">
                    • {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => {
              setShowUploadModal(false);
              setSelectedDrawing(null);
              setUploadFiles([]);
            }}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => selectedDrawing && uploadFilesToDrawing(selectedDrawing._id)}
            disabled={uploading || uploadFiles.length === 0 || !selectedDrawing}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {uploadFiles.length > 0 ? 'Upload Files' : 'Select Files First'}
              </>
            )}
          </button>
        </div>
      </BaseModal>

      {/* View Files Modal */}
      {selectedDrawing && selectedDrawing.drawingFiles && selectedDrawing.drawingFiles.length > 0 && (
        <BaseModal
          isOpen={true}
          onClose={() => setSelectedDrawing(null)}
          title={`Files in ${selectedDrawing.drawingNumber}`}
          size="lg"
        >
            
            <div className="space-y-3">
              {selectedDrawing.drawingFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{file.originalName}</p>
                      <p className="text-sm text-gray-500">
                        {file.fileType} • {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadFile(selectedDrawing._id, file.fileId, file.originalName)}
                    className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </button>
                </div>
              ))}
            </div>
        </BaseModal>
      )}
    </div>
  );
};

export default TruckDrawingManager;

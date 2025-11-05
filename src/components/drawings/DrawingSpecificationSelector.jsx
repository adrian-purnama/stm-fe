import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Upload,
  Plus,
  FileText,
  Eye,
  Check,
  X,
  Loader2
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
  
  // State for truck types
  const [truckTypes, setTruckTypes] = useState([]);
  
  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTruckType, setSelectedTruckType] = useState('');
  
  // State for modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTruckTypeModal, setShowTruckTypeModal] = useState(false);
  
  // State for form data
  const [formData, setFormData] = useState({
    truckType: ''
  });
  
  // State for truck type form
  const [truckTypeForm, setTruckTypeForm] = useState({
    name: '',
    description: '',
    category: 'Commercial'
  });
  
  // State for file uploads
  const [uploadFiles, setUploadFiles] = useState([]); // AutoCAD file
  const [uploadImageFiles, setUploadImageFiles] = useState([]); // JPG file
  const [uploading, setUploading] = useState(false);

  // Load truck types
  const loadTruckTypes = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/api/body-types/list');
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

      const response = await axiosInstance.get('/api/drawing-specifications', { params });
      setDrawings(response.data.data);
    } catch (error) {
      console.error('Error loading drawing specifications:', error);
      toast.error('Failed to load drawing specifications');
    } finally {
      setLoadingDrawings(false);
    }
  }, [selectedTruckType, searchTerm]);

  // Handle AutoCAD file selection for upload
  const handleDrawingFileSelect = (event) => {
    const file = event.target.files[0];
    setUploadFiles(file ? [file] : []);
  };

  // Handle JPG image file selection for upload
  const handleImageFileSelect = (event) => {
    const file = event.target.files[0];
    setUploadImageFiles(file ? [file] : []);
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

  // Create truck type
  const createTruckType = async () => {
    try {
      if (!truckTypeForm.name.trim()) {
        toast.error('Truck type name is required');
        return;
      }
      
      await axiosInstance.post('/api/body-types', truckTypeForm);
      toast.success('Truck type created successfully');
      setShowTruckTypeModal(false);
      setTruckTypeForm({ name: '', description: '', category: 'Commercial' });
      loadTruckTypes();
    } catch (error) {
      console.error('Error creating truck type:', error);
      toast.error(error.response?.data?.message || 'Failed to create truck type');
    }
  };

  // Create new drawing specification
  const createDrawing = async () => {
    try {
      if (!formData.truckType) {
        toast.error('Truck type is required');
        return;
      }
      if (uploadFiles.length === 0) {
        toast.error('AutoCAD file (DWG/DXF) is required for archive purposes.');
        return;
      }
      if (uploadImageFiles.length === 0) {
        toast.error('Quotation image (JPG) is required for quotation display.');
        return;
      }

      setUploading(true);

      const data = new FormData();
      data.append('bodyTypeId', formData.truckType); // truckType is actually bodyTypeId
      data.append('drawingFile', uploadFiles[0]);
      data.append('quotationImage', uploadImageFiles[0]);

      const response = await axiosInstance.post('/api/drawing-specifications', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Drawing specification created successfully');
      setShowUploadModal(false);
      setFormData({ truckType: '' });
      setUploadFiles([]);
      setUploadImageFiles([]);
      
      // Reload drawings and auto-select the new one
      await loadDrawings();
      const newDrawing = response.data.data;
      onChange(newDrawing);
      
    } catch (error) {
      console.error('Error creating drawing:', error);
      toast.error(error.response?.data?.message || 'Failed to create drawing specification');
    } finally {
      setUploading(false);
    }
  };

  // Handle selection
  const handleSelect = (drawing) => {
    onChange(drawing);
    onClose();
  };

  // Load data on component mount
  useEffect(() => {
    if (isOpen) {
      loadTruckTypes();
      loadDrawings();
    }
  }, [isOpen, loadTruckTypes, loadDrawings]);

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title="Select Drawing Specification"
        size="lg"
      >
        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by drawing number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
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
            
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Upload className="h-4 w-4" />
              Upload New
            </button>
          </div>

          {/* Drawing Specifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loadingDrawings ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : drawings.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No drawing specifications found.</p>
            ) : (
              <div className="space-y-2">
                {drawings.map((drawing) => (
                  <div 
                    key={drawing._id} 
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      value === drawing._id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelect(drawing)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{drawing.drawingNumber}</h3>
                          <p className="text-sm text-gray-500">
                            Truck Type: {drawing.truckType?.name || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {drawing.drawingFile ? '1 file' : 'No file'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {value === drawing._id && (
                          <Check className="h-5 w-5 text-blue-500" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // You can add a preview function here
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </BaseModal>

      {/* Upload New Drawing Modal */}
      <BaseModal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setFormData({ truckType: '' });
          setUploadFiles([]);
          setUploadImageFiles([]);
        }}
        title="Upload New Drawing Specification"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Body Type (Truck Type) *
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
              Upload AutoCAD File (DWG/DXF) - For Archive *
            </label>
            <input
              type="file"
              accept=".dwg,.dxf"
              onChange={handleDrawingFileSelect}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Only DWG and DXF files are allowed (max 50MB)
            </p>
            
            {uploadFiles.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Selected AutoCAD File:</p>
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center text-2xl">
                      📐
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{uploadFiles[0].name}</p>
                      <p className="text-xs text-gray-500">
                        {(uploadFiles[0].size / 1024 / 1024).toFixed(2)} MB • {uploadFiles[0].type}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Quotation Image (JPG) - For Quotation Display *
            </label>
            <input
              type="file"
              accept=".jpg,.jpeg,image/jpeg"
              onChange={handleImageFileSelect}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Only JPG/JPEG files are allowed (max 10MB). This image will be used in quotations.
            </p>
            
            {uploadImageFiles.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Selected Image:</p>
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    {getFilePreviewUrl(uploadImageFiles[0]) ? (
                      <img 
                        src={getFilePreviewUrl(uploadImageFiles[0])} 
                        alt={uploadImageFiles[0].name}
                        className="w-16 h-16 object-cover rounded border"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center text-2xl">
                        🖼️
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{uploadImageFiles[0].name}</p>
                      <p className="text-xs text-gray-500">
                        {(uploadImageFiles[0].size / 1024 / 1024).toFixed(2)} MB • {uploadImageFiles[0].type}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => {
              setShowUploadModal(false);
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
                <Upload className="h-4 w-4 mr-2" />
                Create & Select
              </>
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

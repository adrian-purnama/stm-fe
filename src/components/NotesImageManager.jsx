import React, { useState, useEffect } from 'react';
import { ApiHelper } from '../utils/ApiHelper';

const NotesImageManager = ({ offerId, notesImages = [], onImagesChange }) => {
  const [images, setImages] = useState(notesImages);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load notes images when component mounts or offerId changes
  useEffect(() => {
    if (offerId) {
      loadNotesImages();
    }
  }, [offerId]);

  const loadNotesImages = async () => {
    try {
      setLoading(true);
      const response = await ApiHelper.get(`/notes-images/offer/${offerId}`);
      if (response.success) {
        setImages(response.data.images);
        onImagesChange?.(response.data.images);
      }
    } catch (error) {
      console.error('Error loading notes images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('image', file);

        // Upload image
        const uploadResponse = await ApiHelper.post('/notes-images/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (uploadResponse.success) {
          // Add image to offer
          await ApiHelper.post(`/notes-images/offer/${offerId}/add/${uploadResponse.data.id}`);
        }
      }

      // Reload images
      await loadNotesImages();
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleRemoveImage = async (imageId) => {
    if (!window.confirm('Are you sure you want to remove this image from this offer?')) {
      return;
    }

    try {
      await ApiHelper.delete(`/notes-images/offer/${offerId}/remove/${imageId}`);
      await loadNotesImages();
    } catch (error) {
      console.error('Error removing image:', error);
      alert('Failed to remove image. Please try again.');
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!window.confirm('Are you sure you want to permanently delete this image? This will remove it from all offers.')) {
      return;
    }

    try {
      await ApiHelper.delete(`/notes-images/${imageId}`);
      await loadNotesImages();
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image. Please try again.');
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading notes images...</div>;
  }

  return (
    <div className="notes-image-manager">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes Images
        </label>
        
        {/* Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            id="notes-image-upload"
          />
          <label
            htmlFor="notes-image-upload"
            className={`cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="text-gray-500">
              {uploading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
                  Uploading...
                </div>
              ) : (
                <div>
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">
                    Click to upload images or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 10MB each
                  </p>
                </div>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* Images Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div key={image.id} className="relative group">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={`/api/assets/notes-images/${image.id}/files/${image.imageFile.fileId}`}
                  alt={image.imageFile.originalName}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleRemoveImage(image.id)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
                    title="Remove from this offer"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                    title="Delete permanently"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              {/* Image info */}
              <div className="mt-2">
                <p className="text-xs text-gray-600 truncate" title={image.imageFile.originalName}>
                  {image.imageFile.originalName}
                </p>
                <p className="text-xs text-gray-400">
                  {(image.imageFile.fileSize / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No notes images uploaded yet.</p>
          <p className="text-sm">Upload images to add them to this offer.</p>
        </div>
      )}
    </div>
  );
};

export default NotesImageManager;

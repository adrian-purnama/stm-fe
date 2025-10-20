import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Save, X, Upload, Image, X as XIcon } from 'lucide-react';
import { Tooltip } from 'react-tooltip';
import toast from 'react-hot-toast';
import ApiHelper from '../../utils/ApiHelper';
import CustomDropdown from '../CustomDropdown';
import PriceInput from '../PriceInput';
import OfferItemForm from '../OfferItemForm';
import { formatPriceWithCurrency } from '../../utils/priceFormatter';

const QuotationForm = ({ quotation, onSave, onCancel, mode = 'create-quotation', stayInCurrentView = false }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    contactPerson: {
      name: '',
      gender: 'Male'
    },
    offerItems: [],
    excludePPN: false,
    notes: '',
    notesImages: []
  });

  // Debug formData changes
  useEffect(() => {
    console.log('QuotationForm: formData changed:', formData);
    console.log('QuotationForm: offerItems length:', formData.offerItems.length);
  }, [formData]);

  const [editingItemIndex, setEditingItemIndex] = useState(-1);

  const [loading, setLoading] = useState(false);
  const [quotationNumber, setQuotationNumber] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [notesImagesData, setNotesImagesData] = useState([]);
  const [pendingImages, setPendingImages] = useState([]);
  const [refreshingImages, setRefreshingImages] = useState(false);
  const [removedImages, setRemovedImages] = useState([]); // Track images removed from form // Store images to be uploaded

  // Get asset URL for notes images
  const getNotesImageAssetUrl = (imageId, fileId) => {
    const baseURL = window.location.origin.includes('localhost') ? 'http://localhost:5000' : 'http://localhost:5000';
    const token = localStorage.getItem('asb-token');
    return `${baseURL}/api/assets/notes-images/${imageId}/files/${fileId}?token=${token}`;
  };

  // Load notes images data
  const loadNotesImagesData = useCallback(async (imageIds, offerData = null) => {
    console.log('[DEBUG] loadNotesImagesData called with:', { imageIds, mode, offerData: offerData?._id });
    
    if (!imageIds || imageIds.length === 0) {
      console.log('[DEBUG] No imageIds provided, setting empty array');
      setNotesImagesData([]);
      return;
    }

    // Only load images for existing offers (edit/revision modes)
    if (mode === 'new-offer' || mode === 'create-quotation') {
      console.log('[DEBUG] New offer mode, setting empty array');
      setNotesImagesData([]);
      return;
    }

    try {
      if (!offerData) {
        console.log('[DEBUG] No offerData provided, setting empty array');
        setNotesImagesData([]);
        return;
      }

      const offerId = offerData._id;
      console.log('[DEBUG] Using offerData for images:', { offerId, notesImages: offerData.notesImages });
      
      if (offerData.notesImages && offerData.notesImages.length > 0) {
        // Check if images are populated (have imageFile property) or just ObjectIds
        const firstImage = offerData.notesImages[0];
        console.log('[DEBUG] First image:', firstImage);
        
        if (firstImage && firstImage.imageFile) {
          // Images are already populated - normalize the data structure
          const normalizedImages = offerData.notesImages.map(img => ({
            id: img._id || img.id, // Handle both _id and id
            imageFile: img.imageFile,
            createdBy: img.createdBy,
            lastAccessed: img.lastAccessed,
            createdAt: img.createdAt,
            updatedAt: img.updatedAt
          }));
          console.log('[DEBUG] Using populated images:', normalizedImages);
          setNotesImagesData(normalizedImages);
          return;
        }
      }

      // If not populated, fetch from API
      console.log('[DEBUG] Fetching images from API for offerId:', offerId);
      const response = await ApiHelper.get(`/api/notes-images/offer/${offerId}`);
      console.log('[DEBUG] API response:', response);
      
      if (response.success && response.data.images) {
        console.log('[DEBUG] Using API images:', response.data.images);
        setNotesImagesData(response.data.images);
      } else {
        console.log('[DEBUG] No images from API, setting empty array');
        setNotesImagesData([]);
      }
    } catch (error) {
      console.error('Error loading notes images:', error);
      setNotesImagesData([]);
    }
  }, [mode]);

  // Process quotation data similar to QuotationDetails
  const processedQuotation = useMemo(() => {
    console.log('[DEBUG] Processing quotation:', quotation);
    if (!quotation) return null;
    
    // Handle the same data structure as QuotationDetails
    if (quotation.header && quotation.offers) {
      // New structure from backend
      console.log('[DEBUG] Using new structure from backend');
      return quotation;
    } else if (quotation.offer && quotation.header) {
      // Structure from QuotationFormPage - this is what we expect
      console.log('[DEBUG] Using structure from QuotationFormPage');
      console.log('[DEBUG] QuotationFormPage structure - header:', quotation.header);
      console.log('[DEBUG] QuotationFormPage structure - offer:', quotation.offer);
      return quotation;
    } else if (quotation.offerNumber) {
      // Single offer structure
      console.log('[DEBUG] Using single offer structure');
      return {
        header: quotation,
        offers: [{
          original: quotation,
          revisions: []
        }]
      };
    }
    console.log('[DEBUG] Using fallback quotation structure');
    return quotation;
  }, [quotation]);

  // Get active offer similar to QuotationDetails
  const activeOffer = useMemo(() => {
    console.log('[DEBUG] Finding active offer from processedQuotation:', processedQuotation);
    if (!processedQuotation) return null;
    
    if (processedQuotation.offer) {
      // Direct offer from QuotationFormPage
      console.log('[DEBUG] Found direct offer:', processedQuotation.offer);
      return processedQuotation.offer;
    }
    
    if (processedQuotation.offers && processedQuotation.offers.length > 0) {
      // Find the first available offer (original or first revision)
      const firstOfferGroup = processedQuotation.offers[0];
      console.log('[DEBUG] First offer group:', firstOfferGroup);
      
      if (firstOfferGroup.original) {
        console.log('[DEBUG] Found original offer:', firstOfferGroup.original);
        return firstOfferGroup.original;
      } else if (firstOfferGroup.revisions && firstOfferGroup.revisions.length > 0) {
        console.log('[DEBUG] Found first revision:', firstOfferGroup.revisions[0]);
        return firstOfferGroup.revisions[0];
      }
    }
    
    console.log('[DEBUG] No active offer found');
    return null;
  }, [processedQuotation]);

  useEffect(() => {
    console.log('[DEBUG] useEffect triggered with:', { processedQuotation, activeOffer, mode });
    
    if (processedQuotation) {
      if (mode === 'new-offer') {
        // For creating new offer, keep customer info but clear product details
        const header = processedQuotation.header || processedQuotation;
        const newFormData = {
          customerName: header.customerName || '',
          contactPerson: header.contactPerson || { name: '', gender: 'Male' },
          offerItems: [],
          excludePPN: false,
          notes: '',
          notesImages: []
        };
        console.log('QuotationForm: Setting formData for new-offer:', newFormData);
        setFormData(newFormData);
        setQuotationNumber(header.quotationNumber || '');
        setNotesImagesData([]);
        setPendingImages([]);
        setRemovedImages([]); // Clear removed images when switching modes
      } else if (mode === 'edit-offer' || mode === 'revision') {
        // For edit/revision, use active offer data for product fields and header data for customer fields
        const header = processedQuotation.header || processedQuotation;
        
        console.log('[DEBUG] Edit mode - processedQuotation:', processedQuotation);
        console.log('[DEBUG] Edit mode - activeOffer:', activeOffer);
        console.log('[DEBUG] Edit mode - header:', header);
        
        if (!activeOffer) {
          console.error('QuotationForm: No active offer found for edit mode');
          console.error('QuotationForm: processedQuotation structure:', processedQuotation);
          return;
        }
        
        const editFormData = {
          customerName: header.customerName || '',
          contactPerson: header.contactPerson || { name: '', gender: 'Male' },
          offerItems: activeOffer.offerItems || [],
          excludePPN: activeOffer.excludePPN || false,
          notes: activeOffer.notes || '',
          notesImages: activeOffer.notesImages || []
        };
        console.log('QuotationForm: Setting formData for edit-offer:', editFormData);
        console.log('QuotationForm: activeOffer.offerItems:', activeOffer.offerItems);
        console.log('QuotationForm: activeOffer.notesImages:', activeOffer.notesImages);
        setFormData(editFormData);
        setQuotationNumber(header.quotationNumber || '');
        
        // Load notes images data
        if (activeOffer.notesImages && activeOffer.notesImages.length > 0) {
          loadNotesImagesData(activeOffer.notesImages, activeOffer);
        } else {
          setNotesImagesData([]);
        }
        setPendingImages([]);
        setRemovedImages([]); // Clear removed images when switching modes
      }
    } else if (mode === 'create-quotation') {
      generateQuotationNumber();
      setNotesImagesData([]);
      setPendingImages([]);
      setRemovedImages([]); // Clear removed images when switching modes
    }
  }, [processedQuotation, activeOffer, mode, loadNotesImagesData]);

  // Handle quotation changes (like when switching to edit a new revision)
  useEffect(() => {
    if (activeOffer && (mode === 'edit-offer' || mode === 'revision')) {
      if (activeOffer.notesImages && activeOffer.notesImages.length > 0) {
        console.log('Active offer changed, reloading notes images:', activeOffer.notesImages);
        loadNotesImagesData(activeOffer.notesImages, activeOffer);
      } else {
        console.log('Active offer changed, no notes images found');
        setNotesImagesData([]);
      }
    }
  }, [activeOffer, mode, loadNotesImagesData]);

  const generateQuotationNumber = async () => {
    try {
      const response = await ApiHelper.get('/api/quotations/generate/number');
      setQuotationNumber(response.data.data.quotationNumber);
    } catch (error) {
      console.error('Error generating quotation number:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedInputChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  // Notes images management functions
  const handleFileUpload = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Store files locally for preview
    const newPendingImages = files.map(file => ({
      id: `pending-${Date.now()}-${Math.random()}`,
      file: file,
      name: file.name,
      size: file.size,
      preview: URL.createObjectURL(file)
    }));

    setPendingImages(prev => [...prev, ...newPendingImages]);
    toast.success(`${files.length} image(s) selected for upload`);
    
    // Reset file input
    event.target.value = '';
  };

  const handleRemoveImage = async (imageId) => {
    try {
      console.log('Removing image with ID:', imageId);
      
      // Check if it's a pending image (starts with 'pending-' or exists in pendingImages)
      const isPendingImage = imageId.startsWith('pending-') || 
        pendingImages.some(img => img.id === imageId);
        
      if (isPendingImage) {
        console.log('Removing pending image:', imageId);
        // Remove from pending images
        setPendingImages(prev => {
          const updated = prev.filter(img => img.id !== imageId);
          // Clean up object URL to prevent memory leaks
          const removedImage = prev.find(img => img.id === imageId);
          if (removedImage && removedImage.preview) {
            URL.revokeObjectURL(removedImage.preview);
          }
          return updated;
        });
        toast.success('Image removed from selection');
        return;
      }

      // Handle existing images - just remove from form (smart deletion happens on save)
      console.log('Removing existing image from form:', imageId);
      
      // Track the removed image for smart deletion on save
      setRemovedImages(prev => [...prev, imageId]);
      
      // Remove from UI only - actual deletion will happen when form is saved
      setFormData(prev => ({
        ...prev,
        notesImages: prev.notesImages.filter(id => id !== imageId)
      }));
      setNotesImagesData(prev => prev.filter(img => img.id !== imageId));
      
      toast.success('Image removed from form. Changes will be saved when you update the quotation.');
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Failed to remove image. Please try again.');
    }
  };

  // Upload pending images and return their IDs
  const uploadPendingImages = async () => {
    console.log('[DEBUG] uploadPendingImages called with pendingImages:', pendingImages);
    if (pendingImages.length === 0) {
      console.log('[DEBUG] No pending images to upload');
      return [];
    }

    setUploadingImages(true);
    const uploadedImageIds = [];

    try {
      for (const pendingImage of pendingImages) {
        console.log('[DEBUG] Uploading pending image:', pendingImage.name);
        const formData = new FormData();
        formData.append('image', pendingImage.file);

        const uploadResponse = await ApiHelper.post('/api/notes-images/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        console.log('[DEBUG] Upload response:', uploadResponse);
        console.log('[DEBUG] Upload response data:', uploadResponse.data);
        if (uploadResponse.data && uploadResponse.data.success) {
          uploadedImageIds.push(uploadResponse.data.data.id);
          console.log('[DEBUG] Added image ID to uploadedImageIds:', uploadResponse.data.data.id);
        } else {
          console.error('[DEBUG] Upload failed or unexpected response structure:', uploadResponse);
        }
      }

      console.log('[DEBUG] All uploaded image IDs:', uploadedImageIds);

      // Clean up pending images and their object URLs
      pendingImages.forEach(img => {
        if (img.preview) {
          URL.revokeObjectURL(img.preview);
        }
      });
      setPendingImages([]);

      return uploadedImageIds;
    } catch (error) {
      console.error('Error uploading pending images:', error);
      throw error;
    } finally {
      setUploadingImages(false);
    }
  };

  // Handle smart deletion of removed images
  const handleSmartDeletionOfRemovedImages = async () => {
    if (removedImages.length === 0) return;

    const offerId = quotation.offer?._id || quotation._id;
    if (!offerId) {
      console.warn('Cannot perform smart deletion: Offer ID not found');
      return;
    }

    console.log('Performing smart deletion for removed images:', removedImages);

    for (const imageId of removedImages) {
      try {
        const response = await ApiHelper.delete(`/api/notes-images/offer/${offerId}/remove/${imageId}`);
        if (response.success) {
          const { deletionResult, usageCount } = response.data;
          console.log(`Smart deletion result for image ${imageId}:`, deletionResult, usageCount);
        } else {
          console.warn(`Failed to delete image ${imageId}:`, response.message);
        }
      } catch (error) {
        console.error(`Error performing smart deletion for image ${imageId}:`, error);
      }
    }

    // Clear the removed images list after processing
    setRemovedImages([]);
  };

  // Offer item management functions
  const addOfferItem = () => {
    console.log('QuotationForm addOfferItem called');
    console.log('Current offerItems length:', formData.offerItems.length);
    console.log('Setting editingItemIndex to:', formData.offerItems.length);
    setEditingItemIndex(formData.offerItems.length);
  };

  const saveOfferItem = (itemData) => {
    console.log('QuotationForm saveOfferItem called with:', itemData);
    console.log('Current editingItemIndex:', editingItemIndex);
    console.log('Current offerItems length:', formData.offerItems.length);
    console.log('Current offerItems:', formData.offerItems);
    
    if (editingItemIndex >= 0 && editingItemIndex < formData.offerItems.length) {
      // Editing existing item
      console.log('Editing existing item at index:', editingItemIndex);
      setFormData(prev => {
        const newOfferItems = prev.offerItems.map((item, index) => 
          index === editingItemIndex ? itemData : item
        );
        console.log('New offerItems after editing:', newOfferItems);
        return {
          ...prev,
          offerItems: newOfferItems
        };
      });
    } else {
      // Adding new item
      console.log('Adding new item - editingItemIndex:', editingItemIndex, 'offerItems.length:', formData.offerItems.length);
      setFormData(prev => {
        const newOfferItems = [...prev.offerItems, itemData];
        console.log('New offerItems after adding:', newOfferItems);
        console.log('Previous offerItems:', prev.offerItems);
        return {
          ...prev,
          offerItems: newOfferItems
        };
      });
    }
    console.log('Setting editingItemIndex to -1');
    setEditingItemIndex(-1);
    console.log('saveOfferItem completed');
  };

  const cancelEditItem = () => {
    setEditingItemIndex(-1);
  };

  const deleteOfferItem = (index) => {
    setFormData(prev => ({
      ...prev,
      offerItems: prev.offerItems.filter((_, i) => i !== index)
    }));
  };

  const editOfferItem = (index) => {
    setEditingItemIndex(index);
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    console.log('[DEBUG] Form submission started');
    console.log('[DEBUG] Current pendingImages:', pendingImages);
    console.log('[DEBUG] Current formData.notesImages:', formData.notesImages);

    try {
      // Upload pending images first
      const uploadedImageIds = await uploadPendingImages();
      const allNotesImages = [...formData.notesImages, ...uploadedImageIds];
      
      console.log('[DEBUG] Form submission - formData.notesImages:', formData.notesImages);
      console.log('[DEBUG] Form submission - uploadedImageIds:', uploadedImageIds);
      console.log('[DEBUG] Form submission - allNotesImages:', allNotesImages);

      if (mode === 'create-quotation') {
        // Create new quotation (header + first offer)
        const headerData = {
          customerName: formData.customerName,
          contactPerson: formData.contactPerson
        };
        
        const offerData = {
          offerItems: formData.offerItems,
          excludePPN: formData.excludePPN,
          notes: formData.notes,
          notesImages: allNotesImages
        };

        console.log('Creating quotation with data:', { headerData, offerData });
        console.log('Offer items being sent:', formData.offerItems);
        console.log('Notes images being sent:', allNotesImages);
        console.log('Uploaded image IDs:', uploadedImageIds);

        await ApiHelper.post('/api/quotations', { headerData, offerData });
        toast.success('Quotation created successfully');
        
        // Clear pending images since they've been uploaded
        setPendingImages([]);
      } else if (mode === 'new-offer') {
        // Create additional offer
        const offerData = {
          offerItems: formData.offerItems,
          excludePPN: formData.excludePPN,
          notes: formData.notes,
          notesImages: allNotesImages
        };

        console.log('Creating new offer with data:', offerData);
        console.log('Notes images being sent:', allNotesImages);
        console.log('Uploaded image IDs:', uploadedImageIds);
        console.log('Form data offerItems:', formData.offerItems);
        console.log('Form data offerItems length:', formData.offerItems.length);
        console.log('Offer data offerItems:', offerData.offerItems);
        console.log('Offer data offerItems length:', offerData.offerItems.length);
        
        // Use quotation ID instead of quotation number
        const quotationId = quotation.header?._id || quotation._id;
        console.log('Using quotation ID:', quotationId);
        await ApiHelper.post(`/api/quotations/${quotationId}/offers`, offerData);
        toast.success('New offer created successfully');
        
        // Clear pending images since they've been uploaded
        setPendingImages([]);
      } else if (mode === 'revision') {
        // Create a revision of the current offer
        // For revisions, only send new images - backend will copy parent images
        const offerData = {
          offerItems: formData.offerItems,
          excludePPN: formData.excludePPN,
          notes: formData.notes,
          notesImages: uploadedImageIds, // Only new images, backend will merge with parent
          isRevision: true,
          parentOfferId: quotation.offer?._id || quotation._id
        };

        // Use quotation ID instead of quotation number
        const quotationId = quotation.header?._id || quotation._id;
        console.log('Creating revision with data:', offerData);
        console.log('Notes images being sent (new only):', uploadedImageIds);
        console.log('Uploaded image IDs:', uploadedImageIds);
        console.log('Using quotation ID:', quotationId);
        const response = await ApiHelper.post(`/api/quotations/${quotationId}/offers`, offerData);
        console.log('Revision creation response:', response);
        console.log('Response data:', response.data);
        console.log('Response data.data:', response.data.data);
        toast.success('Revision created successfully');
        
        // Clear pending images since they've been uploaded
        setPendingImages([]);
        
        // After creating revision, switch to edit mode for the new revision
        if (response.data.data && onSave) {
          // Always refresh notes images data for the new revision
          setRefreshingImages(true);
          try {
            const newOfferId = response.data.data._id;
            const refreshResponse = await ApiHelper.get(`/api/notes-images/offer/${newOfferId}`);
            if (refreshResponse.success && refreshResponse.data.images) {
              setNotesImagesData(refreshResponse.data.images);
              // Update formData.notesImages to match the refreshed data
              setFormData(prev => ({
                ...prev,
                notesImages: refreshResponse.data.images.map(img => img.id || img._id)
              }));
            } else {
              // If no images returned, clear the data
              setNotesImagesData([]);
              setFormData(prev => ({
                ...prev,
                notesImages: []
              }));
            }
          } catch (error) {
            console.error('Error refreshing notes images for new revision:', error);
            // Fallback: use the current allNotesImages
            setNotesImagesData([]);
            setFormData(prev => ({
              ...prev,
              notesImages: allNotesImages
            }));
          } finally {
            setRefreshingImages(false);
          }
          
          console.log('Calling onSave with context:', {
            mode: 'edit-revision',
            header: quotation.header || quotation,
            offer: response.data.data,
            newRevision: true
          });
          onSave({
            mode: 'edit-revision',
            header: quotation.header || quotation,
            offer: response.data.data,
            newRevision: true
          });
          return; // Don't call the default onSave
        }
      } else {
        // Edit existing offer
        const offerData = {
          offerItems: formData.offerItems,
          excludePPN: formData.excludePPN,
          notes: formData.notes,
          notesImages: allNotesImages
        };

        const offerId = quotation.offer?._id || quotation._id;
        // Use quotation ID instead of quotation number
        const quotationId = quotation.header?._id || quotation._id;
        console.log('Updating offer with data:', offerData);
        console.log('Notes images being sent:', allNotesImages);
        console.log('Uploaded image IDs:', uploadedImageIds);
        console.log('Using quotation ID:', quotationId);
        await ApiHelper.put(`/api/quotations/${quotationId}/offers/${offerId}`, offerData);
        toast.success('Quotation updated successfully');
        
        // Handle smart deletion of removed images
        await handleSmartDeletionOfRemovedImages();
        
        // Clear the removed images tracking since we've processed them
        setRemovedImages([]);
        
        // Simple approach: just refresh from the API after a short delay
        setTimeout(async () => {
          setRefreshingImages(true);
          try {
            // Use the offer ID that was just updated
            const offerId = quotation.offer?._id || quotation._id;
            console.log('Refreshing images for offerId:', offerId, 'quotation:', quotation);
            const response = await ApiHelper.get(`/api/notes-images/offer/${offerId}`);
            console.log('Refresh response:', response);
            
            if (response.success && response.data && response.data.images) {
              console.log('Setting refreshed images:', response.data.images);
              setNotesImagesData(response.data.images);
              setFormData(prev => ({
                ...prev,
                notesImages: response.data.images.map(img => img.id || img._id)
              }));
            } else {
              console.log('No images returned from API, but keeping current state to avoid clearing');
              // Don't clear the data if API returns empty - might be a timing issue
              // The images should still be there from the save operation
            }
          } catch (error) {
            console.error('Error refreshing notes images after update:', error);
            // If refresh fails, at least keep the current state
            console.log('Keeping current state due to refresh error');
          } finally {
            setRefreshingImages(false);
          }
        }, 1000); // 1 second delay to ensure server has processed everything
        
        // Clear pending images since they've been uploaded
        setPendingImages([]);
      }

      onSave && onSave({ stayInCurrentView });
    } catch (error) {
      toast.error(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Stay in current view indicator */}
      {stayInCurrentView && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Stay in current view</strong> is enabled. After saving, you'll remain in edit mode.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6" key={`${mode}-${quotation?._id || 'new'}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {mode === 'create-quotation' && 'Create New Quotation'}
          {mode === 'edit-offer' && 'Edit Quotation'}
          {mode === 'revision' && 'Create Quotation Revision'}
          {mode === 'new-offer' && 'Create New Offer'}
        </h2>
        {quotationNumber && (
          <div className="text-sm text-gray-600">
            Quotation Number: <span className="font-mono font-medium">{quotationNumber}</span>
            {quotation && quotation.revision > 0 && (
              <span className="ml-2 text-purple-600 font-medium">(Rev. {quotation.revision})</span>
            )}
          </div>
        )}
      </div>

      {/* Basic Information */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Name (Company) *
            </label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => handleInputChange('customerName', e.target.value)}
              readOnly={mode === 'new-offer' || mode === 'edit-offer' || mode === 'revision'}
              disabled={mode === 'new-offer' || mode === 'edit-offer' || mode === 'revision'}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                mode === 'new-offer' || mode === 'edit-offer' || mode === 'revision'
                  ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="e.g., PT Sejahtera"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Person Name *
            </label>
            <input
              type="text"
              value={formData.contactPerson.name}
              onChange={(e) => handleNestedInputChange('contactPerson', 'name', e.target.value)}
              readOnly={mode === 'new-offer' || mode === 'edit-offer' || mode === 'revision'}
              disabled={mode === 'new-offer' || mode === 'edit-offer' || mode === 'revision'}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                mode === 'new-offer' || mode === 'edit-offer' || mode === 'revision'
                  ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="Contact person name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Person Gender *
            </label>
            <CustomDropdown
              options={[
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other', label: 'Other' }
              ]}
              value={formData.contactPerson.gender}
              onChange={(value) => handleNestedInputChange('contactPerson', 'gender', value)}
              disabled={mode === 'new-offer' || mode === 'edit-offer' || mode === 'revision'}
              placeholder="Select gender"
              required={true}
              className={mode === 'new-offer' || mode === 'edit-offer' || mode === 'revision' ? 'opacity-50 cursor-not-allowed' : ''}
            />
          </div>
        </div>
      </div>

      {/* Offer Items */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Offer Items</h3>
          <button
            type="button"
            onClick={addOfferItem}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </button>
        </div>
        
        <div className="space-y-6">
          {formData.offerItems.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg">
              {editingItemIndex === index ? (
                <OfferItemForm
                  item={item}
                  index={index}
                  isEditing={true}
                  onSave={saveOfferItem}
                  onCancel={cancelEditItem}
                />
              ) : (
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">Item {index + 1}</h4>
                      <p className="text-sm text-gray-600">{item.karoseri} - {item.chassis}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => editOfferItem(index)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteOfferItem(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Quantity:</span>
                      <p className="font-medium">1</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Base Price:</span>
                      <p className="font-medium">{formatPriceWithCurrency(item.price)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Netto:</span>
                      <p className="font-medium">{formatPriceWithCurrency(item.netto)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Total:</span>
                      <p className="font-medium">{formatPriceWithCurrency(item.netto)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {editingItemIndex === formData.offerItems.length && (
            <OfferItemForm
              key={`new-item-${editingItemIndex}`}
              index={formData.offerItems.length}
              isEditing={true}
              onSave={saveOfferItem}
              onCancel={cancelEditItem}
            />
          )}
          
          {formData.offerItems.length === 0 && editingItemIndex === -1 && (
            <div className="text-center py-8 text-gray-500">
              <p>No items added yet. Click "Add Item" to start adding karoseri and chassis combinations.</p>
            </div>
          )}
        </div>
      </div>

      {/* Offer Summary */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Offer Summary</h3>
        
        {formData.offerItems.length > 0 ? (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{formData.offerItems.length}</div>
                <div className="text-sm text-gray-600">Total Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatPriceWithCurrency(
                    formData.offerItems.reduce((sum, item) => sum + item.price, 0)
                  )}
                </div>
                <div className="text-sm text-gray-600">Total Base Price</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatPriceWithCurrency(
                    formData.offerItems.reduce((sum, item) => sum + item.netto, 0)
                  )}
                </div>
                <div className="text-sm text-gray-600">Total Netto Price</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Add items to see offer summary</p>
          </div>
        )}

        {/* Offer-level Settings */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="excludePPN"
              checked={formData.excludePPN}
              onChange={(e) => handleInputChange('excludePPN', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="excludePPN" className="ml-2 block text-sm text-gray-700">
              Exclude PPN (VAT) - Prices do not include tax
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Offer Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes for this offer..."
            />
          </div>

          {/* Notes Images Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes Images
              {refreshingImages && (
                <span className="ml-2 text-xs text-blue-600">
                  <svg className="inline-block animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Refreshing...
                </span>
              )}
            </label>
            
            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center mb-4">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploadingImages}
                className="hidden"
                id="notes-image-upload"
              />
              <label
                htmlFor="notes-image-upload"
                className={`cursor-pointer ${uploadingImages ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-gray-500">
                  {uploadingImages ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
                      Uploading...
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        Click to select images or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF up to 10MB each
                      </p>
                      <p className="text-xs text-blue-500 mt-1">
                        Images will be uploaded when you save the form
                      </p>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Images Grid */}
            {(notesImagesData.length > 0 || pendingImages.length > 0) && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Existing images */}
                {notesImagesData.map((imageData, index) => {
                  // Handle both populated objects and ObjectIds (same as QuotationDetails)
                  const imageId = imageData._id || imageData.id || imageData;
                  const imageFile = imageData.imageFile;
                  const originalName = imageFile?.originalName || `Notes Image ${index + 1}`;
                  const fileId = imageFile?.fileId;
                  
                  console.log('[DEBUG] Rendering notes image:', { imageData, imageId, fileId, originalName });
                  
                  return (
                    <div key={imageId} className="relative group">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        {fileId ? (
                          <img
                            src={getNotesImageAssetUrl(imageId, fileId)}
                            alt={originalName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Failed to load notes image:', e.target.src);
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-gray-400 text-sm">Loading...</span>
                          </div>
                        )}
                        <div className="w-full h-full items-center justify-center text-gray-400 text-sm hidden">
                          Failed to load
                        </div>
                      </div>
                      
                      {/* Remove button */}
                      <button
                        onClick={() => handleRemoveImage(imageId)}
                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                      
                      {/* Image info */}
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 truncate" title={originalName}>
                          {originalName}
                        </p>
                        {imageFile?.fileSize && (
                          <p className="text-xs text-gray-400">
                            {(imageFile.fileSize / 1024 / 1024).toFixed(2)} MB
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Pending images */}
                {pendingImages.map((pendingImage) => (
                  <div key={pendingImage.id} className="relative group">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-blue-300">
                      <img
                        src={pendingImage.preview}
                        alt={pendingImage.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Remove button */}
                    <button
                      onClick={() => handleRemoveImage(pendingImage.id)}
                      className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove image"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                    
                    {/* Image info */}
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 truncate" title={pendingImage.name}>
                        {pendingImage.name}
                      </p>
                      <p className="text-xs text-blue-500">
                        {(pendingImage.size / 1024 / 1024).toFixed(2)} MB (pending)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {notesImagesData.length === 0 && pendingImages.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">No images selected yet.</p>
                <p className="text-xs">Select images to add them to this offer.</p>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Actions */}
      <div className="flex justify-between">
        <div />
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={onCancel}
            data-tooltip-id="cancel-tooltip"
            data-tooltip-content="Cancel and discard changes"
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            data-tooltip-id="save-tooltip"
            data-tooltip-content={loading ? 'Saving...' : 
              mode === 'create-quotation' ? 'Create new quotation' : 
              mode === 'new-offer' ? 'Create new offer' :
              mode === 'revision' ? 'Create revision' : 'Update quotation'}
            className={`flex items-center px-4 py-2 text-white rounded-md disabled:opacity-50 ${
              mode === 'new-offer'
                ? 'bg-green-600 hover:bg-green-700'
                : mode === 'revision'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 
              mode === 'create-quotation' ? 'Create Quotation' : 
              mode === 'new-offer' ? 'Create Offer' :
              mode === 'revision' ? 'Create Revision' : 'Update Quotation'}
          </button>
        </div>
      </div>

      {/* Tooltips */}
      <Tooltip id="edit-mode-tooltip" />
      <Tooltip id="revision-mode-tooltip" />
      <Tooltip id="add-offer-tooltip" />
      <Tooltip id="cancel-tooltip" />
      <Tooltip id="save-tooltip" />
    </form>
    </div>
  );
};

export default QuotationForm;
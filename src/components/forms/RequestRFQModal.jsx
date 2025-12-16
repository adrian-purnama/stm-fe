import { useState, useEffect, useRef } from 'react';
import { Plus, X, Search, Paperclip, Download, Trash2 } from 'lucide-react';
import BaseModal from '../modals/BaseModal';
import CustomDropdown from '../common/CustomDropdown';
import PriceInput from '../common/PriceInput';
import toast from 'react-hot-toast';
import axiosInstance from '../../utils/api/ApiHelper';
import DrawingSpecificationSelector from '../drawings/DrawingSpecificationSelector';

const DEFAULT_PAYMENT_TERMS = 'Payment DP 50% sisa cash before delivery';
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];
const ALLOWED_DOCUMENT_EXTENSIONS = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp';
const ALLOWED_DOCUMENT_EXTENSION_LIST = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

const RequestRFQModal = ({ isOpen, onClose, onSubmit, approvers, quotationCreators, engineers, rfqToEdit }) => {
  const [formData, setFormData] = useState({
    approverId: '',
    quotationCreatorId: '',
    engineeringId: '',
    description: '',
    customerName: '',
    contactPerson: {
      name: '',
      gender: 'Male'
    },
    customerContacts: [],
    endUser: '',
    priority: 'medium',
    expectedDeliveryDate: '',
    confidenceRate: '',
    deliveryLocation: '',
    competitor: '',
    canMake: false,
    projectOngoing: false,
    lineOfBusiness: {
      type: 'karoseri'
    },
    targetCloseDate: '',
    deliveryTerms: '',
    deliveryNotes: '',
    paymentTermsOption: 'default',
    paymentTermsCustom: '',
    isTaxIncluded: false,
    includePPN: true,
    inclusionNotes: '',
    exclusionNotes: '',
    items: []
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [bodyTypes, setBodyTypes] = useState([]);
  const [chassisTypes, setChassisTypes] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [loadingBodyTypes, setLoadingBodyTypes] = useState(false);
  const [loadingChassisTypes, setLoadingChassisTypes] = useState(false);
  const [loadingDrawings, setLoadingDrawings] = useState(false);

  // State for drawing specification selector modal
  const [showDrawingSelector, setShowDrawingSelector] = useState(false);
  const [drawingSelectorItemIndex, setDrawingSelectorItemIndex] = useState(null);

  // State for drawing specification selector modal
  const [drawingSearchTerm, setDrawingSearchTerm] = useState('');
  const [selectedBodyTypeFilter, setSelectedBodyTypeFilter] = useState('');
  const [selectedChassisTypeFilter, setSelectedChassisTypeFilter] = useState('');
  const [selectedSizeTypeFilter, setSelectedSizeTypeFilter] = useState('');
  const [filteredDrawings, setFilteredDrawings] = useState([]);
  const [sizeTypes, setSizeTypes] = useState([]);
  const [documentFiles, setDocumentFiles] = useState([]);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [documentsToDelete, setDocumentsToDelete] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  // Refs for specification input fields to manage focus
  const specInputRefs = useRef({});

  // Fetch master data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchBodyTypes();
      fetchChassisTypes();
      fetchDrawings();
      fetchSizeTypes();
    }
  }, [isOpen]);

  // Fetch size types for drawing selector (used only for legacy inline selector; kept for compatibility where referenced)
  const fetchSizeTypes = async () => {
    try {
      const response = await axiosInstance.get('/api/size-types/list');
      if (response.data?.success && response.data?.data) {
        setSizeTypes(response.data.data);
      }
    } catch (error) {
      console.error('Error loading size types:', error);
    }
  };

  const fetchRfqDocuments = async (rfqId) => {
    setDocumentsLoading(true);
    try {
      const response = await axiosInstance.get(`/api/rfq/${rfqId}/documents`);
      const docs = response.data?.data?.documents || [];
      setExistingDocuments(docs);
      setDocumentsToDelete([]);
    } catch (error) {
      console.error('Error loading RFQ documents:', error);
      toast.error('Failed to load RFQ documents');
      setExistingDocuments([]);
      setDocumentsToDelete([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && rfqToEdit?._id) {
      fetchRfqDocuments(rfqToEdit._id);
    } else if (isOpen && !rfqToEdit) {
      setExistingDocuments([]);
      setDocumentsToDelete([]);
    }

    if (!isOpen) {
      setDocumentFiles([]);
      setDocumentsToDelete([]);
    }
  }, [isOpen, rfqToEdit]);

  // Open drawing selector modal
  const openDrawingSelector = (itemIndex) => {
    setDrawingSelectorItemIndex(itemIndex);
    setShowDrawingSelector(true);
    // Reset any local selector-related filters
    setDrawingSearchTerm('');
    setSelectedBodyTypeFilter('');
    setSelectedChassisTypeFilter('');
    setSelectedSizeTypeFilter('');
  };

  // Handle drawing selection from modal
  const handleDrawingSelection = (drawing) => {
    if (drawingSelectorItemIndex === null) return;

    const itemIndex = drawingSelectorItemIndex;
    updateItem(itemIndex, 'templateSourceId', drawing._id);
    updateItem(itemIndex, 'templateSourceModel', 'DrawingSpecification');
    updateItem(itemIndex, 'drawingSpecification', drawing._id);

    // Populate fields from drawing
    if (drawing.bodyTypeId) {
      const bodyTypeId = typeof drawing.bodyTypeId === 'object'
        ? drawing.bodyTypeId._id || drawing.bodyTypeId
        : drawing.bodyTypeId;
      updateItem(itemIndex, 'bodyTypeId', bodyTypeId);
      updateItem(itemIndex, 'karoseri', drawing.bodyTypeId?.name || '');
    }

    if (drawing.chassisTypeId) {
      const chassisTypeId = typeof drawing.chassisTypeId === 'object'
        ? drawing.chassisTypeId._id || drawing.chassisTypeId
        : drawing.chassisTypeId;
      updateItem(itemIndex, 'chassisTypeId', chassisTypeId);
      updateItem(itemIndex, 'chassis', drawing.chassisTypeId?.name || '');
    }

    if (drawing.chassisModel) {
      updateItem(itemIndex, 'chassisModel', drawing.chassisModel);
    }

    if (drawing.customSpecifications) {
      updateItem(itemIndex, 'specifications', drawing.customSpecifications);
    }

    toast.success('Drawing template loaded with all details!');
    setShowDrawingSelector(false);
    setDrawingSelectorItemIndex(null);
  };

  const formatFileSize = (bytes = 0) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleDocumentInputChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    const acceptedFiles = [];

    files.forEach((file) => {
      if (file.size > MAX_DOCUMENT_SIZE) {
        toast.error(`${file.name} is larger than ${MAX_DOCUMENT_SIZE / (1024 * 1024)}MB`);
        return;
      }

      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const mimeAllowed = file.type ? ALLOWED_DOCUMENT_TYPES.includes(file.type) : false;
      const extensionAllowed = ALLOWED_DOCUMENT_EXTENSION_LIST.includes(extension);

      if (!mimeAllowed && !extensionAllowed) {
        toast.error(`${file.name} is not an allowed file type`);
        return;
      }

      const id = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      acceptedFiles.push({ id, file });
    });

    if (acceptedFiles.length > 0) {
      setDocumentFiles((prev) => [...prev, ...acceptedFiles]);
    }

    if (event.target) {
      event.target.value = '';
    }
  };

  const removeNewDocument = (id) => {
    setDocumentFiles((prev) => prev.filter((doc) => doc.id !== id));
  };

  const markDocumentForDeletion = (documentId) => {
    setDocumentsToDelete((prev) => (prev.includes(documentId) ? prev : [...prev, documentId]));
    setExistingDocuments((prev) => prev.filter((doc) => doc._id !== documentId));
  };

  const handleDownloadDocument = async (docEntry) => {
    try {
      const response = await axiosInstance.get(`/api/rfq/documents/${docEntry._id}/download`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: docEntry.mimeType || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = docEntry.originalName || 'document';
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  useEffect(() => {
    if (isOpen && rfqToEdit) {
      // Get RFQ-level bodyTypeId and chassisTypeId (handle both populated objects and plain IDs)
      const rfqBodyTypeId = rfqToEdit.bodyTypeId?._id || rfqToEdit.bodyTypeId || null;
      const rfqChassisTypeId = rfqToEdit.chassisTypeId?._id || rfqToEdit.chassisTypeId || null;

      // Deep copy items and migrate old serviceDetail to serviceDetails array
      const migratedItems = Array.isArray(rfqToEdit.items) ? JSON.parse(JSON.stringify(rfqToEdit.items)).map(item => {
        // For service items: migrate old serviceDetail to serviceDetails array if needed
        if (rfqToEdit.lineOfBusiness?.type === 'service' && item.serviceDetail && !Array.isArray(item.serviceDetails)) {
          item.serviceDetails = [item.serviceDetail];
          delete item.serviceDetail; // Remove old field
        }

        // For karoseri items: populate bodyTypeId and chassisTypeId from RFQ level if not already set
        if (rfqToEdit.lineOfBusiness?.type === 'karoseri') {
          // Determine bodyTypeId - check existing fields first, then RFQ level
          let resolvedBodyTypeId = null;
          if (item.bodyTypeId) {
            resolvedBodyTypeId = typeof item.bodyTypeId === 'object' && item.bodyTypeId !== null
              ? item.bodyTypeId._id || item.bodyTypeId.id || null
              : item.bodyTypeId;
          } else if (item.templateSourceId && item.templateSourceModel === 'BodyType') {
            // If templateSourceId exists and points to BodyType, use it
            resolvedBodyTypeId = typeof item.templateSourceId === 'object' && item.templateSourceId !== null
              ? item.templateSourceId._id || item.templateSourceId.id || null
              : item.templateSourceId;
          } else if (rfqBodyTypeId) {
            // Otherwise, use RFQ-level bodyTypeId
            resolvedBodyTypeId = rfqBodyTypeId;
          }

          // Set bodyTypeId
          if (resolvedBodyTypeId) {
            item.bodyTypeId = resolvedBodyTypeId;
            // Also set templateSourceId (form uses this for dropdown)
            // Handle case where templateSourceId might be a populated object
            const currentTemplateSourceId =
              item.templateSourceId && typeof item.templateSourceId === 'object'
                ? item.templateSourceId._id || item.templateSourceId.id || null
                : item.templateSourceId || null;

            // Set templateSourceId if not already set or if it doesn't match bodyTypeId
            if (!currentTemplateSourceId || currentTemplateSourceId !== resolvedBodyTypeId) {
              item.templateSourceId = resolvedBodyTypeId;
              item.templateSourceModel = 'BodyType';
            } else {
              // Ensure templateSourceId is a string ID, not an object
              item.templateSourceId = currentTemplateSourceId;
              if (!item.templateSourceModel) {
                item.templateSourceModel = 'BodyType';
              }
            }
          }

          // Populate chassisTypeId from RFQ level if not already set
          if (!item.chassisTypeId && rfqChassisTypeId) {
            item.chassisTypeId = rfqChassisTypeId;
          }

          // Ensure templateMode is set (default to 'manual' if not set)
          if (!item.templateMode) {
            // If templateSourceId exists and templateSourceModel is 'BodyType', set to 'bodyType'
            if (item.templateSourceId && item.templateSourceModel === 'BodyType') {
              item.templateMode = 'bodyType';
            } else if (item.templateSourceId && item.templateSourceModel === 'DrawingSpecification') {
              item.templateMode = 'drawing';
            } else {
              item.templateMode = 'manual';
            }
          }
        }

        return item;
      }) : [];

      const existingIsTaxIncluded = !!rfqToEdit.isTaxIncluded;
      let existingIncludePPN = typeof rfqToEdit.includePPN === 'boolean' ? rfqToEdit.includePPN : !existingIsTaxIncluded;
      if (existingIsTaxIncluded) {
        existingIncludePPN = false;
      } else if (!existingIncludePPN) {
        existingIncludePPN = true;
      }

      setFormData({
        approverId: rfqToEdit.approverId?._id || '',
        quotationCreatorId: rfqToEdit.quotationCreatorId?._id || '',
        engineeringId: rfqToEdit.engineeringId || '',
        description: rfqToEdit.description || '',
        customerName: rfqToEdit.customerName || '',
        contactPerson: rfqToEdit.contactPerson || { name: '', gender: 'Male' },
        customerContacts: rfqToEdit.customerContacts || [],
        endUser: rfqToEdit.endUser || '',
        priority: rfqToEdit.priority || 'medium',
        expectedDeliveryDate: rfqToEdit.expectedDeliveryDate ? rfqToEdit.expectedDeliveryDate.substr(0, 10) : '',
        confidenceRate: rfqToEdit.confidenceRate || '',
        deliveryLocation: rfqToEdit.deliveryLocation || '',
        competitor: rfqToEdit.competitor || '',
        canMake: typeof rfqToEdit.canMake === 'boolean' ? rfqToEdit.canMake : false,
        projectOngoing: typeof rfqToEdit.projectOngoing === 'boolean' ? rfqToEdit.projectOngoing : false,
        lineOfBusiness: rfqToEdit.lineOfBusiness || { type: 'karoseri' },
        targetCloseDate: rfqToEdit.targetCloseDate ? rfqToEdit.targetCloseDate.substr(0, 10) : '',
        deliveryTerms: rfqToEdit.deliveryTerms || '',
        deliveryNotes: rfqToEdit.deliveryNotes || '',
        paymentTermsOption: rfqToEdit.paymentTerms && rfqToEdit.paymentTerms !== DEFAULT_PAYMENT_TERMS ? 'custom' : 'default',
        paymentTermsCustom: rfqToEdit.paymentTerms && rfqToEdit.paymentTerms !== DEFAULT_PAYMENT_TERMS ? rfqToEdit.paymentTerms : '',
        isTaxIncluded: existingIsTaxIncluded,
        includePPN: existingIncludePPN,
        inclusionNotes: rfqToEdit.inclusionNotes || '',
        exclusionNotes: rfqToEdit.exclusionNotes || '',
        items: migratedItems
      });
    } else if (isOpen && !rfqToEdit) {
      setFormData({
        approverId: '', quotationCreatorId: '', engineeringId: '',
        description: '', customerName: '', contactPerson: { name: '', gender: 'Male' },
        customerContacts: [],
        endUser: '',
        priority: 'medium', expectedDeliveryDate: '', confidenceRate: '', estimatedRevenue: '',
        deliveryLocation: '',
        competitor: '', canMake: false, projectOngoing: false, lineOfBusiness: { type: 'karoseri' },
        targetCloseDate: '',
        deliveryTerms: '',
        deliveryNotes: '',
        paymentTermsOption: 'default',
        paymentTermsCustom: '',
        isTaxIncluded: false,
        includePPN: true,
        inclusionNotes: '',
        exclusionNotes: '',
        items: []
      });
    }
  }, [isOpen, rfqToEdit]);

  const fetchBodyTypes = async () => {
    setLoadingBodyTypes(true);
    try {
      const response = await axiosInstance.get('/api/body-types/list');
      console.log('[RFQ] Body types response:', response.data);
      if (response.data && response.data.success) {
        const bodyTypesData = response.data.data || [];
        setBodyTypes(Array.isArray(bodyTypesData) ? bodyTypesData : []);
        console.log('[RFQ] Body types set:', bodyTypesData);
      } else {
        console.warn('[RFQ] Body types response format unexpected:', response.data);
        setBodyTypes([]);
      }
    } catch (error) {
      console.error('Error fetching body types:', error);
      toast.error('Failed to load body types');
      setBodyTypes([]);
    } finally {
      setLoadingBodyTypes(false);
    }
  };

  const fetchChassisTypes = async () => {
    setLoadingChassisTypes(true);
    try {
      const response = await axiosInstance.get('/api/chassis-types/list');
      console.log('[RFQ] Chassis types response:', response.data);
      if (response.data && response.data.success) {
        const chassisTypesData = response.data.data || [];
        setChassisTypes(Array.isArray(chassisTypesData) ? chassisTypesData : []);
        console.log('[RFQ] Chassis types set:', chassisTypesData);
      } else {
        console.warn('[RFQ] Chassis types response format unexpected:', response.data);
        setChassisTypes([]);
      }
    } catch (error) {
      console.error('Error fetching chassis types:', error);
      toast.error('Failed to load chassis types');
      setChassisTypes([]);
    } finally {
      setLoadingChassisTypes(false);
    }
  };

  const fetchDrawings = async () => {
    setLoadingDrawings(true);
    try {
      const response = await axiosInstance.get('/api/drawing-specifications');
      console.log('[RFQ] Drawings fetch response:', response.data);
      if (response.data && response.data.success) {
        const drawingsData = response.data.data || [];
        setDrawings(Array.isArray(drawingsData) ? drawingsData : []);
        console.log('[RFQ] Set drawings:', drawingsData);
      } else {
        console.warn('[RFQ] Drawings response format unexpected:', response.data);
        setDrawings([]);
      }
    } catch (error) {
      console.error('Error fetching drawings:', error);
      toast.error('Failed to load drawings');
      setDrawings([]);
    } finally {
      setLoadingDrawings(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleNestedInputChange = (parentField, childField, value) => {
    setFormData(prev => ({
      ...prev,
      [parentField]: {
        ...prev[parentField],
        [childField]: value
      }
    }));

    // Clear error when user starts typing
    const errorKey = `${parentField}.${childField}`;
    if (errors[errorKey]) {
      setErrors(prev => ({
        ...prev,
        [errorKey]: ''
      }));
    }
  };

  const taxSelection = formData.isTaxIncluded ? 'inclusive' : 'include_ppn';

  const handleTaxSelectionChange = (value) => {
    setFormData(prev => ({
      ...prev,
      isTaxIncluded: value === 'inclusive',
      includePPN: value === 'include_ppn'
    }));
  };

  // Item management functions
  const addItem = () => {
    const lineOfBusinessType = formData.lineOfBusiness?.type || 'karoseri';
    const newItem = {
      quantity: 1,
      estimatedRevenue: 0,
      notes: ''
    };

    // Type-specific fields
    if (lineOfBusinessType === 'karoseri') {
      newItem.karoseri = '';
      newItem.chassis = '';
      newItem.chassisModel = '';
      newItem.chassisTypeId = '';
      newItem.bodyTypeId = '';
      newItem.templateMode = 'manual';
      newItem.templateSourceId = '';
      newItem.drawingSpecification = '';
      newItem.specifications = [];
    } else if (lineOfBusinessType === 'service') {
      newItem.serviceName = '';
      newItem.serviceDetails = [''];
    } else if (lineOfBusinessType === 'sparepart') {
      newItem.sparepartName = '';
      newItem.pricePerUnit = 0;
    }
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  // Customer contacts management functions
  const addCustomerContact = () => {
    setFormData(prev => ({
      ...prev,
      customerContacts: [...prev.customerContacts, { key: '', value: '' }]
    }));
  };

  // Add default contacts if none exist (only on new RFQ creation)
  useEffect(() => {
    if (isOpen && !rfqToEdit) {
      setFormData(prev => {
        // Only add defaults if customerContacts is empty
        if (prev.customerContacts && prev.customerContacts.length === 0) {
          return {
            ...prev,
            customerContacts: [
              { key: 'Phone', value: '' },
              { key: 'Email', value: '' }
            ]
          };
        }
        return prev;
      });
    }
  }, [isOpen, rfqToEdit]);

  const removeCustomerContact = (index) => {
    setFormData(prev => ({
      ...prev,
      customerContacts: prev.customerContacts.filter((_, i) => i !== index)
    }));
  };

  const updateCustomerContact = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      customerContacts: prev.customerContacts.map((contact, i) =>
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  // Service details management functions
  const addServiceDetail = (itemIndex) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === itemIndex
          ? { ...item, serviceDetails: [...(item.serviceDetails || []), ''] }
          : item
      )
    }));
  };

  const removeServiceDetail = (itemIndex, detailIndex) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === itemIndex
          ? { ...item, serviceDetails: item.serviceDetails.filter((_, di) => di !== detailIndex) }
          : item
      )
    }));
  };

  const updateServiceDetail = (itemIndex, detailIndex, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === itemIndex
          ? {
            ...item,
            serviceDetails: item.serviceDetails.map((detail, di) =>
              di === detailIndex ? value : detail
            )
          }
          : item
      )
    }));
  };

  // Specification management functions
  const addSpecificationCategory = (itemIndex, focusFirstSpec = false) => {
    setFormData(prev => {
      const newCategoryIndex = prev.items[itemIndex]?.specifications?.length || 0;
      const newCategory = {
        category: '',
        items: [{
          name: '',
          specification: ''
        }]
      };
      const updated = {
        ...prev,
        items: prev.items.map((item, i) =>
          i === itemIndex
            ? { ...item, specifications: [...(item.specifications || []), newCategory] }
            : item
        )
      };

      // Focus on the first spec name field of the new category
      if (focusFirstSpec) {
        setTimeout(() => {
          const refKey = `spec-name-${itemIndex}-${newCategoryIndex}-0`;
          if (specInputRefs.current[refKey]) {
            specInputRefs.current[refKey].focus();
          }
        }, 0);
      }

      return updated;
    });
  };

  const removeSpecificationCategory = (itemIndex, categoryIndex) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === itemIndex
          ? { ...item, specifications: item.specifications.filter((_, ci) => ci !== categoryIndex) }
          : item
      )
    }));
  };

  const updateSpecificationCategory = (itemIndex, categoryIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === itemIndex
          ? {
            ...item,
            specifications: item.specifications.map((spec, si) =>
              si === categoryIndex ? { ...spec, [field]: value } : spec
            )
          }
          : item
      )
    }));
  };

  const addSpecificationItem = (itemIndex, categoryIndex, focusNewItem = false) => {
    setFormData(prev => {
      const currentItems = prev.items[itemIndex]?.specifications?.[categoryIndex]?.items || [];
      const newItemIndex = currentItems.length;
      const newSpecItem = {
        name: '',
        specification: ''
      };
      const updated = {
        ...prev,
        items: prev.items.map((item, i) =>
          i === itemIndex
            ? {
              ...item,
              specifications: item.specifications.map((spec, si) =>
                si === categoryIndex
                  ? { ...spec, items: [...(spec.items || []), newSpecItem] }
                  : spec
              )
            }
            : item
        )
      };

      // Focus on the new spec name field
      if (focusNewItem) {
        setTimeout(() => {
          const refKey = `spec-name-${itemIndex}-${categoryIndex}-${newItemIndex}`;
          if (specInputRefs.current[refKey]) {
            specInputRefs.current[refKey].focus();
          }
        }, 0);
      }

      return updated;
    });
  };

  const removeSpecificationItem = (itemIndex, categoryIndex, itemSpecIndex) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === itemIndex
          ? {
            ...item,
            specifications: item.specifications.map((spec, si) =>
              si === categoryIndex
                ? { ...spec, items: spec.items.filter((_, isi) => isi !== itemSpecIndex) }
                : spec
            )
          }
          : item
      )
    }));
  };

  const updateSpecificationItem = (itemIndex, categoryIndex, itemSpecIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === itemIndex
          ? {
            ...item,
            specifications: item.specifications.map((spec, si) =>
              si === categoryIndex
                ? {
                  ...spec,
                  items: spec.items.map((itemSpec, isi) =>
                    isi === itemSpecIndex ? { ...itemSpec, [field]: value } : itemSpec
                  )
                }
                : spec
            )
          }
          : item
      )
    }));
  };


  const validateForm = () => {
    const newErrors = {};

    if (!formData.approverId) {
      newErrors.approverId = 'Please select an approver';
    }

    if (!formData.quotationCreatorId) {
      newErrors.quotationCreatorId = 'Please select a quotation creator';
    }

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }

    if (!formData.contactPerson.name.trim()) {
      newErrors['contactPerson.name'] = 'Contact person name is required';
    }

    if (!formData.confidenceRate || formData.confidenceRate < 0 || formData.confidenceRate > 100) {
      newErrors.confidenceRate = 'Confidence rate is required and must be between 0 and 100';
    }

    if (formData.confidenceRate && !Number.isInteger(parseFloat(formData.confidenceRate))) {
      newErrors.confidenceRate = 'Confidence rate must be an integer';
    }

    if (!formData.deliveryLocation.trim()) {
      newErrors.deliveryLocation = 'Delivery location is required';
    }

    if (!formData.competitor.trim()) {
      newErrors.competitor = 'Competitor is required';
    }

    if (formData.paymentTermsOption === 'custom') {
      if (!formData.paymentTermsCustom || !formData.paymentTermsCustom.trim()) {
        newErrors.paymentTermsCustom = 'Custom payment terms are required';
      }
    }

    if (formData.canMake === undefined || formData.canMake === null) {
      newErrors.canMake = 'Can Make flag is required';
    }

    if (formData.projectOngoing === undefined || formData.projectOngoing === null) {
      newErrors.projectOngoing = 'Project Ongoing flag is required';
    }

    // Validate based on line of business type
    const lineOfBusinessType = formData.lineOfBusiness?.type || 'karoseri';

    if (lineOfBusinessType === 'karoseri') {
      if (formData.items.length === 0) {
        newErrors.items = 'At least one item is required';
      }

      // Validate each item with new template logic
      formData.items.forEach((item, index) => {
        // Quantity is now required
        if (!item.quantity || item.quantity < 1) {
          newErrors[`items.${index}.quantity`] = 'Quantity must be at least 1';
        }

        // Estimated Revenue is required (0 is a valid value)
        const estimatedRev = item.estimatedRevenue;
        if (estimatedRev === undefined || estimatedRev === null || estimatedRev === '' ||
          isNaN(estimatedRev) || (typeof estimatedRev === 'number' && estimatedRev < 0)) {
          newErrors[`items.${index}.estimatedRevenue`] = 'Estimated revenue per quantity is required and must be >= 0';
        }

        // Validate template mode
        if (!item.templateMode || !['manual', 'bodyType', 'drawing'].includes(item.templateMode)) {
          newErrors[`items.${index}.templateMode`] = 'Please select a specification source';
        }

        // For manual mode, require templateSourceId (body type) and chassisTypeId
        if (item.templateMode === 'manual') {
          if (!item.templateSourceId) {
            newErrors[`items.${index}.templateSourceId`] = 'Please select a body type';
          }
          if (!item.chassisTypeId) {
            newErrors[`items.${index}.chassis`] = 'Chassis type is required';
          }
        }

        // For bodyType mode, require templateSourceId and chassisTypeId
        if (item.templateMode === 'bodyType') {
          if (!item.templateSourceId) {
            newErrors[`items.${index}.templateSourceId`] = 'Please select a body type template';
          }
          if (!item.chassisTypeId) {
            newErrors[`items.${index}.chassis`] = 'Chassis type is required';
          }
        }

        // For drawing mode, require templateSourceId
        if (item.templateMode === 'drawing' && !item.templateSourceId) {
          newErrors[`items.${index}.templateSourceId`] = 'Please select a drawing';
        }
      });
    } else if (lineOfBusinessType === 'service') {
      // Validate service items
      if (!formData.items || formData.items.length === 0) {
        newErrors['items'] = 'At least one service item is required';
      }

      formData.items.forEach((item, index) => {
        if (!item.serviceName || !item.serviceName.trim()) {
          newErrors[`items.${index}.serviceName`] = 'Service name is required';
        }
        if (item.estimatedRevenue === undefined || item.estimatedRevenue === null ||
          isNaN(parseFloat(item.estimatedRevenue)) || parseFloat(item.estimatedRevenue) < 0) {
          newErrors[`items.${index}.estimatedRevenue`] = 'Each service item must have an estimated revenue per quantity >= 0';
        }
      });
    } else if (lineOfBusinessType === 'sparepart') {
      // Validate sparepart items
      if (!formData.items || formData.items.length === 0) {
        newErrors['items'] = 'At least one sparepart item is required';
      }

      formData.items.forEach((item, index) => {
        if (!item.sparepartName || !item.sparepartName.trim()) {
          newErrors[`items.${index}.sparepartName`] = 'Sparepart name is required';
        }
        if (!item.quantity || item.quantity < 1) {
          newErrors[`items.${index}.quantity`] = 'Quantity must be at least 1';
        }
        if (item.pricePerUnit === undefined || item.pricePerUnit === null ||
          isNaN(parseFloat(item.pricePerUnit)) || parseFloat(item.pricePerUnit) < 0) {
          newErrors[`items.${index}.pricePerUnit`] = 'Price per unit is required and must be >= 0';
        }
      });
    }

    setErrors(newErrors);

    // Debug: Log validation errors if any
    if (Object.keys(newErrors).length > 0) {
      const errorKeys = Object.keys(newErrors);
      const errorList = errorKeys.slice(0, 10).map(key => `${key}: ${newErrors[key]}`);
      console.log(`Validation errors (${errorKeys.length} total):`, errorList);
      if (errorKeys.length > 10) {
        console.log(`... and ${errorKeys.length - 10} more validation errors`);
      }
    }

    return { isValid: Object.keys(newErrors).length === 0, errors: newErrors };
  };

  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault();

    // For draft, skip validation - allow saving incomplete forms
    if (!isDraft) {
      // Validate form and get errors
      const { isValid, errors: validationErrors } = validateForm();
      if (!isValid) {
        // Show error message with first error
        const errorKeys = Object.keys(validationErrors);
        if (errorKeys.length > 0) {
          const firstErrorKey = errorKeys[0];
          const firstErrorMessage = validationErrors[firstErrorKey];
          // Create user-friendly field name
          const fieldName = firstErrorKey
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace(/\./g, ' ')
            .replace(/items \d+ /, 'Item ')
            .replace(/template source id/i, 'Body Type/Drawing')
            .replace(/contact person name/i, 'Contact Person Name');
          toast.error(`${fieldName}: ${firstErrorMessage}`, {
            duration: 5000
          });
        } else {
          toast.error('Please fill all required fields', {
            duration: 4000
          });
        }
        // Scroll to top of form to show errors
        const formElement = document.querySelector('form');
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        // DO NOT reset form - keep user's data
        return;
      }
    }

    setLoading(true);
    try {
      // Format data based on line of business type
      const lineOfBusinessType = formData.lineOfBusiness?.type || 'karoseri';
      const submitData = { ...formData };

      // Add draft/submit flags
      submitData.isDraft = isDraft;
      submitData.submitToEngineering = !isDraft && formData.engineeringId ? true : false;

      // Remove estimatedRevenue from RFQ level (it's now only in items)
      delete submitData.estimatedRevenue;
      submitData.paymentTerms = formData.paymentTermsOption === 'default'
        ? DEFAULT_PAYMENT_TERMS
        : (formData.paymentTermsCustom ? formData.paymentTermsCustom.trim() : '');
      if (!submitData.paymentTerms) {
        submitData.paymentTerms = DEFAULT_PAYMENT_TERMS;
      }
      submitData.deliveryTerms = formData.deliveryTerms ? formData.deliveryTerms.trim() : '';
      submitData.deliveryNotes = formData.deliveryNotes ? formData.deliveryNotes.trim() : '';
      submitData.inclusionNotes = formData.inclusionNotes ? formData.inclusionNotes.trim() : '';
      submitData.exclusionNotes = formData.exclusionNotes ? formData.exclusionNotes.trim() : '';
      submitData.isTaxIncluded = Boolean(formData.isTaxIncluded);
      submitData.includePPN = Boolean(formData.includePPN);
      if (formData.targetCloseDate) {
        submitData.targetCloseDate = formData.targetCloseDate;
      } else {
        delete submitData.targetCloseDate;
      }
      delete submitData.paymentTermsOption;
      delete submitData.paymentTermsCustom;
      // Convert empty string to null for engineeringId to prevent backend errors
      submitData.engineeringId = (submitData.engineeringId && submitData.engineeringId.trim() !== '')
        ? submitData.engineeringId
        : null;

      // Build lineOfBusiness object for submission
      submitData.lineOfBusiness = {
        type: lineOfBusinessType
      };

      if (lineOfBusinessType === 'karoseri') {
        // For karoseri, extract bodyTypeId and chassisTypeId from first item for RFQ level
        if (formData.items && formData.items.length > 0) {
          const firstItem = formData.items[0];

          // Extract bodyTypeId: use bodyTypeId field if available, otherwise fall back to templateSourceId
          // For manual and bodyType modes, templateSourceId is the bodyTypeId
          // For drawing mode, bodyTypeId should be stored separately when drawing is selected
          let bodyTypeId = firstItem.bodyTypeId || firstItem.templateSourceId;

          // Extract chassisTypeId from first item
          const chassisTypeId = firstItem.chassisTypeId;

          // Validate that both are present
          if (!bodyTypeId) {
            throw new Error('Body Type is required. Please select a body type for the first item.');
          }
          if (!chassisTypeId) {
            throw new Error('Chassis Type is required. Please select a chassis type for the first item.');
          }

          // Set at RFQ level (required by backend)
          submitData.bodyTypeId = bodyTypeId;
          submitData.chassisTypeId = chassisTypeId;
        }

        // Clean up items: for manual mode, remove templateSourceId as it's not needed by backend
        submitData.items = formData.items.map(item => {
          const cleanedItem = { ...item };

          if (item.templateMode === 'manual') {
            delete cleanedItem.templateSourceId;
            delete cleanedItem.bodyTypeId;
            cleanedItem.templateSourceModel = null;
          } else {
            delete cleanedItem.bodyTypeId;
            cleanedItem.templateSourceModel = item.templateMode === 'bodyType' ? 'BodyType' : 'DrawingSpecification';
          }

          if (cleanedItem.templateMode !== 'drawing') {
            delete cleanedItem.drawingSpecification;
          }

          cleanedItem.estimatedRevenue = parseFloat(cleanedItem.estimatedRevenue) || 0;

          return cleanedItem;
        });
      } else if (lineOfBusinessType === 'service') {
        // Service items are already in submitData.items, just clean them up
        submitData.items = formData.items.map(item => ({
          serviceName: item.serviceName.trim(),
          serviceDetails: Array.isArray(item.serviceDetails) ? item.serviceDetails.map(d => d.trim()).filter(d => d) : [],
          quantity: parseInt(item.quantity) || 1,
          estimatedRevenue: parseFloat(item.estimatedRevenue) || 0,
          notes: item.notes?.trim() || ''
        }));
      } else if (lineOfBusinessType === 'sparepart') {
        // Sparepart items are already in submitData.items, calculate estimated revenue
        submitData.items = formData.items.map(item => ({
          sparepartName: item.sparepartName.trim(),
          quantity: parseInt(item.quantity) || 1,
          pricePerUnit: parseFloat(item.pricePerUnit) || 0,
          estimatedRevenue: (parseInt(item.quantity) || 1) * (parseFloat(item.pricePerUnit) || 0),
          notes: item.notes?.trim() || ''
        }));
      }

      const payload = {
        data: submitData,
        newFiles: documentFiles.map((doc) => doc.file),
        deleteDocumentIds: documentsToDelete
      };

      await onSubmit(payload);
      // Reset form
      setFormData({
        approverId: '', quotationCreatorId: '', engineeringId: '',
        description: '', customerName: '', contactPerson: { name: '', gender: 'Male' },
        customerContacts: [],
        endUser: '',
        priority: 'medium', expectedDeliveryDate: '', confidenceRate: '', estimatedRevenue: '',
        deliveryLocation: '',
        competitor: '', canMake: false, projectOngoing: false, lineOfBusiness: { type: 'karoseri' },
        targetCloseDate: '',
        deliveryTerms: '',
        deliveryNotes: '',
        paymentTermsOption: 'default',
        paymentTermsCustom: '',
        isTaxIncluded: false,
        includePPN: true,
        inclusionNotes: '',
        exclusionNotes: '',
        items: []
      });
      setDocumentFiles([]);
      setExistingDocuments([]);
      setDocumentsToDelete([]);
      setErrors({});
    } catch (error) {
      console.error('Error submitting RFQ:', error);
      // Show error message to user without resetting form
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit RFQ. Please check all required fields.';
      toast.error(errorMessage);

      // If backend returns validation errors, try to map them to form errors
      if (error.response?.data?.errors) {
        const backendErrors = {};
        const errorData = error.response.data.errors;

        // Map backend error fields to form error fields
        Object.keys(errorData).forEach(key => {
          backendErrors[key] = errorData[key];
        });

        if (Object.keys(backendErrors).length > 0) {
          setErrors(prevErrors => ({ ...prevErrors, ...backendErrors }));
        }
      }

      // Don't reset form on error - keep user's data
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        approverId: '', quotationCreatorId: '', engineeringId: '',
        description: '', customerName: '', contactPerson: { name: '', gender: 'Male' },
        customerContacts: [],
        endUser: '',
        priority: 'medium', expectedDeliveryDate: '', confidenceRate: '', estimatedRevenue: '',
        deliveryLocation: '',
        competitor: '', canMake: false, projectOngoing: false, lineOfBusiness: { type: 'karoseri' },
        targetCloseDate: '',
        deliveryTerms: '',
        deliveryNotes: '',
        paymentTermsOption: 'default',
        paymentTermsCustom: '',
        isTaxIncluded: false,
        includePPN: true,
        inclusionNotes: '',
        exclusionNotes: '',
        items: []
      });
      setErrors({});
      setDocumentFiles([]);
      setExistingDocuments([]);
      setDocumentsToDelete([]);
      onClose();
    }
  };

  // Prepare approver options for CustomDropdown
  const approverOptions = (approvers || []).map(approver => ({
    value: approver._id,
    label: `${approver.fullName || approver.email} (${approver.email})`
  }));

  // Prepare quotation creator options for CustomDropdown
  const quotationCreatorOptions = (quotationCreators || []).map(creator => ({
    value: creator._id,
    label: `${creator.fullName || creator.email} (${creator.email})`
  }));

  // Prepare engineer options for CustomDropdown (optional)
  const engineerOptions = (engineers || []).map(engineer => ({
    value: engineer._id,
    label: `${engineer.fullName || engineer.email} (${engineer.email})`
  }));

  return (
    <>
      <BaseModal isOpen={isOpen} onClose={handleClose} title="Request Quotation">
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Section 1: Assignment */}
          <div className="border-t border-b border-gray-200 pt-6 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approver <span className="text-red-500">*</span>
                </label>
                <CustomDropdown
                  options={approverOptions}
                  value={formData.approverId}
                  onChange={(value) => handleInputChange('approverId', value)}
                  placeholder="Select an approver"
                  disabled={loading}
                  error={errors.approverId}
                />
                {errors.approverId && (
                  <p className="mt-1 text-sm text-red-600">{errors.approverId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quotation Creator <span className="text-red-500">*</span>
                </label>
                <CustomDropdown
                  options={quotationCreatorOptions}
                  value={formData.quotationCreatorId}
                  onChange={(value) => handleInputChange('quotationCreatorId', value)}
                  placeholder="Select a quotation creator"
                  disabled={loading}
                  error={errors.quotationCreatorId}
                />
                {errors.quotationCreatorId && (
                  <p className="mt-1 text-sm text-red-600">{errors.quotationCreatorId}</p>
                )}
              </div>

              {engineers && engineers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Engineer (Optional)
                  </label>
                  <CustomDropdown
                    options={[{ value: '', label: 'None - Assign Later' }, ...engineerOptions]}
                    value={formData.engineeringId || ''}
                    onChange={(value) => handleInputChange('engineeringId', value || null)}
                    placeholder="Select an engineer (optional)"
                    disabled={loading}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Assign an engineer now or submit to engineering later
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Customer Information */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.customerName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Enter customer name"
                  disabled={loading}
                />
                {errors.customerName && (
                  <p className="mt-1 text-sm text-red-600">{errors.customerName}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Person Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="contactName"
                    value={formData.contactPerson.name}
                    onChange={(e) => handleNestedInputChange('contactPerson', 'name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors['contactPerson.name'] ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Enter contact person name"
                    disabled={loading}
                  />
                  {errors['contactPerson.name'] && (
                    <p className="mt-1 text-sm text-red-600">{errors['contactPerson.name']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Person Gender <span className="text-red-500">*</span>
                  </label>
                  <CustomDropdown
                    options={[
                      { value: 'Male', label: 'Male' },
                      { value: 'Female', label: 'Female' },
                      { value: 'Other', label: 'Other' }
                    ]}
                    value={formData.contactPerson.gender}
                    onChange={(value) => handleNestedInputChange('contactPerson', 'gender', value)}
                    placeholder="Select gender"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Customer Contacts */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Customer Contacts (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={addCustomerContact}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                    disabled={loading}
                  >
                    <Plus className="w-4 h-4" />
                    Add Contact
                  </button>
                </div>

                {formData.customerContacts.length === 0 && (
                  <p className="text-sm text-gray-500 mb-2">No additional contacts added</p>
                )}

                {formData.customerContacts.map((contact, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-12 md:col-span-4">
                      <input
                        type="text"
                        value={contact.key}
                        onChange={(e) => updateCustomerContact(index, 'key', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Phone, Email"
                        disabled={loading}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-7">
                      <input
                        type="text"
                        value={contact.value}
                        onChange={(e) => updateCustomerContact(index, 'value', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Contact value"
                        disabled={loading}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-1">
                      <button
                        type="button"
                        onClick={() => removeCustomerContact(index)}
                        className="w-full px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                        disabled={loading}
                      >
                        <X className="w-5 h-5 mx-auto" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* End User Field */}
              <div>
                <label htmlFor="endUser" className="block text-sm font-medium text-gray-700 mb-2">
                  End User (Optional)
                </label>
                <input
                  type="text"
                  id="endUser"
                  value={formData.endUser}
                  onChange={(e) => handleInputChange('endUser', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter end user"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Project Details */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <CustomDropdown
                  options={[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'urgent', label: 'Urgent' }
                  ]}
                  value={formData.priority}
                  onChange={(value) => handleInputChange('priority', value)}
                  placeholder="Select priority"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="confidenceRate" className="block text-sm font-medium text-gray-700 mb-2">
                  Confidence Rate (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="confidenceRate"
                  value={formData.confidenceRate}
                  onChange={(e) => handleInputChange('confidenceRate', parseInt(e.target.value) || '')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.confidenceRate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Enter confidence rate (0-100)"
                  disabled={loading}
                  min="0"
                  max="100"
                  step="1"
                />
                {errors.confidenceRate && (
                  <p className="mt-1 text-sm text-red-600">{errors.confidenceRate}</p>
                )}
              </div>

              <div>
                <label htmlFor="deliveryLocation" className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="deliveryLocation"
                  value={formData.deliveryLocation}
                  onChange={(e) => handleInputChange('deliveryLocation', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.deliveryLocation ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Enter delivery location"
                  disabled={loading}
                />
                {errors.deliveryLocation && (
                  <p className="mt-1 text-sm text-red-600">{errors.deliveryLocation}</p>
                )}
              </div>

              <div>
                <label htmlFor="competitor" className="block text-sm font-medium text-gray-700 mb-2">
                  Competitor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="competitor"
                  value={formData.competitor}
                  onChange={(e) => handleInputChange('competitor', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.competitor ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Enter competitor name"
                  disabled={loading}
                />
                {errors.competitor && (
                  <p className="mt-1 text-sm text-red-600">{errors.competitor}</p>
                )}
              </div>

              <div>
                <label htmlFor="expectedDeliveryDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Delivery Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="expectedDeliveryDate"
                  value={formData.expectedDeliveryDate}
                  onChange={(e) => handleInputChange('expectedDeliveryDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.expectedDeliveryDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  disabled={loading}
                />
                {errors.expectedDeliveryDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.expectedDeliveryDate}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Commercial Terms */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Commercial Terms</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="targetCloseDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Target Close Date
                </label>
                <input
                  type="date"
                  id="targetCloseDate"
                  value={formData.targetCloseDate}
                  onChange={(e) => handleInputChange('targetCloseDate', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="deliveryTerms" className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Terms
                </label>
                <input
                  type="text"
                  id="deliveryTerms"
                  value={formData.deliveryTerms}
                  onChange={(e) => handleInputChange('deliveryTerms', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                  placeholder="e.g., FOB Jakarta"
                  disabled={loading}
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="deliveryNotes" className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Notes
                </label>
                <textarea
                  id="deliveryNotes"
                  value={formData.deliveryNotes}
                  onChange={(e) => handleInputChange('deliveryNotes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                  placeholder="Additional delivery notes..."
                  disabled={loading}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Terms
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomDropdown
                    options={[
                      { value: 'default', label: `Use Default (${DEFAULT_PAYMENT_TERMS})` },
                      { value: 'custom', label: 'Custom Terms' }
                    ]}
                    value={formData.paymentTermsOption}
                    onChange={(value) => {
                      setFormData((prev) => ({
                        ...prev,
                        paymentTermsOption: value,
                        paymentTermsCustom: value === 'default' ? '' : prev.paymentTermsCustom
                      }));
                      setErrors((prev) => ({
                        ...prev,
                        paymentTermsCustom: ''
                      }));
                    }}
                    disabled={loading}
                    placeholder="Select payment terms"
                  />
                  {formData.paymentTermsOption === 'custom' && (
                    <input
                      type="text"
                      value={formData.paymentTermsCustom}
                      onChange={(e) => handleInputChange('paymentTermsCustom', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.paymentTermsCustom ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Enter custom payment terms"
                      disabled={loading}
                    />
                  )}
                </div>
                {errors.paymentTermsCustom && (
                  <p className="mt-1 text-sm text-red-600">{errors.paymentTermsCustom}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax & PPN
                </label>
                <CustomDropdown
                  options={[
                    { value: 'inclusive', label: 'Prices are tax inclusive' },
                    { value: 'include_ppn', label: 'Include PPN (VAT)' }
                  ]}
                  value={taxSelection}
                  onChange={handleTaxSelectionChange}
                  disabled={loading}
                  placeholder="Select tax treatment"
                />
              </div>
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="inclusionNotes" className="block text-sm font-medium text-gray-700 mb-2">
                    Inclusion Notes
                  </label>
                  <textarea
                    id="inclusionNotes"
                    value={formData.inclusionNotes}
                    onChange={(e) => handleInputChange('inclusionNotes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                    placeholder="Items or services included..."
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="exclusionNotes" className="block text-sm font-medium text-gray-700 mb-2">
                    Exclusion Notes
                  </label>
                  <textarea
                    id="exclusionNotes"
                    value={formData.exclusionNotes}
                    onChange={(e) => handleInputChange('exclusionNotes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                    placeholder="Items or services excluded..."
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supporting Documents
                </label>
                <div className="space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <label
                      htmlFor="rfq-document-upload"
                      className={`inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Paperclip size={16} />
                      Upload Documents
                    </label>
                    <input
                      id="rfq-document-upload"
                      type="file"
                      multiple
                      accept={ALLOWED_DOCUMENT_EXTENSIONS}
                      onChange={handleDocumentInputChange}
                      disabled={loading}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-500">
                      Allowed: PDF, Word, Excel, Images (JPG, PNG, GIF, WEBP). Max size {MAX_DOCUMENT_SIZE / (1024 * 1024)}MB each.
                    </p>
                  </div>

                  {documentsLoading ? (
                    <div className="text-sm text-gray-500">Loading documents...</div>
                  ) : (
                    <div className="space-y-3">
                      {existingDocuments.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Existing Documents</p>
                          {existingDocuments.map((docEntry) => (
                            <div
                              key={docEntry._id}
                              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-800">{docEntry.originalName}</span>
                                <span className="text-xs text-gray-500">
                                  {formatFileSize(docEntry.fileSize)} • Uploaded {new Date(docEntry.uploadedAt).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleDownloadDocument(docEntry)}
                                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                                >
                                  <Download size={14} />
                                  Download
                                </button>
                                <button
                                  type="button"
                                  onClick={() => markDocumentForDeletion(docEntry._id)}
                                  className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={14} />
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {documentsToDelete.length > 0 && (
                        <p className="text-xs text-amber-600">
                          {documentsToDelete.length} document{documentsToDelete.length > 1 ? 's' : ''} will be removed when you save.
                        </p>
                      )}

                      {documentFiles.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Pending Uploads</p>
                          {documentFiles.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-800">{doc.file.name}</span>
                                <span className="text-xs text-gray-500">{formatFileSize(doc.file.size)}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeNewDocument(doc.id)}
                                className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                              >
                                <Trash2 size={14} />
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {existingDocuments.length === 0 && documentFiles.length === 0 && (
                        <p className="text-xs text-gray-500">No documents attached yet.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Project Flags */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Information</h3>
            <div className="space-y-4">
              {/* Can Make Checkbox */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="canMake"
                  checked={formData.canMake}
                  onChange={(e) => handleInputChange('canMake', e.target.checked)}
                  className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${errors.canMake ? 'border-red-500' : ''
                    }`}
                  disabled={loading}
                />
                <label htmlFor="canMake" className="ml-2 block text-sm font-medium text-gray-700">
                  Can Make <span className="text-red-500">*</span>
                </label>
              </div>
              {errors.canMake && (
                <p className="mt-1 text-sm text-red-600">{errors.canMake}</p>
              )}
              <p className="text-xs text-gray-500 ml-6">
                Check if we have the capability to manufacture this product
              </p>

              {/* Project Ongoing Checkbox */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="projectOngoing"
                  checked={formData.projectOngoing}
                  onChange={(e) => handleInputChange('projectOngoing', e.target.checked)}
                  className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${errors.projectOngoing ? 'border-red-500' : ''
                    }`}
                  disabled={loading}
                />
                <label htmlFor="projectOngoing" className="ml-2 block text-sm font-medium text-gray-700">
                  Project Ongoing <span className="text-red-500">*</span>
                </label>
              </div>
              {errors.projectOngoing && (
                <p className="mt-1 text-sm text-red-600">{errors.projectOngoing}</p>
              )}
              <p className="text-xs text-gray-500 ml-6">
                Check if this is an ongoing project
              </p>
            </div>
          </div>

          {/* Section 5: Line of Business & Items */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Business & Items</h3>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Line of Business <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                options={[
                  { value: 'karoseri', label: 'Karoseri' },
                  { value: 'service', label: 'Service' },
                  { value: 'sparepart', label: 'Sparepart' }
                ]}
                value={formData.lineOfBusiness?.type || 'karoseri'}
                onChange={(value) => {
                  setFormData(prev => ({
                    ...prev,
                    lineOfBusiness: { type: value }
                  }));
                  // Clear errors when changing type
                  setErrors(prev => {
                    const newErrors = { ...prev };
                    Object.keys(newErrors).forEach(key => {
                      if (key.startsWith('items.') || key.startsWith('service.') || key.startsWith('sparepart.')) {
                        delete newErrors[key];
                      }
                    });
                    return newErrors;
                  });
                }}
                placeholder="Select line of business"
                disabled={loading}
              />
              {errors['lineOfBusiness.type'] && (
                <p className="mt-1 text-sm text-red-600">{errors['lineOfBusiness.type']}</p>
              )}
            </div>

            {/* Conditional Forms Based on Line of Business */}
            {formData.lineOfBusiness?.type === 'karoseri' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Items <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </button>
                </div>

                {errors.items && (
                  <p className="mb-2 text-sm text-red-600">{errors.items}</p>
                )}

                {formData.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="border-2 border-gray-300 rounded-xl shadow-sm bg-white mb-6">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-gray-300 rounded-t-xl px-4 py-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-bold text-gray-900">Item {itemIndex + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeItem(itemIndex)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-4">
                      {/* Item Configuration Section */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                        <h5 className="text-sm font-semibold text-gray-800 mb-3">Configuration</h5>

                        {/* Template Mode Selection */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Specification Source <span className="text-red-500">*</span>
                          </label>
                          <CustomDropdown
                            options={[
                              { value: 'manual', label: 'Manual - Enter everything manually' },
                              { value: 'bodyType', label: 'Body Type Template - Use default body type specs' },
                              { value: 'drawing', label: 'Drawing - Copy from existing drawing' }
                            ]}
                            value={item.templateMode || 'manual'}
                            onChange={(value) => {
                              // Preserve estimatedRevenue and quantity when switching template modes
                              const currentEstimatedRevenue = item.estimatedRevenue !== undefined && item.estimatedRevenue !== null ? item.estimatedRevenue : 0;
                              const currentQuantity = item.quantity || 1;

                              updateItem(itemIndex, 'templateMode', value);
                              updateItem(itemIndex, 'templateSourceModel', value === 'bodyType' ? 'BodyType' : value === 'drawing' ? 'DrawingSpecification' : null);
                              updateItem(itemIndex, 'karoseri', '');
                              updateItem(itemIndex, 'chassis', '');
                              updateItem(itemIndex, 'chassisModel', '');
                              updateItem(itemIndex, 'templateSourceId', '');
                              updateItem(itemIndex, 'bodyTypeId', '');
                              updateItem(itemIndex, 'chassisTypeId', '');
                              updateItem(itemIndex, 'drawingSpecification', '');
                              updateItem(itemIndex, 'specifications', []);

                              // Ensure estimatedRevenue and quantity are preserved
                              updateItem(itemIndex, 'estimatedRevenue', currentEstimatedRevenue);
                              updateItem(itemIndex, 'quantity', currentQuantity);
                            }}
                            placeholder="Select specification source"
                            disabled={loading}
                            error={errors[`items.${itemIndex}.templateMode`]}
                          />
                          {errors[`items.${itemIndex}.templateMode`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.templateMode`]}</p>
                          )}
                          <p className="mt-1 text-xs text-gray-500">
                            {item.templateMode === 'manual' && 'Select body type, enter chassis, and add specifications manually'}
                            {item.templateMode === 'bodyType' && 'Select a body type to auto-fill specifications. You still need to provide chassis info.'}
                            {item.templateMode === 'drawing' && 'Select an existing drawing to copy all specs, body type, and chassis info.'}
                          </p>
                        </div>

                        {/* Basic Info Fields - Quantity + Estimated Revenue + Context-specific fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Quantity - always shown */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={item.quantity || ''}
                              onChange={(e) => updateItem(itemIndex, 'quantity', parseInt(e.target.value) || 1)}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors[`items.${itemIndex}.quantity`] ? 'border-red-500' : 'border-gray-300'
                                }`}
                              placeholder="Enter quantity"
                              disabled={loading}
                              min="1"
                              step="1"
                            />
                            {errors[`items.${itemIndex}.quantity`] && (
                              <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.quantity`]}</p>
                            )}
                          </div>

                          {/* Estimated Revenue - always shown */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Estimated Revenue per Quantity (IDR) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={(item.estimatedRevenue !== undefined && item.estimatedRevenue !== null && item.estimatedRevenue !== '')
                                ? new Intl.NumberFormat('id-ID').format(item.estimatedRevenue)
                                : ''}
                              onChange={(e) => {
                                const rawValue = e.target.value.replace(/\./g, '');
                                // If empty, set to empty string (will be handled on blur)
                                if (rawValue === '') {
                                  updateItem(itemIndex, 'estimatedRevenue', '');
                                } else {
                                  const numValue = parseFloat(rawValue);
                                  // Only update if it's a valid number
                                  if (!isNaN(numValue)) {
                                    updateItem(itemIndex, 'estimatedRevenue', numValue);
                                  }
                                }
                              }}
                              onBlur={() => {
                                // Ensure value is always a number (default to 0 if empty/invalid)
                                const currentValue = item.estimatedRevenue;
                                if (currentValue === undefined || currentValue === null || currentValue === '' || isNaN(currentValue)) {
                                  updateItem(itemIndex, 'estimatedRevenue', 0);
                                } else {
                                  // Ensure it's a number (in case it's a string)
                                  const numValue = typeof currentValue === 'string' ? parseFloat(currentValue) || 0 : currentValue;
                                  updateItem(itemIndex, 'estimatedRevenue', Math.max(0, numValue));
                                }
                              }}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors[`items.${itemIndex}.estimatedRevenue`] ? 'border-red-500' : 'border-gray-300'
                                }`}
                              placeholder="Enter estimated revenue per quantity"
                              disabled={loading}
                            />
                            {errors[`items.${itemIndex}.estimatedRevenue`] && (
                              <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.estimatedRevenue`]}</p>
                            )}
                          </div>

                          {/* Manual Mode: Show Body Type and Chassis fields */}
                          {item.templateMode === 'manual' && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Body Type <span className="text-red-500">*</span>
                                </label>
                                <CustomDropdown
                                  options={Array.isArray(bodyTypes) ? bodyTypes.map(bt => ({
                                    value: bt._id,
                                    label: `${bt.name || ''} (${bt.shortName || ''})`
                                  })) : []}
                                  value={item.templateSourceId || ''}
                                  onChange={(value) => {
                                    updateItem(itemIndex, 'templateSourceId', value);
                                    updateItem(itemIndex, 'bodyTypeId', value); // Also store as bodyTypeId for RFQ-level extraction
                                    const selectedBodyType = Array.isArray(bodyTypes) ? bodyTypes.find(bt => bt._id === value) : null;
                                    if (selectedBodyType) {
                                      updateItem(itemIndex, 'karoseri', selectedBodyType.name);
                                    }
                                  }}
                                  placeholder={loadingBodyTypes ? "Loading body types..." : "Select body type"}
                                  disabled={loading || loadingBodyTypes}
                                />
                                {errors[`items.${itemIndex}.templateSourceId`] && (
                                  <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.templateSourceId`]}</p>
                                )}
                                {!loadingBodyTypes && Array.isArray(bodyTypes) && bodyTypes.length === 0 && (
                                  <p className="mt-1 text-xs text-yellow-600">No body types available. Please create body types first.</p>
                                )}
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Chassis Type <span className="text-red-500">*</span>
                                </label>
                                <CustomDropdown
                                  options={Array.isArray(chassisTypes) ? chassisTypes.map(ct => ({
                                    value: ct._id,
                                    label: `${ct.name || ''} (${ct.shortName || ''})`
                                  })) : []}
                                  value={item.chassisTypeId || ''}
                                  onChange={(value) => {
                                    updateItem(itemIndex, 'chassisTypeId', value);
                                    const selectedChassisType = Array.isArray(chassisTypes) ? chassisTypes.find(ct => ct._id === value) : null;
                                    if (selectedChassisType) {
                                      updateItem(itemIndex, 'chassis', selectedChassisType.name);
                                    }
                                  }}
                                  placeholder={loadingChassisTypes ? "Loading chassis types..." : "Select chassis type"}
                                  disabled={loading || loadingChassisTypes}
                                />
                                {errors[`items.${itemIndex}.chassis`] && (
                                  <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.chassis`]}</p>
                                )}
                                {!loadingChassisTypes && Array.isArray(chassisTypes) && chassisTypes.length === 0 && (
                                  <p className="mt-1 text-xs text-yellow-600">No chassis types available. Please create chassis types first.</p>
                                )}
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Chassis Model <span className="text-xs text-gray-500">(Optional)</span>
                                </label>
                                <input
                                  type="text"
                                  value={item.chassisModel || ''}
                                  onChange={(e) => updateItem(itemIndex, 'chassisModel', e.target.value)}
                                  placeholder="e.g., Dutro 500, Hino 200, etc."
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  disabled={loading}
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                  Specify the specific chassis model if needed (e.g., "Dutro 500")
                                </p>
                              </div>
                            </>
                          )}

                          {/* Body Type Template Mode: Show Body Type selector */}
                          {item.templateMode === 'bodyType' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Body Type <span className="text-red-500">*</span>
                              </label>
                              <CustomDropdown
                                options={Array.isArray(bodyTypes) ? bodyTypes.map(bt => ({
                                  value: bt._id,
                                  label: `${bt.name || ''} (${bt.shortName || ''})`
                                })) : []}
                                value={item.templateSourceId || ''}
                                onChange={(value) => {
                                  updateItem(itemIndex, 'templateSourceId', value);
                                  updateItem(itemIndex, 'bodyTypeId', value); // Also store as bodyTypeId for RFQ-level extraction
                                  updateItem(itemIndex, 'templateSourceModel', 'BodyType');
                                  const selectedBodyType = Array.isArray(bodyTypes) ? bodyTypes.find(bt => bt._id === value) : null;
                                  if (selectedBodyType) {
                                    updateItem(itemIndex, 'karoseri', selectedBodyType.name || '');
                                    if (selectedBodyType.defaultSpecifications) {
                                      updateItem(itemIndex, 'specifications', selectedBodyType.defaultSpecifications);
                                      toast.success('Body type specifications loaded!');
                                    }
                                  }
                                }}
                                placeholder={loadingBodyTypes ? "Loading body types..." : "Select body type"}
                                disabled={loading || loadingBodyTypes}
                              />
                              {errors[`items.${itemIndex}.templateSourceId`] && (
                                <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.templateSourceId`]}</p>
                              )}
                              {!loadingBodyTypes && Array.isArray(bodyTypes) && bodyTypes.length === 0 && (
                                <p className="mt-1 text-xs text-yellow-600">No body types available. Please create body types first.</p>
                              )}
                            </div>
                          )}

                          {/* Drawing Mode: Show Drawing selector button */}
                          {item.templateMode === 'drawing' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Drawing <span className="text-red-500">*</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => openDrawingSelector(itemIndex)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between"
                              >
                                <span>
                                  {item.templateSourceId ? (
                                    (() => {
                                      const selectedDrawing = Array.isArray(drawings) ? drawings.find(d => d._id === item.templateSourceId) : null;
                                      if (selectedDrawing) {
                                        const bodyTypeName = selectedDrawing.bodyTypeId?.name || 'Unknown Body';
                                        const chassisTypeName = selectedDrawing.chassisTypeId?.name || 'Unknown Chassis';
                                        return `${selectedDrawing.drawingNumber || 'Drawing'} (${bodyTypeName} / ${chassisTypeName})`;
                                      }
                                      return 'Select drawing';
                                    })()
                                  ) : (
                                    'Click to select drawing'
                                  )}
                                </span>
                                <Search className="h-4 w-4 text-gray-400" />
                              </button>
                              {errors[`items.${itemIndex}.templateSourceId`] && (
                                <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.templateSourceId`]}</p>
                              )}
                              {item.templateSourceId && (
                                <p className="mt-1 text-xs text-gray-500">Drawing selected. Click to change.</p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Show loaded drawing details for drawing mode */}
                        {item.templateMode === 'drawing' && item.templateSourceId && (
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-green-50 border border-green-200 rounded-lg p-4">
                            <div>
                              <label className="block text-xs font-medium text-green-700 mb-1">
                                Body Type (from drawing)
                              </label>
                              <div className="text-sm text-green-900 font-medium">
                                {item.karoseri || 'Loading...'}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-green-700 mb-1">
                                Chassis Type (from drawing)
                              </label>
                              <div className="text-sm text-green-900 font-medium">
                                {item.chassis || 'Loading...'} {item.chassisModel ? `- ${item.chassisModel}` : ''}
                              </div>
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs text-green-700 italic">
                                Specifications below are preloaded from the drawing
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Show chassis field for bodyType mode */}
                        {item.templateMode === 'bodyType' && (
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Chassis Type <span className="text-red-500">*</span>
                              </label>
                              <CustomDropdown
                                options={Array.isArray(chassisTypes) ? chassisTypes.map(ct => ({
                                  value: ct._id,
                                  label: `${ct.name || ''} (${ct.shortName || ''})`
                                })) : []}
                                value={item.chassisTypeId || ''}
                                onChange={(value) => {
                                  updateItem(itemIndex, 'chassisTypeId', value);
                                  const selectedChassisType = Array.isArray(chassisTypes) ? chassisTypes.find(ct => ct._id === value) : null;
                                  if (selectedChassisType) {
                                    updateItem(itemIndex, 'chassis', selectedChassisType.name);
                                  }
                                }}
                                placeholder={loadingChassisTypes ? "Loading chassis types..." : "Select chassis type"}
                                disabled={loading || loadingChassisTypes}
                              />
                              {errors[`items.${itemIndex}.chassis`] && (
                                <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.chassis`]}</p>
                              )}
                              {!loadingChassisTypes && Array.isArray(chassisTypes) && chassisTypes.length === 0 && (
                                <p className="mt-1 text-xs text-yellow-600">No chassis types available. Please create chassis types first.</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Chassis Model <span className="text-xs text-gray-500">(Optional)</span>
                              </label>
                              <input
                                type="text"
                                value={item.chassisModel || ''}
                                onChange={(e) => updateItem(itemIndex, 'chassisModel', e.target.value)}
                                placeholder="e.g., Dutro 500, Hino 200, etc."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={loading}
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Specify the specific chassis model if needed (e.g., "Dutro 500")
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Item Notes */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <textarea
                          value={item.notes}
                          onChange={(e) => updateItem(itemIndex, 'notes', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter item notes"
                          disabled={loading}
                          rows="2"
                        />
                      </div>

                      {/* Specifications Section */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Specifications (Editable)
                          </label>
                          <button
                            type="button"
                            onClick={() => addSpecificationCategory(itemIndex)}
                            className="inline-flex items-center px-2 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Category
                          </button>
                        </div>

                        {item.specifications && item.specifications.map((spec, specIndex) => (
                          <div key={specIndex} className="border border-gray-200 rounded-md p-3 mb-2">
                            <div className="flex items-center justify-between mb-2">
                              <input
                                type="text"
                                value={spec.category || ''}
                                onChange={(e) => updateSpecificationCategory(itemIndex, specIndex, 'category', e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    // If category has no items yet, add first item and focus on its name field
                                    if (!spec.items || spec.items.length === 0) {
                                      addSpecificationItem(itemIndex, specIndex, true);
                                    } else {
                                      // Focus on first spec name field in this category
                                      const refKey = `spec-name-${itemIndex}-${specIndex}-0`;
                                      if (specInputRefs.current[refKey]) {
                                        specInputRefs.current[refKey].focus();
                                      }
                                    }
                                  }
                                }}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Category name"
                                disabled={loading}
                              />
                              <button
                                type="button"
                                onClick={() => removeSpecificationCategory(itemIndex, specIndex)}
                                className="ml-2 text-red-600 hover:text-red-800"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>

                            <div className="space-y-2">
                              {spec.items && spec.items.map((specItem, specItemIndex) => (
                                <div key={specItemIndex} className="flex items-center gap-2">
                                  <input
                                    ref={(el) => {
                                      const refKey = `spec-name-${itemIndex}-${specIndex}-${specItemIndex}`;
                                      if (el) {
                                        specInputRefs.current[refKey] = el;
                                      } else {
                                        delete specInputRefs.current[refKey];
                                      }
                                    }}
                                    type="text"
                                    value={specItem.name || ''}
                                    onChange={(e) => updateSpecificationItem(itemIndex, specIndex, specItemIndex, 'name', e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        // Move focus to value field
                                        const valueRefKey = `spec-value-${itemIndex}-${specIndex}-${specItemIndex}`;
                                        if (specInputRefs.current[valueRefKey]) {
                                          specInputRefs.current[valueRefKey].focus();
                                        }
                                      }
                                    }}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Specification name"
                                    disabled={loading}
                                  />
                                  <span className="text-gray-500">:</span>
                                  <input
                                    ref={(el) => {
                                      const refKey = `spec-value-${itemIndex}-${specIndex}-${specItemIndex}`;
                                      if (el) {
                                        specInputRefs.current[refKey] = el;
                                      } else {
                                        delete specInputRefs.current[refKey];
                                      }
                                    }}
                                    type="text"
                                    value={specItem.specification || ''}
                                    onChange={(e) => updateSpecificationItem(itemIndex, specIndex, specItemIndex, 'specification', e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        // Always add new item to current category and focus on its name field
                                        addSpecificationItem(itemIndex, specIndex, true);
                                      }
                                    }}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Specification value"
                                    disabled={loading}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeSpecificationItem(itemIndex, specIndex, specItemIndex)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}

                              <button
                                type="button"
                                onClick={() => addSpecificationItem(itemIndex, specIndex)}
                                className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Specification
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Service Form - Unified Items Structure */}
          {formData.lineOfBusiness?.type === 'service' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Service Items</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service Item
                </button>
              </div>

              {formData.items.length === 0 && (
                <p className="text-sm text-gray-500 mb-4">No service items added yet. Click "Add Service Item" to add one.</p>
              )}

              {formData.items.map((item, itemIndex) => (
                <div key={itemIndex} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-medium text-gray-900">Service Item {itemIndex + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeItem(itemIndex)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Service Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.serviceName || ''}
                        onChange={(e) => updateItem(itemIndex, 'serviceName', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors[`items.${itemIndex}.serviceName`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        placeholder="Enter service name"
                        disabled={loading}
                      />
                      {errors[`items.${itemIndex}.serviceName`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.serviceName`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={item.quantity || 1}
                        onChange={(e) => updateItem(itemIndex, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="1"
                        disabled={loading}
                        min="1"
                        step="1"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Service Details
                        </label>
                        <button
                          type="button"
                          onClick={() => addServiceDetail(itemIndex)}
                          className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Detail
                        </button>
                      </div>

                      {/* Service Details List */}
                      {Array.isArray(item.serviceDetails) && item.serviceDetails.length > 0 ? (
                        <div className="space-y-2">
                          {item.serviceDetails.map((detail, detailIndex) => (
                            <div key={detailIndex} className="flex items-start space-x-2">
                              <input
                                type="text"
                                value={detail || ''}
                                onChange={(e) => updateServiceDetail(itemIndex, detailIndex, e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter service detail"
                                disabled={loading}
                              />
                              <button
                                type="button"
                                onClick={() => removeServiceDetail(itemIndex, detailIndex)}
                                className="text-red-600 hover:text-red-800 p-2"
                                disabled={loading}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 mb-2">No service details added yet. Click "Add Detail" to add one.</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estimated Revenue per Quantity <span className="text-red-500">*</span>
                      </label>
                      <div className={errors[`items.${itemIndex}.estimatedRevenue`] ? 'border-2 border-red-500 rounded-md' : ''}>
                        <PriceInput
                          value={item.estimatedRevenue || 0}
                          onChange={(price) => updateItem(itemIndex, 'estimatedRevenue', price)}
                          placeholder="Enter estimated revenue per quantity"
                          disabled={loading}
                        />
                      </div>
                      {errors[`items.${itemIndex}.estimatedRevenue`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.estimatedRevenue`]}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        value={item.notes || ''}
                        onChange={(e) => updateItem(itemIndex, 'notes', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter item notes"
                        disabled={loading}
                        rows="2"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sparepart Form - Unified Items Structure */}
          {formData.lineOfBusiness?.type === 'sparepart' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Sparepart Items</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Sparepart Item
                </button>
              </div>

              {formData.items.length === 0 && (
                <p className="text-sm text-gray-500 mb-4">No sparepart items added yet. Click "Add Sparepart Item" to add one.</p>
              )}

              {formData.items.map((item, itemIndex) => (
                <div key={itemIndex} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-medium text-gray-900">Sparepart Item {itemIndex + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeItem(itemIndex)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sparepart Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.sparepartName || ''}
                        onChange={(e) => updateItem(itemIndex, 'sparepartName', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors[`items.${itemIndex}.sparepartName`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        placeholder="Enter sparepart name"
                        disabled={loading}
                      />
                      {errors[`items.${itemIndex}.sparepartName`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.sparepartName`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(itemIndex, 'quantity', parseInt(e.target.value) || 1)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors[`items.${itemIndex}.quantity`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        placeholder="Enter quantity"
                        disabled={loading}
                        min="1"
                        step="1"
                      />
                      {errors[`items.${itemIndex}.quantity`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.quantity`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price Per Unit <span className="text-red-500">*</span>
                      </label>
                      <div className={errors[`items.${itemIndex}.pricePerUnit`] ? 'border-2 border-red-500 rounded-md' : ''}>
                        <PriceInput
                          value={item.pricePerUnit || 0}
                          onChange={(price) => {
                            const qty = parseInt(item.quantity) || 1;
                            updateItem(itemIndex, 'pricePerUnit', price);
                            updateItem(itemIndex, 'estimatedRevenue', price * qty);
                          }}
                          placeholder="Enter price per unit"
                          disabled={loading}
                        />
                      </div>
                      {errors[`items.${itemIndex}.pricePerUnit`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`items.${itemIndex}.pricePerUnit`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total (Auto-calculated)
                      </label>
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(
                          (parseFloat(item.pricePerUnit) || 0) * (parseInt(item.quantity) || 1)
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        value={item.notes || ''}
                        onChange={(e) => updateItem(itemIndex, 'notes', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter item notes"
                        disabled={loading}
                        rows="2"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Expected Delivery Date Field */}
          <div>
            <label htmlFor="expectedDeliveryDate" className="block text-sm font-medium text-gray-700 mb-2">
              Expected Delivery Date
            </label>
            <input
              type="date"
              id="expectedDeliveryDate"
              value={formData.expectedDeliveryDate}
              onChange={(e) => handleInputChange('expectedDeliveryDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
          </div>

          {/* Description Field */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter additional details (optional)"
              disabled={loading}
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    Saving...
                  </div>
                ) : (
                  'Save as Draft'
                )}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {rfqToEdit ? 'Saving...' : 'Submitting...'}
                  </div>
                ) : (
                  rfqToEdit ? 'Save' : 'Submit'
                )}
              </button>
            </div>
          </div>
        </form>
      </BaseModal>

      {/* DrawingSpecificationSelector already includes its own BaseModal, so we don't wrap it */}
      <DrawingSpecificationSelector
        isOpen={showDrawingSelector}
        value={
          drawingSelectorItemIndex !== null
            ? (
              formData.items[drawingSelectorItemIndex]?.drawingSpecification ||
              formData.items[drawingSelectorItemIndex]?.templateSourceId ||
              ''
            )
            : ''
        }
        onChange={handleDrawingSelection}
        onClose={() => {
          setShowDrawingSelector(false);
          setDrawingSelectorItemIndex(null);
          setDrawingSearchTerm('');
          setSelectedBodyTypeFilter('');
          setSelectedChassisTypeFilter('');
          setSelectedSizeTypeFilter('');
        }}
      />
    </>
  );
};

export default RequestRFQModal;


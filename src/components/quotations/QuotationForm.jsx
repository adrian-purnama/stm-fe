import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Save,
  X,
  Upload,
  Image,
  X as XIcon,
  FileText,
  Eye,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Tooltip } from 'react-tooltip';
import toast from 'react-hot-toast';
import ApiHelper from '../../utils/api/ApiHelper';
import CustomDropdown from '../common/CustomDropdown';
import PriceInput from '../common/PriceInput';
import OfferItemForm from '../forms/OfferItemForm';
import BaseModal from '../modals/BaseModal';
import { formatPriceWithCurrency } from '../../utils/helpers/priceFormatter';
import { getNotesImageAssetUrl } from '../../utils/helpers/assetUrlHelper';

const DEFAULT_PAYMENT_TERMS = 'Payment DP 50% sisa cash before delivery';

const SECTION_VARIANTS = {
  user: {
    label: 'User Input',
    badgeClass: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
  },
  system: {
    label: 'System Generated',
    badgeClass: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
  },
  helper: {
    label: 'Reference',
    badgeClass: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'
  }
};

const FormSection = ({
  title,
  description,
  intent = 'user',
  actions = null,
  bodyClassName = 'mt-4 space-y-4',
  children
}) => {
  const variant = SECTION_VARIANTS[intent] || SECTION_VARIANTS.user;

  return (
    <section className="bg-white p-6 rounded-lg shadow">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <span className={`text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${variant.badgeClass}`}>
              {variant.label}
            </span>
          </div>
          {description && (
            <p className="mt-1 text-sm text-gray-500 max-w-3xl">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </header>
      <div className={bodyClassName}>
        {children}
      </div>
    </section>
  );
};

const QuotationForm = ({ quotation, onSave, onCancel, mode = 'create-quotation', stayInCurrentView = false, rfqId = null }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    contactPerson: {
      name: '',
      gender: 'Male'
    },
    customerContacts: [],
    lineOfBusiness: {
      type: 'karoseri'
    },
    deliveryTerms: '',
    deliveryNotes: '',
    targetCloseDate: '',
    paymentTerms: DEFAULT_PAYMENT_TERMS,
    inclusionNotes: '',
    exclusionNotes: '',
    isTaxIncluded: false,
    includePPN: true,
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
  const [addingServiceItem, setAddingServiceItem] = useState(false);
  const [addingSparepartItem, setAddingSparepartItem] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newSparepartName, setNewSparepartName] = useState('');
  const [selectedSparepartIndices, setSelectedSparepartIndices] = useState([]);
  const [sparepartBulkSettings, setSparepartBulkSettings] = useState({
    discountType: 'percentage',
    discountValue: '',
    commission: ''
  });

  const [loading, setLoading] = useState(false);
  const [quotationNumber, setQuotationNumber] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [notesImagesData, setNotesImagesData] = useState([]);
  const [pendingImages, setPendingImages] = useState([]);
  const [refreshingImages, setRefreshingImages] = useState(false);
  const [removedImages, setRemovedImages] = useState([]); // Track images removed from form // Store images to be uploaded
  const [showRFQReference, setShowRFQReference] = useState(false);
  const [rfqCollapsed, setRfqCollapsed] = useState(() => !(mode === 'create-quotation' || mode === 'create-from-rfq'));
  const [rfqReferenceData, setRfqReferenceData] = useState(null);

  const isHeaderReadOnly = false;

  const engineeringReference = useMemo(() => {
    if (!rfqReferenceData || !rfqReferenceData.engineeringTransit) {
      return { transit: null, changes: [] };
    }

    const transit = rfqReferenceData.engineeringTransit;
    const original = Array.isArray(transit.specsOriginal) ? transit.specsOriginal : [];
    const modified = Array.isArray(transit.specsModified) ? transit.specsModified : [];

    const changes = modified.map((modifiedItem, index) => {
      const itemNumber = modifiedItem?.itemNumber ?? index + 1;
      const originalItem =
        original.find((item) => item?.itemNumber === modifiedItem?.itemNumber) ||
        original[index] ||
        null;

      return {
        key: `${itemNumber}-${index}`,
        itemNumber,
        original: originalItem,
        modified: modifiedItem
      };
    });

    return { transit, changes };
  }, [rfqReferenceData]);

  const { transit: engineeringTransit, changes: engineeringChanges } = engineeringReference;

  const resolvedRfqId = useMemo(() => {
    if (rfqId) return rfqId;
    if (quotation?.rfq?._id) return quotation.rfq._id;
    if (quotation?.header?.rfq?._id) return quotation.header.rfq._id;
    if (quotation?.header?.rfqId) return quotation.header.rfqId;
    if (quotation?.rfqId) return quotation.rfqId;
    return null;
  }, [rfqId, quotation]);

  const shouldShowRfqSections =
    !rfqCollapsed || mode === 'create-quotation' || mode === 'create-from-rfq';

  const formatDateInput = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString().slice(0, 10);
  };

  const formatDateForDisplay = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }
    return date.toLocaleDateString();
  };

const formatFieldLabel = (label = '') => {
  return label
    .toString()
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
};

const renderSpecificationList = (specs) => {
  if (!Array.isArray(specs) || specs.length === 0) {
    return <p className="text-xs text-gray-400">No specifications recorded.</p>;
  }

  return specs.map((spec, specIndex) => (
    <div
      key={`${spec?.category || 'specification'}-${specIndex}`}
      className="rounded-md border border-gray-200 bg-white p-2"
    >
      <div className="text-xs font-semibold text-gray-700 mb-1">
        {spec?.category || 'Specification'}
      </div>
      {Array.isArray(spec?.items) && spec.items.length > 0 ? (
        <ul className="space-y-1 text-xs text-gray-600 ml-1">
          {spec.items.map((item, itemIndex) => (
            <li key={`${item?.name || 'item'}-${itemIndex}`}>
              <span className="font-medium">{item?.name || 'Item'}</span>
              {item?.name && item?.specification ? ': ' : ''}
              {item?.specification || '-'}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-400">No specification items.</p>
      )}
    </div>
  ));
};

const renderEngineeringItemDetails = (item, lineOfBusinessType) => {
  if (!item) {
    return <p className="text-xs text-gray-400">No data recorded.</p>;
  }

  switch (lineOfBusinessType) {
    case 'karoseri':
      return (
        <div className="space-y-1 text-xs text-gray-600">
          <p>
            <span className="font-medium text-gray-700">Karoseri:</span> {item.karoseri || '-'}
          </p>
          <p>
            <span className="font-medium text-gray-700">Chassis:</span> {item.chassis || '-'}
          </p>
          <p>
            <span className="font-medium text-gray-700">Chassis Model:</span> {item.chassisModel || '-'}
          </p>
          <p>
            <span className="font-medium text-gray-700">Notes:</span> {item.notes || '-'}
          </p>
          {Array.isArray(item.specifications) && item.specifications.length > 0 && (
            <div className="mt-2 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Specifications</p>
              <div className="space-y-2">
                {renderSpecificationList(item.specifications)}
              </div>
            </div>
          )}
        </div>
      );
    case 'service':
      return (
        <div className="space-y-1 text-xs text-gray-600">
          <p>
            <span className="font-medium text-gray-700">Service Name:</span> {item.serviceName || '-'}
          </p>
          {Array.isArray(item.serviceDetails) && item.serviceDetails.length > 0 && (
            <div className="mt-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Service Details</p>
              <ul className="list-disc list-inside space-y-1">
                {item.serviceDetails.map((detail, idx) => (
                  <li key={idx}>{detail || '-'}</li>
                ))}
              </ul>
            </div>
          )}
          <p>
            <span className="font-medium text-gray-700">Notes:</span> {item.notes || '-'}
          </p>
        </div>
      );
    case 'sparepart':
      return (
        <div className="space-y-1 text-xs text-gray-600">
          <p>
            <span className="font-medium text-gray-700">Sparepart:</span> {item.sparepartName || '-'}
          </p>
          <p>
            <span className="font-medium text-gray-700">Quantity:</span> {item.quantity ?? '-'}
          </p>
          {item.pricePerUnit !== undefined && (
            <p>
              <span className="font-medium text-gray-700">Price Per Unit:</span> {item.pricePerUnit || '-'}
            </p>
          )}
          <p>
            <span className="font-medium text-gray-700">Notes:</span> {item.notes || '-'}
          </p>
        </div>
      );
    default:
      return (
        <div className="space-y-1 text-xs text-gray-600">
          {Object.entries(item)
            .filter(([key]) => !['itemNumber', '_id', '__v', 'specifications'].includes(key))
            .map(([key, value]) => (
              <p key={key}>
                <span className="font-medium text-gray-700">{formatFieldLabel(key)}:</span>{' '}
                {Array.isArray(value)
                  ? value.length > 0
                    ? value.join(', ')
                    : '-'
                  : value !== undefined && value !== null && value !== ''
                  ? value
                  : '-'}
              </p>
            ))}
          {Array.isArray(item.specifications) && item.specifications.length > 0 && (
            <div className="mt-2 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Specifications</p>
              <div className="space-y-2">
                {renderSpecificationList(item.specifications)}
              </div>
            </div>
          )}
        </div>
      );
  }
  };

  const formatFileSize = (bytes = 0) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const taxSelection = formData.isTaxIncluded ? 'inclusive' : 'exclusive';

  const handleTaxTreatmentChange = (value) => {
    const isInclusive = value === 'inclusive';
    setFormData((prev) => ({
      ...prev,
      isTaxIncluded: isInclusive,
      includePPN: isInclusive,
      excludePPN: !isInclusive
    }));
  };

  const handleOfferTaxSelection = (value) => {
    const isInclusive = value === 'include';
    setFormData((prev) => ({
      ...prev,
      excludePPN: !isInclusive,
      includePPN: isInclusive,
      isTaxIncluded: isInclusive
    }));
  };

  // Fetch RFQ reference data
  const fetchRFQReference = useCallback(async () => {
    if (!resolvedRfqId) return;
    
    try {
      const response = await ApiHelper.get(`/api/rfq/${resolvedRfqId}`);
      if (response.data.success) {
        setRfqReferenceData(response.data.data.rfq);
      }
    } catch (error) {
      console.error('Error fetching RFQ reference:', error);
      toast.error('Failed to load RFQ reference');
    }
  }, [resolvedRfqId]);

  // Show RFQ reference modal
  const handleShowRFQReference = () => {
    if (!rfqReferenceData) {
      fetchRFQReference();
    }
    setShowRFQReference(true);
  };

  useEffect(() => {
    if (!resolvedRfqId) return;
    if (rfqReferenceData) return;
    fetchRFQReference();
  }, [resolvedRfqId, rfqReferenceData, fetchRFQReference]);

  const handleDownloadRfqDocument = async (docEntry) => {
    try {
      const response = await ApiHelper.get(`/api/rfq/documents/${docEntry._id}/download`, {
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
      console.error('Error downloading RFQ document:', error);
      toast.error('Failed to download document');
    }
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
    console.log('[DEBUG] useEffect triggered with:', { processedQuotation, activeOffer, mode, rfqId });
    
    if (processedQuotation) {
      if ((mode === 'create-quotation' || mode === 'create-from-rfq') && rfqId) {
        // For creating quotation from RFQ, use RFQ data
        const header = processedQuotation.header || processedQuotation;
        const firstOffer = processedQuotation.offers?.[0];
        
        // Handle different data structures - try multiple locations for offer items
        let offerItems = [];
        console.log('QuotationForm: processedQuotation structure:', processedQuotation);
        console.log('QuotationForm: firstOffer:', firstOffer);
        console.log('QuotationForm: processedQuotation.offers:', processedQuotation.offers);
        
        if (firstOffer?.offerItems) {
          console.log('QuotationForm: Found offerItems in firstOffer:', firstOffer.offerItems);
          offerItems = firstOffer.offerItems;
        } else if (processedQuotation.offerItems) {
          console.log('QuotationForm: Found offerItems in processedQuotation:', processedQuotation.offerItems);
          offerItems = processedQuotation.offerItems;
        } else if (processedQuotation.offers?.[0]?.offerItems) {
          console.log('QuotationForm: Found offerItems in processedQuotation.offers[0]:', processedQuotation.offers[0].offerItems);
          offerItems = processedQuotation.offers[0].offerItems;
        } else if (processedQuotation.items) {
          console.log('QuotationForm: Found items in processedQuotation, transforming:', processedQuotation.items);
          // Transform direct RFQ items - each item has its own estimatedRevenue
          offerItems = processedQuotation.items.map((item, index) => {
            const itemRevenue = item.estimatedRevenue || 0;
            
            const itemData = {
              itemNumber: index + 1,
              karoseri: item.karoseri,
              chassis: item.chassis,
              chassisModel: item.chassisModel || '',
              drawingSpecification: item.drawingSpecification,
              templateMode: item.templateMode || 'manual',
              templateSourceModel: item.templateSourceModel || null,
              templateSourceId: item.templateSourceId || null,
              specifications: item.specifications || [],
              price: itemRevenue,
              netto: itemRevenue * 0.91,
              discountType: 'percentage',
              discountValue: 0,
              quantity: item.quantity || 1,
            commission: item.commission || 0,
              notes: item.notes || ''
            };
            
            // Add RFQ-level bodyTypeId and chassisTypeId if karoseri type
            if (processedQuotation.lineOfBusiness?.type === 'karoseri') {
              // Handle populated objects (get _id) or plain IDs
              itemData.bodyTypeId = processedQuotation.bodyTypeId?._id || processedQuotation.bodyTypeId || null;
              itemData.chassisTypeId = processedQuotation.chassisTypeId?._id || processedQuotation.chassisTypeId || null;
            }
            
            // Add service/sparepart fields if applicable
            if (processedQuotation.lineOfBusiness?.type === 'service') {
              itemData.serviceName = item.serviceName || '';
              itemData.serviceDetails = item.serviceDetails || [];
            }
            
            if (processedQuotation.lineOfBusiness?.type === 'sparepart') {
              itemData.sparepartName = item.sparepartName || '';
              itemData.pricePerUnit = item.pricePerUnit || 0;
            }
            
            return itemData;
          });
        } else {
          console.log('QuotationForm: No offerItems found in any location');
        }
        
        const rfqFormData = {
          customerName: header.customerName || processedQuotation.customerName || '',
          contactPerson: header.contactPerson || processedQuotation.contactPerson || { name: '', gender: 'Male' },
          customerContacts: header.customerContacts || processedQuotation.customerContacts || [],
          lineOfBusiness: header.lineOfBusiness || processedQuotation.lineOfBusiness || { type: 'karoseri' },
          deliveryTerms: header.deliveryTerms || processedQuotation.deliveryTerms || '',
          deliveryNotes: header.deliveryNotes || processedQuotation.deliveryNotes || '',
          targetCloseDate: formatDateInput(header.targetCloseDate || processedQuotation.targetCloseDate),
          paymentTerms: header.paymentTerms || processedQuotation.paymentTerms || DEFAULT_PAYMENT_TERMS,
          inclusionNotes: header.inclusionNotes || processedQuotation.inclusionNotes || '',
          exclusionNotes: header.exclusionNotes || processedQuotation.exclusionNotes || '',
          isTaxIncluded: typeof (header.isTaxIncluded ?? processedQuotation.isTaxIncluded) === 'boolean'
            ? (header.isTaxIncluded ?? processedQuotation.isTaxIncluded)
            : false,
          includePPN: typeof (header.includePPN ?? processedQuotation.includePPN) === 'boolean'
            ? (header.includePPN ?? processedQuotation.includePPN)
            : true,
          offerItems: offerItems,
          excludePPN: typeof (header.includePPN ?? processedQuotation.includePPN) === 'boolean'
            ? !(header.includePPN ?? processedQuotation.includePPN)
            : false,
          notes: '',
          notesImages: []
        };
        console.log('QuotationForm: Setting formData for create-quotation from RFQ:', rfqFormData);
        console.log('QuotationForm: RFQ offerItems:', firstOffer?.offerItems);
        console.log('QuotationForm: processedQuotation structure:', processedQuotation);
        console.log('QuotationForm: header data:', header);
        console.log('QuotationForm: firstOffer data:', firstOffer);
        console.log('QuotationForm: extracted offerItems:', offerItems);
        console.log('QuotationForm: offerItems length:', offerItems.length);
        setFormData(rfqFormData);
        setQuotationNumber('');
        setNotesImagesData([]);
        setPendingImages([]);
        setRemovedImages([]);
      } else if (mode === 'new-offer') {
        // For creating new offer, keep customer info but clear product details
        const header = processedQuotation.header || processedQuotation;
        const newFormData = {
          customerName: header.customerName || '',
          contactPerson: header.contactPerson || { name: '', gender: 'Male' },
          customerContacts: header.customerContacts || [],
          lineOfBusiness: header.lineOfBusiness || { type: 'karoseri' },
          deliveryTerms: header.deliveryTerms || '',
          deliveryNotes: header.deliveryNotes || '',
          targetCloseDate: formatDateInput(header.targetCloseDate),
          paymentTerms: header.paymentTerms || DEFAULT_PAYMENT_TERMS,
          inclusionNotes: header.inclusionNotes || '',
          exclusionNotes: header.exclusionNotes || '',
          isTaxIncluded: typeof header.isTaxIncluded === 'boolean' ? header.isTaxIncluded : false,
          includePPN: typeof header.includePPN === 'boolean' ? header.includePPN : true,
          offerItems: [],
          excludePPN: typeof header.includePPN === 'boolean' ? !header.includePPN : false,
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
        
        const offerExcludePPN = Boolean(activeOffer.excludePPN);
        const headerIncludePPN = typeof header.includePPN === 'boolean' ? header.includePPN : !offerExcludePPN;

        const editFormData = {
          customerName: header.customerName || '',
          contactPerson: header.contactPerson || { name: '', gender: 'Male' },
          customerContacts: header.customerContacts || [],
          lineOfBusiness: header.lineOfBusiness || { type: 'karoseri' },
          deliveryTerms: header.deliveryTerms || '',
          deliveryNotes: header.deliveryNotes || '',
          targetCloseDate: formatDateInput(header.targetCloseDate),
          paymentTerms: header.paymentTerms || DEFAULT_PAYMENT_TERMS,
          inclusionNotes: header.inclusionNotes || '',
          exclusionNotes: header.exclusionNotes || '',
          isTaxIncluded: typeof header.isTaxIncluded === 'boolean' ? header.isTaxIncluded : false,
          includePPN: headerIncludePPN,
          offerItems: activeOffer.offerItems || [],
          excludePPN: offerExcludePPN,
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
  }, [processedQuotation, activeOffer, mode, loadNotesImagesData, rfqId]);

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

  // Customer contacts management functions
  const addCustomerContact = () => {
    setFormData(prev => ({
      ...prev,
      customerContacts: [...prev.customerContacts, { key: '', value: '' }]
    }));
  };

  const buildRfqUpdatePayload = useCallback(() => {
    const trimmedPaymentTerms = formData.paymentTerms && formData.paymentTerms.trim()
      ? formData.paymentTerms.trim()
      : DEFAULT_PAYMENT_TERMS;

    return {
      customerName: formData.customerName?.trim() || '',
      contactPerson: {
        name: formData.contactPerson?.name?.trim() || '',
        gender: formData.contactPerson?.gender || 'Male'
      },
      customerContacts: formData.customerContacts || [],
      lineOfBusiness: formData.lineOfBusiness || { type: 'karoseri' },
      deliveryTerms: formData.deliveryTerms?.trim() || '',
      deliveryNotes: formData.deliveryNotes?.trim() || '',
      targetCloseDate: formData.targetCloseDate || null,
      paymentTerms: trimmedPaymentTerms,
      inclusionNotes: formData.inclusionNotes?.trim() || '',
      exclusionNotes: formData.exclusionNotes?.trim() || '',
      isTaxIncluded: Boolean(formData.isTaxIncluded),
      includePPN: Boolean(formData.includePPN)
    };
  }, [formData]);

  const syncRfqDetails = useCallback(async () => {
    if (!resolvedRfqId) return;
    const payload = buildRfqUpdatePayload();
    console.log('[QuotationForm] Syncing RFQ details via quotation form:', payload);
    await ApiHelper.patch(`/api/rfq/${encodeURIComponent(resolvedRfqId)}`, payload);
  }, [resolvedRfqId, buildRfqUpdatePayload]);

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
  setSelectedSparepartIndices(prev =>
    prev
      .filter((value) => value !== index)
      .map((value) => (value > index ? value - 1 : value))
  );
    setFormData(prev => ({
      ...prev,
      offerItems: prev.offerItems.filter((_, i) => i !== index)
    }));
  };

const computeServiceSuggestedNetto = (item) => {
  if (!item) return 0;
  const basePrice = Number(item.price) || 0;
  const commissionValue = Number(item.commission) || 0;
  const rawDiscountValue = Number(item.discountValue) || 0;
  const discountType = item.discountType || 'percentage';
  const discountAmount =
    discountType === 'percentage' ? (basePrice * rawDiscountValue) / 100 : rawDiscountValue;

  const suggested = basePrice - discountAmount - commissionValue;
  return suggested > 0 ? suggested : 0;
};

const updateServiceItem = (itemIndex, updates) => {
  if (typeof itemIndex !== 'number' || itemIndex < 0) return;
  setFormData(prev => {
    if (!prev.offerItems || itemIndex >= prev.offerItems.length) {
      return prev;
    }
    const updatedItems = [...prev.offerItems];
    const currentItem = {
      ...updatedItems[itemIndex],
      ...updates
    };
    updatedItems[itemIndex] = currentItem;
    return {
      ...prev,
      offerItems: updatedItems
    };
  });
  };

  const editOfferItem = (index) => {
  if (typeof index !== 'number' || index < 0) {
    setEditingItemIndex(-1);
    return;
  }

  setFormData(prev => {
    if (!prev.offerItems || index >= prev.offerItems.length) {
      return prev;
    }

    const updatedItems = [...prev.offerItems];
    const item = { ...updatedItems[index] };
    let changed = false;

    if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) {
      item.quantity = 1;
      changed = true;
    }
    if (!item.discountType) {
      item.discountType = 'percentage';
      changed = true;
    }
    if (item.discountValue === undefined || item.discountValue === null) {
      item.discountValue = 0;
      changed = true;
    }
    if (item.commission === undefined || item.commission === null) {
      item.commission = 0;
      changed = true;
    }
    if (item.netto === undefined || item.netto === null) {
      const fallbackPrice = Number(item.price) || 0;
      item.netto = computeServiceSuggestedNetto(item) || fallbackPrice;
      changed = true;
    }

    if (changed) {
      updatedItems[index] = item;
      return {
        ...prev,
        offerItems: updatedItems
      };
    }

    return prev;
  });

    setEditingItemIndex(index);
  };

const computeSparepartFinancials = (item = {}) => {
  const rawQuantity = Number(item.quantity);
  const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1;
  const rawBasePerUnit = Number(item.pricePerUnit);
  const basePerUnit = Number.isFinite(rawBasePerUnit) && rawBasePerUnit >= 0 ? rawBasePerUnit : 0;
  const discountType = item.discountType === 'flat' ? 'flat' : 'percentage';
  const rawDiscountValue = Number(item.discountValue);
  const discountValue = Number.isFinite(rawDiscountValue) && rawDiscountValue >= 0 ? rawDiscountValue : 0;
  let discountPerUnit =
    discountType === 'percentage' ? (basePerUnit * discountValue) / 100 : discountValue;
  if (discountPerUnit > basePerUnit) {
    discountPerUnit = basePerUnit;
  }
  const rawCommission = Number(item.commission);
  const commissionPerUnit = Number.isFinite(rawCommission) && rawCommission >= 0 ? rawCommission : 0;
  const clientNetPerUnit = Math.max(basePerUnit - discountPerUnit, 0);
  const internalNetPerUnit = Math.max(clientNetPerUnit - commissionPerUnit, 0);

  const baseTotal = basePerUnit * quantity;
  const discountTotal = discountPerUnit * quantity;
  const commissionTotal = commissionPerUnit * quantity;
  const clientNetTotal = clientNetPerUnit * quantity;
  const internalNetTotal = internalNetPerUnit * quantity;

  return {
    quantity,
    basePerUnit,
    discountType,
    discountValue,
    discountPerUnit,
    commissionPerUnit,
    clientNetPerUnit,
    internalNetPerUnit,
    baseTotal,
    discountTotal,
    commissionTotal,
    clientNetTotal,
    internalNetTotal
  };
};

const updateSparepartItem = (itemIndex, updates = {}) => {
  if (typeof itemIndex !== 'number' || itemIndex < 0) return;
  setFormData(prev => {
    if (!prev.offerItems || itemIndex >= prev.offerItems.length) {
      return prev;
    }

    const existingItems = [...prev.offerItems];
    const currentItem = {
      discountType: existingItems[itemIndex]?.discountType || 'percentage',
      discountValue: existingItems[itemIndex]?.discountValue ?? 0,
      commission: existingItems[itemIndex]?.commission ?? 0,
      quantity: existingItems[itemIndex]?.quantity ?? 1,
      pricePerUnit: existingItems[itemIndex]?.pricePerUnit ?? 0,
      ...existingItems[itemIndex],
      ...updates
    };

    currentItem.quantity = Math.max(1, Number(currentItem.quantity) || 1);
    currentItem.pricePerUnit = Number(currentItem.pricePerUnit) || 0;
    currentItem.discountType = currentItem.discountType === 'flat' ? 'flat' : 'percentage';
    currentItem.discountValue = Number(currentItem.discountValue) || 0;
    currentItem.commission = Number(currentItem.commission) || 0;

    const financial = computeSparepartFinancials(currentItem);
    currentItem.price = financial.baseTotal;
    currentItem.netto = financial.clientNetTotal;

    existingItems[itemIndex] = currentItem;

    return {
      ...prev,
      offerItems: existingItems
    };
  });
};

const toggleSparepartSelection = (index) => {
  setSelectedSparepartIndices(prev => {
    if (prev.includes(index)) {
      return prev.filter((value) => value !== index);
    }
    return [...prev, index];
  });
};

const toggleSelectAllSpareparts = (totalCount) => {
  setSelectedSparepartIndices(prev => {
    if (totalCount === 0) return [];
    if (prev.length === totalCount) {
      return [];
    }
    return Array.from({ length: totalCount }, (_, idx) => idx);
  });
};

const handleSparepartBulkApply = () => {
  if (selectedSparepartIndices.length === 0) {
    toast.error('Pilih minimal satu sparepart terlebih dahulu');
    return;
  }

  const discountValueProvided =
    sparepartBulkSettings.discountValue !== '' && sparepartBulkSettings.discountValue !== null;
  const commissionProvided =
    sparepartBulkSettings.commission !== '' && sparepartBulkSettings.commission !== null;

  if (!discountValueProvided && !commissionProvided) {
    toast.error('Masukkan nilai diskon atau komisi untuk diterapkan');
    return;
  }

  const parsedDiscountValue = discountValueProvided
    ? Math.max(Number(sparepartBulkSettings.discountValue) || 0, 0)
    : null;
  const parsedCommission = commissionProvided
    ? Math.max(Number(sparepartBulkSettings.commission) || 0, 0)
    : null;

  setFormData(prev => {
    if (!Array.isArray(prev.offerItems) || prev.offerItems.length === 0) {
      return prev;
    }

    const updatedItems = prev.offerItems.map((item, idx) => {
      if (!selectedSparepartIndices.includes(idx)) {
        return item;
      }
      const updatedItem = {
        ...item
      };

      if (discountValueProvided) {
        updatedItem.discountType =
          sparepartBulkSettings.discountType === 'flat' ? 'flat' : 'percentage';
        updatedItem.discountValue = parsedDiscountValue;
      }

      if (commissionProvided) {
        updatedItem.commission = parsedCommission;
      }

      const financial = computeSparepartFinancials(updatedItem);
      updatedItem.price = financial.baseTotal;
      updatedItem.netto = financial.clientNetTotal;

      return updatedItem;
    });

    return {
      ...prev,
      offerItems: updatedItems
    };
  });

  toast.success('Diskon dan komisi berhasil diterapkan');
  setSparepartBulkSettings(prev => ({
    ...prev,
    discountValue: '',
    commission: ''
  }));
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

      if (resolvedRfqId) {
        await syncRfqDetails();
      }

      if (mode === 'create-quotation' || mode === 'create-from-rfq') {
        // Create new quotation (header + first offer)
        const headerData = {};
        const offerData = {
          offerItems: formData.offerItems,
          excludePPN: formData.excludePPN,
          notes: formData.notes,
          notesImages: allNotesImages
        };

        console.log('Creating quotation with data:', { headerData, offerData, rfqId });
        console.log('Offer items being sent:', formData.offerItems);
        console.log('Notes images being sent:', allNotesImages);
        console.log('Uploaded image IDs:', uploadedImageIds);

        await ApiHelper.post('/api/quotations', { headerData, offerData, rfqId });
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
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {(mode === 'create-quotation' || mode === 'create-from-rfq') && 'Create New Quotation'}
            {mode === 'edit-offer' && 'Edit Quotation'}
            {mode === 'revision' && 'Create Quotation Revision'}
            {mode === 'new-offer' && 'Create New Offer'}
          </h2>
          {resolvedRfqId && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRfqCollapsed((prev) => !prev)}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {rfqCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                {rfqCollapsed ? 'Expand RFQ & Engineering' : 'Collapse RFQ & Engineering'}
              </button>
            <button
              type="button"
              onClick={handleShowRFQReference}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Eye size={16} />
                Open in Modal
            </button>
            </div>
          )}
        </div>
        {quotationNumber && (
          <div className="text-sm text-gray-600">
            Quotation Number: <span className="font-mono font-medium">{quotationNumber}</span>
            {quotation && quotation.revision > 0 && (
              <span className="ml-2 text-purple-600 font-medium">(Rev. {quotation.revision})</span>
            )}
          </div>
        )}
      </div>

      {resolvedRfqId && rfqCollapsed && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
          {rfqReferenceData ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Linked RFQ Summary</h3>
                  <p className="text-xs text-gray-500">
                    RFQ {rfqReferenceData.rfqNumber} • Stage: {rfqReferenceData.stage || 'n/a'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {rfqReferenceData.status && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 capitalize">
                      {rfqReferenceData.status.replace(/_/g, ' ')}
                    </span>
                  )}
                  {rfqReferenceData.priority && (
                    <span className="inline-flex items-center gap-2 text-xs text-gray-500">
                      Priority: <span className="font-medium text-gray-800 capitalize">{rfqReferenceData.priority}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 block text-xs uppercase tracking-wide">Customer</span>
                  <span className="font-semibold text-gray-900">
                    {formData.customerName || rfqReferenceData.customerName || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs uppercase tracking-wide">Contact Person</span>
                  <span className="font-semibold text-gray-900">
                    {formData.contactPerson?.name || rfqReferenceData.contactPerson?.name || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs uppercase tracking-wide">Delivery Terms</span>
                  <span className="font-semibold text-gray-900">
                    {formData.deliveryTerms || rfqReferenceData.deliveryTerms || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs uppercase tracking-wide">Payment Terms</span>
                  <span className="font-semibold text-gray-900">
                    {formData.paymentTerms || rfqReferenceData.paymentTerms || '—'}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Expand the RFQ section to review or edit these details while you adjust the offer.
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">Loading RFQ summary…</p>
          )}
        </div>
      )}

      {shouldShowRfqSections && (
        <>
      {/* Basic Information */}
          <FormSection
            title="Customer & Contact Details"
            intent="user"
            description="These details populate the quotation header and appear on customer-facing documents."
            bodyClassName="mt-4"
          >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Name (Company) *
            </label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => handleInputChange('customerName', e.target.value)}
                  readOnly={false}
                  disabled={false}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-500"
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
                  readOnly={false}
                  disabled={false}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-500"
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

          {/* Customer Contacts */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Customer Contacts (Optional)
              </label>
              <button
                type="button"
                onClick={addCustomerContact}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                disabled={loading || mode === 'new-offer' || mode === 'edit-offer' || mode === 'revision'}
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
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      mode === 'new-offer' || mode === 'edit-offer' || mode === 'revision'
                        ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="e.g., Phone, Email"
                    disabled={loading || mode === 'new-offer' || mode === 'edit-offer' || mode === 'revision'}
                  />
                </div>
                <div className="col-span-12 md:col-span-7">
                  <input
                    type="text"
                    value={contact.value}
                    onChange={(e) => updateCustomerContact(index, 'value', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      mode === 'new-offer' || mode === 'edit-offer' || mode === 'revision'
                        ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="Contact value"
                    disabled={loading || mode === 'new-offer' || mode === 'edit-offer' || mode === 'revision'}
                  />
                </div>
                <div className="col-span-12 md:col-span-1">
                  <button
                    type="button"
                    onClick={() => removeCustomerContact(index)}
                    className={`w-full px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition ${
                      mode === 'new-offer' || mode === 'edit-offer' || mode === 'revision' 
                        ? 'opacity-50 cursor-not-allowed' 
                        : ''
                    }`}
                    disabled={loading || mode === 'new-offer' || mode === 'edit-offer' || mode === 'revision'}
                  >
                    <X className="w-5 h-5 mx-auto" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Type *
            </label>
            <CustomDropdown
              options={[
                { value: 'karoseri', label: 'Karoseri (Body Building)' },
                { value: 'service', label: 'Services' },
                { value: 'sparepart', label: 'Spareparts' }
              ]}
              value={formData.lineOfBusiness?.type || 'karoseri'}
              onChange={(value) => setFormData(prev => ({ ...prev, lineOfBusiness: { type: value } }))}
              disabled={mode === 'edit-offer' || mode === 'revision'}
              placeholder="Select business type"
              required={true}
            />
          </div>
        </div>
          </FormSection>

      {/* Commercial Terms */}
          <FormSection
            title="Commercial Terms"
            intent="user"
            description="Define the commercial commitments you will share with the customer."
            bodyClassName="mt-4"
          >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Close Date
            </label>
            <input
              type="date"
              value={formData.targetCloseDate}
              onChange={(e) => handleInputChange('targetCloseDate', e.target.value)}
              disabled={isHeaderReadOnly}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                isHeaderReadOnly
                  ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Terms
            </label>
            <input
              type="text"
              value={formData.deliveryTerms}
              onChange={(e) => handleInputChange('deliveryTerms', e.target.value)}
              disabled={isHeaderReadOnly}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                isHeaderReadOnly
                  ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="e.g., FOB Jakarta"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Notes
            </label>
            <textarea
              value={formData.deliveryNotes}
              onChange={(e) => handleInputChange('deliveryNotes', e.target.value)}
              disabled={isHeaderReadOnly}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                isHeaderReadOnly
                  ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="Additional delivery notes..."
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Terms
            </label>
            <textarea
              value={formData.paymentTerms}
              onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
              disabled={isHeaderReadOnly}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                isHeaderReadOnly
                  ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder={DEFAULT_PAYMENT_TERMS}
            />
            <p className="mt-1 text-xs text-gray-500">
              Default: {DEFAULT_PAYMENT_TERMS}
            </p>
          </div>
          <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Treatment
              </label>
                <div className="inline-flex rounded-md border border-gray-300 bg-white px-1 py-1">
                  <button
                    type="button"
                    onClick={() => handleTaxTreatmentChange('inclusive')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      taxSelection === 'inclusive'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Tax Inclusive (Includes PPN)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTaxTreatmentChange('exclusive')}
                    className={`ml-1 px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      taxSelection === 'exclusive'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Tax Exclusive (PPN Added Later)
                  </button>
            </div>
                <p className="mt-1 text-xs text-gray-500">
                  Indicates whether your entered prices already include PPN (inclusive) or are net of tax (exclusive). Values entered below remain unchanged either way.
                </p>
          </div>
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Inclusion Notes
              </label>
              <textarea
                value={formData.inclusionNotes}
                onChange={(e) => handleInputChange('inclusionNotes', e.target.value)}
                disabled={isHeaderReadOnly}
                rows={3}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  isHeaderReadOnly
                    ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="Items or services included..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exclusion Notes
              </label>
              <textarea
                value={formData.exclusionNotes}
                onChange={(e) => handleInputChange('exclusionNotes', e.target.value)}
                disabled={isHeaderReadOnly}
                rows={3}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  isHeaderReadOnly
                    ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="Items or services excluded..."
              />
            </div>
          </div>
            </div>
          </FormSection>

          {resolvedRfqId && (
            <FormSection
              title="Engineering Review"
              intent="helper"
              description="Latest feedback from engineering for this RFQ."
              bodyClassName="mt-4 space-y-4"
            >
              {engineeringTransit ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium text-gray-700">Assigned To:</span>{' '}
                      {engineeringTransit.assignedTo?.fullName ||
                        engineeringTransit.assignedTo?.email ||
                        '—'}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Reviewed By:</span>{' '}
                      {engineeringTransit.reviewedBy?.fullName ||
                        engineeringTransit.reviewedBy?.email ||
                        '—'}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Reviewed At:</span>{' '}
                      {engineeringTransit.reviewedAt
                        ? new Date(engineeringTransit.reviewedAt).toLocaleString()
                        : '—'}
        </div>
      </div>

                  {engineeringTransit.comments && engineeringTransit.comments.trim() && (
                    <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
                      {engineeringTransit.comments}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Specification Updates
                      </p>
                      <span className="text-xs text-gray-400">
                        {engineeringChanges.length} item{engineeringChanges.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    {engineeringChanges.length > 0 ? (
                      <div className="space-y-3">
                        {engineeringChanges.map(({ key, itemNumber, original, modified }) => (
                          <div
                            key={key}
                            className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-sm font-semibold text-gray-800">
                                Item {itemNumber}
                              </span>
                              {modified?.karoseri && (
                                <span className="text-xs text-gray-500">
                                  {modified.karoseri}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div className="rounded-md border border-gray-200 bg-white p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Before
                                </p>
                                <div className="mt-2 space-y-2">
                                  {renderEngineeringItemDetails(
                                    original,
                                    rfqReferenceData?.lineOfBusiness?.type || formData.lineOfBusiness?.type
                                  )}
                                </div>
                              </div>
                              <div className="rounded-md border border-gray-200 bg-white p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  After
                                </p>
                                <div className="mt-2 space-y-2">
                                  {renderEngineeringItemDetails(
                                    modified,
                                    rfqReferenceData?.lineOfBusiness?.type || formData.lineOfBusiness?.type
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        No specification changes recorded by engineering.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  This RFQ has not been reviewed by engineering yet.
                </p>
              )}
            </FormSection>
          )}
        </>
      )}

      {/* Offer Items - only show for karoseri business type */}
      {formData.lineOfBusiness?.type === 'karoseri' && (
        <FormSection
          title="Offer Items"
          intent="user"
          description="List each karoseri configuration you plan to quote. Totals update automatically as you add items."
          actions={(
          <button
            type="button"
            onClick={addOfferItem}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </button>
          )}
          bodyClassName="mt-4"
        >
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
                      <p className="text-sm text-gray-600">{item.karoseri} - {item.chassis} {item.chassisModel ? `- ${item.chassisModel}` : ''}</p>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 text-sm">
                    <div className="lg:col-span-1">
                      <span className="text-gray-600 block">Quantity</span>
                      <p className="font-semibold text-gray-900">{item.quantity || 1}</p>
                    </div>
                    <div className="lg:col-span-1">
                      <span className="text-gray-600 block">Base Price</span>
                      <p className="font-semibold text-gray-900">{formatPriceWithCurrency(item.price)}</p>
                    </div>
                    <div className="lg:col-span-1">
                      <span className="text-gray-600 block">Discount</span>
                      <p className="font-semibold text-gray-900">
                        {item.discountType === 'percentage'
                          ? `${item.discountValue || 0}%`
                          : formatPriceWithCurrency(item.discountValue || 0)}
                      </p>
                    </div>
                    <div className="lg:col-span-1">
                      <span className="text-gray-600 block">Commission</span>
                      <p className="font-semibold text-gray-900">{formatPriceWithCurrency(item.commission || 0)}</p>
                    </div>
                    <div className="lg:col-span-1">
                      <span className="text-gray-600 block">Netto (Each)</span>
                      <p className="font-semibold text-gray-900">{formatPriceWithCurrency(item.netto)}</p>
                    </div>
                    <div className="lg:col-span-1">
                      <span className="text-gray-600 block">Netto Total</span>
                      <p className="font-semibold text-gray-900">
                        {formatPriceWithCurrency((item.netto || 0) * (item.quantity || 1))}
                      </p>
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
        </FormSection>
      )}

      {/* Offer Items - Service Type */}
      {formData.lineOfBusiness?.type === 'service' && (
        <FormSection
          title="Service Items"
          intent="user"
          description="Capture each service deliverable and price. Totals adjust automatically."
          actions={(
          <button
            type="button"
            onClick={() => setAddingServiceItem(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </button>
          )}
          bodyClassName="mt-4 space-y-4"
        >
          {formData.offerItems.map((item, itemIndex) => (
            editingItemIndex === itemIndex ? (
              (() => {
                const serviceItem = formData.offerItems[itemIndex] || {};
                const quantity = Number(serviceItem.quantity) > 0 ? Number(serviceItem.quantity) : 1;
                const discountType = serviceItem.discountType || 'percentage';
                const rawDiscountValue = Number(serviceItem.discountValue) || 0;
                const basePrice = Number(serviceItem.price) || 0;
                const commissionValue = Number(serviceItem.commission) || 0;
                const discountAmount =
                  discountType === 'percentage'
                    ? (basePrice * rawDiscountValue) / 100
                    : rawDiscountValue;
                const nettoPerQuantity =
                  Number(serviceItem.netto) || computeServiceSuggestedNetto(serviceItem);
                const totalNetto = nettoPerQuantity * quantity;

                return (
              <div key={itemIndex} className="border-2 border-blue-500 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
                    <input
                      type="text"
                          value={serviceItem.serviceName || ''}
                          onChange={(e) => updateServiceItem(itemIndex, { serviceName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter service name"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Service Details</label>
                    <div className="space-y-2">
                          {(serviceItem.serviceDetails || []).map((detail, detailIndex) => (
                        <div key={detailIndex} className="flex gap-2">
                          <input
                            type="text"
                            value={detail}
                            onChange={(e) => {
                                  const details = [...(serviceItem.serviceDetails || [])];
                                  details[detailIndex] = e.target.value;
                                  updateServiceItem(itemIndex, { serviceDetails: details });
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter service detail"
                          />
                          <button
                            type="button"
                            onClick={() => {
                                  const details = (serviceItem.serviceDetails || []).filter((_, i) => i !== detailIndex);
                                  updateServiceItem(itemIndex, { serviceDetails: details });
                            }}
                            className="px-3 py-2 text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                              const details = [...(serviceItem.serviceDetails || []), ''];
                              updateServiceItem(itemIndex, { serviceDetails: details });
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        + Add Detail
                      </button>
                    </div>
                  </div>

                      <div className="md:col-span-2 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Quantity *
                            </label>
                            <div className="relative rounded-lg border border-gray-200 bg-white shadow-sm">
                              <input
                                type="number"
                                value={quantity}
                                onChange={(e) => {
                                  const parsed = parseInt(e.target.value, 10);
                                  const safeValue = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
                                  updateServiceItem(itemIndex, { quantity: safeValue });
                                }}
                                className="w-full px-4 py-3 pr-16 text-lg font-semibold text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-none"
                                placeholder="1"
                                min="1"
                                step="1"
                                required
                              />
                              <span className="absolute inset-y-0 right-0 flex items-center px-3 text-sm text-gray-400 border-l border-gray-100">
                                units
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Base Price per Quantity *
                            </label>
                            <div className="rounded-lg border border-blue-200 bg-blue-50 shadow-sm px-3 py-2">
                              <p className="text-[11px] text-blue-600 font-semibold uppercase tracking-wide">Gross Price</p>
                    <PriceInput
                                value={basePrice}
                                onChange={(value) => updateServiceItem(itemIndex, { price: value || 0 })}
                                placeholder="0"
                                required
                                className="bg-transparent border-none shadow-none px-0 text-lg font-semibold text-blue-900"
                              />
                              <p className="text-[10px] text-blue-500 mt-1">
                                Enter the service price per quantity before discounts.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Discount per Quantity
                            </label>
                            <div className="rounded-lg border border-amber-200 bg-amber-50 shadow-sm px-4 py-3 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">
                                  Discount Type
                                </span>
                                <select
                                  value={discountType}
                                  onChange={(e) => updateServiceItem(itemIndex, { discountType: e.target.value, discountValue: 0 })}
                                  className="text-sm font-medium text-amber-800 bg-white border border-amber-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                >
                                  <option value="percentage">Percent (%)</option>
                                  <option value="flat">Flat (Rp)</option>
                                </select>
                              </div>
                              <div>
                                {discountType === 'flat' ? (
                                  <PriceInput
                                    value={rawDiscountValue}
                                    onChange={(value) => updateServiceItem(itemIndex, { discountValue: value || 0 })}
                                    placeholder="0"
                                    className="bg-white border border-amber-200 rounded-md text-sm font-semibold text-amber-900"
                                  />
                                ) : (
                                  <div className="relative">
                                    <input
                                      type="number"
                                      value={rawDiscountValue}
                                      onChange={(e) => {
                                        const parsed = parseFloat(e.target.value);
                                        const safeValue = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
                                        updateServiceItem(itemIndex, { discountValue: safeValue });
                                      }}
                                      className="w-full pl-3 pr-8 py-2 border border-amber-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-semibold text-amber-900"
                      placeholder="0"
                    />
                                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-amber-500 font-semibold">%</span>
                  </div>
                                )}
                              </div>
                              <p className="text-[10px] text-amber-600">
                                {discountType === 'percentage'
                                  ? 'Percentage discount applied to the base price per quantity.'
                                  : 'Flat discount amount deducted from the base price.'}
                              </p>
                            </div>
                          </div>

                  <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Commission per Quantity (Optional)
                            </label>
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 shadow-sm px-3 py-2">
                              <p className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wide">
                                Sales Commission
                              </p>
                              <PriceInput
                                value={commissionValue}
                                onChange={(value) => updateServiceItem(itemIndex, { commission: value || 0 })}
                                placeholder="0"
                                className="bg-transparent border-none shadow-none px-0 text-lg font-semibold text-emerald-900"
                              />
                              <p className="text-[10px] text-emerald-500 mt-1">
                                Amount reserved as commission per quantity (does not change client-facing totals).
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Netto per Quantity *
                            </label>
                            <div className="rounded-lg border border-purple-200 bg-purple-50 shadow-sm px-4 py-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wide">
                                  Final Netto
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateServiceItem(itemIndex, { netto: computeServiceSuggestedNetto(serviceItem) })}
                                  className="text-[11px] bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 transition"
                                >
                                  Use {formatPriceWithCurrency(computeServiceSuggestedNetto(serviceItem))}
                                </button>
                              </div>
                              <PriceInput
                                value={nettoPerQuantity}
                                onChange={(value) => updateServiceItem(itemIndex, { netto: value || 0 })}
                                placeholder="0"
                                required
                                className="bg-white border border-purple-200 rounded-md text-lg font-semibold text-purple-900"
                              />
                              <p className="text-[10px] text-purple-500">
                                Final price per quantity after discount and commission.
                              </p>
                            </div>
                          </div>

                          <div className="sm:col-span-2">
                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-600">Price Summary</span>
                                <span className="text-xs text-gray-500">per item</span>
                              </div>
                              <div className="flex items-center justify-between text-sm text-gray-600">
                                <span>Base Price</span>
                                <span className="font-medium text-gray-800">
                                  {formatPriceWithCurrency(basePrice)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm text-amber-600">
                                <span>Discount {discountType === 'percentage' ? `(${rawDiscountValue || 0}%)` : ''}</span>
                                <span className="font-medium">
                                  {formatPriceWithCurrency(discountAmount)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm text-emerald-600">
                                <span>Commission</span>
                                <span className="font-medium">
                                  {formatPriceWithCurrency(commissionValue)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm text-purple-600">
                                <span>Netto / Qty</span>
                                <span className="font-semibold">
                                  {formatPriceWithCurrency(nettoPerQuantity)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm text-blue-700 border-t border-gray-200 pt-2">
                                <span className="font-semibold">Total Netto</span>
                                <span className="font-semibold">
                                  {formatPriceWithCurrency(totalNetto)}
                                </span>
                              </div>
                              {quantity > 1 && (
                                <p className="text-[11px] text-gray-500 italic">
                                  Calculation: {formatPriceWithCurrency(nettoPerQuantity)} × {quantity}
                                </p>
                              )}
                              <p className="text-[11px] text-gray-500">
                                Suggestion uses: Base ({formatPriceWithCurrency(basePrice)}) − Discount ({formatPriceWithCurrency(discountAmount)}) − Commission ({formatPriceWithCurrency(commissionValue)}).
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                          value={serviceItem.notes || ''}
                          onChange={(e) => updateServiceItem(itemIndex, { notes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional notes"
                    />
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingItemIndex(-1)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItemIndex(-1);
                        toast.success('Service item saved');
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
                );
              })()
            ) : (
              <div key={itemIndex} className="border border-gray-200 rounded-lg p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.serviceName || 'Untitled Service'}</h4>
                    {item.serviceDetails && item.serviceDetails.length > 0 && (
                      <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                        {item.serviceDetails.map((detail, idx) => (
                          <li key={idx}>{detail}</li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 space-y-2 text-sm">
                      <div className="flex items-center justify-between text-gray-600">
                        <span>Quantity</span>
                        <span className="font-semibold text-gray-800">
                          {Number(item.quantity) > 0 ? Number(item.quantity) : 1}
                        </span>
                  </div>
                      <div className="flex items-center justify-between text-gray-600">
                        <span>Base Price / Qty</span>
                        <span className="font-semibold text-gray-800">
                          {formatPriceWithCurrency(Number(item.price) || 0)}
                        </span>
                    </div>
                      <div className="flex items-center justify-between text-amber-600">
                        <span>
                          Discount{' '}
                          {item.discountType === 'percentage'
                            ? `(${Number(item.discountValue) || 0}%)`
                            : ''}
                        </span>
                        <span className="font-semibold">
                          {formatPriceWithCurrency(
                            (item.discountType || 'percentage') === 'percentage'
                              ? (Number(item.price) || 0) * (Number(item.discountValue) || 0) / 100
                              : Number(item.discountValue) || 0
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-emerald-600">
                        <span>Commission / Qty</span>
                        <span className="font-semibold">
                          {formatPriceWithCurrency(Number(item.commission) || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-purple-600">
                        <span>Netto / Qty</span>
                        <span className="font-semibold">
                          {formatPriceWithCurrency(Number(item.netto) || computeServiceSuggestedNetto(item))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-blue-700 border-t border-gray-200 pt-2">
                        <span className="font-semibold">Total Netto</span>
                        <span className="font-semibold">
                          {formatPriceWithCurrency(
                            (Number(item.netto) || computeServiceSuggestedNetto(item)) *
                              (Number(item.quantity) > 0 ? Number(item.quantity) : 1)
                          )}
                        </span>
                      </div>
                      {Number(item.quantity) > 1 && (
                        <p className="text-[11px] text-gray-500 italic">
                          Calculation: {formatPriceWithCurrency(Number(item.netto) || computeServiceSuggestedNetto(item))} ×{' '}
                          {Number(item.quantity) > 0 ? Number(item.quantity) : 1}
                        </p>
                      )}
                    </div>
                    {item.notes && (
                      <p className="text-sm text-gray-500 mt-2">
                        Notes: {item.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 self-end md:self-start">
                    <button
                      type="button"
                      onClick={() => editOfferItem(itemIndex)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteOfferItem(itemIndex)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          ))}
          
          {addingServiceItem && (
            <div className="border-2 border-blue-500 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
                  <input
                    type="text"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    onBlur={() => {
                      if (newServiceName.trim()) {
                        const newItem = {
                          serviceName: newServiceName.trim(),
                          serviceDetails: [],
                          price: 0,
                          discountType: 'percentage',
                          discountValue: 0,
                          commission: 0,
                          netto: 0,
                          notes: '',
                          quantity: 1,
                          itemNumber: formData.offerItems.length + 1
                        };
                        setFormData(prev => ({ ...prev, offerItems: [...prev.offerItems, newItem] }));
                        setAddingServiceItem(false);
                        setEditingItemIndex(formData.offerItems.length);
                        setNewServiceName('');
                      }
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newServiceName.trim()) {
                        const newItem = {
                          serviceName: newServiceName.trim(),
                          serviceDetails: [],
                          price: 0,
                          discountType: 'percentage',
                          discountValue: 0,
                          commission: 0,
                          netto: 0,
                          notes: '',
                          quantity: 1,
                          itemNumber: formData.offerItems.length + 1
                        };
                        setFormData(prev => ({ ...prev, offerItems: [...prev.offerItems, newItem] }));
                        setAddingServiceItem(false);
                        setEditingItemIndex(formData.offerItems.length);
                        setNewServiceName('');
                        e.preventDefault();
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter service name"
                    autoFocus
                  />
                </div>
              </div>
            </div>
          )}
          
          {formData.offerItems.length === 0 && editingItemIndex === -1 && !addingServiceItem && (
            <div className="text-center py-8 text-gray-500">
              <p>No service items added yet. Click "Add Service" to start.</p>
            </div>
          )}
        </FormSection>
      )}

      {/* Offer Items - Sparepart Type */}
      {formData.lineOfBusiness?.type === 'sparepart' && (
        <FormSection
          title="Sparepart Items"
          intent="user"
          description="Detail each sparepart, quantity, and pricing. Totals refresh as you edit."
          actions={(
          <button
            type="button"
            onClick={() => setAddingSparepartItem(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Sparepart
          </button>
          )}
          bodyClassName="mt-4 space-y-4"
        >
          {formData.offerItems.length > 0 && (
            <div className="border border-blue-100 bg-blue-50 rounded-lg p-4 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSelectAllSpareparts(formData.offerItems.length)}
                    className="px-3 py-1 text-sm font-medium text-blue-600 border border-blue-300 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    {selectedSparepartIndices.length === formData.offerItems.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                  <span className="text-sm text-gray-600">
                    {selectedSparepartIndices.length} selected
                  </span>
                </div>
                {selectedSparepartIndices.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSparepartIndices([])}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
                    >
                      Clear Selection
                    </button>
                  </div>
                )}
        </div>
        
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                    Discount Type
                  </label>
                  <select
                    value={sparepartBulkSettings.discountType}
                    onChange={(e) =>
                      setSparepartBulkSettings((prev) => ({
                        ...prev,
                        discountType: e.target.value === 'flat' ? 'flat' : 'percentage'
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="percentage">Percent (%)</option>
                    <option value="flat">Flat (Rp)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                    Discount Value
                  </label>
                  {sparepartBulkSettings.discountType === 'percentage' ? (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={sparepartBulkSettings.discountValue}
                      onChange={(e) =>
                        setSparepartBulkSettings((prev) => ({
                          ...prev,
                          discountValue: e.target.value
                        }))
                      }
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={sparepartBulkSettings.discountValue}
                      onChange={(e) =>
                        setSparepartBulkSettings((prev) => ({
                          ...prev,
                          discountValue: e.target.value
                        }))
                      }
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  <p className="text-[11px] text-gray-500 mt-1">
                    Leave blank to skip updating discount.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                    Commission per Qty (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={sparepartBulkSettings.commission}
                    onChange={(e) =>
                      setSparepartBulkSettings((prev) => ({
                        ...prev,
                        commission: e.target.value
                      }))
                    }
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Leave blank to skip updating commission.
                  </p>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleSparepartBulkApply}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Apply to Selected
                  </button>
                </div>
              </div>
            </div>
          )}
          {formData.offerItems.map((item, itemIndex) => (
            editingItemIndex === itemIndex ? (
              <div key={itemIndex} className="border-2 border-blue-500 rounded-lg p-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sparepart Name *</label>
                    <input
                      type="text"
                      value={item.sparepartName || ''}
                      onChange={(e) => {
                        updateSparepartItem(itemIndex, { sparepartName: e.target.value });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter sparepart name"
                    />
                  </div>
                  {(() => {
                    const financial = computeSparepartFinancials(item);
                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  <div>
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                            Quantity *
                          </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity || 1}
                      onChange={(e) => {
                              const qty = parseInt(e.target.value, 10);
                              updateSparepartItem(itemIndex, {
                                quantity: Number.isFinite(qty) && qty > 0 ? qty : 1
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                            Base Price per Qty *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                      value={item.pricePerUnit || 0}
                            onChange={(e) =>
                              updateSparepartItem(itemIndex, {
                                pricePerUnit: Number(e.target.value) || 0
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                          <p className="text-[11px] text-gray-500 mt-1">
                            Total base: {formatPriceWithCurrency(financial.baseTotal)}
                          </p>
                  </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                            Discount
                          </label>
                          <div className="flex gap-2">
                            <select
                              value={item.discountType || 'percentage'}
                              onChange={(e) =>
                                updateSparepartItem(itemIndex, { discountType: e.target.value })
                              }
                              className="px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="percentage">%</option>
                              <option value="flat">Rp</option>
                            </select>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.discountValue || 0}
                              onChange={(e) =>
                                updateSparepartItem(itemIndex, {
                                  discountValue: Number(e.target.value) || 0
                                })
                              }
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="0"
                            />
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1">
                            Discount per qty: {formatPriceWithCurrency(financial.discountPerUnit)}
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                            Commission per Qty
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.commission || 0}
                            onChange={(e) =>
                              updateSparepartItem(itemIndex, {
                                commission: Number(e.target.value) || 0
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                          />
                          <p className="text-[11px] text-gray-500 mt-1">
                            Commission total: {formatPriceWithCurrency(financial.commissionTotal)}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {(() => {
                    const financial = computeSparepartFinancials(item);
                    return (
                      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 space-y-1 text-sm text-gray-700">
                        <div>
                          <span className="font-semibold text-gray-600">Netto / Qty:</span>{' '}
                          {formatPriceWithCurrency(financial.clientNetPerUnit)}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600">Netto Total:</span>{' '}
                          {formatPriceWithCurrency(financial.clientNetTotal)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Perhitungan: {formatPriceWithCurrency(financial.basePerUnit)} −{' '}
                          {formatPriceWithCurrency(financial.discountPerUnit)}
                          {item.discountType === 'percentage' ? ` (${item.discountValue || 0}%)` : ''}{' '}
                          − {formatPriceWithCurrency(financial.commissionPerUnit)} (komisi) ={' '}
                          {formatPriceWithCurrency(financial.clientNetPerUnit)} / qty
                        </div>
                      </div>
                    );
                  })()}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={item.notes || ''}
                      onChange={(e) => {
                        const updated = [...formData.offerItems];
                        updated[itemIndex] = { ...updated[itemIndex], notes: e.target.value };
                        setFormData(prev => ({ ...prev, offerItems: updated }));
                      }}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional notes"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingItemIndex(-1)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItemIndex(-1);
                        toast.success('Sparepart item saved');
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div key={itemIndex} className="border border-gray-200 rounded-lg p-4">
                {(() => {
                  const financial = computeSparepartFinancials(item);
                  const isSelected = selectedSparepartIndices.includes(itemIndex);
                  return (
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSparepartSelection(itemIndex)}
                          className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                  <div className="flex-1">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <h4 className="font-semibold text-gray-900">
                              {item.sparepartName || 'Untitled Sparepart'}
                            </h4>
                            <span className="text-xs text-gray-500">
                              Qty: {financial.quantity} · Harga / qty: {formatPriceWithCurrency(financial.clientNetPerUnit)}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                            <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                              <p className="text-[11px] uppercase text-gray-500 font-semibold">
                                Base Price / Qty
                              </p>
                              <p className="font-medium text-gray-800">
                                {formatPriceWithCurrency(financial.basePerUnit)}
                              </p>
                              <p className="text-[11px] text-gray-500">
                                Total: {formatPriceWithCurrency(financial.baseTotal)}
                    </p>
                  </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                              <p className="text-[11px] uppercase text-amber-600 font-semibold">
                                Discount
                              </p>
                              <p className="font-medium text-amber-700">
                                {item.discountType === 'percentage'
                                  ? `${item.discountValue || 0}%`
                                  : formatPriceWithCurrency(financial.discountPerUnit)}
                              </p>
                              <p className="text-[11px] text-amber-600">
                                Total: {formatPriceWithCurrency(financial.discountTotal)}
                              </p>
                    </div>
                            <div className="bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                              <p className="text-[11px] uppercase text-emerald-600 font-semibold">
                                Commission / Qty
                              </p>
                              <p className="font-medium text-emerald-700">
                                {formatPriceWithCurrency(financial.commissionPerUnit)}
                              </p>
                              <p className="text-[11px] text-emerald-600">
                                Total: {formatPriceWithCurrency(financial.commissionTotal)}
                              </p>
                            </div>
                            <div className="bg-purple-50 border border-purple-200 rounded-md px-3 py-2">
                              <p className="text-[11px] uppercase text-purple-600 font-semibold">
                                Netto
                              </p>
                              <p className="font-medium text-purple-700">
                                {formatPriceWithCurrency(financial.clientNetPerUnit)}
                              </p>
                              <p className="text-[11px] text-purple-600">
                                Total: {formatPriceWithCurrency(financial.clientNetTotal)}
                              </p>
                            </div>
                          </div>
                          {item.notes && (
                            <p className="mt-2 text-sm text-gray-600">
                              Notes: {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 self-end md:self-start">
                    <button
                      type="button"
                      onClick={() => setEditingItemIndex(itemIndex)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteOfferItem(itemIndex)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                  );
                })()}
              </div>
            )
          ))}
          
          {addingSparepartItem && (
            <div className="border-2 border-blue-500 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sparepart Name *</label>
                  <input
                    type="text"
                    value={newSparepartName}
                    onChange={(e) => setNewSparepartName(e.target.value)}
                    onBlur={() => {
                      if (newSparepartName.trim()) {
                        const newItem = {
                          sparepartName: newSparepartName.trim(),
                          quantity: 1,
                          pricePerUnit: 0,
                          price: 0,
                          netto: 0,
                          discountType: 'percentage',
                          discountValue: 0,
                          commission: 0,
                          notes: '',
                          itemNumber: formData.offerItems.length + 1
                        };
                        setFormData(prev => ({ ...prev, offerItems: [...prev.offerItems, newItem] }));
                        setAddingSparepartItem(false);
                        setEditingItemIndex(formData.offerItems.length);
                        setNewSparepartName('');
                      }
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newSparepartName.trim()) {
                        const newItem = {
                          sparepartName: newSparepartName.trim(),
                          quantity: 1,
                          pricePerUnit: 0,
                          price: 0,
                          netto: 0,
                          discountType: 'percentage',
                          discountValue: 0,
                          commission: 0,
                          notes: '',
                          itemNumber: formData.offerItems.length + 1
                        };
                        setFormData(prev => ({ ...prev, offerItems: [...prev.offerItems, newItem] }));
                        setAddingSparepartItem(false);
                        setEditingItemIndex(formData.offerItems.length);
                        setNewSparepartName('');
                        e.preventDefault();
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter sparepart name"
                    autoFocus
                  />
                </div>
              </div>
            </div>
          )}
          
          {formData.offerItems.length === 0 && editingItemIndex === -1 && !addingSparepartItem && (
            <div className="text-center py-8 text-gray-500">
              <p>No sparepart items added yet. Click "Add Sparepart" to start.</p>
            </div>
          )}
        </FormSection>
      )}

      {/* Offer Summary */}
      <FormSection
        title="Offer Summary"
        intent="system"
        description="Calculated totals update automatically based on the items in this quotation."
        bodyClassName="mt-4"
      >
        {formData.offerItems.length > 0 ? (
          <div className="bg-gray-50 p-4 rounded-lg space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  PPN Treatment
                </p>
                <p className="text-sm text-gray-700">
                  {formData.excludePPN ? 'Belum termasuk PPN (harga Nett)' : 'Sudah termasuk PPN (harga Gross)'}
                </p>
              </div>
              <div className="inline-flex rounded-md border border-gray-300 bg-white px-1 py-1">
                <button
                  type="button"
                  onClick={() => handleOfferTaxSelection('include')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    !formData.excludePPN ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sudah Termasuk PPN
                </button>
                <button
                  type="button"
                  onClick={() => handleOfferTaxSelection('exclude')}
                  className={`ml-1 px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    formData.excludePPN ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Belum Termasuk PPN
                </button>
                </div>
              </div>

            {(() => {
              const totalItemCount = formData.offerItems.length;
              const totalQuantity = formData.offerItems.reduce(
                (sum, item) => sum + (item.quantity || 1),
                0
              );
              const totalBase = formData.offerItems.reduce(
                (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
                0
              );
              const totalNetto = formData.offerItems.reduce(
                (sum, item) => sum + (item.netto || 0) * (item.quantity || 1),
                0
              );
              const totalCommission = formData.offerItems.reduce(
                (sum, item) => sum + (item.commission || 0) * (item.quantity || 1),
                0
              );

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                  <div className="rounded-lg bg-white shadow-sm border border-gray-200 p-4 text-center">
                    <div className="text-xs font-semibold uppercase text-gray-500 tracking-wide">
                      Total Items
                </div>
                    <div className="mt-1 text-2xl font-bold text-blue-600">{totalItemCount}</div>
                    <p className="text-xs text-gray-500 mt-2">
                      Number of distinct line items in this offer
                    </p>
              </div>

                  <div className="rounded-lg bg-white shadow-sm border border-gray-200 p-4 text-center">
                    <div className="text-xs font-semibold uppercase text-gray-500 tracking-wide">
                      Total Quantity
            </div>
                    <div className="mt-1 text-2xl font-bold text-indigo-600">{totalQuantity}</div>
                    <p className="text-xs text-gray-500 mt-2">
                      Sum of quantities across all items
                    </p>
                  </div>

                  <div className="rounded-lg bg-white shadow-sm border border-gray-200 p-4 text-center">
                    <div className="text-xs font-semibold uppercase text-gray-500 tracking-wide">
                      Total Base Price
                    </div>
                    <div className="mt-1 text-2xl font-bold text-green-600">
                      {formatPriceWithCurrency(totalBase)}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Sum of base price × quantity for every item
                    </p>
                  </div>

                  <div className="rounded-lg bg-white shadow-sm border border-gray-200 p-4 text-center">
                    <div className="text-xs font-semibold uppercase text-gray-500 tracking-wide">
                      Total Commission
                    </div>
                    <div className="mt-1 text-2xl font-bold text-amber-600">
                      {formatPriceWithCurrency(totalCommission)}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Sum of commission amounts across all items
                    </p>
                  </div>

                  <div className="rounded-lg bg-white shadow-sm border border-gray-200 p-4 text-center xl:col-span-2">
                    <div className="text-xs font-semibold uppercase text-gray-500 tracking-wide">
                      Total Netto Price
                    </div>
                    <div className="mt-1 text-2xl font-bold text-purple-600">
                      {formatPriceWithCurrency(totalNetto)}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Sum of netto price × quantity for every item
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Add items to see offer summary</p>
          </div>
        )}
      </FormSection>

      {/* Offer Notes & Attachments */}
      <FormSection
        title="Offer Notes & Attachments"
        intent="user"
        description="Use these optional fields to add context for the team and upload visual references."
        bodyClassName="mt-4 space-y-4"
      >
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

            {(notesImagesData.length > 0 || pendingImages.length > 0) && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {notesImagesData.map((imageData, index) => {
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
                      
                      <button
                        onClick={() => handleRemoveImage(imageId)}
                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                      
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

                {pendingImages.map((pendingImage) => (
                  <div key={pendingImage.id} className="relative group">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-blue-300">
                      <img
                        src={pendingImage.preview}
                        alt={pendingImage.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <button
                      onClick={() => handleRemoveImage(pendingImage.id)}
                      className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove image"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                    
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
      </FormSection>


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
              mode === 'create-quotation' || mode === 'create-from-rfq' ? 'Create Quotation' : 
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

    {/* RFQ Reference Modal */}
    {showRFQReference && (
      <BaseModal
        isOpen={showRFQReference}
        onClose={() => setShowRFQReference(false)}
        title="Original RFQ Reference"
        size="xl"
      >
        {rfqReferenceData ? (
          <div className="space-y-6">
            {/* RFQ Header Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">RFQ Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-gray-700">RFQ Number:</span>
                  <span className="ml-2 text-gray-900">{rfqReferenceData.rfqNumber}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    rfqReferenceData.status === 'approved' ? 'bg-green-100 text-green-800' :
                    rfqReferenceData.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    rfqReferenceData.status === 'quotation_created' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {rfqReferenceData.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Customer:</span>
                  <span className="ml-2 text-gray-900">{rfqReferenceData.customerName}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Contact:</span>
                  <span className="ml-2 text-gray-900">{rfqReferenceData.contactPerson?.name} ({rfqReferenceData.contactPerson?.gender})</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Requester:</span>
                  <span className="ml-2 text-gray-900">{rfqReferenceData.requesterId?.fullName || rfqReferenceData.requesterId?.email}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Approver:</span>
                  <span className="ml-2 text-gray-900">{rfqReferenceData.approverId?.fullName || rfqReferenceData.approverId?.email}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Creator:</span>
                  <span className="ml-2 text-gray-900">{rfqReferenceData.quotationCreatorId?.fullName || rfqReferenceData.quotationCreatorId?.email}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Priority:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    rfqReferenceData.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    rfqReferenceData.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    rfqReferenceData.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {rfqReferenceData.priority}
                  </span>
                </div>
              <div>
                <span className="font-medium text-gray-700">Target Close Date:</span>
                <span className="ml-2 text-gray-900">{formatDateForDisplay(rfqReferenceData.targetCloseDate)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Expected Delivery:</span>
                <span className="ml-2 text-gray-900">{formatDateForDisplay(rfqReferenceData.expectedDeliveryDate)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Tax Handling:</span>
                <span className="ml-2 text-gray-900">{rfqReferenceData.isTaxIncluded ? 'Tax Included' : 'Tax Excluded'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">PPN:</span>
                <span className="ml-2 text-gray-900">{rfqReferenceData.includePPN ? 'Include PPN' : 'Exclude PPN'}</span>
              </div>
              {rfqReferenceData.deliveryTerms && (
                <div className="md:col-span-2">
                  <span className="font-medium text-gray-700">Delivery Terms:</span>
                  <span className="ml-2 text-gray-900">{rfqReferenceData.deliveryTerms}</span>
                </div>
              )}
              </div>
              {rfqReferenceData.description && (
                <div className="mt-4">
                  <span className="font-medium text-gray-700">Description:</span>
                  <p className="mt-1 text-gray-900">{rfqReferenceData.description}</p>
                </div>
              )}
            {rfqReferenceData.deliveryNotes && (
              <div className="mt-4">
                <span className="font-medium text-gray-700">Delivery Notes:</span>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">{rfqReferenceData.deliveryNotes}</p>
              </div>
            )}
            {rfqReferenceData.paymentTerms && (
              <div className="mt-4">
                <span className="font-medium text-gray-700">Payment Terms:</span>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">{rfqReferenceData.paymentTerms}</p>
              </div>
            )}
            {rfqReferenceData.inclusionNotes && (
              <div className="mt-4">
                <span className="font-medium text-gray-700">Inclusion Notes:</span>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">{rfqReferenceData.inclusionNotes}</p>
              </div>
            )}
            {rfqReferenceData.exclusionNotes && (
              <div className="mt-4">
                <span className="font-medium text-gray-700">Exclusion Notes:</span>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">{rfqReferenceData.exclusionNotes}</p>
              </div>
            )}
            <div className="mt-4">
              <span className="font-medium text-gray-700">Supporting Documents:</span>
              {rfqReferenceData.documents && rfqReferenceData.documents.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {rfqReferenceData.documents.map((docEntry) => (
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
                      <button
                        type="button"
                        onClick={() => handleDownloadRfqDocument(docEntry)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                      >
                        <Download size={14} />
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-gray-500">No documents attached.</p>
              )}
            </div>
            </div>

            {/* Engineering Review */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Engineering Review</h3>
                {engineeringTransit ? (
                  engineeringTransit.canDo === true ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                      <CheckCircle className="h-4 w-4" />
                      Can Do
                    </span>
                  ) : engineeringTransit.canDo === false ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                      <XCircle className="h-4 w-4" />
                      Cannot Do
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600">
                      <Clock className="h-4 w-4" />
                      {engineeringTransit.status === 'in_progress' ? 'In Review' : 'Pending'}
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600">
                    <AlertCircle className="h-4 w-4" />
                    Not Reviewed
                  </span>
                )}
              </div>

              {engineeringTransit ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 text-xs text-gray-600 sm:grid-cols-3">
                    <div>
                      <span className="font-medium text-gray-700">Assigned To:</span>{' '}
                      {engineeringTransit.assignedTo?.fullName ||
                        engineeringTransit.assignedTo?.email ||
                        '—'}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Reviewed By:</span>{' '}
                      {engineeringTransit.reviewedBy?.fullName ||
                        engineeringTransit.reviewedBy?.email ||
                        '—'}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Reviewed At:</span>{' '}
                      {engineeringTransit.reviewedAt
                        ? new Date(engineeringTransit.reviewedAt).toLocaleString()
                        : '—'}
                    </div>
                  </div>

                  {engineeringTransit.comments && engineeringTransit.comments.trim() && (
                    <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
                      {engineeringTransit.comments}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Specification Updates
                      </p>
                      <span className="text-xs text-gray-400">
                        {engineeringChanges.length} item{engineeringChanges.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    {engineeringChanges.length > 0 ? (
                      <div className="space-y-3">
                        {engineeringChanges.map(({ key, itemNumber, original, modified }) => (
                          <div
                            key={key}
                            className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-sm font-semibold text-gray-800">
                                Item {itemNumber}
                              </span>
                              {modified?.karoseri && (
                                <span className="text-xs text-gray-500">
                                  {modified.karoseri}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div className="rounded-md border border-gray-200 bg-white p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Before
                                </p>
                                <div className="mt-2 space-y-2">
                                  {renderEngineeringItemDetails(
                                    original,
                                    rfqReferenceData.lineOfBusiness?.type
                                  )}
                                </div>
                              </div>
                              <div className="rounded-md border border-gray-200 bg-white p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  After
                                </p>
                                <div className="mt-2 space-y-2">
                                  {renderEngineeringItemDetails(
                                    modified,
                                    rfqReferenceData.lineOfBusiness?.type
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        No specification changes recorded by engineering.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  This RFQ has not been reviewed by engineering yet.
                </p>
              )}
            </div>

            {/* RFQ Items */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">RFQ Items ({rfqReferenceData.items?.length || 0})</h3>
              {rfqReferenceData.items && rfqReferenceData.items.length > 0 ? (
                <div className="space-y-4">
                  {rfqReferenceData.items.map((item, index) => (
                    <div key={item._id || index} className="border border-gray-200 rounded-lg p-4 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-md font-medium text-gray-900">Item {item.itemNumber}</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>Quantity: {item.quantity || 1}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <span className="font-medium text-gray-700">Karoseri:</span>
                          <span className="ml-2 text-gray-900">{item.karoseri}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Chassis:</span>
                          <span className="ml-2 text-gray-900">{item.chassis} {item.chassisModel ? `- ${item.chassisModel}` : ''}</span>
                        </div>
                      </div>

                      {item.notes && (
                        <div className="mb-3">
                          <span className="font-medium text-gray-700">Notes:</span>
                          <span className="ml-2 text-gray-900">{item.notes}</span>
                        </div>
                      )}

                      {/* Specifications */}
                      {item.specifications && item.specifications.length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-700 mb-2">Specifications:</h5>
                          <div className="space-y-3">
                            {item.specifications.map((spec, specIndex) => (
                              <div key={specIndex} className="bg-gray-50 rounded-lg p-3">
                                <h6 className="font-semibold text-gray-800 text-sm mb-2">
                                  {spec.category}
                                </h6>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {spec.items && spec.items.map((specItem, itemIndex) => (
                                    <div key={itemIndex} className="flex items-start space-x-2">
                                      <span className="font-medium text-gray-600 text-xs min-w-0 flex-shrink-0">
                                        {specItem.name}:
                                      </span>
                                      <span className="text-gray-800 text-xs break-words">
                                        {specItem.specification}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText size={32} className="mx-auto mb-2 text-gray-300" />
                  <p>No items found for this RFQ</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading RFQ reference...</p>
          </div>
        )}
      </BaseModal>
    )}
    </div>
  );
};

export default QuotationForm;
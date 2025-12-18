import React, { useEffect, useMemo, useState, useContext } from 'react';
import { ArrowLeft, Download, FileText, Loader2 } from 'lucide-react';
import { formatPrice } from '../../utils/templates/documentGenerator';
import toast from 'react-hot-toast';
import { getDrawingAssetUrl, getNotesImageAssetUrl } from '../../utils/helpers/assetUrlHelper';
import { UserContext } from '../../utils/contexts/UserContext';
import axios from 'axios';

// Format file size in human readable format
const formatFileSize = (bytes) => {
  if (!bytes) return "Unknown";
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

const safeNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const calculateItemFinancials = (item = {}) => {
  const quantity = safeNumber(item.quantity, 1) > 0 ? safeNumber(item.quantity, 1) : 1;
  const basePrice = safeNumber(item.price, 0);
  const discountValue = safeNumber(item.discountValue, 0);
  let discountPerUnit = 0;

  if (item.discountType === 'percentage') {
    discountPerUnit = Math.round((basePrice * discountValue) / 100);
  } else {
    discountPerUnit = discountValue;
  }

  const commissionPerUnit = safeNumber(item.commission, 0);
  const clientNetPerUnit = Math.max(basePrice - discountPerUnit, 0);
  const internalNetPerUnit = Math.max(clientNetPerUnit - commissionPerUnit, 0);

  return {
    quantity,
    basePrice,
    discountPerUnit,
    commissionPerUnit,
    clientNetPerUnit,
    internalNetPerUnit,
    baseTotal: basePrice * quantity,
    discountTotal: discountPerUnit * quantity,
    commissionTotal: commissionPerUnit * quantity,
    clientNetTotal: clientNetPerUnit * quantity,
    internalNetTotal: internalNetPerUnit * quantity
  };
};

const aggregateOfferFinancials = (items = []) => {
  return items.reduce(
    (acc, item) => {
      const breakdown = calculateItemFinancials(item);
      acc.quantity += breakdown.quantity;
      acc.baseTotal += breakdown.baseTotal;
      acc.discountTotal += breakdown.discountTotal;
      acc.commissionTotal += breakdown.commissionTotal;
      acc.clientNetTotal += breakdown.clientNetTotal;
      acc.internalNetTotal += breakdown.internalNetTotal;
      acc.details.push({ item, breakdown });
      return acc;
    },
    {
      quantity: 0,
      baseTotal: 0,
      discountTotal: 0,
      commissionTotal: 0,
      clientNetTotal: 0,
      internalNetTotal: 0,
      details: []
    }
  );
};

const formatDiscountDescriptor = (item, breakdown) => {
  if (!breakdown || breakdown.discountPerUnit <= 0) return '';
  if (item.discountType === 'percentage') {
    return `${safeNumber(item.discountValue, 0)}%`;
  }
  return formatPrice(breakdown.discountPerUnit);
};

const QuotationPreview = ({ quotationData, onBack, onDownload }) => {
  const { user } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [downloadMode, setDownloadMode] = useState('full'); // 'full' or 'minimal'
  const [downloadFormat, setDownloadFormat] = useState('docx'); // 'docx', 'doc', or 'pdf'
  
  // Check if user is a requester
  const isRequester = useMemo(() => {
    if (!user || !user.permissions) return false;
    // Check if user has quotation_requester permission
    const hasRequesterPermission = user.permissions.some(perm => {
      if (typeof perm === 'string') {
        return perm === 'quotation_requester';
      }
      if (perm.name === 'quotation_requester') {
        return true;
      }
      if (perm.type === 'multi' && perm.includes && Array.isArray(perm.includes)) {
        return perm.includes.includes('quotation_requester');
      }
      return false;
    });
    
    // Also check if user is the requester from header or RFQ
    const isHeaderRequester = quotationData?.header?.requesterId?.toString() === user.id?.toString();
    const isRfqRequester = quotationData?.rfq?.requesterId?.toString() === user.id?.toString();
    
    return hasRequesterPermission || isHeaderRequester || isRfqRequester;
  }, [user, quotationData]);
  const paymentTermsNote = useMemo(() => {
    const rfqPayment = quotationData?.rfq?.paymentTerms;
    const headerPayment = quotationData?.header?.paymentTerms;
    const fallback = 'Payment DP 50% sisa cash before delivery';
    return (rfqPayment && rfqPayment.trim()) ||
      (headerPayment && headerPayment.trim()) ||
      fallback;
  }, [quotationData]);

  const predefinedNotes = useMemo(() => ([
    { text: paymentTermsNote, selected: true },
    { text: 'Loco Pabrik Cikande', selected: true },
    { text: 'Harga tidak mengikat bisa berubah sewaktu-waktu tanpa pemberitahuan terlebih dahulu.', selected: true },
    { text: 'DIMENSI KAROSERI diluar SKRB tidak diperuntukan untuk dijalan raya (OFF ROAD)', selected: true },
    { text: 'Uji Type yang terbit hanya untuk karoseri dengan ukuran standard Dishub. Ukuran Oversize STM tidak bertanggung jawab jika uji type tidak dapat terbit dari Dishub', selected: true },
    { text: 'Tanpa acc keur', selected: true }
  ]), [paymentTermsNote]);

  const [selectedNotes, setSelectedNotes] = useState([]);

  useEffect(() => {
    setSelectedNotes(predefinedNotes.map((_, index) => index));
  }, [predefinedNotes]);

  // Automatically set mode to 'minimal' when PDF is selected
  useEffect(() => {
    if (downloadFormat === 'pdf' && downloadMode === 'full') {
      setDownloadMode('minimal');
    }
  }, [downloadFormat, downloadMode]);

  const handleDownload = async (offer = null, revision = null, mode = null) => {
    try {
      setLoading(true);
      const { header } = quotationData;
      
      // Determine quotation ID (can be _id or quotationNumber)
      const quotationId = header._id || header.quotationNumber;
      
      // Determine offer ID if specific offer/revision is selected
      let offerId = null;
      if (revision) {
        offerId = revision._id;
      } else if (offer) {
        offerId = offer._id;
      }
      
      // Use provided mode or default to current downloadMode state
      const downloadModeToUse = mode || downloadMode;
      
      // Build query parameters
      const params = new URLSearchParams();
      if (offerId) {
        params.append('offerId', offerId);
      }
      // Always send selectedNotes, even if empty array (so backend knows which notes to exclude)
      params.append('selectedNotes', JSON.stringify(selectedNotes || []));
      // Add download mode parameter
      params.append('includeHeaderFooter', downloadModeToUse === 'full' ? 'true' : 'false');
      // Add format parameter
      params.append('format', downloadFormat);
      
      // Call backend download endpoint - use axios directly for blob response
      const token = localStorage.getItem('asb-token');
      const env = import.meta.env.VITE_NODE_ENV || import.meta.env.VITE_NODE_ENV_BUILD || "development";
      const protocol = (env === "preprod" || env === "production") ? "https://" : "http://";
      const baseURL = protocol + import.meta.env.VITE_BACKEND_URL;
      
      const response = await axios.get(
        `${baseURL}/api/quotations/${quotationId}/download?${params.toString()}`,
        {
          responseType: 'blob', // Important for file downloads
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Determine MIME type based on format
      const getMimeType = (format) => {
        switch (format) {
          case 'pdf':
            return 'application/pdf';
          case 'doc':
            return 'application/msword';
          case 'docx':
          default:
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }
      };

      // Create blob URL and trigger download
      const blob = new Blob([response.data], {
        type: getMimeType(downloadFormat)
      });
      
      // Determine filename from response headers or generate default
      const contentDisposition = response.headers['content-disposition'];
      const modeSuffix = downloadModeToUse === 'full' ? '' : '_NoHeaderFooter';
      const formatExtension = downloadFormat === 'pdf' ? '.pdf' : downloadFormat === 'doc' ? '.doc' : '.docx';
      let filename = `Quotation_${header.quotationNumber.replace(/[/\\]/g, '_')}${modeSuffix}${formatExtension}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Document downloaded successfully');
      
      if (onDownload) {
        await onDownload();
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error.response?.data?.message || 'Failed to download document');
    } finally {
      setLoading(false);
    }
  };

  const toggleNote = (index) => {
    setSelectedNotes(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const { header, offers } = quotationData;

  useEffect(() => {
    const offerGroups = offers || [];
    if (!offerGroups.length) {
      if (selectedOffer) {
        setSelectedOffer(null);
      }
      return;
    }

    const firstOffer = offerGroups[0]?.original || offerGroups[0];
    const offerStillExists = selectedOffer
      ? offerGroups.some((group) => {
          const original = group.original || group;
          if (original?._id === selectedOffer._id) return true;
          if (group.revisions && group.revisions.length > 0) {
            return group.revisions.some((rev) => rev._id === selectedOffer._id);
          }
          return false;
        })
      : false;

    if (!selectedOffer || !offerStillExists) {
      setSelectedOffer(firstOffer);
    }
  }, [offers, selectedOffer]);

  if (!offers || offers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">No Offers Found</h2>
          <p className="text-gray-500 mb-4">Unable to generate document preview</p>
            <button
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Details
            </button>
        </div>
      </div>
    );
  }

  const currentOffer = useMemo(() => {
    if (selectedOffer) return selectedOffer;
    if (offers && offers.length > 0) {
      return offers[0]?.original || offers[0];
    }
    return null;
  }, [selectedOffer, offers]);

  const offerFinancials = useMemo(
    () => aggregateOfferFinancials(currentOffer?.offerItems || []),
    [currentOffer]
  );

  const totalBase = offerFinancials.baseTotal;
  const clientNetTotal = offerFinancials.clientNetTotal;
  const internalNetTotal = offerFinancials.internalNetTotal;
  const totalDiscount = offerFinancials.discountTotal;
  const effectiveTotalDiscount = totalDiscount;

  let ppnAmount = 0;
  let grandTotal = clientNetTotal;
  let subtotalExclusive = clientNetTotal;

  if (currentOffer?.excludePPN) {
    subtotalExclusive = clientNetTotal;
    ppnAmount = Math.round(subtotalExclusive * 0.11);
    grandTotal = subtotalExclusive + ppnAmount;
  } else {
    subtotalExclusive = Math.round(clientNetTotal / 1.11);
    ppnAmount = Math.max(clientNetTotal - subtotalExclusive, 0);
    grandTotal = clientNetTotal;
  }

  const ppnStatusLabel = currentOffer?.excludePPN
    ? 'Belum termasuk PPN (harga Nett)'
    : 'Sudah termasuk PPN (harga Gross)';
  const ppnLabel = currentOffer?.excludePPN
    ? 'Estimasi PPN (11%)'
    : 'Komponen PPN (dari harga termasuk PPN)';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Row: Back Button and Title */}
          <div className="flex items-center justify-between py-4 border-b border-gray-200">
            <button
              onClick={onBack}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Back to Details</span>
              <span className="sm:hidden">Back</span>
            </button>
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 text-center flex-1 mx-4">
              <span className="hidden sm:inline">Document Preview - </span>
              {header.quotationNumber}
            </h1>
            <div className="w-20 sm:w-24"></div> {/* Spacer for centering */}
          </div>

          {/* Download Controls Row */}
          <div className="py-4 space-y-4">
            {/* Format and Mode Selectors */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Format Selector */}
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-2">File Format</label>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setDownloadFormat('docx')}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                      downloadFormat === 'docx'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                    title="Download as DOCX (Word Document)"
                  >
                    DOCX
                  </button>
                  <button
                    onClick={() => setDownloadFormat('doc')}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                      downloadFormat === 'doc'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                    title="Download as DOC (Word 97-2003)"
                  >
                    DOC
                  </button>
                  <button
                    onClick={() => setDownloadFormat('pdf')}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                      downloadFormat === 'pdf'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                    title="Download as PDF"
                  >
                    PDF
                  </button>
                </div>
              </div>
              
              {/* Mode Selector */}
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-2">Document Mode</label>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setDownloadMode('full')}
                    disabled={downloadFormat === 'pdf'}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                      downloadFormat === 'pdf'
                        ? 'opacity-50 cursor-not-allowed bg-gray-200 text-gray-400'
                        : downloadMode === 'full'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                    title={downloadFormat === 'pdf' ? 'Full mode not available for PDF' : 'Download with header, footer, and watermark'}
                  >
                    Full
                  </button>
                  <button
                    onClick={() => setDownloadMode('minimal')}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                      downloadMode === 'minimal'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                    title="Download without header, footer, and watermark (for pre-printed paper)"
                  >
                    Minimal
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1.5 text-center">
                  {downloadFormat === 'pdf' 
                    ? 'PDF only supports minimal mode (no header, footer & watermark)'
                    : downloadMode === 'full' 
                    ? 'With header, footer & watermark' 
                    : 'No header, footer & watermark'}
                </p>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => handleDownload()}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                <span>All Offers</span>
              </button>
              <button
                onClick={() => handleDownload(currentOffer)}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                <span>Current Offer</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Offers and Revisions Section */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Offers & Revisions</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Select and download specific offers or revisions
              </p>
            </div>
            <div className="p-4 sm:p-6">
              <div className="space-y-4 sm:space-y-6">
                {offers.map((offerGroup, groupIndex) => {
                  const winningOfferId = quotationData?.header?.selectedOfferId?.toString?.() || '';
                  const selectedOfferItemIds = quotationData?.header?.selectedOfferItemIds?.map((id) =>
                    id?.toString?.()
                  ) || [];

                  const buildWinningBadge = (offer) => {
                    if (!offer || !winningOfferId) return null;
                    const offerId = offer._id?.toString?.() ?? offer._id;
                    if (offerId !== winningOfferId) return null;

                    const acceptedItems = (offer.offerItems || []).filter((item) =>
                      selectedOfferItemIds.includes(item._id?.toString?.() ?? item._id)
                    );

                    return (
                      <div className="mt-2 text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                        Winning Offer
                        {acceptedItems.length > 0 && (
                          <span className="ml-2 normal-case text-gray-600 font-normal">
                            · Items:{' '}
                            {acceptedItems
                              .map((item) => item.itemNumber || item.karoseri || item.serviceName || '#')
                              .join(', ')}
                          </span>
                        )}
                      </div>
                    );
                  };

                  return (
                    <div key={groupIndex} className="border border-gray-200 rounded-lg p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                            Offer {offerGroup.original?.offerNumber || `#${groupIndex + 1}`}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1">
                            {offerGroup.original?.offerItems?.length || 0} items
                          </p>
                          {buildWinningBadge(offerGroup.original)}
                        </div>
                        <div className="flex items-center gap-2 sm:flex-shrink-0">
                          <button
                            onClick={() => setSelectedOffer(offerGroup.original)}
                            className={`flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm rounded-lg transition-colors ${
                              selectedOffer?._id === offerGroup.original?._id
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                            }`}
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => handleDownload(offerGroup.original)}
                            disabled={loading}
                            className="inline-flex items-center justify-center px-3 py-2 bg-green-600 text-white text-xs sm:text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
                            title={downloadMode === 'full' ? 'Download with header, footer, and watermark' : 'Download without header, footer, and watermark (for pre-printed paper)'}
                          >
                            <Download className="w-3 h-3 sm:mr-1" />
                            <span className="hidden sm:inline">Download</span>
                          </button>
                        </div>
                      </div>
                      
                      {/* Revisions */}
                      {offerGroup.revisions && offerGroup.revisions.length > 0 && (
                        <div className="ml-0 sm:ml-4 border-l-0 sm:border-l-2 border-gray-200 pl-0 sm:pl-4 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0">
                          <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-3">Revisions:</h4>
                          <div className="space-y-3">
                            {offerGroup.revisions.map((revision, revIndex) => (
                              <div key={revIndex} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-50 rounded-lg p-3 sm:p-4 gap-3">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    Revision {revision.revisionNumber || `R${revIndex + 1}`}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {revision.offerItems?.length || 0} items
                                  </p>
                                  {buildWinningBadge(revision)}
                                </div>
                                <div className="flex items-center gap-2 sm:flex-shrink-0">
                                  <button
                                    onClick={() => setSelectedOffer(revision)}
                                    className={`flex-1 sm:flex-none px-3 py-2 text-xs rounded-lg transition-colors ${
                                      selectedOffer?._id === revision._id
                                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                        : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                                    }`}
                                  >
                                    Preview
                                  </button>
                                  <button
                                    onClick={() => handleDownload(offerGroup.original, revision)}
                                    disabled={loading}
                                    className="inline-flex items-center justify-center px-3 py-2 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
                                    title={downloadMode === 'full' ? 'Download with header, footer, and watermark' : 'Download without header, footer, and watermark (for pre-printed paper)'}
                                  >
                                    <Download className="w-3 h-3 sm:mr-1" />
                                    <span className="hidden sm:inline">Download</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Document Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Document Preview</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Preview of the Word document that will be generated
                  {currentOffer && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {currentOffer?.offerNumber || header.quotationNumber}
                    </span>
                  )}
                </p>
              </div>
              <div className="p-6">
                <div className="bg-gray-50 rounded-lg p-6 font-mono text-sm overflow-hidden">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-bold text-lg">PENAWARAN</h3>
                      <p>Cikande, {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      <p>No. Quo. {currentOffer?.offerNumber || header.quotationNumber}</p>
                    </div>
                    
                    <div>
                      <p>Kepada Yth.</p>
                      <p>{header.customerName}</p>
                      <p>{header.contactPerson?.gender === 'male' ? 'Bapak' : 'Ibu'} {header.contactPerson?.name}</p>
                      <p>Di tempat</p>
              </div>

                    <div>
                      <p>Dengan Hormat,</p>
                      <p>Bersama ini kami PT. SUKSES TUNGGAL MANDIRI bermaksud untuk mengajukan penawaran harga pembuatan Karoseri dengan data sebagai berikut :</p>
                          </div>
                    
                    {/* Items Preview */}
                    <div className="bg-white p-4 rounded border">
                      <h4 className="font-semibold mb-4">
                        Items ({currentOffer?.offerItems?.length || 0})
                      </h4>
                      {currentOffer?.offerItems?.map((item, index) => {
                        const breakdown = calculateItemFinancials(item);
                        const discountDescriptor = formatDiscountDescriptor(item, breakdown);
                        const clientNetPerUnit = breakdown.clientNetPerUnit;
                        const effectiveDiscountValue = Math.max(breakdown.basePrice - clientNetPerUnit, 0);
                        const hasEffectiveDiscount = effectiveDiscountValue > 0;
                        const title =
                          item.karoseri ||
                          item.serviceName ||
                          item.sparepartName ||
                          `Item ${index + 1}`;
                        const discountLabel =
                          hasEffectiveDiscount && item.discountType === 'percentage' && safeNumber(item.discountValue, 0) > 0
                            ? ` (${safeNumber(item.discountValue, 0)}%)`
                            : '';

                        return (
                          <div key={index} className="mb-6 last:mb-0 border border-gray-200 rounded-lg overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-gray-600">Item {index + 1}</p>
                                <p className="text-base font-medium text-gray-900">{title}</p>
                              </div>
                              {(item.chassis || item.chassisModel) && (
                                <p className="text-sm text-gray-600">
                                  Chassis: {item.chassis || '-'}
                                  {item.chassisModel ? ` • ${item.chassisModel}` : ''}
                                </p>
                              )}
                            </div>
                            <div className="p-4 space-y-4">
                              {item.serviceDetails && item.serviceDetails.length > 0 && (
                                <div>
                                  <h5 className="text-sm font-semibold text-gray-700">Service Details</h5>
                                  <ul className="mt-2 list-disc list-inside text-sm text-gray-600 space-y-1">
                                    {item.serviceDetails.map((detail, detailIndex) => (
                                      <li key={detailIndex}>{detail}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {item.specifications && item.specifications.length > 0 && (
                                <div>
                                  <h5 className="text-sm font-semibold text-gray-700">Spesifikasi</h5>
                                  <div className="mt-3 overflow-x-auto">
                                    <table className="w-full border border-gray-200 text-sm">
                                      <thead>
                                        <tr className="bg-gray-100 text-left">
                                          <th className="border border-gray-200 px-3 py-2 font-semibold text-gray-700">
                                            Kategori
                                          </th>
                                          <th className="border border-gray-200 px-3 py-2 font-semibold text-gray-700">
                                            Nama
                                          </th>
                                          <th className="border border-gray-200 px-3 py-2 font-semibold text-gray-700">
                                            Spesifikasi
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {item.specifications.flatMap((spec, specIndex) =>
                                          spec.items
                                            ? spec.items.map((specItem, itemIndex) => (
                                                <tr key={`${specIndex}-${itemIndex}`} className="odd:bg-white even:bg-gray-50">
                                                  {itemIndex === 0 && (
                                                    <td
                                                      className="border border-gray-200 px-3 py-2 font-medium align-top text-gray-700"
                                                      rowSpan={spec.items.length}
                                                    >
                                                      {spec.category}
                                                    </td>
                                                  )}
                                                  <td className="border border-gray-200 px-3 py-2 text-gray-600">
                                                    {specItem.name || ''}
                                                  </td>
                                                  <td className="border border-gray-200 px-3 py-2 text-gray-600">
                                                    {specItem.specification || ''}
                                                  </td>
                                                </tr>
                                              ))
                                            : []
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {item.drawingSpecification && (
                                <p className="text-sm text-gray-600">
                                  Spesifikasi lain sesuai gambar{' '}
                                  <span className="font-medium text-gray-800">
                                    {item.drawingSpecification.drawingNumber || 'Selected'}
                                  </span>
                                </p>
                              )}

                              {item.notes && (
                                <p className="text-sm text-gray-600">
                                  <span className="font-semibold text-gray-700">Catatan:</span> {item.notes}
                                </p>
                              )}

                              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-gray-700 space-y-2">
                                <div className="flex justify-between">
                                  <span className="font-semibold text-gray-700">Harga per Unit</span>
                                  <span className="font-semibold text-blue-700 text-right">
                                    {formatPrice(clientNetPerUnit)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                  {hasEffectiveDiscount
                                    ? `Perhitungan: ${formatPrice(breakdown.basePrice)} - ${formatPrice(effectiveDiscountValue)}${discountLabel} = ${formatPrice(clientNetPerUnit)}`
                                    : `Perhitungan: ${formatPrice(breakdown.basePrice)}`}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div>
                      <p>Note:</p>
                      <div className="ml-4">
                        {(() => {
                          // Local formatNotes function to match document generator
                          const formatNotes = (selectedNotes, excludePPN) => {
                            const notes = [];

                            if (excludePPN) {
                              notes.push("Harga tersebut diatas Belum Termasuk PPN 11%");
                              notes.push(
                                "Nilai PPN menyesuaikan ketentuan pemerintah saat terbit faktur pajak"
                              );
                            } else {
                              notes.push("Harga tersebut diatas Sudah Termasuk PPN 11%");
                            }

                            // Add selected notes based on indices
                            if (Array.isArray(selectedNotes)) {
                              selectedNotes.forEach((index) => {
                                if (predefinedNotes[index] && predefinedNotes[index].selected) {
                                  notes.push(predefinedNotes[index].text);
                                }
                              });
                            }

                            // Format notes with proper spacing and wrapping
                            const formattedNotes = notes.map((note) => {
                              const prefix = "     -   "; // 5 spaces + dash + 3 spaces
                              
                              // Split note into words for proper wrapping
                              const words = note.split(' ');
                              const lines = [];
                              let currentLine = '';
                              
                              // Define line width (balanced for good text flow)
                              const maxLineWidth = 100; // Balanced width for optimal readability
                              
                              for (const word of words) {
                                const testLine = currentLine ? `${currentLine} ${word}` : word;
                                
                                // Check if adding this word would exceed the line width
                                if (testLine.length > maxLineWidth && currentLine) {
                                  // Start a new line
                                  lines.push(currentLine);
                                  currentLine = word;
                                } else {
                                  currentLine = testLine;
                                }
                              }
                              
                              // Add the last line if it has content
                              if (currentLine) {
                                lines.push(currentLine);
                              }
                              
                              // Format the lines with proper prefixes
                              const formattedLines = lines.map((line, index) => {
                                if (index === 0) {
                                  return `${prefix}${line}`;
                                } else {
                                  // Calculate the exact position where the text starts (after "     -   ")
                                  const textStartPosition = prefix.length; // This is 9 characters
                                  return `${" ".repeat(textStartPosition)}${line}`;
                                }
                              });
                              
                              return formattedLines.join('\n');
                            });
                            
                            return formattedNotes.join("\n");
                          };

                          return formatNotes(selectedNotes, currentOffer?.excludePPN).split('\n').map((note, index) => (
                            <p key={index} className="font-mono text-sm whitespace-pre-wrap break-words overflow-hidden">{note}</p>
                          ));
                        })()}
                  </div>
                </div>

                    <div>
                      <p>Demikianlah penawaran dari kami, atas perhatian dan kerjasamanya kami ucapkan terimakasih.</p>
                      <p>Hormat Kami,</p>
                      <p>PT. Sukses Tunggal Mandiri</p>
                    </div>
                    
                    {/* Drawings Preview - After Signature */}
                    {(() => {
                      const itemsWithDrawings = currentOffer?.offerItems?.filter(item => 
                        item.drawingSpecification && 
                        item.drawingSpecification.quotationImage && 
                        item.drawingSpecification.quotationImage.fileId
                      ) || [];
                      
                      if (itemsWithDrawings.length > 0) {
                        return (
                          <div className="bg-white p-4 rounded border border-blue-200 relative mt-6">
                            {/* Page break indicator */}
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium border border-blue-200">
                                📄 Separate Page (Lampiran)
                      </div>
                    </div>
                            <div className="text-center mb-4 pb-2 border-b border-gray-200">
                              <h4 className="font-bold text-lg text-blue-800">LAMPIRAN</h4>
                              <h5 className="font-semibold text-blue-700">Drawing Specifications ({itemsWithDrawings.length})</h5>
                              <p className="text-sm text-gray-600">Quotation: {header.quotationNumber}</p>
                            </div>
                            <div className="space-y-6">
                              {itemsWithDrawings.map((item, index) => {
                                const drawing = item.drawingSpecification;
                                
                                // Use quotationImage for display (JPG file)
                                const quotationImage = drawing.quotationImage;
                                
                                // Create asset URL for the quotation image
                                const assetUrl = getDrawingAssetUrl(drawing._id, quotationImage.fileId);
                                
                                return (
                                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="mb-3">
                                      <h5 className="font-medium text-gray-900">
                                        Item {(currentOffer?.offerItems || []).indexOf(item) + 1}: {item.karoseri} - {item.chassis} {item.chassisModel ? `- ${item.chassisModel}` : ''}
                                      </h5>
                                      <div className="text-sm text-gray-600 space-y-1">
                                        <p><strong>Drawing Number:</strong> {drawing.drawingNumber}</p>
                                        <p><strong>Quotation Image:</strong> {quotationImage.originalName}</p>
                                        <p><strong>File Size:</strong> {formatFileSize(quotationImage.fileSize)}</p>
                                        <p><strong>Upload Date:</strong> {new Date(quotationImage.uploadDate).toLocaleDateString('id-ID')}</p>
                  </div>
                </div>

                                    {/* Image Preview - Always show image since quotationImage is always JPG */}
                                    <div className="mt-4">
                                      <h6 className="text-sm font-medium text-gray-700 mb-2">Drawing Preview:</h6>
                                      <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                                        <img
                                          src={assetUrl}
                                          alt={`Drawing ${drawing.drawingNumber}`}
                                          className="w-full h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                          onClick={() => window.open(assetUrl, '_blank')}
                                          onError={(e) => {
                                            console.error('Image failed to load:', assetUrl);
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                          }}
                                        />
                                        <div className="w-full h-64 bg-gray-100 items-center justify-center text-gray-500 hidden">
                                          <div className="text-center">
                                            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                            <p className="text-sm">Image could not be loaded</p>
                                            <p className="text-xs text-gray-400">{quotationImage.originalName}</p>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="mt-2 flex justify-between items-center">
                                        <button
                                          onClick={() => window.open(assetUrl, '_blank')}
                                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                                        >
                                          View Full Size
                                        </button>
                                        <button
                                          onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = `${assetUrl}&download=true`;
                                            link.download = quotationImage.originalName;
                                            link.click();
                                          }}
                                          className="text-sm text-green-600 hover:text-green-800 underline"
                                        >
                                          Download
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {/* Notes Images Preview - After Drawings - Hidden for requesters */}
                    {!isRequester && (() => {
                      const notesImages = currentOffer?.notesImages || [];
                      
                      if (notesImages.length > 0) {
                        return (
                          <div className="bg-white p-4 rounded border border-green-200 relative mt-6">
                            {/* Page break indicator */}
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium border border-green-200">
                                📷 Notes Images ({notesImages.length})
                              </div>
                            </div>
                            <div className="text-center mb-4 pb-2 border-b border-gray-200">
                              <h4 className="font-bold text-lg text-green-800">NOTES IMAGES</h4>
                              <h5 className="font-semibold text-green-700">Additional Images ({notesImages.length})</h5>
                              <p className="text-sm text-gray-600">Quotation: {header.quotationNumber}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {notesImages.map((notesImage, index) => {
                                // Handle both populated objects and ObjectIds
                                const imageId = notesImage._id || notesImage.id || notesImage;
                                const imageFile = notesImage.imageFile;
                                const originalName = imageFile?.originalName || `Notes Image ${index + 1}`;
                                const fileId = imageFile?.fileId;
                                
                                // Create asset URL for the notes image
                                const assetUrl = getNotesImageAssetUrl(imageId, fileId);
                                
                                return (
                                  <div key={imageId} className="border border-gray-200 rounded-lg p-4">
                                    <div className="mb-3">
                                      <h5 className="font-medium text-gray-900">
                                        Notes Image {index + 1}
                                      </h5>
                                      <div className="text-sm text-gray-600 space-y-1">
                                        <p><strong>File:</strong> {originalName}</p>
                                        {imageFile?.fileType && <p><strong>File Type:</strong> {imageFile.fileType}</p>}
                                        {imageFile?.fileSize && <p><strong>File Size:</strong> {formatFileSize(imageFile.fileSize)}</p>}
                                        {imageFile?.uploadDate && <p><strong>Upload Date:</strong> {new Date(imageFile.uploadDate).toLocaleDateString('id-ID')}</p>}
                                      </div>
                                    </div>

                                    {/* Image Preview */}
                                    {fileId ? (
                                      <div className="mt-4">
                                        <h6 className="text-sm font-medium text-gray-700 mb-2">Image Preview:</h6>
                                        <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                                          <img
                                            src={assetUrl}
                                            alt={originalName}
                                            className="w-full h-48 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => window.open(assetUrl, '_blank')}
                                            onError={(e) => {
                                              console.error('Notes image failed to load:', assetUrl);
                                              e.target.style.display = 'none';
                                              e.target.nextSibling.style.display = 'flex';
                                            }}
                                          />
                                          <div className="w-full h-48 bg-gray-100 items-center justify-center text-gray-500 hidden">
                                            <div className="text-center">
                                              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                              <p className="text-sm">Image could not be loaded</p>
                                              <p className="text-xs text-gray-400">{originalName}</p>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="mt-2 flex justify-between items-center">
                                          <button
                                            onClick={() => window.open(assetUrl, '_blank')}
                                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                                          >
                                            View Full Size
                                          </button>
                                          <button
                                            onClick={() => {
                                              const link = document.createElement('a');
                                              link.href = `${assetUrl}&download=true`;
                                              link.download = originalName;
                                              link.click();
                                            }}
                                            className="text-sm text-green-600 hover:text-green-800 underline"
                                          >
                                            Download
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="mt-4">
                                        <h6 className="text-sm font-medium text-gray-700 mb-2">Image Information:</h6>
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                                          <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                          <p className="text-sm text-gray-600 mb-2">
                                            Loading image information...
                                          </p>
                                          <p className="text-xs text-gray-400">{originalName}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                      </div>
                    </div>
                  </div>
                </div>

          {/* Notes Configuration */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Document Notes</h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Select which notes to include in the document
                </p>
              </div>
              <div className="p-4 sm:p-6">
                <div className="space-y-3">
                  {predefinedNotes.map((note, index) => (
                    <label key={index} className="flex items-start space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedNotes.includes(index)}
                        onChange={() => toggleNote(index)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-xs sm:text-sm text-gray-700 flex-1">{note.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Pricing Summary */}
            <div className="bg-white rounded-lg shadow-sm border mt-4 sm:mt-6">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Pricing Summary</h2>
              </div>
              <div className="p-4 sm:p-6">
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      PPN Treatment
                    </div>
                    <div className="mt-1 text-sm font-medium text-gray-800">{ppnStatusLabel}</div>
                  </div>

                  <div className="border border-gray-100 rounded-lg divide-y divide-gray-100">
                    <div className="flex justify-between px-3 py-2">
                      <span className="font-medium text-gray-700">Total Harga</span>
                    <span className="font-semibold text-blue-700 text-right">
                      {formatPrice(clientNetTotal)}
                      </span>
                    </div>
                    <div className="px-3 py-2 text-xs text-gray-500">
                      {effectiveTotalDiscount > 0
                        ? `Perhitungan: ${formatPrice(totalBase)} - ${formatPrice(effectiveTotalDiscount)} = ${formatPrice(clientNetTotal)}`
                        : `Perhitungan: ${formatPrice(totalBase)}`}
                    </div>
                    {!currentOffer?.excludePPN && (
                      <div className="flex justify-between px-3 py-2">
                        <span className="text-gray-600">Subtotal (tanpa PPN)</span>
                        <span className="font-medium">{formatPrice(subtotalExclusive)}</span>
                      </div>
                    )}
                    <div className="flex justify-between px-3 py-2">
                      <span className="text-gray-600">{ppnLabel}</span>
                      <span className="font-medium">{formatPrice(ppnAmount)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center px-4 py-3 bg-gray-900 text-white rounded-lg">
                    <span className="font-semibold text-sm tracking-wide uppercase">Grand Total</span>
                    <span className="text-lg font-bold">{formatPrice(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationPreview;
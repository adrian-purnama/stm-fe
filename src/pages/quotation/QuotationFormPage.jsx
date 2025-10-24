import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Navigation from '../../components/common/Navigation';
import QuotationForm from '../../components/quotations/QuotationForm';
import { QUOTATION_FORM_MODES } from '../../components/quotations/quotationModes';
import ApiHelper from '../../utils/api/ApiHelper';
import toast from 'react-hot-toast';

const QuotationFormPage = () => {
  const navigate = useNavigate();
  const { quotationId } = useParams();
  const [searchParams] = useSearchParams();
  
  // Get mode, offerId, and rfqId from URL parameters
  const mode = searchParams.get('mode') || 'create-quotation';
  const offerId = searchParams.get('offerId') || null;
  const rfqId = searchParams.get('rfqId') || null;
  
  // State for quotation data
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Always navigate back to quotations list after save
  const stayInCurrentView = false;

  // Fetch quotation data if quotationId is provided, or RFQ data if rfqId is provided
  useEffect(() => {
    const fetchQuotation = async () => {
      if (rfqId && mode === 'create-from-rfq') {
        // Fetch RFQ data for quotation creation
        setLoading(true);
        try {
          console.log('Fetching RFQ with ID:', rfqId);
          const response = await ApiHelper.get(`/api/rfq/${rfqId}`);
          if (response.data.success) {
            const rfqData = response.data.data.rfq;
            console.log('QuotationFormPage: Raw RFQ data:', rfqData);
            console.log('QuotationFormPage: RFQ items:', rfqData.items);
            console.log('QuotationFormPage: RFQ items length:', rfqData.items?.length);
            
            // Transform RFQ data to quotation format
            const quotationData = {
              header: {
                customerName: rfqData.customerName,
                contactPerson: rfqData.contactPerson
              },
              offers: [{
                offerItems: rfqData.items?.map((item, index) => ({
                  itemNumber: index + 1,
                  karoseri: item.karoseri,
                  chassis: item.chassis,
                  drawingSpecification: item.drawingSpecification,
                  specifications: item.specifications,
                  price: item.price,           // RFQ price -> quotation price
                  netto: item.priceNet,        // RFQ priceNet -> quotation netto
                  discountType: 'percentage',  // Default discount type
                  discountValue: 0,            // Default discount value
                  notes: item.notes
                })) || []
              }]
            };
            console.log('QuotationFormPage: Transformed RFQ data to quotation format:', quotationData);
            console.log('QuotationFormPage: Transformed offerItems:', quotationData.offers[0].offerItems);
            console.log('QuotationFormPage: offerItems length:', quotationData.offers[0].offerItems.length);
            setQuotation(quotationData);
          } else {
            console.error('API returned success: false', response.data);
            toast.error(`Failed to load RFQ: ${response.data.message || 'Unknown error'}`);
            navigate('/quotations');
          }
        } catch (error) {
          console.error('Error fetching RFQ:', error);
          toast.error('Failed to load RFQ data');
          navigate('/quotations');
        } finally {
          setLoading(false);
        }
        return;
      }
      
      if (!quotationId) {
        // No quotationId means creating new quotation
        setQuotation(null);
        return;
      }

      setLoading(true);
      try {
        console.log('Fetching quotation with ID:', quotationId);
        const response = await ApiHelper.get(`/api/quotations/by-id/${quotationId}`);
        console.log('API Response:', response);
        console.log('Response data:', response.data);
        console.log('Response data.data:', response.data.data);
        if (response.data.success) {
          console.log('Setting quotation data:', response.data.data);
          setQuotation(response.data.data);
        } else {
          console.error('API returned success: false', response.data);
          toast.error(`Failed to load quotation: ${response.data.message || 'Unknown error'}`);
          navigate('/quotations');
        }
      } catch (error) {
        console.error('Error fetching quotation:', error);
        console.error('Error response:', error.response);
        toast.error(`Failed to load quotation: ${error.response?.data?.message || error.message}`);
        navigate('/quotations');
      } finally {
        setLoading(false);
      }
    };

    fetchQuotation();
  }, [quotationId, navigate, rfqId, mode]);

  const handleSave = (context = null) => {
    // If context is provided, it means we need to handle special cases
    if (context && context.mode === 'edit-revision') {
      // After creating a revision, navigate to edit the new revision
      // Use the original quotation ID, not the offer ID
      const originalQuotationId = quotationId; // This is the quotation ID from URL params
      const newOfferId = context.offer._id; // This is the new revision's offer ID
      console.log('Navigating to edit new revision:', { originalQuotationId, newOfferId });
      
      // Add a small delay to ensure the backend has fully processed the new revision
      setTimeout(() => {
        navigate(`/quotations/form/${originalQuotationId}?mode=edit-offer&offerId=${newOfferId}`);
      }, 500); // 500ms delay
      return;
    }
    
    // Always navigate back to quotations list after save
    navigate('/quotations');
  };

  const handleCancel = () => {
    navigate('/quotations');
  };


  const getTitle = () => {
    switch (mode) {
      case 'create-quotation':
        return 'Create New Quotation';
      case 'revision':
        return 'Create Quotation Revision';
      case 'new-offer':
        return 'Create Additional Offer';
      case 'edit-offer':
      default:
        return 'Edit Quotation Offer';
    }
  };

  // Prepare quotation context for the form
  const prepareQuotationContext = () => {
    if (!quotation) return null;
    
    console.log('Preparing quotation context:', quotation);
    console.log('Quotation offers:', quotation.offers);
    console.log('OfferId from URL:', offerId);
    console.log('Mode:', mode);
    console.log('RFQ ID:', rfqId);
    
    // For RFQ-based quotation creation, return the full quotation data
    if (mode === 'create-from-rfq' && rfqId) {
      console.log('Returning full quotation data for RFQ creation');
      return quotation;
    }
    
    // If offerId is specified, find the specific offer
    if (offerId && quotation.offers) {
      let targetOffer = null;
      
      for (const offerGroup of quotation.offers) {
        if (offerGroup.original && offerGroup.original._id.toString() === offerId) {
          console.log('Found target offer in original:', offerGroup.original);
          targetOffer = offerGroup.original;
          break;
        }
        if (offerGroup.revisions) {
          const revision = offerGroup.revisions.find(rev => rev._id.toString() === offerId);
          if (revision) {
            console.log('Found target offer in revisions:', revision);
            targetOffer = revision;
            break;
          }
        }
      }
      
      if (targetOffer) {
        console.log('Returning target offer:', targetOffer);
        console.log('Target offer offerItems:', targetOffer.offerItems);
        console.log('Target offer notesImages:', targetOffer.notesImages);
        return { header: quotation.header, offer: targetOffer };
      }
    }
    
    // Default to first offer if no specific offerId
    if (quotation.offers && quotation.offers.length > 0) {
      const firstOfferGroup = quotation.offers[0];
      const firstOffer = firstOfferGroup.original || firstOfferGroup.revisions?.[0];
      if (firstOffer) {
        console.log('Returning first offer:', firstOffer);
        console.log('First offer offerItems:', firstOffer.offerItems);
        console.log('First offer notesImages:', firstOffer.notesImages);
        return { header: quotation.header, offer: firstOffer };
      }
    }
    
    // Fallback to just the header
    console.log('Returning just header');
    return quotation.header;
  };

  const quotationContext = prepareQuotationContext();
  
  console.log('QuotationFormPage: Final quotationContext being passed to QuotationForm:', quotationContext);

  // Show loading state while fetching quotation data
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation title="Quotation Management" subtitle="Loading..." />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading quotation data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation title="Quotation Management" subtitle="Kelola dan lacak quotation Anda" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{getTitle()}</h1>
            </div>
          </div>
          
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <QuotationForm
              mode={mode}
              quotation={quotationContext}
              onSave={handleSave}
              onCancel={handleCancel}
              stayInCurrentView={stayInCurrentView}
              rfqId={rfqId}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationFormPage;

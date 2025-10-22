import React, { useState } from 'react';
import { ArrowLeft, Download, FileText, Loader2 } from 'lucide-react';
import { generateQuotationDocument, formatPrice } from '../../utils/documentGenerator';
import toast from 'react-hot-toast';

// Format file size in human readable format
const formatFileSize = (bytes) => {
  if (!bytes) return "Unknown";
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

const QuotationPreview = ({ quotationData, onBack, onDownload }) => {
  const [loading, setLoading] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [predefinedNotes] = useState([
    { text: 'Payment Dp.50 % sisa cash before delivery', selected: true },
    { text: 'Loco Pabrik Cikandel', selected: true },
    { text: 'Harga tidak mengikat bisa berubah sewaktu-waktu tanpa pemberitahuan terlebih dahulu.', selected: true },
    { text: 'DIMENSI KAROSERI diluar SKRB tidak diperuntukan untuk dijalan raya (OFF ROAD)', selected: true },
    { text: 'Uji Type yang terbit hanya untuk karoseri dengan ukuran standard Dishub. Ukuran Oversize STM tidak bertanggung jawab jika uji type tidak dapat terbit dari Dishub', selected: true },
    { text: 'Tanpa acc keur', selected: true }
  ]);
  const [selectedNotes, setSelectedNotes] = useState(() => {
    // Default all notes to checked (yes)
    return [0, 1, 2, 3, 4, 5];
  });

  const handleDownload = async (offer = null, revision = null) => {
    try {
      setLoading(true);
      const { header } = quotationData;
      
      // Create filename based on offer and revision
      let filename = `Quotation_${header.quotationNumber.replace(/[/\\]/g, '_')}`;
      if (offer) {
        filename += `_Offer_${offer.offerNumber}`;
      }
      if (revision) {
        filename += `_Revision_${revision.revisionNumber || 'R' + (quotationData.offers.find(o => o.original?._id === offer._id)?.revisions?.indexOf(revision) + 1 || 1)}`;
      }
      filename += '.docx';
      
      // Create modified quotation data for specific offer/revision
      let modifiedQuotationData = { ...quotationData };
      
      if (offer) {
        // Filter to only include the selected offer
        modifiedQuotationData.offers = [{
          original: revision || offer,
          revisions: revision ? [revision] : (quotationData.offers.find(o => o.original?._id === offer._id)?.revisions || [])
        }];
      }
      
      // Generate document with the new simplified generator
      await generateQuotationDocument(modifiedQuotationData, filename, selectedNotes);
      
      toast.success('Document downloaded successfully');
      
      if (onDownload) {
        onDownload();
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
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

  // Set default selected offer if none selected
  if (!selectedOffer && offers.length > 0) {
    setSelectedOffer(offers[0]);
  }

  // Calculate totals for selected offer
  const currentOffer = selectedOffer || offers[0];
  const totalNetto = currentOffer.offerItems?.reduce((sum, item) => sum + (item.netto || 0), 0) || 0;
  const ppn = Math.round(totalNetto * 0.11);
  const total = totalNetto + ppn;

  return (
    <div className="min-h-screen bg-gray-50">
        {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Details
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-semibold text-gray-900">
                Document Preview - {header.quotationNumber}
              </h1>
            </div>
            <div className="flex items-center space-x-2">
          <button
                onClick={() => handleDownload()}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                All Offers
          </button>
            <button
                onClick={() => handleDownload(currentOffer)}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Current Offer
            </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Offers and Revisions Section */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Offers & Revisions</h2>
              <p className="text-sm text-gray-600 mt-1">
                Select and download specific offers or revisions
              </p>
                        </div>
            <div className="p-6">
              <div className="space-y-6">
                {offers.map((offerGroup, groupIndex) => (
                  <div key={groupIndex} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Offer {offerGroup.original?.offerNumber || `#${groupIndex + 1}`}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {offerGroup.original?.offerItems?.length || 0} items
                        </p>
                        </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedOffer(offerGroup.original)}
                          className={`px-3 py-1 text-sm rounded-md ${
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
                          className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </button>
                      </div>
                    </div>
                    
                    {/* Revisions */}
                    {offerGroup.revisions && offerGroup.revisions.length > 0 && (
                      <div className="ml-4 border-l-2 border-gray-200 pl-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Revisions:</h4>
                        <div className="space-y-2">
                          {offerGroup.revisions.map((revision, revIndex) => (
                            <div key={revIndex} className="flex items-center justify-between bg-gray-50 rounded p-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  Revision {revision.revisionNumber || `R${revIndex + 1}`}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {revision.offerItems?.length || 0} items
                                </p>
                          </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setSelectedOffer(revision)}
                                  className={`px-2 py-1 text-xs rounded ${
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
                                  className="inline-flex items-center px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                  <Download className="w-3 h-3 mr-1" />
                                  Download
                                </button>
                          </div>
                        </div>
                    ))}
                  </div>
                      </div>
                    )}
                  </div>
                ))}
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
                      {currentOffer.offerNumber || 'Selected Offer'}
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
                      <p>No. Quo. {header.quotationNumber}</p>
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
                      <h4 className="font-semibold mb-2">Items ({currentOffer.offerItems?.length || 0}):</h4>
                      {currentOffer.offerItems?.map((item, index) => (
                        <div key={index} className="mb-4 last:mb-0">
                          {index === 0 ? (
                            <p className="font-medium">{index + 1}. Karoseri    : {item.karoseri || ''}</p>
                          ) : (
                            <p className="font-medium">          {index + 1}. Karoseri    : {item.karoseri || ''}</p>
                          )}
                          <p className="font-medium">          Chassis     : {item.chassis || ''}</p>
                          <p className="font-medium">          Spesifikasi :</p>
                          {item.specifications && item.specifications.length > 0 ? (
                            <div className="ml-4">
                              {item.specifications.map((spec, specIndex) => (
                                <div key={specIndex} className="mb-2">
                                  <p className="font-semibold text-sm">
                                    {`          ${spec.category}:`}
                                  </p>
                                  {spec.items && spec.items.map((specItem, itemIndex) => (
                                    <p key={itemIndex} className="text-sm ml-4">
                                      {`          ${specItem.name}: ${specItem.specification}`}
                                    </p>
                                  ))}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="ml-4 text-sm text-gray-500">No specifications provided</p>
                          )}
                          {item.drawingSpecification && (
                            <p className="ml-4">
                              {`          Spesifikasi lain sesuai gambar ${item.drawingSpecification.drawingNumber || 'Selected'}`}
                            </p>
                          )}
                        </div>
                      ))}
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

                            // Predefined notes that match the preview component
                            const predefinedNotes = [
                              { text: 'Payment Dp.50 % sisa cash before delivery', selected: true },
                              { text: 'Loco Pabrik Cikandel', selected: true },
                              { text: 'Harga tidak mengikat bisa berubah sewaktu-waktu tanpa pemberitahuan terlebih dahulu.', selected: true },
                              { text: 'DIMENSI KAROSERI diluar SKRB tidak diperuntukan untuk dijalan raya (OFF ROAD)', selected: true },
                              { text: 'Uji Type yang terbit hanya untuk karoseri dengan ukuran standard Dishub. Ukuran Oversize STM tidak bertanggung jawab jika uji type tidak dapat terbit dari Dishub', selected: true },
                              { text: 'Tanpa acc keur', selected: true }
                            ];

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

                          return formatNotes(selectedNotes, currentOffer.excludePPN).split('\n').map((note, index) => (
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
                      const itemsWithDrawings = currentOffer.offerItems?.filter(item => 
                        item.drawingSpecification && 
                        item.drawingSpecification.drawingFile && 
                        item.drawingSpecification.drawingFile.fileId
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
                                const isImage = drawing.drawingFile.fileType === 'JPG' || 
                                              drawing.drawingFile.fileType === 'PNG' || 
                                              drawing.drawingFile.fileType === 'JPEG';
                                
                                // Create asset URL for the drawing
                                const baseURL = window.location.origin.includes('localhost') ? 'http://localhost:5000' : 'http://localhost:5000';
                                const token = localStorage.getItem('asb-token');
                                const assetUrl = `${baseURL}/api/assets/drawings/${drawing._id}/files/${drawing.drawingFile.fileId}?token=${token}`;
                                
                                return (
                                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="mb-3">
                                      <h5 className="font-medium text-gray-900">
                                        Item {currentOffer.offerItems?.indexOf(item) + 1}: {item.karoseri} - {item.chassis}
                                      </h5>
                                      <div className="text-sm text-gray-600 space-y-1">
                                        <p><strong>Drawing Number:</strong> {drawing.drawingNumber}</p>
                                        <p><strong>Truck Type:</strong> {drawing.truckType?.name || 'N/A'}</p>
                                        <p><strong>File:</strong> {drawing.drawingFile.originalName}</p>
                                        <p><strong>File Type:</strong> {drawing.drawingFile.fileType}</p>
                                        <p><strong>File Size:</strong> {formatFileSize(drawing.drawingFile.fileSize)}</p>
                                        <p><strong>Upload Date:</strong> {new Date(drawing.drawingFile.uploadDate).toLocaleDateString('id-ID')}</p>
                  </div>
                </div>

                                    {/* Image Preview */}
                                    {isImage ? (
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
                                              <p className="text-xs text-gray-400">{drawing.drawingFile.originalName}</p>
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
                                              link.download = drawing.drawingFile.originalName;
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
                                        <h6 className="text-sm font-medium text-gray-700 mb-2">File Information:</h6>
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                                          <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                          <p className="text-sm text-gray-600 mb-2">
                                            {drawing.drawingFile.fileType} File
                                          </p>
                                          <p className="text-xs text-gray-500 mb-3">
                                            {drawing.drawingFile.originalName}
                                          </p>
                                          <button
                                            onClick={() => {
                                              const link = document.createElement('a');
                                              link.href = `${assetUrl}&download=true`;
                                              link.download = drawing.drawingFile.originalName;
                                              link.click();
                                            }}
                                            className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                          >
                                            <Download className="w-3 h-3 mr-1" />
                                            Download File
                                          </button>
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
                    
                    {/* Notes Images Preview - After Drawings */}
                    {(() => {
                      const notesImages = currentOffer.notesImages || [];
                      
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
                                const baseURL = window.location.origin.includes('localhost') ? 'http://localhost:5000' : 'http://localhost:5000';
                                const token = localStorage.getItem('asb-token');
                                const assetUrl = `${baseURL}/api/assets/notes-images/${imageId}/files/${fileId}?token=${token}`;
                                
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
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Document Notes</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Select which notes to include in the document
                </p>
                          </div>
              <div className="p-6">
                <div className="space-y-3">
                  {predefinedNotes.map((note, index) => (
                    <label key={index} className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedNotes.includes(index)}
                        onChange={() => toggleNote(index)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">{note.text}</span>
                    </label>
                  ))}
                            </div>
                          </div>
                        </div>

            {/* Pricing Summary */}
            <div className="bg-white rounded-lg shadow-sm border mt-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Pricing Summary</h2>
              </div>
              <div className="p-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Netto:</span>
                    <span className="font-medium">{formatPrice(totalNetto)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">PPN (11%):</span>
                    <span className="font-medium">{formatPrice(ppn)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Total:</span>
                    <span className="font-semibold text-lg">{formatPrice(total)}</span>
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
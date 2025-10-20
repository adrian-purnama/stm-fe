import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import ImageModule from "docxtemplater-image-module-free";

// Format dates for Indonesian locale
const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Format contact gender
const formatContactGender = (gender) => {
  if (!gender) return "";
  switch (gender.toLowerCase()) {
    case "male":
      return "Bapak";
    case "female":
      return "Ibu";
    default:
      return gender;
  }
};

// Format price with Indonesian currency
const formatPrice = (price) => {
  if (!price || price === 0) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

// Format phone numbers
const formatPhoneNumbers = (phoneNumbers) => {
  if (
    !phoneNumbers ||
    !Array.isArray(phoneNumbers) ||
    phoneNumbers.length === 0
  ) {
    return "";
  }

  return phoneNumbers
    .filter((phone) => phone.label && phone.value)
    .map((phone) => `${phone.label} : ${phone.value}`)
    .join("\n");
};

// Format notes based on checkboxes
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

// Build item text for template with exact spacing
const buildItemText = (offerItems) => {
  if (!offerItems || offerItems.length === 0) {
    return "";
  }

  let itemText = "";

  offerItems.forEach((item, index) => {
    const itemNumber = index + 1;
    const karoseri = item.karoseri || "";
    const chassis = item.chassis || "";

    // Format specifications with proper indentation (each spec line aligned)
    let specificationsText = "";
    
    if (item.specifications && item.specifications.length > 0) {
       if (item.specificationMode === "simple") {
         // Simple mode: Join specs with newline, first line has 0 spaces, others have 28 spaces
         const specs = item.specifications;
         specificationsText = `${specs[0] || ""}`;
         for (let i = 1; i < specs.length; i++) {
           specificationsText += `\n${" ".repeat(28)}${specs[i]}`;
         }
      } else {
        // Complex mode: Table-like format with invisible borders for perfect Word alignment
        const specs = item.specifications;

        if (specs.length === 0) {
          specificationsText = "";
        } else {
          const midPoint = Math.ceil(specs.length / 2);
          const leftColumn = specs.slice(0, midPoint);
          const rightColumn = specs.slice(midPoint);
          
          const leftMaxLabelLength = Math.max(...leftColumn.map(s => (s.label || '').length));
          const rightMaxLabelLength = Math.max(...rightColumn.map(s => (s.label || '').length), 0);
          
          // Longest full left content (label + value)
          const leftColumnWidth = Math.max(...leftColumn.map(s => {
            const label = s.label || '';
            const value = s.value || '';
            const pad = leftMaxLabelLength - label.length;
            return `${label}${' '.repeat(pad)} : ${value}`.length;
          }), 0);
          
          const tableRows = [];
          const maxLines = Math.max(leftColumn.length, rightColumn.length);
          const columnGap = 2; // reduced from 2 → tighter columns
          
          for (let i = 0; i < maxLines; i++) {
            const leftSpec = leftColumn[i] || {};
            const rightSpec = rightColumn[i] || {};
          
            // left cell
            const labelL = leftSpec.label || '';
            const valueL = leftSpec.value || '';
            const padL = leftMaxLabelLength - labelL.length;
            let leftCell = `${labelL}${' '.repeat(padL)} : ${valueL}`;
            leftCell = leftCell.padEnd(leftColumnWidth, ' ');
          
            // right cell (slightly tighter alignment)
            const labelR = rightSpec.label || '';
            const valueR = rightSpec.value || '';
            const padR = rightMaxLabelLength - labelR.length;
            const rightCell = rightSpec.label
              ? `${labelR}${' '.repeat(Math.max(0, padR - 1))} : ${valueR}`
              : '';
          
           tableRows.push(`${leftCell}${' '.repeat(columnGap)}${rightCell}`);
           }
           
           // Add 10 spaces to all lines for consistent alignment
           specificationsText = tableRows.map(row => `${" ".repeat(10)}${row}`).join('\n').replace(/ /g, '\u00A0');
          
        }
      }
    }
    

    // Format drawing number sentence
    const drawingNumberSentence = item.drawingSpecification
      ? `Spesifikasi lain sesuai gambar ${item.drawingSpecification.drawingNumber || 'Selected'}`
      : "";

     // Build this item's text with exact spacing
     // First item (1.) has NO spaces, subsequent items (2., 3., etc.) have 10 spaces
     if (itemNumber === 1) {
       itemText += `${itemNumber}. Karoseri     : ${karoseri}\n`;
     } else {
       itemText += `${" ".repeat(10)}${itemNumber}. Karoseri     : ${karoseri}\n`;
     }

     // Chassis with 10 spaces before and 8 spaces after the colon
     itemText += `${" ".repeat(10)}Chassis         : ${chassis}\n`;

     // Spesifikasi formatting based on mode
     if (item.specificationMode === "complex" && specificationsText) {
       // Complex mode: Put "Spesifikasi:" on its own line with 10 spaces before
       itemText += `${" ".repeat(10)}Spesifikasi     :\n`;
       itemText += specificationsText;
     } else {
       // Simple mode: Put specifications on the same line with 10 spaces before
       itemText += `${" ".repeat(10)}Spesifikasi     : ${specificationsText}`;
     }

     // Add drawing number sentence with mode-specific indentation
     if (drawingNumberSentence) {
       if (item.specificationMode === "simple") {
         // Simple mode: 28 spaces (20 + 8 more)
         itemText += `\n${" ".repeat(28)}${drawingNumberSentence}`;
        } else {
         // Complex mode: 10 spaces
         itemText += `\n${" ".repeat(10)}${drawingNumberSentence}`;
       }
     }

    // Add spacing between items (except for the last one)
    if (index < offerItems.length - 1) {
      itemText += "\n\n";
    }
  });

  return itemText;
};

// Prepare quotation data for template
const prepareQuotationData = (header, offer, selectedNotes = [], drawingsInfo = "", imageData = [], notesImagesData = []) => {
  // Get current user info
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  // Calculate totals
  const totalNetto =
    offer.offerItems?.reduce((sum, item) => sum + (item.netto || 0), 0) || 0;
  const ppn = Math.round(totalNetto * 0.11);
  const total = totalNetto + ppn;

  // Build item text
  const itemText = buildItemText(offer.offerItems);

  // Debug: Log the final item text being sent to the template
  
  return {
    // Header information
    quotation_number: header.quotationNumber || "",
    quotation_date: formatDate(new Date()),
    customer_name: header.customerName || "",
    contact_person: header.contactPerson?.name || "",
    contact_gender: formatContactGender(header.contactPerson?.gender),
    marketing_name: header.marketingName || "N/A",
    
    // Offer information
    offer_number: offer.offerNumber || "",
    offer_notes: offer.notes || "",
    exclude_ppn: offer.excludePPN || false,

    // Item text - THE KEY FIELD!
    item: itemText,
    total_items: (offer.offerItems || []).length,

    // Pricing totals
    total_netto: formatPrice(totalNetto),
    ppn: formatPrice(ppn),
    total: formatPrice(total),
    
    // Additional data
    current_date: formatDate(new Date()),
    current_year: new Date().getFullYear(),
    
    // User information
    name: currentUser?.fullName || "",
    phone_number: formatPhoneNumbers(currentUser?.phoneNumbers || []),
    
    // Notes
    notes: formatNotes(selectedNotes, offer.excludePPN),
    
    // Signature section
    signature: "Demikianlah penawaran dari kami, atas perhatian dan kerjasamanya kami ucapkan terimakasih.\n\nHormat Kami,\n\nPT. Sukses Tunggal Mandiri",
    
    // Drawings information (appears after signature)
    drawings_info: drawingsInfo || "",
    has_drawings: drawingsInfo ? true : false,
    
    // Image data for template
    images: imageData || [],
    has_images: imageData && imageData.length > 0,
    
    // Notes images data for template
    notes_images: notesImagesData || [],
    has_notes_images: notesImagesData && notesImagesData.length > 0,
    
    // Single noteimages field for {noteimages} placeholder - removed to avoid ImageModule conflicts
    // noteimages: notesImagesData && notesImagesData.length > 0 ? notesImagesData.map(img => img.imageTag) : [], // Array of base64 strings for {noteimages} placeholder
    
    // Create individual placeholders for notes images that work with the ImageModule
    // These will be accessible as {image_notes_1}, {image_notes_2}, etc.
    ...(notesImagesData && notesImagesData.length > 0 ? notesImagesData.reduce((acc, img, index) => {
      acc[`image_notes_${index + 1}`] = img.imageTag; // This will be used by {%image:notes_1%}, {%image:notes_2%}, etc.
      return acc;
    }, {}) : {}),
    
    
    // Individual image data for direct access (drawing images)
    ...(imageData && imageData.length > 0 ? imageData.reduce((acc, img, index) => {
      acc[`image_${index + 1}`] = img.imageTag; // This will be used by {%image:base64data%}
      return acc;
    }, {}) : {}),
    
    // Individual notes images data for direct access (using same prefix as drawing images)
    ...(notesImagesData && notesImagesData.length > 0 ? notesImagesData.reduce((acc, img, index) => {
      acc[`image_${(imageData ? imageData.length : 0) + index + 1}`] = img.imageTag; // Continue numbering after drawing images
      return acc;
    }, {}) : {}),
  };
};

// Generate document from template
const generateDocument = async (templatePath, data, hasImages = false) => {
  try {
    // Load the template file
    const response = await fetch(templatePath);
    if (!response.ok) {
      throw new Error(
        `Failed to load template: ${response.statusText} (${response.status})`
      );
    }

    const templateBuffer = await response.arrayBuffer();

    // Check if the file is valid
    if (templateBuffer.byteLength === 0) {
      throw new Error("Template file is empty");
    }


    // Create a PizZip instance with the template
    let zip;
    try {
      zip = new PizZip(templateBuffer);
    } catch (error) {
      throw new Error(
        `Invalid template file: ${error.message}. Please ensure the template is a valid Word document.`
      );
    }

    // Create modules array
    const modules = [];
    
    // Add image module if there are any images (drawing images or notes images)
    if (hasImages || (data.has_notes_images && data.notes_images.length > 0)) {
      modules.push(createImageModule());
    }

    // Create a docxtemplater instance
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      modules, // Use the modules array instead of creating a new one
    });
    

    // Render the document with data (using new API)
    try {
      doc.render(data);
    } catch (renderError) {
      console.error("Document render error:", renderError);
      throw renderError;
    }

    // Generate the document
    const buf = doc.getZip().generate({
      type: "blob",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      compression: "DEFLATE",
      compressionOptions: {
        level: 9,
      },
    });

    return buf;
  } catch (error) {
    console.error("Document generation error:", error);
    throw new Error(`Document generation failed: ${error.message}`);
  }
};

// Generate document with drawings page
const generateDocumentWithDrawings = async (templatePath, data) => {
  try {
    // The drawings info is already included in the data
    
    // If there are drawings, we need to create a proper page break
    if (data.has_drawings && data.drawings_info) {
      // Add page break before drawings
      data.drawings_info = `\f${data.drawings_info}`; // \f is form feed (page break)
    }
    
    // Generate the document with all data included
    return await generateDocument(templatePath, data, data.has_images || false);
  } catch (error) {
    console.error("Document with drawings generation error:", error);
    throw new Error(`Document with drawings generation failed: ${error.message}`);
  }
};

// Create drawings information as text for the template
const createDrawingsInfo = (itemsWithDrawings, quotationNumber) => {
  try {
    if (!itemsWithDrawings || itemsWithDrawings.length === 0) {
      return "";
    }
    
    let drawingsText = `\n\n\nLAMPIRAN\n`;
    drawingsText += `DRAWING SPECIFICATIONS\n`;
    drawingsText += `Quotation: ${quotationNumber}\n\n`;
    
    itemsWithDrawings.forEach((item, index) => {
      const drawing = item.drawingSpecification;
      
      drawingsText += `Item ${index + 1}: ${item.karoseri} - ${item.chassis}\n`;
      drawingsText += `Drawing Number: ${drawing.drawingNumber}\n`;
      drawingsText += `Truck Type: ${drawing.truckType?.name || 'N/A'}\n`;
      drawingsText += `File: ${drawing.drawingFile.originalName}\n`;
      drawingsText += `File Type: ${drawing.drawingFile.fileType}\n`;
      drawingsText += `File Size: ${formatFileSize(drawing.drawingFile.fileSize)}\n`;
      drawingsText += `Upload Date: ${formatDate(drawing.drawingFile.uploadDate)}\n`;
      
      // Add file access information
      const baseURL = window.location.origin.includes('localhost') ? 'http://localhost:5000' : 'http://localhost:5000';
      const token = localStorage.getItem('asb-token');
      const fileUrl = `${baseURL}/api/assets/drawings/${drawing._id}/files/${drawing.drawingFile.fileId}?token=${token}`;
      drawingsText += `File URL: ${fileUrl}\n`;
      
      drawingsText += `\n─────────────────────────────────────────────────────────────\n\n`;
    });
    
    return drawingsText;
  } catch (error) {
    console.error("Error creating drawings info:", error);
    return "\n\n\nLAMPIRAN\n[Drawing information could not be generated]\n";
  }
};

// Format file size in human readable format
const formatFileSize = (bytes) => {
  if (!bytes) return "Unknown";
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

// Rotate image 90 degrees clockwise
const rotateImage90Degrees = (base64String) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Swap width and height for 90-degree rotation
      canvas.width = img.height;
      canvas.height = img.width;
      
      // Rotate the context 90 degrees
      ctx.translate(canvas.width, 0);
      ctx.rotate(Math.PI / 2);
      
      // Draw the rotated image
      ctx.drawImage(img, 0, 0);
      
      // Convert back to base64
      const rotatedBase64 = canvas.toDataURL('image/jpeg', 0.9);
      resolve(rotatedBase64);
    };
    img.src = `data:image/jpeg;base64,${base64String}`;
  });
};

// Fetch image as base64 from backend
const fetchImageAsBase64 = async (drawingId, fileId, rotate = false) => {
  try {
    const baseURL = window.location.origin.includes('localhost') ? 'http://localhost:5000' : 'http://localhost:5000';
    const token = localStorage.getItem('asb-token');
    const url = `${baseURL}/api/assets/drawings/${drawingId}/files/${fileId}/base64?token=${token}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch image');
    }
    
    let base64Data = result.data.base64;
    
    // Rotate image if requested
    if (rotate) {
      base64Data = await rotateImage90Degrees(base64Data);
    }
    
    return {
      ...result.data,
      base64: base64Data
    };
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
};

// Create image module for docxtemplater with different sizes for different image types
const createImageModule = () =>
  new ImageModule({
    centered: true,
    fileType: "docx",
    // 👇 This line tells the module what tag pattern to look for
    prefix: "image", // handles {%image...%}
    getImage: (tagValue) => {
      if (!tagValue) return new Uint8Array(0);
      const base64Data = tagValue.includes(",")
        ? tagValue.split(",")[1]
        : tagValue;
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    },
    getSize: (img, tagValue, tagName) => {
      // Different sizes based on image type
      if (tagName && tagName.includes('notes')) {
        // Notes images - smaller size
        return [400, 600]; // Width x Height for notes images
      } else {
        // Drawing specification images - original size
        return [700, 1100]; // Width x Height for drawing images
      }
    },
  });




// Main function to generate quotation document
export const generateQuotationDocument = async (
  quotationData,
  filename = "quotation.docx",
  selectedNotes = []
) => {
  try {
    const { header, offers } = quotationData;
    
    // Debug: Check the data structure
    
    // Find the active offer
    let activeOffer = null;
    if (header.status?.type === "win" && header.selectedOfferId) {
      // Find winning offer
    for (const offerGroup of offers) {
        if (offerGroup.original?._id === header.selectedOfferId) {
          activeOffer = offerGroup.original;
        break;
      }
      if (offerGroup.revisions) {
          const revision = offerGroup.revisions.find(
            (rev) => rev._id === header.selectedOfferId
          );
        if (revision) {
            activeOffer = revision;
          break;
          }
        }
      }
    } else {
      // Use first offer - check both original and direct offer structure
      if (offers[0]?.original) {
        activeOffer = offers[0].original;
      } else if (offers[0]) {
        activeOffer = offers[0];
      }
    }
    
    if (!activeOffer) {
      throw new Error("No offer found to generate document");
    }
    
    // Debug: Check what's in the activeOffer
    
    // Check if offerItems exist and have specifications
    if (!activeOffer.offerItems || activeOffer.offerItems.length === 0) {
      throw new Error("No offer items found in the selected offer");
    }
    
    // Check if there are any drawings to include
    const itemsWithDrawings = activeOffer.offerItems.filter(item => 
      item.drawingSpecification && 
      item.drawingSpecification.drawingFile && 
      item.drawingSpecification.drawingFile.fileId
    );
    
    
    // Create drawings information if there are drawings
    const drawingsInfo = itemsWithDrawings.length > 0 
      ? createDrawingsInfo(itemsWithDrawings, header.quotationNumber)
      : "";
    
    // Preload base64 images so docxtemplater doesn't fetch async
    for (const item of itemsWithDrawings) {
      const drawing = item.drawingSpecification;
      try {
        const imageResult = await fetchImageAsBase64(drawing._id, drawing.drawingFile.fileId, true); // true = rotate 90 degrees
        drawing.imageBase64 = imageResult.base64 || imageResult.data || imageResult; // support any format returned
      } catch (err) {
        console.warn(`Failed to load image for drawing ${drawing._id}`, err);
        drawing.imageBase64 = "";
      }
    }

    // Collect image data for template
    const imageData = [];
    for (const item of itemsWithDrawings) {
      const drawing = item.drawingSpecification;
      const isImage = drawing.drawingFile.fileType === 'JPG' || 
                     drawing.drawingFile.fileType === 'PNG' || 
                     drawing.drawingFile.fileType === 'JPEG';
      
      if (isImage) {
        // Extract pure base64 string (remove data:image/...;base64, prefix if present)
        const base64String = item.drawingSpecification.imageBase64.includes(",")
          ? item.drawingSpecification.imageBase64.split(",")[1]
          : item.drawingSpecification.imageBase64;
        
        imageData.push({
          karoseri: item.karoseri,
          chassis: item.chassis,
          imageTag: base64String, // pure base64 (e.g. starts with iVBORw0K...)
          itemNumber: activeOffer.offerItems.indexOf(item) + 1,
          drawingNumber: drawing.drawingNumber,
          filename: drawing.drawingFile.originalName
        });
      }
    }

    // Collect notes images data for template
    const notesImagesData = [];
    // Collect notes images data for template
    if (activeOffer.notesImages && activeOffer.notesImages.length > 0) {
      for (const notesImage of activeOffer.notesImages) {
        try {
          // Fetch notes image as base64
          const baseURL = window.location.origin.includes('localhost') ? 'http://localhost:5000' : 'http://localhost:5000';
          const token = localStorage.getItem('asb-token');
          const url = `${baseURL}/api/assets/notes-images/${notesImage._id}/files/${notesImage.imageFile.fileId}/base64?token=${token}`;
          
          const response = await fetch(url);
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              // Rotate the notes image if needed
              const rotatedBase64 = await rotateImage90Degrees(result.data.base64);
              const base64String = rotatedBase64.includes(",")
                ? rotatedBase64.split(",")[1]
                : rotatedBase64;
              
              notesImagesData.push({
                imageTag: base64String,
                filename: notesImage.imageFile.originalName
              });
            }
          }
        } catch (err) {
          console.warn(`Failed to load notes image ${notesImage._id}`, err);
        }
      }
    }
    
    
    // Prepare data for template
    const templateData = prepareQuotationData(
      header,
      activeOffer,
      selectedNotes,
      drawingsInfo,
      imageData,
      notesImagesData
    );
    
    
    // Generate the document
    const documentBlob = await generateDocumentWithDrawings(
      "/templates/TemplateQuotation.docx",
      templateData
    );

    // Download the document
    saveAs(documentBlob, filename);

    return documentBlob;
  } catch (error) {
    console.error("Quotation document generation failed:", error);
    throw error;
  }
};

// Export utility functions for use in other components
export { formatPrice, formatNotes };

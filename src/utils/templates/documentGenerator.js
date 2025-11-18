// NOTE: Document generation has been moved to the backend
// This file now only contains utility functions for formatting

// Format price with Indonesian currency
export const formatPrice = (price) => {
  if (!price || price === 0) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

// Format notes based on selected notes indices
export const formatNotes = (selectedNotes, excludePPN) => {
  const notes = [];

  if (excludePPN) {
    notes.push("Harga tersebut diatas Belum Termasuk PPN 11%");
    notes.push(
      "Nilai PPN menyesuaikan ketentuan pemerintah saat terbit faktur pajak"
    );
  } else {
    notes.push("Harga tersebut diatas Sudah Termasuk PPN 11%");
  }

  // Predefined notes
  const predefinedNotes = [
    { text: 'Payment Dp.50 % sisa cash before delivery', selected: true },
    { text: 'Loco Pabrik Cikande', selected: true },
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

  // Format notes with proper spacing
  const formattedNotes = notes.map((note) => {
    const prefix = "     -   ";
    const words = note.split(' ');
    const lines = [];
    let currentLine = '';
    const maxLineWidth = 100;
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length > maxLineWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    const formattedLines = lines.map((line, index) => {
      if (index === 0) {
        return `${prefix}${line}`;
      } else {
        const textStartPosition = prefix.length;
        return `${" ".repeat(textStartPosition)}${line}`;
      }
    });
    
    return formattedLines.join('\n');
  });
  
  return formattedNotes.join("\n");
};

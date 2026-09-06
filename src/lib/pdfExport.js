import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Render the given DOM element as a PDF file preserving full visual styling.
// The element should be the sheet card (not wrapped in the dark preview bg).
export async function exportPDF(element, filename = 'chord-sheet.pdf') {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#F7EEDC',
    logging: false,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // Scale canvas to fit A4 width, add pages if content is taller
  const pxPerMm = canvas.width / pageW;
  const contentH = canvas.height / pxPerMm;

  if (contentH <= pageH) {
    pdf.addImage(imgData, 'JPEG', 0, 0, pageW, contentH);
  } else {
    // Multi-page: slice canvas into page-height chunks
    const sliceH = Math.floor(pageH * pxPerMm);
    let offset = 0;
    let page = 0;
    while (offset < canvas.height) {
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.min(sliceH, canvas.height - offset);
      const ctx = sliceCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, -offset);
      const slice = sliceCanvas.toDataURL('image/jpeg', 0.92);
      if (page > 0) pdf.addPage();
      pdf.addImage(slice, 'JPEG', 0, 0, pageW, pageH);
      offset += sliceH;
      page++;
    }
  }

  pdf.save(filename);
}

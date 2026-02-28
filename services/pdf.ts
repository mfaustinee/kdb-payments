
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { AgreementData } from '../types';

export const downloadAgreementPDF = async (agreement: AgreementData, elementId: string = 'formal-agreement') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("Element not found for PDF generation");
    return;
  }

  try {
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const margin = 15; // 15mm margin
    const innerWidth = pdfWidth - (margin * 2);

    // Use the .html() method for intelligent, text-aware paging
    await pdf.html(element, {
      callback: (doc) => {
        doc.save(`KDB_Agreement_${agreement.dboName.replace(/\s+/g, '_')}.pdf`);
      },
      x: margin,
      y: margin,
      width: innerWidth,
      windowWidth: 1000, // Fixed width for consistent rendering
      autoPaging: 'text', // This is the "text-aware" paging
      html2canvas: {
        scale: 0.25, // Adjust scale to fit content properly
        useCORS: true,
        allowTaint: false,
        letterRendering: true,
        logging: false,
      },
      margin: [margin, margin, margin, margin] // [top, left, bottom, right]
    });

  } catch (error) {
    console.error("Detailed PDF Error:", error);
    alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

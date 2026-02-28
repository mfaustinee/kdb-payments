
import { jsPDF } from 'jspdf';
import { AgreementData } from '../types';

export const downloadAgreementPDF = async (agreement: AgreementData, elementId: string = 'formal-agreement') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("Element not found for PDF generation");
    return;
  }

  try {
    // Scroll to top to ensure full capture
    window.scrollTo(0, 0);
    
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true
    });

    // Set font to Times (standard PDF font for Times New Roman)
    pdf.setFont('times', 'normal');

    await pdf.html(element, {
      callback: function (doc) {
        doc.save(`KDB_Agreement_${agreement.dboName.replace(/\s+/g, '_')}.pdf`);
      },
      x: 15,
      y: 15,
      width: 180, // A4 width (210) - margins (15+15)
      windowWidth: 1000, // Reference width for scaling
      autoPaging: 'text',
      margin: [15, 15, 15, 15],
      html2canvas: {
        scale: 0.18, // Adjusted scale for 1000px -> 180mm
        useCORS: true,
        logging: false,
        letterRendering: true,
        allowTaint: false
      }
    });

  } catch (error) {
    console.error("Detailed PDF Error:", error);
    alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

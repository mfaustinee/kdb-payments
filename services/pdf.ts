
import { jsPDF } from 'jspdf';
import { AgreementData, ClosureNotificationData } from '../types';

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

    const targetWidth = 195; // 210mm - 15mm total margins (5mm left, 10mm right)
    const referenceWidth = 1024;
    const scale = (targetWidth / referenceWidth);

    await pdf.html(element, {
      callback: function (doc) {
        doc.save(`KDB_Agreement_${agreement.dboName.replace(/\s+/g, '_')}.pdf`);
      },
      x: 5,
      y: 2,
      width: targetWidth,
      windowWidth: referenceWidth,
      autoPaging: 'text',
      margin: [15, 10, 15, 5],
      html2canvas: {
        scale: scale,
        useCORS: true,
        logging: false,
        letterRendering: true,
        allowTaint: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: referenceWidth,
        width: referenceWidth
      }
    });

  } catch (error) {
    console.error("Detailed PDF Error:", error);
    alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const downloadClosurePDF = async (closure: ClosureNotificationData, elementId: string = 'closure-certificate') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("Element not found for PDF generation");
    return;
  }

  try {
    window.scrollTo(0, 0);
    
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true
    });

    const targetWidth = 195;
    const referenceWidth = 1024;
    const scale = (targetWidth / referenceWidth);

    await pdf.html(element, {
      callback: function (doc) {
        doc.save(`KDB_Cessation_Notice_${closure.permitNo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      },
      x: 5,
      y: 2,
      width: targetWidth,
      windowWidth: referenceWidth,
      autoPaging: 'text',
      margin: [15, 10, 15, 5],
      html2canvas: {
        scale: scale,
        useCORS: true,
        logging: false,
        letterRendering: true,
        allowTaint: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: referenceWidth,
        width: referenceWidth
      }
    });

  } catch (error) {
    console.error("Detailed closure PDF Error:", error);
    alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

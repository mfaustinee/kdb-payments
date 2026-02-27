
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
    // Temporarily remove any print-hidden elements if they are inside the capture area
    // Though in our case they are outside.
    
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false, // Changed to false to better handle CORS with anonymous
      logging: true,
      backgroundColor: '#ffffff',
      windowWidth: 1200,
      height: element.offsetHeight, // Explicitly set height
      onclone: (clonedDoc) => {
        // Ensure images are loaded in the clone if possible
        const images = clonedDoc.getElementsByTagName('img');
        for (let i = 0; i < images.length; i++) {
          images[i].src = images[i].src; // Trigger reload in clone
        }
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgProps = pdf.getImageProperties(imgData);
    const ratio = imgProps.width / imgProps.height;
    const width = pdfWidth;
    const height = pdfWidth / ratio;

    // If the content is longer than one page, we might need to handle it, 
    // but for this agreement it should fit on one A4 or we can scale it.
    pdf.addImage(imgData, 'JPEG', 0, 0, width, height);
    
    pdf.save(`KDB_Agreement_${agreement.dboName.replace(/\s+/g, '_')}.pdf`);
  } catch (error) {
    console.error("Detailed PDF Error:", error);
    alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

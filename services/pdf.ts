
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
    // Scroll to top to ensure full capture
    window.scrollTo(0, 0);
    
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: true,
      backgroundColor: '#ffffff',
      windowWidth: 1200,
      windowHeight: element.scrollHeight + 200, // Ensure window is tall enough
      height: element.scrollHeight,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          clonedElement.style.height = 'auto';
          clonedElement.style.overflow = 'visible';
          clonedElement.style.position = 'relative';
          clonedElement.style.display = 'block';
        }
        // Ensure images are loaded
        const images = clonedDoc.getElementsByTagName('img');
        for (let i = 0; i < images.length; i++) {
          images[i].src = images[i].src;
        }
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const margin = 15; // 15mm margin
    const innerWidth = pdfWidth - (margin * 2);
    const innerHeight = pdfHeight - (margin * 2);
    const imgHeight = (imgProps.height * innerWidth) / imgProps.width;
    
    let heightLeft = imgHeight;
    let position = margin;

    // Function to draw white margins to "clip" the image slices
    const drawMargins = () => {
      pdf.setFillColor(255, 255, 255);
      // Top margin
      pdf.rect(0, 0, pdfWidth, margin, 'F');
      // Bottom margin
      pdf.rect(0, pdfHeight - margin, pdfWidth, margin, 'F');
      // Left margin
      pdf.rect(0, 0, margin, pdfHeight, 'F');
      // Right margin
      pdf.rect(pdfWidth - margin, 0, margin, pdfHeight, 'F');
    };

    // Page 1
    pdf.addImage(imgData, 'JPEG', margin, position, innerWidth, imgHeight);
    drawMargins();
    heightLeft -= innerHeight;

    // Subsequent pages
    while (heightLeft > 0) {
      position -= innerHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, innerWidth, imgHeight);
      drawMargins();
      heightLeft -= innerHeight;
    }
    
    pdf.save(`KDB_Agreement_${agreement.dboName.replace(/\s+/g, '_')}.pdf`);
  } catch (error) {
    console.error("Detailed PDF Error:", error);
    alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

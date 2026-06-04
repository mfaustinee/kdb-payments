import { jsPDF } from 'jspdf';
import { AgreementData, ClosureNotificationData } from '../types';

const sanitizeOklch = () => {
  const stylesBackup: { element: HTMLStyleElement; text: string }[] = [];
  const styleBackups: { node: HTMLElement; originalDisabled: boolean }[] = [];
  const tempStyleEl = document.createElement('style');
  tempStyleEl.id = 'temp-pdf-sanitized-styles';
  let combinedCssText = '';

  try {
    // 1. Process style tags textContent directly
    const styleElements = document.querySelectorAll('style');
    styleElements.forEach((styleEl) => {
      if (styleEl.textContent && 
          (styleEl.textContent.includes('oklch') || styleEl.textContent.includes('oklab')) && 
          styleEl.id !== 'temp-pdf-sanitized-styles') {
        stylesBackup.push({ element: styleEl as HTMLStyleElement, text: styleEl.textContent });
        // Replace oklch and oklab with a standard color (even with nested brackets)
        const sanitized = styleEl.textContent
          .replace(/oklch\([^()]*(\([^()]*\)[^()]*)*\)/gi, 'rgb(15, 23, 42)')
          .replace(/oklab\([^()]*(\([^()]*\)[^()]*)*\)/gi, 'rgb(15, 23, 42)')
          .replace(/oklch\([^)]+\)/gi, 'rgb(15, 23, 42)')
          .replace(/oklab\([^)]+\)/gi, 'rgb(15, 23, 42)');
        styleEl.textContent = sanitized;
      }
    });

    // 2. Clear/rewrite active stylesheets (including link tags) by gathering rules
    for (let i = 0; i < document.styleSheets.length; i++) {
      const sheet = document.styleSheets[i];
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (rules && sheet.ownerNode) {
          let sheetCssText = '';
          for (let j = 0; j < rules.length; j++) {
            sheetCssText += rules[j].cssText + '\n';
          }
          
          if (sheetCssText.includes('oklch') || sheetCssText.includes('oklab')) {
            const sanitized = sheetCssText
              .replace(/oklch\([^[]*?(\([^[]*?\)[^[]*?)*?\)/gi, 'rgb(15, 23, 42)')
              .replace(/oklab\([^[]*?(\([^[]*?\)[^[]*?)*?\)/gi, 'rgb(15, 23, 42)')
              .replace(/oklch\([^)]+\)/gi, 'rgb(15, 23, 42)')
              .replace(/oklab\([^)]+\)/gi, 'rgb(15, 23, 42)');
            combinedCssText += sanitized + '\n';
            
            const node = sheet.ownerNode as HTMLElement;
            styleBackups.push({
              node: node,
              originalDisabled: (node as any).disabled || false
            });
            (node as any).disabled = true;
          }
        }
      } catch (sheetErr) {
        console.warn("Could not process stylesheet rules dynamically:", sheetErr);
      }
    }

    if (combinedCssText) {
      tempStyleEl.textContent = combinedCssText;
      document.head.appendChild(tempStyleEl);
    }
  } catch (e) {
    console.warn("Failed to sanitize oklch/oklab styles:", e);
  }

  return () => {
    // Restore text content backups of style tags
    stylesBackup.forEach(({ element, text }) => {
      try {
        element.textContent = text;
      } catch (e) {
        console.warn("Failed to restore oklch/oklab style tag:", e);
      }
    });

    // Re-enable disabled stylesheets
    styleBackups.forEach(({ node, originalDisabled }) => {
      try {
        (node as any).disabled = originalDisabled;
      } catch (e) {
        console.warn("Failed to restore stylesheet node:", e);
      }
    });

    // Remove the temporary style tag
    if (tempStyleEl.parentNode) {
      tempStyleEl.parentNode.removeChild(tempStyleEl);
    }
  };
};

export const downloadAgreementPDF = async (agreement: AgreementData, elementId: string = 'formal-agreement') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("Element not found for PDF generation");
    return;
  }

  const restoreStyles = sanitizeOklch();

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
        restoreStyles();
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
    restoreStyles();
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

  const restoreStyles = sanitizeOklch();

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
        restoreStyles();
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
    restoreStyles();
    console.error("Detailed closure PDF Error:", error);
    alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

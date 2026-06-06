import { jsPDF } from 'jspdf';
import { AgreementData, ClosureNotificationData } from '../types';

const oklchToRgba = (oklchStr: string): string => {
  try {
    const match = oklchStr.match(/(oklch|oklab)\(([^)]+)\)/i);
    if (!match) return oklchStr;

    const type = match[1].toLowerCase();
    const rawParams = match[2];

    if (rawParams.includes('var(')) {
      return 'rgb(15, 23, 42)';
    }

    const parts = rawParams.split('/');
    const colorPart = parts[0].trim();
    const alphaPart = parts[1] ? parts[1].trim() : null;

    const colorValues = colorPart.split(/[\s,]+/).map(v => v.trim()).filter(Boolean);

    if (colorValues.length < 3) return oklchStr;

    let L = parseFloat(colorValues[0]);
    let c1 = parseFloat(colorValues[1]);
    let c2 = parseFloat(colorValues[2]);

    if (isNaN(L) || isNaN(c1) || isNaN(c2)) return oklchStr;

    if (colorValues[0].includes('%')) L = parseFloat(colorValues[0]) / 100;
    if (colorValues[1].includes('%')) c1 = parseFloat(colorValues[1]) / 100;
    if (colorValues[2].includes('%')) c2 = parseFloat(colorValues[2]) / 100;

    let oka = 0;
    let okb = 0;

    if (type === 'oklch') {
      const C = c1;
      let H = c2;
      if (colorValues[2].includes('rad')) {
        H = parseFloat(colorValues[2]) * (180 / Math.PI);
      } else if (colorValues[2].includes('turn')) {
        H = parseFloat(colorValues[2]) * 360;
      } else if (colorValues[2].includes('grad')) {
        H = parseFloat(colorValues[2]) * 0.9;
      }
      const hRad = (H * Math.PI) / 180;
      oka = C * Math.cos(hRad);
      okb = C * Math.sin(hRad);
    } else {
      oka = c1;
      okb = c2;
    }

    // Convert OKLAB to LMS
    const l_ = L + 0.3963377774 * oka + 0.2158037573 * okb;
    const m_ = L - 0.1055613458 * oka - 0.0638541728 * okb;
    const s_ = L - 0.0894841775 * oka - 1.2914855480 * okb;

    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;

    // Convert LMS to Linear sRGB
    const r_lin = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const g_lin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const b_lin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

    const toSRGB = (c: number) => {
      const absC = Math.abs(c);
      const res = absC <= 0.0031308 ? 12.92 * absC : 1.055 * Math.pow(absC, 1 / 2.4) - 0.055;
      return c < 0 ? -res : res;
    };

    const r = Math.max(0, Math.min(255, Math.round(toSRGB(r_lin) * 255)));
    const g = Math.max(0, Math.min(255, Math.round(toSRGB(g_lin) * 255)));
    const b = Math.max(0, Math.min(255, Math.round(toSRGB(b_lin) * 255)));

    let alpha = 1.0;
    if (alphaPart) {
      if (alphaPart.includes('%')) {
        alpha = parseFloat(alphaPart) / 100;
      } else {
        alpha = parseFloat(alphaPart);
      }
      if (isNaN(alpha)) alpha = 1.0;
    }

    if (alpha < 1) {
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } else {
      return `rgb(${r}, ${g}, ${b})`;
    }
  } catch (err) {
    return 'rgb(15, 23, 42)';
  }
};

const replaceOklchAll = (text: string): string => {
  if (typeof text !== 'string') return text;
  return text.replace(/(oklch|oklab)\(([^()]*(\([^()]*\)[^()]*)*)\)/gi, (fullMatch) => {
    return oklchToRgba(fullMatch);
  });
};

const sanitizeOklch = () => {
  const stylesBackup: { element: HTMLStyleElement; text: string }[] = [];
  const styleBackups: { node: HTMLElement; originalDisabled: boolean }[] = [];
  const tempStyleEl = document.createElement('style');
  tempStyleEl.id = 'temp-pdf-sanitized-styles';
  let combinedCssText = '';

  const originalGetComputedStyle = window.getComputedStyle;

  try {
    // 1. Process style tags textContent directly
    const styleElements = document.querySelectorAll('style');
    styleElements.forEach((styleEl) => {
      if (styleEl.textContent && 
          (styleEl.textContent.includes('oklch') || styleEl.textContent.includes('oklab')) && 
          styleEl.id !== 'temp-pdf-sanitized-styles') {
        stylesBackup.push({ element: styleEl as HTMLStyleElement, text: styleEl.textContent });
        styleEl.textContent = replaceOklchAll(styleEl.textContent);
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
            const sanitized = replaceOklchAll(sheetCssText);
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

    // 3. Override window.getComputedStyle to intercept oklch/oklab dynamically
    window.getComputedStyle = function (el, pseudoElt) {
      const originalStyle = originalGetComputedStyle.call(this, el, pseudoElt);
      
      return new Proxy(originalStyle, {
        get(target, prop) {
          if (prop === 'getPropertyValue') {
            return function (propertyName: string) {
              const originalVal = target.getPropertyValue(propertyName);
              if (typeof originalVal === 'string' && (originalVal.toLowerCase().includes('oklch') || originalVal.toLowerCase().includes('oklab'))) {
                return replaceOklchAll(originalVal);
              }
              return originalVal;
            };
          }
          
          const val = (target as any)[prop];
          
          if (typeof val === 'function') {
            return val.bind(target);
          }
          
          if (typeof val === 'string') {
            if (val.toLowerCase().includes('oklch') || val.toLowerCase().includes('oklab')) {
              return replaceOklchAll(val);
            }
          }
          
          return val;
        }
      });
    };
  } catch (e) {
    console.warn("Failed to sanitize oklch/oklab styles:", e);
  }

  return () => {
    // Restore original window.getComputedStyle
    window.getComputedStyle = originalGetComputedStyle;

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

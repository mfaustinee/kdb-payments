import jsPDF from 'jspdf';

interface AgreementPdfData {
  debtorName: string;
  debtorEmail?: string;
  debtorPhone?: string;
  debtorAddress?: string;
  debtAmount: number;
  totalWithInterest: number;
  interestRate: number;
  numInstallments: number;
  installmentAmount: number;
  paymentFrequency: string;
  startDate: string;
  terms?: string;
  signatureDataUrl?: string;
  agreementId: string;
  createdAt: string;
}

export function generateAgreementPdf(data: AgreementPdfData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('DEBT REPAYMENT AGREEMENT', pageWidth / 2, y, { align: 'center' });
  y += 12;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text(`Agreement ID: ${data.agreementId}`, pageWidth / 2, y, { align: 'center' });
  doc.text(`Date: ${new Date(data.createdAt).toLocaleDateString()}`, pageWidth / 2, y + 5, { align: 'center' });
  doc.setTextColor(0);
  y += 16;

  // Divider
  doc.setDrawColor(200);
  doc.line(20, y, pageWidth - 20, y);
  y += 10;

  // Debtor info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DEBTOR INFORMATION', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const debtorFields = [
    ['Name', data.debtorName],
    ['Email', data.debtorEmail || 'N/A'],
    ['Phone', data.debtorPhone || 'N/A'],
    ['Address', data.debtorAddress || 'N/A'],
  ];
  debtorFields.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 25, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 65, y);
    y += 6;
  });
  y += 6;

  // Financial details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('FINANCIAL TERMS', 20, y);
  y += 8;

  doc.setFontSize(10);
  const financialFields = [
    ['Original Debt', `$${data.debtAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
    ['Interest Rate', `${data.interestRate}%`],
    ['Total Amount Due', `$${data.totalWithInterest.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
    ['Number of Installments', `${data.numInstallments}`],
    ['Installment Amount', `$${data.installmentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
    ['Payment Frequency', data.paymentFrequency.charAt(0).toUpperCase() + data.paymentFrequency.slice(1)],
    ['Start Date', new Date(data.startDate).toLocaleDateString()],
  ];
  financialFields.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 25, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 85, y);
    y += 6;
  });
  y += 6;

  // Terms
  if (data.terms) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ADDITIONAL TERMS', 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(data.terms, pageWidth - 50);
    doc.text(lines, 25, y);
    y += lines.length * 5 + 6;
  }

  // Agreement text
  y += 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  const agreementText = `By signing below, the debtor agrees to repay the total amount of $${data.totalWithInterest.toLocaleString('en-US', { minimumFractionDigits: 2 })} in ${data.numInstallments} ${data.paymentFrequency} installments of $${data.installmentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} each, beginning on ${new Date(data.startDate).toLocaleDateString()}.`;
  const agreementLines = doc.splitTextToSize(agreementText, pageWidth - 50);
  doc.text(agreementLines, 25, y);
  y += agreementLines.length * 5 + 10;

  // Signature
  if (data.signatureDataUrl) {
    if (y > 230) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DEBTOR SIGNATURE', 20, y);
    y += 5;
    try {
      doc.addImage(data.signatureDataUrl, 'PNG', 25, y, 70, 35);
      y += 40;
    } catch {
      doc.text('[Signature on file]', 25, y + 10);
      y += 15;
    }
    doc.line(25, y, 120, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(data.debtorName, 25, y);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 90, y);
  }

  return doc;
}


import { AgreementData, KDB_ADMIN_EMAIL } from '../types.ts';
import { jsPDF } from 'jspdf';

const getEnv = (key: string, fallback: string) => {
  return import.meta.env[key] || fallback;
};

const generateAgreementPDF = (agreement: AgreementData): string | null => {
  try {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("KDB PAYMENT AGREEMENT", 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`DBO Name: ${agreement.dboName || 'N/A'}`, 20, 40);
    doc.text(`Permit No: ${agreement.permitNo || 'N/A'}`, 20, 50);
    doc.text(`County: ${agreement.county || 'N/A'}`, 20, 60);
    doc.text(`Total Arrears: KES ${(agreement.totalArrears || 0).toLocaleString()}`, 20, 70);
    
    doc.text("Payment Schedule:", 20, 90);
    let y = 100;
    if (agreement.installments && Array.isArray(agreement.installments)) {
      agreement.installments.forEach((inst) => {
        doc.text(`${inst.no}. ${inst.period} - Due: ${inst.dueDate || 'TBD'} - Amount: KES ${(inst.amount || 0).toLocaleString()}`, 25, y);
        y += 10;
      });
    }
    
    doc.text("Execution Details:", 20, y + 10);
    doc.text(`Signatory: ${agreement.clientName || 'N/A'} (${agreement.clientTitle || 'N/A'})`, 20, y + 20);
    doc.text(`Date: ${agreement.date ? new Date(agreement.date).toLocaleDateString() : 'N/A'}`, 20, y + 30);
    
    if (agreement.officialName) {
      doc.text(`Approved By: ${agreement.officialName}`, 20, y + 40);
      doc.text(`Approval Date: ${agreement.approvedAt ? new Date(agreement.approvedAt).toLocaleDateString() : 'N/A'}`, 20, y + 50);
    }

    const output = doc.output('datauristring');
    return output.includes(',') ? output.split(',')[1] : null;
  } catch (e) {
    console.error("PDF Generation Error:", e);
    return null;
  }
};

export const EmailService = {
  config: {
    SERVICE_ID: getEnv('VITE_EMAILJS_SERVICE_ID', 'service_llhl7pf'), 
    TEMPLATE_ADMIN: getEnv('VITE_EMAILJS_TEMPLATE_ADMIN', 'template_submission_aler'),
    TEMPLATE_CLIENT: getEnv('VITE_EMAILJS_TEMPLATE_CLIENT', 'template_approval_notice'),
    PUBLIC_KEY: getEnv('VITE_EMAILJS_PUBLIC_KEY', ''),
    ACCESS_TOKEN: getEnv('VITE_EMAILJS_ACCESS_TOKEN', '') 
  },

  async sendAdminNotification(agreement: AgreementData) {
    try {
      if (!this.config.PUBLIC_KEY) {
        console.warn("[EmailJS] Public Key missing. Email skipped.");
        return false;
      }

      const pdfBase64 = generateAgreementPDF(agreement);

      const templateParams = {
        to_email: KDB_ADMIN_EMAIL,
        to_name: "Faustine Kigunda",
        from_name: agreement.dboName,
        dbo_name: agreement.dboName,
        permit_no: agreement.permitNo,
        total_arrears: (agreement.totalArrears || 0).toLocaleString(),
        county: agreement.county,
        admin_email: KDB_ADMIN_EMAIL,
        portal_link: window.location.origin,
        submission_type: agreement.status === 'resubmission_requested' ? 'RE-SUBMISSION REQUEST' : 'NEW AGREEMENT SUBMISSION',
        reason: agreement.resubmissionReason || 'N/A',
        content: pdfBase64 || '' // Attachment parameter
      };

      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              service_id: this.config.SERVICE_ID,
              template_id: this.config.TEMPLATE_ADMIN,
              user_id: this.config.PUBLIC_KEY,
              accessToken: this.config.ACCESS_TOKEN,
              template_params: templateParams
          })
      });
      
      return response.ok;
    } catch (e) {
        console.error("Admin Alert Error:", e);
        return false;
    }
  },

  async sendClientApproval(agreement: AgreementData) {
    if (!this.config.PUBLIC_KEY) return false;

    const pdfBase64 = generateAgreementPDF(agreement);

    const templateParams = {
      to_email: agreement.clientEmail,
      dbo_name: agreement.dboName,
      execution_date: new Date().toLocaleDateString(),
      official_name: agreement.officialName || "Kenya Dairy Board",
      total_arrears: agreement.totalArrears.toLocaleString(),
      agreement_link: `${window.location.origin}/?id=${agreement.id}`,
      status_message: "Your agreement has been approved and signed by KDB.",
      content: pdfBase64 // Attachment parameter
    };

    try {
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service_id: this.config.SERVICE_ID,
                template_id: this.config.TEMPLATE_CLIENT,
                user_id: this.config.PUBLIC_KEY,
                accessToken: this.config.ACCESS_TOKEN,
                template_params: templateParams
            })
        });
        
        return response.ok;
    } catch (e) {
        console.error("Client Notice Network Error:", e);
        return false;
    }
  },

  async sendClientRejection(agreement: AgreementData) {
    if (!this.config.PUBLIC_KEY) return false;

    const pdfBase64 = generateAgreementPDF(agreement);

    const templateParams = {
      to_email: agreement.clientEmail,
      dbo_name: agreement.dboName,
      execution_date: new Date().toLocaleDateString(),
      official_name: "Kenya Dairy Board",
      total_arrears: agreement.totalArrears.toLocaleString(),
      status_message: agreement.rejectionReason || "Your submission has been reviewed and requires changes.",
      agreement_link: `${window.location.origin}`,
      content: pdfBase64 // Attachment parameter
    };

    try {
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service_id: this.config.SERVICE_ID,
                template_id: this.config.TEMPLATE_CLIENT,
                user_id: this.config.PUBLIC_KEY,
                accessToken: this.config.ACCESS_TOKEN,
                template_params: templateParams
            })
        });
        
        return response.ok;
    } catch (e) {
        console.error("Client Rejection Network Error:", e);
        return false;
    }
  }
};

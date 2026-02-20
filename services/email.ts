
import { AgreementData, KDB_ADMIN_EMAIL } from '../types.ts';

const getEnv = (key: string, fallback: string) => {
  return import.meta.env[key] || fallback;
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
    if (!this.config.PUBLIC_KEY) {
      console.warn("[EmailJS] Public Key missing. Email skipped.");
      return false;
    }

    const templateParams = {
      to_name: "Faustine Kigunda",
      from_name: agreement.dboName,
      dbo_name: agreement.dboName,
      permit_no: agreement.permitNo,
      total_arrears: agreement.totalArrears.toLocaleString(),
      county: agreement.county,
      admin_email: KDB_ADMIN_EMAIL,
      portal_link: window.location.origin,
      submission_type: agreement.status === 'resubmission_requested' ? 'RE-SUBMISSION REQUEST' : 'NEW AGREEMENT SUBMISSION',
      reason: agreement.resubmissionReason || 'N/A'
    };

    try {
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
        console.error("Admin Alert Network Error:", e);
        return false;
    }
  },

  async sendClientApproval(agreement: AgreementData) {
    if (!this.config.PUBLIC_KEY) return false;

    const templateParams = {
      to_email: agreement.clientEmail,
      dbo_name: agreement.dboName,
      execution_date: new Date().toLocaleDateString(),
      official_name: agreement.officialName || "Kenya Dairy Board",
      total_arrears: agreement.totalArrears.toLocaleString(),
      agreement_link: `${window.location.origin}/?id=${agreement.id}`,
      status_message: "Your agreement has been approved and signed by KDB."
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

    const templateParams = {
      to_email: agreement.clientEmail,
      dbo_name: agreement.dboName,
      execution_date: new Date().toLocaleDateString(),
      official_name: "Kenya Dairy Board",
      total_arrears: agreement.totalArrears.toLocaleString(),
      status_message: agreement.rejectionReason || "Your submission has been reviewed and requires changes.",
      agreement_link: `${window.location.origin}`
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

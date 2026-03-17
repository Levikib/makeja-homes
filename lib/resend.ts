import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY not configured - emails disabled');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration with custom domain
export const EMAIL_CONFIG = {
  from: 'Makeja Homes <noreply@makejahomes.co.ke>',
  replyTo: 'support@makejahomes.co.ke',
};

import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not defined in environment variables');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration with custom domain
export const EMAIL_CONFIG = {
  from: 'Makeja Homes <noreply@makejahomes.co.ke>',
  replyTo: 'support@makejahomes.co.ke',
};

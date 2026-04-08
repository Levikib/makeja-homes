import { resend, EMAIL_CONFIG } from "@/lib/resend";

const TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Security Deposit",
  RENT: "Rent Payment",
  ADVANCE_RENT: "Advance Rent Payment",
  ADVANCE: "Advance Rent Payment",
  WATER: "Water Bill",
  GARBAGE: "Garbage Bill",
  OTHER: "Other Payment",
};

export async function sendPaymentConfirmation(params: {
  email: string;
  firstName: string;
  amount: number;
  reference: string;
  propertyName: string;
  unitNumber: string;
  type: string;
}) {
  const { email, firstName, amount, reference, propertyName, unitNumber, type } = params;
  const typeLabel = TYPE_LABELS[type?.toUpperCase()] || "Payment";
  const formattedAmount = amount.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formattedDate = new Date().toLocaleDateString("en-KE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:20px">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#10b981,#059669);border-radius:12px 12px 0 0;padding:32px;text-align:center">
      <div style="width:60px;height:60px;background:rgba(255,255,255,0.2);border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center">
        <span style="font-size:28px">&#10003;</span>
      </div>
      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700">Payment Confirmed</h1>
      <p style="color:#d1fae5;margin:8px 0 0;font-size:14px">Makeja Homes</p>
    </div>
    <!-- Body -->
    <div style="background:#ffffff;padding:32px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
      <h2 style="color:#1f2937;font-size:20px;margin:0 0 8px">Hi ${firstName},</h2>
      <p style="color:#4b5563;margin:0 0 24px;font-size:15px">Your <strong>${typeLabel}</strong> has been successfully received and processed.</p>

      <!-- Amount highlight -->
      <div style="background:#ecfdf5;border:2px solid #10b981;border-radius:10px;padding:20px;text-align:center;margin:0 0 24px">
        <p style="margin:0;color:#065f46;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-weight:600">Amount Paid</p>
        <p style="margin:8px 0 0;color:#059669;font-size:36px;font-weight:700">KSH ${formattedAmount}</p>
      </div>

      <!-- Details table -->
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:14px">Payment Type</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#1f2937;font-size:14px;font-weight:600;text-align:right">${typeLabel}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:14px">Reference</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#1f2937;font-size:14px;font-weight:600;text-align:right;font-family:monospace">${reference}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:14px">Property</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#1f2937;font-size:14px;font-weight:600;text-align:right">${propertyName}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:14px">Unit</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#1f2937;font-size:14px;font-weight:600;text-align:right">${unitNumber}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#6b7280;font-size:14px">Date</td>
          <td style="padding:10px 0;color:#1f2937;font-size:14px;font-weight:600;text-align:right">${formattedDate}</td>
        </tr>
      </table>

      <p style="color:#6b7280;font-size:13px;margin:24px 0 0;padding:16px;background:#f9fafb;border-radius:8px">
        Please keep this email as your payment receipt. If you have any questions, contact us at
        <a href="mailto:support@makejahomes.co.ke" style="color:#059669">support@makejahomes.co.ke</a>.
      </p>
    </div>
    <!-- Footer -->
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin:16px 0 0">
      &copy; ${new Date().getFullYear()} Makeja Homes. All rights reserved.
    </p>
  </div>
</body>
</html>`;

  await resend.emails.send({
    from: EMAIL_CONFIG.from,
    to: email,
    replyTo: EMAIL_CONFIG.replyTo,
    subject: `Payment Confirmed - KSH ${formattedAmount} | ${typeLabel}`,
    html,
  });
}

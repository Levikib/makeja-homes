/**
 * Email service for sending payment reminders and notifications
 * Configure with your email provider (SendGrid, Mailgun, etc.)
 */

interface EmailData {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(data: EmailData) {
  // TODO: Implement with actual email provider
  // For now, just log
  console.log("📧 Email would be sent:", {
    to: data.to,
    subject: data.subject
  });
  
  // Example with fetch (replace with your provider):
  /*
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: data.to }] }],
      from: { email: data.from || "noreply@makejahomes.com" },
      subject: data.subject,
      content: [{ type: "text/html", value: data.html }]
    })
  });
  */
}

export async function sendPaymentReminder(
  tenantEmail: string,
  tenantName: string,
  billAmount: number,
  dueDate: Date,
  unitNumber: string
) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #7c3aed;">Payment Reminder</h2>
      <p>Dear ${tenantName},</p>
      <p>This is a friendly reminder that your rent payment is due.</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Unit:</strong> ${unitNumber}</p>
        <p style="margin: 5px 0;"><strong>Amount Due:</strong> KES ${billAmount.toLocaleString()}</p>
        <p style="margin: 5px 0;"><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
      </div>
      <p>Please make your payment at your earliest convenience.</p>
      <p>Thank you for your prompt attention to this matter.</p>
      <p>Best regards,<br>Makeja Homes Management</p>
    </div>
  `;
  
  return sendEmail({
    to: tenantEmail,
    subject: "Payment Reminder - Makeja Homes",
    html
  });
}

export async function sendBulkPaymentReminders(bills: Array<{
  tenantEmail: string;
  tenantName: string;
  amount: number;
  dueDate: Date;
  unitNumber: string;
}>) {
  const results = await Promise.allSettled(
    bills.map(bill => 
      sendPaymentReminder(
        bill.tenantEmail,
        bill.tenantName,
        bill.amount,
        bill.dueDate,
        bill.unitNumber
      )
    )
  );
  
  const sent = results.filter(r => r.status === "fulfilled").length;
  const failed = results.filter(r => r.status === "rejected").length;
  
  return { sent, failed, total: bills.length };
}

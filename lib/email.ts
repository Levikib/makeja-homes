import nodemailer from "nodemailer";

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Send password reset email
export async function sendPasswordResetEmail(
  email: string,
  resetLink: string,
  userName: string
) {
  const mailOptions = {
    from: `"Makeja Homes" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Reset Your Password - Makeja Homes",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .header h1 {
            color: white;
            margin: 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            margin: 20px 0;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 12px;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏠 Makeja Homes</h1>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hi ${userName},</p>
            <p>We received a request to reset your password for your Makeja Homes account.</p>
            <p>Click the button below to reset your password:</p>
            
            <center>
              <a href="${resetLink}" class="button">Reset Password</a>
            </center>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #8b5cf6;">${resetLink}</p>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul>
                <li>This link will expire in 1 hour</li>
                <li>If you didn't request this, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
            
            <p>If you're having trouble, contact our support team at makejahomes@gmail.com</p>
            
            <p>Best regards,<br>The Makeja Homes Team</p>
          </div>
          <div class="footer">
            <p>© 2024 Makeja Homes. Property Management, Perfected.</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Password reset email sent to:", email);
    return true;
  } catch (error) {
    console.error("❌ Failed to send password reset email:", error);
    throw error;
  }
}

// Send contact form notification email
export async function sendContactFormNotification(
  customerName: string,
  customerEmail: string,
  customerPhone: string | null,
  customerMessage: string
) {
  const mailOptions = {
    from: `"Makeja Homes Contact Form" <${process.env.SMTP_USER}>`,
    to: process.env.SMTP_USER, // Send to your own email
    subject: `🔔 New Contact Form Submission from ${customerName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .header h1 {
            color: white;
            margin: 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .info-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #8b5cf6;
            margin: 20px 0;
          }
          .info-row {
            margin: 10px 0;
          }
          .label {
            font-weight: bold;
            color: #8b5cf6;
          }
          .message-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #ddd;
            margin: 20px 0;
            white-space: pre-wrap;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 New Contact Form Submission</h1>
          </div>
          <div class="content">
            <p>You have received a new message from your Makeja Homes website contact form.</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #8b5cf6;">Customer Information:</h3>
              <div class="info-row">
                <span class="label">Name:</span> ${customerName}
              </div>
              <div class="info-row">
                <span class="label">Email:</span> <a href="mailto:${customerEmail}">${customerEmail}</a>
              </div>
              ${customerPhone ? `
              <div class="info-row">
                <span class="label">Phone:</span> <a href="tel:${customerPhone}">${customerPhone}</a>
              </div>
              ` : ''}
            </div>
            
            <h3 style="color: #8b5cf6;">Message:</h3>
            <div class="message-box">
              ${customerMessage}
            </div>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <strong>⚡ Quick Actions:</strong>
              <ul style="margin: 10px 0;">
                <li>Reply directly to: <a href="mailto:${customerEmail}">${customerEmail}</a></li>
                ${customerPhone ? `<li>Call: <a href="tel:${customerPhone}">${customerPhone}</a></li>` : ''}
                <li>WhatsApp: <a href="https://wa.me/254796809106">+254 796 809 106</a></li>
              </ul>
            </div>
            
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              <strong>Note:</strong> This message has been saved to your database and marked as "NEW". 
              You can view all contact messages in your admin dashboard.
            </p>
          </div>
          <div class="footer">
            <p>© 2024 Makeja Homes - Contact Form Notification</p>
            <p>This is an automated notification from your website.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Contact form notification email sent to:", process.env.SMTP_USER);
    return true;
  } catch (error) {
    console.error("❌ Failed to send contact form notification:", error);
    throw error;
  }
}

// Send auto-reply to customer
export async function sendContactFormAutoReply(
  customerName: string,
  customerEmail: string
) {
  const mailOptions = {
    from: `"Makeja Homes" <${process.env.SMTP_USER}>`,
    to: customerEmail,
    subject: "✅ We received your message - Makeja Homes",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .header h1 {
            color: white;
            margin: 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            margin: 20px 0;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Message Received!</h1>
          </div>
          <div class="content">
            <h2>Thank You, ${customerName}!</h2>
            <p>We've received your message and our team will get back to you within 24 hours.</p>
            
            <p>In the meantime, you can:</p>
            <ul>
              <li>📱 Message us on WhatsApp: <a href="https://wa.me/254796809106">+254 796 809 106</a></li>
              <li>📧 Email us directly: <a href="mailto:makejahomes@gmail.com">makejahomes@gmail.com</a></li>
              <li>💬 Use our AI chatbot on the website for instant answers</li>
            </ul>
            
            <center>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}" class="button">Visit Our Website</a>
            </center>
            
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
              <strong>Need urgent assistance?</strong><br>
              WhatsApp us at +254 796 809 106 for immediate support.
            </p>
            
            <p>Best regards,<br>The Makeja Homes Team</p>
          </div>
          <div class="footer">
            <p>© 2024 Makeja Homes. Property Management, Perfected.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Auto-reply email sent to:", customerEmail);
    return true;
  } catch (error) {
    console.error("❌ Failed to send auto-reply email:", error);
    throw error;
  }
}
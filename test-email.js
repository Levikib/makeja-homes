const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

console.log('Testing email configuration...');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? '***SET***' : '***NOT SET***');

transporter.verify((error, success) => {
  if (error) {
    console.log('\n❌ Email Connection Failed:');
    console.log(error);
  } else {
    console.log('\n✅ Email server is ready!');
    
    // Try sending a test email
    transporter.sendMail({
      from: process.env.SMTP_USER,
      to: 'mochuangela21@gmail.com',
      subject: '✅ Makeja Homes Email Test',
      text: 'This is a test email from Makeja Homes. If you receive this, email configuration is working!',
      html: '<h1>✅ Success!</h1><p>Email configuration is working properly.</p>'
    }, (err, info) => {
      if (err) {
        console.log('\n❌ Failed to send test email:');
        console.log(err);
      } else {
        console.log('\n✅ Test email sent successfully!');
        console.log('Message ID:', info.messageId);
      }
    });
  }
});
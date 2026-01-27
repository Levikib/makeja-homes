const { Resend } = require('resend');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const apiKeyMatch = envContent.match(/RESEND_API_KEY="(.+)"/);
const apiKey = apiKeyMatch ? apiKeyMatch[1] : null;

if (!apiKey) {
  console.error('No RESEND_API_KEY found in .env');
  process.exit(1);
}

console.log('API Key:', apiKey.substring(0, 10) + '...');

const resend = new Resend(apiKey);

async function testEmail() {
 try {
  console.log('Sending test email...');

  const result = await resend.emails.send({
    from: 'Makeja Homes <onboarding@resend.dev>',
    to: 'kibirielevis@gmail.com',
    subject: 'Test Email from Makeja Homes',
    html: '<h1>Test Email</h1><p> If you receive this email, Resend is working!</p>'
  });

  console.log('Email sent successfully!');
  console.log('Result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('Error:', error.message);
  console.error('Full error:', error);
 }
}
testEmail();

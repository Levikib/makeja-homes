import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendWelcomeEmail({ to, name, companyName, slug, dashboardUrl, trialEndsAt }: {
  to: string, name: string, companyName: string,
  slug: string, dashboardUrl: string, trialEndsAt: Date
}) {
  try {
    await resend.emails.send({
      from: 'Makeja Homes <noreply@makejahomes.co.ke>',
      to,
      subject: `Welcome to Makeja Homes — ${companyName} is ready!`,
      html: `
        <h1>Welcome, ${name}!</h1>
        <p>Your Makeja Homes account for <strong>${companyName}</strong> is ready.</p>
        <p><a href="${dashboardUrl}">Go to your dashboard →</a></p>
        <p>Your 14-day free trial ends on ${trialEndsAt.toLocaleDateString()}.</p>
        <p>— The Makeja Homes Team</p>
      `
    })
  } catch (err) {
    console.error('[WELCOME EMAIL] Failed:', err)
  }
}

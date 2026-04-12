/**
 * WhatsApp Business API integration via Twilio
 *
 * Handles:
 * - Rent payment reminders
 * - Payment confirmation receipts
 * - Lease expiry notices
 * - Maintenance status updates
 * - Custom broadcasts to all/selected tenants
 */

export interface WhatsAppConfig {
  accountSid: string
  authToken: string
  fromNumber: string  // e.g. "whatsapp:+14155238886"
  enabled: boolean
}

export interface WhatsAppMessage {
  to: string           // tenant phone e.g. "+254712345678"
  body: string
  mediaUrl?: string    // optional image/PDF attachment
}

export interface WhatsAppResult {
  success: boolean
  sid?: string
  error?: string
}

function formatPhone(raw: string): string {
  // Normalize Kenyan numbers to E.164
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0') && digits.length === 10) return `+254${digits.slice(1)}`
  if (digits.startsWith('254') && digits.length === 12) return `+${digits}`
  if (digits.startsWith('7') && digits.length === 9) return `+254${digits}`
  return raw.startsWith('+') ? raw : `+${digits}`
}

export async function sendWhatsApp(config: WhatsAppConfig, message: WhatsAppMessage): Promise<WhatsAppResult> {
  if (!config.enabled) return { success: false, error: 'WhatsApp integration is disabled' }
  if (!config.accountSid || !config.authToken || !config.fromNumber) {
    return { success: false, error: 'WhatsApp not configured' }
  }

  const to = `whatsapp:${formatPhone(message.to)}`
  const from = config.fromNumber.startsWith('whatsapp:') ? config.fromNumber : `whatsapp:${config.fromNumber}`

  const body: Record<string, string> = {
    From: from,
    To: to,
    Body: message.body,
  }
  if (message.mediaUrl) body.MediaUrl = message.mediaUrl

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body).toString(),
    }
  )

  const data = await res.json()
  if (!res.ok) {
    return { success: false, error: data.message ?? `HTTP ${res.status}` }
  }
  return { success: true, sid: data.sid }
}

export async function sendBulkWhatsApp(
  config: WhatsAppConfig,
  messages: WhatsAppMessage[]
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = await Promise.allSettled(messages.map(m => sendWhatsApp(config, m)))
  let sent = 0, failed = 0
  const errors: string[] = []
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.success) {
      sent++
    } else {
      failed++
      const err = r.status === 'rejected' ? r.reason?.message : r.value.error
      if (err) errors.push(err)
    }
  }
  return { sent, failed, errors }
}

// ── Message templates ────────────────────────────────────────────────────────

export function paymentReminderMessage(params: {
  tenantName: string
  unitNumber: string
  propertyName: string
  amountDue: number
  dueDate: string
  paymentLink?: string
}): string {
  return `Hi ${params.tenantName} 👋

This is a reminder that your rent is due.

🏠 *${params.propertyName} — Unit ${params.unitNumber}*
💰 Amount: *KES ${params.amountDue.toLocaleString()}*
📅 Due: *${params.dueDate}*
${params.paymentLink ? `\n🔗 Pay online: ${params.paymentLink}` : ''}

Please ensure payment is made on time to avoid late fees.

_Makeja Homes_`
}

export function paymentConfirmationMessage(params: {
  tenantName: string
  unitNumber: string
  propertyName: string
  amount: number
  referenceNumber: string
  paymentDate: string
}): string {
  return `Hi ${params.tenantName} ✅

Your payment has been received — thank you!

🏠 *${params.propertyName} — Unit ${params.unitNumber}*
💰 Amount paid: *KES ${params.amount.toLocaleString()}*
🔖 Reference: *${params.referenceNumber}*
📅 Date: *${params.paymentDate}*

Your receipt has been recorded. Have a great day!

_Makeja Homes_`
}

export function leaseExpiryMessage(params: {
  tenantName: string
  unitNumber: string
  propertyName: string
  expiryDate: string
  daysLeft: number
}): string {
  const urgency = params.daysLeft <= 14 ? '⚠️' : params.daysLeft <= 30 ? '📢' : '📋'
  return `Hi ${params.tenantName} ${urgency}

Your lease is expiring soon.

🏠 *${params.propertyName} — Unit ${params.unitNumber}*
📅 Expiry date: *${params.expiryDate}*
⏳ Days remaining: *${params.daysLeft} days*

Please contact your property manager to discuss renewal.

_Makeja Homes_`
}

export function maintenanceUpdateMessage(params: {
  tenantName: string
  issueTitle: string
  status: string
  notes?: string
}): string {
  const statusEmoji: Record<string, string> = {
    ASSIGNED: '🔧',
    IN_PROGRESS: '⚙️',
    COMPLETED: '✅',
    REJECTED: '❌',
  }
  const emoji = statusEmoji[params.status] ?? '📋'
  const label = params.status === 'IN_PROGRESS' ? 'In Progress'
    : params.status.charAt(0) + params.status.slice(1).toLowerCase()

  return `Hi ${params.tenantName} ${emoji}

Update on your maintenance request:

🔩 *${params.issueTitle}*
📌 Status: *${label}*${params.notes ? `\n📝 Note: ${params.notes}` : ''}

_Makeja Homes_`
}

export function overdueRentMessage(params: {
  tenantName: string
  unitNumber: string
  propertyName: string
  amountDue: number
  daysOverdue: number
}): string {
  return `Hi ${params.tenantName} ⚠️

Your rent payment is *overdue*.

🏠 *${params.propertyName} — Unit ${params.unitNumber}*
💰 Amount overdue: *KES ${params.amountDue.toLocaleString()}*
📅 Days overdue: *${params.daysOverdue} days*

Please make payment immediately or contact your property manager.

_Makeja Homes_`
}

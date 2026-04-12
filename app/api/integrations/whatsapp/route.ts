/**
 * POST /api/integrations/whatsapp
 * Send WhatsApp messages manually or in bulk.
 *
 * Body:
 *   { type: 'test', phone: '+254...' }
 *   { type: 'reminder', tenantIds: string[] }     — rent reminders
 *   { type: 'overdue', tenantIds?: string[] }      — overdue notices (all overdue if no ids)
 *   { type: 'custom', recipients: {phone,name}[], message: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromRequest } from '@/lib/auth-helpers'
import { getIntegration } from '@/lib/integrations'
import {
  sendWhatsApp,
  sendBulkWhatsApp,
  paymentReminderMessage,
  overdueRentMessage,
  type WhatsAppConfig,
} from '@/lib/integrations/whatsapp'
import { getPrismaForRequest, resolveSchema } from '@/lib/get-prisma'

export const dynamic = 'force-dynamic'

/**
 * Resolve WhatsApp config — platform env vars take priority.
 * This means you configure Twilio ONCE in Vercel and it works
 * for all clients automatically. Per-tenant override is a fallback.
 */
function getWhatsAppConfig(tenantConfig: any): WhatsAppConfig | null {
  // Platform-level credentials (set once in Vercel env — works for ALL clients)
  const platformSid = process.env.TWILIO_ACCOUNT_SID
  const platformToken = process.env.TWILIO_AUTH_TOKEN
  const platformFrom = process.env.TWILIO_WHATSAPP_FROM

  if (platformSid && platformToken && platformFrom) {
    return {
      accountSid: platformSid,
      authToken: platformToken,
      fromNumber: platformFrom,
      enabled: true,
    }
  }

  // Fallback: per-tenant credentials stored in DB
  if (tenantConfig?.settings?.accountSid) {
    return { ...tenantConfig.settings, enabled: tenantConfig.enabled }
  }

  return null
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const slug = resolveSchema(req).replace('tenant_', '')
  const tenantConfig = await getIntegration(slug, 'whatsapp')
  const wa = getWhatsAppConfig(tenantConfig)

  if (!wa) {
    return NextResponse.json({ error: 'WhatsApp is not configured. Ask your platform admin to set up Twilio credentials.' }, { status: 400 })
  }

  const body = await req.json()
  const { type } = body

  // ── Test message
  if (type === 'test') {
    const { phone } = body
    if (!phone) return NextResponse.json({ error: 'phone is required' }, { status: 400 })
    const result = await sendWhatsApp(wa, {
      to: phone,
      body: `✅ Test message from Makeja Homes!\n\nYour WhatsApp integration is working correctly.\n\n_Makeja Homes_`,
    })
    return NextResponse.json(result)
  }

  // ── Rent reminders
  if (type === 'reminder') {
    const { tenantIds } = body
    const db = getPrismaForRequest(req)

    const whereClause = tenantIds?.length
      ? `WHERE t.id = ANY(ARRAY[${tenantIds.map((_: any, i: number) => `$${i + 1}`).join(',')}]::text[])`
      : ''

    const tenants = await db.$queryRawUnsafe<any[]>(`
      SELECT
        t.id, t."rentAmount",
        u.name, u.phone, u.email,
        un.number as "unitNumber",
        p.name as "propertyName"
      FROM tenants t
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      ${whereClause}
      ORDER BY u.name
    `, ...(tenantIds ?? []))

    const messages = tenants
      .filter((t: any) => t.phone)
      .map((t: any) => ({
        to: t.phone,
        body: paymentReminderMessage({
          tenantName: t.name,
          unitNumber: t.unitNumber,
          propertyName: t.propertyName,
          amountDue: t.rentAmount,
          dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            .toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }),
        }),
      }))

    const result = await sendBulkWhatsApp(wa, messages)
    return NextResponse.json({ ...result, total: messages.length, noPhone: tenants.length - messages.length })
  }

  // ── Overdue notices
  if (type === 'overdue') {
    const db = getPrismaForRequest(req)
    const today = new Date().toISOString()

    const overdue = await db.$queryRawUnsafe<any[]>(`
      SELECT
        t.id, t."rentAmount",
        u.name, u.phone,
        un.number as "unitNumber",
        p.name as "propertyName",
        mb.id as "billId",
        mb.amount as "billAmount",
        mb."dueDate",
        EXTRACT(DAY FROM NOW() - mb."dueDate")::int as "daysOverdue"
      FROM monthly_bills mb
      JOIN tenants t ON t.id = mb."tenantId"
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE mb.status = 'OVERDUE'
        AND u.phone IS NOT NULL
      ORDER BY mb."dueDate" ASC
    `)

    const messages = overdue.map((t: any) => ({
      to: t.phone,
      body: overdueRentMessage({
        tenantName: t.name,
        unitNumber: t.unitNumber,
        propertyName: t.propertyName,
        amountDue: t.billAmount,
        daysOverdue: t.daysOverdue ?? 1,
      }),
    }))

    const result = await sendBulkWhatsApp(wa, messages)
    return NextResponse.json({ ...result, total: messages.length })
  }

  // ── Custom broadcast
  if (type === 'custom') {
    const { recipients, message } = body
    if (!message?.trim()) return NextResponse.json({ error: 'message is required' }, { status: 400 })
    if (!Array.isArray(recipients) || !recipients.length) {
      return NextResponse.json({ error: 'recipients array is required' }, { status: 400 })
    }

    const messages = recipients
      .filter((r: any) => r.phone)
      .map((r: any) => ({ to: r.phone, body: message }))

    const result = await sendBulkWhatsApp(wa, messages)
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Unknown message type' }, { status: 400 })
}

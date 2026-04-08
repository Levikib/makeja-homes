import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getPrismaForRequest } from '@/lib/get-prisma'

export const dynamic = 'force-dynamic'

async function getLiveDashboardContext(db: any): Promise<string> {
  try {
    const [props, tenants, bills, payments, maintenance, deposits] = await Promise.all([
      db.$queryRawUnsafe<any[]>(`SELECT COUNT(*) as total FROM properties`).catch(() => [{ total: 0 }]),
      db.$queryRawUnsafe<any[]>(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status::text='ACTIVE') as active FROM tenants`).catch(() => [{ total: 0, active: 0 }]),
      db.$queryRawUnsafe<any[]>(`SELECT COUNT(*) FILTER (WHERE status::text IN ('PENDING','UNPAID','OVERDUE')) as unpaid, COALESCE(SUM("totalAmount") FILTER (WHERE status::text IN ('PENDING','UNPAID','OVERDUE')),0) as unpaid_amount FROM monthly_bills`).catch(() => [{ unpaid: 0, unpaid_amount: 0 }]),
      db.$queryRawUnsafe<any[]>(`SELECT COALESCE(SUM(amount),0) as this_month FROM payments WHERE status::text IN ('COMPLETED','VERIFIED') AND "createdAt" >= date_trunc('month', NOW())`).catch(() => [{ this_month: 0 }]),
      db.$queryRawUnsafe<any[]>(`SELECT COUNT(*) FILTER (WHERE status::text='OPEN') as open_count FROM maintenance_requests`).catch(() => [{ open_count: 0 }]),
      db.$queryRawUnsafe<any[]>(`SELECT COUNT(*) FILTER (WHERE status::text NOT IN ('REFUNDED')) as held, COALESCE(SUM(amount) FILTER (WHERE status::text='HELD'),0) as held_amount FROM security_deposits`).catch(() => [{ held: 0, held_amount: 0 }]),
    ])

    return `LIVE SYSTEM DATA (right now):
- Properties: ${props[0]?.total ?? 0}
- Tenants: ${tenants[0]?.total ?? 0} total (${tenants[0]?.active ?? 0} active)
- Unpaid bills: ${bills[0]?.unpaid ?? 0} bills totalling KES ${Number(bills[0]?.unpaid_amount ?? 0).toLocaleString()}
- Revenue collected this month: KES ${Number(payments[0]?.this_month ?? 0).toLocaleString()}
- Open maintenance requests: ${maintenance[0]?.open_count ?? 0}
- Security deposits held: ${deposits[0]?.held ?? 0} (KES ${Number(deposits[0]?.held_amount ?? 0).toLocaleString()} total)`
  } catch {
    return 'LIVE SYSTEM DATA: (unavailable)'
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    const role = payload.role as string
    const firstName = payload.firstName as string ?? ''
    const userName = firstName || 'Admin'

    const { messages, context } = await request.json()
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    const db = getPrismaForRequest(request)
    const liveData = await getLiveDashboardContext(db)

    const SYSTEM_PROMPT = `You are Njiti — meaning "Genius" in Swahili — the AI brain built into Makeja Homes, a property management platform for Kenyan landlords and property managers.

You are not a generic chatbot. You are deeply embedded in this system. You know every route, every workflow, every edge case. You speak with authority, warmth, and precision. You are concise but never shallow.

CURRENT USER: ${userName} (Role: ${role})
${liveData}
CURRENT PAGE: ${context ?? 'Dashboard'}

---

## SYSTEM ARCHITECTURE
- Next.js 14 App Router, schema-per-tenant PostgreSQL on Neon
- Each client gets schema: tenant_\${slug}. Fully isolated.
- All DB: \$queryRawUnsafe/\$executeRawUnsafe only (Prisma ORM crashes on non-public schemas)
- JWT cookie: "token". Roles: SUPER_ADMIN, ADMIN, MANAGER, CARETAKER, STOREKEEPER, TENANT
- Self-healing tables: CREATE TABLE IF NOT EXISTS at top of every route

## FINANCIAL INFRASTRUCTURE
- **Paystack**: Automated card + M-Pesa. Webhook: /api/webhooks/paystack. Idempotent, HMAC-SHA512 verified. Each property can have a subaccount (money goes directly to owner).
- **M-Pesa STK Push**: Daraja API. /api/payments/mpesa + /api/payments/mpesa/callback. Uses platform shortcode (not per-property till — Safaricom doesn't support subaccounts like Paystack).
- **Manual payments**: Tenant uploads proof → PENDING → Admin approves → bill marked PAID. Proof visible in Finance → Payments and property Payment Settings.
- **Bill generation**: Bulk Operations → Generate Bills. month INTEGER + year INTEGER columns. Recurring charges auto-applied. Water/garbage added separately.
- **patchPaymentsSchema(db)**: called before every payment INSERT — adds new columns (paymentType, paymentMethod, referenceNumber) alongside legacy (type, method, reference).
- **Reference formats**: deposit_\${tenantId}_\${ts}, bill_\${billId}_\${ts}, advance_\${tenantId}_\${n}mo_\${ts}

## TENANT LIFECYCLE
1. Create unit (set rent + deposit amount)
2. Assign tenant → RESERVED
3. Send lease contract (email with signing link)
4. Tenant signs → OCCUPIED, security_deposit created, billing starts
5. Tenant pays deposit (Paystack/M-Pesa/manual)
6. Monthly bills generated → tenant pays online or manually
7. Vacate notice → damage assessment → deposit refund (HELD → REFUNDED)

## DEPOSIT LIFECYCLE
PENDING → HELD (paid) → [damage assessed] → REFUNDED
- Finance → Deposits: full lifecycle view, slide-out detail panel, lifecycle progress dots
- Process Refund: enter damage items + costs → auto-calculates refund = deposit - deductions
- security_deposits table: status, paidDate, refundDate, refundAmount, deductionsTotal
- damage_assessments + damage_items tables: self-healing

## KEY NAVIGATION (always suggest these when relevant)
- Dashboard: /dashboard/admin
- Properties + Units: /dashboard/admin/properties
- Tenants: /dashboard/admin/tenants
- Finance → Payments: /dashboard/admin/payments
- Finance → Bills: /dashboard/admin/bills
- Finance → Deposits: /dashboard/admin/deposits
- Finance → Bulk Operations: /dashboard/admin/bulk
- Finance → Utilities (water/garbage): /dashboard/admin/utilities
- Finance → Recurring Charges: /dashboard/admin/recurring-charges
- Finance → Expenses: /dashboard/admin/expenses
- Finance → Reports: /dashboard/admin/reports
- Finance → Insights (AI): /dashboard/admin/insights
- Finance → Tax & Compliance: /dashboard/admin/tax
- Property Payment Settings: /dashboard/admin/properties/[id]/payment-settings
- HR / Payroll: /dashboard/admin/hr
- Vacate Notices: /dashboard/admin/vacate
- Deposit Refund: /dashboard/admin/deposit-refund
- Users / Staff: /dashboard/admin/users
- Maintenance: /dashboard/maintenance
- Inventory: /dashboard/inventory
- Audit Log: /dashboard/admin/audit

## COMMON ISSUES & SOLUTIONS
- "column paymentType does not exist" → patchPaymentsSchema(db) missing before INSERT
- Deposit still PENDING after Paystack payment → Webhook not registered in Paystack dashboard (Settings → API Keys & Webhooks → add https://yourdomain/api/webhooks/paystack)
- Bill not marked paid → bill_ reference parsing issue or webhook not fired
- Staff not in HR → staff_profiles table missing; self-heals on next payroll page load
- M-Pesa not working → check MPESA_ENV=production, MPESA_CALLBACK_URL whitelisted with Safaricom
- ORM crash → never use prisma.tableName.method() on tenant schemas

## PRODUCTION ENV VARS
DATABASE_URL, DIRECT_DATABASE_URL, MASTER_DATABASE_URL (Neon), JWT_SECRET, NEXT_PUBLIC_APP_URL, PAYSTACK_SECRET_KEY (sk_live_...), NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY, RESEND_API_KEY, MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_CALLBACK_URL, MPESA_ENV=production, ANTHROPIC_API_KEY, SUPER_ADMIN_SECRET

---

RESPONSE RULES:
1. Be direct and confident. Never hedge with "I think" or "possibly".
2. Use **bold** for routes, feature names, key terms.
3. Numbered lists for step-by-step workflows.
4. When you reference a page, include a navigation hint like → **Finance → Deposits** (/dashboard/admin/deposits)
5. If live data shows something actionable (many unpaid bills, open maintenance), proactively flag it.
6. Kenyan context: KES for currency, M-Pesa is primary payment method, Safaricom Daraja for STK Push.
7. Swahili is welcome — users are Kenyan. Use naturally, not forced.
8. If you don't know, say so. Never invent routes or features.
9. Match response length to question complexity. Simple question = short answer.`

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({
        reply: "Njiti needs an **ANTHROPIC_API_KEY** to use his full AI brain. Add it to your environment variables in Vercel (Project Settings → Environment Variables). Once set, I'll be fully operational.",
        source: 'fallback'
      })
    }

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: messages.slice(-10),
      }),
    })

    if (!aiRes.ok) {
      console.error('[njiti] Anthropic error:', await aiRes.text().catch(() => ''))
      return NextResponse.json({ reply: "Ninaomba msamaha — hit a snag. Try again in a moment.", source: 'error' })
    }

    const data = await aiRes.json()
    const reply = data.content?.[0]?.text ?? "Sijui — didn't get a response. Try again."

    return NextResponse.json({ reply, source: 'ai' })
  } catch (err: any) {
    console.error('[njiti]', err?.message)
    return NextResponse.json({ reply: "Something went wrong. Try again.", source: 'error' })
  }
}

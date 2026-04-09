import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getPrismaForRequest } from '@/lib/get-prisma'

export const dynamic = 'force-dynamic'

const raw = (db: any, sql: string, ...args: any[]) =>
  db.$queryRawUnsafe(sql, ...args).catch(() => []) as Promise<any[]>

// ── Admin / Manager — full portfolio view ─────────────────────────────────────

async function getAdminContext(db: any): Promise<string> {
  try {
    const [props, tenants, bills, payments, maintenance, deposits] = await Promise.all([
      raw(db, `SELECT COUNT(*) as total FROM properties`).catch(() => [{ total: 0 }]),
      raw(db, `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status::text='ACTIVE') as active FROM tenants`).catch(() => [{ total: 0, active: 0 }]),
      raw(db, `SELECT COUNT(*) FILTER (WHERE status::text IN ('PENDING','UNPAID','OVERDUE')) as unpaid, COALESCE(SUM("totalAmount") FILTER (WHERE status::text IN ('PENDING','UNPAID','OVERDUE')),0) as unpaid_amount FROM monthly_bills`).catch(() => [{ unpaid: 0, unpaid_amount: 0 }]),
      raw(db, `SELECT COALESCE(SUM(amount),0) as this_month FROM payments WHERE status::text IN ('COMPLETED','VERIFIED') AND "createdAt" >= date_trunc('month', NOW())`).catch(() => [{ this_month: 0 }]),
      raw(db, `SELECT COUNT(*) FILTER (WHERE status::text IN ('PENDING','OPEN')) as open_count FROM maintenance_requests`).catch(() => [{ open_count: 0 }]),
      raw(db, `SELECT COUNT(*) FILTER (WHERE status::text NOT IN ('REFUNDED')) as held, COALESCE(SUM(amount) FILTER (WHERE status::text='HELD'),0) as held_amount FROM security_deposits`).catch(() => [{ held: 0, held_amount: 0 }]),
    ])

    return `LIVE PORTFOLIO DATA (right now):
- Properties: ${props[0]?.total ?? 0}
- Tenants: ${tenants[0]?.total ?? 0} total (${tenants[0]?.active ?? 0} active)
- Unpaid bills: ${bills[0]?.unpaid ?? 0} bills totalling KES ${Number(bills[0]?.unpaid_amount ?? 0).toLocaleString()}
- Revenue collected this month: KES ${Number(payments[0]?.this_month ?? 0).toLocaleString()}
- Open maintenance requests: ${maintenance[0]?.open_count ?? 0}
- Security deposits held: ${deposits[0]?.held ?? 0} (KES ${Number(deposits[0]?.held_amount ?? 0).toLocaleString()} total)`
  } catch {
    return 'LIVE PORTFOLIO DATA: (unavailable)'
  }
}

// ── Tenant — personal account view ───────────────────────────────────────────

async function getTenantContext(db: any, userId: string): Promise<string> {
  try {
    const tenantRows = await raw(db,
      `SELECT t.id, t."unitId", t.status,
              u."unitNumber", u."rentAmount",
              p.name as property_name
       FROM tenants t
       LEFT JOIN units u ON u.id = t."unitId"
       LEFT JOIN properties p ON p.id = u."propertyId"
       WHERE t."userId" = $1
       LIMIT 1`,
      userId
    )

    if (!tenantRows.length) {
      return 'LIVE ACCOUNT DATA: No tenant profile linked to this account yet.'
    }

    const tenant = tenantRows[0]
    const tenantId = tenant.id

    const [bills, lastPayment, deposit, maintenance] = await Promise.all([
      raw(db,
        `SELECT COUNT(*) as unpaid_count, COALESCE(SUM("totalAmount"),0) as unpaid_amount, MIN("dueDate") as earliest_due
         FROM monthly_bills WHERE "tenantId" = $1 AND status::text IN ('PENDING','UNPAID','OVERDUE')`,
        tenantId
      ).catch(() => [{ unpaid_count: 0, unpaid_amount: 0, earliest_due: null }]),

      raw(db,
        `SELECT amount, status, "createdAt", "paymentMethod" FROM payments
         WHERE "tenantId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
        tenantId
      ).catch(() => []),

      raw(db,
        `SELECT amount, status, "paidDate", "refundAmount" FROM security_deposits
         WHERE "tenantId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
        tenantId
      ).catch(() => []),

      raw(db,
        `SELECT COUNT(*) FILTER (WHERE status::text IN ('PENDING','OPEN')) as open_count,
                COUNT(*) FILTER (WHERE status::text='IN_PROGRESS') as in_progress
         FROM maintenance_requests WHERE "createdById" = $1`,
        userId
      ).catch(() => [{ open_count: 0, in_progress: 0 }]),
    ])

    const dep = deposit[0]
    const lastPay = lastPayment[0]
    const bill = bills[0]

    return `LIVE ACCOUNT DATA (your personal account):
- Unit: ${tenant.unitNumber ?? 'N/A'} at ${tenant.property_name ?? 'N/A'}
- Lease status: ${tenant.status}
- Monthly rent: KES ${Number(tenant.rentAmount ?? 0).toLocaleString()}
- Unpaid bills: ${bill?.unpaid_count ?? 0} (KES ${Number(bill?.unpaid_amount ?? 0).toLocaleString()} outstanding)${bill?.earliest_due ? ` — earliest due ${new Date(bill.earliest_due).toLocaleDateString('en-KE')}` : ''}
- Last payment: ${lastPay ? `KES ${Number(lastPay.amount).toLocaleString()} via ${lastPay.paymentMethod ?? 'N/A'} on ${new Date(lastPay.createdAt).toLocaleDateString('en-KE')} (${lastPay.status})` : 'None recorded'}
- Security deposit: ${dep ? `KES ${Number(dep.amount).toLocaleString()} — ${dep.status}${dep.paidDate ? ` (paid ${new Date(dep.paidDate).toLocaleDateString('en-KE')})` : ''}` : 'Not recorded'}
- Your maintenance requests: ${maintenance[0]?.open_count ?? 0} open, ${maintenance[0]?.in_progress ?? 0} in progress`
  } catch {
    return 'LIVE ACCOUNT DATA: (unavailable)'
  }
}

// ── Caretaker — maintenance-focused view ─────────────────────────────────────

async function getCaretakerContext(db: any): Promise<string> {
  try {
    const [requests, props] = await Promise.all([
      raw(db,
        `SELECT COUNT(*) FILTER (WHERE status::text IN ('PENDING','OPEN')) as open_count,
                COUNT(*) FILTER (WHERE status::text='IN_PROGRESS') as in_progress,
                COUNT(*) FILTER (WHERE priority::text IN ('HIGH','EMERGENCY') AND status::text IN ('PENDING','OPEN','IN_PROGRESS')) as urgent
         FROM maintenance_requests`
      ).catch(() => [{ open_count: 0, in_progress: 0, urgent: 0 }]),
      raw(db, `SELECT COUNT(*) as total FROM properties`).catch(() => [{ total: 0 }]),
    ])

    const r = requests[0]
    return `LIVE MAINTENANCE DATA:
- Open/pending requests: ${r?.open_count ?? 0}
- In progress: ${r?.in_progress ?? 0}
- Urgent (High/Emergency, active): ${r?.urgent ?? 0}
- Properties covered: ${props[0]?.total ?? 0}`
  } catch {
    return 'LIVE MAINTENANCE DATA: (unavailable)'
  }
}

// ── Storekeeper — inventory-focused view ─────────────────────────────────────

async function getStorekeeperContext(db: any): Promise<string> {
  try {
    const [items, lowStock, pendingOrders] = await Promise.all([
      raw(db, `SELECT COUNT(*) as total, COALESCE(SUM(quantity * "unitCost"),0) as total_value FROM inventory_items`).catch(() => [{ total: 0, total_value: 0 }]),
      raw(db, `SELECT COUNT(*) as low FROM inventory_items WHERE quantity <= "minimumQuantity"`).catch(() => [{ low: 0 }]),
      raw(db, `SELECT COUNT(*) as pending FROM purchase_orders WHERE status IN ('PENDING','APPROVED')`).catch(() => [{ pending: 0 }]),
    ])

    return `LIVE INVENTORY DATA:
- Total inventory items: ${items[0]?.total ?? 0}
- Total stock value: KES ${Number(items[0]?.total_value ?? 0).toLocaleString()}
- Low stock alerts: ${lowStock[0]?.low ?? 0} items below reorder level
- Pending purchase orders: ${pendingOrders[0]?.pending ?? 0}`
  } catch {
    return 'LIVE INVENTORY DATA: (unavailable)'
  }
}

// ── Role-specific system prompts ──────────────────────────────────────────────

function buildSystemPrompt(role: string, userName: string, liveData: string, context: string): string {
  const base = `You are Njiti — meaning "Genius" in Swahili — the AI brain built into Makeja Homes, a property management platform for Kenyan landlords and property managers.

You are not a generic chatbot. You are deeply embedded in this system. You speak with authority, warmth, and precision. You are concise but never shallow.

CURRENT USER: ${userName} (Role: ${role})
${liveData}
CURRENT PAGE: ${context ?? 'Dashboard'}

---

## SYSTEM ARCHITECTURE
- Next.js 14 App Router, schema-per-tenant PostgreSQL on Neon
- Each client gets schema: tenant_\${slug}. Fully isolated.
- JWT cookie: "token". Roles: SUPER_ADMIN, ADMIN, MANAGER, CARETAKER, STOREKEEPER, TENANT
- Kenyan context: KES for currency, M-Pesa is primary payment method

## FINANCIAL INFRASTRUCTURE
- **Paystack**: Automated card + M-Pesa. Webhook: /api/webhooks/paystack. Idempotent, HMAC-SHA512 verified.
- **M-Pesa STK Push**: Daraja API. /api/payments/mpesa + /api/payments/mpesa/callback.
- **Manual payments**: Tenant uploads proof → PENDING → Admin approves → bill marked PAID.
- **Bill generation**: Bulk Operations → Generate Bills. Recurring charges auto-applied.

## TENANT LIFECYCLE
1. Create unit (set rent + deposit amount)
2. Assign tenant → RESERVED
3. Send lease contract (email with signing link)
4. Tenant signs → OCCUPIED, security_deposit created, billing starts
5. Tenant pays deposit (Paystack/M-Pesa/manual)
6. Monthly bills generated → tenant pays online or manually
7. Vacate notice → damage assessment → deposit refund (HELD → REFUNDED)

## MAINTENANCE LIFECYCLE
1. Tenant/caretaker submits request → status: PENDING
2. Admin/manager reviews → Approves (OPEN) or rejects
3. Admin assigns priority + caretaker → work begins (IN_PROGRESS)
4. Inventory items consumed → stock deducted automatically
5. If stock low → purchase order triggered
6. Work completed → actual cost logged → expense auto-created
7. All costs feed into property expenses

## DEPOSIT LIFECYCLE
PENDING → HELD (paid) → [damage assessed] → REFUNDED`

  const roleNav: Record<string, string> = {
    ADMIN: `
## KEY NAVIGATION (admin)
- Dashboard: /dashboard/admin
- Properties + Units: /dashboard/admin/properties
- Tenants: /dashboard/admin/tenants
- Finance → Payments: /dashboard/admin/payments
- Finance → Bills: /dashboard/admin/bills
- Finance → Deposits: /dashboard/admin/deposits
- Finance → Bulk Operations: /dashboard/admin/bulk
- Finance → Utilities: /dashboard/admin/utilities
- Finance → Recurring Charges: /dashboard/admin/recurring-charges
- Finance → Expenses: /dashboard/admin/expenses
- Finance → Reports: /dashboard/admin/reports
- Finance → Insights (AI): /dashboard/admin/insights
- Finance → Tax & Compliance: /dashboard/admin/tax
- HR / Payroll: /dashboard/admin/hr
- Vacate Notices: /dashboard/admin/vacate
- Users / Staff: /dashboard/admin/users
- Maintenance: /dashboard/maintenance
- Inventory: /dashboard/inventory
- Purchase Orders: /dashboard/purchase-orders
- Audit Log: /dashboard/admin/audit`,

    SUPER_ADMIN: `
## KEY NAVIGATION (super admin)
- Dashboard: /dashboard/admin
- Properties + Units: /dashboard/admin/properties
- Tenants: /dashboard/admin/tenants
- Finance → Payments: /dashboard/admin/payments
- Finance → Bills: /dashboard/admin/bills
- Finance → Deposits: /dashboard/admin/deposits
- Finance → Bulk Operations: /dashboard/admin/bulk
- Finance → Reports: /dashboard/admin/reports
- HR / Payroll: /dashboard/admin/hr
- Users / Staff: /dashboard/admin/users
- Maintenance: /dashboard/maintenance
- Inventory: /dashboard/inventory
- Purchase Orders: /dashboard/purchase-orders
- Audit Log: /dashboard/admin/audit`,

    MANAGER: `
## KEY NAVIGATION (manager)
- Dashboard: /dashboard/admin
- Properties + Units: /dashboard/admin/properties
- Tenants: /dashboard/admin/tenants
- Finance → Payments: /dashboard/admin/payments
- Finance → Bills: /dashboard/admin/bills
- Finance → Deposits: /dashboard/admin/deposits
- Finance → Bulk Operations: /dashboard/admin/bulk
- Finance → Utilities: /dashboard/admin/utilities
- Finance → Reports: /dashboard/admin/reports
- Vacate Notices: /dashboard/admin/vacate
- Maintenance: /dashboard/maintenance
- Inventory: /dashboard/inventory
- Purchase Orders: /dashboard/purchase-orders`,

    TENANT: `
## KEY NAVIGATION (tenant)
- My Dashboard: /dashboard/tenant
- My Bills: /dashboard/tenant/bills
- My Payments: /dashboard/tenant/payments
- My Maintenance Requests: /dashboard/maintenance
- My Lease / Documents: /dashboard/tenant/lease`,

    CARETAKER: `
## KEY NAVIGATION (caretaker)
- Maintenance Requests: /dashboard/maintenance
- Inventory: /dashboard/inventory`,

    STOREKEEPER: `
## KEY NAVIGATION (storekeeper)
- Inventory: /dashboard/inventory
- Purchase Orders: /dashboard/purchase-orders
- Maintenance Requests: /dashboard/maintenance`,
  }

  const roleRules: Record<string, string> = {
    ADMIN: `
## YOUR ROLE CONTEXT
You are talking to an admin/owner. They have full access to all data and features. Proactively flag actionable issues from the live data (unpaid bills, open maintenance, low occupancy). Be a strategic advisor — not just a help desk.`,

    SUPER_ADMIN: `
## YOUR ROLE CONTEXT
You are talking to the super admin. They have full access across the platform. Proactively flag critical issues and guide them through any workflow.`,

    MANAGER: `
## YOUR ROLE CONTEXT
You are talking to a property manager. They manage day-to-day operations but may not have full financial/HR access. Focus on operational tasks: tenant management, payments approval, maintenance coordination, bulk billing.`,

    TENANT: `
## YOUR ROLE CONTEXT
You are talking directly to a tenant — a resident living in one of the properties. Be warm, clear, and non-technical. Focus entirely on THEIR account: their bills, their payments, their maintenance requests, their deposit.

CRITICAL: Never expose other tenants' data, portfolio-wide stats, or admin-only information. Answer only about what this specific tenant can see and do.

Help them with:
- Paying their bills (M-Pesa, card, or manual upload)
- Understanding why a bill shows unpaid after they paid
- Checking their deposit status
- Submitting or following up on a maintenance request
- Understanding their lease

If they ask about something only admins can do, politely explain they should contact their property manager.`,

    CARETAKER: `
## YOUR ROLE CONTEXT
You are talking to a caretaker. They handle on-ground maintenance and repairs. Focus on maintenance requests, status updates, and inventory. They do not manage finances or tenants.`,

    STOREKEEPER: `
## YOUR ROLE CONTEXT
You are talking to a storekeeper. They manage inventory and supplies. Focus on stock levels, low stock alerts, purchase orders, and inventory operations. They do not manage finances or tenants.`,
  }

  const rules = `
## RESPONSE RULES
1. Be direct and confident. Never hedge with "I think" or "possibly".
2. Use **bold** for routes, feature names, key terms.
3. Numbered lists for step-by-step workflows.
4. When you reference a page, include a navigation hint like → **Finance → Deposits** (/dashboard/admin/deposits)
5. If live data shows something actionable, proactively flag it.
6. Kenyan context: KES for currency, M-Pesa is primary payment method.
7. Swahili is welcome — users are Kenyan. Use naturally, not forced.
8. If you don't know, say so. Never invent routes or features.
9. Match response length to question complexity. Simple question = short answer.
10. Never expose data the current user's role cannot access.`

  const nav = roleNav[role] ?? roleNav['ADMIN']
  const roleCtx = roleRules[role] ?? roleRules['ADMIN']

  return `${base}${nav}${roleCtx}${rules}`
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    const role = payload.role as string
    const userId = (payload.id as string) ?? payload.sub ?? ''
    const firstName = (payload.firstName as string) ?? ''
    const userName = firstName || role

    const { messages, context } = await request.json()
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    const db = getPrismaForRequest(request)

    let liveData: string
    if (role === 'TENANT') {
      liveData = await getTenantContext(db, userId)
    } else if (role === 'CARETAKER') {
      liveData = await getCaretakerContext(db)
    } else if (role === 'STOREKEEPER') {
      liveData = await getStorekeeperContext(db)
    } else {
      liveData = await getAdminContext(db)
    }

    const SYSTEM_PROMPT = buildSystemPrompt(role, userName, liveData, context)

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

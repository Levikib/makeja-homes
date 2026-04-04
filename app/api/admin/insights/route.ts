import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getPrismaForRequest } from '@/lib/get-prisma'

export const dynamic = 'force-dynamic'

// POST /api/admin/insights
// Gathers business data then calls Claude API for contextual analysis.
// Returns structured insight cards.

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!['ADMIN', 'MANAGER'].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const prisma = getPrismaForRequest(request)
    const now = new Date()
    const sixMonthsAgo = new Date(now); sixMonthsAgo.setMonth(now.getMonth() - 6)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = thisMonthStart

    // Gather data in parallel
    const [
      properties, totalUnits, occupiedUnits,
      thisMonthPayments, lastMonthPayments,
      overdueCount, maintenanceOpen, maintenanceCompleted,
      lowStockItems, recentExpenses,
      vacateNotices, expiringLeases,
    ] = await Promise.all([
      prisma.properties.count({ where: { deletedAt: null } }),
      prisma.units.count({ where: { deletedAt: null } }),
      prisma.units.count({ where: { status: 'OCCUPIED', deletedAt: null } }),
      prisma.payments.aggregate({
        where: { status: 'COMPLETED', verificationStatus: 'APPROVED', paymentDate: { gte: thisMonthStart } },
        _sum: { amount: true }, _count: true,
      }),
      prisma.payments.aggregate({
        where: { status: 'COMPLETED', verificationStatus: 'APPROVED', paymentDate: { gte: lastMonthStart, lt: lastMonthEnd } },
        _sum: { amount: true }, _count: true,
      }),
      prisma.monthly_bills.count({ where: { status: 'OVERDUE' } }),
      prisma.maintenance_requests.count({ where: { status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] } } }),
      prisma.maintenance_requests.count({ where: { status: 'COMPLETED', completedAt: { gte: sixMonthsAgo } } }),
      prisma.$queryRaw<{ name: string; quantity: number; minimumQuantity: number }[]>`
        SELECT name, quantity, "minimumQuantity"
        FROM inventory_items
        WHERE "deletedAt" IS NULL AND quantity <= "minimumQuantity"
        ORDER BY quantity ASC
        LIMIT 10
      `.catch(() => []),
      prisma.expenses.aggregate({
        where: { createdAt: { gte: thisMonthStart } },
        _sum: { amount: true }, _count: true,
      }),
      prisma.vacate_notices.count({ where: { status: { in: ['PENDING', 'APPROVED'] } } }).catch(() => 0),
      prisma.lease_agreements.count({
        where: {
          status: 'ACTIVE',
          endDate: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ])

    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
    const thisMonthRevenue = Number(thisMonthPayments._sum.amount ?? 0)
    const lastMonthRevenue = Number(lastMonthPayments._sum.amount ?? 0)
    const revenueChange = lastMonthRevenue > 0
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : 0
    const thisMonthExpenses = Number(recentExpenses._sum.amount ?? 0)

    // Build the business context for Claude
    const businessContext = `
You are a business intelligence analyst for a Kenyan property management company. Analyse this data and return actionable, specific insights. Be direct, quantified, and focus on what matters most.

BUSINESS SNAPSHOT (as of ${now.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}):
- Properties: ${properties}
- Total Units: ${totalUnits} | Occupied: ${occupiedUnits} | Occupancy Rate: ${occupancyRate}%
- This Month Revenue: KSH ${thisMonthRevenue.toLocaleString()} (${revenueChange >= 0 ? '+' : ''}${revenueChange}% vs last month)
- Last Month Revenue: KSH ${lastMonthRevenue.toLocaleString()}
- This Month Expenses: KSH ${thisMonthExpenses.toLocaleString()}
- Net This Month: KSH ${(thisMonthRevenue - thisMonthExpenses).toLocaleString()}
- Overdue Bills: ${overdueCount}
- Open Maintenance Requests: ${maintenanceOpen}
- Maintenance Completed (6 months): ${maintenanceCompleted}
- Pending Vacate Notices: ${vacateNotices}
- Leases Expiring in 30 Days: ${expiringLeases}
- Low Stock Inventory Items: ${(lowStockItems as any[]).length}
${(lowStockItems as any[]).length > 0 ? `  Low stock items: ${(lowStockItems as any[]).map((i: any) => `${i.name} (${i.quantity}/${i.minimumQuantity})`).join(', ')}` : ''}

Return a JSON array of 5-8 insight objects. Each insight must follow this exact structure:
{
  "category": "FINANCIAL" | "OPERATIONAL" | "RISK" | "OPPORTUNITY",
  "title": "Short, punchy title (max 8 words)",
  "insight": "Specific, data-driven observation (2-3 sentences max)",
  "action": "Concrete recommended action (1-2 sentences)",
  "priority": "HIGH" | "MEDIUM" | "LOW",
  "metric": "Key number or stat that supports this insight"
}

Focus on: revenue trends, occupancy risks, maintenance patterns, cash flow, upcoming renewals, and operational efficiency. Be brutally specific — avoid generic advice.`

    // Call Claude API
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
    if (!ANTHROPIC_API_KEY) {
      // Return rule-based insights if no API key
      const insights = generateRuleBasedInsights({
        occupancyRate, revenueChange, overdueCount,
        maintenanceOpen, expiringLeases, vacateNotices,
        thisMonthRevenue, thisMonthExpenses, lowStockItems: lowStockItems as any[],
      })
      return NextResponse.json({ insights, source: 'rule-based', generatedAt: now.toISOString() })
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
        max_tokens: 1500,
        messages: [{ role: 'user', content: businessContext }],
      }),
    })

    if (!aiRes.ok) {
      const insights = generateRuleBasedInsights({
        occupancyRate, revenueChange, overdueCount,
        maintenanceOpen, expiringLeases, vacateNotices,
        thisMonthRevenue, thisMonthExpenses, lowStockItems: lowStockItems as any[],
      })
      return NextResponse.json({ insights, source: 'rule-based', generatedAt: now.toISOString() })
    }

    const aiData = await aiRes.json()
    const content = aiData.content?.[0]?.text ?? ''

    // Parse JSON from Claude response
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('Invalid AI response format')
    const insights = JSON.parse(jsonMatch[0])

    return NextResponse.json({ insights, source: 'ai', generatedAt: now.toISOString() })
  } catch (err: any) {
    console.error('[INSIGHTS]', err?.message)
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 })
  }
}

function generateRuleBasedInsights(data: {
  occupancyRate: number
  revenueChange: number
  overdueCount: number
  maintenanceOpen: number
  expiringLeases: number
  vacateNotices: number
  thisMonthRevenue: number
  thisMonthExpenses: number
  lowStockItems: any[]
}) {
  const insights: any[] = []
  const fmt = (n: number) => `KSH ${Math.round(n).toLocaleString()}`

  // Occupancy
  if (data.occupancyRate < 80) {
    insights.push({
      category: 'RISK',
      title: 'Occupancy Below Target',
      insight: `Current occupancy is ${data.occupancyRate}%, below the 80% target threshold. Vacant units represent unrealised monthly revenue.`,
      action: 'Review pricing on vacant units. Consider short-term incentives (1 month free, reduced deposit) to fill vacancies quickly.',
      priority: 'HIGH',
      metric: `${data.occupancyRate}% occupancy`,
    })
  } else if (data.occupancyRate >= 95) {
    insights.push({
      category: 'OPPORTUNITY',
      title: 'Near Full Occupancy — Consider Expansion',
      insight: `Outstanding ${data.occupancyRate}% occupancy suggests strong demand. You have minimal vacancy headroom.`,
      action: 'Evaluate adding units or acquiring a new property. Consider a modest rent review at the next lease renewal cycle.',
      priority: 'MEDIUM',
      metric: `${data.occupancyRate}% occupancy`,
    })
  }

  // Revenue trend
  if (data.revenueChange < -10) {
    insights.push({
      category: 'FINANCIAL',
      title: 'Revenue Dropped Significantly',
      insight: `Month-on-month revenue fell ${Math.abs(data.revenueChange)}%. This may indicate unpaid rent, vacancies, or delayed payments.`,
      action: 'Cross-reference with overdue bills and recent vacancies to pinpoint the drop.',
      priority: 'HIGH',
      metric: `${data.revenueChange}% MoM change`,
    })
  } else if (data.revenueChange > 10) {
    insights.push({
      category: 'FINANCIAL',
      title: 'Strong Revenue Growth This Month',
      insight: `Revenue grew ${data.revenueChange}% month-on-month, collecting ${fmt(data.thisMonthRevenue)}.`,
      action: 'Allocate a portion to a maintenance reserve fund to sustain property quality.',
      priority: 'LOW',
      metric: `+${data.revenueChange}% MoM`,
    })
  }

  // Overdue bills
  if (data.overdueCount > 0) {
    insights.push({
      category: 'RISK',
      title: `${data.overdueCount} Overdue Bills Require Action`,
      insight: `${data.overdueCount} bills are past due. Left unaddressed, arrears compound and become harder to recover.`,
      action: 'Send reminders from Bulk Operations. Escalate accounts overdue by more than 30 days to formal notices.',
      priority: data.overdueCount > 5 ? 'HIGH' : 'MEDIUM',
      metric: `${data.overdueCount} overdue`,
    })
  }

  // Maintenance backlog
  if (data.maintenanceOpen > 5) {
    insights.push({
      category: 'OPERATIONAL',
      title: 'High Maintenance Backlog',
      insight: `${data.maintenanceOpen} maintenance requests are open. A growing backlog increases tenant dissatisfaction and risks lease non-renewals.`,
      action: 'Prioritise URGENT and HIGH priority requests. Assign staff and set 48-hour response targets.',
      priority: 'MEDIUM',
      metric: `${data.maintenanceOpen} open requests`,
    })
  }

  // Expiring leases
  if (data.expiringLeases > 0) {
    insights.push({
      category: 'OPERATIONAL',
      title: `${data.expiringLeases} Lease${data.expiringLeases > 1 ? 's' : ''} Expiring in 30 Days`,
      insight: `${data.expiringLeases} active leases expire within 30 days. Unplanned vacancies disrupt cash flow.`,
      action: 'Contact tenants now to discuss renewal. Offer early-renewal incentives where appropriate.',
      priority: 'HIGH',
      metric: `${data.expiringLeases} expiring soon`,
    })
  }

  // Low stock
  if (data.lowStockItems.length > 0) {
    insights.push({
      category: 'OPERATIONAL',
      title: 'Inventory Stock Running Low',
      insight: `${data.lowStockItems.length} inventory items are at or below minimum stock levels. This can delay maintenance resolutions.`,
      action: 'Create purchase orders for the items listed. Prioritise those used most frequently in maintenance.',
      priority: 'MEDIUM',
      metric: `${data.lowStockItems.length} low-stock items`,
    })
  }

  // Net income
  const netIncome = data.thisMonthRevenue - data.thisMonthExpenses
  if (netIncome < 0) {
    insights.push({
      category: 'FINANCIAL',
      title: 'Expenses Exceeded Revenue This Month',
      insight: `Net income is ${fmt(netIncome)} this month. Expenses (${fmt(data.thisMonthExpenses)}) outpaced collections (${fmt(data.thisMonthRevenue)}).`,
      action: 'Review expense categories for discretionary spend that can be deferred.',
      priority: 'HIGH',
      metric: fmt(netIncome),
    })
  }

  return insights
}

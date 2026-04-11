import { getSuperAdminSession } from '@/lib/super-admin-auth'
import { NextRequest, NextResponse } from 'next/server'
import { getMasterPrisma } from '@/lib/get-prisma'

export const dynamic = 'force-dynamic'

const TIER_UNIT_LIMITS: Record<string, number> = {
  STARTER: 100,
  GROWTH: 250,
  PRO: 500,
  ENTERPRISE: 99999,
}

const TIER_MONTHLY_PRICES: Record<string, number> = {
  STARTER: 3000,
  GROWTH: 7500,
  PRO: 15000,
  ENTERPRISE: 35000,
}

/**
 * POST /api/super-admin/companies/[id]/activate
 * Body: { tier: string, months: number, amount?: number }
 *
 * Activates or renews a company subscription.
 * Sets subscriptionStatus=ACTIVE, subscriptionTier, subscriptionEndsAt, billedAmount.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSuperAdminSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { tier, months, amount } = await req.json()

    if (!tier || !['STARTER', 'GROWTH', 'PRO', 'ENTERPRISE'].includes(tier)) {
      return NextResponse.json({ error: 'tier must be STARTER, GROWTH, PRO, or ENTERPRISE' }, { status: 400 })
    }
    if (!months || typeof months !== 'number' || months < 1 || months > 24) {
      return NextResponse.json({ error: 'months must be between 1 and 24' }, { status: 400 })
    }

    const prisma = getMasterPrisma()
    const company = await prisma.companies.findUnique({ where: { id: params.id } })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const now = new Date()
    // If currently active with future end date, extend from that date; otherwise from now
    const currentEnd = (company as any).subscriptionEndsAt
      ? new Date((company as any).subscriptionEndsAt)
      : null
    const baseDate = currentEnd && currentEnd > now ? currentEnd : now
    const subscriptionEndsAt = new Date(baseDate)
    subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + months)

    const billedAmount = amount ?? (TIER_MONTHLY_PRICES[tier] * months)
    const unitLimit = TIER_UNIT_LIMITS[tier]

    const updated = await prisma.companies.update({
      where: { id: params.id },
      data: {
        subscriptionStatus: 'ACTIVE',
        subscriptionTier: tier,
        subscriptionEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: subscriptionEndsAt,
        unitLimit,
        billedAmount,
        lastBilledAt: now,
        isActive: true,
        // Clear trial dates on full activation
        trialEndsAt: null,
      } as any,
    })

    return NextResponse.json({
      success: true,
      message: `Subscription activated — ${tier} for ${months} month(s)`,
      subscriptionEndsAt: subscriptionEndsAt.toISOString(),
      billedAmount,
      company: updated,
    })
  } catch (err: any) {
    console.error('[activate] error:', err?.message)
    return NextResponse.json({ error: 'Failed to activate subscription' }, { status: 500 })
  }
}

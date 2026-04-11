import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getMasterPrisma } from '@/lib/get-prisma'

export const dynamic = 'force-dynamic'

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET!)
}

async function verifySuperAdmin(req: NextRequest): Promise<boolean> {
  const headerSecret = req.headers.get('x-super-admin-secret')
  if (headerSecret && (headerSecret === process.env.SUPER_ADMIN_PASSWORD || headerSecret === process.env.SUPER_ADMIN_SECRET)) {
    return true
  }
  const token = req.cookies.get('super_admin_token')?.value
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload.role === 'super_admin'
  } catch {
    return false
  }
}

/**
 * POST /api/super-admin/companies/[id]/reinstate
 *
 * Reinstates a SUSPENDED or deactivated company.
 * - If they have a future subscriptionEndsAt → restore to ACTIVE
 * - Otherwise → restore to TRIAL with +7 day grace period
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await verifySuperAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const prisma = getMasterPrisma()
    const company = await prisma.companies.findUnique({ where: { id: params.id } })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const now = new Date()
    const subscriptionEndsAt = (company as any).subscriptionEndsAt
      ? new Date((company as any).subscriptionEndsAt)
      : null

    // If they have a valid active subscription period, restore to ACTIVE
    // Otherwise give them a 7-day trial grace period
    let newStatus: string
    let updateData: Record<string, any>

    if (subscriptionEndsAt && subscriptionEndsAt > now) {
      newStatus = 'ACTIVE'
      updateData = { subscriptionStatus: 'ACTIVE', isActive: true }
    } else {
      const trialEndsAt = new Date(now)
      trialEndsAt.setDate(trialEndsAt.getDate() + 7)
      newStatus = 'TRIAL'
      updateData = {
        subscriptionStatus: 'TRIAL',
        isActive: true,
        trialEndsAt,
      }
    }

    const updated = await prisma.companies.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      message: `Account reinstated (status: ${newStatus})`,
      newStatus,
      company: updated,
    })
  } catch (err: any) {
    console.error('[reinstate] error:', err?.message)
    return NextResponse.json({ error: 'Failed to reinstate account' }, { status: 500 })
  }
}

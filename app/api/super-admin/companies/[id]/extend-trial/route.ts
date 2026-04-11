import { getSuperAdminSession } from '@/lib/super-admin-auth'
import { NextRequest, NextResponse } from 'next/server'
import { getMasterPrisma } from '@/lib/get-prisma'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSuperAdminSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const prisma = getMasterPrisma()

  try {
    const { days } = await req.json()

    if (![7, 14, 30].includes(days)) {
      return NextResponse.json(
        { error: 'days must be 7, 14, or 30' },
        { status: 400 }
      )
    }

    const company = await prisma.companies.findUnique({
      where: { id: params.id },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const currentTrialEnds = (company as any).trialEndsAt
      ? new Date((company as any).trialEndsAt)
      : new Date()

    // If the trial has already expired, extend from today
    const baseDate = currentTrialEnds < new Date() ? new Date() : currentTrialEnds
    const newTrialEnds = new Date(baseDate)
    newTrialEnds.setDate(newTrialEnds.getDate() + days)

    const updateData: Record<string, any> = {
      trialEndsAt: newTrialEnds,
    }

    // If subscription was expired/cancelled, reset to TRIAL
    const currentStatus = (company as any).subscriptionStatus
    if (currentStatus === 'EXPIRED' || currentStatus === 'CANCELLED' || !currentStatus) {
      updateData.subscriptionStatus = 'TRIAL'
    }

    const updated = await prisma.companies.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      company: updated,
      newTrialEndsAt: newTrialEnds,
    })
  } catch (err: any) {
    console.error('Extend trial error:', err)
    return NextResponse.json({ error: 'Failed to extend trial' }, { status: 500 })
  }
}

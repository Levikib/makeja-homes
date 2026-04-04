import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getPrismaForRequest } from '@/lib/get-prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/deposit-refund?tenantId=xxx
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!['ADMIN', 'MANAGER'].includes(payload.role as string))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const tenantId = request.nextUrl.searchParams.get('tenantId')
    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

    const prisma = getPrismaForRequest(request)
    const [deposit, assessment] = await Promise.all([
      prisma.security_deposits.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' } }),
      prisma.damage_assessments.findFirst({
        where: { tenantId },
        orderBy: { assessmentDate: 'desc' },
        include: { damage_items: true },
      }),
    ])

    const heldAmount = deposit?.amount ?? 0
    const totalDamage = assessment?.totalDamageCost ?? 0
    const refundable = Math.max(0, heldAmount - totalDamage)

    return NextResponse.json({
      deposit,
      assessment,
      summary: { heldAmount, totalDamage, refundable },
    })
  } catch (err: any) {
    console.error('[deposit-refund GET]', err?.message)
    return NextResponse.json({ error: 'Failed to load deposit info' }, { status: 500 })
  }
}

// POST /api/admin/deposit-refund — process refund
// Body: { tenantId, deductions: number, notes: string, refundMethod: string }
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (payload.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { tenantId, deductions, notes, refundMethod } = await request.json()
    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

    const prisma = getPrismaForRequest(request)

    const deposit = await prisma.security_deposits.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
    if (!deposit) return NextResponse.json({ error: 'No deposit on record' }, { status: 404 })
    if (deposit.status === 'REFUNDED') return NextResponse.json({ error: 'Deposit already refunded' }, { status: 400 })

    const deductAmt = Number(deductions ?? 0)
    const refundAmount = Math.max(0, deposit.amount - deductAmt)

    await prisma.$transaction(async (tx) => {
      // Update deposit record
      await tx.security_deposits.update({
        where: { id: deposit.id },
        data: {
          status: 'REFUNDED',
          refundDate: new Date(),
          refundAmount,
          deductionsTotal: deductAmt,
        },
      })
      // Expense record for deductions is intentionally omitted here.
      // The deposit refund record itself serves as audit trail.
    })

    return NextResponse.json({ success: true, refundAmount, deductionsTotal: deductAmt })
  } catch (err: any) {
    console.error('[deposit-refund POST]', err?.message)
    return NextResponse.json({ error: 'Failed to process refund' }, { status: 500 })
  }
}

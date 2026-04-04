import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getPrismaForRequest } from '@/lib/get-prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/leases/enforce-deposit?leaseId=...
// Returns whether the lease has a confirmed deposit payment.
// Used as a gate before activating tenant status.

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!['ADMIN', 'MANAGER'].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const leaseId = searchParams.get('leaseId')
    const tenantId = searchParams.get('tenantId')

    if (!leaseId && !tenantId) {
      return NextResponse.json({ error: 'leaseId or tenantId required' }, { status: 400 })
    }

    const prisma = getPrismaForRequest(request)

    const where: any = leaseId ? { id: leaseId } : { tenantId }
    const lease = await prisma.lease_agreements.findFirst({
      where,
      include: { tenants: { include: { payments: { where: { paymentType: 'DEPOSIT' } } } } },
    })

    if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 })

    const depositPayments = lease.tenants.payments.filter(
      (p) => ['COMPLETED', 'VERIFIED'].includes(p.status) ||
             p.verificationStatus === 'APPROVED'
    )
    const isSigned = !!lease.contractSignedAt
    const hasDeposit = depositPayments.length > 0
    const depositAmount = depositPayments.reduce((s, p) => s + Number(p.amount), 0)
    const canActivate = isSigned && hasDeposit

    return NextResponse.json({
      leaseId: lease.id,
      tenantId: lease.tenantId,
      isSigned,
      contractSignedAt: lease.contractSignedAt,
      hasDeposit,
      depositAmount,
      depositPayments: depositPayments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        status: p.status,
        verificationStatus: p.verificationStatus,
        paymentDate: p.paymentDate,
      })),
      canActivate,
      blockers: [
        ...(!isSigned ? ['Lease contract has not been signed'] : []),
        ...(!hasDeposit ? ['No confirmed deposit payment found'] : []),
      ],
    })
  } catch (err: any) {
    console.error('[ENFORCE DEPOSIT]', err?.message)
    return NextResponse.json({ error: 'Failed to check deposit status' }, { status: 500 })
  }
}

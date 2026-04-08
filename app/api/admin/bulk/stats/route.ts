import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getPrismaForRequest } from '@/lib/get-prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!['ADMIN', 'MANAGER'].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const prisma = getPrismaForRequest(request)

    const rows = await prisma.$queryRawUnsafe<Array<{ status: string; count: string }>>(
      `SELECT status, COUNT(*)::text AS count FROM monthly_bills GROUP BY status`
    )

    const map: Record<string, number> = {}
    let total = 0
    for (const row of rows) {
      const n = parseInt(row.count, 10)
      map[row.status] = n
      total += n
    }

    return NextResponse.json({
      total,
      pending: map['PENDING'] ?? 0,
      unpaid: map['UNPAID'] ?? 0,
      overdue: map['OVERDUE'] ?? 0,
      paid: map['PAID'] ?? 0,
    })
  } catch (err: any) {
    console.error('[BULK:stats]', err?.message)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}

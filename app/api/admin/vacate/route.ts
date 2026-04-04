import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getPrismaForRequest } from '@/lib/get-prisma'
import { nanoid } from 'nanoid'

export const dynamic = 'force-dynamic'

// GET /api/admin/vacate?status=PENDING
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!['ADMIN', 'MANAGER'].includes(payload.role as string))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const prisma = getPrismaForRequest(request)
    const status = request.nextUrl.searchParams.get('status')
    const notices = await prisma.vacate_notices.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { intendedVacateDate: 'asc' },
      include: {
        tenants: {
          include: {
            users: { select: { firstName: true, lastName: true, email: true, phoneNumber: true } },
            units: { include: { properties: { select: { id: true, name: true } } } },
          },
        },
      },
    })
    return NextResponse.json({ notices })
  } catch (err: any) {
    console.error('[vacate GET]', err?.message)
    return NextResponse.json({ error: 'Failed to load notices' }, { status: 500 })
  }
}

// POST /api/admin/vacate — create a vacate notice
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!['ADMIN', 'MANAGER'].includes(payload.role as string))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { tenantId, intendedVacateDate, reason } = await request.json()
    if (!tenantId || !intendedVacateDate)
      return NextResponse.json({ error: 'tenantId and intendedVacateDate required' }, { status: 400 })

    const prisma = getPrismaForRequest(request)
    const notice = await prisma.vacate_notices.create({
      data: {
        id: `vacate_${nanoid(10)}`,
        tenantId,
        intendedVacateDate: new Date(intendedVacateDate),
        reason: reason || null,
        status: 'PENDING',
        createdById: payload.id as string,
      },
    })
    return NextResponse.json({ notice })
  } catch (err: any) {
    console.error('[vacate POST]', err?.message)
    return NextResponse.json({ error: 'Failed to create notice' }, { status: 500 })
  }
}

// PATCH /api/admin/vacate — update notice (approve, schedule inspection, complete)
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!['ADMIN', 'MANAGER'].includes(payload.role as string))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { noticeId, action, assessmentDate, actualVacateDate } = await request.json()
    if (!noticeId || !action)
      return NextResponse.json({ error: 'noticeId and action required' }, { status: 400 })

    const prisma = getPrismaForRequest(request)

    let data: any = {}
    if (action === 'approve') data = { status: 'APPROVED' }
    else if (action === 'schedule') data = { assessmentScheduled: true, assessmentDate: assessmentDate ? new Date(assessmentDate) : undefined }
    else if (action === 'complete') data = { status: 'COMPLETED', actualVacateDate: actualVacateDate ? new Date(actualVacateDate) : new Date() }
    else if (action === 'cancel') data = { status: 'CANCELLED' }
    else return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    const notice = await prisma.vacate_notices.update({ where: { id: noticeId }, data })
    return NextResponse.json({ notice })
  } catch (err: any) {
    console.error('[vacate PATCH]', err?.message)
    return NextResponse.json({ error: 'Failed to update notice' }, { status: 500 })
  }
}

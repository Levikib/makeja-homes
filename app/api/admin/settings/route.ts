import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getMasterPrisma } from '@/lib/get-prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/settings — returns current company profile
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (payload.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const companyId = payload.companyId as string
    if (!companyId) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

    const prisma = getMasterPrisma()
    const company = await prisma.companies.findUnique({
      where: { id: companyId },
      select: {
        id: true, name: true, email: true, phone: true,
        address: true, city: true, country: true,
        subscriptionTier: true, subscriptionStatus: true,
        trialEndsAt: true, subscriptionEndsAt: true, unitLimit: true,
        billingEmail: true, slug: true,
      },
    })
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    return NextResponse.json({ company })
  } catch (err: any) {
    console.error('[settings GET]', err?.message)
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }
}

// PATCH /api/admin/settings — update company profile
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (payload.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const companyId = payload.companyId as string
    if (!companyId) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

    const body = await request.json()
    const { name, phone, address, city, country, billingEmail } = body

    // Validate required fields
    if (!name?.trim()) return NextResponse.json({ error: 'Company name is required' }, { status: 400 })

    const prisma = getMasterPrisma()
    const updated = await prisma.companies.update({
      where: { id: companyId },
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        city: city?.trim() || null,
        country: country?.trim() || 'Kenya',
        billingEmail: billingEmail?.trim() || null,
      },
      select: {
        id: true, name: true, email: true, phone: true,
        address: true, city: true, country: true,
        subscriptionTier: true, subscriptionStatus: true,
        trialEndsAt: true, subscriptionEndsAt: true, unitLimit: true,
        billingEmail: true, slug: true,
      },
    })
    return NextResponse.json({ company: updated })
  } catch (err: any) {
    console.error('[settings PATCH]', err?.message)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getMasterPrisma } from '@/lib/get-prisma'

export const dynamic = 'force-dynamic'

function getSlugFromHost(host: string): string | null {
  const parts = host.split('.')
  if (parts.length >= 4) {
    const sub = parts[0].toLowerCase()
    if (!['www', 'app', 'api'].includes(sub) && /^[a-z0-9-]+$/.test(sub)) {
      return sub
    }
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ active: false, error: 'unauthenticated' }, { status: 401 })
    }

    const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)
    await jwtVerify(token, JWT_SECRET)

    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
    const slug = getSlugFromHost(host)

    if (!slug) {
      // Not on a tenant subdomain — no subscription check needed
      return NextResponse.json({ active: true })
    }

    const master = getMasterPrisma()
    const company = await master.companies.findFirst({
      where: { slug },
      select: {
        name: true,
        subscriptionStatus: true,
        subscriptionTier: true,
        trialEndsAt: true,
        subscriptionEndsAt: true,
        isActive: true,
      },
    })

    if (!company) {
      return NextResponse.json({ active: false, error: 'company_not_found' })
    }

    const now = new Date()
    const status = company.subscriptionStatus

    let active = false
    if (!company.isActive || status === 'SUSPENDED' || status === 'CANCELLED') {
      active = false
    } else if (status === 'ACTIVE') {
      // Paid subscription — check end date if present
      active = !company.subscriptionEndsAt || company.subscriptionEndsAt > now
    } else if (status === 'TRIAL') {
      active = !company.trialEndsAt || company.trialEndsAt > now
    } else {
      active = false
    }

    return NextResponse.json({
      active,
      companyName: company.name,
      subscriptionStatus: active ? status : (company.trialEndsAt && company.trialEndsAt < now && status === 'TRIAL' ? 'TRIAL_EXPIRED' : status),
      plan: company.subscriptionTier,
      trialEndsAt: company.trialEndsAt?.toISOString() ?? null,
      subscriptionEndsAt: company.subscriptionEndsAt?.toISOString() ?? null,
    })
  } catch (err: any) {
    console.error('[SUBSCRIPTION STATUS]', err?.message)
    return NextResponse.json({ active: false, error: 'error' }, { status: 500 })
  }
}

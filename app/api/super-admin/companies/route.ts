import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getMasterPrisma, buildTenantUrl } from '@/lib/get-prisma'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback-secret-min-32-characters-long!!'
  )
}

async function verifySuperAdmin(req: NextRequest): Promise<boolean> {
  // Header-based secret for server-to-server calls
  const headerSecret = req.headers.get('x-super-admin-secret')
  if (
    headerSecret &&
    (headerSecret === process.env.SUPER_ADMIN_PASSWORD ||
      headerSecret === process.env.SUPER_ADMIN_SECRET)
  ) {
    return true
  }

  // Cookie-based JWT (browser sessions)
  const token = req.cookies.get('super_admin_token')?.value
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    return payload.role === 'super_admin'
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// GET /api/super-admin/companies
// Returns all companies with subscription status and per-tenant unit/user counts.
// Auth: super_admin_token cookie OR x-super-admin-secret header.
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  if (!(await verifySuperAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const masterPrisma = getMasterPrisma()

  let companies: Record<string, unknown>[]
  try {
    // Use a plain findMany — select only fields we know exist;
    // extra subscription fields are accessed with optional chaining below.
    const rows = await masterPrisma.companies.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          where: { role: 'ADMIN' },
          select: { email: true, firstName: true, lastName: true },
          take: 1,
        },
        properties: {
          select: { id: true },
          where: { deletedAt: null },
        },
      },
    })

    companies = rows.map((c: any) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone ?? null,
      address: c.address ?? null,
      city: c.city ?? null,
      country: c.country,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      // Subscription fields — may not exist yet in schema
      slug: c.slug ?? null,
      subscriptionTier: c.subscriptionTier ?? null,
      subscriptionStatus: c.subscriptionStatus ?? null,
      trialEndsAt: c.trialEndsAt ?? null,
      subscriptionEndsAt: c.subscriptionEndsAt ?? null,
      currentPeriodStart: c.currentPeriodStart ?? null,
      currentPeriodEnd: c.currentPeriodEnd ?? null,
      unitLimit: c.unitLimit ?? null,
      billedAmount: c.billedAmount ?? null,
      lastBilledAt: c.lastBilledAt ?? null,
      billingEmail: c.billingEmail ?? null,
      provisionedAt: c.provisionedAt ?? null,
      adminUserId: c.adminUserId ?? null,
      // Computed
      adminEmail: c.users?.[0]?.email ?? c.email,
      adminName: c.users?.[0]
        ? `${c.users[0].firstName} ${c.users[0].lastName}`
        : null,
      propertiesCount: c.properties?.length ?? 0,
    }))
  } catch (err: any) {
    console.error('[super-admin/companies] fetch error:', err?.message)
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
  }

  // Enrich with per-tenant unit/user counts
  const enriched = await Promise.all(
    companies.map(async (company) => {
      const slug = (company.slug as string | null) ?? null

      if (!slug) {
        return { ...company, unitCount: null, userCount: null, tenantCount: null }
      }

      const schemaName = `tenant_${slug}`
      const tenantUrl = buildTenantUrl(schemaName)
      const tenantPrisma = new PrismaClient({
        datasources: { db: { url: tenantUrl } },
        log: [],
      })

      try {
        const [unitCount, userCount, tenantCount] = await Promise.all([
          tenantPrisma.units.count({ where: { deletedAt: null } }).catch(() => null),
          tenantPrisma.users.count({ where: { isActive: true } }).catch(() => null),
          tenantPrisma.tenants.count().catch(() => null),
        ])
        return { ...company, unitCount, userCount, tenantCount }
      } catch {
        return { ...company, unitCount: null, userCount: null, tenantCount: null }
      } finally {
        await tenantPrisma.$disconnect()
      }
    })
  )

  return NextResponse.json({
    success: true,
    total: enriched.length,
    companies: enriched,
  })
}

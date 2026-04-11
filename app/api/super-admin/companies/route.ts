import { NextRequest, NextResponse } from 'next/server'
import { getMasterPrisma } from '@/lib/get-prisma'
import { getSuperAdminSession } from '@/lib/super-admin-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/super-admin/companies
 *
 * Fast path: returns all companies from the master schema only.
 * No per-tenant schema connections — was the cause of slow loading.
 * Unit/user counts are omitted from the list; detail page fetches them.
 */
export async function GET(req: NextRequest) {
  const session = await getSuperAdminSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const master = getMasterPrisma()

  try {
    const rows = await master.$queryRaw<any[]>`
      SELECT
        c.id,
        c.name,
        c.email,
        c.phone,
        c.city,
        c.country,
        c."isActive",
        c."createdAt",
        c."updatedAt",
        c.slug,
        c."subscriptionTier",
        c."subscriptionStatus",
        c."trialEndsAt",
        c."subscriptionEndsAt",
        c."billedAmount",
        c."unitLimit",
        c."lastBilledAt",
        c."provisionedAt",
        -- Admin user email from master users table
        (SELECT u.email FROM users u WHERE u."companyId" = c.id AND u.role = 'ADMIN' LIMIT 1) as "adminEmail",
        (SELECT u."firstName" || ' ' || u."lastName" FROM users u WHERE u."companyId" = c.id AND u.role = 'ADMIN' LIMIT 1) as "adminName"
      FROM companies c
      ORDER BY c."createdAt" DESC
    `

    return NextResponse.json({
      success: true,
      total: rows.length,
      companies: rows,
    })
  } catch (err: any) {
    console.error('[super-admin/companies] error:', err?.message)
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
  } finally {
    await master.$disconnect()
  }
}

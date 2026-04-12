/**
 * POST /api/integrations/listings
 * Push a vacant unit to listing portals or remove a filled unit.
 *
 * Body:
 *   { action: 'push', unitId: string }
 *   { action: 'remove', unitId: string }
 *   { action: 'push-all-vacant' }     — push every currently vacant unit
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromRequest } from '@/lib/auth-helpers'
import { getIntegration } from '@/lib/integrations'
import {
  pushListingToPortals,
  removeListingFromPortals,
  buildUnitListing,
  type ListingPortalConfig,
} from '@/lib/integrations/listings'
import { getPrismaForRequest, resolveSchema } from '@/lib/get-prisma'

export const dynamic = 'force-dynamic'

async function getUnit(db: any, unitId: string) {
  const rows = await db.$queryRawUnsafe(`
    SELECT
      u.id, u.number, u.type, u.bedrooms, u.bathrooms, u.size,
      u."rentAmount", u.status,
      p.id as "propertyId", p.name as "propertyName", p.address as "propertyAddress",
      p.city as "propertyCity",
      c.phone as "contactPhone", c.email as "contactEmail"
    FROM units u
    JOIN properties p ON p.id = u."propertyId"
    JOIN companies c ON c.id = p."companyId"
    WHERE u.id = $1
    LIMIT 1
  `, unitId) as any[]
  return rows[0] ?? null
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const slug = resolveSchema(req).replace('tenant_', '')
  const config = await getIntegration(slug, 'listings')
  if (!config?.enabled) {
    return NextResponse.json({ error: 'Listings integration is not enabled' }, { status: 400 })
  }

  const portalConfig = config.settings as ListingPortalConfig
  const db = getPrismaForRequest(req)
  const body = await req.json()
  const { action, unitId } = body

  // ── Push single unit
  if (action === 'push') {
    if (!unitId) return NextResponse.json({ error: 'unitId is required' }, { status: 400 })
    const unit = await getUnit(db, unitId)
    if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })

    const listing = buildUnitListing({
      unitId: unit.id,
      unitNumber: unit.number,
      unitType: unit.type,
      bedrooms: unit.bedrooms ?? 1,
      bathrooms: unit.bathrooms ?? 1,
      sizeSqm: unit.size,
      rentAmount: unit.rentAmount,
      propertyName: unit.propertyName,
      propertyAddress: unit.propertyAddress,
      propertyCity: unit.propertyCity,
      contactPhone: unit.contactPhone,
      contactEmail: unit.contactEmail,
    })

    const results = await pushListingToPortals(portalConfig, listing)
    return NextResponse.json({ success: true, results })
  }

  // ── Remove listing
  if (action === 'remove') {
    if (!unitId) return NextResponse.json({ error: 'unitId is required' }, { status: 400 })
    await removeListingFromPortals(portalConfig, unitId)
    return NextResponse.json({ success: true, message: 'Listing removed from all portals' })
  }

  // ── Push all vacant units
  if (action === 'push-all-vacant') {
    const vacantUnits = await db.$queryRawUnsafe<any[]>(`
      SELECT
        u.id, u.number, u.type, u.bedrooms, u.bathrooms, u.size,
        u."rentAmount",
        p.name as "propertyName", p.address as "propertyAddress", p.city as "propertyCity",
        c.phone as "contactPhone", c.email as "contactEmail"
      FROM units u
      JOIN properties p ON p.id = u."propertyId"
      JOIN companies c ON c.id = p."companyId"
      WHERE u.status = 'VACANT'
        AND p."deletedAt" IS NULL
      ORDER BY p.name, u.number
    `)

    const pushResults = await Promise.allSettled(
      vacantUnits.map(unit =>
        pushListingToPortals(portalConfig, buildUnitListing({
          unitId: unit.id,
          unitNumber: unit.number,
          unitType: unit.type,
          bedrooms: unit.bedrooms ?? 1,
          bathrooms: unit.bathrooms ?? 1,
          sizeSqm: unit.size,
          rentAmount: unit.rentAmount,
          propertyName: unit.propertyName,
          propertyAddress: unit.propertyAddress,
          propertyCity: unit.propertyCity,
          contactPhone: unit.contactPhone,
          contactEmail: unit.contactEmail,
        }))
      )
    )

    const pushed = pushResults.filter(r => r.status === 'fulfilled').length
    const failed = pushResults.filter(r => r.status === 'rejected').length
    return NextResponse.json({ success: true, total: vacantUnits.length, pushed, failed })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

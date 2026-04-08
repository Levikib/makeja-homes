import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getPrismaForRequest } from '@/lib/get-prisma'
import { nanoid } from 'nanoid'

export const dynamic = 'force-dynamic'

const SELF_HEAL = `
  CREATE TABLE IF NOT EXISTS damage_assessments (
    id TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "assessedBy" TEXT,
    "assessmentDate" TIMESTAMP DEFAULT NOW(),
    "totalDamageCost" DOUBLE PRECISION DEFAULT 0,
    notes TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS damage_items (
    id TEXT PRIMARY KEY,
    "assessmentId" TEXT NOT NULL,
    description TEXT NOT NULL,
    "damageType" TEXT DEFAULT 'OTHER',
    "estimatedCost" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT NOW()
  );
`

// POST /api/admin/deposits/assessment
// Body: { tenantId, items: [{description, damageType, estimatedCost}], notes }
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!['ADMIN', 'MANAGER'].includes(payload.role as string))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { tenantId, items, notes } = await request.json()
    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: 'items array required' }, { status: 400 })

    const db = getPrismaForRequest(request)
    await db.$executeRawUnsafe(SELF_HEAL)

    const assessmentId = `asmt_${nanoid(10)}`
    const now = new Date().toISOString()

    // Insert assessment record
    await db.$executeRawUnsafe(
      `INSERT INTO damage_assessments (id, "tenantId", "assessedBy", "assessmentDate", "totalDamageCost", notes, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, NOW(), 0, $4, NOW(), NOW())`,
      assessmentId,
      tenantId,
      payload.id as string,
      notes ?? null
    )

    // Insert each damage item
    const insertedItems: any[] = []
    for (const item of items) {
      const itemId = `dmg_${nanoid(10)}`
      const cost = Number(item.estimatedCost ?? 0)
      const damageType = item.damageType ?? 'OTHER'
      const description = item.description ?? ''
      await db.$executeRawUnsafe(
        `INSERT INTO damage_items (id, "assessmentId", description, "damageType", "estimatedCost", "createdAt")
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        itemId,
        assessmentId,
        description,
        damageType,
        cost
      )
      insertedItems.push({ id: itemId, assessmentId, description, damageType, estimatedCost: cost })
    }

    // Calculate total and update assessment
    const total = insertedItems.reduce((s, i) => s + i.estimatedCost, 0)
    await db.$executeRawUnsafe(
      `UPDATE damage_assessments SET "totalDamageCost" = $1, "updatedAt" = NOW() WHERE id = $2`,
      total,
      assessmentId
    )

    return NextResponse.json({
      assessment: {
        id: assessmentId,
        tenantId,
        assessedBy: payload.id,
        assessmentDate: now,
        totalDamageCost: total,
        notes: notes ?? null,
        damage_items: insertedItems,
      },
    })
  } catch (err: any) {
    console.error('[deposits/assessment POST]', err?.message)
    return NextResponse.json({ error: 'Failed to save assessment' }, { status: 500 })
  }
}

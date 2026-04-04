import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getPrismaForRequest } from '@/lib/get-prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/maintenance/materials?maintenanceId=...
// Returns inventory items relevant to the maintenance request category,
// sorted by relevance. Used to suggest materials when completing a request.

const CATEGORY_MATERIAL_KEYWORDS: Record<string, string[]> = {
  PLUMBING: ['pipe', 'tap', 'valve', 'washer', 'sealant', 'plumbing', 'fitting', 'hose'],
  ELECTRICAL: ['bulb', 'cable', 'wire', 'socket', 'switch', 'fuse', 'breaker', 'conduit', 'electrical'],
  PAINTING: ['paint', 'primer', 'brush', 'roller', 'sandpaper', 'filler', 'putty'],
  CARPENTRY: ['wood', 'nail', 'screw', 'hinge', 'door', 'lock', 'handle', 'timber', 'board'],
  CLEANING: ['detergent', 'bleach', 'mop', 'broom', 'bucket', 'cloth', 'cleaning'],
  GENERAL: [],
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!['ADMIN', 'MANAGER', 'CARETAKER', 'TECHNICAL', 'STOREKEEPER'].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const maintenanceId = searchParams.get('maintenanceId')

    const prisma = getPrismaForRequest(request)

    let categoryKeywords: string[] = []
    if (maintenanceId) {
      const maintenance = await prisma.maintenance_requests.findUnique({
        where: { id: maintenanceId },
        select: { category: true, title: true },
      })
      if (maintenance?.category) {
        categoryKeywords = CATEGORY_MATERIAL_KEYWORDS[maintenance.category.toUpperCase()] ?? []
      }
    }

    const items = await prisma.inventory_items.findMany({
      where: { deletedAt: null },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })

    // Score items by relevance to maintenance category
    const scored = items.map((item) => {
      const nameLower = item.name.toLowerCase()
      const catLower = (item.category ?? '').toLowerCase()
      let score = 0
      for (const kw of categoryKeywords) {
        if (nameLower.includes(kw) || catLower.includes(kw)) score += 2
      }
      // Penalise out-of-stock
      if (item.quantity === 0) score -= 10
      if (item.quantity <= item.minimumQuantity) score -= 5

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        sku: item.sku,
        quantity: item.quantity,
        minimumQuantity: item.minimumQuantity,
        unitOfMeasure: item.unitOfMeasure,
        unitCost: Number(item.unitCost),
        location: item.location,
        isLowStock: item.quantity <= item.minimumQuantity,
        isOutOfStock: item.quantity === 0,
        relevanceScore: score,
      }
    })

    scored.sort((a, b) => b.relevanceScore - a.relevanceScore)

    return NextResponse.json({ items: scored })
  } catch (err: any) {
    console.error('[MAINTENANCE MATERIALS]', err?.message)
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 })
  }
}

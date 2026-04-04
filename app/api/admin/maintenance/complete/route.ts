import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getPrismaForRequest } from '@/lib/get-prisma'

export const dynamic = 'force-dynamic'

// POST /api/admin/maintenance/complete
// body: { maintenanceId, actualCost, completionNotes, materialsUsed: [{ inventoryItemId, quantity }], contractorPayment?: number, isResidentContractor?: boolean }
// 1. Marks maintenance request COMPLETED
// 2. Deducts materials from inventory + creates inventory_movements
// 3. Creates expense record for actual cost
// 4. If any material is now below minimumQuantity → creates draft purchase order

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!['ADMIN', 'MANAGER', 'CARETAKER', 'TECHNICAL'].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      maintenanceId,
      actualCost,
      completionNotes,
      materialsUsed = [],  // [{ inventoryItemId, quantity, notes? }]
      contractorPayment,   // amount paid to external contractor
      isResidentContractor = true,
    } = body

    if (!maintenanceId) return NextResponse.json({ error: 'maintenanceId required' }, { status: 400 })

    const prisma = getPrismaForRequest(request)

    const maintenance = await prisma.maintenance_requests.findUnique({
      where: { id: maintenanceId },
      include: { units: { include: { properties: true } } },
    })
    if (!maintenance) return NextResponse.json({ error: 'Maintenance request not found' }, { status: 404 })

    const lowStockAlerts: { itemId: string; itemName: string; currentQty: number; minQty: number }[] = []
    const rand = () => Math.random().toString(36).slice(2, 8)

    await prisma.$transaction(async (tx) => {
      // 1. Mark maintenance COMPLETED
      await tx.maintenance_requests.update({
        where: { id: maintenanceId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          actualCost: actualCost ? Number(actualCost) : null,
          completionNotes: completionNotes ?? null,
        },
      })

      // 2. Deduct materials from inventory
      for (const mat of materialsUsed) {
        const item = await tx.inventory_items.findFirst({
          where: { id: mat.inventoryItemId, deletedAt: null },
        })
        if (!item) continue

        const newQty = Math.max(0, item.quantity - mat.quantity)
        const newTotalValue = newQty * Number(item.unitCost)

        await tx.inventory_items.update({
          where: { id: item.id },
          data: { quantity: newQty, totalValue: newTotalValue, updatedAt: new Date() },
        })

        await tx.inventory_movements.create({
          data: {
            id: `imov_${Date.now()}_${rand()}`,
            inventoryItemId: item.id,
            type: 'OUT',
            quantity: mat.quantity,
            reason: `Maintenance: ${maintenance.title} (#${maintenance.requestNumber})`,
            referenceNumber: maintenance.requestNumber,
            notes: mat.notes ?? null,
            performedById: payload.id as string,
          },
        })

        // Check for low stock
        if (newQty <= item.minimumQuantity) {
          lowStockAlerts.push({
            itemId: item.id,
            itemName: item.name,
            currentQty: newQty,
            minQty: item.minimumQuantity,
          })
        }
      }

      // 3. Record expense if actualCost provided
      if (actualCost && Number(actualCost) > 0) {
        await tx.expenses.create({
          data: {
            id: `exp_${Date.now()}_${rand()}`,
            description: `Maintenance: ${maintenance.title} (${maintenance.requestNumber})`,
            amount: Number(actualCost),
            category: 'MAINTENANCE',
            propertyId: maintenance.units.propertyId,
            paymentMethod: 'CASH',
            date: new Date(),
          },
        })
      }

      // 4. Auto-create draft purchase orders for low-stock items
      for (const alert of lowStockAlerts) {
        const item = await tx.inventory_items.findUnique({ where: { id: alert.itemId } })
        if (!item) continue

        const reorderQty = Math.max(item.minimumQuantity * 2, 10)
        const orderNumber = `PO-AUTO-${Date.now()}-${rand()}`
        const unitCost = Number(item.unitCost)
        const totalCost = reorderQty * unitCost

        await tx.purchase_orders.create({
          data: {
            id: `po_${Date.now()}_${rand()}`,
            orderNumber,
            supplier: item.supplier ?? 'TBD',
            propertyId: maintenance.units.propertyId,
            status: 'DRAFT',
            orderDate: new Date(),
            notes: `Auto-generated: ${item.name} stock dropped to ${alert.currentQty} (min: ${alert.minQty}). Triggered by maintenance request ${maintenance.requestNumber}.`,
            totalAmount: totalCost,
            purchase_order_items: {
              create: [{
                id: `poi_${Date.now()}_${rand()}`,
                itemName: item.name,
                quantity: reorderQty,
                unitCost,
                totalCost,
              }],
            },
          },
        })
      }
    })

    return NextResponse.json({
      success: true,
      maintenanceId,
      materialsDeducted: materialsUsed.length,
      lowStockAlerts,
      purchaseOrdersCreated: lowStockAlerts.length,
    })
  } catch (err: any) {
    console.error('[MAINTENANCE COMPLETE]', err?.message)
    return NextResponse.json({ error: 'Failed to complete maintenance request' }, { status: 500 })
  }
}

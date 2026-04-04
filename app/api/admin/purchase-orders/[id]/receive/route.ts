import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getPrismaForRequest } from '@/lib/get-prisma'

export const dynamic = 'force-dynamic'

// POST /api/admin/purchase-orders/[id]/receive
// Marks a PO as RECEIVED, increments inventory, and records the expense.
// body: { receivedItems: [{ itemName, quantity, inventoryItemId? }], notes? }

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!['ADMIN', 'MANAGER', 'STOREKEEPER'].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { receivedItems = [], notes } = body
    const rand = () => Math.random().toString(36).slice(2, 8)

    const prisma = getPrismaForRequest(request)

    const po = await prisma.purchase_orders.findUnique({
      where: { id: params.id },
      include: { purchase_order_items: true },
    })
    if (!po) return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    if (po.status === 'RECEIVED') return NextResponse.json({ error: 'PO already received' }, { status: 400 })

    const inventoryUpdates: string[] = []

    await prisma.$transaction(async (tx) => {
      // Mark PO as RECEIVED
      await tx.purchase_orders.update({
        where: { id: params.id },
        data: {
          status: 'RECEIVED',
          receivedDate: new Date(),
          notes: notes ? `${po.notes ?? ''}\n\nReceived: ${notes}`.trim() : po.notes,
        },
      })

      // Update inventory for each item received
      for (const poItem of po.purchase_order_items) {
        // Find matching inventory item by name (case-insensitive)
        const invItem = await tx.inventory_items.findFirst({
          where: {
            deletedAt: null,
            name: { contains: poItem.itemName, mode: 'insensitive' },
          },
        })

        if (invItem) {
          const receivedQty = Number(poItem.quantity)
          const newQty = invItem.quantity + receivedQty
          const newTotalValue = newQty * Number(invItem.unitCost)

          await tx.inventory_items.update({
            where: { id: invItem.id },
            data: { quantity: newQty, totalValue: newTotalValue, updatedAt: new Date() },
          })

          await tx.inventory_movements.create({
            data: {
              id: `imov_${Date.now()}_${rand()}`,
              inventoryItemId: invItem.id,
              type: 'IN',
              quantity: receivedQty,
              reason: `Purchase Order received: ${po.orderNumber}`,
              referenceNumber: po.orderNumber,
              notes: `Supplier: ${po.supplier}`,
              performedById: payload.id as string,
            },
          })

          inventoryUpdates.push(invItem.name)
        }
      }

      // Record as expense
      await tx.expenses.create({
        data: {
          id: `exp_${Date.now()}_${rand()}`,
          description: `Purchase Order ${po.orderNumber} — ${po.supplier}`,
          amount: Number(po.totalAmount),
          category: 'SUPPLIES',
          propertyId: po.propertyId,
          paymentMethod: 'BANK_TRANSFER',
          date: new Date(),
        },
      })
    })

    return NextResponse.json({
      success: true,
      orderId: params.id,
      orderNumber: po.orderNumber,
      inventoryUpdated: inventoryUpdates,
      totalAmount: Number(po.totalAmount),
    })
  } catch (err: any) {
    console.error('[PO RECEIVE]', err?.message)
    return NextResponse.json({ error: 'Failed to receive purchase order' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { z } from "zod";

const adjustmentSchema = z.object({
  type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  quantity: z.number().int(),
  reason: z.string().min(1, "Reason is required"),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;

    if (!["ADMIN", "STOREKEEPER", "TECHNICAL"].includes(payload.role as string)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = adjustmentSchema.parse(body);

    const db = getPrismaForRequest(request);

    // Get current item
    const itemRows = await db.$queryRawUnsafe<any[]>(`
      SELECT id, name, quantity, "unitCost", "unitOfMeasure", "totalValue"
      FROM inventory_items
      WHERE id = $1 AND "deletedAt" IS NULL
      LIMIT 1
    `, params.id);

    if (itemRows.length === 0) {
      return NextResponse.json({ success: false, error: "Inventory item not found" }, { status: 404 });
    }
    const item = itemRows[0];

    // Calculate new quantity
    let newQuantity = Number(item.quantity);
    let actualQuantityChange = validatedData.quantity;

    if (validatedData.type === "IN") {
      newQuantity += validatedData.quantity;
    } else if (validatedData.type === "OUT") {
      if (Number(item.quantity) < validatedData.quantity) {
        return NextResponse.json({
          success: false,
          error: `Insufficient stock. Current quantity: ${item.quantity}`,
        }, { status: 400 });
      }
      newQuantity -= validatedData.quantity;
      actualQuantityChange = -validatedData.quantity;
    } else {
      // ADJUSTMENT - set to exact quantity
      actualQuantityChange = validatedData.quantity - Number(item.quantity);
      newQuantity = validatedData.quantity;
    }

    const now = new Date();
    const newTotalValue = newQuantity * Number(item.unitCost);
    const movementId = crypto.randomUUID();

    // Create movement record
    await db.$executeRawUnsafe(`
      INSERT INTO inventory_movements (
        id, "inventoryItemId", type, quantity, reason, "referenceNumber", notes, "performedById", "createdAt"
      ) VALUES (
        $1, $2, $3::"MovementType", $4, $5, $6, $7, $8, $9
      )
    `, movementId, item.id, validatedData.type, actualQuantityChange,
       validatedData.reason, validatedData.referenceNumber || null,
       validatedData.notes || null, userId, now);

    // Update item quantity and value
    await db.$executeRawUnsafe(`
      UPDATE inventory_items
      SET quantity = $1, "totalValue" = $2, "updatedAt" = $3
      WHERE id = $4
    `, newQuantity, newTotalValue, now, params.id);

    // Log activity
    const logId = crypto.randomUUID();
    await db.$executeRawUnsafe(`
      INSERT INTO activity_logs (id, "userId", action, "entityType", "entityId", details, "createdAt")
      VALUES ($1, $2, 'UPDATE', 'InventoryItem', $3, $4, $5)
    `, logId, userId, item.id,
       `${validatedData.type} - ${Math.abs(actualQuantityChange)} ${item.unitOfMeasure} of ${item.name}. Reason: ${validatedData.reason}`,
       now);

    return NextResponse.json({
      success: true,
      data: {
        movement: { id: movementId, type: validatedData.type, quantity: actualQuantityChange },
        item: { id: item.id, quantity: newQuantity, totalValue: newTotalValue },
      },
      message: "Inventory adjusted successfully",
    });
  } catch (error: any) {
    console.error("Error adjusting inventory:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Validation error", details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: error.message || "Failed to adjust inventory" }, { status: 500 });
  }
}

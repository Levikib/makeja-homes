import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    if (!["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { id, propertyIds, name, description, category, amount, frequency, billingDay, appliesTo, specificUnits, unitTypes } = body;

    if (!id) return NextResponse.json({ error: "Charge ID is required" }, { status: 400 });
    if (!propertyIds || propertyIds.length === 0) {
      return NextResponse.json({ error: "At least one property must be selected" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);

    await db.$executeRawUnsafe(`
      UPDATE recurring_charges SET
        "propertyIds" = $1::jsonb,
        name = $2,
        description = $3,
        category = $4,
        amount = $5,
        frequency = $6,
        "billingDay" = $7,
        "appliesTo" = $8,
        "specificUnits" = $9::jsonb,
        "unitTypes" = $10::jsonb,
        "updatedAt" = NOW()
      WHERE id = $11
    `,
      JSON.stringify(propertyIds),
      name,
      description || null,
      category,
      parseFloat(amount),
      frequency,
      parseInt(billingDay) || 1,
      appliesTo || "ALL_UNITS",
      JSON.stringify(specificUnits || []),
      JSON.stringify(unitTypes || []),
      id
    );

    return NextResponse.json({ success: true, message: "Recurring charge updated successfully" });
  } catch (error: any) {
    console.error("❌ Error updating recurring charge:", error);
    return NextResponse.json({ error: "Failed to update recurring charge" }, { status: 500 });
  }
}

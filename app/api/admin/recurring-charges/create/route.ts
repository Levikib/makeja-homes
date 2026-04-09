import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;
    const role = payload.role as string;

    if (!["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { propertyIds, name, description, category, amount, frequency, billingDay, appliesTo, specificUnits, unitTypes } = body;

    if (!propertyIds || propertyIds.length === 0 || !name || !category || amount === undefined || !frequency) {
      return NextResponse.json({ error: "Missing required fields. At least one property must be selected." }, { status: 400 });
    }
    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);
    const chargeId = `charge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS recurring_charges (
        id TEXT PRIMARY KEY,
        "propertyIds" JSONB NOT NULL DEFAULT '[]',
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        frequency TEXT NOT NULL DEFAULT 'MONTHLY',
        "billingDay" INTEGER NOT NULL DEFAULT 1,
        "appliesTo" TEXT NOT NULL DEFAULT 'ALL_UNITS',
        "specificUnits" JSONB NOT NULL DEFAULT '[]',
        "unitTypes" JSONB NOT NULL DEFAULT '[]',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdBy" TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).catch(() => {});

    await db.$executeRawUnsafe(`
      INSERT INTO recurring_charges (id, "propertyIds", name, description, category, amount, frequency, "billingDay", "appliesTo", "specificUnits", "unitTypes", "isActive", "createdBy")
      VALUES ($1, $2::jsonb, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, true, $12)
    `,
      chargeId,
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
      userId
    );

    return NextResponse.json({ success: true, message: "Recurring charge created successfully", charge: { id: chargeId } });
  } catch (error: any) {
    console.error("❌ Error creating recurring charge:", error);
    return NextResponse.json({ error: "Failed to create recurring charge" }, { status: 500 });
  }
}

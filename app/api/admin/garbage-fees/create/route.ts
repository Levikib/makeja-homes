import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    if (role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { tenantId, amount, month } = body;

    if (!tenantId || !amount || !month) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);

    // Get tenant's unitId
    const tenantRows = await db.$queryRawUnsafe<any[]>(`
      SELECT "unitId" FROM tenants WHERE id = $1 LIMIT 1
    `, tenantId);

    if (tenantRows.length === 0) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const unitId = tenantRows[0].unitId;

    const monthDate = new Date(month);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
    const now = new Date();

    // Check if fee already exists for this tenant and month
    const existingFee = await db.$queryRawUnsafe<any[]>(`
      SELECT id FROM garbage_fees
      WHERE "tenantId" = $1 AND month >= $2 AND month < $3
      LIMIT 1
    `, tenantId, monthStart, monthEnd);

    if (existingFee.length > 0) {
      await db.$executeRawUnsafe(`
        UPDATE garbage_fees SET amount = $1, "updatedAt" = $2 WHERE id = $3
      `, amount, now, existingFee[0].id);

      return NextResponse.json({ success: true, message: "Garbage fee updated successfully", garbageFee: { id: existingFee[0].id, tenantId, amount, month: monthStart } });
    } else {
      const feeId = `garbage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.$executeRawUnsafe(`
        INSERT INTO garbage_fees (id, "tenantId", "unitId", amount, month, "isApplicable", status, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, true, 'PENDING'::"GarbageFeeStatus", $6, $6)
      `, feeId, tenantId, unitId, amount, monthStart, now);

      return NextResponse.json({ success: true, message: "Garbage fee created successfully", garbageFee: { id: feeId, tenantId, amount, month: monthStart } });
    }
  } catch (error: any) {
    console.error("❌ Error saving garbage fee:", error);
    return NextResponse.json({ error: "Failed to save garbage fee" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);

    const body = await request.json();
    const { tenantId, month, year, type } = body;

    const db = getPrismaForRequest(request);

    if (type === "water") {
      const tenantRows = await db.$queryRawUnsafe<any[]>(
        `SELECT "unitId" FROM tenants WHERE id = $1 LIMIT 1`, tenantId
      );
      if (!tenantRows.length) return NextResponse.json({ exists: false });

      const unitId = tenantRows[0].unitId;
      const rows = await db.$queryRawUnsafe<any[]>(
        `SELECT id FROM water_readings WHERE "unitId" = $1 AND month = $2 AND year = $3 LIMIT 1`,
        unitId, month, year
      );
      return NextResponse.json({ exists: rows.length > 0, reading: rows[0] ?? null });

    } else if (type === "garbage") {
      const monthDate = new Date(year, month - 1, 1);
      const rows = await db.$queryRawUnsafe<any[]>(
        `SELECT id FROM garbage_fees WHERE "tenantId" = $1 AND month = $2 LIMIT 1`,
        tenantId, monthDate
      );
      return NextResponse.json({ exists: rows.length > 0, fee: rows[0] ?? null });
    }

    return NextResponse.json({ exists: false });
  } catch (error: any) {
    console.error("❌ Error checking existing reading:", error);
    return NextResponse.json({ error: "Failed to check" }, { status: 500 });
  }
}

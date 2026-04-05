import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForTenant } from "@/lib/prisma";

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);

    const body = await request.json();
    const { tenantId, month, year, type } = body;

    if (type === "water") {
      // Get tenant's unitId first
      const tenant = await getPrismaForTenant(request).tenants.findUnique({
        where: { id: tenantId },
        select: { unitId: true },
      });

      if (!tenant) {
        return NextResponse.json({ exists: false });
      }

      // ✅ FIX: Check by unitId, month, year (matches constraint)
      const existing = await getPrismaForTenant(request).water_readings.findFirst({
        where: { 
          unitId: tenant.unitId,  // ✅ FIXED
          month, 
          year 
        },
      });
      return NextResponse.json({ exists: !!existing, reading: existing });
    } else if (type === "garbage") {
      const existing = await getPrismaForTenant(request).garbage_fees.findFirst({
        where: { tenantId, month: new Date(year, month - 1, 1) },
      });
      return NextResponse.json({ exists: !!existing, fee: existing });
    }

    return NextResponse.json({ exists: false });
  } catch (error: any) {
    console.error("❌ Error checking existing reading:", error);
    return NextResponse.json({ error: "Failed to check" }, { status: 500 });
  }
}

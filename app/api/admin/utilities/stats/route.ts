import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);

    const db = getPrismaForRequest(request);

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear  = currentDate.getFullYear();
    const isAfter5th   = currentDate.getDate() > 5;
    const checkMonth   = isAfter5th ? (currentMonth === 1 ? 12 : currentMonth - 1) : currentMonth;
    const checkYear    = isAfter5th && currentMonth === 1 ? currentYear - 1 : currentYear;

    const activeTenants = await db.$queryRawUnsafe<{ id: string; unitId: string }[]>(
      `SELECT id, "unitId" FROM tenants WHERE status = 'ACTIVE' OR status IS NULL`
    );
    const totalActiveTenants = activeTenants.length;
    const allTenantIds = activeTenants.map(t => t.id);

    const currentWater = await db.$queryRawUnsafe<{ tenantId: string }[]>(
      `SELECT "tenantId" FROM water_readings WHERE month = $1 AND year = $2`,
      currentMonth, currentYear
    );
    const currentMonthTenantIds = new Set(currentWater.map(r => r.tenantId));

    const checkWater = await db.$queryRawUnsafe<{ tenantId: string }[]>(
      `SELECT "tenantId" FROM water_readings WHERE month = $1 AND year = $2`,
      checkMonth, checkYear
    );
    const checkMonthTenantIds = new Set(checkWater.map(r => r.tenantId));

    const garbageMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const currentGarbage = await db.$queryRawUnsafe<{ tenantId: string }[]>(
      `SELECT "tenantId" FROM garbage_fees WHERE month = $1`,
      garbageMonthDate
    );

    const waterRecordedThisMonth  = currentWater.length;
    const garbageRecordedThisMonth = currentGarbage.length;
    const pendingTenantIds  = allTenantIds.filter(id => !currentMonthTenantIds.has(id));
    const waterPending      = pendingTenantIds.length;
    const garbagePending    = Math.max(0, totalActiveTenants - garbageRecordedThisMonth);
    const overdueTenantIds  = allTenantIds.filter(id => !checkMonthTenantIds.has(id));
    const waterOverdue      = isAfter5th ? overdueTenantIds.length : 0;

    let overdueTenantsDetails: any[] = [];
    if (waterOverdue > 0 && overdueTenantIds.length > 0) {
      const ids = overdueTenantIds.slice(0, 10);
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
      overdueTenantsDetails = await db.$queryRawUnsafe<any[]>(`
        SELECT t.id, u."firstName", u."lastName", un."unitNumber", p.name AS "propertyName"
        FROM tenants t
        LEFT JOIN users u ON u.id = t."userId"
        LEFT JOIN units un ON un.id = t."unitId"
        LEFT JOIN properties p ON p.id = un."propertyId"
        WHERE t.id IN (${placeholders})
      `, ...ids);
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalActiveTenants,
        water: { recorded: waterRecordedThisMonth, pending: waterPending, overdue: waterOverdue, pendingTenantIds, overdueTenantIds },
        garbage: { recorded: garbageRecordedThisMonth, pending: garbagePending },
        currentPeriod: { month: currentMonth, year: currentYear },
        checkPeriod: { month: checkMonth, year: checkYear },
        overdueTenantsDetails,
        isAfter5th,
      },
    });
  } catch (error: any) {
    console.error("❌ Stats API Error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}

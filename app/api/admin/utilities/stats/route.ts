import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    const isAfter5th = currentDate.getDate() > 5;
    const checkMonth = isAfter5th ? (currentMonth === 1 ? 12 : currentMonth - 1) : currentMonth;
    const checkYear = isAfter5th && currentMonth === 1 ? currentYear - 1 : currentYear;

    console.log("📊 Stats API - Current period:", { currentMonth, currentYear });
    console.log("📊 Stats API - Check period:", { checkMonth, checkYear, isAfter5th });

    // Get ALL active tenants
    const activeTenants = await prisma.tenants.findMany({
      select: {
        id: true,
        unitId: true,
      },
    });

    const totalActiveTenants = activeTenants.length;
    const allTenantIds = activeTenants.map(t => t.id);

    // Get water readings for current month
    const currentMonthWaterReadings = await prisma.water_readings.findMany({
      where: { month: currentMonth, year: currentYear },
      select: { tenantId: true },
    });
    const currentMonthTenantIds = currentMonthWaterReadings.map(r => r.tenantId);

    // Get water readings for check month
    const checkMonthWaterReadings = await prisma.water_readings.findMany({
      where: { month: checkMonth, year: checkYear },
      select: { tenantId: true },
    });
    const checkMonthTenantIds = new Set(checkMonthWaterReadings.map(r => r.tenantId));

    // Get garbage fees for current month
    const currentMonthGarbageFees = await prisma.garbage_fees.findMany({
      where: { month: new Date(currentYear, currentMonth - 1, 1) },
      select: { tenantId: true },
    });

    const waterRecordedThisMonth = currentMonthWaterReadings.length;
    const garbageRecordedThisMonth = currentMonthGarbageFees.length;

    // Calculate pending (no reading this month)
    const pendingTenantIds = allTenantIds.filter(id => !currentMonthTenantIds.includes(id));
    const waterPending = pendingTenantIds.length;
    const garbagePending = Math.max(0, totalActiveTenants - garbageRecordedThisMonth);

    // Calculate overdue (no reading for check month)
    const overdueTenantIds = activeTenants
      .filter(t => !checkMonthTenantIds.has(t.id))
      .map(t => t.id);
    const waterOverdue = isAfter5th ? overdueTenantIds.length : 0;

    // Get detailed overdue tenant info
    let overdueTenantsDetails = [];
    if (waterOverdue > 0 && overdueTenantIds.length > 0) {
      try {
        overdueTenantsDetails = await prisma.tenants.findMany({
          where: { id: { in: overdueTenantIds.slice(0, 10) } },
          select: {
            id: true,
            users: { select: { firstName: true, lastName: true } },
            units: { 
              select: { 
                unitNumber: true, 
                properties: { select: { name: true } } 
              } 
            },
          },
        });
      } catch (error) {
        console.error("❌ Error fetching overdue details:", error);
      }
    }

    const response = {
      success: true,
      stats: {
        totalActiveTenants,
        water: { 
          recorded: waterRecordedThisMonth, 
          pending: waterPending, 
          overdue: waterOverdue,
          pendingTenantIds,
          overdueTenantIds,
        },
        garbage: { 
          recorded: garbageRecordedThisMonth, 
          pending: garbagePending 
        },
        currentPeriod: { month: currentMonth, year: currentYear },
        checkPeriod: { month: checkMonth, year: checkYear },
        overdueTenantsDetails,
        isAfter5th,
      },
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error("❌ Stats API Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch stats", 
        details: error.message,
      }, 
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;
    const role = payload.role as string;

    if (role !== "TENANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getPrismaForRequest(request);

    // Get tenant + unit + property in one raw query
    const tenantRows = await db.$queryRawUnsafe<any[]>(`
      SELECT
        t.id as "tenantId",
        t."unitId",
        t."leaseStartDate",
        t."leaseEndDate",
        t."rentAmount",
        t."depositAmount",
        u."firstName",
        u."lastName",
        u.email,
        u."phoneNumber",
        un."unitNumber",
        un.status::text as "unitStatus",
        p.name as "propertyName",
        p.address as "propertyAddress",
        p.city as "propertyCity"
      FROM tenants t
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE t."userId" = $1
      LIMIT 1
    `, userId);

    if (!tenantRows.length) {
      return NextResponse.json({ error: "Tenant record not found" }, { status: 404 });
    }

    const t = tenantRows[0];
    const tenantId = t.tenantId;

    // Lease calculations
    const now = new Date();
    const leaseStart = new Date(t.leaseStartDate);
    const leaseEnd = new Date(t.leaseEndDate);
    const totalDays = Math.ceil((leaseEnd.getTime() - leaseStart.getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.ceil((leaseEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const remainingMonths = Math.floor(remainingDays / 30);

    let leaseStatus = "Active";
    if (now < leaseStart) leaseStatus = "Upcoming";
    else if (now > leaseEnd) leaseStatus = "Expired";
    else if (remainingDays <= 30) leaseStatus = "Expiring Soon";

    // Payment stats
    let totalPaid = 0, totalPending = 0, paidCount = 0, pendingCount = 0;
    let latestPayment: any = null;
    try {
      const payments = await db.$queryRawUnsafe<any[]>(`
        SELECT amount, status::text, "verificationStatus"::text, "createdAt", "paidAt"
        FROM payments WHERE "tenantId" = $1
        ORDER BY "createdAt" DESC
      `, tenantId);

      for (const p of payments) {
        if (p.status === "COMPLETED" && p.verificationStatus === "APPROVED") {
          totalPaid += Number(p.amount);
          paidCount++;
        } else if (p.status === "PENDING") {
          totalPending += Number(p.amount);
          pendingCount++;
        }
      }
      if (payments.length > 0) latestPayment = payments[0];
    } catch {}

    // Maintenance stats
    let maintenancePending = 0, maintenanceTotal = 0;
    try {
      const maint = await db.$queryRawUnsafe<any[]>(`
        SELECT status::text FROM maintenance_requests WHERE "unitId" = $1
      `, t.unitId);
      maintenanceTotal = maint.length;
      maintenancePending = maint.filter(m => m.status === "PENDING" || m.status === "IN_PROGRESS").length;
    } catch {}

    return NextResponse.json({
      tenant: {
        id: tenantId,
        firstName: t.firstName,
        lastName: t.lastName,
        email: t.email,
        phoneNumber: t.phoneNumber,
      },
      property: {
        name: t.propertyName,
        address: t.propertyAddress,
        city: t.propertyCity,
      },
      unit: {
        unitNumber: t.unitNumber,
        status: t.unitStatus,
      },
      lease: {
        startDate: t.leaseStartDate,
        endDate: t.leaseEndDate,
        status: leaseStatus,
        totalDays,
        remainingDays: remainingDays > 0 ? remainingDays : 0,
        remainingMonths: remainingMonths > 0 ? remainingMonths : 0,
      },
      rent: {
        monthlyAmount: t.rentAmount || 0,
        depositAmount: t.depositAmount || 0,
      },
      payments: {
        total: paidCount + pendingCount,
        paid: paidCount,
        pending: pendingCount,
        overdue: 0,
        totalPaid,
        totalPending,
        latest: latestPayment ? {
          amount: Number(latestPayment.amount),
          status: latestPayment.status,
          dueDate: latestPayment.createdAt,
          paidDate: latestPayment.paidAt || null,
        } : null,
      },
      maintenance: {
        total: maintenanceTotal,
        pending: maintenancePending,
      },
    });

  } catch (error: any) {
    console.error("❌ Tenant dashboard error:", error?.message);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}

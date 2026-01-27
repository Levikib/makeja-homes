import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify token and extract user ID
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;

    console.log("📊 Fetching tenant dashboard for user:", userId);

    // Get tenant record with related data
    const tenant = await prisma.tenants.findFirst({
      where: {
        userId: userId,
      },
      include: {
        units: {
          include: {
            properties: {
              select: {
                name: true,
                address: true,
                city: true,
              },
            },
          },
        },
        users: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    if (!tenant) {
      console.log("❌ No tenant record found for user:", userId);
      return NextResponse.json(
        { error: "Tenant record not found" },
        { status: 404 }
      );
    }

    console.log("✅ Found tenant:", tenant.id);

    // Calculate lease duration and remaining time
    const now = new Date();
    const leaseStart = new Date(tenant.leaseStartDate);
    const leaseEnd = new Date(tenant.leaseEndDate);
    const totalDays = Math.ceil((leaseEnd.getTime() - leaseStart.getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.ceil((leaseEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const remainingMonths = Math.floor(remainingDays / 30);
    
    // Calculate lease status
    let leaseStatus = "Active";
    if (now < leaseStart) {
      leaseStatus = "Upcoming";
    } else if (now > leaseEnd) {
      leaseStatus = "Expired";
    } else if (remainingDays <= 30) {
      leaseStatus = "Expiring Soon";
    }

    // Get payment statistics (with error handling)
    let payments: any[] = [];
    let totalPaid = 0;
    let totalPending = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let latestPayment = null;

    try {
      payments = await prisma.payments.findMany({
        where: {
          tenantId: tenant.id,
        },
        orderBy: {
          createdAt: "desc", // Use createdAt instead of paymentDate for sorting
        },
      });

      totalPaid = payments
        .filter((p) => p.status === "PAID")
        .reduce((sum, p) => sum + Number(p.amount), 0);

      totalPending = payments
        .filter((p) => p.status === "PENDING" || p.status === "OVERDUE")
        .reduce((sum, p) => sum + Number(p.amount), 0);

      paidCount = payments.filter((p) => p.status === "PAID").length;
      pendingCount = payments.filter((p) => p.status === "PENDING").length;
      overdueCount = payments.filter((p) => p.status === "OVERDUE").length;

      latestPayment = payments.length > 0 ? payments[0] : null;
    } catch (paymentError) {
      console.log("⚠️ No payments found or error fetching payments:", paymentError);
    }

    // Get maintenance requests (with error handling)
    let maintenanceRequests: any[] = [];
    let pendingMaintenance = 0;

    try {
      maintenanceRequests = await prisma.maintenance_requests.findMany({
        where: {
          unitId: tenant.unitId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      });

      pendingMaintenance = maintenanceRequests.filter(
        (m) => m.status === "PENDING" || m.status === "IN_PROGRESS"
      ).length;
    } catch (maintenanceError) {
      console.log("⚠️ No maintenance requests found or error:", maintenanceError);
    }

    // Prepare response
    const dashboardData = {
      tenant: {
        id: tenant.id,
        firstName: tenant.users.firstName,
        lastName: tenant.users.lastName,
        email: tenant.users.email,
        phoneNumber: tenant.users.phoneNumber,
      },
      property: {
        name: tenant.units.properties.name,
        address: tenant.units.properties.address,
        city: tenant.units.properties.city,
      },
      unit: {
        unitNumber: tenant.units.unitNumber,
        status: tenant.units.status,
      },
      lease: {
        startDate: tenant.leaseStartDate,
        endDate: tenant.leaseEndDate,
        status: leaseStatus,
        totalDays,
        remainingDays: remainingDays > 0 ? remainingDays : 0,
        remainingMonths: remainingMonths > 0 ? remainingMonths : 0,
      },
      rent: {
        monthlyAmount: tenant.rentAmount || 0,
        depositAmount: tenant.depositAmount || 0,
      },
      payments: {
        total: payments.length,
        paid: paidCount,
        pending: pendingCount,
        overdue: overdueCount,
        totalPaid,
        totalPending,
        latest: latestPayment
          ? {
              amount: Number(latestPayment.amount),
              status: latestPayment.status,
              paymentDate: latestPayment.paymentDate || latestPayment.createdAt,
            }
          : null,
      },
      maintenance: {
        total: maintenanceRequests.length,
        pending: pendingMaintenance,
        recent: maintenanceRequests.slice(0, 3).map((m) => ({
          id: m.id,
          title: m.title,
          status: m.status,
          priority: m.priority,
          createdAt: m.createdAt,
        })),
      },
    };

    console.log("✅ Tenant dashboard data prepared");

    return NextResponse.json(dashboardData);
  } catch (error: any) {
    console.error("❌ Error fetching tenant dashboard:", error);
    console.error("Error details:", error.message);
    return NextResponse.json(
      { 
        error: "Failed to fetch dashboard data",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

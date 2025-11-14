import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  try {
    await requireRole(["ADMIN", "MANAGER", "CARETAKER"]);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const propertyId = searchParams.get("propertyId");
    const tenantId = searchParams.get("tenantId");

    const where: any = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (propertyId) {
      where.unit = {
        propertyId,
      };
    }

    if (tenantId) {
      where.tenantId = tenantId;
    }

    const leases = await prisma.lease.findMany({
      where,
      include: {
        tenant: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
              },
            },
          },
        },
        unit: {
          include: {
            property: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        payments: {
          orderBy: { paymentDate: "desc" },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(leases);
  } catch (error: any) {
    console.error("Error fetching leases:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch leases" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await requireRole(["ADMIN", "MANAGER"]);

    const body = await req.json();
    const {
      tenantId,
      unitId,
      startDate,
      endDate,
      monthlyRent,
      securityDeposit,
      terms,
      status = "DRAFT",
    } = body;

    // Validate required fields
    if (!tenantId || !unitId || !startDate || !endDate || !monthlyRent) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify tenant exists and is not moved out
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    if (tenant.moveOutDate) {
      return NextResponse.json(
        { error: "Cannot create lease for tenant who has moved out" },
        { status: 400 }
      );
    }

    // Verify unit exists
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
    });

    if (!unit) {
      return NextResponse.json(
        { error: "Unit not found" },
        { status: 404 }
      );
    }

    // Check if there's already an active lease for this unit
    const existingLease = await prisma.lease.findFirst({
      where: {
        unitId,
        status: "ACTIVE",
      },
    });

    if (existingLease && status === "ACTIVE") {
      return NextResponse.json(
        { error: "This unit already has an active lease" },
        { status: 400 }
      );
    }

    // Generate lease number
    const leaseCount = await prisma.lease.count();
    const leaseNumber = `LSE-${new Date().getFullYear()}-${String(leaseCount + 1).padStart(4, "0")}`;

    // Create lease
    const lease = await prisma.lease.create({
      data: {
        leaseNumber,
        tenantId,
        unitId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        monthlyRent: parseFloat(monthlyRent),
        securityDeposit: securityDeposit ? parseFloat(securityDeposit) : null,
        terms: terms || null,
        status,
      },
      include: {
        tenant: {
          include: {
            user: true,
          },
        },
        unit: {
          include: {
            property: true,
          },
        },
      },
    });

    // If lease is ACTIVE, update unit and tenant
    if (status === "ACTIVE") {
      await prisma.unit.update({
        where: { id: unitId },
        data: {
          status: "OCCUPIED",
          tenantId,
        },
      });

      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          unitId,
          moveInDate: new Date(startDate),
        },
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: "CREATE",
        entityType: "Lease",
        entityId: lease.id,
        details: `Created lease ${leaseNumber} for unit ${unit.unitNumber}`,
      },
    });

    return NextResponse.json(lease, { status: 201 });
  } catch (error: any) {
    console.error("Error creating lease:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create lease" },
      { status: 500 }
    );
  }
}

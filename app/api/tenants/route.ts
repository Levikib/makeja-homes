import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  try {
    await requireRole(["ADMIN", "MANAGER", "CARETAKER"]);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const propertyId = searchParams.get("propertyId");

    const where: any = {};

    // Filter by tenant status (active/inactive based on move-out date)
    if (status === "active") {
      where.moveOutDate = null;
    } else if (status === "inactive") {
      where.moveOutDate = { not: null };
    }

    // Filter by property
    if (propertyId) {
      where.unit = {
        propertyId,
      };
    }

    const tenants = await prisma.tenant.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        unit: {
          include: {
            property: true,
          },
        },
        leases: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(tenants);
  } catch (error: any) {
    console.error("Error fetching tenants:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tenants" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await requireRole(["ADMIN", "MANAGER"]);

    const body = await req.json();
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      unitId,
      nationalId,
      dateOfBirth,
      occupation,
      employer,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      moveInDate,
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phoneNumber) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    // If unit is provided, verify it's vacant
    if (unitId) {
      const unit = await prisma.unit.findUnique({
        where: { id: unitId },
        include: { tenant: true },
      });

      if (!unit) {
        return NextResponse.json(
          { error: "Unit not found" },
          { status: 404 }
        );
      }

      if (unit.tenant) {
        return NextResponse.json(
          { error: "This unit is already occupied" },
          { status: 400 }
        );
      }
    }

    // Generate default password
    const defaultPassword = "tenant123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phoneNumber,
        role: "TENANT",
        isActive: true,
        emailVerified: new Date(),
      },
    });

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        userId: user.id,
        unitId: unitId || null,
        nationalId,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        occupation,
        employer,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelation,
        moveInDate: moveInDate ? new Date(moveInDate) : unitId ? new Date() : null,
      },
      include: {
        user: true,
        unit: {
          include: {
            property: true,
          },
        },
      },
    });

    // If unit assigned, update unit status to OCCUPIED
    if (unitId) {
      await prisma.unit.update({
        where: { id: unitId },
        data: { status: "OCCUPIED" },
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: "CREATE",
        entityType: "Tenant",
        entityId: tenant.id,
        details: `Created tenant: ${firstName} ${lastName}${unitId ? ` and assigned to unit` : ""}`,
      },
    });

    return NextResponse.json(tenant, { status: 201 });
  } catch (error: any) {
    console.error("Error creating tenant:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create tenant" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(["ADMIN", "MANAGER", "CARETAKER"]);

    const tenant = await prisma.tenant.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        unit: {
          include: {
            property: true,
          },
        },
        leases: {
          orderBy: { createdAt: "desc" },
        },
        payments: {
          orderBy: { paymentDate: "desc" },
          take: 10,
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(tenant);
  } catch (error: any) {
    console.error("Error fetching tenant:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tenant" },
      { status: error.status || 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireRole(["ADMIN", "MANAGER"]);

    const body = await req.json();
    const {
      phoneNumber,
      nationalId,
      dateOfBirth,
      occupation,
      employer,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
    } = body;

    const tenant = await prisma.tenant.update({
      where: { id: params.id },
      data: {
        nationalId,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        occupation,
        employer,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelation,
        user: {
          update: {
            phoneNumber,
          },
        },
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

    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: "UPDATE",
        entityType: "Tenant",
        entityId: tenant.id,
        details: `Updated tenant: ${tenant.user.firstName} ${tenant.user.lastName}`,
      },
    });

    return NextResponse.json(tenant);
  } catch (error: any) {
    console.error("Error updating tenant:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update tenant" },
      { status: 500 }
    );
  }
}

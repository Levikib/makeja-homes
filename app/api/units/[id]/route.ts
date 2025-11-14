import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Validation schema for unit update
const unitUpdateSchema = z.object({
  unitNumber: z.string().min(1).optional(),
  floor: z.string().optional(),
  type: z.enum(["TENANCY", "STAFF", "SHOP"]).optional(),
  status: z.enum(["VACANT", "OCCUPIED", "MAINTENANCE", "RESERVED"]).optional(),
  rentAmount: z.number().positive().optional(),
  depositAmount: z.number().min(0).optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  squareFootage: z.number().min(0).optional(),
  features: z.array(z.string()).optional(),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
});

// GET /api/units/[id] - Get single unit
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(["ADMIN", "MANAGER", "CARETAKER"]);

    const unit = await prisma.unit.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            country: true,
          },
        },
        currentTenant: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
              },
            },
            leases: {
              where: {
                status: "ACTIVE",
                deletedAt: null,
              },
              orderBy: {
                startDate: "desc",
              },
              take: 1,
            },
          },
        },
        leases: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            startDate: "desc",
          },
          take: 5,
          include: {
            tenant: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        payments: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            paymentDate: "desc",
          },
          take: 10,
          include: {
            tenant: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        renovationRequests: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!unit) {
      return NextResponse.json(
        {
          success: false,
          error: "Unit not found",
        },
        { status: 404 }
      );
    }

    // Calculate payment stats
    const totalPayments = await prisma.payment.aggregate({
      where: {
        unitId: unit.id,
        status: "COMPLETED",
        deletedAt: null,
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    const pendingPayments = await prisma.payment.aggregate({
      where: {
        unitId: unit.id,
        status: "PENDING",
        deletedAt: null,
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    const stats = {
      totalPaymentsReceived: totalPayments._sum.amount?.toNumber() || 0,
      totalPaymentsCount: totalPayments._count,
      pendingPaymentsAmount: pendingPayments._sum.amount?.toNumber() || 0,
      pendingPaymentsCount: pendingPayments._count,
    };

    return NextResponse.json({
      success: true,
      data: {
        ...unit,
        stats,
      },
    });
  } catch (error: any) {
    console.error("Error fetching unit:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch unit",
      },
      { status: error.status || 500 }
    );
  }
}

// PUT /api/units/[id] - Update unit
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);

    const body = await req.json();
    const validatedData = unitUpdateSchema.parse(body);

    // Check if unit exists
    const existingUnit = await prisma.unit.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
      },
      include: {
        property: true,
      },
    });

    if (!existingUnit) {
      return NextResponse.json(
        {
          success: false,
          error: "Unit not found",
        },
        { status: 404 }
      );
    }

    // If updating unit number, check for duplicates
    if (
      validatedData.unitNumber &&
      validatedData.unitNumber !== existingUnit.unitNumber
    ) {
      const duplicate = await prisma.unit.findFirst({
        where: {
          propertyId: existingUnit.propertyId,
          unitNumber: validatedData.unitNumber,
          deletedAt: null,
          NOT: {
            id: params.id,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: "Unit number already exists for this property",
          },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = { ...validatedData };

    if (validatedData.rentAmount !== undefined) {
      updateData.rentAmount = new Prisma.Decimal(validatedData.rentAmount);
    }

    if (validatedData.depositAmount !== undefined) {
      updateData.depositAmount = new Prisma.Decimal(validatedData.depositAmount);
    }

    const unit = await prisma.unit.update({
      where: {
        id: params.id,
      },
      data: updateData,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        entityType: "Unit",
        entityId: unit.id,
        details: `Updated unit: ${unit.unitNumber} at ${existingUnit.property.name}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: unit,
      message: "Unit updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating unit:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update unit",
      },
      { status: error.status || 500 }
    );
  }
}

// DELETE /api/units/[id] - Soft delete unit
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN"]);

    // Check if unit exists
    const existingUnit = await prisma.unit.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
      },
      include: {
        property: true,
        currentTenant: true,
      },
    });

    if (!existingUnit) {
      return NextResponse.json(
        {
          success: false,
          error: "Unit not found",
        },
        { status: 404 }
      );
    }

    // Check if unit is occupied
    if (existingUnit.status === "OCCUPIED" || existingUnit.currentTenant) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete an occupied unit",
        },
        { status: 400 }
      );
    }

    // Check if unit has active leases
    const activeLeases = await prisma.leaseAgreement.count({
      where: {
        unitId: params.id,
        status: "ACTIVE",
        deletedAt: null,
      },
    });

    if (activeLeases > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete unit with active leases",
        },
        { status: 400 }
      );
    }

    // Soft delete the unit
    const unit = await prisma.unit.update({
      where: {
        id: params.id,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "DELETE",
        entityType: "Unit",
        entityId: unit.id,
        details: `Deleted unit: ${unit.unitNumber} at ${existingUnit.property.name}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Unit deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting unit:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete unit",
      },
      { status: error.status || 500 }
    );
  }
}

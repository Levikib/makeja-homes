import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET single unit
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; unitId: string } }
) {
  try {
    const unit = await prisma.units.findUnique({
      where: { id: params.unitId },
      include: {
        properties: {
          select: {
            id: true,
            name: true,
          },
        },
        tenants: {
          include: {
            users: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
    });

    if (!unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    return NextResponse.json(unit);
  } catch (error) {
    console.error("Error fetching unit:", error);
    return NextResponse.json({ error: "Failed to fetch unit" }, { status: 500 });
  }
}

// PUT - Edit unit with occupied unit workflow
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; unitId: string } }
) {
  try {
    const data = await request.json();
    const { updateType, createNewLease, ...unitData } = data;

    // Check for duplicate unit number
    if (unitData.unitNumber) {
      const existing = await prisma.units.findFirst({
        where: {
          propertyId: params.id,
          unitNumber: unitData.unitNumber,
          id: { not: params.unitId },
          deletedAt: null
        }
      });

      if (existing) {
        return NextResponse.json(
          { error: "A unit with this number already exists in this property" },
          { status: 400 }
        );
      }
    }

    // Check if unit has active tenant
    const activeLease = await prisma.lease_agreements.findFirst({
      where: {
        unitId: params.unitId,
        status: "ACTIVE",
      },
      include: {
        tenants: {
          include: {
            users: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // If unit has active tenant and no workflow specified, return tenant info
    if (activeLease && !updateType) {
      return NextResponse.json({
        hasActiveTenant: true,
        tenant: {
          name: `${activeLease.tenants.users.firstName} ${activeLease.tenants.users.lastName}`,
          email: activeLease.tenants.users.email,
          currentRent: activeLease.rentAmount,
          currentDeposit: activeLease.depositAmount,
          leaseEnd: activeLease.endDate,
        },
        lease: {
          id: activeLease.id,
          startDate: activeLease.startDate,
          endDate: activeLease.endDate,
        },
      }, { status: 409 });
    }

    const today = new Date();

    // OPTION 1: Update unit only (changes apply to next lease)
    if (updateType === "unitOnly") {
      const unit = await prisma.units.update({
        where: { id: params.unitId },
        data: {
          unitNumber: unitData.unitNumber,
          type: unitData.type,
          status: unitData.status,
          bedrooms: unitData.bedrooms,
          bathrooms: unitData.bathrooms,
          squareFeet: unitData.squareFeet,
          floor: unitData.floor,
          rentAmount: unitData.rentAmount,
          depositAmount: unitData.depositAmount,
          updatedAt: today,
        },
      });

      return NextResponse.json({ success: true, unit });
    }

    // OPTION 2: Create new lease with new terms
    if (updateType === "createLease" && activeLease && createNewLease) {
      await prisma.$transaction(async (tx) => {
        // 1. Update unit with new details
        await tx.units.update({
          where: { id: params.unitId },
          data: {
            unitNumber: unitData.unitNumber,
            type: unitData.type,
            status: "RESERVED",
            bedrooms: unitData.bedrooms,
            bathrooms: unitData.bathrooms,
            squareFeet: unitData.squareFeet,
            floor: unitData.floor,
            rentAmount: unitData.rentAmount,
            depositAmount: unitData.depositAmount,
            updatedAt: today,
          },
        });

        // 2. Mark current lease as EXPIRED (or keep until original end date)
        await tx.lease_agreements.update({
          where: { id: activeLease.id },
          data: {
            status: createNewLease.expireImmediately ? "EXPIRED" : "ACTIVE",
            endDate: createNewLease.expireImmediately ? today : activeLease.endDate,
            updatedAt: today,
          },
        });

        // 3. Create new PENDING lease
        const newLeaseId = `lease_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await tx.lease_agreements.create({
          data: {
            id: newLeaseId,
            tenantId: activeLease.tenantId,
            unitId: params.unitId,
            status: "PENDING",
            startDate: new Date(createNewLease.startDate),
            endDate: new Date(createNewLease.endDate),
            rentAmount: unitData.rentAmount,
            depositAmount: unitData.depositAmount,
            terms: createNewLease.terms || activeLease.terms,
            createdAt: today,
            updatedAt: today,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: "New lease created. Tenant will receive contract to sign.",
        newLeaseCreated: true,
      });
    }

    // Default update (no active tenant or vacant unit)
    const unit = await prisma.units.update({
      where: { id: params.unitId },
      data: {
        unitNumber: unitData.unitNumber,
        type: unitData.type,
        status: unitData.status,
        bedrooms: unitData.bedrooms,
        bathrooms: unitData.bathrooms,
        squareFeet: unitData.squareFeet,
        floor: unitData.floor,
        rentAmount: unitData.rentAmount,
        depositAmount: unitData.depositAmount,
        updatedAt: today,
      },
    });

    return NextResponse.json({ success: true, unit });
  } catch (error) {
    console.error("Error updating unit:", error);
    return NextResponse.json({ error: "Failed to update unit" }, { status: 500 });
  }
}

// DELETE - Archive unit
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; unitId: string } }
) {
  try {
    await prisma.units.update({
      where: { id: params.unitId },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting unit:", error);
    return NextResponse.json({ error: "Failed to delete unit" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

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
            address: true,
            city: true
          }
        },
        tenants: {
          include: {
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true
              }
            }
          }
        }
      }
    });

    if (!unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    // Revalidate all related pages
    revalidatePath("/dashboard/admin/tenants");
    revalidatePath(`/dashboard/admin/tenants/${unit.id}`);
    revalidatePath(`/dashboard/properties/${params.id}`);
    
    return NextResponse.json(unit);
  } catch (error) {
    console.error("Error fetching unit:", error);
    return NextResponse.json({ error: "Failed to fetch unit" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; unitId: string } }
) {
  try {
    const data = await request.json();
    
    if (data.unitNumber) {
      const existing = await prisma.units.findFirst({
        where: {
          propertyId: params.id,
          unitNumber: data.unitNumber,
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

    const unit = await prisma.units.update({
      where: { id: params.unitId },
      data: {
        unitNumber: data.unitNumber,
        type: data.type,
        status: data.status,
        rentAmount: data.rentAmount,
        depositAmount: data.depositAmount !== undefined ? data.depositAmount : null,
        bedrooms: data.bedrooms !== undefined ? data.bedrooms : null,
        bathrooms: data.bathrooms !== undefined ? data.bathrooms : null,
        squareFeet: data.squareFeet !== undefined ? data.squareFeet : null,
        floor: data.floor !== undefined ? data.floor : null,
        updatedAt: new Date()
      }
    });

    // Revalidate all related pages
    revalidatePath("/dashboard/admin/tenants");
    revalidatePath(`/dashboard/admin/tenants/${unit.id}`);
    revalidatePath(`/dashboard/properties/${params.id}`);
    
    return NextResponse.json(unit);
  } catch (error) {
    console.error("Error updating unit:", error);
    return NextResponse.json({ error: "Failed to update unit" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; unitId: string } }
) {
  try {
    await prisma.units.update({
      where: { id: params.unitId },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ message: "Unit deleted successfully" });
  } catch (error) {
    console.error("Error deleting unit:", error);
    return NextResponse.json({ error: "Failed to delete unit" }, { status: 500 });
  }
}

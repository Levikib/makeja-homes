import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(["ADMIN", "MANAGER", "CARETAKER"]);

    const property = await prisma.property.findUnique({
      where: { id: params.id },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(property);
  } catch (error: any) {
    console.error("Error fetching property:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch property" },
      { status: error.status || 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);

    const body = await req.json();
    const {
      name,
      address,
      city,
      state,
      country,
      postalCode,
      totalFloors,
      totalUnits,
      yearBuilt,
      description,
      amenities,
      floorNamingPattern,
      image,
    } = body;

    const property = await prisma.property.update({
      where: { id: params.id },
      data: {
        name,
        address,
        city,
        state,
        country,
        postalCode,
        totalFloors: totalFloors ? parseInt(totalFloors) : null,
        totalUnits: totalUnits ? parseInt(totalUnits) : null,
        yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
        description,
        amenities: amenities || [],
        floorNamingPattern,
        image,
      },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        entityType: "Property",
        entityId: property.id,
        details: `Updated property: ${property.name}`,
      },
    });

    return NextResponse.json(property);
  } catch (error: any) {
    console.error("Error updating property:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update property" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN"]);

    // Soft delete
    const property = await prisma.property.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
        deletedById: user.id,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "DELETE",
        entityType: "Property",
        entityId: property.id,
        details: `Deleted property: ${property.name}`,
      },
    });

    return NextResponse.json({ message: "Property deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting property:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete property" },
      { status: 500 }
    );
  }
}

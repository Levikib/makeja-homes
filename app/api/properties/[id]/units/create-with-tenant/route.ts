import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Helper function to generate unique IDs
function generateUniqueId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${random}`;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { unit } = body;

    // Validate required unit fields
    if (!unit.unitNumber || !unit.type || !unit.status || !unit.rentAmount) {
      return NextResponse.json(
        { error: "Missing required unit fields" },
        { status: 400 }
      );
    }

    // For now, only allow VACANT and MAINTENANCE units
    // We'll add OCCUPIED/RESERVED support once we understand the schema better
    if (unit.status === "OCCUPIED" || unit.status === "RESERVED") {
      return NextResponse.json(
        { error: "Please create unit as VACANT first, then assign tenant separately" },
        { status: 400 }
      );
    }

    // Check for duplicate unit number in property
    const existingUnit = await prisma.units.findFirst({
      where: {
        propertyId: params.id,
        unitNumber: unit.unitNumber,
        deletedAt: null,
      },
    });

    if (existingUnit) {
      return NextResponse.json(
        { error: "Unit number already exists in this property" },
        { status: 400 }
      );
    }

    const now = new Date();
    const unitId = generateUniqueId("unit");

    // Create unit
    const createdUnit = await prisma.units.create({
      data: {
        id: unitId,
        unitNumber: unit.unitNumber,
        type: unit.type,
        status: unit.status,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        squareFeet: unit.squareFeet,
        floor: unit.floor,
        rentAmount: unit.rentAmount,
        depositAmount: unit.depositAmount,
        propertyId: params.id,
        createdAt: now,
        updatedAt: now,
      },
    });

    return NextResponse.json({ unit: createdUnit }, { status: 201 });
  } catch (error) {
    console.error("Error creating unit:", error);
    return NextResponse.json(
      { error: "Failed to create unit" },
      { status: 500 }
    );
  }
}

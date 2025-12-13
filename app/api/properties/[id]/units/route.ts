import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();

    // Check if unit number already exists for this property
    const existing = await prisma.units.findFirst({
      where: {
        propertyId: params.id,
        unitNumber: data.unitNumber,
        deletedAt: null
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: "A unit with this number already exists in this property" },
        { status: 400 }
      );
    }

    const unit = await prisma.units.create({
      data: {
        id: `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        propertyId: params.id,
        unitNumber: data.unitNumber,
        type: data.type || "TENANCY",
        status: data.status || "VACANT",
        rentAmount: data.rentAmount,
        depositAmount: data.depositAmount || null,
        bedrooms: data.bedrooms || null,
        bathrooms: data.bathrooms || null,
        squareFeet: data.squareFeet || null,
        floor: data.floor || null,
        updatedAt: new Date()
      }
    });

    return NextResponse.json(unit);
  } catch (error) {
    console.error("Error creating unit:", error);
    return NextResponse.json({ error: "Failed to create unit" }, { status: 500 });
  }
}

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const units = await prisma.units.findMany({
      where: {
        propertyId: params.id,
        deletedAt: null
      },
      select: {
        id: true,
        unitNumber: true,
        type: true,
        status: true,
        rentAmount: true,
      },
      orderBy: {
        unitNumber: 'asc'
      }
    });

    return NextResponse.json({ units });
  } catch (error) {
    console.error("Error fetching units:", error);
    return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 });
  }
}

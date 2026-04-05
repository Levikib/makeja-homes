import { jwtVerify } from "jose"
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export const dynamic = 'force-dynamic'
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
  // Auth guard
  const token = request.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!["ADMIN","MANAGER","CARETAKER"].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }


    const unit = await prisma.units.findUnique({
      where: { id: params.id },
      include: {
        properties: true,
        tenants: {
          include: {
            users: true
          }
        }
      }
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
  // Auth guard
  const token = request.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!["ADMIN","MANAGER","CARETAKER"].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }


    const data = await request.json();

    // Check if unit number already exists for this property (excluding current unit)
    if (data.unitNumber) {
      const existing = await prisma.units.findFirst({
        where: {
          propertyId: data.propertyId,
          unitNumber: data.unitNumber,
          id: { not: params.id },
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
      where: { id: params.id },
      data: {
        unitNumber: data.unitNumber,
        type: data.type,
        status: data.status,
        rentAmount: data.rentAmount,
        depositAmount: data.depositAmount,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        squareFeet: data.squareFeet,
        floor: data.floor,
        updatedAt: new Date()
      }
    });

    return NextResponse.json(unit);
  } catch (error) {
    console.error("Error updating unit:", error);
    return NextResponse.json({ error: "Failed to update unit" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
  // Auth guard
  const token = request.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!["ADMIN","MANAGER","CARETAKER"].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }


    // Soft delete the unit
    await prisma.units.update({
      where: { id: params.id },
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

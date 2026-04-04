import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { getMasterPrisma } from "@/lib/get-prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Unit limit enforcement: check plan cap before creating
    const token = request.cookies.get("token")?.value;
    if (token) {
      try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
        const companyId = payload.companyId as string | undefined;
        if (companyId) {
          const master = getMasterPrisma();
          const company = await master.companies.findUnique({
            where: { id: companyId },
            select: { unitLimit: true },
          });
          if (company) {
            const currentCount = await prisma.units.count({ where: { deletedAt: null } });
            if (currentCount >= company.unitLimit) {
              return NextResponse.json(
                { error: `Unit limit reached. Your plan allows a maximum of ${company.unitLimit} units. Please upgrade to add more.` },
                { status: 402 }
              );
            }
          }
        }
      } catch {
        // Token issues don't block creation — auth is handled by other layers
      }
    }

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

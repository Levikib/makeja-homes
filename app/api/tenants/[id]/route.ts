import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await prisma.tenants.findUnique({
      where: { id: params.id },
      include: {
        users: true,
        units: {
          include: {
            properties: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch tenant" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();

    const tenant = await prisma.tenants.update({
      where: { id: params.id },
      data: {
        rentAmount: data.rentAmount,
        depositAmount: data.depositAmount,
        leaseStartDate: data.leaseStartDate,
        leaseEndDate: data.leaseEndDate,
      },
    });

    return NextResponse.json(tenant);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get tenant to find associated records
    const tenant = await prisma.tenants.findUnique({
      where: { id: params.id },
      include: {
        users: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Delete tenant (this will cascade delete related records based on schema)
    await prisma.tenants.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Tenant deleted successfully" });
  } catch (error: any) {
    console.error("Delete tenant error:", error);
    return NextResponse.json(
      { error: "Failed to delete tenant", details: error.message },
      { status: 500 }
    );
  }
}

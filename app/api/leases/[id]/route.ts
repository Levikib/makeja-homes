import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET single lease
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lease = await prisma.lease_agreements.findUnique({
      where: { id: params.id },
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
        units: {
          include: {
            properties: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!lease) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    return NextResponse.json(lease);
  } catch (error) {
    console.error("Error fetching lease:", error);
    return NextResponse.json({ error: "Failed to fetch lease" }, { status: 500 });
  }
}

// PUT - Edit lease terms
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const { startDate, endDate, rentAmount, depositAmount, terms, contractTerms } = data;

    const updatedLease = await prisma.lease_agreements.update({
      where: { id: params.id },
      data: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        rentAmount: parseFloat(rentAmount),
        depositAmount: parseFloat(depositAmount),
        terms: terms || null,
        contractTerms: contractTerms || null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedLease);
  } catch (error) {
    console.error("Error updating lease:", error);
    return NextResponse.json({ error: "Failed to update lease" }, { status: 500 });
  }
}

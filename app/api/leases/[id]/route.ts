import { jwtVerify } from "jose"
import { NextRequest, NextResponse } from "next/server";
import { getPrismaForTenant } from "@/lib/prisma";

// GET single lease

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
    if (!["ADMIN","MANAGER"].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }


    const lease = await getPrismaForTenant(request).lease_agreements.findUnique({
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
  // Auth guard
  const token = request.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!["ADMIN","MANAGER"].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }


    const data = await request.json();
    const { startDate, endDate, rentAmount, depositAmount, terms, contractTerms } = data;

    const updatedLease = await getPrismaForTenant(request).lease_agreements.update({
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

import { jwtVerify } from "jose"
import { NextRequest, NextResponse } from "next/server";
import { getPrismaForTenant } from "@/lib/prisma";


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


    const tenant = await getPrismaForTenant(request).tenants.findUnique({
      where: { id: params.id },
      include: {
        users: true,
        units: {
          include: {
            properties: true,
          },
        },
        lease_agreements: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1, // Get only the most recent lease for status check
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            rentAmount: true,
            depositAmount: true,
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

    // Get the tenant to find the associated user
    const tenant = await getPrismaForTenant(request).tenants.findUnique({
      where: { id: params.id },
      select: { userId: true }
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Update the user's personal information
    const updatedUser = await getPrismaForTenant(request).users.update({
      where: { id: tenant.userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        idNumber: data.idNumber,
        updatedAt: new Date()
      },
    });

    // Return the updated tenant with user info
    const updatedTenant = await getPrismaForTenant(request).tenants.findUnique({
      where: { id: params.id },
      include: {
        users: true,
        units: {
          include: {
            properties: true,
          },
        },
        lease_agreements: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            rentAmount: true,
            depositAmount: true,
          },
        },
      },
    });

    return NextResponse.json(updatedTenant);
  } catch (error: any) {
    console.error("Failed to update tenant:", error);
    return NextResponse.json({
      error: "Failed to update tenant",
      details: error.message
    }, { status: 500 });
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


    // Get tenant to find associated records
    const tenant = await getPrismaForTenant(request).tenants.findUnique({
      where: { id: params.id },
      include: {
        users: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Delete associated records first
    await getPrismaForTenant(request).$transaction([
      // Delete lease agreements
      getPrismaForTenant(request).lease_agreements.deleteMany({
        where: { tenantId: params.id },
      }),
      // Delete tenant
      getPrismaForTenant(request).tenants.delete({
        where: { id: params.id },
      }),
      // Optionally delete user if they have no other tenant records
      // (commented out to keep user account)
      // getPrismaForTenant(request).users.delete({
      //   where: { id: tenant.userId },
      // }),
    ]);

    return NextResponse.json({ message: "Tenant deleted successfully" });
  } catch (error: any) {
    console.error("Failed to delete tenant:", error);
    return NextResponse.json({
      error: "Failed to delete tenant",
      details: error.message
    }, { status: 500 });
  }
}

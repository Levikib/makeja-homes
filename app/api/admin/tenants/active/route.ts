import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const companyId = payload.companyId as string | null;

    console.log("📋 Fetching active tenants for company:", companyId);

    const tenants = await prisma.tenants.findMany({
      where: {
        units: {
          properties: {
            companyId: companyId || undefined,
          },
        },
      },
      include: {
        users: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        units: {
          include: {
            properties: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedTenants = tenants.map((t) => ({
      id: t.id,
      userId: t.userId,
      unitId: t.unitId,
      unitNumber: t.units.unitNumber,
      propertyName: t.units.properties.name,
      tenantName: `${t.users.firstName} ${t.users.lastName}`,
      email: t.users.email,
      rentAmount: Number(t.rentAmount),
    }));

    console.log(`✅ Found ${formattedTenants.length} active tenants`);

    return NextResponse.json({ tenants: formattedTenants });
  } catch (error: any) {
    console.error("❌ Error fetching active tenants:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenants" },
      { status: 500 }
    );
  }
}
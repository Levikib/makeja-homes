import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    if (role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const tenants = await prisma.tenants.findMany({
      where: {
        monthly_bills: {
          some: { status: { in: ["PENDING", "OVERDUE"] } }
        }
      },
      include: {
        users: { select: { firstName: true, lastName: true, email: true } },
        units: { select: { unitNumber: true, properties: { select: { name: true } } } },
        monthly_bills: {
          where: { status: { in: ["PENDING", "OVERDUE"] } },
          select: { id: true, totalAmount: true, status: true }
        }
      },
      orderBy: [{ users: { firstName: "asc" } }, { users: { lastName: "asc" } }]
    });

    const formattedTenants = tenants.map(tenant => ({
      id: tenant.id,
      user: { firstName: tenant.users.firstName, lastName: tenant.users.lastName, email: tenant.users.email },
      unit: { unitNumber: tenant.units.unitNumber },
      property: { name: tenant.units.properties.name },
      outstandingAmount: tenant.monthly_bills.reduce((sum, bill) => sum + bill.totalAmount, 0),
      outstandingBillsCount: tenant.monthly_bills.length,
    }));

    return NextResponse.json({ success: true, tenants: formattedTenants });
  } catch (error: any) {
    console.error("❌ Error fetching tenants with bills:", error);
    return NextResponse.json({ error: "Failed to fetch tenants" }, { status: 500 });
  }
}

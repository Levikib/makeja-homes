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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const propertyId = searchParams.get("propertyId") || "all";
    const month = searchParams.get("month");

    // Build where clause
    const where: any = {};

    if (status !== "all") {
      where.status = status;
    }

    if (propertyId !== "all") {
      where.units = {
        propertyId: propertyId,
      };
    }

    if (month) {
      const monthDate = new Date(month);
      where.month = monthDate;
    }

    // Fetch bills
    const bills = await prisma.monthly_bills.findMany({
      where,
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
            units: {
              select: {
                unitNumber: true,
                properties: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format response
    const formattedBills = bills.map((bill) => ({
      id: bill.id,
      tenant: {
        firstName: bill.tenants.users.firstName,
        lastName: bill.tenants.users.lastName,
        email: bill.tenants.users.email,
      },
      unit: {
        unitNumber: bill.tenants.units.unitNumber,
      },
      property: {
        name: bill.tenants.units.properties.name,
      },
      month: bill.month,
      rentAmount: bill.rentAmount,
      waterAmount: bill.waterAmount,
      garbageAmount: bill.garbageAmount,
      totalAmount: bill.totalAmount,
      status: bill.status,
      dueDate: bill.dueDate,
      paidDate: bill.paidDate,
      createdAt: bill.createdAt,
    }));

    return NextResponse.json({
      bills: formattedBills,
    });
  } catch (error: any) {
    console.error("❌ Error fetching bills:", error);
    return NextResponse.json(
      { error: "Failed to fetch bills" },
      { status: 500 }
    );
  }
}

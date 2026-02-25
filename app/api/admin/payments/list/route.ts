import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== "ADMIN" && payload.role !== "MANAGER") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;
    const where: any = {};
    const status = searchParams.get("status");
    const propertyId = searchParams.get("propertyId");
    if (status && status !== "all") where.status = status;
    if (propertyId && propertyId !== "all") where.units = { propertyId };

    const [payments, total] = await Promise.all([
      prisma.payments.findMany({
        where, skip, take: limit,
        include: {
          tenants: {
            include: {
              users: { select: { firstName: true, lastName: true, email: true } },
              units: { select: { unitNumber: true, properties: { select: { name: true } } } },
            },
          },
          users_payments_verifiedByIdTousers: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.payments.count({ where }),
    ]);

    const formattedPayments = payments.map((p) => ({
      id: p.id,
      referenceNumber: p.referenceNumber,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      paymentType: p.paymentType,
      status: p.status,
      verificationStatus: p.verificationStatus,
      paymentDate: p.paymentDate,
      createdAt: p.createdAt,
      notes: p.notes,
      paymentComponents: (p.paymentComponents as any[]) ?? [],
      tenant: { firstName: p.tenants.users.firstName, lastName: p.tenants.users.lastName, email: p.tenants.users.email },
      unit: { unitNumber: p.tenants.units.unitNumber },
      property: { name: p.tenants.units.properties.name },
    }));

    return NextResponse.json({ payments: formattedPayments, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error: any) {
    console.error("❌ Error fetching payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

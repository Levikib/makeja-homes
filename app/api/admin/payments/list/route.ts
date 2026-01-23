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
    const companyId = payload.companyId as string | null;

    if (role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const propertyId = searchParams.get("propertyId") || "all";
    const verificationStatus = searchParams.get("verificationStatus") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Company isolation
    if (companyId) {
      where.properties = {
        companyId: companyId,
      };
    }

    // Filters
    if (status !== "all") {
      where.status = status;
    }

    if (verificationStatus !== "all") {
      where.verificationStatus = verificationStatus;
    }

    if (propertyId !== "all") {
      where.units = {
        propertyId: propertyId,
      };
    }

    // Fetch payments with relations
    const [payments, total] = await Promise.all([
      prisma.payments.findMany({
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
          users_payments_verifiedByIdTousers: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.payments.count({ where }),
    ]);

    // Format response
    const formattedPayments = payments.map((payment) => ({
      id: payment.id,
      referenceNumber: payment.referenceNumber,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paymentType: payment.paymentType,
      status: payment.status,
      verificationStatus: payment.verificationStatus,
      paymentDate: payment.paymentDate,
      proofOfPaymentUrl: payment.proofOfPaymentUrl,
      proofOfPaymentNotes: payment.proofOfPaymentNotes,
      verificationNotes: payment.verificationNotes,
      verifiedAt: payment.verifiedAt,
      tenant: {
        firstName: payment.tenants.users.firstName,
        lastName: payment.tenants.users.lastName,
        email: payment.tenants.users.email,
      },
      unit: {
        unitNumber: payment.tenants.units.unitNumber,
      },
      property: {
        name: payment.tenants.units.properties.name,
      },
      verifiedBy: payment.users_payments_verifiedByIdTousers
        ? {
            firstName: payment.users_payments_verifiedByIdTousers.firstName,
            lastName: payment.users_payments_verifiedByIdTousers.lastName,
          }
        : null,
    }));

    return NextResponse.json({
      payments: formattedPayments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ FIXED: Use JWT_SECRET (same as middleware)
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;
    const role = payload.role as string;

    const propertyId = params.id;

    console.log("💰 Fetching payments for property:", propertyId);

    // Fetch payments with proof of payment that need verification
    const payments = await prisma.payments.findMany({
      where: {
        units: {
          propertyId: propertyId,
        },
        proofOfPaymentUrl: {
          not: null,
        },
      },
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
    });

    console.log(`✅ Found ${payments.length} payments`);

    return NextResponse.json({ payments });
  } catch (error: any) {
    console.error("❌ Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

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

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;
    const role = payload.role as string;

    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const propertyId = params.id;

    console.log("📊 Fetching payments for property:", propertyId);

    // Verify property belongs to user
    const property = await prisma.properties.findFirst({
      where: { id: propertyId, createdById: userId },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Fetch all payments for units in this property
    const payments = await prisma.payments.findMany({
      where: {
        units: {
          propertyId: propertyId,
        },
        // Only show payments with proof of payment or that need verification
        OR: [
          { proofOfPaymentUrl: { not: null } },
          { verificationStatus: "PENDING" },
          { verificationStatus: "APPROVED" },
          { verificationStatus: "DECLINED" },
        ],
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

    // Format the response
    const formattedPayments = payments.map((payment) => ({
      id: payment.id,
      referenceNumber: payment.referenceNumber,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      verificationStatus: payment.verificationStatus,
      proofOfPaymentUrl: payment.proofOfPaymentUrl,
      proofOfPaymentNotes: payment.proofOfPaymentNotes,
      proofUploadedAt: payment.proofUploadedAt?.toISOString() || null,
      verificationNotes: payment.verificationNotes,
      verifiedAt: payment.verifiedAt?.toISOString() || null,
      paymentDate: payment.paymentDate.toISOString(),
      tenants: {
        users: payment.tenants.users,
        units: payment.tenants.units,
      },
      verifiedBy: payment.users_payments_verifiedByIdTousers,
    }));

    return NextResponse.json({
      success: true,
      payments: formattedPayments,
    });
  } catch (error: any) {
    console.error("❌ Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
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
    const companyId = payload.companyId as string | null;

    const property = await prisma.properties.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        mpesaPhoneNumber: true,
        mpesaTillNumber: true,
        mpesaTillName: true,
        mpesaPaybillNumber: true,
        mpesaPaybillName: true,
        bankAccounts: true,
        paymentInstructions: true,
        companyId: true,
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Verify company access
    if (companyId && property.companyId !== companyId) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    // Parse bank accounts from JSON
    const response = {
      ...property,
      bankAccounts: property.bankAccounts ? JSON.parse(property.bankAccounts as string) : [],
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error fetching payment settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment settings" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const companyId = payload.companyId as string | null;

    const body = await request.json();

    // Verify property exists and user has access
    const property = await prisma.properties.findUnique({
      where: { id: params.id },
      select: { companyId: true, name: true },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    if (companyId && property.companyId !== companyId) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    // Update payment settings
    const updated = await prisma.properties.update({
      where: { id: params.id },
      data: {
        mpesaPhoneNumber: body.mpesaPhoneNumber || null,
        mpesaTillNumber: body.mpesaTillNumber || null,
        mpesaTillName: body.mpesaTillName || null,
        mpesaPaybillNumber: body.mpesaPaybillNumber || null,
        mpesaPaybillName: body.mpesaPaybillName || null,
        bankAccounts: body.bankAccounts ? JSON.stringify(body.bankAccounts) : null,
        paymentInstructions: body.paymentInstructions || null,
        updatedAt: new Date(),
      },
    });

    console.log("✅ Payment settings updated for property:", property.name);

    return NextResponse.json({
      success: true,
      message: "Payment settings updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating payment settings:", error);
    return NextResponse.json(
      { error: "Failed to update payment settings" },
      { status: 500 }
    );
  }
}
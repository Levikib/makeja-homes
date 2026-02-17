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
    await jwtVerify(token, secret);

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    console.log("📋 Fetching complete history for tenant:", tenantId);

    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
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
        lease_agreements: {
          where: { status: 'ACTIVE' },
          select: { startDate: true },
          orderBy: { startDate: 'asc' },
          take: 1,
        },
        water_readings: {
          select: {
            id: true,
            month: true,
            year: true,
            previousReading: true,
            currentReading: true,
            unitsConsumed: true,
            ratePerUnit: true,
            amountDue: true,
            readingDate: true,
          },
          orderBy: [
            { year: 'desc' },
            { month: 'desc' },
          ],
        },
        garbage_fees: {
          select: {
            id: true,
            month: true,
            amount: true,
            isApplicable: true,
            status: true,
            createdAt: true,
          },
          orderBy: {
            month: 'desc',
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    console.log(`✅ Found tenant with ${tenant.water_readings.length} water readings and ${tenant.garbage_fees.length} garbage fees`);

    // Return with tenant wrapper (frontend expects data.tenant)
    return NextResponse.json({ tenant });
  } catch (error: any) {
    console.error("❌ Error fetching tenant history:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenant history" },
      { status: 500 }
    );
  }
}

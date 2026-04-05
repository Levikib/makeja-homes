import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForTenant } from "@/lib/prisma";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    if (role !== "ADMIN" && role !== "MANAGER" && role !== "CARETAKER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    console.log("📋 Fetching active tenants with complete utility data");

    const tenants = await getPrismaForTenant(request).tenants.findMany({
      where: {
        units: {
          status: "OCCUPIED",
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
                id: true,
                name: true,
              },
            },
          },
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
          orderBy: {
            readingDate: 'desc',
          },
          take: 24,
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
            createdAt: 'desc',
          },
          take: 24,
        },
        lease_agreements: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            status: true,
          },
          where: {
            status: 'ACTIVE',
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`✅ Found ${tenants.length} active tenants with complete data`);

    return NextResponse.json({ tenants });
  } catch (error: any) {
    console.error("❌ Error fetching active tenants:", error);
    return NextResponse.json(
      { error: "Failed to fetch active tenants" },
      { status: 500 }
    );
  }
}

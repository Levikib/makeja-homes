import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { tenantId } = body;

    console.log("🤖 Auto-generating garbage fees for tenant:", tenantId);

    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      include: {
        units: {
          include: {
            properties: {
              select: {
                id: true,
                defaultGarbageFee: true,
              },
            },
          },
        },
        lease_agreements: {
          where: { status: 'ACTIVE' },
          select: { startDate: true },
        },
        garbage_fees: {
          select: {
            month: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    if (tenant.units.status === 'VACANT') {
      console.log("🏠 Unit is vacant - no auto-generation");
      return NextResponse.json({ generated: 0, message: "Unit is vacant" });
    }

    let leaseStartDate;
    if (tenant.lease_agreements.length > 0) {
      const leaseDates = tenant.lease_agreements.map(l => new Date(l.startDate));
      leaseStartDate = new Date(Math.min(...leaseDates.map(d => d.getTime())));
    } else if (tenant.createdAt) {
      leaseStartDate = new Date(tenant.createdAt);
    } else {
      const now = new Date();
      leaseStartDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
    }

    const leaseStartMonth = leaseStartDate.getMonth() + 1;
    const leaseStartYear = leaseStartDate.getFullYear();

    console.log(`📅 Lease start: ${leaseStartMonth}/${leaseStartYear}`);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const defaultFee = tenant.units.properties.defaultGarbageFee || 500;
    console.log(`💰 Default garbage fee: KSh ${defaultFee}`);

    const existingFees = tenant.garbage_fees.map(f => {
      const feeDate = new Date(f.month);
      return `${feeDate.getMonth() + 1}-${feeDate.getFullYear()}`;
    });

    const generated = [];
    let checkYear = leaseStartYear;
    let checkMonth = leaseStartMonth;

    while (checkYear < currentYear || (checkYear === currentYear && checkMonth <= currentMonth)) {
      const checkKey = `${checkMonth}-${checkYear}`;
      
      if (!existingFees.includes(checkKey)) {
        const billDate = new Date(checkYear, checkMonth - 1, 1);
        
        try {
          const newFee = await prisma.garbage_fees.create({
            data: {
              id: `garbage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              month: billDate,
              amount: defaultFee,
              isApplicable: true,
              status: 'PENDING',
              updatedAt: new Date(), // FIX: Add updatedAt
              tenants: { connect: { id: tenantId } },
              units: { connect: { id: tenant.unitId } },
            },
          });
          
          console.log(`✅ Generated: ${checkMonth}/${checkYear} - KSh ${defaultFee}`);
          generated.push(newFee);
        } catch (error: any) {
          console.error(`❌ Failed ${checkMonth}/${checkYear}:`, error.message);
        }
      }

      checkMonth++;
      if (checkMonth > 12) {
        checkMonth = 1;
        checkYear++;
      }
    }

    console.log(`🎉 Auto-generated ${generated.length} garbage fees`);

    return NextResponse.json({
      success: true,
      generated: generated.length,
      fees: generated,
    });
  } catch (error: any) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { error: "Failed to auto-generate", details: error.message },
      { status: 500 }
    );
  }
}

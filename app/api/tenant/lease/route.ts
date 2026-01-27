import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-min-32-characters-long"
);

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify token and extract user ID
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;

    console.log("📄 Fetching lease for user:", userId);

    // Get tenant record with all related data
    const tenant = await prisma.tenants.findFirst({
      where: { userId: userId },
      include: {
        users: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true
          }
        },
        units: {
          include: {
            properties: {
              select: {
                name: true,
                address: true,
                city: true,
                state: true,
                country: true
              }
            }
          }
        },
        lease_agreements: {
          where: {
            status: "ACTIVE"
          },
          orderBy: {
            createdAt: "desc"
          },
          take: 1
        }
      }
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Check if there's a formal lease agreement
    const leaseAgreement = tenant.lease_agreements[0];

    // Use lease agreement data if exists, otherwise use tenant table data
    const startDate = leaseAgreement?.startDate || tenant.leaseStartDate;
    const endDate = leaseAgreement?.endDate || tenant.leaseEndDate;
    const rentAmount = leaseAgreement?.rentAmount || tenant.rentAmount;
    const depositAmount = leaseAgreement?.depositAmount || tenant.depositAmount;
    const terms = leaseAgreement?.terms;
    const contractTerms = leaseAgreement?.contractTerms;

    // Calculate lease duration and remaining time
    const now = new Date();
    const leaseStart = new Date(startDate);
    const leaseEnd = new Date(endDate);
    const totalDays = Math.ceil((leaseEnd.getTime() - leaseStart.getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.ceil((leaseEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = totalDays - remainingDays;
    const percentComplete = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

    // Determine lease status
    let leaseStatus = "Active";
    if (now < leaseStart) {
      leaseStatus = "Upcoming";
    } else if (now > leaseEnd) {
      leaseStatus = "Expired";
    } else if (remainingDays <= 30) {
      leaseStatus = "Expiring Soon";
    }

    const leaseData = {
      id: leaseAgreement?.id || tenant.id,
      status: leaseStatus,
      startDate: startDate,
      endDate: endDate,
      rentAmount: rentAmount,
      depositAmount: depositAmount,
      terms: terms,
      contractTerms: contractTerms,
      
      // Duration calculations
      totalDays,
      remainingDays: remainingDays > 0 ? remainingDays : 0,
      elapsedDays: elapsedDays > 0 ? elapsedDays : 0,
      percentComplete: Math.round(percentComplete),
      
      // Digital signature info (only if lease agreement exists)
      contractSentAt: leaseAgreement?.contractSentAt || null,
      contractViewedAt: leaseAgreement?.contractViewedAt || null,
      contractSignedAt: leaseAgreement?.contractSignedAt || null,
      isSigned: !!leaseAgreement?.contractSignedAt,
      hasDigitalContract: !!leaseAgreement,
      
      // Tenant info
      tenant: {
        name: `${tenant.users.firstName} ${tenant.users.lastName}`,
        email: tenant.users.email,
        phone: tenant.users.phoneNumber
      },
      
      // Property & Unit info
      property: {
        name: tenant.units.properties.name,
        address: tenant.units.properties.address,
        city: tenant.units.properties.city,
        state: tenant.units.properties.state,
        country: tenant.units.properties.country
      },
      unit: {
        unitNumber: tenant.units.unitNumber,
        type: tenant.units.type,
        bedrooms: tenant.units.bedrooms,
        bathrooms: tenant.units.bathrooms
      }
    };

    console.log("✅ Lease data retrieved (source:", leaseAgreement ? "lease_agreements" : "tenants table", ")");

    return NextResponse.json(leaseData);
  } catch (error: any) {
    console.error("❌ Error fetching lease:", error);
    return NextResponse.json(
      { error: "Failed to fetch lease data" },
      { status: 500 }
    );
  }
}
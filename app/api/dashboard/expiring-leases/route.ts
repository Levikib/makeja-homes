import { jwtVerify } from "jose"
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  try {
  // Auth guard
  const token = request.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!["ADMIN","MANAGER"].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }


    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const ninetyDaysFromNow = new Date(today);
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const expiringLeases = await prisma.lease_agreements.findMany({
      where: {
        status: "ACTIVE",
        endDate: {
          gte: today,
          lte: ninetyDaysFromNow,
        },
      },
      include: {
        units: {
          include: {
            properties: true,
          },
        },
        tenants: {
          include: {
            users: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        endDate: 'asc',
      },
    });

    const categorized = {
      critical: [] as any[],
      warning: [] as any[],
      info: [] as any[],
    };

    expiringLeases.forEach((lease) => {
      const daysRemaining = Math.ceil(
        (new Date(lease.endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      const leaseData = {
        ...lease,
        daysRemaining,
      };

      if (daysRemaining <= 30) {
        categorized.critical.push(leaseData);
      } else if (daysRemaining <= 60) {
        categorized.warning.push(leaseData);
      } else {
        categorized.info.push(leaseData);
      }
    });

    return NextResponse.json({
      total: expiringLeases.length,
      categorized,
    });
  } catch (error) {
    console.error("Error fetching expiring leases:", error);
    return NextResponse.json(
      { error: "Failed to fetch expiring leases" },
      { status: 500 }
    );
  }
}

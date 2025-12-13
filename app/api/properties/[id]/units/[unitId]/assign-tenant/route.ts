import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

function generateUniqueId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${random}`;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string; unitId: string } }
) {
  try {
    const body = await request.json();
    const { tenant, lease } = body;

    if (!tenant.firstName || !tenant.lastName || !tenant.email) {
      return NextResponse.json({ error: "Missing required tenant fields" }, { status: 400 });
    }

    if (!lease.startDate || !lease.endDate || !lease.monthlyRent) {
      return NextResponse.json({ error: "Missing required lease fields" }, { status: 400 });
    }

    const startDate = new Date(lease.startDate);
    const endDate = new Date(lease.endDate);
    const now = new Date();

    if (startDate >= endDate) {
      return NextResponse.json({ error: "Lease end date must be after start date" }, { status: 400 });
    }

    const unit = await prisma.units.findUnique({ where: { id: params.unitId } });
    if (!unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }
    if (unit.status === "OCCUPIED") {
      return NextResponse.json({ error: "Unit is already occupied" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const timestamp = new Date();

      let userId = null;
      const existingUser = await tx.users.findUnique({ where: { email: tenant.email } });

      if (existingUser) {
        userId = existingUser.id;
      } else {
        userId = generateUniqueId("user");
        const hashedPassword = await bcrypt.hash("TempPass123!", 10);

        await tx.users.create({
          data: {
            id: userId,
            email: tenant.email,
            password: hashedPassword,
            firstName: tenant.firstName,
            lastName: tenant.lastName,
            phoneNumber: tenant.phoneNumber,
            role: "TENANT",
            isActive: true,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        });
      }

      const tenantId = generateUniqueId("tenant");
      const createdTenant = await tx.tenants.create({
        data: {
          id: tenantId,
          userId: userId,
          unitId: params.unitId,
          leaseStartDate: startDate,
          leaseEndDate: endDate,
          rentAmount: lease.monthlyRent,
          depositAmount: lease.securityDeposit || 0,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      });

      const leaseId = generateUniqueId("lease");
      const createdLease = await tx.lease_agreements.create({
        data: {
          id: leaseId,
          tenantId: createdTenant.id,
          unitId: params.unitId,
          startDate: startDate,
          endDate: endDate,
          rentAmount: lease.monthlyRent, // ONLY rentAmount, no monthlyRent
          depositAmount: lease.securityDeposit || 0,
          status: startDate <= now ? "ACTIVE" : "PENDING",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      });

      const newStatus = startDate <= now ? "OCCUPIED" : "RESERVED";
      const updatedUnit = await tx.units.update({
        where: { id: params.unitId },
        data: { status: newStatus, updatedAt: timestamp },
      });

      return { tenant: createdTenant, lease: createdLease, unit: updatedUnit };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error assigning tenant:", error);
    return NextResponse.json({ error: "Failed to assign tenant" }, { status: 500 });
  }
}

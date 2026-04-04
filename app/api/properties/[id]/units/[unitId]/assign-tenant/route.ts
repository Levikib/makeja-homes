import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic'

function generateUniqueId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${random}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; unitId: string } }
) {
  // Auth guard
  const token = request.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let adminId: string;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    if (!["ADMIN", "MANAGER"].includes(payload.role as string)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    adminId = payload.id as string;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      idNumber,
      leaseStartDate,
      leaseEndDate,
      rentAmount,
      depositAmount,
    } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: "Missing required tenant fields" }, { status: 400 });
    }

    if (!leaseStartDate || !leaseEndDate || !rentAmount) {
      return NextResponse.json({ error: "Missing required lease fields" }, { status: 400 });
    }

    const startDate = new Date(leaseStartDate);
    const endDate = new Date(leaseEndDate);

    if (endDate <= startDate) {
      return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
    }

    const unit = await prisma.units.findUnique({
      where: { id: params.unitId },
      include: { properties: { select: { name: true } } },
    });

    if (!unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    if (unit.status === "OCCUPIED") {
      return NextResponse.json({ error: "Unit is already occupied" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const timestamp = new Date();
      let userId = null;

      const existingUser = await tx.users.findUnique({
        where: { email }
      });

      if (existingUser) {
        userId = existingUser.id;
      } else {
        userId = generateUniqueId("user");
        const hashedPassword = await bcrypt.hash("TempPass123!", 10);

        await tx.users.create({
          data: {
            id: userId,
            email,
            password: hashedPassword,
            firstName,
            lastName,
            phoneNumber: phoneNumber || null,
            idNumber: idNumber || null,
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
          userId,
          unitId: params.unitId,
          leaseStartDate: startDate,
          leaseEndDate: endDate,
          rentAmount,
          depositAmount: depositAmount || 0,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      });

      const leaseId = generateUniqueId("lease");
      const createdLease = await tx.lease_agreements.create({
        data: {
          id: leaseId,
          tenantId,
          unitId: params.unitId,
          startDate,
          endDate,
          rentAmount,
          depositAmount: depositAmount || 0,
          status: "PENDING",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      });

      await tx.units.update({
        where: { id: params.unitId },
        data: {
          status: "RESERVED",
          updatedAt: timestamp
        },
      });

      // Audit log
      await tx.activity_logs.create({
        data: {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          userId: adminId,
          action: "TENANT_CREATED",
          entityType: "tenant",
          entityId: tenantId,
          details: JSON.stringify({
            tenantName: `${firstName} ${lastName}`,
            email,
            propertyName: (unit as any).properties?.name,
            unitNumber: unit.unitNumber,
            rentAmount,
            depositAmount: depositAmount || 0,
          }),
          createdAt: timestamp,
        },
      }).catch(() => {});

      return {
        tenant: createdTenant,
        lease: createdLease,
        unit,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error assigning tenant:", error);
    return NextResponse.json(
      { error: "Failed to assign tenant" },
      { status: 500 }
    );
  }
}

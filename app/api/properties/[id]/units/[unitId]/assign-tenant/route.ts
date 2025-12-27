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
    const now = new Date();

    if (endDate <= startDate) {
      return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
    }

    const unit = await prisma.units.findUnique({
      where: { id: params.unitId },
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
          status: startDate <= now ? "ACTIVE" : "PENDING",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      });

      const newStatus = startDate <= now ? "OCCUPIED" : "RESERVED";
      const updatedUnit = await tx.units.update({
        where: { id: params.unitId },
        data: { 
          status: newStatus, 
          updatedAt: timestamp 
        },
      });

      return { 
        tenant: createdTenant, 
        lease: createdLease, 
        unit: updatedUnit 
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

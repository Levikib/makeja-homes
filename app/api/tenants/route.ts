import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    console.log("=== TENANT CREATION REQUEST ===");
    console.log("Received data:", JSON.stringify(data, null, 2));

    if (!data.idNumber) {
      console.log("ERROR: ID number missing");
      return NextResponse.json(
        { error: "ID number is required" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.users.findFirst({
      where: { idNumber: data.idNumber },
    });

    if (existingUser) {
      console.log("ERROR: Duplicate ID number:", data.idNumber);
      return NextResponse.json(
        { error: "A user with this ID number already exists" },
        { status: 400 }
      );
    }

    const now = new Date();
    console.log("Current time:", now.toISOString());
    
    const activeTenant = await prisma.tenants.findFirst({
      where: {
        unitId: data.unitId,
        leaseEndDate: {
          gte: now
        }
      }
    });

    console.log("Active tenant check result:", activeTenant);

    if (activeTenant) {
      console.log("ERROR: Unit already has active tenant");
      return NextResponse.json(
        { error: "This unit already has an active tenant" },
        { status: 400 }
      );
    }

    const leaseStartDate = new Date(data.leaseStartDate);
    const leaseEndDate = new Date(data.leaseEndDate);
    const hashedPassword = await bcrypt.hash("changeme123", 10);

    console.log("Creating user...");
    const user = await prisma.users.create({
      data: {
        id: generateId("user"),
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        idNumber: data.idNumber,
        password: hashedPassword,
        role: "TENANT",
        isActive: true,
        updatedAt: now,
      },
    });

    console.log("User created:", user.id);
    console.log("Creating tenant...");

    const tenant = await prisma.tenants.create({
      data: {
        id: generateId("tenant"),
        userId: user.id,
        unitId: data.unitId,
        rentAmount: data.rentAmount,
        depositAmount: data.depositAmount,
        leaseStartDate: leaseStartDate,
        leaseEndDate: leaseEndDate,
        updatedAt: now,
      },
    });

    console.log("Tenant created:", tenant.id);
    console.log("Creating lease agreement...");

    await prisma.lease_agreements.create({
      data: {
        id: generateId("lease"),
        tenantId: tenant.id,
        unitId: data.unitId,
        startDate: leaseStartDate,
        endDate: leaseEndDate,
        rentAmount: data.rentAmount,
        depositAmount: data.depositAmount || data.rentAmount * 2,
        status: "ACTIVE",
        updatedAt: now,
      },
    });

    console.log("Updating unit status...");

    await prisma.units.update({
      where: { id: data.unitId },
      data: { status: "OCCUPIED", updatedAt: now },
    });

    console.log("SUCCESS: Tenant created successfully");

    return NextResponse.json({
      success: true,
      tenant: tenant,
      message: "Tenant created successfully"
    });
  } catch (error: any) {
    console.error("=== TENANT CREATION ERROR ===");
    console.error("Error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { error: "Failed to create tenant", details: error.message },
      { status: 500 }
    );
  }
}

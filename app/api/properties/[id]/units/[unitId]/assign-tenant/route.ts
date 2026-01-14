import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendTenantCredentials } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; unitId: string } }
) {
  try {
    // ============================================
    // 1. AUTHENTICATION & AUTHORIZATION
    // ============================================
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const companyId = payload.companyId as string | null;

    // ============================================
    // 2. PARSE & VALIDATE REQUEST DATA
    // ============================================
    const body = await request.json();

    console.log("📋 Received tenant data:");
    console.log(JSON.stringify(body, null, 2));

    // Extract data from nested structure
    const firstName = body.tenant?.firstName?.trim();
    const lastName = body.tenant?.lastName?.trim();
    const email = body.tenant?.email?.toLowerCase();
    const phoneNumber = body.tenant?.phoneNumber;
    const idNumber = body.tenant?.idNumber;
    const moveInDate = body.lease?.startDate;
    const leaseEndDate = body.lease?.endDate;
    const monthlyRent = body.lease?.monthlyRent || 0; 
    const securityDeposit = body.lease?.securityDeposit || 0; 

    console.log("👤 Creating tenant for unit:", params.unitId);
    console.log("📋 Required fields check:");
    console.log("- firstName:", firstName);
    console.log("- lastName:", lastName);
    console.log("- email:", email);
    console.log("- moveInDate:", moveInDate);

    // Validate required fields
    if (!firstName || !lastName || !email || !moveInDate) {
      console.log("❌ Validation failed - missing fields");
      return NextResponse.json(
        {
          error: "Missing required fields: firstName, lastName, email, and move-in date are required",
          details: {
            firstName: !firstName ? "missing" : "ok",
            lastName: !lastName ? "missing" : "ok",
            email: !email ? "missing" : "ok",
            moveInDate: !moveInDate ? "missing" : "ok",
          },
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // ============================================
    // 3. CHECK FOR DUPLICATE EMAIL
    // ============================================
    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log("❌ Email already exists:", email);
      return NextResponse.json(
        { error: "A user with this email already exists. Please use a different email address." },
        { status: 400 }
      );
    }

    // ============================================
    // 4. VERIFY UNIT & COMPANY ACCESS
    // ============================================
    const unit = await prisma.units.findUnique({
      where: { id: params.unitId },
      include: {
        properties: {
          select: {
            name: true,
            companyId: true,
          },
        },
      },
    });

    if (!unit) {
      console.log("❌ Unit not found:", params.unitId);
      return NextResponse.json(
        { error: "Unit not found" },
        { status: 404 }
      );
    }

    // Verify company match for multi-tenant isolation
    if (companyId && unit.properties.companyId !== companyId) {
      console.log("❌ Unauthorized access - company mismatch");
      return NextResponse.json(
        { error: "Unauthorized access to this unit" },
        { status: 403 }
      );
    }

    // ============================================
    // 5. GENERATE TEMPORARY PASSWORD
    // ============================================
    const generatePassword = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
      let password = "";
      for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    const temporaryPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    console.log("🔑 Generated temporary password for:", email);

    // ============================================
    // 6. CREATE USER ACCOUNT
    // ============================================
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 10)}`;

    const user = await prisma.users.create({
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
        companyId: unit.properties.companyId,
        mustChangePassword: true, // Force password change on first login
        updatedAt: new Date(),
      },
    });

    console.log("✅ User created:", user.id, "-", user.email);

    // ============================================
    // 7. CREATE TENANT RECORD
    // ============================================
    const tenant = await prisma.tenants.create({
      data: {
        id: tenantId,
        userId: user.id,
        unitId: params.unitId,
        leaseStartDate: new Date(moveInDate),
        leaseEndDate: leaseEndDate ? new Date(leaseEndDate) : null,
        rentAmount: monthlyRent || 0,
        depositAmount: securityDeposit || 0, 
        updatedAt: new Date(),
      },
    });

    console.log("✅ Tenant created:", tenant.id);

    // ============================================
    // 8. UPDATE UNIT STATUS TO OCCUPIED
    // ============================================
    await prisma.units.update({
      where: { id: params.unitId },
      data: {
        status: "OCCUPIED",
        updatedAt: new Date(),
      },
    });

    console.log("✅ Unit status updated to OCCUPIED");

    // ============================================
    // 9. SEND CREDENTIALS EMAIL TO TENANT
    // ============================================
    let emailSent = false;
    try {
      await sendTenantCredentials(
        email,
        `${firstName} ${lastName}`,
        email, // username is email
        temporaryPassword,
        unit.properties.name,
        unit.unitNumber
      );
      console.log("✅ Credentials email sent successfully to:", email);
      emailSent = true;
    } catch (emailError) {
      console.error("⚠️ Failed to send credentials email:", emailError);
      // Don't fail the entire operation if email fails
      // User account is still created, admin can manually share credentials
    }

    // ============================================
    // 10. RETURN SUCCESS RESPONSE
    // ============================================
    return NextResponse.json(
      {
        success: true,
        message: emailSent
          ? "Tenant created successfully! Login credentials have been sent to their email."
          : "Tenant created successfully! Please manually share the credentials below.",
        tenant: {
          id: tenant.id,
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          leaseStartDate: tenant.leaseStartDate,
          leaseEndDate: tenant.leaseEndDate,
        },
        credentials: {
          username: email,
          temporaryPassword, // Return to admin for backup/manual sharing
          emailSent,
        },
        unit: {
          id: unit.id,
          unitNumber: unit.unitNumber,
          status: "OCCUPIED",
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("❌ Error creating tenant:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });

    // Handle specific Prisma errors
    if (error.code === "P2002") {
      const target = error.meta?.target || [];
      if (target.includes("email")) {
        return NextResponse.json(
          { error: "This email address is already registered in the system" },
          { status: 400 }
        );
      }
      if (target.includes("idNumber")) {
        return NextResponse.json(
          { error: "This ID number is already registered in the system" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Failed to create tenant",
        message: error.message,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
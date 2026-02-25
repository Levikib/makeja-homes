import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("📝 Registration request received");
    console.log("Request body:", JSON.stringify(body, null, 2));

    const {
      companyName,
      email,
      firstName,
      lastName,
      phoneNumber,
      password,
    } = body;

    console.log("Company:", companyName);
    console.log("Admin:", firstName, lastName);
    console.log("Email:", email);

    // Validation
    if (!companyName || !email || !firstName || !lastName || !password) {
      console.log("❌ Missing required fields");
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      console.log("❌ Password too short");
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    console.log("✅ Validation passed");
    console.log("🔍 Checking for existing company...");

    // Check if company email already exists
    const existingCompany = await prisma.companies.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingCompany) {
      console.log("❌ Company already exists:", existingCompany.id);
      return NextResponse.json(
        { error: "A company with this email already exists" },
        { status: 400 }
      );
    }

    console.log("✅ No existing company found");
    console.log("🔍 Checking for existing user...");

    // Check if user email already exists
    const existingUser = await prisma.users.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      console.log("❌ User already exists:", existingUser.id);
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    console.log("✅ No existing user found");
    console.log("🏢 Creating company...");

    // Create company
    const company = await prisma.companies.create({
      data: {
        id: crypto.randomUUID(),
        name: companyName,
        email: email.toLowerCase(),
        phone: phoneNumber || null,
        updatedAt: new Date(),
        isActive: true,
      },
    });

    console.log("✅ Company created:", company.id, company.name);
    console.log("👤 Creating admin user...");

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate user ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create admin user linked to company
    const user = await prisma.users.create({
      data: {
        id: userId,
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        phoneNumber: phoneNumber || null,
        role: "ADMIN",
        isActive: true,
        companyId: company.id,
        updatedAt: new Date(),
      },
    });

    console.log("✅ Admin user created:", user.id);
    console.log("🎉 Registration completed successfully!");

    return NextResponse.json({
      success: true,
      message: "Account created successfully!",
      userId: user.id,
      companyId: company.id,
    });
  } catch (error: any) {
    console.error("❌ Registration error:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    
    return NextResponse.json(
      { error: `Registration failed: ${error.message}` },
      { status: 500 }
    );
  }
}
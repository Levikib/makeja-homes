import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import bcrypt from "bcryptjs";

// GET - List all users (excluding tenants by default)
export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify token and get companyId
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const userId = payload.userId as string;
    const companyId = payload.companyId as string | null;

    console.log("📋 Fetching users for company:", companyId);

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    // Build where filter with company isolation
    const where: any = {
      isActive: true,
      companyId: companyId,
    };

    // CRITICAL: Filter by company
    if (companyId) {
      where.companyId = companyId;
    }

    // Filter by role if specified
    if (role) {
      where.role = role;
    } else {
      // Exclude TENANT role from general users list
      where.role = {
        not: "TENANT",
      };
    }

    const users = await prisma.users.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        idNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        companyId: true,
        updatedAt: true,
        lastLoginAt: true,
        properties_properties_managerIdTousers: {
          select: { id: true, name: true },
        },
        properties_properties_caretakerIdTousers: {
          select: { id: true, name: true },
        },
        properties_properties_storekeeperId: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`✅ Found ${users.length} users for company ${companyId}`);

    return NextResponse.json({ users });
    // Transform to include propertyIds
    const usersWithProperties = users.map(user => ({
      ...user,
      propertyIds: [
        ...user.properties_properties_managerIdTousers.map(p => p.id),
        ...user.properties_properties_caretakerIdTousers.map(p => p.id),
        ...user.properties_properties_storekeeperId.map(p => p.id),
      ],
    }));

    return NextResponse.json(usersWithProperties);
  } catch (error) {
    console.error("❌ Users fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN can create users
    if (currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { firstName, lastName, email, phoneNumber, idNumber, role, password, propertyIds } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !role || !password) {
      return NextResponse.json(
        { error: "Missing required fields: firstName, lastName, email, role, password" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["ADMIN", "MANAGER", "CARETAKER", "STOREKEEPER", "TECHNICAL"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be one of: " + validRoles.join(", ") },
        { status: 400 }
      );
    }

    // Validate caretaker can only have 1 property
    if (role === "CARETAKER" && propertyIds && propertyIds.length > 1) {
      return NextResponse.json(
        { error: "Caretaker can only be assigned to ONE property" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Check if idNumber already exists (if provided)
    if (idNumber) {
      const existingIdNumber = await prisma.users.findFirst({
        where: { idNumber },
      });

      if (existingIdNumber) {
        return NextResponse.json(
          { error: "ID Number already exists" },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const now = new Date();

    // Create user and assign properties
    await prisma.$transaction(async (tx) => {
      // Create user
      await tx.users.create({
        data: {
          id: userId,
          firstName,
          lastName,
          email,
          phoneNumber: phoneNumber || null,
          idNumber: idNumber || null,
          password: hashedPassword,
          role,
          isActive: true,
          emailVerified: null,
          createdAt: now,
          updatedAt: now,
        },
      });

      // Assign properties based on role
      if (propertyIds && propertyIds.length > 0) {
        const updateData: any = {};
        
        if (role === "MANAGER") {
          updateData.managerId = userId;
        } else if (role === "CARETAKER") {
          updateData.caretakerId = userId;
        } else if (role === "STOREKEEPER") {
          updateData.storekeeperId = userId;
        }

        if (Object.keys(updateData).length > 0) {
          for (const propertyId of propertyIds) {
            await tx.properties.update({
              where: { id: propertyId },
              data: {
                ...updateData,
                updatedAt: now,
              },
            });
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `User created successfully${propertyIds && propertyIds.length > 0 ? ' and assigned to properties' : ''}`,
    });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user", details: error.message },
      { status: 500 }
    );
  }
}

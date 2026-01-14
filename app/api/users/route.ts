import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import bcrypt from "bcryptjs";

// GET - List all users (excluding tenants by default)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const status = searchParams.get("status");

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (status === "active") {
      where.isActive = true;
    } else if (status === "inactive") {
      where.isActive = false;
    }

    // Exclude TENANT role from users list
    if (!role) {
      where.role = {
        not: "TENANT"
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
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // Get property counts for each user
    const usersWithPropertyCounts = await Promise.all(
      users.map(async (user) => {
        // Count properties where user is in managerIds, caretakerIds, or storekeeperIds arrays
        const properties = await prisma.properties.findMany({
          where: {
            OR: [
              { managerIds: { has: user.id } },
              { caretakerIds: { has: user.id } },
              { storekeeperIds: { has: user.id } }
            ]
          },
          select: {
            id: true,
            name: true
          }
        });

        return {
          ...user,
          propertyCount: properties.length,
          properties: properties
        };
      })
    );

    return NextResponse.json({ users: usersWithPropertyCounts });
  } catch (error) {
    console.error("❌ Users fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
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

    // Create user and assign properties using ARRAYS
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

      // Assign properties based on role (using array fields)
      if (propertyIds && propertyIds.length > 0) {
        for (const propertyId of propertyIds) {
          const property = await tx.properties.findUnique({
            where: { id: propertyId },
            select: {
              managerIds: true,
              caretakerIds: true,
              storekeeperIds: true
            }
          });

          if (!property) continue;

          const updateData: any = { updatedAt: now };

          if (role === "MANAGER") {
            updateData.managerIds = [...property.managerIds, userId];
          } else if (role === "CARETAKER") {
            updateData.caretakerIds = [...property.caretakerIds, userId];
          } else if (role === "STOREKEEPER") {
            updateData.storekeeperIds = [...property.storekeeperIds, userId];
          }

          await tx.properties.update({
            where: { id: propertyId },
            data: updateData,
          });
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

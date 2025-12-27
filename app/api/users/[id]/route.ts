import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import bcrypt from "bcryptjs";

// GET - Fetch single user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { id: params.id },
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
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get properties where user is in managerIds, caretakerIds, or storekeeperIds arrays
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

    return NextResponse.json({
      ...user,
      propertyIds: properties.map(p => p.id),
      properties: properties
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN can update users
    if (currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const userId = params.id;

    const { firstName, lastName, email, phoneNumber, idNumber, role, password, propertyIds } = body;

    // Validate caretaker can only have 1 property
    if (role === "CARETAKER" && propertyIds && propertyIds.length > 1) {
      return NextResponse.json(
        { error: "Caretaker can only be assigned to ONE property" },
        { status: 400 }
      );
    }

    // Check if email is being changed and if it already exists
    if (email) {
      const existingUser = await prisma.users.findFirst({
        where: {
          email,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 400 }
        );
      }
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // Get current user to know their role
      const currentUserData = await tx.users.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!currentUserData) {
        throw new Error("User not found");
      }

      const oldRole = currentUserData.role;
      const newRole = role || oldRole;

      // Prepare user update data
      const updateData: any = {
        updatedAt: now,
      };

      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (email) updateData.email = email;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber || null;
      if (idNumber !== undefined) updateData.idNumber = idNumber || null;
      if (role) updateData.role = role;

      // Hash new password if provided
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      // Update user
      await tx.users.update({
        where: { id: userId },
        data: updateData,
      });

      // Handle property assignments
      if (propertyIds !== undefined) {
        // Step 1: Remove user from ALL properties where they're currently assigned
        const allProperties = await tx.properties.findMany({
          where: {
            OR: [
              { managerIds: { has: userId } },
              { caretakerIds: { has: userId } },
              { storekeeperIds: { has: userId } }
            ]
          },
          select: {
            id: true,
            managerIds: true,
            caretakerIds: true,
            storekeeperIds: true
          }
        });

        // Remove user from each property's arrays
        for (const property of allProperties) {
          await tx.properties.update({
            where: { id: property.id },
            data: {
              managerIds: property.managerIds.filter(id => id !== userId),
              caretakerIds: property.caretakerIds.filter(id => id !== userId),
              storekeeperIds: property.storekeeperIds.filter(id => id !== userId),
              updatedAt: now
            }
          });
        }

        // Step 2: Add user to selected properties based on their role
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

            // Add user to appropriate array based on their role
            if (newRole === "MANAGER") {
              if (!property.managerIds.includes(userId)) {
                updateData.managerIds = [...property.managerIds, userId];
              }
            } else if (newRole === "CARETAKER") {
              if (!property.caretakerIds.includes(userId)) {
                updateData.caretakerIds = [...property.caretakerIds, userId];
              }
            } else if (newRole === "STOREKEEPER") {
              if (!property.storekeeperIds.includes(userId)) {
                updateData.storekeeperIds = [...property.storekeeperIds, userId];
              }
            }

            // Only update if we have changes
            if (Object.keys(updateData).length > 1) {
              await tx.properties.update({
                where: { id: propertyId },
                data: updateData
              });
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN can delete users
    if (currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = params.id;

    // Prevent deleting yourself
    if (userId === currentUser.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Remove user from all property arrays before deleting
      const properties = await tx.properties.findMany({
        where: {
          OR: [
            { managerIds: { has: userId } },
            { caretakerIds: { has: userId } },
            { storekeeperIds: { has: userId } }
          ]
        },
        select: {
          id: true,
          managerIds: true,
          caretakerIds: true,
          storekeeperIds: true
        }
      });

      for (const property of properties) {
        await tx.properties.update({
          where: { id: property.id },
          data: {
            managerIds: property.managerIds.filter(id => id !== userId),
            caretakerIds: property.caretakerIds.filter(id => id !== userId),
            storekeeperIds: property.storekeeperIds.filter(id => id !== userId),
            updatedAt: new Date()
          }
        });
      }

      // Delete the user
      await tx.users.delete({
        where: { id: userId }
      });
    });

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}

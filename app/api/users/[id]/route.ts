import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import bcrypt from "bcryptjs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const companyId = payload.companyId as string | null;

    // Fetch user with company filter
    const user = await prisma.users.findFirst({
      where: {
        id: params.id,
        companyId: companyId, // CRITICAL: Only show if same company
      },
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
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        companyId: true,
        idNumber: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
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
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Add propertyIds array
    const userWithProperties = {
      ...user,
      propertyIds: [
        ...user.properties_properties_managerIdTousers.map(p => p.id),
        ...user.properties_properties_caretakerIdTousers.map(p => p.id),
        ...user.properties_properties_storekeeperId.map(p => p.id),
      ],
    };

    return NextResponse.json(userWithProperties);
  } catch (error) {
    console.error("❌ User fetch error:", error);
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const companyId = payload.companyId as string | null;

    const body = await request.json();

    // Verify user belongs to same company before updating
    const existingUser = await prisma.users.findFirst({
      where: {
        id: params.id,
        companyId: companyId,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update user
    const updatedUser = await prisma.users.update({
      where: { id: params.id },
      data: {
        ...body,
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { firstName, lastName, email, phoneNumber, idNumber, role, password, propertyIds } = body;

    // Validate caretaker can only have 1 property
    if (role === "CARETAKER" && propertyIds && propertyIds.length > 1) {
      return NextResponse.json(
        { error: "Caretaker can only be assigned to ONE property" },
        { status: 400 }
      );
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // Update user basic info
      const updateData: any = {
        firstName,
        lastName,
        email,
        phoneNumber,
        idNumber,
        role,
        updatedAt: now,
      };

      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      await tx.users.update({
        where: { id: params.id },
        data: updateData,
      });

      // Remove user from all properties first
      await tx.properties.updateMany({
        where: {
          OR: [
            { managerId: params.id },
            { caretakerId: params.id },
            { storekeeperId: params.id },
          ],
        },
        data: {
          managerId: null,
          caretakerId: null,
          storekeeperId: null,
          updatedAt: now,
        },
      });

      // Reassign properties based on role
      if (propertyIds && propertyIds.length > 0) {
        const updateData: any = {};
        
        if (role === "MANAGER") {
          updateData.managerId = params.id;
        } else if (role === "CARETAKER") {
          updateData.caretakerId = params.id;
        } else if (role === "STOREKEEPER") {
          updateData.storekeeperId = params.id;
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete: mark as inactive
    await prisma.users.update({
      where: { id: params.id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("❌ User update error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
    return NextResponse.json({
      success: true,
      message: "User deactivated successfully",
    });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user", details: error.message },
      { status: 500 }
    );
  }
}
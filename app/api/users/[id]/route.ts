import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth-helpers"
import { getPrismaForRequest } from "@/lib/get-prisma";
import bcrypt from "bcryptjs";

// GET - Fetch single user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUserFromRequest(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getPrismaForRequest(request);

    const rows = await db.$queryRawUnsafe(`
      SELECT id, email, "firstName", "lastName", "phoneNumber", "idNumber",
             role, "isActive", "emailVerified", "createdAt", "updatedAt", "lastLoginAt"
      FROM users WHERE id = $1 LIMIT 1
    `, params.id) as any[];

    if (!rows.length) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const user = rows[0];

    const props = await db.$queryRawUnsafe(`
      SELECT id, name FROM properties
      WHERE $1 = ANY("managerIds") OR $1 = ANY("caretakerIds") OR $1 = ANY("storekeeperIds")
    `, user.id) as any[];

    return NextResponse.json({ ...user, propertyIds: (props as any[]).map((p: any) => p.id), properties: props });
  } catch (error: any) {
    console.error("Error fetching user:", error?.message);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUserFromRequest(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (currentUser.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const db = getPrismaForRequest(request);
    const body = await request.json();
    const { firstName, lastName, email, phoneNumber, idNumber, role, password, propertyIds } = body;
    const userId = params.id;

    if (role === "CARETAKER" && propertyIds && propertyIds.length > 1) {
      return NextResponse.json({ error: "Caretaker can only be assigned to ONE property" }, { status: 400 });
    }

    // Check email uniqueness (excluding this user)
    if (email) {
      const existing = await db.$queryRawUnsafe(`
        SELECT id FROM users WHERE email = $1 AND id != $2 LIMIT 1
      `, email.toLowerCase().trim(), userId) as any[];
      if (existing.length) return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    const now = new Date();

    // Get current role
    const userRows = await db.$queryRawUnsafe(`SELECT role FROM users WHERE id = $1 LIMIT 1`, userId) as any[];
    if (!userRows.length) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const newRole = role || userRows[0].role;

    // Build SET clause dynamically
    const sets: string[] = [`"updatedAt" = $1`];
    const vals: any[] = [now];
    const push = (col: string, val: any) => { vals.push(val); sets.push(`"${col}" = $${vals.length}`); };

    if (firstName) push("firstName", firstName);
    if (lastName) push("lastName", lastName);
    if (email) push("email", email.toLowerCase().trim());
    if (phoneNumber !== undefined) push("phoneNumber", phoneNumber || null);
    if (idNumber !== undefined) push("idNumber", idNumber || null);
    if (role) push("role", role);
    if (password) push("password", await bcrypt.hash(password, 10));

    vals.push(userId);
    await db.$executeRawUnsafe(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${vals.length}`,
      ...vals
    );

    // Re-assign properties if propertyIds provided
    if (propertyIds !== undefined) {
      // Remove from all existing property arrays
      const allProps = await db.$queryRawUnsafe(`
        SELECT id, "managerIds", "caretakerIds", "storekeeperIds" FROM properties
        WHERE $1 = ANY("managerIds") OR $1 = ANY("caretakerIds") OR $1 = ANY("storekeeperIds")
      `, userId) as any[];

      for (const p of allProps) {
        await db.$executeRawUnsafe(`
          UPDATE properties SET
            "managerIds" = array_remove("managerIds", $1),
            "caretakerIds" = array_remove("caretakerIds", $1),
            "storekeeperIds" = array_remove("storekeeperIds", $1),
            "updatedAt" = $2
          WHERE id = $3
        `, userId, now, p.id);
      }

      // Add to selected properties
      for (const propertyId of (propertyIds || [])) {
        if (newRole === "MANAGER") {
          await db.$executeRawUnsafe(`
            UPDATE properties SET "managerIds" = array_append("managerIds", $1), "updatedAt" = $2
            WHERE id = $3 AND NOT ($1 = ANY("managerIds"))
          `, userId, now, propertyId);
        } else if (newRole === "CARETAKER") {
          await db.$executeRawUnsafe(`
            UPDATE properties SET "caretakerIds" = array_append("caretakerIds", $1), "updatedAt" = $2
            WHERE id = $3 AND NOT ($1 = ANY("caretakerIds"))
          `, userId, now, propertyId);
        } else if (newRole === "STOREKEEPER") {
          await db.$executeRawUnsafe(`
            UPDATE properties SET "storekeeperIds" = array_append("storekeeperIds", $1), "updatedAt" = $2
            WHERE id = $3 AND NOT ($1 = ANY("storekeeperIds"))
          `, userId, now, propertyId);
        }
      }
    }

    return NextResponse.json({ success: true, message: "User updated successfully" });
  } catch (error: any) {
    console.error("Error updating user:", error?.message);
    return NextResponse.json({ error: "Failed to update user", details: error.message }, { status: 500 });
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUserFromRequest(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (currentUser.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const userId = params.id;
    if (userId === currentUser.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);
    const now = new Date();

    // Remove from all property arrays
    await db.$executeRawUnsafe(`
      UPDATE properties SET
        "managerIds" = array_remove("managerIds", $1),
        "caretakerIds" = array_remove("caretakerIds", $1),
        "storekeeperIds" = array_remove("storekeeperIds", $1),
        "updatedAt" = $2
      WHERE $1 = ANY("managerIds") OR $1 = ANY("caretakerIds") OR $1 = ANY("storekeeperIds")
    `, userId, now);

    await db.$executeRawUnsafe(`DELETE FROM users WHERE id = $1`, userId);

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting user:", error?.message);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}

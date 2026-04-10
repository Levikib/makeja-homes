import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { getCurrentUserFromRequest } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const caller = await getCurrentUserFromRequest(request)
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["ADMIN", "MANAGER"].includes(caller.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const db = getPrismaForRequest(request);
    await db.$executeRawUnsafe(
      `UPDATE users SET "isActive" = true, "updatedAt" = $2 WHERE id = $1`,
      params.id, new Date()
    );
    const rows = await db.$queryRawUnsafe<any[]>(`SELECT * FROM users WHERE id = $1`, params.id);
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Error activating user:", error);
    return NextResponse.json({ error: "Failed to activate user" }, { status: 500 });
  }
}

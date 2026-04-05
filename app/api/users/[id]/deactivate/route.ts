import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getPrismaForRequest(request);
    const now = new Date();

    await db.$executeRawUnsafe(
      `UPDATE users SET "isActive" = false, "updatedAt" = $2 WHERE id = $1`,
      params.id, now
    );

    // Remove this user from all property staff arrays
    const properties = await db.$queryRawUnsafe<any[]>(`
      SELECT id, "managerIds", "caretakerIds", "storekeeperIds" FROM properties
      WHERE "managerIds" @> ARRAY[$1]::text[]
        OR "caretakerIds" @> ARRAY[$1]::text[]
        OR "storekeeperIds" @> ARRAY[$1]::text[]
    `, params.id);

    for (const prop of properties) {
      const mgr = (prop.managerIds || []).filter((id: string) => id !== params.id);
      const care = (prop.caretakerIds || []).filter((id: string) => id !== params.id);
      const store = (prop.storekeeperIds || []).filter((id: string) => id !== params.id);
      await db.$executeRawUnsafe(
        `UPDATE properties SET "managerIds" = $2, "caretakerIds" = $3, "storekeeperIds" = $4, "updatedAt" = $5 WHERE id = $1`,
        prop.id, mgr, care, store, now
      );
    }

    const rows = await db.$queryRawUnsafe<any[]>(`SELECT * FROM users WHERE id = $1`, params.id);
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Error deactivating user:", error);
    return NextResponse.json({ error: "Failed to deactivate user" }, { status: 500 });
  }
}

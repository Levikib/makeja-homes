import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    if (!["ADMIN"].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    const db = getPrismaForRequest(request);
    const rows = await db.$queryRawUnsafe<any[]>(`SELECT id, "isActive" FROM users WHERE id = $1 LIMIT 1`, params.id);
    if (!rows.length) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const now = new Date();
    await db.$executeRawUnsafe(
      `UPDATE users SET "isActive" = $2, "updatedAt" = $3 WHERE id = $1`,
      params.id, !rows[0].isActive, now
    );

    const updated = await db.$queryRawUnsafe<any[]>(`SELECT * FROM users WHERE id = $1 LIMIT 1`, params.id);
    return NextResponse.json(updated[0]);
  } catch (error) {
    return NextResponse.json({ error: "Failed to toggle status" }, { status: 500 });
  }
}

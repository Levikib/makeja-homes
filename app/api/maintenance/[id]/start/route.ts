import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { jwtVerify } from "jose";

export const dynamic = "force-dynamic";

async function getAuth(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    return payload;
  } catch { return null; }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "MANAGER", "CARETAKER"].includes(user.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const db = getPrismaForRequest(req);
    const now = new Date();

    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT id, title, status FROM maintenance_requests WHERE id = $1 LIMIT 1`,
      params.id
    );
    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const mr = rows[0];
    // Allow starting from OPEN or ASSIGNED
    if (!["OPEN", "ASSIGNED", "PENDING"].includes(mr.status)) {
      return NextResponse.json({ error: `Cannot start work on request with status: ${mr.status}` }, { status: 400 });
    }

    await db.$executeRawUnsafe(
      `UPDATE maintenance_requests SET status = 'IN_PROGRESS', "assignedToId" = COALESCE("assignedToId", $1), "updatedAt" = $2 WHERE id = $3`,
      user.id, now, params.id
    );

    await db.$executeRawUnsafe(
      `INSERT INTO activity_logs (id, "userId", action, "entityType", "entityId", details, "createdAt")
       VALUES ($1, $2, 'START', 'MaintenanceRequest', $3, $4::jsonb, $5)
       ON CONFLICT DO NOTHING`,
      `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      user.id, params.id,
      JSON.stringify({ message: `Started work: ${mr.title}` }),
      now
    ).catch(() => {});

    const updated = await db.$queryRawUnsafe<any[]>(
      `SELECT * FROM maintenance_requests WHERE id = $1`, params.id
    );

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error: any) {
    console.error("[start]", error?.message);
    return NextResponse.json({ error: error.message || "Failed to start work" }, { status: 500 });
  }
}

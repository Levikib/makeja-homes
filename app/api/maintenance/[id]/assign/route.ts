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
  if (!["ADMIN", "MANAGER"].includes(user.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { assignedToId, priority } = body;

    if (!assignedToId) {
      return NextResponse.json({ error: "assignedToId is required" }, { status: 400 });
    }

    const db = getPrismaForRequest(req);
    const now = new Date();

    // Get assignee name for log
    const assignee = await db.$queryRawUnsafe<any[]>(
      `SELECT "firstName", "lastName" FROM users WHERE id = $1 LIMIT 1`,
      assignedToId
    ).catch(() => []);

    const updates: string[] = [`"assignedToId" = $2`, `status = 'OPEN'`, `"updatedAt" = $3`];
    const vals: any[] = [params.id, assignedToId, now];
    let idx = 4;

    if (priority) {
      updates.push(`priority = $${idx++}`);
      vals.push(priority);
    }

    await db.$executeRawUnsafe(
      `UPDATE maintenance_requests SET ${updates.join(", ")} WHERE id = $1`,
      ...vals
    );

    await db.$executeRawUnsafe(
      `INSERT INTO activity_logs (id, "userId", action, "entityType", "entityId", details, "createdAt")
       VALUES ($1, $2, 'ASSIGN', 'MaintenanceRequest', $3, $4::jsonb, $5)
       ON CONFLICT DO NOTHING`,
      `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      user.id, params.id,
      JSON.stringify({ message: `Assigned to ${assignee[0]?.firstName ?? ""} ${assignee[0]?.lastName ?? ""}`.trim() }),
      now
    ).catch(() => {});

    const updated = await db.$queryRawUnsafe<any[]>(
      `SELECT * FROM maintenance_requests WHERE id = $1`, params.id
    );

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error: any) {
    console.error("[assign]", error?.message);
    return NextResponse.json({ error: error.message || "Failed to assign" }, { status: 500 });
  }
}

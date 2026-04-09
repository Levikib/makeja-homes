import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { jwtVerify } from "jose";
import { sendMaintenanceNotification } from "@/lib/email";

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
      `SELECT id, "requestNumber", title, status FROM maintenance_requests WHERE id = $1 LIMIT 1`,
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

    // ── Notify tenant ──────────────────────────────────────────────────────
    try {
      const tenantInfo = await db.$queryRawUnsafe<any[]>(`
        SELECT u.email, u."firstName", u."lastName",
               wu."firstName" as "workerFirst", wu."lastName" as "workerLast"
        FROM maintenance_requests mr
        JOIN units un ON un.id = mr."unitId"
        JOIN tenants t ON t."unitId" = un.id AND t.status = 'ACTIVE'
        JOIN users u ON u.id = t."userId"
        LEFT JOIN users wu ON wu.id = mr."assignedToId"
        WHERE mr.id = $1 LIMIT 1
      `, params.id).catch(() => []);
      if (tenantInfo[0]?.email) {
        const assignedName = tenantInfo[0].workerFirst
          ? `${tenantInfo[0].workerFirst} ${tenantInfo[0].workerLast ?? ""}`.trim()
          : undefined;
        await sendMaintenanceNotification({
          event: "in_progress",
          to: tenantInfo[0].email,
          tenantName: `${tenantInfo[0].firstName} ${tenantInfo[0].lastName}`.trim(),
          requestNumber: mr.requestNumber ?? params.id,
          requestTitle: mr.title,
          assignedTo: assignedName,
        });
      }
    } catch (emailErr: any) {
      console.error("[start] email notification failed:", emailErr?.message);
    }

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error: any) {
    console.error("[start]", error?.message);
    return NextResponse.json({ error: error.message || "Failed to start work" }, { status: 500 });
  }
}

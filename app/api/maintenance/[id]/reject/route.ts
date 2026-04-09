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
  if (!["ADMIN", "MANAGER"].includes(user.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const reason = (body.reason as string)?.trim();
    if (!reason) return NextResponse.json({ error: "Reason is required" }, { status: 400 });

    const db = getPrismaForRequest(req);
    const now = new Date();

    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT id, "requestNumber", title, status FROM maintenance_requests WHERE id = $1 LIMIT 1`,
      params.id
    );
    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const mr = rows[0];
    if (!["PENDING", "OPEN"].includes(mr.status)) {
      return NextResponse.json({ error: `Cannot reject request with status: ${mr.status}` }, { status: 400 });
    }

    await db.$executeRawUnsafe(
      `UPDATE maintenance_requests SET status = 'CANCELLED', "completionNotes" = $1, "updatedAt" = $2 WHERE id = $3`,
      `Rejected: ${reason}`, now, params.id
    );

    await db.$executeRawUnsafe(
      `INSERT INTO activity_logs (id, "userId", action, "entityType", "entityId", details, "createdAt")
       VALUES ($1, $2, 'REJECT', 'MaintenanceRequest', $3, $4::jsonb, $5)
       ON CONFLICT DO NOTHING`,
      `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      user.id, params.id,
      JSON.stringify({ message: `Rejected: ${mr.title}`, reason }),
      now
    ).catch(() => {});

    const updated = await db.$queryRawUnsafe<any[]>(
      `SELECT * FROM maintenance_requests WHERE id = $1`, params.id
    );

    // ── Notify tenant ──────────────────────────────────────────────────────
    try {
      const tenantInfo = await db.$queryRawUnsafe<any[]>(`
        SELECT u.email, u."firstName", u."lastName"
        FROM maintenance_requests mr
        JOIN units un ON un.id = mr."unitId"
        JOIN tenants t ON t."unitId" = un.id AND t.status = 'ACTIVE'
        JOIN users u ON u.id = t."userId"
        WHERE mr.id = $1 LIMIT 1
      `, params.id).catch(() => []);
      if (tenantInfo[0]?.email) {
        await sendMaintenanceNotification({
          event: "rejected",
          to: tenantInfo[0].email,
          tenantName: `${tenantInfo[0].firstName} ${tenantInfo[0].lastName}`.trim(),
          requestNumber: mr.requestNumber ?? params.id,
          requestTitle: mr.title,
          rejectionReason: reason,
        });
      }
    } catch (emailErr: any) {
      console.error("[reject] email notification failed:", emailErr?.message);
    }

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error: any) {
    console.error("[reject]", error?.message);
    return NextResponse.json({ error: error.message || "Failed to reject" }, { status: 500 });
  }
}

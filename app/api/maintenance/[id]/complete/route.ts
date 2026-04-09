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
    const body = await req.json();
    const { actualCost, completionNotes } = body;

    const db = getPrismaForRequest(req);
    const now = new Date();

    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT id, title, status FROM maintenance_requests WHERE id = $1 LIMIT 1`,
      params.id
    );
    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const mr = rows[0];
    if (mr.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: `Cannot complete request with status: ${mr.status}. Must be IN_PROGRESS.` }, { status: 400 });
    }

    await db.$executeRawUnsafe(
      `UPDATE maintenance_requests
       SET status = 'COMPLETED',
           "actualCost" = $1,
           "completionNotes" = $2,
           "completedAt" = $3,
           "updatedAt" = $3
       WHERE id = $4`,
      actualCost ? parseFloat(String(actualCost)) : null,
      completionNotes || null,
      now,
      params.id
    );

    await db.$executeRawUnsafe(
      `INSERT INTO activity_logs (id, "userId", action, "entityType", "entityId", details, "createdAt")
       VALUES ($1, $2, 'COMPLETE', 'MaintenanceRequest', $3, $4::jsonb, $5)
       ON CONFLICT DO NOTHING`,
      `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      user.id, params.id,
      JSON.stringify({ message: `Completed: ${mr.title}`, actualCost }),
      now
    ).catch(() => {});

    // ── Auto-create expense from maintenance cost ──────────────────────────
    try {
      const full = await db.$queryRawUnsafe<any[]>(
        `SELECT mr.*, p.id as "propId"
         FROM maintenance_requests mr
         JOIN units u ON u.id = mr."unitId"
         JOIN properties p ON p.id = u."propertyId"
         WHERE mr.id = $1 LIMIT 1`,
        params.id
      );
      const matRows = await db.$queryRawUnsafe<any[]>(
        `SELECT COALESCE(SUM("totalCost"), 0) as total FROM maintenance_materials WHERE "maintenanceRequestId" = $1`,
        params.id
      ).catch(() => [{ total: 0 }]);

      const matCost = Number(matRows[0]?.total ?? 0);
      const laborCost = actualCost ? parseFloat(String(actualCost)) : 0;
      const totalExpense = matCost + laborCost;

      if (totalExpense > 0 && full[0]?.propId) {
        await db.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY, amount NUMERIC NOT NULL, category TEXT NOT NULL,
            description TEXT NOT NULL, date TIMESTAMPTZ NOT NULL, "propertyId" TEXT NOT NULL,
            "paymentMethod" TEXT, notes TEXT, "receiptUrl" TEXT, "sourceType" TEXT, "sourceId" TEXT,
            "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `).catch(() => {});
        for (const col of [
          `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS "sourceType" TEXT`,
          `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS "sourceId" TEXT`,
        ]) { await db.$executeRawUnsafe(col).catch(() => {}); }

        await db.$executeRawUnsafe(
          `INSERT INTO expenses (id, amount, category, description, date, "propertyId", notes, "sourceType", "sourceId", "createdAt", "updatedAt")
           VALUES ($1, $2, 'MAINTENANCE', $3, $4, $5, $6, 'maintenance_request', $7, $8, $8)`,
          `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          totalExpense,
          `Maintenance: ${mr.title}`,
          now,
          full[0].propId,
          `Materials: KSH ${matCost.toLocaleString()} | Labour: KSH ${laborCost.toLocaleString()}`,
          params.id, now
        );
      }
    } catch (expErr: any) {
      console.error("[complete] expense log failed:", expErr?.message);
    }

    const updated = await db.$queryRawUnsafe<any[]>(
      `SELECT * FROM maintenance_requests WHERE id = $1`, params.id
    );

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error: any) {
    console.error("[complete]", error?.message);
    return NextResponse.json({ error: error.message || "Failed to complete" }, { status: 500 });
  }
}

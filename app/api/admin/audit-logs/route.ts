import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    if (!["ADMIN", "MANAGER"].includes(payload.role as string)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page      = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit     = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "50")));
    const offset    = (page - 1) * limit;
    const search    = searchParams.get("search") || "";
    const action    = searchParams.get("action") || "";       // e.g. PAYMENT_APPROVED
    const entity    = searchParams.get("entity") || "";       // e.g. payment, maintenance
    const userId    = searchParams.get("userId") || "";
    const dateFrom  = searchParams.get("from") || "";
    const dateTo    = searchParams.get("to") || "";

    const db = getPrismaForRequest(request);

    // Self-heal: ensure activity_logs exists (it should, but be safe)
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        "userId" TEXT,
        action TEXT NOT NULL,
        "entityType" TEXT,
        "entityId" TEXT,
        details JSONB,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).catch(() => {});

    let where = `WHERE 1=1`;
    const args: any[] = [];
    let idx = 1;

    if (action)   { where += ` AND al.action ILIKE $${idx++}`;       args.push(`%${action}%`); }
    if (entity)   { where += ` AND al."entityType" ILIKE $${idx++}`; args.push(`%${entity}%`); }
    if (userId)   { where += ` AND al."userId" = $${idx++}`;          args.push(userId); }
    if (dateFrom && !isNaN(Date.parse(dateFrom))) {
      where += ` AND al."createdAt" >= $${idx++}`;
      args.push(new Date(dateFrom));
    }
    if (dateTo && !isNaN(Date.parse(dateTo))) {
      where += ` AND al."createdAt" <= $${idx++}`;
      args.push(new Date(dateTo + "T23:59:59"));
    }
    if (search) {
      where += ` AND (
        al.action ILIKE $${idx}
        OR al."entityType" ILIKE $${idx}
        OR al."entityId" ILIKE $${idx}
        OR al.details::text ILIKE $${idx}
        OR u."firstName" ILIKE $${idx}
        OR u."lastName" ILIKE $${idx}
        OR u.email ILIKE $${idx}
      )`;
      args.push(`%${search}%`);
      idx++;
    }

    const countRows = await db.$queryRawUnsafe<{ cnt: string }[]>(
      `SELECT COUNT(*)::text AS cnt
       FROM activity_logs al
       LEFT JOIN users u ON u.id = al."userId"
       ${where}`,
      ...args
    );
    const total = Number(countRows[0]?.cnt ?? 0);

    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT
         al.id,
         al.action,
         al."entityType",
         al."entityId",
         al.details,
         al."createdAt",
         al."userId",
         u."firstName",
         u."lastName",
         u.email,
         u.role::text AS role
       FROM activity_logs al
       LEFT JOIN users u ON u.id = al."userId"
       ${where}
       ORDER BY al."createdAt" DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      ...args, limit, offset
    );

    // Action breakdown for current filter (without pagination)
    const actionBreakdownRows = await db.$queryRawUnsafe<{ action: string; cnt: string }[]>(
      `SELECT al.action, COUNT(*)::text AS cnt
       FROM activity_logs al
       LEFT JOIN users u ON u.id = al."userId"
       ${where}
       GROUP BY al.action
       ORDER BY cnt::int DESC
       LIMIT 20`,
      ...args
    );
    const actionBreakdown: Record<string, number> = {};
    for (const r of actionBreakdownRows) {
      actionBreakdown[r.action] = Number(r.cnt);
    }

    const logs = rows.map(r => ({
      id: r.id,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      details: r.details,
      createdAt: r.createdAt,
      user: r.userId ? {
        id: r.userId,
        name: `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || r.email || "Unknown",
        email: r.email,
        role: r.role,
      } : null,
    }));

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      actionBreakdown,
    });
  } catch (err: any) {
    console.error("[audit-logs]", err?.message);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}

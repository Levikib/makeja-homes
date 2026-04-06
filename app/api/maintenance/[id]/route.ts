import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { jwtVerify } from "jose";

export const dynamic = 'force-dynamic'

async function getAuthUser(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    return payload;
  } catch { return null; }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getPrismaForRequest(req);

    const rows = await db.$queryRawUnsafe<any[]>(`
      SELECT mr.*,
        u."unitNumber", u."propertyId",
        p.id as "propId", p.name as "propName", p.city as "propCity", p.address as "propAddress",
        cu."firstName" as "createdByFirst", cu."lastName" as "createdByLast", cu.role as "createdByRole",
        au.id as "assignedId", au."firstName" as "assignedFirst", au."lastName" as "assignedLast",
        au.role as "assignedRole", au."phoneNumber" as "assignedPhone", au.email as "assignedEmail"
      FROM maintenance_requests mr
      JOIN units u ON u.id = mr."unitId"
      JOIN properties p ON p.id = u."propertyId"
      LEFT JOIN users cu ON cu.id = mr."createdById"
      LEFT JOIN users au ON au.id = mr."assignedToId"
      WHERE mr.id = $1 LIMIT 1
    `, params.id);

    if (!rows.length) return NextResponse.json({ error: "Maintenance request not found" }, { status: 404 });
    const r = rows[0];

    // Get current tenant for the unit
    const tenants = await db.$queryRawUnsafe<any[]>(`
      SELECT t.id, usr."firstName", usr."lastName", usr.email, usr."phoneNumber"
      FROM tenants t JOIN users usr ON usr.id = t."userId"
      WHERE t."unitId" = $1 AND t."leaseEndDate" >= NOW() AND usr."isActive" = true
      ORDER BY t."leaseStartDate" DESC LIMIT 1
    `, r.unitId);

    return NextResponse.json({
      id: r.id, requestNumber: r.requestNumber, title: r.title, description: r.description,
      status: r.status, priority: r.priority, category: r.category,
      estimatedCost: r.estimatedCost, actualCost: r.actualCost,
      completionNotes: r.completionNotes, completedAt: r.completedAt,
      createdAt: r.createdAt, updatedAt: r.updatedAt,
      units: {
        unitNumber: r.unitNumber, propertyId: r.propertyId,
        properties: { id: r.propId, name: r.propName, city: r.propCity, address: r.propAddress },
        tenants: tenants.map(t => ({ id: t.id, users: { firstName: t.firstName, lastName: t.lastName, email: t.email, phoneNumber: t.phoneNumber } })),
      },
      users_maintenance_requests_createdByIdTousers: r.createdByFirst ? {
        firstName: r.createdByFirst, lastName: r.createdByLast, role: r.createdByRole,
      } : null,
      users_maintenance_requests_assignedToIdTousers: r.assignedId ? {
        id: r.assignedId, firstName: r.assignedFirst, lastName: r.assignedLast,
        role: r.assignedRole, phoneNumber: r.assignedPhone, email: r.assignedEmail,
      } : null,
    });
  } catch (error: any) {
    console.error("Error fetching maintenance request:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch maintenance request" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "MANAGER", "CARETAKER"].includes(user.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const db = getPrismaForRequest(req);
    const now = new Date();

    const updates: string[] = ['"updatedAt" = $2'];
    const vals: any[] = [params.id, now];
    let idx = 3;

    const enumCast: Record<string, string> = {
      priority: `text::"Priority"`,
      status: `text::"MaintenanceStatus"`,
    };

    const fields: Record<string, any> = {
      title: body.title, description: body.description, priority: body.priority,
      category: body.category, status: body.status, assignedToId: body.assignedToId,
      estimatedCost: body.estimatedCost !== undefined ? (body.estimatedCost ? parseFloat(body.estimatedCost) : null) : undefined,
      actualCost: body.actualCost !== undefined ? (body.actualCost ? parseFloat(body.actualCost) : null) : undefined,
      completionNotes: body.completionNotes,
    };

    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) {
        const cast = enumCast[key] ? `::${enumCast[key]}` : '';
        updates.push(`"${key}" = $${idx++}${cast}`);
        vals.push(val);
      }
    }

    if (body.status === "COMPLETED") {
      updates.push(`"completedAt" = $${idx++}`);
      vals.push(now);
    }

    await db.$executeRawUnsafe(
      `UPDATE maintenance_requests SET ${updates.join(", ")} WHERE id = $1`,
      ...vals
    );

    // Best-effort activity log
    try {
      await db.$executeRawUnsafe(
        `INSERT INTO activity_logs (id, "userId", action, "entityType", "entityId", details, "createdAt")
         VALUES ($1, $2, 'UPDATE', 'MaintenanceRequest', $3, $4, $5)`,
        `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        user.id, params.id, `Updated maintenance request`, now
      );
    } catch {}

    return await GET(req, { params });
  } catch (error: any) {
    console.error("Error updating maintenance request:", error);
    return NextResponse.json({ error: error.message || "Failed to update maintenance request" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const db = getPrismaForRequest(req);
    await db.$executeRawUnsafe(`DELETE FROM maintenance_requests WHERE id = $1`, params.id);
    return NextResponse.json({ message: "Request deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting maintenance request:", error);
    return NextResponse.json({ error: error.message || "Failed to delete maintenance request" }, { status: 500 });
  }
}

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

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const propertyId = searchParams.get("propertyId");
    const unitId = searchParams.get("unitId");

    const db = getPrismaForRequest(request);

    let where = `WHERE 1=1`;
    const args: any[] = [];
    let idx = 1;

    if (status && status !== "all") {
      where += ` AND mr.status = $${idx++}`;
      args.push(status);
    }
    if (propertyId) {
      where += ` AND p.id = $${idx++}`;
      args.push(propertyId);
    }
    if (unitId) {
      where += ` AND mr."unitId" = $${idx++}`;
      args.push(unitId);
    }

    // Tenant can only see their own requests
    if (user.role === "TENANT") {
      where += ` AND cu."firstName" = cu."firstName"`; // placeholder, handled below
    }

    const requests = await db.$queryRawUnsafe<any[]>(`
      SELECT mr.id, mr."requestNumber", mr.title, mr.description, mr.status, mr.priority,
        mr.category, mr."estimatedCost", mr."actualCost", mr."completionNotes",
        mr."completedAt", mr."createdAt", mr."updatedAt", mr."unitId",
        mr."createdById", mr."assignedToId",
        u."unitNumber", u."propertyId",
        p.id as "propId", p.name as "propName",
        cu."firstName" as "createdByFirst", cu."lastName" as "createdByLast", cu.email as "createdByEmail",
        au."firstName" as "assignedFirst", au."lastName" as "assignedLast", au.role as "assignedRole"
      FROM maintenance_requests mr
      JOIN units u ON u.id = mr."unitId"
      JOIN properties p ON p.id = u."propertyId"
      LEFT JOIN users cu ON cu.id = mr."createdById"
      LEFT JOIN users au ON au.id = mr."assignedToId"
      ${where}
      ORDER BY mr."createdAt" DESC
    `, ...args);

    const counts = await db.$queryRawUnsafe<any[]>(`
      SELECT
        COUNT(*) FILTER (WHERE mr.status IN ('PENDING','OPEN')) as open,
        COUNT(*) FILTER (WHERE mr.status = 'IN_PROGRESS') as in_progress,
        COUNT(*) FILTER (WHERE mr.status = 'COMPLETED') as completed,
        COALESCE(SUM(mr."actualCost") FILTER (WHERE mr.status = 'COMPLETED'), 0) as total_cost
      FROM maintenance_requests mr
      JOIN units u ON u.id = mr."unitId"
      JOIN properties p ON p.id = u."propertyId"
    `);

    const c = counts[0];

    const shaped = requests.map(r => ({
      id: r.id,
      requestNumber: r.requestNumber,
      title: r.title,
      description: r.description,
      status: r.status,
      priority: r.priority,
      category: r.category,
      estimatedCost: r.estimatedCost,
      actualCost: r.actualCost,
      completionNotes: r.completionNotes,
      completedAt: r.completedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      unitId: r.unitId,
      createdById: r.createdById,
      assignedToId: r.assignedToId,
      units: {
        unitNumber: r.unitNumber,
        propertyId: r.propertyId,
        properties: { id: r.propId, name: r.propName },
      },
      users_maintenance_requests_createdByIdTousers: r.createdByFirst ? {
        firstName: r.createdByFirst, lastName: r.createdByLast, email: r.createdByEmail,
      } : null,
      users_maintenance_requests_assignedToIdTousers: r.assignedFirst ? {
        firstName: r.assignedFirst, lastName: r.assignedLast, role: r.assignedRole,
      } : null,
    }));

    return NextResponse.json({
      requests: shaped,
      stats: {
        openCount: Number(c.open),
        inProgressCount: Number(c.in_progress),
        completedCount: Number(c.completed),
        totalCost: Number(c.total_cost),
      },
    });
  } catch (error) {
    console.error("Error fetching maintenance requests:", error);
    return NextResponse.json({ error: "Failed to fetch maintenance requests" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { unitId, title, description, category, priority, estimatedCost, createdById } = body;

    if (!unitId || !title || !description || !category || !priority) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);
    const id = `mr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const requestNumber = `MR-${Date.now()}`;
    const now = new Date();

    await db.$executeRawUnsafe(
      `INSERT INTO maintenance_requests (id, "requestNumber", "unitId", title, description, category, priority, status, "estimatedCost", "createdById", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7::"Priority", 'PENDING'::"MaintenanceStatus", $8, $9, $10, $10)`,
      id, requestNumber, unitId, title, description, category, priority,
      estimatedCost ? parseFloat(estimatedCost) : null,
      createdById || user.id, now
    );

    const rows = await db.$queryRawUnsafe<any[]>(`SELECT * FROM maintenance_requests WHERE id = $1`, id);
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error("Error creating maintenance request:", error);
    return NextResponse.json({ error: "Failed to create maintenance request" }, { status: 500 });
  }
}

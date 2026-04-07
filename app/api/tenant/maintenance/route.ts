import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;
    const role = payload.role as string;

    if (role !== "TENANT") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const db = getPrismaForRequest(request);

    const tenantRows = await db.$queryRawUnsafe<any[]>(
      `SELECT id, "unitId" FROM tenants WHERE "userId" = $1 LIMIT 1`, userId
    );
    if (!tenantRows.length) return NextResponse.json({ requests: [] });

    const unitId = tenantRows[0].unitId;

    const requests = await db.$queryRawUnsafe<any[]>(`
      SELECT id, "requestNumber", title, description, priority::text, category::text,
             status::text, "estimatedCost", "completionNotes", "createdAt", "updatedAt", "completedAt"
      FROM maintenance_requests
      WHERE "unitId" = $1
      ORDER BY "createdAt" DESC
    `, unitId);

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error("❌ Tenant maintenance GET error:", error?.message);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;
    const role = payload.role as string;

    if (role !== "TENANT") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const db = getPrismaForRequest(request);

    const tenantRows = await db.$queryRawUnsafe<any[]>(`
      SELECT t.id, t."unitId", un."propertyId"
      FROM tenants t JOIN units un ON un.id = t."unitId"
      WHERE t."userId" = $1 LIMIT 1
    `, userId);
    if (!tenantRows.length) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const { unitId, propertyId } = tenantRows[0];

    const body = await request.json();
    const { title, description, priority = "MEDIUM", category = "OTHER" } = body;

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }

    const id = `maint_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const now = new Date();

    await db.$executeRawUnsafe(`
      INSERT INTO maintenance_requests (id, "unitId", "propertyId", "requestedBy", title, description,
        priority, category, status, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7::text::"MaintenancePriority", $8::text::"MaintenanceCategory",
        'PENDING'::text::"MaintenanceStatus", $9, $9)
    `, id, unitId, propertyId, userId, title, description, priority, category, now);

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("❌ Tenant maintenance POST error:", error?.message);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}

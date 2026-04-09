import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;
    const role = payload.role as string;

    if (role !== "TENANT") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const db = getPrismaForRequest(request);

    // Verify tenant owns the unit this request belongs to
    const tenantRows = await db.$queryRawUnsafe<any[]>(
      `SELECT id, "unitId" FROM tenants WHERE "userId" = $1 LIMIT 1`, userId
    );
    if (!tenantRows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const unitId = tenantRows[0].unitId;

    const rows = await db.$queryRawUnsafe<any[]>(`
      SELECT mr.id, mr."requestNumber", mr.title, mr.description, mr.priority::text,
             mr.category::text, mr.status::text, mr."estimatedCost", mr."actualCost",
             mr."completionNotes", mr."createdAt", mr."updatedAt", mr."completedAt",
             u."firstName" as "assignedFirstName", u."lastName" as "assignedLastName"
      FROM maintenance_requests mr
      LEFT JOIN users u ON u.id = mr."assignedToId"
      WHERE mr.id = $1 AND mr."unitId" = $2
      LIMIT 1
    `, params.id, unitId);

    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ request: rows[0] });
  } catch (error: any) {
    console.error("❌ Tenant maintenance [id] GET error:", error?.message);
    return NextResponse.json({ error: "Failed to fetch request" }, { status: 500 });
  }
}

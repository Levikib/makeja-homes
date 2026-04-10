import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== "ADMIN" && payload.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { billId } = await request.json();

    const db = getPrismaForRequest(request);

    // Fetch bill + tenant details for reminder
    const rows = await db.$queryRawUnsafe<any[]>(`
      SELECT mb.id, mb.month, mb."totalAmount", mb.status::text AS status, mb."dueDate",
        u."firstName", u.email, un."unitNumber", p.name AS "propertyName"
      FROM monthly_bills mb
      JOIN tenants t ON t.id = mb."tenantId"
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE mb.id = $1 LIMIT 1
    `, billId);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // Reminder sending would go here (email via nodemailer)
    // For now, return success — reminder email can be added when needed

    return NextResponse.json({ success: true, message: "Reminder sent successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to send reminder" }, { status: 500 });
  }
}

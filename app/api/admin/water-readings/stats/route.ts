import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);

    const { searchParams } = new URL(request.url);
    const property = searchParams.get("property") || "all";
    const month = searchParams.get("month") || "all";
    const year = searchParams.get("year");

    const db = getPrismaForRequest(request);

    let where = `WHERE 1=1`;
    const args: any[] = [];
    let idx = 1;

    if (month !== "all") { where += ` AND wr.month = $${idx++}`; args.push(parseInt(month)); }
    if (year)             { where += ` AND wr.year = $${idx++}`;  args.push(parseInt(year)); }
    if (property !== "all") { where += ` AND p.name = $${idx++}`; args.push(property); }

    const rows = await db.$queryRawUnsafe<any[]>(`
      SELECT wr."unitsConsumed", wr."amountDue",
             u."firstName", u."lastName"
      FROM water_readings wr
      JOIN tenants t  ON t.id  = wr."tenantId"
      JOIN users u    ON u.id  = t."userId"
      JOIN units un   ON un.id = wr."unitId"
      JOIN properties p ON p.id = un."propertyId"
      ${where}
      ORDER BY wr."unitsConsumed" DESC
    `, ...args);

    const totalReadings = rows.length;
    const totalConsumption = rows.reduce((s, r) => s + Number(r.unitsConsumed), 0);
    const totalRevenue = rows.reduce((s, r) => s + Number(r.amountDue), 0);
    const averageConsumption = totalReadings > 0 ? totalConsumption / totalReadings : 0;

    const highestConsumer = rows[0]
      ? { tenant: `${rows[0].firstName} ${rows[0].lastName}`, consumption: Number(rows[0].unitsConsumed) }
      : null;

    return NextResponse.json({
      stats: { totalReadings, totalConsumption, totalRevenue, averageConsumption, highestConsumer },
    });
  } catch (error: any) {
    console.error("Error fetching water stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}

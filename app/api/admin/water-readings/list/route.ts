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

    const readings = await db.$queryRawUnsafe<any[]>(`
      SELECT wr.id, wr."previousReading", wr."currentReading", wr."unitsConsumed",
             wr."ratePerUnit", wr."amountDue", wr."readingDate", wr.month, wr.year,
             u."firstName", u."lastName", u.email,
             un."unitNumber",
             p.name AS "propertyName"
      FROM water_readings wr
      JOIN tenants t  ON t.id  = wr."tenantId"
      JOIN users u    ON u.id  = t."userId"
      JOIN units un   ON un.id = wr."unitId"
      JOIN properties p ON p.id = un."propertyId"
      ${where}
      ORDER BY wr."readingDate" DESC
    `, ...args);

    const formattedReadings = readings.map(r => ({
      id: r.id,
      previousReading: r.previousReading,
      currentReading: r.currentReading,
      unitsConsumed: r.unitsConsumed,
      ratePerUnit: r.ratePerUnit,
      amountDue: r.amountDue,
      readingDate: r.readingDate,
      month: r.month,
      year: r.year,
      tenant: { firstName: r.firstName, lastName: r.lastName, email: r.email },
      unit: { unitNumber: r.unitNumber },
      property: { name: r.propertyName },
    }));

    return NextResponse.json({ readings: formattedReadings });
  } catch (error: any) {
    console.error("Error fetching water readings:", error);
    return NextResponse.json({ error: "Failed to fetch readings" }, { status: 500 });
  }
}

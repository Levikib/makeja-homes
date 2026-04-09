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
    const role = payload.role as string;

    if (!["ADMIN", "MANAGER", "CARETAKER"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId") || "all";
    const isActive   = searchParams.get("isActive")   || "all";

    const db = getPrismaForRequest(request);

    let where = `WHERE 1=1`;
    const args: any[] = [];
    let idx = 1;

    if (propertyId !== "all") {
      where += ` AND rc."propertyIds" @> $${idx++}::jsonb`;
      args.push(JSON.stringify([propertyId]));
    }
    if (isActive !== "all") {
      where += ` AND rc."isActive" = $${idx++}`;
      args.push(isActive === "true");
    }

    const charges = await db.$queryRawUnsafe<any[]>(`
      SELECT
        rc.id,
        rc.name,
        rc.description,
        rc.category,
        rc.amount,
        rc.frequency,
        rc."billingDay",
        rc."appliesTo",
        rc."specificUnits",
        rc."unitTypes",
        rc."isActive",
        rc."propertyIds",
        rc."createdAt",
        u."firstName",
        u."lastName"
      FROM recurring_charges rc
      LEFT JOIN users u ON u.id = rc."createdBy"
      ${where}
      ORDER BY rc."createdAt" DESC
    `, ...args);

    // Resolve property names in one query
    const allPropertyIds: string[] = [];
    for (const c of charges) {
      if (Array.isArray(c.propertyIds)) allPropertyIds.push(...c.propertyIds);
    }
    const uniqueIds = [...new Set(allPropertyIds)];

    let propertyMap: Record<string, string> = {};
    if (uniqueIds.length > 0) {
      const placeholders = uniqueIds.map((_, i) => `$${i + 1}`).join(", ");
      const propRows = await db.$queryRawUnsafe<{ id: string; name: string }[]>(
        `SELECT id, name FROM properties WHERE id IN (${placeholders})`,
        ...uniqueIds
      );
      for (const p of propRows) propertyMap[p.id] = p.name;
    }

    const result = charges.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      category: c.category,
      amount: Number(c.amount),
      frequency: c.frequency,
      billingDay: c.billingDay,
      appliesTo: c.appliesTo,
      specificUnits: c.specificUnits ?? [],
      unitTypes: c.unitTypes ?? [],
      isActive: c.isActive,
      propertyIds: c.propertyIds ?? [],
      createdAt: c.createdAt,
      createdBy: c.firstName ? { firstName: c.firstName, lastName: c.lastName } : null,
      properties: (c.propertyIds ?? []).map((pid: string) => ({ id: pid, name: propertyMap[pid] ?? pid })),
    }));

    return NextResponse.json({ charges: result });
  } catch (error: any) {
    console.error("❌ Error fetching recurring charges:", error);
    return NextResponse.json({ error: "Failed to fetch recurring charges" }, { status: 500 });
  }
}

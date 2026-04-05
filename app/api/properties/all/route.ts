import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("includeArchived") === "true";

    const db = getPrismaForRequest(request)
    const whereClause = includeArchived ? '' : 'WHERE p."deletedAt" IS NULL'

    const properties = await db.$queryRawUnsafe<any[]>(`
      SELECT
        p.*,
        COALESCE(json_agg(
          json_build_object('id', u.id, 'unitNumber', u."unitNumber", 'status', u.status::text)
        ) FILTER (WHERE u.id IS NOT NULL), '[]') as units,
        COUNT(u.id)::int as "_count_units"
      FROM properties p
      LEFT JOIN units u ON u."propertyId" = p.id AND u."deletedAt" IS NULL
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.name ASC
    `)

    const shaped = properties.map(p => ({
      ...p,
      _count: { units: p._count_units ?? 0 },
    }))

    return NextResponse.json({ properties: shaped });
  } catch (error) {
    console.error("Error fetching properties:", error);
    return NextResponse.json({ error: "Failed to fetch properties" }, { status: 500 });
  }
}

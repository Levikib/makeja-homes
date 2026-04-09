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

    const db = getPrismaForRequest(request);

    const properties = await db.$queryRawUnsafe<any[]>(`
      SELECT id, name, "waterRatePerUnit", "defaultGarbageFee"
      FROM properties
      WHERE "deletedAt" IS NULL
      ORDER BY name ASC
    `);

    return NextResponse.json({ properties });
  } catch (error: any) {
    console.error("Error fetching properties:", error);
    return NextResponse.json({ error: "Failed to fetch properties" }, { status: 500 });
  }
}

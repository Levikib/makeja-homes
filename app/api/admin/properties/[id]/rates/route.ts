import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    if (!["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { waterRatePerUnit, defaultGarbageFee } = body;

    if (waterRatePerUnit !== undefined && waterRatePerUnit < 0) {
      return NextResponse.json({ error: "Water rate cannot be negative" }, { status: 400 });
    }
    if (defaultGarbageFee !== undefined && defaultGarbageFee < 0) {
      return NextResponse.json({ error: "Garbage fee cannot be negative" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);

    const sets: string[] = [`"updatedAt" = NOW()`];
    const args: any[] = [];
    let idx = 1;

    if (waterRatePerUnit !== undefined) { sets.push(`"waterRatePerUnit" = $${idx++}`); args.push(parseFloat(waterRatePerUnit)); }
    if (defaultGarbageFee !== undefined) { sets.push(`"defaultGarbageFee" = $${idx++}`); args.push(parseFloat(defaultGarbageFee)); }

    args.push(params.id);
    const rows = await db.$queryRawUnsafe<any[]>(
      `UPDATE properties SET ${sets.join(", ")} WHERE id = $${idx} RETURNING id, name, "waterRatePerUnit", "defaultGarbageFee"`,
      ...args
    );

    if (!rows.length) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: "Property rates updated successfully", property: rows[0] });
  } catch (error: any) {
    console.error("❌ Error updating property rates:", error);
    return NextResponse.json({ error: "Failed to update property rates" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);

    const db = getPrismaForRequest(request);

    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT id, name, "waterRatePerUnit", "defaultGarbageFee", "chargesGarbageFee"
       FROM properties WHERE id = $1 LIMIT 1`,
      params.id
    );

    if (!rows.length) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    return NextResponse.json({ property: rows[0] });
  } catch (error: any) {
    console.error("❌ Error fetching property rates:", error);
    return NextResponse.json({ error: "Failed to fetch property rates" }, { status: 500 });
  }
}

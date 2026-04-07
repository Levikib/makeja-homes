import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

async function auth(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    if (!["ADMIN", "MANAGER"].includes(payload.role as string)) return null;
    return payload;
  } catch { return null; }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const payload = await auth(request);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getPrismaForRequest(request);
    const rows = await db.$queryRawUnsafe(`
      SELECT "contractTemplate", name FROM properties WHERE id = $1 LIMIT 1
    `, params.id) as any[];

    if (!rows.length) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    return NextResponse.json({
      contractTemplate: rows[0].contractTemplate || null,
      propertyName: rows[0].name,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const payload = await auth(request);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { contractTemplate } = await request.json();
    const db = getPrismaForRequest(request);

    await db.$executeRawUnsafe(`
      UPDATE properties SET "contractTemplate" = $2, "updatedAt" = NOW() WHERE id = $1
    `, params.id, contractTemplate || null);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to save template" }, { status: 500 });
  }
}

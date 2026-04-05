import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

async function auth(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    return payload;
  } catch { return null; }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const payload = await auth(request);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getPrismaForRequest(request);
    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT id, name, "mpesaPhoneNumber", "mpesaTillNumber", "mpesaTillName",
        "mpesaPaybillNumber", "mpesaPaybillName", "bankAccounts", "paymentInstructions", "companyId"
       FROM properties WHERE id = $1 LIMIT 1`, params.id
    );
    if (!rows.length) return NextResponse.json({ error: "Property not found" }, { status: 404 });
    const p = rows[0];
    return NextResponse.json({
      ...p,
      bankAccounts: p.bankAccounts ? (typeof p.bankAccounts === 'string' ? JSON.parse(p.bankAccounts) : p.bankAccounts) : [],
    });
  } catch (error) {
    console.error("Error fetching payment settings:", error);
    return NextResponse.json({ error: "Failed to fetch payment settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const payload = await auth(request);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const db = getPrismaForRequest(request);

    const rows = await db.$queryRawUnsafe<any[]>(`SELECT id FROM properties WHERE id = $1 LIMIT 1`, params.id);
    if (!rows.length) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    await db.$executeRawUnsafe(
      `UPDATE properties SET
        "mpesaPhoneNumber" = $2, "mpesaTillNumber" = $3, "mpesaTillName" = $4,
        "mpesaPaybillNumber" = $5, "mpesaPaybillName" = $6,
        "bankAccounts" = $7, "paymentInstructions" = $8, "updatedAt" = NOW()
       WHERE id = $1`,
      params.id,
      body.mpesaPhoneNumber || null,
      body.mpesaTillNumber || null,
      body.mpesaTillName || null,
      body.mpesaPaybillNumber || null,
      body.mpesaPaybillName || null,
      body.bankAccounts ? JSON.stringify(body.bankAccounts) : null,
      body.paymentInstructions || null,
    );

    return NextResponse.json({ success: true, message: "Payment settings updated successfully" });
  } catch (error) {
    console.error("Error updating payment settings:", error);
    return NextResponse.json({ error: "Failed to update payment settings" }, { status: 500 });
  }
}

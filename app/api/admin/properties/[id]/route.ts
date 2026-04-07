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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const payload = await auth(request);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = payload.id as string;
  const role = payload.role as string;

  try {
    const db = getPrismaForRequest(request);

    const propRows = await db.$queryRawUnsafe(`
      SELECT p.id, p.name, p.address, p.city, p.country, p.description,
        p."paystackActive", p."paystackSubaccountCode", p."paystackAccountName",
        p."paystackAccountNumber", p."paystackBankCode", p."paystackAccountEmail",
        p."mpesaPhoneNumber", p."mpesaTillNumber", p."mpesaTillName",
        p."mpesaPaybillNumber", p."mpesaPaybillName", p."bankAccounts",
        p."paymentInstructions", p."companyId", p."createdById"
      FROM properties p
      WHERE p.id = $1
        ${role !== "ADMIN" ? `AND (p."createdById" = $2 OR p."companyId" IN (
          SELECT "companyId" FROM users WHERE id = $2
        ))` : ""}
      LIMIT 1
    `, ...(role !== "ADMIN" ? [params.id, userId] : [params.id])) as any[];

    if (!propRows.length) return NextResponse.json({ error: "Property not found" }, { status: 404 });
    const p = propRows[0];

    const unitRows = await db.$queryRawUnsafe(`
      SELECT id, "unitNumber", type::text, status::text, "rentAmount"
      FROM units WHERE "propertyId" = $1 ORDER BY "unitNumber"
    `, params.id) as any[];

    const property = {
      ...p,
      bankAccounts: p.bankAccounts
        ? (typeof p.bankAccounts === "string" ? JSON.parse(p.bankAccounts) : p.bankAccounts)
        : [],
      units: unitRows,
    };

    return NextResponse.json({ property });
  } catch (error: any) {
    console.error("Error fetching property:", error?.message);
    return NextResponse.json({ error: "Failed to fetch property" }, { status: 500 });
  }
}

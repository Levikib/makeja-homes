import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    if (role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { tenantId } = body;

    console.log("🤖 Auto-generating garbage fees for tenant:", tenantId);

    const db = getPrismaForRequest(request);

    // Get tenant + unit + property info
    const tenantRows = await db.$queryRawUnsafe<any[]>(`
      SELECT t.id, t."unitId", t."createdAt",
        un.status::text AS "unitStatus",
        p."defaultGarbageFee"
      FROM tenants t
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE t.id = $1 LIMIT 1
    `, tenantId);

    if (tenantRows.length === 0) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const tenant = tenantRows[0];

    if (tenant.unitStatus === "VACANT") {
      return NextResponse.json({ generated: 0, message: "Unit is vacant" });
    }

    // Get active lease start date
    const leaseRows = await db.$queryRawUnsafe<any[]>(`
      SELECT "startDate" FROM lease_agreements
      WHERE "tenantId" = $1 AND status::text = 'ACTIVE'
      ORDER BY "startDate" ASC LIMIT 1
    `, tenantId);

    let leaseStartDate: Date;
    if (leaseRows.length > 0) {
      leaseStartDate = new Date(leaseRows[0].startDate);
    } else if (tenant.createdAt) {
      leaseStartDate = new Date(tenant.createdAt);
    } else {
      const now = new Date();
      leaseStartDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
    }

    // Get existing garbage fee months
    const existingRows = await db.$queryRawUnsafe<any[]>(`
      SELECT month FROM garbage_fees WHERE "tenantId" = $1
    `, tenantId);
    const existingFees = new Set(existingRows.map((r: any) => {
      const d = new Date(r.month);
      return `${d.getMonth() + 1}-${d.getFullYear()}`;
    }));

    const defaultFee = Number(tenant.defaultGarbageFee) || 500;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const generated = [];
    let checkMonth = leaseStartDate.getMonth() + 1;
    let checkYear = leaseStartDate.getFullYear();

    while (checkYear < currentYear || (checkYear === currentYear && checkMonth <= currentMonth)) {
      const checkKey = `${checkMonth}-${checkYear}`;

      if (!existingFees.has(checkKey)) {
        const billDate = new Date(checkYear, checkMonth - 1, 1);
        const feeId = `garbage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
          await db.$executeRawUnsafe(`
            INSERT INTO garbage_fees (id, "tenantId", "unitId", month, amount, "isApplicable", status, "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, true, 'PENDING'::"GarbageFeeStatus", $6, $6)
          `, feeId, tenantId, tenant.unitId, billDate, defaultFee, now);

          generated.push({ id: feeId, month: billDate, amount: defaultFee });
          console.log(`✅ Generated: ${checkMonth}/${checkYear} - KSh ${defaultFee}`);
        } catch (err: any) {
          console.error(`❌ Failed ${checkMonth}/${checkYear}:`, err.message);
        }
      }

      checkMonth++;
      if (checkMonth > 12) { checkMonth = 1; checkYear++; }
    }

    console.log(`🎉 Auto-generated ${generated.length} garbage fees`);

    return NextResponse.json({ success: true, generated: generated.length, fees: generated });
  } catch (error: any) {
    console.error("❌ Error:", error);
    return NextResponse.json({ error: "Failed to auto-generate" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth-helpers";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

// GET — fetch staff HR profile
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUserFromRequest(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (currentUser.role !== "ADMIN" && currentUser.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getPrismaForRequest(request);
    const rows = await db.$queryRawUnsafe(`
      SELECT sp.*, u."firstName", u."lastName", u.email, u.role::text as role
      FROM staff_profiles sp
      JOIN users u ON u.id = sp."userId"
      WHERE sp."userId" = $1
      LIMIT 1
    `, params.id) as any[];

    if (!rows.length) {
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({ profile: rows[0] });
  } catch (error: any) {
    console.error("HR profile GET error:", error?.message);
    return NextResponse.json({ error: "Failed to fetch HR profile" }, { status: 500 });
  }
}

// PUT — create or update staff HR profile
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUserFromRequest(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (currentUser.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const db = getPrismaForRequest(request);

    // Ensure staff_profiles table + noSalary column exist on older schemas
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS staff_profiles (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL UNIQUE REFERENCES users("id") ON DELETE CASCADE,
        "employmentType" TEXT NOT NULL DEFAULT 'FULL_TIME',
        "startDate" TIMESTAMP,
        "salary" DOUBLE PRECISION,
        "salaryFrequency" TEXT NOT NULL DEFAULT 'MONTHLY',
        "bankName" TEXT,
        "bankAccountNumber" TEXT,
        "bankAccountName" TEXT,
        "mpesaNumber" TEXT,
        "paymentMethod" TEXT NOT NULL DEFAULT 'BANK',
        "benefits" TEXT,
        "notes" TEXT,
        "noSalary" BOOLEAN NOT NULL DEFAULT false,
        "lastPaidAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    try {
      await db.$executeRawUnsafe(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS "noSalary" BOOLEAN NOT NULL DEFAULT false`);
    } catch { /* already exists */ }

    const body = await request.json();
    const {
      employmentType, startDate, salary, salaryFrequency,
      bankName, bankAccountNumber, bankAccountName,
      mpesaNumber, paymentMethod, benefits, notes, noSalary,
    } = body;

    // Check if profile exists
    const existing = await db.$queryRawUnsafe(`
      SELECT id FROM staff_profiles WHERE "userId" = $1 LIMIT 1
    `, params.id) as any[];

    const now = new Date();

    if (existing.length > 0) {
      await db.$executeRawUnsafe(`
        UPDATE staff_profiles SET
          "employmentType" = $2,
          "startDate" = $3,
          "salary" = $4,
          "salaryFrequency" = $5,
          "bankName" = $6,
          "bankAccountNumber" = $7,
          "bankAccountName" = $8,
          "mpesaNumber" = $9,
          "paymentMethod" = $10,
          "benefits" = $11,
          "notes" = $12,
          "noSalary" = $13,
          "updatedAt" = $14
        WHERE "userId" = $1
      `, params.id,
        employmentType || 'FULL_TIME',
        startDate ? new Date(startDate) : null,
        salary ? Number(salary) : null,
        salaryFrequency || 'MONTHLY',
        bankName || null, bankAccountNumber || null, bankAccountName || null,
        mpesaNumber || null, paymentMethod || 'BANK',
        benefits || null, notes || null,
        noSalary === true, now
      );
    } else {
      const id = `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await db.$executeRawUnsafe(`
        INSERT INTO staff_profiles (
          id, "userId", "employmentType", "startDate", "salary", "salaryFrequency",
          "bankName", "bankAccountNumber", "bankAccountName",
          "mpesaNumber", "paymentMethod", "benefits", "notes", "noSalary",
          "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)
      `, id, params.id,
        employmentType || 'FULL_TIME',
        startDate ? new Date(startDate) : null,
        salary ? Number(salary) : null,
        salaryFrequency || 'MONTHLY',
        bankName || null, bankAccountNumber || null, bankAccountName || null,
        mpesaNumber || null, paymentMethod || 'BANK',
        benefits || null, notes || null,
        noSalary === true, now
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("HR profile PUT error:", error?.message);
    return NextResponse.json({ error: "Failed to save HR profile" }, { status: 500 });
  }
}

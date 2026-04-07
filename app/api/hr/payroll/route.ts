import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth-helpers";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

// GET — list all staff with HR profiles (payroll roster)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserFromRequest(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (currentUser.role !== "ADMIN" && currentUser.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getPrismaForRequest(request);

    // Ensure staff_profiles table exists on older schemas (idempotent)
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
    // Patch noSalary onto existing tables that predate the column
    try {
      await db.$executeRawUnsafe(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS "noSalary" BOOLEAN NOT NULL DEFAULT false`);
    } catch { /* already exists */ }

    // Payroll roster = only staff explicitly enrolled (have a staff_profiles record)
    const staff = await db.$queryRawUnsafe(`
      SELECT
        u.id, u."firstName", u."lastName", u.email, u.role::text as role, u."isActive",
        sp.id as "profileId",
        sp."employmentType", sp."startDate", sp.salary, sp."salaryFrequency",
        sp."bankName", sp."bankAccountNumber", sp."bankAccountName",
        sp."mpesaNumber", sp."paymentMethod", sp.benefits,
        COALESCE(sp."noSalary", false) as "noSalary", sp."lastPaidAt", sp.notes
      FROM staff_profiles sp
      JOIN users u ON u.id = sp."userId"
      ORDER BY u."firstName" ASC
    `) as any[];

    // All non-tenant users not yet enrolled — any role, including ADMIN
    // Split into: accepted invite (lastLoginAt set) vs pending (never logged in)
    const unenrolled = await db.$queryRawUnsafe(`
      SELECT id, "firstName", "lastName", email, role::text as role,
             "lastLoginAt", "mustChangePassword"
      FROM users
      WHERE role::text != 'TENANT'
        AND id NOT IN (SELECT "userId" FROM staff_profiles)
      ORDER BY "lastLoginAt" DESC NULLS LAST, "firstName" ASC
    `) as any[];

    const totalMonthlyPayroll = staff.reduce((sum: number, s: any) => {
      if (!s.salary || s.noSalary) return sum;
      if (s.salaryFrequency === 'MONTHLY') return sum + Number(s.salary);
      if (s.salaryFrequency === 'WEEKLY') return sum + Number(s.salary) * 4.33;
      if (s.salaryFrequency === 'ANNUALLY') return sum + Number(s.salary) / 12;
      return sum;
    }, 0);

    return NextResponse.json({ staff, unenrolled, totalMonthlyPayroll });
  } catch (error: any) {
    console.error("Payroll GET error:", error?.message);
    return NextResponse.json({ error: "Failed to fetch payroll" }, { status: 500 });
  }
}

// POST — run payroll for selected staff
// Creates an expense entry per staff member and updates lastPaidAt
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserFromRequest(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (currentUser.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const db = getPrismaForRequest(request);
    const body = await request.json();
    const { staffIds, paymentDate, notes, propertyId } = body;

    if (!staffIds || !staffIds.length) {
      return NextResponse.json({ error: "Select at least one staff member" }, { status: 400 });
    }

    const now = new Date();
    const paidOn = paymentDate ? new Date(paymentDate) : now;

    // Get profiles for selected staff
    const profiles = await db.$queryRawUnsafe(`
      SELECT sp.*, u."firstName", u."lastName"
      FROM staff_profiles sp
      JOIN users u ON u.id = sp."userId"
      WHERE sp."userId" = ANY($1::text[])
    `, staffIds) as any[];

    if (!profiles.length) {
      return NextResponse.json({ error: "No HR profiles found for selected staff" }, { status: 400 });
    }

    const created: string[] = [];
    const skipped: string[] = [];

    for (const profile of profiles) {
      if (profile.noSalary) {
        skipped.push(`${profile.firstName} ${profile.lastName} (volunteer/no salary)`);
        continue;
      }
      if (!profile.salary) {
        skipped.push(`${profile.firstName} ${profile.lastName} (no salary set)`);
        continue;
      }

      const amount = Number(profile.salary);
      const expenseId = `exp_payroll_${profile.userId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const month = paidOn.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
      const description = `Salary — ${profile.firstName} ${profile.lastName} (${profile.employmentType}) — ${month}`;

      await db.$executeRawUnsafe(`
        INSERT INTO expenses (id, amount, category, description, date, "propertyId",
          "paymentMethod", notes, "createdAt", "updatedAt")
        VALUES ($1, $2, 'SALARIES', $3, $4, $5, $6, $7, $8, $8)
      `,
        expenseId, amount, description, paidOn,
        propertyId || null,
        profile.paymentMethod === 'MPESA' ? 'M_PESA' : profile.paymentMethod === 'CASH' ? 'CASH' : 'BANK_TRANSFER',
        notes || null,
        now
      );

      // Update lastPaidAt on profile
      await db.$executeRawUnsafe(`
        UPDATE staff_profiles SET "lastPaidAt" = $2, "updatedAt" = $3 WHERE "userId" = $1
      `, profile.userId, paidOn, now);

      created.push(`${profile.firstName} ${profile.lastName}`);
    }

    return NextResponse.json({
      success: true,
      paid: created,
      skipped,
      message: `Payroll processed for ${created.length} staff member${created.length !== 1 ? 's' : ''}.${skipped.length ? ` ${skipped.length} skipped (no salary set).` : ''}`,
    });
  } catch (error: any) {
    console.error("Payroll POST error:", error?.message);
    return NextResponse.json({ error: "Failed to run payroll" }, { status: 500 });
  }
}

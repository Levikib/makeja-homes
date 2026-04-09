import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getPrismaForRequest } from '@/lib/get-prisma'
import { nanoid } from 'nanoid'

export const dynamic = 'force-dynamic'

const SELF_HEAL = `
  CREATE TABLE IF NOT EXISTS security_deposits (
    id TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING',
    "paidDate" TIMESTAMP,
    "refundDate" TIMESTAMP,
    "refundAmount" DOUBLE PRECISION,
    "deductionsTotal" DOUBLE PRECISION DEFAULT 0,
    "refundMethod" TEXT,
    "refundNotes" TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS damage_assessments (
    id TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "assessedBy" TEXT,
    "assessmentDate" TIMESTAMP DEFAULT NOW(),
    "totalDamageCost" DOUBLE PRECISION DEFAULT 0,
    notes TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS damage_items (
    id TEXT PRIMARY KEY,
    "assessmentId" TEXT NOT NULL,
    description TEXT NOT NULL,
    "damageType" TEXT DEFAULT 'OTHER',
    "estimatedCost" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT NOW()
  );
`

// GET /api/admin/deposit-refund?tenantId=xxx
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!['ADMIN', 'MANAGER'].includes(payload.role as string))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const tenantId = request.nextUrl.searchParams.get('tenantId')
    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

    const db = getPrismaForRequest(request)
    await db.$executeRawUnsafe(SELF_HEAL)

    // Fetch the deposit record
    const depositRows = await db.$queryRawUnsafe<any[]>(`
      SELECT
        sd.id, sd."tenantId", sd.amount, sd.status::text AS status,
        sd."paidDate", sd."refundDate", sd."refundAmount",
        sd."deductionsTotal", sd."refundMethod", sd."refundNotes",
        sd."createdAt", sd."updatedAt"
      FROM security_deposits sd
      WHERE sd."tenantId" = $1
      ORDER BY sd."createdAt" DESC
      LIMIT 1
    `, tenantId)

    // Try to get deposit from tenants table if no security_deposit record
    let deposit: any = depositRows[0] ?? null
    if (!deposit) {
      const tenantRows = await db.$queryRawUnsafe<any[]>(`
        SELECT t.id, t."depositAmount", t."leaseStartDate"
        FROM tenants t
        WHERE t.id = $1 LIMIT 1
      `, tenantId)
      if (tenantRows[0] && tenantRows[0].depositAmount > 0) {
        deposit = {
          id: null,
          tenantId,
          amount: Number(tenantRows[0].depositAmount),
          status: 'HELD',
          paidDate: tenantRows[0].leaseStartDate,
          refundDate: null,
          refundAmount: null,
          deductionsTotal: 0,
          refundMethod: null,
          refundNotes: null,
        }
      }
    }

    // Fetch the latest damage assessment with items
    const assessmentRows = await db.$queryRawUnsafe<any[]>(`
      SELECT
        da.id, da."tenantId", da."assessedBy", da."assessmentDate",
        da."totalDamageCost", da.notes, da."createdAt", da."updatedAt"
      FROM damage_assessments da
      WHERE da."tenantId" = $1
      ORDER BY da."assessmentDate" DESC
      LIMIT 1
    `, tenantId)

    let assessment: any = null
    if (assessmentRows[0]) {
      const itemRows = await db.$queryRawUnsafe<any[]>(`
        SELECT id, "assessmentId", description, "damageType", "estimatedCost", "createdAt"
        FROM damage_items
        WHERE "assessmentId" = $1
        ORDER BY "createdAt" ASC
      `, assessmentRows[0].id)
      assessment = {
        ...assessmentRows[0],
        totalDamageCost: Number(assessmentRows[0].totalDamageCost ?? 0),
        damage_items: itemRows.map((i) => ({
          ...i,
          estimatedCost: Number(i.estimatedCost ?? 0),
        })),
      }
    }

    const heldAmount = deposit ? Number(deposit.amount ?? 0) : 0
    const totalDamage = assessment ? Number(assessment.totalDamageCost ?? 0) : 0
    const refundable = Math.max(0, heldAmount - totalDamage)

    return NextResponse.json({
      deposit,
      assessment,
      summary: { heldAmount, totalDamage, refundable },
    })
  } catch (err: any) {
    console.error('[deposit-refund GET]', err?.message)
    return NextResponse.json({ error: 'Failed to load deposit info' }, { status: 500 })
  }
}

// POST /api/admin/deposit-refund — process refund
// Body: { tenantId, deductions: number, notes: string, refundMethod: string }
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (payload.role !== 'ADMIN')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { tenantId, deductions, notes, refundMethod } = await request.json()
    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

    const db = getPrismaForRequest(request)
    await db.$executeRawUnsafe(SELF_HEAL)

    // Fetch deposit — prefer security_deposits, fall back to tenants.depositAmount
    let depositRows = await db.$queryRawUnsafe<any[]>(`
      SELECT id, "tenantId", amount, status::text AS status
      FROM security_deposits
      WHERE "tenantId" = $1
      ORDER BY "createdAt" DESC
      LIMIT 1
    `, tenantId)

    let depositId: string | null = depositRows[0]?.id ?? null
    let depositAmount: number

    if (depositRows[0]) {
      if (depositRows[0].status === 'REFUNDED')
        return NextResponse.json({ error: 'Deposit already refunded' }, { status: 400 })
      depositAmount = Number(depositRows[0].amount)
    } else {
      // Try infer from tenant
      const tenantRows = await db.$queryRawUnsafe<any[]>(`
        SELECT t.id, t."depositAmount", t."unitId" FROM tenants t WHERE t.id = $1 LIMIT 1
      `, tenantId)
      if (!tenantRows[0] || !tenantRows[0].depositAmount)
        return NextResponse.json({ error: 'No deposit on record' }, { status: 404 })
      depositAmount = Number(tenantRows[0].depositAmount)

      // Create a security_deposits record so we can update it
      depositId = `dep_${nanoid(10)}`
      await db.$executeRawUnsafe(`
        INSERT INTO security_deposits (id, "tenantId", amount, status, "paidDate", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, 'HELD', NOW(), NOW(), NOW())
      `, depositId, tenantId, depositAmount)
    }

    const deductAmt = Number(deductions ?? 0)
    const refundAmount = Math.max(0, depositAmount - deductAmt)
    const method = refundMethod ?? 'CASH'

    // Update deposit record to REFUNDED
    await db.$executeRawUnsafe(`
      UPDATE security_deposits
      SET
        status = 'REFUNDED',
        "refundDate" = NOW(),
        "refundAmount" = $1,
        "deductionsTotal" = $2,
        "refundMethod" = $3,
        "refundNotes" = $4,
        "updatedAt" = NOW()
      WHERE id = $5
    `, refundAmount, deductAmt, method, notes ?? null, depositId)

    // Fetch tenant unitId for payment record
    const tenantRows = await db.$queryRawUnsafe<any[]>(`
      SELECT "unitId" FROM tenants WHERE id = $1 LIMIT 1
    `, tenantId)
    const unitId = tenantRows[0]?.unitId ?? null

    // Ensure payments table exists
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        "tenantId" TEXT,
        "billId" TEXT,
        amount NUMERIC NOT NULL,
        "paymentMethod" TEXT,
        status TEXT NOT NULL DEFAULT 'COMPLETED',
        reference TEXT,
        notes TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).catch(() => {})

    // Insert payment record
    const paymentId = `pay_${nanoid(12)}`
    const ref = `DEP-REFUND-${Date.now()}`

    try {
      await db.$executeRawUnsafe(`
        INSERT INTO payments (
          id, "referenceNumber", "tenantId", "unitId", amount,
          "paymentType", "paymentMethod", status, "paystackStatus",
          "paymentDate", "createdById", notes, "verificationStatus",
          "verifiedById", "verifiedAt", "verificationNotes",
          "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5,
          'DEPOSIT'::text::"PaymentType", $6::text::"PaymentMethod",
          'COMPLETED'::text::"PaymentStatus", 'manual',
          NOW(), $7, $8, 'APPROVED',
          $7, NOW(), 'Deposit refund processed',
          NOW(), NOW()
        )
      `,
        paymentId, ref, tenantId, unitId, refundAmount,
        method, payload.id as string,
        `Deposit refund: ${notes ?? ''}`.trim()
      )
    } catch (payErr: any) {
      // Payment insert is best-effort — don't fail the whole request
      console.warn('[deposit-refund] payment insert failed:', payErr?.message)
    }

    return NextResponse.json({ success: true, refundAmount, deductionsTotal: deductAmt })
  } catch (err: any) {
    console.error('[deposit-refund POST]', err?.message)
    return NextResponse.json({ error: 'Failed to process refund' }, { status: 500 })
  }
}

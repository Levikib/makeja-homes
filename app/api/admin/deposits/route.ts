import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getPrismaForRequest } from '@/lib/get-prisma'

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

// GET /api/admin/deposits — full deposit dashboard data
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!['ADMIN', 'MANAGER'].includes(payload.role as string))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const db = getPrismaForRequest(request)

    // Self-heal tables
    await db.$executeRawUnsafe(SELF_HEAL)

    // Main join: security_deposits → tenants → users → units → properties
    const depositRows = await db.$queryRawUnsafe<any[]>(`
      SELECT
        sd.id,
        sd."tenantId",
        sd.amount,
        sd.status::text AS status,
        sd."paidDate",
        sd."refundDate",
        sd."refundAmount",
        sd."deductionsTotal",
        sd."refundMethod",
        sd."refundNotes",
        sd."createdAt",
        u."firstName" || ' ' || u."lastName" AS "tenantName",
        u.email,
        u."phoneNumber" AS phone,
        un."unitNumber",
        p.id AS "propertyId",
        p.name AS "propertyName",
        t."leaseStartDate",
        t."leaseEndDate",
        EXTRACT(EPOCH FROM (t."leaseEndDate" - NOW())) / 86400 AS "daysUntilExpiry"
      FROM security_deposits sd
      JOIN tenants t ON t.id = sd."tenantId"
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      ORDER BY sd."createdAt" DESC
    `)

    // Grab tenants WITH a completed deposit PAYMENT but no security_deposits record
    // (covers Paystack payments before the webhook fix, and any gap cases)
    const paystackDepositRows = await db.$queryRawUnsafe<any[]>(`
      SELECT
        'paid_' || py.id AS id,
        t.id AS "tenantId",
        py.amount AS amount,
        'HELD' AS status,
        py."paymentDate" AS "paidDate",
        NULL::TIMESTAMP AS "refundDate",
        NULL::FLOAT8 AS "refundAmount",
        0 AS "deductionsTotal",
        NULL AS "refundMethod",
        NULL AS "refundNotes",
        t."createdAt",
        u."firstName" || ' ' || u."lastName" AS "tenantName",
        u.email,
        u."phoneNumber" AS phone,
        un."unitNumber",
        p.id AS "propertyId",
        p.name AS "propertyName",
        t."leaseStartDate",
        t."leaseEndDate",
        EXTRACT(EPOCH FROM (t."leaseEndDate" - NOW())) / 86400 AS "daysUntilExpiry"
      FROM payments py
      JOIN tenants t ON t.id = py."tenantId"
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE py."paymentType"::text = 'DEPOSIT'
        AND py.status::text IN ('COMPLETED', 'VERIFIED')
        AND NOT EXISTS (
          SELECT 1 FROM security_deposits sd WHERE sd."tenantId" = t.id
        )
      ORDER BY py."paymentDate" DESC
    `).catch(() => [] as any[])

    // Also grab tenants WITH depositAmount but no security_deposits record and no payment (manually tracked)
    const inferredRows = await db.$queryRawUnsafe<any[]>(`
      SELECT
        'inferred_' || t.id AS id,
        t.id AS "tenantId",
        t."depositAmount" AS amount,
        'HELD' AS status,
        t."leaseStartDate" AS "paidDate",
        NULL::TIMESTAMP AS "refundDate",
        NULL::FLOAT8 AS "refundAmount",
        0 AS "deductionsTotal",
        NULL AS "refundMethod",
        NULL AS "refundNotes",
        t."createdAt",
        u."firstName" || ' ' || u."lastName" AS "tenantName",
        u.email,
        u."phoneNumber" AS phone,
        un."unitNumber",
        p.id AS "propertyId",
        p.name AS "propertyName",
        t."leaseStartDate",
        t."leaseEndDate",
        EXTRACT(EPOCH FROM (t."leaseEndDate" - NOW())) / 86400 AS "daysUntilExpiry"
      FROM tenants t
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE t."depositAmount" > 0
        AND NOT EXISTS (
          SELECT 1 FROM security_deposits sd WHERE sd."tenantId" = t.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM payments py
          WHERE py."tenantId" = t.id
            AND py."paymentType"::text = 'DEPOSIT'
            AND py.status::text IN ('COMPLETED', 'VERIFIED')
        )
      ORDER BY t."createdAt" DESC
    `)

    // Damage assessments summary per tenant
    const assessmentRows = await db.$queryRawUnsafe<any[]>(`
      SELECT "tenantId", MAX("totalDamageCost") AS "assessmentTotal", COUNT(*) AS "assessmentCount"
      FROM damage_assessments
      GROUP BY "tenantId"
    `)
    const assessmentMap = new Map<string, { assessmentTotal: number; hasAssessment: boolean }>()
    for (const row of assessmentRows) {
      assessmentMap.set(row.tenantId, {
        assessmentTotal: Number(row.assessmentTotal ?? 0),
        hasAssessment: true,
      })
    }

    // Vacate notices per tenant
    const vacateRows = await db.$queryRawUnsafe<any[]>(`
      SELECT "tenantId", MAX("intendedVacateDate") AS "vacateDate"
      FROM vacate_notices
      WHERE status::text NOT IN ('CANCELLED')
      GROUP BY "tenantId"
    `).catch(() => [] as any[])
    const vacateMap = new Map<string, string>()
    for (const row of vacateRows) {
      vacateMap.set(row.tenantId, row.vacateDate)
    }

    const allRows = [...depositRows, ...paystackDepositRows, ...inferredRows]

    const deposits = allRows.map((row) => {
      const assessment = assessmentMap.get(row.tenantId) ?? { assessmentTotal: 0, hasAssessment: false }
      const vacateDate = vacateMap.get(row.tenantId) ?? null
      return {
        id: row.id,
        tenantId: row.tenantId,
        tenantName: row.tenantName,
        email: row.email,
        phone: row.phone,
        unitNumber: row.unitNumber,
        propertyName: row.propertyName,
        propertyId: row.propertyId,
        amount: Number(row.amount ?? 0),
        status: row.status,
        paidDate: row.paidDate,
        refundDate: row.refundDate,
        refundAmount: row.refundAmount != null ? Number(row.refundAmount) : null,
        deductionsTotal: Number(row.deductionsTotal ?? 0),
        refundMethod: row.refundMethod,
        leaseStart: row.leaseStartDate,
        leaseEnd: row.leaseEndDate,
        daysUntilExpiry: row.daysUntilExpiry != null ? Math.round(Number(row.daysUntilExpiry)) : null,
        hasAssessment: assessment.hasAssessment,
        assessmentTotal: assessment.assessmentTotal,
        hasVacateNotice: vacateMap.has(row.tenantId),
        vacateDate,
      }
    })

    // Stats
    const held = deposits.filter((d) => d.status === 'HELD' || d.status === 'PENDING')
    const refunded = deposits.filter((d) => d.status === 'REFUNDED')
    const pending = deposits.filter((d) => d.status === 'PENDING')
    const totalHeld = held.reduce((s, d) => s + d.amount, 0)
    const totalRefunded = refunded.reduce((s, d) => s + (d.refundAmount ?? d.amount), 0)
    const totalDeductions = deposits.reduce((s, d) => s + (d.deductionsTotal ?? 0), 0)
    const pendingRefunds = deposits.filter(
      (d) => d.status !== 'REFUNDED' && d.daysUntilExpiry != null && d.daysUntilExpiry < 0
    ).length
    const allAmounts = deposits.filter((d) => d.amount > 0)
    const averageDeposit = allAmounts.length > 0
      ? Math.round(allAmounts.reduce((s, d) => s + d.amount, 0) / allAmounts.length)
      : 0
    const heldCount = held.filter((d) => d.status === 'HELD').length
    const totalCount = deposits.length
    const collectionRate = totalCount > 0 ? Math.round((heldCount / totalCount) * 100) : 0

    return NextResponse.json({
      deposits,
      stats: {
        totalHeld,
        heldCount: held.length,
        totalRefunded,
        refundedCount: refunded.length,
        totalDeductions,
        pendingRefunds,
        averageDeposit,
        collectionRate,
        pendingCount: pending.length,
      },
    })
  } catch (err: any) {
    console.error('[deposits GET]', err?.message)
    return NextResponse.json({ error: 'Failed to load deposits' }, { status: 500 })
  }
}

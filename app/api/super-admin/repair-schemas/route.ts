import { NextRequest, NextResponse } from 'next/server'
import { getMasterPrisma, buildTenantUrl } from '@/lib/get-prisma'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Adds missing columns to existing tenant schemas to match the current Prisma schema.
// Safe to run multiple times — uses ADD COLUMN IF NOT EXISTS.
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-repair-secret')
  if (secret !== (process.env.CRON_SECRET || 'dev-secret-change-in-production')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const master = getMasterPrisma()
  const schemas = await master.$queryRaw<{ schema_name: string }[]>`
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant_%' ORDER BY schema_name
  `

  const results: Record<string, { ok: boolean; error?: string }> = {}

  for (const { schema_name } of schemas) {
    const s = schema_name
    const prisma = new PrismaClient({ datasources: { db: { url: buildTenantUrl(s) } } })
    try {
      // Add missing columns to properties table
      const propertyCols = [
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "state" TEXT`,
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "country" TEXT NOT NULL DEFAULT 'Kenya'`,
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "postalCode" TEXT`,
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP`,
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "companyId" TEXT`,
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "storekeeperId" TEXT`,
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "managerIds" TEXT[] DEFAULT '{}'`,
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "caretakerIds" TEXT[] DEFAULT '{}'`,
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "storekeeperIds" TEXT[] DEFAULT '{}'`,
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "bankAccounts" JSONB`,
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "chargesGarbageFee" BOOLEAN NOT NULL DEFAULT true`,
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "defaultGarbageFee" FLOAT NOT NULL DEFAULT 500`,
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "mpesaPaybillName" TEXT`,
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "mpesaPaybillNumber" TEXT`,
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "mpesaPhoneNumber" TEXT`,
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "mpesaTillName" TEXT`,
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "mpesaTillNumber" TEXT`,
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "paymentInstructions" TEXT`,
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "paystackAccountEmail" TEXT`,
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "paystackAccountName" TEXT`,
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "paystackAccountNumber" TEXT`,
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "paystackActive" BOOLEAN NOT NULL DEFAULT false`,
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "paystackBankCode" TEXT`,
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "paystackSubaccountCode" TEXT`,
        `ALTER TABLE "${s}"."properties" ADD COLUMN IF NOT EXISTS "waterRatePerUnit" FLOAT NOT NULL DEFAULT 150`,
        // Drop broken FK constraints that reference wrong schema
        `ALTER TABLE "${s}"."properties" DROP CONSTRAINT IF EXISTS "properties_createdById_fkey"`,
        `ALTER TABLE "${s}"."properties" DROP CONSTRAINT IF EXISTS "properties_managerId_fkey"`,
        `ALTER TABLE "${s}"."properties" DROP CONSTRAINT IF EXISTS "properties_caretakerId_fkey"`,
        `ALTER TABLE "${s}"."properties" DROP CONSTRAINT IF EXISTS "properties_companyId_fkey"`,
      ]

      // units missing columns
      const unitCols = [
        `ALTER TABLE "${s}"."units" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP`,
        `ALTER TABLE "${s}"."units" ADD COLUMN IF NOT EXISTS "rentAmount" FLOAT`,
        `ALTER TABLE "${s}"."units" ADD COLUMN IF NOT EXISTS "depositAmount" FLOAT`,
        `ALTER TABLE "${s}"."units" ADD COLUMN IF NOT EXISTS "features" TEXT`,
        `ALTER TABLE "${s}"."units" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true`,
        `ALTER TABLE "${s}"."units" DROP CONSTRAINT IF EXISTS "units_propertyId_fkey"`,
        `ALTER TABLE "${s}"."units" ADD CONSTRAINT "units_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "${s}"."properties"("id") ON DELETE CASCADE`,
      ]

      // users missing columns
      const userCols = [
        `ALTER TABLE "${s}"."users" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false`,
        `ALTER TABLE "${s}"."users" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP`,
        `ALTER TABLE "${s}"."users" ADD COLUMN IF NOT EXISTS "companyId" TEXT`,
        `ALTER TABLE "${s}"."users" DROP CONSTRAINT IF EXISTS "users_companyId_fkey"`,
      ]

      for (const sql of [...propertyCols, ...unitCols, ...userCols]) {
        try { await prisma.$executeRawUnsafe(sql) } catch {}
      }

      // Backfill companyId on users where it is null — look up the company by schema slug
      try {
        const slug = s.replace(/^tenant_/, '')
        const company = await master.companies.findFirst({ where: { slug }, select: { id: true } })
        if (company) {
          await prisma.$executeRawUnsafe(
            `UPDATE "${s}"."users" SET "companyId" = $1 WHERE "companyId" IS NULL`,
            company.id
          )
        }
      } catch {}

      results[s] = { ok: true }
    } catch (e: any) {
      results[s] = { ok: false, error: e.message }
    } finally {
      await prisma.$disconnect()
    }
  }

  return NextResponse.json({ success: true, results })
}

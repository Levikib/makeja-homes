// ═══════════════════════════════════════════════════════════
// lib/tenant/provision.ts
//
// The magic that creates a new client's isolated database schema.
// Called when a new organization signs up.
//
// Flow:
//   1. Create schema: tenant_{slug}
//   2. Run all table migrations in that schema
//   3. Seed default data (roles, settings)
//   4. Update organizations.schemaStatus = ACTIVE
// ═══════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client'
import { masterPrisma } from '@/lib/db/prisma-master'
import { getTenantPrisma } from '@/lib/db/prisma-tenant'

export interface ProvisionInput {
  organizationId: string
  slug: string
  adminName: string
  adminEmail: string
  adminPasswordHash: string
  companyName: string
  phone?: string
  country?: string
}

export interface ProvisionResult {
  success: boolean
  schemaName: string
  adminUserId?: string
  error?: string
}

/**
 * Provision a new tenant schema.
 * This is the core of multi-tenancy — each client gets
 * a completely isolated Postgres schema with all tables.
 */
export async function provisionTenantSchema(
  input: ProvisionInput
): Promise<ProvisionResult> {
  const schemaName = `tenant_${input.slug}`

  try {
    console.log(`[PROVISION] Starting schema creation: ${schemaName}`)

    // ── Step 1: Create the schema ──────────────────────────
    // Use the default prisma client (public schema) for DDL
    const adminPrisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    })

    await adminPrisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`)
    console.log(`[PROVISION] Schema created: ${schemaName}`)

    // ── Step 2: Create all tables in the tenant schema ─────
    // We run raw SQL to create the exact same table structure
    // as the public schema, but in the new tenant schema.
    await createTenantTables(adminPrisma, schemaName)
    await adminPrisma.$disconnect()
    console.log(`[PROVISION] Tables created in: ${schemaName}`)

    // ── Step 3: Seed default data ──────────────────────────
    const tenantPrisma = getTenantPrisma(input.slug)
    const adminUserId = await seedTenantData(tenantPrisma, input)
    console.log(`[PROVISION] Seeded default data, admin: ${adminUserId}`)

    // ── Step 4: Update master org record ──────────────────
    await masterPrisma.organizations.update({
      where: { id: input.organizationId },
      data: {
        schemaStatus: 'ACTIVE',
        schemaName,
        adminEmail: input.adminEmail,
        adminName: input.adminName,
      },
    })

    // ── Step 5: Audit log ──────────────────────────────────
    await masterPrisma.master_audit_logs.create({
      data: {
        organizationId: input.organizationId,
        action: 'SCHEMA_PROVISIONED',
        actor: 'SYSTEM',
        details: { schemaName, adminEmail: input.adminEmail },
      },
    })

    console.log(`[PROVISION] ✅ Complete: ${schemaName}`)

    return { success: true, schemaName, adminUserId }

  } catch (error: any) {
    console.error(`[PROVISION] ❌ Failed: ${schemaName}`, error)

    // Update org to failed status
    try {
      await masterPrisma.organizations.update({
        where: { id: input.organizationId },
        data: { schemaStatus: 'FAILED' },
      })
    } catch {}

    return {
      success: false,
      schemaName,
      error: error.message || 'Provisioning failed',
    }
  }
}

/**
 * Create all tables in the tenant schema.
 * This mirrors your current Prisma schema exactly.
 * Uses raw SQL so we can target a specific schema.
 */
async function createTenantTables(prisma: PrismaClient, schema: string) {
  const s = schema // shorthand

  // Execute each CREATE TABLE statement
  const statements = getTenantTableSQL(s)

  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql)
  }

  // Create indexes
  const indexes = getTenantIndexSQL(s)
  for (const sql of indexes) {
    try {
      await prisma.$executeRawUnsafe(sql)
    } catch {
      // Index may already exist — safe to ignore
    }
  }
}

/**
 * Seed initial data for a new tenant.
 * Creates the admin user and the company record.
 */
async function seedTenantData(
  prisma: PrismaClient,
  input: ProvisionInput
): Promise<string> {
  const { nanoid } = await import('nanoid')

  const companyId = nanoid()
  const adminUserId = nanoid()
  const now = new Date()

  // Create company record
  await prisma.$executeRawUnsafe(`
    INSERT INTO companies (id, name, email, phone, country, "isActive", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, true, $6, $6)
  `, companyId, input.companyName, input.adminEmail, input.phone || null, input.country || 'Kenya', now)

  // Create admin user
  await prisma.$executeRawUnsafe(`
    INSERT INTO users (id, email, password, "firstName", "lastName", "phoneNumber", role, "isActive", "companyId", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, 'ADMIN', true, $7, $8, $8)
  `, adminUserId, input.adminEmail, input.adminPasswordHash,
     input.adminName.split(' ')[0], input.adminName.split(' ').slice(1).join(' ') || input.adminName.split(' ')[0],
     null, companyId, now)

  return adminUserId
}

/**
 * SQL statements to create all tenant tables.
 * Keep this in sync with prisma/schema.prisma.
 */
function getTenantTableSQL(s: string): string[] {
  return [
    // Enums (created once at DB level, shared across schemas)
    // Note: Postgres enums are global — we skip re-creating them

    `CREATE TABLE IF NOT EXISTS "${s}".companies (
      id text PRIMARY KEY,
      name text NOT NULL,
      email text NOT NULL UNIQUE,
      phone text,
      address text,
      city text,
      country text NOT NULL DEFAULT 'Kenya',
      logo text,
      "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS "${s}".users (
      id text PRIMARY KEY,
      email text NOT NULL UNIQUE,
      password text NOT NULL,
      "firstName" text NOT NULL,
      "lastName" text NOT NULL,
      "phoneNumber" text,
      role "Role" NOT NULL DEFAULT 'TENANT',
      "isActive" boolean NOT NULL DEFAULT true,
      "companyId" text REFERENCES "${s}".companies(id),
      "emailVerified" timestamptz,
      "lastLoginAt" timestamptz,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS "${s}".password_reset_tokens (
      id text PRIMARY KEY,
      "userId" text NOT NULL REFERENCES "${s}".users(id) ON DELETE CASCADE,
      token text NOT NULL UNIQUE,
      "expiresAt" timestamptz NOT NULL,
      used boolean NOT NULL DEFAULT false,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS "${s}".properties (
      id text PRIMARY KEY,
      name text NOT NULL,
      address text NOT NULL,
      city text NOT NULL,
      state text,
      country text NOT NULL DEFAULT 'Kenya',
      "postalCode" text,
      type text NOT NULL DEFAULT 'RESIDENTIAL',
      description text,
      "isActive" boolean NOT NULL DEFAULT true,
      "deletedAt" timestamptz,
      "createdById" text NOT NULL REFERENCES "${s}".users(id),
      "companyId" text REFERENCES "${s}".companies(id),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS "${s}".units (
      id text PRIMARY KEY,
      "propertyId" text NOT NULL REFERENCES "${s}".properties(id) ON DELETE CASCADE,
      "unitNumber" text NOT NULL,
      floor integer,
      type "UnitType" NOT NULL DEFAULT 'ONE_BEDROOM',
      bedrooms integer NOT NULL DEFAULT 1,
      bathrooms integer NOT NULL DEFAULT 1,
      "squareFeet" float,
      "monthlyRent" float NOT NULL,
      status "UnitStatus" NOT NULL DEFAULT 'VACANT',
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS "${s}".tenants (
      id text PRIMARY KEY,
      "userId" text NOT NULL UNIQUE REFERENCES "${s}".users(id) ON DELETE CASCADE,
      "unitId" text UNIQUE REFERENCES "${s}".units(id),
      "propertyId" text REFERENCES "${s}".properties(id),
      "leaseStartDate" timestamptz,
      "leaseEndDate" timestamptz,
      "rentAmount" float,
      "depositAmount" float,
      "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS "${s}".lease_agreements (
      id text PRIMARY KEY,
      "tenantId" text NOT NULL REFERENCES "${s}".tenants(id) ON DELETE CASCADE,
      "unitId" text NOT NULL REFERENCES "${s}".units(id),
      "propertyId" text REFERENCES "${s}".properties(id),
      "startDate" timestamptz NOT NULL,
      "endDate" timestamptz NOT NULL,
      "rentAmount" float NOT NULL,
      "depositAmount" float NOT NULL DEFAULT 0,
      "contractSignedAt" timestamptz,
      terms text,
      status "LeaseStatus" NOT NULL DEFAULT 'DRAFT',
      "signToken" text UNIQUE,
      "createdById" text REFERENCES "${s}".users(id),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS "${s}".monthly_bills (
      id text PRIMARY KEY,
      "tenantId" text NOT NULL REFERENCES "${s}".tenants(id) ON DELETE CASCADE,
      "unitId" text REFERENCES "${s}".units(id),
      "propertyId" text REFERENCES "${s}".properties(id),
      month integer NOT NULL,
      year integer NOT NULL,
      "rentAmount" float NOT NULL DEFAULT 0,
      "waterAmount" float NOT NULL DEFAULT 0,
      "garbageAmount" float NOT NULL DEFAULT 0,
      "otherAmount" float NOT NULL DEFAULT 0,
      "totalAmount" float NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'PENDING',
      "dueDate" timestamptz,
      "generatedAt" timestamptz NOT NULL DEFAULT now(),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS "${s}".payments (
      id text PRIMARY KEY,
      "tenantId" text NOT NULL REFERENCES "${s}".tenants(id) ON DELETE CASCADE,
      "unitId" text REFERENCES "${s}".units(id),
      "propertyId" text REFERENCES "${s}".properties(id),
      "leaseId" text REFERENCES "${s}".lease_agreements(id),
      "billId" text REFERENCES "${s}".monthly_bills(id),
      amount float NOT NULL,
      "paymentDate" timestamptz NOT NULL DEFAULT now(),
      "paymentType" "PaymentType" NOT NULL DEFAULT 'RENT',
      "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
      "referenceNumber" text,
      status "PaymentStatus" NOT NULL DEFAULT 'PENDING',
      "paystackRef" text UNIQUE,
      "paystackStatus" text,
      "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
      "verifiedById" text REFERENCES "${s}".users(id),
      "verifiedAt" timestamptz,
      notes text,
      "createdById" text REFERENCES "${s}".users(id),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS "${s}".water_readings (
      id text PRIMARY KEY,
      "unitId" text NOT NULL REFERENCES "${s}".units(id),
      "tenantId" text NOT NULL REFERENCES "${s}".tenants(id),
      "propertyId" text REFERENCES "${s}".properties(id),
      "previousReading" float NOT NULL DEFAULT 0,
      "currentReading" float NOT NULL DEFAULT 0,
      "unitsConsumed" float NOT NULL DEFAULT 0,
      "ratePerUnit" float NOT NULL DEFAULT 0,
      "amountDue" float NOT NULL DEFAULT 0,
      month integer NOT NULL,
      year integer NOT NULL,
      "readingDate" timestamptz NOT NULL DEFAULT now(),
      "recordedBy" text NOT NULL REFERENCES "${s}".users(id),
      "paymentId" text REFERENCES "${s}".payments(id),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS "${s}".garbage_fees (
      id text PRIMARY KEY,
      "tenantId" text NOT NULL REFERENCES "${s}".tenants(id) ON DELETE CASCADE,
      "unitId" text REFERENCES "${s}".units(id),
      "propertyId" text REFERENCES "${s}".properties(id),
      amount float NOT NULL,
      month integer NOT NULL,
      year integer NOT NULL,
      status text NOT NULL DEFAULT 'PENDING',
      "paymentId" text REFERENCES "${s}".payments(id),
      "createdById" text REFERENCES "${s}".users(id),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS "${s}".maintenance_requests (
      id text PRIMARY KEY,
      "unitId" text REFERENCES "${s}".units(id),
      "propertyId" text REFERENCES "${s}".properties(id),
      "tenantId" text REFERENCES "${s}".tenants(id),
      "assignedToId" text REFERENCES "${s}".users(id),
      "createdById" text REFERENCES "${s}".users(id),
      title text NOT NULL,
      description text NOT NULL,
      category text,
      priority "Priority" NOT NULL DEFAULT 'MEDIUM',
      status "MaintenanceStatus" NOT NULL DEFAULT 'PENDING',
      notes text,
      "completedAt" timestamptz,
      "estimatedCost" float,
      "actualCost" float,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS "${s}".expenses (
      id text PRIMARY KEY,
      "propertyId" text REFERENCES "${s}".properties(id),
      "unitId" text REFERENCES "${s}".units(id),
      "createdById" text REFERENCES "${s}".users(id),
      title text NOT NULL,
      description text,
      amount float NOT NULL,
      category text NOT NULL,
      "expenseDate" timestamptz NOT NULL DEFAULT now(),
      "receiptUrl" text,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS "${s}".security_deposits (
      id text PRIMARY KEY,
      "tenantId" text NOT NULL UNIQUE REFERENCES "${s}".tenants(id) ON DELETE CASCADE,
      "unitId" text REFERENCES "${s}".units(id),
      "propertyId" text REFERENCES "${s}".properties(id),
      amount float NOT NULL,
      status "DepositStatus" NOT NULL DEFAULT 'HELD',
      "paidAt" timestamptz,
      "refundedAt" timestamptz,
      "refundAmount" float,
      "deductionAmount" float NOT NULL DEFAULT 0,
      notes text,
      "assessmentId" text,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS "${s}".damage_assessments (
      id text PRIMARY KEY,
      "tenantId" text NOT NULL REFERENCES "${s}".tenants(id) ON DELETE CASCADE,
      "assessmentDate" timestamptz NOT NULL,
      "assessedById" text NOT NULL REFERENCES "${s}".users(id),
      "overallCondition" text,
      notes text,
      "totalDamageCost" float NOT NULL DEFAULT 0,
      status "AssessmentStatus" NOT NULL DEFAULT 'PENDING',
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS "${s}".damage_items (
      id text PRIMARY KEY,
      "assessmentId" text NOT NULL REFERENCES "${s}".damage_assessments(id) ON DELETE CASCADE,
      category text NOT NULL,
      description text NOT NULL,
      condition text,
      "repairCost" float NOT NULL DEFAULT 0,
      "photoUrl" text,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS "${s}".vacate_notices (
      id text PRIMARY KEY,
      "tenantId" text NOT NULL REFERENCES "${s}".tenants(id) ON DELETE CASCADE,
      "unitId" text REFERENCES "${s}".units(id),
      "propertyId" text REFERENCES "${s}".properties(id),
      "noticeDate" timestamptz NOT NULL DEFAULT now(),
      "vacateDate" timestamptz NOT NULL,
      reason text,
      status "NoticeStatus" NOT NULL DEFAULT 'PENDING',
      "processedById" text REFERENCES "${s}".users(id),
      "processedAt" timestamptz,
      notes text,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS "${s}".inventory_items (
      id text PRIMARY KEY,
      "propertyId" text REFERENCES "${s}".properties(id),
      "unitId" text REFERENCES "${s}".units(id),
      name text NOT NULL,
      description text,
      category text NOT NULL,
      quantity integer NOT NULL DEFAULT 0,
      "unitCost" float NOT NULL DEFAULT 0,
      "reorderLevel" integer NOT NULL DEFAULT 0,
      "createdById" text REFERENCES "${s}".users(id),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS "${s}".inventory_movements (
      id text PRIMARY KEY,
      "itemId" text NOT NULL REFERENCES "${s}".inventory_items(id) ON DELETE CASCADE,
      type text NOT NULL,
      quantity integer NOT NULL,
      notes text,
      "createdById" text REFERENCES "${s}".users(id),
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS "${s}".purchase_orders (
      id text PRIMARY KEY,
      "propertyId" text REFERENCES "${s}".properties(id),
      "supplierId" text,
      "supplierName" text,
      status text NOT NULL DEFAULT 'PENDING',
      "totalAmount" float NOT NULL DEFAULT 0,
      notes text,
      "orderedById" text REFERENCES "${s}".users(id),
      "approvedById" text REFERENCES "${s}".users(id),
      "orderedAt" timestamptz,
      "deliveredAt" timestamptz,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS "${s}".purchase_order_items (
      id text PRIMARY KEY,
      "orderId" text NOT NULL REFERENCES "${s}".purchase_orders(id) ON DELETE CASCADE,
      "inventoryItemId" text REFERENCES "${s}".inventory_items(id),
      name text NOT NULL,
      quantity integer NOT NULL,
      "unitCost" float NOT NULL,
      "totalCost" float NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS "${s}"."recurringCharges" (
      id text PRIMARY KEY,
      name text NOT NULL,
      description text,
      amount float NOT NULL,
      "propertyIds" text[] NOT NULL DEFAULT '{}',
      "appliesTo" "AppliesTo" NOT NULL DEFAULT 'ALL_TENANTS',
      frequency "ChargeFrequency" NOT NULL DEFAULT 'MONTHLY',
      "isActive" boolean NOT NULL DEFAULT true,
      "startDate" timestamptz,
      "endDate" timestamptz,
      "createdById" text REFERENCES "${s}".users(id),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS "${s}".activity_logs (
      id text PRIMARY KEY,
      "userId" text NOT NULL REFERENCES "${s}".users(id) ON DELETE CASCADE,
      action text NOT NULL,
      "entityType" text NOT NULL,
      "entityId" text,
      details text,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS "${s}".contact_messages (
      id text PRIMARY KEY,
      name text NOT NULL,
      email text NOT NULL,
      phone text,
      message text NOT NULL,
      status text NOT NULL DEFAULT 'NEW',
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`,
  ]
}

/**
 * Index SQL for tenant schema.
 */
function getTenantIndexSQL(s: string): string[] {
  return [
    `CREATE INDEX IF NOT EXISTS "idx_${s}_users_email" ON "${s}".users(email)`,
    `CREATE INDEX IF NOT EXISTS "idx_${s}_users_companyId" ON "${s}".users("companyId")`,
    `CREATE INDEX IF NOT EXISTS "idx_${s}_properties_companyId" ON "${s}".properties("companyId")`,
    `CREATE INDEX IF NOT EXISTS "idx_${s}_units_propertyId" ON "${s}".units("propertyId")`,
    `CREATE INDEX IF NOT EXISTS "idx_${s}_tenants_userId" ON "${s}".tenants("userId")`,
    `CREATE INDEX IF NOT EXISTS "idx_${s}_tenants_unitId" ON "${s}".tenants("unitId")`,
    `CREATE INDEX IF NOT EXISTS "idx_${s}_payments_tenantId" ON "${s}".payments("tenantId")`,
    `CREATE INDEX IF NOT EXISTS "idx_${s}_payments_status" ON "${s}".payments(status)`,
    `CREATE INDEX IF NOT EXISTS "idx_${s}_monthly_bills_tenantId" ON "${s}".monthly_bills("tenantId")`,
    `CREATE INDEX IF NOT EXISTS "idx_${s}_monthly_bills_status" ON "${s}".monthly_bills(status)`,
    `CREATE INDEX IF NOT EXISTS "idx_${s}_maintenance_propertyId" ON "${s}".maintenance_requests("propertyId")`,
    `CREATE INDEX IF NOT EXISTS "idx_${s}_maintenance_status" ON "${s}".maintenance_requests(status)`,
    `CREATE INDEX IF NOT EXISTS "idx_${s}_leases_tenantId" ON "${s}".lease_agreements("tenantId")`,
    `CREATE INDEX IF NOT EXISTS "idx_${s}_leases_status" ON "${s}".lease_agreements(status)`,
    `CREATE INDEX IF NOT EXISTS "idx_${s}_activity_userId" ON "${s}".activity_logs("userId")`,
  ]
}

// ═══════════════════════════════════════════════════════════
// scripts/migrate-to-tenant.ts
//
// ONE-TIME MIGRATION SCRIPT.
// Moves all existing data from the public schema
// into the tenant_mizpha schema.
//
// Run ONCE after deploying multi-tenancy:
//   npx ts-node scripts/migrate-to-tenant.ts
//
// Safe to run multiple times (uses INSERT ... ON CONFLICT DO NOTHING)
// ═══════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client'
import { masterPrisma } from '../lib/db/prisma-master'
import { provisionTenantSchema } from '../lib/tenant/provision'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
dotenv.config()

const TARGET_SCHEMA = 'tenant_mizpha'
const MIZPHA_SLUG = 'mizpha'

async function main() {
  console.log('\n═══════════════════════════════════════════')
  console.log('  MAKEJA HOMES — MIZPHA MIGRATION SCRIPT')
  console.log('═══════════════════════════════════════════\n')

  const prisma = new PrismaClient()

  try {
    // ── Step 1: Seed subscription plans in master DB ────────
    console.log('📋 Step 1: Seeding subscription plans...')
    await seedPlans()
    console.log('   ✅ Plans seeded\n')

    // ── Step 2: Create Mizpha organization in master DB ─────
    console.log('🏢 Step 2: Creating Mizpha organization in master DB...')
    const org = await createMizphaOrg()
    console.log(`   ✅ Organization created: ${org.id}\n`)

    // ── Step 3: Create tenant_mizpha schema ─────────────────
    console.log('🏗️  Step 3: Creating tenant_mizpha schema...')
    const adminPrisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    })
    await adminPrisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${TARGET_SCHEMA}"`)
    await adminPrisma.$disconnect()
    console.log(`   ✅ Schema created: ${TARGET_SCHEMA}\n`)

    // ── Step 4: Copy all tables to tenant schema ─────────────
    console.log('📦 Step 4: Copying all data to tenant_mizpha...')

    const tables = [
      'companies',
      'users',
      'password_reset_tokens',
      'properties',
      'units',
      'tenants',
      'lease_agreements',
      'monthly_bills',
      'payments',
      'water_readings',
      'garbage_fees',
      'maintenance_requests',
      'expenses',
      'security_deposits',
      'damage_assessments',
      'damage_items',
      'vacate_notices',
      'inventory_items',
      'inventory_movements',
      'purchase_orders',
      'purchase_order_items',
      '"recurringCharges"',
      'activity_logs',
      'contact_messages',
    ]

    const copyPrisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    })

    let totalRows = 0
    for (const table of tables) {
      try {
        const cleanTable = table.replace(/"/g, '')
        // Copy data from public schema to tenant schema
        const result = await copyPrisma.$executeRawUnsafe(`
          INSERT INTO "${TARGET_SCHEMA}".${table}
          SELECT * FROM public.${table}
          ON CONFLICT DO NOTHING
        `)
        console.log(`   ✅ ${cleanTable}: copied`)
        totalRows++
      } catch (err: any) {
        if (err.message?.includes('does not exist')) {
          console.log(`   ⚠️  ${table}: table doesn't exist in public schema, skipping`)
        } else {
          console.error(`   ❌ ${table}: ${err.message}`)
        }
      }
    }

    await copyPrisma.$disconnect()
    console.log(`\n   ✅ Data copy complete (${totalRows} tables)\n`)

    // ── Step 5: Update organization status ──────────────────
    console.log('🔄 Step 5: Updating organization status...')
    await (masterPrisma as any).organizations.update({
      where: { id: org.id },
      data: {
        schemaStatus: 'ACTIVE',
        schemaName: TARGET_SCHEMA,
      },
    })
    console.log('   ✅ Organization marked as ACTIVE\n')

    // ── Step 6: Verify ───────────────────────────────────────
    console.log('🔍 Step 6: Verifying migration...')
    const verifyPrisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL + `&options=--search_path%3D${TARGET_SCHEMA}` } },
    })

    const userCount = await verifyPrisma.$queryRaw<[{count: bigint}]>`
      SELECT COUNT(*) as count FROM users
    `
    const propertyCount = await verifyPrisma.$queryRaw<[{count: bigint}]>`
      SELECT COUNT(*) as count FROM properties
    `
    const unitCount = await verifyPrisma.$queryRaw<[{count: bigint}]>`
      SELECT COUNT(*) as count FROM units
    `
    const tenantCount = await verifyPrisma.$queryRaw<[{count: bigint}]>`
      SELECT COUNT(*) as count FROM tenants
    `

    await verifyPrisma.$disconnect()

    console.log(`   Users:      ${userCount[0].count}`)
    console.log(`   Properties: ${propertyCount[0].count}`)
    console.log(`   Units:      ${unitCount[0].count}`)
    console.log(`   Tenants:    ${tenantCount[0].count}`)

    console.log('\n═══════════════════════════════════════════')
    console.log('  ✅ MIGRATION COMPLETE!')
    console.log('')
    console.log('  Next steps:')
    console.log('  1. Add DEV_TENANT_SLUG=mizpha to .env.local for testing')
    console.log('  2. Add mizpha.makejahomes.co.ke to Vercel domains')
    console.log('  3. Update NEXTAUTH_URL to https://mizpha.makejahomes.co.ke')
    console.log('  4. Test login at mizpha.makejahomes.co.ke')
    console.log('═══════════════════════════════════════════\n')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    await masterPrisma.$disconnect()
  }
}

async function seedPlans() {
  const plans = [
    {
      name: 'Starter',
      slug: 'starter',
      priceKes: 4999,
      maxUnits: 50,
      maxProperties: 3,
      features: ['tenant_portal', 'digital_payments', 'financial_reports', 'email_support'],
    },
    {
      name: 'Pro',
      slug: 'pro',
      priceKes: 9999,
      maxUnits: 200,
      maxProperties: 999999,
      features: ['tenant_portal', 'digital_payments', 'financial_reports', 'advanced_analytics', 'team_accounts', 'custom_reports', 'priority_support', 'api_access'],
    },
    {
      name: 'Enterprise',
      slug: 'enterprise',
      priceKes: 24999,
      maxUnits: 999999,
      maxProperties: 999999,
      features: ['all_pro_features', 'white_labeling', 'custom_integrations', 'dedicated_account_manager', 'sla_guarantee', 'training'],
    },
  ]

  for (const plan of plans) {
    await (masterPrisma as any).subscription_plans.upsert({
      where: { slug: plan.slug },
      create: plan,
      update: plan,
    })
  }
}

async function createMizphaOrg() {
  // Check if already exists
  const existing = await (masterPrisma as any).organizations.findUnique({
    where: { slug: MIZPHA_SLUG },
  })
  if (existing) {
    console.log('   (Mizpha org already exists, using existing)')
    return existing
  }

  const proPlan = await (masterPrisma as any).subscription_plans.findUnique({
    where: { slug: 'pro' },
  })

  if (!proPlan) throw new Error('Pro plan not found — run seedPlans first')

  // Mizpha is the founding client — lifetime free
  return (masterPrisma as any).organizations.create({
    data: {
      name: 'Mizpha Rentals',
      slug: MIZPHA_SLUG,
      email: 'mizpha@makejahomes.co.ke',  // update to real email
      country: 'Kenya',
      planId: proPlan.id,
      subscriptionStatus: 'ACTIVE',       // Founding client — always active
      schemaStatus: 'PROVISIONING',
      adminName: 'Mizpha Admin',
      adminEmail: 'mizpha@makejahomes.co.ke',
      primaryColor: '#E27D60',
    },
  })
}

main()

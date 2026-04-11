import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { getMasterPrisma, buildTenantUrl } from '@/lib/get-prisma'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const RESERVED_SLUGS = ['www', 'app', 'api', 'admin', 'docs', 'status', 'mail', 'makeja']
const VALID_TIERS = ['TRIAL', 'STARTER', 'GROWTH', 'PRO', 'ENTERPRISE'] as const
type Tier = (typeof VALID_TIERS)[number]

const TIER_UNIT_LIMITS: Record<Tier, number> = {
  TRIAL: 50,
  STARTER: 100,
  GROWTH: 250,
  PRO: 500,
  ENTERPRISE: 99999,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function generateTempPassword(length = 12): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  let pass = ''
  for (let i = 0; i < length; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)]
  }
  return pass
}

function nanoid(size = 21): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < size; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

async function verifySuperAdmin(req: NextRequest): Promise<boolean> {
  // Header-based secret for server-to-server / CLI calls
  const headerSecret = req.headers.get('x-super-admin-secret')
  if (headerSecret && (headerSecret === process.env.SUPER_ADMIN_PASSWORD || headerSecret === process.env.SUPER_ADMIN_SECRET)) {
    return true
  }
  // Cookie-based JWT for browser sessions (super-admin dashboard)
  const token = req.cookies.get('super_admin_token')?.value
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    return payload.role === 'super_admin'
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// POST /api/super-admin/provision
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  // --- Auth ---
  if (!(await verifySuperAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    companyName,
    slug,
    adminEmail,
    adminFirstName,
    adminLastName,
    adminPhone,
    tier = 'TRIAL',
  } = body as Record<string, string>

  // --- Validation ---
  const errors: string[] = []

  if (!companyName || typeof companyName !== 'string' || companyName.trim().length < 2) {
    errors.push('companyName is required (min 2 chars)')
  }

  if (!slug || typeof slug !== 'string') {
    errors.push('slug is required')
  } else if (!/^[a-z0-9-]{3,30}$/.test(slug)) {
    errors.push('slug must be 3-30 lowercase alphanumeric characters or hyphens')
  } else if (RESERVED_SLUGS.includes(slug)) {
    errors.push(`slug "${slug}" is reserved`)
  }

  if (!adminEmail || typeof adminEmail !== 'string') {
    errors.push('adminEmail is required')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    errors.push('adminEmail is not a valid email address')
  }

  if (!adminFirstName || typeof adminFirstName !== 'string' || adminFirstName.trim().length < 1) {
    errors.push('adminFirstName is required')
  }

  if (!adminLastName || typeof adminLastName !== 'string' || adminLastName.trim().length < 1) {
    errors.push('adminLastName is required')
  }

  if (!VALID_TIERS.includes(tier as Tier)) {
    errors.push(`tier must be one of: ${VALID_TIERS.join(', ')}`)
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 422 })
  }

  const cleanSlug = slug.toLowerCase().trim()
  const cleanEmail = adminEmail.toLowerCase().trim()
  const safeTier = tier as Tier
  const schemaName = `tenant_${cleanSlug}`

  // --- Check slug uniqueness in public schema ---
  const masterPrisma = getMasterPrisma()

  try {
    const existing = await masterPrisma.companies.findFirst({
      where: { slug: cleanSlug },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json(
        { error: `A company with slug "${cleanSlug}" already exists` },
        { status: 409 }
      )
    }
  } catch (err: any) {
    console.error('[provision] slug check error:', err?.message)
    return NextResponse.json({ error: 'Database error checking slug availability' }, { status: 500 })
  }

  // --- Create the Postgres schema ---
  // We use a dedicated raw PrismaClient against the public schema for DDL
  const ddlUrl = buildTenantUrl('public')
  const ddlPrisma = new PrismaClient({ datasources: { db: { url: ddlUrl } } })

  try {
    await ddlPrisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`)
    console.log(`[provision] schema "${schemaName}" created`)
  } catch (err: any) {
    console.error('[provision] schema creation error:', err?.message)
    return NextResponse.json(
      { error: 'Failed to create tenant schema', details: err?.message },
      { status: 500 }
    )
  } finally {
    await ddlPrisma.$disconnect()
  }

  // --- Push Prisma schema tables into the new schema via db push ---
  // We do this by spawning a child process with DATABASE_URL overridden to
  // point at the new schema.  Using search_path (same pattern as get-prisma.ts).
  const tenantDbUrl = buildTenantUrl(schemaName)
  let schemaPushError: string | null = null

  try {
    const { execSync } = await import('child_process')
    execSync(
      'npx prisma db push --skip-generate --accept-data-loss',
      {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: tenantDbUrl },
        stdio: 'pipe',
        timeout: 60_000,
      }
    )
    console.log(`[provision] prisma db push succeeded for "${schemaName}"`)
  } catch (err: any) {
    // Non-fatal: tables might already exist or the push may partially succeed.
    // We log the error but continue so the company + user records are still created.
    schemaPushError = err?.stderr?.toString() || err?.stdout?.toString() || err?.message || 'Unknown error'
    console.warn(`[provision] prisma db push warning for "${schemaName}":`, schemaPushError)
  }

  // --- Create admin user in TENANT schema ---
  const tempPassword = generateTempPassword()
  const hashedPassword = await bcrypt.hash(tempPassword, 12)
  const adminUserId = nanoid()
  const companyId = nanoid()

  const tenantPrisma = new PrismaClient({ datasources: { db: { url: tenantDbUrl } } })

  let adminUser: { id: string; email: string; firstName: string; lastName: string } | null = null

  try {
    adminUser = await tenantPrisma.users.create({
      data: {
        id: adminUserId,
        email: cleanEmail,
        password: hashedPassword,
        firstName: adminFirstName.trim(),
        lastName: adminLastName.trim(),
        phoneNumber: adminPhone || null,
        role: 'ADMIN',
        isActive: true,
        mustChangePassword: true,
        companyId,
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    })
    console.log(`[provision] admin user created in "${schemaName}": ${cleanEmail}`)
  } catch (err: any) {
    console.error('[provision] admin user creation error:', err?.message)
    return NextResponse.json(
      { error: 'Failed to create admin user in tenant schema', details: err?.message },
      { status: 500 }
    )
  } finally {
    await tenantPrisma.$disconnect()
  }

  // --- Create company record in PUBLIC schema ---
  const now = new Date()
  const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) // +14 days

  let company: Record<string, unknown> | null = null

  try {
    company = await masterPrisma.companies.create({
      data: {
        id: companyId,
        name: companyName.trim(),
        email: cleanEmail,
        slug: cleanSlug,
        subscriptionTier: safeTier,
        subscriptionStatus: safeTier === 'TRIAL' ? 'TRIAL' : 'ACTIVE',
        trialEndsAt: safeTier === 'TRIAL' ? trialEndsAt : null,
        unitLimit: TIER_UNIT_LIMITS[safeTier],
        billingEmail: cleanEmail,
        provisionedAt: now,
        adminUserId,
        isActive: true,
      },
    })
    console.log(`[provision] company record created in public schema: ${companyId}`)
  } catch (err: any) {
    console.error('[provision] company record creation error:', err?.message)
    // Schema + user exist but company record failed — return partial success with details
    return NextResponse.json(
      {
        error: 'Tenant schema and admin user were created but the public company record failed',
        details: err?.message,
        schema: schemaName,
        adminUser: { id: adminUserId, email: cleanEmail, tempPassword },
      },
      { status: 500 }
    )
  }

  // --- Success ---
  return NextResponse.json(
    {
      success: true,
      message: `Tenant "${cleanSlug}" provisioned successfully`,
      schema: schemaName,
      company: {
        id: companyId,
        name: companyName.trim(),
        slug: cleanSlug,
        email: cleanEmail,
        subscriptionTier: safeTier,
        subscriptionStatus: company.subscriptionStatus,
        trialEndsAt: safeTier === 'TRIAL' ? trialEndsAt.toISOString() : null,
        unitLimit: TIER_UNIT_LIMITS[safeTier],
        provisionedAt: now.toISOString(),
      },
      adminUser: {
        id: adminUserId,
        email: cleanEmail,
        firstName: adminFirstName.trim(),
        lastName: adminLastName.trim(),
        tempPassword,
      },
      ...(schemaPushError ? { schemaPushWarning: schemaPushError } : {}),
    },
    { status: 201 }
  )
}

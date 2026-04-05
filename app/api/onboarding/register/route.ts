import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { getMasterPrisma, buildTenantUrl } from '@/lib/get-prisma'
import { resend, EMAIL_CONFIG } from '@/lib/resend'
import { limiters } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const RESERVED_SLUGS = new Set([
  'www', 'app', 'api', 'docs', 'status', 'mail',
  'admin', 'demo', 'test', 'staging', 'makeja',
  'billing', 'support', 'help', 'login', 'signup',
])

const PLAN_LIMITS: Record<string, number> = {
  starter: 20,
  growth: 100,
  pro: 500,
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = limiters.onboarding(ip)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  try {
    const body = await request.json()
    const {
      companyName,
      subdomain,
      adminFirstName,
      adminLastName,
      adminName,  // fallback if name not split
      email,
      phone,
      city,
      password,
      plan,
    } = body

    // --- Validation ---
    if (!companyName?.trim() || !subdomain || !email || !password || !plan) {
      return NextResponse.json(
        { error: 'Company name, subdomain, email, password and plan are required.' },
        { status: 400 }
      )
    }

    if (plan === 'enterprise') {
      return NextResponse.json(
        { error: 'Enterprise accounts require a custom setup. Please use the enterprise contact form.' },
        { status: 400 }
      )
    }

    if (!PLAN_LIMITS[plan]) {
      return NextResponse.json({ error: 'Invalid plan selected.' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    const slug = subdomain.toLowerCase().trim()
    const slugRegex = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$|^[a-z0-9]{3}$/
    if (!slugRegex.test(slug) || RESERVED_SLUGS.has(slug)) {
      return NextResponse.json({ error: 'Invalid or reserved subdomain.' }, { status: 400 })
    }

    // --- Resolve names ---
    let firstName = (adminFirstName || '').trim()
    let lastName = (adminLastName || '').trim()
    if (!firstName && adminName) {
      const parts = adminName.trim().split(/\s+/)
      firstName = parts[0]
      lastName = parts.slice(1).join(' ')
    }
    if (!firstName) {
      return NextResponse.json({ error: 'Admin first name is required.' }, { status: 400 })
    }

    const master = getMasterPrisma()

    // --- Check uniqueness ---
    const [existingSlug, existingEmail] = await Promise.all([
      master.companies.findFirst({ where: { slug }, select: { id: true } }),
      master.companies.findFirst({ where: { email: email.toLowerCase().trim() }, select: { id: true } }),
    ])

    if (existingSlug) {
      return NextResponse.json({ error: 'This subdomain is already taken.' }, { status: 409 })
    }
    if (existingEmail) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }

    // --- Hash password ---
    const hashedPassword = await bcrypt.hash(password, 12)

    // --- Generate IDs ---
    const rand = () => Math.random().toString(36).slice(2, 8)
    const companyId = `company_${Date.now()}_${rand()}`
    const userId = `user_${Date.now()}_${rand()}`
    const schemaName = `tenant_${slug}`

    // --- Provision the Neon schema via raw SQL ---
    // execSync / child_process is unavailable in Vercel serverless. We create all
    // tables directly with raw SQL so no shell access is required.
    const tenantUrl = buildTenantUrl(schemaName)
    const tenantPrisma = new PrismaClient({ datasources: { db: { url: tenantUrl } } })

    try {
      const s = schemaName // shorthand for interpolation

      // 1. Create schema
      await tenantPrisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${s}"`)

      // 2. Enums (CREATE TYPE IF NOT EXISTS requires PG 9.1+; use DO block to be safe)
      const enumDefs: [string, string[]][] = [
        ['Role', ['ADMIN','MANAGER','CARETAKER','STOREKEEPER','TENANT']],
        ['UnitStatus', ['VACANT','OCCUPIED','MAINTENANCE','RESERVED']],
        ['UnitType', ['STUDIO','ONE_BEDROOM','TWO_BEDROOM','THREE_BEDROOM','PENTHOUSE','SHOP','OFFICE','WAREHOUSE','STAFF_QUARTERS']],
        ['LeaseStatus', ['DRAFT','ACTIVE','EXPIRED','TERMINATED','CANCELLED','PENDING']],
        ['MaintenanceStatus', ['PENDING','ASSIGNED','IN_PROGRESS','AWAITING_PARTS','COMPLETED','CLOSED','CANCELLED']],
        ['NoticeStatus', ['PENDING','APPROVED','ASSESSMENT_SCHEDULED','ASSESSMENT_COMPLETE','COMPLETED','CANCELLED']],
        ['PaymentMethod', ['CASH','BANK_TRANSFER','M_PESA','PAYSTACK','CHEQUE','OTHER','MOBILE_MONEY']],
        ['PaymentStatus', ['PENDING','COMPLETED','FAILED','REFUNDED','CANCELLED','REVERSED','VERIFIED','REJECTED','AWAITING_VERIFICATION']],
        ['PaymentType', ['RENT','DEPOSIT','UTILITY','MAINTENANCE','LATE_FEE','OTHER']],
        ['Priority', ['LOW','MEDIUM','HIGH','URGENT']],
        ['AppliesTo', ['ALL_UNITS','SPECIFIC_UNITS','UNIT_TYPES']],
        ['AssessmentStatus', ['PENDING','IN_PROGRESS','COMPLETED','APPROVED']],
        ['ChargeFrequency', ['MONTHLY','QUARTERLY','SEMI_ANNUALLY','ANNUALLY','ONE_TIME']],
        ['DepositStatus', ['HELD','ASSESSED','REFUNDED','FORFEITED']],
        ['VerificationStatus', ['PENDING','APPROVED','DECLINED']],
      ]

      for (const [name, values] of enumDefs) {
        const valList = values.map(v => `'${v}'`).join(', ')
        await tenantPrisma.$executeRawUnsafe(`
          DO $$ BEGIN
            CREATE TYPE "${s}"."${name}" AS ENUM (${valList});
          EXCEPTION WHEN duplicate_object THEN NULL;
          END $$;
        `)
      }

      // 3. Core tables
      await tenantPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${s}"."users" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "email" TEXT NOT NULL UNIQUE,
          "password" TEXT NOT NULL,
          "firstName" TEXT NOT NULL,
          "lastName" TEXT NOT NULL,
          "phoneNumber" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "emailVerified" TIMESTAMP,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "role" "${s}"."Role" NOT NULL DEFAULT 'TENANT',
          "lastLoginAt" TIMESTAMP,
          "idNumber" TEXT UNIQUE,
          "companyId" TEXT,
          "mustChangePassword" BOOLEAN NOT NULL DEFAULT false
        )
      `)

      await tenantPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${s}"."properties" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "address" TEXT NOT NULL,
          "city" TEXT NOT NULL DEFAULT '',
          "county" TEXT,
          "type" TEXT NOT NULL DEFAULT 'APARTMENT',
          "description" TEXT,
          "totalUnits" INTEGER NOT NULL DEFAULT 0,
          "amenities" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "managerId" TEXT,
          "caretakerId" TEXT,
          "storekeeperCreatedById" TEXT,
          "storekeeperIdTousers" TEXT,
          "createdById" TEXT
        )
      `)

      await tenantPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${s}"."units" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "unitNumber" TEXT NOT NULL,
          "propertyId" TEXT NOT NULL REFERENCES "${s}"."properties"("id") ON DELETE CASCADE,
          "floor" INTEGER,
          "type" "${s}"."UnitType" NOT NULL DEFAULT 'ONE_BEDROOM',
          "bedrooms" INTEGER NOT NULL DEFAULT 1,
          "bathrooms" INTEGER NOT NULL DEFAULT 1,
          "size" DOUBLE PRECISION,
          "rentAmount" DOUBLE PRECISION NOT NULL,
          "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "status" "${s}"."UnitStatus" NOT NULL DEFAULT 'VACANT',
          "features" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `)

      await tenantPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${s}"."tenants" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL UNIQUE REFERENCES "${s}"."users"("id") ON DELETE CASCADE,
          "unitId" TEXT REFERENCES "${s}"."units"("id"),
          "leaseStartDate" TIMESTAMP,
          "leaseEndDate" TIMESTAMP,
          "depositPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "depositStatus" "${s}"."DepositStatus" NOT NULL DEFAULT 'HELD',
          "emergencyContact" TEXT,
          "emergencyPhone" TEXT,
          "notes" TEXT,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `)

      await tenantPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${s}"."lease_agreements" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "tenantId" TEXT NOT NULL REFERENCES "${s}"."tenants"("id") ON DELETE CASCADE,
          "unitId" TEXT NOT NULL REFERENCES "${s}"."units"("id"),
          "status" "${s}"."LeaseStatus" NOT NULL DEFAULT 'PENDING',
          "startDate" TIMESTAMP NOT NULL,
          "endDate" TIMESTAMP NOT NULL,
          "rentAmount" DOUBLE PRECISION NOT NULL,
          "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "terms" TEXT,
          "contractTerms" TEXT,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `)

      await tenantPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${s}"."payments" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "tenantId" TEXT NOT NULL REFERENCES "${s}"."tenants"("id") ON DELETE CASCADE,
          "leaseId" TEXT REFERENCES "${s}"."lease_agreements"("id"),
          "unitId" TEXT REFERENCES "${s}"."units"("id"),
          "amount" DOUBLE PRECISION NOT NULL,
          "type" "${s}"."PaymentType" NOT NULL DEFAULT 'RENT',
          "method" "${s}"."PaymentMethod" NOT NULL DEFAULT 'CASH',
          "status" "${s}"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
          "reference" TEXT,
          "mpesaCode" TEXT,
          "notes" TEXT,
          "paidAt" TIMESTAMP,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "createdById" TEXT REFERENCES "${s}"."users"("id"),
          "verifiedById" TEXT REFERENCES "${s}"."users"("id"),
          "verifiedAt" TIMESTAMP,
          "verificationStatus" "${s}"."VerificationStatus" NOT NULL DEFAULT 'PENDING',
          "receiptNumber" TEXT
        )
      `)

      await tenantPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${s}"."maintenance_requests" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "unitId" TEXT NOT NULL REFERENCES "${s}"."units"("id"),
          "title" TEXT NOT NULL,
          "description" TEXT,
          "category" TEXT NOT NULL DEFAULT 'GENERAL',
          "priority" "${s}"."Priority" NOT NULL DEFAULT 'MEDIUM',
          "status" "${s}"."MaintenanceStatus" NOT NULL DEFAULT 'PENDING',
          "assignedToId" TEXT REFERENCES "${s}"."users"("id"),
          "createdById" TEXT REFERENCES "${s}"."users"("id"),
          "completedAt" TIMESTAMP,
          "notes" TEXT,
          "cost" DOUBLE PRECISION,
          "images" TEXT,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `)

      await tenantPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${s}"."vacate_notices" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "tenantId" TEXT NOT NULL REFERENCES "${s}"."tenants"("id") ON DELETE CASCADE,
          "unitId" TEXT NOT NULL REFERENCES "${s}"."units"("id"),
          "expectedVacateDate" TIMESTAMP NOT NULL,
          "reason" TEXT,
          "status" "${s}"."NoticeStatus" NOT NULL DEFAULT 'PENDING',
          "notes" TEXT,
          "createdById" TEXT REFERENCES "${s}"."users"("id"),
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `)

      await tenantPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${s}"."activity_logs" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT REFERENCES "${s}"."users"("id"),
          "action" TEXT NOT NULL,
          "entityType" TEXT,
          "entityId" TEXT,
          "details" JSONB,
          "ipAddress" TEXT,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `)

      await tenantPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${s}"."password_reset_tokens" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL REFERENCES "${s}"."users"("id") ON DELETE CASCADE,
          "token" TEXT NOT NULL UNIQUE,
          "expiresAt" TIMESTAMP NOT NULL,
          "used" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `)

      await tenantPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${s}"."inventory_items" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "quantity" INTEGER NOT NULL DEFAULT 0,
          "unit" TEXT,
          "unitCost" DOUBLE PRECISION,
          "supplier" TEXT,
          "reorderLevel" INTEGER,
          "category" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `)

      await tenantPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${s}"."damage_assessments" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "vacateNoticeId" TEXT REFERENCES "${s}"."vacate_notices"("id"),
          "unitId" TEXT NOT NULL REFERENCES "${s}"."units"("id"),
          "assessedById" TEXT REFERENCES "${s}"."users"("id"),
          "status" "${s}"."AssessmentStatus" NOT NULL DEFAULT 'PENDING',
          "notes" TEXT,
          "totalDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "images" TEXT,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `)

      await tenantPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${s}"."water_readings" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "unitId" TEXT NOT NULL REFERENCES "${s}"."units"("id"),
          "previousReading" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "currentReading" DOUBLE PRECISION NOT NULL,
          "unitsUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "ratePerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "readingDate" TIMESTAMP NOT NULL,
          "billingMonth" TEXT,
          "isPaid" BOOLEAN NOT NULL DEFAULT false,
          "notes" TEXT,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `)

      console.log(`✅ [PROVISION] Schema ${schemaName} created with all tables`)
    } catch (provisionErr: any) {
      console.error(`❌ [PROVISION] Failed to provision schema ${schemaName}:`, provisionErr?.message)
      await tenantPrisma.$disconnect()
      return NextResponse.json(
        { error: 'Failed to provision your account. Please contact support@makejahomes.co.ke' },
        { status: 500 }
      )
    }

    // --- Create admin user in tenant schema via raw SQL ---
    // Using raw SQL avoids Prisma enum casting issues when the enum types live
    // in a non-public schema that the generated client wasn't built against.
    try {
      // Use text literal for the enum value — search_path resolves "Role" type
      await tenantPrisma.$executeRawUnsafe(`
        INSERT INTO "${schemaName}"."users"
          ("id", "email", "password", "firstName", "lastName", "phoneNumber",
           "role", "isActive", "mustChangePassword", "createdAt", "updatedAt")
        VALUES
          ($1, $2, $3, $4, $5, $6,
           'ADMIN'::"${schemaName}"."Role", true, false, NOW(), NOW())
      `, userId, email.toLowerCase().trim(), hashedPassword,
         firstName, lastName, phone || null)
      console.log(`✅ [PROVISION] Admin user created in ${schemaName}`)
    } catch (userErr: any) {
      console.error(`❌ [PROVISION] Failed to create admin user:`, userErr?.message)
      await tenantPrisma.$disconnect()
      return NextResponse.json(
        { error: 'Account provisioned but failed to create admin user. Contact support.', detail: userErr?.message },
        { status: 500 }
      )
    } finally {
      await tenantPrisma.$disconnect()
    }

    // --- Create company record in master (public) schema ---
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

    const company = await master.companies.create({
      data: {
        id: companyId,
        name: companyName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone || null,
        city: city || null,
        country: 'Kenya',
        slug,
        isActive: true,
        subscriptionTier: plan.toUpperCase(),
        subscriptionStatus: 'TRIAL',
        trialEndsAt,
        unitLimit: PLAN_LIMITS[plan],
        billingEmail: email.toLowerCase().trim(),
        provisionedAt: new Date(),
        adminUserId: userId,
      },
    })

    // --- Send welcome email ---
    const dashboardUrl = `https://${slug}.makejahomes.co.ke/auth/login`
    const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1)
    try {
      await resend.emails.send({
        from: EMAIL_CONFIG.from,
        replyTo: EMAIL_CONFIG.replyTo,
        to: email,
        subject: `🎉 Welcome to Makeja Homes — Your account is ready!`,
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#ffffff;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="display:inline-block;background:linear-gradient(135deg,#a855f7,#ec4899);border-radius:10px;padding:12px 20px;">
      <span style="color:white;font-size:20px;font-weight:bold;">🏠 Makeja Homes</span>
    </div>
  </div>
  <div style="background:linear-gradient(135deg,rgba(168,85,247,0.15),rgba(0,0,0,0.5));border:1px solid rgba(168,85,247,0.3);border-radius:16px;padding:40px;text-align:center;margin-bottom:28px;">
    <div style="font-size:48px;margin-bottom:12px;">🎉</div>
    <h1 style="margin:0 0 10px;font-size:26px;font-weight:700;color:#e9d5ff;">Welcome, ${firstName}!</h1>
    <p style="margin:0;color:#9ca3af;font-size:16px;">Your <strong style="color:#c084fc;">${companyName}</strong> account is live.</p>
  </div>
  <div style="background:#111;border:1px solid rgba(168,85,247,0.2);border-radius:12px;padding:24px;margin-bottom:24px;">
    <h2 style="margin:0 0 16px;font-size:16px;font-weight:600;color:#e5e7eb;">Account Details</h2>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:8px 0;color:#9ca3af;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.05);">Your Dashboard</td><td style="padding:8px 0;font-size:14px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.05);color:#a78bfa;">${slug}.makejahomes.co.ke</td></tr>
      <tr><td style="padding:8px 0;color:#9ca3af;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.05);">Login Email</td><td style="padding:8px 0;font-size:14px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.05);">${email}</td></tr>
      <tr><td style="padding:8px 0;color:#9ca3af;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.05);">Plan</td><td style="padding:8px 0;font-size:14px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.05);">${planLabel}</td></tr>
      <tr><td style="padding:8px 0;color:#9ca3af;font-size:14px;">Free Trial Until</td><td style="padding:8px 0;font-size:14px;text-align:right;color:#34d399;">${trialEndsAt.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
    </table>
  </div>
  <div style="text-align:center;margin-bottom:28px;">
    <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(to right,#a855f7,#ec4899);color:white;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:16px;font-weight:600;">Login to Your Dashboard →</a>
  </div>
  <div style="background:#111;border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:20px;margin-bottom:24px;">
    <h3 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#e5e7eb;">🚀 Get Started in 3 Steps</h3>
    <p style="margin:6px 0;color:#9ca3af;font-size:14px;">1. Add your first property</p>
    <p style="margin:6px 0;color:#9ca3af;font-size:14px;">2. Create your units</p>
    <p style="margin:6px 0;color:#9ca3af;font-size:14px;">3. Onboard your tenants</p>
  </div>
  <div style="text-align:center;color:#4b5563;font-size:13px;border-top:1px solid rgba(255,255,255,0.05);padding-top:20px;">
    <p style="margin:0;">Questions? <a href="mailto:support@makejahomes.co.ke" style="color:#a855f7;">support@makejahomes.co.ke</a></p>
  </div>
</div></body></html>`,
      })
    } catch (emailErr) {
      console.error('[ONBOARDING] Welcome email failed:', emailErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully! Check your email.',
      company: {
        id: company.id,
        name: company.name,
        slug,
        dashboardUrl,
        trialEndsAt,
        plan: planLabel,
      },
    }, { status: 201 })

  } catch (error: any) {
    console.error('[ONBOARDING REGISTER] Error:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'An account with this email or subdomain already exists.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }
}

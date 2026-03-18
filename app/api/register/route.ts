// ═══════════════════════════════════════════════════════════
// app/api/register/route.ts
//
// Public signup endpoint.
// Creates the organization and provisions the tenant schema.
// The "Get Started" button on the marketing site hits this.
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { masterPrisma } from '@/lib/db/prisma-master'
import { provisionTenantSchema } from '@/lib/tenant/provision'
import { sendWelcomeEmail } from '@/lib/email/welcome'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      companyName,
      adminName,
      email,
      password,
      phone,
      country = 'Kenya',
      planSlug = 'starter',
    } = body

    // ── Validate input ───────────────────────────────────────
    if (!companyName || !adminName || !email || !password) {
      return NextResponse.json(
        { error: 'Company name, your name, email, and password are required.' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      )
    }

    // ── Check if email already registered ───────────────────
    const existing = await (masterPrisma as any).organizations.findUnique({
      where: { email: email.toLowerCase().trim() },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      )
    }

    // ── Generate unique slug ─────────────────────────────────
    const slug = await generateUniqueSlug(companyName)

    // ── Get plan ─────────────────────────────────────────────
    const plan = await (masterPrisma as any).subscription_plans.findUnique({
      where: { slug: planSlug },
    })
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid plan selected.' },
        { status: 400 }
      )
    }

    // ── Hash password ────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, 12)

    // ── Create organization record ───────────────────────────
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14) // 14-day trial

    const org = await (masterPrisma as any).organizations.create({
      data: {
        name: companyName.trim(),
        slug,
        email: email.toLowerCase().trim(),
        phone: phone || null,
        country,
        planId: plan.id,
        subscriptionStatus: 'TRIAL',
        trialEndsAt,
        schemaStatus: 'PROVISIONING',
        adminName: adminName.trim(),
        adminEmail: email.toLowerCase().trim(),
      },
    })

    // ── Provision tenant schema ───────────────────────────────
    // This creates the schema and all tables.
    // Runs synchronously — takes ~2-3 seconds.
    const provision = await provisionTenantSchema({
      organizationId: org.id,
      slug,
      adminName: adminName.trim(),
      adminEmail: email.toLowerCase().trim(),
      adminPasswordHash: passwordHash,
      companyName: companyName.trim(),
      phone: phone || undefined,
      country,
    })

    if (!provision.success) {
      // Return error but don't delete the org —
      // admin can retry provisioning from super admin panel
      return NextResponse.json(
        { error: 'Account created but setup failed. Our team has been notified.' },
        { status: 500 }
      )
    }

    // ── Log billing event (trial start) ──────────────────────
    await (masterPrisma as any).master_audit_logs.create({
      data: {
        organizationId: org.id,
        action: 'TRIAL_STARTED',
        actor: 'SYSTEM',
        details: {
          plan: plan.name,
          trialEndsAt: trialEndsAt.toISOString(),
        },
      },
    })

    // ── Send welcome email ────────────────────────────────────
    try {
      await sendWelcomeEmail({
        to: email,
        name: adminName,
        companyName,
        slug,
        dashboardUrl: `https://${slug}.makejahomes.co.ke/auth/login`,
        trialEndsAt,
      })
    } catch (emailErr) {
      console.error('[REGISTER] Welcome email failed:', emailErr)
      // Don't fail registration if email fails
    }

    // ── Return success ────────────────────────────────────────
    return NextResponse.json({
      success: true,
      organization: {
        id: org.id,
        name: org.name,
        slug,
        dashboardUrl: `https://${slug}.makejahomes.co.ke`,
        trialEndsAt: trialEndsAt.toISOString(),
      },
    }, { status: 201 })

  } catch (error: any) {
    console.error('[REGISTER] Error:', error)
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}

/**
 * Generate a URL-safe slug from company name.
 * Ensures uniqueness by appending a number if needed.
 * e.g. "Mizpha Rentals" → "mizpha-rentals"
 *      "Mizpha Rentals (duplicate)" → "mizpha-rentals-2"
 */
async function generateUniqueSlug(companyName: string): Promise<string> {
  const base = companyName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')   // remove special chars
    .replace(/\s+/g, '-')             // spaces to hyphens
    .replace(/-+/g, '-')              // collapse multiple hyphens
    .replace(/^-|-$/g, '')            // trim leading/trailing hyphens
    .slice(0, 40)                     // max 40 chars

  // Check if base slug is available
  const existing = await (masterPrisma as any).organizations.findUnique({
    where: { slug: base },
  })
  if (!existing) return base

  // Try with number suffix
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}-${i}`
    const exists = await (masterPrisma as any).organizations.findUnique({
      where: { slug: candidate },
    })
    if (!exists) return candidate
  }

  // Fallback: append timestamp
  return `${base}-${Date.now()}`
}

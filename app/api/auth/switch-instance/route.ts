import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { limiters } from "@/lib/rate-limit";
import { revokeToken } from "@/lib/token-blocklist";

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

function getTenantPrisma(schema: string) {
  const base = (process.env.DIRECT_DATABASE_URL || process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL || '')
    .replace('-pooler.', '.')
    .replace(/[?&]schema=[^&]*/g, '')
    .replace(/[?&]options=[^&]*/g, '')
  const sep = base.includes('?') ? '&' : '?'
  return new PrismaClient({
    datasources: { db: { url: `${base}${sep}options=--search_path%3D${schema}` } },
    log: ['error'],
  })
}

function getMasterPrisma() {
  const url = (process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL || '')
    .replace('-pooler.', '.')
  return new PrismaClient({ datasources: { db: { url } }, log: ['error'] })
}

/**
 * POST /api/auth/switch-instance
 * Body: { targetSlug: string }
 *
 * The caller must already have a valid session token (any instance).
 * This endpoint:
 *   1. Verifies the current JWT is valid
 *   2. Looks up the same email in the target tenant schema
 *   3. Confirms the user is active in that schema
 *   4. Issues a new JWT scoped to the target schema
 *   5. Sets the new token cookie — browser is now in the new instance
 *
 * No password re-entry needed: the existing valid JWT is proof of identity.
 * The email in the JWT is the bridge between instances.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  const rl = await limiters.auth(ip)
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  try {
    // 1. Validate current token
    const token = request.cookies.get("token")?.value
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const { payload } = await jwtVerify(token, JWT_SECRET)
    const currentEmail = payload.email as string
    const currentSlug = payload.tenantSlug as string
    // Revoke the current token so it can't be replayed after switching
    if (payload.jti) await revokeToken(payload.jti as string)

    const body = await request.json()
    const { targetSlug, password } = body
    if (!targetSlug || typeof targetSlug !== 'string') {
      return NextResponse.json({ error: "targetSlug is required" }, { status: 400 })
    }
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: "Password for the target account is required" }, { status: 400 })
    }

    const normalizedTarget = targetSlug.trim().toLowerCase()

    if (normalizedTarget === currentSlug) {
      return NextResponse.json({ error: "Already in this instance" }, { status: 400 })
    }

    const targetSchema = `tenant_${normalizedTarget}`
    const prisma = getTenantPrisma(targetSchema)

    let targetUser: any
    try {
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, email, password, role::text as role, "firstName", "lastName", "companyId", "isActive", "mustChangePassword"
         FROM users WHERE email = $1 LIMIT 1`,
        currentEmail
      )
      targetUser = rows[0] ?? null
    } finally {
      await prisma.$disconnect()
    }

    if (!targetUser) {
      return NextResponse.json({
        error: "Your account does not exist in this company instance."
      }, { status: 403 })
    }

    if (!targetUser.isActive) {
      return NextResponse.json({
        error: "Your account is deactivated in this company instance."
      }, { status: 403 })
    }

    // Verify the password for the target instance — each instance is an independent
    // security boundary and may have a different password
    const passwordValid = await bcrypt.compare(password, targetUser.password)
    if (!passwordValid) {
      return NextResponse.json({
        error: "Incorrect password for this account."
      }, { status: 401 })
    }

    // 2. Look up the company name for the response
    const master = getMasterPrisma()
    let companyName = normalizedTarget
    try {
      const rows = await master.$queryRawUnsafe<any[]>(
        `SELECT name FROM companies WHERE slug = $1 LIMIT 1`, normalizedTarget
      )
      if (rows[0]?.name) companyName = rows[0].name
    } finally {
      await master.$disconnect()
    }

    // 3. Update last login (best-effort)
    const updatePrisma = getTenantPrisma(targetSchema)
    try {
      await updatePrisma.$executeRawUnsafe(
        `UPDATE users SET "lastLoginAt" = NOW() WHERE id = $1`, targetUser.id
      )
    } catch {} finally {
      await updatePrisma.$disconnect()
    }

    // 4. Issue new JWT for the target instance
    const newToken = await new SignJWT({
      id: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      companyId: targetUser.companyId,
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      tenantSlug: normalizedTarget,
      mustChangePassword: targetUser.mustChangePassword ?? false,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setJti(crypto.randomUUID())
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(JWT_SECRET)

    const roleRoutes: Record<string, string> = {
      ADMIN: "/dashboard/admin",
      MANAGER: "/dashboard/manager",
      CARETAKER: "/dashboard/caretaker",
      STOREKEEPER: "/dashboard/storekeeper",
      TECHNICAL: "/dashboard/technical",
      TENANT: "/dashboard/tenant",
    }

    const response = NextResponse.json({
      success: true,
      companyName,
      role: targetUser.role,
      redirectTo: roleRoutes[targetUser.role] ?? "/dashboard/admin",
      mustChangePassword: targetUser.mustChangePassword ?? false,
    })

    response.cookies.set("token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400,
      path: "/",
    })

    return response
  } catch (error: any) {
    console.error("[SWITCH-INSTANCE] Error:", error?.message)
    return NextResponse.json({ error: "Failed to switch instance" }, { status: 500 })
  }
}

/**
 * GET /api/auth/switch-instance
 * Returns all instances the currently logged-in user's email belongs to
 * (used to populate the switch-instance dropdown)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const { payload } = await jwtVerify(token, JWT_SECRET)
    const currentEmail = payload.email as string
    const currentSlug = payload.tenantSlug as string

    const master = getMasterPrisma()
    let schemas: string[]
    try {
      const rows = await master.$queryRaw<{ schema_name: string }[]>`
        SELECT schema_name FROM information_schema.schemata
        WHERE schema_name LIKE 'tenant_%' ORDER BY schema_name
      `
      schemas = rows.map(r => r.schema_name)
    } finally {
      await master.$disconnect()
    }

    const instances: {
      tenantSlug: string
      companyName: string
      role: string
      isCurrent: boolean
    }[] = []

    for (const schema of schemas) {
      const slug = schema.replace(/^tenant_/, '')
      const prisma = getTenantPrisma(schema)
      try {
        const rows = await prisma.$queryRawUnsafe<any[]>(
          `SELECT role::text as role, "isActive" FROM users WHERE email = $1 LIMIT 1`,
          currentEmail
        )
        if (!rows.length || !rows[0].isActive) continue

        const master2 = getMasterPrisma()
        let companyName = slug
        try {
          const comp = await master2.$queryRawUnsafe<any[]>(
            `SELECT name FROM companies WHERE slug = $1 LIMIT 1`, slug
          )
          if (comp[0]?.name) companyName = comp[0].name
        } finally {
          await master2.$disconnect()
        }

        instances.push({
          tenantSlug: slug,
          companyName,
          role: rows[0].role,
          isCurrent: slug === currentSlug,
        })
      } catch {} finally {
        await prisma.$disconnect()
      }
    }

    return NextResponse.json({ instances, currentSlug })
  } catch (error: any) {
    console.error("[SWITCH-INSTANCE] GET error:", error?.message)
    return NextResponse.json({ error: "Failed to fetch instances" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { SignJWT } from "jose"
import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"
import { limiters } from "@/lib/rate-limit"

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

function getMasterPrisma() {
  const rawUrl = process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL || ''
  const masterUrl = rawUrl
    .replace('-pooler.', '.')
    .replace(/[?&]options=[^&]*/g, '')
    .replace(/[?&]schema=[^&]*/g, '')
  return new PrismaClient({ datasources: { db: { url: masterUrl } } })
}

async function findUserAcrossAllTenants(email: string): Promise<{ user: any; schema: string } | null> {
  const master = getMasterPrisma()
  try {
    // Get all tenant schemas
    const schemas = await master.$queryRaw<{ schema_name: string }[]>`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name LIKE 'tenant_%'
      ORDER BY schema_name
    `
    console.log(`[LOGIN] Searching ${schemas.length} schemas for ${email}: ${schemas.map(s => s.schema_name).join(', ')}`)

    // Search each schema using a single connection via set_config
    for (const { schema_name } of schemas) {
      try {
        await master.$executeRawUnsafe(`SET search_path TO "${schema_name}", public`)
        const rows = await master.$queryRaw<any[]>`
          SELECT id, email, password, role, "companyId", "firstName", "lastName", "isActive", "lastLoginAt"
          FROM users
          WHERE email = ${email}
          LIMIT 1
        `
        if (rows.length > 0) {
          console.log(`[LOGIN] Found user in ${schema_name}`)
          return { user: rows[0], schema: schema_name }
        }
      } catch (e: any) {
        console.error(`[LOGIN] Error searching ${schema_name}:`, e.message?.slice(0, 120))
      }
    }
    console.log(`[LOGIN] User not found in any schema`)
    return null
  } finally {
    await master.$disconnect()
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  const rl = limiters.auth(ip)
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const result = await findUserAcrossAllTenants(normalizedEmail)

    if (!result) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const { user: foundUser, schema: foundSchema } = result

    const isValidPassword = await bcrypt.compare(password, foundUser.password)
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    if (!foundUser.isActive) {
      return NextResponse.json({ error: "Your account has been deactivated. Please contact your administrator." }, { status: 403 })
    }

    // Extract slug from schema name (tenant_mizpha -> mizpha)
    const tenantSlug = foundSchema.replace(/^tenant_/, '')

    // Update last login (best-effort)
    const master2 = getMasterPrisma()
    try {
      await master2.$executeRawUnsafe(`SET search_path TO "${foundSchema}", public`)
      await master2.$executeRaw`UPDATE users SET "lastLoginAt" = NOW() WHERE id = ${foundUser.id}`
    } catch { /* non-critical */ } finally {
      await master2.$disconnect()
    }

    const token = await new SignJWT({
      id: foundUser.id,
      email: foundUser.email,
      role: foundUser.role,
      companyId: foundUser.companyId,
      firstName: foundUser.firstName,
      lastName: foundUser.lastName,
      tenantSlug,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(JWT_SECRET)

    const response = NextResponse.json({
      success: true,
      user: {
        id: foundUser.id,
        email: foundUser.email,
        firstName: foundUser.firstName,
        lastName: foundUser.lastName,
        role: foundUser.role,
        tenantSlug,
      },
    })

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 86400,
      path: "/",
    })

    return response

  } catch (error: any) {
    console.error("LOGIN ERROR:", error?.message)
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 })
  }
}

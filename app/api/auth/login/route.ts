import { NextRequest, NextResponse } from "next/server"
import { SignJWT } from "jose"
import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"
import { limiters } from "@/lib/rate-limit"

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

function getTenantPrisma(schema: string) {
  const base = (process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || '')
    .replace('-pooler.', '.')
    .replace(/[?&]schema=[^&]*/g, '')
    .replace(/[?&]options=[^&]*/g, '')
  const sep = base.includes('?') ? '&' : '?'
  return new PrismaClient({ datasources: { db: { url: `${base}${sep}options=--search_path%3D${schema}` } } })
}

async function getAllTenantSchemasFromMaster(): Promise<string[]> {
  // Use direct (non-pooler) URL for schema listing; strip any search_path options
  const rawUrl = process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL || ''
  const masterUrl = rawUrl
    .replace('-pooler.', '.')
    .replace(/[?&]options=[^&]*/g, '')
    .replace(/[?&]schema=[^&]*/g, '')
  console.log(`[LOGIN] Listing schemas from: ${masterUrl.slice(0, 60)}...`)
  const master = new PrismaClient({ datasources: { db: { url: masterUrl } } })
  try {
    const rows = await master.$queryRaw<{ schema_name: string }[]>`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name LIKE 'tenant_%'
      ORDER BY schema_name
    `
    console.log(`[LOGIN] Found schemas: ${rows.map(r => r.schema_name).join(', ')}`)
    return rows.map(r => r.schema_name)
  } catch (e: any) {
    console.error('[LOGIN] Failed to list schemas:', e.message)
    return []
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

    // --- Find which tenant this email belongs to ---
    // Check x-tenant-slug first (set when ?tenant= param is used) for speed,
    // then fall back to searching all tenant schemas.
    const hintSlug = request.headers.get('x-tenant-slug') || null
    const schemasToSearch: string[] = []

    if (hintSlug) {
      schemasToSearch.push(`tenant_${hintSlug}`)
    }

    // Always search all schemas — hintSlug just moves the matching one to front
    const allSchemas = await getAllTenantSchemasFromMaster()
    for (const s of allSchemas) {
      if (!schemasToSearch.includes(s)) schemasToSearch.push(s)
    }

    let foundUser: any = null
    let foundSchema: string = ''
    let foundPrisma: PrismaClient | null = null

    for (const schema of schemasToSearch) {
      const prisma = getTenantPrisma(schema)
      try {
        const user = await prisma.users.findUnique({ where: { email: normalizedEmail } })
        if (user) {
          foundUser = user
          foundSchema = schema
          foundPrisma = prisma
          break
        }
      } catch (e: any) {
        console.error(`[LOGIN] Error searching ${schema}:`, e.message?.slice(0, 120))
      } finally {
        if (!foundUser) await prisma.$disconnect()
      }
    }

    if (!foundUser) {
      console.error(`[LOGIN] User not found for ${normalizedEmail} after searching ${schemasToSearch.length} schemas: ${schemasToSearch.join(', ')}`)
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const isValidPassword = await bcrypt.compare(password, foundUser.password)
    if (!isValidPassword) {
      await foundPrisma!.$disconnect()
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    if (!foundUser.isActive) {
      await foundPrisma!.$disconnect()
      return NextResponse.json({ error: "Your account has been deactivated. Please contact your administrator." }, { status: 403 })
    }

    // Extract slug from schema name (tenant_mizpha -> mizpha)
    const tenantSlug = foundSchema.replace(/^tenant_/, '')

    // Update last login
    try {
      await foundPrisma!.users.update({ where: { id: foundUser.id }, data: { lastLoginAt: new Date() } })
    } catch { /* non-critical */ }
    await foundPrisma!.$disconnect()

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

import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { limiters } from "@/lib/rate-limit"

export const dynamic = 'force-dynamic'

const STAFF_ROLES = ["ADMIN", "MANAGER", "CARETAKER", "STOREKEEPER", "TECHNICAL"]
const TENANT_ROLES = ["TENANT"]

function getMasterPrisma() {
  const url = (process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL || '')
    .replace('-pooler.', '.')
  return new PrismaClient({ datasources: { db: { url } }, log: ['error'] })
}

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

// POST /api/auth/instances
// Body: { email, password, userType: "staff" | "tenant" }
// Returns all company instances where this email+password combo is valid for the given userType
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  const rl = await limiters.auth(ip)
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { email, password, userType } = body
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Determine which roles are allowed for this login type
    const allowedRoles = userType === "tenant" ? TENANT_ROLES : STAFF_ROLES
    const normalizedEmail = email.toLowerCase().trim()
    const master = getMasterPrisma()

    // Get all tenant schemas
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

    // Search all schemas for this email+password combo with role restriction
    const matches: {
      tenantSlug: string
      companyName: string
      role: string
      userId: string
      firstName: string
      lastName: string
      mustChangePassword: boolean
    }[] = []

    for (const schema of schemas) {
      const prisma = getTenantPrisma(schema)
      try {
        const rows = await prisma.$queryRawUnsafe<any[]>(
          `SELECT id, email, password, role::text as role, "firstName", "lastName", "isActive", "mustChangePassword"
           FROM users WHERE email = $1 LIMIT 1`,
          normalizedEmail
        )
        if (!rows.length) continue
        const user = rows[0]
        if (!user.isActive) continue

        // Role gate: staff login only accepts staff roles, tenant login only accepts TENANT
        // If userType is not provided, allow all roles (backwards compat)
        if (userType && !allowedRoles.includes(user.role)) continue

        const valid = await bcrypt.compare(password, user.password)
        if (!valid) continue

        const slug = schema.replace(/^tenant_/, '')

        // Look up company name
        const masterLookup = getMasterPrisma()
        let companyName = slug
        try {
          const comp = await masterLookup.$queryRawUnsafe<any[]>(
            `SELECT name FROM companies WHERE slug = $1 LIMIT 1`, slug
          )
          if (comp[0]?.name) companyName = comp[0].name
        } finally {
          await masterLookup.$disconnect()
        }

        matches.push({
          tenantSlug: slug,
          companyName,
          role: user.role,
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          mustChangePassword: user.mustChangePassword ?? false,
        })
      } catch {}
      finally {
        await prisma.$disconnect()
      }
    }

    if (!matches.length) {
      // Give a specific error based on what the user tried to do
      const wrongPortalMsg = userType === "tenant"
        ? "No tenant account found with these credentials. If you are staff, use Staff Login."
        : "No staff account found with these credentials. If you are a tenant, use Tenant Login."
      return NextResponse.json({ error: wrongPortalMsg }, { status: 401 })
    }

    return NextResponse.json({ instances: matches })
  } catch (error: any) {
    console.error("[INSTANCES] Error:", error?.message)
    return NextResponse.json({ error: "Failed to check instances" }, { status: 500 })
  }
}

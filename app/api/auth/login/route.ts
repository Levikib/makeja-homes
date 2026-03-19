import { NextRequest, NextResponse } from "next/server"
import { SignJWT } from "jose"
import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-min-32-characters-long"
)

export async function POST(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  const parts = host.split('.')
  const schemaName = parts.length >= 4 && !['www','app','api'].includes(parts[0])
    ? `tenant_${parts[0]}`
    : 'public'

  const base = (process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || '')
    .replace(/[?&]options=[^&]*/g, '')
  const sep = base.includes('?') ? '&' : '?'
  const dbUrl = `${base}${sep}schema=${schemaName}`

  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } })

  try {
    const { email, password } = await request.json()
    console.log(`LOGIN: host=${host} schema=${schemaName} email=${email}`)

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const user = await prisma.users.findUnique({ where: { email: email.toLowerCase() } })
    console.log(`LOGIN: userFound=${!!user} active=${user?.isActive}`)

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password", debug: { schema: schemaName, host } }, { status: 401 })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    console.log(`LOGIN: passwordMatch=${isValidPassword}`)

    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid email or password", debug: { schema: schemaName, passwordMatch: false } }, { status: 401 })
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "Account is inactive." }, { status: 403 })
    }

    await prisma.users.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

    const token = await new SignJWT({
      id: user.id, email: user.email, role: user.role,
      companyId: user.companyId, firstName: user.firstName, lastName: user.lastName,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(JWT_SECRET)

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
    })

    response.cookies.set("token", token, {
      httpOnly: true, secure: true, sameSite: "none",
      maxAge: 86400,
    })

    return response

  } catch (error: any) {
    console.error("LOGIN ERROR:", error?.message)
    return NextResponse.json({ error: "Login failed", detail: error?.message, schema: schemaName }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

import { NextRequest, NextResponse } from "next/server"
import { SignJWT } from "jose"
import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"
import { limiters } from "@/lib/rate-limit"

export const dynamic = 'force-dynamic'

if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set")
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  const rl = limiters.auth(ip)
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    )
  }

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  const parts = host.split('.')
  const schemaName = parts.length >= 4 && !['www', 'app', 'api'].includes(parts[0])
    ? `tenant_${parts[0]}`
    : 'public'

  const base = (process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || '')
    .replace(/[?&]options=[^&]*/g, '')
  const sep = base.includes('?') ? '&' : '?'
  const dbUrl = `${base}${sep}schema=${schemaName}`

  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } })

  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const user = await prisma.users.findUnique({ where: { email: email.toLowerCase().trim() } })

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "Your account has been deactivated. Please contact your administrator." }, { status: 403 })
    }

    await prisma.users.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      firstName: user.firstName,
      lastName: user.lastName,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(JWT_SECRET)

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
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
  } finally {
    await prisma.$disconnect()
  }
}

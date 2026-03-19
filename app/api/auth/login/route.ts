import { NextRequest, NextResponse } from "next/server"
import { SignJWT } from "jose"
import bcrypt from "bcryptjs"
import { getPrismaForRequest } from "@/lib/get-prisma"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-min-32-characters-long"
)

export async function POST(request: NextRequest) {
  const prisma = getPrismaForRequest(request)

  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const user = await prisma.users.findUnique({ where: { email: email.toLowerCase() } })

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
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
      httpOnly: true, secure: true, sameSite: "lax",
      domain: ".makejahomes.co.ke", maxAge: 86400,
    })

    return response

  } catch (error: any) {
    console.error("LOGIN ERROR:", error?.message)
    return NextResponse.json({ error: "Login failed", detail: error?.message }, { status: 500 })
  }
}

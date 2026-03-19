import { cookies } from "next/headers"
import { NextRequest } from "next/server"
import { jwtVerify } from "jose"
import { getPrismaForRequest } from "@/lib/get-prisma"
import { PrismaClient } from "@prisma/client"

async function verifyToken(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET)
  const { payload } = await jwtVerify(token, secret)
  return payload
}

// For API routes — pass the request object
export async function getCurrentUserFromRequest(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value ||
                  req.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) return null

    const payload = await verifyToken(token)
    const prisma = getPrismaForRequest(req)

    const user = await prisma.users.findUnique({
      where: { id: payload.id as string },
      select: { id: true, email: true, role: true, firstName: true, lastName: true, companyId: true, isActive: true }
    })

    if (!user?.isActive) return null
    return user
  } catch {
    return null
  }
}

// For server components — uses headers() (works in pages, not API routes)
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value
    if (!token) return null

    const payload = await verifyToken(token)

    // Use public schema for server components — tenant context comes from middleware
    const { prisma } = await import("@/lib/prisma")
    const user = await prisma.users.findUnique({
      where: { id: payload.id as string },
      select: { id: true, email: true, role: true, firstName: true, lastName: true, companyId: true, isActive: true }
    })

    if (!user?.isActive) return null
    return user
  } catch {
    return null
  }
}

export async function requireRole(roles: string[]) {
  const user = await getCurrentUser()
  if (!user) {
    const { redirect } = await import("next/navigation")
    redirect("/auth/login")
  }
  if (!roles.includes(user!.role)) {
    const { redirect } = await import("next/navigation")
    redirect("/dashboard/admin")
  }
  return user
}

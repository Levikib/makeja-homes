import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { getPrismaForRequest } from '@/lib/get-prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    const prisma = getPrismaForRequest(request)
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, email, "firstName", "lastName", "phoneNumber", role, "createdAt", "lastLoginAt" FROM users WHERE id = $1 LIMIT 1`,
      payload.id as string
    )
    if (!rows.length) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json({ user: rows[0] })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    const body = await request.json()
    const { firstName, lastName, phoneNumber, currentPassword, newPassword } = body

    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: 'First and last name are required' }, { status: 400 })
    }

    const prisma = getPrismaForRequest(request)
    const user = await prisma.users.findUnique({ where: { id: payload.id as string } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const updateData: any = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: phoneNumber?.trim() || null,
    }

    if (newPassword) {
      if (!currentPassword) return NextResponse.json({ error: 'Current password required to set new password' }, { status: 400 })
      if (newPassword.length < 8) return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
      const valid = await bcrypt.compare(currentPassword, user.password)
      if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      updateData.password = await bcrypt.hash(newPassword, 12)
    }

    const updated = await prisma.users.update({
      where: { id: payload.id as string },
      data: updateData,
      select: { id: true, email: true, firstName: true, lastName: true, phoneNumber: true, role: true },
    })

    return NextResponse.json({ success: true, user: updated })
  } catch (err: any) {
    console.error('[PROFILE PATCH]', err?.message)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}

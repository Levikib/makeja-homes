import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSuperAdminSession } from '@/lib/super-admin-auth'
import { getSuperAdminById, updateSuperAdminPassword } from '@/lib/super-admin-db'
import { getMasterPrisma } from '@/lib/get-prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/super-admin/profile
 * Returns the current user's profile.
 */
export async function GET(req: NextRequest) {
  const session = await getSuperAdminSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getSuperAdminById(session.id)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({ user })
}

/**
 * PUT /api/super-admin/profile/password
 * Changes the current user's password. Requires current password.
 * Body: { currentPassword, newPassword, confirmPassword }
 */
export async function PUT(req: NextRequest) {
  const session = await getSuperAdminSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { currentPassword, newPassword, confirmPassword } = await req.json()

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'New passwords do not match' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
    }
    if (currentPassword === newPassword) {
      return NextResponse.json({ error: 'New password must be different from current password' }, { status: 400 })
    }

    // Fetch the current hashed password
    const db = getMasterPrisma()
    let storedHash: string
    try {
      const rows = await db.$queryRawUnsafe<any[]>(
        `SELECT password FROM public.super_admin_users WHERE id = $1 LIMIT 1`,
        session.id
      )
      if (!rows[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      storedHash = rows[0].password
    } finally {
      await db.$disconnect()
    }

    const valid = await bcrypt.compare(currentPassword, storedHash)
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(newPassword, 12)
    await updateSuperAdminPassword(session.id, hashed)

    return NextResponse.json({ success: true, message: 'Password changed successfully' })
  } catch (err: any) {
    console.error('[profile] PUT error:', err?.message)
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
  }
}

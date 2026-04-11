import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { getByInviteToken, updateSuperAdminPassword, clearInviteToken, updateLastLogin } from '@/lib/super-admin-db'

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

/**
 * GET /api/super-admin/accept-invite?token=xxx
 * Validate invite token — used by the accept-invite page to check validity.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ valid: false, error: 'Token required' }, { status: 400 })

  const user = await getByInviteToken(token)
  if (!user) return NextResponse.json({ valid: false, error: 'Invalid or expired invitation link' })

  return NextResponse.json({
    valid: true,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  })
}

/**
 * POST /api/super-admin/accept-invite
 * Body: { token, password, confirmPassword }
 * Sets the user's password and issues a session.
 */
export async function POST(req: NextRequest) {
  try {
    const { token, password, confirmPassword } = await req.json()

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json({ error: 'Password must contain at least one letter and one number' }, { status: 400 })
    }

    const user = await getByInviteToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired invitation link' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 12)
    await updateSuperAdminPassword(user.id, hashed)
    await clearInviteToken(user.id)
    await updateLastLogin(user.id)

    // Issue session
    const sessionToken = await new SignJWT({
      sub: user.id,
      email: user.email,
      role: 'super_admin',
      saRole: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setJti(crypto.randomUUID())
      .setIssuedAt()
      .setExpirationTime('12h')
      .sign(JWT_SECRET)

    const response = NextResponse.json({
      success: true,
      user: { email: user.email, firstName: user.firstName, role: user.role },
    })
    response.cookies.set('super_admin_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 43200,
      path: '/',
    })
    return response
  } catch (err: any) {
    console.error('[accept-invite] error:', err?.message)
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 })
  }
}
